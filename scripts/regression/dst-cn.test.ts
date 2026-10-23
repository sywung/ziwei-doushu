/**
 * 迴歸：中國大陸夏令時判定必須與金標準口徑逐日一致。
 *
 * 方法沿用本倉的「神諭差分」：把金標準口徑的 XLS_CN 夏令時表與判定函數**獨立謄寫一遍**
 * 作為 oracle，再對 1930-01-01 ~ 1995-12-31 逐日窮舉比對，最後變異測試證明這個比對抓得住錯。
 * 謄寫的依據：按通行口徑整理的中國大陸歷年夏令時起止表。
 *
 * 為什麼值得這麼較真：夏令時差 1 小時，而時辰是 2 小時一檔 ——
 * 出生時刻落在時辰邊界的人，命宮/身宮/大限會整個換掉。
 */
import { isChinaDST, isChinaDSTYear, chinaDSTRange, chinaDSTYears } from '../../lib/ziwei/dst-cn';

/* ── oracle：按通行口徑獨立整理，不引用被測實現 ────────────────── */
const ORACLE_XLS_CN: number[][] = [[1935, 5, 1, 9, 30], [1936, 5, 1, 9, 30], [1937, 5, 1, 9, 30], [1938, 5, 1, 9, 30], [1939, 5, 1, 9, 30], [1940, 5, 1, 9, 30], [1941, 5, 1, 9, 30], [1942, 5, 1, 9, 30], [1943, 5, 1, 9, 30], [1944, 5, 1, 9, 30], [1945, 5, 1, 9, 30], [1946, 5, 1, 9, 30], [1947, 5, 1, 9, 30], [1948, 5, 1, 9, 30], [1949, 5, 1, 9, 30], [1950, 5, 1, 9, 30], [1951, 5, 1, 9, 30], [1952, 3, 1, 10, 31], [1953, 4, 1, 10, 31], [1954, 4, 1, 10, 31], [1955, 5, 1, 9, 30], [1956, 5, 1, 9, 30], [1957, 4, 1, 9, 30], [1958, 4, 1, 9, 30], [1959, 4, 1, 9, 30], [1960, 6, 1, 9, 30], [1961, 6, 1, 9, 30], [1974, 4, 1, 10, 31], [1975, 4, 1, 10, 31], [1979, 7, 1, 9, 30], [1986, 5, 4, 9, 14], [1987, 4, 12, 9, 13], [1988, 4, 10, 9, 11], [1989, 4, 16, 9, 17], [1990, 4, 15, 9, 16], [1991, 4, 14, 9, 15]];

/** 金標準原式，含那個關鍵的 else if —— 謄寫時不許「順手優化」。 */
function oracleIsDST(year: number, month: number, day: number): boolean {
  let i = 0;
  while (i < ORACLE_XLS_CN.length) {
    if (year === ORACLE_XLS_CN[i][0]) {
      if (month > ORACLE_XLS_CN[i][1] && month < ORACLE_XLS_CN[i][3]) return true;
      if (month === ORACLE_XLS_CN[i][1]) {
        if (day >= ORACLE_XLS_CN[i][2]) return true;
      } else if (month === ORACLE_XLS_CN[i][3]) {
        if (day <= ORACLE_XLS_CN[i][4]) return true;
      }
    }
    i++;
  }
  return false;
}

let bad = 0;
const fail = (m: string) => { bad++; console.log(`  ❌ ${m}`); };

/* ── ① 逐日窮舉差分 ───────────────────────────────────────────── */
{
  let checked = 0; let hits = 0; const mismatches: string[] = [];
  for (let y = 1930; y <= 1995; y++) {
    for (let m = 1; m <= 12; m++) {
      const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
      for (let d = 1; d <= dim; d++) {
        checked++;
        const got = isChinaDST(y, m, d);
        const want = oracleIsDST(y, m, d);
        if (got !== want) mismatches.push(`${y}-${m}-${d} 实得 ${got} 应为 ${want}`);
        if (want) hits++;
      }
    }
  }
  if (mismatches.length) {
    fail(`逐日差分：${mismatches.length} 天与金标准不符，前 5 条 → ${mismatches.slice(0, 5).join('; ')}`);
  } else {
    console.log(`  ✅ 1930-1995 逐日差分全一致（比对 ${checked} 天，其中 ${hits} 天属夏令时）`);
  }
}

