import assert from 'node:assert/strict';
import { Solar } from 'lunar-javascript';
import { generateChart } from '../../lib/ziwei/algorithm';
import { BRANCHES } from '../../lib/ziwei/constants';
import { getFlowLayers } from '../../lib/ziwei/flow-layers';
import { chartFromUntrusted } from '../../lib/ai/chart-context';
import { SCHOOL_DEFAULT_CONFIG, sanitizeSchoolConfig, type GengYearSihua } from '../../lib/ziwei/school-config';
import type { BirthInfo, ZiweiChart } from '../../lib/ziwei/types';

// 期望值一律按口诀手写，不引用引擎用的表，避免「表错测试也跟着错」

const branchOf = (chart: ZiweiChart, star: string) =>
  chart.palaces.filter(p => p.stars.some(s => s.name === star)).map(p => BRANCHES[p.branch]);
const siHuaOf = (chart: ZiweiChart) =>
  Object.fromEntries(chart.palaces.flatMap(p => p.stars.filter(s => s.siHua).map(s => [s.name, s.siHua])));

// 跨 10 个年干、12 个月的样本（避开闰月，月份口径才单纯）
const samples: BirthInfo[] = [];
for (let y = 1980; y < 1990; y++) {
  for (let m = 1; m <= 12; m++) {
    const lunar = Solar.fromYmd(y, m, 15).getLunar();
    if (lunar.getMonth() < 0) continue;
    samples.push({ year: y, month: m, day: 15, hour: (y + m) % 12, gender: m % 2 ? 'male' : 'female' });
  }
}
const stemOf = (b: BirthInfo) => generateChart(b).lunarInfo.yearStem;

// ── 默认配置 = 不传配置；亮度表不会漏到下一张盘 ──
for (const b of samples.slice(0, 20)) {
  const plain = generateChart(b);
  assert.deepEqual(generateChart(b, { school: SCHOOL_DEFAULT_CONFIG }), plain, 'explicit default');
  generateChart(b, { school: { brightnessSchool: 'XD1' } });
  assert.deepEqual(generateChart(b), plain, 'brightness leak');
  assert.deepEqual(plain.school, SCHOOL_DEFAULT_CONFIG);
}

// ── 亮度表：换派至少改到一些星的亮度，落宫不变 ──
let brightDiff = 0;
for (const b of samples) {
  const a = generateChart(b);
  const z = generateChart(b, { school: { brightnessSchool: 'ZZ' } });
  a.palaces.forEach((p, i) => {
    assert.deepEqual(p.stars.map(s => s.name), z.palaces[i].stars.map(s => s.name), 'brightness moves stars');
    p.stars.forEach((s, j) => { if (s.brightnessRaw !== z.palaces[i].stars[j].brightnessRaw) brightDiff++; });
  });
}
assert.ok(brightDiff > 0, 'ZZ brightness identical to default');

// ── 魁钺：网络流传「甲戊庚牛羊、乙己鼠猴乡、丙丁猪鸡位、六辛逢马虎、壬癸兔蛇藏」──
const NETWORK_KY = ['丑未', '子申', '亥酉', '亥酉', '丑未', '子申', '丑未', '午寅', '卯巳', '卯巳'];
// 全书理解 2：与默认派只差庚辛（午寅）、壬癸（巳卯）
const QS2_KY = ['丑未', '子申', '亥酉', '亥酉', '丑未', '子申', '午寅', '午寅', '巳卯', '巳卯'];
for (const b of samples) {
  const stem = stemOf(b);
  const net = generateChart(b, { school: { kuiyueSchool: 'network' } });
  assert.equal(branchOf(net, '天魁')[0] + branchOf(net, '天钺')[0], NETWORK_KY[stem], `network ky stem ${stem}`);
  const qs2 = generateChart(b, { school: { kuiyueSchool: 'qs2' } });
  assert.equal(branchOf(qs2, '天魁')[0] + branchOf(qs2, '天钺')[0], QS2_KY[stem], `qs2 ky stem ${stem}`);
}

// ── 截空：单星派、占验派只安一颗截空 ──
const SINGLE_JK = ['申', '午', '辰', '寅', '子', '酉', '未', '巳', '卯', '丑'];
const ZHANYAN_JK = ['申', '午', '辰', '寅', '戌', '酉', '未', '巳', '卯', '亥'];
for (const b of samples) {
  const stem = stemOf(b);
  for (const [school, table] of [['single', SINGLE_JK], ['zhanyan', ZHANYAN_JK]] as const) {
    const c = generateChart(b, { school: { jiekongSchool: school } });
    assert.deepEqual(branchOf(c, '截空'), [table[stem]], `${school} jiekong stem ${stem}`);
    assert.deepEqual(branchOf(c, '副截'), [], `${school} has no 副截`);
  }
  assert.equal(branchOf(generateChart(b), '副截').length, 1, 'default keeps 副截');
}

