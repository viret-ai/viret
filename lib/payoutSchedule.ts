// =====================================
// lib/payoutSchedule.ts
// 出金スケジュール（5・15・25）の計算ユーティリティ
// =====================================

export type PayoutSchedule = {
  // ラベル日（ユーザーに見せる振込予定日＝毎月 5 / 15 / 25）
  labelDate: string; // "YYYY-MM-DD"

  // 実際に振込処理をする日
  // ・平日の 5 / 15 / 25 → 当日
  // ・土日祝 → 直前の営業日
  actualPayoutDate: string; // "YYYY-MM-DD"

  // 出金申請の締切日（前日）
  // （23:59 までに申請した分が対象になる想定）
  deadlineDate: string; // "YYYY-MM-DD"
};

// ===== 日付ヘルパー =====

// "YYYY-MM-DD" → Date（ローカルタイム）
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  return new Date(y, m - 1, d);
}

// Date → "YYYY-MM-DD"
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, diff: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay(); // 0:日〜6:土
  return day === 0 || day === 6;
}

// 祝日判定（後で実装する想定。現状は false 固定）
// ※ 将来、祝日ライブラリや自前テーブルを差し込む。
function isHoliday(_date: Date): boolean {
  // TODO: 日本の祝日判定を実装する
  return false;
}

function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

// ===== 単体ロジック =====

// ラベル日から「実際の振込日」を計算する
// ・平日ならそのまま
// ・土日祝なら、直前の営業日までさかのぼる
export function getActualPayoutDateFromLabel(labelDateStr: string): string {
  let date = parseDate(labelDateStr);

  // 直前の営業日までさかのぼる
  while (!isBusinessDay(date)) {
    date = addDays(date, -1);
  }

  return formatDate(date);
}

// 実際の振込日から「締切日（前日）」を計算する
export function getDeadlineDateFromActual(actualDateStr: string): string {
  const actual = parseDate(actualDateStr);
  const deadline = addDays(actual, -1); // 前日（祝日でもそのまま）
  return formatDate(deadline);
}

// ===== メイン：次回スケジュール計算 =====

// baseDate 以降で、最も近い 5 / 15 / 25 の振込スケジュールを返す
// ・締切を過ぎていたラベル日はスキップして、次のラベル日に回す
export function calculateNextPayoutSchedule(
  baseDateInput: Date | string = new Date()
): PayoutSchedule {
  const baseDate =
    typeof baseDateInput === "string"
      ? parseDate(baseDateInput)
      : parseDate(formatDate(baseDateInput)); // 時刻を切り捨てて日付だけ扱う

  // ラベル日候補（当月と翌月まで見れば十分）
  const candidates: Date[] = [];
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth(); // 0-based

  const labelDays = [5, 15, 25];

  // 当月
  for (const day of labelDays) {
    candidates.push(new Date(year, month, day));
  }
  // 翌月
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  for (const day of labelDays) {
    candidates.push(new Date(nextYear, nextMonth, day));
  }

  // 早い日付順にソート（念のため）
  candidates.sort((a, b) => a.getTime() - b.getTime());

  for (const labelDate of candidates) {
    const labelStr = formatDate(labelDate);
    const actualStr = getActualPayoutDateFromLabel(labelStr);
    const deadlineStr = getDeadlineDateFromActual(actualStr);

    const deadlineDate = parseDate(deadlineStr);

    // baseDate が締切日「以前」なら、このラベル日が有効
    if (baseDate.getTime() <= deadlineDate.getTime()) {
      return {
        labelDate: labelStr,
        actualPayoutDate: actualStr,
        deadlineDate: deadlineStr,
      };
    }
  }

  // ここまで来るケースはほぼ無いが、保険としてさらに次々月5日を返す
  const fallback = new Date(nextYear, nextMonth + 1, 5);
  const labelStr = formatDate(fallback);
  const actualStr = getActualPayoutDateFromLabel(labelStr);
  const deadlineStr = getDeadlineDateFromActual(actualStr);

  return {
    labelDate: labelStr,
    actualPayoutDate: actualStr,
    deadlineDate: deadlineStr,
  };
}

// ===== 追加：カレンダー用ユーティリティ =====

// 指定した年・月の 5 / 15 / 25 について、
// ・labelDate（5 / 15 / 25）
// ・actualPayoutDate（前営業日補正後）
// ・deadlineDate（actual の前日）
// を 3件まとめて返す。
export function getPayoutSchedulesForMonth(
  year: number,
  month: number // 1-12
): PayoutSchedule[] {
  const labelDays = [5, 15, 25];
  const result: PayoutSchedule[] = [];

  for (const day of labelDays) {
    const labelDate = formatDate(new Date(year, month - 1, day));
    const actualPayoutDate = getActualPayoutDateFromLabel(labelDate);
    const deadlineDate = getDeadlineDateFromActual(actualPayoutDate);

    result.push({
      labelDate,
      actualPayoutDate,
      deadlineDate,
    });
  }

  return result;
}
