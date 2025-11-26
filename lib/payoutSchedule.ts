// =====================================
// lib/payoutSchedule.ts
// 出金スケジュール（5・15・25）
// - 土日＋祝日＋金融機関休業日を除いた「営業日」
// =====================================

export type PayoutSchedule = {
  labelDate: string;        // "YYYY-MM-DD"（ユーザー表示用の 5 / 15 / 25）
  actualPayoutDate: string; // 直前営業日補正後
  deadlineDate: string;     // actual の前日
};

// ================================
// 基本ヘルパー
// ================================

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, diff: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ================================
// 金融機関休業日（年末年始）
// ================================
//
// 年末年始：12/31, 1/2, 1/3
// 元日は祝日扱いなので isHoliday 側で拾われる。
// ※25日・5日がたまたま当たる可能性は低いがロジックとして追加。

function isBankHoliday(date: Date): boolean {
  const m = date.getMonth() + 1; // 1-12
  const d = date.getDate();

  // 12/31
  if (m === 12 && d === 31) return true;

  // 1/2, 1/3
  if (m === 1 && (d === 2 || d === 3)) return true;

  return false;
}

// ================================
// 国民の祝日（簡易）
// ================================

// n番目の weekday を返す
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  nth: number
): Date {
  const first = new Date(year, month, 1);
  const firstDay = first.getDay();
  let diff = weekday - firstDay;
  if (diff < 0) diff += 7;
  const day = 1 + diff + (nth - 1) * 7;
  return new Date(year, month, day);
}

// 春分（概算）
function getVernalEquinoxDay(year: number): number {
  return (
    Math.floor(20.8431 + 0.242194 * (year - 1980)) -
    Math.floor((year - 1980) / 4)
  );
}

// 秋分（概算）
function getAutumnalEquinoxDay(year: number): number {
  return (
    Math.floor(23.2488 + 0.242194 * (year - 1980)) -
    Math.floor((year - 1980) / 4)
  );
}

// ベース祝日（振替等なし）
function isBaseNationalHoliday(date: Date): boolean {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  switch (m) {
    case 1:
      if (d === 1) return true; // 元日
      // 成人の日（1月第2月曜）
      if (y >= 2000) {
        const day = getNthWeekdayOfMonth(y, 0, 1, 2);
        if (isSameDate(date, day)) return true;
      }
      return false;

    case 2:
      if (d === 11) return true; // 建国記念日
      if (y >= 2020 && d === 23) return true; // 天皇誕生日
      return false;

    case 3:
      if (d === getVernalEquinoxDay(y)) return true;
      return false;

    case 4:
      if (d === 29) return true; // 昭和の日
      return false;

    case 5:
      if (d === 3 || d === 4 || d === 5) return true;
      return false;

    case 7:
      if (y >= 2003) {
        const day = getNthWeekdayOfMonth(y, 6, 1, 3); // 海の日：7月第3月曜
        if (isSameDate(date, day)) return true;
      }
      return false;

    case 8:
      if (d === 11) return true; // 山の日
      return false;

    case 9:
      if (isSameDate(date, getNthWeekdayOfMonth(y, 8, 1, 3))) return true; // 敬老の日
      if (d === getAutumnalEquinoxDay(y)) return true; // 秋分の日
      return false;

    case 10:
      if (isSameDate(date, getNthWeekdayOfMonth(y, 9, 1, 2))) return true; // スポーツの日
      return false;

    case 11:
      if (d === 3 || d === 23) return true; // 文化の日 / 勤労感謝
      return false;

    default:
      return false;
  }
}

// 振替休日（祝日が日曜に当たったときの翌平日）
function isSubstituteHoliday(date: Date): boolean {
  const prev = addDays(date, -1);
  if (prev.getDay() !== 0) return false; // 前日が日曜のみ対象
  return isBaseNationalHoliday(prev);
}

// 国民の休日（祝日に挟まれた平日）
function isCitizensHoliday(date: Date): boolean {
  if (isBaseNationalHoliday(date) || isWeekend(date)) return false;

  const prev = addDays(date, -1);
  const next = addDays(date, 1);

  const prevHoliday =
    isBaseNationalHoliday(prev) || isSubstituteHoliday(prev);
  const nextHoliday =
    isBaseNationalHoliday(next) || isSubstituteHoliday(next);

  return prevHoliday && nextHoliday;
}

// トータル祝日判定
function isHoliday(date: Date): boolean {
  if (isBaseNationalHoliday(date)) return true;
  if (isSubstituteHoliday(date)) return true;
  if (isCitizensHoliday(date)) return true;
  return false;
}

// ================================
// 営業日（週末＋祝日＋銀行休業日を除外）
// ================================

function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date) && !isBankHoliday(date);
}

// ================================
// メインロジック
// ================================

// ラベル日 → 実振込日（直前営業日まで戻る）
export function getActualPayoutDateFromLabel(labelDateStr: string): string {
  let date = parseDate(labelDateStr);

  while (!isBusinessDay(date)) {
    date = addDays(date, -1);
  }

  return formatDate(date);
}

// 実振込日 → 締切日（前日）
export function getDeadlineDateFromActual(actualDateStr: string): string {
  const actual = parseDate(actualDateStr);
  return formatDate(addDays(actual, -1));
}

// baseDate 以降で最も近い 5/15/25
export function calculateNextPayoutSchedule(
  baseDate: Date | string = new Date()
): PayoutSchedule {
  const base =
    typeof baseDate === "string"
      ? parseDate(baseDate)
      : parseDate(formatDate(baseDate));

  const y = base.getFullYear();
  const m = base.getMonth(); // 0-based
  const labelDays = [5, 15, 25];

  const candidates: Date[] = [];

  // 当月
  for (const d of labelDays) candidates.push(new Date(y, m, d));

  // 翌月
  const nm = m === 11 ? 0 : m + 1;
  const ny = m === 11 ? y + 1 : y;
  for (const d of labelDays) candidates.push(new Date(ny, nm, d));

  candidates.sort((a, b) => a.getTime() - b.getTime());

  for (const labelDate of candidates) {
    const labelStr = formatDate(labelDate);
    const actualStr = getActualPayoutDateFromLabel(labelStr);
    const deadlineStr = getDeadlineDateFromActual(actualStr);

    if (base.getTime() <= parseDate(deadlineStr).getTime()) {
      return { labelDate: labelStr, actualPayoutDate: actualStr, deadlineDate: deadlineStr };
    }
  }

  // 保険（次々月5日）
  const fallback = new Date(ny, nm + 1, 5);
  const labelStr = formatDate(fallback);
  const actualStr = getActualPayoutDateFromLabel(labelStr);
  const deadlineStr = getDeadlineDateFromActual(actualStr);
  return { labelDate: labelStr, actualPayoutDate: actualStr, deadlineDate: deadlineStr };
}

// 指定月の 5/15/25 を返す
export function getPayoutSchedulesForMonth(
  year: number,
  month: number
): PayoutSchedule[] {
  const days = [5, 15, 25];
  return days.map((d) => {
    const label = formatDate(new Date(year, month - 1, d));
    const actual = getActualPayoutDateFromLabel(label);
    const deadline = getDeadlineDateFromActual(actual);
    return { labelDate: label, actualPayoutDate: actual, deadlineDate: deadline };
  });
}
