// =====================================
// components/layout/Header.tsx
// サイト共通ヘッダー（シンプルナビ）
// - 認証状態は見ず、リンクだけを表示
// =====================================

"use client";

import Link from "next/link";
import { typography } from "@/lib/theme";

export default function Header() {
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

        {/* 認証関連（シンプルに2つだけ） */}
        <Link href="/login" className="hover:text-sky-700">
          ログイン
        </Link>
        <Link href="/signup" className="hover:text-sky-700">
          新規登録
        </Link>

        {/* 🔧 Style Guide（開発時のみ） */}
        {process.env.NODE_ENV === "development" && (
          <Link
            href="/style-guide"
            className="text-xs hover:text-indigo-700"
          >
            Style Guide
          </Link>
        )}
      </nav>
    </header>
  );
}
