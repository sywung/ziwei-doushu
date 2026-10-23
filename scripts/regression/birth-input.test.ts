import assert from 'node:assert/strict';
import { lunarLeapMonth, lunarMonthDays, lunarToSolar, resolveBirthMoment, type BirthMomentInput } from '../../lib/ziwei/birth-input';
import { formToBirthInfo, formToSearchParams, searchParamsToForm } from '../../lib/ziwei/share';
import type { BirthFormState } from '../../components/BirthForm';

// ── 農曆 ↔ 公曆（期望值取公認歷日，不靠同一函式庫反推）──
assert.equal(lunarLeapMonth(2020), 4);
assert.equal(lunarLeapMonth(2023), 2);
assert.equal(lunarLeapMonth(2021), 0);
assert.deepEqual(lunarToSolar(1990, 1, 1, false), { year: 1990, month: 1, day: 27 });  // 1990 春節
assert.deepEqual(lunarToSolar(2020, 4, 1, true), { year: 2020, month: 5, day: 23 });   // 閏四月初一
assert.deepEqual(lunarToSolar(2020, 4, 1, false), { year: 2020, month: 4, day: 23 });  // 四月初一
assert.deepEqual(lunarToSolar(1999, 12, 30, false) ?? lunarToSolar(1999, 12, 29, false), { year: 2000, month: 2, day: 4 }); // 除夕
assert.equal(lunarToSolar(2021, 4, 1, true), null, '2021 has no 闰四月');
assert.equal(lunarToSolar(1990, 1, 0, false), null);
// 小月沒有三十
let smallMonth = 0;
for (let m = 1; m <= 12 && !smallMonth; m++) if (lunarMonthDays(1990, m, false) === 29) smallMonth = m;
assert.ok(smallMonth > 0);
assert.equal(lunarToSolar(1990, smallMonth, 30, false), null, 'day 30 of a 29-day month');

// ── 時辰與換日 ──
const base: BirthMomentInput = {
  calendar: 'solar', year: 2000, month: 6, day: 15, isLeapMonth: false,
  unknownTime: false, clockHour: 8, clockMinute: 0,
};
const at = (patch: Partial<BirthMomentInput>, rule?: Parameters<typeof resolveBirthMoment>[1]) =>
  resolveBirthMoment({ ...base, ...patch }, rule)!;

assert.equal(resolveBirthMoment({ ...base, month: 2, day: 30 }), null, 'invalid solar date');
assert.deepEqual(at({}).chartDate, { year: 2000, month: 6, day: 15 });
assert.equal(at({}).branch, 4, '08:00 辰');

// 沒有出生地：照鐘錶；晚子時依流派
assert.deepEqual(at({ clockHour: 23, clockMinute: 30 }).chartDate, { year: 2000, month: 6, day: 16 }, 'late zi → next day');
assert.equal(at({ clockHour: 23, clockMinute: 30 }).branch, 0);
assert.deepEqual(at({ clockHour: 23, clockMinute: 30 }, 'current-day').chartDate, { year: 2000, month: 6, day: 15 });
assert.deepEqual(at({ clockHour: 0, clockMinute: 30 }).chartDate, { year: 2000, month: 6, day: 15 }, 'early zi stays');
assert.deepEqual(at({ month: 12, day: 31, clockHour: 23, clockMinute: 30 }).chartDate, { year: 2001, month: 1, day: 1 });
assert.deepEqual(at({ clockHour: 22, clockMinute: 59 }).chartDate, { year: 2000, month: 6, day: 15 });
assert.equal(at({ clockHour: 22, clockMinute: 59 }).branch, 11);

// 烏魯木齊 87.6°E：鐘錶 00:30 ≈ 真太陽時前一日 22:20（亥）
const urumqi = at({ clockHour: 0, clockMinute: 30, longitude: 87.6 });
assert.deepEqual(urumqi.chartDate, { year: 2000, month: 6, day: 14 });
assert.equal(urumqi.branch, 11);
// 鐘錶 01:30 ≈ 前一日 23:20 = 前一日的晚子時 → 次日 = 輸入日
const urumqiZi = at({ clockHour: 1, clockMinute: 30, longitude: 87.6 });
assert.equal(urumqiZi.branch, 0);
assert.deepEqual(urumqiZi.chartDate, { year: 2000, month: 6, day: 15 });
assert.deepEqual(at({ clockHour: 1, clockMinute: 30, longitude: 87.6 }, 'current-day').chartDate, { year: 2000, month: 6, day: 14 });

