// =====================================
// lib/contracts/actions.ts
// 取引ルーム操作（Server Actions）
// - 納品（履歴＋systemメッセージ）
// - 修正依頼（無料）
// - 追加対応（有料pending：job_paid_actions + systemメッセージ）
// - 受取確認（systemメッセージ + jobs.status=completed）
// - 運営相談（job_support_tickets）
// - 納品ファイルアップロード（Supabase Storage）
// =====================================

"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

type Result = { ok: true } | { ok: false; error: string };
type ResultWith<T> = { ok: true; data: T } | { ok: false; error: string };

// v1: 納品ファイルの保存先バケット
// - Viret 既定：jobs / portfolio がある前提
const DELIVERY_BUCKET = "jobs";

// v1: できるだけ衝突しないパスを作る
function getExtFromFileName(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "bin";
  const ext = name.slice(idx + 1).toLowerCase();
  return ext || "bin";
}

// // delivered_ext 確定：file_path から拡張子（"."無し・小文字）を抽出
function normalizeExtFromPath(filePath: string): string | null {
  const base = (filePath ?? "").trim();
  const lastDot = base.lastIndexOf(".");
  if (lastDot <= 0) return null;

  const ext = base.slice(lastDot + 1).trim().toLowerCase();
  if (!ext) return null;

  // // DBのCHKと合わせる：英数字のみ、1〜10
  if (!/^[a-z0-9]{1,10}$/.test(ext)) return null;
  return ext;
}

// // required_ext 比較用（"."除去・小文字）
function normalizeExtLoose(ext: string | null | undefined): string | null {
  if (!ext) return null;
  const v = ext.trim().replace(/^\./, "").toLowerCase();
  if (!v) return null;
  return v;
}

export async function uploadDeliveryFile(args: {
  jobId: string;
  ownerId: string;
  version: number;
  file: File;
}): Promise<ResultWith<{ path: string; contentType: string | null }>> {
  const supabase = await supabaseServer();

  // v1: ownerId/jobId/version で場所を固定しつつ、タイムスタンプで衝突回避
  const ext = getExtFromFileName(args.file.name);
  const stamp = Date.now();
  const path = `${args.ownerId}/${args.jobId}/deliveries/v${args.version}_${stamp}.${ext}`;

  const contentType = args.file.type || null;

  const up = await supabase.storage
    .from(DELIVERY_BUCKET)
    .upload(path, args.file, {
      upsert: false,
      contentType: contentType ?? undefined,
      cacheControl: "3600",
    });

  if (up.error) return { ok: false, error: up.error.message };

  return { ok: true, data: { path, contentType } };
}

export async function postDelivery(args: {
  jobId: string;
  retoucherId: string;
  version: number;
  filePath: string;
  note: string;

  // // v1.1: 追加ログ（呼び出し側が渡せる場合だけ入る。未対応でも壊さない）
  mimeType?: string | null;
  deliveredExt?: string | null;
}): Promise<Result> {
  const supabase = await supabaseServer();

  // ---- 0) required_ext を確認（あるなら一致必須） ----
  const jobRes = await supabase
    .from("jobs")
    .select("id, required_ext")
    .eq("id", args.jobId)
    .maybeSingle<{ id: string; required_ext: string | null }>();

  if (jobRes.error) return { ok: false, error: jobRes.error.message };
  if (!jobRes.data) return { ok: false, error: "契約ジョブが見つかりません。" };

  const requiredExt = normalizeExtLoose(jobRes.data.required_ext);
  const deliveredExt =
    normalizeExtLoose(args.deliveredExt ?? null) ??
    normalizeExtFromPath(args.filePath);

  if (requiredExt && deliveredExt !== requiredExt) {
    return {
      ok: false,
      error: `拡張子が一致しません（必須: ${requiredExt} / 今回: ${
        deliveredExt ?? "不明"
      }）`,
    };
  }

  // 1) 納品履歴
  const ins = await supabase.from("job_deliveries").insert({
    job_id: args.jobId,
    uploader_id: args.retoucherId,
    version: args.version,
    file_path: args.filePath,
    note: args.note || null,

    // // 追加カラム（今回）
    delivered_ext: deliveredExt,
    mime_type: args.mimeType ?? null,
  });

  if (ins.error) return { ok: false, error: ins.error.message };

  // 2) 納品コメント（自由入力）をチャットへ
  if (args.note?.trim()) {
    const m1 = await supabase.from("job_messages").insert({
      job_id: args.jobId,
      sender_id: args.retoucherId,
      kind: "delivery_note",
      body: args.note.trim(),
      meta: { deliveryVersion: args.version },
      risk_flags: [],
    });

    if (m1.error) return { ok: false, error: m1.error.message };
  }

  // 3) system
  const m2 = await supabase.from("job_messages").insert({
    job_id: args.jobId,
    sender_id: args.retoucherId,
    kind: "system",
    template_key: "delivered",
    body: null,
    meta: { deliveryVersion: args.version },
    risk_flags: [],
  });

  if (m2.error) return { ok: false, error: m2.error.message };

  // 4) 有料追加対応 pending があれば、今回の納品で settled にできる（v1：直近pending1件を確定）
  // 厳密にやるなら「どの追加対応に対する納品か」を紐付けるUIが必要だが、v1は最小でOK
  const pending = await supabase
    .from("job_paid_actions")
    .select("id")
    .eq("job_id", args.jobId)
    .eq("kind", "paid_revision")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!pending.error && pending.data && pending.data.length > 0) {
    const paidId = pending.data[0].id;

    // ※ update は RLS で閉じている想定。ここは server (service role) でのみ更新したい場合は別の supabase クライアントが必要。
    // いったん v1 は「確定処理は後で」でも成立するので、ここはコメントアウト運用でもOK。
    // const upd = await supabase.from("job_paid_actions").update({
    //   status: "settled",
    //   delivery_id: null, // 紐付けるなら納品IDを取って入れる
    //   decided_at: new Date().toISOString(),
    // }).eq("id", paidId);
    // if (upd.error) return { ok: false, error: upd.error.message };
    void paidId;
  }

  revalidatePath(`/dashboard/contracts/${args.jobId}`);
  return { ok: true };
}

