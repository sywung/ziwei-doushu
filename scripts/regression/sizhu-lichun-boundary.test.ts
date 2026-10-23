/**
 * 節氣四柱 立春/節氣邊界精確到時刻 — 迴歸測試
 *
 * 背景（2026-09-01）：會員反饋「紫薇排盤裡給我排的四柱不準…年柱為癸未…立春是19點…我不是甲申年」。
 * 查證：農曆2004正月十四=公曆2004-02-04，立春2004=當天19:56，會員凌晨2:40（丑時）出生在立春前，
 * 八字年柱應為癸未（連帶月柱乙丑），排盤卻給甲申/丙寅。
 * 根因：節氣四柱原用 lunar-javascript 的 getYearGanByLiChun()/getMonthGan()，是「按立春當天整天」切換、
 * 不看時刻（實測即使傳入時間也無效），立春當天凌晨出生的被算進新年。
 * 修復：改用 getEightChar()（精確到立春/節的時刻），時刻用時辰中點(index*2)近似。
 *
 * 本測試鎖住：①會員案例修對 ②非節氣日不被誤傷 ③立春當天「前/後」正確分檔。
 */
import assert from 'node:assert/strict';
import { generateChart } from '../../lib/ziwei/algorithm';

let passed = 0;
const ok = (name: string, cond: boolean) => { assert.ok(cond, `❌ ${name}`); console.log(`  ✅ ${name}`); passed++; };
const sizhu = (y: number, mo: number, d: number, h: number) =>
  (generateChart({ year: y, month: mo, day: d, hour: h, gender: 'male' } as any) as any).lunarInfo;

// ① 會員案例：2004-02-04 丑時(立春19:56前) → 節氣年柱癸未、月柱乙丑
const m = sizhu(2004, 2, 4, 1);
ok('会员案例 节气四柱年柱=癸未（立春前，不是甲申）', m.fourPillars?.[0] === '癸未');
ok('会员案例 节气四柱月柱=乙丑（连带修正，不是丙寅）', m.fourPillars?.[1] === '乙丑');
ok('会员案例 非节气四柱年柱=甲申（农历正月初一口径，保持不变）', m.fourPillarsLunar?.[0] === '甲申');

// ② 立春前一天/後一天：邊界兩側正確
ok('2004-02-03 丑时（立春前一天）节气年柱=癸未', sizhu(2004, 2, 3, 1).fourPillars?.[0] === '癸未');
ok('2004-02-05 丑时（立春后一天）节气年柱=甲申', sizhu(2004, 2, 5, 1).fourPillars?.[0] === '甲申');

// ③ 立春當天「時刻前 vs 時刻後」正確分檔（同一天不同時辰）
//    立春=19:56（戌時19-21）。丑時(idx1=02點)在前→癸未；亥時(idx11=22點)在後→甲申。
ok('2004-02-04 丑时(立春前) → 癸未', sizhu(2004, 2, 4, 1).fourPillars?.[0] === '癸未');
ok('2004-02-04 亥时(立春后) → 甲申', sizhu(2004, 2, 4, 11).fourPillars?.[0] === '甲申');

// ④ 非節氣日不被誤傷（固定期望值，防迴歸時被動）
const c = sizhu(1990, 6, 15, 6);
ok('非节气日 1990-06-15 午时 节气四柱稳定=庚午/壬午/辛亥/甲午',
   JSON.stringify(c.fourPillars) === JSON.stringify(['庚午', '壬午', '辛亥', '甲午']));

// ⑤ 日柱、時柱不受立春影響（會員案例日柱癸丑、時柱癸丑）
ok('日柱不受立春边界影响（会员案例=癸丑）', m.fourPillars?.[2] === '癸丑');
ok('时柱不受立春边界影响（会员案例丑时=癸丑）', m.fourPillars?.[3] === '癸丑');

console.log(`\n[sizhu-lichun-boundary] ${passed} 项断言全部通过`);
