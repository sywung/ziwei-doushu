/**
 * 为 v4.0 解读数据集建索引
 *
 *   npx tsx scripts/reading/build-index.ts <dataDir> [indexDir]
 *
 * dataDir 放解压后的 year-YYYY.jsonl；indexDir 默认为 <dataDir>/index。
 * 数据档更新后要重跑，否则 store 会因键对不上而拒绝回传。
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
