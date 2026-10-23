/**
 * 把命盤與解讀整理成給模型看的文字（僅服務端）
 *
 * 模型只能依據這裡列出的星曜與斷語回答；命盤一律由服務端按出生資料重排，不信任前端傳來的 chart 物件。
 */
import { readingKey, isReadingYearCovered, READING_TOPICS, type Reading } from '../reading/key';
import { createReadingStore } from '../reading/store';
import { generateChart } from '../ziwei/algorithm';
import { describeNonDefaultSchool, sanitizeSchoolConfig } from '../ziwei/school-config';
import { BRANCHES, SHICHEN, STEMS } from '../ziwei/constants';
import { TOPIC_LABEL } from '../ziwei/db-analysis';
import { FLOW_LAYER_LABEL, flowPalaceShortName, getFlowLayers, type FlowTarget } from '../ziwei/flow-layers';
import type { BirthInfo, Palace, Star, ZiweiChart } from '../ziwei/types';

/** 每個維度只帶開頭這麼多字進 prompt，13 維合計約 1.2 萬字 */
export const READING_EXCERPT_CHARS = 900;

const readingStore = createReadingStore({
  dataDir: process.env.READING_DATA_DIR ?? '/data/v4/jsonl',
  indexDir: process.env.READING_INDEX_DIR ?? '/data/v4/index',
});

/** 從前端傳來的（不可信）物件取出出生資料並重排命盤；格式不對回 null */
export function chartFromUntrusted(input: unknown): ZiweiChart | null {
  const b = (input as { birthInfo?: Partial<BirthInfo> } | null)?.birthInfo;
  if (!b) return null;
  try {
    const info = { year: b.year!, month: b.month!, day: b.day!, hour: b.hour!, gender: b.gender! };
    readingKey(info); // 驗證日期、時辰、性別
    // 流派也來自前端：只收白名單內的合法值，否則 AI 看到的盤與畫面上的不同
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

/** 命盤結構：基本資料、十二宮（自命宮起逆排）、目前大限與今年流年四化 */
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
      // 該層十二宮對應（如流年財帛落本命哪宮）
      const map = chart.palaces
        .map(p => `${flowPalaceShortName(layer.mingBranch!, p.branch)}→${p.name}`)
        .join(' ');
      lines.push(`  ${FLOW_LAYER_LABEL[key]}宫位对应：${map}`);
    }
  } catch {
    // 出生前等無運限的情況，不附運限
  }
  return lines.join('\n');
}

/** 解讀資料集裡這張盤的 13 維斷語節錄；資料集沒涵蓋就回 null */
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
  // 以台灣時間（UTC+8）為準，伺服器時區可能是 UTC
  const now = new Date(Date.now() + 8 * 3600_000);
  return {
    year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate(),
    hour: Math.floor(((now.getUTCHours() + 1) % 24) / 2),
  };
}
