/**
 * 將前十二神 / 歲前十二神 —— 按地支起的兩組十二神
 *
 * 為什麼要有這個文件（2026-08-12）：
 *   主流排盤軟件盤上每個宮都帶這兩個神名，我們盤上一直是空的。
 *
 * ── 一處更正（重要，別再按舊結論走）──────────────────────────────
 *   之前的判斷是「歲前十二神主流排盤不排，LNSQX 表沒有用處」。表確實用不上，
 *   但結論錯了：主流排盤【排】，只是不查表、走公式；
 *   大限 / 流年 / 流月 / 流日 / 流時 / 小限 每層都排，且默認全開。
 *
 * 算法出處（按通行口徑整理，經金標準盤核對）：
 *
 *   歲前十二神 —— 公式，不查表
 *       對宮 g = 1..12：神序 = 13 - 起點支 + g，若 > 12 則 -12
 *       即「歲建落在起點支所在宮，順行十二宮」。與 LNSQX 表逐格等價（對拍腳本里一併驗了）。
 *
 *   將前十二神 —— 查 LNJQX 表
 *       對神序 s = 1..12：該神落在宮 LNJQX[s][起點支]
 *       即「神序 s 落在宮 LNJQX[神序][起點支]」。
 *
 *   ★ 兩組的起點都是【地支】，且都是【該運限的地支】：
 *     每個運限（大限 / 流年 / 流月 / 流日 / 流時）都按同一個規則：
 *         跟隨運限開關開 → 歲前(該層支)，否則 歲前(生年支)
 *         跟隨運限開關開 → 將前(該層支)，否則 將前(生年支)
 *     兩個開關默認都是開，
 *     即默認跟隨運限；本命態（未選運限）無條件用生年支起。
 *
 * 宮位編碼：表內用【子起一】(1=子 … 12=亥)。本組自身可獨立驗：
 *   LNJQX 的將星列 = 三合帝旺（申子辰→子、寅午戌→午、巳酉丑→酉、亥卯未→卯）12/12 全中；
 *   歲驛列與天馬錶逐格相同、華蓋列與華蓋表相同、咸池列與咸池表相同。按寅起一則全錯。
 *
 * 本文件對外一律用 0-11 地支索引（0=子）。
 *
 * 博士十二神（2026-08-14 金標準盤核對）：從生年祿存起，陽男陰女順、陰男陽女逆；不跟隨運限。
 */

import { LUCUN_TABLE } from './constants';

/** 將前十二神，自將星起順行。索引 0-11 = 神序。 */
export const JIANG_QIAN_SHEN = [
  '将星', '攀鞍', '岁驿', '息神', '华盖', '劫煞',
  '灾煞', '天煞', '指背', '咸池', '月煞', '亡神',
] as const;

/** 歲前十二神，自歲建起順行。索引 0-11 = 神序。
 * 第 7 位主流排盤盤面寫「歲破」（歲建對宮），不要寫成「大耗」——頂欄年支大耗是另一顆星。 */
export const SUI_QIAN_SHEN = [
  '岁建', '晦气', '丧门', '贯索', '官符', '小耗',
  '岁破', '龙德', '白虎', '天德', '吊客', '病符',
] as const;

/**
 * 博士十二神。金標準盤：宮底第一行所列博士十二神。
 * 從生年祿存起；陽男陰女順、陰男陽女逆。不跟隨運限（流年選中後仍落在生年祿存宮）。
 */
export const BOSHI_SHEN = [
  '博士', '力士', '青龙', '小耗', '将军', '奏书',
  '飞廉', '喜神', '病符', '大耗', '伏兵', '官符',
] as const;

/**
 * 將星落宮（0-11 地支索引）—— 三合局的帝旺位。
 * 申子辰→子、寅午戌→午、巳酉丑→酉、亥卯未→卯，即同三合組共用一個將星宮。
 * anchorBranch 為該運限的地支（本命態傳生年支）。
 */
export function jiangXingBranch(anchorBranch: number): number {
  const b = ((anchorBranch % 12) + 12) % 12;
  // 子(0)/辰(4)/申(8) → 子(0)；丑(1)/巳(5)/酉(9) → 酉(9)；
  // 寅(2)/午(6)/戌(10) → 午(6)；卯(3)/未(7)/亥(11) → 卯(3)
  return [0, 9, 6, 3][b % 4];
}

/**
 * 將前十二神：返回長度 12 的數組，下標 = 宮地支（0-11），值 = 神序（0-11，0=將星）。
 * 將星起於三合帝旺位，其後十一神順行。
 */
export function jiangQianShenByBranch(anchorBranch: number): number[] {
  const start = jiangXingBranch(anchorBranch);
  const out = new Array<number>(12);
  for (let shen = 0; shen < 12; shen++) out[(start + shen) % 12] = shen;
  return out;
}

