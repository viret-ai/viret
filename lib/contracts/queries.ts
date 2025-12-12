// =====================================
// lib/contracts/queries.ts
// 取引ルーム用の読み取りクエリ（Server）
// - jobs / job_messages / job_deliveries / job_paid_actions / job_support_tickets をまとめて取得
// =====================================

import type { SupabaseClient } from "@supabase/supabase-js";

export type JobRow = {
  id: string;
  retouch_job_id: string | null;
  owner_id: string;
  retoucher_id: string;
  status: string;
  title: string | null;
  description: string | null;
  base_image_path: string | null;
  total_pins: number | null;
  total_price_coins: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type JobMessageRow = {
  id: string;
  job_id: string;
  sender_id: string;
  kind: "system" | "delivery_note" | "revision_note";
  template_key: string | null;
  body: string | null;
  meta: any;
  risk_flags: string[];
  created_at: string;
};

export type JobDeliveryRow = {
  id: string;
  job_id: string;
  uploader_id: string;
  version: number;
  file_path: string;
  note: string | null;
  created_at: string;
};

export type JobPaidActionRow = {
  id: string;
  job_id: string;
  kind: "paid_revision";
  status: "pending" | "settled" | "refunded";
  coins: number;
  payer_id: string;
  payee_id: string;
  message_id: string | null;
  delivery_id: string | null;
  created_at: string;
  decided_at: string | null;
};

export type JobSupportTicketRow = {
  id: string;
  job_id: string;
  reporter_id: string;
  reason:
    | "out_of_scope_request"
    | "too_many_revisions"
    | "counterparty_inactive"
    | "delivery_mismatch"
    | "other";
  details: string | null;
  created_at: string;
};

export type ContractRoomBundle = {
  job: JobRow;
  messages: JobMessageRow[];
  deliveries: JobDeliveryRow[];
  paidActions: JobPaidActionRow[];
  tickets: JobSupportTicketRow[];
  // viewer が owner/retoucher のどちらか
  roleInThisJob: "owner" | "retoucher";
};

type Args = {
  supabase: SupabaseClient;
  jobId: string;
  viewerId: string;
};

export async function getContractRoomBundle(args: Args) {
  const { supabase, jobId, viewerId } = args;

  const jobRes = await supabase
    .from("jobs")
    .select(
      "id, retouch_job_id, owner_id, retoucher_id, status, title, description, base_image_path, total_pins, total_price_coins, started_at, completed_at, created_at, updated_at"
    )
    .eq("id", jobId)
    .maybeSingle();

  if (!jobRes.data) return null;

  const job = jobRes.data as JobRow;

  const roleInThisJob =
    viewerId === job.owner_id
      ? "owner"
      : viewerId === job.retoucher_id
        ? "retoucher"
        : null;

  if (!roleInThisJob) return null;

  const [msgRes, delRes, paidRes, ticketRes] = await Promise.all([
    supabase
      .from("job_messages")
      .select("id, job_id, sender_id, kind, template_key, body, meta, risk_flags, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true }),
    supabase
      .from("job_deliveries")
      .select("id, job_id, uploader_id, version, file_path, note, created_at")
      .eq("job_id", jobId)
      .order("version", { ascending: false }),
    supabase
      .from("job_paid_actions")
      .select("id, job_id, kind, status, coins, payer_id, payee_id, message_id, delivery_id, created_at, decided_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false }),
    supabase
      .from("job_support_tickets")
      .select("id, job_id, reporter_id, reason, details, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    job,
    messages: (msgRes.data ?? []) as JobMessageRow[],
    deliveries: (delRes.data ?? []) as JobDeliveryRow[],
    paidActions: (paidRes.data ?? []) as JobPaidActionRow[],
    tickets: (ticketRes.data ?? []) as JobSupportTicketRow[],
    roleInThisJob,
  } satisfies ContractRoomBundle;
}
