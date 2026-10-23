/**
 * 樣本時辰一致性迴歸（對應 issue #26）
 *
 * FAMOUS_PERSONS 裡的 `hour` 是**時辰地支索引 0–11**（0=子 … 11=亥），
 * 不是 0–23 的小時數。歷史上註釋與索引曾經對不上（11 條裡錯 7 條：
 * hour 5 寫成「午時」實為巳時、3 寫成「寅時」實為卯時、4 寫成「卯時」實為辰時）。
 *
 * 這條迴歸釘住兩件事：
 *   1. 每條樣本的 hour 必須落在 0–11；
 *   2. 帶「X時」註釋的樣本，註釋必須與索引對應的地支一致。
 *
 * 走源碼解析而非運行時 import —— famous.ts 帶 `server-only`，
 * 直接跑需要額外的 node 條件參數，解析源碼更省事也更跨平台。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const BRANCH_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const src = readFileSync(new URL('../../lib/ziwei/famous.ts', import.meta.url), 'utf8');

const rows = [...src.matchAll(/hour:\s*(\d+),?[ \t]*(?:\/\/[ \t]*(.*))?/g)];
assert.ok(rows.length > 0, 'famous.ts 里没解析到任何 hour 字段，正则或文件结构变了');

let annotated = 0;
for (const [, raw, comment] of rows) {
  const hour = Number(raw);
  assert.ok(
    Number.isInteger(hour) && hour >= 0 && hour <= 11,
    `hour 必须是 0–11 的时辰地支索引，实际 ${raw}`,
  );
  if (!comment) continue;
  const named = BRANCH_NAMES.find((b) => comment.includes(`${b}时`));
  if (!named) continue;
  annotated++;
  assert.equal(
    named,
    BRANCH_NAMES[hour],
    `hour: ${hour} 的注释写着「${named}时」，但索引 ${hour} 实际是「${BRANCH_NAMES[hour]}时」`,
  );
}

console.log(`✅ 样本时辰一致性：${rows.length} 条样本 hour 均在 0–11，其中 ${annotated} 条带时辰注释且与索引一致`);
