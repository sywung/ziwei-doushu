/**
 * 同盘时刻表：某地要在钟表几点出生，才会排出同一个排盘日＋时辰（＝同一张本命盘）。
 *
 * 用 resolveBirthMoment 正向逐分钟扫「排盘日前一天到后一天」的钟表时间，收集结果落在
 * 同一排盘日＋时辰的分钟，再合并成连续区间。真太阳时（经度＋均时差）与晚子时换日规则
 * 都和起盘表单同一套，不另写反推公式。
 */
import { resolveBirthMoment } from '../ziwei/birth-input';
import { sameGregorianDate, shiftGregorianDate, type GregorianDate, type LateZishiRule } from '../ziwei/true-solar-time';

const MINUTES_PER_DAY = 1440;

export interface ClockWindow {
  /** 相对排盘日 00:00 的分钟数（可为负：前一天）；区间含头含尾 */
  startMinute: number;
  endMinute: number;
}

/** 在经度 longitude 出生、钟表时间落在哪些区间，会排成 chartDate 的 branch 时辰 */
export function clockWindows(
  chartDate: GregorianDate, branch: number, longitude: number, lateZishi: LateZishiRule = 'next-day',
): ClockWindow[] {
  const windows: ClockWindow[] = [];
  for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
    const inputDate = shiftGregorianDate(chartDate, dayOffset);
    for (let minute = 0; minute < MINUTES_PER_DAY; minute++) {
      const moment = resolveBirthMoment({
        calendar: 'solar', ...inputDate, isLeapMonth: false, unknownTime: false,
        clockHour: Math.floor(minute / 60), clockMinute: minute % 60, longitude,
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

/** 「当日 07:18–09:17」「前一日 23:05–当日 01:04」 */
export function formatClockWindow(w: ClockWindow): string {
  const a = clockText(w.startMinute);
  const b = clockText(w.endMinute);
  return a.day === b.day
    ? `${DAY_LABEL[a.day]} ${a.text}–${b.text}`
    : `${DAY_LABEL[a.day]} ${a.text}–${DAY_LABEL[b.day]} ${b.text}`;
}
