/**
 * 農曆 ⇄ 公曆換算 —— **只做曆法，不做命理**。
 *
 * ★ 2026-08-05 抽出來的原因：
 *   1) 原生 App 的農曆起盤一直得繞回網頁層，因為 Swift 側沒有 lunar-javascript 的
 *      換算能力。`POST /api/lunar-to-solar` 讓原生一次 HTTP 拿到公曆日期，
 *      這是拆 WebView 的一個真障礙。
 *   2) 換算口徑此前只長在 `lib/ziwei/share.ts` 裡（表單專用）。接口再抄一份
 *      就會有兩套閏月規則，所以統一收到這裡，share.ts 改成調用本模塊。
 *
 * 口徑（沿用 lunar-javascript 與 share.ts 原有寫法，未做任何改動）：
 *   · 閏月用**負月份**表示：閏五月 = -5。
 *   · 月天數與閏月是否存在，一律查 `LunarMonth` 表，不用公曆的月長去猜。
 *
 * ⚠️ 這裡**不許**出現排盤 / 時辰 / 真太陽時 / 四化 任何一行。
 *    那些屬於 lib/ziwei/algorithm.ts 與 /api/generate，別順手塞進來。
 */
import { Lunar, LunarMonth } from 'lunar-javascript';

export interface SolarDate {
  year: number;
  month: number;
  day: number;
}

/** 與 /api/generate 對齊的受理年份區間，超出直接判非法（lunar 表在極端年份不可靠） */
export const LUNAR_YEAR_MIN = 1900;
export const LUNAR_YEAR_MAX = 2050;

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/**
 * 該農曆年該月的天數（29 或 30）。
 * 月份不存在（例如那年根本沒有閏四月）返回 0。
 */
export function lunarMonthDayCount(year: number, month: number, isLeapMonth = false): number {
  if (!isIntInRange(year, LUNAR_YEAR_MIN, LUNAR_YEAR_MAX) || !isIntInRange(month, 1, 12)) return 0;
  try {
    const lunarMonth = LunarMonth.fromYm(year, isLeapMonth ? -month : month);
    const dayCount = lunarMonth?.getDayCount();
    return typeof dayCount === 'number' && Number.isInteger(dayCount) && dayCount > 0 ? dayCount : 0;
  } catch {
    return 0;
  }
}

/** 該農曆年的閏月月份（1-12）；無閏月返回 0 */
export function leapMonthOfLunarYear(year: number): number {
  if (!isIntInRange(year, LUNAR_YEAR_MIN, LUNAR_YEAR_MAX)) return 0;
  for (let month = 1; month <= 12; month++) {
    if (lunarMonthDayCount(year, month, true) > 0) return month;
  }
  return 0;
}

/** 農曆日期是否真實存在（含閏月是否存在、當月是否有這一天） */
export function isValidLunarDate(year: number, month: number, day: number, isLeapMonth = false): boolean {
  if (!isIntInRange(day, 1, 30)) return false;
  const dayCount = lunarMonthDayCount(year, month, isLeapMonth);
  return dayCount > 0 && day <= dayCount;
}

/**
 * 農曆 → 公曆。輸入非法（年份越界 / 閏月不存在 / 當月沒這天）一律返回 null，
 * **絕不靜默滾動到相鄰日期**——那會讓用戶排到一張錯盤還不知道。
 */
export function lunarToSolar(year: number, month: number, day: number, isLeapMonth = false): SolarDate | null {
  if (!isValidLunarDate(year, month, day, isLeapMonth)) return null;
  try {
    const solar = Lunar.fromYmd(year, isLeapMonth ? -month : month, day).getSolar();
    const result = { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
    if (!Number.isInteger(result.year) || !Number.isInteger(result.month) || !Number.isInteger(result.day)) return null;
    return result;
  } catch {
    return null;
  }
}
