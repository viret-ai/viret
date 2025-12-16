// =====================================
// lib/assets/searchAssets.ts
// assets 検索（文字 + タグ + 件数 / ページング対応）
// - public のみ
// - 文字：title / description を ILIKE
// - タグ：text[] の overlaps（ANDではなく“どれか一致”）
// - 並び：古い → 新しい（新規は末尾）
//   - created_at だけだと同時刻で順序がブレるので id を第2キーにする
// =====================================

import type { PostgrestError } from "@supabase/supabase-js";

type Supabase = Awaited<
  ReturnType<import("@/lib/supabase-server").supabaseServer>
>;

type AssetRow = {
  id: string;
  title: string | null;
  preview_path: string | null;
  created_at: string;
  status: string;
};

function escapeForOr(v: string): string {
  // Supabase の .or(...) はカンマ区切りなので、カンマが混ざると壊れやすい
  // 最低限の除去で安全側へ
  return v.replaceAll(",", " ").trim();
}

export async function searchAssets({
  supabase,
  q,
  tags,
  limit,
  offset,
}: {
  supabase: Supabase;
  q: string;
  tags: string[];
  limit?: number;
  offset?: number;
}): Promise<{
  assets: AssetRow[];
  totalCount: number;
  error: PostgrestError | null;
}> {
  let query = supabase
    .from("assets")
    .select("id, title, preview_path, created_at, status", {
      count: "exact",
    })
    .eq("status", "public");

  // --- 文字検索 ---
  const qTrim = q.trim();
  if (qTrim) {
    const safe = escapeForOr(qTrim);
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }

  // --- タグ検索（OR） ---
  const t = (tags ?? [])
    .map((s) => s.trim())
    .filter(Boolean);

  if (t.length > 0) {
    query = query.overlaps("tags", t);
  }

  // --- 並び（新規は末尾） ---
  // // created_at が同時刻のときに順序が揺れるのを防ぐため id を第2キーにする
  query = query
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  // --- ページング ---
  if (typeof limit === "number") {
    const start = offset ?? 0;
    const end = start + limit - 1;
    query = query.range(start, end);
  }

  const { data, count, error } = await query;

  return {
    assets: ((data as AssetRow[] | null) ?? []) as AssetRow[],
    totalCount: count ?? 0,
    error,
  };
}
