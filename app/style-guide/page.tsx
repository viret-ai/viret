// =====================================
// app/style-guide/page.tsx
// タイポグラフィ＋角丸・カラー＋振込カレンダー確認用スタイルガイド
// - lib/theme.ts の設定をそのまま可視化
// - Light / Dark の文字スタイルと、色スウォッチを表示
// - 出金スケジュール用カレンダー（5 / 15 / 25）の見え方を確認
// - PageShell（標準外枠）に統合（パンくずは Header 側なので削除）
// - 色指定は 8桁HEX（#RRGGBBAA）のみ（Tailwind色名は使わない）
// - ✅ Light側：Caption だけでなく「見出し説明（ラベル行）」も muted に統一
// - ✅ 意味色（仮）の確認枠を追加（light*/dark* を並列表示）
// - ✅ このページ内での色直書きを排除（themeConfig トークンのみ参照）
// =====================================

import Calendar from "@/components/ui/Calendar";
import PageShell from "@/components/layout/PageShell";
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
  { variant: "h1", label: "H1", role: "ページタイトル", sample: "これは H1 見出しです" },
  { variant: "h2", label: "H2", role: "セクション / カードタイトル", sample: "これは H2 見出しです" },
  { variant: "h3", label: "H3", role: "ラベル / サブ見出し（TITLE / DOWNLOAD など）", sample: "これは H3 見出しです" },
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
  { id: "lightBg", label: "背景（Light）", usage: "ページ全体の背景", mode: "Light", hex: themeConfig.colors.lightBg },
  { id: "lightCardBg", label: "カード背景（Light）", usage: "Card / モーダルなどの背景", mode: "Light", hex: themeConfig.colors.lightCardBg },
  { id: "lightText", label: "テキスト（Light）", usage: "一般的な文字色", mode: "Light", hex: themeConfig.colors.lightText },
  { id: "lightMutedText", label: "補足（Light）", usage: "注釈 / キャプション / 補足", mode: "Light", hex: themeConfig.colors.lightMutedText },
  { id: "darkBg", label: "背景（Dark）", usage: "ダークモード時のページ背景", mode: "Dark", hex: themeConfig.colors.darkBg },
  { id: "darkCardBg", label: "カード背景（Dark）", usage: "ダークモード時の Card / モーダル背景", mode: "Dark", hex: themeConfig.colors.darkCardBg },
  { id: "darkText", label: "テキスト（Dark）", usage: "ダークモード時の文字色", mode: "Dark", hex: themeConfig.colors.darkText },
  { id: "darkMutedText", label: "補足（Dark）", usage: "注釈 / キャプション / 補足", mode: "Dark", hex: themeConfig.colors.darkMutedText },
];

type SemanticSpec = {
  id: "accent" | "success" | "warning" | "danger";
  label: string;
  usage: string;
  lightHex: string;
  darkHex: string;
};

const SEMANTIC_SPECS: SemanticSpec[] = [
  { id: "accent", label: "アクセント", usage: "Primary action / 強調", lightHex: themeConfig.colors.lightAccent, darkHex: themeConfig.colors.darkAccent },
  { id: "success", label: "成功", usage: "完了 / OK", lightHex: themeConfig.colors.lightSuccess, darkHex: themeConfig.colors.darkSuccess },
  { id: "warning", label: "警告", usage: "注意 / 要確認", lightHex: themeConfig.colors.lightWarning, darkHex: themeConfig.colors.darkWarning },
  { id: "danger", label: "危険", usage: "破壊 / 取消", lightHex: themeConfig.colors.lightDanger, darkHex: themeConfig.colors.darkDanger },
];

