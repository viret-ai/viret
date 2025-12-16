// =====================================
// lib/assets/getAssetById.ts
// 素材詳細の取得（最小カラム）
// - ここは列の存在が確実なものだけ select する（壊れにくくする）
// =====================================

import type { SupabaseClient } from "@supabase/supabase-js";

export type AssetDetail = {
  id: string;
  title: string | null;
  preview_path: string | null;
  created_at: string | null;
  status: string | null;
};

export async function getAssetById(params: {
  supabase: SupabaseClient;
  id: string;
}) {
  const { supabase, id } = params;

  const { data, error } = await supabase
    .from("assets")
    .select("id,title,preview_path,created_at,status")
    .eq("id", id)
    .maybeSingle();

  if (error) return { asset: null as AssetDetail | null, error };

  const asset = (data ?? null) as AssetDetail | null;
  return { asset, error: null as unknown };
}
