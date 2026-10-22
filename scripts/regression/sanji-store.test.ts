import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { toHans } from '../../lib/i18n/hans';
import { bilibiliEmbedUrl, hmsToSeconds } from '../../lib/sanji/books';
import { SANJI_MAX_LIMIT, createSanjiStore } from '../../lib/sanji/store';

assert.equal(hmsToSeconds('00:12:58'), 778);
assert.equal(hmsToSeconds('01:00:00'), 3600);
assert.ok(Number.isNaN(hmsToSeconds('12:58')));
assert.equal(
  bilibiliEmbedUrl({ bvid: 'BV1KJsLekEfA', part: 3, sec: 1527 }, false),
  'https://player.bilibili.com/player.html?bvid=BV1KJsLekEfA&p=3&t=1527&autoplay=0',
);

// 使用者在繁体介面打的字要能转回语料的简体
assert.equal(toHans('紫微斗數'), '紫微斗数');
assert.equal(toHans('化忌沖命'), '化忌冲命');
assert.equal(toHans('桂枝湯'), '桂枝汤');

const line = (o: Record<string, unknown>) => JSON.stringify(o);
const entries = [
  { book: '01-stars', h2: '紫微（北斗 · 帝星）', h3: '定性', quote: '北斗星系第一颗星我们叫做紫微星。', bvid: 'BV1', part: 3, t_hms: '00:01:05', note: '' },
  { book: '01-stars', h2: '天机', h3: '定性', quote: '天机是智慧星。', bvid: 'BV1', part: 4, t_hms: '00:10:00', note: '' },
  { book: '04-sihua', h2: '化忌', h3: '冲命', quote: '化忌冲命最凶。', bvid: 'BV1', part: 9, t_hms: '01:02:03', note: '已按裁决改正：冲→冲' },
  ...Array.from({ length: 150 }, (_, i) => ({ book: '09-hexagrams', h2: `卦${i}`, h3: '爻辞', quote: `第${i}条`, bvid: 'BV2', part: 6, t_hms: '00:00:01', note: '' })),
];

async function main() {
  const dir = await mkdtemp(path.join(tmpdir(), 'sanji-'));
  try {
    await mkdir(path.join(dir, 'tianji'));
    await writeFile(path.join(dir, 'tianji', 'entries.jsonl'), entries.map(line).join('\n') + '\n');
    const store = createSanjiStore(dir);

    // 书册依编号排序，章目保持语料原顺序，计数正确
    const books = await store.books('tianji');
    assert.deepEqual(books.map(b => b.id), ['01-stars', '04-sihua', '09-hexagrams']);
    assert.equal(books[0].title, '主星');
    assert.deepEqual(books[0].chapters, [{ name: '紫微（北斗 · 帝星）', count: 1 }, { name: '天机', count: 1 }]);
    assert.equal(books[2].count, 150);

    // id = 行号；秒数换算
    const all = await store.query('tianji', {});
    assert.equal(all.total, entries.length);
    assert.equal(all.entries.length, 50); // 默认每页 50
    assert.equal(all.entries[2].id, 2);
    assert.equal(all.entries[2].sec, 3723);
    assert.equal(all.entries[0].part, 3);

    // 书册、章目、关键字（原话 / 章目 / 子类都比对）
    assert.equal((await store.query('tianji', { book: '01-stars' })).total, 2);
    assert.equal((await store.query('tianji', { book: '01-stars', chapter: '天机' })).entries[0].quote, '天机是智慧星。');
    assert.equal((await store.query('tianji', { q: '紫微' })).total, 1);
    assert.equal((await store.query('tianji', { q: '冲命' })).total, 1); // 命中 h3
    assert.equal((await store.query('tianji', { q: toHans('化忌沖命') })).total, 1);
    assert.equal((await store.query('tianji', { q: '不存在的词' })).total, 0);

    // 收藏：只取指定 id，并与其他筛选交集
    assert.deepEqual((await store.query('tianji', { ids: [1, 2, 99999] })).entries.map(e => e.id), [1, 2]);
    assert.equal((await store.query('tianji', { ids: [1, 2], book: '04-sihua' })).total, 1);

    // 分页：offset / limit 上限 / 负数
    const page2 = await store.query('tianji', { offset: 50, limit: 50 });
    assert.equal(page2.entries[0].id, 50);
    assert.equal((await store.query('tianji', { limit: 10_000 })).entries.length, SANJI_MAX_LIMIT);
    assert.equal((await store.query('tianji', { offset: -5, limit: 1 })).entries[0].id, 0);

    // 语料缺档要报错（不能当成 0 条）
    await assert.rejects(store.query('renji', {}));

    // 坏行要报错，不能默默变成播放器从 0 秒开始
    await writeFile(path.join(dir, 'tianji', 'entries.jsonl'), line({ ...entries[0], t_hms: '1:2' }) + '\n');
    await assert.rejects(createSanjiStore(dir).query('tianji', {}), /bad t_hms/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().then(
  () => console.log('sanji store regression passed'),
  err => { console.error(err); process.exit(1); },
);
