/**
 * 前后端共用的串流格式：每段 `data: {"delta":{"text":"…"}}`，结束送 `data: [DONE]`
 * （InsightPanel、合盘页沿用这个格式）。
 */

export const STREAM_INTERRUPTED_TEXT = '\n\n（AI 回应中断，请再试一次）';

/**
 * 服务端：先等到第一段输出再开始回应。上游错误（金钥错误、额度用完）多半在第一段之前就发生，
 * 这样还能回正确的 HTTP 状态码，而不是 200 加一句「中断」。
 */
export async function primeStream<T>(gen: AsyncGenerator<T>): Promise<AsyncIterable<T>> {
  const first = await gen.next();
  return (async function* () {
    if (first.done) return;
    yield first.value;
    yield* gen;
  })();
}

/** 服务端：把文字串流包成 SSE Response */
export function deltaStreamResponse(chunks: AsyncIterable<string>, onError: (err: unknown) => void): Response {
  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, payload: string) =>
    controller.enqueue(encoder.encode(`data: ${payload}\n\n`));

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const text of chunks) send(controller, JSON.stringify({ delta: { text } }));
      } catch (err) {
        onError(err);
        // 已经开始回应就不能改状态码，改用一段提示文字收尾
        send(controller, JSON.stringify({ delta: { text: STREAM_INTERRUPTED_TEXT } }));
      }
      send(controller, '[DONE]');
      controller.close();
    },
  });
  return new Response(body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}

/**
 * 客户端：读 delta 串流，每收到文字就回呼累积结果。
 * 一行 SSE 可能被拆在两个 chunk 之间，必须缓冲不完整的尾巴，否则那段文字会被默默丢掉。
 */
export async function readDeltaStream(res: Response, onText: (accumulated: string) => void): Promise<string> {
  if (!res.body) throw new Error('no response body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = done ? '' : lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return text;
      try {
        const delta = (JSON.parse(data) as { delta?: { text?: string } }).delta?.text ?? '';
        if (delta) {
          text += delta;
          onText(text);
        }
      } catch {
        console.error('[readDeltaStream] bad line', data.slice(0, 120));
      }
    }
    if (done) return text;
  }
}

/** 客户端：依 HTTP 状态给使用者看的说明 */
export function aiErrorMessage(status: number): string {
  if (status === 503) return 'AI 尚未设定（伺服器缺 AI_BASE_URL / AI_API_KEY / AI_MODEL），13 维解读不受影响。';
  if (status === 429) return 'AI 呼叫太频繁，请等一分钟再试。';
  if (status === 400) return '这次的提问内容无法处理（可能太长），请缩短后再试。';
  return 'AI 服务暂时无法回应，请稍后再试。';
}

export class AiHttpError extends Error {
  constructor(readonly status: number) { super(aiErrorMessage(status)); }
}
