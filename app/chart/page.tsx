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
 * 命盤頁 —— 開源版「排盤引擎 Demo」
 *
 * 這是一個最小可運行示例：用本倉庫的排盤引擎 generateChart() 配合基礎 UI
 * 組件，渲染一張完整紫微命盤 + 13 維解讀，並支持本命 / 大限 / 小限 / 流年 / 流月 / 流日 / 流時切換
 * （運限切換在 ChartBoard 內的 TimeNav）。
 *
 * 說明：線上商業版的完整交互界面（重設計的新 UI、AI 流式解讀、合盤、分享
 * 卡片等）不在開源範圍內；但排盤內核——安星算法、四化、格局識別、古籍庫——
 * 完全開放（見 lib/ziwei/*），可自由二次開發出你自己的界面。
 */
export default function ChartPage() {
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);
  const [school, setSchool] = useState<SchoolConfig>(SCHOOL_DEFAULT_CONFIG);
  // 最近一次表單輸入：改「晚子時」時要從原始鐘錶時間重算出生日；從命理學雙子開的盤沒有表單，為 null
  const [lastForm, setLastForm] = useState<BirthFormState | null>(null);

  // 流派存在 localStorage；只在瀏覽器端讀，避免 SSR 與客戶端不一致
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

  // ── 未起盤：展示出生信息表單 ──
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

  // 換盤（例如點命理學雙子）時用鍵讓命盤與解讀面板重新掛載，否則解讀停在上一張盤
  const chartKey = readingKey(chart.birthInfo);
  // 流派不同盤就不同：AI 對話紀錄按「盤＋流派」分開存
  const schoolQuery = new URLSearchParams(configToParams(school)).toString();
  const historyKey = schoolQuery ? `${chartKey}?${schoolQuery}` : chartKey;
  const openChart = (info: BirthInfo) => {
    setSelectedPalace(null);
    setLastForm(null);
    setChart(generateChart(info, { school }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── 已起盤：命盤 + 解讀 ──
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
        {/* 解讀一則上萬字：面板限高、內部捲動，否則新內容會長在頁面下方看不到 */}
        <div style={{ position: 'sticky', top: 16, height: 'calc(100vh - 32px)' }}>
          <InsightPanel key={historyKey} historyKey={historyKey} chart={chart} selectedPalace={selectedPalace} />
        </div>
      </div>
    </main>
  );
}
