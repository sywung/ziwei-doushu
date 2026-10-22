import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chartSignatures } from '../../lib/twins/signature';
import { createTwinsStore, type TwinsIndex } from '../../lib/twins/store';
import { TWIN_TIERS } from '../../lib/twins/tiers';
import { generateChart } from '../../lib/ziwei/algorithm';
import type { ZiweiChart } from '../../lib/ziwei/types';

// 独立写一份「相对命宫的配置描述」，不沿用 signature.ts 的实作，用来检验签名的语意
const AUX = ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '擎羊', '陀罗', '火星', '铃星', '地空', '地劫', '禄存', '天马'];
function describe(chart: ZiweiChart, withSihua: boolean, withAux: boolean): string {
  const rows: string[] = [];
  for (let offset = 0; offset < 12; offset++) {
    const branch = ((chart.mingGongBranch - offset) % 12 + 12) % 12;
    const palace = chart.palaces.find(p => p.branch === branch)!;
    const names = palace.stars
      .filter(s => s.type === 'major' || (withAux && AUX.includes(s.name)))
      .map(s => s.name + (withSihua && s.siHua ? `[${s.siHua}]` : ''))
      .sort();
    rows.push(`${offset}:${names.join('/')}`);
  }
  // 四化落在非主星、非辅煞的星上时也要算进去
  if (withSihua) {
    rows.push(chart.palaces.flatMap(p => p.stars.filter(s => s.siHua).map(s => `${s.siHua}${s.name}`)).sort().join(','));
  }
  return rows.join(' ');
}
const DESCRIBE = {
  main: (c: ZiweiChart) => describe(c, false, false),
  sihua: (c: ZiweiChart) => describe(c, true, false),
  full: (c: ZiweiChart) => describe(c, true, true),
};

