/**
 * 命理学双子查询（仅服务端）：索引由 scripts/twins/build-index.ts 产生
 */
import { readFile } from 'node:fs/promises';
import { chartSignatures } from './signature';
import { TWIN_TIERS, type TwinTier } from './tiers';
import type { ZiweiChart } from '../ziwei/types';

export interface TwinsIndex {
  version: 1;
  yearMin: number;
  yearMax: number;
  /** `YYYY-MM-DD-时辰序号`（不含性别） */
  keys: string[];
  tiers: Record<TwinTier, Record<string, number[]>>;
}

export interface TwinTierResult {
  tier: TwinTier;
  /** 不含本盘自己（同日同时辰） */
  total: number;
  /** 均匀抽样的同配置盘 */
  samples: string[];
}

export interface TwinsResult {
  yearMin: number;
  yearMax: number;
  tiers: TwinTierResult[];
}

/** 从 n 个里等距取 k 个，让样本铺满整个年代范围而不是全挤在最早几年 */
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
      cached.catch(() => { cached = null; }); // 读失败不要永久缓存失败结果
    }
    return cached;
  };

  async function find(chart: ZiweiChart, sampleSize = 40): Promise<TwinsResult> {
    const index = await load();
    const sigs = chartSignatures(chart);
    const { year, month, day, hour } = chart.birthInfo;
    const selfKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${hour}`;
    return {
      yearMin: index.yearMin,
      yearMax: index.yearMax,
      tiers: TWIN_TIERS.map(tier => {
        const keys = (index.tiers[tier][sigs[tier]] ?? []).map(id => index.keys[id]).filter(k => k !== selfKey);
        return { tier, total: keys.length, samples: spreadSample(keys, sampleSize) };
      }),
    };
  }

  return { find };
}
