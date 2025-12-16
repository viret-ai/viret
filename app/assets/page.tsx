// =====================================
// app/assets/page.tsx
// ストックサイト風素材一覧（検索 + タグ絞り込み対応）
// - 一覧起点の詳細は「/assets?view=<id>」で“同一ページ上のオーバーレイ”
// - URL直/プロフ起点は /assets/[id]（別ページ）
// =====================================

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { typography } from "@/lib/theme";
import AssetsSearchBar from "@/components/assets/AssetsSearchBar";
import AssetsList from "@/components/assets/AssetsList.client";
import { searchAssets } from "@/lib/assets/searchAssets";
import { getSeasonalTagCandidates } from "@/lib/assets/seasonalTags";
import { getTagPicks } from "@/lib/assets/tagPicks";
import AssetDetailModal from "@/components/assets/AssetDetailModal.client";
import AssetDetailContent from "@/components/assets/AssetDetailContent";

type SearchParams = {
  q?: string | string[];
  tags?: string | string[];
  view?: string | string[];
};

function toSingle(v: string | string[] | undefined): string {
  if (!v) return "";
  return Array.isArray(v) ? v[0] ?? "" : v;
}

function parseTagsParam(v: string | string[] | undefined): string[] {
  const raw = toSingle(v).trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const PAGE_SIZE = 100;

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await supabaseServer();
  const sp = await searchParams;

  const q = toSingle(sp.q).trim();
  const selectedTags = parseTagsParam(sp.tags);
  const viewId = toSingle(sp.view).trim();

  const { seasonalTags, popularTags } = await getTagPicks({
    supabase,
    seasonalCandidates: getSeasonalTagCandidates(new Date()),
  });

  const { assets, totalCount, error } = await searchAssets({
    supabase,
    q,
    tags: selectedTags,
    limit: PAGE_SIZE,
    offset: 0,
  });

  if (error) {
    console.error("[assets] fetch error", error);
  }

  const hasCondition = q !== "" || selectedTags.length > 0;

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)]">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <h1 className={typography("h1")}>素材一覧</h1>

        <nav className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
          <Link href="/assets" className="opacity-70 hover:opacity-100 underline">
            素材一覧
          </Link>

          {q && (
            <>
              <span className="opacity-40">/</span>
              <span className="opacity-80">
                「{q}」
                <Link
                  href={`/assets?tags=${selectedTags.join(",")}`}
                  className="ml-1 opacity-60 hover:opacity-100 underline"
                  title="検索語を解除"
                >
                  ×
                </Link>
              </span>
            </>
          )}

          {selectedTags.map((tag) => (
            <span key={tag} className="flex items-center gap-1">
              <span className="opacity-40">/</span>
              <span className="opacity-80">
                #{tag}
                <Link
                  href={`/assets${q ? `?q=${encodeURIComponent(q)}` : ""}`}
                  className="ml-1 opacity-60 hover:opacity-100 underline"
                  title="タグを解除"
                >
                  ×
                </Link>
              </span>
            </span>
          ))}
        </nav>

        <div className="mt-4">
          <AssetsSearchBar
            initialQuery={q}
            selectedTags={selectedTags}
            seasonalTags={seasonalTags}
            popularTags={popularTags}
          />
        </div>

        <div className="mt-4 flex w-full items-center justify-end text-[13px]">
          <span className="opacity-70">
            {hasCondition
              ? `条件に一致する素材：${totalCount} 件`
              : `公開中の素材：${totalCount} 件`}
          </span>
        </div>

        {assets.length === 0 ? (
          <div className="mt-12 text-center">
            <p className={typography("body") + " opacity-60"}>
              {hasCondition
                ? "条件に一致する素材がありません。"
                : "まだ素材がありません。"}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <AssetsList
              initialAssets={assets}
              totalCount={totalCount}
              q={q}
              tags={selectedTags}
              pageSize={PAGE_SIZE}
              viewMode="scroll"
            />
          </div>
        )}
      </div>

      {/* ✅ 一覧起点モーダル（同一ページ上のオーバーレイ） */}
      {viewId && (
        <AssetDetailModal title="素材詳細">
          <AssetDetailContent assetId={viewId} showBreadcrumbs={false} />
        </AssetDetailModal>
      )}
    </main>
  );
}
