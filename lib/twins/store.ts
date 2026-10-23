/**
 * 命理學雙子查詢（僅服務端）：索引由 scripts/twins/build-index.ts 產生
 */
import { readFile } from 'node:fs/promises';
import { Solar } from 'lunar-javascript';
import { chartSignatures } from './signature';
import { TWIN_TIERS, type TwinTier } from './tiers';
import type { ZiweiChart } from '../ziwei/types';

export interface TwinsIndex {
  version: 1;
  yearMin: number;
  yearMax: number;
  /** `YYYY-MM-DD-時辰序號`（不含性別） */
  keys: string[];
  tiers: Record<TwinTier, Record<string, number[]>>;
}

export interface TwinTierResult {
  tier: TwinTier;
  /** 不含本盤自己（同日同時辰） */
  total: number;
  /** 均勻抽樣的同配置盤 */
  samples: string[];
  /** 其中與本盤同一農曆年出生的（同年同構：流年干支相同，運限節奏同步） */
  sameYear: { total: number; samples: string[] };
}

export interface TwinsResult {
  yearMin: number;
  yearMax: number;
  tiers: TwinTierResult[];
}

/** 索引鍵 `YYYY-MM-DD-時辰` 的農曆年（春節前屬上一年） */
export function lunarYearOfKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Solar.fromYmd(y, m, d).getLunar().getYear();
}

/** 從 n 個裡等距取 k 個，讓樣本鋪滿整個年代範圍而不是全擠在最早幾年 */
function spreadSample<T>(items: T[], k: number): T[] {
  if (items.length <= k) return items;
  return Array.from({ length: k }, (_, i) => items[Math.floor((i * items.length) / k)]);
}

export function createTwinsStore(indexFile: string) {
  let cached: Promise<TwinsIndex> | null = null;
  const load = () => {
    if (!cached) {
      cached = readFile(indexFile, 'utf8').then(s => {
        const index = JSON.parse(s) as TwinsIndex;
        if (index.version !== 1) throw new Error(`unsupported twins index version ${index.version}`);
        return index;
      });
      cached.catch(() => { cached = null; }); // 讀失敗不要永久緩存失敗結果
    }
    return cached;
  };

  async function find(chart: ZiweiChart, sampleSize = 40): Promise<TwinsResult> {
    const index = await load();
    const sigs = chartSignatures(chart);
    const { year, month, day, hour } = chart.birthInfo;
    const selfKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${hour}`;
    const selfLunarYear = lunarYearOfKey(selfKey);
    return {
      yearMin: index.yearMin,
      yearMax: index.yearMax,
      tiers: TWIN_TIERS.map(tier => {
        const keys = (index.tiers[tier][sigs[tier]] ?? []).map(id => index.keys[id]).filter(k => k !== selfKey);
        // 先用公曆年粗篩（農曆年只可能等於公曆年或前一年），再換算農曆年
        const sameYear = keys.filter(k => {
          const y = Number(k.slice(0, 4));
          return (y === selfLunarYear || y === selfLunarYear + 1) && lunarYearOfKey(k) === selfLunarYear;
        });
        return {
          tier, total: keys.length, samples: spreadSample(keys, sampleSize),
          sameYear: { total: sameYear.length, samples: spreadSample(sameYear, sampleSize) },
        };
      }),
    };
  }

  return { find };
}
