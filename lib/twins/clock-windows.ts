/**
 * 同盤時刻表：某地要在鐘錶幾點出生，才會排出同一個排盤日＋時辰（＝同一張本命盤）。
 *
 * 用 resolveBirthMoment 正向逐分鐘掃「排盤日前一天到後一天」的鐘表時間，收集結果落在
 * 同一排盤日＋時辰的分鐘，再合併成連續區間。真太陽時（經度＋均時差）與晚子時換日規則
 * 都和起盤表單同一套，不另寫反推公式。
 */
import { resolveBirthMoment } from '../ziwei/birth-input';
import { sameGregorianDate, shiftGregorianDate, type GregorianDate, type LateZishiRule } from '../ziwei/true-solar-time';

const MINUTES_PER_DAY = 1440;

export interface ClockWindow {
  /** 相對排盤日 00:00 的分鐘數（可為負：前一天）；區間含頭含尾 */
  startMinute: number;
  endMinute: number;
}

/**
 * 在經度 longitude 出生、鐘錶時間落在哪些區間，會排成 chartDate 的 branch 時辰。
 * clockAheadMinutes：當地鐘錶比 UTC+8 快的分鐘數（台灣夏令時等），區間以當時的當地鐘錶表示。
 */
export function clockWindows(
  chartDate: GregorianDate, branch: number, longitude: number, lateZishi: LateZishiRule = 'next-day',
  clockAheadMinutes?: (date: GregorianDate) => number,
): ClockWindow[] {
  const windows: ClockWindow[] = [];
  for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
    const inputDate = shiftGregorianDate(chartDate, dayOffset);
    for (let minute = 0; minute < MINUTES_PER_DAY; minute++) {
      const moment = resolveBirthMoment({
        calendar: 'solar', ...inputDate, isLeapMonth: false, unknownTime: false,
        clockHour: Math.floor(minute / 60), clockMinute: minute % 60, longitude, clockAheadMinutes,
      }, lateZishi);
      if (!moment || moment.branch !== branch || !sameGregorianDate(moment.chartDate, chartDate)) continue;
      const at = dayOffset * MINUTES_PER_DAY + minute;
      const last = windows[windows.length - 1];
      if (last && last.endMinute === at - 1) last.endMinute = at;
      else windows.push({ startMinute: at, endMinute: at });
    }
  }
  return windows;
}

const DAY_LABEL: Record<number, string> = { [-1]: '前一日', 0: '当日', 1: '次日' };

function clockText(minuteFromChartDay: number): { day: number; text: string } {
  const day = Math.floor(minuteFromChartDay / MINUTES_PER_DAY);
  const m = minuteFromChartDay - day * MINUTES_PER_DAY;
  return { day, text: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` };
}

/** 「當日 07:18–09:17」「前一日 23:05–當日 01:04」 */
export function formatClockWindow(w: ClockWindow): string {
  const a = clockText(w.startMinute);
  const b = clockText(w.endMinute);
  return a.day === b.day
    ? `${DAY_LABEL[a.day]} ${a.text}–${b.text}`
    : `${DAY_LABEL[a.day]} ${a.text}–${DAY_LABEL[b.day]} ${b.text}`;
}