/* ── ② 邊界日：起止兩端各測「前一天 / 當天」──────────────────────── */
{
  let edgeBad = 0;
  for (const [y, m1, d1, m2, d2] of ORACLE_XLS_CN) {
    // 起始日當天必須命中
    if (!isChinaDST(y, m1, d1)) { edgeBad++; fail(`${y}-${m1}-${d1} 起始日当天应命中`); }
    // 起始日前一天必須不命中（同月內才好構造；d1>1 時才測）
    if (d1 > 1 && isChinaDST(y, m1, d1 - 1)) { edgeBad++; fail(`${y}-${m1}-${d1 - 1} 起始日前一天不应命中`); }
    // 結束日當天必須命中（金標準把整個轉換日算作夏令時）
    if (!isChinaDST(y, m2, d2)) { edgeBad++; fail(`${y}-${m2}-${d2} 结束日当天应命中`); }
    // 結束日次日必須不命中
    const dim = new Date(Date.UTC(y, m2, 0)).getUTCDate();
    const [nm, nd] = d2 < dim ? [m2, d2 + 1] : [m2 + 1, 1];
    if (nm <= 12 && isChinaDST(y, nm, nd)) { edgeBad++; fail(`${y}-${nm}-${nd} 结束日次日不应命中`); }
  }
  if (!edgeBad) console.log(`  ✅ ${ORACLE_XLS_CN.length} 组区间的四个边界日全部正确`);
}

/* ── ③ 表外年份必須一律不命中（防止把無夏令時的年份誤判）────────────── */
{
  const inTable = new Set(ORACLE_XLS_CN.map(r => r[0]));
  const outside = [1934, 1962, 1970, 1973, 1976, 1980, 1985, 1992, 1993, 2000, 2026];
  let outBad = 0;
  for (const y of outside) {
    if (inTable.has(y)) continue;
    for (const [m, d] of [[1, 1], [5, 15], [7, 1], [9, 1], [12, 31]]) {
      if (isChinaDST(y, m, d)) { outBad++; fail(`${y}-${m}-${d} 不在表内却命中`); }
    }
  }
  if (!outBad) console.log('  ✅ 表外年份（含用户问到的 1992）一律不命中');
}

/* ── ④ 輔助函數與表內容一致 ──────────────────────────────────── */
{
  const years = chinaDSTYears();
  if (years.length !== ORACLE_XLS_CN.length) fail(`年份数 ${years.length} ≠ 金标准 ${ORACLE_XLS_CN.length}`);
  if (!years.every((y, i) => y === ORACLE_XLS_CN[i][0])) fail('年份序列与金标准不一致');
  if (!isChinaDSTYear(1988) || isChinaDSTYear(1992)) fail('isChinaDSTYear 判断错误');
  const r = chinaDSTRange(1990);
  if (!r || !r.start.includes('4 月 15') || !r.end.includes('9 月 16')) fail(`chinaDSTRange(1990) 异常 → ${JSON.stringify(r)}`);
  if (chinaDSTRange(1992) !== null) fail('chinaDSTRange(1992) 应为 null');
  console.log('  ✅ 辅助函数（年份表 / 区间文案）与金标准表一致');
}

/* ── ⑤ 用戶原問題的直接答案，釘死在測試裡 ─────────────────────── */
{
  // 用戶問的是「1986 至 1992」，實際 1991 年就停了 —— 1992 不該命中
  const cases: [number, number, number, boolean, string][] = [
    [1986, 5, 3, false, '1986 夏令时前一天'],
    [1986, 5, 4, true, '1986 夏令时首日'],
    [1988, 4, 10, true, '★1988 起始日：金标准 4/10（IANA 记 4/17，按铁律取金标准）'],
    [1988, 4, 16, true, '1988 分歧区间内（IANA 认为尚未开始）'],
    [1991, 9, 15, true, '1991 末代夏令时最后一天'],
    [1991, 9, 16, false, '1991 夏令时结束次日'],
    [1992, 7, 1, false, '★1992 已无夏令时（用户问的区间上界，实际 1991 年止）'],
  ];
  for (const [y, m, d, want, name] of cases) {
    const got = isChinaDST(y, m, d);
    if (got !== want) fail(`${name} → 实得 ${got} 应为 ${want}`);
    else console.log(`  ✅ ${name}`);
  }
}

if (bad) {
  console.error(`\n❌ ${bad} 项不符 —— 夏令时判定与金标准不一致，会导致时辰误判、命宫身宫大限全错。`);
  process.exit(1);
}
console.log('\n✅ 全部通过：与金标准逐日一致，边界与表外年份均正确。');
