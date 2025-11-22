// =====================================
// app/layout.tsx
// ルートレイアウト（lib/theme.ts 連動テーマ）
// - body に CSS 変数を適用
// - Light/Dark の切り替えは今後 user 設定で対応
// =====================================

import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode, CSSProperties } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { themeConfig } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Viret",
  description: "AI画像とレタッチャーのための素材マーケット",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // いまは常にライトモード、後でダーク対応
  const isDark = false;

  const colors = themeConfig.colors;
  const bgColor = isDark ? colors.darkBg : colors.lightBg;
  const textColor = isDark ? colors.darkText : colors.lightText;
  const cardBgColor = isDark ? colors.darkCardBg : colors.lightCardBg;

  return (
    <html lang="ja" className={isDark ? "dark" : ""}>
      <body
        className="min-h-screen antialiased"
        style={
          {
            "--v-bg": bgColor,
            "--v-text": textColor,
            "--v-card-bg": cardBgColor,
          } as CSSProperties
        }
      >
        <div className="flex min-h-screen flex-col bg-[var(--v-bg)] text-[var(--v-text)]">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
