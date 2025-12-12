// =====================================
// components/contracts/TradeRoom.tsx
// 取引ルーム UI（Client）
// - 左：チャット（テンプレ主体）
// - 右：納品（最新＋履歴）＋修正依頼/追加対応/受取/運営相談
// - 入力は常時出さない（モーダル式）
// =====================================

"use client";

import { useMemo, useState, useTransition } from "react";
import type { ContractRoomBundle, JobMessageRow, JobDeliveryRow } from "@/lib/contracts/queries";
import Card from "@/components/ui/Card";
import {
  postDelivery,
  requestRevision,
  requestPaidRevision,
  acceptDelivery,
  openSupportTicket,
} from "@/lib/contracts/actions";

type Props = {
  bundle: ContractRoomBundle;
  viewerId: string;
};

const FREE_REVISION_MAX = 2;
// 有料追加対応の固定コイン（まず仮）
const PAID_REVISION_COINS = 200;

function countRevisionRequests(messages: JobMessageRow[]) {
  // revision_note の回数でカウント（依頼者が修正依頼を出した回数）
  return messages.filter((m) => m.kind === "revision_note").length;
}

function latestDelivery(deliveries: JobDeliveryRow[]) {
  return deliveries.length > 0 ? deliveries[0] : null;
}

export default function TradeRoom({ bundle, viewerId }: Props) {
  const job = bundle.job;

  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const revisionCount = useMemo(() => countRevisionRequests(bundle.messages), [bundle.messages]);
  const remainingFree = Math.max(0, FREE_REVISION_MAX - revisionCount);

  const latest = useMemo(() => latestDelivery(bundle.deliveries), [bundle.deliveries]);

  const role = bundle.roleInThisJob;

  const handleSupport = async () => {
    const reason = prompt(
      "運営に相談：理由キーを入力\nout_of_scope_request / too_many_revisions / counterparty_inactive / delivery_mismatch / other"
    );
    if (!reason) return;

    const details = prompt("任意：状況メモ（短く）") ?? "";

    startTransition(async () => {
      const res = await openSupportTicket({
        jobId: job.id,
        reporterId: viewerId,
        reason: reason as any,
        details,
      });

      setToast(res.ok ? "運営相談を送信しました" : res.error ?? "送信に失敗しました");
    });
  };

  const handleRevision = async () => {
    // ガチガチ：チェック必須（簡易に prompt で表現。後でUI化）
    const ok1 = confirm("チェック：指摘箇所はピン範囲内ですか？");
    if (!ok1) return alert("ピン外の内容は対応できません。新規依頼として投稿してください。");

    const ok2 = confirm("チェック：新規追加（契約外）ではありませんか？");
    if (!ok2) return alert("契約外です。新規依頼として投稿してください。");

    const ok3 = confirm("チェック：指摘内容はまとめて記載しますか？");
    if (!ok3) return;

    const body = prompt("修正依頼コメント（自由入力）")?.trim() ?? "";
    if (!body) return;

    startTransition(async () => {
      const res = await requestRevision({
        jobId: job.id,
        ownerId: viewerId,
        body,
        revisionCountNext: revisionCount + 1,
        remainingFreeNext: Math.max(0, FREE_REVISION_MAX - (revisionCount + 1)),
      });

      setToast(res.ok ? "修正依頼を送信しました" : res.error ?? "送信に失敗しました");
    });
  };

  const handlePaidRevision = async () => {
    // 3回目以降
    const ok1 = confirm("これは『追加対応（契約外）』です。進めますか？");
    if (!ok1) return;

    const body = prompt("追加対応コメント（自由入力）")?.trim() ?? "";
    if (!body) return;

    const ok2 = confirm(`追加対応として ${PAID_REVISION_COINS} コインを pending で確保します。よろしいですか？`);
    if (!ok2) return;

    startTransition(async () => {
      const res = await requestPaidRevision({
        jobId: job.id,
        ownerId: viewerId,
        retoucherId: job.retoucher_id,
        body,
        coins: PAID_REVISION_COINS,
        revisionCountNext: revisionCount + 1,
      });

      setToast(res.ok ? "追加対応を依頼しました（pending）" : res.error ?? "送信に失敗しました");
    });
  };

  const handleAccept = async () => {
    if (!latest) return;
    const ok = confirm("受取確認：この納品で取引を完了します。よろしいですか？");
    if (!ok) return;

    startTransition(async () => {
      const res = await acceptDelivery({
        jobId: job.id,
        ownerId: viewerId,
        deliveryId: latest.id,
      });

      setToast(res.ok ? "受取確認しました（取引完了）" : res.error ?? "処理に失敗しました");
    });
  };

  const handleDeliver = async () => {
    // retoucher のみ
    const versionNext = (latest?.version ?? 0) + 1;

    const filePath = prompt(
      "納品ファイル（Storage パス）を入力\n例: job-deliveries/{owner_id}/{job_id}/v2.png"
    )?.trim();
    if (!filePath) return;

    const note = prompt("納品コメント（自由入力）")?.trim() ?? "";

    startTransition(async () => {
      const res = await postDelivery({
        jobId: job.id,
        retoucherId: viewerId,
        version: versionNext,
        filePath,
        note,
      });

      setToast(res.ok ? `納品しました（v${versionNext}）` : res.error ?? "納品に失敗しました");
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Card className="p-4">
          <div className="text-sm opacity-70">取引サマリ</div>
          <div className="mt-2 flex flex-col gap-1">
            <div className="text-lg font-semibold">{job.title ?? "（無題）"}</div>
            <div className="text-sm opacity-80">status: {job.status}</div>
            <div className="text-sm opacity-80">
              pins: {job.total_pins ?? "-"} / coins: {job.total_price_coins ?? "-"}
            </div>
            <div className="text-sm opacity-80">
              無料修正：残り {remainingFree} / {FREE_REVISION_MAX}（修正依頼回数: {revisionCount}）
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm opacity-70">チャット（テンプレ主体）</div>

          <div className="mt-3 max-h-[60vh] overflow-auto rounded border border-white/10 p-3 space-y-2">
            {bundle.messages.length === 0 ? (
              <div className="text-sm opacity-70">まだメッセージはありません</div>
            ) : (
              bundle.messages.map((m) => (
                <div key={m.id} className="text-sm">
                  <div className="opacity-60">
                    {new Date(m.created_at).toLocaleString()} / {m.kind}
                    {m.template_key ? ` / ${m.template_key}` : ""}
                    {m.risk_flags?.length ? ` / flags:${m.risk_flags.join(",")}` : ""}
                  </div>

                  <div className="mt-1 whitespace-pre-wrap">
                    {m.kind === "system"
                      ? renderSystemMessage(m)
                      : m.body ?? ""}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {role === "retoucher" ? (
              <button
                className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                onClick={handleDeliver}
                disabled={isPending}
              >
                納品する
              </button>
            ) : null}

            {role === "owner" ? (
              <>
                {revisionCount < FREE_REVISION_MAX ? (
                  <button
                    className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                    onClick={handleRevision}
                    disabled={isPending}
                  >
                    修正を依頼（無料）
                  </button>
                ) : (
                  <button
                    className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                    onClick={handlePaidRevision}
                    disabled={isPending}
                  >
                    追加対応（{PAID_REVISION_COINS}コイン）
                  </button>
                )}

                <button
                  className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                  onClick={handleAccept}
                  disabled={isPending || !latest}
                >
                  受取確認（取引完了）
                </button>
              </>
            ) : null}

            <button
              className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
              onClick={handleSupport}
              disabled={isPending}
            >
              運営に相談
            </button>
          </div>

          {toast ? (
            <div className="mt-3 rounded border border-white/10 bg-white/5 p-2 text-sm">
              {toast}
              <button className="ml-3 underline opacity-80" onClick={() => setToast(null)}>
                閉じる
              </button>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="text-sm opacity-70">納品</div>

          <div className="mt-3 space-y-2">
            <div className="text-sm opacity-80">最新</div>
            {latest ? (
              <div className="rounded border border-white/10 p-3 text-sm">
                <div className="opacity-70">v{latest.version}</div>
                <div className="mt-1 break-all">{latest.file_path}</div>
                {latest.note ? <div className="mt-2 whitespace-pre-wrap">{latest.note}</div> : null}
              </div>
            ) : (
              <div className="text-sm opacity-70">まだ納品はありません</div>
            )}

            <div className="pt-2 text-sm opacity-80">履歴</div>
            <div className="max-h-[40vh] overflow-auto space-y-2">
              {bundle.deliveries.map((d) => (
                <div key={d.id} className="rounded border border-white/10 p-2 text-sm">
                  <div className="opacity-70">v{d.version}</div>
                  <div className="break-all">{d.file_path}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm opacity-70">追加対応（pending / 確定 / 返却）</div>
          <div className="mt-3 space-y-2 text-sm">
            {bundle.paidActions.length === 0 ? (
              <div className="opacity-70">追加対応はありません</div>
            ) : (
              bundle.paidActions.map((a) => (
                <div key={a.id} className="rounded border border-white/10 p-2">
                  <div className="opacity-70">
                    {a.kind} / {a.status} / {a.coins} coins
                  </div>
                  <div className="opacity-70">
                    created: {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm opacity-70">運営相談ログ</div>
          <div className="mt-3 space-y-2 text-sm">
            {bundle.tickets.length === 0 ? (
              <div className="opacity-70">相談はありません</div>
            ) : (
              bundle.tickets.map((t) => (
                <div key={t.id} className="rounded border border-white/10 p-2">
                  <div className="opacity-70">{t.reason}</div>
                  {t.details ? <div className="mt-1 whitespace-pre-wrap">{t.details}</div> : null}
                  <div className="mt-1 opacity-60">{new Date(t.created_at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function renderSystemMessage(m: JobMessageRow) {
  // system の見せ方は template_key で固定化（v1は最低限）
  // meta を使って v番号や回数などを出す
  const k = m.template_key ?? "system";

  if (k === "delivered") {
    const v = m.meta?.deliveryVersion;
    return `納品しました${typeof v === "number" ? `（v${v}）` : ""}`;
  }

  if (k === "revision_requested") {
    const c = m.meta?.revisionCount;
    const free = m.meta?.isFree;
    return `修正依頼を受け付けました${typeof c === "number" ? `（${c}回目）` : ""}${free === true ? "（無料）" : ""}`;
  }

  if (k === "paid_revision_requested") {
    const coins = m.meta?.costCoins;
    return `追加対応を依頼しました（pending）${typeof coins === "number" ? `（${coins}コイン）` : ""}`;
  }

  if (k === "accepted") return "受取確認しました。取引完了です。";

  return `system: ${k}`;
}
