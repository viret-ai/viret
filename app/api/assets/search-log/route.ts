// =====================================
// app/api/assets/search-log/route.ts
// 素材検索ログを記録する API
// - q / q_norm / tags / result_count を保存
// - RLS により INSERT は誰でも可
// =====================================

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// 検索語の正規化
// - 小文字化
// - 全角空白 → 半角
// - 記号をざっくり除去
function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const body = await req.json();

    const q: string | null =
      typeof body.q === "string" && body.q.trim() !== ""
        ? body.q.trim()
        : null;

    const tags: string[] = Array.isArray(body.tags)
      ? body.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];

    const resultCount: number | null =
      typeof body.result_count === "number" ? body.result_count : null;

    const qNorm = q ? normalizeQuery(q) : null;

    // user_id は supabaseServer が auth 情報を持っていれば自動で拾える
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("assets_search_events").insert({
      user_id: user?.id ?? null,
      q,
      q_norm: qNorm,
      tags,
      result_count: resultCount,
      source: "assets",
    });

    if (error) {
      console.error("[assets_search_events] insert error", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[assets_search_events] unexpected error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
