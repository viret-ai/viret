// =====================================
// app/api/payouts/mock-purchase/route.ts
// コイン購入（モック）API（v0）
// - POST /api/payouts/mock-purchase
// - Stripe未接続の間だけ使う「擬似購入」
// - payouts に purchase(流入) を記録し、coin_ledger に coin_purchase を反映
// =====================================

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { COIN_PLANS } from "@/lib/coin-plans";
import { yenToCoins } from "@/lib/coins";

type Body = { planId: string };

function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

  if (!body?.planId || typeof body.planId !== "string") {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const plan = COIN_PLANS.find((p) => p.id === body.planId);
  if (!plan) {
    return NextResponse.json({ ok: false, error: "INVALID_PLAN" }, { status: 400 });
  }

  const coins = yenToCoins(plan.amountYen);
  if (!Number.isFinite(coins) || coins <= 0) {
    return NextResponse.json({ ok: false, error: "INVALID_COINS" }, { status: 400 });
  }

  const today = toDateOnlyString(new Date());
  const nowIso = new Date().toISOString();

  // v0: purchase は即時反映（status=succeeded / applied_at=now / actual_payout_date=today）
  // deadline_at は NOT NULL の可能性が高いので、purchaseでも適当に「今」を入れる
  const insertPayload = {
    user_id: user.id,
    amount_yen: plan.amountYen, // 税込
    cost_points: coins,

    status: "succeeded",

    scheduled_label_date: today,
    actual_payout_date: today,
    deadline_at: nowIso,

    direction: "in", // 想定: "in" / "out"
    kind: "purchase", // 想定: "purchase" / "cashout"
    stripe_ref: null, // Stripe未接続
    applied_at: nowIso,
    fee_points: 0,
    cancelled_at: null,
  };

  const { data: payout, error: payoutError } = await supabase
    .from("payouts")
    .insert(insertPayload)
    .select("id")
    .single<{ id: string }>();

  if (payoutError || !payout?.id) {
    return NextResponse.json(
      { ok: false, error: "PAYOUT_INSERT_FAILED", detail: payoutError?.message ?? "NO_ID" },
      { status: 500 },
    );
  }

  // coin_ledger 反映（残高チェック・同時実行安全はRPC側に寄せる）
  const { data: nextBalance, error: applyError } = await supabase.rpc("coin_apply_delta", {
    uid: user.id,
    delta: coins,
    reason_code: "coin_purchase",
    source_type: "payout",
    source_id: payout.id,
    note: `mock purchase: ${plan.id} / ${plan.amountYen} JPY (tax included)`,
  });

  if (applyError) {
    return NextResponse.json(
      { ok: false, error: "LEDGER_APPLY_FAILED", detail: applyError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    payoutId: payout.id,
    coinsGranted: coins,
    balance: typeof nextBalance === "number" ? nextBalance : 0,
  });
}
