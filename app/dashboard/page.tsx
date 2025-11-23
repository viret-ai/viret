// =====================================
// app/dashboard/page.tsx
// ログインユーザー専用ダッシュボード（theme.ts 対応）
// =====================================

import { supabaseServer } from "@/lib/supabase-server";
import Card from "@/components/ui/Card";
import {
  getTypographyClasses,
  getTypographyStyle,
} from "@/lib/theme";

export default async function DashboardPage() {
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  // -------------------------------
  // 非ログイン時
  // -------------------------------
  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--v-bg)] px-4 py-8">
        <div className="mx-auto max-w-xl">
          <Card className="text-center py-8">
            <h1
              className={getTypographyClasses("h2")}
              style={getTypographyStyle("h2")}
            >
              ログインしてください
            </h1>
            <p
              className="mt-2 text-slate-600 text-sm"
              style={getTypographyStyle("body")}
            >
              このページにアクセスするにはログインが必要です。
            </p>
          </Card>
        </div>
      </main>
    );
  }

  // -------------------------------
  // ログイン済み時
  // -------------------------------
  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1
            className={getTypographyClasses("h1")}
            style={getTypographyStyle("h1")}
          >
            ダッシュボード
          </h1>
          <p
            className="mt-1 text-slate-600 text-sm"
            style={getTypographyStyle("body")}
          >
            ログイン中：{user.email}
          </p>
        </div>

        {/* 今後メニューが増えることを想定して Card を分離 */}
        <Card className="space-y-3">
          <h2
            className={getTypographyClasses("h2")}
            style={getTypographyStyle("h2")}
          >
            アカウント情報
          </h2>

          <div className="text-sm text-slate-700" style={getTypographyStyle("body")}>
            <div className="flex justify-between border-b border-slate-200 py-1">
              <span className="text-[11px] text-slate-500">ユーザーID</span>
              <span className="font-mono">{user.id}</span>
            </div>

            <div className="flex justify-between border-b border-slate-200 py-1 mt-2">
              <span className="text-[11px] text-slate-500">メール</span>
              <span>{user.email}</span>
            </div>
          </div>

          <p
            className="mt-2 text-[11px] text-slate-500"
            style={getTypographyStyle("caption")}
          >
            ※ 今後ここに「投稿一覧」「レタッチ応募」「購入履歴」などを追加予定です。
          </p>
        </Card>
      </div>
    </main>
  );
}
