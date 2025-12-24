// =====================================
// lib/assets/downloadTiers.ts
// アセットDL tier 定義（価格・短辺・dpi）
// - UI / API で共通利用する
// - 価格は lib 側で一元化（円→コイン換算もここ）
// =====================================

import { yenToCoins } from "@/lib/coins";

export type SizeOption = "sm" | "hd" | "original";
export type FormatOption = "jpg" | "png" | "webp";
export type KindOption = "free" | "paid";

export type DownloadTierSpec = {
  size: SizeOption;

  // // 表示用ラベル（UIでそのまま使う）
  label: string;

  // // リサイズ短辺（original は null = 無制限）
  targetShortEdgePx: number | null;

  // // 画像メタ（DPI）
  dpi: number;

  // // 価格（円はUI表示用の暫定。課金は coins を使う）
  priceYen: number;
  priceCoins: number;

  // // paid 対象か
  isPaid: boolean;
};

export const DOWNLOAD_TIERS: Record<SizeOption, DownloadTierSpec> = {
  sm: {
    size: "sm",
    label: "Small",
    targetShortEdgePx: 720,
    dpi: 300,
    priceYen: 0,
    priceCoins: 0,
    isPaid: false,
  },
  hd: {
    size: "hd",
    label: "HD",
    targetShortEdgePx: 1080,
    dpi: 350,
    priceYen: 100,
    priceCoins: Math.floor(yenToCoins(100)),
    isPaid: true,
  },
  original: {
    size: "original",
    label: "Original",
    targetShortEdgePx: null,
    dpi: 350,
    priceYen: 200,
    priceCoins: Math.floor(yenToCoins(200)),
    isPaid: true,
  },
};

export const FORMAT_LABELS: Record<FormatOption, string> = {
  jpg: "JPG",
  png: "PNG",
  webp: "WebP",
};

export function normalizeSize(input: string | null | undefined): SizeOption {
  const v = String(input ?? "original").toLowerCase();
  return (["sm", "hd", "original"] as const).includes(v as any) ? (v as SizeOption) : "original";
}

export function normalizeFormat(input: string | null | undefined): FormatOption {
  const v = String(input ?? "jpg").toLowerCase();
  return (["jpg", "png", "webp"] as const).includes(v as any) ? (v as FormatOption) : "jpg";
}

export function normalizeKind(input: string | null | undefined): KindOption {
  const v = String(input ?? "").toLowerCase();
  return v === "paid" ? "paid" : "free";
}

export function isPaidSize(size: SizeOption): boolean {
  return DOWNLOAD_TIERS[size].isPaid;
}

export function shouldCharge(kind: KindOption, size: SizeOption): boolean {
  // // kind=paid を受け取った時だけ「有料扱い」 + paid tier のみ課金
  return kind === "paid" && isPaidSize(size);
}

export function getShortEdge(w: number, h: number): number {
  return Math.min(w, h);
}

export function isTierAvailableByOriginalShortEdge(size: SizeOption, originalShortEdge: number): boolean {
  const spec = DOWNLOAD_TIERS[size];
  if (spec.targetShortEdgePx == null) return true;

  // // HD の場合は「元が 1080 以上」のときだけ解放、などの判定に使う
  return originalShortEdge >= spec.targetShortEdgePx;
}

export function calcResizedSizeByShortEdge(
  originalW: number,
  originalH: number,
  targetShortEdgePx: number,
): { w: number; h: number } {
  const short = Math.min(originalW, originalH);
  const scale = targetShortEdgePx / short;

  return {
    w: Math.round(originalW * scale),
    h: Math.round(originalH * scale),
  };
}

export function calcTargetSizeForDownload(
  size: SizeOption,
  originalW: number,
  originalH: number,
): { w: number; h: number } {
  const spec = DOWNLOAD_TIERS[size];

  // // Original はリサイズなし（ただし sharp 側の withoutEnlargement で安全に）
  if (spec.targetShortEdgePx == null) {
    return { w: originalW, h: originalH };
  }

  const originalShort = Math.min(originalW, originalH);

  // // 元が小さいなら拡大しない（= 元サイズ維持）
  if (originalShort <= spec.targetShortEdgePx) {
    return { w: originalW, h: originalH };
  }

  return calcResizedSizeByShortEdge(originalW, originalH, spec.targetShortEdgePx);
}
