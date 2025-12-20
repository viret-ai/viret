// =====================================
// app/api/assets/upload/route.ts
// アセットアップロードAPI
// - 画像の width / height を sharp で取得して DB に保存
// - 短辺720px未満はアップロード不可
// - 原本の XMP / C2PA を抽出して asset_checks.details に保存
//   - C2PA: c2patool が使えるなら raw JSON を保存（①）
//   - 無い場合はヒューリスティックにフォールバック
// =====================================

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import crypto from "crypto";
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import { execFile } from "child_process";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function safeSnippet(s: string, max = 2000): string {
  const t = s.replace(/\u0000/g, "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + "...(truncated)";
}

function execFileAsync(
  file: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject({ err, stdout, stderr });
      resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
    });
  });
}

async function tryExtractC2paRaw(inputBuffer: Buffer): Promise<{
  ok: boolean;
  raw: any | null;
  claimGenerator: string | null;
  assertions: string[];
  ingredients: Array<{ title?: string | null; relationship?: string | null }>;
  provenanceValid: boolean | null;
  detectedBy: string | null;
  errorHint: string | null;
}> {
  // // c2patool 前提（インストールされてなければ失敗してOK）
  // // Windowsなら "c2patool.exe" を PATH に入れる運用がいちばんラク
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "viret-c2pa-"));
  const tmpFile = path.join(tmpDir, `upload-${crypto.randomUUID()}.bin`);

  try {
    await fs.writeFile(tmpFile, inputBuffer);

    // まずは JSON を吐かせる（ツール仕様差異があるので複数候補）
    const candidates: Array<{ bin: string; args: string[] }> = [
      { bin: "c2patool", args: [tmpFile, "--json"] },
      { bin: "c2patool", args: ["--json", tmpFile] },
      { bin: "c2patool.exe", args: [tmpFile, "--json"] },
      { bin: "c2patool.exe", args: ["--json", tmpFile] },
    ];

    let stdout = "";
    let lastErr = "";

    for (const c of candidates) {
      try {
        const r = await execFileAsync(c.bin, c.args);
        stdout = r.stdout;
        lastErr = r.stderr;
        if (stdout && stdout.trim().startsWith("{")) break;
      } catch (e: any) {
        lastErr = e?.stderr || e?.stdout || e?.err?.message || String(e);
      }
    }

    if (!stdout || !stdout.trim().startsWith("{")) {
      return {
        ok: false,
        raw: null,
        claimGenerator: null,
        assertions: [],
        ingredients: [],
        provenanceValid: null,
        detectedBy: null,
        errorHint: lastErr ? `c2patool failed: ${String(lastErr).slice(0, 300)}` : "c2patool not available",
      };
    }

    const raw = JSON.parse(stdout);

    // // 要約抽出（ツール出力の揺れに耐えるため、広めに拾う）
    const claimGenerator =
      raw?.claim_generator ||
      raw?.claimGenerator ||
      raw?.claim?.claim_generator ||
      raw?.claim?.claimGenerator ||
      null;

    const assertions: string[] = [];
    const ingredients: Array<{ title?: string | null; relationship?: string | null }> = [];

    // assertions（よくある形を複数拾う）
    const a1 = raw?.assertions;
    if (Array.isArray(a1)) {
      for (const x of a1) {
        if (typeof x === "string") assertions.push(x);
        else if (typeof x?.label === "string") assertions.push(x.label);
        else if (typeof x?.name === "string") assertions.push(x.name);
      }
    }

    const ing = raw?.ingredients || raw?.claim?.ingredients;
    if (Array.isArray(ing)) {
      for (const it of ing) {
        ingredients.push({
          title: typeof it?.title === "string" ? it.title : null,
          relationship: typeof it?.relationship === "string" ? it.relationship : null,
        });
      }
    }

    // provenance valid（ある/ない/不明）
    const provenanceValid =
      typeof raw?.provenanceValid === "boolean"
        ? raw.provenanceValid
        : typeof raw?.provenance_valid === "boolean"
        ? raw.provenance_valid
        : null;

    // detectedBy は v1 では claimGenerator を流用でOK
    const detectedBy = claimGenerator ? String(claimGenerator) : null;

    return {
      ok: true,
      raw,
      claimGenerator: claimGenerator ? String(claimGenerator) : null,
      assertions: Array.from(new Set(assertions)).slice(0, 50),
      ingredients: ingredients.slice(0, 50),
      provenanceValid,
      detectedBy,
      errorHint: null,
    };
  } catch (e: any) {
    return {
      ok: false,
      raw: null,
      claimGenerator: null,
      assertions: [],
      ingredients: [],
      provenanceValid: null,
      detectedBy: null,
      errorHint: e?.message ? String(e.message).slice(0, 300) : String(e),
    };
  } finally {
    try {
      await fs.unlink(tmpFile);
    } catch {}
    try {
      await fs.rmdir(tmpDir);
    } catch {}
  }
}

