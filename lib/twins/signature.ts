/**
 * 命理學雙子：命盤「配置簽名」
 *
 * 以命宮為基準，把星曜落宮換成「距命宮第幾宮」（逆排：0=命、1=兄…11=父），
 * 同樣配置的盤不論命宮落在哪個地支都會得到同一簽名。分三層，由寬到嚴：
 *   main  主星格局：14 主星的相對位置
 *   sihua 主星 + 本命四化：再加上祿權科忌落在哪顆星
 *   full  全盤：再加上六吉、六煞、祿存、天馬的相對位置
 * 星曜落宮與性別無關（大限順逆才看性別；已抽 624 組男女盤驗證），所以同日同時辰的男女盤簽名相同。
 */
import { createHash } from 'node:crypto';
import type { ZiweiChart } from '../ziwei/types';
import type { TwinTier } from './tiers';

/** 六吉、六煞、祿存、天馬 */
const AUX_STARS = new Set([
  '左辅', '右弼', '文昌', '文曲', '天魁', '天钺',
  '擎羊', '陀罗', '火星', '铃星', '地空', '地劫',
  '禄存', '天马',
]);

const hash = (text: string) => createHash('sha1').update(text).digest('hex').slice(0, 16);

export function chartSignatures(chart: ZiweiChart): Record<TwinTier, string> {
  const offsetOf = (branch: number) => ((chart.mingGongBranch - branch) % 12 + 12) % 12;
  const main: string[] = [];
  const sihua: string[] = [];
  const aux: string[] = [];
  for (const palace of chart.palaces) {
    const offset = offsetOf(palace.branch);
    for (const star of palace.stars) {
      if (star.type === 'major') main.push(`${offset}${star.name}`);
      if (AUX_STARS.has(star.name)) aux.push(`${offset}${star.name}`);
      if (star.siHua) sihua.push(`${star.siHua}${star.name}`);
    }
  }
  const mainKey = main.sort().join(',');
  const sihuaKey = `${mainKey}|${sihua.sort().join(',')}`;
  return {
    main: hash(mainKey),
    sihua: hash(sihuaKey),
    full: hash(`${sihuaKey}|${aux.sort().join(',')}`),
  };
}
