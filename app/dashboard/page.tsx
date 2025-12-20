// =====================================
// app/dashboard/page.tsx
// ログイン後ダッシュボード（本番版＋軽いデバッグ窓）
// - 認証ユーザー / profiles を取得＆無ければ 1 回だけ自動作成
// - ロールに応じた「次の一手」カードを表示
// - 下部に user / profile のデバッグ情報を折りたたみで残す
// - NOTE: Server Component 内では Client関数を呼ばない（buttonClasses等）
// =====================================

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import Card from "@/components/ui/Card";
import { typography } from "@/lib/theme";
import type { ProfileRole } from "@/lib/roles";
import { DEFAULT_ROLE, getRoleLabel } from "@/lib/roles";
import Avatar from "@/components/ui/Avatar";

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  role: ProfileRole | null;
  avatar_url: string | null;
};

const ROLE_DESCRIPTIONS: Record<ProfileRole, string> = {
  visitor: "公開中の素材や案件を閲覧・ダウンロードするためのロールです。",
  generatist:
    "AI生成画像を投稿して素材として提供したり、レタッチ案件として募集できます。",
  retoucher:
    "レタッチ案件に応募して、画像の修正・加工の作業を受けられるロールです。",
  both:
    "AI生成画像の投稿とレタッチ案件への応募の両方を利用できるロールです。",
  official: "Viret 運営による公式アカウントです。",
};

