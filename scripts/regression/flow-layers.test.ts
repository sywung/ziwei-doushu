import assert from 'node:assert/strict';
import { Solar } from 'lunar-javascript';
import { createAstrolabe, generateChart } from '../../lib/ziwei/algorithm';
import { BRANCHES, STEMS } from '../../lib/ziwei/constants';
import { flowPalaceShortName, getFlowLayers } from '../../lib/ziwei/flow-layers';
import { buildStarSiHuaMap } from '../../lib/ziwei/sihua';
import type { BirthInfo } from '../../lib/ziwei/types';
import { CHILDHOOD_DAXIAN_INDEX } from '../../lib/ziwei/yunxian-context';

const base: BirthInfo = { year: 1990, month: 1, day: 1, hour: 4, gender: 'male' };
const chart = generateChart(base);

// ── 宫名逆排：命宫起，地支递减为兄弟，递增为父母 ──
assert.equal(flowPalaceShortName(6, 6), '命');
assert.equal(flowPalaceShortName(6, 5), '兄');
assert.equal(flowPalaceShortName(6, 7), '父');
assert.equal(flowPalaceShortName(0, 11), '兄'); // 子宫为命，亥为兄弟
assert.equal(flowPalaceShortName(0, 1), '父');
assert.equal(flowPalaceShortName(0, 6), '迁');

// 用本命命宫推宫名，必须与引擎排出的本命十二宫名一致（含「仆役」= 友）
const NATAL_SHORT: Record<string, string> = {
  命宫: '命', 兄弟: '兄', 夫妻: '夫', 子女: '子', 财帛: '财', 疾厄: '疾',
  迁移: '迁', 仆役: '友', 官禄: '官', 田宅: '田', 福德: '福', 父母: '父',
};
for (const p of chart.palaces) {
  assert.equal(flowPalaceShortName(chart.mingGongBranch, p.branch), NATAL_SHORT[p.name], `natal ${p.name}`);
}

// ── 流年以农历年计：春节前仍属上一年 ──
// 2026 春节 = 2026-02-17；2026-01-20 仍是乙巳年
const beforeCny = getFlowLayers(chart, { year: 2026, month: 1, day: 20, hour: 0 });
assert.equal(beforeCny.lunarYear, 2025);
assert.equal(beforeCny.layers.liunian.ganzhi, '乙巳');
assert.equal(beforeCny.layers.liunian.mingBranch, BRANCHES.indexOf('巳'));
assert.deepEqual(beforeCny.layers.liunian.siHua, buildStarSiHuaMap(STEMS.indexOf('乙')));
const afterCny = getFlowLayers(chart, { year: 2026, month: 2, day: 20, hour: 0 });
assert.equal(afterCny.layers.liunian.ganzhi, '丙午');
assert.equal(afterCny.layers.liunian.mingBranch, BRANCHES.indexOf('午'));

// 流年命宫 = 流年地支，跨多年抽查
for (let y = 1995; y <= 2040; y++) {
  const f = getFlowLayers(chart, { year: y, month: 7, day: 1, hour: 6 });
  assert.equal(f.layers.liunian.mingBranch, ((f.lunarYear - 4) % 12 + 12) % 12, `liunian ${y}`);
}

// ── 闰月流月：前半月归本月、后半月归下月（2023 闰二月；癸年正月甲寅 → 二月乙、三月丙）──
const leapFirstHalf = getFlowLayers(chart, { year: 2023, month: 3, day: 25, hour: 0 });  // 闰二月初四
assert.equal(Solar.fromYmd(2023, 3, 25).getLunar().getMonth(), -2);
assert.equal(STEMS[leapFirstHalf.layers.liuyue.stemIndex!], '乙');
const leapSecondHalf = getFlowLayers(chart, { year: 2023, month: 4, day: 10, hour: 0 }); // 闰二月二十
assert.equal(STEMS[leapSecondHalf.layers.liuyue.stemIndex!], '丙');

// ── 指定大限：落宫与四化都来自该大限宫 ──
chart.daXians.forEach((dx, i) => {
  const f = getFlowLayers(chart, { year: 2026, month: 6, day: 1, hour: 0 }, i);
  const palace = chart.palaces.find(p => p.branch === dx.palaceBranch)!;
  assert.equal(f.layers.daxian.mingBranch, dx.palaceBranch, `daxian ${i} branch`);
  assert.deepEqual(f.layers.daxian.siHua, buildStarSiHuaMap(palace.stem), `daxian ${i} sihua`);
});

// 童限：第一个大限之前的虚岁
const childChart = generateChart({ year: 2020, month: 5, day: 5, hour: 3, gender: 'female' });
const childFlow = getFlowLayers(childChart, { year: 2021, month: 6, day: 1, hour: 0 });
if (childChart.daXians[0].startAge > 2) {
  assert.equal(childFlow.daXianIndex, CHILDHOOD_DAXIAN_INDEX);
  assert.notEqual(childFlow.layers.daxian.mingBranch, null);
}

// ── 与 iztro 交叉核对：自动选的大限落宫、流日／流时干 ──
let checked = 0;
for (const [y, m, d, h, g] of [
  [1960, 3, 8, 0, 'male'], [1975, 11, 23, 7, 'female'], [1988, 6, 15, 11, 'male'],
  [1999, 9, 9, 5, 'female'], [2004, 2, 29, 2, 'male'], [1952, 12, 31, 9, 'female'],
] as const) {
  const c = generateChart({ year: y, month: m, day: d, hour: h, gender: g });
  const astrolabe = createAstrolabe(c.birthInfo);
  for (const ty of [2000, 2010, 2020, 2026, 2035]) {
    if (ty <= y) continue; // 出生前没有运限（另有断言）
    for (const [tm, td, th] of [[3, 3, 0], [8, 18, 6], [12, 12, 11]] as const) {
      const f = getFlowLayers(c, { year: ty, month: tm, day: td, hour: th });
      const horo = astrolabe.horoscope(`${ty}-${tm}-${td}`, th);
      if (f.daXianIndex >= 0) {
        const izDx = BRANCHES.indexOf(astrolabe.palaces[horo.decadal.index].earthlyBranch as string);
        assert.equal(f.layers.daxian.mingBranch, izDx, `${y}-${m}-${d} @${ty}-${tm}-${td} daxian vs iztro`);
      }
      assert.equal(STEMS[f.layers.liuri.stemIndex!], horo.daily.heavenlyStem, 'liuri stem');
      assert.equal(STEMS[f.layers.liushi.stemIndex!], horo.hourly.heavenlyStem, 'liushi stem');
      assert.equal(f.layers.liushi.ganzhi.slice(1), BRANCHES[th], 'liushi branch = 时辰');
      checked += 1;
    }
  }
}

// ── 不合法目标日期要拒绝 ──
assert.throws(() => getFlowLayers(chart, { year: 1985, month: 6, day: 1, hour: 0 }), /before birth/);
assert.throws(() => getFlowLayers(chart, { year: 2026, month: 2, day: 30, hour: 0 }), RangeError);
assert.throws(() => getFlowLayers(chart, { year: 2026, month: 2, day: 1, hour: 12 }), RangeError);

console.log(`flow layers regression passed (${checked} iztro cross-checks)`);