function detectC2paHeuristic(
  inputBuffer: Buffer,
  xmpText: string | null
): { present: boolean; detectedBy: string | null } {
  const hints: Array<{ ok: boolean; by: string }> = [];

  if (xmpText) {
    const lower = xmpText.toLowerCase();
    hints.push({ ok: lower.includes("c2pa"), by: "xmp_contains_c2pa" });
    hints.push({ ok: lower.includes("urn:c2pa"), by: "xmp_contains_urn_c2pa" });
  }

  const oneMb = 1024 * 1024;
  const head = inputBuffer
    .subarray(0, Math.min(oneMb, inputBuffer.length))
    .toString("latin1")
    .toLowerCase();

  const tailStart = inputBuffer.length > oneMb ? inputBuffer.length - oneMb : 0;
  const tail = inputBuffer
    .subarray(tailStart)
    .toString("latin1")
    .toLowerCase();

  hints.push({ ok: head.includes("c2pa"), by: "bytes_head_contains_c2pa" });
  hints.push({ ok: tail.includes("c2pa"), by: "bytes_tail_contains_c2pa" });

  const hit = hints.find((h) => h.ok) ?? null;
  return { present: !!hit, detectedBy: hit?.by ?? null };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "画像ファイルが見つかりませんでした。" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const meta = await sharp(inputBuffer).metadata();

    const width = meta.width ?? null;
    const height = meta.height ?? null;

    if (!width || !height) {
      return NextResponse.json(
        { error: "画像サイズを取得できませんでした。" },
        { status: 400 }
      );
    }

    const shortEdge = Math.min(width, height);

    if (shortEdge < 720) {
      return NextResponse.json(
        {
          error: "この画像は短辺720pxに満たないため、Viretでは登録できません。",
          detail: `detected size: ${width} x ${height}px`,
        },
        { status: 400 }
      );
    }

    // ================================
    // XMP（原本）
    // ================================
    const xmpBuf = (meta as any)?.xmp as Buffer | undefined;
    const xmpText = xmpBuf ? xmpBuf.toString("utf8") : null;
    const xmpSha = xmpText ? sha256Hex(xmpText) : null;

    // ================================
    // C2PA（原本）
    // ================================
    const c2paCli = await tryExtractC2paRaw(inputBuffer);

    const c2paHeu = !c2paCli.ok
      ? detectC2paHeuristic(inputBuffer, xmpText)
      : { present: true, detectedBy: c2paCli.detectedBy };

    const checkDetails = {
      detectedAt: new Date().toISOString(),
      contentType: file.type || null,
      bytes: inputBuffer.length,
      sharp: {
        format: meta.format ?? null,
        hasAlpha: meta.hasAlpha ?? null,
        density: meta.density ?? null,
        space: meta.space ?? null,
        width,
        height,
      },
      xmp: {
        present: !!xmpText,
        sha256: xmpSha,
        snippet: xmpText ? safeSnippet(xmpText, 2000) : null,
      },
      c2pa: {
        present: c2paHeu.present,
        detectedBy: c2paHeu.detectedBy,
        claimGenerator: c2paCli.ok ? c2paCli.claimGenerator : null,
        provenanceValid: c2paCli.ok ? c2paCli.provenanceValid : null,
        assertions: c2paCli.ok ? c2paCli.assertions : [],
        ingredients: c2paCli.ok ? c2paCli.ingredients : [],
        raw: c2paCli.ok ? c2paCli.raw : null, // ★① raw 保存
        errorHint: c2paCli.ok ? null : c2paCli.errorHint,
      },
    };

    // ================================
    // Storage
    // ================================
    const extFromType = (file.type || "").split("/")[1] || "jpg";
    const fileExt =
      extFromType === "jpeg"
        ? "jpg"
        : ["png", "webp"].includes(extFromType)
        ? extFromType
        : "jpg";

    const now = Date.now();
    const fileName = `${now}-${crypto.randomUUID()}.${fileExt}`;
    const storagePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(storagePath, inputBuffer, {
        contentType: file.type || `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError);
      return NextResponse.json(
        { error: "Storageへのアップロードに失敗しました。" },
        { status: 500 }
      );
    }

    // ================================
    // assets insert
    // ================================
    const title = formData.get("title")?.toString() ?? null;
    const ownerId = formData.get("ownerId")?.toString() ?? null;

    const { data, error: insertError } = await supabase
      .from("assets")
      .insert({
        title,
        owner_id: ownerId,
        original_path: storagePath,
        preview_path: storagePath,
        width,
        height,
      })
      .select("id, width, height")
      .single();

    if (insertError || !data) {
      console.error(insertError);
      return NextResponse.json(
        { error: "assets テーブルへの登録に失敗しました。" },
        { status: 500 }
      );
    }

    // ================================
    // asset_checks insert（ログ）
    // ================================
    try {
      await supabase.from("asset_checks").insert({
        asset_id: data.id,
        provider: "upload_meta",
        status: "review", // v1: 基本 review に寄せる（運営が最終判断）
        score: null,
        c2pa_present: c2paHeu.present,
        xmp_present: !!xmpText,
        xmp_sha256: xmpSha,
        details: checkDetails,
      });
    } catch (e) {
      console.error("asset_checks insert failed:", e);
    }

    return NextResponse.json(
      {
        id: data.id,
        width: data.width,
        height: data.height,
        message: "アップロードが完了しました。",
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("upload error", e);
    return NextResponse.json(
      { error: "アップロード処理でエラーが発生しました。" },
      { status: 500 }
    );
  }
}
