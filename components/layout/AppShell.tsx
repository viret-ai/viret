// =====================================
// components/layout/AppShell.tsx
// 画面全体の骨組み
// - 左：固定サイドバー（画面端）
// - 右：メイン（既存の max-w 中央レイアウトを維持）
// =====================================

import type { ReactNode } from "react";
import SideNav from "@/components/layout/SideNav";

type Props = {
  children: ReactNode;
};

const SIDEBAR_W = 240;

export default function AppShell({ children }: Props) {
  return (
    <div className="min-h-dvh bg-[var(--v-bg)] text-[var(--v-text)]">
      <SideNav />

      {/* サイドバーの分だけメインを右にずらす */}
      <div style={{ paddingLeft: SIDEBAR_W }}>
        {/* ここは既存の“中央幅”を維持するための器 */}
        {children}
      </div>
    </div>
  );
}
