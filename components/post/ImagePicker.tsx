// =====================================
// components/post/ImagePicker.tsx
// 短辺720未満ならアップロード前に警告してキャンセル
// =====================================

"use client";

import { useState } from "react";

type Props = {
  onValidFileSelected: (file: File) => void;
};

export default function ImagePicker({ onValidFileSelected }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // 画像の naturalWidth / naturalHeight をブラウザ側で取得
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);

      const shortEdge = Math.min(width, height);

      if (shortEdge < 720) {
        setError(
          `この画像は ${width} x ${height}px（短辺${shortEdge}px）で、短辺720pxに満たないためアップロードできません。`
        );
        // サーバーには投げない
        return;
      }

      onValidFileSelected(file);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("画像を読み込めませんでした。別のファイルを試してください。");
    };

    img.src = url;
  };

  return (
    <div className="space-y-1">
      <input type="file" accept="image/*" onChange={handleChange} />
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
