// =====================================
// lib/assets/tagPicks.ts
// 検索窓下のタグピックアップ生成
// - 季節のタグ：辞書候補 ∩（DBに存在するタグ）
// - よく検索されるタグ：assets_search_events 集計（無ければ assets.tags 集計にフォールバック）
// =====================================

type Supabase = Awaited<ReturnType<import("@/lib/supabase-server").supabaseServer>>;

type TagPickResult = {
  seasonalTags: string[];
  popularTags: string[];
};

function countTags(rows: Array<{ tags: string[] | null }>): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const tags = r.tags ?? [];
    for (const t of tags) {
      const key = String(t || "").trim();
      if (!key) continue;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
  }
  return m;
}

function topN(map: Map<string, number>, n: number): string[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export async function getTagPicks({
  supabase,
  seasonalCandidates,
}: {
  supabase: Supabase;
  seasonalCandidates: string[];
}): Promise<TagPickResult> {
  // 1) DBに実在するタグ一覧（軽量：assets から tags だけ取って集計）
  const { data: assetTagRows } = await supabase
    .from("assets")
    .select("tags")
    .eq("status", "public")
    .limit(800);

  const assetCounts = countTags(((assetTagRows as any) ?? []) as Array<{ tags: string[] | null }>);
  const existingTags = new Set<string>(assetCounts.keys());

  // 2) 季節タグ：辞書候補のうち、DBに存在するものだけ
  const seasonalTags = (seasonalCandidates ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((t) => existingTags.has(t))
    .slice(0, 12);

  // 3) 人気タグ（検索ログ優先）
  // - assets_search_events が無い / 権限がない / まだ空 → フォールバックで assets の頻出タグ
  let popularTags: string[] = [];

  const { data: eventRows, error: eventErr } = await supabase
    .from("assets_search_events")
    .select("tags, created_at")
    .order("created_at", { ascending: false })
    .limit(1200);

  if (!eventErr && eventRows && (eventRows as any[]).length > 0) {
    const eventCounts = countTags((eventRows as any) as Array<{ tags: string[] | null }>);
    popularTags = topN(eventCounts, 12);
  } else {
    // フォールバック：assets 側の頻出タグ
    popularTags = topN(assetCounts, 12);
  }

  // 季節タグが少なすぎたときの救済（空表示を避ける）
  // ここは「季語がDBに無い」状態でも枠が死なないための保険
  const seasonalFallback =
    seasonalTags.length > 0 ? seasonalTags : topN(assetCounts, 8);

  return {
    seasonalTags: seasonalFallback,
    popularTags,
  };
}

/*
  // =====================================
  // assets_search_events を後で作る用の最小SQL例
  // =====================================

  create table if not exists public.assets_search_events (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    user_id uuid null,
    session_id text null,
    q text null,
    tags text[] not null default '{}',
    result_count int null
  );

  -- tags 集計を速くしたいなら GIN
  create index if not exists assets_search_events_tags_gin
  on public.assets_search_events using gin (tags);

*/
