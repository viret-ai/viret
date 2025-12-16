// =====================================
// lib/ui/buttonClasses.ts
// ボタンクラス生成（Server/Client 両対応）
// - Server Component からも呼べる純関数
// =====================================

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  // サイズ別クラス
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  // ✅ 要望：基本黒文字（＝text-whiteを使わない）
  let variantClass = "";
  switch (variant) {
    case "primary":
      variantClass =
        "border border-black/10 dark:border-white/10 bg-black/10 dark:bg-white/15 " +
        "text-[var(--v-text)] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60";
      break;
    case "secondary":
      variantClass =
        "border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 " +
        "text-[var(--v-text)] hover:bg-black/10 dark:hover:bg-white/15 disabled:opacity-60";
      break;
    case "outline":
      variantClass =
        "border border-black/10 dark:border-white/10 bg-transparent " +
        "text-[var(--v-text)] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60";
      break;
    case "ghost":
      variantClass =
        "bg-transparent text-[var(--v-text)] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60";
      break;
    case "danger":
      variantClass =
        "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 disabled:opacity-60";
      break;
  }

  const baseClass =
    "inline-flex items-center justify-center gap-1.5 font-semibold transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--v-bg)] " +
    "disabled:cursor-not-allowed rounded-md";

  return [baseClass, sizeClass, variantClass, className].filter(Boolean).join(" ");
}
