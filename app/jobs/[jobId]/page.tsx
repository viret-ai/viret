// =====================================
// app/jobs/[jobId]/page.tsx
// レタッチ依頼画面：サーバー側ラッパー
// - URLパラメータ jobId を受け取る（※現状 assetId と同一として扱う）
// - assets テーブルから対象AI画像を取得
// - 画像URLやタイトルをクライアント側ピンUIに渡す
// =====================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getAssetPublicUrl } from "@/lib/storage";
import Card from "@/components/ui/Card";
import RetouchRequestEditor from "./RetouchRequestEditor";

type PageProps = {
  // Next.js 16 では params が Promise になるため await を想定
  params: Promise<{ jobId: string }>;
};

type AssetRow = {
  id: string;
  owner_id: string | null;
  title: string;
  preview_path: string;
  width: number | null;
  height: number | null;
};

export default async function JobPage({ params }: PageProps) {
  const { jobId } = await params;

  const supabase = await supabaseServer();

  // いまは「jobId = assetId」として assets から直接取得
  // 将来的に jobs テーブルを本接続するときはここで join する
  const { data, error } = await supabase
    .from("assets")
    .select(
      [
        "id",
        "owner_id",
        "title",
        "preview_path",
        "width",
        "height",
      ].join(","),
    )
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--v-bg)] px-4 py-6 text-[var(--v-text)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <Card className="border border-red-300 bg-red-50 px-4 py-3 text-[11px] text-red-700">
            <div className="font-semibold">assets 取得エラー</div>
            <pre className="mt-1 whitespace-pre-wrap break-all">
              {JSON.stringify(error, null, 2)}
            </pre>
            <div className="mt-3 text-xs">
              <Link href="/assets" className="text-sky-700 underline">
                素材一覧に戻る
              </Link>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  if (!data) {
    notFound();
  }

  const asset = data as AssetRow;
  const previewUrl = getAssetPublicUrl(asset.preview_path);

  return (
    <main className="min-h-screen bg-[var(--v-bg)] px-4 py-6 text-[var(--v-text)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* パンくず */}
        <header className="space-y-1">
          <div className="text-[11px] text-slate-500">
            <Link href="/assets" className="hover:underline">
              素材一覧
            </Link>
            <span className="mx-1">/</span>
            <Link href={`/assets/${asset.id}`} className="hover:underline">
              素材詳細
            </Link>
            <span className="mx-1 text-slate-400">/</span>
            <span>レタッチ依頼</span>
            <span className="mx-1 text-slate-400">/</span>
            <span className="font-mono text-slate-500">
              Job（asset）ID: {jobId}
            </span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            レタッチ内容の指定
          </h1>
          <p className="text-xs leading-relaxed text-slate-600">
            修正してほしい箇所にピンを置き、下部の「依頼詳細」に具体的な内容を入力してください。
          </p>
        </header>

        {/* ピンUI本体（クライアントコンポーネント） */}
        <RetouchRequestEditor
          jobId={jobId}
          assetId={asset.id}
          assetTitle={asset.title}
          previewUrl={previewUrl}
          originalWidth={asset.width ?? undefined}
          originalHeight={asset.height ?? undefined}
        />
      </div>
    </main>
  );
}
