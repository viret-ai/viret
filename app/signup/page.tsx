// =====================================
// app/signup/page.tsx
// 新規登録ページ
// - メール / パスワード / 表示名 / @ID / ロール
// - official はUIから選べない（運営が付与する）
// =====================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { typography } from "@/lib/theme";
import type { ProfileRole } from "@/lib/roles";
import { ROLE_LABEL_JA, DEFAULT_ROLE } from "@/lib/roles";

const USERNAME_ALLOWED_CHARS = /^[a-zA-Z0-9_]+$/;
const DIGITS_ONLY = /^[0-9]+$/;

const USERNAME_NG_WORDS = [
  "admin",
  "support",
  "official",
  "viret",
  "system",
  "staff",
  "null",
  "void",
];

function getDisplayNameLength(value: string): number {
  return Array.from(value).reduce((total, ch) => {
    return total + (/[\u0000-\u007f]/.test(ch) ? 1 : 2);
  }, 0);
}

function containsNgWord(username: string): boolean {
  const parts = username.toLowerCase().split("_").filter(Boolean);
  if (!parts.length) return false;
  return parts.some((part) => USERNAME_NG_WORDS.includes(part));
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<ProfileRole>(DEFAULT_ROLE);

  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "ok" | "taken" | "invalid"
  >("idle");

  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // UIで出すロール（official は除外）
  const selectableRoles = useMemo(() => {
    return (Object.keys(ROLE_LABEL_JA) as ProfileRole[]).filter(
      (r) => r !== "official"
    );
  }, []);

  useEffect(() => {
    const check = async () => {
      if (!username) {
        setUsernameStatus("idle");
        return;
      }

      if (!USERNAME_ALLOWED_CHARS.test(username)) {
        setUsernameStatus("invalid");
        return;
      }
      if (username.length < 2 || username.length > 20) {
        setUsernameStatus("invalid");
        return;
      }
      if (DIGITS_ONLY.test(username)) {
        setUsernameStatus("invalid");
        return;
      }
      if (containsNgWord(username)) {
        setUsernameStatus("invalid");
        return;
      }

      setUsernameStatus("checking");

      const { data, error } = await supabase
        .from("profiles")
        .select("handle")
        .eq("handle", username)
        .maybeSingle();

      if (error) {
        setUsernameStatus("idle");
        return;
      }

      setUsernameStatus(data ? "taken" : "ok");
    };

    const timeoutId = setTimeout(check, 300);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const validate = () => {
    if (!email) return "メールアドレスを入力してください。";
    if (!password || password.length < 6) {
      return "パスワードは6文字以上を入力してください。";
    }
    if (!displayName) return "表示名を入力してください。";

    const displayLen = getDisplayNameLength(displayName);
    if (displayLen > 50) {
      return "表示名は半角50文字（全角25文字）以内で入力してください。";
    }

    if (!username) return "@ID を入力してください。";
    if (!USERNAME_ALLOWED_CHARS.test(username)) {
      return "@ID は半角英数字とアンダースコアのみ利用できます。";
    }
    if (username.length < 2 || username.length > 20) {
      return "@ID は2〜20文字で入力してください。";
    }
    if (DIGITS_ONLY.test(username)) {
      return "@ID をすべて数字だけにすることはできません。別のIDを入力してください。";
    }
    if (containsNgWord(username)) {
      return "この @ID は利用できません。別のIDを入力してください。";
    }
    if (usernameStatus === "taken") {
      return "@ID がすでに使用されています。別のIDを入力してください。";
    }
    if (usernameStatus === "checking") {
      return "@ID の確認中です。少し待ってから再度お試しください。";
    }

    // 念のため：UIからは選べないが、手で改変された場合に弾く
    if (role === "official") {
      return "このロールは選択できません。";
    }

    return "";
  };

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

    const origin = window.location.origin;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/login`,
        data: {
          display_name: displayName,
          handle: username,
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

  const previewHandle = username || "User_123";
  const previewHandleUrl = previewHandle.toLowerCase();

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <h1 className={typography("h1")}>新規登録</h1>

        <Card as="section">
          <form onSubmit={handleSignup} className="space-y-5">
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
                <br />
                目安として、半角50文字（全角25文字）以内で入力してください。
              </p>
            </div>

            <div>
              <label className={`${typography("body")} mb-1 block text-sm`}>
                ユーザーID（@ID） <span className="text-red-600">*</span>
              </label>

              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-900">@</span>
                <input
                  className="
                    w-full rounded-md border border-black/10
                    bg-white/90 px-3 py-2 text-sm text-slate-900
                    outline-none
                    focus:border-sky-500 focus:ring-1 focus:ring-sky-300
                  "
                  placeholder="User_123"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

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
              {usernameStatus === "invalid" && username && (
                <p className={`${typography("caption")} text-red-600`}>
                  ID の形式または内容に問題があります。入力ルールを確認してください。
                </p>
              )}

              <p className={`${typography("caption")} mt-2 text-slate-500`}>
                @ID は公開プロフィールの URL に使用され、他のユーザーにも表示されます。
                <br />
                他のユーザーと重複する ID は利用できません。
                入力ルールの詳細はこちら
                <span
                  className="
                    ml-1 inline-flex h-4 w-4 items-center justify-center
                    rounded-full border border-slate-400
                    text-[10px] font-semibold text-slate-600
                    cursor-help align-middle
                  "
                  aria-label="@ID の入力ルールの詳細"
                  title={
                    "使用できる文字は、半角英数字とアンダースコア（_）のみです。\n" +
                    "長さは2〜20文字で、@ID をすべて数字だけにすることはできません。\n" +
                    "\n" +
                    "一部の単語（例：admin / official / viret / system など）は、\n" +
                    "誤解やなりすまし防止のため利用できない場合があります。\n" +
                    "\n" +
                    "登録直後はダッシュボードから @ID を変更できますが、\n" +
                    "一度でも「画像投稿」「依頼作成」「レタッチ応募」のいずれかを行うと、\n" +
                    "実績の整合性のため @ID は固定され、変更できなくなります。\n" +
                    "どうしても変更が必要な場合は、お問い合わせフォームからご相談ください。"
                  }
                >
                  i
                </span>
              </p>

              <p className={`${typography("caption")} mt-1 text-slate-500`}>
                プロフィールURL例：
                <span className="font-mono">
                  {" /profile/"}
                  {previewHandleUrl}
                </span>
              </p>
            </div>

            <div>
              <label className={`${typography("body")} mb-1 block text-sm`}>
                ロール <span className="text-red-600">*</span>
              </label>

              <div className="space-y-1 text-sm">
                {selectableRoles.map((r) => (
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

              <p className={`${typography("caption")} mt-2 text-slate-500`}>
                ※ 公式アカウントは運営が付与します（登録時には選べません）。
              </p>
            </div>

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
