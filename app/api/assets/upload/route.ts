// =====================================
// app/api/assets/upload/route.ts
// アセットアップロードAPI
// - 画像の width / height を sharp で取得して DB に保存
// - 短辺720px未満はアップロード不可
// =====================================

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase-server";

// sharp を使うので Node ランタイム強制
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "画像ファイルが見つかりませんでした。" },
        { status: 400 }
      );
    }

    // ================================
    // 1) 画像の width / height を取得
    // ================================
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const meta = await sharp(inputBuffer).metadata();

    const width = meta.width ?? null;
    const height = meta.height ?? null;

    if (!width || !height) {
      return NextResponse.json(
        { error: "画像サイズを取得できませんでした。" },
        { status: 400 }
      );
    }

    const shortEdge = Math.min(width, height);

    // ================================
    // 2) 短辺720未満ならアップロード拒否
    // ================================
    if (shortEdge < 720) {
      return NextResponse.json(
        {
          error:
            "この画像は短辺720pxに満たないため、Viretでは登録できません。",
          detail: `detected size: ${width} x ${height}px`,
        },
        { status: 400 }
      );
    }

    // ================================
    // 3) Storage に保存（assets バケット想定）
    // ================================
    const extFromType = file.type.split("/")[1] || "jpg";
    const fileExt =
      extFromType === "jpeg" ? "jpg" : ["png", "webp"].includes(extFromType)
      ? extFromType
      : "jpg";

    const now = Date.now();
    const fileName = `${now}-${crypto.randomUUID()}.${fileExt}`;
    const storagePath = fileName; // 必要なら "ownerId/xxx" などにしてOK

    const { error: uploadError } = await supabaseServer.storage
      .from("assets")
      .upload(storagePath, inputBuffer, {
        contentType: file.type || `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError);
      return NextResponse.json(
        { error: "Storageへのアップロードに失敗しました。" },
        { status: 500 }
      );
    }

    // ================================
    // 4) DB: assets にレコード登録
    //    width / height も一緒に保存
    // ================================
    const title = formData.get("title")?.toString() ?? null;
    const ownerId = formData.get("ownerId")?.toString() ?? null;

    const { data, error: insertError } = await supabaseServer
      .from("assets")
      .insert({
        // ★ ここは Void の実スキーマに合わせて調整してね
        title,
        owner_id: ownerId,
        original_path: storagePath,
        preview_path: storagePath, // ひとまず同じ。後でプレビュー別生成でもOK
        width,
        height,
      })
      .select("id, width, height")
      .single();

    if (insertError || !data) {
      console.error(insertError);
      return NextResponse.json(
        { error: "assets テーブルへの登録に失敗しました。" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: data.id,
        width: data.width,
        height: data.height,
        message: "アップロードが完了しました。",
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("upload error", e);
    return NextResponse.json(
      { error: "アップロード処理でエラーが発生しました。" },
      { status: 500 }
    );
  }
}
