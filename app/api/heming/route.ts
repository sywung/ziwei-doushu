/**
 * POST /api/heming  { chartA: { birthInfo }, chartB: { birthInfo }, question?: string }
 *
 * 合盘 AI 分析：两张盘的结构 + 断语节录 + 合盘方法论，回传 delta SSE。
 */
import { NextResponse } from 'next/server';
import { chartFromUntrusted, currentTarget, describeChart, readingExcerpts } from '@/lib/ai/chart-context';
import { AiUpstreamError, getAiConfig, streamChat } from '@/lib/ai/llm';
import { HEMING_DEFAULT_QUESTION, MAX_MESSAGE_CHARS, hemingSystemPrompt } from '@/lib/ai/prompts';
import { aiRateLimiter } from '@/lib/ai/rate-limit';
import { deltaStreamResponse, primeStream } from '@/lib/ai/sse';
import { HEMING_METHODOLOGY } from '@/lib/ziwei/heming-knowledge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_OUTPUT_TOKENS = 2500;

export async function POST(req: Request) {
  const config = getAiConfig();
  if (!config) return NextResponse.json({ error: 'ai-not-configured' }, { status: 503 });

  const body = await req.json().catch(() => null);
  const chartA = chartFromUntrusted(body?.chartA);
  const chartB = chartFromUntrusted(body?.chartB);
  const question = body?.question;
  if (!chartA || !chartB || (question !== undefined && (typeof question !== 'string' || question.length > MAX_MESSAGE_CHARS))) {
    return NextResponse.json({ error: 'invalid-request' }, { status: 400 });
  }
  if (!aiRateLimiter.take()) return NextResponse.json({ error: 'rate-limited' }, { status: 429 });

  const now = currentTarget();
  const [excerptsA, excerptsB] = await Promise.all([readingExcerpts(chartA), readingExcerpts(chartB)]);
  const system = hemingSystemPrompt(
    { chartText: describeChart(chartA, now), excerpts: excerptsA },
    { chartText: describeChart(chartB, now), excerpts: excerptsB },
    HEMING_METHODOLOGY,
  );
  const chunks = streamChat(
    [{ role: 'system', content: system }, { role: 'user', content: question?.trim() || HEMING_DEFAULT_QUESTION }],
    { maxTokens: MAX_OUTPUT_TOKENS, signal: req.signal, config },
  );
  try {
    return deltaStreamResponse(await primeStream(chunks), err => console.error('[api/heming]', err));
  } catch (err) {
    console.error('[api/heming] upstream', err);
    const status = err instanceof AiUpstreamError && err.status === 429 ? 429 : 502;
    return NextResponse.json({ error: status === 429 ? 'rate-limited' : 'ai-upstream' }, { status });
  }
}
