// =====================================
// app/style-guide/page.tsx
// タイポグラフィ＋角丸・カラー＋振込カレンダー確認用スタイルガイド
// - lib/theme.ts の設定をそのまま可視化
// - Light / Dark の文字スタイルと、色スウォッチを表示
// - 出金スケジュール用カレンダー（5 / 15 / 25）の見え方を確認
// =====================================

import Calendar from "@/components/ui/Calendar";
import {
  themeConfig,
  resolveRadiusClass,
  getTypographyClasses,
  getTypographyStyle,
  type TypographyVariant,
} from "@/lib/theme";

type TypoSpec = {
  variant: TypographyVariant;
  label: string;
  role: string;
  sample: string;
};

const TYPO_SPECS: TypoSpec[] = [
  {
    variant: "h1",
    label: "H1",
    role: "ページタイトル",
    sample: "これは H1 見出しです",
  },
  {
    variant: "h2",
    label: "H2",
    role: "セクション / カードタイトル",
    sample: "これは H2 見出しです",
  },
  {
    variant: "h3",
    label: "H3",
    role: "ラベル / サブ見出し（TITLE / DOWNLOAD など）",
    sample: "これは H3 見出しです",
  },
  {
    variant: "body",
    label: "Body",
    role: "本文（説明文など）",
    sample:
      "これは本文テキストのサンプルです。Viret の UI 全体で、一般的な説明文やボタンの補足テキストなどに使用します。",
  },
  {
    variant: "caption",
    label: "Caption",
    role: "補足 / キャプション / 注意書き",
    sample:
      "これは補足テキストのサンプルです。使用条件や注意書き、入力例など、視線の主役にはしたくないが必要な情報に使います。",
  },
];

type ColorSpec = {
  id: string;
  label: string;
  usage: string;
  mode: "Light" | "Dark";
  hex: string;
};

const COLOR_SPECS: ColorSpec[] = [
  {
    id: "lightBg",
    label: "背景（Light）",
    usage: "ページ全体の背景",
    mode: "Light",
    hex: themeConfig.colors.lightBg,
  },
  {
    id: "lightCardBg",
    label: "カード背景（Light）",
    usage: "Card / モーダルなどの背景",
    mode: "Light",
    hex: themeConfig.colors.lightCardBg,
  },
  {
    id: "lightText",
    label: "テキスト（Light）",
    usage: "一般的な文字色",
    mode: "Light",
    hex: themeConfig.colors.lightText,
  },
  {
    id: "darkBg",
    label: "背景（Dark）",
    usage: "ダークモード時のページ背景",
    mode: "Dark",
    hex: themeConfig.colors.darkBg,
  },
  {
    id: "darkCardBg",
    label: "カード背景（Dark）",
    usage: "ダークモード時の Card / モーダル背景",
    mode: "Dark",
    hex: themeConfig.colors.darkCardBg,
  },
  {
    id: "darkText",
    label: "テキスト（Dark）",
    usage: "ダークモード時の文字色",
    mode: "Dark",
    hex: themeConfig.colors.darkText,
  },
];

