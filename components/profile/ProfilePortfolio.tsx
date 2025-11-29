// =====================================
// components/profile/ProfilePortfolio.tsx
// プロフィールページ用ポートフォリオ一覧コンポーネント
// - レタッチャー／AI画像職人の実績サムネをグリッド表示
// - Before / After サムネ・タグ・価格目安などをまとめて表示
// =====================================

import Card from "@/components/ui/Card";

// ポートフォリオ1件分の型
export type PortfolioItem = {
  id: string;
  title: string; // 作品タイトル
  role: "seller" | "retoucher" | "both"; // その作品での立場
  thumbnailAfterUrl: string; // After（完成版）サムネは必須
  thumbnailBeforeUrl?: string; // Before（元画像）があれば任意で表示
  tags?: string[]; // 「指修正」「背景切り抜き」などのタグ
  pinSummaryText?: string; // 「人物ピン×2 / 背景ピン×1」など
  priceExampleText?: string; // 「例：¥5,000〜¥8,000」など
  noteShort?: string; // 一言メモ（任意）
};

// コンポーネントの props
type ProfilePortfolioProps = {
  items: PortfolioItem[];
  showHeader?: boolean; // 上部の見出しを出すかどうか
};

export default function ProfilePortfolio({
  items,
  showHeader = true,
}: ProfilePortfolioProps) {
  const hasItems = items.length > 0;

  return (
    <section className="space-y-3">
      {showHeader && (
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              ポートフォリオ
            </h2>
            <p className="text-[11px] text-slate-500">
              代表的なレタッチ実績やAI画像作品がここに表示されます。
            </p>
          </div>
        </header>
      )}

      {!hasItems && (
        <Card className="border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
          まだポートフォリオが登録されていません。
          <br />
          依頼で制作した作品やサンプルレタッチを追加すると、ここに一覧表示されます。
        </Card>
      )}

      {hasItems && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="flex h-full flex-col overflow-hidden border border-slate-200 bg-white"
            >
              {/* サムネイルエリア */}
              <div className="relative flex gap-1 border-b border-slate-200 bg-slate-950/95 p-2">
                {/* Before / After を並べる（Before がなければ After を中央に1枚） */}
                {item.thumbnailBeforeUrl ? (
                  <>
                    <ThumbWithLabel
                      label="Before"
                      imageUrl={item.thumbnailBeforeUrl}
                    />
                    <ThumbWithLabel
                      label="After"
                      imageUrl={item.thumbnailAfterUrl}
                    />
                  </>
                ) : (
                  <ThumbWithLabel
                    label="After"
                    imageUrl={item.thumbnailAfterUrl}
                    fullWidth
                  />
                )}
              </div>

              {/* 本文エリア */}
              <div className="flex flex-1 flex-col gap-2 px-3 py-3 text-xs text-slate-800">
                {/* タイトル＋ロール */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[13px] font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    {item.noteShort && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">
                        {item.noteShort}
                      </p>
                    )}
                  </div>

                  <RoleBadge role={item.role} />
                </div>

                {/* タグ */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* ピン内訳＋価格目安 */}
                {(item.pinSummaryText || item.priceExampleText) && (
                  <div className="mt-1 space-y-1 rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
                    {item.pinSummaryText && (
                      <p className="text-[11px] text-slate-700">
                        {item.pinSummaryText}
                      </p>
                    )}
                    {item.priceExampleText && (
                      <p className="text-[10px] font-mono text-slate-500">
                        {item.priceExampleText}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

// ===== サムネ部分の小コンポーネント =====

type ThumbProps = {
  label: string;
  imageUrl: string;
  fullWidth?: boolean;
};

function ThumbWithLabel({ label, imageUrl, fullWidth }: ThumbProps) {
  return (
    <div
      className={[
        "flex flex-1 flex-col gap-1 rounded border border-slate-800 bg-black/80 p-1.5",
        fullWidth ? "min-w-0" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between text-[10px] text-slate-200">
        <span className="font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex min-h-[90px] items-center justify-center overflow-hidden rounded bg-black">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            className="h-auto max-h-[160px] w-full object-cover opacity-90"
          />
        ) : (
          <span className="text-[10px] text-slate-500">画像なし</span>
        )}
      </div>
    </div>
  );
}

// ===== ロールバッジ（buyer/seller/retoucher/both） =====

type RoleBadgeProps = {
  role: PortfolioItem["role"];
};

function RoleBadge({ role }: RoleBadgeProps) {
  let label = "";
  let className = "";

  switch (role) {
    case "seller":
      label = "AI画像提供";
      className = "bg-sky-100 text-sky-700 border-sky-200";
      break;
    case "retoucher":
      label = "レタッチ担当";
      className = "bg-emerald-100 text-emerald-700 border-emerald-200";
      break;
    case "both":
      label = "生成＋レタッチ";
      className = "bg-slate-900 text-white border-slate-900";
      break;
  }

  return (
    <span
      className={[
        "whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}
