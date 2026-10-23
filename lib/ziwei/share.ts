import type { BirthFormState } from '@/components/BirthForm';
import type { BirthInfo } from './types';
import { resolveBirthMoment } from './birth-input';
import { taiwanClockAheadMinutes } from './dst-tw';
import type { GregorianDate, LateZishiRule } from './true-solar-time';

export const TAIWAN_PROVINCE = '台湾省';

/** 出生地的鐘表若曾快於 UTC+8（台灣夏令時、日治時期），且使用者沒取消「按當時鐘錶時間」，回傳換算函式 */
export function clockAheadFor(form: Pick<BirthFormState, 'province' | 'dstAdjust'>): ((date: GregorianDate) => number) | undefined {
  return form.province === TAIWAN_PROVINCE && form.dstAdjust !== false ? taiwanClockAheadMinutes : undefined;
}

/** BirthFormState → BirthInfo；日期不存在（含該年沒有所填閏月）回 null
 *
 * 公曆/農曆換算、真太陽時、晚子時換日都在 birth-input.ts。
 * 晚子時（真太陽時 23:00 後）默認按次日排盤，可經流派「晚子時」改為當日。
 */
export function formToBirthInfo(form: BirthFormState, opts: { lateZishi?: LateZishiRule } = {}): BirthInfo | null {
  const moment = resolveBirthMoment({
    calendar: form.calendar,
    year: parseInt(form.year) || 0,
    month: parseInt(form.month) || 0,
    day: parseInt(form.day) || 0,
    isLeapMonth: form.calendar === 'lunar' && form.isLeapMonth,
    unknownTime: form.unknownTime,
    clockHour: parseInt(form.clockHour) || 0,
    clockMinute: parseInt(form.clockMinute) || 0,
    longitude: form.province ? form.longitude : undefined,
    clockAheadMinutes: clockAheadFor(form),
  }, opts.lateZishi);
  if (!moment) return null;
  return {
    ...moment.chartDate,
    hour: moment.branch,
    gender: form.gender,
    name: form.name || undefined,
    province: form.province || undefined,
    city: form.city || undefined,
    longitude: form.province ? form.longitude : undefined,
  };
}

/** BirthFormState → URLSearchParams（用於分享鏈接） */
export function formToSearchParams(form: BirthFormState): URLSearchParams {
  const p = new URLSearchParams();
  if (form.name) p.set('n', form.name);
  if (form.calendar === 'lunar') {
    p.set('cal', 'l');
    if (form.isLeapMonth) p.set('lp', '1');
  }
  p.set('y', form.year);
  p.set('m', form.month);
  p.set('d', form.day);
  if (form.unknownTime) {
    p.set('u', '1');
  } else {
    p.set('h', form.clockHour);
    p.set('mi', form.clockMinute);
  }
  if (form.province) p.set('p', form.province);
  if (form.city) p.set('c', form.city);
  if (form.longitude && form.longitude !== 120) p.set('lo', String(form.longitude));
  if (form.dstAdjust === false) p.set('dst', '0');
  p.set('g', form.gender === 'male' ? 'm' : 'f');
  return p;
}

/** URLSearchParams → Partial<BirthFormState>，不完整時返回 null */
export function searchParamsToForm(params: URLSearchParams): Partial<BirthFormState> | null {
  const year = params.get('y');
  const month = params.get('m');
  const day = params.get('d');
  if (!year || !month || !day) return null;
  return {
    name: params.get('n') || '',
    calendar: params.get('cal') === 'l' ? 'lunar' : 'solar',
    isLeapMonth: params.get('cal') === 'l' && params.get('lp') === '1',
    year,
    month,
    day,
    unknownTime: params.get('u') === '1',
    clockHour: params.get('h') || '8',
    clockMinute: params.get('mi') || '0',
    province: params.get('p') || '',
    city: params.get('c') || '',
    longitude: parseFloat(params.get('lo') || '120'),
    dstAdjust: params.get('dst') !== '0',
    gender: params.get('g') === 'f' ? 'female' : 'male',
  };
}
