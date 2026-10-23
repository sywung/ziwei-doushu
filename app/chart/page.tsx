'use client';
import { useEffect, useState } from 'react';
import BirthForm, { type BirthFormState } from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import InsightPanel from '@/components/InsightPanel';
import SchoolPanel from '@/components/SchoolPanel';
import TwinsPanel from '@/components/TwinsPanel';
import { readingKey } from '@/lib/reading/key';
import { formToBirthInfo } from '@/lib/ziwei/share';
import { generateChart } from '@/lib/ziwei/algorithm';
import {
  SCHOOL_DEFAULT_CONFIG, configToParams, loadSchoolConfig, sanitizeSchoolConfig, saveSchoolConfig,
  type SchoolConfig,
} from '@/lib/ziwei/school-config';
import type { BirthInfo, ZiweiChart, Palace } from '@/lib/ziwei/types';

/**
 * 命盘页 —— 开源版「排盘引擎 Demo」
 *
 * 这是一个最小可运行示例：用本仓库的排盘引擎 generateChart() 配合基础 UI
 * 组件，渲染一张完整紫微命盘 + 13 维解读，并支持本命 / 大限 / 小限 / 流年 / 流月 / 流日 / 流时切换
 * （运限切换在 ChartBoard 内的 TimeNav）。
 *
 * 说明：线上商业版的完整交互界面（重设计的新 UI、AI 流式解读、合盘、分享
 * 卡片等）不在开源范围内；但排盘内核——安星算法、四化、格局识别、古籍库——
 * 完全开放（见 lib/ziwei/*），可自由二次开发出你自己的界面。
 */
export default function ChartPage() {
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);
  const [school, setSchool] = useState<SchoolConfig>(SCHOOL_DEFAULT_CONFIG);
  // 最近一次表单输入：改「晚子时」时要从原始钟表时间重算出生日；从命理学双子开的盘没有表单，为 null
  const [lastForm, setLastForm] = useState<BirthFormState | null>(null);

  // 流派存在 localStorage；只在浏览器端读，避免 SSR 与客户端不一致
  useEffect(() => {
    setSchool({ ...SCHOOL_DEFAULT_CONFIG, ...sanitizeSchoolConfig(loadSchoolConfig()) });
  }, []);

  const changeSchool = (next: SchoolConfig) => {
    setSchool(next);
    saveSchoolConfig(next);
    if (!chart) return;
    const info = lastForm ? formToBirthInfo(lastForm, { lateZishi: next.lateZishi }) : null;
    setChart(generateChart(info ?? chart.birthInfo, { school: next }));
  };

  // ── 未起盘：展示出生信息表单 ──
  if (!chart) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>紫微斗数排盘</h1>
        <p style={{ color: '#888', marginBottom: 32, fontSize: 14, lineHeight: 1.7 }}>
          输入出生年月日时，即时生成命盘与 13 维解读。
        </p>
        <SchoolPanel value={school} onChange={changeSchool} />
        <BirthForm
          lateZishi={school.lateZishi}
          initialData={lastForm ?? undefined}
          onFormSave={setLastForm}
          onSubmit={(info: BirthInfo) => setChart(generateChart(info, { school }))}
        />
      </main>
    );
  }

  // 换盘（例如点命理学双子）时用键让命盘与解读面板重新挂载，否则解读停在上一张盘
  const chartKey = readingKey(chart.birthInfo);
  // 流派不同盘就不同：AI 对话纪录按「盘＋流派」分开存
  const schoolQuery = new URLSearchParams(configToParams(school)).toString();
  const historyKey = schoolQuery ? `${chartKey}?${schoolQuery}` : chartKey;
  const openChart = (info: BirthInfo) => {
    setSelectedPalace(null);
    setLastForm(null);
    setChart(generateChart(info, { school }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── 已起盘：命盘 + 解读 ──
  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px' }}>
      <button
        type="button"
        onClick={() => { setChart(null); setSelectedPalace(null); }}
        style={{
          marginBottom: 16, padding: '6px 14px', cursor: 'pointer',
          border: '1px solid #ccc', borderRadius: 8, background: 'transparent',
        }}
      >
        ← 重新起盘
      </button>
      <a
        href={`/chart/report?${new URLSearchParams({ key: chartKey, ...configToParams(school) })}`}
        target="_blank"
        rel="noopener"
        style={{
          marginLeft: 8, marginBottom: 16, padding: '6px 14px', display: 'inline-block',
          border: '1px solid var(--ac-bdr)', borderRadius: 8, color: 'var(--ac)', textDecoration: 'none',
        }}
      >
        汇出报告 ↗
      </a>

      <div style={{ marginTop: 16 }}>
        <SchoolPanel value={school} onChange={changeSchool} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)',
          gap: 20, marginTop: 16, alignItems: 'start',
        }}
      >
        <div>
          <ChartBoard key={historyKey} chart={chart} onPalaceSelect={setSelectedPalace} />
          <TwinsPanel chart={chart} onOpen={openChart} />
        </div>
        {/* 解读一则上万字：面板限高、内部捲动，否则新内容会长在页面下方看不到 */}
        <div style={{ position: 'sticky', top: 16, height: 'calc(100vh - 32px)' }}>
          <InsightPanel key={historyKey} historyKey={historyKey} chart={chart} selectedPalace={selectedPalace} />
        </div>
      </div>
    </main>
  );
}
