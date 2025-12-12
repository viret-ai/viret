// =====================================
// components/jobs/EntryAssignButton.tsx
// 応募一覧用「採用する」ボタン（確認ダイアログ付き）
// - assign API を叩いて契約開始
// - 成功したら /jobs/{retouchJobId}/hired へ遷移
// =====================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  retouchJobId: string;
  entryId: string;
  disabled?: boolean;
};

export default function EntryAssignButton({
  retouchJobId,
  entryId,
  disabled,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || loading) return;

    const ok = window.confirm(
      "この応募者を採用して契約を開始しますか？\n\n採用後は他の応募は自動的に不採用となります。"
    );
    if (!ok) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/retouch-jobs/${retouchJobId}/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ entryId }),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          (json && json.error) ||
          "応募者の採用処理に失敗しました。";
        alert(msg);
        setLoading(false);
        return;
      }

      // 成功 → 完了画面へ
      router.push(`/jobs/${retouchJobId}/hired`);
    } catch (e) {
      console.error(e);
      alert("通信エラーが発生しました。");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold",
        disabled || loading
          ? "border border-slate-300 text-slate-400 cursor-not-allowed"
          : "border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white",
      ].join(" ")}
    >
      {loading ? "採用処理中..." : "この応募者を採用する"}
    </button>
  );
}
