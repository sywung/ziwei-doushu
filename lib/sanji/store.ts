/**
 * 三纪语料查询（仅服务端）：`<dataDir>/<tianji|renji>/entries.jsonl` 整份载入内存（两份合计约 2.4 万条）
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  SANJI_BOOK_TITLE, hmsToSeconds,
  type SanjiBook, type SanjiCorpus, type SanjiEntry, type SanjiQueryResult,
} from './books';

export interface SanjiQuery {
  book?: string;
  chapter?: string;
  /** 已转成简体的关键字；比对原话、章目、子类 */
  q?: string;
  /** 只取这些 id（收藏） */
  ids?: number[];
  offset?: number;
  limit?: number;
}

export const SANJI_MAX_LIMIT = 100;

interface RawEntry {
  book: string; h2: string; h3: string; quote: string;
  bvid: string; part?: number; t_hms: string; note?: string;
}

function parseEntries(text: string, file: string): SanjiEntry[] {
  return text.split('\n').filter(Boolean).map((line, id) => {
    const r = JSON.parse(line) as RawEntry;
    const sec = hmsToSeconds(r.t_hms);
    if (!r.bvid || !Number.isFinite(sec)) throw new Error(`${file}:${id + 1} missing bvid or bad t_hms`);
    return {
      id, book: r.book, h2: r.h2 ?? '', h3: r.h3 ?? '', quote: r.quote ?? '',
      bvid: r.bvid, part: r.part ?? 1, t: r.t_hms, sec, note: r.note ?? '',
    };
  });
}

export function createSanjiStore(dataDir: string) {
  const cache = new Map<SanjiCorpus, Promise<SanjiEntry[]>>();
  const load = (corpus: SanjiCorpus) => {
    let p = cache.get(corpus);
    if (!p) {
      const file = path.join(dataDir, corpus, 'entries.jsonl');
      p = readFile(file, 'utf8').then(text => parseEntries(text, file));
      p.catch(() => cache.delete(corpus)); // 读失败不要永久缓存失败结果
      cache.set(corpus, p);
    }
    return p;
  };

  /** 书册与章目（保持语料原顺序） */
  async function books(corpus: SanjiCorpus): Promise<SanjiBook[]> {
    const byBook = new Map<string, Map<string, number>>();
    for (const e of await load(corpus)) {
      const chapters = byBook.get(e.book) ?? new Map<string, number>();
      chapters.set(e.h2, (chapters.get(e.h2) ?? 0) + 1);
      byBook.set(e.book, chapters);
    }
    return [...byBook].sort(([a], [b]) => a.localeCompare(b)).map(([id, chapters]) => ({
      id,
      title: SANJI_BOOK_TITLE[id] ?? id,
      count: [...chapters.values()].reduce((s, n) => s + n, 0),
      chapters: [...chapters].map(([name, count]) => ({ name, count })),
    }));
  }

  async function query(corpus: SanjiCorpus, q: SanjiQuery): Promise<SanjiQueryResult> {
    const offset = Math.max(0, Math.trunc(q.offset ?? 0));
    const limit = Math.min(SANJI_MAX_LIMIT, Math.max(1, Math.trunc(q.limit ?? 50)));
    const idSet = q.ids ? new Set(q.ids) : null;
    const keyword = q.q?.trim();
    const matched = (await load(corpus)).filter(e =>
      (!idSet || idSet.has(e.id)) &&
      (!q.book || e.book === q.book) &&
      (!q.chapter || e.h2 === q.chapter) &&
      (!keyword || e.quote.includes(keyword) || e.h2.includes(keyword) || e.h3.includes(keyword)));
    return { total: matched.length, offset, entries: matched.slice(offset, offset + limit) };
  }

  return { books, query };
}
