// =====================================
// app/subscribe/page.tsx
// サブスク紹介ページ（Viret Pass）
// ・左：Light（広告非表示のみ）
// ・右：Plus（広告＋クーポン＋月1換金無料）
// ・下：比較表
// =====================================

import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { typography } from "@/lib/theme";

export default function SubscribePage() {
  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)]">
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* パンくず */}
        <div className={`${typography("caption")} mb-6 text-slate-500`}>
          <Link href="/" className="hover:underline">
            Viret
          </Link>
          <span className="mx-1">/</span>
          <span>Viret Pass</span>
        </div>

        {/* タイトル＋説明 */}
        <h1 className={typography("h1")}>Viret Pass（月額プラン）</h1>
        <p
          className={`${typography("body")} mt-3 text-sm leading-relaxed opacity-80`}
        >
          Viret Pass は、Viret を日常的に利用するユーザー向けの月額プランです。
          無料ダウンロード時の広告を外すだけの Light と、
          広告非表示に加えてクーポン＋月1回のコイン換金無料が付く Plus の
          2 種類があります。
        </p>

        {/* 2カラム */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Light */}
          <Card className="flex h-full flex-col">
            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                <span className="text-[11px] font-semibold text-slate-700">
                  Light（広告非表示）
                </span>
              </div>

              <h2 className={`${typography("h2")} text-xl`}>
                Viret Pass Light
              </h2>

              <p className={`${typography("body")} text-sm opacity-80`}>
                無料ダウンロード時に表示される広告だけを非表示にする、
                シンプルな広告解除専用プランです。
              </p>

              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                <li>・Small 無料DL時の広告をすべて非表示</li>
                <li>・待ち時間なしで快適に利用可能</li>
                <li>・その他の機能は無料利用と同じ</li>
              </ul>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                月額料金
              </div>
              <div className="mt-1 text-3xl font-bold">
                ¥100
                <span className="text-sm font-normal opacity-60"> /月</span>
              </div>
              <div className="text-[11px] opacity-60">(税込)</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button disabled className="rounded-sm px-4 py-2 text-sm">
                  登録（準備中）
                </Button>
                <Link
                  href="/assets"
                  className="rounded-sm border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  素材一覧を見る
                </Link>
              </div>
            </div>
          </Card>

          {/* Plus */}
          <Card className="flex h-full flex-col border-sky-200 shadow-sm shadow-sky-100">
            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span className="text-[11px] font-semibold text-sky-700">
                  Plus（広告＋クーポン＋換金無料）
                </span>
              </div>

              <h2 className={`${typography("h2")} text-xl`}>
                Viret Pass Plus
              </h2>

              <p className={`${typography("body")} text-sm opacity-80`}>
                無料DL時の広告非表示に加えて、毎月 1 枚の
                オリジナルサイズ用クーポンが付与されます。
                さらに、月 1 回のコイン換金（振込依頼）手数料が無料になります。
                使わなかったクーポンは月をまたいで繰り越されます。
              </p>

              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                <li>・無料DLの広告をすべて非表示</li>
                <li>・毎月 1 枚、オリジナルサイズのDLクーポン</li>
                <li>・クーポンは上限なしで繰り越し可能</li>
                <li>・月 1 回のコイン換金（振込依頼）手数料が無料</li>
              </ul>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                月額料金
              </div>
              <div className="mt-1 text-3xl font-bold">
                ¥500
                <span className="text-sm font-normal opacity-60"> /月</span>
              </div>
              <div className="text-[11px] opacity-60">(税込)</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  disabled
                  className="rounded-sm bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                >
                  登録（準備中）
                </Button>
                <Link
                  href="/assets"
                  className="rounded-sm border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  素材一覧を見る
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* 比較表 */}
        <section className="mt-10">
          <h3 className={`${typography("h2")} mb-3 text-sm`}>プラン比較</h3>

          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold">
                    機能
                  </th>
                  <th className="px-3 py-2 text-center">無料</th>
                  <th className="px-3 py-2 text-center">Light</th>
                  <th className="px-3 py-2 text-center">Plus</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-2">無料DL時の広告</td>
                  <td className="px-3 py-2 text-center">表示あり</td>
                  <td className="px-3 py-2 text-center">非表示</td>
                  <td className="px-3 py-2 text-center">非表示</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-2">オリジナルサイズ用クーポン</td>
                  <td className="px-3 py-2 text-center">なし</td>
                  <td className="px-3 py-2 text-center">なし</td>
                  <td className="px-3 py-2 text-center">月1枚</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-2">クーポン繰り越し</td>
                  <td className="px-3 py-2 text-center">―</td>
                  <td className="px-3 py-2 text-center">―</td>
                  <td className="px-3 py-2 text-center">可能（上限なし）</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-2">月1回のコイン換金無料</td>
                  <td className="px-3 py-2 text-center">―</td>
                  <td className="px-3 py-2 text-center">―</td>
                  <td className="px-3 py-2 text-center">◯</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-2">月額料金</td>
                  <td className="px-3 py-2 text-center">¥0</td>
                  <td className="px-3 py-2 text-center">¥100</td>
                  <td className="px-3 py-2 text-center">¥500</td>
                </tr>
              </tbody>
            </table>
          </div>

          <Card
            variant="ghost"
            padded
            className="mt-4 bg-slate-50 text-[11px] text-slate-600"
          >
            <p className={typography("caption")}>
              ※Viret Pass は広告表示・特典（クーポン/換金無料）を制御するプランで、
              素材の販売条件や商用利用の可否を変更するものではありません。
            </p>
            <p className={`${typography("caption")} mt-1`}>
              ※決済（Stripe）連携は準備中です。登録・解約・更新処理は順次実装予定。
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}
