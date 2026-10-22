import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { toHant } from '../../lib/i18n/hant';

// ── 命理专名：OpenCC 原生会转错的（实测自 v4 数据集抽样）──
const CASES: [string, string][] = [
  ['紫微命盘 · 倪海厦正宗紫微斗数', '紫微命盤 · 倪海廈正宗紫微斗數'],
  ['酉至丑宫）', '酉至丑宮）'],
  ['子胆、丑肝、寅肺', '子膽、丑肝、寅肺'],
  ['辰戌丑未四墓', '辰戌丑未四墓'],
  ['长得丑陋，出丑', '長得醜陋，出醜'],
  ['【年干四化】', '【年干四化】'],
  ['宫干自化与天干', '宮干自化與天干'],
  ['只能干轻省的活', '只能幹輕省的活'],
  ['七杀朝斗格则武职大贵', '七殺朝斗格則武職大貴'],
  ['好勇斗狠，单打独斗', '好勇鬥狠，單打獨鬥'],
  ['化忌冲命，恶星冲照', '化忌沖命，惡星沖照'],
  ['煞星冲击，冲动易怒', '煞星衝擊，衝動易怒'],
  ['别只顾埋头，只有一个', '別只顧埋頭，只有一個'],
  ['养了一只猫、两只狗', '養了一隻貓、兩隻狗'],
  ['情绪一直发酵；毛发有异', '情緒一直發酵；毛髮有異'],
  ['三台、八座、台辅；本平台', '三台、八座、台輔；本平台'],
  ['不是依附别人过日子的类型；挑对象', '不是依附別人過日子的類型；挑對象'],
  ['后天追补，破而后立', '後天追補，破而後立'],
];
for (const [cn, tw] of CASES) assert.equal(toHant(cn), tw, cn);

// 转换要幂等：显示层的 MutationObserver 会对已转过的文字再转一次
for (const [, tw] of CASES) assert.equal(toHant(tw), tw, `idempotent: ${tw}`);

// 占位符字元不能外泄
assert.ok(!/[\uE000\uE001]/.test(toHant(CASES.map(c => c[0]).join('\n'))));

// ── 以 iztro 自带的 zh-TW 术语为准：星曜、宫位、四化、亮度、干支、五行局 ──
const require = createRequire(__filename);
const flat = (o: Record<string, unknown>, pre = ''): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${pre}${k}.`) : [[`${pre}${k}`, String(v)]]);
// iztro zh-TW 自己还留着简体「来因」，以正体「來因」为准
const IZTRO_EXCEPTIONS = new Set(['palace.originalPalace']);
let checked = 0;
for (const mod of ['brightness', 'earthlyBranch', 'fiveElementsClass', 'heavenlyStem', 'mutagen', 'palace', 'star']) {
  const cn = Object.fromEntries(flat(require(`iztro/lib/i18n/locales/zh-CN/${mod}`).default));
  const tw = Object.fromEntries(flat(require(`iztro/lib/i18n/locales/zh-TW/${mod}`).default));
  for (const [k, v] of Object.entries(cn)) {
    if (!(k in tw) || IZTRO_EXCEPTIONS.has(`${mod}.${k}`)) continue;
    assert.equal(toHant(v), tw[k], `iztro ${mod}.${k}: ${v}`);
    checked += 1;
  }
}
assert.ok(checked > 200, `expected >200 iztro terms, checked ${checked}`);

console.log(`hant conversion regression passed (${CASES.length} cases, ${checked} iztro terms)`);
