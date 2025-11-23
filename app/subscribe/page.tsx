// =====================================
// app/subscribe/page.tsx
// サブスク紹介ページ（Viret Pass）
// テーマ連動版（Card + Typography + Button）
// =====================================

import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { typography } from "@/lib/theme";

export default function SubscribePage() {
  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* パンくず */}
        <div className={`${typography("caption")} mb-6 text-slate-500`}>
          <Link href="/" className="hover:underline">
            Viret
          </Link>
          <span className="mx-1">/</span>
          <span>プラン</span>
        </div>

        {/* タイトル＋説明 */}
        <h1 className={typography("h1")}>
          Viret Pass（仮） / 月額プラン
        </h1>
        <p
          className={`${typography("body")} mt-3 text-sm leading-relaxed opacity-80`}
        >
          Viret Pass は、AI画像素材を日常的に使う人のための月額プランです。
          現在は UI だけ先に用意しており、料金や支払い処理（Stripe連携）は
          このあと順番に追加していきます。
        </p>

        {/* プランカード */}
        <Card className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span className="text-[11px] font-semibold text-sky-700">
                  準備中のサブスク
                </span>
              </div>

              <h2 className={`${typography("h2")} mt-3 text-xl`}>
                Viret Pass
              </h2>
              <p
                className={`${typography("body")} mt-1 text-sm opacity-80`}
              >
                「広告なし・サイズ無制限でAI画像をダウンロードし放題」にするための
                プランです。
              </p>
            </div>

            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide opacity-70">
                想定価格
              </div>
              <div className="mt-1 text-3xl font-bold">
                ¥1,000
                <span className="text-sm font-normal opacity-60">
                  /月（税込想定）
                </span>
              </div>
            </div>
          </div>

          <ul
            className={`${typography("body")} mt-5 space-y-2 text-sm opacity-90`}
          >
            <li>・Small / HD / Original すべてのサイズがダウンロードし放題</li>
            <li>・Small の無料DLで表示される広告が完全にオフになる</li>
            <li>・商用利用OKのAI画像素材を、まとめて安心して使える</li>
            <li>・レタッチ案件や仲介サービスとは別枠で利用可能</li>
          </ul>

          <Card
            variant="ghost"
            padded
            className="mt-6 bg-slate-50 text-[11px] opacity-70"
          >
            <p className={typography("caption")}>
              ※現時点ではテスト段階のため、実際の決済処理はまだ有効ではありません。
              Stripeを使った本番用の決済フロー（登録・解約・更新）をこのあと順番に実装します。
            </p>
          </Card>

          {/* ボタン群 */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled
              className="inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-60"
            >
              登録（準備中）
            </Button>

            <Link
              href="/assets"
              className="
                inline-flex items-center justify-center
                rounded-sm border border-slate-300
                px-4 py-2 text-sm font-semibold
                hover:bg-slate-50
              "
            >
              まずは素材一覧を見る
            </Link>
          </div>
        </Card>

        {/* 下段説明 */}
        <section className="mt-8 space-y-3 text-xs opacity-80">
          <h3 className={`${typography("h2")} text-sm`}>
            どういう人向けのプラン？
          </h3>
          <p className={typography("caption")}>
            ・動画編集者 / サムネ職人 / SNS運用担当など、日常的にAI画像素材を大量に使う人。
          </p>
          <p className={typography("caption")}>
            ・「毎回広告を見るのが面倒」「1枚ずつ購入するより、定額で使い倒したい」
            という人。
          </p>
        </section>
      </div>
    </main>
  );
}
