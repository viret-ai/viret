// =====================================
// app/jobs/[jobId]/entries/page.tsx
// 依頼ごとの応募一覧ページ（依頼者向け）
// - retouch_jobs.owner_id = ログインユーザー前提
// - entries + 応募者プロフィールを一覧表示
// - 「採用する」ボタン → assign API を叩いて契約開始
// =====================================

import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import Card from "@/components/ui/Card";
import { typography } from "@/lib/theme";
import Avatar from "@/components/ui/Avatar";
import EntryAssignButton from "@/components/jobs/EntryAssignButton";

type PageProps = {
  params: Promise<{ jobId: string }>; // Next.js16: params は Promise
};

type RetouchJobRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: "draft" | "open" | "closed" | "archived";
  total_pins: number | null;
  total_price_coins: number | null;
  created_at: string;
};

type EntryRow = {
  id: string;
  retouch_job_id: string;
  applicant_id: string;
  message: string | null;
  status: "applied" | "accepted" | "rejected" | "withdrawn";
  created_at: string;
};

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type JobRow = {
  id: string;
  retouch_job_id: string;
  status: "pending" | "active" | "completed" | "cancelled";
};

export default async function JobEntriesPage({ params }: PageProps) {
  const { jobId } = await params;
  const supabase = await supabaseServer();

  // ---- 認証ユーザー ----
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // ---- 1) 対象 retouch_job ----
  const {
    data: retouchJob,
    error: jobError,
  } = await supabase
    .from("retouch_jobs")
    .select(
      "id, owner_id, title, description, status, total_pins, total_price_coins, created_at"
    )
    .eq("id", jobId)
    .maybeSingle<RetouchJobRow>();

  if (jobError) {
    notFound();
  }
  if (!retouchJob) {
    notFound();
  }

  // 自分の依頼でなければ 404
  if (retouchJob.owner_id !== user.id) {
    notFound();
  }

  // ---- 2) 応募一覧 ----
  const {
    data: entries,
    error: entriesError,
  } = await supabase
    .from("entries")
    .select(
      "id, retouch_job_id, applicant_id, message, status, created_at"
    )
    .eq("retouch_job_id", jobId)
    .order("created_at", { ascending: true })
    .returns<EntryRow[]>();

  if (entriesError) {
    throw entriesError;
  }

  const applicantIds = Array.from(
    new Set(entries?.map((e) => e.applicant_id) ?? [])
  );
  let profilesMap = new Map<string, ProfileRow>();

  if (applicantIds.length > 0) {
    const {
      data: profiles,
      error: profilesError,
    } = await supabase
      .from("profiles")
      .select("id, handle, display_name, avatar_url")
      .in("id", applicantIds)
      .returns<ProfileRow[]>();

    if (profilesError) {
      throw profilesError;
    }

    profilesMap = new Map(
      (profiles ?? []).map((p) => [p.id, p] as [string, ProfileRow])
    );
  }

  // ---- 3) 既に契約が存在するか確認 ----
  const {
    data: existingJob,
    error: existingJobError,
  } = await supabase
    .from("jobs")
    .select("id, retouch_job_id, status")
    .eq("retouch_job_id", jobId)
    .maybeSingle<JobRow>();

  if (existingJobError && existingJobError.code !== "PGRST116") {
    // PGRST116 = no rows
    throw existingJobError;
  }

  const isAlreadyAssigned = !!existingJob;

  const totalPins = retouchJob.total_pins ?? 0;
  const totalPrice = retouchJob.total_price_coins ?? 0;

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* パンくず */}
        <header className="flex flex-col gap-2 border-b border-black/5 pb-4">
          <div className="text-[11px] text-slate-500">
            ダッシュボード / <span>応募一覧</span>
          </div>
          <div className="space-y-2">
            <h1 className={typography("h1")}>
              「{retouchJob.title}」への応募一覧
            </h1>
            <p className={typography("caption") + " text-slate-500"}>
              このレタッチ依頼に届いた応募の一覧です。採用する応募者を 1 名選ぶと、
              契約中の案件として登録されます。
              {isAlreadyAssigned && (
                <>
                  <br />
                  すでにこの依頼は契約開始済みのため、新たに採用することはできません。
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[12px] text-slate-600">
            <span className="inline-flex items-center rounded-full border border-slate-300 px-2.5 py-[3px]">
              ステータス: {getRetouchJobStatusLabel(retouchJob.status)}
            </span>
            <span>合計ピン: {totalPins}</span>
            <span>報酬コイン: {totalPrice}</span>
          </div>
        </header>

        {/* 応募一覧本体 */}
        <section className="space-y-3">
          <h2 className={typography("h2")}>応募者</h2>

          {entries.length === 0 ? (
            <Card className="mt-3 p-4 text-sm text-slate-600">
              まだ応募は届いていません。
            </Card>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                const profile = profilesMap.get(entry.applicant_id) ?? null;
                const displayName =
                  profile?.display_name ||
                  (profile?.handle ? `@${profile.handle}` : "(名称未設定)");
                const handle = profile?.handle ?? null;
                const canAssign =
                  !isAlreadyAssigned && entry.status === "applied";

                return (
                  <Card
                    key={entry.id}
                    className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between"
                  >
                    {/* 左：応募者情報 */}
                    <div className="flex flex-1 items-start gap-3">
                      <Avatar
                        src={profile?.avatar_url ?? null}
                        size={48}
                        alt={displayName}
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={typography("body")}>
                            {displayName}
                          </span>
                          {handle && (
                            <span className="font-mono text-[11px] text-slate-500">
                              @{handle}
                            </span>
                          )}
                          <span className="inline-flex items-center rounded-full border border-slate-300 px-2 py-[2px] text-[11px] text-slate-600">
                            {getEntryStatusLabel(entry.status)}
                          </span>
                        </div>

                        {entry.message && (
                          <p className="whitespace-pre-wrap text-[13px] text-slate-700">
                            {entry.message}
                          </p>
                        )}

                        <p className="text-[11px] text-slate-400">
                          応募日時:{" "}
                          {new Date(entry.created_at).toLocaleString("ja-JP", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* 右：採用ボタン */}
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <EntryAssignButton
                        retouchJobId={retouchJob.id}
                        entryId={entry.id}
                        disabled={!canAssign}
                      />
                      {isAlreadyAssigned && (
                        <p className="text-right text-[11px] text-slate-400">
                          すでに契約開始済みです。
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ---- 補助：ラベル ----
function getRetouchJobStatusLabel(
  status: RetouchJobRow["status"]
): string {
  switch (status) {
    case "draft":
      return "下書き";
    case "open":
      return "募集中";
    case "closed":
      return "受付終了";
    case "archived":
      return "アーカイブ済み";
    default:
      return status;
  }
}

function getEntryStatusLabel(
  status: EntryRow["status"]
): string {
  switch (status) {
    case "applied":
      return "応募済み";
    case "accepted":
      return "採用";
    case "rejected":
      return "不採用";
    case "withdrawn":
      return "応募取り下げ";
    default:
      return status;
  }
}
