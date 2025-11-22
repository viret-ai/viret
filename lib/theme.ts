// =====================================
// lib/theme.ts
// Viret テーマ設定（色 / 角丸 / 影 / 余白 / タイポグラフィ）
// =====================================

export type RadiusToken = "none" | "sm" | "md" | "lg" | "xl";
export type ShadowToken = "none" | "xs" | "sm" | "md";

// 見出し・本文などのバリアント
export type TypographyVariant = "h1" | "h2" | "h3" | "body" | "caption";

type TypographyConfig = {
  // headingFont / bodyFont のどちらを使うか
  font: "heading" | "body";
  // Tailwind のサイズクラス（例: text-2xl）
  sizeClass: string;
  // 太さ（例: font-semibold）
  weightClass: string;
  // 字間（任意）
  trackingClass?: string;
  // 行間（任意）
  leadingClass?: string;
};

type ThemeConfig = {
  headingFont: string;
  bodyFont: string;
  colors: {
    lightBg: string;
    darkBg: string;
    lightText: string;
    darkText: string;
    lightCardBg: string;
    darkCardBg: string;
  };
  // ページ全体で使う基本角丸
  cornerRadius: RadiusToken;
  radius: {
    card: RadiusToken;
    button: RadiusToken;
    input: RadiusToken;
    modal: RadiusToken;
  };
  shadows: {
    card: ShadowToken;
    overlay: ShadowToken;
  };
  spacing: {
    cardPadding: string; // 例: "p-4"
  };
  typography: Record<TypographyVariant, TypographyConfig>;
};

export const themeConfig: ThemeConfig = {
  // 見出し用フォント
  headingFont:
    '"Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  // 本文用フォント
  bodyFont:
    '"Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

  // ライト / ダーク用の基本カラー
  colors: {
    // ページ背景
    lightBg: "#f8fafc", // slate-50 付近
    darkBg: "#020617", // slate-950 付近

    // テキスト色
    lightText: "#0f172a", // slate-900
    darkText: "#e5e7eb", // gray-200

    // カード背景
    lightCardBg: "#ffffff",
    darkCardBg: "#0b1120", // slate-900 より少し暗め
  },

  // 基本角丸（全体ポリシー：sm = rounded）
  cornerRadius: "sm",

  // 各コンポーネント用の角丸トークン
  radius: {
    card: "sm",
    button: "sm",
    input: "sm",
    modal: "sm",
  },

  // 影の強さ
  shadows: {
    card: "sm",
    overlay: "md",
  },

  // 余白トークン
  spacing: {
    cardPadding: "p-4",
  },

  // タイポグラフィ設定（H1/H2/H3/本文/キャプション）
  typography: {
    h1: {
      font: "heading",
      sizeClass: "text-2xl",
      weightClass: "font-semibold",
      trackingClass: "tracking-tight",
      leadingClass: "leading-tight",
    },
    h2: {
      font: "heading",
      sizeClass: "text-lg",
      weightClass: "font-semibold",
      trackingClass: "tracking-tight",
      leadingClass: "leading-snug",
    },
    h3: {
      font: "heading",
      sizeClass: "text-xs",
      weightClass: "font-semibold",
      trackingClass: "tracking-wide",
      leadingClass: "leading-none",
    },
    body: {
      font: "body",
      sizeClass: "text-sm",
      weightClass: "font-normal",
      leadingClass: "leading-relaxed",
    },
    caption: {
      font: "body",
      sizeClass: "text-xs",
      weightClass: "font-normal",
      leadingClass: "leading-relaxed",
    },
  },
};

// =====================================
// 角丸トークン → Tailwind クラス
// =====================================

export function resolveRadiusClass(token: RadiusToken): string {
  switch (token) {
    case "none":
      return "rounded-none";
    case "sm":
      return "rounded";
    case "md":
      return "rounded-md";
    case "lg":
      return "rounded-lg";
    case "xl":
      return "rounded-xl";
    default:
      return "rounded";
  }
}

// =====================================
// 影トークン → Tailwind クラス
// =====================================

export function resolveShadowClass(token: ShadowToken): string {
  switch (token) {
    case "none":
      return "";
    case "xs":
      return "shadow-sm";
    case "sm":
      return "shadow";
    case "md":
      return "shadow-md";
    default:
      return "shadow";
  }
}

// =====================================
// タイポグラフィ用ヘルパー
// - variant ごとの className / style を取得
// =====================================

export function getTypographyClasses(variant: TypographyVariant): string {
  const t = themeConfig.typography[variant];
  return [
    t.sizeClass,
    t.weightClass,
    t.trackingClass,
    t.leadingClass,
  ]
    .filter(Boolean)
    .join(" ");
}

// 見出し/本文ごとに font-family を選択するための style オブジェクト
export function getTypographyStyle(
  variant: TypographyVariant,
): { fontFamily: string } {
  const t = themeConfig.typography[variant];
  const fontFamily =
    t.font === "heading" ? themeConfig.headingFont : themeConfig.bodyFont;
  return { fontFamily };
}
