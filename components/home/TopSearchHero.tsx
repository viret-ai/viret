// =====================================
// components/home/TopSearchHero.tsx
// トップページの大きな検索ヒーロー
// =====================================

"use client";

import { useState } from "react";
import { typography } from "@/lib/theme";
import Button from "@/components/ui/Button";

type Props = {
  title: string;
  subtitle: string;
};

export default function TopSearchHero({ title, subtitle }: Props) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("search:", query);
  };

  return (
    <section className="max-w-4xl mx-auto mt-10 text-center">
      {/* タイトル */}
      <h1 className={typography("h1")}>{title}</h1>

      {/* サブタイトル */}
      <p className={`${typography("body")} mt-4`}>{subtitle}</p>

      {/* 検索フォーム */}
      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <input
          className="
            flex-1 rounded-md border border-black/10 dark:border-white/10
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

        {/* Button コンポーネント統合 */}
        <Button type="submit" variant="primary" size="md">
          検索
        </Button>
      </form>
    </section>
  );
}
