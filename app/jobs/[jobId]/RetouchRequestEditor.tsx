// =====================================
// app/jobs/[jobId]/RetouchRequestEditor.tsx
// レタッチ依頼画面（ピン指定 UI / クライアント側本体）
// - lib/pins の定義を利用してピン一覧・色・単価を表示
// - 集計も lib/pins の定義ベースで計算
// - 「決定」でドラフトを sessionStorage に保存 → /jobs/[jobId]/confirm へ
// - 「この依頼をキャンセルして素材詳細に戻る」で draft を削除
// =====================================

"use client";

import { useEffect, useMemo, useState, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { PIN_DEFS, PIN_DEF_BY_TYPE } from "@/lib/pins";
import type { PinType, PlacedPin } from "@/lib/pins";

// ===== 型 =====

type Props = {
  jobId: string;
  assetId: string;
  assetTitle: string;
  previewUrl: string | null;
  originalWidth?: number;
  originalHeight?: number;
};

// 確認画面側で扱うドラフト型と揃えた構造（ローカル定義）
type RetouchDraft = {
  jobId: string;
  pins: PlacedPin[];
  note: string;
  totalPins: number;
  totalPrice: number;
  pinSummaryText: string;
  assetId?: string;
  assetTitle?: string;
  previewUrl?: string | null;
};

// ===== メイン UI =====

export default function RetouchRequestEditor({
  jobId,
  assetId,
  assetTitle,
  previewUrl,
}: Props) {
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<PinType>("hand");
  const [pins, setPins] = useState<PlacedPin[]>([]);
  const [showPins, setShowPins] = useState(true);
  const [note, setNote] = useState("");

  // 初期表示時に sessionStorage からドラフトを復元
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(
        `viret-retouch-draft-${jobId}`,
      );
      if (!raw) return;

      const parsed = JSON.parse(raw) as RetouchDraft;
      if (parsed.jobId !== jobId) return;

      setPins(parsed.pins ?? []);
      setNote(parsed.note ?? "");
    } catch (e) {
      console.error("failed to restore retouch draft", e);
    }
  }, [jobId]);

  // 合計情報を集計（lib/pins の単価を使用）
  const { countsByType, totalPins, totalPrice, pinSummaryText } = useMemo(() => {
    const map: Partial<Record<PinType, number>> = {};
    let sumPins = 0;
    let sumPrice = 0;

    for (const p of pins) {
      map[p.type] = (map[p.type] ?? 0) + 1;
      const def = PIN_DEF_BY_TYPE[p.type];
      const unit =
        def && typeof def.unitPrice === "number"
          ? def.unitPrice
          : // 互換用：古い定義で price を使っている場合
            ((def as any)?.price ?? 0);

      sumPins += 1;
      sumPrice += unit;
    }

    const parts: string[] = [];
    for (const def of PIN_DEFS) {
      const count = map[def.type] ?? 0;
      if (count > 0) {
        parts.push(`${def.label} ×${count}`);
      }
    }

    const summaryText =
      parts.length === 0
        ? "ピンはまだ指定されていません。"
        : parts.join("　");

    return {
      countsByType: map,
      totalPins: sumPins,
      totalPrice: sumPrice,
      pinSummaryText: summaryText,
    };
  }, [pins]);

  // 画像クリック時にピン追加
  const handleImageClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const newPin: PlacedPin = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: selectedType,
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };

    setPins((prev) => [...prev, newPin]);
  };

  // ピン削除（右クリック）
  const handleRemovePin = (id: string) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
  };

  // 「決定して依頼確認画面に移動する」押下時
  const handleGoConfirm = () => {
    if (totalPins === 0) return;

    try {
      const draft: RetouchDraft = {
        jobId,
        pins,
        note,
        totalPins,
        totalPrice,
        pinSummaryText,
        assetId,
        assetTitle,
        previewUrl,
      };

      window.sessionStorage.setItem(
        `viret-retouch-draft-${jobId}`,
        JSON.stringify(draft),
      );

      router.push(`/jobs/${jobId}/confirm`);
    } catch (e) {
      console.error("failed to save retouch draft", e);
      router.push(`/jobs/${jobId}/confirm`);
    }
  };

  // 「この依頼をキャンセルして素材詳細に戻る」
  const handleCancelRequest = () => {
    try {
      window.sessionStorage.removeItem(`viret-retouch-draft-${jobId}`);
    } catch (e) {
      console.error("failed to clear retouch draft", e);
    }
    router.push(`/assets/${assetId}`);
  };

  return (
    <>
      {/* 上段：3カラムレイアウト（左：ピン一覧 / 中央：画像 / 右：ビュー設定） */}
      <section className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(220px,260px)] lg:items-start">
        {/* 左：ピンメニュー */}
        <aside className="space-y-4 rounded border border-slate-200 bg-white p-3 text-xs text-slate-700">
          <h2 className="text-sm font-semibold text-slate-900">
            修正内容ピン一覧
          </h2>

          {/* 人物修正系 */}
          <section className="space-y-1">
            <h3 className="text-[11px] font-semibold text-slate-600">
              ［人物修正系］
            </h3>
            <ul className="space-y-0.5">
              <li>・人物ピン ¥2,000</li>
              <li>・顔ピン ¥1,000</li>
              <li>・目ピン（片目）¥500</li>
              <li>・手ピン（片手）¥500</li>
              <li>・etc…</li>
            </ul>
          </section>

          {/* 小物修正系 */}
          <section className="space-y-1">
            <h3 className="text-[11px] font-semibold text-slate-600">
              ［小物修正系］
            </h3>
            <ul className="space-y-0.5">
              <li>・小物ピン ¥1,000</li>
              <li>・小物細部ピン（1点）¥300</li>
              <li>・小物細部ピン（セット）¥500</li>
              <li>・etc…</li>
            </ul>
          </section>

          {/* 背景修正系 */}
          <section className="space-y-1">
            <h3 className="text-[11px] font-semibold text-slate-600">
              ［背景修正系］
            </h3>
            <ul className="space-y-0.5">
              <li>・背景切り抜きピン ¥3,000</li>
              <li>・背景差分ピン ¥3,000</li>
              <li>・etc…</li>
            </ul>
          </section>

          {/* お任せピン */}
          <section className="space-y-1">
            <h3 className="text-[11px] font-semibold text-slate-600">
              ［お任せピン］
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-700">
              全部お任せピン
              <br />
              ※こちらはレタッチャーが
              <br />
              値段をご提示いたします。
            </p>
          </section>

          {/* 選択中のピン種別ボタン */}
          <section className="mt-3 space-y-1">
            <h3 className="text-[11px] font-semibold text-slate-600">
              いま置くピンの種類
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {PIN_DEFS.map((def) => {
                const active = def.type === selectedType;
                return (
                  <button
                    key={def.type}
                    type="button"
                    onClick={() => setSelectedType(def.type)}
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]",
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-500",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-2.5 w-2.5 rounded-full",
                        def.colorClass,
                      ].join(" ")}
                    />
                    <span>{def.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        {/* 中央：画像＋ピン */}
        <section className="flex flex-col items-stretch gap-2 rounded border border-slate-200 bg-slate-950/95 p-4">
          <div className="mb-2 flex items-center justify-between text-[11px] text-slate-200">
            <div className="font-semibold uppercase tracking-wide">
              依頼画像（プレビュー）
            </div>
            <div className="max-w-[55%] truncate text-right text-slate-300">
              {assetTitle}
            </div>
          </div>

          <div
            className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-hidden bg-black"
            onClick={handleImageClick}
          >
            {/* 実画像（assets から取得したもの） */}
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={assetTitle}
                className="max-h-[380px] w-auto max-w-full opacity-80"
              />
            ) : (
              <div className="flex h-[260px] w-full items-center justify-center text-xs text-slate-400">
                依頼画像を読み込めませんでした
              </div>
            )}

            {/* ピン描画 */}
            {showPins &&
              pins.map((pin) => {
                const def = PIN_DEF_BY_TYPE[pin.type];
                if (!def) return null;

                const left = `${pin.x * 100}%`;
                const top = `${pin.y * 100}%`;

                // 価格の互換取得（unitPrice 優先・なければ price）
                const unitPrice =
                  typeof def.unitPrice === "number"
                    ? def.unitPrice
                    : ((def as any).price ?? 0);

                return (
                  <button
                    key={pin.id}
                    type="button"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleRemovePin(pin.id);
                    }}
                    className="group absolute -translate-x-1/2 -translate-y-full"
                    style={{ left, top }}
                  >
                    {/* ピン本体（位置アイコン風） */}
                    <div className="flex flex-col items-center">
                      <div
                        className={[
                          "flex h-5 w-5 items-center justify-center rounded-full border border-white shadow-md",
                          def.colorClass,
                        ].join(" ")}
                      >
                        <span className="text-[10px] text-white">●</span>
                      </div>
                      <div className="h-1 w-[1px] bg-white/80" />
                    </div>

                    {/* 吹き出し */}
                    <div className="mt-1 hidden whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] text-white shadow group-hover:block">
                      {def.label} ¥{unitPrice.toLocaleString()}
                      <span className="ml-1 text-slate-300">
                        (右クリックで削除)
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>

          <p className="mt-1 text-[11px] text-slate-300">
            ※ 画像をクリックすると、選択中のピン種別（左のボタン）が追加されます。
            <br />
            ※ ピンは右クリックで削除できます。
          </p>
        </section>

        {/* 右：ビューコントロール */}
        <aside className="space-y-3 rounded border border-slate-200 bg-white p-3 text-xs text-slate-700">
          <h2 className="text-sm font-semibold text-slate-900">
            表示設定・ビュー
          </h2>

          {/* ピン表示 ON/OFF */}
          <div className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[12px] text-white">
                P
              </span>
              <span className="text-[11px] font-semibold text-slate-700">
                ピン表示
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPins((v) => !v)}
              className={[
                "rounded-full px-3 py-1 text-[11px] font-semibold",
                showPins
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-700",
              ].join(" ")}
            >
              {showPins ? "ON" : "OFF"}
            </button>
          </div>

          {/* ズーム（ダミー / 将来拡張） */}
          <div className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[12px] text-white">
                ＋
              </span>
              <span className="text-[11px] font-semibold text-slate-700">
                ズーム
              </span>
            </div>
            <span className="text-[11px] text-slate-700">100%</span>
          </div>

          {/* 表示モード（通常固定） */}
          <div className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[12px] text-white">
                ⚖
              </span>
              <span className="text-[11px] font-semibold text-slate-700">
                表示モード
              </span>
            </div>
            <span className="text-[11px] text-slate-700">通常</span>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            ※ ズーム機能や比較ビューは、今後のアップデートで追加予定です。
          </p>
        </aside>
      </section>

      {/* 中段：ピン集計バー */}
      <section className="mt-3 space-y-2 rounded border border-slate-900 bg-white px-4 py-2 text-xs text-slate-800">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {PIN_DEFS.map((def) => {
            const count = countsByType[def.type] ?? 0;
            if (count === 0) return null;

            return (
              <div key={def.type} className="flex items-center gap-1">
                <span
                  className={[
                    "inline-flex h-3 w-3 items-center justify-center rounded-full",
                    def.colorClass,
                  ].join(" ")}
                />
                <span>{def.label}</span>
                <span className="font-mono text-[11px]">×{count}</span>
              </div>
            );
          })}

          {totalPins === 0 && (
            <span className="text-[11px] text-slate-500">
              まだピンが指定されていません。
            </span>
          )}

          <div className="ml-auto flex items-center gap-2 text-[11px] font-semibold">
            <span>
              合計：<span className="font-mono">{totalPins}</span> ピン
            </span>
            <span className="text-slate-400">｜</span>
            <span>
              ¥
              <span className="font-mono">
                {totalPrice.toLocaleString()}
              </span>
            </span>
          </div>
        </div>

        {totalPins > 0 && (
          <p className="text-[11px] text-slate-600">{pinSummaryText}</p>
        )}
      </section>

      {/* 下段：依頼詳細入力 */}
      <section className="mt-3 space-y-2 rounded border border-slate-200 bg-white px-4 py-3 text-xs text-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            依頼詳細（任意）
          </h2>
          <span className="text-[11px] text-slate-500">
            レタッチャーに伝えたい情報を自由に記入してください。
          </span>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={5}
          className="mt-1 w-full resize-y rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-slate-500 focus:bg白 focus:ring-1 focus:ring-slate-500"
          placeholder="例：背景の白い部分は透過して、小物は謎の猫のような生物を消して、ぶら下がっている装飾は星型に変更してください…など"
        />
      </section>

      {/* フッター：操作ボタン */}
      <section className="mt-3 flex flex-col gap-3 pb-4 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={handleCancelRequest}
          className="inline-flex items-center justify-center rounded border border-slate-400 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          ← この依頼をキャンセルして素材詳細に戻る
        </button>

        <button
          type="button"
          onClick={handleGoConfirm}
          className="inline-flex items-center justify-center rounded bg-slate-900 px-6 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-500"
          disabled={totalPins === 0}
        >
          決定して依頼確認画面に移動する →
        </button>
      </section>
    </>
  );
}
