import type { SchoolConfig } from './school-config';

export interface BirthInfo {
  year: number;      // Gregorian year（已經過子時換日修正後的"排盤日"）
  month: number;     // Gregorian month (1-12)
  day: number;       // Gregorian day
  hour: number;      // 時辰 branch index (0=子, 1=丑, ... 11=亥)
  gender: 'male' | 'female';
  name?: string;
  province?: string;   // 出生省份
  city?: string;       // 出生城市
  longitude?: number;  // 出生地經度（用於真太陽時校正）
  /**
   * 原始輸入（用戶在表單裡實際填的時間），已知出生時間時始終保留。
   * 例：用戶輸入 5/9 23:55 → year/month/day 會被改成 5/10（次日子時），
   *     而這裡保存原始的 { year:Y, month:5, day:9, clockHour:23, clockMinute:55 }，
   *     用於在 chart 頁讓用戶看見"已為你按子時換日規則歸到次日"。
   */
  origInput?: {
    year: number;
    month: number;
    day: number;
    clockHour: number;
    clockMinute: number;
  };
}

export interface LunarInfo {
  lunarYear: number;
  lunarMonth: number;    // positive = normal, negative = leap month
  lunarDay: number;
  yearStem: number;      // 0-9 (甲乙丙丁戊己庚辛壬癸)
  yearBranch: number;    // 0-11 (子丑寅卯辰巳午未申酉戌亥)
  isLeapMonth: boolean;
  /** 節氣四柱（年/月/日/時柱），如 ["壬午","壬子","壬戌","庚戌"] */
  fourPillars?: [string, string, string, string];
  /** 非節氣四柱（農曆口徑：正月初一換年 + 農曆月，與紫微同曆法）——節氣交界日其月柱會與 fourPillars 不同 */
  fourPillarsLunar?: [string, string, string, string];
}

export type SiHua = '禄' | '权' | '科' | '忌';

/** 星辰亮度 8 檔（紫微斗數標準）——'地' 為 XD1（現代修訂亮度表第一版）額外等級 */
export type StarBrightness = '庙' | '旺' | '得' | '利' | '平' | '不' | '闲' | '陷' | '地';

export interface Star {
  name: string;
  type: 'major' | 'minor' | 'lucky' | 'sha';
  siHua?: SiHua;
  /** 粗粒度亮度（保留向後兼容，算法判斷用） */
  brightness?: 'bright' | 'normal' | 'dim';
  /** 原始 7 檔亮度（廟/旺/得/利/平/不/陷）—— 顯示層使用 */
  brightnessRaw?: StarBrightness;
}

export interface SelfSihuaMark {
  siHua: SiHua;       // 祿/權/科/忌
  starName: string;   // 自化的星
}

export interface Palace {
  branch: number;      // 0-11 (地支索引)
  stem: number;        // 0-9 (天干索引)
  name: string;        // 宮名
  stars: Star[];
  daXianAge?: [number, number];   // 大限年齡段
  isCurrentDaXian?: boolean;
  isMingGong?: boolean;
  isShenGong?: boolean;
  /** 宮干自化（倪師體系核心） */
  selfSihua?: SelfSihuaMark[];
  /** 對宮地支索引（永遠 = (branch + 6) % 12） */
  oppositeBranch?: number;
  /** 是否空宮（無主星） */
  isEmpty?: boolean;
  /** 若為空宮，借自哪個宮的地支索引 = oppositeBranch */
  borrowedFromBranch?: number;
  /** 若為空宮，借自哪個宮名 */
  borrowedFromName?: string;
  /** 若為空宮，借到的對宮主星名列表（結構化數據，文案層不再需要從文本反查） */
  borrowedStars?: string[];
}

export interface DaXianSiHua {
  stemIndex: number;
  stemName: string;
  lu: string;    // 化祿星名
  quan: string;  // 化權星名
  ke: string;    // 化科星名
  ji: string;    // 化忌星名
}

export interface DaXian {
  startAge: number;
  endAge: number;
  palaceBranch: number;
  palaceName: string;
  stemIndex?: number;    // 大限宮的天干索引（用於大限四化）
  stemName?: string;
  siHua?: DaXianSiHua;   // 該大限四化（基於宮干）
}

export interface ZiweiChart {
  birthInfo: BirthInfo;
  lunarInfo: LunarInfo;
  mingGongBranch: number;    // 命宮地支
  shenGongBranch: number;    // 身宮地支
  wuxingJu: number;          // 五行局 (2,3,4,5,6)
  wuxingJuName: string;      // e.g. '水二局'
  ziweiPos: number;          // 紫微星位置
  palaces: Palace[];         // 12宮，按地支0-11排序
  daXians: DaXian[];
  currentAge: number;
  currentDaXianIndex: number;
  /** Signed analysis-cache eligibility marker assigned by /api/generate. */
  analysisCacheProfile?: string;
  /** 命主星（按命宮地支查表） */
  mingZhu?: string;
  /** 身主星（按生年地支查表） */
  shenZhu?: string;
  /** 陰陽性別（陽男/陰男/陽女/陰女） */
  yinYangGender?: string;
  /** 排盤所用流派配置（generateChart 寫入；運限、四化飛化、AI 都按它重建，避免與盤面口徑不一） */
  school?: SchoolConfig;
}
