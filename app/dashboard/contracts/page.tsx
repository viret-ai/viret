// =====================================
// app/dashboard/contracts/page.tsx
// 契約中の案件一覧（依頼者・レタッチャー両方の立場）
// - jobs.owner_id = 自分 → 「依頼者として」
// - jobs.retoucher_id = 自分 → 「レタッチャーとして」
// - メイン導線は取引ルーム（/dashboard/contracts/[jobId]）
// - active を優先表示し、completed/cancelled は下に分離
// =====================================

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import Card from "@/components/ui/Card";
import { typography } from "@/lib/theme";

type PageProps = {};

type JobRow = {
  id: string;
  retouch_job_id: string | null;
  owner_id: string;
  retoucher_id: string;
  title: string | null;
  status: "pending" | "active" | "completed" | "cancelled";
  total_pins: number | null;
  total_price_coins: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export default async function ContractsPage(_props: PageProps) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-10">
        <div className="mx-auto max-w-xl space-y-4">
          <h1 className={typography("h1")}>契約中の案件</h1>
          <p className={typography("body")}>
            契約中の案件を確認するには、ログインが必要です。
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-50 hover:bg-slate-800"
          >
            ログインページへ
          </Link>
        </div>
      </main>
    );
  }

  // 自分が owner または retoucher の jobs を取得
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id, retouch_job_id, owner_id, retoucher_id, title, status, total_pins, total_price_coins, started_at, completed_at, created_at"
    )
    .or(`owner_id.eq.${user.id},retoucher_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .returns<JobRow[]>();

  if (error) throw error;

  const owningAll = (jobs ?? []).filter((j) => j.owner_id === user.id);
  const retouchingAll = (jobs ?? []).filter((j) => j.retoucher_id === user.id);

  const owningActive = owningAll.filter((j) => j.status === "active");
  const owningHistory = owningAll.filter((j) => j.status !== "active");

  const retouchingActive = retouchingAll.filter((j) => j.status === "active");
  const retouchingHistory = retouchingAll.filter((j) => j.status !== "active");

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-2 border-b border-black/5 pb-4">
          <div className="text-[11px] text-slate-500">
            ダッシュボード / 契約中の案件
          </div>
          <h1 className={typography("h1")}>契約中の案件</h1>
          <p className={typography("body") + " text-slate-600"}>
            自分が依頼者として出した案件と、レタッチャーとして受注している案件の一覧です。
            取引の進行・納品・修正依頼は「取引ルーム」で行います。
          </p>
        </header>

        {/* 依頼者として */}
        <section className="space-y-3">
          <h2 className={typography("h2")}>依頼者としての契約</h2>

          {owningActive.length === 0 ? (
            <Card className="p-4 text-sm text-slate-600">
              現在、依頼者として進行中の契約はありません。
            </Card>
          ) : (
            <div className="space-y-3">
              {owningActive.map((job) => (
                <ContractItem key={job.id} job={job} roleLabel="依頼者" />
              ))}
            </div>
          )}

          {owningHistory.length > 0 ? (
            <details className="rounded-md border border-slate-200 bg-white/40 p-4">
              <summary className="cursor-pointer text-sm text-slate-700">
                完了・未開始・キャンセル（{owningHistory.length}）
              </summary>
              <div className="mt-3 space-y-3">
                {owningHistory.map((job) => (
                  <ContractItem key={job.id} job={job} roleLabel="依頼者" />
                ))}
              </div>
            </details>
          ) : null}
        </section>

        {/* レタッチャーとして */}
        <section className="space-y-3">
          <h2 className={typography("h2")}>レタッチャーとしての契約</h2>

          {retouchingActive.length === 0 ? (
            <Card className="p-4 text-sm text-slate-600">
              現在、レタッチャーとして進行中の契約はありません。
            </Card>
          ) : (
            <div className="space-y-3">
              {retouchingActive.map((job) => (
                <ContractItem key={job.id} job={job} roleLabel="レタッチャー" />
              ))}
            </div>
          )}

          {retouchingHistory.length > 0 ? (
            <details className="rounded-md border border-slate-200 bg-white/40 p-4">
              <summary className="cursor-pointer text-sm text-slate-700">
                完了・未開始・キャンセル（{retouchingHistory.length}）
              </summary>
              <div className="mt-3 space-y-3">
                {retouchingHistory.map((job) => (
                  <ContractItem key={job.id} job={job} roleLabel="レタッチャー" />
                ))}
              </div>
            </details>
          ) : null}
        </section>
      </div>
    </main>
  );
}

// ---- サブコンポーネント ----
type ContractItemProps = {
  job: JobRow;
  roleLabel: "依頼者" | "レタッチャー";
};

function ContractItem({ job, roleLabel }: ContractItemProps) {
  const totalPins = job.total_pins ?? 0;
  const totalPrice = job.total_price_coins ?? 0;

  const started =
    job.started_at &&
    new Date(job.started_at).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const completed =
    job.completed_at &&
    new Date(job.completed_at).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  return (
    <Card className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={typography("body")}>{job.title ?? "（無題）"}</span>

          <span className="inline-flex items-center rounded-full border border-slate-300 px-2 py-[2px] text-[11px] text-slate-600">
            {roleLabel}
          </span>

          <span className="inline-flex items-center rounded-full border border-slate-300 px-2 py-[2px] text-[11px] text-slate-600">
            ステータス: {getJobStatusLabel(job.status)}
          </span>
        </div>

        <p className="text-[12px] text-slate-600">
          合計ピン: {totalPins} / 報酬コイン: {totalPrice}
        </p>

        <p className="text-[11px] text-slate-400">
          開始日: {started ?? "-"} / 完了日: {completed ?? "-"}
        </p>

        <p className="text-[11px] text-slate-400">
          Job ID: <span className="font-mono">{job.id}</span>
        </p>
      </div>

      <div className="mt-2 flex flex-shrink-0 items-center gap-2 md:mt-0">
        <Link
          href={`/dashboard/contracts/${job.id}`}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800"
        >
          取引ルームを開く
        </Link>

        {job.retouch_job_id ? (
          <Link
            href={`/jobs/${job.retouch_job_id}`}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            依頼ページを開く
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

function getJobStatusLabel(status: JobRow["status"]): string {
  switch (status) {
    case "pending":
      return "未開始";
    case "active":
      return "進行中";
    case "completed":
      return "完了";
    case "cancelled":
      return "キャンセル";
    default:
      return status;
  }
}
