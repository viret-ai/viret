// =====================================
// components/layout/Header.tsx
// サイト共通ヘッダー（dev専用管理者ボタン＋StyleGuideリンク）
// =====================================

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import { typography } from "@/lib/theme";

export default function Header() {
  const router = useRouter();

  const handleDevAdminLogin = async () => {
    if (process.env.NODE_ENV !== "development") return;

    const email = process.env.NEXT_PUBLIC_DEV_ADMIN_EMAIL || "";
    const password = process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD || "";

    if (!email || !password) return;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) router.push("/dashboard");
  };

  return (
    <header
      className="
        flex w-full items-center justify-between
        border-b border-slate-200
        bg-[var(--v-bg)]/95
        px-6 py-3
        backdrop-blur
      "
    >
      <Link href="/" className={`${typography("h2")} text-lg`}>
        Viret
      </Link>

      <nav className="flex items-center gap-4 text-xs text-slate-600">
        <Link href="/assets" className="hover:text-sky-700">素材を探す</Link>
        <Link href="/jobs" className="hover:text-sky-700">レタッチ案件</Link>
        <Link href="/post" className="hover:text-sky-700">投稿する</Link>
        <Link href="/subscribe" className="hover:text-sky-700">プラン</Link>
        <Link href="/login" className="hover:text-sky-700">ログイン</Link>

        {/* 🔧 Style Guide（開発時のみ追加） */}
        {process.env.NODE_ENV === "development" && (
          <Link href="/style-guide" className="hover:text-indigo-700 text-xs">
            Style Guide
          </Link>
        )}

        {/* 🔧 devモード限定 管理者ログイン */}
        {process.env.NODE_ENV === "development" && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleDevAdminLogin}
            className="text-[10px] px-2 py-1"
          >
            管理者ログイン
          </Button>
        )}
      </nav>
    </header>
  );
}
