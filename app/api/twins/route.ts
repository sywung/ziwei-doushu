/**
 * GET /api/twins?key=YYYY-MM-DD-时辰序号-性别
 *
 * 在 1950–2026 全部命盘里找配置相同的盘（命理学双子）。
 * 索引档由环境变量 TWINS_INDEX_FILE 指定（见 scripts/twins/build-index.ts）。
 */
import { NextResponse } from 'next/server';
import { parseReadingKey } from '@/lib/reading/key';
import { createTwinsStore } from '@/lib/twins/store';
import { generateChart } from '@/lib/ziwei/algorithm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const store = createTwinsStore(process.env.TWINS_INDEX_FILE ?? '/data/twins/twins-index.json');

export async function GET(req: Request) {
  const parsed = parseReadingKey(new URL(req.url).searchParams.get('key') ?? '');
  if (!parsed) return NextResponse.json({ error: 'invalid-key' }, { status: 400 });
  try {
    const result = await store.find(generateChart(parsed));
    return NextResponse.json(result, { headers: { 'Cache-Control': 'public, max-age=86400' } });
  } catch (err) {
    console.error('[api/twins]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
