// =====================================
// components/home/TopSearchHero.tsx
// トップページの大きな検索ヒーロー（ライトテーマ）
// =====================================

"use client";

import { useState } from "react";

type Props = {
  title: string;
  subtitle: string;
};

export default function TopSearchHero({ title, subtitle }: Props) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 後で /assets?q=... に遷移させる処理を追加する
    console.log("search:", query);
  };

  return (
    <section className="max-w-4xl mx-auto mt-10 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-4 text-sm text-slate-600">{subtitle}</p>
      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-300"
          placeholder="キーワードで素材を検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 active:bg-sky-700"
        >
          検索
        </button>
      </form>
    </section>
  );
}
