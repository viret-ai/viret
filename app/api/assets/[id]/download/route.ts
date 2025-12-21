// =====================================
// app/api/assets/[id]/download/route.ts
// 素材ダウンロード用 API（サイズ・フォーマット指定）
// - Small:    短辺720px / 300dpi
// - HD:       短辺1080px / 350dpi
// - Original: リサイズなし / 350dpi（DPIメタのみ）
// - JPG / PNG / WebP 変換対応
// - XMPメタデータに「assetId + @creator」を埋め込む
// - DLログ（download_events）を user_id で記録（失敗してもDLは通す）
//   ※ 未ログインは仮表示で十分なので、ゲスト追跡cookieは廃止
// =====================================

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type SizeOption = "sm" | "hd" | "original";
type FormatOption = "jpg" | "png" | "webp";

function createSupabaseFromNextCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as CookieOptions);
            });
          } catch {
            // Route Handler 以外だと set が無効な場合があるので握りつぶす
          }
        },
      },
    }
  );
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
  // 0) Supabase（@supabase/ssr で統一）
  // =====================================
  const cookieStore = await cookies(); // Next.js16: cookies() は Promise
  const supabase = createSupabaseFromNextCookies(cookieStore);

  // user（ログインしてなくてもOK）
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null as any } }));

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
    // 状況把握のためログは出す（RLS / not found の切り分け）
    console.error("assets select failed:", error);
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
  // 2) Storage から元画像を取得
  // =====================================
  const { data: fileRes, error: dlError } = await supabase.storage.from("assets").download(sourcePath);

  if (dlError || !fileRes) {
    console.error("storage download failed:", dlError);
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

  pipeline = pipeline.withMetadata({
    density: targetDpi,
    xmp: Buffer.from(xmp, "utf8"),
  });

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
  const contentType = ext === "jpg" ? "image/jpeg" : ext === "png" ? "image/png" : "image/webp";

  // =====================================
  // 5) DLログ（失敗してもDLは通す）
  // - 未ログインは仮表示で十分なので user_id がある時だけ記録
  // =====================================
  try {
    if (user?.id) {
      await supabase.from("download_events").insert({
        asset_id: assetId,
        user_id: user.id,
        guest_id: null,
        kind: "free",
        coins: 0,
        ref: { size, format: ext, flow: "download_api_v1" },
      });
    }
  } catch (e) {
    console.error("download_events insert failed:", e);
  }

  const safeTitle =
    typeof asset.title === "string" && asset.title.trim().length > 0
      ? asset.title.trim().slice(0, 64).replace(/[/\\:*?"<>|]/g, "_")
      : `asset-${assetId}`;

  const fileName = `${safeTitle}-${size}.${ext}`;

  return new NextResponse(outputBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": outputBuffer.length.toString(),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
