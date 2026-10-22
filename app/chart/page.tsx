'use client';
import { useState } from 'react';
import BirthForm from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import InsightPanel from '@/components/InsightPanel';
import TwinsPanel from '@/components/TwinsPanel';
import { readingKey } from '@/lib/reading/key';
import { generateChart } from '@/lib/ziwei/algorithm';
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

  // ── 未起盘：展示出生信息表单 ──
  if (!chart) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>紫微斗数排盘</h1>
        <p style={{ color: '#888', marginBottom: 32, fontSize: 14, lineHeight: 1.7 }}>
          输入出生年月日时，开源排盘引擎即时生成命盘。
          <br />
          （本页为引擎 Demo，完整商业版界面不在开源范围；排盘内核完全开放。）
        </p>
        <BirthForm onSubmit={(info: BirthInfo) => setChart(generateChart(info))} />
      </main>
    );
  }

  // 换盘（例如点命理学双子）时用键让命盘与解读面板重新挂载，否则解读停在上一张盘
  const chartKey = readingKey(chart.birthInfo);
  const openChart = (info: BirthInfo) => {
    setSelectedPalace(null);
    setChart(generateChart(info));
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)',
          gap: 20, marginTop: 16, alignItems: 'start',
        }}
      >
        <div>
          <ChartBoard key={chartKey} chart={chart} onPalaceSelect={setSelectedPalace} />
          <TwinsPanel chart={chart} onOpen={openChart} />
        </div>
        {/* 解读一则上万字：面板限高、内部捲动，否则新内容会长在页面下方看不到 */}
        <div style={{ position: 'sticky', top: 16, height: 'calc(100vh - 32px)' }}>
          <InsightPanel key={chartKey} chart={chart} selectedPalace={selectedPalace} />
        </div>
      </div>
    </main>
  );
}
