import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { READING_TOPICS, parseReadingKey, readingKey } from '../../lib/reading/key';
import { ReadingNotFoundError, buildYearIndex, createReadingStore } from '../../lib/reading/store';

// ── 鍵：補零、時辰與性別原樣帶入 ──
assert.equal(readingKey({ year: 1990, month: 1, day: 1, hour: 0, gender: 'male' }), '1990-01-01-0-male');
assert.equal(readingKey({ year: 2026, month: 12, day: 31, hour: 11, gender: 'female' }), '2026-12-31-11-female');

// 不合法的輸入要拒絕，不能被修正成另一張盤的鍵
for (const bad of [
  { year: 1990, month: 2, day: 30, hour: 0, gender: 'male' as const },
  { year: 1991, month: 2, day: 29, hour: 0, gender: 'male' as const },
  { year: 1990, month: 1, day: 1, hour: 12, gender: 'male' as const },
  { year: 1990, month: 1, day: 1, hour: -1, gender: 'male' as const },
  { year: 1990, month: 1, day: 1, hour: 1.5, gender: 'male' as const },
]) {
  assert.throws(() => readingKey(bad), RangeError, JSON.stringify(bad));
}
assert.throws(() => readingKey({ year: 1990, month: 1, day: 1, hour: 0, gender: 'x' as 'male' }), RangeError);

assert.deepEqual(parseReadingKey('1990-01-01-0-male'), { year: 1990, month: 1, day: 1, hour: 0, gender: 'male' });
for (const bad of ['1990-1-01-0-male', '1990-01-01-0-man', '1990-02-30-0-male', '1990-01-01-12-male', '../etc/passwd', '']) {
  assert.equal(parseReadingKey(bad), null, bad);
}

// ── 索引與查詢：用多字節中文內容，確認偏移按字節而非字符計算 ──
function row(key: string, ms: string | null, marker: string) {
  const c = Object.fromEntries(READING_TOPICS.map(t => [t, `**【${t}】**\n${marker}·${t}·紫微斗数💫`]));
  return JSON.stringify({ k: key, y: 0, m: 0, d: 0, h: 0, g: 'male', ms, t: {}, c });
}

async function main() {
  const dir = await mkdtemp(path.join(tmpdir(), 'reading-store-'));
  try {
    const dataDir = path.join(dir, 'jsonl');
    const indexDir = path.join(dir, 'index');
    await mkdir(dataDir);
    await mkdir(indexDir);
    const file = path.join(dataDir, 'year-1990.jsonl');
    const keys = ['1990-01-01-0-male', '1990-01-01-0-female', '1990-01-01-1-male'];
    await writeFile(file, [row(keys[0], '天府', '甲'), row(keys[1], null, '乙乙乙'), row(keys[2], '紫微', '丙')].join('\n') + '\n');

    const index = await buildYearIndex(file);
    assert.deepEqual(Object.keys(index), keys);
    await writeFile(path.join(indexDir, 'year-1990.json'), JSON.stringify(index));

    const store = createReadingStore({ dataDir, indexDir });

    const first = await store.get(keys[0]);
    assert.equal(first.mainStar, '天府');
    assert.equal(first.content.love, '**【love】**\n甲·love·紫微斗数💫');

    // 中間與最後一行：前面的行有多字節字符，字符計數會讀錯位置
    const second = await store.get(keys[1]);
    assert.equal(second.mainStar, null);
    assert.equal(second.content.parents, '**【parents】**\n乙乙乙·parents·紫微斗数💫');
    const third = await store.get(keys[2]);
    assert.equal(third.content.overview, '**【overview】**\n丙·overview·紫微斗数💫');

    // 真實資料每行約 100 KB，會跨過讀檔的 64 KB 區塊邊界
    const longKeys = ['1990-02-01-0-male', '1990-02-01-0-female', '1990-02-01-1-male'];
    const longMarkers = ['长'.repeat(70_000), '短', '中'.repeat(30_000)];
    await writeFile(file, longKeys.map((k, i) => row(k, '天机', longMarkers[i])).join('\n'));  // 末行無換行
    await writeFile(path.join(indexDir, 'year-1990.json'), JSON.stringify(await buildYearIndex(file)));
    const longStore = createReadingStore({ dataDir, indexDir });
    for (const [i, k] of longKeys.entries()) {
      assert.equal((await longStore.get(k)).content.home, `**【home】**\n${longMarkers[i]}·home·紫微斗数💫`, k);
    }
    await writeFile(file, [row(keys[0], '天府', '甲'), row(keys[1], null, '乙乙乙'), row(keys[2], '紫微', '丙')].join('\n') + '\n');
    await writeFile(path.join(indexDir, 'year-1990.json'), JSON.stringify(index));

    // 資料集範圍外、或該年份沒有這個鍵 → ReadingNotFoundError
    await assert.rejects(store.get('1949-01-01-0-male'), ReadingNotFoundError);
    await assert.rejects(store.get('1990-01-02-0-male'), ReadingNotFoundError);
    await assert.rejects(store.get('not-a-key'), RangeError);

    // 數據檔換過但索引沒重建：兩行等長，錯位後讀到的是另一張盤的合法 JSON，
    // 只有鍵比對攔得住（不能靠 JSON.parse 失敗碰巧攔下）
    const [ka, kb] = [keys[0], keys[2]]; // 同長度的鍵
    await writeFile(file, [row(ka, '天府', '甲'), row(kb, '天府', '乙')].join('\n') + '\n');
    await writeFile(path.join(indexDir, 'year-1990.json'), JSON.stringify(await buildYearIndex(file)));
    await writeFile(file, [row(kb, '天府', '乙'), row(ka, '天府', '甲')].join('\n') + '\n');
    const stale = createReadingStore({ dataDir, indexDir });
    await assert.rejects(stale.get(ka), /index out of sync/);

    // CRLF 會讓字節偏移全部錯位，建索引時就要拒絕
    await writeFile(file, row(keys[0], '天府', '甲') + '\r\n');
    await assert.rejects(buildYearIndex(file), /CRLF/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().then(
  () => console.log('reading store regression passed'),
  err => { console.error(err); process.exit(1); },
);
