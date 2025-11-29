// =====================================
// app/jobs/page.tsx
// レタッチ依頼一覧ページ（投稿者ビュー）
// - retouch_jobs を一覧表示
// - payload から totalPins / totalPrice / pinSummaryText を読む
// - 各行から：
//   ・/jobs/[assetId] … 元のピン指定画面（編集用）
//   ・/retouch-jobs/[id] … レタッチャー向け求人票（依頼詳細）
// =====================================

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import Card from "@/components/ui/Card";

type RetouchJobRow = {
  id: string;
  asset_id: string;
  payload: unknown;
  created_at: string;
};

type ListedJob = {
  id: string;
  assetId: string;
  createdAt: string;
  totalPins: number;
  totalPrice: number;
  summary: string;
};

export default async function JobsPage() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("retouch_jobs")
    .select("id, asset_id, payload, created_at")
    .order("created_at", { ascending: false });

  const rows: RetouchJobRow[] = (data as RetouchJobRow[] | null) ?? [];

  const jobs: ListedJob[] = rows.map((row) => {
    const payload = (row.payload ?? {}) as any;

    const totalPins: number =
      typeof payload.totalPins === "number"
        ? payload.totalPins
        : typeof payload.total_pins === "number"
        ? payload.total_pins
        : 0;

    const totalPrice: number =
      typeof payload.totalPrice === "number"
        ? payload.totalPrice
        : typeof payload.total_price === "number"
        ? payload.total_price
        : 0;

    const summary: string =
      typeof payload.pinSummaryText === "string"
        ? payload.pinSummaryText
        : typeof payload.summary === "string"
        ? payload.summary
        : "";

    return {
      id: row.id,
      assetId: row.asset_id,
      createdAt: row.created_at,
      totalPins,
      totalPrice,
      summary,
    };
  });

  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-6 text-[var(--v-text)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {/* タイトル */}
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            自分が出したレタッチ依頼一覧（テスト版）
          </h1>
          <p className="text-xs leading-relaxed text-slate-600">
            これまでに作成したレタッチ依頼を一覧表示しています。
            各行のボタンから「ピン指定をやり直す」または「レタッチャー向けの依頼詳細を見る」ことができます。
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

        {jobs.length === 0 && !error && (
          <Card className="mt-4 text-xs text-slate-600">
            まだレタッチ依頼が登録されていません。
          </Card>
        )}

        {jobs.length > 0 && (
          <Card className="overflow-hidden border border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-slate-50 text-[11px] text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">
                    作成日
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">
                    概要
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">
                    ピン数
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right font-semibold">
                    概算金額
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2 text-center font-semibold">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="border-b border-slate-100 px-3 py-2 align-top text-[11px] text-slate-600">
                      {new Date(job.createdAt).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 align-top text-[11px] text-slate-800">
                      {job.summary || (
                        <span className="text-slate-400">
                          内訳テキストなし
                        </span>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 align-top text-right font-mono text-[11px]">
                      {job.totalPins}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 align-top text-right font-mono text-[11px]">
                      ¥{job.totalPrice.toLocaleString()}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 align-top">
                      <div className="flex flex-col items-stretch gap-1 text-[11px]">
                        {/* 元のピン指定画面（依頼内容の編集） */}
                        <Link
                          href={`/jobs/${job.assetId}`}
                          className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 hover:bg-slate-50"
                        >
                          ピン指定画面を開く
                        </Link>

                        {/* レタッチャー向け求人票（依頼詳細） */}
                        <Link
                          href={`/retouch-jobs/${job.id}`}
                          className="inline-flex items-center justify-center rounded border border-slate-800 bg-slate-900 px-2 py-1 text-white hover:bg-slate-800"
                        >
                          依頼詳細（求人票）を見る →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </main>
  );
}