// ── 天马依月支：生月三合局的驿马 ──
const YIMA: Record<string, string> = {
  寅: '申', 午: '申', 戌: '申', 申: '寅', 子: '寅', 辰: '寅',
  巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳',
};
const MONTH_BRANCH = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
let tianmaMoved = 0;
for (const b of samples) {
  const lunarMonth = Solar.fromYmd(b.year, b.month, b.day).getLunar().getMonth();
  const c = generateChart(b, { school: { tianmaSchool: 'month-branch' } });
  assert.deepEqual(branchOf(c, '天马'), [YIMA[MONTH_BRANCH[lunarMonth - 1]]], `tianma ${b.year}-${b.month}`);
  if (branchOf(c, '天马')[0] !== branchOf(generateChart(b), '天马')[0]) tianmaMoved++;
}
assert.ok(tianmaMoved > 0, 'month tianma never differs from year tianma');

// ── 庚年四化：只影响庚年生人；运限层遇庚干也跟着换 ──
const GENG: Record<GengYearSihua, Record<string, string>> = {
  GYWYT: { 太阳: '禄', 武曲: '权', 太阴: '科', 天同: '忌' },
  GYWTY: { 太阳: '禄', 武曲: '权', 天同: '科', 太阴: '忌' },
  GYWFT: { 太阳: '禄', 武曲: '权', 天府: '科', 天同: '忌' },
  GYWFX: { 太阳: '禄', 武曲: '权', 天府: '科', 天相: '忌' },
  GYWTX: { 太阳: '禄', 武曲: '权', 天同: '科', 天相: '忌' },
};
const gengBirth: BirthInfo = { year: 1980, month: 6, day: 15, hour: 3, gender: 'male' }; // 庚申年
const jiaBirth: BirthInfo = { year: 1984, month: 6, day: 15, hour: 3, gender: 'male' };  // 甲子年
for (const [school, expected] of Object.entries(GENG) as [GengYearSihua, Record<string, string>][]) {
  const c = generateChart(gengBirth, { school: { gengYearSihua: school } });
  assert.deepEqual(siHuaOf(c), expected, `geng natal ${school}`);
  assert.deepEqual(siHuaOf(generateChart(jiaBirth, { school: { gengYearSihua: school } })), siHuaOf(generateChart(jiaBirth)),
    `non-geng year unaffected by ${school}`);
  // 2030 庚戌年：流年四化
  const flows = getFlowLayers(generateChart(jiaBirth, { school: { gengYearSihua: school } }), { year: 2030, month: 6, day: 1, hour: 0 });
  assert.deepEqual(flows.layers.liunian.siHua, Object.fromEntries(Object.entries(expected)), `geng liunian ${school}`);
}

// ── 闰月口径可经 school.leapMonth 传入，与旧参数 leapMonth 一致 ──
const leapBirth: BirthInfo = { year: 2020, month: 6, day: 10, hour: 5, gender: 'female' }; // 闰四月十九
assert.ok(Solar.fromYmd(2020, 6, 10).getLunar().getMonth() < 0, 'sample must be in a leap month');
for (const lm of ['split', 'next-month', 'prev-month', 'origin-month'] as const) {
  assert.deepEqual(generateChart(leapBirth, { school: { leapMonth: lm } }), generateChart(leapBirth, { leapMonth: lm }), `leap ${lm}`);
}

// ── 不可信输入：只收七项可切换流派的合法值（天空等未实作的项目丢掉）──
assert.deepEqual(sanitizeSchoolConfig({
  brightnessSchool: 'ZZ', kuiyueSchool: 'bogus', lateZishi: 'current-day', tiankongSchool: 'shun-jia-shi', __proto__: { x: 1 },
}), { brightnessSchool: 'ZZ', lateZishi: 'current-day' });
assert.deepEqual(sanitizeSchoolConfig('ZZ'), {});
assert.deepEqual(sanitizeSchoolConfig(null), {});
// AI 端按前端送来的流派重排（偷塞非法值则被忽略）
const viaApi = chartFromUntrusted({ birthInfo: gengBirth, school: { gengYearSihua: 'GYWFX', jiekongSchool: 'nope' } });
assert.deepEqual(siHuaOf(viaApi!), GENG.GYWFX, 'api honours school');
assert.equal(viaApi!.school!.jiekongSchool, 'double', 'api drops invalid value');

console.log(`school variants regression passed (${samples.length} charts, ${brightDiff} brightness diffs)`);
