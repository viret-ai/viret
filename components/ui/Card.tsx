// =====================================
// components/ui/Card.tsx
// 共通カードコンポーネント（テーマ連動）
// - 角丸: themeConfig.radius.card（今は sm = rounded）
// - 背景: var(--v-card-bg)
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
  // 使用するタグ（div, section, aside など）
  as?: ElementType;
  // カード内コンテンツ
  children: ReactNode;
  // 追加の className
  className?: string;
  // 角丸・シャドウを個別指定したい場合（通常はデフォルトでOK）
  radius?: RadiusToken;
  shadow?: ShadowToken;
  // 見た目バリエーション
  variant?: CardVariant;
  // 余白を付けるかどうか（false にすると p-0）
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
  // タグ（未指定なら div）
  const Component = as ?? "div";

  // テーマから角丸・シャドウを取得
  const radiusClass = resolveRadiusClass(radius ?? themeConfig.radius.card);
  const shadowClass = resolveShadowClass(shadow ?? themeConfig.shadows.card);

  // 余白
  const paddingClass = padded ? themeConfig.spacing.cardPadding : "";

  // variant ごとのベースクラス
  let variantClass = "";
  switch (variant) {
    case "solid":
      // 通常のカード（背景あり）
      variantClass = "bg-[var(--v-card-bg)] text-[var(--v-text)]";
      break;
    case "ghost":
      // 背景透過寄り（今のところテキスト色だけ合わせる）
      variantClass = "bg-transparent text-[var(--v-text)]";
      break;
    case "outline":
      // 枠だけ強調したいとき用
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
