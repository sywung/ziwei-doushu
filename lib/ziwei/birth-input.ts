/**
 * 表单输入 → 排盘用公历日期与时辰
 *
 * 1. 农历输入先换成公历（闰月要该年真有此闰月，日数不超过该月天数）
 * 2. 当地钟表比 UTC+8 快（台湾夏令时、日治时期 UTC+9）时先减回标准时间
 * 3. 有出生地才做真太阳时（经度修正 + 均时差）；没有就照钟表时间
 * 4. 真太阳时跨日、晚子时（23:00 后）是否算次日，统一交给 resolveZiweiDayOffset 按流派决定
 *
 * 命盘页与合盘页共用这一份，避免两边同一个出生时间排出不同的盘。
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

/** 该农历年的闰月（1–12），没有闰月回 0 */
export function lunarLeapMonth(year: number): number {
  for (let m = 1; m <= 12; m++) if (LunarMonth.fromYm(year, -m)) return m;
  return 0;
}

/** 农历某月天数（29/30）；查无此月（如该年没有这个闰月）回 null */
export function lunarMonthDays(year: number, month: number, isLeap: boolean): number | null {
  return LunarMonth.fromYm(year, isLeap ? -month : month)?.getDayCount() ?? null;
}

/** 农历 → 公历；日期不存在回 null */
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
  /** 没选出生地时不传，不做真太阳时校正 */
  longitude?: number;
  /** 该出生日当地钟表比 UTC+8 快几分钟（如台湾夏令时回 60）；不传 = 0 */
  clockAheadMinutes?: (date: GregorianDate) => number;
}

export interface BirthMoment {
  /** 输入换算出的公历出生日（农历输入时即对应公历日） */
  inputDate: GregorianDate;
  /** 排盘日：真太阳时跨日、晚子时换日之后 */
  chartDate: GregorianDate;
  /** 时辰支 0–11 */
  branch: number;
  /** 真太阳时细节；时辰不详时为 null */
  solar: TrueSolarTimeResult | null;
  /** 实际从钟表时间减掉的分钟数（夏令时等） */
  clockAheadMinutes: number;
}

/** 表单输入 → 排盘日与时辰；日期不存在回 null */
export function resolveBirthMoment(input: BirthMomentInput, lateZishi: LateZishiRule = 'next-day'): BirthMoment | null {
  const inputDate = input.calendar === 'lunar'
    ? lunarToSolar(input.year, input.month, input.day, input.isLeapMonth)
    : isValidGregorianDate(input.year, input.month, input.day)
      ? { year: input.year, month: input.month, day: input.day }
      : null;
  if (!inputDate) return null;

  // 时辰不详：以本日子时（早子）起盘，不换日
  if (input.unknownTime) return { inputDate, chartDate: inputDate, branch: 0, solar: null, clockAheadMinutes: 0 };

  // 减回标准时间可能跨到前一天（如夏令时 00:30 = 标准时间前一日 23:30），由 calculateTrueSolarTime 的 dayOffset 处理
  const ahead = input.clockAheadMinutes?.(inputDate) ?? 0;
  const solar = calculateTrueSolarTime({
    ...inputDate, clockHour: input.clockHour, clockMinute: input.clockMinute - ahead, longitude: input.longitude,
  });
  const chartDate = shiftGregorianDate(inputDate, resolveZiweiDayOffset(solar, lateZishi));
  return { inputDate, chartDate, branch: solar.branch, solar, clockAheadMinutes: ahead };
}
