// =====================================
// app/api/auth/callback/route.ts
// ログイン後に profile 自動生成
// - 初回ログイン時に profiles レコードを作成
// - role はいまは buyer（将来 onboarding で変更予定）
// =====================================

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { DEFAULT_ROLE } from "@/lib/roles";

export async function GET() {
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return NextResponse.redirect("/login");
  }

  // profiles に存在するか確認
  const { data: p } = await supabaseServer
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!p) {
    // なければ作る
    await supabaseServer.from("profiles").insert({
      id: user.id,
      role: DEFAULT_ROLE, // ← いまは "buyer" 固定。後で onboarding で generatist / retoucher 等に変更。
      display_name: user.email,
    });
  }

  return NextResponse.redirect("/dashboard");
}
