// =====================================
// components/layout/Header.tsx
// サイト共通ヘッダー（ライトテーマ）
// =====================================

import Link from "next/link";

export default function Header() {
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
        <Link href="/login" className="hover:text-sky-700">
          ログイン
        </Link>
      </nav>
    </header>
  );
}
