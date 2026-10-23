/**
 * 四化工具模塊 — 年干 / 大限宮干 / 流年干 / 流月干 / 流日干 / 流時干
 *                + 宮干自化檢測 + 來因宮追溯
 *
 * 排盤口徑（2026-07-21 鐵律：排盤以金標準盤為準）：
 *   本命四化 = 出生年天干四化（盤上硃紅印章，始終顯示）
 *   運限四化 = 大限宮干 / 流年干 / 流月干 / 流日干 / 流時干 → 疊層色章
 * 論斷正文仍按倪師；本模塊供排盤疊層使用。
 */

import { Lunar } from 'lunar-javascript';
import type { ZiweiChart, Palace, SiHua } from './types';
import { SI_HUA_TABLE, STEMS } from './constants';
import { CHILDHOOD_DAXIAN_INDEX, getChildhoodDaXianPalace } from './yunxian-context';
import { SCHOOL_SIHUA_GENG_VARIANTS, SCHOOL_STAR_ID_TO_NAME } from './school-data';
import type { GengYearSihua } from './school-config';

// ─── 1) 由天干索引取四化四星 ───────────────────────────────────
/** 天干索引 0-9 → { 祿, 權, 科, 忌 } 對應星名 */
const GENG_STEM_INDEX = 6;

/** 天干索引 → [祿, 權, 科, 忌] 星名；庚幹依流派「庚年四化」取變體（默認陽武陰同 = SI_HUA_TABLE） */
function siHuaRow(stemIndex: number, geng?: GengYearSihua): readonly [string, string, string, string] | undefined {
  if (stemIndex === GENG_STEM_INDEX && geng && geng !== 'GYWYT') {
    const [, lu, quan, ke, ji] = SCHOOL_SIHUA_GENG_VARIANTS[geng].map(id => SCHOOL_STAR_ID_TO_NAME[id]);
    return [lu, quan, ke, ji];
  }
  return SI_HUA_TABLE[stemIndex];
}

export function getSiHuaByStem(stemIndex: number, geng?: GengYearSihua): Record<SiHua, string> {
  const arr = siHuaRow(stemIndex, geng);
  if (!arr) return { 禄: '', 权: '', 科: '', 忌: '' };
  return { 禄: arr[0], 权: arr[1], 科: arr[2], 忌: arr[3] };
}

/** 星名 → 四化類型（由某天干確定） */
export function buildStarSiHuaMap(stemIndex: number, geng?: GengYearSihua): Record<string, SiHua> {
  const arr = siHuaRow(stemIndex, geng);
  if (!arr) return {};
  return { [arr[0]]: '禄', [arr[1]]: '权', [arr[2]]: '科', [arr[3]]: '忌' };
}

// ─── 2) 公曆年 → 年柱天干索引 ──────────────────────────────────
/** 公曆年份 → 年柱天干索引（0=甲, ... 9=癸） */
export function getYearStemIndex(year: number): number {
  return ((year - 4) % 10 + 10) % 10;
}

/** 公曆年份 → 年柱地支索引（0=子, ... 11=亥） */
export function getYearBranchIndex(year: number): number {
  return ((year - 4) % 12 + 12) % 12;
}

// ─── 3) 大限四化：取大限宮的宮干（非本命年干）───────────────
/**
 * 大限宮干四化
 * @param chart 命盤
 * @param dxIndex 大限索引（chart.daXians[dxIndex]）；童限傳 CHILDHOOD_DAXIAN_INDEX
 * @returns 該大限的四化四星
 */
export function getDaXianSiHua(
  chart: ZiweiChart,
  dxIndex: number,
  year?: number,
): { stemIndex: number; stemName: string; transforms: Record<SiHua, string> } | null {
  const dxPalace = dxIndex === CHILDHOOD_DAXIAN_INDEX
    ? getChildhoodDaXianPalace(chart, year)
    : (() => {
        const dx = chart.daXians[dxIndex];
        if (!dx) return null;
        return chart.palaces.find(p => p.branch === dx.palaceBranch) ?? null;
      })();
  if (!dxPalace) return null;
  const stemIndex = dxPalace.stem;
  return {
    stemIndex,
    stemName: STEMS[stemIndex] ?? '',
    transforms: getSiHuaByStem(stemIndex, chart.school?.gengYearSihua),
  };
}

