// =====================================
// app/post/page.tsx
// 素材アップロードページ（AI画像投稿）
// テーマ連動＋中央寄せ＋ドラッグ＆ドロップアップロード版
// + C2PA(Content Credentials) の軽量検出 → asset_checks に保存（最小AIチェッカー）
// =====================================

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";

// 画像ファイルから width / height を取得するユーティリティ
const getImageSize = (
  file: File,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);
      if (!width || !height) {
        reject(new Error("画像サイズを取得できませんでした。"));
      } else {
        resolve({ width, height });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました。"));
    };
    img.src = url;
  });
};

// C2PA/Content Credentials を “あるっぽいか” だけ軽く検出する
// ※ 完全な検証ではない（署名検証などはしない）
// ※ 目的：ユーザーが「証跡ありの画像」を持ち込めたかの参考シグナル
const detectC2PALite = async (
  file: File,
): Promise<{ present: boolean; hits: string[] }> => {
  try {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);

    // 文字列検索用に軽くテキスト化（完全変換ではないけど “タグ断片” は拾える）
    // // 大きい画像でも雑に走るけど、ここは最小実装なのでOKにする
    let text = "";
    const step = 2; // // 速度優先で間引き
    for (let i = 0; i < bytes.length; i += step) {
      const c = bytes[i];
      // // ASCIIっぽい範囲だけ拾う（変な制御文字は捨てる）
      if (c >= 32 && c <= 126) text += String.fromCharCode(c);
      else text += " ";
      // // textが肥大化しすぎないように上限
      if (text.length > 2_000_000) break;
    }

    const needles = [
      "c2pa",
      "contentcredentials",
      "content credentials",
      "c2pa.assertions",
      "c2pa.manifest",
      "xmpmeta",
      "adobe:manifest",
      "urn:c2pa",
    ];

    const hits = needles.filter((n) => text.toLowerCase().includes(n));
    return { present: hits.length > 0, hits };
  } catch {
    return { present: false, hits: [] };
  }
};

export default function PostPage() {
  const router = useRouter();

  // 入力系 state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  // ファイル関連
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // メッセージ・状態
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // 隠し input をクリックするための ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 共通：ファイルが選ばれたときの処理（クリック／D&Dどちらからでも）
  const handleFileSelected = (selected: File | null) => {
    if (!selected) return;
    setMsg("");
    setFile(selected);
  };

  // input の change ハンドラ
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    handleFileSelected(f);
  };

  // ドラッグ＆ドロップ関連
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    handleFileSelected(f);
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (!file) {
      setMsg("画像ファイルを選択してください。");
      return;
    }
    if (!title.trim()) {
      setMsg("タイトルを入力してください。");
      return;
    }

    setLoading(true);

    // ログインユーザー取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMsg("ログインが必要です。");
      setLoading(false);
      return;
    }

    try {
      // 画像サイズ取得
      const { width, height } = await getImageSize(file);
      const shortEdge = Math.min(width, height);

      // 短辺720px未満はアップロード不可
      if (shortEdge < 720) {
        setMsg(
          `この画像は短辺${shortEdge}pxのため、Viretでは登録できません（最低720px以上が必要です）。検出サイズ: ${width} × ${height}px`,
        );
        setLoading(false);
        return;
      }

      // AIチェッカー（最小）：C2PAの “ある/なし” を事前に軽量検出
      setMsg("画像を検査中（C2PA確認）...");
      const c2pa = await detectC2PALite(file);

      const ext = file.name.split(".").pop() || "png";
      const assetId = crypto.randomUUID(); // assets.id と合わせる
      const path = `${user.id}/${assetId}/original.${ext}`;

      // Storage にアップロード
      setMsg("アップロード中...");
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(path, file);

      if (uploadError) {
        setMsg("アップロードに失敗しました：" + uploadError.message);
        setLoading(false);
        return;
      }

      // assets テーブルに登録
      const tagArray =
        tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0) ?? [];

      setMsg("DB登録中...");
      const { error: insertError } = await supabase.from("assets").insert({
        id: assetId,
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        tags: tagArray,
        preview_path: path,
        original_path: path,
        status: "public",
        width, // 元画像の幅
        height, // 元画像の高さ
      });

      if (insertError) {
        setMsg("DB登録に失敗しました：" + insertError.message);
        setLoading(false);
        return;
      }

      // チェック結果を保存（失敗しても投稿自体は通す：最小構成）
      // // asset_checks がまだ無い場合は SQL を先に流してから
      const status = c2pa.present ? "ok" : "review";
      const { error: checkInsertError } = await supabase
        .from("asset_checks")
        .insert({
          asset_id: assetId,
          provider: "c2pa-lite",
          status,
          score: null,
          c2pa_present: c2pa.present,
          details: {
            hits: c2pa.hits,
            note:
              "C2PAの完全検証ではなく、ファイル内の断片文字列からの軽量検出です。",
          },
        });

      // // ここは“補助機能”なので、失敗しても止めない
      if (checkInsertError) {
        console.warn("asset_checks insert failed:", checkInsertError);
      }

      setMsg(
        c2pa.present
          ? "素材を登録しました。（C2PA: あり）"
          : "素材を登録しました。（C2PA: なし / 要レビュー扱い）",
      );
      router.push("/assets");
    } catch (err: any) {
      console.error(err);
      setMsg(err?.message || "アップロード中にエラーが発生しました。");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-10">
      {/* 画面中央寄せコンテナ */}
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        <h1 className="text-xl font-bold tracking-tight text-[var(--v-text)]">
          素材を投稿する
        </h1>

        {/* フォームカード */}
        <Card as="section" className="w-full max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 画像アップロード（ドラッグ＆ドロップ＋クリック） */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                画像ファイル
              </label>

              {/* ドロップゾーン */}
              <div
                className={[
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed px-4 py-10 text-center text-sm transition-colors",
                  isDragging
                    ? "border-sky-500 bg-sky-50"
                    : "border-slate-300 bg-slate-50/60 hover:border-sky-400 hover:bg-slate-50",
                ].join(" ")}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="text-xs font-semibold text-slate-700">
                  ここに画像をドラッグ＆ドロップ
                </div>
                <div className="text-[11px] text-slate-500">
                  または <span className="font-semibold">クリックして選択</span>
                </div>

                {file && (
                  <div className="mt-3 rounded bg-white/70 px-3 py-1 text-[11px] text-slate-700">
                    選択中：{file.name}
                  </div>
                )}
              </div>

              {/* 実際の input（隠す） */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <p className="mt-1 text-[11px] text-slate-500">
                短辺720px以上の AI画像のみアップロードできます。
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                AIチェッカー（暫定）：C2PA（Content Credentials）の有無を確認して記録します。
              </p>
            </div>

            {/* タイトル */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                タイトル
              </label>
              <input
                className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="作品タイトル"
              />
            </div>

            {/* 説明 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                説明
              </label>
              <textarea
                className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="どのような画像か、利用イメージなど"
              />
            </div>

            {/* タグ */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                タグ（カンマ区切り）
              </label>
              <input
                className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="portrait, city, cyberpunk など"
              />
            </div>

            {/* 送信ボタン */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center rounded-sm bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
              >
                {loading ? "処理中..." : "投稿する"}
              </button>
            </div>

            {msg && (
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                {msg}
              </p>
            )}
          </form>
        </Card>
      </div>
    </main>
  );
}
