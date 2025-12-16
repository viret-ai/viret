// =====================================
// components/contracts/trade-room/TradeRoomChat.tsx
// 右ペイン（チャット表示＋アクションボタン群）
// - “自由入力”はモーダル側だけ
// =====================================

"use client";

import type { ContractRoomBundle, JobMessageRow } from "@/lib/contracts/queries";
import Card from "@/components/ui/Card";
import { acceptDelivery } from "@/lib/contracts/actions";

type RoleInJob = "owner" | "retoucher" | "other";

type Props = {
  bundle: ContractRoomBundle;
  role: RoleInJob;
  isPending: boolean;

  revisionCount: number;
  freeRevisionMax: number;
  paidRevisionCoins: number;

  latestDeliveryExists: boolean;

  onOpenDelivery: () => void;
  onOpenRevision: () => void;
  onOpenPaidRevision: () => void;
  onOpenSupport: () => void;

  onToast: (msg: string) => void;

  viewerId: string;
  startTransition: (fn: () => void) => void;
};

export default function TradeRoomChat(props: Props) {
  const { bundle, role, isPending } = props;
  const job = bundle.job;

  const disabledByStatus = job.status === "completed" || job.status === "cancelled";

  const submitAccept = async () => {
    if (!props.latestDeliveryExists) {
      props.onToast("受取確認できる納品がありません");
      return;
    }

    props.startTransition(async () => {
      const latest = bundle.deliveries.length > 0 ? bundle.deliveries[0] : null;
      if (!latest) {
        props.onToast("受取確認できる納品がありません");
        return;
      }

      const res = await acceptDelivery({
        jobId: job.id,
        ownerId: props.viewerId,
        deliveryId: latest.id,
      });

      props.onToast(res.ok ? "受取確認しました（取引完了）" : res.error ?? "処理に失敗しました");
    });
  };

  return (
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
            onClick={props.onOpenDelivery}
            disabled={isPending || disabledByStatus}
          >
            納品する
          </button>
        ) : null}

        {role === "owner" ? (
          <>
            {props.revisionCount < props.freeRevisionMax ? (
              <button
                className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                onClick={props.onOpenRevision}
                disabled={isPending || disabledByStatus}
              >
                修正を依頼（無料）
              </button>
            ) : (
              <button
                className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                onClick={props.onOpenPaidRevision}
                disabled={isPending || disabledByStatus}
              >
                追加対応（{props.paidRevisionCoins}コイン）
              </button>
            )}

            <button
              className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
              onClick={submitAccept}
              disabled={isPending || !props.latestDeliveryExists || disabledByStatus}
            >
              受取確認（取引完了）
            </button>
          </>
        ) : null}

        <button
          className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
          onClick={props.onOpenSupport}
          disabled={isPending}
        >
          運営に相談
        </button>
      </div>
    </Card>
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
    return `修正依頼を受け付けました${typeof c === "number" ? `（${c}回目）` : ""}${
      free === true ? "（無料）" : ""
    }`;
  }
  if (k === "paid_revision_requested") {
    const coins = m.meta?.costCoins;
    return `追加対応を依頼しました（pending）${
      typeof coins === "number" ? `（${coins}コイン）` : ""
    }`;
  }
  if (k === "accepted") return "受取確認しました。取引完了です。";
  if (k === "support_ticket_created") return "運営に相談を送信しました。";

  return `system: ${k}`;
}
