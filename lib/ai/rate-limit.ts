/**
 * 全站共用的 AI 呼叫速率上限（仅服务端、单一程序内）：防止误触或前端回圈烧掉模型费用。
 * 自架、区网使用，不分使用者。
 */
export function createRateLimiter(maxPerWindow: number, windowMs: number, now: () => number = Date.now) {
  const hits: number[] = [];
  return {
    /** 还有额度就记一次并回 true */
    take(): boolean {
      const t = now();
      while (hits.length && hits[0] <= t - windowMs) hits.shift();
      if (hits.length >= maxPerWindow) return false;
      hits.push(t);
      return true;
    },
  };
}

export const AI_RATE_LIMIT_PER_MINUTE = Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? 20);
export const aiRateLimiter = createRateLimiter(AI_RATE_LIMIT_PER_MINUTE, 60_000);
