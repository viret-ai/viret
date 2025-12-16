// =====================================
// app/dashboard/moderation/assets/page.tsx
// 運営用：画像チェック（最小）
// - assets + asset_checks の最新結果を一覧で確認
// - 公開UIには一切出さない（運営だけの確認）
// - optional: assets.is_official_checked をON/OFFできる
// =====================================

import Link from "next/link";
import { redirect } from "next/navigation";
import Card from "@/components/ui/Card";
import { supabaseServer } from "@/lib/supabase-server";
import { getAssetPublicUrl } from "@/lib/storage";

type AssetRow = {
  id: string;
  owner_id: string | null;
  title: string | null;
  preview_path: string | null;
  created_at: string | null;
  is_official_checked?: boolean; // // 無い環境でも型的には許容
};

type AssetCheckRow = {
  id: string;
  asset_id: string;
  provider: string;
  status: string; // ok / review / blocked など
  score: number | null;
  c2pa_present: boolean;
  details: any;
  created_at: string;
};

function jpDateTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function badgeClassByStatus(status: string) {
  if (status === "ok") return "bg-slate-900 text-white";
  if (status === "review") return "bg-slate-200 text-slate-900";
  if (status === "blocked") return "bg-red-600 text-white";
  return "bg-slate-100 text-slate-700";
}

async function assertOfficial() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, handle")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    // // 取得に失敗したら安全側で閉じる
    redirect("/dashboard");
  }

  // // ここは「運営だけ」にしたいので official 以外は弾く
  if (profile?.role !== "official") {
    redirect("/dashboard");
  }

  return { supabase, userId: user.id, handle: profile?.handle ?? null };
}

async function fetchAssetsAndLatestChecks(limit: number) {
  const { supabase } = await assertOfficial();

  // // assets 側
  const { data: assetsData, error: assetsError } = await supabase
    .from("assets")
    .select("id, owner_id, title, preview_path, created_at, is_official_checked")
    .order("created_at", { ascending: false })
    .limit(limit);

  const assets = (assetsData ?? []) as AssetRow[];

  if (assetsError) {
    return { assets: [], checkMap: new Map<string, AssetCheckRow>(), error: assetsError };
  }

  if (assets.length === 0) {
    return { assets, checkMap: new Map<string, AssetCheckRow>(), error: null };
  }

  const assetIds = assets.map((a) => a.id);

  // // asset_checks 側：対象asset_id群の最新を “created_at desc” で取って、先頭だけ採用
  const { data: checksData, error: checksError } = await supabase
    .from("asset_checks")
    .select("id, asset_id, provider, status, score, c2pa_present, details, created_at")
    .in("asset_id", assetIds)
    .order("created_at", { ascending: false });

  const checkMap = new Map<string, AssetCheckRow>();

  if (!checksError && checksData) {
    for (const row of checksData as AssetCheckRow[]) {
      if (!checkMap.has(row.asset_id)) {
        checkMap.set(row.asset_id, row);
      }
    }
  }

  return { assets, checkMap, error: checksError ?? null };
}

// ===== optional: 公式チェック済みトグル（assets.is_official_checked がある場合のみ使う） =====
async function setOfficialChecked(formData: FormData) {
  "use server";

  const assetId = String(formData.get("assetId") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!assetId) return;

  const { supabase } = await assertOfficial();

  const nextBool = next === "true";

  // // このカラムが無いDBだとここでエラーになる
  await supabase.from("assets").update({ is_official_checked: nextBool }).eq("id", assetId);
}

