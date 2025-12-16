// =====================================
// app/assets/[id]/page.tsx
// 素材詳細フルページ
// - URL直 / プロフ起点はここ
// - 中身は components/assets/AssetDetailContent.tsx に統一
// =====================================

import AssetDetailContent from "@/components/assets/AssetDetailContent";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-6 text-[var(--v-text)]">
      <AssetDetailContent assetId={id} showBreadcrumbs />
    </main>
  );
}
