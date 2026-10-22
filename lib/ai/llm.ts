/**
 * OpenAI 相容的串流对话（预设接 Azure OpenAI v1 端点，仅服务端）
 *
 * 环境变数：
 *   AI_BASE_URL   例：https://<资源名>.openai.azure.com/openai/v1
 *   AI_API_KEY    金钥（Azure 用 api-key 标头）
 *   AI_MODEL      部署名称
 * 三者缺一就视为未设定，API 回 503，前端显示「AI 尚未设定」。
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class AiNotConfiguredError extends Error {}
export class AiUpstreamError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function getAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig | null {
  const baseUrl = env.AI_BASE_URL?.trim().replace(/\/+$/, '');
  const apiKey = env.AI_API_KEY?.trim();
  const model = env.AI_MODEL?.trim();
  return baseUrl && apiKey && model ? { baseUrl, apiKey, model } : null;
}

/** 逐段取出模型输出的文字；上游错误在第一个 chunk 前就抛出 */
export async function* streamChat(
  messages: ChatMessage[],
  opts: { maxTokens: number; signal?: AbortSignal; config?: AiConfig | null; fetchImpl?: typeof fetch },
): AsyncGenerator<string> {
  const config = opts.config === undefined ? getAiConfig() : opts.config;
  if (!config) throw new AiNotConfiguredError('AI_BASE_URL / AI_API_KEY / AI_MODEL not set');

  const res = await (opts.fetchImpl ?? fetch)(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': config.apiKey, Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, messages, stream: true, max_completion_tokens: opts.maxTokens }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new AiUpstreamError(`upstream ${res.status}: ${detail}`, res.status);
  }

  // SSE 一行可能被拆在两个 chunk 之间，要把不完整的尾巴留到下一次
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = done ? '' : lines.pop() ?? '';
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      let parsed: { choices?: { delta?: { content?: string } }[]; error?: { message?: string } };
      try {
        parsed = JSON.parse(data);
      } catch {
        throw new AiUpstreamError(`unparseable SSE line: ${data.slice(0, 120)}`, 502);
      }
      if (parsed.error) throw new AiUpstreamError(parsed.error.message ?? 'upstream stream error', 502);
      const text = parsed.choices?.[0]?.delta?.content;
      if (text) yield text;
    }
    if (done) return;
  }
}
