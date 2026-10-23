import assert from 'node:assert/strict';
import { lunarLeapMonth, lunarMonthDays, lunarToSolar, resolveBirthMoment, type BirthMomentInput } from '../../lib/ziwei/birth-input';
import { formToBirthInfo, formToSearchParams, searchParamsToForm } from '../../lib/ziwei/share';
import type { BirthFormState } from '../../components/BirthForm';

// ── 农历 ↔ 公历（期望值取公认历日，不靠同一函式库反推）──
assert.equal(lunarLeapMonth(2020), 4);
assert.equal(lunarLeapMonth(2023), 2);
assert.equal(lunarLeapMonth(2021), 0);
assert.deepEqual(lunarToSolar(1990, 1, 1, false), { year: 1990, month: 1, day: 27 });  // 1990 春节
assert.deepEqual(lunarToSolar(2020, 4, 1, true), { year: 2020, month: 5, day: 23 });   // 闰四月初一
assert.deepEqual(lunarToSolar(2020, 4, 1, false), { year: 2020, month: 4, day: 23 });  // 四月初一
assert.deepEqual(lunarToSolar(1999, 12, 30, false) ?? lunarToSolar(1999, 12, 29, false), { year: 2000, month: 2, day: 4 }); // 除夕
assert.equal(lunarToSolar(2021, 4, 1, true), null, '2021 has no 闰四月');
assert.equal(lunarToSolar(1990, 1, 0, false), null);
// 小月没有三十
let smallMonth = 0;
for (let m = 1; m <= 12 && !smallMonth; m++) if (lunarMonthDays(1990, m, false) === 29) smallMonth = m;
assert.ok(smallMonth > 0);
assert.equal(lunarToSolar(1990, smallMonth, 30, false), null, 'day 30 of a 29-day month');

// ── 时辰与换日 ──
const base: BirthMomentInput = {
  calendar: 'solar', year: 2000, month: 6, day: 15, isLeapMonth: false,
  unknownTime: false, clockHour: 8, clockMinute: 0,
};
const at = (patch: Partial<BirthMomentInput>, rule?: Parameters<typeof resolveBirthMoment>[1]) =>
  resolveBirthMoment({ ...base, ...patch }, rule)!;

assert.equal(resolveBirthMoment({ ...base, month: 2, day: 30 }), null, 'invalid solar date');
assert.deepEqual(at({}).chartDate, { year: 2000, month: 6, day: 15 });
assert.equal(at({}).branch, 4, '08:00 辰');

// 没有出生地：照钟表；晚子时依流派
assert.deepEqual(at({ clockHour: 23, clockMinute: 30 }).chartDate, { year: 2000, month: 6, day: 16 }, 'late zi → next day');
assert.equal(at({ clockHour: 23, clockMinute: 30 }).branch, 0);
assert.deepEqual(at({ clockHour: 23, clockMinute: 30 }, 'current-day').chartDate, { year: 2000, month: 6, day: 15 });
assert.deepEqual(at({ clockHour: 0, clockMinute: 30 }).chartDate, { year: 2000, month: 6, day: 15 }, 'early zi stays');
assert.deepEqual(at({ month: 12, day: 31, clockHour: 23, clockMinute: 30 }).chartDate, { year: 2001, month: 1, day: 1 });
assert.deepEqual(at({ clockHour: 22, clockMinute: 59 }).chartDate, { year: 2000, month: 6, day: 15 });
assert.equal(at({ clockHour: 22, clockMinute: 59 }).branch, 11);

// 乌鲁木齐 87.6°E：钟表 00:30 ≈ 真太阳时前一日 22:20（亥）
const urumqi = at({ clockHour: 0, clockMinute: 30, longitude: 87.6 });
assert.deepEqual(urumqi.chartDate, { year: 2000, month: 6, day: 14 });
assert.equal(urumqi.branch, 11);
// 钟表 01:30 ≈ 前一日 23:20 = 前一日的晚子时 → 次日 = 输入日
const urumqiZi = at({ clockHour: 1, clockMinute: 30, longitude: 87.6 });
assert.equal(urumqiZi.branch, 0);
assert.deepEqual(urumqiZi.chartDate, { year: 2000, month: 6, day: 15 });
assert.deepEqual(at({ clockHour: 1, clockMinute: 30, longitude: 87.6 }, 'current-day').chartDate, { year: 2000, month: 6, day: 14 });

// 台北 121.5°E、11 月初均时差约 +16 分：钟表 22:40 → 约 23:02，进入晚子时
const taipei = at({ month: 11, day: 3, clockHour: 22, clockMinute: 40, longitude: 121.5 });
assert.equal(taipei.branch, 0);
assert.deepEqual(taipei.chartDate, { year: 2000, month: 11, day: 4 });

// 时辰不详：本日子时，不换日、不校正
const unknown = at({ unknownTime: true, clockHour: 23, longitude: 87.6 });
assert.equal(unknown.branch, 0);
assert.deepEqual(unknown.chartDate, { year: 2000, month: 6, day: 15 });

// 农历输入同样走换日：闰四月初一 23:30 → 公历 5/24
assert.deepEqual(at({ calendar: 'lunar', year: 2020, month: 4, day: 1, isLeapMonth: true, clockHour: 23, clockMinute: 30 }).chartDate,
  { year: 2020, month: 5, day: 24 });

// ── 表单 → BirthInfo、分享网址往返 ──
const form: BirthFormState = {
  name: '', calendar: 'lunar', year: '2020', month: '4', day: '1', isLeapMonth: true,
  clockHour: '23', clockMinute: '30', unknownTime: false, province: '', city: '', longitude: 120, gender: 'female',
};
const info = formToBirthInfo(form)!;
assert.deepEqual([info.year, info.month, info.day, info.hour], [2020, 5, 24, 0]);
assert.deepEqual([formToBirthInfo(form, { lateZishi: 'current-day' })!.day], [23]);
assert.equal(formToBirthInfo({ ...form, year: '2021' }), null, 'no 闰四月 in 2021');
assert.deepEqual(searchParamsToForm(formToSearchParams(form)), { ...form });
// 旧分享网址（没有 cal/lp）仍当公历
const legacy = searchParamsToForm(new URLSearchParams('y=1990&m=1&d=1&h=8&mi=0&g=m'))!;
assert.equal(legacy.calendar, 'solar');
assert.equal(legacy.isLeapMonth, false);

console.log('birth input regression passed');