// 台北 121.5°E、11 月初均時差約 +16 分：鐘錶 22:40 → 約 23:02，進入晚子時
const taipei = at({ month: 11, day: 3, clockHour: 22, clockMinute: 40, longitude: 121.5 });
assert.equal(taipei.branch, 0);
assert.deepEqual(taipei.chartDate, { year: 2000, month: 11, day: 4 });

// 時辰不詳：本日子時，不換日、不校正
const unknown = at({ unknownTime: true, clockHour: 23, longitude: 87.6 });
assert.equal(unknown.branch, 0);
assert.deepEqual(unknown.chartDate, { year: 2000, month: 6, day: 15 });

// 農曆輸入同樣走換日：閏四月初一 23:30 → 公曆 5/24
assert.deepEqual(at({ calendar: 'lunar', year: 2020, month: 4, day: 1, isLeapMonth: true, clockHour: 23, clockMinute: 30 }).chartDate,
  { year: 2020, month: 5, day: 24 });

// ── 表單 → BirthInfo、分享網址往返 ──
const form: BirthFormState = {
  name: '', calendar: 'lunar', year: '2020', month: '4', day: '1', isLeapMonth: true,
  clockHour: '23', clockMinute: '30', unknownTime: false, province: '', city: '', longitude: 120, dstAdjust: true, gender: 'female',
};
const info = formToBirthInfo(form)!;
assert.deepEqual([info.year, info.month, info.day, info.hour], [2020, 5, 24, 0]);
assert.deepEqual([formToBirthInfo(form, { lateZishi: 'current-day' })!.day], [23]);
assert.equal(formToBirthInfo({ ...form, year: '2021' }), null, 'no 闰四月 in 2021');
assert.deepEqual(searchParamsToForm(formToSearchParams(form)), { ...form });
// 舊分享網址（沒有 cal/lp）仍當公曆
const legacy = searchParamsToForm(new URLSearchParams('y=1990&m=1&d=1&h=8&mi=0&g=m'))!;
assert.equal(legacy.calendar, 'solar');
assert.equal(legacy.isLeapMonth, false);

// ── 台灣夏令時／日治時期：鐘錶快 1 小時，自動減回標準時間 ──
const tw = (patch: Partial<BirthFormState>) => formToBirthInfo({
  ...form, calendar: 'solar', isLeapMonth: false, province: '台湾省', city: '台北市', longitude: 121.56, ...patch,
})!;
const at930 = { year: '1979', month: '7', day: '15', clockHour: '9', clockMinute: '30' };
assert.equal(tw(at930).hour, 4, '1979 夏令时 09:30 = 标准 08:30 辰时');
assert.equal(tw({ ...at930, dstAdjust: false }).hour, 5, '取消勾选：照填的 09:30 = 巳时');
assert.equal(tw({ ...at930, year: '1980' }).hour, 5, '1980 没有夏令时');
assert.equal(formToBirthInfo({ ...form, calendar: 'solar', isLeapMonth: false, ...at930, province: '福建省', city: '福州', longitude: 121.56 })!.hour, 5,
  '同经度但不在台湾，不减');
assert.equal(tw({ ...at930, year: '1940', month: '1' }).hour, 4, '日治时期 UTC+9 同样减 1 小时');
// 夏令時 00:30 = 標準時間前一日 23:30（晚子時）→ 視為次日 = 填的那天子時；視為當日 = 前一日
const dstMidnight = { year: '1979', month: '7', day: '15', clockHour: '0', clockMinute: '30' };
assert.deepEqual([tw(dstMidnight).month, tw(dstMidnight).day, tw(dstMidnight).hour], [7, 15, 0]);
const sameDay = formToBirthInfo({ ...form, calendar: 'solar', isLeapMonth: false, province: '台湾省', city: '台北市', longitude: 121.56, ...dstMidnight },
  { lateZishi: 'current-day' })!;
assert.deepEqual([sameDay.month, sameDay.day, sameDay.hour], [7, 14, 0]);
// 分享網址：取消勾選要帶出去
assert.equal(searchParamsToForm(formToSearchParams({ ...form, province: '台湾省', dstAdjust: false }))!.dstAdjust, false);

console.log('birth input regression passed');