// ─── 4) 流年四化 ──────────────────────────────────────────────
export function getLiuNianSiHua(year: number): {
  stemIndex: number;
  stemName: string;
  transforms: Record<SiHua, string>;
} {
  const stemIndex = getYearStemIndex(year);
  return {
    stemIndex,
    stemName: STEMS[stemIndex] ?? '',
    transforms: getSiHuaByStem(stemIndex),
  };
}

// ─── 5) 流月四化（月柱天干，由年干 + 月序推） ───────────────
/**
 * 流月天干（五虎遁：甲己年起丙寅、乙庚年起戊寅、丙辛年起庚寅、丁壬年起壬寅、戊癸年起甲寅）
 * month: 農曆月 1-12
 */
export function getLiuYueStemIndex(yearStem: number, month: number): number {
  // 五虎遁：正月（寅月）天干
  const startStemOfYin: Record<number, number> = {
    0: 2, 5: 2,  // 甲己 → 丙
    1: 4, 6: 4,  // 乙庚 → 戊
    2: 6, 7: 6,  // 丙辛 → 庚
    3: 8, 8: 8,  // 丁壬 → 壬
    4: 0, 9: 0,  // 戊癸 → 甲
  };
  const yinStem = startStemOfYin[yearStem] ?? 0;
  // 從寅（正月）到目標月（month 取 1-12）
  return (yinStem + ((month - 1) % 12) + 10) % 10;
}

export interface LiuYueSiHuaOptions {
  /** 閏月流月按實際農曆日的前後半月取本月/下月口徑。 */
  isLeapMonth?: boolean;
  liuriDay?: number;
  /** 閏十二月後半段跨到次年正月時使用的年干。 */
  nextYearStem?: number;
}

export function getEffectiveLiuYueMonth(month: number, options: LiuYueSiHuaOptions = {}): number {
  const normalizedMonth = Math.max(1, Math.min(12, Math.trunc(month)));
  if (!options.isLeapMonth || (options.liuriDay ?? 1) <= 15) return normalizedMonth;
  return normalizedMonth >= 12 ? 1 : normalizedMonth + 1;
}

export function getLiuYueSiHua(yearStem: number, month: number, options: LiuYueSiHuaOptions = {}): {
  stemIndex: number;
  stemName: string;
  transforms: Record<SiHua, string>;
  month: number;
} {
  const effectiveMonth = getEffectiveLiuYueMonth(month, options);
  const sourceYearStem = options.isLeapMonth
    && effectiveMonth === 1
    && (options.liuriDay ?? 1) > 15
    ? (options.nextYearStem ?? yearStem)
    : yearStem;
  const stemIndex = getLiuYueStemIndex(sourceYearStem, effectiveMonth);
  return {
    stemIndex,
    stemName: STEMS[stemIndex] ?? '',
    transforms: getSiHuaByStem(stemIndex),
    month: effectiveMonth,
  };
}

// ─── 5b) 流日四化（農曆日柱天干）──────────────────────────────
/**
 * 流日天干四化：用農曆年月日取日柱幹（通行口徑「顯示日干四化」）。
 * 閏月傳 isLeapMonth=true（lunar-javascript 以負月表示閏月）。
 */
export function getLiuRiSiHua(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  isLeapMonth = false,
): { stemIndex: number; stemName: string; transforms: Record<SiHua, string> } | null {
  try {
    const monthKey = isLeapMonth ? -Math.abs(lunarMonth) : Math.abs(lunarMonth);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lunar = (Lunar as any).fromYmd(lunarYear, monthKey, lunarDay) as { getDayGan(): string };
    const stemIndex = STEMS.indexOf(lunar.getDayGan());
    if (stemIndex < 0) return null;
    return {
      stemIndex,
      stemName: STEMS[stemIndex] ?? '',
      transforms: getSiHuaByStem(stemIndex),
    };
  } catch {
    return null;
  }
}

