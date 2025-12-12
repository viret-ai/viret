// =====================================
// app/api/retouch-jobs/[id]/assign/route.ts
// レタッチ依頼の応募者を「採用」して契約ジョブを作成する API
// - POST /api/retouch-jobs/{id}/assign
// - body: { entryId: string }
// =====================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AssignBody = {
  entryId?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ---- 0) パラメータ・ボディ確認 ----
  const retouchJobId = params.id;
  if (!retouchJobId) {
    return NextResponse.json(
      { error: "retouchJobId が指定されていません。" },
      { status: 400 }
    );
  }

  let body: AssignBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です。" },
      { status: 400 }
    );
  }

  const entryId = body.entryId;
  if (!entryId) {
    return NextResponse.json(
      { error: "entryId が指定されていません。" },
      { status: 400 }
    );
  }

  // ---- 1) 認証 ----
  const cookieStore = await cookies(); // Next.js16: cookies() は Promise
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("assign auth error:", authError);
    return NextResponse.json(
      { error: "ログイン情報を取得できませんでした。" },
      { status: 401 }
    );
  }

  // ---- 2) retouch_job を取得（依頼者チェック） ----
  const {
    data: retouchJob,
    error: jobError,
  } = await supabase
    .from("retouch_jobs")
    .select(
      "id, owner_id, title, description, base_image_path, total_pins, total_price_coins, status"
    )
    .eq("id", retouchJobId)
    .maybeSingle();

  if (jobError) {
    console.error("assign retouch_job fetch error:", jobError);
    return NextResponse.json(
      { error: "依頼情報の取得に失敗しました。" },
      { status: 500 }
    );
  }

  if (!retouchJob) {
    return NextResponse.json(
      { error: "対象のレタッチ依頼が見つかりませんでした。" },
      { status: 404 }
    );
  }

  if (retouchJob.owner_id !== user.id) {
    return NextResponse.json(
      { error: "この依頼の応募者を採用する権限がありません。" },
      { status: 403 }
    );
  }

  if (retouchJob.status !== "open") {
    return NextResponse.json(
      { error: "この依頼はすでに受付終了状態のため、採用できません。" },
      { status: 400 }
    );
  }

  // ---- 3) すでに jobs が作られていないか確認（多重採用防止） ----
  const { data: existingJobs, error: existingJobsError } = await supabase
    .from("jobs")
    .select("id")
    .eq("retouch_job_id", retouchJobId)
    .limit(1);

  if (existingJobsError) {
    console.error("assign existing jobs fetch error:", existingJobsError);
    return NextResponse.json(
      { error: "契約情報の確認に失敗しました。" },
      { status: 500 }
    );
  }

  if (existingJobs && existingJobs.length > 0) {
    return NextResponse.json(
      { error: "この依頼はすでに契約が開始されています。" },
      { status: 400 }
    );
  }

  // ---- 4) 採用対象の応募を取得 ----
  const {
    data: entry,
    error: entryError,
  } = await supabase
    .from("entries")
    .select("id, retouch_job_id, applicant_id, status, created_at")
    .eq("id", entryId)
    .eq("retouch_job_id", retouchJobId)
    .maybeSingle();

  if (entryError) {
    console.error("assign entry fetch error:", entryError);
    return NextResponse.json(
      { error: "応募情報の取得に失敗しました。" },
      { status: 500 }
    );
  }

  if (!entry) {
    return NextResponse.json(
      {
        error:
          "指定された応募が、この依頼に紐づいていないか、存在しません。",
      },
      { status: 404 }
    );
  }

  if (entry.status !== "applied") {
    return NextResponse.json(
      { error: "この応募はすでに選考済みのため、採用できません。" },
      { status: 400 }
    );
  }

  // ---- 5) 採用処理 ----
  const nowIso = new Date().toISOString();

  // 5-1) 採用された応募を accepted に更新
  const { error: acceptError } = await supabase
    .from("entries")
    .update({ status: "accepted" })
    .eq("id", entryId);

  if (acceptError) {
    console.error("assign accept entry error:", acceptError);
    return NextResponse.json(
      { error: "応募の採用処理に失敗しました。" },
      { status: 500 }
    );
  }

  // 5-2) その他の応募を rejected に更新（withdrawn はそのまま）
  const { error: rejectError } = await supabase
    .from("entries")
    .update({ status: "rejected" })
    .eq("retouch_job_id", retouchJobId)
    .neq("id", entryId)
    .neq("status", "withdrawn");

  if (rejectError) {
    console.error("assign reject other entries error:", rejectError);
  }

  // 5-3) retouch_jobs を closed に更新
  const { error: retouchUpdateError } = await supabase
    .from("retouch_jobs")
    .update({
      status: "closed",
      updated_at: nowIso,
    })
    .eq("id", retouchJobId);

  if (retouchUpdateError) {
    console.error("assign retouch_job update error:", retouchUpdateError);
    return NextResponse.json(
      { error: "依頼ステータスの更新に失敗しました。" },
      { status: 500 }
    );
  }

  // 5-4) jobs に契約レコード作成
  const { data: insertedJobs, error: insertJobError } = await supabase
    .from("jobs")
    .insert({
      retouch_job_id: retouchJobId,
      owner_id: retouchJob.owner_id,
      retoucher_id: entry.applicant_id,
      title: retouchJob.title,
      description: retouchJob.description,
      base_image_path: retouchJob.base_image_path,
      total_pins: retouchJob.total_pins,
      total_price_coins: retouchJob.total_price_coins,
      status: "active",
      started_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (insertJobError || !insertedJobs) {
    console.error("assign jobs insert error:", insertJobError);
    return NextResponse.json(
      { error: "契約情報の作成に失敗しました。" },
      { status: 500 }
    );
  }

  // ---- 6) 正常終了 ----
  return NextResponse.json({
    ok: true,
    retouchJobId,
    jobId: insertedJobs.id,
    applicantId: entry.applicant_id,
  });
}
