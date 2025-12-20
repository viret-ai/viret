// =====================================
// lib/coins/whitelist.ts
// コイン操作用 whitelist
// =====================================

export const COIN_REASON_WHITELIST = [
  "asset_download_debit",
  "subscription_debit",
  "retouch_fee_debit",
] as const;

export type CoinReasonCode = typeof COIN_REASON_WHITELIST[number];

export const COIN_SOURCE_WHITELIST = [
  "asset",
  "subscription",
  "job",
] as const;

export type CoinSourceType = typeof COIN_SOURCE_WHITELIST[number];

export function isValidReason(v: unknown): v is CoinReasonCode {
  return typeof v === "string" && COIN_REASON_WHITELIST.includes(v as CoinReasonCode);
}

export function isValidSource(v: unknown): v is CoinSourceType {
  return typeof v === "string" && COIN_SOURCE_WHITELIST.includes(v as CoinSourceType);
}