export default function StyleGuidePage() {
  const cardRadiusClass = resolveRadiusClass(themeConfig.cornerRadius);

  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-6 text-[var(--v-text)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* パンくず */}
        <div className="text-[11px] text-slate-500">
          <span className="font-semibold">Viret</span>
          <span className="mx-1">/</span>
          <span>Style Guide</span>
        </div>

        {/* ヘッダー */}
        <header className="space-y-3">
          <h1
            className={getTypographyClasses("h1")}
            style={getTypographyStyle("h1")}
          >
            タイポグラフィ & カラーテーマ ガイド
          </h1>
          <p
            className={getTypographyClasses("body")}
            style={getTypographyStyle("body")}
          >
            lib/theme.ts の設定がどのように見えるかを確認するためのテストページです。
            フォント・角丸・カラーを変更したら、このページをリロードして確認できます。
          </p>

          {/* 現在のテーマ設定（フォント / 角丸） */}
          <div
            className={`${cardRadiusClass} bg-[var(--v-card-bg)] p-3 text-xs text-slate-500 shadow-sm`}
          >
            <div className="font-semibold text-slate-700">
              現在のテーマ設定（lib/theme.ts）
            </div>
            <dl className="mt-2 grid gap-2 sm:grid-cols-3">
              <div className="flex gap-2">
                <dt className="w-24 text-slate-500">見出しフォント</dt>
                <dd className="flex-1 break-all text-slate-800">
                  {themeConfig.headingFont}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 text-slate-500">本文フォント</dt>
                <dd className="flex-1 break-all text-slate-800">
                  {themeConfig.bodyFont}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 text-slate-500">カード角丸</dt>
                <dd className="flex-1 text-slate-800">
                  {themeConfig.cornerRadius}{" "}
                  <span className="text-slate-400">
                    （Tailwind: {resolveRadiusClass(themeConfig.cornerRadius)}）
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </header>

        {/* カラーパレット（ピッカー風スウォッチ） */}
        <section
          className={`${cardRadiusClass} bg-[var(--v-card-bg)] p-4 text-xs shadow-sm`}
        >
          <h2
            className={getTypographyClasses("h2")}
            style={getTypographyStyle("h2")}
          >
            カラーパレット（テーマカラー）
          </h2>
          <p
            className="mt-1 text-xs text-slate-500"
            style={getTypographyStyle("caption")}
          >
            lib/theme.ts の colors で設定している値を、ピッカー風の丸いスウォッチと
            HEX 表記で確認できます。実際の変更は theme.ts を編集して行ってください。
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {COLOR_SPECS.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2"
              >
                <div
                  className="h-8 w-8 rounded-full border border-slate-200"
                  style={{ backgroundColor: c.hex }}
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold text-slate-700">
                      {c.label}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {c.mode}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {c.usage}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-600">
                    {c.hex}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Light / Dark の並列タイポ表示 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Light */}
          <section
            className={`${cardRadiusClass} space-y-4 bg-white p-4 shadow-sm`}
          >
            <h2
              className={getTypographyClasses("h2")}
              style={getTypographyStyle("h2")}
            >
              Light モード
            </h2>
            <p
              className="text-xs text-slate-500"
              style={getTypographyStyle("caption")}
            >
              背景が明るいときの見出し・本文・補足テキストのスタイルです。
            </p>

            <div className="mt-3 space-y-4">
              {TYPO_SPECS.map((spec) => {
                const t = themeConfig.typography[spec.variant];
                const fontKey =
                  t.font === "body" ? "bodyFont" : "headingFont";

                return (
                  <div
                    key={spec.variant}
                    className="rounded-md bg-slate-50 px-3 py-2"
                  >
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="text-xs font-semibold text-slate-600">
                        {spec.label}（{spec.role}）
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Font:{" "}
                        <span className="font-mono">{fontKey}</span> / Size:{" "}
                        <span className="font-mono">{t.sizeClass}</span> /
                        Weight:{" "}
                        <span className="font-mono">{t.weightClass}</span>
                      </div>
                    </div>

                    <div
                      style={getTypographyStyle(spec.variant)}
                      className={getTypographyClasses(spec.variant)}
                    >
                      {spec.sample}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Dark */}
          <section
            className={`${cardRadiusClass} space-y-4 bg-slate-900 p-4 shadow-sm`}
          >
            <h2
              className={getTypographyClasses("h2")}
              style={getTypographyStyle("h2")}
            >
              Dark モード
            </h2>
            <p
              className="text-xs text-slate-300"
              style={getTypographyStyle("caption")}
            >
              背景が暗いときの見出し・本文・補足テキストのスタイルです。
            </p>

            <div className="mt-3 space-y-4">
              {TYPO_SPECS.map((spec) => {
                const t = themeConfig.typography[spec.variant];
                const fontKey =
                  t.font === "body" ? "bodyFont" : "headingFont";

                const baseClasses = getTypographyClasses(spec.variant);
                const colorClass =
                  spec.variant === "caption"
                    ? "text-slate-400"
                    : spec.variant === "body"
                    ? "text-slate-200"
                    : "text-slate-50";

                return (
                  <div
                    key={spec.variant}
                    className="rounded-md bg-slate-950/70 px-3 py-2"
                  >
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="text-xs font-semibold text-slate-300">
                        {spec.label}（{spec.role}）
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Font:{" "}
                        <span className="font-mono">{fontKey}</span> / Size:{" "}
                        <span className="font-mono">{t.sizeClass}</span> /
                        Weight:{" "}
                        <span className="font-mono">{t.weightClass}</span>
                      </div>
                    </div>

                    <div
                      style={getTypographyStyle(spec.variant)}
                      className={`${baseClasses} ${colorClass}`}
                    >
                      {spec.sample}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* 振込カレンダーのテスト表示 */}
        <section
          className={`${cardRadiusClass} bg-[var(--v-card-bg)] p-4 shadow-sm`}
        >
          <h2
            className={getTypographyClasses("h2")}
            style={getTypographyStyle("h2")}
          >
            振込スケジュール カレンダー（5 / 15 / 25）
          </h2>
          <p
            className="mt-1 text-xs text-slate-500"
            style={getTypographyStyle("caption")}
          >
            lib/payoutSchedule.ts のロジックを使って、5 / 15 / 25 を基準とした
            出金スケジュール（ラベル日・実振込日・締切日）を月ごとに可視化します。
            青＝ラベル日、緑＝実際の振込日、赤＝締切日です。◀▶ で他の月も確認できます。
          </p>

          <div className="mt-4">
            <Calendar initialYear={2025} initialMonth={11} />
          </div>
        </section>
      </div>
    </main>
  );
}
