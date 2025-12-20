// =====================================
// app/api/coins/apply/route.ts
// コイン増減 API（残高不足チェック込み）
// - POST /api/coins/apply
// - ログイン必須（未ログインは 401）
// - 反映は RPC coin_apply_delta に委譲
// =====================================

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type Body = {
  deltaCoins: number; // +100 / -20 みたいな
  reasonCode: string; // "asset_download_debit" など
  sourceType: string; // "asset" / "job" / "stripe_checkout" など
  sourceId: string; // assetId / jobId / checkoutSessionId
  note?: string | null;
};

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  // // 入力の最低限バリデーション（過剰に厳しくしない）
  if (
    typeof body.deltaCoins !== "number" ||
    !Number.isFinite(body.deltaCoins) ||
    body.deltaCoins === 0 ||
    typeof body.reasonCode !== "string" ||
    body.reasonCode.length === 0 ||
    typeof body.sourceType !== "string" ||
    body.sourceType.length === 0 ||
    typeof body.sourceId !== "string" ||
    body.sourceId.length === 0
  ) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("coin_apply_delta", {
    uid: user.id,
    delta: body.deltaCoins,
    reason_code: body.reasonCode,
    source_type: body.sourceType,
    source_id: body.sourceId,
    note: body.note ?? null,
  });

  if (error) {
    // // RPC側で INSUFFICIENT_COINS を raise してる想定
    if ((error.message || "").includes("INSUFFICIENT_COINS")) {
      return NextResponse.json({ ok: false, error: "INSUFFICIENT_COINS" }, { status: 409 });
    }

    return NextResponse.json(
      { ok: false, error: "RPC_FAILED", detail: error.message },
      { status: 500 },
    );
  }

  const nextBalance = typeof data === "number" ? data : 0;

  return NextResponse.json({
    ok: true,
    balance: nextBalance,
  });
}
