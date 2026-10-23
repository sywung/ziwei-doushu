/**
 * 回归：台湾「钟表快 1 小时」期间表必须与 IANA tzdata（Asia/Taipei）逐日一致。
 * oracle 是 Node ICU 内建的 tzdata，与被测的手写表互相独立。
 */
import assert from 'node:assert/strict';
import { taiwanClockAhead, taiwanClockAheadMinutes } from '../../lib/ziwei/dst-tw';

const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', timeZoneName: 'longOffset' });
/** 当地钟表 hour 点时，Asia/Taipei 相对 UTC 的分钟数 */
function ianaOffsetAt(y: number, m: number, d: number, hour: number): number {
  // 先假设 +8 换成 UTC 瞬间；期间切换都在当地午夜，所以白天取样不会落在模糊时段
  const name = fmt.formatToParts(new Date(Date.UTC(y, m - 1, d, hour - 8))).find(p => p.type === 'timeZoneName')!.value;
  const [, sign, hh, mm] = /GMT([+-])(\d{2}):(\d{2})/.exec(name)!;
  return (sign === '+' ? 1 : -1) * (Number(hh) * 60 + Number(mm));
}

let aheadDays = 0;
for (let t = Date.UTC(1930, 0, 1); t <= Date.UTC(1990, 11, 31); t += 86_400_000) {
  const dt = new Date(t);
  const date = { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
  for (const hour of [2, 12, 22]) {
    const ahead = ianaOffsetAt(date.year, date.month, date.day, hour) - 480;
    assert.equal(taiwanClockAheadMinutes(date), ahead, `${date.year}-${date.month}-${date.day} ${hour}:00`);
  }
  if (taiwanClockAhead(date)) aheadDays++;
}

assert.equal(taiwanClockAhead({ year: 1940, month: 1, day: 1 }), 'jst');
assert.equal(taiwanClockAhead({ year: 1979, month: 7, day: 1 }), 'dst');
assert.equal(taiwanClockAhead({ year: 1979, month: 6, day: 30 }), null);
assert.equal(taiwanClockAhead({ year: 1979, month: 10, day: 1 }), null);
assert.equal(taiwanClockAhead({ year: 1980, month: 7, day: 1 }), null);

console.log(`taiwan clock-ahead regression passed (${aheadDays} days vs IANA Asia/Taipei)`);
