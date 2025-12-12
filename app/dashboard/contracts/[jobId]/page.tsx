// =====================================
// app/dashboard/contracts/[jobId]/page.tsx
// 取引ルーム（メルカリ風）
// - jobs を主として、チャット(job_messages) / 納品履歴(job_deliveries) / 追加対応(job_paid_actions) / 相談(job_support_tickets) を表示
// - Next.js 16: params は Promise のため await する
// =====================================

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import TradeRoom from "@/components/contracts/TradeRoom";
import {
  getContractRoomBundle,
  type ContractRoomBundle,
} from "@/lib/contracts/queries";

type PageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function Page(props: PageProps) {
  const params = await props.params;
  const jobId = params.jobId;

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const bundle: ContractRoomBundle | null = await getContractRoomBundle({
    supabase,
    jobId,
    viewerId: user.id,
  });

  if (!bundle) {
    // 権限なし or 存在しない
    redirect("/dashboard/contracts");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <TradeRoom bundle={bundle} viewerId={user.id} />
    </div>
  );
}