/**
 * 歲前十二神：返回長度 12 的數組，下標 = 宮地支（0-11），值 = 神序（0-11，0=歲建）。
 * 歲建落在 anchorBranch 宮，其後十一神順行。
 */
export function suiQianShenByBranch(anchorBranch: number): number[] {
  const a = ((anchorBranch % 12) + 12) % 12;
  const out = new Array<number>(12);
  for (let shen = 0; shen < 12; shen++) out[(a + shen) % 12] = shen;
  return out;
}

/** 便利函數：某一宮的將前十二神名。 */
export function jiangQianShenName(anchorBranch: number, palaceBranch: number): string {
  return JIANG_QIAN_SHEN[jiangQianShenByBranch(anchorBranch)[((palaceBranch % 12) + 12) % 12]];
}

/** 便利函數：某一宮的歲前十二神名。 */
export function suiQianShenName(anchorBranch: number, palaceBranch: number): string {
  return SUI_QIAN_SHEN[suiQianShenByBranch(anchorBranch)[((palaceBranch % 12) + 12) % 12]];
}

/** 陽男陰女順，陰男陽女逆。年干陰陽與 calcYinYangGender 同一把尺子。 */
export function boshiReverse(yearStem: number, gender: 'male' | 'female'): boolean {
  const yangStem = ((yearStem % 10) + 10) % 10 % 2 === 0;
  return yangStem !== (gender === 'male');
}

/**
 * 博士十二神：返回長度 12 的數組，下標 = 宮地支（0-11），值 = 神序（0-11，0=博士）。
 * 起點 = 生年祿存。
 */
export function boshiShenByStem(yearStem: number, gender: 'male' | 'female'): number[] {
  const start = LUCUN_TABLE[((yearStem % 10) + 10) % 10];
  const reverse = boshiReverse(yearStem, gender);
  const out = new Array<number>(12);
  for (let shen = 0; shen < 12; shen++) {
    const branch = reverse ? (start - shen + 12) % 12 : (start + shen) % 12;
    out[branch] = shen;
  }
  return out;
}

export function boshiShenName(
  yearStem: number, gender: 'male' | 'female', palaceBranch: number,
): string {
  return BOSHI_SHEN[boshiShenByStem(yearStem, gender)[((palaceBranch % 12) + 12) % 12]];
}

/**
 * 十二神的英文名 —— 專用表
 *
 * 為什麼單獨一張表而不直接用共享短語詞典 t()：
 * 詞典是「詞條→譯文」一對一，而同一個中文詞在不同語境下該有不同譯法——
 * 「將星」作為將前十二神之一要拼音（與另外 23 個一致），但它在散文裡是【七殺】的別稱
 * （「囚星配將星」= 廉貞配七殺），那裡譯成 General Star 才讀得通。共用一張表遲早打架。
 *
 * 2026-08-12 已把詞典裡的獨立詞條 大耗/將星/八座 統一成拼音（原為意譯，是 25 個雜耀裡的
 * 三個異類），所以此刻兩邊結果一致；這張表的意義在於把盤上的星名標籤與散文詞典解耦，
 * 之後誰再動詞典也不會把這一列帶歪。
 *
 * 口徑：命理專名用拼音（見 /api/interpret 英文指令 "Keep 命理 proper nouns as pinyin+English"）。
 */
export const SHIER_SHEN_EN: Record<string, string> = {
  // 歲前十二神（歲破 = 主流排盤盤面用字；大耗留給頂欄年支星 / 博士第十二神）
  岁建: 'Sui Jian', 晦气: 'Hui Qi', 丧门: 'Sang Men', 贯索: 'Guan Suo',
  官符: 'Guan Fu', 小耗: 'Xiao Hao', 岁破: 'Sui Po', 大耗: 'Da Hao', 龙德: 'Long De',
  白虎: 'Bai Hu', 天德: 'Tian De', 吊客: 'Diao Ke', 病符: 'Bing Fu',
  // 將前十二神
  将星: 'Jiang Xing', 攀鞍: 'Pan An', 岁驿: 'Sui Yi', 息神: 'Xi Shen',
  华盖: 'Hua Gai', 劫煞: 'Jie Sha', 灾煞: 'Zai Sha', 天煞: 'Tian Sha',
  指背: 'Zhi Bei', 咸池: 'Xian Chi', 月煞: 'Yue Sha', 亡神: 'Wang Shen',
  // 博士十二神（與歲前重名的詞共用拼音）
  博士: 'Bo Shi', 力士: 'Li Shi', 青龙: 'Qing Long', 将军: 'Jiang Jun',
  奏书: 'Zou Shu', 飞廉: 'Fei Lian', 喜神: 'Xi Shen', 伏兵: 'Fu Bing',
};

/** 按語言取十二神顯示名；未收錄則原樣返回中文，絕不顯示 undefined。 */
export function shierShenLabel(name: string, lang: string): string {
  return lang === 'en' ? (SHIER_SHEN_EN[name] ?? name) : name;
}
