// =====================================
// app/post/page.tsx
// 素材アップロードページ（AI画像投稿）
// =====================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
      });

      if (insertError) {
        setMsg("DB登録に失敗しました：" + insertError.message);
        setLoading(false);
        return;
      }

      setMsg("素材を登録しました。");
      router.push("/assets");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-xl font-bold mb-6">素材を投稿する</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            画像ファイル
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            タイトル
          </label>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="作品タイトル"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            説明
          </label>
          <textarea
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="どのような画像か、利用イメージなど"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            タグ（カンマ区切り）
          </label>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="portrait, city, cyberpunk など"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {loading ? "アップロード中..." : "投稿する"}
        </button>

        {msg && <p className="mt-2 text-sm text-slate-700">{msg}</p>}
      </form>
    </main>
  );
}
