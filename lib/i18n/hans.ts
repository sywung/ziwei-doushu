/**
 * 台湾正体 → 简体（OpenCC tw → cn），只给服务端搜寻用：语料与数据集都是简体，
 * 使用者在繁体介面输入的关键字要先转回简体才比对得到。
 */
import * as OpenCC from 'opencc-js/t2cn';

let converter: ((text: string) => string) | null = null;

export function toHans(text: string): string {
  if (!converter) converter = OpenCC.Converter({ from: 'tw', to: 'cn' });
  return converter(text);
}
