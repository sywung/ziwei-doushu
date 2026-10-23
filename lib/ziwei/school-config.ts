/**
 * 排盤流派配置 — 9 類排盤流派開關 + 默認值 + 持久化
 *
 * 數據源：按通行口徑整理（詳見 docs/school-alignment.md）
 *
 * 用戶在 chart 頁設置面板切換，立即重新排盤
 */

import type { BrightnessSchool } from './school-data';

// ─── 9 類流派配置 ───────────────────────────────────────────────────────

/** 1. 14 主星亮度表 */
export type BrightnessSchoolOption = 'default' | BrightnessSchool;

/** 2. 庚年四化（5 種變體）*/
export type GengYearSihua =
  | 'GYWYT'   // 陽武陰同（主流默認口徑，與 iztro 一致）
  | 'GYWTY'   // 陽武同陰（科忌互換說）
  | 'GYWFT'   // 陽武府同
  | 'GYWFX'   // 陽武府相
  | 'GYWTX';  // 陽武同相

/** 3. 安天馬 */
export type TianmaSchool = 'year-branch' | 'month-branch';

/** 4. 安天空 */
export type TiankongSchool = 'normal' | 'shun-jia-shi';

/** 5. 截空旬空 */
export type JiekongSchool = 'single' | 'double' | 'zhanyan';

/** 6. 安魁鉞 */
export type KuiyueSchool = 'qs1' | 'qs2' | 'zhong-yiming' | 'network';

/** 7. 安天使天傷 */
export type TianshiTianshangSchool = 'normal' | 'zhongzhou';

/** 8. 安長生十二神 */
export type ChangshengSchool = 'yin-yang-shun-ni' | 'shui-tu' | 'huo-tu';

/** 9. 晚子時處理 */
export type LateZishi =
  | 'next-day'           // 視為次日（主流默認口徑 + 我們當前）
  | 'current-day'        // 視為當日（倪師派）
  | 'all-current'        // 日柱當日時柱當日（八字）
  | 'day-cur-time-next'; // 日柱當日時柱次日（八字）

/** 10. 閏月處理（用戶反饋：倪師派要求閏月歸下月）*/
export type LeapMonth =
  | 'split'         // 分半（前 15 天歸上月，後 15 天歸下月）— ★我們默認 = 主流排盤默認口徑「月中分界」（2026-09-05 150 組金標準盤對照：9 張閏月後半月盤唯此口徑逐星全同）
  | 'next-month'    // 整月歸下月（倪師派：閏四月當五月）
  | 'prev-month'    // 整月當本月普通月（閏四月當四月）— 可選口徑「視為本月」；早先 2.6 萬盤驗證針對的是另一套參照引擎，與金標準盤默認口徑不一致
  | 'origin-month'; // 不調整（閏四月仍標閏月，iztro fixLeap=false）

// ─── 完整配置對象 ──────────────────────────────────────────────────────

export interface SchoolConfig {
  brightnessSchool: BrightnessSchoolOption;
  gengYearSihua: GengYearSihua;
  tianmaSchool: TianmaSchool;
  tiankongSchool: TiankongSchool;
  jiekongSchool: JiekongSchool;
  kuiyueSchool: KuiyueSchool;
  tianshiTianshang: TianshiTianshangSchool;
  changshengSchool: ChangshengSchool;
  lateZishi: LateZishi;
  leapMonth: LeapMonth;
}

/** 默認配置 = 對齊主流排盤默認口徑（輔星六煞雜曜+四化+運限 窮舉零差異；閏月口徑=整月歸本月）*/
/**
 * ★ 2026-09-05 默認閏月口徑 prev-month → split：150 組金標準盤對照，隨機 100 盤 0 排星差異，
 * 唯一系統性差異是 9 張閏月後半月盤——金標準盤默認「月中分界」(split)，Metis 舊默認整月歸本月；切 split 後逐星全同。
 * 站長 2026-09-05 拍板改默認。algorithm / school-patches / yunxian-palace 的兜底默認都引用這一個常量，別再各寫字面量。
 */
export const DEFAULT_LEAP_MONTH: LeapMonth = 'split';

