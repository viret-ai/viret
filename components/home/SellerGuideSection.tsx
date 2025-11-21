// =====================================
// components/home/SellerGuideSection.tsx
// トップページ下部の売り手向け案内（ライトテーマ）
// =====================================

type Props = {
  title: string;
  body: string;
};

export default function SellerGuideSection({ title, body }: Props) {
  return (
    <section className="max-w-4xl mx-auto mt-16 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{body}</p>
      <ul className="mt-4 text-sm text-slate-600 list-disc list-inside space-y-1">
        <li>AI画像をアップロードして素材として公開</li>
        <li>その場で「レタッチ案件」として募集を出すことも可能</li>
        <li>レタッチャーは案件に手を挙げて、Before/After の実績を作成</li>
      </ul>
    </section>
  );
}
