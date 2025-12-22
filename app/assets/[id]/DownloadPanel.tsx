// =====================================
// app/assets/[id]/DownloadPanel.tsx
// DLパネル（即ダウンロード発火版）
// fetch + Blob + ダウンロード
// - 有料DLは kind=paid を付与（API側でログイン必須 + コイン減算）
// - 401 はログイン誘導モーダル
// =====================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

function calcResizedSize(w: number, h: number, targetShortEdge: number) {
  const short = Math.min(w, h);
  const scale = targetShortEdge / short;
  return {
    w: Math.round(w * scale),
    h: Math.round(h * scale),
  };
}

function isPaidSize(size: SizeOption): boolean {
  return size === "hd" || size === "original";
}

// =======================
// ★ 即DL開始する関数（ステータス別ハンドリング付き）
// =======================
async function triggerDownload(
  url: string,
  filename: string,
  onLoginRequired: () => void,
) {
  const res = await fetch(url);

  if (res.status === 401) {
    onLoginRequired();
    return;
  }

  if (res.status === 409) {
    // // コイン不足など
    alert("コインが不足しています。コイン購入ページでチャージしてください。");
    return;
  }

  if (!res.ok) {
    alert("ダウンロードに失敗しました");
    return;
  }

  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
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
  const [showLoginModal, setShowLoginModal] = useState(false);

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

  const buildDownloadUrl = (size: SizeOption) => {
    const params = new URLSearchParams({
      size,
      format,
    });

    // // 有料サイズは kind=paid（API側でログイン必須 + 課金）
    if (isPaidSize(size)) {
      params.set("kind", "paid");
    }

    return `/api/assets/${assetId}/download?${params.toString()}`;
  };

  const handleDownload = async (size: SizeOption) => {
    if (disabled) return;

    // // Smallは「広告視聴で解放」された時だけDL可能（現状の仕様）
    if (size === "sm" && !smallUnlocked) {
      setShowAdModal(true);
      return;
    }

    const url = buildDownloadUrl(size);
    const ext = format === "jpg" ? "jpg" : format;
    const filename = `${title || "asset"}-${size}.${ext}`;

    await triggerDownload(url, filename, () => setShowLoginModal(true));
  };

  return (
    <>
      <Card className="space-y-4 text-xs text-slate-700">
        {/* Title */}
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

        {/* Download */}
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Download
          </div>
        </div>

        {/* Format */}
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

        {/* サイズボタン */}
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
                <button
                  type="button"
                  onClick={() => handleDownload("sm")}
                  disabled={disabled}
                  className="mt-1 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:bg-slate-300"
                >
                  DL｜¥0
                </button>
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

              <button
                type="button"
                onClick={() => handleDownload("hd")}
                disabled={hdDisabled}
                className={[
                  "mt-1 inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold",
                  hdDisabled
                    ? "cursor-not-allowed bg-slate-300 text-slate-500"
                    : "bg-slate-700 text-white hover:bg-slate-600",
                ].join(" ")}
              >
                {hdAvailable ? "DL｜¥100" : "HD非対応"}
              </button>
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

              <button
                type="button"
                disabled={disabled}
                onClick={() => handleDownload("original")}
                className="mt-1 inline-flex items-center justify-center rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300"
              >
                DL｜¥200
              </button>
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

      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <LoginRequiredModal onClose={() => setShowLoginModal(false)} />
        </div>
      )}
    </>
  );
}

// -----------------------------------------
// 広告視聴モーダル（そのまま）
// -----------------------------------------
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
      <div className="text-sm font-semibold text-slate-900">広告視聴（テスト）</div>

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
            done ? "bg-emerald-600 hover:bg-emerald-500" : "cursor-not-allowed bg-slate-300",
          ].join(" ")}
        >
          {done ? "視聴完了" : `視聴中… ${seconds}`}
        </button>
      </div>
    </Card>
  );
}

// -----------------------------------------
// ログイン誘導モーダル（有料DL用）
// -----------------------------------------
function LoginRequiredModal({ onClose }: { onClose: () => void }) {
  return (
    <Card className="w-full max-w-sm text-xs text-slate-700">
      <div className="text-sm font-semibold text-slate-900">ログインが必要です</div>

      <p className="mt-2 leading-relaxed">
        この画質のダウンロードはコインを使用します。
        続けるにはログイン、または新規登録をしてください。
      </p>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
        >
          閉じる
        </button>

        <Link
          href="/login"
          className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
        >
          ログイン
        </Link>

        <Link
          href="/signup"
          className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-50"
        >
          新規登録
        </Link>
      </div>
    </Card>
  );
}
