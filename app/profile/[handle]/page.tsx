// =====================================
// app/profile/[handle]/page.tsx
// 公開プロフィールページ（アイコン反映修正版）
// =====================================

import { notFound } from "next/navigation";
import Card from "@/components/ui/Card";
import { typography } from "@/lib/theme";
import { supabaseServer } from "@/lib/supabase-server";
import { getAssetPublicUrl } from "@/lib/storage";
import AssetsGrid from "@/app/assets/AssetsGrid";
import type { ProfileRole } from "@/lib/roles";
import { getRoleLabel } from "@/lib/roles";
import Avatar from "@/components/ui/Avatar";

type PageProps = {
  params: Promise<{ handle: string }>;
};

type ProfileRow = {
  id: string;
  handle: string;
  display_name: string | null;
  role: ProfileRole | null;
  avatar_url: string | null;
};

type AssetRow = {
  id: string;
  title: string;
  preview_path: string;
};

const DEFAULT_AVATAR_SRC = "/images/default-avatar.png";

export default async function ProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const supabase = await supabaseServer();

  // ---- プロフィール取得 ----
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, handle, display_name, role, avatar_url")
    .eq("handle", handle)
    .maybeSingle<ProfileRow>();

  if (profileError) notFound();
  if (!profile) notFound();

  // ---- 投稿素材一覧 ----
  const { data: assets } = await supabase
    .from("assets")
    .select("id, title, preview_path")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: true })
    .returns<AssetRow[]>();

  const items =
    assets?.map((a) => ({
      id: a.id,
      title: a.title,
      imageUrl: getAssetPublicUrl(a.preview_path),
    })) ?? [];

  // ---- 表示用の派生値 ----
  const displayName = profile.display_name || `@${profile.handle}`;
  const roleLabel = profile.role
    ? getRoleLabel(profile.role, "ja")
    : "ロール未設定";

  const isOfficial = profile.role === "official";

  // ★ avatar_url が null のときは fallback を使用（これが反映されない問題の修正点）
  const avatarSrc = profile.avatar_url || DEFAULT_AVATAR_SRC;

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)] px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* パンくず */}
        <header className="flex flex-col gap-4 border-b border-black/5 pb-4">
          <div className="text-[11px] text-slate-500">
            プロフィール /{" "}
            <span className="font-mono">@{profile.handle}</span>
          </div>

          {/* メインヘッダー */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* 左側：アイコン + 名前 */}
            <div className="flex items-start gap-4">
              <Avatar
                src={avatarSrc}           // ← ★ 常に string を渡す
                size={96}
                alt={`${displayName} のアイコン`}
              />

              <div className="space-y-2">
                {/* Display Name */}
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className={typography("h1")}>{displayName}</h1>

                  {isOfficial && (
                    <img
                      src="/images/badge.svg"
                      alt="公式バッジ"
                      className="ml-[0.2em] inline-block h-[1.4em] w-auto align-middle"
                    />
                  )}
                </div>

                {/* @handle + roletag */}
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
                  <span className="font-mono">@{profile.handle}</span>
                  <span className="inline-flex items-center rounded-full border border-slate-300 px-2.5 py-[3px] text-[11px]">
                    {roleLabel}
                  </span>
                </div>

                <p className={typography("caption") + " text-slate-500"}>
                  このユーザーが投稿した素材や実績を確認できます。
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 text-[12px] text-slate-500 md:items-end">
              <span>※ このページは公開プロフィールです。</span>
            </div>
          </div>
        </header>

        {/* 2カラム情報（未実装部分は固定文言） */}
        <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)]">
          <div className="space-y-3">
            <h2 className={typography("h2")}>対応できる作業内容</h2>
            <p className="text-[13px] text-slate-500">
              スキルカテゴリはまだ設定されていません。
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold text-slate-500">
                基本情報
              </h3>
              <dl className="space-y-1 text-[13px] text-slate-600">
                <div className="flex flex-wrap gap-2">
                  <dt className="w-24 shrink-0 text-slate-400">ロール</dt>
                  <dd>{roleLabel}</dd>
                </div>
                <div className="flex flex-wrap gap-2">
                  <dt className="w-24 shrink-0 text-slate-400">ハンドル</dt>
                  <dd className="font-mono">@{profile.handle}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold text-slate-500">
                使用ツール
              </h3>
              <p className="text-[13px] text-slate-500">
                使用ツールはまだ設定されていません。
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold text-slate-500">
                レタッチ受付状況
              </h3>
              <p className="text-[13px] text-slate-600">
                受付状況は未設定です。
              </p>
            </div>
          </div>
        </section>

        {/* 投稿素材 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={typography("h2")}>投稿素材</h2>
            <span className="text-[11px] text-slate-500">
              全 {items.length} 件
            </span>
          </div>

          {items.length === 0 ? (
            <Card className="mt-3 p-4 text-sm text-slate-600">
              まだ投稿された素材はありません。
            </Card>
          ) : (
            <AssetsGrid items={items} />
          )}
        </section>
      </div>
    </main>
  );
}
