/**
 * AI 问盘对话纪录：只存在使用者自己的浏览器（localStorage），不上传、不存服务器。
 *
 * 每张盘（出生资料 + 流派）一份；只存 AI 来回的对话，不存资料集解读（每则上万字，重新载入即可）
 * 与错误讯息。超过上限时丢掉最旧的几则；localStorage 满了或被禁用就不存，不影响问盘。
 */

export interface StoredChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** 点宫位、四化自动送出的提问，画面上不显示提问泡泡 */
  hidden?: boolean;
}

/** Storage 的最小介面，测试时可换成记忆体实作 */
export interface ChatStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEY_PREFIX = 'ziwei-ai-chat:v1:';
export const MAX_STORED_MESSAGES = 40;
export const MAX_STORED_CHARS = 60_000;

export function chatHistoryKey(chartKey: string): string {
  return KEY_PREFIX + chartKey;
}

function isStoredMessage(value: unknown): value is StoredChatMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return (m.role === 'user' || m.role === 'assistant')
    && typeof m.content === 'string' && m.content.length > 0
    && (m.hidden === undefined || typeof m.hidden === 'boolean');
}

/** 由新到旧保留，直到超过则数或字数上限 */
export function trimHistory(messages: StoredChatMessage[]): StoredChatMessage[] {
  const kept: StoredChatMessage[] = [];
  let chars = 0;
  for (let i = messages.length - 1; i >= 0 && kept.length < MAX_STORED_MESSAGES; i--) {
    chars += messages[i].content.length;
    if (chars > MAX_STORED_CHARS) break;
    kept.unshift(messages[i]);
  }
  // 不要以 AI 回答开头：缺了对应的提问，送回 AI 时上下文会错位
  while (kept.length && kept[0].role === 'assistant') kept.shift();
  // 也不要以提问结尾：没拿到回答（AI 失败）的提问下次再问会变成两则 user 连续
  while (kept.length && kept[kept.length - 1].role === 'user') kept.pop();
  return kept;
}

export function loadChatHistory(storage: ChatStorage | undefined, chartKey: string): StoredChatMessage[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(chatHistoryKey(chartKey)) ?? '[]');
    return Array.isArray(parsed) ? trimHistory(parsed.filter(isStoredMessage)) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(storage: ChatStorage | undefined, chartKey: string, messages: StoredChatMessage[]): void {
  if (!storage) return;
  const kept = trimHistory(messages.filter(isStoredMessage).map(({ role, content, hidden }) => (
    hidden ? { role, content, hidden } : { role, content }
  )));
  try {
    if (kept.length) storage.setItem(chatHistoryKey(chartKey), JSON.stringify(kept));
    else storage.removeItem(chatHistoryKey(chartKey));
  } catch (err) {
    // 配额满或被禁用：这次不存，问盘照常
    console.warn('[chat-history] save failed', err);
  }
}

export function clearChatHistory(storage: ChatStorage | undefined, chartKey: string): void {
  try { storage?.removeItem(chatHistoryKey(chartKey)); } catch { /* 被禁用就算了 */ }
}

/** 浏览器端取 localStorage；服务端或被禁用时为 undefined */
export function browserChatStorage(): ChatStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
