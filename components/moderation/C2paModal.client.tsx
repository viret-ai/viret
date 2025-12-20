// =====================================
// components/moderation/C2paModal.client.tsx
// 運営用：C2PA 詳細モーダル（A案）
// - 要約（claim generator / validity / assertions / ingredients）
// - Raw JSON を折りたたみで表示
// =====================================

"use client";

import { useMemo, useState } from "react";

type Props = {
  raw: any | null;
  summary: {
    present: boolean;
    detectedBy?: string | null;
    claimGenerator?: string | null;
    provenanceValid?: boolean | null;
    assertions?: string[];
    ingredients?: Array<{ title?: string | null; relationship?: string | null }>;
  };
};

function prettyJson(v: any): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export default function C2paModalClient(props: Props) {
  const [open, setOpen] = useState(false);

  const s = props.summary;

  const hasRaw = !!props.raw;

  const assertions = s.assertions ?? [];
  const ingredients = s.ingredients ?? [];

  const headerText = useMemo(() => {
    if (!s.present) return "C2PA: なし";
    const valid =
      typeof s.provenanceValid === "boolean"
        ? s.provenanceValid
          ? "有効"
          : "不明/無効"
        : "不明";
    return `C2PA: あり（Provenance: ${valid}）`;
  }, [s.present, s.provenanceValid]);

  return (
    <>
      <button
        type="button"
        className="rounded border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setOpen(true)}
        disabled={!s.present && !hasRaw}
        title={!s.present && !hasRaw ? "C2PA情報がありません" : "C2PA詳細を見る"}
      >
        C2PAを見る
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[980px] rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {headerText}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  ※ upload 時点で抽出した結果（sharp変換後のDL物にはC2PAは残りません）
                </div>
              </div>

              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                閉じる
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              {/* 要約 */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] font-semibold text-slate-700">
                    Summary
                  </div>

                  <div className="mt-2 space-y-1 text-[11px] text-slate-700">
                    <div>
                      <span className="text-slate-500">detectedBy: </span>
                      <span className="font-mono">
                        {s.detectedBy ?? "-"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500">claimGenerator: </span>
                      <span className="font-mono">
                        {s.claimGenerator ?? "-"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500">provenance: </span>
                      <span className="font-mono">
                        {typeof s.provenanceValid === "boolean"
                          ? s.provenanceValid
                            ? "valid"
                            : "invalid/unknown"
                          : "unknown"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] font-semibold text-slate-700">
                    Assertions / Ingredients
                  </div>

                  <div className="mt-2 space-y-2 text-[11px] text-slate-700">
                    <div>
                      <div className="text-slate-500">assertions</div>
                      <div className="mt-1 font-mono">
                        {assertions.length > 0 ? assertions.join(", ") : "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500">ingredients</div>
                      {ingredients.length === 0 ? (
                        <div className="mt-1 font-mono">-</div>
                      ) : (
                        <ul className="mt-1 list-disc pl-5 font-mono">
                          {ingredients.slice(0, 20).map((ing, idx) => (
                            <li key={idx}>
                              {ing.title ?? "(no title)"}{" "}
                              {ing.relationship ? `(${ing.relationship})` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                      {ingredients.length > 20 && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          ※ 表示は先頭20件まで
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* raw */}
              <div className="rounded border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-3 py-2">
                  <div className="text-[11px] font-semibold text-slate-700">
                    Raw C2PA JSON
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    ※ 解析結果の生データ（必要なときだけ確認）
                  </div>
                </div>

                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words px-3 py-3 text-[10px] text-slate-800">
                  {hasRaw ? prettyJson(props.raw) : "(no raw json)"}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
