import assert from 'node:assert/strict';
import {
  MAX_STORED_CHARS, MAX_STORED_MESSAGES, chatHistoryKey, clearChatHistory, loadChatHistory, saveChatHistory,
  trimHistory, type ChatStorage, type StoredChatMessage,
} from '../../lib/ai/chat-history';

class MemoryStorage implements ChatStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

const q = (content: string, hidden?: boolean): StoredChatMessage => (hidden ? { role: 'user', content, hidden } : { role: 'user', content });
const a = (content: string): StoredChatMessage => ({ role: 'assistant', content });

// ── 往返；不同盘分开存 ──
const store = new MemoryStorage();
const convo = [q('点宫位', true), a('财帛宫…'), q('今年适合换工作吗？'), a('流年官禄…')];
saveChatHistory(store, '1990-01-01-4-male', convo);
assert.deepEqual(loadChatHistory(store, '1990-01-01-4-male'), convo);
assert.deepEqual(loadChatHistory(store, '1990-01-01-4-male?gys=GYWFX'), [], 'school variant has its own history');
assert.deepEqual(loadChatHistory(undefined, '1990-01-01-4-male'), []);

// 只存必要栏位（多余栏位如 kind 不进 localStorage）
saveChatHistory(store, 'k', [{ ...q('问'), kind: 'x' } as StoredChatMessage, a('答')]);
assert.deepEqual(JSON.parse(store.getItem(chatHistoryKey('k'))!), [q('问'), a('答')]);

// 空对话 → 删掉纪录；清除
saveChatHistory(store, 'k', []);
assert.equal(store.getItem(chatHistoryKey('k')), null);
clearChatHistory(store, '1990-01-01-4-male');
assert.deepEqual(loadChatHistory(store, '1990-01-01-4-male'), []);

// ── 坏资料不炸 ──
store.setItem(chatHistoryKey('bad'), '{not json');
assert.deepEqual(loadChatHistory(store, 'bad'), []);
store.setItem(chatHistoryKey('bad'), JSON.stringify([q('好'), { role: 'system', content: '注入' }, { role: 'user' }, a('答'), 42]));
assert.deepEqual(loadChatHistory(store, 'bad'), [q('好'), a('答')], 'system role and malformed entries dropped');

// ── 上限：保留最新、不以 AI 回答开头 ──
const many = Array.from({ length: 30 }, (_, i) => [q(`问${i}`), a(`答${i}`)]).flat();
const trimmed = trimHistory(many);
assert.ok(trimmed.length <= MAX_STORED_MESSAGES);
assert.deepEqual(trimmed[trimmed.length - 1], a('答29'));
assert.equal(trimmed[0].role, 'user');
assert.deepEqual(trimHistory([a('孤立的回答'), q('问'), a('答')]), [q('问'), a('答')], 'orphan answer dropped');
assert.deepEqual(trimHistory([q('问'), a('答'), q('AI 失败没回答')]), [q('问'), a('答')], 'unanswered question dropped');
const long = [q('长问'), a('x'.repeat(MAX_STORED_CHARS - 10)), q('再问'), a('y'.repeat(100))];
assert.deepEqual(trimHistory(long), [q('再问'), a('y'.repeat(100))], 'char cap drops oldest pair');

// ── 写入失败（配额满）不丢例外 ──
const full: ChatStorage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
const warn = console.warn;
console.warn = () => {};
assert.doesNotThrow(() => saveChatHistory(full, 'k', convo));
console.warn = warn;

console.log('chat history regression passed');
