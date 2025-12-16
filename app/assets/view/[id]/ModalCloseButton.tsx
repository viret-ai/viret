// =====================================
// app/assets/view/[id]/ModalCloseButton.tsx
// モーダルを閉じるだけの client コンポーネント
// =====================================

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ModalCloseButton() {
  const router = useRouter();

  // ESC キー対応
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.back();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="
        absolute right-3 top-3
        text-sm opacity-60
        hover:opacity-100
      "
      aria-label="閉じる"
    >
      ✕
    </button>
  );
}
