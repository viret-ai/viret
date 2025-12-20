// =====================================
// app/api/assets/[id]/download/route.ts
// 素材ダウンロード用 API（サイズ・フォーマット指定）
// - Small:    短辺720px / 300dpi
// - HD:       筗辺1080px / 350dpi
// - Original: リサイズなし / 350dpi（DPIメタのみ）
// - JPG / PNG / WebP 変換対応
// - XMPメタデータに「assetId + @creator」を埋め込む
// - DLログ（download_events）を user_id / guest_id で記録（失敗してもDLは通す）
// =====================================

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type SizeOption = "sm" | "hd" | "original";
type FormatOption = "jpg" | "png" | "webp";

const GUEST_COOKIE = "viret_guest";

function toUuidLike(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  // // v4/v5っぽい形ならOK（厳密じゃなくて十分）
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(s)) {
    return null;
  }
  return s;
}

function ensureGuestId(existing: string | null | undefined): { guestId: string; isNew: boolean } {
  const ok = toUuidLike(existing);
  if (ok) return { guestId: ok, isNew: false };

  // // nodejs runtime なので globalThis.crypto.randomUUID が使える想定
  const guestId = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return { guestId, isNew: true };
}

export async function GET(req: NextRequest, context: RouteParams) {
  const { id } = await context.params;
  const assetId = id;

  const search = req.nextUrl.searchParams;
  const sizeParam = (search.get("size") ?? "original").toLowerCase();
  const formatParam = (search.get("format") ?? "jpg").toLowerCase();

  const size: SizeOption = ["sm", "hd", "original"].includes(sizeParam)
    ? (sizeParam as SizeOption)
    : "original";

  const format: FormatOption = ["jpg", "png", "webp"].includes(formatParam)
    ? (formatParam as FormatOption)
    : "jpg";

  // =====================================
  // 0) Supabase（Route Handler Client）
  // - ログイン判定（user_id）
  // - DBアクセス
  // - Storage download
  // =====================================
  const cookieStore = await cookies(); // Next.js16: cookies() は Promise
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // user（ログインしてなくてもOK）
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null as any } }));

  // guest_id（未ログイン時のみ使う。ログイン時はuser_id優先）
  const existingGuest = cookieStore.get(GUEST_COOKIE)?.value ?? null;
  const { guestId, isNew } = ensureGuestId(existingGuest);

  // =====================================
  // 1) DB からアセット情報取得
  // =====================================
  const { data, error } = await supabase
    .from("assets")
    .select(
      [
        "id",
        "owner_id",
        "title",
        "original_path",
        "preview_path",
        "width",
        "height",
      ].join(",")
    )
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

  const originalPath = asset.original_path;
  const previewPath = asset.preview_path;
  const sourcePath = originalPath || previewPath;

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
  // 2) Storage から元画像を取得
  // =====================================
  const { data: fileRes, error: dlError } = await supabase.storage
    .from("assets")
    .download(sourcePath);

  if (dlError || !fileRes) {
    console.error(dlError);
    return new NextResponse("File download failed", { status: 500 });
  }

  const arrayBuffer = await fileRes.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  // =====================================
  // 3) 元画像サイズを決定（DB優先／なければ metadata）
  // =====================================
  let width = asset.width;
  let height = asset.height;

  const meta = await sharp(inputBuffer).metadata();

  if (!width || !height) {
    if (meta.width && meta.height) {
      width = meta.width;
      height = meta.height;
      try {
        await supabase.from("assets").update({ width, height }).eq("id", assetId);
      } catch {
        // backfill 失敗は致命的でないので無視
      }
    }
  }

  const originalWidth = width ?? meta.width ?? null;
  const originalHeight = height ?? meta.height ?? null;

  if (!originalWidth || !originalHeight) {
    return new NextResponse("Could not determine image size", { status: 500 });
  }

  const shortEdge = Math.min(originalWidth, originalHeight);

  // =====================================
  // 4) リサイズ＋メタデータ（XMP込み）＋フォーマット変換
  // =====================================
  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (size === "sm" || size === "hd") {
    const targetShort = size === "sm" ? 720 : 1080;

    if (shortEdge > targetShort) {
      const scale = targetShort / shortEdge;
      targetWidth = Math.round(originalWidth * scale);
      targetHeight = Math.round(originalHeight * scale);
    }
  }

  let pipeline = sharp(inputBuffer).resize(targetWidth, targetHeight, {
    fit: "inside",
    withoutEnlargement: true,
  });

  // DPI設定：Small=300dpi, HD/Original=350dpi
  const targetDpi = size === "sm" ? 300 : 350;

  // XMP メタデータを組み立て
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

  // メタデータ付与（density + XMP）
  pipeline = pipeline.withMetadata({
    density: targetDpi,
    xmp: Buffer.from(xmp, "utf8"),
  });

  // フォーマット変換
  switch (format) {
    case "png":
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality: 95 });
      break;
    case "jpg":
    default:
      pipeline = pipeline.jpeg({ quality: 95, chromaSubsampling: "4:4:4" });
      break;
  }

  const outputBuffer = await pipeline.toBuffer();

  const ext = format === "jpg" ? "jpg" : format;
  const contentType =
    ext === "jpg" ? "image/jpeg" : ext === "png" ? "image/png" : "image/webp";

  // =====================================
  // 5) DLログ（失敗してもDLは通す）
  // =====================================
  try {
    // // 未ログインなら guest_id で記録。ログイン時は user_id のみ入れる。
    const actorUserId = user?.id ?? null;
    const actorGuestId = actorUserId ? null : guestId;

    await supabase.from("download_events").insert({
      asset_id: assetId,
      user_id: actorUserId,
      guest_id: actorGuestId,
      kind: "free",
      coins: 0,
      ref: {
        size,
        format: ext,
        flow: "download_api_v1",
        // // 将来ここに adProvider / watchedSec などを足す
      },
    });
  } catch (e) {
    console.error("download_events insert failed:", e);
  }

  // ファイル名を安全な形に整形
  const safeTitle =
    typeof asset.title === "string" && asset.title.trim().length > 0
      ? asset.title.trim().slice(0, 64).replace(/[/\\:*?"<>|]/g, "_")
      : `asset-${assetId}`;

  const fileName = `${safeTitle}-${size}.${ext}`;

  const res = new NextResponse(outputBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": outputBuffer.length.toString(),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });

  // // ゲストcookieが無ければここで発行（ログイン時でも「閲覧者の識別」用途に残してOK）
  if (isNew) {
    res.cookies.set(GUEST_COOKIE, guestId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1年
    });
  }

  return res;
}
