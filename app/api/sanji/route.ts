/**
 * GET /api/sanji?corpus=tianji|renji                     → 书册与章目
 * GET /api/sanji?corpus=…&entries=1&book=&chapter=&q=&ids=&offset=&limit=  → 判语分页
 *
 * 语料目录由环境变量 SANJI_DATA_DIR 指定（其下 tianji/、renji/ 各放 entries.jsonl）。
 */
import { NextResponse } from 'next/server';
import { toHans } from '@/lib/i18n/hans';
import type { SanjiCorpus } from '@/lib/sanji/books';
import { createSanjiStore } from '@/lib/sanji/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const store = createSanjiStore(process.env.SANJI_DATA_DIR ?? '/data/corpus');
const CORPORA = new Set<SanjiCorpus>(['tianji', 'renji']);
const MAX_KEYWORD = 50;
const MAX_IDS = 500;

const intParam = (v: string | null) => (v === null || v === '' ? undefined : Number.isInteger(Number(v)) ? Number(v) : NaN);

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const corpus = sp.get('corpus') as SanjiCorpus;
  if (!CORPORA.has(corpus)) return NextResponse.json({ error: 'invalid-corpus' }, { status: 400 });

  try {
    if (!sp.has('entries')) {
      return NextResponse.json({ books: await store.books(corpus) }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    }

    const q = (sp.get('q') ?? '').trim();
    const offset = intParam(sp.get('offset'));
    const limit = intParam(sp.get('limit'));
    const idsRaw = sp.get('ids');
    const ids = idsRaw ? idsRaw.split(',').map(Number) : undefined;
    if (q.length > MAX_KEYWORD || Number.isNaN(offset) || Number.isNaN(limit) ||
        (ids && (ids.length > MAX_IDS || ids.some(n => !Number.isInteger(n) || n < 0)))) {
      return NextResponse.json({ error: 'invalid-query' }, { status: 400 });
    }

    const result = await store.query(corpus, {
      book: sp.get('book') || undefined,
      chapter: sp.get('chapter') || undefined,
      q: q ? toHans(q) : undefined,
      ids, offset, limit,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/sanji]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
