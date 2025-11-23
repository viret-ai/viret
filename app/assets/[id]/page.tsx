// =====================================
// app/assets/[id]/page.tsx
// 素材詳細ページ（Adobe Stock風レイアウト）
// 左カラム：プレビュー＋説明（同じ幅で縦積み）
// 右カラム：DLパネル＋メタ＋今後の拡張
// =====================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getAssetPublicUrl } from "@/lib/storage";
import DownloadPanel from "./DownloadPanel";
import Card from "@/components/ui/Card";

type AssetRow = {
  id: string;
  owner_id: string | null;
  title: string;
  description: string | null;
  tags: string[] | null;
  preview_path: string;
  original_path: string;
  created_at: string;
  width: number | null;
  height: number | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatJpDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const assetId = id;

  const { data, error } = await supabaseServer
    .from("assets")
    .select(
      [
        "id",
        "owner_id",
        "title",
        "description",
        "tags",
        "preview_path",
        "original_path",
        "created_at",
        "width",
        "height",
      ].join(","),
    )
    .eq("id", assetId)
    .maybeSingle();

  if (!data && !error) {
    notFound();
  }

  const asset = data as AssetRow | null;

  const previewUrl = asset ? getAssetPublicUrl(asset.preview_path) : null;
  const originalUrl =
    (asset && (getAssetPublicUrl(asset.original_path) || previewUrl)) || "";

  const ownerLabel =
    asset && asset.owner_id
      ? `creator_${asset.owner_id.slice(0, 8)}`
      : "unknown_creator";

  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-6 text-[var(--v-text)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {/* パンくず */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-1">
            <Link href="/" className="hover:underline">
              Viret
            </Link>
            <span>/</span>
            <Link href="/assets" className="hover:underline">
              素材一覧
            </Link>
            {asset && (
              <>
                <span>/</span>
                <span className="text-slate-500">素材詳細</span>
                <span>/</span>
                <span className="font-medium text-slate-700">
                  {asset.title}
                </span>
              </>
            )}
          </div>
          <div className="font-mono">
            素材ID: <span>{assetId}</span>
          </div>
        </div>

        {error && (
          <Card
            variant="ghost"
            className="border border-red-300 bg-red-50 px-4 py-3 text-[11px] text-red-700"
          >
            <div className="font-semibold">Supabase エラー</div>
            <pre className="mt-1 whitespace-pre-wrap break-all">
              {JSON.stringify(error, null, 2)}
            </pre>
          </Card>
        )}

        {asset && (
          <section className="mt-2 flex flex-col gap-6 lg:flex-row">
            {/* ===== 左カラム：プレビュー＋説明（同じ幅で縦積み） ===== */}
            <div className="flex-1 space-y-4">
              {/* プレビュー */}
              <Card as="section" className="shadow-sm">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  プレビュー
                </div>
                <div className="flex items-center justify-center overflow-hidden rounded-none bg-slate-100">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={asset.title}
                      className="max-h-[560px] w-auto max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-[320px] w-full items-center justify-center text-xs text-slate-400">
                      プレビュー画像を読み込めませんでした
                    </div>
                  )}
                </div>
              </Card>

              {/* 素材の説明（プレビューと同じ幅で直下に配置） */}
              <Card>
                <h2 className="text-sm font-semibold text-slate-900">
                  素材の説明
                </h2>
                {asset.description ? (
                  <p className="mt-2 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {asset.description}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    素材説明はまだ登録されていません。
                  </p>
                )}
              </Card>
            </div>

            {/* ===== 右カラム：DLパネル＋メタ＋この素材からできること ===== */}
            <aside className="w-full max-w-md space-y-4 lg:w-80">
              <DownloadPanel
                assetId={assetId}
                originalUrlExists={!!originalUrl}
                originalWidth={asset.width}
                originalHeight={asset.height}
                title={asset.title}
                downloadUrl={originalUrl}
              />

              <Card className="space-y-3 text-xs text-slate-700">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    クリエイター
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {ownerLabel}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">登録日</span>
                    <span className="text-xs text-slate-700">
                      {formatJpDate(asset.created_at)}
                    </span>
                  </div>
                </div>

                {asset.tags && asset.tags.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      タグ
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {asset.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-2 py-[2px] text-[10px] text-slate-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="text-xs text-slate-700">
                <h2 className="text-sm font-semibold text-slate-900">
                  この素材からできること
                </h2>
                <p className="mt-2 leading-relaxed">
                  将来的には、ここに「このAI画像をレタッチ依頼に出す」ボタンや、
                  同じクリエイターの別作品、似たタグの素材などを表示する予定です。
                </p>
              </Card>
            </aside>
          </section>
        )}

        {!asset && !error && (
          <Card className="mt-10 text-sm text-slate-600">
            対象の素材が見つかりませんでした。
          </Card>
        )}
      </div>
    </main>
  );
}
