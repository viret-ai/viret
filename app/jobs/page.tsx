// =====================================
// app/jobs/page.tsx
// レタッチ依頼一覧ページ（公開掲示板ビュー）
// - retouch_jobs を時系列で一覧表示（全ユーザー閲覧可）
// - タイトルは retouch_jobs.title / payload.assetTitle から取得
// - ピン数・概算金額は total_pins / total_price_coins と payload の両方をフォールバック
// - サムネは payload から拾えるものを優先（無ければプレースホルダ）
// =====================================

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import Card from "@/components/ui/Card";
import { getAssetPublicUrl } from "@/lib/storage";

type RetouchJobRow = {
  id: string;
  created_at: string;
  title: string | null;
  payload: any | null;
  total_pins: number | null;
  total_price_coins: number | null;
};

type ListedJob = {
  id: string;
  createdAt: string;
  title: string;
  summary: string;
  totalPins: number;
  totalPrice: number;
  thumbUrl: string | null;
};

function toJpDateTime(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveThumbUrl(payload: any): string | null {
  if (!payload) return null;

  // まず「URLっぽいもの」を優先
  const urlCandidates: Array<unknown> = [
    payload.thumbUrl,
    payload.thumbnailUrl,
    payload.previewUrl,
    payload.assetPreviewUrl,
    payload.imageUrl,
  ];

  for (const v of urlCandidates) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }

  // 次に「Storage の path」っぽいもの（assets バケット前提）
  const pathCandidates: Array<unknown> = [
    payload.thumb_path,
    payload.thumbnail_path,
    payload.preview_path,
    payload.assetPreviewPath,
    payload.base_image_path,
    payload.baseImagePath,
    payload.image_path,
  ];

  for (const v of pathCandidates) {
    if (typeof v === "string" && v.trim().length > 0) {
      // 既に http(s) ならそのまま
      const s = v.trim();
      if (/^https?:\/\//i.test(s)) return s;

      // それ以外は「assets バケットの public URL 化」を試す
      try {
        return getAssetPublicUrl(s);
      } catch {
        // lib/storage の実装次第で例外があり得るので握りつぶす
        return null;
      }
    }
  }

  return null;
}

export default async function JobsPage() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("retouch_jobs")
    .select("id, created_at, title, payload, total_pins, total_price_coins")
    .order("created_at", { ascending: false });

  const rows: RetouchJobRow[] = (data as RetouchJobRow[] | null) ?? [];

  const jobs: ListedJob[] = rows.map((row) => {
    const payload = (row.payload ?? {}) as any;

    // タイトル：テーブル側 title 優先 → payload.assetTitle
    const titleFromPayload =
      typeof payload.assetTitle === "string" && payload.assetTitle.trim().length > 0
        ? payload.assetTitle.trim()
        : "";
    const title =
      (row.title && row.title.trim().length > 0 ? row.title.trim() : "") ||
      titleFromPayload ||
      "タイトル未設定の依頼";

    // 内訳テキスト
    const summary: string =
      typeof payload.pinSummaryText === "string"
        ? payload.pinSummaryText
        : typeof payload.summary === "string"
          ? payload.summary
          : "";

    // ピン数：payload.totalPins → payload.total_pins → total_pins → pins.length
    const totalPins: number =
      typeof payload.totalPins === "number"
        ? payload.totalPins
        : typeof payload.total_pins === "number"
          ? payload.total_pins
          : typeof row.total_pins === "number"
            ? row.total_pins
            : Array.isArray(payload.pins)
              ? payload.pins.length
              : 0;

    // 概算金額：payload.totalPrice → payload.total_price → total_price_coins
    const totalPrice: number =
      typeof payload.totalPrice === "number"
        ? payload.totalPrice
        : typeof payload.total_price === "number"
          ? payload.total_price
          : typeof row.total_price_coins === "number"
            ? row.total_price_coins
            : 0;

    const thumbUrl = resolveThumbUrl(payload);

    return {
      id: row.id,
      createdAt: row.created_at,
      title,
      summary,
      totalPins,
      totalPrice,
      thumbUrl,
    };
  });

  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-6 text-[var(--v-text)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--v-text)]">
            レタッチ依頼掲示板（テスト版）
          </h1>
          <p className="text-xs leading-relaxed text-[var(--v-text)]/70">
            公開中のレタッチ依頼一覧です。カードから詳細へ移動し「手を挙げる」から応募できます。
          </p>
        </header>

        {error && (
          <Card className="border border-red-300 bg-red-50 px-4 py-3 text-[11px] text-red-700">
            <div className="font-semibold">retouch_jobs 取得エラー</div>
            <pre className="mt-1 whitespace-pre-wrap break-all">
              {JSON.stringify(error, null, 2)}
            </pre>
          </Card>
        )}

        {!error && jobs.length === 0 && (
          <Card className="mt-4 border border-dashed border-black/20 bg-white px-4 py-6 text-center text-xs text-slate-900">
            現在、公開中のレタッチ依頼はありません。
            <br />
            画像詳細ページから新しく依頼を作成すると、ここに一覧表示されます。
          </Card>
        )}

        {!error && jobs.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="flex h-full flex-col overflow-hidden border border-black/10 bg-white text-slate-900"
              >
                {/* ===== サムネ ===== */}
                <div className="relative w-full bg-slate-100">
                  <div className="aspect-[16/10] w-full">
                    {job.thumbUrl ? (
                      <img
                        src={job.thumbUrl}
                        alt={job.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                        プレビューなし
                      </div>
                    )}
                  </div>

                  {/* ===== 右上：大きい数値（求人っぽい主役） ===== */}
                  <div className="absolute right-2 top-2 rounded-sm bg-white/95 px-3 py-2 shadow-sm">
                    <div className="flex items-baseline gap-3">
                      <div className="text-right">
                        <div className="text-[10px] font-semibold text-slate-600">
                          合計ピン
                        </div>
                        <div className="font-mono text-2xl font-bold leading-none text-slate-900">
                          {job.totalPins}
                        </div>
                      </div>
                      <div className="h-10 w-px bg-slate-200" />
                      <div className="text-right">
                        <div className="text-[10px] font-semibold text-slate-600">
                          概算
                        </div>
                        <div className="font-mono text-2xl font-bold leading-none text-slate-900">
                          ¥{job.totalPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute left-2 top-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-mono text-white">
                    JOB
                  </div>
                </div>

                {/* ===== 本文 ===== */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 text-sm font-semibold text-slate-900">
                      {job.title}
                    </h2>
                    <div className="text-right text-[10px] text-slate-600">
                      {toJpDateTime(job.createdAt)}
                    </div>
                  </div>

                  {job.summary ? (
                    <p className="line-clamp-3 text-[11px] text-slate-800">
                      {job.summary}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      詳細な内訳テキストは登録されていません。
                    </p>
                  )}

                  <div className="mt-auto flex justify-end">
                    <Link
                      href={`/retouch-jobs/${job.id}`}
                      className="inline-flex items-center justify-center rounded-sm border border-slate-900 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white hover:bg-slate-800"
                    >
                      依頼の詳細を見る →
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
