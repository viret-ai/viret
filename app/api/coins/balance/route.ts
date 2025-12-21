// =====================================
// app/api/coins/balance/route.ts
// 残高取得 API（v0）
// - GET /api/coins/balance
// - ログイン必須
// - RPC coin_get_balance を呼ぶ
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

  const { data, error } = await supabase.rpc("coin_get_balance", { uid: user.id });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "RPC_FAILED", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    balance: typeof data === "number" ? data : 0,
  });
}
