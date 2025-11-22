// =====================================
// app/api/assets/[id]/download/route.ts
// 素材ダウンロード用 API（サイズ・フォーマット指定入口）
// 今はまだ変換せず、常に original/preview へリダイレクトする暫定版
// =====================================

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getAssetPublicUrl } from "@/lib/storage";

type RouteParams = {
  params: { id: string };
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const assetId = params.id;

  const search = req.nextUrl.searchParams;
  const size = search.get("size") ?? "original"; // sm | hd | original（今は未使用）
  const format = search.get("format") ?? "jpg"; // jpg | png | webp（今は未使用）

  // console.log("[download] assetId:", assetId, "size:", size, "format:", format);

  const { data, error } = await supabaseServer
    .from("assets")
    .select("original_path, preview_path")
    .eq("id", assetId)
    .maybeSingle();

  if (error || !data) {
    return new NextResponse("Asset not found", { status: 404 });
  }

  const originalPath = (data as any).original_path as string | null;
  const previewPath = (data as any).preview_path as string | null;

  const baseUrl =
    (originalPath && getAssetPublicUrl(originalPath)) ||
    (previewPath && getAssetPublicUrl(previewPath));

  if (!baseUrl) {
    return new NextResponse("File URL not available", { status: 404 });
  }

  // 現時点では size / format を見ずに、元URLにリダイレクト
  const url = `${baseUrl}?download=1`;

  return NextResponse.redirect(url, 302);
}
