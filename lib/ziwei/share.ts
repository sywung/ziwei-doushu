import type { BirthFormState } from '@/components/BirthForm';
import type { BirthInfo } from './types';
import { resolveBirthMoment } from './birth-input';
import type { LateZishiRule } from './true-solar-time';

/** BirthFormState → BirthInfo；日期不存在（含该年没有所填闰月）回 null
 *
 * 公历/农历换算、真太阳时、晚子时换日都在 birth-input.ts。
 * 晚子时（真太阳时 23:00 后）默认按次日排盘，可经流派「晚子时」改为当日。
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

/** BirthFormState → URLSearchParams（用于分享链接） */
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
  p.set('g', form.gender === 'male' ? 'm' : 'f');
  return p;
}

/** URLSearchParams → Partial<BirthFormState>，不完整时返回 null */
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
    gender: params.get('g') === 'f' ? 'female' : 'male',
  };
}
