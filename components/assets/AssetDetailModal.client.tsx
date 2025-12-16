// =====================================
// components/assets/AssetDetailModal.client.tsx
// Pinterest風モーダル（安定版）
// - /assets?view=<id> を前提に「view を消す」ことで閉じる
// - ESC / 背景クリックで閉じる
// - モーダル中は body overflow hidden
// =====================================

"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  title: string;
  children: React.ReactNode;
};

export default function AssetDetailModal({ title, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const close = () => {
    const params = new URLSearchParams(sp.toString());
    params.delete("view");

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  useLayoutEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-3 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-[1100px] bg-[var(--v-bg)] text-[var(--v-text)] border border-black/10 dark:border-white/10 rounded-none shadow-xl">
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 px-4 py-3">
          <div className="text-sm font-semibold line-clamp-1">{title}</div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={close}
            aria-label="閉じる"
            className="border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            ×
          </button>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
