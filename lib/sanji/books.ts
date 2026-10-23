/**
 * 三紀字幕導播：語料與書冊（客戶端、服務端共用）
 *
 * 語料來自姊妹倉庫 nihai-tianji-corpus（天紀 4,886 條）與 nihai-renji-corpus（人紀 19,294 條），
 * 每條判語 = 倪師原話 + 書冊歸屬 + 精確到秒的 B 站出處。授權 CC BY-NC-SA 4.0（不可商用）。
 * 地紀目前沒有語料。
 */
export type SanjiCorpus = 'tianji' | 'renji';

export const SANJI_CORPORA: { id: SanjiCorpus; title: string; repo: string }[] = [
  { id: 'tianji', title: '天纪', repo: 'https://github.com/Renhuai123/nihai-tianji-corpus' },
  { id: 'renji', title: '人纪', repo: 'https://github.com/Renhuai123/nihai-renji-corpus' },
];

export const SANJI_BOOK_TITLE: Record<string, string> = {
  // 天紀
  '01-stars': '主星', '02-palaces': '十二宫', '03-patterns': '格局', '04-sihua': '四化',
  '05-illness': '疾厄', '07-methodology': '方法论', '08-yili': '易理总纲', '09-hexagrams': '六十四卦',
  '10-divination': '占断', '11-fengshui': '堪舆', '12-tieban': '铁板神数',
  // 人紀
  '01-shanghan': '伤寒论', '02-jinkui': '金匮要略', '03-bencao': '神农本草经',
  '04-neijing': '黄帝内经', '05-zhongjing': '仲景心法', '06-zhenjiu': '针灸大成',
};

export interface SanjiEntry {
  /** 語料內的行號（從 0 起），收藏用 */
  id: number;
  book: string;
  h2: string;
  h3: string;
  quote: string;
  bvid: string;
  part: number;
  /** 「00:12:58」 */
  t: string;
  /** 換算成秒，給播放器 */
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

/** B 站嵌入播放器：從該秒開始 */
export function bilibiliEmbedUrl(e: Pick<SanjiEntry, 'bvid' | 'part' | 'sec'>, autoplay = true): string {
  const p = new URLSearchParams({ bvid: e.bvid, p: String(e.part), t: String(e.sec), autoplay: autoplay ? '1' : '0' });
  return `https://player.bilibili.com/player.html?${p}`;
}

/** B 站原頁面（新分頁開） */
export function bilibiliPageUrl(e: Pick<SanjiEntry, 'bvid' | 'part' | 'sec'>): string {
  return `https://www.bilibili.com/video/${e.bvid}?p=${e.part}&t=${e.sec}`;
}