export async function requestRevision(args: {
  jobId: string;
  ownerId: string;
  body: string;
  revisionCountNext: number;
  remainingFreeNext: number;
}): Promise<Result> {
  const supabase = await supabaseServer();

  // 自由入力
  const m1 = await supabase.from("job_messages").insert({
    job_id: args.jobId,
    sender_id: args.ownerId,
    kind: "revision_note",
    body: args.body,
    meta: {
      revisionCount: args.revisionCountNext,
      isFree: true,
      remainingFreeAfter: args.remainingFreeNext,
    },
    risk_flags: [],
  });

  if (m1.error) return { ok: false, error: m1.error.message };

  // system
  const m2 = await supabase.from("job_messages").insert({
    job_id: args.jobId,
    sender_id: args.ownerId,
    kind: "system",
    template_key: "revision_requested",
    body: null,
    meta: { revisionCount: args.revisionCountNext, isFree: true },
    risk_flags: [],
  });

  if (m2.error) return { ok: false, error: m2.error.message };

  revalidatePath(`/dashboard/contracts/${args.jobId}`);
  return { ok: true };
}

export async function requestPaidRevision(args: {
  jobId: string;
  ownerId: string;
  retoucherId: string;
  body: string;
  coins: number;
  revisionCountNext: number;
}): Promise<Result> {
  const supabase = await supabaseServer();

  // 自由入力（追加対応コメント）
  const m1 = await supabase.from("job_messages").insert({
    job_id: args.jobId,
    sender_id: args.ownerId,
    kind: "revision_note",
    body: args.body,
    meta: {
      revisionCount: args.revisionCountNext,
      isFree: false,
      costCoins: args.coins,
    },
    risk_flags: ["paid_revision"],
  });

  if (m1.error) return { ok: false, error: m1.error.message };

  // pending コイン確保
  const p1 = await supabase.from("job_paid_actions").insert({
    job_id: args.jobId,
    kind: "paid_revision",
    status: "pending",
    coins: args.coins,
    payer_id: args.ownerId,
    payee_id: args.retoucherId,
    message_id: null,
    delivery_id: null,
  });

  if (p1.error) return { ok: false, error: p1.error.message };

  // system
  const m2 = await supabase.from("job_messages").insert({
    job_id: args.jobId,
    sender_id: args.ownerId,
    kind: "system",
    template_key: "paid_revision_requested",
    body: null,
    meta: { revisionCount: args.revisionCountNext, costCoins: args.coins },
    risk_flags: ["paid_revision"],
  });

  if (m2.error) return { ok: false, error: m2.error.message };

  revalidatePath(`/dashboard/contracts/${args.jobId}`);
  return { ok: true };
}

export async function acceptDelivery(args: {
  jobId: string;
  ownerId: string;
  deliveryId: string;
}): Promise<Result> {
  const supabase = await supabaseServer();

  // 1) system：受取確認
  const m1 = await supabase.from("job_messages").insert({
    job_id: args.jobId,
    sender_id: args.ownerId,
    kind: "system",
    template_key: "accepted",
    body: null,
    meta: { deliveryId: args.deliveryId },
    risk_flags: [],
  });

  if (m1.error) return { ok: false, error: m1.error.message };

  // 2) jobs.status = completed（enum確定：pending/active/completed/cancelled）
  const upd = await supabase
    .from("jobs")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", args.jobId)
    .eq("owner_id", args.ownerId);

  if (upd.error) return { ok: false, error: upd.error.message };

  revalidatePath(`/dashboard/contracts/${args.jobId}`);
  return { ok: true };
}

export async function openSupportTicket(args: {
  jobId: string;
  reporterId: string;
  reason:
    | "out_of_scope_request"
    | "too_many_revisions"
    | "counterparty_inactive"
    | "delivery_mismatch"
    | "other";
  details: string;
}): Promise<Result> {
  const supabase = await supabaseServer();

  const ins = await supabase.from("job_support_tickets").insert({
    job_id: args.jobId,
    reporter_id: args.reporterId,
    reason: args.reason,
    details: args.details?.trim() || null,
  });

  if (ins.error) return { ok: false, error: ins.error.message };

  // system にも残す（当事者間で「相談を送った」ことが見える）
  const m1 = await supabase.from("job_messages").insert({
    job_id: args.jobId,
    sender_id: args.reporterId,
    kind: "system",
    template_key: "support_ticket_created",
    body: null,
    meta: { reason: args.reason },
    risk_flags: ["admin_review"],
  });

  if (m1.error) return { ok: false, error: m1.error.message };

  revalidatePath(`/dashboard/contracts/${args.jobId}`);
  return { ok: true };
}
