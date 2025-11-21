// =====================================
// app/signup/page.tsx
// 新規登録（メール＋パスワード）
// =====================================

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMsg("登録に失敗しました：" + error.message);
      return;
    }

    setMsg("確認メールを送信しました。メールをご確認ください。");
  };

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-xl font-bold mb-6">新規登録</h1>

      <form onSubmit={handleSignup} className="space-y-4 max-w-md">
        <input
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          placeholder="パスワード（6文字以上）"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-black"
        >
          登録
        </button>

        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </form>
    </main>
  );
}
