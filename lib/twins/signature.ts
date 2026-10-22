/**
 * 命理学双子：命盘「配置签名」
 *
 * 以命宫为基准，把星曜落宫换成「距命宫第几宫」（逆排：0=命、1=兄…11=父），
 * 同样配置的盘不论命宫落在哪个地支都会得到同一签名。分三层，由宽到严：
 *   main  主星格局：14 主星的相对位置
 *   sihua 主星 + 本命四化：再加上禄权科忌落在哪颗星
 *   full  全盘：再加上六吉、六煞、禄存、天马的相对位置
 * 星曜落宫与性别无关（大限顺逆才看性别；已抽 624 组男女盘验证），所以同日同时辰的男女盘签名相同。
 */
import { createHash } from 'node:crypto';
import type { ZiweiChart } from '../ziwei/types';
import type { TwinTier } from './tiers';

/** 六吉、六煞、禄存、天马 */
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
