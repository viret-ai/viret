// =====================================
// components/assets/AssetsList.client.tsx
// 素材一覧（100件ずつ手動読み込み）
// - 一覧起点の詳細は「/assets?view=<id>」で同一ページ上オーバーレイ
// - 戻りで state を壊さない（追加ロード件数・スクロール保持）
// - scrollKey から view を除外（同一ページ内オーバーレイで復元がブレない）
// =====================================

"use client";

import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getAssetPublicUrl } from "@/lib/storage";
import AssetsDivider from "./AssetsDivider";

export type AssetRow = {
  id: string;
  title: string | null;
  preview_path: string | null;
};

type ViewMode = "scroll" | "page";

type Props = {
  initialAssets: AssetRow[];
  totalCount: number;
  q: string;
  tags: string[];
  pageSize: number;
  viewMode?: ViewMode;
};

function uniqById(list: AssetRow[]) {
  const seen = new Set<string>();
  const out: AssetRow[] = [];
  for (const a of list) {
    if (!a?.id) continue;
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

function mergeUniqueById(prev: AssetRow[], next: AssetRow[]) {
  const seen = new Set<string>();
  const out: AssetRow[] = [];

  for (const a of prev) {
    if (!a?.id) continue;
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }

  for (const a of next) {
    if (!a?.id) continue;
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }

  return out;
}

function safeParseInt(v: string | null) {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function stripViewFromSearchParams(sp: ReadonlyURLSearchParams) {
  const params = new URLSearchParams(sp.toString());
  params.delete("view");
  return params;
}

export default function AssetsList({
  initialAssets,
  totalCount,
  q,
  tags,
  pageSize,
  viewMode = "scroll",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const isAssetsListPage = pathname === "/assets";

  // =====================================
  // scrollKey は「view 以外」で固定
  // - view は同一ページ内のオーバーレイなので、スクロール復元キーに混ぜない
  // =====================================
  const scrollKey = useMemo(() => {
    const params = stripViewFromSearchParams(sp);
    const qs = params.toString();
    return `viret-assets-scroll:/assets?${qs}`;
  }, [sp]);

  const [items, setItems] = useState<AssetRow[]>(() => uniqById(initialAssets));
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number>(totalCount);
  const [newlyAdded, setNewlyAdded] = useState<number>(0);

  const restoredRef = useRef(false);

  const loadedCount = items.length;
  const hasMore = loadedCount < total;

  // =====================================
  // スクロール復元（/assets のときだけ）
  // =====================================
  useEffect(() => {
    if (!isAssetsListPage) {
      restoredRef.current = true;
      return;
    }
    if (restoredRef.current) return;

    try {
      const saved = sessionStorage.getItem(scrollKey);
      const y = safeParseInt(saved);
      if (typeof y === "number") {
        requestAnimationFrame(() => {
          window.scrollTo(0, y);
          restoredRef.current = true;
        });
      } else {
        restoredRef.current = true;
      }
    } catch {
      restoredRef.current = true;
    }
  }, [scrollKey, isAssetsListPage]);

  const saveScroll = () => {
    if (!isAssetsListPage) return;
    try {
      sessionStorage.setItem(scrollKey, String(window.scrollY));
    } catch {}
  };

  // =====================================
  // スクロール保存（/assets のときだけ）
  // =====================================
  useEffect(() => {
    if (!isAssetsListPage) return;

    const handlePageHide = () => saveScroll();
    window.addEventListener("pagehide", handlePageHide);

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        saveScroll();
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrollKey, isAssetsListPage]);

  // =====================================
  // Load more
  // =====================================
  const handleLoadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setNewlyAdded(0);

    try {
      const params = new URLSearchParams({
        q,
        tags: tags.join(","),
        limit: String(pageSize),
        offset: String(loadedCount),
        refresh: "1",
      });

      const res = await fetch(`/api/assets/search?${params}`);
      if (!res.ok) throw new Error("fetch failed");

      const json = await res.json();
      const next: AssetRow[] = Array.isArray(json.assets) ? json.assets : [];

      const nextTotalRaw =
        typeof json.totalCount === "number"
          ? json.totalCount
          : typeof json.total_count === "number"
            ? json.total_count
            : null;

      if (typeof nextTotalRaw === "number") {
        if (nextTotalRaw > total) setNewlyAdded(nextTotalRaw - total);
        setTotal(nextTotalRaw);
      }

      setItems((prev) => mergeUniqueById(prev, next));
    } catch (e) {
      console.error("[AssetsList] load more error", e);
    } finally {
      setLoading(false);
    }
  };

  const allLoaded = total > 0 && items.length >= total;

  // =====================================
  // Overlay open (same page)
  // =====================================
  const openOverlay = (id: string) => {
    saveScroll();

    const params = stripViewFromSearchParams(sp);
    params.set("view", id);

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2">
        {items.map((item, index) => {
          const url = item.preview_path ? getAssetPublicUrl(item.preview_path) : null;

          const showDivider = (index + 1) % pageSize === 0 && index + 1 < items.length;

          return (
            <Fragment key={item.id}>
              <button
                type="button"
                onClick={() => openOverlay(item.id)}
                className="
                  group relative flex-none
                  h-40 sm:h-44 md:h-52 lg:h-56
                  overflow-hidden
                  bg-slate-100 dark:bg-slate-800
                  rounded-none
                  text-left
                "
                aria-label="素材詳細を開く"
              >
                {url && (
                  <img
                    src={url}
                    alt={item.title || "asset preview"}
                    className="
                      h-full w-auto max-w-none
                      object-contain
                      transition-transform duration-300
                      group-hover:scale-[1.03]
                    "
                  />
                )}

                <div
                  className="
                    pointer-events-none
                    absolute inset-x-0 bottom-0
                    flex items-end
                    bg-gradient-to-t from-black/70 via-black/30 to-transparent
                    px-2 pb-1.5 pt-8
                    opacity-0
                    transition-opacity duration-200
                    group-hover:opacity-100
                  "
                >
                  <span className="line-clamp-2 text-[11px] font-semibold text-white">
                    {item.title || "タイトル未設定"}
                  </span>
                </div>
              </button>

              {showDivider && <AssetsDivider count={index + 1} total={total} />}
            </Fragment>
          );
        })}
      </div>

      {total > 0 && (
        <div className="mt-10 flex flex-col items-center gap-1.5">
          {newlyAdded > 0 && (
            <div className="text-[11px] opacity-60">
              新しい素材が追加されました（+{newlyAdded}）
            </div>
          )}

          {hasMore ? (
            <>
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="
                  rounded-md border border-black/10 dark:border-white/10
                  px-6 py-2 text-sm
                  hover:bg-black/5 dark:hover:bg-white/5
                  disabled:opacity-50
                "
              >
                {loading ? "読み込み中…" : `さらに ${pageSize} 件を読み込む`}
              </button>

              <span className="text-[11px] opacity-60">
                {items.length} / {total} 件を表示中
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] opacity-60">
                {items.length} / {total} 件を表示中
              </span>

              {allLoaded && (
                <div className="text-[11px] opacity-60">
                  これ以上の素材はありません：全件表示しました
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
