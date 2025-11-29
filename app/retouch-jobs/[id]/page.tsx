// =====================================
// app/retouch-jobs/[id]/page.tsx
// レタッチ依頼詳細（職人向け）
// - retouch_jobs 1件を表示
// - ワンクリック応募（entries に inserted）
// =====================================

import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { getAssetPublicUrl } from "@/lib/storage";
import Card from "@/components/ui/Card";

type PageProps = {
  params: Promise<{ id: string }>; // Next.js16: params は Promise
};

export default async function RetouchJobDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await supabaseServer();

  // --- retouch_jobs と assets を join ---
  const { data, error } = await supabase
    .from("retouch_jobs")
    .select(
      `
        id,
        asset_id,
        owner_id,
        note,
        total_pins,
        total_price,
        created_at,
        assets:asset_id (
          id,
          title,
          preview_path,
          width,
          height
        )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <main className="min-h-screen p-6">
        <Card className="border border-red-300 bg-red-50 p-4 text-[11px] text-red-700">
          <p className="font-semibold">retouch_jobs 取得エラー</p>
          <pre className="mt-1 whitespace-pre-wrap break-all">
            {JSON.stringify(error, null, 2)}
          </pre>
          <Link href="/retouch-jobs" className="mt-2 block text-sky-700 underline">
            一覧に戻る
          </Link>
        </Card>
      </main>
    );
  }

  if (!data) notFound();

  const job = data;
  const asset = job.assets;
  const previewUrl = asset?.preview_path
    ? getAssetPublicUrl(asset.preview_path)
    : null;

  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-6 text-[var(--v-text)]">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {/* パンくず */}
        <div className="text-[11px] text-slate-500">
          <Link href="/retouch-jobs" className="hover:underline">
            依頼一覧
          </Link>
          <span className="mx-1">/</span>
          <span className="font-mono">{job.id}</span>
        </div>

        {/* タイトル */}
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">
            レタッチ依頼 詳細
          </h1>
          <p className="text-xs text-slate-600">
            この依頼に対応可能であれば、ページ下部の「手を挙げる」から応募できます。
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* 左：画像＋メモ */}
          <Card className="border border-slate-200 bg-white p-4 text-xs text-slate-800">
            <div className="text-[11px] font-semibold uppercase text-slate-500 mb-2">
              PREVIEW
            </div>

            <div className="flex items-center justify-center rounded border border-slate-200 bg-slate-50 p-2">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={asset?.title ?? ""}
                  className="max-h-[360px] w-auto object-contain"
                />
              ) : (
                <span className="text-slate-400">画像なし</span>
              )}
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="text-[11px] font-semibold text-slate-600 mb-1">
                依頼メモ
              </div>
              {job.note ? (
                <p className="whitespace-pre-wrap text-xs">{job.note}</p>
              ) : (
                <p className="text-[11px] text-slate-500">
                  メモはありません。
                </p>
              )}
            </div>
          </Card>

          {/* 右：内訳 */}
          <Card className="flex flex-col gap-3 border border-slate-200 bg-white p-4 text-xs text-slate-800">
            <div>
              <div className="text-[11px] font-semibold uppercase text-slate-500">
                SUMMARY
              </div>
              <div className="text-sm font-semibold text-slate-900 mt-1">
                内訳
              </div>
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px]">
                ピン総数：<span className="font-mono">{job.total_pins}</span>
              </p>
              <p className="text-[11px]">
                概算金額：¥{job.total_price.toLocaleString()}
              </p>
            </div>

            <p className="mt-2 text-[10px] text-slate-500 border-t border-dashed border-slate-300 pt-2">
              実金額はレタッチャー確定後に最終調整されます。
            </p>
          </Card>
        </section>

        {/* フッター：応募 */}
        <section className="mt-4 flex flex-col gap-3 pb-4 sm:flex-row sm:justify-between">
          <Link
            href="/retouch-jobs"
            className="inline-flex items-center justify-center rounded border border-slate-400 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            ← 一覧に戻る
          </Link>

          <form
            action={`/api/retouch-jobs/${job.id}/entry`}
            method="post"
            className="inline-flex"
          >
            <button
              type="submit"
              className="rounded bg-slate-900 px-6 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              この依頼に手を挙げる →
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
