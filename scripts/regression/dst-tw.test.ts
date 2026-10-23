/**
 * 迴歸：台灣「鐘錶快 1 小時」期間表必須與 IANA tzdata（Asia/Taipei）逐日一致。
 * oracle 是 Node ICU 內建的 tzdata，與被測的手寫表互相獨立。
 */
import assert from 'node:assert/strict';
import { taiwanClockAhead, taiwanClockAheadMinutes } from '../../lib/ziwei/dst-tw';

const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', timeZoneName: 'longOffset' });
/** 當地鐘錶 hour 點時，Asia/Taipei 相對 UTC 的分鐘數 */
function ianaOffsetAt(y: number, m: number, d: number, hour: number): number {
  // 先假設 +8 換成 UTC 瞬間；期間切換都在當地午夜，所以白天取樣不會落在模糊時段
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
