// =====================================
// app/api/assets/[id]/purchases/route.ts
// アセットの「サイズ買い切り」購入状況を返すAPI
// - coin_ledger から source_type='asset_download' の source_id を取得
// - source_id は `${assetId}:${size}`（hd/original）
// - 未ログインは 401（UI側は未購入扱いにする）
// =====================================

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type SizeOption = "sm" | "hd" | "original";

function parsePurchasedSize(assetId: string, sourceId: string): SizeOption | null {
  // // 想定：{assetId}:{size}
  if (!sourceId.startsWith(`${assetId}:`)) return null;

  const size = sourceId.slice(assetId.length + 1);
  if (size === "hd" || size === "original") return size; // // paidのみ返す
  if (size === "sm") return "sm"; // // 念のため
  return null;
}

export async function GET(_req: NextRequest, context: RouteParams) {
  const { id } = await context.params;
  const assetId = id;

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null as any } }));

  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "LOGIN_REQUIRED" }, { status: 401 });
  }

  // // coin_ledger の前提：user_id / source_type / source_id
  const { data, error } = await supabase
    .from("coin_ledger")
    .select("source_id")
    .eq("user_id", user.id)
    .eq("source_type", "asset_download")
    .like("source_id", `${assetId}:%`)
    .limit(100);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "QUERY_FAILED", detail: error.message },
      { status: 500 }
    );
  }

  const purchasedSizes = Array.from(
    new Set(
      (data ?? [])
        .map((r: any) => parsePurchasedSize(assetId, String(r?.source_id ?? "")))
        .filter(Boolean)
    )
  ) as SizeOption[];

  return NextResponse.json({ ok: true, purchasedSizes });
}
