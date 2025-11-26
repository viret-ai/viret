// =====================================
// app/dashboard/page.tsx
// デバッグ版ダッシュボード
// - auth.getUser / profiles の状態をそのまま表示
// - profiles が無ければ 1 回だけ自動作成
// =====================================

import { supabaseServer } from "@/lib/supabase-server";
import Card from "@/components/ui/Card";
import { typography } from "@/lib/theme";
import type { ProfileRole } from "@/lib/roles";
import { DEFAULT_ROLE } from "@/lib/roles";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: ProfileRole | null;
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
      .select("id, username, display_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      profileErrorText = JSON.stringify(profileError, null, 2);
    } else if (existing) {
      profile = existing as ProfileRow;
    } else {
      // 3) 無ければ 1 回だけ自動作成
      const meta = (user.user_metadata ?? {}) as any;

      const username: string | null = meta.username ?? null;
      const displayName: string | null =
        meta.display_name ?? user.email ?? null;
      const role: ProfileRole = (meta.role as ProfileRole) ?? DEFAULT_ROLE;

      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id, // RLS: auth.uid() と一致させる
          username,
          display_name: displayName,
          role,
        })
        .select("id, username, display_name, role")
        .single();

      if (insertError) {
        profileErrorText = JSON.stringify(insertError, null, 2);
      } else if (inserted) {
        profile = inserted as ProfileRow;
        createdNow = true;
      }
    }
  }

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className={typography("h1")}>ダッシュボード（デバッグ表示）</h1>

        {/* 認証状態カード */}
        <Card className="p-4 space-y-2">
          <h2 className={typography("h2")}>認証状態</h2>

          {!user && (
            <p className={typography("body")}>
              現在、サーバー側では「未ログイン」と判断されています。
              <br />
              /login からメールアドレスとパスワードでログインした直後に、
              もう一度 /dashboard を開いて確認してください。
            </p>
          )}

          {user && (
            <>
              <p className={typography("body")}>
                ログイン中のメールアドレス：
                <span className="font-mono">{user.email}</span>
              </p>
              <p className={typography("body")}>
                ユーザー内部ID：
                <span className="font-mono text-xs break-all">{user.id}</span>
              </p>

              <details className="mt-2">
                <summary className="text-sm text-slate-600 cursor-pointer">
                  user オブジェクト（debug）
                </summary>
                <pre className="mt-2 overflow-x-auto rounded bg-black/80 p-3 text-xs text-green-200">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </details>
            </>
          )}

          {error && (
            <details className="mt-2">
              <summary className="text-sm text-red-600 cursor-pointer">
                auth.getUser エラー内容
              </summary>
              <pre className="mt-2 overflow-x-auto rounded bg-black/80 p-3 text-xs text-red-200">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}
        </Card>

        {/* プロフィール状態カード */}
        <Card className="p-4 space-y-2">
          <h2 className={typography("h2")}>profiles 状態</h2>

          {!user && (
            <p className={typography("body")}>
              ユーザー情報が取得できていないため、profiles もまだ確認していません。
            </p>
          )}

          {user && !profile && !profileErrorText && (
            <p className={typography("body")}>
              profiles テーブルに、このユーザーの行はまだ存在しません。
              <br />
              （system: id = auth.users.id の row がありません）
            </p>
          )}

          {user && profile && (
            <>
              {createdNow && (
                <p className={`${typography("caption")} text-emerald-600`}>
                  このアクセスで profiles にレコードを自動作成しました。
                </p>
              )}

              <p className={typography("body")}>
                表示名：{" "}
                <span className="font-semibold">
                  {profile.display_name ?? "(未設定)"}
                </span>
              </p>
              <p className={typography("body")}>
                @ID：{" "}
                {profile.username ? (
                  <a
                    href={`/profile/${profile.username}`}
                    className="font-mono text-sky-700 underline"
                  >
                    @{profile.username}
                  </a>
                ) : (
                  <span className="text-slate-500">(未設定)</span>
                )}
              </p>
              <p className={typography("body")}>
                ロール： <span>{profile.role ?? "(未設定)"}</span>
              </p>

              <details className="mt-2">
                <summary className="text-sm text-slate-600 cursor-pointer">
                  profile オブジェクト（debug）
                </summary>
                <pre className="mt-2 overflow-x-auto rounded bg-black/80 p-3 text-xs text-green-200">
                  {JSON.stringify(profile, null, 2)}
                </pre>
              </details>
            </>
          )}

          {profileErrorText && (
            <details className="mt-2">
              <summary className="text-sm text-red-600 cursor-pointer">
                profiles 取得 / 作成エラー
              </summary>
              <pre className="mt-2 overflow-x-auto rounded bg-black/80 p-3 text-xs text-red-200">
                {profileErrorText}
              </pre>
            </details>
          )}
        </Card>
      </div>
    </main>
  );
}
