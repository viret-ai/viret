// =====================================
// app/jobs/[jobId]/confirm/page.tsx
// レタッチ依頼確認画面（レシート風）
// - sessionStorage からドラフト情報を読み込んで表示
// - lib/pins から単価情報を読み出して内訳を再計算
// - 送信ボタンで retouch_jobs に 1 行 INSERT（新スキーマ対応）
//   ※ retouch_jobs 側カラム：
//     - owner_id            : uuid
//     - title               : text
//     - description         : text
//     - base_image_path     : text
//     - license_source      : text
//     - license_note        : text
//     - payload             : jsonb
//     - total_pins          : integer
//     - total_price_coins   : integer
//     - is_official_challenge : boolean
//     - status              : enum(viret_retouch_job_status)
//   ※ note / pinSummaryText / assetId などは payload 側に含める
// =====================================

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { PIN_DEFS, PIN_DEF_BY_TYPE } from "@/lib/pins";
import type { PinType, PlacedPin } from "@/lib/pins";

// ===== 型 =====

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

type PinLine = {
  type: PinType;
  label: string;
  unitPrice: number;
  count: number;
  subtotal: number;
};

// ===== ページ本体 =====

export default function JobRetouchConfirmPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId ?? "";
  const router = useRouter();

  const [draft, setDraft] = useState<RetouchDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // sessionStorage からドラフト読み込み
  useEffect(() => {
    if (!jobId) return;

    try {
      const raw = window.sessionStorage.getItem(
        `viret-retouch-draft-${jobId}`,
      );
      if (!raw) return;
      const parsed = JSON.parse(raw) as RetouchDraft;
      setDraft(parsed);
    } catch (e) {
      console.error("failed to load retouch draft", e);
    }
  }, [jobId]);

  const handleBackToEdit = () => {
    router.push(`/jobs/${jobId}`);
  };

  // lib/pins の定義を使って内訳を再計算
  const breakdown = useMemo(() => {
    if (!draft) {
      return {
        lines: [] as PinLine[],
        totalPins: 0,
        totalPrice: 0,
      };
    }

    const counts: Partial<Record<PinType, { count: number; subtotal: number }>> =
      {};

    for (const p of draft.pins ?? []) {
      const def = PIN_DEF_BY_TYPE[p.type];
      if (!def) continue;
      if (!counts[p.type]) {
        counts[p.type] = { count: 0, subtotal: 0 };
      }
      counts[p.type]!.count += 1;
      counts[p.type]!.subtotal += def.price;
    }

    const lines: PinLine[] = [];

    for (const def of PIN_DEFS) {
      const entry = counts[def.type];
      if (!entry || entry.count === 0) continue;
      lines.push({
        type: def.type,
        label: def.label,
        unitPrice: def.price,
        count: entry.count,
        subtotal: entry.subtotal,
      });
    }

    const totalPins = lines.reduce((sum, l) => sum + l.count, 0);
    const totalPrice = lines.reduce((sum, l) => sum + l.subtotal, 0);

    // pins が空だった場合はドラフトの値をフォールバックとして使う
    return {
      lines,
      totalPins: totalPins || draft.totalPins || 0,
      totalPrice: totalPrice || draft.totalPrice || 0,
    };
  }, [draft]);

  // ★「送信」ボタンの中身（retouch_jobs に 1 行 INSERT / 新スキーマ）
  const handleSubmit = async () => {
    if (!draft) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const assetId = draft.assetId ?? draft.jobId;

      // ログイン中ユーザーを取得（owner_id 用）
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("getUser error", userError);
        setSubmitError(
          "ログイン情報の取得に失敗しました。再度ログインし直してください。",
        );
        setSubmitting(false);
        return;
      }

      // DB に保存する payload（ピン座標＋メタ一式）
      const payload = {
        pins: draft.pins ?? [],
        jobId: draft.jobId,
        assetId: assetId,
        assetTitle: draft.assetTitle,
        previewUrl: draft.previewUrl,
        note: draft.note || null,
        pinSummaryText: draft.pinSummaryText || null,
      };

      // 必須カラムを新スキーマに合わせて埋める
      const title =
        draft.assetTitle && draft.assetTitle.trim().length > 0
          ? draft.assetTitle
          : "レタッチ依頼（ピン指定）";

      // とりあえず開発中は previewUrl を base_image_path として保存しておく
      const baseImagePath =
        draft.previewUrl && draft.previewUrl.trim().length > 0
          ? draft.previewUrl
          : `jobs/${user.id}/${assetId}/original.png`;

      const { error } = await supabase.from("retouch_jobs").insert({
        owner_id: user.id,
        title,
        description: draft.note || null,
        base_image_path: baseImagePath,
        license_source: "self", // 開発中は自前素材扱い
        license_note: null,
        payload,
        total_pins: breakdown.totalPins,
        total_price_coins: breakdown.totalPrice,
        is_official_challenge: false,
        status: "open",
      });

      if (error) {
        console.error("retouch_jobs insert error", error);
        setSubmitError(
          "依頼の登録中にエラーが発生しました。時間をおいて再度お試しください。",
        );
        setSubmitting(false);
        return;
      }

      // 下書きを削除して一覧へ
      window.sessionStorage.removeItem(`viret-retouch-draft-${jobId}`);
      router.push("/jobs");
    } catch (e) {
      console.error(e);
      setSubmitError("予期しないエラーが発生しました。");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-6 text-[var(--v-text)]">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        {/* パンくず */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-1">
            <Link href="/" className="hover:underline">
              Viret
            </Link>
            <span>/</span>
            <Link href="/jobs" className="hover:underline">
              レタッチ依頼一覧
            </Link>
            <span>/</span>
            <span className="text-slate-500">依頼内容の確認</span>
          </div>
          <div className="font-mono">
            Job ID: <span>{jobId}</span>
          </div>
        </div>

        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            レタッチ依頼内容の確認
          </h1>
          <p className="text-xs leading-relaxed text-slate-600">
            下記の内容でレタッチャーに依頼を送信します。内容を確認し、問題なければ一番下のボタンから送信してください。
          </p>
        </header>

        {!draft && (
          <Card className="mt-4 border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <p className="font-semibold">ピン情報が見つかりませんでした。</p>
            <p className="mt-1">
              ブラウザのタブを開き直した場合など、編集中の情報が失われることがあります。
              <br />
              お手数ですが、もう一度ピン指定画面で入力し直してください。
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleBackToEdit}
                className="inline-flex items-center justify-center rounded border border-slate-400 bg-white px-3 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-50"
              >
                ← ピン指定画面に戻る
              </button>
            </div>
          </Card>
        )}

        {draft && (
          <section className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            {/* 左：見出し画像＋メモ（レシート左側） */}
            <Card className="flex flex-col gap-3 border border-slate-200 bg-white p-4 text-xs text-slate-800">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                PREVIEW
              </div>

              <div className="flex items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-[11px] text-slate-500">
                {draft.previewUrl ? (
                  <img
                    src={draft.previewUrl}
                    alt={draft.assetTitle ?? ""}
                    className="max-h-[360px] w-auto max-w-full object-contain"
                  />
                ) : (
                  <>
                    ここにレタッチ対象画像のプレビューが入ります
                    <br />
                    （assets / jobs から取得）
                  </>
                )}
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="text-[11px] font-semibold text-slate-600">
                  依頼メモ
                </div>
                {draft.note ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-800">
                    {draft.note}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500">
                    依頼メモは入力されていません。
                  </p>
                )}
              </div>
            </Card>

            {/* 右：レシート風の内訳 */}
            <Card className="flex flex-col gap-3 border border-slate-200 bg-white p-4 text-xs text-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    RETOUCH SUMMARY
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    レタッチ内訳
                  </div>
                </div>
                <div className="rounded bg-slate-900 px-2 py-1 text-[10px] font-mono text-white">
                  PINS {breakdown.totalPins.toString().padStart(2, "0")}
                </div>
              </div>

              {/* 内訳テーブル */}
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                {breakdown.totalPins === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    ピンが指定されていません。
                  </p>
                ) : (
                  <div className="space-y-1">
                    {breakdown.lines.map((line) => (
                      <div
                        key={line.type}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <span className="truncate">{line.label}</span>
                        <span className="font-mono">
                          ¥{line.unitPrice.toLocaleString()} ×
                          {line.count} = ¥{line.subtotal.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 小計 */}
              <div className="space-y-1 border-t border-slate-200 pt-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">ピン合計</span>
                  <span className="font-mono">
                    {breakdown.totalPins} 本
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">概算金額</span>
                  <span className="font-mono">
                    ¥{breakdown.totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* コメント・注意書き */}
              <div className="mt-2 border-t border-dashed border-slate-300 pt-3 text-[10px] text-slate-500">
                ※ 料金はピン種別と本数に応じた概算です。実際の請求額はレタッチャーとの合意後に確定します。
              </div>

              {draft.pinSummaryText && (
                <p className="mt-1 text-[11px] text-slate-600">
                  {draft.pinSummaryText}
                </p>
              )}

              {submitError && (
                <p className="mt-2 text-[11px] text-red-600">{submitError}</p>
              )}
            </Card>
          </section>
        )}

        {/* フッター操作 */}
        <section className="mt-4 flex flex-col gap-3 pb-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handleBackToEdit}
            className="inline-flex items-center justify-center rounded border border-slate-400 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            ← ピン指定画面に戻って修正する
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!draft || submitting}
            className="inline-flex items-center justify-center rounded bg-slate-900 px-6 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-500"
          >
            {submitting
              ? "送信中…"
              : "この内容で依頼を送信（テスト版） →"}
          </button>
        </section>
      </div>
    </main>
  );
}
