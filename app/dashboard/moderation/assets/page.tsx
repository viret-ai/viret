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
import AssetCheckRowCard from "@/components/moderation/AssetCheckRow";

type AssetRow = {
  id: string;
  owner_id: string | null;
  title: string | null;
  preview_path: string | null;
  created_at: string | null;
  is_official_checked?: boolean;
};

type AssetCheckRow = {
  id: string;
  asset_id: string;
  provider: string;
  status: string;
  score: number | null;
  c2pa_present: boolean;
  xmp_present?: boolean;
  xmp_sha256?: string | null;
  details: any;
  created_at: string;
};

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
    redirect("/dashboard");
  }

  if (profile?.role !== "official") {
    redirect("/dashboard");
  }

  return { supabase, userId: user.id, handle: profile?.handle ?? null };
}

async function fetchAssetsAndLatestChecks(limit: number) {
  const { supabase } = await assertOfficial();

  const { data: assetsData, error: assetsError } = await supabase
    .from("assets")
    .select("id, owner_id, title, preview_path, created_at, is_official_checked")
    .order("created_at", { ascending: false })
    .limit(limit);

  const assets = (assetsData ?? []) as AssetRow[];

  if (assetsError) {
    return {
      assets: [],
      checkMap: new Map<string, AssetCheckRow>(),
      error: assetsError,
    };
  }

  if (assets.length === 0) {
    return { assets, checkMap: new Map<string, AssetCheckRow>(), error: null };
  }

  const assetIds = assets.map((a) => a.id);

  const { data: checksData, error: checksError } = await supabase
    .from("asset_checks")
    .select(
      "id, asset_id, provider, status, score, c2pa_present, xmp_present, xmp_sha256, details, created_at"
    )
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

  await supabase
    .from("assets")
    .update({ is_official_checked: nextBool })
    .eq("id", assetId);
}

export default async function ModerationAssetsPage() {
  const { handle } = await assertOfficial();
  const { assets, checkMap, error } = await fetchAssetsAndLatestChecks(60);

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)]">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] opacity-60">dashboard / moderation</div>
            <h1 className="text-lg font-semibold tracking-tight">
              画像チェック（運営用）
            </h1>
            <div className="mt-1 text-[12px] opacity-70">
              ログイン：{handle ? `@${handle}` : "official"}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[12px]">
            <Link
              href="/assets"
              className="underline opacity-70 hover:opacity-100"
            >
              公開の素材一覧へ
            </Link>
            <Link
              href="/dashboard"
              className="underline opacity-70 hover:opacity-100"
            >
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

              return (
                <AssetCheckRowCard
                  key={a.id}
                  asset={a}
                  check={check}
                  onOfficialToggle={(next) => (
                    <form action={setOfficialChecked}>
                      <input type="hidden" name="assetId" value={a.id} />
                      <input
                        type="hidden"
                        name="next"
                        value={next ? "true" : "false"}
                      />
                      <button
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-900 hover:bg-slate-50"
                        type="submit"
                      >
                        {next ? "公式チェック済みにする" : "解除"}
                      </button>
                    </form>
                  )}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
