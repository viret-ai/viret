// =====================================
// app/assets/AssetsGrid.tsx
// 素材一覧グリッド（クライアント・スクロール位置保持）
// =====================================

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { typography } from "@/lib/theme";

type AssetItem = {
  id: string;
  title: string;
  imageUrl: string;
};

type Props = {
  items: AssetItem[];
};

const SCROLL_KEY = "viret-assets-scroll";

export default function AssetsGrid({ items }: Props) {
  // スクロール保存＆復元
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SCROLL_KEY);
      if (saved) {
        const y = parseInt(saved, 10);
        if (!Number.isNaN(y)) window.scrollTo(0, y);
      }

      const handleBeforeUnload = () => {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    } catch {}
  }, []);

  if (items.length === 0) {
    return (
      <div className="mt-16 text-center">
        <p className={typography("body") + " opacity-60"}>
          まだ素材がありません。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/assets/${item.id}`}
          className="
            group relative flex-none
            h-40 sm:h-44 md:h-52 lg:h-56
            bg-slate-100 dark:bg-slate-800
            overflow-hidden rounded-md
          "
        >
          <img
            src={item.imageUrl}
            alt={item.title}
            className="
              h-full w-auto max-w-none
              object-contain
              transition-transform duration-300
              group-hover:scale-[1.03]
            "
          />

          <div
            className="
              pointer-events-none
              absolute inset-x-0 bottom-0
              flex items-end
              bg-gradient-to-t from-black/70 via-black/30 to-transparent
              px-2 pb-1.5 pt-8
              opacity-0
              transition-opacity duration-200
              group-hover:opacity-100
            "
          >
            <span
              className="
                line-clamp-2 text-[11px] font-semibold text-white drop-shadow
              "
            >
              {item.title}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
