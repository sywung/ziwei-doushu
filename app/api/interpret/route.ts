/**
 * POST /api/interpret  { chart: { birthInfo }, messages: [{ role, content }] }
 *
 * AI 問盤：依命盤結構 + v4 斷語節錄回答，回傳 delta SSE（見 lib/ai/sse.ts）。
 * 命盤由服務端按出生資料重排，不信任前端的 chart 物件。模型設定見 lib/ai/llm.ts。
 */
import { NextResponse } from 'next/server';
import { chartFromUntrusted, currentTarget, describeChart, readingExcerpts } from '@/lib/ai/chart-context';
import { AiUpstreamError, getAiConfig, streamChat } from '@/lib/ai/llm';
import { interpretSystemPrompt, sanitizeMessages } from '@/lib/ai/prompts';
import { aiRateLimiter } from '@/lib/ai/rate-limit';
import { deltaStreamResponse, primeStream } from '@/lib/ai/sse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_OUTPUT_TOKENS = 2000;

export async function POST(req: Request) {
  const config = getAiConfig();
  if (!config) return NextResponse.json({ error: 'ai-not-configured' }, { status: 503 });

  const body = await req.json().catch(() => null);
  const chart = chartFromUntrusted(body?.chart);
  const messages = sanitizeMessages(body?.messages);
  if (!chart || !messages) return NextResponse.json({ error: 'invalid-request' }, { status: 400 });
  if (!aiRateLimiter.take()) return NextResponse.json({ error: 'rate-limited' }, { status: 429 });

  const system = interpretSystemPrompt(describeChart(chart, currentTarget()), await readingExcerpts(chart));
  const chunks = streamChat([{ role: 'system', content: system }, ...messages], {
    maxTokens: MAX_OUTPUT_TOKENS, signal: req.signal, config,
  });
  try {
    return deltaStreamResponse(await primeStream(chunks), err => console.error('[api/interpret]', err));
  } catch (err) {
    console.error('[api/interpret] upstream', err);
    const status = err instanceof AiUpstreamError && err.status === 429 ? 429 : 502;
    return NextResponse.json({ error: status === 429 ? 'rate-limited' : 'ai-upstream' }, { status });
  }
}
