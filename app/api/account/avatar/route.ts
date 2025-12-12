// =====================================
// app/api/account/avatar/route.ts
// アバター画像アップロード API（毎回ユニークなURLを発行）
// - フロントから multipart/form-data(file) を受け取る
// - avatars/{userId}/{timestamp}.{ext} に保存（古い画像は残す）
// - publicUrl を profiles.avatar_url に保存
// - { avatarUrl } を JSON で返す
// =====================================

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // ---- 認証チェック ----
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("avatar upload auth error:", authError);
    return NextResponse.json(
      { error: "ログイン情報を取得できませんでした。" },
      { status: 401 }
    );
  }

  // ---- フォームデータからファイル取得 ----
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "ファイルが送信されていません。" },
      { status: 400 }
    );
  }

  // サイズと MIME 簡易チェック
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "ファイルサイズが大きすぎます。（最大 5MB まで）" },
      { status: 400 }
    );
  }

  const mime = file.type || "image/png";
  if (
    mime !== "image/png" &&
    mime !== "image/jpeg" &&
    mime !== "image/jpg" &&
    mime !== "image/webp"
  ) {
    return NextResponse.json(
      { error: "PNG / JPEG / WebP 形式の画像のみアップロードできます。" },
      { status: 400 }
    );
  }

  // 拡張子
  let ext = "png";
  if (mime === "image/jpeg" || mime === "image/jpg") ext = "jpg";
  if (mime === "image/webp") ext = "webp";

  // ---- Supabase Storage にアップロード ----
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileName = `${Date.now()}.${ext}`;
  const storagePath = `${user.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars") // バケット名（Voidの設定に合わせてる）
    .upload(storagePath, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    console.error("avatar upload error:", uploadError);
    return NextResponse.json(
      { error: "画像のアップロードに失敗しました。" },
      { status: 500 }
    );
  }

  // public URL を取得
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(storagePath);

  // ---- profiles.avatar_url を更新 ----
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    console.error("avatar profile update error:", updateError);
    return NextResponse.json(
      { error: "プロフィール情報の更新に失敗しました。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ avatarUrl: publicUrl });
}