export const SCHOOL_DEFAULT_CONFIG: SchoolConfig = {
  brightnessSchool: 'default',           // = 《斗數全書》（algorithm.ts 把 'default' 當 QS 用，對齊主流排盤默認口徑，10-20 改）
  gengYearSihua: 'GYWYT',                // 陽武陰同
  tianmaSchool: 'year-branch',           // 依據年支
  tiankongSchool: 'normal',              // 常規
  jiekongSchool: 'double',               // 正副雙星
  kuiyueSchool: 'qs1',                   // 斗數全書歌訣理解1
  tianshiTianshang: 'normal',            // 常規
  changshengSchool: 'yin-yang-shun-ni',  // 區分陰陽順逆
  lateZishi: 'next-day',                 // 視為次日
  leapMonth: DEFAULT_LEAP_MONTH,         // 閏月分半（主流排盤默認口徑「月中分界」，150 組金標準盤對照驗證）
};

// ─── localStorage 持久化 key ───────────────────────────────────────────
export const SCHOOL_CONFIG_LS_KEY = 'ziwei-school-config-v1';
/** 2026-09-05 閏月默認 prev-month→split 的一次性遷移標記（見 loadSchoolConfig） */
export const SCHOOL_LEAP_MIGRATED_KEY = 'ziwei-school-leap-split-migrated';

/**
 * ★ 2026-10-20 鍵名統一改名：早期版本存在 `ziwei-<舊名>-config-v1` / `ziwei-<舊名>-leap-split-migrated`。
 * 新鍵還沒有時，把舊鍵裡的流派配置（認 brightnessSchool 字段）與閏月遷移標記搬過來、刪掉舊鍵；只認這兩種形狀，不碰別的鍵。
 */
function migrateLegacyKeys(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k) keys.push(k); }
    if (localStorage.getItem(SCHOOL_CONFIG_LS_KEY) === null) {
      for (const k of keys) {
        if (k === SCHOOL_CONFIG_LS_KEY || !/^ziwei-[a-z]+-config-v1$/.test(k)) continue;
        const raw = localStorage.getItem(k);
        let parsed: unknown = null;
        try { parsed = raw ? JSON.parse(raw) : null; } catch { /* 不是流派配置 */ }
        if (!parsed || typeof parsed !== 'object' || !('brightnessSchool' in parsed)) continue;
        localStorage.setItem(SCHOOL_CONFIG_LS_KEY, raw as string);
        localStorage.removeItem(k);
        break;
      }
    }
    for (const k of keys) {
      if (k === SCHOOL_LEAP_MIGRATED_KEY || !/^ziwei-[a-z]+-leap-split-migrated$/.test(k)) continue;
      if (localStorage.getItem(SCHOOL_LEAP_MIGRATED_KEY) === null) localStorage.setItem(SCHOOL_LEAP_MIGRATED_KEY, localStorage.getItem(k) ?? '1');
      localStorage.removeItem(k);
    }
  } catch { /* localStorage 被禁：照舊走默認 */ }
}

/**
 * 讀 localStorage 配置（安全 fallback 到默認）
 * 瀏覽器端調用，服務端返回默認
 */
export function loadSchoolConfig(): SchoolConfig {
  if (typeof window === 'undefined') return SCHOOL_DEFAULT_CONFIG;
  migrateLegacyKeys();
  try {
    const raw = localStorage.getItem(SCHOOL_CONFIG_LS_KEY);
    if (!raw) return SCHOOL_DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<SchoolConfig>;
    // ★ 2026-09-05 一次性遷移：舊默認 prev-month 是被整份存進 localStorage 的（抽屜存完整配置），分不清「默認」還是「手選」；
    //   而舊選項本身就標著「默認」，選它的人要的也是對齊默認口徑 → 統一遷到新默認 split，只遷一次（遷移標記），之後再手選 prev-month 就尊重
    if (parsed.leapMonth === 'prev-month' && !localStorage.getItem(SCHOOL_LEAP_MIGRATED_KEY)) {
      parsed.leapMonth = DEFAULT_LEAP_MONTH;
      try { localStorage.setItem(SCHOOL_LEAP_MIGRATED_KEY, '1'); localStorage.setItem(SCHOOL_CONFIG_LS_KEY, JSON.stringify({ ...SCHOOL_DEFAULT_CONFIG, ...parsed })); } catch { /* noop */ }
    }
    return normalizeBrightness({ ...SCHOOL_DEFAULT_CONFIG, ...parsed });
  } catch {
    return SCHOOL_DEFAULT_CONFIG;
  }
}

