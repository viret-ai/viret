// =====================================
// app/api/coins/apply/route.ts
// コイン増減 API（whitelist + 残高不足チェック込み）
// - POST /api/coins/apply
// - ログイン必須（未ログインは 401）
// - 反映は RPC coin_apply_delta に委譲
// - reason_codeごとに delta の符号を強制（事故防止）
// =====================================

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type CoinReasonCode =
  | "coin_purchase"
  | "asset_download_debit"
  | "asset_download_credit"
  | "subscription_debit"
  | "retouch_fee_debit"
  | "retouch_fee_credit"
  | "cashout_debit"
  | "cashout_fee_debit"
  | "admin_adjust_credit"
  | "admin_adjust_debit";

type Body = {
  deltaCoins: number;
  reasonCode: CoinReasonCode;
  sourceType: string;
  sourceId: string;
  note?: string | null;
};

const USER_ALLOWED_REASONS: CoinReasonCode[] = [
  "asset_download_debit",
  "asset_download_credit",
  "subscription_debit",
  "retouch_fee_debit",
  "retouch_fee_credit",
  "cashout_debit",
  "cashout_fee_debit",
  // "coin_purchase" は本来 payout/stripe 経由でのみ増える想定だが、
  // v0で動作確認したいならここに入れてもOK（いまは payout API 経由で増やしてるので外す）
];

function forceDeltaSign(reason: CoinReasonCode, delta: number): number {
  const n = Number(delta);
  if (!Number.isFinite(n) || n === 0) return 0;

  // debit はマイナス、credit/purchase はプラス
  const isDebit =
    reason === "asset_download_debit" ||
    reason === "subscription_debit" ||
    reason === "retouch_fee_debit" ||
    reason === "cashout_debit" ||
    reason === "cashout_fee_debit" ||
    reason === "admin_adjust_debit";

  const isCredit =
    reason === "asset_download_credit" ||
    reason === "retouch_fee_credit" ||
    reason === "coin_purchase" ||
    reason === "admin_adjust_credit";

  const abs = Math.floor(Math.abs(n));

  if (abs === 0) return 0;
  if (isDebit) return -abs;
  if (isCredit) return abs;

  return 0;
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

  const reason = body?.reasonCode;

  if (
    typeof body?.deltaCoins !== "number" ||
    !Number.isFinite(body.deltaCoins) ||
    typeof reason !== "string" ||
    reason.length === 0 ||
    typeof body?.sourceType !== "string" ||
    body.sourceType.length === 0 ||
    typeof body?.sourceId !== "string" ||
    body.sourceId.length === 0
  ) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  // whitelist（一般ユーザー用）
  if (!USER_ALLOWED_REASONS.includes(reason)) {
    return NextResponse.json({ ok: false, error: "REASON_NOT_ALLOWED" }, { status: 403 });
  }

  const delta = forceDeltaSign(reason, body.deltaCoins);
  if (delta === 0) {
    return NextResponse.json({ ok: false, error: "INVALID_DELTA" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("coin_apply_delta", {
    uid: user.id,
    delta,
    reason_code: reason,
    source_type: body.sourceType,
    source_id: body.sourceId,
    note: body.note ?? null,
  });

  if (error) {
    if ((error.message || "").includes("INSUFFICIENT_COINS")) {
      return NextResponse.json({ ok: false, error: "INSUFFICIENT_COINS" }, { status: 409 });
    }

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
