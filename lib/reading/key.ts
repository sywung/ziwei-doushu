/**
 * v4.0 13 维解读数据集的键（客户端、服务端共用）
 *
 * 数据集每行一张盘，键 `k` = `YYYY-MM-DD-时辰序号-性别`，例：`1990-01-01-0-male`。
 * 日期为公历「排盘日」、时辰为 0–11 的地支序号，与 BirthInfo 的 year/month/day/hour 同口径
 * （真太阳时校正、子时换日都已在表单里折算进 BirthInfo），所以可直接由命盘组键。
 */
import type { BirthInfo } from '../ziwei/types';

export const READING_YEAR_MIN = 1950;
export const READING_YEAR_MAX = 2026;

export const READING_TOPICS = [
  'overview', 'personality', 'love', 'career', 'wealth', 'health',
  'family', 'children', 'move', 'friends', 'home', 'spirit', 'parents',
] as const;

export type ReadingTopic = typeof READING_TOPICS[number];

export interface Reading {
  key: string;
  /** 命宫第一颗主星；命宫无主星时为 null */
  mainStar: string | null;
  content: Record<ReadingTopic, string>;
}

type KeyInput = Pick<BirthInfo, 'year' | 'month' | 'day' | 'hour' | 'gender'>;

const pad2 = (n: number) => String(n).padStart(2, '0');

export function isReadingYearCovered(year: number): boolean {
  return Number.isInteger(year) && year >= READING_YEAR_MIN && year <= READING_YEAR_MAX;
}

/** 组数据集键；输入不合法时抛 RangeError（不做任何修正，避免查到别人的盘） */
export function readingKey({ year, month, day, hour, gender }: KeyInput): string {
  const probe = new Date(Date.UTC(year, month - 1, day));
  const dateOk =
    Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day) &&
    probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
  if (!dateOk) throw new RangeError(`solar date does not exist: ${year}-${month}-${day}`);
  if (!Number.isInteger(hour) || hour < 0 || hour > 11) {
    throw new RangeError(`hour must be a branch index 0–11; received ${hour}`);
  }
  if (gender !== 'male' && gender !== 'female') {
    throw new RangeError(`gender must be male or female; received ${gender}`);
  }
  return `${year}-${pad2(month)}-${pad2(day)}-${hour}-${gender}`;
}

/** 解析键；格式不对返回 null */
export function parseReadingKey(key: string): KeyInput | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})-(\d{1,2})-(male|female)$/.exec(key);
  if (!m) return null;
  const input: KeyInput = {
    year: Number(m[1]), month: Number(m[2]), day: Number(m[3]),
    hour: Number(m[4]), gender: m[5] as KeyInput['gender'],
  };
  try {
    return readingKey(input) === key ? input : null;
  } catch {
    return null;
  }
}
