// =====================================
// lib/roles.ts
// Viret のロール定義・権限ヘルパー
// - visitor       : 素材を購入・DLする人
// - generatist  : 促画師（AI生成専門）
// - retoucher   : レタッチャー
// - both        : 促画師兼レタッチャー
// - official    : 公式アカウント
// =====================================

export type ProfileRole = "visitor" | "generatist" | "retoucher" | "both" | "official";

// 日本語ラベル（UI表示用）
export const ROLE_LABEL_JA: Record<ProfileRole, string> = {
  visitor: "ビジター（閲覧者・DL利用者）",
  generatist: "促画師（AI画像投稿者）",
  retoucher: "レタッチャー（AI画像修正師）",
  both: "促画師＋レタッチャー",
  official: "公式アカウント",
};

// 英語ラベル（将来的な多言語化やメタデータ用）
export const ROLE_LABEL_EN: Record<ProfileRole, string> = {
  visitor: "Visitor",
  generatist: "Generatist",
  retoucher: "Retoucher",
  both: "Generatist & Retoucher",
  official: "Official Account",
};

// ロールを表示するためのユーティリティ
export function getRoleLabel(
  role: ProfileRole,
  locale: "ja" | "en" = "ja",
): string {
  if (locale === "en") {
    return ROLE_LABEL_EN[role];
  }
  return ROLE_LABEL_JA[role];
}

// ==============================
// 権限ヘルパー（仕様メモ込み）
// ==============================

// 素材アップロードができるかどうか
// - official: 公式 → OK
// - generatist: 促画師 → OK
// - both     : 促画師＋レタッチャー → OK
// - retoucher / visitor は基本 NG 想定（後で変えるならここ）
export function canUploadAssets(role: ProfileRole): boolean {
  return role === "generatist" || role === "both" || role === "official";
}

// レタッチ案件に応募できるかどうか
export function canApplyRetouchJobs(role: ProfileRole): boolean {
  return role === "retoucher" || role === "both" || role === "official";
}

// 将来的に「ロール未設定」の扱いが出てきたとき用の
// フォールバック想定（今は使っていない）
export const DEFAULT_ROLE: ProfileRole = "visitor";
