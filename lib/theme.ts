// =====================================
// lib/theme.ts
// Viret テーマ設定（色 / 角丸 / 影 / 余白 / タイポグラフィ）
// - Card / Button / Typography が参照する共通トークン
// - 色コードは 8桁HEX（#RRGGBBAA）“のみ”
// - 有彩色は「意味色」トークンとして用意（最終値はVoidが眼鏡チェックで確定）
// =====================================

// 角丸・影トークン
export type RadiusToken = "none" | "sm" | "md" | "lg" | "xl";
export type ShadowToken = "none" | "xs" | "sm" | "md";

// 見出し・本文などのバリアント
export type TypographyVariant = "h1" | "h2" | "h3" | "body" | "caption";

// ボタンバリアント
export type ButtonVariant = "outline" | "ghost" | "soft" | "dangerOutline";

type TypographyConfig = {
  font: "heading" | "body";
  sizeClass: string;
  weightClass: string;
  trackingClass?: string;
  leadingClass?: string;
};

type ThemeConfig = {
  headingFont: string;
  bodyFont: string;

  colors: {
    // 背景
    lightBg: string;
    darkBg: string;

    // テキスト
    lightText: string;
    darkText: string;

    // 補足テキスト
    lightMutedText: string;
    darkMutedText: string;

    // カード
    lightCardBg: string;
    darkCardBg: string;

    // UI
    lightBorder: string;
    darkBorder: string;
    lightHoverBg: string;
    darkHoverBg: string;
    lightDisabledBg: string;
    darkDisabledBg: string;

    // 意味色（※仮）
    lightAccent: string;
    darkAccent: string;
    lightSuccess: string;
    darkSuccess: string;
    lightWarning: string;
    darkWarning: string;
    lightDanger: string;
    darkDanger: string;
  };

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
    cardPadding: string;
  };

  typography: Record<TypographyVariant, TypographyConfig>;
};

export const themeConfig: ThemeConfig = {
  headingFont:
    '"Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  bodyFont:
    '"Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

  colors: {
    // 背景
    lightBg: "#F8FAFCFF",
    darkBg: "#020617FF",

    // テキスト
    lightText: "#0F172AFF",
    darkText: "#E5E7EBFF",

    // 補足
    lightMutedText: "#64748BFF",
    darkMutedText: "#94A3B8FF",

    // カード
    lightCardBg: "#FFFFFFFF",
    darkCardBg: "#0B1120FF",

    // UI
    lightBorder: "#0000001A",
    darkBorder: "#FFFFFF1A",
    lightHoverBg: "#0000000D",
    darkHoverBg: "#FFFFFF1A",
    lightDisabledBg: "#0000000D",
    darkDisabledBg: "#FFFFFF1A",

    // 意味色（仮・眼鏡で最終決定）
    lightAccent: "#000000FF",
    darkAccent: "#000000FF",
    lightSuccess: "#000000FF",
    darkSuccess: "#000000FF",
    lightWarning: "#000000FF",
    darkWarning: "#000000FF",
    lightDanger: "#000000FF",
    darkDanger: "#000000FF",
  },

  cornerRadius: "none",

  radius: {
    card: "none",
    button: "none",
    input: "none",
    modal: "none",
  },

  shadows: {
    card: "none",
    overlay: "none",
  },

  spacing: {
    cardPadding: "p-4",
  },

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
// radius / shadow
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
      return "rounded-none";
  }
}

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
      return "";
  }
}

// =====================================
// typography
// =====================================

export function getTypographyClasses(variant: TypographyVariant): string {
  const t = themeConfig.typography[variant];
  return [t.sizeClass, t.weightClass, t.trackingClass, t.leadingClass]
    .filter(Boolean)
    .join(" ");
}

export function getTypographyStyle(
  variant: TypographyVariant,
): { fontFamily: string } {
  const t = themeConfig.typography[variant];
  return {
    fontFamily:
      t.font === "heading"
        ? themeConfig.headingFont
        : themeConfig.bodyFont,
  };
}

export function typography(variant: TypographyVariant): string {
  const t = themeConfig.typography[variant];
  const fontClass = t.font === "heading" ? "font-heading" : "font-body";
  return [fontClass, getTypographyClasses(variant)].join(" ");
}

// =====================================
// button()
// =====================================

export function button(variant: ButtonVariant = "outline"): string {
  const base = [
    "inline-flex items-center justify-center",
    resolveRadiusClass(themeConfig.radius.button),
    "px-4 py-2",
    "text-sm font-semibold",
    "text-[var(--v-text)]",
    "transition-colors",
    "select-none",
    "disabled:opacity-60 disabled:cursor-not-allowed",
  ].join(" ");

  switch (variant) {
    case "outline":
      return [
        base,
        "border",
        "border-[#0000001A] dark:border-[#FFFFFF1A]",
        "hover:bg-[#0000000D] dark:hover:bg-[#FFFFFF1A]",
      ].join(" ");

    case "ghost":
      return [
        base,
        "hover:bg-[#0000000D] dark:hover:bg-[#FFFFFF1A]",
      ].join(" ");

    case "soft":
      return [
        base,
        "border",
        "border-[#0000001A] dark:border-[#FFFFFF1A]",
        "bg-[#0000000D] dark:bg-[#FFFFFF1A]",
        "hover:bg-[#00000026] dark:hover:bg-[#FFFFFF26]",
      ].join(" ");

    case "dangerOutline":
      return [
        base,
        "border",
        // ✅ 意味色トークン参照（仮色でも構造を守る）
        `border-[${themeConfig.colors.lightDanger}] dark:border-[${themeConfig.colors.darkDanger}]`,
        `text-[${themeConfig.colors.lightDanger}] dark:text-[${themeConfig.colors.darkDanger}]`,
        "hover:bg-[#0000000D] dark:hover:bg-[#FFFFFF1A]",
      ].join(" ");

    default:
      return base;
  }
}
