// =====================================
// app/assets/page.tsx
// ストックサイト風素材一覧（横並び・高さ揃え）
// =====================================

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { getAssetPublicUrl } from "@/lib/storage";

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
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          素材一覧
        </h1>

        {assets.length === 0 ? (
          <div className="mt-16 text-center text-sm text-slate-500">
            まだ素材がありません。
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {assets.map((item) => {
              const url = getAssetPublicUrl(item.preview_path);

              return (
                <Link
                  key={item.id}
                  href={`/assets/${item.id}`}
                  className="group relative flex-none h-40 sm:h-44 md:h-52 lg:h-56 bg-slate-100 overflow-hidden"
                >
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

                  {/* ホバー時タイトルオーバーレイ */}
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
                    <span className="line-clamp-2 text-[11px] font-semibold text-white drop-shadow">
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
