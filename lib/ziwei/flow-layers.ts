/**
 * 全时序运限层：大限 / 小限 / 流年 / 流月 / 流日 / 流时
 *
 * 每层要两样东西：
 *   1) 该层「命宫」落在本命盘哪个地支 → 推出该层十二宫名（命兄夫子财疾迁友官田福父，逆排）
 *   2) 该层四化
 * 来源分工：
 *   - 大限：chart.daXians（含童限口径，见 yunxian-context）
 *   - 小限、流年、流月、流日、流时的落宫：iztro horoscope()
 *   - 四化一律走 sihua.ts（金标准盘口径；与 iztro mutagen 抽样 2,700 组一致，闰月流月以 sihua.ts 为准）
 */
import { Solar } from 'lunar-javascript';
import { createAstrolabe, type LunarMonthPolicy } from './algorithm';
import { BRANCHES, STEMS } from './constants';
import {
  buildStarSiHuaMap, getDaXianSiHua, getLiuNianSiHua, getLiuRiSiHua, getLiuShiSiHua, getLiuYueSiHua,
} from './sihua';
import type { BirthInfo, SiHua, ZiweiChart } from './types';
import { CHILDHOOD_DAXIAN_INDEX, getChildhoodDaXianPalace } from './yunxian-context';

export type FlowLayerKey = 'daxian' | 'xiaoxian' | 'liunian' | 'liuyue' | 'liuri' | 'liushi';

export const FLOW_LAYER_KEYS: FlowLayerKey[] = ['daxian', 'xiaoxian', 'liunian', 'liuyue', 'liuri', 'liushi'];

export const FLOW_LAYER_LABEL: Record<FlowLayerKey, string> = {
  daxian: '大限', xiaoxian: '小限', liunian: '流年', liuyue: '流月', liuri: '流日', liushi: '流时',
};

/** 盘面上的短标：限·命、年·财… */
export const FLOW_LAYER_TAG: Record<FlowLayerKey, string> = {
  daxian: '限', xiaoxian: '小', liunian: '年', liuyue: '月', liuri: '日', liushi: '时',
};

/** 十二宫短名，自命宫起逆时针（地支递减）排列 */
const PALACE_SHORT = ['命', '兄', '夫', '子', '财', '疾', '迁', '友', '官', '田', '福', '父'];

/** 公历日期 + 时辰序号（0=子 … 11=亥） */
export interface FlowTarget {
  year: number;
  month: number;
  day: number;
  hour: number;
}

export interface FlowLayer {
  key: FlowLayerKey;
  /** 该层命宫所在地支；童限之外查不到大限时为 null */
  mingBranch: number | null;
  stemIndex: number | null;
  /** 该层干支，如「丙午」；大限只有宫干 */
  ganzhi: string;
  /** 星名 → 四化 */
  siHua: Record<string, SiHua>;
}

export interface FlowLayers {
  layers: Record<FlowLayerKey, FlowLayer>;
  /** 目标日期的农历，如「二〇二六年九月十三」 */
  lunarDate: string;
  /** 目标日期所属农历年（流年以农历年计，春节前仍属上一年） */
  lunarYear: number;
  /** 小限虚岁 */
  nominalAge: number;
  /** 实际采用的大限索引（-1：超出大限范围；CHILDHOOD_DAXIAN_INDEX：童限） */
  daXianIndex: number;
}

/** 该层宫名：branch 相对该层命宫的位置 */
export function flowPalaceShortName(mingBranch: number, branch: number): string {
  return PALACE_SHORT[((mingBranch - branch) % 12 + 12) % 12];
}

function layerFrom(
  key: FlowLayerKey, mingBranch: number | null, stemIndex: number | null, ganzhi: string,
): FlowLayer {
  return { key, mingBranch, stemIndex, ganzhi, siHua: stemIndex === null ? {} : buildStarSiHuaMap(stemIndex) };
}

/**
 * 计算目标时刻的各运限层。
 * @param daXianIndex 指定大限（大限视图点选）；不传则按目标日期所属虚岁取大限
 */
