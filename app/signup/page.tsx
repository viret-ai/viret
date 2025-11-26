// =====================================
// app/signup/page.tsx
// 新規登録ページ
// - メール / パスワード / 表示名 / @ID / ロール
// - 必須＊表示
// - @ID 重複チェック付き
// - @ID は「活動開始後は固定 ＋ どうしてもならお問い合わせ」仕様
// =====================================

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { typography } from "@/lib/theme";
import type { ProfileRole } from "@/lib/roles";
import { ROLE_LABEL_JA, DEFAULT_ROLE } from "@/lib/roles";

export default function SignupPage() {
  // フォーム状態
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<ProfileRole>(DEFAULT_ROLE);

  // @ID 重複チェック状態
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "ok" | "taken"
  >("idle");

  // メッセージ表示
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // @ID 重複チェック
  // -----------------------------
  useEffect(() => {
    const check = async () => {
      if (!username) {
        setUsernameStatus("idle");
        return;
      }

      // 利用可能な文字種か先に確認
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setUsernameStatus("taken");
        return;
      }

      setUsernameStatus("checking");

      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .maybeSingle();

      if (data) {
        setUsernameStatus("taken");
      } else {
        setUsernameStatus("ok");
      }
    };

    const timeoutId = setTimeout(check, 300); // 0.3秒ディレイで負荷を軽減
    return () => clearTimeout(timeoutId);
  }, [username]);

  // -----------------------------
  // 入力バリデーション
  // -----------------------------
  const validate = () => {
    if (!email) return "メールアドレスを入力してください。";
    if (!password || password.length < 6) {
      return "パスワードは6文字以上を入力してください。";
    }
    if (!displayName) return "表示名を入力してください。";
    if (!username) return "@ID を入力してください。";

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return "@ID は半角英数字とアンダースコアのみ利用できます。";
    }
    if (usernameStatus === "taken") {
      return "@ID が使用できません。別のIDを入力してください。";
    }
    if (usernameStatus === "checking") {
      return "@ID の確認中です。少し待ってから再度お試しください。";
    }

    return "";
  };

  // -----------------------------
  // サインアップ処理
  // -----------------------------
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setErrorMsg("");

    const v = validate();
    if (v) {
      setErrorMsg(v);
      return;
    }

    setLoading(true);

    // ここだけ少し変更
    const origin = window.location.origin;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/login`, // ✅ 確認メール後は /login に飛ばす
        data: {
          display_name: displayName,
          username,
          role,
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg("登録に失敗しました：" + error.message);
      return;
    }

    setMsg(
      "確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。完了後、ログイン画面からサインインできます。"
    );
  };

  // -----------------------------
  // レンダリング
  // -----------------------------
  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <h1 className={typography("h1")}>新規登録</h1>

        <Card as="section">
          <form onSubmit={handleSignup} className="space-y-5">
            {/* メールアドレス */}
            <div>
              <label className={`${typography("body")} mb-1 block text-sm`}>
                メールアドレス <span className="text-red-600">*</span>
              </label>
              <input
                className="
                  w-full rounded-md border border-black/10
                  bg-white/90 px-3 py-2 text-sm text-slate-900
                  outline-none
                  focus:border-sky-500 focus:ring-1 focus:ring-sky-300
                "
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* パスワード */}
            <div>
              <label className={`${typography("body")} mb-1 block text-sm`}>
                パスワード <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                className="
                  w-full rounded-md border border-black/10
                  bg-white/90 px-3 py-2 text-sm text-slate-900
                  outline-none
                  focus:border-sky-500 focus:ring-1 focus:ring-sky-300
                "
                placeholder="パスワード（6文字以上）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* 表示名 */}
            <div>
              <label className={`${typography("body")} mb-1 block text-sm`}>
                表示名 <span className="text-red-600">*</span>
              </label>
              <input
                className="
                  w-full rounded-md border border-black/10
                  bg-white/90 px-3 py-2 text-sm text-slate-900
                  outline-none
                  focus:border-sky-500 focus:ring-1 focus:ring-sky-300
                "
                placeholder="サイト上に表示される名前"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className={`${typography("caption")} mt-1 text-slate-500`}>
                表示名は公開プロフィールに表示されます。後からダッシュボードで変更できます。
              </p>
            </div>

            {/* ユーザーID（@ID） */}
            <div>
              <label className={`${typography("body")} mb-1 block text-sm`}>
                ユーザーID（@ID） <span className="text-red-600">*</span>
              </label>

              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500">@</span>
                <input
                  className="
                    w-full rounded-md border border-black/10
                    bg-white/90 px-3 py-2 text-sm text-slate-900
                    outline-none
                    focus:border-sky-500 focus:ring-1 focus:ring-sky-300
                  "
                  placeholder="viret_user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              {/* @ID 重複チェックの状態表示 */}
              {usernameStatus === "checking" && (
                <p className={`${typography("caption")} text-slate-500`}>
                  ID を確認中です…
                </p>
              )}
              {usernameStatus === "ok" && username && (
                <p className={`${typography("caption")} text-green-700`}>
                  使用できます。
                </p>
              )}
              {usernameStatus === "taken" && username && (
                <p className={`${typography("caption")} text-red-600`}>
                  使用できない ID です。他のIDを選んでください。
                </p>
              )}

              {/* 注意書き（確定仕様） */}
              <p className={`${typography("caption")} mt-2 text-slate-500`}>
                @ID は公開プロフィールの URL に使用され、他のユーザーにも表示されます。
                また、他のユーザーと重複する ID は利用できません。
                <br />
                登録直後はダッシュボードから @ID を変更できますが、
                一度でも「画像投稿」「依頼作成」「レタッチ応募」のいずれかを行った後は、
                実績の整合性のため @ID は固定され、変更できなくなります。
                <br />
                どうしても変更が必要な場合は、お問い合わせフォームからご相談ください。
              </p>

              <p className={`${typography("caption")} mt-1 text-slate-500`}>
                プロフィールURL例：
                <span className="font-mono">
                  {" /profile/"}
                  {username || "viret_user"}
                </span>
              </p>
            </div>

            {/* ロール選択 */}
            <div>
              <label className={`${typography("body")} mb-1 block text-sm`}>
                ロール <span className="text-red-600">*</span>
              </label>
              <div className="space-y-1 text-sm">
                {(Object.keys(ROLE_LABEL_JA) as ProfileRole[]).map((r) => (
                  <label
                    key={r}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={role === r}
                      onChange={() => setRole(r)}
                    />
                    <span>{ROLE_LABEL_JA[r]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ボタン＆メッセージ */}
            <div className="pt-2 space-y-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "登録中..." : "登録する"}
              </Button>

              {errorMsg && (
                <p className={`${typography("caption")} text-red-600`}>
                  {errorMsg}
                </p>
              )}
              {msg && (
                <p className={`${typography("caption")} text-amber-700`}>
                  {msg}
                </p>
              )}
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
