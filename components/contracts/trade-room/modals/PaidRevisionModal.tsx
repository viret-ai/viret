// =====================================
// components/contracts/trade-room/modals/PaidRevisionModal.tsx
// 追加対応（有料）モーダル
// =====================================

"use client";

import { useState } from "react";
import type { ContractRoomBundle } from "@/lib/contracts/queries";
import { requestPaidRevision } from "@/lib/contracts/actions";
import { Modal, Field, CheckRow } from "@/components/contracts/trade-room/ui/TradeRoomUI";

type Props = {
  open: boolean;
  onClose: () => void;

  bundle: ContractRoomBundle;
  viewerId: string;

  isPending: boolean;
  startTransition: (fn: () => void) => void;

  revisionCount: number;
  paidRevisionCoins: number;

  onToast: (msg: string) => void;
};

export default function PaidRevisionModal(props: Props) {
  const job = props.bundle.job;

  const [body, setBody] = useState("");
  const [checkUnderstand, setCheckUnderstand] = useState(false);

  const reset = () => {
    setBody("");
    setCheckUnderstand(false);
  };

  const submit = async () => {
    if (!checkUnderstand) {
      props.onToast("内容を確認してください");
      return;
    }

    const t = body.trim();
    if (!t) {
      props.onToast("追加対応コメントを入力してください");
      return;
    }

    props.startTransition(async () => {
      const res = await requestPaidRevision({
        jobId: job.id,
        ownerId: props.viewerId,
        retoucherId: job.retoucher_id,
        body: t,
        coins: props.paidRevisionCoins,
        revisionCountNext: props.revisionCount + 1,
      });

      if (res.ok) {
        props.onToast("追加対応を依頼しました（pending）");
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
      title={`追加対応（${props.paidRevisionCoins}コイン）`}
      description="無料修正回数を超えた場合、追加対応として扱います（pending確保）。"
      onClose={props.onClose}
    >
      <div className="space-y-3">
        <div className="rounded border border-white/10 bg-white/5 p-3 text-sm">
          <div className="opacity-80">
            これは「無料修正」ではなく、追加対応として扱います。コインは pending で確保されます。
          </div>
        </div>

        <CheckRow
          checked={checkUnderstand}
          onChange={setCheckUnderstand}
          label={`追加対応として ${props.paidRevisionCoins} コインを pending で確保することを理解しました`}
        />

        <Field label="追加対応コメント（自由入力・必須）">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            placeholder="追加対応として依頼したい内容（契約外に該当する範囲）"
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
