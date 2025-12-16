// =====================================
// app/api/assets/search/route.ts
// 素材検索 API（追加読み込み用）
// =====================================

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { searchAssets } from "@/lib/assets/searchAssets";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q") ?? "";
  const tags = searchParams.get("tags")
    ? searchParams.get("tags")!.split(",").filter(Boolean)
    : [];

  const limit = Number(searchParams.get("limit") ?? 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  const supabase = await supabaseServer();

  const { assets, totalCount, error } = await searchAssets({
    supabase,
    q,
    tags,
    limit,
    offset,
  });

  if (error) {
    return NextResponse.json(
      { error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    assets,
    totalCount,
  });
}
