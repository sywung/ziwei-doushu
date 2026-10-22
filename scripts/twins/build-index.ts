/**
 * 建命理学双子索引：1950–2026 每天 × 12 时辰（与 v4 解读数据集同范围）
 *
 *   npx tsx scripts/twins/build-index.ts <outFile> [--jobs N] [--years 1990-1991]
 *
 * 每张盘约 13 ms，337,488 张（星曜与性别无关，只算一次）按年份切给 N 个子进程平行算，
 * 最后合并成 { keys, tiers: { main|sihua|full: { 签名: 键编号[] } } }。
 * 键为 `YYYY-MM-DD-时辰序号`（不含性别；查询结果两种性别都适用）。
 */
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { cpus, tmpdir } from 'node:os';
import path from 'node:path';
import { READING_YEAR_MAX, READING_YEAR_MIN } from '../../lib/reading/key';
import { chartSignatures } from '../../lib/twins/signature';
import { TWIN_TIERS } from '../../lib/twins/tiers';
import type { TwinsIndex } from '../../lib/twins/store';
import { generateChart } from '../../lib/ziwei/algorithm';

const pad2 = (n: number) => String(n).padStart(2, '0');

async function runWorker(yearFrom: number, yearTo: number, outFile: string) {
  const out = createWriteStream(outFile);
  for (let year = yearFrom; year <= yearTo; year++) {
    for (let d = new Date(Date.UTC(year, 0, 1)); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
      const month = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      for (let hour = 0; hour < 12; hour++) {
        const sig = chartSignatures(generateChart({ year, month, day, hour, gender: 'male' }));
        out.write(`${year}-${pad2(month)}-${pad2(day)}-${hour}\t${sig.main}\t${sig.sihua}\t${sig.full}\n`);
      }
    }
  }
  await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
}

function spawnWorker(yearFrom: number, yearTo: number, outFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [...process.execArgv, __filename, '--worker', String(yearFrom), String(yearTo), outFile],
      { stdio: ['ignore', 'inherit', 'inherit'] },
    );
    child.on('error', reject);
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`worker ${yearFrom}-${yearTo} exited ${code}`))));
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--worker') {
    await runWorker(Number(args[1]), Number(args[2]), args[3]);
    return;
  }

  const outFile = args[0];
  if (!outFile) {
    console.error('usage: tsx scripts/twins/build-index.ts <outFile> [--jobs N]');
    process.exit(2);
  }
  const jobsArg = args.indexOf('--jobs');
  const jobs = jobsArg >= 0 ? Number(args[jobsArg + 1]) : Math.max(1, cpus().length - 1);

  // --years 1990-1991 只算部分年份（试跑用）
  const yearsArg = args.indexOf('--years');
  const [yearMin, yearMax] = yearsArg >= 0
    ? args[yearsArg + 1].split('-').map(Number)
    : [READING_YEAR_MIN, READING_YEAR_MAX];
  const years = Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMin + i);
  const per = Math.ceil(years.length / jobs);
  const chunks = Array.from({ length: jobs }, (_, i) => years.slice(i * per, (i + 1) * per)).filter(c => c.length > 0);

  const workDir = await mkdtemp(path.join(tmpdir(), 'twins-'));
  try {
    const started = Date.now();
    const parts = chunks.map((c, i) => path.join(workDir, `part-${i}.tsv`));
    console.log(`${chunks.length} workers, ${years.length} years`);
    await Promise.all(chunks.map((c, i) => spawnWorker(c[0], c[c.length - 1], parts[i])));

    const index: TwinsIndex = {
      version: 1, yearMin, yearMax,
      keys: [], tiers: { main: {}, sihua: {}, full: {} },
    };
    for (const part of parts) {
      for (const line of (await readFile(part, 'utf8')).split('\n')) {
        if (!line) continue;
        const [key, ...sigs] = line.split('\t');
        const id = index.keys.push(key) - 1;
        TWIN_TIERS.forEach((tier, t) => (index.tiers[tier][sigs[t]] ??= []).push(id));
      }
    }
    await writeFile(outFile, JSON.stringify(index));
    const groups = TWIN_TIERS.map(t => `${t}=${Object.keys(index.tiers[t]).length}`).join(' ');
    console.log(`done in ${((Date.now() - started) / 60000).toFixed(1)} min: ${index.keys.length} charts, groups ${groups} → ${outFile}`);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
