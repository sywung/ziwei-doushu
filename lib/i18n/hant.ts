/**
 * 简体 → 台湾正体（含台湾惯用词，OpenCC cn → twp）
 *
 * 只在「显示层」转换：排盘引擎内部用 iztro zh-CN 的简体名（命宫、仆役…）做比对，
 * 源码字符串不能改成繁体，否则引擎会对不上。
 */
import * as OpenCC from 'opencc-js/cn2t';

let converter: ((text: string) => string) | null = null;

export function toHant(text: string): string {
  if (!converter) converter = OpenCC.Converter({ from: 'cn', to: 'twp' });
  return converter(text);
}
