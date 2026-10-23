/**
 * v4.0 解讀數據集查詢（僅服務端）
 *
 * 數據：`<dataDir>/year-YYYY.jsonl`，每年約 700 MB、8,760 行，不能每次查詢都整檔掃描。
 * 先用 scripts/reading/build-index.ts 為每個年份建 `<indexDir>/year-YYYY.json`
 * （鍵 → [字節偏移, 字節長度]），查詢時只讀那一行。
 */
import { createReadStream } from 'node:fs';
import { open, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  READING_TOPICS, isReadingYearCovered, parseReadingKey,
  type Reading, type ReadingTopic,
} from './key';

export type YearIndex = Record<string, [offset: number, length: number]>;

export interface ReadingStoreOptions {
  dataDir: string;
  indexDir: string;
}

export class ReadingNotFoundError extends Error {}

const NEWLINE = 0x0a;
const CR = 0x0d;
const KEY_HEAD_BYTES = 64;

/**
 * 逐字節掃描一個年份檔，算出每行的字節偏移與長度。
 * 不用 readline：它會把 \r\n 當換行默默吃掉，偏移就會錯一個字節。
 */
export async function buildYearIndex(file: string): Promise<YearIndex> {
  const index: YearIndex = {};
  let pos = 0;          // 檔案內目前字節位置
  let lineStart = 0;
  let lineNo = 1;
  let head: Buffer[] = [];  // 本行開頭最多 KEY_HEAD_BYTES 字節，用來取鍵
  let headLen = 0;
  let prevByte = -1;

  const endLine = (end: number) => {
    const length = end - lineStart;
    if (length > 0) {
      if (prevByte === CR) throw new Error(`${file}:${lineNo} has CRLF line ending; offsets would be wrong`);
      const m = /^\{"k":"([^"]+)"/.exec(Buffer.concat(head).toString('utf8'));
      if (!m) throw new Error(`${file}:${lineNo} does not start with a "k" field`);
      if (index[m[1]]) throw new Error(`${file}:${lineNo} duplicate key ${m[1]}`);
      index[m[1]] = [lineStart, length];
    }
    lineNo += 1;
    head = [];
    headLen = 0;
  };

  for await (const chunk of createReadStream(file) as AsyncIterable<Buffer>) {
    let from = 0;
    while (from < chunk.length) {
      const nl = chunk.indexOf(NEWLINE, from);
      const to = nl === -1 ? chunk.length : nl;
      if (headLen < KEY_HEAD_BYTES && to > from) {
        const piece = chunk.subarray(from, Math.min(to, from + KEY_HEAD_BYTES - headLen));
        head.push(piece);
        headLen += piece.length;
      }
      if (to > from) prevByte = chunk[to - 1];
      if (nl === -1) break;
      endLine(pos + nl);
      lineStart = pos + nl + 1;
      prevByte = -1;
      from = nl + 1;
    }
    pos += chunk.length;
  }
  endLine(pos); // 最後一行沒有換行符時
  return index;
}

export function createReadingStore({ dataDir, indexDir }: ReadingStoreOptions) {
  const indexCache = new Map<number, Promise<YearIndex>>();

  const loadIndex = (year: number): Promise<YearIndex> => {
    let cached = indexCache.get(year);
    if (!cached) {
      cached = readFile(path.join(indexDir, `year-${year}.json`), 'utf8').then(s => JSON.parse(s) as YearIndex);
      cached.catch(() => indexCache.delete(year)); // 讀失敗不要永久緩存失敗結果
      indexCache.set(year, cached);
    }
    return cached;
  };

  async function readLine(year: number, offset: number, length: number): Promise<string> {
    const fh = await open(path.join(dataDir, `year-${year}.jsonl`), 'r');
    try {
      const buf = Buffer.alloc(length);
      const { bytesRead } = await fh.read(buf, 0, length, offset);
      if (bytesRead !== length) throw new Error(`short read for year ${year} at ${offset}: ${bytesRead}/${length}`);
      return buf.toString('utf8');
    } finally {
      await fh.close();
    }
  }

  /** 查一張盤的 13 維解讀；數據集裡沒有時拋 ReadingNotFoundError */
  async function get(key: string): Promise<Reading> {
    const parsed = parseReadingKey(key);
    if (!parsed) throw new RangeError(`invalid reading key: ${key}`);
    if (!isReadingYearCovered(parsed.year)) throw new ReadingNotFoundError(`year ${parsed.year} not covered`);

    const entry = (await loadIndex(parsed.year))[key];
    if (!entry) throw new ReadingNotFoundError(`key ${key} not in dataset`);

    const row = JSON.parse(await readLine(parsed.year, entry[0], entry[1]));
    // 索引與數據檔不同步時，偏移會指到別人的盤；寧可報錯也不能回錯的解讀
    if (row.k !== key) throw new Error(`index out of sync: expected ${key}, got ${row.k}`);

    const content = {} as Record<ReadingTopic, string>;
    for (const topic of READING_TOPICS) {
      if (typeof row.c?.[topic] !== 'string') throw new Error(`row ${key} missing topic ${topic}`);
      content[topic] = row.c[topic];
    }
    return { key, mainStar: row.ms ?? null, content };
  }

  return { get };
}
