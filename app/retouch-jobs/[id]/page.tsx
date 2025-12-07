// =====================================
// app/retouch-jobs/[id]/page.tsx
// レタッチ依頼詳細（職人向け）
// - retouch_jobs 1件を表示
// - 画像は base_image_path or payload.previewUrl を使用
// - メモやサマリは description / payload.note / payload.pinSummaryText から表示
// - ログインユーザーを取得して応募状態を確認
//   - 依頼者本人 → ボタン非表示
//   - 応募済み    → グレーの「応募済み」ボタン（disabled）
//   - 未応募      → 「この依頼に手を挙げる」ボタン（POST）
// =====================================

import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { getAssetPublicUrl } from "@/lib/storage";
import Card from "@/components/ui/Card";

type PageProps = {
  params: Promise<{ id: string }>; // Next.js16: params は Promise
};

type RetouchJobRow = {
  id: string;
  owner_id: string | null;
  title: string | null;
  description: string | null;
  base_image_path: string | null;
  license_source: string | null;
  license_note: string | null;
  payload: any | null;
  total_pins: number | null;
  total_price_coins: number | null;
  created_at: string;
};

export default async function RetouchJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await supabaseServer();

  // ---- 認証ユーザーを取得（応募状態チェック用）----
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUserId = user?.id ?? null;

  // ---- retouch_jobs 単体取得（assets との join は行わない）----
  const { data, error } = await supabase
    .from("retouch_jobs")
    .select(
      `
        id,
        owner_id,
        title,
        description,
        base_image_path,
        license_source,
        license_note,
        payload,
        total_pins,
        total_price_coins,
        created_at
      `,
    )
    .eq("id", id)
    .maybeSingle<RetouchJobRow>();

  if (error) {
    return (
      <main className="min-h-screen p-6">
        <Card className="border border-red-300 bg-red-50 p-4 text-[11px] text-red-700">
          <p className="font-semibold">retouch_jobs 取得エラー</p>
          <pre className="mt-1 whitespace-pre-wrap break-all">
            {JSON.stringify(error, null, 2)}
          </pre>
          <Link
            href="/retouch-jobs"
            className="mt-2 block text-sky-700 underline"
          >
            一覧に戻る
          </Link>
        </Card>
      </main>
    );
  }

  if (!data) notFound();

  const job = data;
  const payload = (job.payload ?? {}) as any;

  // ---- タイトル：テーブル側 title 優先 → payload.assetTitle ----
  const titleFromPayload =
    typeof payload.assetTitle === "string" &&
    payload.assetTitle.trim().length > 0
      ? payload.assetTitle.trim()
      : "";
  const title =
    (job.title && job.title.trim().length > 0 ? job.title.trim() : "") ||
    titleFromPayload ||
    "レタッチ依頼";

  // ---- メモ：description → payload.note ----
  const noteText =
    (job.description && job.description.trim().length > 0
      ? job.description
      : "") ||
    (typeof payload.note === "string" ? payload.note : "");

  // ---- ピン概要テキスト ----
  const pinSummaryText =
    typeof payload.pinSummaryText === "string" ? payload.pinSummaryText : "";

  // ---- ピン数・金額 ----
  const totalPins =
    typeof job.total_pins === "number"
      ? job.total_pins
      : typeof payload.totalPins === "number"
      ? payload.totalPins
      : Array.isArray(payload.pins)
      ? payload.pins.length
      : 0;

  const totalPrice =
    typeof job.total_price_coins === "number"
      ? job.total_price_coins
      : typeof payload.totalPrice === "number"
      ? payload.totalPrice
      : 0;

  // ---- プレビュー画像：payload.previewUrl 優先 → base_image_path ----
  const previewUrl: string | null =
    (typeof payload.previewUrl === "string" &&
    payload.previewUrl.trim().length > 0
      ? payload.previewUrl
      : null) ||
    (job.base_image_path ? getAssetPublicUrl(job.base_image_path) : null);

  // ---- 応募状態チェック ----
  const isOwner =
    currentUserId !== null && job.owner_id === currentUserId;

  let alreadyApplied = false;

  if (currentUserId && !isOwner) {
    const { data: entry } = await supabase
      .from("entries")
      .select("id")
      .eq("retouch_job_id", job.id)
      .eq("applicant_id", currentUserId)
      .maybeSingle();

    alreadyApplied = !!entry;
  }

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
            <div className="mb-2 text-[11px] font-semibold uppercase text-slate-500">
              PREVIEW
            </div>

            <div className="flex items-center justify-center rounded border border-slate-200 bg-slate-50 p-2">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={title}
                  className="max-h-[360px] w-auto object-contain"
                />
              ) : (
                <span className="text-[11px] text-slate-400">
                  画像なし
                </span>
              )}
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="mb-1 text-[11px] font-semibold text-slate-600">
                依頼メモ
              </div>
              {noteText ? (
                <p className="whitespace-pre-wrap text-xs leading-relaxed">
                  {noteText}
                </p>
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
              <div className="mt-1 text-sm font-semibold text-slate-900">
                内訳
              </div>
            </div>

            <div className="space-y-1 rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px]">
                ピン総数：
                <span className="font-mono">{totalPins}</span>
              </p>
              <p className="text-[11px]">
                概算金額：
                <span className="font-mono">
                  ¥{totalPrice.toLocaleString()}
                </span>
              </p>
              {pinSummaryText && (
                <p className="mt-1 text-[11px] text-slate-700">
                  {pinSummaryText}
                </p>
              )}
            </div>

            <p className="mt-2 border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-500">
              金額はピン種別と本数にもとづく概算です。実際の請求額は、
              採用後に依頼者・レタッチャー間で確定します。
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

          {/* 右側：ボタンエリア（依頼者 / 応募済み / 未応募 で出し分け） */}
          <div className="inline-flex">
            {isOwner ? (
              <button
                type="button"
                disabled
                className="cursor-default rounded border border-slate-300 bg-slate-100 px-6 py-2 text-xs font-semibold text-slate-500"
              >
                自分の依頼のため応募できません
              </button>
            ) : alreadyApplied ? (
              <button
                type="button"
                disabled
                className="cursor-default rounded border border-slate-300 bg-slate-100 px-6 py-2 text-xs font-semibold text-slate-500"
              >
                応募済みの依頼です
              </button>
            ) : (
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
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
