// =====================================
// components/contracts/trade-room/modals/SupportModal.tsx
// 運営に相談モーダル
// =====================================

"use client";

import { useState } from "react";
import type { ContractRoomBundle } from "@/lib/contracts/queries";
import { openSupportTicket } from "@/lib/contracts/actions";
import { Modal, Field } from "@/components/contracts/trade-room/ui/TradeRoomUI";

type SupportReason =
  | "out_of_scope_request"
  | "too_many_revisions"
  | "counterparty_inactive"
  | "delivery_mismatch"
  | "other";

type Props = {
  open: boolean;
  onClose: () => void;

  bundle: ContractRoomBundle;
  viewerId: string;

  isPending: boolean;
  startTransition: (fn: () => void) => void;

  onToast: (msg: string) => void;
};

export default function SupportModal(props: Props) {
  const job = props.bundle.job;

  const [reason, setReason] = useState<SupportReason>("out_of_scope_request");
  const [details, setDetails] = useState("");

  const reset = () => {
    setReason("out_of_scope_request");
    setDetails("");
  };

  const submit = async () => {
    props.startTransition(async () => {
      const res = await openSupportTicket({
        jobId: job.id,
        reporterId: props.viewerId,
        reason,
        details: details.trim(),
      });

      if (res.ok) {
        props.onToast("運営相談を送信しました");
        props.onClose();
        reset();
      } else {
        props.onToast(res.error ?? "送信に失敗しました");
      }
    });
  };

  return (
    <Modal
      open={props.open}
      title="運営に相談"
      description="契約外要求・放置・納品不一致など、トラブル時の記録として送信します。"
      onClose={props.onClose}
    >
      <div className="space-y-3">
        <Field label="理由（選択）">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as SupportReason)}
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
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={5}
            className="w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            placeholder="短くでOK。必要なら後で追記する想定。"
          />
        </Field>

        <div className="flex gap-2">
          <button
            className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
            onClick={submit}
            disabled={props.isPending}
          >
            送信
          </button>

          <button
            className="rounded border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
            onClick={() => {
              props.onClose();
              reset();
            }}
            disabled={props.isPending}
          >
            キャンセル
          </button>
        </div>
      </div>
    </Modal>
  );
}
