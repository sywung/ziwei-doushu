'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ChartBoard from '@/components/ChartBoard';
import { AiContent } from '@/components/InsightPanel';
import { READING_TOPICS, isReadingYearCovered, parseReadingKey, type Reading } from '@/lib/reading/key';
import { generateChart } from '@/lib/ziwei/algorithm';
import { BRANCHES, SHICHEN } from '@/lib/ziwei/constants';
import { TOPIC_LABEL } from '@/lib/ziwei/db-analysis';

type ReadingState =
  | { status: 'loading' }
  | { status: 'ok'; reading: Reading }
  | { status: 'error'; message: string };

type PngState = 'idle' | 'working' | 'failed';

/** 报告页：本命盘 + 13 维解读，供列印成 PDF 或下载命盘 PNG */
export default function ReportView() {
  const key = useSearchParams().get('key') ?? '';
  const info = parseReadingKey(key);
  const chart = useMemo(() => (info ? generateChart(info) : null), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [reading, setReading] = useState<ReadingState>({ status: 'loading' });
  const [png, setPng] = useState<PngState>('idle');

  useEffect(() => {
    if (!info) return;
    if (!isReadingYearCovered(info.year)) {
      setReading({ status: 'error', message: '解读资料集只涵盖 1950–2026 年出生的命盘，这份报告只有命盘、没有解读。' });
      return;
    }
    let cancelled = false;
    fetch(`/api/reading?key=${encodeURIComponent(key)}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((r: Reading) => { if (!cancelled) setReading({ status: 'ok', reading: r }); })
      .catch(err => {
        console.error('[ReportView] reading failed', err);
        if (!cancelled) setReading({ status: 'error', message: '解读资料读取失败，请重新整理再试。' });
      });
    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!info || !chart) {
    return <p className="p-10 text-center" style={{ color: 'var(--tx-2)' }}>报告网址不正确，请从命盘页重新开启。</p>;
  }

  const downloadPng = async () => {
    const node = document.getElementById('report-chart');
    if (!node) return;
    setPng('working');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(node, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `ziwei-${key}.png`;
      link.click();
      setPng('idle');
    } catch (err) {
      console.error('[ReportView] png export failed', err);
      setPng('failed');
    }
  };

  const { lunarInfo } = chart;
  const facts: [string, string][] = [
    ['公历', `${info.year} 年 ${info.month} 月 ${info.day} 日 ${SHICHEN[info.hour].name}`],
    ['农历', `${lunarInfo.lunarYear} 年 ${lunarInfo.isLeapMonth ? '闰' : ''}${lunarInfo.lunarMonth} 月 ${lunarInfo.lunarDay} 日`],
    ['性别', info.gender === 'male' ? '男' : '女'],
    ['五行局', chart.wuxingJuName],
    ['命宫', BRANCHES[chart.mingGongBranch]],
    ['身宫', BRANCHES[chart.shenGongBranch]],
  ];

  return (
    <div className="report-root min-h-screen" style={{ background: 'var(--bg-0)' }}>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 1.4cm; }
          .report-section { break-inside: auto; }
          .report-section h2 { break-after: avoid; }
          .report-chart { break-inside: avoid; }
        }
        .report-reading .text-\\[11px\\] { font-size: 13px; line-height: 1.8; }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-2 px-6 py-3"
        style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--bdr-med)' }}>
        <a href="/chart" className="text-[12px] mr-auto" style={{ color: 'var(--ac)' }}>← 回命盘</a>
        <button type="button" onClick={() => window.print()} className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
          style={{ background: 'var(--ac-bg)', border: '1px solid var(--ac-bdr)', color: 'var(--ac)' }}>
          列印／存成 PDF
        </button>
        <button type="button" onClick={downloadPng} disabled={png === 'working'}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium disabled:opacity-50"
          style={{ border: '1px solid var(--ac-bdr)', color: 'var(--ac)' }}>
          {png === 'working' ? '产生中…' : '下载命盘 PNG'}
        </button>
        {png === 'failed' && <span className="text-[11px] text-red-400">命盘图片产生失败，可改用列印存成 PDF。</span>}
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <header className="mb-6">
          <h1 className="text-[22px] font-bold tracking-widest" style={{ color: 'var(--tx-0)' }}>紫微斗数命盘报告</h1>
          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-[13px]">
            {facts.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt style={{ color: 'var(--tx-3)' }}>{k}</dt>
                <dd style={{ color: 'var(--tx-0)' }}>{v}</dd>
              </div>
            ))}
          </dl>
        </header>

        <div id="report-chart" className="report-chart p-2" style={{ background: 'var(--bg-0)' }}>
          <ChartBoard chart={chart} showTimeNav={false} />
        </div>

        <div className="report-reading mt-8 space-y-8">
          {reading.status === 'loading' && <p className="text-[13px] animate-pulse" style={{ color: 'var(--tx-3)' }}>解读载入中…</p>}
          {reading.status === 'error' && <p className="text-[13px]" style={{ color: 'var(--tx-2)' }}>{reading.message}</p>}
          {reading.status === 'ok' && READING_TOPICS.map(topic => (
            <section key={topic} className="report-section" aria-labelledby={`report-${topic}`}>
              <h2 id={`report-${topic}`} className="text-[16px] font-semibold mb-2 pb-1"
                style={{ color: 'var(--ac)', borderBottom: '1px solid var(--ac-bdr)' }}>
                {TOPIC_LABEL[topic]}
              </h2>
              <AiContent text={reading.reading.content[topic]} />
            </section>
          ))}
        </div>

        <footer className="mt-10 pt-4 text-[11px] leading-relaxed" style={{ color: 'var(--tx-3)', borderTop: '1px solid var(--bdr)' }}>
          排盘：ziwei-doushu 开源引擎（MIT）。解读：紫微斗数开源解读数据集 v4.0（CC BY 4.0，作者 王多鱼AI，
          https://github.com/Renhuai123/ziwei-doushu）。按时辰序号排盘，解读未按出生地做真太阳时校正。仅供参考。
        </footer>
      </main>
    </div>
  );
}
