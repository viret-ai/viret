// =====================================
// app/jobs/page.tsx
// レタッチ案件一覧（仮置き版・ストック風カード）
// - jobs テーブルから公開案件だけを取得して一覧表示
// - 後で /jobs/[jobId] など詳細ページに差し替え予定
// =====================================

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { typography } from "@/lib/theme";

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  price_pins: number | null;
  status: string;
  created_at: string;
};

export default async function JobsPage() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, description, price_pins, status, created_at")
    // 公開中だけにしておく（必要に応じて調整）
    .in("status", ["open", "public", "published"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[jobs] fetch error:", error);
  }

  const jobs: JobRow[] = (data as JobRow[] | null) ?? [];

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className={typography("h1")}>レタッチ案件</h1>
            <p className={typography("body") + " text-sm opacity-70"}>
              募集中のレタッチ案件が並びます。詳細仕様や応募機能は後で追加予定です。
            </p>
          </div>

          {/* 後でフィルタやソートをここに生やす想定 */}
          <div className="text-xs text-slate-500">
            {jobs.length > 0 ? `案件数：${jobs.length}件` : "案件なし"}
          </div>
        </header>

        {jobs.length === 0 ? (
          <div className="mt-12 text-center">
            <p className={typography("body") + " opacity-60"}>
              まだ募集中のレタッチ案件がありません。
            </p>
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="
                  flex flex-col justify-between
                  rounded-md border border-black/5 bg-white/90
                  px-4 py-3 text-left shadow-sm transition
                  hover:border-sky-400 hover:shadow-md
                  dark:border-white/10 dark:bg-slate-900/80
                "
              >
                <div className="space-y-1.5">
                  <h2
                    className={typography("h3") + " line-clamp-2 text-sm sm:text-base"}
                  >
                    {job.title}
                  </h2>

                  {job.description && (
                    <p className="line-clamp-3 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                      {job.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    {/* ステータスバッジ（仮） */}
                    <span
                      className={`
                        inline-flex items-center rounded-sm px-2 py-0.5
                        text-[10px] font-semibold
                        ${
                          job.status === "open"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }
                      `}
                    >
                      {job.status}
                    </span>

                    {/* ピン数（仮：null のときは「未設定」） */}
                    <span>
                      ピン報酬：{" "}
                      {job.price_pins != null ? `${job.price_pins} pins` : "未設定"}
                    </span>
                  </div>

                  <time
                    dateTime={job.created_at}
                    className="text-[10px] opacity-70"
                  >
                    {new Date(job.created_at).toLocaleDateString("ja-JP")}
                  </time>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
