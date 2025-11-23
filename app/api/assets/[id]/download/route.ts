// =====================================
// app/api/assets/[id]/download/route.ts
// 素材ダウンロード用 API（サイズ・フォーマット指定）
// - Small:  短辺720px / 300dpi
// - HD:     短辺1080px / 350dpi
// - Original: リサイズなし / 350dpi（DPIメタのみ）
// - JPG / PNG / WebP 変換対応
//   ※ sharp.withMetadata({ density }) で DPI を明示
//   ※ 一部アプリでは JPG/WebP の DPI 表示が 72 固定のこともある点に注意
// =====================================

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type SizeOption = "sm" | "hd" | "original";
type FormatOption = "jpg" | "png" | "webp";

export async function GET(req: NextRequest, context: RouteParams) {
  // Next.js 16 以降は params が Promise なので await 必須
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
  // 1) DB からアセット情報取得
  // =====================================
  const { data, error } = await supabaseServer
    .from("assets")
    .select(
      [
        "id",
        "title",
        "original_path",
        "preview_path",
        "width",
        "height",
      ].join(","),
    )
    .eq("id", assetId)
    .maybeSingle();

  if (error || !data) {
    return new NextResponse("Asset not found", { status: 404 });
  }

  const originalPath = (data as any).original_path as string | null;
  const previewPath = (data as any).preview_path as string | null;
  const sourcePath = originalPath || previewPath;

  if (!sourcePath) {
    return new NextResponse("File path not available", { status: 404 });
  }

  // =====================================
  // 2) Storage から元画像を取得
  // =====================================
  const { data: fileRes, error: dlError } = await supabaseServer.storage
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
  let width = (data as any).width as number | null;
  let height = (data as any).height as number | null;

  const meta = await sharp(inputBuffer).metadata();

  if (!width || !height) {
    if (meta.width && meta.height) {
      width = meta.width;
      height = meta.height;
      // 古いレコード用に width/height を backfill（エラーは無視）
      await supabaseServer
        .from("assets")
        .update({ width, height })
        .eq("id", assetId);
    }
  }

  const originalWidth = width ?? meta.width ?? null;
  const originalHeight = height ?? meta.height ?? null;

  if (!originalWidth || !originalHeight) {
    return new NextResponse("Could not determine image size", {
      status: 500,
    });
  }

  const shortEdge = Math.min(originalWidth, originalHeight);

  // =====================================
  // 4) sharp パイプライン構築
  //    - サイズ別リサイズ（アップスケールなし）
  //    - DPI（density）を明示
  //    - フォーマットごとに出力設定
  // =====================================
  let pipeline = sharp(inputBuffer);

  // 目標ピクセルサイズを決定（shortEdge ベース）
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

  // リサイズ（必要な場合のみ）。withoutEnlargement でアップスケール防止。
  if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
    pipeline = pipeline.resize(targetWidth, targetHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // DPI設定：Small=300dpi, HD/Original=350dpi
  const targetDpi = size === "sm" ? 300 : 350;

  // メタデータ（density）付与
  pipeline = pipeline.withMetadata({
    density: targetDpi,
  });

  // フォーマット変換
  switch (format) {
    case "png":
      pipeline = pipeline.png({
        compressionLevel: 9,
      });
      break;
    case "webp":
      pipeline = pipeline.webp({
        quality: 95,
      });
      break;
    case "jpg":
    default:
      pipeline = pipeline.jpeg({
        quality: 95,
        chromaSubsampling: "4:4:4",
      });
      break;
  }

  const outputBuffer = await pipeline.toBuffer();

  const ext = format === "jpg" ? "jpg" : format;
  const contentType =
    ext === "jpg"
      ? "image/jpeg"
      : ext === "png"
      ? "image/png"
      : "image/webp";

  // ファイル名を安全な形に整形
  const safeTitle =
    typeof data.title === "string" && data.title.trim().length > 0
      ? data.title
          .trim()
          .slice(0, 64)
          .replace(/[/\\:*?"<>|]/g, "_")
      : `asset-${assetId}`;

  const fileName = `${safeTitle}-${size}.${ext}`;

  return new NextResponse(outputBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": outputBuffer.length.toString(),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        fileName,
      )}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
