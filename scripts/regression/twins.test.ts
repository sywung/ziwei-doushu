import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chartSignatures } from '../../lib/twins/signature';
import { createTwinsStore, lunarYearOfKey, type TwinsIndex } from '../../lib/twins/store';
import { clockWindows, formatClockWindow } from '../../lib/twins/clock-windows';
import { TWIN_TIERS } from '../../lib/twins/tiers';
import { generateChart } from '../../lib/ziwei/algorithm';
import type { ZiweiChart } from '../../lib/ziwei/types';

// 獨立寫一份「相對命宮的配置描述」，不沿用 signature.ts 的實作，用來檢驗簽名的語意
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
  // 四化落在非主星、非輔煞的星上時也要算進去
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

// ── 樣本：1990–2001 每年 10 個時刻（跨 12 年，年干年支都會變，四化與年系星才有差異）──
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

// 簽名相同 ⇔ 配置描述相同（兩個方向都要成立）
for (const tier of TWIN_TIERS) {
  for (let i = 0; i < charts.length; i++) {
    for (let j = i + 1; j < charts.length; j++) {
      const sameSig = sigs[i][tier] === sigs[j][tier];
      const sameDesc = DESCRIBE[tier](charts[i].chart) === DESCRIBE[tier](charts[j].chart);
      assert.equal(sameSig, sameDesc, `${tier} ${charts[i].key} vs ${charts[j].key}`);
    }
  }
}

// 層級包含：全盤相同 ⇒ 主星＋四化相同 ⇒ 主星格局相同
for (let i = 0; i < charts.length; i++) {
  for (let j = i + 1; j < charts.length; j++) {
    if (sigs[i].full === sigs[j].full) assert.equal(sigs[i].sihua, sigs[j].sihua);
    if (sigs[i].sihua === sigs[j].sihua) assert.equal(sigs[i].main, sigs[j].main);
  }
}

// 樣本里要真的有「同組但不同盤」，否則上面的雙向檢驗等於沒測
const mainGroups = new Set(sigs.map(s => s.main)).size;
assert.ok(mainGroups > 1 && mainGroups < charts.length, `main groups ${mainGroups}`);

// 有「主星相同但四化不同」的配對，四化那一層才算真的被測到
const mainButNotSihua = sigs.some((a, i) => sigs.some((b, j) => i !== j && a.main === b.main && a.sihua !== b.sihua));
assert.ok(mainButNotSihua, 'sample needs pairs with same main layout but different 四化');

