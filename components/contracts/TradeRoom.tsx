// =====================================
// components/contracts/TradeRoom.tsx
// 取引ルーム UI（Client）
// - 左：チャット（テンプレ主体）
// - 右：納品（最新＋履歴）＋修正依頼/追加対応/受取/運営相談
// - 自由入力は「納品コメント」「修正依頼コメント」だけ（方針）
// - 納品は Storage アップロード → path を postDelivery に渡す（v1）
// =====================================

"use client";

import { useMemo, useState, useTransition } from "react";
import type {
  ContractRoomBundle,
  JobMessageRow,
  JobDeliveryRow,
} from "@/lib/contracts/queries";
import Card from "@/components/ui/Card";
import {
  uploadDeliveryFile,
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

type SupportReason =
  | "out_of_scope_request"
  | "too_many_revisions"
  | "counterparty_inactive"
  | "delivery_mismatch"
  | "other";

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

  const revisionCount = useMemo(
    () => countRevisionRequests(bundle.messages),
    [bundle.messages]
  );
  const remainingFree = Math.max(0, FREE_REVISION_MAX - revisionCount);

  const latest = useMemo(() => latestDelivery(bundle.deliveries), [bundle.deliveries]);

  const role = bundle.roleInThisJob;

  // -----------------------
  // モーダル状態
  // -----------------------
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverFile, setDeliverFile] = useState<File | null>(null);
  const [deliverNote, setDeliverNote] = useState("");

  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revCheckInScope, setRevCheckInScope] = useState(false);
  const [revCheckNotNewRequest, setRevCheckNotNewRequest] = useState(false);
  const [revCheckSingleMessage, setRevCheckSingleMessage] = useState(false);
  const [revBody, setRevBody] = useState("");

  const [paidRevisionOpen, setPaidRevisionOpen] = useState(false);
  const [paidBody, setPaidBody] = useState("");
  const [paidCheckUnderstand, setPaidCheckUnderstand] = useState(false);

  const [supportOpen, setSupportOpen] = useState(false);
  const [supportReason, setSupportReason] = useState<SupportReason>("out_of_scope_request");
  const [supportDetails, setSupportDetails] = useState("");

  const resetDeliver = () => {
    setDeliverFile(null);
    setDeliverNote("");
  };

  const resetRevision = () => {
    setRevCheckInScope(false);
    setRevCheckNotNewRequest(false);
    setRevCheckSingleMessage(false);
    setRevBody("");
  };

  const resetPaidRevision = () => {
    setPaidBody("");
    setPaidCheckUnderstand(false);
  };

  const resetSupport = () => {
    setSupportReason("out_of_scope_request");
    setSupportDetails("");
  };

  // -----------------------
  // Actions
  // -----------------------
  const submitDelivery = async () => {
    if (!deliverFile) {
      setToast("納品ファイルを選択してください");
      return;
    }

    // v1: 最新version+1
    const versionNext = (latest?.version ?? 0) + 1;

    startTransition(async () => {
      // 1) Storageへアップロード
      const up = await uploadDeliveryFile({
        jobId: job.id,
        ownerId: job.owner_id,
        version: versionNext,
        file: deliverFile,
      });

      if (!up.ok) {
        setToast(up.error ?? "アップロードに失敗しました");
        return;
      }

      // 2) DBに納品登録 + メッセージ
      const res = await postDelivery({
        jobId: job.id,
        retoucherId: viewerId,
        version: versionNext,
        filePath: up.data.path,
        note: deliverNote.trim(),
      });

      if (res.ok) {
        setToast(`納品しました（v${versionNext}）`);
        setDeliverOpen(false);
        resetDeliver();
      } else {
        setToast(res.error ?? "納品の登録に失敗しました");
      }
    });
  };

  const submitRevision = async () => {
    // ガチガチ：チェック必須
    if (!revCheckInScope || !revCheckNotNewRequest || !revCheckSingleMessage) {
      setToast("チェック項目をすべて確認してください");
      return;
    }

    const body = revBody.trim();
    if (!body) {
      setToast("修正依頼コメントを入力してください");
      return;
    }

    startTransition(async () => {
      const res = await requestRevision({
        jobId: job.id,
        ownerId: viewerId,
        body,
        revisionCountNext: revisionCount + 1,
        remainingFreeNext: Math.max(0, FREE_REVISION_MAX - (revisionCount + 1)),
      });

      if (res.ok) {
        setToast("修正依頼を送信しました");
        setRevisionOpen(false);
        resetRevision();
      } else {
        setToast(res.error ?? "送信に失敗しました");
      }
    });
  };

  const submitPaidRevision = async () => {
    if (!paidCheckUnderstand) {
      setToast("内容を確認してください");
      return;
    }

    const body = paidBody.trim();
    if (!body) {
      setToast("追加対応コメントを入力してください");
      return;
    }

    startTransition(async () => {
      const res = await requestPaidRevision({
        jobId: job.id,
        ownerId: viewerId,
        retoucherId: job.retoucher_id,
        body,
        coins: PAID_REVISION_COINS,
        revisionCountNext: revisionCount + 1,
      });

      if (res.ok) {
        setToast("追加対応を依頼しました（pending）");
        setPaidRevisionOpen(false);
        resetPaidRevision();
      } else {
        setToast(res.error ?? "送信に失敗しました");
      }
    });
  };

  const submitAccept = async () => {
    if (!latest) {
      setToast("受取確認できる納品がありません");
      return;
    }

    startTransition(async () => {
      const res = await acceptDelivery({
        jobId: job.id,
        ownerId: viewerId,
        deliveryId: latest.id,
      });

      setToast(res.ok ? "受取確認しました（取引完了）" : res.error ?? "処理に失敗しました");
    });
  };

  const submitSupport = async () => {
    startTransition(async () => {
      const res = await openSupportTicket({
        jobId: job.id,
        reporterId: viewerId,
        reason: supportReason,
        details: supportDetails.trim(),
      });

      if (res.ok) {
        setToast("運営相談を送信しました");
        setSupportOpen(false);
        resetSupport();
      } else {
        setToast(res.error ?? "送信に失敗しました");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 左：チャット */}
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
                    {m.kind === "system" ? renderSystemMessage(m) : m.body ?? ""}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {role === "retoucher" ? (
              <button
                className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                onClick={() => setDeliverOpen(true)}
                disabled={isPending || job.status === "completed" || job.status === "cancelled"}
              >
                納品する
              </button>
            ) : null}

            {role === "owner" ? (
              <>
                {revisionCount < FREE_REVISION_MAX ? (
                  <button
                    className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                    onClick={() => setRevisionOpen(true)}
                    disabled={isPending || job.status === "completed" || job.status === "cancelled"}
                  >
                    修正を依頼（無料）
                  </button>
                ) : (
                  <button
                    className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                    onClick={() => setPaidRevisionOpen(true)}
                    disabled={isPending || job.status === "completed" || job.status === "cancelled"}
                  >
                    追加対応（{PAID_REVISION_COINS}コイン）
                  </button>
                )}

                <button
                  className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                  onClick={submitAccept}
                  disabled={isPending || !latest || job.status === "completed" || job.status === "cancelled"}
                >
                  受取確認（取引完了）
                </button>
              </>
            ) : null}

            <button
              className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
              onClick={() => setSupportOpen(true)}
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

      {/* 右：納品など */}
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

      {/* -----------------------
          Modals
         ----------------------- */}

      {/* 納品 */}
      <Modal
        open={deliverOpen}
        title="納品"
        description="納品ファイルを選択し、必要なら納品コメントを入力してください（コメントのみ自由入力）。"
        onClose={() => {
          setDeliverOpen(false);
        }}
      >
        <div className="space-y-3">
          <Field label="納品ファイル（アップロード）">
            <input
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.webp,.zip"
              onChange={(e) => setDeliverFile(e.target.files?.[0] ?? null)}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            />
            {deliverFile ? (
              <div className="mt-2 text-xs opacity-80">
                選択中：{deliverFile.name}（{Math.round(deliverFile.size / 1024)} KB）
              </div>
            ) : null}
          </Field>

          <Field label="納品コメント（任意・自由入力）">
            <textarea
              value={deliverNote}
              onChange={(e) => setDeliverNote(e.target.value)}
              rows={4}
              className="w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
              placeholder="納品内容の補足、注意点など"
            />
          </Field>

          <div className="flex gap-2">
            <button
              className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
              onClick={submitDelivery}
              disabled={isPending}
            >
              アップロードして納品する
            </button>

            <button
              className="rounded border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
              onClick={() => {
                setDeliverOpen(false);
                resetDeliver();
              }}
              disabled={isPending}
            >
              キャンセル
            </button>
          </div>
        </div>
      </Modal>

      {/* 修正依頼（無料） */}
      <Modal
        open={revisionOpen}
        title="修正依頼（無料）"
        description="契約（ピン）範囲内の修正のみ依頼できます。チェックは必須です。"
        onClose={() => setRevisionOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded border border-amber-300/40 bg-amber-50/10 p-3 text-sm">
            <div className="font-semibold">重要</div>
            <div className="mt-1 opacity-80">
              ピン外の要求は対応できません。新規依頼として投稿してください。
            </div>
          </div>

          <CheckRow checked={revCheckInScope} onChange={setRevCheckInScope} label="指摘箇所はピン範囲内です" />
          <CheckRow checked={revCheckNotNewRequest} onChange={setRevCheckNotNewRequest} label="新規追加（契約外）ではありません" />
          <CheckRow checked={revCheckSingleMessage} onChange={setRevCheckSingleMessage} label="指摘内容はまとめて記載します" />

          <Field label="修正依頼コメント（自由入力・必須）">
            <textarea
              value={revBody}
              onChange={(e) => setRevBody(e.target.value)}
              rows={6}
              className="w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
              placeholder="例：肌の色ムラを軽減、目尻のはみ出し修正…（ピン範囲内に限定）"
            />
          </Field>

          <div className="flex gap-2">
            <button
              className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
              onClick={submitRevision}
              disabled={isPending}
            >
              送信
            </button>

            <button
              className="rounded border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
              onClick={() => {
                setRevisionOpen(false);
                resetRevision();
              }}
              disabled={isPending}
            >
              キャンセル
            </button>
          </div>
        </div>
      </Modal>

      {/* 追加対応（有料） */}
      <Modal
        open={paidRevisionOpen}
        title={`追加対応（${PAID_REVISION_COINS}コイン）`}
        description="無料修正回数を超えた場合、追加対応として扱います（pending確保）。"
        onClose={() => setPaidRevisionOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded border border-white/10 bg-white/5 p-3 text-sm">
            <div className="opacity-80">
              これは「無料修正」ではなく、追加対応として扱います。コインは pending で確保されます。
            </div>
          </div>

          <CheckRow
            checked={paidCheckUnderstand}
            onChange={setPaidCheckUnderstand}
            label={`追加対応として ${PAID_REVISION_COINS} コインを pending で確保することを理解しました`}
          />

          <Field label="追加対応コメント（自由入力・必須）">
            <textarea
              value={paidBody}
              onChange={(e) => setPaidBody(e.target.value)}
              rows={6}
              className="w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
              placeholder="追加対応として依頼したい内容（契約外に該当する範囲）"
            />
          </Field>

          <div className="flex gap-2">
            <button
              className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
              onClick={submitPaidRevision}
              disabled={isPending}
            >
              送信
            </button>

            <button
              className="rounded border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
              onClick={() => {
                setPaidRevisionOpen(false);
                resetPaidRevision();
              }}
              disabled={isPending}
            >
              キャンセル
            </button>
          </div>
        </div>
      </Modal>

      {/* 運営に相談 */}
      <Modal
        open={supportOpen}
        title="運営に相談"
        description="契約外要求・放置・納品不一致など、トラブル時の記録として送信します。"
        onClose={() => setSupportOpen(false)}
      >
        <div className="space-y-3">
          <Field label="理由（選択）">
            <select
              value={supportReason}
              onChange={(e) => setSupportReason(e.target.value as SupportReason)}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            >
              <option value="out_of_scope_request">ピン外要求がある</option>
              <option value="too_many_revisions">修正回数が異常</option>
              <option value="counterparty_inactive">相手が放置している</option>
              <option value="delivery_mismatch">納品が契約と明らかに異なる</option>
              <option value="other">その他</option>
            </select>
          </Field>

          <Field label="状況メモ（任意）">
            <textarea
              value={supportDetails}
              onChange={(e) => setSupportDetails(e.target.value)}
              rows={5}
              className="w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
              placeholder="短くでOK。必要なら後で追記する想定。"
            />
          </Field>

          <div className="flex gap-2">
            <button
              className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
              onClick={submitSupport}
              disabled={isPending}
            >
              送信
            </button>

            <button
              className="rounded border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
              onClick={() => {
                setSupportOpen(false);
                resetSupport();
              }}
              disabled={isPending}
            >
              キャンセル
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function renderSystemMessage(m: JobMessageRow) {
  const k = m.template_key ?? "system";

  if (k === "job_started") return "契約を開始しました。";
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
  if (k === "support_ticket_created") return "運営に相談を送信しました。";

  return `system: ${k}`;
}

function Modal(props: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={props.onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xl rounded-lg border border-white/10 bg-[var(--v-bg)] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-base font-semibold">{props.title}</div>
            {props.description ? <div className="text-sm opacity-70">{props.description}</div> : null}
          </div>
          <button className="rounded px-2 py-1 text-sm opacity-80 hover:bg-white/10" onClick={props.onClose}>
            ✕
          </button>
        </div>

        <div className="mt-4">{props.children}</div>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-sm opacity-80">{props.label}</div>
      {props.children}
    </div>
  );
}

function CheckRow(props: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
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
