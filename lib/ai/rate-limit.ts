/**
 * 全站共用的 AI 呼叫速率上限（僅服務端、單一程序內）：防止誤觸或前端迴圈燒掉模型費用。
 * 自架、區網使用，不分使用者。
 */
export function createRateLimiter(maxPerWindow: number, windowMs: number, now: () => number = Date.now) {
  const hits: number[] = [];
  return {
    /** 還有額度就記一次並回 true */
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
