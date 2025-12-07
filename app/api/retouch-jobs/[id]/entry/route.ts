// =====================================
// app/api/retouch-jobs/[id]/entry/route.ts
// 修正版：auth-helpers撤廃 / supabase-serverに統一
// =====================================

import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { supabaseServer } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>; // Next16: params は Promise
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // ★ サーバー用 Supabase クライアント（Cookie完全対応）
  const supabase = await supabaseServer();

  // ---- ログインユーザー取得 ----
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // 未ログイン → /login へ
  if (authError || !user) {
    const loginUrl = new URL(
      `/login?next=${encodeURIComponent(`/retouch-jobs/${id}`)}`,
      req.url,
    );
    return NextResponse.redirect(loginUrl);
  }

  // ---- entries に応募 ----
  const { error: insertError } = await supabase.from("entries").insert({
    retouch_job_id: id,
    applicant_id: user.id,
    status: "applied",
  });

  // すでに応募済み（23505）は成功扱い
  if (insertError && (insertError as any).code !== "23505") {
    return NextResponse.json(
      { error: "insert_failed", detail: insertError.message },
      { status: 400 },
    );
  }

  // 成功 → 元の依頼ページへ
  const redirectUrl = new URL(`/retouch-jobs/${id}?applied=1`, req.url);
  return NextResponse.redirect(redirectUrl);
}
