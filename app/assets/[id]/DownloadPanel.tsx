// =====================================
// app/assets/[id]/DownloadPanel.tsx
// ダウンロードパネル（サイズ × フォーマット選択 UI）
// - Small: 無料（広告視聴で解放）短辺720相当
// - HD: 有料予定・短辺1080相当
//   → 元画像の短辺が1080px未満 or サイズ情報なしの場合は HD 無効
// - Original: 有料予定・元サイズ
// =====================================

"use client";

import { useState, useEffect } from "react";

type Props = {
  assetId: string;
  originalUrlExists: boolean;
  // 元画像の実ピクセルサイズ（DB の width / height から渡す想定・無くてもOK）
  originalWidth?: number | null;
  originalHeight?: number | null;
};

type SizeOption = "sm" | "hd" | "original";
type FormatOption = "jpg" | "png" | "webp";

const SIZE_LABELS: Record<SizeOption, string> = {
  sm: "Small（無料・短辺720px）",
  hd: "HD（有料予定・短辺1080px）",
  original: "Original（有料予定・元サイズ）",
};

const FORMAT_LABELS: Record<FormatOption, string> = {
  jpg: "JPG",
  png: "PNG",
  webp: "WebP",
};

export default function DownloadPanel({
  assetId,
  originalUrlExists,
  originalWidth,
  originalHeight,
}: Props) {
  const [format, setFormat] = useState<FormatOption>("jpg"); // 選択中フォーマット
  const [smallUnlocked, setSmallUnlocked] = useState(false); // small解放フラグ
  const [showAdModal, setShowAdModal] = useState(false); // 広告モーダル表示

  const disabled = !originalUrlExists;

  // ===== HD可否ロジック（最小限） =====
  const hasSizeInfo =
    typeof originalWidth === "number" &&
    typeof originalHeight === "number" &&
    originalWidth > 0 &&
    originalHeight > 0;

  const shortEdge = hasSizeInfo
    ? Math.min(originalWidth as number, originalHeight as number)
    : null;

  // サイズ情報があって短辺1080以上のときだけ HD を有効にする
  const hdAvailable = hasSizeInfo && shortEdge !== null && shortEdge >= 1080;
  const hdDisabled = disabled || !hdAvailable;

  const buildDownloadHref = (size: SizeOption) => {
    const params = new URLSearchParams({
      size,
      format,
    });
    return `/api/assets/${assetId}/download?${params.toString()}`;
  };

  return (
    <>
      {/* DLパネル本体 */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Download
        </div>

        {/* フォーマット選択 */}
        <div className="mb-3">
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
                    "rounded-full border px-3 py-1 text-[11px] transition",
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
          <p className="mt-1 text-[10px] text-slate-500">
            いまはどのフォーマットを選んでも同じ画像がダウンロードされます
            （後で実際の変換処理を追加予定）。
          </p>
        </div>

        {/* サイズ別ボタン */}
        <div className="space-y-2">
          {/* Small（広告視聴で解放） */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-700">
                  {SIZE_LABELS.sm}
                </div>
                <div className="text-[10px] text-emerald-600">
                  広告を見れば、回数制限なしで無料ダウンロードできます
                </div>
              </div>

              {smallUnlocked ? (
                <a
                  href={buildDownloadHref("sm")}
                  className="mt-1 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                  aria-disabled={disabled}
                  onClick={(e) => {
                    if (disabled) e.preventDefault();
                  }}
                >
                  選択フォーマットでDL
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdModal(true)}
                  className="mt-1 inline-flex items-center justify-center rounded-full border border-emerald-500 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                >
                  広告を見て解放する
                </button>
              )}
            </div>
          </div>

          {/* HD（有料予定・短辺1080px。条件満たさない/サイズ不明なら無効化） */}
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-700">
                  {SIZE_LABELS.hd}
                </div>
                <div className="text-[10px] text-amber-600">
                  {hasSizeInfo
                    ? hdAvailable
                      ? "将来的にポイント・サブスクで解放予定"
                      : "元画像の解像度がHD基準（短辺1080px）に満たないため利用できません"
                    : "サイズ情報が未登録のため、現在HDは利用できません"}
                </div>
              </div>
              <a
                href={buildDownloadHref("hd")}
                className={[
                  "mt-1 inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm transition",
                  hdDisabled
                    ? "cursor-not-allowed bg-slate-300 text-slate-500"
                    : "bg-slate-700 text-white hover:bg-slate-600",
                ].join(" ")}
                aria-disabled={hdDisabled}
                onClick={(e) => {
                  if (hdDisabled) {
                    e.preventDefault();
                  }
                }}
              >
                {hdAvailable ? "選択フォーマットでDL（仮）" : "HD非対応"}
              </a>
            </div>
          </div>

          {/* Original（有料予定） */}
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-700">
                  {SIZE_LABELS.original}
                </div>
                <div className="text-[10px] text-amber-600">
                  将来的にポイント・サブスクで解放予定
                </div>
              </div>
              <a
                href={buildDownloadHref("original")}
                className="mt-1 inline-flex items-center justify-center rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-disabled={disabled}
                onClick={(e) => {
                  if (disabled) e.preventDefault();
                }}
              >
                選択フォーマットでDL（仮）
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 広告視聴モーダル（5秒ディレイ） */}
      {showAdModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
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

// =====================================
// モーダル: 5秒の広告視聴ディレイ付き（テスト用）
// =====================================

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
    <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
      <div className="text-sm font-semibold text-slate-900">
        広告視聴（テスト）
      </div>

      {!done ? (
        <p className="mt-2 text-xs text-slate-600">
          実際の広告は 5〜10秒ほどの動画になります。{" "}
          <span className="font-bold">{seconds}秒</span> 経過すると視聴完了になります。
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-600">
          視聴完了しました。Smallサイズの無料DLが解放されます。
        </p>
      )}

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
    </div>
  );
}
