/**
 * 倪海廈 天紀 / 地紀 / 人紀 — 共享類型定義
 */

/** 三紀分類 */
export type SanJiCategory = 'tianji' | 'diji' | 'renji';

/** 課程/模塊 */
export interface NiModule {
  id: string;
  category: SanJiCategory;
  /** 中文名 */
  name: string;
  /** 英文名 */
  nameEn: string;
  /** 簡短副標題 */
  subtitle: string;
  /** 簡要描述 */
  description: string;
  /** 詳細介紹（多段） */
  details: string[];
  /** 學派歸屬 */
  school?: string;
  /** 課時信息 */
  lessons?: string;
  /** 參考書目 */
  references: string[];
  /** 核心概念/關鍵詞 */
  keywords: string[];
  /** 圖標字符 */
  icon: string;
  /** 狀態 */
  status: 'active' | 'preview' | 'coming';
  /** 排序權重 */
  order: number;
  /** 路由 slug */
  slug: string;
  /** 子章節 */
  chapters: NiChapter[];
}

/** 章節 */
export interface NiChapter {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  /** 核心要點 */
  keyPoints: string[];
  /** 倪師語錄 */
  quotes?: string[];
  /** 排序 */
  order: number;
}

/** 易經六十四卦 */
export interface Hexagram {
  number: number;
  name: string;
  /** 卦象描述 如「天澤履」 */
  composition: string;
  /** 上卦 */
  upper: string;
  /** 下卦 */
  lower: string;
  /** 卦辭要點 */
  meaning: string;
  /** 倪師講解要點 */
  niInterpretation: string;
  /** 斷事要訣 */
  divination: string;
}

/** 堪輿條目 */
export interface FengShuiEntry {
  id: string;
  title: string;
  category: 'yangzhai' | 'yinzhai' | 'theory';
  description: string;
  keyPoints: string[];
}

/** 人紀中醫條目 */
export interface MedicalEntry {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  keyPoints: string[];
  relatedHerbs?: string[];
  relatedAcupoints?: string[];
}

/** 針灸經驗穴位 */
export interface AcuExperience {
  id: number;
  /** 適應症/疾病 */
  condition: string;
  /** 穴位組合 */
  acupoints: string;
  /** 分類 */
  category: string;
  /** 補充說明 */
  note?: string;
}

/** 透針透穴法 */
export interface TransNeedling {
  id: number;
  /** 透穴組合：A透B */
  combo: string;
  /** 治療症狀 */
  indication: string;
  /** 配穴 */
  supporting?: string;
  /** 來源 */
  source: string;
}

/** 漢唐方劑 */
export interface HantangFormula {
  id: number;
  /** 方名（如「白帶丸」、「大禹丸」） */
  name: string;
  /** 主治疾病 */
  indication: string;
  /** 核心理論（一句話） */
  theory?: string;
  /** 主要成分（公開部分） */
  ingredients?: string;
}

/** 經典經方 */
export interface ClassicFormula {
  id: string;
  /** 方名 */
  name: string;
  /** 出處 */
  source: string;
  /** 組成藥物 */
  composition: string;
  /** 主治 */
  indication: string;
  /** 倪師用法要點 */
  niUsage?: string;
}

/** 天紀課程集數結構 */
export interface TianjiEpisode {
  /** DVD編號 1-24 */
  dvd: number;
  /** 前半段主題 */
  firstHalf: string;
  /** 後半段主題 */
  secondHalf: string;
  /** 關鍵內容 */
  highlights: string[];
}
