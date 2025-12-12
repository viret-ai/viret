// =====================================
// app/login/page.tsx
// ログイン（メール or @ID ＋ パスワード）
// - メールアドレス または @ID でログイン可能
// - @ID の場合は public.get_email_by_handle() RPC 経由で email を解決
// - テーマ連動＋Card＋Typography＋Button版
// =====================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { typography } from "@/lib/theme";

export default function LoginPage() {
  const router = useRouter();

  // 入力値：メールアドレス または @ID
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // ログイン処理
  // -----------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    const raw = identifier.trim();
    const pw = password;

    if (!raw) {
      setMsg("メールアドレスまたは @ID を入力してください。");
      return;
    }
    if (!pw) {
      setMsg("パスワードを入力してください。");
      return;
    }

    setLoading(true);

    try {
      let loginEmail = raw;

      // ざっくり「メールアドレスっぽいか」を判定
      const looksLikeEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw);

      if (!looksLikeEmail) {
        // ----------------------------------------
        // @ID とみなして、handle → email を RPC で解決
        // public.get_email_by_handle(handle_input text) を呼ぶ
        // ----------------------------------------
        const { data, error } = await supabase.rpc("get_email_by_handle", {
          handle_input: raw,
        });

        if (error) {
          console.error("get_email_by_handle error", error);
          setMsg(
            "@ID からメールアドレスを取得できませんでした。しばらく待ってから再度お試しください。"
          );
          setLoading(false);
          return;
        }

        if (!data) {
          setMsg("該当する @ID が見つかりませんでした。入力内容を確認してください。");
          setLoading(false);
          return;
        }

        loginEmail = data;
      }

      // ----------------------------------------
      // Supabase パスワードログイン（メールで統一）
      // ----------------------------------------
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: pw,
      });

      if (signInError) {
        setMsg("ログイン失敗：" + signInError.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("login unexpected error", err);
      setMsg("予期しないエラーが発生しました。もう一度お試しください。");
      setLoading(false);
    }
  };

  // -----------------------------
  // レンダリング
  // -----------------------------
  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <h1 className={typography("h1")}>ログイン</h1>

        <Card as="section">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* メールアドレス or @ID */}
            <div>
              <label className={`${typography("body")} mb-1 block text-sm`}>
                メールアドレス または ユーザーID（@ID）
              </label>
              <input
                className="
                  w-full rounded-md border border-black/10 dark:border-white/10
                  bg-white/90 dark:bg-slate-900/70
                  px-3 py-2 text-sm text-slate-900 dark:text-slate-100
                  outline-none
                  focus:border-sky-500 focus:ring-1 focus:ring-sky-300
                "
                placeholder="you@example.com または User_123"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            {/* パスワード */}
            <div>
              <label className={`${typography("body")} mb-1 block text-sm`}>
                パスワード
              </label>
              <input
                className="
                  w-full rounded-md border border-black/10 dark:border-white/10
                  bg-white/90 dark:bg-slate-900/70
                  px-3 py-2 text-sm text-slate-900 dark:text-slate-100
                  outline-none
                  focus:border-sky-500 focus:ring-1 focus:ring-sky-300
                "
                placeholder="パスワード"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="pt-2 space-y-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "ログイン中..." : "ログイン"}
              </Button>

              {msg && (
                <p className={`${typography("caption")} text-red-600`}>
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
