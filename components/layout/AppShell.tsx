// =====================================
// components/layout/AppShell.tsx
// 画面全体の骨組み
// - 左：固定サイドバー（画面端）
// - 右：メイン（既存の max-w 中央レイアウトは PageShell が担当）
// - AppShell は「全体レイアウト」だけ、ページ内の幅/余白は PageShell に寄せる
// =====================================

import SideNav from "@/components/layout/SideNav";

type Props = {
  children: JSX.Element;
};

const SIDEBAR_W = 240;

export default function AppShell({ children }: Props) {
  return (
    <div className="min-h-dvh bg-[var(--v-bg)] text-[var(--v-text)]">
      <SideNav />

      {/* サイドバーの分だけメインを右にずらす */}
      <div style={{ paddingLeft: SIDEBAR_W }}>
        {/* ページ側で <main> を持つことが多いので、ここは器だけにする */}
        {children}
      </div>
    </div>
  );
}
