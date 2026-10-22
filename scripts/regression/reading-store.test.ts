import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { READING_TOPICS, parseReadingKey, readingKey } from '../../lib/reading/key';
import { ReadingNotFoundError, buildYearIndex, createReadingStore } from '../../lib/reading/store';

// ── 键：补零、时辰与性别原样带入 ──
assert.equal(readingKey({ year: 1990, month: 1, day: 1, hour: 0, gender: 'male' }), '1990-01-01-0-male');
assert.equal(readingKey({ year: 2026, month: 12, day: 31, hour: 11, gender: 'female' }), '2026-12-31-11-female');

// 不合法的输入要拒绝，不能被修正成另一张盘的键
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

// ── 索引与查询：用多字节中文内容，确认偏移按字节而非字符计算 ──
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

    // 中间与最后一行：前面的行有多字节字符，字符计数会读错位置
    const second = await store.get(keys[1]);
    assert.equal(second.mainStar, null);
    assert.equal(second.content.parents, '**【parents】**\n乙乙乙·parents·紫微斗数💫');
    const third = await store.get(keys[2]);
    assert.equal(third.content.overview, '**【overview】**\n丙·overview·紫微斗数💫');

    // 真实资料每行约 100 KB，会跨过读档的 64 KB 区块边界
    const longKeys = ['1990-02-01-0-male', '1990-02-01-0-female', '1990-02-01-1-male'];
    const longMarkers = ['长'.repeat(70_000), '短', '中'.repeat(30_000)];
    await writeFile(file, longKeys.map((k, i) => row(k, '天机', longMarkers[i])).join('\n'));  // 末行无换行
    await writeFile(path.join(indexDir, 'year-1990.json'), JSON.stringify(await buildYearIndex(file)));
    const longStore = createReadingStore({ dataDir, indexDir });
    for (const [i, k] of longKeys.entries()) {
      assert.equal((await longStore.get(k)).content.home, `**【home】**\n${longMarkers[i]}·home·紫微斗数💫`, k);
    }
    await writeFile(file, [row(keys[0], '天府', '甲'), row(keys[1], null, '乙乙乙'), row(keys[2], '紫微', '丙')].join('\n') + '\n');
    await writeFile(path.join(indexDir, 'year-1990.json'), JSON.stringify(index));

    // 资料集范围外、或该年份没有这个键 → ReadingNotFoundError
    await assert.rejects(store.get('1949-01-01-0-male'), ReadingNotFoundError);
    await assert.rejects(store.get('1990-01-02-0-male'), ReadingNotFoundError);
    await assert.rejects(store.get('not-a-key'), RangeError);

    // 数据档换过但索引没重建：偏移指到别人的盘，必须报错而不是回错的解读
    await writeFile(file, [row(keys[1], null, '乙乙乙'), row(keys[0], '天府', '甲'), row(keys[2], '紫微', '丙')].join('\n') + '\n');
    const stale = createReadingStore({ dataDir, indexDir });
    await assert.rejects(stale.get(keys[0]), /index out of sync|Unexpected|JSON/);

    // CRLF 会让字节偏移全部错位，建索引时就要拒绝
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
