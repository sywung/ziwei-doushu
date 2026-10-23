declare module 'lunar-javascript' {
  class Lunar {
    /** month 為負表示閏月（如 -5 = 閏五月） */
    static fromYmd(year: number, month: number, day: number): Lunar;
    getYear(): number;
    getMonth(): number;  // negative = leap month
    getDay(): number;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    /** 換算成公曆(2026-08-05 補聲明:lib/ziwei/share.ts 早在用，只是從前靠 as any 繞過) */
    getSolar(): Solar;
  }

  class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
  }

  /** 農曆月信息(2026-06-10 補:閏月大小月邊界 clamp 用) */
  class LunarMonth {
    /** month 為負表示閏月(如 -5 = 閏五月);查無此月返回 null */
    static fromYm(year: number, month: number): LunarMonth | null;
    getDayCount(): number;
  }
}
