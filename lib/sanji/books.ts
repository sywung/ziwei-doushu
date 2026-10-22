/**
 * 三纪字幕导播：语料与书册（客户端、服务端共用）
 *
 * 语料来自姊妹仓库 nihai-tianji-corpus（天纪 4,886 条）与 nihai-renji-corpus（人纪 19,294 条），
 * 每条判语 = 倪师原话 + 书册归属 + 精确到秒的 B 站出处。授权 CC BY-NC-SA 4.0（不可商用）。
 * 地纪目前没有语料。
 */
export type SanjiCorpus = 'tianji' | 'renji';

export const SANJI_CORPORA: { id: SanjiCorpus; title: string; repo: string }[] = [
  { id: 'tianji', title: '天纪', repo: 'https://github.com/Renhuai123/nihai-tianji-corpus' },
  { id: 'renji', title: '人纪', repo: 'https://github.com/Renhuai123/nihai-renji-corpus' },
];

export const SANJI_BOOK_TITLE: Record<string, string> = {
  // 天纪
  '01-stars': '主星', '02-palaces': '十二宫', '03-patterns': '格局', '04-sihua': '四化',
  '05-illness': '疾厄', '07-methodology': '方法论', '08-yili': '易理总纲', '09-hexagrams': '六十四卦',
  '10-divination': '占断', '11-fengshui': '堪舆', '12-tieban': '铁板神数',
  // 人纪
  '01-shanghan': '伤寒论', '02-jinkui': '金匮要略', '03-bencao': '神农本草经',
  '04-neijing': '黄帝内经', '05-zhongjing': '仲景心法', '06-zhenjiu': '针灸大成',
};

export interface SanjiEntry {
  /** 语料内的行号（从 0 起），收藏用 */
  id: number;
  book: string;
  h2: string;
  h3: string;
  quote: string;
  bvid: string;
  part: number;
  /** 「00:12:58」 */
  t: string;
  /** 换算成秒，给播放器 */
  sec: number;
  note: string;
}

export interface SanjiBook {
  id: string;
  title: string;
  count: number;
  chapters: { name: string; count: number }[];
}

export interface SanjiQueryResult {
  total: number;
  offset: number;
  entries: SanjiEntry[];
}

export function hmsToSeconds(hms: string): number {
  const m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(hms);
  if (!m) return NaN;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** B 站嵌入播放器：从该秒开始 */
export function bilibiliEmbedUrl(e: Pick<SanjiEntry, 'bvid' | 'part' | 'sec'>, autoplay = true): string {
  const p = new URLSearchParams({ bvid: e.bvid, p: String(e.part), t: String(e.sec), autoplay: autoplay ? '1' : '0' });
  return `https://player.bilibili.com/player.html?${p}`;
}

/** B 站原页面（新分页开） */
export function bilibiliPageUrl(e: Pick<SanjiEntry, 'bvid' | 'part' | 'sec'>): string {
  return `https://www.bilibili.com/video/${e.bvid}?p=${e.part}&t=${e.sec}`;
}
