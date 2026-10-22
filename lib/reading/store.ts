/**
 * v4.0 解读数据集查询（仅服务端）
 *
 * 数据：`<dataDir>/year-YYYY.jsonl`，每年约 700 MB、8,760 行，不能每次查询都整档扫描。
 * 先用 scripts/reading/build-index.ts 为每个年份建 `<indexDir>/year-YYYY.json`
 * （键 → [字节偏移, 字节长度]），查询时只读那一行。
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
 * 逐字节扫描一个年份档，算出每行的字节偏移与长度。
 * 不用 readline：它会把 \r\n 当换行默默吃掉，偏移就会错一个字节。
 */
export async function buildYearIndex(file: string): Promise<YearIndex> {
  const index: YearIndex = {};
  let pos = 0;          // 档案内目前字节位置
  let lineStart = 0;
  let lineNo = 1;
  let head: Buffer[] = [];  // 本行开头最多 KEY_HEAD_BYTES 字节，用来取键
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
  endLine(pos); // 最后一行没有换行符时
  return index;
}

export function createReadingStore({ dataDir, indexDir }: ReadingStoreOptions) {
  const indexCache = new Map<number, Promise<YearIndex>>();

  const loadIndex = (year: number): Promise<YearIndex> => {
    let cached = indexCache.get(year);
    if (!cached) {
      cached = readFile(path.join(indexDir, `year-${year}.json`), 'utf8').then(s => JSON.parse(s) as YearIndex);
      cached.catch(() => indexCache.delete(year)); // 读失败不要永久缓存失败结果
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

  /** 查一张盘的 13 维解读；数据集里没有时抛 ReadingNotFoundError */
  async function get(key: string): Promise<Reading> {
    const parsed = parseReadingKey(key);
    if (!parsed) throw new RangeError(`invalid reading key: ${key}`);
    if (!isReadingYearCovered(parsed.year)) throw new ReadingNotFoundError(`year ${parsed.year} not covered`);

    const entry = (await loadIndex(parsed.year))[key];
    if (!entry) throw new ReadingNotFoundError(`key ${key} not in dataset`);

    const row = JSON.parse(await readLine(parsed.year, entry[0], entry[1]));
    // 索引与数据档不同步时，偏移会指到别人的盘；宁可报错也不能回错的解读
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
