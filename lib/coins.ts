// =====================================
// lib/coins.ts
// コイン換算ロジック・レート定義
// - 現金(JPY) ↔ コイン の変換レートを一元管理
// - 手数料・端数処理のルールもここに集約
// =====================================

// 1コインあたりの円換算レート（暫定）
// - 1コイン = 1円相当なら 1
// - 1コイン = 10円相当なら 10 など
export const COIN_RATE_YEN_PER_COIN = 1; // ←あとで調整OK

// 将来的に UI に出すときの単位ラベル
export const COIN_UNIT_LABEL = "C"; // 例: "300 C" みたいに使う

// 小数やマイナスが紛れ込んだときの安全な丸め
function toNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  return Math.floor(value);
}

// =====================================
// 現金 → コイン（購入時）
// =====================================

// ユーザーが支払う金額（円）から、付与するコイン数を算出
// - Stripe 手数料などは別レイヤーで扱う想定
export function yenToCoins(amountYen: number): number {
  const cleanYen = toNonNegativeInt(amountYen);
  if (cleanYen === 0) return 0;

  // 1コイン = COIN_RATE_YEN_PER_COIN 円
  const coins = cleanYen / COIN_RATE_YEN_PER_COIN;

  // コインは整数で扱うので切り捨て
  return toNonNegativeInt(coins);
}

// 「このプランは何円で何コインか」をUIで見せたいとき用
export function formatYenToCoins(amountYen: number): string {
  const coins = yenToCoins(amountYen);
  return `${coins.toLocaleString()}${COIN_UNIT_LABEL}`;
}

// =====================================
// コイン → 円（出金・理論値）
// =====================================

// コイン残高から理論上の総額（税/手数料控除前）を算出
export function coinsToGrossYen(coins: number): number {
  const cleanCoins = toNonNegativeInt(coins);
  if (cleanCoins === 0) return 0;

  return cleanCoins * COIN_RATE_YEN_PER_COIN;
}

// 出金時の概算（プラットフォーム手数料などを考慮）
// - feeRate: 0.1 = 10% 手数料
export function quotePayoutYen(
  coins: number,
  feeRate: number = 0,
): { grossYen: number; feeYen: number; netYen: number } {
  const grossYen = coinsToGrossYen(coins);
  if (grossYen === 0) {
    return { grossYen: 0, feeYen: 0, netYen: 0 };
  }

  const safeFeeRate = feeRate < 0 ? 0 : feeRate;
  const feeYen = Math.floor(grossYen * safeFeeRate);
  const netYen = grossYen - feeYen;

  return {
    grossYen,
    feeYen,
    netYen: netYen < 0 ? 0 : netYen,
  };
}
