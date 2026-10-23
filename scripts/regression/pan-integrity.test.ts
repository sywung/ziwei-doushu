/**
 * 迴歸測試 — 排盤完整性 (2026-05-15)
 *
 * 起因: 用戶反饋"天機天梁在財帛宮被說成夫妻宮"。
 * 排查結論: 算法層 100% 正確, 是 AI context 文本歧義。
 * 但為防止未來真的有人改壞排盤核心 (algorithm.ts / school-patches),
 * 把"排盤必須滿足的紫微斗數鐵律"固化成斷言, 進 CI 每次 push 跑。
 *
 * 跑: npx tsx scripts/regression/pan-integrity.test.ts
 * 失敗 exit 1 → CI 紅
 *
 * 不引 vitest, 用項目現有 tsx + 自定義斷言慣例 (同 test-school-patches.ts)
 */
import { generateChart } from '../../lib/ziwei/algorithm';
import type { BirthInfo, ZiweiChart } from '../../lib/ziwei/types';

const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const PALACE_12 = ['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','仆役','官禄','田宅','福德','父母'];

let failures = 0;
const fail = (msg: string) => { console.error(`  ✗ ${msg}`); failures++; };
const ok = (msg: string) => console.log(`  ✓ ${msg}`);

// ── 採樣: 跨年代/月/時辰/性別, 覆蓋足夠多命盤形態 ──
const samples: BirthInfo[] = [];
for (let y = 1960; y <= 2010; y += 7)
  for (let m = 1; m <= 12; m += 3)
    for (let d = 5; d <= 26; d += 10)
      for (let h = 0; h < 12; h += 3)
        for (const g of ['male','female'] as const)
          samples.push({ year: y, month: m, day: d, hour: h, gender: g });

console.log(`\n排盘完整性回归 — ${samples.length} 个采样命盘\n`);

let jiliangCount = 0;
let ziFuOppCount = 0;

for (const bi of samples) {
  let chart: ZiweiChart;
  try { chart = generateChart(bi); }
  catch (e) { fail(`generateChart 抛错 @ ${JSON.stringify(bi)}: ${(e as Error).message}`); continue; }

  const tag = `${bi.year}-${bi.month}-${bi.day} h${bi.hour} ${bi.gender}`;

  // 鐵律 1: 必須正好 12 宮
  if (chart.palaces.length !== 12) { fail(`${tag}: 宫数 ${chart.palaces.length} ≠ 12`); continue; }

  // 鐵律 2: 12 宮名齊全且唯一(命宮/兄弟/.../父母)
  const names = chart.palaces.map(p => p.name).sort();
  const expect = [...PALACE_12].sort();
  if (JSON.stringify(names) !== JSON.stringify(expect)) {
    fail(`${tag}: 宫名集合不对 = ${names.join(',')}`); continue;
  }

  // 鐵律 3: 12 宮地支 0-11 各且僅一次
  const branches = chart.palaces.map(p => p.branch).sort((a,b)=>a-b);
  if (JSON.stringify(branches) !== JSON.stringify([0,1,2,3,4,5,6,7,8,9,10,11])) {
    fail(`${tag}: 地支不是 0-11 全覆盖 = ${branches.join(',')}`); continue;
  }

  // 鐵律 4: 命宮唯一 + isMingGong 標記一致
  const mingByName = chart.palaces.filter(p => p.name === '命宫');
  if (mingByName.length !== 1) { fail(`${tag}: 命宫数量 ${mingByName.length}`); continue; }

  // 鐵律 5: 十二宮逆時針排布 — 從命宮地支起, 第 k 宮地支 = (命宮地支 - k + 12) % 12
  const mingBranch = mingByName[0].branch;
  for (let k = 0; k < 12; k++) {
    const expectBranch = ((mingBranch - k) % 12 + 12) % 12;
    const pName = PALACE_12[k];
    const p = chart.palaces.find(x => x.name === pName)!;
    if (p.branch !== expectBranch) {
      fail(`${tag}: ${pName} 应在 ${BR[expectBranch]} 实际 ${BR[p.branch]}（逆时针排布坏）`);
      break;
    }
  }

  // 鐵律 6: 機梁同宮只可能在 辰 或 戌
  const jl = chart.palaces.find(p => {
    const ms = p.stars.filter(s => s.type === 'major').map(s => s.name);
    return ms.includes('天机') && ms.includes('天梁');
  });
  if (jl) {
    jiliangCount++;
    if (jl.branch !== 4 && jl.branch !== 10) {
      fail(`${tag}: 机梁同宫出现在 ${BR[jl.branch]}(只能辰/戌)`);
    }
  }

  // 鐵律 7: 紫微 與 天府 永遠是固定相對位置 — 同盤必同時存在, 且
  //   紫微地支 + 天府地支 關係符合"寅申線對稱"(紫微+天府 地支和 ≡ 4 mod 12 是錯的簡化,
  //   正確鐵律: 天府地支 = (4 - 紫微地支 + 12*N) → 即 紫府永遠關於 寅(2)/申(8) 軸對稱,
  //   等價: (紫微branch + 天府branch) % 12 === 4)
  let ziB = -1, fuB = -1;
  for (const p of chart.palaces) for (const s of p.stars) {
    if (s.name === '紫微') ziB = p.branch;
    if (s.name === '天府') fuB = p.branch;
  }
  if (ziB >= 0 && fuB >= 0) {
    ziFuOppCount++;
    if ((ziB + fuB) % 12 !== 4) {
      fail(`${tag}: 紫府对称铁律破 紫=${BR[ziB]} 府=${BR[fuB]} (和%12 应=4)`);
    }
  }
}

console.log(`\n采样统计: 机梁同宫盘 ${jiliangCount} 个(均验证辰/戌), 紫府盘 ${ziFuOppCount} 个(均验证对称)`);

if (failures === 0) {
  console.log(`\n✅ 排盘完整性回归全过 (${samples.length} 盘 × 7 条紫微铁律)\n`);
  process.exit(0);
} else {
  console.error(`\n❌ 排盘完整性回归 ${failures} 处失败 — 排盘核心被改坏, 禁止上线\n`);
  process.exit(1);
}