export default async function ModerationAssetsPage() {
  const { handle } = await assertOfficial();
  const { assets, checkMap, error } = await fetchAssetsAndLatestChecks(60);

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)]">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] opacity-60">
              dashboard / moderation
            </div>
            <h1 className="text-lg font-semibold tracking-tight">
              画像チェック（運営用）
            </h1>
            <div className="mt-1 text-[12px] opacity-70">
              ログイン：{handle ? `@${handle}` : "official"}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[12px]">
            <Link href="/assets" className="underline opacity-70 hover:opacity-100">
              公開の素材一覧へ
            </Link>
            <Link href="/dashboard" className="underline opacity-70 hover:opacity-100">
              ダッシュボード
            </Link>
          </div>
        </div>

        {error && (
          <Card
            variant="ghost"
            className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-[11px] text-red-700"
          >
            <div className="font-semibold">Supabase エラー</div>
            <pre className="mt-1 whitespace-pre-wrap break-all">
              {JSON.stringify(error, null, 2)}
            </pre>
          </Card>
        )}

        {assets.length === 0 ? (
          <Card className="mt-6 px-4 py-6 text-sm opacity-70">
            素材がありません。
          </Card>
        ) : (
          <div className="mt-4 grid gap-3">
            {assets.map((a) => {
              const check = checkMap.get(a.id) ?? null;
              const previewUrl = a.preview_path ? getAssetPublicUrl(a.preview_path) : null;

              const hits =
                check?.details?.hits && Array.isArray(check.details.hits)
                  ? (check.details.hits as string[])
                  : [];

              const isChecked = Boolean(a.is_official_checked);

              return (
                <Card key={a.id} className="px-3 py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-3">
                      <div className="h-[88px] w-[88px] shrink-0 overflow-hidden bg-slate-100">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={a.title ?? "preview"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                            no preview
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {a.title ?? "(no title)"}
                        </div>

                        <div className="mt-1 text-[11px] text-slate-500">
                          asset: <span className="font-mono">{a.id}</span>
                        </div>

                        <div className="mt-1 text-[11px] text-slate-500">
                          created: {jpDateTime(a.created_at)}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span
                            className={[
                              "inline-flex items-center rounded px-2 py-[2px] font-semibold",
                              check ? badgeClassByStatus(check.status) : "bg-slate-100 text-slate-600",
                            ].join(" ")}
                            title={check ? `provider: ${check.provider}` : "未検査"}
                          >
                            {check ? `check: ${check.status}` : "check: none"}
                          </span>

                          <span className="inline-flex items-center rounded bg-slate-100 px-2 py-[2px] text-[10px] text-slate-700">
                            C2PA: {check ? (check.c2pa_present ? "あり" : "なし") : "-"}
                          </span>

                          {isChecked && (
                            <span className="inline-flex items-center rounded bg-emerald-600 px-2 py-[2px] text-[10px] font-semibold text-white">
                              公式チェック済み
                            </span>
                          )}
                        </div>

                        {hits.length > 0 && (
                          <div className="mt-2 rounded bg-slate-50 px-2 py-2 text-[10px] text-slate-600">
                            <div className="font-semibold text-slate-700">
                              C2PAヒント
                            </div>
                            <div className="mt-1 break-words">
                              {hits.join(", ")}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/assets/${a.id}`}
                          className="inline-flex items-center justify-center rounded bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white hover:bg-slate-800"
                        >
                          詳細を見る
                        </Link>

                        <Link
                          href={`/assets?view=${a.id}`}
                          className="inline-flex items-center justify-center rounded bg-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-900 hover:bg-slate-300"
                        >
                          モーダル表示
                        </Link>
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        ※ 下のボタンは assets.is_official_checked カラムが必要
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <form action={setOfficialChecked}>
                          <input type="hidden" name="assetId" value={a.id} />
                          <input type="hidden" name="next" value="true" />
                          <button
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-900 hover:bg-slate-50"
                            type="submit"
                          >
                            公式チェック済みにする
                          </button>
                        </form>

                        <form action={setOfficialChecked}>
                          <input type="hidden" name="assetId" value={a.id} />
                          <input type="hidden" name="next" value="false" />
                          <button
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-900 hover:bg-slate-50"
                            type="submit"
                          >
                            解除
                          </button>
                        </form>
                      </div>

                      {check?.created_at && (
                        <div className="text-[10px] text-slate-500">
                          last check: {jpDateTime(check.created_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
