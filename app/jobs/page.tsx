// =====================================
// app/jobs/page.tsx
// レタッチ依頼一覧ページ（公開掲示板ビュー）
// - retouch_jobs を時系列で一覧表示（全ユーザー閲覧可）
// - payload 内の totalPins / totalPrice / pinSummaryText などを使用
// - 各カードから /retouch-jobs/[id] へ遷移（再編集リンクは持たない）
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
  title: string;
  summary: string;
  totalPins: number;
  totalPrice: number;
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

    // タイトル（assets 側のタイトルを payload に入れておいた想定）
    const title: string =
      typeof payload.assetTitle === "string" && payload.assetTitle.trim().length > 0
        ? payload.assetTitle
        : "タイトル未設定の依頼";

    // 内訳テキスト
    const summary: string =
      typeof payload.pinSummaryText === "string"
        ? payload.pinSummaryText
        : typeof payload.summary === "string"
        ? payload.summary
        : "";

    // ピン数：payload.totalPins / total_pins / pins.length の順でフォールバック
    const totalPins: number =
      typeof payload.totalPins === "number"
        ? payload.totalPins
        : typeof payload.total_pins === "number"
        ? payload.total_pins
        : Array.isArray(payload.pins)
        ? payload.pins.length
        : 0;

    // 概算金額：payload.totalPrice / total_price のどちらか
    const totalPrice: number =
      typeof payload.totalPrice === "number"
        ? payload.totalPrice
        : typeof payload.total_price === "number"
        ? payload.total_price
        : 0;

    return {
      id: row.id,
      assetId: row.asset_id,
      createdAt: row.created_at,
      title,
      summary,
      totalPins,
      totalPrice,
    };
  });

  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-6 text-[var(--v-text)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {/* タイトル */}
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            レタッチ依頼掲示板（テスト版）
          </h1>
          <p className="text-xs leading-relaxed text-slate-600">
            すべてのユーザーに公開されているレタッチ依頼の一覧です。
            各カードから依頼の詳細ページに移動し、「手を挙げる」ボタンから応募できます。
            いったん送信された依頼内容は、この画面からは編集できません。
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
          <Card className="mt-4 border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-xs text-slate-600">
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
                className="flex h-full flex-col justify-between border border-slate-200 bg-white p-4 text-xs text-slate-800"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 text-sm font-semibold text-slate-900">
                      {job.title}
                    </h2>
                    <div className="text-right text-[10px] text-slate-500">
                      {new Date(job.createdAt).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {job.summary ? (
                    <p className="line-clamp-3 text-[11px] text-slate-700">
                      {job.summary}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      詳細な内訳テキストは登録されていません。
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-slate-500">ピン数</span>
                        <span className="font-mono text-slate-900">
                          {job.totalPins}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="text-slate-500">概算</span>
                        <span className="font-mono text-slate-900">
                          ¥{job.totalPrice.toLocaleString()}
                        </span>
                      </span>
                    </div>
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-mono text-white">
                      JOB
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <Link
                    href={`/retouch-jobs/${job.id}`}
                    className="inline-flex items-center justify-center rounded border border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
                  >
                    依頼の詳細を見る →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
