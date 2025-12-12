// =====================================
// app/api/account/avatar/reset/route.ts
// アバター初期化 API
// - avatars/{userId}/ 配下ファイルを全削除
// - profiles.avatar_url を null に更新
// =====================================

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // ---- 認証 ----
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("avatar reset auth error:", authError);
    return NextResponse.json(
      { error: "ログイン情報を取得できませんでした。" },
      { status: 401 }
    );
  }

  const userPrefix = user.id;

  // ---- avatars/{userId}/ 配下を列挙して削除 ----
  const pathsToDelete: string[] = [];
  let offset = 0;
  const limit = 100;

  for (;;) {
    const { data: files, error: listError } = await supabase.storage
      .from("avatars")
      .list(userPrefix, { limit, offset });

    if (listError) {
      console.error("avatar reset list error:", listError);
      break;
    }

    if (!files || files.length === 0) break;

    for (const f of files) {
      if (f.name) {
        pathsToDelete.push(`${userPrefix}/${f.name}`);
      }
    }

    if (files.length < limit) break;
    offset += limit;
  }

  if (pathsToDelete.length > 0) {
    const { error: removeError } = await supabase.storage
      .from("avatars")
      .remove(pathsToDelete);

    if (removeError) {
      console.error("avatar reset remove error:", removeError);
      // ここでこけても、DB側だけは null にしておく
    }
  }

  // ---- profiles.avatar_url を null に更新 ----
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (updateError) {
    console.error("avatar reset profile update error:", updateError);
    return NextResponse.json(
      { error: "プロフィール情報のリセットに失敗しました。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
