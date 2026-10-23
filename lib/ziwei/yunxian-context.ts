import type { Palace, ZiweiChart } from './types';

export type YunxianView = 'mingpan' | 'daxian' | 'liunian' | 'xiaoxian' | 'liuyue' | 'liuri' | 'liushi';

/** 獨立童限選擇的專用 sentinel；-1 保留給“沒有所屬實際大限”。 */
export const CHILDHOOD_DAXIAN_INDEX = -2;

// 小限與流年一樣按所選流年（虛歲）定所屬大限，故同歸 FLOW_VIEWS。
const FLOW_VIEWS = new Set<YunxianView>(['liunian', 'xiaoxian', 'liuyue', 'liuri', 'liushi']);

function isValidDaXianIndex(chart: ZiweiChart, index: number | null | undefined): index is number {
  return typeof index === 'number'
    && Number.isInteger(index)
    && index >= 0
    && index < chart.daXians.length;
}

/** 按虛歲查所屬大限。大限年齡區間按首尾均包含處理。 */
export function getDaXianIndexForAge(chart: ZiweiChart, age: number): number {
  if (!Number.isFinite(age)) return -1;
  const safeAge = Math.trunc(age);
  return chart.daXians.findIndex(dx => safeAge >= dx.startAge && safeAge <= dx.endAge);
}

/** 農曆流年換算虛歲後查所屬大限。 */
export function getDaXianIndexForYear(chart: ZiweiChart, year: number): number {
  if (!Number.isFinite(year)) return -1;
  // UI 的 liunianYear 是農曆流年。春節前出生者的農曆生年可能比公曆小 1，
  // 虛歲必須用農曆年差，否則整組大限邊界會晚一年。
  return getDaXianIndexForAge(chart, Math.trunc(year) - chart.lunarInfo.lunarYear + 1);
}

/** 大限起始虛歲換算為對應農曆流年。 */
export function getDaXianStartYear(chart: ZiweiChart, index: number): number | null {
  if (!isValidDaXianIndex(chart, index)) return null;
  return chart.lunarInfo.lunarYear + chart.daXians[index].startAge - 1;
}

/** 返回該大限完整對應的公曆流年；正常大限恰好十年。 */
export function getDaXianYears(chart: ZiweiChart, index: number): number[] {
  if (!isValidDaXianIndex(chart, index)) return [];
  const dx = chart.daXians[index];
  const startYear = getDaXianStartYear(chart, index);
  if (startYear === null) return [];
  return Array.from({ length: dx.endAge - dx.startAge + 1 }, (_, offset) => startYear + offset);
}

/** 主流排盤口徑把第一實際大限之前的 1..起限-1 虛歲作為獨立童限。 */
export function getChildhoodYears(chart: ZiweiChart): number[] {
  const firstStartAge = chart.daXians[0]?.startAge;
  if (!Number.isFinite(firstStartAge) || firstStartAge <= 1) return [];
  return Array.from({ length: firstStartAge - 1 }, (_, offset) => chart.lunarInfo.lunarYear + offset);
}

export function isChildhoodYear(chart: ZiweiChart, year: number): boolean {
  const age = Math.trunc(year) - chart.lunarInfo.lunarYear + 1;
  const firstStartAge = chart.daXians[0]?.startAge;
  return Number.isFinite(firstStartAge) && age >= 1 && age < firstStartAge;
}

/**
 * 童限大命相對本命命宮的地支偏移（虛歲 1–5）。
 * 與四張金標準盤逐年宮底「大命」同一套：虛歲1=本命命宮，其後 −4/−1/+3/+4。
 * 陽男亥→未→午→酉；陰男亥→未；陽女亥→未→午→酉→丑；立春陰女未→卯→寅→巳→酉。
 */
const CHILDHOOD_MING_OFFSET: Record<number, number> = {
  1: 0,
  2: -4,
  3: -5,
  4: -2,
  5: 2,
};

/**
 * 童限大命所在本命宮（用來取宮干，再走 getSiHuaByStem / 大昌大麴）。
 * 有農曆流年且虛歲 1–5：按 CHILDHOOD_MING_OFFSET 走宮。
 * 無年或表外年：陰女回退命宮−2（保住已鎖 2026=巳），其餘取本命命宮。
 */
export function getChildhoodDaXianPalace(chart: ZiweiChart, year?: number): Palace | null {
  if (getChildhoodYears(chart).length === 0) return null;
  if (year != null) {
    const age = Math.trunc(year) - chart.lunarInfo.lunarYear + 1;
    if (age in CHILDHOOD_MING_OFFSET) {
      const branch = ((chart.mingGongBranch + CHILDHOOD_MING_OFFSET[age]) % 12 + 12) % 12;
      return chart.palaces.find((p) => p.branch === branch) ?? null;
    }
  }
  const yinFemale = chart.yinYangGender === '阴女'
    || (chart.birthInfo.gender === 'female' && chart.lunarInfo.yearStem % 2 === 1);
  const branch = yinFemale
    ? ((chart.mingGongBranch - 2) % 12 + 12) % 12
    : chart.mingGongBranch;
  return chart.palaces.find((p) => p.branch === branch) ?? null;
}

/**
 * 所有運限界面共用的大限來源：
 * - 大限視圖使用用戶點選的大限；
 * - 流年、流月、流日、流時使用所選流年實際所屬的大限；
 * - 本命或異常輸入回退現實當前大限。
 */
export function resolveEffectiveDaXianIndex(
  chart: ZiweiChart,
  view: YunxianView,
  liunianYear: number,
  selectedDaXianIndex?: number | null,
): number {
  if (view === 'daxian' && isValidDaXianIndex(chart, selectedDaXianIndex)) {
    return selectedDaXianIndex;
  }
  if (view === 'daxian' && selectedDaXianIndex === CHILDHOOD_DAXIAN_INDEX && getChildhoodYears(chart).length > 0) {
    return CHILDHOOD_DAXIAN_INDEX;
  }

  if (FLOW_VIEWS.has(view)) {
    const yearIndex = getDaXianIndexForYear(chart, liunianYear);
    // -1 表示童限或超出已生成的大限範圍；不能錯誤回退到現實當前大限。
    return isValidDaXianIndex(chart, yearIndex) ? yearIndex : -1;
  }

  if (isValidDaXianIndex(chart, chart.currentDaXianIndex)) return chart.currentDaXianIndex;
  // 真實童限時 currentDaXianIndex=-1；不能為了有值而誤套第一個實際大限。
  return -1;
}
