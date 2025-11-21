// =====================================
// app/page.tsx
// トップページ（Supabase から site_settings を読み込む本番仕様）
// =====================================

import { supabaseServer } from "@/lib/supabase-server";
import TopSearchHero from "@/components/home/TopSearchHero";
import SellerGuideSection from "@/components/home/SellerGuideSection";

export default async function Page() {
  // ---------- site_settings を一行だけ取得 ----------
  const { data: settings, error } = await supabaseServer
    .from("site_settings")
    .select("*")
    .limit(1)
    .single();

  // 万一取得できなかったらデフォルト文言で表示
  const fallback = {
    hero_title: "AI画像とレタッチャーが出会うストックマーケット",
    hero_subtitle: "商用利用OKのAI画像を探す・預ける・磨いてもらう場所。",
    seller_guide_title: "あなたのAI画像を、ちゃんと整理して届けよう。",
    seller_guide_body:
      "AI生成画像とレタッチ後データだけを扱う専用ストックサイトです。まずは無料登録して、作品をアップロードしてみてください。",
  };

  const cfg = settings ?? fallback;

  return (
    <main className="min-h-screen p-6 space-y-20">
      <TopSearchHero
        title={cfg.hero_title}
        subtitle={cfg.hero_subtitle}
      />
      <SellerGuideSection
        title={cfg.seller_guide_title}
        body={cfg.seller_guide_body}
      />
    </main>
  );
}
