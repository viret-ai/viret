// =====================================
// app/api/assets/[id]/download/route.ts
// 素材ダウンロード用 API（サイズ・フォーマット指定）
// - Small:    短辺720px / 300dpi（free想定）
// - HD:       短辺1080px / 350dpi（paid想定）
// - Original: リサイズなし / 350dpi（paid想定）
// - JPG / PNG / WebP 変換対応
// - XMPメタデータに「assetId + @creator」を埋め込む
// - 有料DLはログイン必須 + コイン減算（coin_apply_delta）
// - DLログ（download_events）を user_id で記録（freeは未ログインでもOK）
// =====================================

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase-server";
import { yenToCoins } from "@/lib/coins";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type SizeOption = "sm" | "hd" | "original";
type FormatOption = "jpg" | "png" | "webp";
type KindOption = "free" | "paid";

// // 暫定：画質ごとの価格（円相当） → yenToCoins でコイン化
function getPriceYenBySize(size: SizeOption): number {
  if (size === "hd") return 100;
  if (size === "original") return 200;
  return 0;
}

function isPaidSize(size: SizeOption): boolean {
  return size === "hd" || size === "original";
}

export async function GET(req: NextRequest, context: RouteParams) {
  const { id } = await context.params;
  const assetId = id;

  const search = req.nextUrl.searchParams;
  const sizeParam = (search.get("size") ?? "original").toLowerCase();
  const formatParam = (search.get("format") ?? "jpg").toLowerCase();
  const kindParam = (search.get("kind") ?? "").toLowerCase();

  const size: SizeOption = ["sm", "hd", "original"].includes(sizeParam)
    ? (sizeParam as SizeOption)
    : "original";

  const format: FormatOption = ["jpg", "png", "webp"].includes(formatParam)
    ? (formatParam as FormatOption)
    : "jpg";

  // // kind=paid を受け取った時だけ「有料扱い」
  const kind: KindOption = kindParam === "paid" ? "paid" : "free";

  // =====================================
  // 0) Supabase（server helper 統一）
  // =====================================
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null as any } }));

  // =====================================
  // 0.5) 有料DL：ログイン必須
  // =====================================
  const shouldCharge = kind === "paid" && isPaidSize(size);
  if (shouldCharge && !user?.id) {
    return NextResponse.json({ ok: false, error: "LOGIN_REQUIRED" }, { status: 401 });
  }

  // =====================================
  // 1) DB からアセット情報取得
  // =====================================
  const { data, error } = await supabase
    .from("assets")
    .select(["id", "owner_id", "title", "original_path", "preview_path", "width", "height"].join(","))
    .eq("id", assetId)
    .maybeSingle();

  if (error || !data) {
    return new NextResponse("Asset not found", { status: 404 });
  }

  const asset = data as {
    id: string;
    owner_id: string | null;
    title: string | null;
    original_path: string | null;
    preview_path: string | null;
    width: number | null;
    height: number | null;
  };

  const sourcePath = asset.original_path || asset.preview_path;
  if (!sourcePath) {
    return new NextResponse("File path not available", { status: 404 });
  }

  // クリエイターの @handle を取得（username は廃止済み）
  let creatorHandle: string | null = null;

  if (asset.owner_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", asset.owner_id)
      .maybeSingle();

    creatorHandle = profile?.handle ?? null;
  }

  const creatorTag = creatorHandle
    ? `@${creatorHandle}`
    : asset.owner_id
      ? `creator_${asset.owner_id.slice(0, 8)}`
      : "unknown_creator";

  // =====================================
  // 2) 有料DL：コイン減算（先に引く）
  // - サイズ買い切り：assetId + size で一意（formatは含めない）
  // - 既に購入済み（unique衝突）なら課金せずDL続行
  // =====================================
  let chargedCoins = 0;

  if (shouldCharge && user?.id) {
    const priceYen = getPriceYenBySize(size);
    const priceCoins = Math.floor(yenToCoins(priceYen));

    if (priceCoins > 0) {
      const chargeSourceType = "asset_download";
      const chargeSourceId = `${assetId}:${size}`; // // ★ サイズ買い切り（formatは含めない）

      const { error: rpcError } = await supabase.rpc("coin_apply_delta", {
        uid: user.id,
        delta: -priceCoins,
        reason_code: "asset_download_debit",
        source_type: chargeSourceType,
        source_id: chargeSourceId,
        note: `download:${size}:${format}`,
      });

      if (rpcError) {
        const msg = String(rpcError.message || "");

        if (msg.includes("INSUFFICIENT_COINS")) {
          return NextResponse.json({ ok: false, error: "INSUFFICIENT_COINS" }, { status: 409 });
        }

        if (msg.includes("duplicate key value") || msg.includes("coin_ledger_source_unique_idx")) {
          // // 既に購入済み：課金はスキップしてDL続行
          chargedCoins = 0;
        } else {
          return NextResponse.json({ ok: false, error: "RPC_FAILED", detail: rpcError.message }, { status: 500 });
        }
      } else {
        chargedCoins = priceCoins;
      }
    }
  }

  // =====================================
  // 3) Storage から元画像を取得
  // =====================================
  const { data: fileRes, error: dlError } = await supabase.storage
    .from("assets")
    .download(sourcePath);

  if (dlError || !fileRes) {
    return new NextResponse("File download failed", { status: 500 });
  }

  const inputBuffer = Buffer.from(await fileRes.arrayBuffer());

  // =====================================
  // 4) 元画像サイズ決定
  // =====================================
  const meta = await sharp(inputBuffer).metadata();
  const originalWidth = asset.width ?? meta.width;
  const originalHeight = asset.height ?? meta.height;

  if (!originalWidth || !originalHeight) {
    return new NextResponse("Could not determine image size", { status: 500 });
  }

  const shortEdge = Math.min(originalWidth, originalHeight);

  // =====================================
  // 5) リサイズ＋XMP＋変換
  // =====================================
  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (size !== "original") {
    const targetShort = size === "sm" ? 720 : 1080;
    if (shortEdge > targetShort) {
      const scale = targetShort / shortEdge;
      targetWidth = Math.round(originalWidth * scale);
      targetHeight = Math.round(originalHeight * scale);
    }
  }

  const targetDpi = size === "sm" ? 300 : 350;

  const descriptionText = `Viret asset ID: ${assetId} / creator: ${creatorTag}`;
  const xmp = `
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"
                     xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/">
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${descriptionText}</rdf:li>
        </rdf:Alt>
      </dc:description>
      <xmpRights:Marked>True</xmpRights:Marked>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`.trim();

  let pipeline = sharp(inputBuffer)
    .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
    .withMetadata({ density: targetDpi, xmp: Buffer.from(xmp, "utf8") });

  if (format === "png") pipeline = pipeline.png({ compressionLevel: 9 });
  else if (format === "webp") pipeline = pipeline.webp({ quality: 95 });
  else pipeline = pipeline.jpeg({ quality: 95, chromaSubsampling: "4:4:4" });

  const outputBuffer = await pipeline.toBuffer();

  // =====================================
  // 6) DLログ
  // =====================================
  try {
    await supabase.from("download_events").insert({
      asset_id: assetId,
      user_id: user?.id ?? null,
      guest_id: null,
      kind: shouldCharge ? "paid" : "free",
      coins: shouldCharge ? chargedCoins : 0,
      ref: { size, format },
    });
  } catch {}

  const ext = format === "jpg" ? "jpg" : format;
  const fileName = `${asset.title || "asset"}-${size}.${ext}`;

  return new NextResponse(outputBuffer, {
    headers: {
      "Content-Type": ext === "jpg" ? "image/jpeg" : ext === "png" ? "image/png" : "image/webp",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": shouldCharge ? "private, no-store" : "public, max-age=31536000, immutable",
    },
  });
}
