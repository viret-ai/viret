// =====================================
// app/api/assets/[id]/download/route.ts
// 素材ダウンロード用 API（サイズ・フォーマット指定）
// - Small: 短辺720px / 300dpi
// - HD:    短辺1080px / 350dpi
// - Original: リサイズなし / 350dpi（DPIメタのみ）
// - JPG / PNG / WebP 変換対応
// =====================================

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

type RouteParams = {
  params: { id: string };
};

type SizeOption = "sm" | "hd" | "original";
type FormatOption = "jpg" | "png" | "webp";

export async function GET(req: NextRequest, { params }: RouteParams) {
  const assetId = params.id;

  const search = req.nextUrl.searchParams;
  const sizeParam = (search.get("size") ?? "original").toLowerCase();
  const formatParam = (search.get("format") ?? "jpg").toLowerCase();

  const size: SizeOption = ["sm", "hd", "original"].includes(sizeParam)
    ? (sizeParam as SizeOption)
    : "original";

  const format: FormatOption = ["jpg", "png", "webp"].includes(formatParam)
    ? (formatParam as FormatOption)
    : "jpg";

  // ===== DB からアセット情報取得 =====
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

  // ===== Storage から元画像を取得 =====
  const { data: fileRes, error: dlError } = await supabaseServer.storage
    .from("assets")
    .download(sourcePath);

  if (dlError || !fileRes) {
    console.error(dlError);
    return new NextResponse("File download failed", { status: 500 });
  }

  const arrayBuffer = await fileRes.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  // ===== 元画像サイズを決定（DB優先／なければmetadata） =====
  let width = (data as any).width as number | null;
  let height = (data as any).height as number | null;

  const meta = await sharp(inputBuffer).metadata();

  if (!width || !height) {
    if (meta.width && meta.height) {
      width = meta.width;
      height = meta.height;
      // 古いレコード用に width/height を backfill（エラーは気にしない）
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

  // ===== sharp パイプライン構築 =====
  let pipeline = sharp(inputBuffer);

  // サイズ別リサイズ（アップスケールはしない）
  if (size === "sm" || size === "hd") {
    const targetShort = size === "sm" ? 720 : 1080;

    if (shortEdge > targetShort) {
      const scale = targetShort / shortEdge;
      const newWidth = Math.round(originalWidth * scale);
      const newHeight = Math.round(originalHeight * scale);

      pipeline = pipeline.resize(newWidth, newHeight, {
        fit: "inside",
      });
    }
    // shortEdge <= targetShort の場合はリサイズせず、そのまま
  }

  // DPI設定：Small=300dpi, HD/Original=350dpi
  const targetDpi = size === "sm" ? 300 : 350;
  pipeline = pipeline.withMetadata({ density: targetDpi });

  // フォーマット変換
  const sharpFormat = format === "jpg" ? "jpeg" : format; // png | webp

  const outputBuffer = await pipeline
    .toFormat(sharpFormat as any)
    .toBuffer();

  const ext = format === "jpg" ? "jpg" : format;
  const contentType =
    ext === "jpg"
      ? "image/jpeg"
      : ext === "png"
      ? "image/png"
      : "image/webp";

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
