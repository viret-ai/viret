// =====================================
// app/assets/page.tsx
// 素材一覧ページ（データ取得＋グリッド表示）
// =====================================

import { supabaseServer } from "@/lib/supabase-server";
import { getAssetPublicUrl } from "@/lib/storage";
import AssetsGrid from "./AssetsGrid";

type AssetRow = {
  id: string;
  title: string;
  preview_path: string;
  status: string;
  created_at: string;
};

export default async function AssetsPage() {
  const { data, error } = await supabaseServer
    .from("assets")
    .select("id, title, preview_path, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[assets] fetch error", error);
  }

  const rows: AssetRow[] = (data as AssetRow[] | null) ?? [];

  const items = rows
    .filter((row) => row.preview_path)
    .map((row) => ({
      id: row.id,
      title: row.title,
      imageUrl: getAssetPublicUrl(row.preview_path) ?? "",
    }))
    .filter((it) => it.imageUrl);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          素材一覧
        </h1>
        <AssetsGrid items={items} />
      </div>
    </main>
  );
}