// ── 合成變動：每顆輔煞星搬到別宮 → 只有全盤簽名改變；改四化 → 主星簽名不變 ──
const clone = (c: ZiweiChart): ZiweiChart => JSON.parse(JSON.stringify(c));
const baseChart = charts[0].chart;
const baseSig = chartSignatures(baseChart);
for (const name of AUX) {
  const moved = clone(baseChart);
  const from = moved.palaces.find(p => p.stars.some(s => s.name === name));
  if (!from) continue; // 本盤沒有這顆星（不應發生，下面會檢查數量）
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

// 移動主星 → 三層都變
const mainMoved = clone(baseChart);
const majorFrom = mainMoved.palaces.find(p => p.stars.some(s => s.type === 'major'))!;
const major = majorFrom.stars.find(s => s.type === 'major')!;
majorFrom.stars = majorFrom.stars.filter(s => s !== major);
mainMoved.palaces.find(p => p.branch === (majorFrom.branch + 1) % 12)!.stars.push(major);
assert.notEqual(chartSignatures(mainMoved).main, baseSig.main);

// 性別不影響簽名
for (const [y, m, d, h] of [[1955, 3, 3, 0], [1972, 8, 15, 6], [2001, 12, 31, 11]]) {
  assert.deepEqual(
    chartSignatures(generateChart({ year: y, month: m, day: d, hour: h, gender: 'male' })),
    chartSignatures(generateChart({ year: y, month: m, day: d, hour: h, gender: 'female' })),
  );
}

// ── store：排除自己、兩種性別同結果、樣本等距鋪開 ──
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

    const self = charts.find((c, i) => sigs.filter(s => s.main === sigs[i].main).length > 4)!; // 要有足夠多同組的盤才測得到抽樣
    const result = await store.find(self.chart, 3);
    for (const t of result.tiers) {
      const selfSig = sigs[charts.indexOf(self)];
      const expected = charts.filter((c, i) => c.key !== self.key && sigs[i][t.tier] === selfSig[t.tier]).map(c => c.key);
      assert.equal(t.total, expected.length, `${t.tier} total`);
      assert.ok(!t.samples.includes(self.key), `${t.tier} excludes self`);
      assert.ok(t.samples.every(k => expected.includes(k)), `${t.tier} samples are twins`);
      assert.equal(t.samples.length, Math.min(3, expected.length));
      if (expected.length > 3) assert.equal(t.samples[0], expected[0]); // 等距抽樣從頭開始
      // 樣本都在 3–8 月，農曆年 = 公曆年
      const sameYear = expected.filter(k => k.slice(0, 4) === self.key.slice(0, 4));
      assert.equal(t.sameYear.total, sameYear.length, `${t.tier} sameYear total`);
      assert.ok(t.sameYear.samples.every(k => sameYear.includes(k)), `${t.tier} sameYear samples`);
    }

    // 同年以農曆年計：春節（1990-01-27）前出生屬 1989 年。手造一組跨春節的同配置盤
    const juneChart = generateChart({ year: 1990, month: 6, day: 1, hour: 3, gender: 'male' });
    const selfSig = chartSignatures(juneChart).main;
    const boundaryKeys = ['1989-03-01-0', '1990-01-20-0', '1990-01-27-0', '1990-12-31-0', '1991-02-10-0', '1991-02-20-0'];
    const boundaryFile = path.join(dir, 'boundary.json');
    await writeFile(boundaryFile, JSON.stringify({
      version: 1, yearMin: 1989, yearMax: 1991, keys: boundaryKeys,
      tiers: { main: { [selfSig]: boundaryKeys.map((_, i) => i) }, sihua: {}, full: {} },
    }));
    const boundary = await createTwinsStore(boundaryFile).find(juneChart, 10);
    const mainTier = boundary.tiers.find(t => t.tier === 'main')!;
    // 1990 庚午年：1990-01-27 春節起至 1991-02-14 除夕
    assert.deepEqual(mainTier.sameYear.samples, ['1990-01-27-0', '1990-12-31-0', '1991-02-10-0']);

    const female = await store.find(generateChart({ ...self.chart.birthInfo, gender: 'female' }), 3);
    assert.deepEqual(female.tiers, result.tiers);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ── 同盤時刻表：北京 1990-01-01 辰時，參考 metisziwei 線上結果「當日 07:18–09:17」──
assert.equal(lunarYearOfKey('1990-01-26-0'), 1989);
assert.equal(lunarYearOfKey('1990-01-27-0'), 1990);
const jan1 = { year: 1990, month: 1, day: 1 };
assert.deepEqual(clockWindows(jan1, 4, 116.4).map(formatClockWindow), ['当日 07:18–09:17']);
// 子時（視為次日）：前一日晚子＋當日早子，連成一段
assert.deepEqual(clockWindows(jan1, 0, 116.4).map(formatClockWindow), ['前一日 23:18–当日 01:17']);
// 視為當日：本日早子＋本日晚子兩段
assert.deepEqual(clockWindows(jan1, 0, 116.4, 'current-day').map(formatClockWindow), ['当日 00:18–01:17', '当日 23:18–次日 00:17']);
// 每個時辰的窗口約 120 分鐘（視為次日時）；均時差隨鐘錶時間微變，邊界可差 1 分鐘
for (let b = 0; b < 12; b++) {
  const total = clockWindows(jan1, b, 121.5).reduce((n, w) => n + w.endMinute - w.startMinute + 1, 0);
  assert.ok(Math.abs(total - 120) <= 1, `branch ${b} window length ${total}`);
}

main().then(
  () => console.log(`twins regression passed (${charts.length} charts, ${mainGroups} main groups)`),
  err => { console.error(err); process.exit(1); },
);
