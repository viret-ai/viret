// =====================================
// app/dashboard/moderation/search-insights/page.tsx
// 検索インサイト（ランキング表示）
// - assets_search_events の集計RPCを呼び、需要ランキングを表示
// - 生ログは表示しない（プライバシー保護）
// - official のみ閲覧可（profiles.role === 'official'）
// =====================================

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { typography } from "@/lib/theme";

type SearchParams = {
  days?: string | string[];
};

function toSingle(v: string | string[] | undefined): string {
  if (!v) return "";
  return Array.isArray(v) ? v[0] ?? "" : v;
}

function clampDays(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 30;
  if (n <= 0) return 30;
  if (n > 365) return 365;
  return Math.floor(n);
}

type TagRankRow = { tag: string; cnt: number };
type QueryRankRow = { query: string; cnt: number };
type GapRow = {
  query: string;
  searches: number;
  avg_results: number;
  zero_rate: number;
};

function PillLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 rounded-none px-3 py-1.5 text-[12px] font-semibold",
        "border border-black/10 dark:border-white/10",
        "text-slate-900 dark:text-slate-100",
        active
          ? "bg-black/10 dark:bg-white/15"
          : "hover:bg-black/5 dark:hover:bg-white/10",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function RankTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto border border-black/10 dark:border-white/10">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/10">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold opacity-80">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-3 opacity-60" colSpan={headers.length}>
                データがありません（まだ検索ログが少ない可能性があります）
              </td>
            </tr>
          ) : (
            rows.map((r, idx) => (
              <tr
                key={idx}
                className="border-b border-black/5 dark:border-white/10 last:border-b-0"
              >
                {r.map((cell, cidx) => (
                  <td key={cidx} className="px-3 py-2 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function SearchInsightsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)]">
        <div className="mx-auto max-w-[1100px] px-4 py-6">
          <h1 className={typography("h1")}>検索インサイト</h1>
          <p className={typography("body") + " mt-4 opacity-70"}>
            このページはログインが必要です。
          </p>
          <div className="mt-4">
            <Link
              href="/login"
              className="
                inline-flex h-10 items-center rounded-none px-4 text-[13px] font-semibold
                border border-black/10 dark:border-white/10
                text-slate-900 dark:text-slate-100
                hover:bg-black/5 dark:hover:bg-white/10
              "
            >
              ログインへ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? null;

  if (role !== "official") {
    return (
      <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)]">
        <div className="mx-auto max-w-[1100px] px-4 py-6">
          <h1 className={typography("h1")}>検索インサイト</h1>
          <p className={typography("body") + " mt-4 opacity-70"}>
            このページは公式アカウントのみ閲覧できます。
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard"
              className="
                inline-flex h-10 items-center rounded-none px-4 text-[13px] font-semibold
                border border-black/10 dark:border-white/10
                text-slate-900 dark:text-slate-100
                hover:bg-black/5 dark:hover:bg-white/10
              "
            >
              ダッシュボードへ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const sp = await searchParams;
  const days = clampDays(toSingle(sp.days) || "30");

  const [{ data: tagRank }, { data: queryRank }, { data: gapRank }] =
    await Promise.all([
      supabase.rpc("get_popular_asset_search_tags", {
        since_days: days,
        limit_n: 20,
      }),
      supabase.rpc("get_popular_asset_search_queries", {
        since_days: days,
        limit_n: 20,
        min_len: 2,
      }),
      supabase.rpc("get_asset_search_supply_gap", {
        since_days: days,
        limit_n: 20,
        min_samples: 3,
      }),
    ]);

  const tagRows: TagRankRow[] = (tagRank as any) ?? [];
  const queryRows: QueryRankRow[] = (queryRank as any) ?? [];
  const gapRows: GapRow[] = (gapRank as any) ?? [];

  return (
    <main className="min-h-screen bg-[var(--v-bg)] text-[var(--v-text)]">
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className={typography("h1")}>検索インサイト</h1>
            <p className={typography("body") + " mt-1 opacity-60"}>
              検索ログの集計ランキング（生ログは表示しません）
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <PillLink
              href="/dashboard/moderation/search-insights?days=7"
              active={days === 7}
              label="直近7日"
            />
            <PillLink
              href="/dashboard/moderation/search-insights?days=30"
              active={days === 30}
              label="直近30日"
            />
            <PillLink
              href="/dashboard/moderation/search-insights?days=90"
              active={days === 90}
              label="直近90日"
            />
          </div>
        </div>

        <section className="mt-6">
          <h2 className={typography("h2")}>よく検索されるタグ</h2>
          <div className="mt-3">
            <RankTable
              headers={["#", "タグ", "回数"]}
              rows={tagRows.map((r, idx) => [
                <span key="n" className="opacity-60">
                  {idx + 1}
                </span>,
                <span key="t" className="font-semibold">
                  #{r.tag}
                </span>,
                <span key="c">{Number(r.cnt)}</span>,
              ])}
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className={typography("h2")}>よく検索されるワード</h2>
          <div className="mt-3">
            <RankTable
              headers={["#", "ワード", "回数"]}
              rows={queryRows.map((r, idx) => [
                <span key="n" className="opacity-60">
                  {idx + 1}
                </span>,
                <span key="q" className="font-semibold">
                  {r.query}
                </span>,
                <span key="c">{Number(r.cnt)}</span>,
              ])}
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className={typography("h2")}>供給不足（要生成候補）</h2>
          <p className={typography("body") + " mt-1 opacity-60"}>
            検索回数が一定以上あり、平均ヒット数が低いワードを上位表示
          </p>
          <div className="mt-3">
            <RankTable
              headers={["#", "ワード", "検索回数", "平均ヒット", "0件率"]}
              rows={gapRows.map((r, idx) => [
                <span key="n" className="opacity-60">
                  {idx + 1}
                </span>,
                <span key="q" className="font-semibold">
                  {r.query}
                </span>,
                <span key="s">{Number(r.searches)}</span>,
                <span key="a">{Number(r.avg_results).toFixed(2)}</span>,
                <span key="z">{(Number(r.zero_rate) * 100).toFixed(1)}%</span>,
              ])}
            />
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/dashboard/moderation/assets"
            className="
              inline-flex h-10 items-center rounded-none px-4 text-[13px] font-semibold
              border border-black/10 dark:border-white/10
              text-slate-900 dark:text-slate-100
              hover:bg-black/5 dark:hover:bg-white/10
            "
          >
            画像チェックへ
          </Link>

          <Link
            href="/dashboard"
            className="
              inline-flex h-10 items-center rounded-none px-4 text-[13px] font-semibold
              border border-black/10 dark:border-white/10
              text-slate-900 dark:text-slate-100
              hover:bg-black/5 dark:hover:bg-white/10
            "
          >
            ダッシュボードへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
