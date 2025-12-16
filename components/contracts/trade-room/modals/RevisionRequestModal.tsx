// =====================================
// components/contracts/trade-room/modals/RevisionRequestModal.tsx
// 修正依頼（無料）モーダル
// =====================================

"use client";

import { useState } from "react";
import type { ContractRoomBundle } from "@/lib/contracts/queries";
import { requestRevision } from "@/lib/contracts/actions";
import { Modal, Field, CheckRow } from "@/components/contracts/trade-room/ui/TradeRoomUI";

type Props = {
  open: boolean;
  onClose: () => void;

  bundle: ContractRoomBundle;
  viewerId: string;

  isPending: boolean;
  startTransition: (fn: () => void) => void;

  revisionCount: number;
  freeRevisionMax: number;

  onToast: (msg: string) => void;
};

export default function RevisionRequestModal(props: Props) {
  const job = props.bundle.job;

  const [checkInScope, setCheckInScope] = useState(false);
  const [checkNotNewRequest, setCheckNotNewRequest] = useState(false);
  const [checkSingleMessage, setCheckSingleMessage] = useState(false);
  const [body, setBody] = useState("");

  const reset = () => {
    setCheckInScope(false);
    setCheckNotNewRequest(false);
    setCheckSingleMessage(false);
    setBody("");
  };

  const submit = async () => {
    if (!checkInScope || !checkNotNewRequest || !checkSingleMessage) {
      props.onToast("チェック項目をすべて確認してください");
      return;
    }

    const t = body.trim();
    if (!t) {
      props.onToast("修正依頼コメントを入力してください");
      return;
    }

    props.startTransition(async () => {
      const res = await requestRevision({
        jobId: job.id,
        ownerId: props.viewerId,
        body: t,
        revisionCountNext: props.revisionCount + 1,
        remainingFreeNext: Math.max(0, props.freeRevisionMax - (props.revisionCount + 1)),
      });

      if (res.ok) {
        props.onToast("修正依頼を送信しました");
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
      title="修正依頼（無料）"
      description="契約（ピン）範囲内の修正のみ依頼できます。チェックは必須です。"
      onClose={props.onClose}
    >
      <div className="space-y-3">
        <div className="rounded border border-amber-300/40 bg-amber-50/10 p-3 text-sm">
          <div className="font-semibold">重要</div>
          <div className="mt-1 opacity-80">ピン外の要求は対応できません。新規依頼として投稿してください。</div>
        </div>

        <CheckRow checked={checkInScope} onChange={setCheckInScope} label="指摘箇所はピン範囲内です" />
        <CheckRow checked={checkNotNewRequest} onChange={setCheckNotNewRequest} label="新規追加（契約外）ではありません" />
        <CheckRow checked={checkSingleMessage} onChange={setCheckSingleMessage} label="指摘内容はまとめて記載します" />

        <Field label="修正依頼コメント（自由入力・必須）">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            placeholder="例：肌の色ムラを軽減、目尻のはみ出し修正…（ピン範囲内に限定）"
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
