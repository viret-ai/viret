// =====================================
// components/layout/Footer.tsx
// サイト共通フッター（テーマ連動・ライトベース）
// themeConfig.components は参照しない
// =====================================

import { typography } from "@/lib/theme";

export default function Footer() {
  return (
    <footer className="mt-8 w-full border-t border-slate-200 bg-[var(--v-bg)] px-6 py-4">
      <div className="flex items-center justify-between">
        <span className={`${typography("caption")} text-[var(--v-text)]/80`}>
          &copy; {new Date().getFullYear()} Viret. All rights reserved.
        </span>
        <span className={`${typography("caption")} text-slate-400`}>
          AI生成画像 × レタッチ × マーケット
        </span>
      </div>
    </footer>
  );
}