export default async function DashboardPage() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  let profile: ProfileRow | null = null;
  let profileErrorText = "";
  let createdNow = false;

  // コイン残高（Server側で計算）
  let coinBalance = 0;
  let coinErrorText = "";

  if (user) {
    const { data: existing, error: profileError } = await supabase
      .from("profiles")
      .select("id, handle, display_name, role, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      profileErrorText = JSON.stringify(profileError, null, 2);
    } else if (existing) {
      profile = existing as ProfileRow;
    } else {
      const meta = (user.user_metadata ?? {}) as any;

      const handle: string | null = meta.handle ?? meta.username ?? null;
      const displayName: string | null = meta.display_name ?? user.email ?? null;
      const role: ProfileRole = (meta.role as ProfileRole) ?? DEFAULT_ROLE;

      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          handle,
          display_name: displayName,
          role,
        })
        .select("id, handle, display_name, role, avatar_url")
        .single();

      if (insertError) {
        profileErrorText = JSON.stringify(insertError, null, 2);
      } else if (inserted) {
        profile = inserted as ProfileRow;
        createdNow = true;
      }
    }

    // ---- coin balance（coin_ledgerの合計）----
    // NOTE: RPCに依存しない。RLSが厳しい場合はここで弾かれる（その場合はエラー表示）
    const { data: rows, error: coinErr } = await supabase
      .from("coin_ledger")
      .select("delta_coins")
      .eq("user_id", user.id);

    if (coinErr) {
      coinErrorText = JSON.stringify(coinErr, null, 2);
      coinBalance = 0;
    } else {
      coinBalance =
        (rows ?? []).reduce((sum: number, r: any) => sum + (r?.delta_coins ?? 0), 0) ?? 0;
    }
  }

  const hasUser = !!user;
  const hasProfile = !!profile;

  const roleKey = profile?.role ?? undefined;
  const roleLabel = roleKey ? getRoleLabel(roleKey, "ja") : "未設定";
  const roleDescription =
    (roleKey && ROLE_DESCRIPTIONS[roleKey]) ||
    "ロールは後から変更・拡張される予定です。";

  const displayName =
    profile?.display_name || (user?.user_metadata as any)?.display_name || user?.email;

  const handle = profile?.handle || null;

  const isVisitorOnly = profile?.role === "visitor";
  const isGeneratist = profile?.role === "generatist" || profile?.role === "both";
  const isRetoucher = profile?.role === "retoucher" || profile?.role === "both";
  const isOfficial = profile?.role === "official";

  // Link用の“見失わない”共通ボタン（基本黒文字）
  const linkBtnBase =
    "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold " +
    "border-black/10 dark:border-white/10 " +
    "text-slate-900 dark:text-slate-100 " +
    "hover:bg-black/5 dark:hover:bg-white/10";

  const linkBtnPrimary =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold " +
    "bg-[var(--v-accent)] text-white hover:opacity-90";

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className={typography("h1")}>ダッシュボード</h1>
          <p className={typography("body")}>
            ログイン中のアカウントの状態と、次に進むためのメニューをまとめています。
          </p>
        </header>

        {!hasUser && (
          <Card className="p-4 space-y-3">
            <h2 className={typography("h2")}>ログインが必要です</h2>
            <p className={typography("body")}>
              現在、サーバー側では「未ログイン」と判断されています。
              <br />
              右上のログインメニュー、または下のボタンからログインしてください。
            </p>
            <Link href="/login" className={linkBtnBase}>
              ログインページへ
            </Link>
          </Card>
        )}

        {hasUser && (
          <>
            <Card className="p-4 space-y-4">
              <h2 className={typography("h2")}>アカウント概要</h2>

              <div className="flex items-center gap-3">
                <Avatar
                  src={profile?.avatar_url ?? null}
                  size={48}
                  alt={displayName ?? "avatar"}
                />
                <div className="flex flex-col">
                  <span className={typography("caption") + " text-slate-500"}>
                    現在のアイコンと表示名
                  </span>
                  <span className={typography("body")}>
                    {displayName ?? "(未設定)"}
                  </span>
                </div>
              </div>

              {createdNow && (
                <p className={`${typography("caption")} text-emerald-600`}>
                  このアクセスで profiles にレコードを自動作成しました。
                </p>
              )}

              <dl className="grid gap-4 md:grid-cols-2">
                <div>
                  <dt className={typography("caption")}>ログインメール</dt>
                  <dd className={typography("body")}>{user?.email ?? "(不明)"}</dd>
                </div>
                <div>
                  <dt className={typography("caption")}>@ID</dt>
                  <dd className={typography("body")}>
                    {handle ? (
                      <Link
                        href={`/profile/${handle}`}
                        className="font-mono underline text-slate-900 dark:text-slate-100"
                      >
                        @{handle}
                      </Link>
                    ) : (
                      <span className="text-slate-500">(未設定)</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className={typography("caption")}>ロール</dt>
                  <dd className={typography("body")}>{roleLabel}</dd>
                </div>

                <div>
                  <dt className={typography("caption")}>コイン残高</dt>
                  <dd className={typography("body")}>
                    <span className="font-mono tabular-nums">
                      {coinBalance.toLocaleString()}
                    </span>{" "}
                    コイン
                    <Link
                      href="/coins"
                      className="ml-3 underline text-slate-900 dark:text-slate-100"
                    >
                      コインを購入する
                    </Link>
                  </dd>
                </div>

                <div>
                  <dt className={typography("caption")}>アイコンを変更</dt>
                  <dd className={typography("body")}>
                    <Link
                      href="/account/avatar"
                      className="underline text-slate-900 dark:text-slate-100"
                    >
                      アイコン設定ページを開く
                    </Link>
                  </dd>
                </div>
              </dl>

              <p className={`${typography("caption")} text-slate-600 mt-2`}>
                {roleDescription}
              </p>
            </Card>

            <section className="grid gap-4 md:grid-cols-2">
              <Card className="flex flex-col gap-3 p-4">
                <h3 className={typography("h3")}>素材を探す</h3>
                <p className={typography("body")}>
                  公開中のレタッチ案件や素材一覧から、目的に合う画像を閲覧・ダウンロードできます。
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href="/assets" className={linkBtnPrimary}>
                    素材一覧へ
                  </Link>
                  <Link href="/jobs" className={linkBtnBase}>
                    レタッチ案件一覧へ
                  </Link>
                  <Link href="/subscribe" className={linkBtnBase}>
                    サブスク・広告解除を見る
                  </Link>
                </div>
                {isVisitorOnly && (
                  <p className={`${typography("caption")} text-slate-600 mt-2`}>
                    ロールを「促画師」「レタッチャー」に変更すると、画像投稿や案件応募も行えるようになります。
                  </p>
                )}
              </Card>

              {isOfficial && (
                <Card className="flex flex-col gap-3 p-4">
                  <h3 className={typography("h3")}>運営メニュー</h3>
                  <p className={typography("body")}>
                    画像チェックや検索インサイトなど、運営向けの管理ページを開きます。
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link href="/dashboard/moderation/assets" className={linkBtnPrimary}>
                      画像チェック
                    </Link>
                    <Link href="/dashboard/moderation/search-insights" className={linkBtnBase}>
                      検索インサイト
                    </Link>
                    <Link href="/assets" className={linkBtnBase}>
                      公開の素材一覧
                    </Link>
                  </div>
                  <p className={`${typography("caption")} text-slate-600 mt-2`}>
                    ※ 生ログは表示しません（プライバシー保護）。
                  </p>
                </Card>
              )}

              {(isGeneratist || isOfficial) && (
                <Card className="flex flex-col gap-3 p-4">
                  <h3 className={typography("h3")}>画像を投稿する</h3>
                  <p className={typography("body")}>
                    AI生成画像をアップロードして、そのまま素材として販売したり、レタッチ案件として募集できます。
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link href="/post" className={linkBtnPrimary}>
                      新しい依頼を作成
                    </Link>
                    <Link href="/retouch-jobs" className={linkBtnBase}>
                      自分の依頼一覧を見る
                    </Link>
                    <Link href="/dashboard/contracts" className={linkBtnBase}>
                      進行中の契約一覧
                    </Link>
                  </div>
                </Card>
              )}

              {(isRetoucher || isOfficial) && (
                <Card className="flex flex-col gap-3 p-4 md:col-span-2">
                  <h3 className={typography("h3")}>レタッチ案件に参加する</h3>
                  <p className={typography("body")}>
                    公開中のレタッチ案件から、条件に合うものを選んで応募できます。
                    プロフィールにポートフォリオを追加しておくと、採用されやすくなります。
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link href="/jobs" className={linkBtnPrimary}>
                      レタッチ案件一覧へ
                    </Link>
                    <Link href="/dashboard/contracts" className={linkBtnBase}>
                      担当中の契約一覧
                    </Link>
                    {handle && (
                      <Link href={`/profile/${handle}`} className={linkBtnBase}>
                        公開プロフィールを確認
                      </Link>
                    )}
                  </div>
                </Card>
              )}
            </section>
          </>
        )}

        {hasUser && (
          <section className="mt-6 space-y-4">
            <h2 className={typography("h2")}>デバッグ情報（開発者向け）</h2>

            <Card className="p-4 space-y-2">
              <details>
                <summary className="cursor-pointer text-sm text-slate-600">
                  user オブジェクトを表示
                </summary>
                <pre className="mt-2 overflow-x-auto rounded bg-black/80 p-3 text-xs text-green-200">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </details>

              {hasProfile && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-slate-600">
                    profile オブジェクトを表示
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-black/80 p-3 text-xs text-green-200">
                    {JSON.stringify(profile, null, 2)}
                  </pre>
                </details>
              )}

              {!!coinErrorText && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-red-600">
                    coin_ledger 残高取得エラー
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-black/80 p-3 text-xs text-red-200">
                    {coinErrorText}
                  </pre>
                </details>
              )}

              {error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-red-600">
                    auth.getUser エラー内容
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-black/80 p-3 text-xs text-red-200">
                    {JSON.stringify(error, null, 2)}
                  </pre>
                </details>
              )}

              {profileErrorText && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-red-600">
                    profiles 取得 / 作成エラー
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-black/80 p-3 text-xs text-red-200">
                    {profileErrorText}
                  </pre>
                </details>
              )}
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