/**
 * ★ 2026-10-18 默認項與它底層的那張表只留一項（站長：兩項排出來一樣，別並排擺）。
 * ★ 2026-10-20 默認改成《斗數全書》（主流排盤默認口徑，見 algorithm.ts setBrightnessSchool），歸併方向隨之改：
 *   手選 QS（本機存的、分享鏈接 bs=QS）一律當默認，勾落在「《斗數全書》派（默認）」；
 *   XD2 不再歸併——它現在是單獨一項「現代修正 v2」，手選了就尊重。
 *   10-18 到 10-20 之間被歸成 'default' 的老 XD2 選擇分不出來，隨默認一起變成全書（站長定：跟默認口徑走）。
 */
function normalizeBrightness(cfg: SchoolConfig): SchoolConfig {
  return cfg.brightnessSchool === 'QS' ? { ...cfg, brightnessSchool: 'default' } : cfg;
}

/** 保存配置到 localStorage */
export function saveSchoolConfig(cfg: SchoolConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHOOL_CONFIG_LS_KEY, JSON.stringify(cfg));
  } catch { /* localStorage 滿或被禁 */ }
}

/** 重置為默認 */
export function resetSchoolConfig(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(SCHOOL_CONFIG_LS_KEY); } catch { /* noop */ }
}

// ─── 配置 → URL query 雙向轉換（用於分享帶流派的命盤）────────────────────

/**
 * 流派 URL 參數 key 全集 — 與 configToParams 輸出一一對應，10 類配置 10 個 key。
 *
 * ★ 2026-06-12 修「分享鏈接丟閏月口徑」：chart 頁此前兩處手寫 key 數組判斷
 *   「URL 是否帶流派參數」，都漏了 'lm'（閏月歸屬）——用戶改成 next-month 後分享，
 *   對方打開 ?lm=next-month 被無視、按默認閏月口徑排出不同的盤。
 *   今後判斷一律複用本常量；configToParams 加字段時必須同步加這裡。
 */
export const SCHOOL_PARAM_KEYS = ['bs', 'gys', 'tm', 'tk', 'jk', 'ky', 'tst', 'cs', 'lz', 'lm'] as const;

/** SchoolConfig → URL params（緊湊形式：?bs=qs&sh=GYWTY...）*/
export function configToParams(cfg: SchoolConfig): Record<string, string> {
  const out: Record<string, string> = {};
  if (cfg.brightnessSchool !== 'default') out.bs = cfg.brightnessSchool;
  if (cfg.gengYearSihua !== 'GYWYT') out.gys = cfg.gengYearSihua;
  if (cfg.tianmaSchool !== 'year-branch') out.tm = cfg.tianmaSchool;
  if (cfg.tiankongSchool !== 'normal') out.tk = cfg.tiankongSchool;
  if (cfg.jiekongSchool !== 'double') out.jk = cfg.jiekongSchool;
  if (cfg.kuiyueSchool !== 'qs1') out.ky = cfg.kuiyueSchool;
  if (cfg.tianshiTianshang !== 'normal') out.tst = cfg.tianshiTianshang;
  if (cfg.changshengSchool !== 'yin-yang-shun-ni') out.cs = cfg.changshengSchool;
  if (cfg.lateZishi !== 'next-day') out.lz = cfg.lateZishi;
  if (cfg.leapMonth !== DEFAULT_LEAP_MONTH) out.lm = cfg.leapMonth;   // 老分享鏈接不帶 lm 的，現按新默認 split 解析（與主流排盤默認口徑一致）
  return out;
}

