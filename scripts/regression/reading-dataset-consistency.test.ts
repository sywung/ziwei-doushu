/**
 * v4 解读数据集 × 本仓库排盘引擎 一致性（需要真实资料，不在 npm test 里）
 *
 *   READING_DATA_DIR=/path/jsonl READING_INDEX_DIR=/path/index npm run test:reading-data
 *
 * 解读是按数据集那张盘写的；若本引擎排出的盘不同（命宫主星对不上），
 * 显示出来的就是别人的解读。每年等距抽样，比对命宫第一颗主星（数据集字段 ms）。
 */
import assert from 'node:assert/strict';
import { generateChart } from '../../lib/ziwei/algorithm';
import { READING_YEAR_MAX, READING_YEAR_MIN, readingKey } from '../../lib/reading/key';
import { createReadingStore } from '../../lib/reading/store';

const SAMPLES_PER_YEAR = Number(process.env.SAMPLES_PER_YEAR ?? 24);

async function main() {
  const dataDir = process.env.READING_DATA_DIR;
  const indexDir = process.env.READING_INDEX_DIR;
  if (!dataDir || !indexDir) {
    console.error('READING_DATA_DIR and READING_INDEX_DIR are required');
    process.exit(2);
  }
  const store = createReadingStore({ dataDir, indexDir });
  const mismatches: string[] = [];
  let checked = 0;

  for (let year = READING_YEAR_MIN; year <= READING_YEAR_MAX; year++) {
    for (let i = 0; i < SAMPLES_PER_YEAR; i++) {
      // 等距铺满全年、12 时辰、男女；跳过不存在的日期由 Date 换算保证
      const dayOfYear = Math.floor((i * 365) / SAMPLES_PER_YEAR);
      const date = new Date(Date.UTC(year, 0, 1 + dayOfYear));
      const info = {
        year, month: date.getUTCMonth() + 1, day: date.getUTCDate(),
        hour: (i * 5) % 12, gender: (i % 2 ? 'female' : 'male') as 'male' | 'female',
      };
      const key = readingKey(info);
      const reading = await store.get(key);
      const ming = generateChart(info).palaces.find(p => p.name === '命宫');
      const engineStar = ming?.stars.find(s => s.type === 'major')?.name ?? null;
      checked += 1;
      if (engineStar !== reading.mainStar) mismatches.push(`${key}: engine=${engineStar} dataset=${reading.mainStar}`);
    }
  }

  console.log(`checked ${checked} charts, ${mismatches.length} mismatches`);
  mismatches.slice(0, 20).forEach(m => console.log('  ' + m));
  assert.equal(mismatches.length, 0, 'engine and dataset disagree on 命宫主星');
  console.log('reading dataset consistency passed');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
