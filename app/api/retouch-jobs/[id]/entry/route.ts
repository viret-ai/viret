// =====================================
// app/api/retouch-jobs/[id]/entry/route.ts
// ワンクリック応募API
// - entries にレコードを追加
// - 同じ job_id + retoucher_id は複数回追加しない（冪等）
// =====================================

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteParams) {
  const { id: jobId } = await params;
  const supabase = await supabaseServer();

  // 認証ユーザー（応募者）
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const retoucherId = user.id;

  // --- すでに応募しているかチェック ---
  const { data: exists } = await supabase
    .from("entries")
    .select("id")
    .eq("job_id", jobId)
    .eq("retoucher_id", retoucherId)
    .maybeSingle();

  if (exists) {
    return NextResponse.redirect(`/retouch-jobs/${jobId}`, 303);
  }

  // --- 新規応募 ---
  const { error } = await supabase.from("entries").insert({
    job_id: jobId,
    retoucher_id: retoucherId,
    status: "pending",
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.redirect(`/retouch-jobs/${jobId}`, 303);
}
