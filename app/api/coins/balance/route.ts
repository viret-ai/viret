// =====================================
// app/api/coins/balance/route.ts
// コイン残高取得 API（ヘッダー・デバッグ用）
// - GET /api/coins/balance
// - ログイン必須
// - coin_ledger の delta 合計を返す
// =====================================

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("coin_ledger")
    .select("delta_coins")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "QUERY_FAILED", detail: error.message },
      { status: 500 },
    );
  }

  const balance = (data ?? []).reduce(
    (sum, row) => sum + (row.delta_coins ?? 0),
    0,
  );

  return NextResponse.json({
    ok: true,
    balance,
  });
}
