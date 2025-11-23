// =====================================
// app/signup/page.tsx
// 新規登録（メール＋パスワード）
// テーマ連動＋Card＋Button＋Typography版
// =====================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { typography } from "@/lib/theme";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMsg("登録に失敗しました：" + error.message);
      return;
    }

    setMsg(
      "確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。"
    );
  };

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <h1 className={typography("h1")}>新規登録</h1>

        <Card as="section">
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Email */}
            <div>
              <label className={`${typography("body")} mb-1 block text-sm`}>
                メールアドレス
              </label>
              <input
                className="
                  w-full rounded-md border border-black/10 dark:border-white/10
                  bg-white/90 dark:bg-slate-900/70
                  px-3 py-2 text-sm text-slate-900 dark:text-slate-100
                  outline-none
                  focus:border-sky-500 focus:ring-1 focus:ring-sky-300
                "
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label className={`${typography("body")} mb-1 block text-sm`}>
                パスワード（6文字以上）
              </label>
              <input
                type="password"
                className="
                  w-full rounded-md border border-black/10 dark:border-white/10
                  bg-white/90 dark:bg-slate-900/70
                  px-3 py-2 text-sm text-slate-900 dark:text-slate-100
                  outline-none
                  focus:border-sky-500 focus:ring-1 focus:ring-sky-300
                "
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Button & Message */}
            <div className="pt-2 space-y-2">
              <Button type="submit" className="w-full">
                登録する
              </Button>

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
