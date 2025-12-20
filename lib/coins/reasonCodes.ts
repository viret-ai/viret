// =====================================
// lib/coins/reasonCodes.ts
// =====================================

export type CoinReasonCode =
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

export const COIN_REASON_CODES: readonly CoinReasonCode[] = [
  "coin_purchase",
  "asset_download_debit",
  "asset_download_credit",
  "subscription_debit",
  "retouch_fee_debit",
  "retouch_fee_credit",
  "cashout_debit",
  "cashout_fee_debit",
  "admin_adjust_credit",
  "admin_adjust_debit",
] as const;
