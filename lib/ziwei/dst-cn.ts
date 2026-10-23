/**
 * 中國大陸夏令時判定 —— 逐字對齊主流排盤口徑。
 *
 * 起因：用戶留言（2026-08-13）「1986年至1992年中國大陸執行夏令時，不知道該軟件是否核算在內？」
 * 當時答案是「沒有」：lib/ziwei/true-solar-time.ts 的口徑只有「東八區鐘錶時間 + 經度修正 + 均時差」，
 * 全站搜不到任何夏令時處理，表單也無提示。
 *
 * 為什麼這條要緊：夏令時期間鐘錶撥快 1 小時，而時辰是 2 小時一檔 ——
 * 出生時刻落在時辰邊界的人，命宮/身宮/大限會整個換掉。比經度修正（最多 17 分鐘）嚴重得多。
 *
 * ── 數據來源與口徑 ───────────────────────────────────────────────
 * 表與判定邏輯**按通行口徑整理**（XLS_CN 表與其判定函數），並經金標準盤核對。
 * 本倉鐵律是「排盤必須與主流排盤口徑一致」，所以照抄，不按自己的理解改。
 *
 * 與 IANA tzdata（Asia/Shanghai）比對過（2026-08-24，用 Node ICU 逐日採樣）：
 *   · 1986/1987/1989/1990/1991 起始日**完全一致**；
 *   · 結束日主流口徑一律比 IANA「最後一個整天」晚 1 天 —— 這是語義差異不是數據差異：
 *     IANA 在結束日 02:00 轉換，主流口徑把整個轉換日算作夏令時；
 *   · **1988 起始日是真分歧**：主流口徑 4/10，IANA 4/17（兩天都是週日）。按鐵律取主流口徑。
 *   · 1979 年之前分歧較大：IANA 的 Asia/Shanghai 對戰亂年代與建國初期記錄零散
 *     （多數年份記為無夏令時），主流口徑用的是一張簡化的全國表。同樣按鐵律取主流口徑。
 *
 * ── 為什麼只提示、不自動減 1 小時 ─────────────────────────────
 * 主流排盤軟件本身就只是彈窗告知（判定為夏令時時提示一段說明文案，
 * 全程沒有任何減 1 小時的動作）。這個設計是對的：
 *   **我們無法知道用戶報的是夏令時讀數、還是他自己已經換算過的標準時。**
 * 默默減一小時既可能算錯，又會把所有存量歷史命盤悄悄改掉。所以只告知，讓用戶自己決定。
 * 2026-09-30 站長同意：合盤電腦寬屏的夏令時說明浮層裡給一個「減 1 小時，改為 07:30」按鈕 ——
 *   仍是**用戶自己點**、點了可撤銷，從不自動減（components/heming/HemingStepForm.tsx）。
 */

/** 通行口徑 XLS_CN，逐字照抄：[年, 起月, 起日, 止月, 止日]，起止日**都含**。 */
const XLS_CN: readonly (readonly [number, number, number, number, number])[] = [
  [1935, 5, 1, 9, 30], [1936, 5, 1, 9, 30], [1937, 5, 1, 9, 30], [1938, 5, 1, 9, 30],
  [1939, 5, 1, 9, 30], [1940, 5, 1, 9, 30], [1941, 5, 1, 9, 30], [1942, 5, 1, 9, 30],
  [1943, 5, 1, 9, 30], [1944, 5, 1, 9, 30], [1945, 5, 1, 9, 30], [1946, 5, 1, 9, 30],
  [1947, 5, 1, 9, 30], [1948, 5, 1, 9, 30], [1949, 5, 1, 9, 30], [1950, 5, 1, 9, 30],
  [1951, 5, 1, 9, 30], [1952, 3, 1, 10, 31], [1953, 4, 1, 10, 31], [1954, 4, 1, 10, 31],
  [1955, 5, 1, 9, 30], [1956, 5, 1, 9, 30], [1957, 4, 1, 9, 30], [1958, 4, 1, 9, 30],
  [1959, 4, 1, 9, 30], [1960, 6, 1, 9, 30], [1961, 6, 1, 9, 30], [1974, 4, 1, 10, 31],
  [1975, 4, 1, 10, 31], [1979, 7, 1, 9, 30], [1986, 5, 4, 9, 14], [1987, 4, 12, 9, 13],
  [1988, 4, 10, 9, 11], [1989, 4, 16, 9, 17], [1990, 4, 15, 9, 16], [1991, 4, 14, 9, 15],
] as const;

/**
 * 該公曆日期是否處於中國大陸夏令時期間。
 *
 * ★ 判定邏輯逐字對齊通行口徑（見文件頭注）：**純按日期**，不看小時。
 *   原式：
 *     if (month > m1 && month < m2) return true;
 *     if (month == m1) { if (day >= d1) return true; }
 *     else if (month == m2) { if (day <= d2) return true; }
 *   注意 `else if` —— 當 month == m1 且 day < d1 時不會再去比 m2 分支，這與通行口徑一致，別「順手優化」。
 */
export function isChinaDST(year: number, month: number, day: number): boolean {
  for (const [y, m1, d1, m2, d2] of XLS_CN) {
    if (year !== y) continue;
    if (month > m1 && month < m2) return true;
    if (month === m1) {
      if (day >= d1) return true;
    } else if (month === m2) {
      if (day <= d2) return true;
    }
  }
  return false;
}

/** 該年是否在夏令時表內（用於表單在用戶選年份時就提前提示，不必等排完盤）。 */
export function isChinaDSTYear(year: number): boolean {
  return XLS_CN.some(([y]) => y === year);
}

/** 該年的夏令時區間（供文案展示）。不在表內返回 null。 */
export function chinaDSTRange(year: number): { start: string; end: string } | null {
  const hit = XLS_CN.find(([y]) => y === year);
  if (!hit) return null;
  const [, m1, d1, m2, d2] = hit;
  return { start: `${m1} 月 ${d1} 日`, end: `${m2} 月 ${d2} 日` };
}

/** 該年的夏令時起止（數字，供英文等其他語言自己拼月日；起止都含）。不在表內返回 null。 */
export function chinaDSTSpan(year: number): { startMonth: number; startDay: number; endMonth: number; endDay: number } | null {
  const hit = XLS_CN.find(([y]) => y === year);
  if (!hit) return null;
  const [, startMonth, startDay, endMonth, endDay] = hit;
  return { startMonth, startDay, endMonth, endDay };
}

/** 表內覆蓋的全部年份（升序），供文案與迴歸使用。 */
export function chinaDSTYears(): number[] {
  return XLS_CN.map(([y]) => y);
}
