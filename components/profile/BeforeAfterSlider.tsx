// =====================================
// components/BeforeAfterSlider.tsx
// ビフォーアフター画像スライダーコンポーネント
// - before / after の2枚の画像をスライド比較
// - range入力＋ドラッグ操作に対応
// - ポートフォリオ用の汎用コンポーネント
// =====================================

"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import clsx from "clsx";

type BeforeAfterSliderProps = {
  beforeSrc: string; // ビフォー画像のパス
  afterSrc: string; // アフター画像のパス
  beforeAlt?: string; // ビフォーの代替テキスト
  afterAlt?: string; // アフターの代替テキスト
  initialPosition?: number; // 初期スライダー位置（0〜100）
  className?: string; // 外枠の追加クラス
  showLabels?: boolean; // 角に BEFORE / AFTER ラベルを表示するか
};

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = "Before",
  afterAlt = "After",
  initialPosition = 50,
  className,
  showLabels = true,
}: BeforeAfterSliderProps) {
  // スライダー位置（0〜100）
  const [position, setPosition] = useState(() => {
    const v = Number(initialPosition);
    if (Number.isNaN(v)) return 50;
    return Math.min(100, Math.max(0, v));
  });

  // ドラッグ操作用の参照
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  // range入力からの変更
  const handleRangeChange = (value: string) => {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    setPosition(Math.min(100, Math.max(0, num)));
  };

  // コンテナ内でのマウス座標から位置を計算
  const updatePositionFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const ratio = (clientX - rect.left) / rect.width;
    const clamped = Math.min(1, Math.max(0, ratio));
    setPosition(clamped * 100);
  }, []);

  // ドラッグ開始
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    draggingRef.current = true;

    if ("touches" in e) {
      const touch = e.touches[0];
      updatePositionFromClientX(touch.clientX);
    } else {
      updatePositionFromClientX(e.clientX);
    }
  };

  // ドラッグ中
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingRef.current) return;

    if ("touches" in e) {
      const touch = e.touches[0];
      updatePositionFromClientX(touch.clientX);
    } else {
      updatePositionFromClientX(e.clientX);
    }
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    draggingRef.current = false;
  };

  // キーボード操作（← → で微調整）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPosition((prev) => Math.max(0, prev - 2));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPosition((prev) => Math.min(100, prev + 2));
    }
  };

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      {/* 画像部分 */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-md border bg-neutral-950/5 aspect-[4/3] select-none"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* BEFORE（下） */}
        <Image
          src={beforeSrc}
          alt={beforeAlt}
          fill
          className="object-cover pointer-events-none"
          sizes="(min-width: 1024px) 480px, 100vw"
        />

        {/* AFTER（上・クリップ） */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: `${position}%` }}
        >
          <Image
            src={afterSrc}
            alt={afterAlt}
            fill
            className="object-cover pointer-events-none"
            sizes="(min-width: 1024px) 480px, 100vw"
          />
        </div>

        {/* BEFORE / AFTER ラベル */}
        {showLabels && (
          <>
            <span className="absolute left-2 top-2 text-[11px] px-2 py-0.5 rounded-full bg-black/60 text-white tracking-wide">
              BEFORE
            </span>
            <span className="absolute right-2 top-2 text-[11px] px-2 py-0.5 rounded-full bg-black/60 text-white tracking-wide">
              AFTER
            </span>
          </>
        )}

        {/* 仕切りバー＋ハンドル */}
        <div
          className="absolute inset-y-0"
          style={{ left: `${position}%` }}
        >
          {/* 縦バー */}
          <div className="absolute top-0 bottom-0 w-px -translate-x-1/2 bg-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.3)]" />

          {/* ハンドルボタン */}
          <button
            type="button"
            aria-label="ビフォーアフターの比較位置を調整"
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-9 w-9 rounded-full border border-white/70 bg-black/70 flex items-center justify-center shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 focus-visible:ring-white"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onKeyDown={handleKeyDown}
          >
            <span className="sr-only">スライダー</span>
            {/* ← → アイコン的な矢印 */}
            <span className="flex items-center gap-1 text-xs text-white">
              <span aria-hidden>◀</span>
              <span aria-hidden>▶</span>
            </span>
          </button>
        </div>
      </div>

      {/* range スライダー（マウスでも指でも調整しやすいように別途用意） */}
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => handleRangeChange(e.target.value)}
        className="w-full cursor-pointer accent-neutral-800"
        aria-label="ビフォーアフターの比較位置"
      />
    </div>
  );
}