// ── 样本：1990–2001 每年 10 个时刻（跨 12 年，年干年支都会变，四化与年系星才有差异）──
const charts: { key: string; chart: ZiweiChart }[] = [];
for (let year = 1990; year <= 2001; year++) {
  for (let i = 0; i < 10; i++) {
    const month = 3 + (i % 6);
    const day = 1 + ((i * 7) % 27);
    const hour = (i * 5 + year) % 12;
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${hour}`;
    charts.push({ key, chart: generateChart({ year, month, day, hour, gender: 'male' }) });
  }
}
const sigs = charts.map(c => chartSignatures(c.chart));

// 签名相同 ⇔ 配置描述相同（两个方向都要成立）
for (const tier of TWIN_TIERS) {
  for (let i = 0; i < charts.length; i++) {
    for (let j = i + 1; j < charts.length; j++) {
      const sameSig = sigs[i][tier] === sigs[j][tier];
      const sameDesc = DESCRIBE[tier](charts[i].chart) === DESCRIBE[tier](charts[j].chart);
      assert.equal(sameSig, sameDesc, `${tier} ${charts[i].key} vs ${charts[j].key}`);
    }
  }
}

// 层级包含：全盘相同 ⇒ 主星＋四化相同 ⇒ 主星格局相同
for (let i = 0; i < charts.length; i++) {
  for (let j = i + 1; j < charts.length; j++) {
    if (sigs[i].full === sigs[j].full) assert.equal(sigs[i].sihua, sigs[j].sihua);
    if (sigs[i].sihua === sigs[j].sihua) assert.equal(sigs[i].main, sigs[j].main);
  }
}

// 样本里要真的有「同组但不同盘」，否则上面的双向检验等于没测
const mainGroups = new Set(sigs.map(s => s.main)).size;
assert.ok(mainGroups > 1 && mainGroups < charts.length, `main groups ${mainGroups}`);

// 有「主星相同但四化不同」的配对，四化那一层才算真的被测到
const mainButNotSihua = sigs.some((a, i) => sigs.some((b, j) => i !== j && a.main === b.main && a.sihua !== b.sihua));
assert.ok(mainButNotSihua, 'sample needs pairs with same main layout but different 四化');

// ── 合成变动：每颗辅煞星搬到别宫 → 只有全盘签名改变；改四化 → 主星签名不变 ──
const clone = (c: ZiweiChart): ZiweiChart => JSON.parse(JSON.stringify(c));
const baseChart = charts[0].chart;
const baseSig = chartSignatures(baseChart);
for (const name of AUX) {
  const moved = clone(baseChart);
  const from = moved.palaces.find(p => p.stars.some(s => s.name === name));
  if (!from) continue; // 本盘没有这颗星（不应发生，下面会检查数量）
  const star = from.stars.find(s => s.name === name)!;
  from.stars = from.stars.filter(s => s !== star);
  moved.palaces.find(p => p.branch === (from.branch + 1) % 12)!.stars.push(star);
  const sig = chartSignatures(moved);
  assert.notEqual(sig.full, baseSig.full, `moving ${name} must change full`);
  assert.equal(sig.main, baseSig.main, `moving ${name} must not change main`);
}
assert.equal(AUX.filter(n => baseChart.palaces.some(p => p.stars.some(s => s.name === n))).length, AUX.length, 'all AUX stars present');

const sihuaChanged = clone(baseChart);
const luStar = sihuaChanged.palaces.flatMap(p => p.stars).find(s => s.siHua === '禄')!;
luStar.siHua = '忌';
const sihuaSig = chartSignatures(sihuaChanged);
assert.equal(sihuaSig.main, baseSig.main);
assert.notEqual(sihuaSig.sihua, baseSig.sihua);
assert.notEqual(sihuaSig.full, baseSig.full);

// 移动主星 → 三层都变
const mainMoved = clone(baseChart);
const majorFrom = mainMoved.palaces.find(p => p.stars.some(s => s.type === 'major'))!;
const major = majorFrom.stars.find(s => s.type === 'major')!;
majorFrom.stars = majorFrom.stars.filter(s => s !== major);
mainMoved.palaces.find(p => p.branch === (majorFrom.branch + 1) % 12)!.stars.push(major);
assert.notEqual(chartSignatures(mainMoved).main, baseSig.main);

// 性别不影响签名
for (const [y, m, d, h] of [[1955, 3, 3, 0], [1972, 8, 15, 6], [2001, 12, 31, 11]]) {
  assert.deepEqual(
    chartSignatures(generateChart({ year: y, month: m, day: d, hour: h, gender: 'male' })),
    chartSignatures(generateChart({ year: y, month: m, day: d, hour: h, gender: 'female' })),
  );
}

// ── store：排除自己、两种性别同结果、样本等距铺开 ──
async function main() {
  const index: TwinsIndex = {
    version: 1, yearMin: 1990, yearMax: 1990,
    keys: charts.map(c => c.key), tiers: { main: {}, sihua: {}, full: {} },
  };
  charts.forEach((_, id) => TWIN_TIERS.forEach(tier => (index.tiers[tier][sigs[id][tier]] ??= []).push(id)));

  const dir = await mkdtemp(path.join(tmpdir(), 'twins-'));
  try {
    const file = path.join(dir, 'index.json');
    await writeFile(file, JSON.stringify(index));
    const store = createTwinsStore(file);

    const self = charts.find((c, i) => sigs.filter(s => s.main === sigs[i].main).length > 4)!; // 要有足够多同组的盘才测得到抽样
    const result = await store.find(self.chart, 3);
    for (const t of result.tiers) {
      const selfSig = sigs[charts.indexOf(self)];
      const expected = charts.filter((c, i) => c.key !== self.key && sigs[i][t.tier] === selfSig[t.tier]).map(c => c.key);
      assert.equal(t.total, expected.length, `${t.tier} total`);
      assert.ok(!t.samples.includes(self.key), `${t.tier} excludes self`);
      assert.ok(t.samples.every(k => expected.includes(k)), `${t.tier} samples are twins`);
      assert.equal(t.samples.length, Math.min(3, expected.length));
      if (expected.length > 3) assert.equal(t.samples[0], expected[0]); // 等距抽样从头开始
    }

    const female = await store.find(generateChart({ ...self.chart.birthInfo, gender: 'female' }), 3);
    assert.deepEqual(female.tiers, result.tiers);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().then(
  () => console.log(`twins regression passed (${charts.length} charts, ${mainGroups} main groups)`),
  err => { console.error(err); process.exit(1); },
);