/** URLSearchParams → SchoolConfig（缺省字段用默認值填充）*/
export function paramsToConfig(params: URLSearchParams): SchoolConfig {
  return normalizeBrightness({
    brightnessSchool: (params.get('bs') as BrightnessSchoolOption) || SCHOOL_DEFAULT_CONFIG.brightnessSchool,
    gengYearSihua: (params.get('gys') as GengYearSihua) || SCHOOL_DEFAULT_CONFIG.gengYearSihua,
    tianmaSchool: (params.get('tm') as TianmaSchool) || SCHOOL_DEFAULT_CONFIG.tianmaSchool,
    tiankongSchool: (params.get('tk') as TiankongSchool) || SCHOOL_DEFAULT_CONFIG.tiankongSchool,
    jiekongSchool: (params.get('jk') as JiekongSchool) || SCHOOL_DEFAULT_CONFIG.jiekongSchool,
    kuiyueSchool: (params.get('ky') as KuiyueSchool) || SCHOOL_DEFAULT_CONFIG.kuiyueSchool,
    tianshiTianshang: (params.get('tst') as TianshiTianshangSchool) || SCHOOL_DEFAULT_CONFIG.tianshiTianshang,
    changshengSchool: (params.get('cs') as ChangshengSchool) || SCHOOL_DEFAULT_CONFIG.changshengSchool,
    lateZishi: (params.get('lz') as LateZishi) || SCHOOL_DEFAULT_CONFIG.lateZishi,
    leapMonth: (params.get('lm') as LeapMonth) || SCHOOL_DEFAULT_CONFIG.leapMonth,
  });
}

// ─── UI 顯示用：每個開關的所有選項 + 中文標籤 ──────────────────────────

export const SCHOOL_OPTIONS = {
  // ★ 2026-06-17 統一格式(用戶要求):每組【默認項】固定排第一,且 desc 統一以「默認 · xxx」開頭
  brightnessSchool: [
    // ★ 10-20 默認項 = 《斗數全書》（主流排盤默認口徑「星曜亮度依據斗數全書」），底層就是 QS 表，所以不再另列 QS
    { value: 'default', label: '《斗数全书》派', desc: '默认 · 与主流排盘软件默认一致' },
    { value: 'XD2', label: '现代修正 v2', desc: '现代修订亮度表（第二版）' },
    { value: 'XD1', label: '现代修正 v1', desc: '现代修订亮度表（第一版）' },
    { value: 'ZZ', label: '中州派', desc: '中州派理论' },
  ],
  gengYearSihua: [
    { value: 'GYWYT', label: '阳武阴同', desc: '默认 · 与 iztro / 主流一致' },
    { value: 'GYWTY', label: '阳武同阴', desc: '科忌互换说' },
    { value: 'GYWFT', label: '阳武府同' },
    { value: 'GYWFX', label: '阳武府相' },
    { value: 'GYWTX', label: '阳武同相' },
  ],
  tianmaSchool: [
    { value: 'year-branch', label: '依据年支', desc: '默认 · 年支起天马' },
    { value: 'month-branch', label: '依据月支' },
  ],
  tiankongSchool: [
    { value: 'normal', label: '常规排法', desc: '默认 · 常规起天空' },
    { value: 'shun-jia-shi', label: '顺加生时' },
  ],
  jiekongSchool: [
    { value: 'double', label: '正副双星', desc: '默认 · 正副双星并用' },
    { value: 'single', label: '常规单星' },
    { value: 'zhanyan', label: '占验派' },
  ],
  kuiyueSchool: [
    { value: 'qs1', label: '《斗数全书》理解 1', desc: '默认 · 全书歌诀理解一' },
    { value: 'qs2', label: '《斗数全书》理解 2', desc: '差异仅在庚辛壬癸年生人' },
    { value: 'zhong-yiming', label: '钟义明先生书籍排法' },
    { value: 'network', label: '网络流传排法' },
  ],
  tianshiTianshang: [
    { value: 'normal', label: '常规排法', desc: '默认 · 身宫 ±5 位' },
    { value: 'zhongzhou', label: '中州派排法', desc: '生月奇偶 × 性别 交换' },
  ],
  changshengSchool: [
    { value: 'yin-yang-shun-ni', label: '区分阴阳顺逆', desc: '默认 · 阴阳顺逆起长生' },
    { value: 'shui-tu', label: '水土共长生', desc: '土五局起点 = 水二局起点 (申)' },
    { value: 'huo-tu', label: '火土共长生', desc: '土五局起点 = 火六局起点 (寅)' },
  ],
  lateZishi: [
    { value: 'next-day', label: '视为次日', desc: '默认 · 主流做法' },
    { value: 'current-day', label: '视为当日', desc: '倪师派' },
    { value: 'all-current', label: '日柱当日 / 时柱当日（八字）' },
    { value: 'day-cur-time-next', label: '日柱当日 / 时柱次日（八字）' },
  ],
  // ★ 2026-06-17 全站約定:每組默認選項一律排第一；去「天機」二字(避商標侵權)
  // ★ 2026-09-05 默認改為分半：主流排盤默認口徑「月中分界」，150 組金標準盤對照唯此口徑逐星全同
  leapMonth: [
    { value: 'split', label: '视为分半', desc: '默认 · 「月中分界」，与主流排盘软件默认一致（前 15 天归本月 / 后 15 天归下月，150 组对照盘验证）' },
    { value: 'prev-month', label: '视为本月', desc: '闰四月整月当四月普通月排' },
    { value: 'next-month', label: '视为下月', desc: '倪师派（闰四月整月当五月排）' },
    { value: 'origin-month', label: '保持闰月', desc: '不调整，闰四月仍标闰月' },
  ],
} as const;

