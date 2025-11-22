// =====================================
// app/page.tsx
// トップページ（site_settings 依存なし / 静的表示）
// =====================================

import TopSearchHero from "@/components/home/TopSearchHero";
import SellerGuideSection from "@/components/home/SellerGuideSection";
import Card from "@/components/ui/Card";

export default function Page() {
  // いまは静的テキストのみ（site_settings は廃止）
  const hero_title = "AI画像とレタッチャーが出会うストックマーケット";
  const hero_subtitle = "商用利用OKのAI画像を探す・預ける・磨いてもらう場所。";

  const seller_title = "あなたのAI画像を、ちゃんと整理して届けよう。";
  const seller_body =
    "AI生成画像とレタッチ後データだけを扱う専用ストックサイトです。まずは無料登録して、作品をアップロードしてみてください。";

  return (
    <main
      className="
        min-h-screen
        bg-[var(--v-bg)]
        text-[var(--v-text)]
        px-4
        py-10
        space-y-20
      "
    >
      {/* Hero */}
      <TopSearchHero title={hero_title} subtitle={hero_subtitle} />

      {/* Guide */}
      <Card as="section" padded>
        <SellerGuideSection title={seller_title} body={seller_body} />
      </Card>
    </main>
  );
}
