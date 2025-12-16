// =====================================
// components/assets/AssetsDivider.tsx
// 素材一覧の区切り線（100件ごと）
// - 左に横線、右端に「100 / 263 件を表示中」形式
// - 余白は控えめ
// =====================================

type Props = {
  count: number; // 現在までに表示している件数
  total: number; // 全件数
};

export default function AssetsDivider({ count, total }: Props) {
  return (
    <div
      className="
        my-4 flex w-full items-center
        text-[11px] text-slate-500
      "
    >
      {/* 左側の線 */}
      <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />

      {/* 件数表示 */}
      <span className="ml-4 whitespace-nowrap opacity-70">
        {count} / {total} 件を表示中
      </span>
    </div>
  );
}
