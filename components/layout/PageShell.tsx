// =====================================
// components/layout/PageShell.tsx
// ページ共通シェル（外枠固定）
// - 幅 / 余白 / 背景 / 前景を統一
// - パンくずは Header 側に移動したため、このシェルでは扱わない
// - 可変なのは children のみ
// =====================================

import { typography } from "@/lib/theme";

type Slot = JSX.Element | string | null;

type Props = {
  title: Slot;

  toolbar?: Slot;
  meta?: Slot;

  children: JSX.Element;

  // ページ単位で微調整したいときの逃げ道
  containerClassName?: string;
};

export default function PageShell({
  title,
  toolbar = null,
  meta = null,
  children,
  containerClassName = "",
}: Props) {
  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)]">
      <div
        className={[
          "mx-auto max-w-[1400px] px-4 py-6",
          containerClassName,
        ].join(" ")}
      >
        {/* ページタイトル */}
        <h1 className={typography("h1")}>{title}</h1>

        {/* 操作系（検索 / フィルタ / CTA など） */}
        {toolbar && <div className="mt-4">{toolbar}</div>}

        {/* 件数・メタ情報 */}
        {meta && (
          <div className="mt-4 flex w-full items-center justify-end text-[13px]">
            {meta}
          </div>
        )}

        {/* 本体（ページごとに自由） */}
        <div className="mt-4">{children}</div>
      </div>
    </main>
  );
}
