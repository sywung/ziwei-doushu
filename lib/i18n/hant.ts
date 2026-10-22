/**
 * 简体 → 台湾正体字形（OpenCC cn → tw，只转字不换词）
 *
 * 不用 twp（另换台湾惯用词）：它的词库偏资讯术语，命理文章里会误换，
 * 例如 对象→物件、窗口→视窗、类型→型别、调度→排程、奔驰→宾士。
 *
 * OpenCC 遇到一简对多繁时按通用语料选字，命理专名会选错（丑→醜、年干→年幹、
 * 朝斗→朝鬥…），所以先把这些词换成占位符、转完再换回来。词表来自对 v4 数据集
 * 抽样的实测，回归见 scripts/regression/hant.test.ts。
 *
 * 只在「显示层」转换：排盘引擎内部用 iztro zh-CN 的简体名（命宫、仆役…）做比对，
 * 源码字符串不能改成繁体，否则引擎会对不上。
 */
import * as OpenCC from 'opencc-js/cn2t';

/** [简体, 正确繁体]；长词优先比对 */
const PROTECTED_TERMS: [string, string][] = [
  // 丑：命理里几乎都是地支；只有这些词是「醜」
  ['丑陋', '醜陋'], ['出丑', '出醜'], ['丑闻', '醜聞'], ['丑恶', '醜惡'], ['丑态', '醜態'],
  ['丑化', '醜化'], ['丑八怪', '醜八怪'], ['献丑', '獻醜'], ['家丑', '家醜'], ['美丑', '美醜'],
  ['丑', '丑'],
  // 干：天干类
  ['生年干', '生年干'], ['年干', '年干'], ['月干', '月干'], ['日干', '日干'], ['时干', '時干'],
  ['宫干', '宮干'], ['天干', '天干'], ['干支', '干支'], ['十干', '十干'], ['限干', '限干'],
  // 斗：星名、格局
  ['斗数', '斗數'], ['斗君', '斗君'], ['朝斗', '朝斗'], ['北斗', '北斗'], ['南斗', '南斗'], ['斗柄', '斗柄'],
  // 冲：宫位相冲（冲击、冲动、冲突、往前冲维持「衝」）
  ['相冲', '相沖'], ['六冲', '六沖'], ['对冲', '對沖'], ['逢冲', '逢沖'], ['来冲', '來沖'],
  ['冲命', '沖命'], ['冲照', '沖照'], ['冲破', '沖破'], ['忌冲', '忌沖'],
  // 发
  ['发酵', '發酵'],
];

/** 量词「只」前面常见的数词；其余的「只」都是「只有、只能」的只 */
const MEASURE_ONLY = /([一二两三四五六七八九十几每单])只/g;

const ESCAPE_OPEN = '\uE000';
const ESCAPE_CLOSE = '\uE001';
// 也收繁体写法：显示层会对已转过的文字再转一次（斗數 若不保护会再被转成 鬥數）
const PROTECTED_MAP = new Map<string, string>([
  ...PROTECTED_TERMS,
  ...PROTECTED_TERMS.map(([, tw]): [string, string] => [tw, tw]),
]);
const PROTECT_RE = new RegExp(
  [...PROTECTED_MAP.keys()].sort((a, b) => b.length - a.length).join('|') + '|只',
  'g',
);

let converter: ((text: string) => string) | null = null;

export function toHant(text: string): string {
  if (!converter) converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

  const kept: string[] = [];
  const keep = (value: string) => `${ESCAPE_OPEN}${kept.push(value) - 1}${ESCAPE_CLOSE}`;
  const shielded = text
    .replace(MEASURE_ONLY, (_, num: string) => num + keep('隻'))
    .replace(PROTECT_RE, term => keep(term === '只' ? '只' : PROTECTED_MAP.get(term)!));

  return converter(shielded)
    .replace(/\uE000(\d+)\uE001/g, (_, i: string) => kept[Number(i)])
    .replace(/臺/g, '台'); // 台湾日常与 iztro 繁体都用「台」（三台、台辅、平台）
}
