// =====================================
// components/assets/AssetDetailContent.tsx
// 素材詳細の共通中身（Server Component）
// - フルページ（/assets/[id]）と一覧モーダル（/assets?view=...）で共通表示
// - DB: assets + profiles(handle)
// =====================================

import Link from "next/link";
import { notFound } from "next/navigation";
import Card from "@/components/ui/Card";
import { supabaseServer } from "@/lib/supabase-server";
import { getAssetPublicUrl } from "@/lib/storage";
import DownloadPanel from "@/app/assets/[id]/DownloadPanel";

type AssetRow = {
  id: string;
  owner_id: string | null;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  preview_path: string | null;
  original_path: string | null;
  created_at: string | null;
  width: number | null;
  height: number | null;
};

function formatJpDate(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AssetDetailContent({
  assetId,
  showBreadcrumbs = true,
}: {
  assetId: string;
  showBreadcrumbs?: boolean;
}) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
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

  if (!data && !error) notFound();

  const asset = (data ?? null) as AssetRow | null;

  // クリエイターの @handle
  let creatorHandle: string | null = null;

  if (asset?.owner_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", asset.owner_id)
      .maybeSingle();

    creatorHandle = profile?.handle ?? null;
  }

  const creatorLabel = creatorHandle
    ? `@${creatorHandle}`
    : asset?.owner_id
      ? `creator_${asset.owner_id.slice(0, 8)}`
      : "unknown_creator";

  const creatorProfileUrl = creatorHandle ? `/profile/${creatorHandle}` : null;

  const previewUrl = asset?.preview_path
    ? getAssetPublicUrl(asset.preview_path)
    : null;

  const originalUrl =
    (asset?.original_path ? getAssetPublicUrl(asset.original_path) : null) ||
    previewUrl ||
    "";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      {showBreadcrumbs && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-1">
            <Link href="/" className="hover:underline">
              Viret
            </Link>
            <span>/</span>
            <Link href="/assets" className="hover:underline">
              素材一覧
            </Link>
            {asset?.title && (
              <>
                <span>/</span>
                <span className="text-slate-500">素材詳細</span>
                <span>/</span>
                <span className="font-medium text-slate-700">{asset.title}</span>
              </>
            )}
          </div>

          <div className="font-mono">
            素材ID: <span>{assetId}</span>
          </div>
        </div>
      )}

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
          {/* ===== 左：プレビュー＋説明 ===== */}
          <div className="flex-1 space-y-4">
            <Card as="section" className="shadow-sm">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                プレビュー
              </div>
              <div className="flex items-center justify-center overflow-hidden rounded-none bg-slate-100">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={asset.title || "asset preview"}
                    className="max-h-[560px] w-auto max-w-full object-contain"
                  />
                ) : (
                  <div className="flex h-[320px] w-full items-center justify-center text-xs text-slate-400">
                    プレビュー画像を読み込めませんでした
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-slate-900">素材の説明</h2>
              {asset.description ? (
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                  {asset.description}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  素材説明はまだ登録されていません。
                </p>
              )}
            </Card>
          </div>

          {/* ===== 右：DL＋メタ ===== */}
          <aside className="w-full max-w-md space-y-4 lg:w-80">
            <DownloadPanel
              assetId={assetId}
              originalUrlExists={!!originalUrl}
              originalWidth={asset.width}
              originalHeight={asset.height}
              title={asset.title}
            />

            <Card className="space-y-3 text-xs text-slate-700">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  クリエイター
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {creatorProfileUrl ? (
                    <Link href={creatorProfileUrl} className="text-sky-700 underline">
                      {creatorLabel}
                    </Link>
                  ) : (
                    creatorLabel
                  )}
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
                この素材をもとに、レタッチャーに細かい修正や加工を依頼できます。
                ピンを置いてほしい箇所を指定し、依頼内容をテキストで補足してください。
              </p>

              <div className="mt-3">
                <Link
                  href={`/jobs/${assetId}`}
                  className="inline-flex w-full items-center justify-center rounded bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white hover:bg-slate-800"
                >
                  この素材をレタッチ依頼に出す →
                </Link>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                  ※ 現時点では UI プレビュー用の画面に遷移します。後日、実際の依頼作成フローと連携予定です。
                </p>
              </div>
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
  );
}
