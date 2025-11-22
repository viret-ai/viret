// =====================================
// app/post/page.tsx
// 素材アップロードページ（AI画像投稿）
// テーマ連動＋Card レイアウト版
// =====================================

"use client";

import { useState } from "react";
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

export default function PostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // ファイル選択時の処理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
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

      const ext = file.name.split(".").pop() || "png";
      const assetId = crypto.randomUUID(); // assets.id と合わせる
      const path = `${user.id}/${assetId}/original.${ext}`;

      // Storage にアップロード
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

      setMsg("素材を登録しました。");
      router.push("/assets");
    } catch (err: any) {
      console.error(err);
      setMsg(err?.message || "アップロード中にエラーが発生しました。");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight text-[var(--v-text)]">
          素材を投稿する
        </h1>

        <Card as="section" className="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                画像ファイル
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-[var(--v-text)]"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                短辺720px以上の AI画像のみアップロードできます。
              </p>
            </div>

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

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center rounded-sm bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
              >
                {loading ? "アップロード中..." : "投稿する"}
              </button>
            </div>

            {msg && (
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">
                {msg}
              </p>
            )}
          </form>
        </Card>
      </div>
    </main>
  );
}
