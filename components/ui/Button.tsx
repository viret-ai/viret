// =====================================
// components/ui/Button.tsx
// 共通ボタンコンポーネント（テーマ連動）
// - 角丸: themeConfig.radius.button
// - 色: variant で切り替え
// - サイズ: sm / md
// =====================================

"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { themeConfig, resolveRadiusClass } from "@/lib/theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type Props = {
  // ボタン内の表示内容
  children: ReactNode;
  // 見た目バリエーション
  variant?: ButtonVariant;
  // サイズ
  size?: ButtonSize;
  // 追加クラス
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: Props) {
  // テーマから角丸を取得
  const radiusClass = resolveRadiusClass(themeConfig.radius.button);

  // サイズ別クラス
  const sizeClass =
    size === "sm"
      ? "px-3 py-1.5 text-xs"
      : "px-4 py-2 text-sm";

  // variant ごとのクラス
  let variantClass = "";
  switch (variant) {
    case "primary":
      variantClass =
        "bg-sky-600 text-white hover:bg-sky-500 disabled:bg-sky-300";
      break;
    case "secondary":
      variantClass =
        "bg-slate-800 text-white hover:bg-slate-700 disabled:bg-slate-500";
      break;
    case "outline":
      variantClass =
        "border border-slate-300 text-[var(--v-text)] hover:bg-slate-50 disabled:opacity-60";
      break;
    case "ghost":
      variantClass =
        "bg-transparent text-[var(--v-text)] hover:bg-slate-100 disabled:opacity-60";
      break;
    case "danger":
      variantClass =
        "bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300";
      break;
  }

  const baseClass =
    "inline-flex items-center justify-center gap-1.5 font-semibold transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--v-bg)] " +
    "disabled:cursor-not-allowed";

  const classes = [baseClass, radiusClass, sizeClass, variantClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
