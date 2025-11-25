// =====================================
// components/ui/Calendar.tsx
// 月間カレンダー UI（出金スケジュール表示用）
// - lib/payoutSchedule.ts のロジックを使って、当月の 5 / 15 / 25 を描画
// - 青：ラベル日（5 / 15 / 25）
// - 緑：実際の振込日（前営業日補正後）
// - 赤：締切日（実振込日の前日）
// - ラベル日＝実振込日 → 斜めハーフ（／方向・左上が緑 / 右下が青）
// - 最終行に翌月の日付をうっすら表示（同じルールで色分け）
// - ◀▶ で前月 / 翌月に移動
// =====================================

"use client";

import { useMemo, useState } from "react";
import { resolveRadiusClass, themeConfig } from "@/lib/theme";
import {
  getPayoutSchedulesForMonth,
  type PayoutSchedule,
} from "@/lib/payoutSchedule";

type CalendarProps = {
  initialYear: number;
  initialMonth: number; // 1〜12
};

// 日付 → "YYYY-MM-DD"
function toDateString(y: number, m: number, d: number): string {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

// ハーフ用の背景（／方向・左上：緑 / 右下：青）
function getHalfBackground(subtle: boolean): string {
  // subtle: 翌月セルなど薄め表示
  // green-300 / blue-300 相当の色＋透明度だけ変える
  const green = subtle
    ? "rgba(134, 239, 172, 0.4)" // #86EFAC, 40%
    : "rgba(134, 239, 172, 0.8)"; // 単色セル(bg-green-300/80)と近い
  const blue = subtle
    ? "rgba(147, 197, 253, 0.4)" // #93C5FD, 40%
    : "rgba(147, 197, 253, 0.8)"; // 単色セル(bg-blue-300/80)と近い

  // to bottom right で「／」方向の境界線になる（左上→緑 / 右下→青）
  return `linear-gradient(to bottom right, ${green} 50%, ${blue} 50%)`;
}

export default function Calendar({ initialYear, initialMonth }: CalendarProps) {
  const radius = resolveRadiusClass(themeConfig.cornerRadius);

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  // 当月の 5 / 15 / 25 スケジュール
  const schedules = useMemo<PayoutSchedule[]>(() => {
    return getPayoutSchedulesForMonth(year, month);
  }, [year, month]);

  // 翌月（最終行のうっすら表示用）
  const { nextYear, nextMonth } = useMemo(() => {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    return { nextYear: y, nextMonth: m };
  }, [year, month]);

  const nextSchedules = useMemo<PayoutSchedule[]>(() => {
    return getPayoutSchedulesForMonth(nextYear, nextMonth);
  }, [nextYear, nextMonth]);

  // セット化（当月）
  const labelSet = useMemo(
    () => new Set(schedules.map((s) => s.labelDate)),
    [schedules]
  );
  const actualSet = useMemo(
    () => new Set(schedules.map((s) => s.actualPayoutDate)),
    [schedules]
  );
  const deadlineSet = useMemo(
    () => new Set(schedules.map((s) => s.deadlineDate)),
    [schedules]
  );

  // セット化（翌月）
  const nextLabelSet = useMemo(
    () => new Set(nextSchedules.map((s) => s.labelDate)),
    [nextSchedules]
  );
  const nextActualSet = useMemo(
    () => new Set(nextSchedules.map((s) => s.actualPayoutDate)),
    [nextSchedules]
  );
  const nextDeadlineSet = useMemo(
    () => new Set(nextSchedules.map((s) => s.deadlineDate)),
    [nextSchedules]
  );

  // カレンダーのベース情報
  const first = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const firstDay = first.getDay(); // 0(日)〜6(土)
  const last = useMemo(() => new Date(year, month, 0), [year, month]);
  const lastDay = last.getDate(); // 当月末日
  const totalCells = 42; // 7 × 6 固定
  const blanks = firstDay;
  const days = lastDay;
  const nextMonthCells = Math.max(0, totalCells - (blanks + days));

  const movePrev = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const moveNext = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // ===== セル描画ヘルパー =====

  type CellKind = "none" | "label" | "actual" | "deadline" | "half";

  const todayStr = useMemo(() => {
    const now = new Date();
    return toDateString(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );
  }, []);

  function renderCurrentDay(day: number) {
    const dateStr = toDateString(year, month, day);
    const isLabel = labelSet.has(dateStr);
    const isActual = actualSet.has(dateStr);
    const isDeadline = deadlineSet.has(dateStr);

    const isToday = dateStr === todayStr;

    let kind: CellKind = "none";

    if (isDeadline) {
      kind = "deadline"; // 赤が最優先
    } else if (isLabel && isActual) {
      kind = "half"; // ラベル＝実振込 → 斜めハーフ
    } else if (isActual) {
      kind = "actual";
    } else if (isLabel) {
      kind = "label";
    }

    // 今日の日付だけ、内側に濃いめの枠線（slate-700 相当）を引く
    const baseClasses =
      "flex h-8 items-center justify-center rounded text-[13px]" +
      (isToday
        ? " relative after:absolute after:inset-[0px] after:rounded after:border after:border-[#334155]"
        : "");

    if (kind === "deadline") {
      return (
        <div key={`day-${day}`} className={baseClasses + " bg-red-300/80"}>
          {day}
        </div>
      );
    }

    if (kind === "actual") {
      return (
        <div key={`day-${day}`} className={baseClasses + " bg-green-300/80"}>
          {day}
        </div>
      );
    }

    if (kind === "label") {
      return (
        <div key={`day-${day}`} className={baseClasses + " bg-blue-300/80"}>
          {day}
        </div>
      );
    }

    if (kind === "half") {
      const background = getHalfBackground(false);

      return (
        <div
          key={`day-${day}`}
          className={baseClasses}
          style={{ background }}
        >
          {day}
        </div>
      );
    }

    // 通常日
    return (
      <div key={`day-${day}`} className={baseClasses}>
        {day}
      </div>
    );
  }

  function renderNextDay(day: number) {
    const dateStr = toDateString(nextYear, nextMonth, day);
    const isLabel = nextLabelSet.has(dateStr);
    const isActual = nextActualSet.has(dateStr);
    const isDeadline = nextDeadlineSet.has(dateStr);

    let kind: CellKind = "none";

    if (isDeadline) {
      kind = "deadline";
    } else if (isLabel && isActual) {
      kind = "half";
    } else if (isActual) {
      kind = "actual";
    } else if (isLabel) {
      kind = "label";
    }

    const baseText = "text-[13px] text-slate-400";
    const baseClasses = `flex h-8 items-center justify-center rounded ${baseText}`;

    if (kind === "deadline") {
      return (
        <div
          key={`next-${day}`}
          className={baseClasses + " bg-red-200/40"}
        >
          {day}
        </div>
      );
    }

    if (kind === "actual") {
      return (
        <div
          key={`next-${day}`}
          className={baseClasses + " bg-green-200/40"}
        >
          {day}
        </div>
      );
    }

    if (kind === "label") {
      return (
        <div
          key={`next-${day}`}
          className={baseClasses + " bg-blue-200/40"}
        >
          {day}
        </div>
      );
    }

    if (kind === "half") {
      const background = getHalfBackground(true);

      return (
        <div
          key={`next-${day}`}
          className={baseClasses}
          style={{ background }}
        >
          {day}
        </div>
      );
    }

    return (
      <div key={`next-${day}`} className={baseClasses}>
        {day}
      </div>
    );
  }

  // ===== 描画本体 =====

  return (
    <div
      className={`w-full max-w-md ${radius} bg-[var(--v-card-bg)] p-4 shadow-sm`}
    >
      {/* ヘッダー（月表示＋ナビゲーション） */}
      <div className="mb-3 flex items-center justify-center gap-6 text-sm text-slate-700">
        <button
          type="button"
          onClick={movePrev}
          className="rounded px-2 py-1 text-slate-500 hover:bg-slate-200"
        >
          ◀
        </button>
        <div className="text-base font-semibold">
          {year}年 {month}月
        </div>
        <button
          type="button"
          onClick={moveNext}
          className="rounded px-2 py-1 text-slate-500 hover:bg-slate-200"
        >
          ▶
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 text-center text-[11px] text-slate-500">
        <div className="py-1 text-red-500">日</div>
        <div className="py-1">月</div>
        <div className="py-1">火</div>
        <div className="py-1">水</div>
        <div className="py-1">木</div>
        <div className="py-1">金</div>
        <div className="py-1 text-blue-500">土</div>
      </div>

      {/* 日付グリッド */}
      <div className="mt-1 grid grid-cols-7 gap-[2px] text-center">
        {/* 前月の空白セル */}
        {Array.from({ length: blanks }).map((_, i) => (
          <div key={`blank-${i}`} className="h-8" />
        ))}

        {/* 当月の日付 */}
        {Array.from({ length: days }).map((_, i) => renderCurrentDay(i + 1))}

        {/* 翌月の日付（薄く表示） */}
        {Array.from({ length: nextMonthCells }).map((_, i) =>
          renderNextDay(i + 1)
        )}
      </div>

      {/* 凡例 */}
      <div className="mt-3 space-y-1 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded bg-blue-300/80" />
          <span>ラベル日（5 / 15 / 25）</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded bg-green-300/80" />
          <span>実際の振込日（前営業日補正後）</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded bg-red-300/80" />
          <span>締切日（実振込日の前日）</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          ラベル日と実際の振込日が同じ日の場合は、
          セルが緑（左上）と青（右下）の斜めハーフ（「／」方向）で表示されます。
          最終行の翌月日付も、同じルールで薄めの色を使って表示しています。
          今日の日付はテキストと近い色の濃い枠線で強調表示しています。
        </div>
      </div>
    </div>
  );
}