export function getFlowLayers(chart: ZiweiChart, target: FlowTarget, daXianIndex?: number): FlowLayers {
  const { year, month, day, hour } = target;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new RangeError(`solar date does not exist: ${year}-${month}-${day}`);
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 11) {
    throw new RangeError(`hour must be a branch index 0–11; received ${hour}`);
  }

  const birthInfo = chart.birthInfo as BirthInfo & { leapMonthPolicy?: LunarMonthPolicy };
  const astrolabe = createAstrolabe(birthInfo, birthInfo.leapMonthPolicy);
  const horo = astrolabe.horoscope(`${year}-${month}-${day}`, hour);
  // 出生前没有运限；iztro 此时回传负虚岁与 index -1，不能拿去查宫
  if (horo.age.nominalAge < 1) throw new RangeError(`target ${year}-${month}-${day} is before birth`);
  const branchOfIndex = (index: number) => BRANCHES.indexOf(astrolabe.palaces[index].earthlyBranch as string);
  const stemOf = (name: string) => STEMS.indexOf(name);

  // 目标日期的农历（流年、流月、流日四化都按农历）
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  const lunarYear = lunar.getYear();
  const rawLunarMonth = lunar.getMonth(); // 闰月为负
  const lunarDay = lunar.getDay();
  const isLeapMonth = rawLunarMonth < 0;

  // ── 大限 ──
  const nominalAge = horo.age.nominalAge;
  const firstStartAge = chart.daXians[0]?.startAge ?? 1;
  const resolvedDx = daXianIndex ?? (
    nominalAge < firstStartAge
      ? CHILDHOOD_DAXIAN_INDEX
      : chart.daXians.findIndex(dx => nominalAge >= dx.startAge && nominalAge <= dx.endAge)
  );
  const dxPalace = resolvedDx === CHILDHOOD_DAXIAN_INDEX
    ? getChildhoodDaXianPalace(chart, lunarYear)
    : chart.palaces.find(p => p.branch === chart.daXians[resolvedDx]?.palaceBranch) ?? null;
  const dxSiHua = dxPalace ? getDaXianSiHua(chart, resolvedDx, lunarYear) : null;
  const daxian = layerFrom(
    'daxian', dxPalace?.branch ?? null, dxSiHua?.stemIndex ?? null,
    dxPalace ? `${STEMS[dxPalace.stem]}${BRANCHES[dxPalace.branch]}` : '',
  );

  // ── 小限 ──
  const xiaoxian = layerFrom(
    'xiaoxian', branchOfIndex(horo.age.index), stemOf(horo.age.heavenlyStem),
    `${horo.age.heavenlyStem}${horo.age.earthlyBranch}`,
  );

  // ── 流年：农历年干 ──
  const ln = getLiuNianSiHua(lunarYear);
  const liunian = layerFrom(
    'liunian', branchOfIndex(horo.yearly.index), ln.stemIndex,
    `${horo.yearly.heavenlyStem}${horo.yearly.earthlyBranch}`,
  );

  // ── 流月：五虎遁；闰月按前后半月归属（sihua.ts 口径）──
  const nextYearStem = (ln.stemIndex + 1) % 10;
  const ly = getLiuYueSiHua(ln.stemIndex, Math.abs(rawLunarMonth), { isLeapMonth, liuriDay: lunarDay, nextYearStem });
  const liuyue = layerFrom(
    'liuyue', branchOfIndex(horo.monthly.index), ly.stemIndex,
    `${ly.stemName}${horo.monthly.earthlyBranch}`,
  );

  // ── 流日、流时：日干 → 五鼠遁时干 ──
  const lr = getLiuRiSiHua(lunarYear, Math.abs(rawLunarMonth), lunarDay, isLeapMonth);
  const liuri = layerFrom(
    'liuri', branchOfIndex(horo.daily.index), lr?.stemIndex ?? stemOf(horo.daily.heavenlyStem),
    `${horo.daily.heavenlyStem}${horo.daily.earthlyBranch}`,
  );
  const dayStem = lr?.stemIndex ?? stemOf(horo.daily.heavenlyStem);
  const ls = getLiuShiSiHua(dayStem, hour);
  const liushi = layerFrom(
    'liushi', branchOfIndex(horo.hourly.index), ls.stemIndex,
    `${ls.stemName}${BRANCHES[hour]}`,
  );

  return {
    layers: { daxian, xiaoxian, liunian, liuyue, liuri, liushi },
    lunarDate: horo.lunarDate,
    lunarYear,
    nominalAge,
    daXianIndex: resolvedDx,
  };
}
