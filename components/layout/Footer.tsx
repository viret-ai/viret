// =====================================
// components/layout/Footer.tsx
// サイト共通フッター（テーマ連動・ライトベース）
// themeConfig.components は参照しない
// - 背景/枠は端まで、内容だけ中央カラム＋sidebar-slot分だけ内側に寄せる
// =====================================

import { typography } from "@/lib/theme";

export default function Footer() {
  return (
    <footer className="mt-8 w-full border-t border-slate-200 bg-[var(--v-bg)] py-4">
      {/* // sidebar-slot 分だけ左右を確保して、サイドバー下に潜らないようにする */}
      <div
        className="
          w-full
          pl-[var(--v-sidebar-slot)]
          pr-[var(--v-sidebar-slot)]
        "
      >
        {/* // 中身だけ中央カラム幅に収める（lg 以降だけ min） */}
        <div
          className="
            mx-auto w-full
            max-w-[var(--v-center-max)]
            lg:min-w-[var(--v-center-min-lg)]
            px-6
            flex items-center justify-between
          "
        >
          <span className={`${typography("caption")} text-[var(--v-text)]/80`}>
            &copy; {new Date().getFullYear()} Viret. All rights reserved.
          </span>

          <span className={`${typography("caption")} text-slate-400`}>
            AI生成画像 × レタッチ × マーケット
          </span>
        </div>
      </div>
    </footer>
  );
}
