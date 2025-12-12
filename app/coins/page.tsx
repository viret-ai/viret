// =====================================
// app/coins/page.tsx
// コイン購入ページ
// - 現金 → コインの変換レートを説明
// - あらかじめ用意した金額プランを一覧表示
// - 購入ボタンはひとまずダミー（後で Stripe と接続）
// =====================================

import Card from "@/components/ui/Card";
import { typography } from "@/lib/theme";
import { COIN_RATE_YEN_PER_COIN, COIN_UNIT_LABEL, yenToCoins } from "@/lib/coins";

// コイン購入プラン（暫定）
// - あとで金額やプラン構成は自由に変えてOK
const COIN_PLANS: { id: string; label: string; description: string; amountYen: number }[] = [
  {
    id: "starter",
    label: "スターターパック",
    description: "お試し用の少額コイン。まずは使い心地を確かめたい方向け。",
    amountYen: 500,
  },
  {
    id: "standard",
    label: "スタンダードパック",
    description: "DLや依頼にバランスよく使える基本パック。",
    amountYen: 2000,
  },
  {
    id: "pro",
    label: "プロパック",
    description: "継続的に素材DLやレタッチ依頼を行う方向けの大口パック。",
    amountYen: 5000,
  },
];

export default function CoinPurchasePage() {
  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        {/* ヘッダー */}
        <header className="space-y-3">
          <div className="text-[11px] text-slate-500">アカウント / コイン購入</div>
          <h1 className={typography("h1")}>コインを購入する</h1>
          <p className={typography("body")}>
            Viret 内では、ダウンロードやレタッチ依頼の支払いに「コイン」を使用します。
            コインは一度チャージすると、素材の購入や依頼の支払いに共通して利用できます。
          </p>
        </header>

        {/* レート説明 */}
        <section className="space-y-3">
          <h2 className={typography("h2")}>コインについて</h2>
          <Card className="p-4 space-y-2 text-sm text-slate-700">
            <p>
              現在の換算レート（暫定）は、
              <span className="font-semibold">
                {" "}
                1コイン = {COIN_RATE_YEN_PER_COIN.toLocaleString()}円相当
              </span>
              です。
            </p>
            <p>
              チャージしたコインは、下記の用途で利用できます：
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>公開素材のダウンロード</li>
              <li>レタッチ依頼の支払い</li>
              <li>今後追加される有料機能 など</li>
            </ul>
            <p className={typography("caption") + " text-slate-500"}>
              実際の決済処理（クレジットカード等）は外部サービス（Stripe）を通じて行われます。
              このページでは、コイン数と金額の目安を確認できます。
            </p>
          </Card>
        </section>

        {/* プラン一覧 */}
        <section className="space-y-3">
          <h2 className={typography("h2")}>コイン購入プラン</h2>

          <div className="grid gap-4 md:grid-cols-3">
            {COIN_PLANS.map((plan) => {
              const coins = yenToCoins(plan.amountYen);
              return (
                <Card key={plan.id} className="flex h-full flex-col border border-black/5 p-4">
                  <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
                    {plan.id}
                  </div>
                  <h3 className={typography("h3")}>{plan.label}</h3>

                  <p className={typography("body") + " mt-2 text-slate-700"}>
                    {plan.description}
                  </p>

                  <div className="mt-4 space-y-1">
                    <div className="text-[24px] font-semibold">
                      {coins.toLocaleString()}
                      <span className="ml-[2px] text-[13px] font-normal text-slate-500">
                        {COIN_UNIT_LABEL}
                      </span>
                    </div>
                    <div className="text-[12px] text-slate-500">
                      決済金額：{plan.amountYen.toLocaleString()}円（税込想定）
                    </div>
                  </div>

                  {/* ボタンエリア */}
                  <div className="mt-auto pt-4">
                    {/* ここは後で Stripe の Checkout セッション作成処理に置き換える */}
                    <button
                      type="button"
                      className="w-full rounded-md bg-[var(--v-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled
                    >
                      準備中（近日追加）
                    </button>
                    <p className={typography("caption") + " mt-2 text-slate-500"}>
                      コイン購入の決済処理は、今後のアップデートで有効化されます。
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