function SemanticRow({
  label,
  usage,
  lightHex,
  darkHex,
}: {
  label: string;
  usage: string;
  lightHex: string;
  darkHex: string;
}) {
  const rowRadius = resolveRadiusClass("sm");

  const rowBox = [rowRadius, "px-3 py-2 border"].join(" ");
  const chipBox = [rowRadius, "inline-flex items-center gap-2 px-2 py-1 border"].join(" ");

  return (
    <div
      className={rowBox}
      style={{
        borderColor: themeConfig.colors.lightBorder,
        backgroundColor: themeConfig.colors.lightHoverBg,
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="text-xs font-semibold" style={{ color: themeConfig.colors.lightText }}>
          {label}
          <span className="ml-2 text-[11px] font-normal" style={{ color: themeConfig.colors.lightMutedText }}>
            {usage}
          </span>
        </div>

        <div className="text-[11px]" style={{ color: themeConfig.colors.lightMutedText }}>
          light: <span className="font-mono">{lightHex}</span> / dark: <span className="font-mono">{darkHex}</span>
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {/* Light preview */}
        <div
          className={[rowRadius, "p-2 border"].join(" ")}
          style={{
            borderColor: themeConfig.colors.lightBorder,
            backgroundColor: themeConfig.colors.lightBg,
            color: themeConfig.colors.lightText,
          }}
        >
          <div className="text-[10px]" style={{ color: themeConfig.colors.lightMutedText }}>
            Light preview
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={chipBox}
              style={{
                borderColor: themeConfig.colors.lightBorder,
                backgroundColor: themeConfig.colors.lightHoverBg,
                color: themeConfig.colors.lightText,
              }}
            >
              <span
                className={resolveRadiusClass("xl") + " h-3 w-3"}
                style={{ backgroundColor: lightHex }}
                aria-hidden="true"
              />
              <span className="text-[11px]">Badge</span>
            </span>

            <span
              className={chipBox}
              style={{
                borderColor: themeConfig.colors.lightBorder,
                backgroundColor: themeConfig.colors.lightCardBg,
                color: lightHex,
              }}
            >
              <span className="text-[11px]">Text</span>
            </span>

            <span
              className={chipBox}
              style={{
                borderColor: lightHex,
                backgroundColor: themeConfig.colors.lightCardBg,
                color: themeConfig.colors.lightText,
              }}
            >
              <span className="text-[11px]">Outline</span>
            </span>
          </div>
        </div>

        {/* Dark preview */}
        <div
          className={[rowRadius, "p-2 border"].join(" ")}
          style={{
            borderColor: themeConfig.colors.darkBorder,
            backgroundColor: themeConfig.colors.darkBg,
            color: themeConfig.colors.darkText,
          }}
        >
          <div className="text-[10px]" style={{ color: themeConfig.colors.darkMutedText }}>
            Dark preview
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={chipBox}
              style={{
                borderColor: themeConfig.colors.darkBorder,
                backgroundColor: themeConfig.colors.darkHoverBg,
                color: themeConfig.colors.darkText,
              }}
            >
              <span
                className={resolveRadiusClass("xl") + " h-3 w-3"}
                style={{ backgroundColor: darkHex }}
                aria-hidden="true"
              />
              <span className="text-[11px]">Badge</span>
            </span>

            <span
              className={chipBox}
              style={{
                borderColor: themeConfig.colors.darkBorder,
                backgroundColor: themeConfig.colors.darkCardBg,
                color: darkHex,
              }}
            >
              <span className="text-[11px]">Text</span>
            </span>

            <span
              className={chipBox}
              style={{
                borderColor: darkHex,
                backgroundColor: themeConfig.colors.darkCardBg,
                color: themeConfig.colors.darkText,
              }}
            >
              <span className="text-[11px]">Outline</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StyleGuidePage() {
  const cardRadiusClass = resolveRadiusClass(themeConfig.cornerRadius);

  const sectionBase = [cardRadiusClass, "p-4 text-xs border"].join(" ");

  return (
    <PageShell
      title="スタイルガイド"
      toolbar={
        <div>
          <p className={getTypographyClasses("body")} style={getTypographyStyle("body")}>
            lib/theme.ts の設定がどのように見えるかを確認するためのテストページです。
            フォント・角丸・カラーを変更したら、このページをリロードして確認できます。
          </p>

          <div
            className={[cardRadiusClass, "mt-4 bg-[var(--v-card-bg)] p-3 text-xs border"].join(" ")}
            style={{
              borderColor: themeConfig.colors.lightBorder,
            }}
          >
            <div className="font-semibold" style={{ color: themeConfig.colors.lightText }}>
              現在のテーマ設定（lib/theme.ts）
            </div>

            <dl className="mt-2 grid gap-2 sm:grid-cols-3">
              <div className="flex gap-2">
                <dt className="w-24" style={{ color: themeConfig.colors.lightMutedText }}>
                  見出しフォント
                </dt>
                <dd className="flex-1 break-all" style={{ color: themeConfig.colors.lightText }}>
                  {themeConfig.headingFont}
                </dd>
              </div>

              <div className="flex gap-2">
                <dt className="w-24" style={{ color: themeConfig.colors.lightMutedText }}>
                  本文フォント
                </dt>
                <dd className="flex-1 break-all" style={{ color: themeConfig.colors.lightText }}>
                  {themeConfig.bodyFont}
                </dd>
              </div>

              <div className="flex gap-2">
                <dt className="w-24" style={{ color: themeConfig.colors.lightMutedText }}>
                  カード角丸
                </dt>
                <dd className="flex-1" style={{ color: themeConfig.colors.lightText }}>
                  {themeConfig.cornerRadius}{" "}
                  <span style={{ color: themeConfig.colors.lightMutedText }}>
                    （Tailwind: {resolveRadiusClass(themeConfig.cornerRadius)}）
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* カラーパレット */}
        <section
          className={sectionBase}
          style={{
            borderColor: themeConfig.colors.lightBorder,
          }}
        >
          <h2 className={getTypographyClasses("h2")} style={getTypographyStyle("h2")}>
            カラーパレット（テーマカラー）
          </h2>
          <p
            className="mt-1 text-xs"
            style={{
              ...getTypographyStyle("caption"),
              color: themeConfig.colors.lightMutedText,
            }}
          >
            lib/theme.ts の colors で設定している値を、ピッカー風の丸いスウォッチと
            HEX 表記で確認できます。実際の変更は theme.ts を編集して行ってください。
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {COLOR_SPECS.map((c) => (
              <div
                key={c.id}
                className={[resolveRadiusClass("sm"), "flex items-center gap-3 px-3 py-2 border"].join(" ")}
                style={{
                  borderColor: themeConfig.colors.lightBorder,
                  backgroundColor: themeConfig.colors.lightHoverBg,
                }}
              >
                <div
                  className={[resolveRadiusClass("xl"), "h-8 w-8 border"].join(" ")}
                  style={{
                    borderColor: themeConfig.colors.lightBorder,
                    backgroundColor: c.hex,
                  }}
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold" style={{ color: themeConfig.colors.lightText }}>
                      {c.label}
                    </div>
                    <span className="text-[10px]" style={{ color: themeConfig.colors.lightMutedText }}>
                      {c.mode}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px]" style={{ color: themeConfig.colors.lightMutedText }}>
                    {c.usage}
                  </div>
                  <div className="mt-1 font-mono text-[11px]" style={{ color: themeConfig.colors.lightText }}>
                    {c.hex}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ✅ 意味色（仮）チェック枠 */}
        <section
          className={sectionBase}
          style={{
            borderColor: themeConfig.colors.lightBorder,
          }}
        >
          <h2 className={getTypographyClasses("h2")} style={getTypographyStyle("h2")}>
            意味色（仮）チェック枠
          </h2>
          <p
            className="mt-1 text-xs"
            style={{
              ...getTypographyStyle("caption"),
              color: themeConfig.colors.lightMutedText,
            }}
          >
            有彩色はここでのみ扱う前提。値は現時点では仮（眼鏡で最終確定）。
            Light / Dark の両方で「点（バッジ） / 文字 / 枠」の見え方を並列で確認できます。
          </p>

          <div className="mt-4 flex flex-col gap-3">
            {SEMANTIC_SPECS.map((s) => (
              <SemanticRow key={s.id} label={s.label} usage={s.usage} lightHex={s.lightHex} darkHex={s.darkHex} />
            ))}
          </div>
        </section>

        {/* Light / Dark の並列タイポ表示 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Light */}
          <section
            className={[cardRadiusClass, "space-y-4 p-4 border"].join(" ")}
            style={{
              borderColor: themeConfig.colors.lightBorder,
              backgroundColor: themeConfig.colors.lightCardBg,
            }}
          >
            <h2 className={getTypographyClasses("h2")} style={getTypographyStyle("h2")}>
              Light モード
            </h2>
            <p
              className="text-xs"
              style={{
                ...getTypographyStyle("caption"),
                color: themeConfig.colors.lightMutedText,
              }}
            >
              背景が明るいときの見出し・本文・補足テキストのスタイルです。
            </p>

            <div className="mt-3 space-y-4">
              {TYPO_SPECS.map((spec) => {
                const t = themeConfig.typography[spec.variant];
                const fontKey = t.font === "body" ? "bodyFont" : "headingFont";

                const labelColor = themeConfig.colors.lightMutedText;
                const metaColor = themeConfig.colors.lightMutedText;

                const sampleColor =
                  spec.variant === "caption"
                    ? themeConfig.colors.lightMutedText
                    : themeConfig.colors.lightText;

                return (
                  <div
                    key={spec.variant}
                    className={[resolveRadiusClass("sm"), "px-3 py-2 border"].join(" ")}
                    style={{
                      borderColor: themeConfig.colors.lightBorder,
                      backgroundColor: themeConfig.colors.lightHoverBg,
                    }}
                  >
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="text-xs font-semibold" style={{ color: labelColor }}>
                        {spec.label}（{spec.role}）
                      </div>
                      <div className="text-[11px]" style={{ color: metaColor }}>
                        Font: <span className="font-mono">{fontKey}</span> / Size:{" "}
                        <span className="font-mono">{t.sizeClass}</span> / Weight:{" "}
                        <span className="font-mono">{t.weightClass}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        ...getTypographyStyle(spec.variant),
                        color: sampleColor,
                      }}
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
            className={[cardRadiusClass, "space-y-4 p-4 border"].join(" ")}
            style={{
              borderColor: themeConfig.colors.darkBorder,
              backgroundColor: themeConfig.colors.darkBg,
            }}
          >
            <h2
              className={getTypographyClasses("h2")}
              style={{
                ...getTypographyStyle("h2"),
                color: themeConfig.colors.darkText,
              }}
            >
              Dark モード
            </h2>
            <p
              className="text-xs"
              style={{
                ...getTypographyStyle("caption"),
                color: themeConfig.colors.darkMutedText,
              }}
            >
              背景が暗いときの見出し・本文・補足テキストのスタイルです。
            </p>

            <div className="mt-3 space-y-4">
              {TYPO_SPECS.map((spec) => {
                const t = themeConfig.typography[spec.variant];
                const fontKey = t.font === "body" ? "bodyFont" : "headingFont";

                const labelColor = themeConfig.colors.darkMutedText;
                const metaColor = themeConfig.colors.darkMutedText;

                const sampleColor =
                  spec.variant === "caption"
                    ? themeConfig.colors.darkMutedText
                    : themeConfig.colors.darkText;

                return (
                  <div
                    key={spec.variant}
                    className={[resolveRadiusClass("sm"), "px-3 py-2 border"].join(" ")}
                    style={{
                      borderColor: themeConfig.colors.darkBorder,
                      backgroundColor: themeConfig.colors.darkHoverBg,
                    }}
                  >
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="text-xs font-semibold" style={{ color: labelColor }}>
                        {spec.label}（{spec.role}）
                      </div>
                      <div className="text-[11px]" style={{ color: metaColor }}>
                        Font: <span className="font-mono">{fontKey}</span> / Size:{" "}
                        <span className="font-mono">{t.sizeClass}</span> / Weight:{" "}
                        <span className="font-mono">{t.weightClass}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        ...getTypographyStyle(spec.variant),
                        color: sampleColor,
                      }}
                      className={getTypographyClasses(spec.variant)}
                    >
                      {spec.sample}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* 振込カレンダー */}
        <section
          className={[cardRadiusClass, "p-4 border"].join(" ")}
          style={{
            borderColor: themeConfig.colors.lightBorder,
            backgroundColor: themeConfig.colors.lightCardBg,
          }}
        >
          <h2 className={getTypographyClasses("h2")} style={getTypographyStyle("h2")}>
            振込スケジュール カレンダー（5 / 15 / 25）
          </h2>
          <p
            className="mt-1 text-xs"
            style={{
              ...getTypographyStyle("caption"),
              color: themeConfig.colors.lightMutedText,
            }}
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
    </PageShell>
  );
}