// ─── 5c) 流時四化（五鼠遁：日干起子時天干）───────────────────
/** 時支 0=子…11=亥；日干推時干後取四化 */
export function getLiuShiSiHua(dayStemIndex: number, hourBranch: number): {
  stemIndex: number;
  stemName: string;
  transforms: Record<SiHua, string>;
} {
  // 甲己→甲子，乙庚→丙子，丙辛→戊子，丁壬→庚子，戊癸→壬子
  const ziStemByDayStem: Record<number, number> = {
    0: 0, 5: 0,
    1: 2, 6: 2,
    2: 4, 7: 4,
    3: 6, 8: 6,
    4: 8, 9: 8,
  };
  const branch = ((Math.trunc(hourBranch) % 12) + 12) % 12;
  const stemIndex = ((ziStemByDayStem[dayStemIndex] ?? 0) + branch) % 10;
  return {
    stemIndex,
    stemName: STEMS[stemIndex] ?? '',
    transforms: getSiHuaByStem(stemIndex),
  };
}

// ─── 6) 宮干自化檢測 ──────────────────────────────────────────
/**
 * 自化：該宮宮干引發的四化，被化星恰在本宮
 * e.g. 宮干為甲（廉破武陽），如果本宮主星含"廉貞"，則該宮有"自化祿"
 */
export interface SelfSihua {
  siHua: SiHua;        // 祿/權/科/忌
  starName: string;    // 被化的星
}

export function detectSelfSihua(palace: Palace, geng?: GengYearSihua): SelfSihua[] {
  const transforms = getSiHuaByStem(palace.stem, geng);
  const found: SelfSihua[] = [];
  const palaceStarNames = new Set(palace.stars.map(s => s.name));
  (['禄', '权', '科', '忌'] as SiHua[]).forEach(sh => {
    const starName = transforms[sh];
    if (starName && palaceStarNames.has(starName)) {
      found.push({ siHua: sh, starName });
    }
  });
  return found;
}

// ─── 7) 來因宮追溯 ────────────────────────────────────────────
/**
 * 來因宮：對某顆星某種化，追溯是哪個宮的宮干"飛"過來的
 *
 * 倪師體系常用：化忌的來因宮——化忌由哪個宮位的"宮干"引發，那個宮位就是問題的根源宮位
 *
 * @param chart 命盤
 * @param starName 被化的星名（如 "太陰"）
 * @param sihua  四化類型（如 "忌"）
 * @returns 引發該化的宮位數組（通常只有一個，但若多宮宮干相同可能多個）
 */
export function findIncomingPalaces(
  chart: ZiweiChart,
  starName: string,
  sihua: SiHua,
): Palace[] {
  const result: Palace[] = [];
  chart.palaces.forEach(p => {
    const transforms = getSiHuaByStem(p.stem, chart.school?.gengYearSihua);
    if (transforms[sihua] === starName) {
      result.push(p);
    }
  });
  return result;
}

/**
 * 批量計算盤面所有宮位的自化列表
 */
export function buildAllSelfSihua(chart: ZiweiChart): Record<number, SelfSihua[]> {
  const result: Record<number, SelfSihua[]> = {};
  chart.palaces.forEach(p => {
    const list = detectSelfSihua(p, chart.school?.gengYearSihua);
    if (list.length > 0) result[p.branch] = list;
  });
  return result;
}

// ─── 8) 綜合覆蓋（overlay）：多個四化層疊加後的效果 ──────────
/**
 * 生成某星名 → 多層四化的合成視圖
 * 用於在宮位上同時顯示：本命化 / 大限化 / 流年化
 * 優先級：本命 < 大限 < 流年（但都標出來）
 */
export interface SiHuaOverlay {
  native?: SiHua;    // 本命（年干）
  daXian?: SiHua;    // 大限
  liuNian?: SiHua;   // 流年
  liuYue?: SiHua;    // 流月
}

export function buildOverlayForStar(
  starName: string,
  nativeMap: Record<string, SiHua>,
  daXianMap?: Record<string, SiHua>,
  liuNianMap?: Record<string, SiHua>,
  liuYueMap?: Record<string, SiHua>,
): SiHuaOverlay {
  return {
    native: nativeMap[starName],
    daXian: daXianMap?.[starName],
    liuNian: liuNianMap?.[starName],
    liuYue: liuYueMap?.[starName],
  };
}
