/**
 * 台湾历史上「钟表比 UTC+8 快 1 小时」的期间：日治时期改用 UTC+9（1937-10-01 ~ 1945-09-20），
 * 以及 1946–1961、1974–1975、1979 年的夏令时（日光节约时间）。
 *
 * 资料来源：IANA tzdata Asia/Taipei（2026a，经 Node ICU 逐小时比对，见 scripts/regression/dst-tw.test.ts）。
 * 写成表而不在执行期查 Intl：浏览器内建 tzdata 版本不一，排盘结果不能因浏览器而异。
 *
 * 区间以当时的「当地钟表时间」表示，起日 00:00 起、止日 00:00 前（止日不含）。
 * 夏令时结束那晚 23:00–24:00 会出现两次（拨回一小时），一律当作还在夏令时（第一次）。
 */
import type { GregorianDate } from './true-solar-time';

export type TaiwanClockKind = 'jst' | 'dst';

/** [起 年,月,日, 止 年,月,日（不含）, 种类] */
const TW_CLOCK_AHEAD: readonly (readonly [number, number, number, number, number, number, TaiwanClockKind])[] = [
  [1937, 10, 1, 1945, 9, 21, 'jst'],
  [1946, 5, 15, 1946, 10, 1, 'dst'],
  [1947, 4, 15, 1947, 11, 1, 'dst'],
  [1948, 5, 1, 1948, 10, 1, 'dst'],
  [1949, 5, 1, 1949, 10, 1, 'dst'],
  [1950, 5, 1, 1950, 10, 1, 'dst'],
  [1951, 5, 1, 1951, 10, 1, 'dst'],
  [1952, 3, 1, 1952, 11, 1, 'dst'],
  [1953, 4, 1, 1953, 11, 1, 'dst'],
  [1954, 4, 1, 1954, 11, 1, 'dst'],
  [1955, 4, 1, 1955, 10, 1, 'dst'],
  [1956, 4, 1, 1956, 10, 1, 'dst'],
  [1957, 4, 1, 1957, 10, 1, 'dst'],
  [1958, 4, 1, 1958, 10, 1, 'dst'],
  [1959, 4, 1, 1959, 10, 1, 'dst'],
  [1960, 6, 1, 1960, 10, 1, 'dst'],
  [1961, 6, 1, 1961, 10, 1, 'dst'],
  [1974, 4, 1, 1974, 10, 1, 'dst'],
  [1975, 4, 1, 1975, 10, 1, 'dst'],
  [1979, 7, 1, 1979, 10, 1, 'dst'],
];

export const TAIWAN_CLOCK_KIND_LABEL: Record<TaiwanClockKind, string> = {
  jst: '日治时期（UTC+9）',
  dst: '夏令时',
};

const dayNumber = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 86_400_000;

/** 该日期的台湾钟表若比 UTC+8 快 1 小时，回传期间种类；否则 null（以日为单位，区间起止都在午夜） */
export function taiwanClockAhead(date: GregorianDate): TaiwanClockKind | null {
  const n = dayNumber(date.year, date.month, date.day);
  for (const [y1, m1, d1, y2, m2, d2, kind] of TW_CLOCK_AHEAD) {
    if (n >= dayNumber(y1, m1, d1) && n < dayNumber(y2, m2, d2)) return kind;
  }
  return null;
}

/** 台湾钟表时间要减几分钟才是 UTC+8 标准时间 */
export function taiwanClockAheadMinutes(date: GregorianDate): number {
  return taiwanClockAhead(date) ? 60 : 0;
}
