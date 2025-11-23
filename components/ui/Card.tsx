// =====================================
// components/ui/Card.tsx
// 共通カードコンポーネント（テーマ連動）
// - 角丸: themeConfig.radius.card
// - 背景: var(--v-card-bg)（layoutなどで設定想定）
// - 文字色: var(--v-text)
// - シャドウ: themeConfig.shadows.card
// - 余白: themeConfig.spacing.cardPadding（p-4）
// =====================================

import type { ReactNode, ElementType } from "react";
import {
  themeConfig,
  resolveRadiusClass,
  resolveShadowClass,
} from "@/lib/theme";
import type { RadiusToken, ShadowToken } from "@/lib/theme";

type CardVariant = "solid" | "ghost" | "outline";

type CardProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  radius?: RadiusToken;
  shadow?: ShadowToken;
  variant?: CardVariant;
  padded?: boolean;
};

export default function Card({
  as,
  children,
  className,
  radius,
  shadow,
  variant = "solid",
  padded = true,
}: CardProps) {
  const Component = as ?? "div";

  const radiusClass = resolveRadiusClass(radius ?? themeConfig.radius.card);
  const shadowClass = resolveShadowClass(shadow ?? themeConfig.shadows.card);
  const paddingClass = padded ? themeConfig.spacing.cardPadding : "";

  let variantClass = "";
  switch (variant) {
    case "solid":
      variantClass = "bg-[var(--v-card-bg)] text-[var(--v-text)]";
      break;
    case "ghost":
      variantClass = "bg-transparent text-[var(--v-text)]";
      break;
    case "outline":
      variantClass =
        "bg-transparent text-[var(--v-text)] border border-slate-200";
      break;
    default:
      variantClass = "bg-[var(--v-card-bg)] text-[var(--v-text)]";
  }

  const classes = [
    radiusClass,
    shadowClass,
    paddingClass,
    variantClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Component className={classes}>{children}</Component>;
}
