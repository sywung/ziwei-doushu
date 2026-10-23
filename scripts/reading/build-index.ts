/**
 * 為 v4.0 解讀數據集建索引
 *
 *   npx tsx scripts/reading/build-index.ts <dataDir> [indexDir]
 *
 * dataDir 放解壓後的 year-YYYY.jsonl；indexDir 默認為 <dataDir>/index。
 * 數據檔更新後要重跑，否則 store 會因鍵對不上而拒絕回傳。
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildYearIndex } from '../../lib/reading/store';

async function main() {
  const [dataDir, indexDirArg] = process.argv.slice(2);
  if (!dataDir) {
    console.error('usage: tsx scripts/reading/build-index.ts <dataDir> [indexDir]');
    process.exit(2);
  }
  const indexDir = indexDirArg ?? path.join(dataDir, 'index');
  await mkdir(indexDir, { recursive: true });

  const files = (await readdir(dataDir)).filter(f => /^year-\d{4}\.jsonl$/.test(f)).sort();
  if (files.length === 0) throw new Error(`no year-YYYY.jsonl in ${dataDir}`);

  let total = 0;
  for (const f of files) {
    const index = await buildYearIndex(path.join(dataDir, f));
    const n = Object.keys(index).length;
    total += n;
    await writeFile(path.join(indexDir, f.replace(/\.jsonl$/, '.json')), JSON.stringify(index));
    console.log(`${f}: ${n} keys`);
  }
  console.log(`done: ${files.length} files, ${total} keys → ${indexDir}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
