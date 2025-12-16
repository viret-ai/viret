// =====================================
// components/home/TopSearchHero.tsx
// トップページの大きな検索ヒーロー
// - 文字検索のみ（タグなし）
// - 確定時に /assets?q=... へ遷移
// - assets_search_events に検索ログを保存（source: "home"）
// =====================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { typography } from "@/lib/theme";
import Button from "@/components/ui/Button";

type Props = {
  title: string;
  subtitle: string;
};

async function sendSearchLog(params: { q: string }) {
  try {
    await fetch("/api/assets/search-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: params.q,
        tags: [], // トップはタグなし
        // result_count は assets 側で取得できるので null
      }),
    });
  } catch {
    // UX優先：失敗しても無視
  }
}

export default function TopSearchHero({ title, subtitle }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const q = query.trim();
    if (!q) return;

    // 🔹 検索ログ（トップ経由）
    await sendSearchLog({ q });

    // 🔹 assets 検索ページへ
    const params = new URLSearchParams();
    params.set("q", q);

    router.push(`/assets?${params.toString()}`);
  };

  return (
    <section className="mx-auto mt-10 max-w-4xl text-center">
      {/* タイトル */}
      <h1 className={typography("h1")}>{title}</h1>

      {/* サブタイトル */}
      <p className={`${typography("body")} mt-4`}>{subtitle}</p>

      {/* 検索フォーム */}
      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <input
          className="
            flex-1 rounded-md
            border border-black/10 dark:border-white/10
            bg-white/80 dark:bg-slate-900/60
            px-3 py-2
            text-sm text-slate-900 dark:text-slate-100
            outline-none
            focus:border-sky-500 focus:ring-1 focus:ring-sky-300
          "
          placeholder="キーワードで素材を検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={query.trim() === ""}
        >
          検索
        </Button>
      </form>
    </section>
  );
}
