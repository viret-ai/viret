// =====================================
// app/profile/[username]/page.tsx
// 公開プロフィールページ（外向き）
// - buyer / seller / retoucher 共通
// =====================================

import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import Card from "@/components/ui/Card";
import { typography } from "@/lib/theme";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PageProps) {
  // Next.js 16 → params は Promise
  const { username } = await params;

  // Supabase クライアント
  const supabase = await supabaseServer();

  // --------------------------------
  // 1) プロフィール取得
  // --------------------------------
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .eq("username", username)
    .maybeSingle();

  if (!data || error) {
    notFound();
  }

  const profile = data;

  // --------------------------------
  // 2) レンダリング
  // --------------------------------
  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-8 text-[var(--v-text)]">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* ヘッダー */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-200">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                  no avatar
                </div>
              )}
            </div>

            <div>
              <h1 className={typography("h2")}>
                {profile.display_name || profile.username}
              </h1>
              <p className="text-xs font-mono text-slate-500">
                @{profile.username}
              </p>
            </div>
          </div>

          {/* Bio */}
          <p
            className={`${typography(
              "body"
            )} text-sm opacity-80 whitespace-pre-wrap`}
          >
            {profile.bio || "自己紹介はまだ入力されていません。"}
          </p>
        </Card>

        {/* 今後：このユーザーの素材一覧 / 依頼応募 / 投稿作品 など */}
        <Card className="p-4 text-[11px] text-slate-500">
          このユーザーの投稿素材・レタッチ作品などは今後ここに追加されます。
        </Card>
      </div>
    </main>
  );
}
