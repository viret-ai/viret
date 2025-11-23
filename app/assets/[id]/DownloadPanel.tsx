// =====================================
// app/assets/[id]/DownloadPanel.tsx
// DLパネル（Small/HD/Original＋広告視聴テスト）
// Card / Button / タイポ整理版
// =====================================

"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";

type Props = {
  assetId: string;
  originalUrlExists: boolean;
  originalWidth?: number | null;
  originalHeight?: number | null;
  title?: string | null;
};

type SizeOption = "sm" | "hd" | "original";
type FormatOption = "jpg" | "png" | "webp";

const FORMAT_LABELS: Record<FormatOption, string> = {
  jpg: "JPG",
  png: "PNG",
  webp: "WebP",
};

function calcResizedSize(
  w: number,
  h: number,
  targetShortEdge: number,
): { w: number; h: number } {
  const short = Math.min(w, h);
  const scale = targetShortEdge / short;
  return {
    w: Math.round(w * scale),
    h: Math.round(h * scale),
  };
}

export default function DownloadPanel({
  assetId,
  originalUrlExists,
  originalWidth,
  originalHeight,
  title,
}: Props) {
  const [format, setFormat] = useState<FormatOption>("jpg");
  const [smallUnlocked, setSmallUnlocked] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);

  const disabled = !originalUrlExists;

  const hasSizeInfo =
    typeof originalWidth === "number" &&
    typeof originalHeight === "number" &&
    originalWidth > 0 &&
    originalHeight > 0;

  const shortEdge =
    hasSizeInfo && originalWidth && originalHeight
      ? Math.min(originalWidth, originalHeight)
      : null;

  const hdAvailable = hasSizeInfo && shortEdge !== null && shortEdge >= 1080;
  const hdDisabled = disabled || !hdAvailable;

  let smallSize: { w: number; h: number } | null = null;
  let hdSize: { w: number; h: number } | null = null;

  if (hasSizeInfo) {
    smallSize = calcResizedSize(originalWidth!, originalHeight!, 720);
    if (hdAvailable) {
      hdSize = calcResizedSize(originalWidth!, originalHeight!, 1080);
    }
  }

  const originalLabel = hasSizeInfo
    ? `Original（${originalWidth}×${originalHeight}：350dpi）`
    : "Original（元サイズ：350dpi）";

  const buildDownloadHref = (size: SizeOption) => {
    const params = new URLSearchParams({
      size,
      format,
    });
    return `/api/assets/${assetId}/download?${params.toString()}`;
  };

  return (
    <>
      {/* 全体パネル */}
      <Card className="space-y-4 text-xs text-slate-700">
        {/* Title ブロック */}
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Title
          </div>
          {title && (
            <h2 className="text-sm font-semibold leading-snug text-slate-900 break-words">
              {title}
            </h2>
          )}
        </div>

        {/* Download ラベル */}
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Download
          </div>
        </div>

        {/* フォーマット選択 */}
        <div>
          <div className="mb-1 text-[11px] font-semibold text-slate-600">
            フォーマット
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FORMAT_LABELS) as FormatOption[]).map((f) => {
              const isActive = f === format;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={[
                    "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                    isActive
                      ? "border-sky-500 bg-sky-500 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:text-sky-800",
                  ].join(" ")}
                >
                  {FORMAT_LABELS[f]}
                </button>
              );
            })}
          </div>
        </div>

        {/* サイズ別ボタン */}
        <div className="space-y-3">
          {/* Small */}
          <Card
            variant="outline"
            padded
            className="border-slate-200 bg-slate-50 text-xs text-slate-700"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-800">
                  {smallSize
                    ? `Small（${smallSize.w}×${smallSize.h}：300dpi）`
                    : "Small（720px：300dpi）"}
                </div>
                <div className="text-[10px] text-emerald-600">
                  広告視聴で解放される無料サイズです
                </div>
              </div>

              {smallUnlocked ? (
                <a
                  href={buildDownloadHref("sm")}
                  onClick={(e) => {
                    if (disabled) e.preventDefault();
                  }}
                  className="mt-1 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500"
                >
                  DL｜¥0
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdModal(true)}
                  className="mt-1 inline-flex items-center justify-center rounded-full border border-emerald-500 px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  広告を見て無料DL
                </button>
              )}
            </div>
          </Card>

          {/* HD */}
          <Card variant="outline" padded className="text-xs text-slate-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-800">
                  {hdSize
                    ? `HD（${hdSize.w}×${hdSize.h}：350dpi）`
                    : "HD（1080px：350dpi）"}
                </div>
                <div className="text-[10px] text-amber-600">
                  {hdAvailable
                    ? "ポイント・サブスク向けの高解像度サイズです"
                    : "元画像の短辺が1080px未満のため、HDは利用できません"}
                </div>
              </div>

              <a
                href={buildDownloadHref("hd")}
                onClick={(e) => {
                  if (hdDisabled) e.preventDefault();
                }}
                className={[
                  "mt-1 inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold",
                  hdDisabled
                    ? "cursor-not-allowed bg-slate-300 text-slate-500"
                    : "bg-slate-700 text-white hover:bg-slate-600",
                ].join(" ")}
              >
                {hdAvailable ? "DL｜¥100" : "HD非対応"}
              </a>
            </div>
          </Card>

          {/* Original */}
          <Card variant="outline" padded className="text-xs text-slate-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-800">
                  {originalLabel}
                </div>
                <div className="text-[10px] text-amber-600">
                  元サイズデータ（350dpi 推奨）
                </div>
              </div>

              <a
                href={buildDownloadHref("original")}
                onClick={(e) => {
                  if (disabled) e.preventDefault();
                }}
                className="mt-1 inline-flex items-center justify-center rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
              >
                DL｜¥200
              </a>
            </div>
          </Card>
        </div>
      </Card>

      {showAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <AdWatchModal
            onClose={() => setShowAdModal(false)}
            onComplete={() => {
              setSmallUnlocked(true);
              setShowAdModal(false);
            }}
          />
        </div>
      )}
    </>
  );
}

function AdWatchModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const [seconds, setSeconds] = useState(5);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (seconds <= 0) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <Card className="w-full max-w-sm text-xs text-slate-700">
      <div className="text-sm font-semibold text-slate-900">
        広告視聴（テスト）
      </div>

      <p className="mt-2 leading-relaxed">
        {!done ? (
          <>
            実際の広告は 5〜10秒ほどの動画になります。{" "}
            <span className="font-bold">{seconds}秒</span>
            経過すると視聴完了になります。
          </>
        ) : (
          <>視聴完了しました。Smallサイズの無料DLが解放されます。</>
        )}
      </p>

      <div className="mt-4 flex justify-end gap-2">
        {!done && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
          >
            やめる
          </button>
        )}

        <button
          type="button"
          disabled={!done}
          onClick={onComplete}
          className={[
            "rounded-full px-3 py-1 text-[11px] text-white",
            done
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "cursor-not-allowed bg-slate-300",
          ].join(" ")}
        >
          {done ? "視聴完了" : `視聴中… ${seconds}`}
        </button>
      </div>
    </Card>
  );
}
