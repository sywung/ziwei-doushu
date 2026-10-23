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

// ── 宮名逆排：命宮起，地支遞減為兄弟，遞增為父母 ──
assert.equal(flowPalaceShortName(6, 6), '命');
assert.equal(flowPalaceShortName(6, 5), '兄');
assert.equal(flowPalaceShortName(6, 7), '父');
assert.equal(flowPalaceShortName(0, 11), '兄'); // 子宮為命，亥為兄弟
assert.equal(flowPalaceShortName(0, 1), '父');
assert.equal(flowPalaceShortName(0, 6), '迁');

// 用本命命宮推宮名，必須與引擎排出的本命十二宮名一致（含「僕役」= 友）
const NATAL_SHORT: Record<string, string> = {
  命宫: '命', 兄弟: '兄', 夫妻: '夫', 子女: '子', 财帛: '财', 疾厄: '疾',
  迁移: '迁', 仆役: '友', 官禄: '官', 田宅: '田', 福德: '福', 父母: '父',
};
for (const p of chart.palaces) {
  assert.equal(flowPalaceShortName(chart.mingGongBranch, p.branch), NATAL_SHORT[p.name], `natal ${p.name}`);
}

// ── 流年以農曆年計：春節前仍屬上一年 ──
// 2026 春節 = 2026-02-17；2026-01-20 仍是乙巳年
const beforeCny = getFlowLayers(chart, { year: 2026, month: 1, day: 20, hour: 0 });
assert.equal(beforeCny.lunarYear, 2025);
assert.equal(beforeCny.layers.liunian.ganzhi, '乙巳');
assert.equal(beforeCny.layers.liunian.mingBranch, BRANCHES.indexOf('巳'));
assert.deepEqual(beforeCny.layers.liunian.siHua, buildStarSiHuaMap(STEMS.indexOf('乙')));
const afterCny = getFlowLayers(chart, { year: 2026, month: 2, day: 20, hour: 0 });
assert.equal(afterCny.layers.liunian.ganzhi, '丙午');
assert.equal(afterCny.layers.liunian.mingBranch, BRANCHES.indexOf('午'));

// 流年命宮 = 流年地支，跨多年抽查
for (let y = 1995; y <= 2040; y++) {
  const f = getFlowLayers(chart, { year: y, month: 7, day: 1, hour: 6 });
  assert.equal(f.layers.liunian.mingBranch, ((f.lunarYear - 4) % 12 + 12) % 12, `liunian ${y}`);
}

// ── 閏月流月：前半月歸本月、後半月歸下月（2023 閏二月；癸年正月甲寅 → 二月乙、三月丙）──
const leapFirstHalf = getFlowLayers(chart, { year: 2023, month: 3, day: 25, hour: 0 });  // 閏二月初四
assert.equal(Solar.fromYmd(2023, 3, 25).getLunar().getMonth(), -2);
assert.equal(STEMS[leapFirstHalf.layers.liuyue.stemIndex!], '乙');
const leapSecondHalf = getFlowLayers(chart, { year: 2023, month: 4, day: 10, hour: 0 }); // 閏二月二十
assert.equal(STEMS[leapSecondHalf.layers.liuyue.stemIndex!], '丙');

// ── 指定大限：落宮與四化都來自該大限宮 ──
chart.daXians.forEach((dx, i) => {
  const f = getFlowLayers(chart, { year: 2026, month: 6, day: 1, hour: 0 }, i);
  const palace = chart.palaces.find(p => p.branch === dx.palaceBranch)!;
  assert.equal(f.layers.daxian.mingBranch, dx.palaceBranch, `daxian ${i} branch`);
  assert.deepEqual(f.layers.daxian.siHua, buildStarSiHuaMap(palace.stem), `daxian ${i} sihua`);
});

// 童限：第一個大限之前的虛歲
const childChart = generateChart({ year: 2020, month: 5, day: 5, hour: 3, gender: 'female' });
const childFlow = getFlowLayers(childChart, { year: 2021, month: 6, day: 1, hour: 0 });
if (childChart.daXians[0].startAge > 2) {
  assert.equal(childFlow.daXianIndex, CHILDHOOD_DAXIAN_INDEX);
  assert.notEqual(childFlow.layers.daxian.mingBranch, null);
}

// ── 與 iztro 交叉核對：自動選的大限落宮、流日／流時干 ──
let checked = 0;
for (const [y, m, d, h, g] of [
  [1960, 3, 8, 0, 'male'], [1975, 11, 23, 7, 'female'], [1988, 6, 15, 11, 'male'],
  [1999, 9, 9, 5, 'female'], [2004, 2, 29, 2, 'male'], [1952, 12, 31, 9, 'female'],
] as const) {
  const c = generateChart({ year: y, month: m, day: d, hour: h, gender: g });
  const astrolabe = createAstrolabe(c.birthInfo);
  for (const ty of [2000, 2010, 2020, 2026, 2035]) {
    if (ty <= y) continue; // 出生前沒有運限（另有斷言）
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

// ── 不合法目標日期要拒絕 ──
assert.throws(() => getFlowLayers(chart, { year: 1985, month: 6, day: 1, hour: 0 }), /before birth/);
assert.throws(() => getFlowLayers(chart, { year: 2026, month: 2, day: 30, hour: 0 }), RangeError);
assert.throws(() => getFlowLayers(chart, { year: 2026, month: 2, day: 1, hour: 12 }), RangeError);

console.log(`flow layers regression passed (${checked} iztro cross-checks)`);
