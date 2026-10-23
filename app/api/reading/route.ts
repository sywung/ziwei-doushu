/**
 * GET /api/reading?key=YYYY-MM-DD-時辰序號-性別
 *
 * 從 v4.0 13 維解讀數據集查本命盤解讀，內容轉成台灣正體後回傳。
 * 數據目錄由環境變量 READING_DATA_DIR / READING_INDEX_DIR 指定（見 lib/reading/store.ts）。
 */
import { NextResponse } from 'next/server';
import { toHant } from '@/lib/i18n/hant';
import { READING_TOPICS, parseReadingKey, type Reading } from '@/lib/reading/key';
import { ReadingNotFoundError, createReadingStore } from '@/lib/reading/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const store = createReadingStore({
  dataDir: process.env.READING_DATA_DIR ?? '/data/v4/jsonl',
  indexDir: process.env.READING_INDEX_DIR ?? '/data/v4/index',
});

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('key') ?? '';
  if (!parseReadingKey(key)) {
    return NextResponse.json({ error: 'invalid-key' }, { status: 400 });
  }
  try {
    const reading = await store.get(key);
    const content = {} as Reading['content'];
    for (const topic of READING_TOPICS) content[topic] = toHant(reading.content[topic]);
    const body: Reading = { key, mainStar: reading.mainStar && toHant(reading.mainStar), content };
    // 數據集是確定性生成的，同一鍵永遠同一內容
    return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=86400' } });
  } catch (err) {
    if (err instanceof ReadingNotFoundError) {
      return NextResponse.json({ error: 'not-covered' }, { status: 404 });
    }
    console.error('[api/reading]', key, err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
