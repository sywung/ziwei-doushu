/**
 * 全時序運限層：大限 / 小限 / 流年 / 流月 / 流日 / 流時
 *
 * 每層要兩樣東西：
 *   1) 該層「命宮」落在本命盤哪個地支 → 推出該層十二宮名（命兄夫子財疾遷友官田福父，逆排）
 *   2) 該層四化
 * 來源分工：
 *   - 大限：chart.daXians（含童限口徑，見 yunxian-context）
 *   - 小限、流年、流月、流日、流時的落宮：iztro horoscope()
 *   - 四化一律走 sihua.ts（金標準盤口徑；與 iztro mutagen 抽樣 2,700 組一致，閏月流月以 sihua.ts 為準）
 */
import { Solar } from 'lunar-javascript';
import { createAstrolabe, type LunarMonthPolicy } from './algorithm';
import { BRANCHES, STEMS } from './constants';
import {
  buildStarSiHuaMap, getDaXianSiHua, getLiuNianSiHua, getLiuRiSiHua, getLiuShiSiHua, getLiuYueSiHua,
} from './sihua';
import type { GengYearSihua } from './school-config';
import type { BirthInfo, SiHua, ZiweiChart } from './types';
import { CHILDHOOD_DAXIAN_INDEX, getChildhoodDaXianPalace } from './yunxian-context';

export type FlowLayerKey = 'daxian' | 'xiaoxian' | 'liunian' | 'liuyue' | 'liuri' | 'liushi';

export const FLOW_LAYER_KEYS: FlowLayerKey[] = ['daxian', 'xiaoxian', 'liunian', 'liuyue', 'liuri', 'liushi'];

export const FLOW_LAYER_LABEL: Record<FlowLayerKey, string> = {
  daxian: '大限', xiaoxian: '小限', liunian: '流年', liuyue: '流月', liuri: '流日', liushi: '流时',
};

/** 盤面上的短標：限·命、年·財… */
export const FLOW_LAYER_TAG: Record<FlowLayerKey, string> = {
  daxian: '限', xiaoxian: '小', liunian: '年', liuyue: '月', liuri: '日', liushi: '时',
};

/** 十二宮短名，自命宮起逆時針（地支遞減）排列 */
const PALACE_SHORT = ['命', '兄', '夫', '子', '财', '疾', '迁', '友', '官', '田', '福', '父'];

/** 公曆日期 + 時辰序號（0=子 … 11=亥） */
export interface FlowTarget {
  year: number;
  month: number;
  day: number;
  hour: number;
}

export interface FlowLayer {
  key: FlowLayerKey;
  /** 該層命宮所在地支；童限之外查不到大限時為 null */
  mingBranch: number | null;
  stemIndex: number | null;
  /** 該層干支，如「丙午」；大限只有宮干 */
  ganzhi: string;
  /** 星名 → 四化 */
  siHua: Record<string, SiHua>;
}

export interface FlowLayers {
  layers: Record<FlowLayerKey, FlowLayer>;
  /** 目標日期的農曆，如「二〇二六年九月十三」 */
  lunarDate: string;
  /** 目標日期所屬農曆年（流年以農曆年計，春節前仍屬上一年） */
  lunarYear: number;
  /** 小限虛歲 */
  nominalAge: number;
  /** 實際採用的大限索引（-1：超出大限範圍；CHILDHOOD_DAXIAN_INDEX：童限） */
  daXianIndex: number;
}

/** 該層宮名：branch 相對該層命宮的位置 */
export function flowPalaceShortName(mingBranch: number, branch: number): string {
  return PALACE_SHORT[((mingBranch - branch) % 12 + 12) % 12];
}

function layerFrom(
  key: FlowLayerKey, mingBranch: number | null, stemIndex: number | null, ganzhi: string,
  geng?: GengYearSihua,
): FlowLayer {
  return { key, mingBranch, stemIndex, ganzhi, siHua: stemIndex === null ? {} : buildStarSiHuaMap(stemIndex, geng) };
}

/**
 * 計算目標時刻的各運限層。
 * @param daXianIndex 指定大限（大限視圖點選）；不傳則按目標日期所屬虛歲取大限
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

  // 庚幹四化按命盤流派（chart.school）取變體，運限層與本命盤同一口徑
  const geng = chart.school?.gengYearSihua;
  const layer = (key: FlowLayerKey, mingBranch: number | null, stemIndex: number | null, ganzhi: string) =>
    layerFrom(key, mingBranch, stemIndex, ganzhi, geng);
  const birthInfo = chart.birthInfo as BirthInfo & { leapMonthPolicy?: LunarMonthPolicy };
  const astrolabe = createAstrolabe(birthInfo, birthInfo.leapMonthPolicy);
  const horo = astrolabe.horoscope(`${year}-${month}-${day}`, hour);
  // 出生前沒有運限；iztro 此時回傳負虛歲與 index -1，不能拿去查宮
  if (horo.age.nominalAge < 1) throw new RangeError(`target ${year}-${month}-${day} is before birth`);
  const branchOfIndex = (index: number) => BRANCHES.indexOf(astrolabe.palaces[index].earthlyBranch as string);
  const stemOf = (name: string) => STEMS.indexOf(name);

  // 目標日期的農曆（流年、流月、流日四化都按農曆）
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  const lunarYear = lunar.getYear();
  const rawLunarMonth = lunar.getMonth(); // 閏月為負
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
  const daxian = layer(
    'daxian', dxPalace?.branch ?? null, dxSiHua?.stemIndex ?? null,
    dxPalace ? `${STEMS[dxPalace.stem]}${BRANCHES[dxPalace.branch]}` : '',
  );

  // ── 小限 ──
  const xiaoxian = layer(
    'xiaoxian', branchOfIndex(horo.age.index), stemOf(horo.age.heavenlyStem),
    `${horo.age.heavenlyStem}${horo.age.earthlyBranch}`,
  );

  // ── 流年：農曆年干 ──
  const ln = getLiuNianSiHua(lunarYear);
  const liunian = layer(
    'liunian', branchOfIndex(horo.yearly.index), ln.stemIndex,
    `${horo.yearly.heavenlyStem}${horo.yearly.earthlyBranch}`,
  );

  // ── 流月：五虎遁；閏月按前後半月歸屬（sihua.ts 口徑）──
  const nextYearStem = (ln.stemIndex + 1) % 10;
  const ly = getLiuYueSiHua(ln.stemIndex, Math.abs(rawLunarMonth), { isLeapMonth, liuriDay: lunarDay, nextYearStem });
  const liuyue = layer(
    'liuyue', branchOfIndex(horo.monthly.index), ly.stemIndex,
    `${ly.stemName}${horo.monthly.earthlyBranch}`,
  );

  // ── 流日、流時：日干 → 五鼠遁時干 ──
  const lr = getLiuRiSiHua(lunarYear, Math.abs(rawLunarMonth), lunarDay, isLeapMonth);
  const liuri = layer(
    'liuri', branchOfIndex(horo.daily.index), lr?.stemIndex ?? stemOf(horo.daily.heavenlyStem),
    `${horo.daily.heavenlyStem}${horo.daily.earthlyBranch}`,
  );
  const dayStem = lr?.stemIndex ?? stemOf(horo.daily.heavenlyStem);
  const ls = getLiuShiSiHua(dayStem, hour);
  const liushi = layer(
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
