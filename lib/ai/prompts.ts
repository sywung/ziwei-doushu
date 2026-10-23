/**
 * AI 解讀的提示詞與對話驗證（僅服務端）
 */
import type { ChatMessage } from './llm';

export const MAX_MESSAGES = 30;
export const MAX_MESSAGE_CHARS = 6000;
export const MAX_TOTAL_CHARS = 40_000;

const COMMON_RULES = `
回答规则：
1. 一律用台湾繁体中文、台湾惯用语回答。命理专名照用（化禄、化忌、大限、流年、三方四正…）。
2. 只能根据下面提供的命盘结构与断语节录推论；盘上没有的星曜、四化或格局不可自行捏造。资料不足时直接说明。
3. 以倪海厦《天纪》体系为主。引用倪师或《紫微斗数全书》时，只能引用断语节录里出现过的原话，不可编造出处。
4. 健康、财务、法律相关的内容只作命理参考，要提醒以专业意见为准；不做恐吓式论断。
5. 依使用者要求的段落结构输出，段落标题用 **【标题】** 格式，每段精简具体，总长约 600–1000 字。
`.trim();

export function interpretSystemPrompt(chartText: string, excerpts: string | null): string {
  return [
    '你是紫微斗数命理解读助手，依倪海厦体系为命主解盘。',
    COMMON_RULES,
    '\n## 命盘结构（由排盘引擎产生）\n' + chartText,
    excerpts
      ? '\n## 这张盘的 13 维断语节录（来自开源解读数据集，按本命盘确定性生成）\n' + excerpts
      : '\n（这张盘不在解读数据集涵盖范围内，只能依命盘结构推论。）',
  ].join('\n');
}

export function hemingSystemPrompt(
  a: { chartText: string; excerpts: string | null },
  b: { chartText: string; excerpts: string | null },
  methodology: string,
): string {
  return [
    '你是紫微斗数合盘分析助手，依倪海厦体系比对两张命盘的关系。',
    COMMON_RULES,
    '\n## 合盘方法论\n' + methodology.trim(),
    '\n## 甲方命盘\n' + a.chartText,
    a.excerpts ? '\n### 甲方断语节录\n' + a.excerpts : '',
    '\n## 乙方命盘\n' + b.chartText,
    b.excerpts ? '\n### 乙方断语节录\n' + b.excerpts : '',
  ].join('\n');
}

export const HEMING_DEFAULT_QUESTION = `请做两人合盘分析，按以下结构输出：
**【关系定性】**
一句话概括两人的缘分类型。
**【夫妻宫对照】**
双方夫妻宫主星、四化，以及对彼此的期待与落差。
**【互补与冲突】**
命宫、福德、迁移的互动：哪里互补、哪里容易起冲突。
**【时运交会】**
双方目前大限与流年对这段关系的影响。
**【相处建议】**
具体可行的相处建议。`;

/** 驗證前端送來的對話：只收 user / assistant、字串內容、數量與長度有上限；最後一則必須是 user */
export function sanitizeMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_MESSAGES) return null;
  let total = 0;
  const out: ChatMessage[] = [];
  for (const m of input) {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    if (content.length > MAX_MESSAGE_CHARS) return null;
    total += content.length;
    if (content.trim()) out.push({ role, content });
  }
  if (total > MAX_TOTAL_CHARS || out.length === 0 || out[out.length - 1].role !== 'user') return null;
  return out;
}
