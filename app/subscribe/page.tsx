// =====================================
// app/subscribe/page.tsx
// サブスク紹介ページ（Viret Pass）
// =====================================

import Link from "next/link";

export default function SubscribePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            Viret
          </Link>
          <span className="mx-1">/</span>
          <span>プラン</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Viret Pass（仮） / 月額プラン
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          Viret Pass は、AI画像素材を日常的に使う人のための月額プランです。
          現在は UI だけ先に用意しており、料金や支払い処理（Stripe連携）は
          このあと順番に追加していきます。
        </p>

        {/* プランカード */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span className="text-[11px] font-semibold text-sky-700">
                  準備中のサブスク
                </span>
              </div>
              <h2 className="mt-3 text-xl font-bold text-slate-900">
                Viret Pass
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                「広告なし・サイズ無制限でAI画像をダウンロードし放題」にするための
                プランです。
              </p>
            </div>

            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                想定価格
              </div>
              <div className="mt-1 text-3xl font-bold text-slate-900">
                ¥1,000
                <span className="text-sm font-normal text-slate-500">
                  /月（税込想定）
                </span>
              </div>
            </div>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            <li>・Small / HD / Original すべてのサイズがダウンロードし放題</li>
            <li>・Small の無料DLで表示される広告が完全にオフになる</li>
            <li>・商用利用OKのAI画像素材を、まとめて安心して使える</li>
            <li>・レタッチ案件や仲介サービスとは別枠で利用可能</li>
          </ul>

          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
            <p>
              ※
              現時点ではテスト段階のため、実際の決済処理はまだ有効ではありません。
              Stripeを使った本番用の決済フロー（登録・解約・更新）をこのあと順番に実装します。
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center rounded-full bg-slate-300 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              登録（準備中）
            </button>
            <Link
              href="/assets"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              まずは素材一覧を見る
            </Link>
          </div>
        </section>

        <section className="mt-8 space-y-3 text-xs text-slate-600">
          <h3 className="text-sm font-semibold text-slate-900">
            どういう人向けのプラン？
          </h3>
          <p>
            ・動画編集者 / サムネ職人 / SNS運用担当など、日常的にAI画像素材を大量に使う人。
          </p>
          <p>
            ・「毎回広告を見るのが面倒」「1枚ずつ購入するより、定額で使い倒したい」
            という人。
          </p>
        </section>
      </div>
    </main>
  );
}
