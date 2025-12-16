// =====================================
// components/contracts/trade-room/TradeRoomLeft.tsx
// 左ペイン（納品ログ / 追加対応 / 運営相談ログ）
// =====================================

"use client";

import type { ContractRoomBundle } from "@/lib/contracts/queries";
import Card from "@/components/ui/Card";

type Props = {
  bundle: ContractRoomBundle;
};

export default function TradeRoomLeft({ bundle }: Props) {
  const latest = bundle.deliveries.length > 0 ? bundle.deliveries[0] : null;

  return (
    <>
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
                <div className="opacity-70">created: {new Date(a.created_at).toLocaleString()}</div>
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
    </>
  );
}
