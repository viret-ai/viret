// =====================================
// components/assets/AssetsSearchBar.tsx
// 素材検索バー（検索 / タグ絞り込み確定方式）
// - タグは「フィルタ条件」
// - タグ選択だけでは検索しない
// - 「検索 / タグで絞り込む」ボタンで確定
// - 「条件をすべて解除」：URLの確定条件（q/tags）を /assets に戻す（クリアの横）
// =====================================

"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  initialQuery: string;
  selectedTags: string[];
  seasonalTags: string[];
  popularTags: string[];
};

function uniq(list: string[]): string[] {
  return Array.from(new Set(list));
}

function toTagsParam(tags: string[]): string {
  return tags.join(",");
}

async function sendSearchLog(params: {
  q: string;
  tags: string[];
  resultCount?: number;
}) {
  try {
    await fetch("/api/assets/search-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: params.q,
        tags: params.tags,
        result_count: params.resultCount ?? null,
      }),
    });
  } catch {
    // UX優先：失敗しても無視
  }
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ? "true" : "false"}
      className={[
        "select-none rounded-none px-2 py-1 text-[12px] font-medium",
        "border border-black/10 dark:border-white/10",
        "hover:bg-black/5 dark:hover:bg-white/10",
        active ? "bg-black/10 dark:bg-white/15" : "bg-transparent",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Section({
  title,
  tags,
  selected,
  onToggle,
}: {
  title: string;
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="mb-1 text-[12px] font-semibold opacity-70">{title}</div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <Chip
            key={t}
            label={`#${t}`}
            active={selected.includes(t)}
            onClick={() => onToggle(t)}
          />
        ))}
      </div>
    </div>
  );
}

export default function AssetsSearchBar({
  initialQuery,
  selectedTags,
  seasonalTags,
  popularTags,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // 未確定状態
  const [q, setQ] = useState(initialQuery);
  const [tagsDraft, setTagsDraft] = useState<string[]>(uniq(selectedTags));

  // 確定済み（URL由来）
  const committedQ = initialQuery;
  const committedTags = useMemo(() => uniq(selectedTags), [selectedTags]);

  const hasCommittedCondition = useMemo(() => {
    return committedQ.trim() !== "" || committedTags.length > 0;
  }, [committedQ, committedTags]);

  const hasChanges = useMemo(() => {
    const qA = q.trim();
    const qB = committedQ.trim();

    const a = uniq(tagsDraft).slice().sort().join(",");
    const b = uniq(committedTags).slice().sort().join(",");

    return qA !== qB || a !== b;
  }, [q, committedQ, tagsDraft, committedTags]);

  const tagCount = uniq(tagsDraft).length;

  const isTagOnly = q.trim() === "" && tagCount > 0;

  const submitLabel = isTagOnly ? `タグで絞り込む（${tagCount}）` : "検索";

  const applyCommitted = async (nextQuery: string, nextTags: string[]) => {
    const params = new URLSearchParams(sp.toString());

    const qTrim = nextQuery.trim();
    const tagsUniq = uniq(nextTags).filter(Boolean);

    if (qTrim) params.set("q", qTrim);
    else params.delete("q");

    if (tagsUniq.length > 0) params.set("tags", toTagsParam(tagsUniq));
    else params.delete("tags");

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);

    await sendSearchLog({
      q: qTrim,
      tags: tagsUniq,
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;
    await applyCommitted(q, tagsDraft);
  };

  const toggleTagDraft = (tag: string) => {
    setTagsDraft((prev) => {
      const cur = uniq(prev);
      return cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag];
    });
  };

  const clearDraft = () => {
    setQ("");
    setTagsDraft([]);
  };

  const clearAllCommitted = async () => {
    // // “条件をすべて解除”＝確定条件（URL）を /assets に戻す
    setQ("");
    setTagsDraft([]);
    router.replace(pathname);

    await sendSearchLog({
      q: "",
      tags: [],
    });
  };

  return (
    <div className="rounded-none border border-black/10 dark:border-white/10 p-3">
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="作品名・説明で検索"
            className="
              h-10 w-full sm:w-[420px]
              rounded-none
              border border-black/10 dark:border-white/10
              bg-transparent
              px-3 text-[14px]
              outline-none
              focus:border-black/30 dark:focus:border-white/30
            "
          />

          <button
            type="submit"
            disabled={!hasChanges}
            className="
              h-10 rounded-none px-4 text-[13px] font-semibold
              border border-black/10 dark:border-white/10
              hover:bg-black/5 dark:hover:bg-white/10
              disabled:opacity-40 disabled:hover:bg-transparent
            "
            aria-disabled={!hasChanges ? "true" : "false"}
          >
            {submitLabel}
          </button>

          <button
            type="button"
            onClick={clearDraft}
            className="
              h-10 rounded-none px-4 text-[13px] font-semibold
              border border-black/10 dark:border-white/10
              hover:bg-black/5 dark:hover:bg-white/10
            "
          >
            クリア
          </button>

          {hasCommittedCondition && (
            <button
              type="button"
              onClick={clearAllCommitted}
              className="
                h-10 rounded-none px-4 text-[13px] font-semibold
                border border-black/10 dark:border-white/10
                hover:bg-black/5 dark:hover:bg-white/10
                whitespace-nowrap
              "
              title="検索条件をすべて解除"
            >
              条件をすべて解除
            </button>
          )}
        </div>

        {tagCount > 0 && (
          <div className="mt-1">
            <div className="mb-1 text-[12px] font-semibold opacity-70">
              タグで絞り込む（未確定）
            </div>
            <div className="flex flex-wrap gap-2">
              {uniq(tagsDraft).map((t) => (
                <Chip
                  key={t}
                  label={`#${t}`}
                  active
                  onClick={() => toggleTagDraft(t)}
                />
              ))}
            </div>
            <div className="mt-1 text-[12px] opacity-60">
              ※ 「{submitLabel}」を押すまで反映されません
            </div>
          </div>
        )}

        <Section
          title="季節のタグ"
          tags={seasonalTags}
          selected={uniq(tagsDraft)}
          onToggle={toggleTagDraft}
        />

        <Section
          title="よく検索されるタグ"
          tags={popularTags}
          selected={uniq(tagsDraft)}
          onToggle={toggleTagDraft}
        />
      </form>
    </div>
  );
}
