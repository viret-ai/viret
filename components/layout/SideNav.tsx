// =====================================
// components/layout/SideNav.tsx
// 左端固定サイドメニュー（レスポンシブ可変・2モード）
// - collapsed：アイコンのみ（64px）
// - expanded：アイコン＋ラベル（240px）
// - “潜り込み”防止のため、ブレークポイントではなく JS で二択に決め打ちする
//   - --v-sidebar-w   : 実際のサイドバー幅
//   - --v-sidebar-slot: レイアウト用の左右slot（中央カラムの余白）
//   → これらを常に同値で同期させる（重要）
// =====================================

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string; // 依存なし：絵文字で代用
};

const NAV: NavItem[] = [
  { href: "/assets", label: "素材を探す", icon: "🔎" },
  { href: "/jobs", label: "レタッチ案件", icon: "🧰" },
  { href: "/post", label: "投稿する", icon: "⬆️" },
  { href: "/dashboard", label: "ダッシュボード", icon: "👤" },
  { href: "/coins", label: "コイン購入", icon: "🪙" },
  { href: "/account/avatar", label: "設定", icon: "⚙️" },
  { href: "/style-guide", label: "Style Guide", icon: "📘" },
];

// --- レイアウト変数（この2値で固定） ---
const SIDEBAR_EXPANDED_PX = 240;
const SIDEBAR_COLLAPSED_PX = 64;

// --- 自動切替の閾値（ヒステリシス付きでチラつき防止） ---
// collapsed に落とす：この幅未満
const COLLAPSE_BELOW = 1080;
// expanded に戻す：この幅以上
const EXPAND_ABOVE = 1200;

type SidebarMode = "expanded" | "collapsed";

function applySidebarVars(mode: SidebarMode) {
  const px = mode === "expanded" ? SIDEBAR_EXPANDED_PX : SIDEBAR_COLLAPSED_PX;

  // body に直接書き込む（layout.tsx の inline style を上書きする）
  document.body.style.setProperty("--v-sidebar-w", `${px}px`);
  document.body.style.setProperty("--v-sidebar-slot", `${px}px`);

  // 状態も残す（デバッグや将来の手動トグル用）
  document.body.dataset.sidebar = mode;
}

function decideMode(prev: SidebarMode, w: number): SidebarMode {
  // 既に expanded のとき：ある程度狭くなったら collapsed
  if (prev === "expanded") {
    return w < COLLAPSE_BELOW ? "collapsed" : "expanded";
  }

  // 既に collapsed のとき：十分広くなったら expanded
  return w >= EXPAND_ABOVE ? "expanded" : "collapsed";
}

export default function SideNav() {
  const pathname = usePathname();

  const initialMode: SidebarMode = useMemo(() => {
    // SSR/初期は expanded 扱い（hydration後に確定させる）
    return "expanded";
  }, []);

  const [mode, setMode] = useState<SidebarMode>(initialMode);

  useEffect(() => {
    // 初回確定
    const w = window.innerWidth;
    const next = decideMode(mode, w);
    setMode(next);
    applySidebarVars(next);

    const onResize = () => {
      const ww = window.innerWidth;

      setMode((prev) => {
        const decided = decideMode(prev, ww);
        if (decided !== prev) applySidebarVars(decided);
        else applySidebarVars(prev); // 念のため同期維持
        return decided;
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isExpanded = mode === "expanded";

  return (
    <aside
      className="
        fixed left-0 top-0 z-50 h-dvh
        w-[var(--v-sidebar-w)]
        border-r border-black/10 dark:border-white/10
        bg-white/70 dark:bg-slate-950/40
        backdrop-blur
      "
      aria-label="サイドメニュー"
    >
      {/* ロゴ領域 */}
      <div
        className="
          h-[var(--v-header-h)]
          flex items-center
          justify-center
          px-2
        "
      >
        <Link
          href="/"
          className="
            flex items-center gap-2
            text-sm font-semibold tracking-wide
            opacity-90 hover:opacity-100
          "
          title="Viret"
        >
          <span
            className="
              inline-flex h-8 w-8 items-center justify-center
              rounded-md border border-black/10 dark:border-white/10
            "
          >
            V
          </span>

          {/* expanded のときだけ文字 */}
          {isExpanded && <span className="truncate">Viret</span>}
        </Link>
      </div>

      <nav className="px-1 py-2">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label} // collapsed のときはツールチップ代わり
                  aria-current={active ? "page" : undefined}
                  className={`
                    group flex items-center
                    ${isExpanded ? "gap-3 px-3" : "gap-0 px-2 justify-center"}
                    rounded-md
                    py-2
                    text-[13px]
                    hover:bg-black/5 dark:hover:bg-white/5
                    ${active ? "bg-black/5 dark:bg-white/5 font-semibold" : ""}
                  `}
                >
                  <span className="shrink-0 opacity-80 group-hover:opacity-100">
                    <span className="inline-flex h-5 w-5 items-center justify-center">
                      {item.icon}
                    </span>
                  </span>

                  {/* expanded のときだけラベル */}
                  {isExpanded && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