/** 10 類配置的中文標籤（用於 UI 標題）*/
export const SCHOOL_LABELS: Record<keyof SchoolConfig, string> = {
  brightnessSchool: '星曜亮度表',
  gengYearSihua: '庚年四化',
  tianmaSchool: '安天马',
  tiankongSchool: '安天空',
  jiekongSchool: '安截空旬空',
  kuiyueSchool: '安魁钺',
  tianshiTianshang: '安天使天伤',
  changshengSchool: '长生十二神',
  lateZishi: '晚子时',
  leapMonth: '闰月归属',
};

// ─── 開源自架版實際可切換的項目 ─────────────────────────────────────────
/**
 * 自架版真正實作的流派：前五項在 generateChart（algorithm.ts applyXxxVariant），
 * 晚子時在表單換算出生日時（birth-input.ts resolveBirthMoment）。
 * 天空、天使天傷、長生十二神的非默認排法定義無法從現有資料確認，不開放；設定面板與 sanitize 都只認下列七項。
 */
export const SCHOOL_SWITCHABLE_KEYS = [
  'brightnessSchool', 'gengYearSihua', 'kuiyueSchool', 'jiekongSchool', 'tianmaSchool', 'leapMonth', 'lateZishi',
] as const satisfies readonly (keyof SchoolConfig)[];

export type SwitchableSchoolKey = typeof SCHOOL_SWITCHABLE_KEYS[number];

/** 不可信輸入（請求 body、URL、localStorage）→ 只留可切換項目且值合法的部分配置 */
export function sanitizeSchoolConfig(input: unknown): Partial<SchoolConfig> {
  if (!input || typeof input !== 'object') return {};
  const out: Partial<Record<SwitchableSchoolKey, string>> = {};
  for (const key of SCHOOL_SWITCHABLE_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (SCHOOL_OPTIONS[key].some(o => o.value === value)) out[key] = value as string;
  }
  return out as Partial<SchoolConfig>;
}

/** 可切換項目中與默認不同的那些（用來提示「解讀依默認流派」） */
export function nonDefaultSchoolKeys(cfg: Partial<SchoolConfig> | undefined): SwitchableSchoolKey[] {
  if (!cfg) return [];
  return SCHOOL_SWITCHABLE_KEYS.filter(k => cfg[k] !== undefined && cfg[k] !== SCHOOL_DEFAULT_CONFIG[k]);
}

/** 非默認的可切換項目 → 「星曜亮度表：中州派」這類文字 */
export function describeNonDefaultSchool(cfg: Partial<SchoolConfig> | undefined): string[] {
  return nonDefaultSchoolKeys(cfg).map(k => {
    const option = SCHOOL_OPTIONS[k].find(o => o.value === cfg![k]);
    return `${SCHOOL_LABELS[k]}：${option?.label ?? cfg![k]}`;
  });
}
