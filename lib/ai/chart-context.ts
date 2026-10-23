/**
 * 把命盘与解读整理成给模型看的文字（仅服务端）
 *
 * 模型只能依据这里列出的星曜与断语回答；命盘一律由服务端按出生资料重排，不信任前端传来的 chart 物件。
 */
import { readingKey, isReadingYearCovered, READING_TOPICS, type Reading } from '../reading/key';
import { createReadingStore } from '../reading/store';
import { generateChart } from '../ziwei/algorithm';
import { describeNonDefaultSchool, sanitizeSchoolConfig } from '../ziwei/school-config';
import { BRANCHES, SHICHEN, STEMS } from '../ziwei/constants';
import { TOPIC_LABEL } from '../ziwei/db-analysis';
import { FLOW_LAYER_LABEL, flowPalaceShortName, getFlowLayers, type FlowTarget } from '../ziwei/flow-layers';
import type { BirthInfo, Palace, Star, ZiweiChart } from '../ziwei/types';

/** 每个维度只带开头这么多字进 prompt，13 维合计约 1.2 万字 */
export const READING_EXCERPT_CHARS = 900;

const readingStore = createReadingStore({
  dataDir: process.env.READING_DATA_DIR ?? '/data/v4/jsonl',
  indexDir: process.env.READING_INDEX_DIR ?? '/data/v4/index',
});

/** 从前端传来的（不可信）物件取出出生资料并重排命盘；格式不对回 null */
export function chartFromUntrusted(input: unknown): ZiweiChart | null {
  const b = (input as { birthInfo?: Partial<BirthInfo> } | null)?.birthInfo;
  if (!b) return null;
  try {
    const info = { year: b.year!, month: b.month!, day: b.day!, hour: b.hour!, gender: b.gender! };
    readingKey(info); // 验证日期、时辰、性别
    // 流派也来自前端：只收白名单内的合法值，否则 AI 看到的盘与画面上的不同
    return generateChart(info, { school: sanitizeSchoolConfig((input as { school?: unknown }).school) });
  } catch {
    return null;
  }
}

function starText(s: Star): string {
  const marks = [s.brightnessRaw, s.siHua && `化${s.siHua}`].filter(Boolean).join('·');
  return marks ? `${s.name}(${marks})` : s.name;
}

function palaceText(p: Palace): string {
  const by = (types: Star['type'][]) => p.stars.filter(s => types.includes(s.type)).map(starText).join('、') || '无';
  const major = p.stars.some(s => s.type === 'major') ? by(['major']) : '空宫（借对宫）';
  const age = p.daXianAge ? ` 大限${p.daXianAge[0]}–${p.daXianAge[1]}岁` : '';
  return `${p.name}（${STEMS[p.stem]}${BRANCHES[p.branch]}${age}）：主星 ${major}；吉星 ${by(['lucky'])}；煞星 ${by(['sha'])}`;
}

/** 命盘结构：基本资料、十二宫（自命宫起逆排）、目前大限与今年流年四化 */
export function describeChart(chart: ZiweiChart, now: FlowTarget): string {
  const { birthInfo: b, lunarInfo: l } = chart;
  const lines = [
    `公历 ${b.year}-${b.month}-${b.day} ${SHICHEN[b.hour].name}，${b.gender === 'male' ? '男' : '女'}命`,
    `农历 ${l.lunarYear} 年 ${l.isLeapMonth ? '闰' : ''}${Math.abs(l.lunarMonth)} 月 ${l.lunarDay} 日，年干支 ${STEMS[l.yearStem]}${BRANCHES[l.yearBranch]}`,
    `${chart.wuxingJuName}，命宫在${BRANCHES[chart.mingGongBranch]}，身宫在${BRANCHES[chart.shenGongBranch]}`,
  ];
  const school = describeNonDefaultSchool(chart.school);
  if (school.length) {
    lines.push(`排盘流派（非默认）：${school.join('；')}。下方断语节录是按默认流派的盘写的，与此盘不同处以盘面为准`);
  }
  lines.push('', '十二宫：');
  for (let offset = 0; offset < 12; offset++) {
    const branch = ((chart.mingGongBranch - offset) % 12 + 12) % 12;
    const palace = chart.palaces.find(p => p.branch === branch);
    if (palace) lines.push(`- ${palaceText(palace)}`);
  }

  try {
    const flow = getFlowLayers(chart, now);
    lines.push('', `目前（${now.year}-${now.month}-${now.day}，虚岁 ${flow.nominalAge}）：`);
    for (const key of ['daxian', 'liunian'] as const) {
      const layer = flow.layers[key];
      if (layer.mingBranch === null) continue;
      const sihua = Object.entries(layer.siHua).map(([star, h]) => `${star}化${h}`).join('、');
      const mingPalace = chart.palaces.find(p => p.branch === layer.mingBranch)?.name ?? '';
      lines.push(`- ${FLOW_LAYER_LABEL[key]} ${layer.ganzhi}：${FLOW_LAYER_LABEL[key]}命宫落本命${mingPalace}（${BRANCHES[layer.mingBranch]}），四化 ${sihua}`);
      // 该层十二宫对应（如流年财帛落本命哪宫）
      const map = chart.palaces
        .map(p => `${flowPalaceShortName(layer.mingBranch!, p.branch)}→${p.name}`)
        .join(' ');
      lines.push(`  ${FLOW_LAYER_LABEL[key]}宫位对应：${map}`);
    }
  } catch {
    // 出生前等无运限的情况，不附运限
  }
  return lines.join('\n');
}

/** 解读资料集里这张盘的 13 维断语节录；资料集没涵盖就回 null */
export async function readingExcerpts(chart: ZiweiChart): Promise<string | null> {
  if (!isReadingYearCovered(chart.birthInfo.year)) return null;
  let reading: Reading;
  try {
    reading = await readingStore.get(readingKey(chart.birthInfo));
  } catch (err) {
    console.error('[chart-context] reading lookup failed', err);
    return null;
  }
  return READING_TOPICS.map(t => {
    const text = reading.content[t];
    const cut = text.length > READING_EXCERPT_CHARS ? `${text.slice(0, READING_EXCERPT_CHARS)}…` : text;
    return `### ${TOPIC_LABEL[t]}\n${cut}`;
  }).join('\n\n');
}

export function currentTarget(): FlowTarget {
  // 以台湾时间（UTC+8）为准，伺服器时区可能是 UTC
  const now = new Date(Date.now() + 8 * 3600_000);
  return {
    year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate(),
    hour: Math.floor(((now.getUTCHours() + 1) % 24) / 2),
  };
}
