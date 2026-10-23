/**
 * AI 問盤對話紀錄：只存在使用者自己的瀏覽器（localStorage），不上傳、不存服務器。
 *
 * 每張盤（出生資料 + 流派）一份；只存 AI 來回的對話，不存資料集解讀（每則上萬字，重新載入即可）
 * 與錯誤訊息。超過上限時丟掉最舊的幾則；localStorage 滿了或被禁用就不存，不影響問盤。
 */

export interface StoredChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** 點宮位、四化自動送出的提問，畫面上不顯示提問泡泡 */
  hidden?: boolean;
}

/** Storage 的最小介面，測試時可換成記憶體實作 */
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

/** 由新到舊保留，直到超過則數或字數上限 */
export function trimHistory(messages: StoredChatMessage[]): StoredChatMessage[] {
  const kept: StoredChatMessage[] = [];
  let chars = 0;
  for (let i = messages.length - 1; i >= 0 && kept.length < MAX_STORED_MESSAGES; i--) {
    chars += messages[i].content.length;
    if (chars > MAX_STORED_CHARS) break;
    kept.unshift(messages[i]);
  }
  // 不要以 AI 回答開頭：缺了對應的提問，送回 AI 時上下文會錯位
  while (kept.length && kept[0].role === 'assistant') kept.shift();
  // 也不要以提問結尾：沒拿到回答（AI 失敗）的提問下次再問會變成兩則 user 連續
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
    // 配額滿或被禁用：這次不存，問盤照常
    console.warn('[chat-history] save failed', err);
  }
}

export function clearChatHistory(storage: ChatStorage | undefined, chartKey: string): void {
  try { storage?.removeItem(chatHistoryKey(chartKey)); } catch { /* 被禁用就算了 */ }
}

/** 瀏覽器端取 localStorage；服務端或被禁用時為 undefined */
export function browserChatStorage(): ChatStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
