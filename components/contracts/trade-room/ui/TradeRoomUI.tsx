// =====================================
// components/contracts/trade-room/ui/TradeRoomUI.tsx
// 取引ルーム共通UI（Client部品）
// - Modal / Field / CheckRow / BgPill
// - DeliveryDropzone（D&D）
// - PreviewWithBg（背景切替プレビュー）
// - effect内で setState しない（警告回避）
// =====================================

"use client";

import { useEffect, useMemo, useState } from "react";

export type BgMode = "checker" | "green" | "magenta" | "black" | "white";

export function Modal(props: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={props.onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-xl rounded-lg border border-white/10 bg-[var(--v-bg)] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-base font-semibold">{props.title}</div>
            {props.description ? (
              <div className="text-sm opacity-70">{props.description}</div>
            ) : null}
          </div>

          <button
            className="rounded px-2 py-1 text-sm opacity-80 hover:bg-white/10"
            onClick={props.onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">{props.children}</div>
      </div>
    </div>
  );
}

export function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-sm opacity-80">{props.label}</div>
      {props.children}
    </div>
  );
}

export function CheckRow(props: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded border border-white/10 bg-white/5 p-3 text-sm">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="mt-1"
      />
      <span className="opacity-90">{props.label}</span>
    </label>
  );
}

export function BgPill(props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "rounded px-3 py-1 text-xs border",
        "border-white/10 hover:bg-white/10",
        props.active ? "bg-white/15" : "bg-white/5",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

export function DeliveryDropzone(props: {
  file: File | null;
  onPick: (file: File) => void;
  onClear: () => void;
  accept: string;
  disabled?: boolean;
}) {
  const { file, onPick, onClear, accept, disabled } = props;
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (fl: FileList | null) => {
    if (!fl || fl.length === 0) return;
    onPick(fl[0]);
  };

  return (
    <div className="space-y-2">
      <label
        className={[
          "block w-full rounded border border-dashed p-3",
          "transition-colors",
          dragOver ? "border-white/40 bg-white/10" : "border-white/15 bg-white/5",
          disabled ? "opacity-50 pointer-events-none" : "cursor-pointer",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {!file ? (
          <div className="text-sm">
            <div className="font-semibold">ここにドロップ</div>
            <div className="mt-1 opacity-70">クリックでも選択できます（画像 / zip など）</div>
          </div>
        ) : (
          <div className="text-sm">
            <div className="font-semibold">選択中</div>
            <div className="mt-1 break-all opacity-90">{file.name}</div>
            <div className="mt-1 text-xs opacity-70">
              {Math.round(file.size / 1024).toLocaleString()} KB
            </div>
          </div>
        )}
      </label>

      {file ? (
        <button
          type="button"
          className="rounded border border-white/10 px-3 py-2 text-xs hover:bg-white/5 disabled:opacity-50"
          onClick={onClear}
          disabled={disabled}
        >
          ファイルを外す
        </button>
      ) : null}
    </div>
  );
}

export function PreviewWithBg(props: { file: File; mode: BgMode }) {
  const { file, mode } = props;

  // // setStateを使わずに objectURL を扱う（警告回避）
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  const bgStyle = useMemo(() => {
    if (mode === "checker") {
      return {
        backgroundColor: "#ffffff",
        backgroundImage:
          "linear-gradient(45deg, rgba(0,0,0,0.12) 25%, transparent 25%)," +
          "linear-gradient(-45deg, rgba(0,0,0,0.12) 25%, transparent 25%)," +
          "linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.12) 75%)," +
          "linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.12) 75%)",
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
      } as React.CSSProperties;
    }
    if (mode === "green") return { backgroundColor: "#00ff3b" } as React.CSSProperties;
    if (mode === "magenta") return { backgroundColor: "#ff00ff" } as React.CSSProperties;
    if (mode === "black") return { backgroundColor: "#000000" } as React.CSSProperties;
    return { backgroundColor: "#ffffff" } as React.CSSProperties;
  }, [mode]);

  return (
    <div style={bgStyle} className="w-full">
      <div className="flex items-center justify-center p-3">
        <img
          src={url}
          alt="delivery preview"
          className="max-h-[52vh] w-auto max-w-full object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
}
