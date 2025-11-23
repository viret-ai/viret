// =====================================
// components/home/SellerGuideSection.tsx
// トップページ下部の売り手向け案内（テーマ連動）
// =====================================

import { typography } from "@/lib/theme";

type Props = {
  title: string;
  body: string;
};

export default function SellerGuideSection({ title, body }: Props) {
  return (
    <section
      className="
        max-w-4xl mx-auto mt-16
        rounded-xl border border-black/5 dark:border-white/10
        bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm
        p-6 shadow-sm
      "
    >
      <h2 className={typography("h2")}>{title}</h2>

      <p className={`${typography("body")} mt-2 whitespace-pre-line`}>
        {body}
      </p>

      <ul className="mt-4 list-disc list-inside space-y-1">
        <li className={typography("body")}>AI画像をアップロードして素材として公開</li>
        <li className={typography("body")}>
          その場で「レタッチ案件」として募集を出すことも可能
        </li>
        <li className={typography("body")}>
          レタッチャーは案件に手を挙げて、Before/After の実績を作成
        </li>
      </ul>
    </section>
  );
}
