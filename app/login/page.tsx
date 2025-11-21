// =====================================
// app/login/page.tsx
// ログイン（メール＋パスワード）
// =====================================

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg("ログイン失敗：" + error.message);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-xl font-bold mb-6">ログイン</h1>

      <form onSubmit={handleLogin} className="space-y-4 max-w-md">
        <input
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          placeholder="パスワード"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-black"
        >
          ログイン
        </button>

        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </form>
    </main>
  );
}
