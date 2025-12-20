// =====================================
// components/moderation/AssetCheckRow.tsx
// 運営用：assets 一覧の1行（サムネ＋最新チェック＋XMP/C2PA表示）
// - 「C2PAを見る」モーダル（要約＋raw）を追加
// =====================================

import Link from "next/link";
import Card from "@/components/ui/Card";
import { getAssetPublicUrl } from "@/lib/storage";
import C2paModalClient from "@/components/moderation/C2paModal.client";

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

function pickC2paSummary(check: AssetCheckRow | null) {
  const c2pa = check?.details?.c2pa ?? null;

  const present = Boolean(check?.c2pa_present || c2pa?.present);

  const detectedBy =
    (typeof c2pa?.detectedBy === "string" && c2pa.detectedBy) || null;

  const claimGenerator =
    (typeof c2pa?.claimGenerator === "string" && c2pa.claimGenerator) || null;

  const provenanceValid =
    typeof c2pa?.provenanceValid === "boolean" ? c2pa.provenanceValid : null;

  const assertions =
    Array.isArray(c2pa?.assertions) ? (c2pa.assertions as string[]) : [];

  const ingredients =
    Array.isArray(c2pa?.ingredients)
      ? (c2pa.ingredients as Array<{ title?: string; relationship?: string }>)
      : [];

  return { present, detectedBy, claimGenerator, provenanceValid, assertions, ingredients };
}

function pickC2paRaw(check: AssetCheckRow | null) {
  const raw = check?.details?.c2pa?.raw ?? null;
  return raw ?? null;
}

export default function AssetCheckRowCard(props: {
  asset: AssetRow;
  check: AssetCheckRow | null;
  onOfficialToggle: (next: boolean) => React.ReactNode;
}) {
  const a = props.asset;
  const check = props.check;

  const previewUrl = a.preview_path ? getAssetPublicUrl(a.preview_path) : null;

  const isChecked = Boolean(a.is_official_checked);

  const c2paDetectedBy =
    (check?.details?.c2pa?.detectedBy as string | undefined) ?? null;

  const xmpPresent =
    typeof check?.xmp_present === "boolean"
      ? check.xmp_present
      : Boolean(check?.details?.xmp?.present);

  const xmpSha =
    (typeof check?.xmp_sha256 === "string" && check.xmp_sha256) ||
    (typeof check?.details?.xmp?.sha256 === "string" && check.details.xmp.sha256) ||
    null;

  const xmpSnippet =
    (typeof check?.details?.xmp?.snippet === "string" && check.details.xmp.snippet) ||
    null;

  const c2paSummary = pickC2paSummary(check);
  const c2paRaw = pickC2paRaw(check);

  return (
    <Card className="px-3 py-3">
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
                  check
                    ? badgeClassByStatus(check.status)
                    : "bg-slate-100 text-slate-600",
                ].join(" ")}
                title={check ? `provider: ${check.provider}` : "未検査"}
              >
                {check ? `check: ${check.status}` : "check: none"}
              </span>

              <span className="inline-flex items-center rounded bg-slate-100 px-2 py-[2px] text-[10px] text-slate-700">
                C2PA: {check ? (check.c2pa_present ? "あり" : "なし") : "-"}
              </span>

              <span className="inline-flex items-center rounded bg-slate-100 px-2 py-[2px] text-[10px] text-slate-700">
                XMP: {check ? (xmpPresent ? "あり" : "なし") : "-"}
              </span>

              {isChecked && (
                <span className="inline-flex items-center rounded bg-emerald-600 px-2 py-[2px] text-[10px] font-semibold text-white">
                  公式チェック済み
                </span>
              )}
            </div>

            {(c2paDetectedBy || xmpSha) && (
              <div className="mt-2 rounded bg-slate-50 px-2 py-2 text-[10px] text-slate-600">
                <div className="font-semibold text-slate-700">メタヒント</div>

                {c2paDetectedBy && (
                  <div className="mt-1 break-words">
                    C2PA detectedBy:{" "}
                    <span className="font-mono">{c2paDetectedBy}</span>
                  </div>
                )}

                {xmpSha && (
                  <div className="mt-1 break-words">
                    XMP sha256: <span className="font-mono">{xmpSha}</span>
                  </div>
                )}

                {xmpSnippet && (
                  <details className="mt-2">
                    <summary className="cursor-pointer select-none text-[10px] text-slate-700">
                      XMP snippet
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-white px-2 py-2 text-[10px] text-slate-700">
                      {xmpSnippet}
                    </pre>
                  </details>
                )}
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

            <C2paModalClient raw={c2paRaw} summary={c2paSummary} />
          </div>

          <div className="mt-1 text-[10px] text-slate-500">
            ※ 下のボタンは assets.is_official_checked カラムが必要
          </div>

          <div className="flex flex-wrap gap-2">
            {props.onOfficialToggle(true)}
            {props.onOfficialToggle(false)}
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
}
