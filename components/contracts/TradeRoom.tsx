// =====================================
// components/contracts/TradeRoom.tsx
// 取引ルーム UI（Client / Orchestrator）
// - レイアウトと状態（open/close, toast）だけ持つ
// - 実処理は各モーダル側に寄せて肥大化を防ぐ
// =====================================

"use client";

import { useMemo, useState, useTransition } from "react";
import type { ContractRoomBundle, JobMessageRow, JobDeliveryRow } from "@/lib/contracts/queries";
import Card from "@/components/ui/Card";

import TradeRoomLeft from "@/components/contracts/trade-room/TradeRoomLeft";
import TradeRoomChat from "@/components/contracts/trade-room/TradeRoomChat";

import DeliveryBoxModal from "@/components/contracts/trade-room/modals/DeliveryBoxModal";
import RevisionRequestModal from "@/components/contracts/trade-room/modals/RevisionRequestModal";
import PaidRevisionModal from "@/components/contracts/trade-room/modals/PaidRevisionModal";
import SupportModal from "@/components/contracts/trade-room/modals/SupportModal";

type Props = {
  bundle: ContractRoomBundle;
  viewerId: string;
};

const FREE_REVISION_MAX = 2;
// 有料追加対応の固定コイン（まず仮）
const PAID_REVISION_COINS = 200;

function countRevisionRequests(messages: JobMessageRow[]) {
  return messages.filter((m) => m.kind === "revision_note").length;
}

function latestDelivery(deliveries: JobDeliveryRow[]) {
  return deliveries.length > 0 ? deliveries[0] : null;
}

export default function TradeRoom({ bundle, viewerId }: Props) {
  const job = bundle.job;
  const role = bundle.roleInThisJob;

  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const revisionCount = useMemo(() => countRevisionRequests(bundle.messages), [bundle.messages]);
  const remainingFree = Math.max(0, FREE_REVISION_MAX - revisionCount);

  const latest = useMemo(() => latestDelivery(bundle.deliveries), [bundle.deliveries]);

  // -----------------------
  // Modal open states
  // -----------------------
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [paidRevisionOpen, setPaidRevisionOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 左ペイン */}
      <div className="space-y-4">
        <TradeRoomLeft bundle={bundle} />
      </div>

      {/* 右ペイン（サマリ＋チャット＋操作） */}
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

        <TradeRoomChat
          bundle={bundle}
          role={role}
          isPending={isPending}
          revisionCount={revisionCount}
          freeRevisionMax={FREE_REVISION_MAX}
          paidRevisionCoins={PAID_REVISION_COINS}
          latestDeliveryExists={!!latest}
          onOpenDelivery={() => setDeliverOpen(true)}
          onOpenRevision={() => setRevisionOpen(true)}
          onOpenPaidRevision={() => setPaidRevisionOpen(true)}
          onOpenSupport={() => setSupportOpen(true)}
          onToast={(m) => setToast(m)}
          viewerId={viewerId}
          startTransition={startTransition}
        />

        {toast ? (
          <Card className="p-3">
            <div className="text-sm">
              {toast}
              <button className="ml-3 underline opacity-80" onClick={() => setToast(null)}>
                閉じる
              </button>
            </div>
          </Card>
        ) : null}
      </div>

      {/* -----------------------
          Modals
         ----------------------- */}

      <DeliveryBoxModal
        open={deliverOpen}
        onClose={() => setDeliverOpen(false)}
        bundle={bundle}
        viewerId={viewerId}
        latestDelivery={latest}
        isPending={isPending}
        startTransition={startTransition}
        onToast={(m) => setToast(m)}
      />

      <RevisionRequestModal
        open={revisionOpen}
        onClose={() => setRevisionOpen(false)}
        bundle={bundle}
        viewerId={viewerId}
        isPending={isPending}
        startTransition={startTransition}
        revisionCount={revisionCount}
        freeRevisionMax={FREE_REVISION_MAX}
        onToast={(m) => setToast(m)}
      />

      <PaidRevisionModal
        open={paidRevisionOpen}
        onClose={() => setPaidRevisionOpen(false)}
        bundle={bundle}
        viewerId={viewerId}
        isPending={isPending}
        startTransition={startTransition}
        revisionCount={revisionCount}
        paidRevisionCoins={PAID_REVISION_COINS}
        onToast={(m) => setToast(m)}
      />

      <SupportModal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        bundle={bundle}
        viewerId={viewerId}
        isPending={isPending}
        startTransition={startTransition}
        onToast={(m) => setToast(m)}
      />
    </div>
  );
}
