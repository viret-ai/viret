// =====================================
// app/assets/layout.tsx
// /assets 配下レイアウト
// - @modal は廃止（フォルダごと削除済み）
// - 通常の children だけを描画する
// =====================================

import type { ReactNode } from "react";

export default function AssetsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
