// =====================================
// app/assets/page.tsx
// ストックサイト風素材一覧（テーマ連動）
// =====================================

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { getAssetPublicUrl } from "@/lib/storage";
import { typography } from "@/lib/theme";

type AssetRow = {
  id: string;
  title: string;
  preview_path: string;
  created_at: string;
  status: string;
};

export default async function AssetsPage() {
  const { data, error } = await supabaseServer
    .from("assets")
    .select("id, title, preview_path, created_at, status")
    .eq("status", "public")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[assets] fetch error", error);
  }

  const assets: AssetRow[] = (data as AssetRow[] | null) ?? [];

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)]">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        {/* 見出し typography */}
        <h1 className={typography("h1")}>素材一覧</h1>

        {/* データなし */}
        {assets.length === 0 ? (
          <div className="mt-16 text-center">
            <p className={typography("body") + " opacity-60"}>
              まだ素材がありません。
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {assets.map((item) => {
              const url = getAssetPublicUrl(item.preview_path);

              return (
                <Link
                  key={item.id}
                  href={`/assets/${item.id}`}
                  className="
                    group relative flex-none
                    h-40 sm:h-44 md:h-52 lg:h-56
                    overflow-hidden
                    bg-slate-100 dark:bg-slate-800
                    rounded-none
                  "
                >
                  {/* サムネイル */}
                  {url && (
                    <img
                      src={url}
                      alt={item.title}
                      className="
                        h-full w-auto max-w-none
                        object-contain
                        transition-transform duration-300
                        group-hover:scale-[1.03]
                      "
                    />
                  )}

                  {/* タイトルオーバーレイ */}
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
                    <span
                      className="
                        line-clamp-2 text-[11px] font-semibold text-white
                        drop-shadow-sm
                      "
                    >
                      {item.title}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
