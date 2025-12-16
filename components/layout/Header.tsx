// =====================================
// components/layout/Header.tsx
// サイト共通ヘッダー（シンプルナビ）
// - 認証状態は見ず、リンクだけを表示
// - 左：パンくず（Home / ...）
// - 右：ログイン・登録・Style Guide
// - 背景/枠は端まで、内容だけ中央カラム＋sidebar-slot分だけ内側に寄せる
// =====================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function buildCrumbs(pathname: string) {
  const clean = (pathname || "/").split("?")[0] || "/";
  const parts = clean.split("/").filter(Boolean);

  const crumbs: { href: string; label: string }[] = [{ href: "/", label: "Home" }];

  let acc = "";
  for (const p of parts) {
    acc += `/${p}`;
    crumbs.push({ href: acc, label: p });
  }

  return crumbs;
}

export default function Header() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <header
      className="
        h-[var(--v-header-h)]
        w-full
        border-b border-black/10 dark:border-white/10
        bg-[var(--v-bg)]/95
        backdrop-blur
      "
    >
      {/* // sidebar-slot 分だけ左右を確保して、サイドバー下に潜らないようにする */}
      <div
        className="
          h-full w-full
          pl-[var(--v-sidebar-slot)]
          pr-[var(--v-sidebar-slot)]
        "
      >
        {/* // 中身だけ中央カラム幅に収める（lg 以降だけ min） */}
        <div
          className="
            mx-auto h-full w-full
            max-w-[var(--v-center-max)]
            lg:min-w-[var(--v-center-min-lg)]
            px-4
            flex items-center justify-between
          "
        >
          {/* 左：パンくず */}
          <nav className="flex items-center gap-2 text-[12px] opacity-80">
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex items-center gap-2">
                {i !== 0 && <span className="opacity-40">/</span>}
                <Link href={c.href} className="underline hover:opacity-100">
                  {c.label}
                </Link>
              </span>
            ))}
          </nav>

          {/* 右：仮のアカウント領域（あとで置き換え） */}
          <div className="flex items-center gap-3 text-[12px] opacity-80">
            <span
              className="
                inline-flex h-7 w-7 items-center justify-center
                rounded-full border border-black/10 dark:border-white/10
                bg-white/70 dark:bg-slate-950/40
                text-[11px]
              "
              title="ゲスト"
            >
              U
            </span>

            <Link href="/login" className="underline hover:opacity-100">
              ログイン
            </Link>
            <Link href="/signup" className="underline hover:opacity-100">
              新規登録
            </Link>

            {/* // 開発時のみ */}
            {process.env.NODE_ENV === "development" && (
              <Link href="/style-guide" className="underline hover:opacity-100">
                Style Guide
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
