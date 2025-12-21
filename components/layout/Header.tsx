// =====================================
// components/layout/Header.tsx
// サイト共通ヘッダー（ログイン + コイン残高表示）
// - 左：パンくず
// - 右：ログイン中ユーザー（Avatar / Name）＋ 所持コイン（🪙1,000）
// - ゲスト：ゲスト表示＋ログイン/新規登録導線
// - NOTE: "viret:coins" イベントで残高再fetch（即時反映）
// =====================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/ui/Avatar";

type ViewerProfile = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
};

type ViewerState =
  | { kind: "loading" }
  | { kind: "guest" }
  | {
      kind: "user";
      userId: string;
      profile: ViewerProfile | null;
      coinBalance: number;
    };

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
  const crumbs = useMemo(() => buildCrumbs(pathname), [pathname]);

  const [viewer, setViewer] = useState<ViewerState>({ kind: "loading" });

  const loadViewer = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      setViewer({ kind: "guest" });
      return;
    }

    const userId = session.user.id;

    // profile（失敗しても落とさない）
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, handle, display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle<ViewerProfile>();

    // coin balance（APIで取得：RLS/RPCに依存しない）
    let coinBalance = 0;
    try {
      const res = await fetch("/api/coins/balance", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json?.ok && typeof json.balance === "number") {
          coinBalance = json.balance;
        }
      }
    } catch {
      // 失敗時は0のまま（落とさない）
    }

    setViewer({
      kind: "user",
      userId,
      profile: profile ?? null,
      coinBalance,
    });
  };

  useEffect(() => {
    loadViewer();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadViewer();
    });

    // // コイン即時反映：購入/消費後に window.dispatchEvent(new Event("viret:coins"))
    const onCoins = () => {
      loadViewer();
    };
    window.addEventListener("viret:coins", onCoins as EventListener);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("viret:coins", onCoins as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const right = (() => {
    if (viewer.kind === "loading") {
      return (
        <div className="flex items-center gap-3 text-[12px] opacity-70">
          <span className="inline-flex h-7 w-7 items-center justify-center border border-black/10 dark:border-white/10 text-[11px]">
            …
          </span>
        </div>
      );
    }

    if (viewer.kind === "guest") {
      return (
        <div className="flex items-center gap-3 text-[12px] opacity-80">
          <div className="flex items-center gap-2">
            <Avatar src={null} size={28} alt="ゲスト" />
            <span>ゲスト</span>
          </div>

          <Link href="/login" className="underline hover:opacity-100">
            ログイン
          </Link>
          <Link href="/signup" className="underline hover:opacity-100">
            新規登録
          </Link>

          {process.env.NODE_ENV === "development" && (
            <Link href="/style-guide" className="underline hover:opacity-100">
              Style Guide
            </Link>
          )}
        </div>
      );
    }

    // viewer.kind === "user"
    const profile = viewer.profile;
    const displayName =
      profile?.display_name || (profile?.handle ? `@${profile.handle}` : "ユーザー");
    const profileHref = profile?.handle ? `/profile/${profile.handle}` : "/dashboard";

    return (
      <div className="flex items-center gap-3 text-[12px] opacity-80">
        {/* 所持コイン */}
        <div
          className="
            inline-flex items-center gap-1
            px-2 py-1
            border border-black/10 dark:border-white/10
            text-[11px]
          "
          title="現在の所持コイン"
        >
          <span aria-hidden>🪙</span>
          <span className="tabular-nums">{viewer.coinBalance.toLocaleString()}</span>
        </div>

        <Link href={profileHref} className="flex items-center gap-2 hover:opacity-100">
          <Avatar
            src={profile?.avatar_url ?? null}
            size={28}
            alt={`${displayName} のアイコン`}
          />
          <span className="max-w-[12rem] truncate">{displayName}</span>
        </Link>
      </div>
    );
  })();

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
      <div
        className="
          h-full w-full
          pl-[var(--v-sidebar-slot)]
          pr-[var(--v-sidebar-slot)]
        "
      >
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

          {/* 右：アカウント領域 */}
          {right}
        </div>
      </div>
    </header>
  );
}
