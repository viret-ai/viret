// =====================================
// app/jobs/[jobId]/hired/page.tsx
// 採用完了ページ（契約開始の確定）
// - assign API 成功後に遷移
// - ここで jobs.status を 'active' に更新して「契約開始」を確定させる
// - job_messages がある場合は system ログも 1 件入れる（契約開始）
// =====================================

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { typography } from "@/lib/theme";

type PageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobHiredPage({ params }: PageProps) {
  const { jobId } = await params;

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // -------------------------------------
  // 契約開始の確定（jobs.status = active）
  // - enum は pending / active / completed / cancelled
  // - 細かい状態（納品済み等）は job_messages / deliveries / paid_actions で表現する
  // -------------------------------------
  const upd = await supabase
    .from("jobs")
    .update({ status: "active" })
    .eq("id", jobId)
    .eq("owner_id", user.id);

  // もし RLS / 条件不一致で更新できなくても、表示自体はさせる（UX優先）
  const statusUpdateError = upd.error?.message ?? null;

  // -------------------------------------
  // systemログ：契約開始（job_messages が導入済みなら）
  // - テーブル未作成の場合はエラーになるので、失敗は握りつぶす
  // -------------------------------------
  try {
    await supabase.from("job_messages").insert({
      job_id: jobId,
      sender_id: user.id,
      kind: "system",
      template_key: "job_started",
      body: null,
      meta: { jobStatus: "active" },
      risk_flags: [],
    });
  } catch {
    // まだ job_messages を作ってない段階でも壊さない
  }

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-3">
          <div className="text-[11px] text-slate-500">
            ダッシュボード / 応募一覧 / 採用完了
          </div>

          <h1 className={typography("h1")}>応募者を採用し、契約を開始しました。</h1>

          <p className={typography("body") + " text-slate-600"}>
            この依頼は「契約中の案件」として登録されました。詳細な進行状況や納品管理は、契約一覧から確認できます。
          </p>

          {statusUpdateError ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold">注意</div>
              <div className="mt-1">
                契約開始ステータスの更新に失敗しました（表示は続行します）。
              </div>
              <div className="mt-1 break-all font-mono text-[11px] opacity-80">
                {statusUpdateError}
              </div>
            </div>
          ) : null}
        </header>

        <section className="space-y-4">
          <p className={typography("caption") + " text-slate-500"}>
            依頼ID: <span className="font-mono">{jobId}</span>
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/contracts"
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-50 hover:bg-slate-800"
            >
              契約中の案件一覧を開く
            </Link>

            <Link
              href={`/dashboard/contracts/${jobId}`}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              この契約の取引ルームを開く
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ダッシュボードに戻る
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
