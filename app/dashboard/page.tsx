// =====================================
// app/dashboard/page.tsx
// ログインユーザー専用ダッシュボード
// =====================================

import { supabaseServer } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen p-6">
        <h1 className="text-xl font-bold">ログインしてください</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-xl font-bold">ダッシュボード</h1>
      <p className="mt-2 text-neutral-300">{user.email}</p>
    </main>
  );
}
