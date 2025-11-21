// =====================================
// app/api/auth/callback/route.ts
// ログイン後に profile 自動生成
// =====================================

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

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
      role: "buyer",
      display_name: user.email,
    });
  }

  return NextResponse.redirect("/dashboard");
}
