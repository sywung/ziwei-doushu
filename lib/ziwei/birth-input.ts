/**
 * 表單輸入 → 排盤用公曆日期與時辰
 *
 * 1. 農曆輸入先換成公曆（閏月要該年真有此閏月，日數不超過該月天數）
 * 2. 當地鐘錶比 UTC+8 快（台灣夏令時、日治時期 UTC+9）時先減回標準時間
 * 3. 有出生地才做真太陽時（經度修正 + 均時差）；沒有就照鐘錶時間
 * 4. 真太陽時跨日、晚子時（23:00 後）是否算次日，統一交給 resolveZiweiDayOffset 按流派決定
 *
 * 命盤頁與合盤頁共用這一份，避免兩邊同一個出生時間排出不同的盤。
 */
import { Lunar, LunarMonth } from 'lunar-javascript';
import {
  calculateTrueSolarTime, isValidGregorianDate, resolveZiweiDayOffset, shiftGregorianDate,
  type GregorianDate, type LateZishiRule, type TrueSolarTimeResult,
} from './true-solar-time';

export type CalendarKind = 'solar' | 'lunar';

export const LUNAR_MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
export const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

/** 該農曆年的閏月（1–12），沒有閏月回 0 */
export function lunarLeapMonth(year: number): number {
  for (let m = 1; m <= 12; m++) if (LunarMonth.fromYm(year, -m)) return m;
  return 0;
}

/** 農曆某月天數（29/30）；查無此月（如該年沒有這個閏月）回 null */
export function lunarMonthDays(year: number, month: number, isLeap: boolean): number | null {
  return LunarMonth.fromYm(year, isLeap ? -month : month)?.getDayCount() ?? null;
}

/** 農曆 → 公曆；日期不存在回 null */
export function lunarToSolar(year: number, month: number, day: number, isLeap: boolean): GregorianDate | null {
  const days = lunarMonthDays(year, month, isLeap);
  if (days === null || day < 1 || day > days) return null;
  const solar = Lunar.fromYmd(year, isLeap ? -month : month, day).getSolar();
  return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
}

export interface BirthMomentInput {
  calendar: CalendarKind;
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  unknownTime: boolean;
  clockHour: number;
  clockMinute: number;
  /** 沒選出生地時不傳，不做真太陽時校正 */
  longitude?: number;
  /** 該出生日當地鐘錶比 UTC+8 快幾分鐘（如台灣夏令時回 60）；不傳 = 0 */
  clockAheadMinutes?: (date: GregorianDate) => number;
}

export interface BirthMoment {
  /** 輸入換算出的公曆出生日（農曆輸入時即對應公曆日） */
  inputDate: GregorianDate;
  /** 排盤日：真太陽時跨日、晚子時換日之後 */
  chartDate: GregorianDate;
  /** 時辰支 0–11 */
  branch: number;
  /** 真太陽時細節；時辰不詳時為 null */
  solar: TrueSolarTimeResult | null;
  /** 實際從鐘錶時間減掉的分鐘數（夏令時等） */
  clockAheadMinutes: number;
}

/** 表單輸入 → 排盤日與時辰；日期不存在回 null */
export function resolveBirthMoment(input: BirthMomentInput, lateZishi: LateZishiRule = 'next-day'): BirthMoment | null {
  const inputDate = input.calendar === 'lunar'
    ? lunarToSolar(input.year, input.month, input.day, input.isLeapMonth)
    : isValidGregorianDate(input.year, input.month, input.day)
      ? { year: input.year, month: input.month, day: input.day }
      : null;
  if (!inputDate) return null;

  // 時辰不詳：以本日子時（早子）起盤，不換日
  if (input.unknownTime) return { inputDate, chartDate: inputDate, branch: 0, solar: null, clockAheadMinutes: 0 };

  // 減回標準時間可能跨到前一天（如夏令時 00:30 = 標準時間前一日 23:30），由 calculateTrueSolarTime 的 dayOffset 處理
  const ahead = input.clockAheadMinutes?.(inputDate) ?? 0;
  const solar = calculateTrueSolarTime({
    ...inputDate, clockHour: input.clockHour, clockMinute: input.clockMinute - ahead, longitude: input.longitude,
  });
  const chartDate = shiftGregorianDate(inputDate, resolveZiweiDayOffset(solar, lateZishi));
  return { inputDate, chartDate, branch: solar.branch, solar, clockAheadMinutes: ahead };
}
