// =====================================
// components/layout/Header.tsx
// サイト共通ヘッダー（dev専用管理者ボタン付き＋プランリンク）
// =====================================

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const router = useRouter();

  const handleDevAdminLogin = async () => {
    // 本番では絶対に表示させない
    if (process.env.NODE_ENV !== "development") return;

    const email = process.env.NEXT_PUBLIC_DEV_ADMIN_EMAIL || "";
    const password = process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD || "";

    if (!email || !password) {
      console.error("DEV ADMIN ENV missing");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Dev admin login error:", error.message);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-lg font-semibold text-slate-900">
        Viret
      </Link>

      <nav className="flex items-center gap-4 text-xs text-slate-600">
        <Link href="/assets" className="hover:text-sky-700">
          素材を探す
        </Link>
        <Link href="/jobs" className="hover:text-sky-700">
          レタッチ案件
        </Link>
        <Link href="/post" className="hover:text-sky-700">
          投稿する
        </Link>
        <Link href="/subscribe" className="hover:text-sky-700">
          プラン
        </Link>
        <Link href="/login" className="hover:text-sky-700">
          ログイン
        </Link>

        {/* 🔧 devモード限定 管理者ログインボタン */}
        {process.env.NODE_ENV === "development" && (
          <button
            onClick={handleDevAdminLogin}
            className="rounded-md bg-sky-600 px-2 py-1 text-white hover:bg-sky-500 text-[10px]"
          >
            管理者ログイン
          </button>
        )}
      </nav>
    </header>
  );
}
