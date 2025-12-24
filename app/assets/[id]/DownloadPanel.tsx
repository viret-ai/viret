// =====================================
// app/assets/[id]/DownloadPanel.tsx
// DLパネル（即ダウンロード発火版）
// - Small：広告視聴で無料DL
// - HD / Original：サイズごと買い切り（🪙）
// - 購入済みサイズは「広告なし」を明示
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
// 即DL開始（ステータス別処理）
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
    alert("コインが不足しています。");
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

  // 購入済みサイズ（hd / original）
  const [purchasedSizes, setPurchasedSizes] = useState<Set<SizeOption>>(new Set());

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

  // =====================================
  // 購入済みサイズ取得
  // =====================================
  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        const res = await fetch(`/api/assets/${assetId}/purchases`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const json = await res.json();
        const sizes = (json?.purchasedSizes ?? []) as SizeOption[];
        if (!alive) return;

        setPurchasedSizes(new Set(sizes));
      } catch {}
    };

    run();
    return () => {
      alive = false;
    };
  }, [assetId]);

  const isPurchased = (size: SizeOption) => purchasedSizes.has(size);

  const buildDownloadUrl = (size: SizeOption) => {
    const params = new URLSearchParams({ size, format });
    if (isPaidSize(size)) params.set("kind", "paid");
    return `/api/assets/${assetId}/download?${params.toString()}`;
  };

  const handleDownload = async (size: SizeOption) => {
    if (disabled) return;

    if (size === "sm" && !smallUnlocked) {
      setShowAdModal(true);
      return;
    }

    const url = buildDownloadUrl(size);
    const ext = format === "jpg" ? "jpg" : format;
    const filename = `${title || "asset"}-${size}.${ext}`;

    await triggerDownload(url, filename, () => setShowLoginModal(true));
  };

  const paidButtonLabel = (size: SizeOption, priceLabel: string) =>
    isPurchased(size) ? "DL｜🪙購入済" : priceLabel;

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

        {/* Format */}
        <div>
          <div className="mb-1 text-[11px] font-semibold text-slate-600">
            フォーマット
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FORMAT_LABELS) as FormatOption[]).map((f) => {
              const active = f === format;
              return (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={[
                    "rounded-full border px-3 py-1 text-[11px] font-semibold",
                    active
                      ? "border-sky-500 bg-sky-500 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-sky-400",
                  ].join(" ")}
                >
                  {FORMAT_LABELS[f]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sizes */}
        <div className="space-y-3">
          {/* Small */}
          <Card variant="outline" padded className="bg-slate-50">
            <div className="flex justify-between items-center gap-2">
              <div>
                <div className="text-[11px] font-semibold">
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
                  onClick={() => handleDownload("sm")}
                  className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] text-white"
                >
                  DL｜🪙0
                </button>
              ) : (
                <button
                  onClick={() => setShowAdModal(true)}
                  className="rounded-full border border-emerald-500 px-3 py-1 text-[11px] text-emerald-700"
                >
                  広告を見て無料DL
                </button>
              )}
            </div>
          </Card>

          {/* HD */}
          <Card variant="outline" padded>
            <div className="flex justify-between items-center gap-2">
              <div>
                <div className="text-[11px] font-semibold">
                  {hdSize
                    ? `HD（${hdSize.w}×${hdSize.h}：350dpi）`
                    : "HD（1080px：350dpi）"}
                </div>
                <div className="text-[10px] text-amber-600">
                  {isPurchased("hd")
                    ? "このサイズは購入済です（広告なし）"
                    : hdAvailable
                      ? "ポイント向けの高解像度サイズです"
                      : "元画像の短辺が1080px未満のため利用できません"}
                </div>
              </div>

              <button
                disabled={hdDisabled}
                onClick={() => handleDownload("hd")}
                className={[
                  "rounded-full px-3 py-1 text-[11px] font-semibold",
                  hdDisabled
                    ? "bg-slate-300 text-slate-500"
                    : "bg-slate-700 text-white",
                ].join(" ")}
              >
                {hdAvailable ? paidButtonLabel("hd", "DL｜🪙100") : "HD非対応"}
              </button>
            </div>
          </Card>

          {/* Original */}
          <Card variant="outline" padded>
            <div className="flex justify-between items-center gap-2">
              <div>
                <div className="text-[11px] font-semibold">{originalLabel}</div>
                <div className="text-[10px] text-amber-600">
                  {isPurchased("original")
                    ? "このサイズは購入済です（広告なし）"
                    : "元サイズデータ（350dpi 推奨）"}
                </div>
              </div>

              <button
                onClick={() => handleDownload("original")}
                className="rounded-full bg-slate-800 px-3 py-1 text-[11px] text-white"
              >
                {paidButtonLabel("original", "DL｜🪙200")}
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
// 広告視聴モーダル
// -----------------------------------------
function AdWatchModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <Card className="w-full max-w-sm text-xs">
      <div className="font-semibold">広告視聴（テスト）</div>
      <p className="mt-2">
        {seconds > 0
          ? `${seconds}秒で視聴完了します`
          : "視聴完了しました"}
      </p>
      <div className="mt-4 flex justify-end">
        <button
          disabled={seconds > 0}
          onClick={onComplete}
          className="rounded-full bg-emerald-600 px-3 py-1 text-white"
        >
          視聴完了
        </button>
      </div>
    </Card>
  );
}

// -----------------------------------------
// ログイン誘導
// -----------------------------------------
function LoginRequiredModal({ onClose }: { onClose: () => void }) {
  return (
    <Card className="w-full max-w-sm text-xs">
      <div className="font-semibold">ログインが必要です</div>
      <p className="mt-2">この画質のDLにはログインが必要です。</p>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full border px-3 py-1">
          閉じる
        </button>
        <Link href="/login" className="rounded-full bg-slate-800 px-3 py-1 text-white">
          ログイン
        </Link>
      </div>
    </Card>
  );
}
