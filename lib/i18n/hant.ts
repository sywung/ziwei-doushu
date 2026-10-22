/**
 * 简体 → 台湾正体字形（OpenCC cn → tw，只转字不换词）
 *
 * 不用 twp（另换台湾惯用词）：它的词库偏资讯术语，命理文章里会误换，
 * 例如 对象→物件、窗口→视窗、类型→型别、调度→排程、奔驰→宾士。
 *
 * 只在「显示层」转换：排盘引擎内部用 iztro zh-CN 的简体名（命宫、仆役…）做比对，
 * 源码字符串不能改成繁体，否则引擎会对不上。
 */
import * as OpenCC from 'opencc-js/cn2t';

let converter: ((text: string) => string) | null = null;

export function toHant(text: string): string {
  if (!converter) converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
  return converter(text);
}
