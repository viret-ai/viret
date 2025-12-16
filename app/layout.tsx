// =====================================
// app/layout.tsx
// ルートレイアウト（lib/theme.ts 連動テーマ）
// - CSS 変数はここでデフォルトを定義し、レスポンシブは globals.css で上書きする
// =====================================

import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode, CSSProperties } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SideNav from "@/components/layout/SideNav";
import { themeConfig } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Viret",
  description: "AI画像とレタッチャーのための素材マーケット",
};

export default function RootLayout({ children }: { children: ReactNode }) {
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

            // 🔹 レイアウト用（レスポンシブは globals.css で上書き）
            "--v-sidebar-slot": "240px", // デフォルト：広い画面想定
            "--v-sidebar-w": "240px",    // デフォルト：広い画面想定
            "--v-header-h": "56px",

            // 🔹 中央カラム幅
            "--v-center-max": "1400px",
          } as CSSProperties
        }
      >
        <div className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)]">
          <SideNav />

          {/* ヘッダー背景は端まで */}
          <div className="fixed top-0 left-0 right-0 z-40">
            <Header />
          </div>

          <div className="flex min-h-screen flex-col pt-[var(--v-header-h)]">
            <main className="flex-1">
              {/* slot は可変（CSS変数） */}
              <div className="pl-[var(--v-sidebar-slot)] pr-[var(--v-sidebar-slot)]">
                <div
                  className="
                    mx-auto w-full
                    max-w-[var(--v-center-max)]
                    lg:min-w-[var(--v-center-min-lg)]
                  "
                >
                  {children}
                </div>
              </div>
            </main>

            {/* フッター背景は端まで */}
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
