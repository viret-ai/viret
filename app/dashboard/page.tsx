// =====================================
// app/dashboard/page.tsx
// ログイン後ダッシュボード（本番版＋軽いデバッグ窓）
// - 認証ユーザー / profiles を取得＆無ければ 1 回だけ自動作成
// - ロールに応じた「次の一手」カードを表示
// - 下部に user / profile のデバッグ情報を折りたたみで残す
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

// ロールごとの説明文
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
  // 0) サーバー用 Supabase クライアント
  const supabase = await supabaseServer();

  // 1) 認証ユーザー取得
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  let profile: ProfileRow | null = null;
  let profileErrorText = "";
  let createdNow = false; // このアクセスで作ったかどうか

  if (user) {
    // 2) 既存 profiles を確認
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
      // 3) 無ければ 1 回だけ自動作成
      const meta = (user.user_metadata ?? {}) as any;

      // signup 時に user_metadata に入れているキーを優先
      const handle: string | null =
        meta.handle ?? meta.username ?? null; // 両対応フォールバック
      const displayName: string | null =
        meta.display_name ?? user.email ?? null;
      const role: ProfileRole = (meta.role as ProfileRole) ?? DEFAULT_ROLE;

      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id, // RLS: auth.uid() と一致させる
          handle,
          display_name: displayName,
          role,
          // avatar_url / avatar_path は初期 null のまま
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
  }

  // 4) 表示用の補助値
  const hasUser = !!user;
  const hasProfile = !!profile;

  const roleKey = profile?.role ?? undefined;
  const roleLabel = roleKey ? getRoleLabel(roleKey, "ja") : "未設定";
  const roleDescription =
    (roleKey && ROLE_DESCRIPTIONS[roleKey]) ||
    "ロールは後から変更・拡張される予定です。";

  const displayName =
    profile?.display_name || user?.user_metadata?.display_name || user?.email;

  const handle = profile?.handle || null;

  const isVisitorOnly = profile?.role === "visitor";
  const isGeneratist =
    profile?.role === "generatist" || profile?.role === "both";
  const isRetoucher =
    profile?.role === "retoucher" || profile?.role === "both";
  const isOfficial = profile?.role === "official";

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className={typography("h1")}>ダッシュボード</h1>
          <p className={typography("body")}>
            ログイン中のアカウントの状態と、次に進むためのメニューをまとめています。
          </p>
        </header>

        {/* 未ログイン時：案内だけ表示 */}
        {!hasUser && (
          <Card className="p-4 space-y-3">
            <h2 className={typography("h2")}>ログインが必要です</h2>
            <p className={typography("body")}>
              現在、サーバー側では「未ログイン」と判断されています。
              <br />
              右上のログインメニュー、または下のボタンからログインしてください。
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md border border-sky-500 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50"
            >
              ログインページへ
            </Link>
          </Card>
        )}

        {/* ログイン済み：概要とショートカット */}
        {hasUser && (
          <>
            {/* アカウント概要 */}
            <Card className="p-4 space-y-4">
              <h2 className={typography("h2")}>アカウント概要</h2>

              {/* アイコン＋名前のヘッダー行 */}
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
                  <dd className={typography("body")}>
                    {user?.email ?? "(不明)"}
                  </dd>
                </div>
                <div>
                  <dt className={typography("caption")}>@ID</dt>
                  <dd className={typography("body")}>
                    {handle ? (
                      <Link
                        href={`/profile/${handle}`}
                        className="font-mono text-sky-700 underline"
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

                {/* コイン残高（のちに実データ接続予定） */}
                <div>
                  <dt className={typography("caption")}>コイン残高</dt>
                  <dd className={typography("body")}>
                    <span className="font-mono">0</span> コイン
                    <Link
                      href="/coins"
                      className="ml-3 text-sky-700 underline hover:text-sky-800"
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
                      className="text-sky-700 underline hover:text-sky-800"
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

            {/* 次のアクション（ロール別おすすめ） */}
            <section className="grid gap-4 md:grid-cols-2">
              {/* 素材を探す（全ロール共通の入口／特に visitor 向け） */}
              <Card className="flex flex-col gap-3 p-4">
                <h3 className={typography("h3")}>素材を探す</h3>
                <p className={typography("body")}>
                  公開中のレタッチ案件や素材一覧から、目的に合う画像を閲覧・ダウンロードできます。
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    href="/jobs"
                    className="inline-flex items-center justify-center rounded-md bg-[var(--v-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    レタッチ案件一覧へ
                  </Link>
                  <Link
                    href="/subscribe"
                    className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    サブスク・広告解除を見る
                  </Link>
                </div>
                {isVisitorOnly && (
                  <p className={`${typography("caption")} text-slate-600 mt-2`}>
                    ロールを「促画師」「レタッチャー」に変更すると、画像投稿や案件応募も行えるようになります。
                  </p>
                )}
              </Card>

              {/* 画像を投稿する（generatist / both / official） */}
              {(isGeneratist || isOfficial) && (
                <Card className="flex flex-col gap-3 p-4">
                  <h3 className={typography("h3")}>画像を投稿する</h3>
                  <p className={typography("body")}>
                    AI生成画像をアップロードして、そのまま素材として販売したり、レタッチ案件として募集できます。
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link
                      href="/post"
                      className="inline-flex items-center justify-center rounded-md bg-[var(--v-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      新しい依頼を作成
                    </Link>
                    <Link
                      href="/retouch-jobs"
                      className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      自分の依頼一覧を見る
                    </Link>
                    <Link
                      href="/dashboard/contracts"
                      className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      進行中の契約一覧
                    </Link>
                  </div>
                </Card>
              )}

              {/* レタッチ案件に参加する（retoucher / both / official） */}
              {(isRetoucher || isOfficial) && (
                <Card className="flex flex-col gap-3 p-4 md:col-span-2">
                  <h3 className={typography("h3")}>レタッチ案件に参加する</h3>
                  <p className={typography("body")}>
                    公開中のレタッチ案件から、条件に合うものを選んで応募できます。
                    プロフィールにポートフォリオを追加しておくと、採用されやすくなります。
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link
                      href="/jobs"
                      className="inline-flex items-center justify-center rounded-md bg-[var(--v-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      レタッチ案件一覧へ
                    </Link>
                    <Link
                      href="/dashboard/contracts"
                      className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      担当中の契約一覧
                    </Link>
                    {handle && (
                      <Link
                        href={`/profile/${handle}`}
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        公開プロフィールを確認
                      </Link>
                    )}
                  </div>
                </Card>
              )}
            </section>
          </>
        )}

        {/* デバッグ情報（必要なときだけ開く） */}
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
