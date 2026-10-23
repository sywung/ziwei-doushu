'use client';
import { useEffect, useMemo, useState } from 'react';
import BirthForm from '@/components/BirthForm';
import TwinsPanel from '@/components/TwinsPanel';
import { readingKey } from '@/lib/reading/key';
import { clockWindows, formatClockWindow } from '@/lib/twins/clock-windows';
import { generateChart } from '@/lib/ziwei/algorithm';
import { PROVINCES } from '@/lib/ziwei/cities';
import { BRANCHES, SHICHEN } from '@/lib/ziwei/constants';
import { SCHOOL_DEFAULT_CONFIG, loadSchoolConfig, sanitizeSchoolConfig } from '@/lib/ziwei/school-config';
import type { LateZishiRule } from '@/lib/ziwei/true-solar-time';
import type { BirthInfo, Palace, ZiweiChart } from '@/lib/ziwei/types';

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--bdr-med)', borderRadius: 12, padding: '16px 18px', background: 'var(--bg-1)',
};

function majorStars(p: Palace | undefined): string {
  const names = p?.stars.filter(s => s.type === 'major').map(s => s.name) ?? [];
  return names.length ? names.join('、') : '无主星';
}

/** 命盘指纹：决定这张本命盘的几个要素 */
function Fingerprint({ chart }: { chart: ZiweiChart }) {
  const { birthInfo: b } = chart;
  const ming = chart.palaces.find(p => p.branch === chart.mingGongBranch);
  const shen = chart.palaces.find(p => p.branch === chart.shenGongBranch);
  const dx = chart.daXians[chart.currentDaXianIndex];
  const rows: [string, string][] = [
    ['命宫', `${BRANCHES[chart.mingGongBranch]}宫 · ${majorStars(ming)}`],
    ['身宫', `${BRANCHES[chart.shenGongBranch]}宫 · ${majorStars(shen)}`],
    ['五行局', chart.wuxingJuName],
    ['阴阳', chart.yinYangGender ?? ''],
    ['目前大限', dx ? `${dx.startAge}–${dx.endAge} 岁 · ${dx.palaceName}` : '童限'],
  ];
  return (
    <section style={cardStyle} aria-labelledby="fp-heading">
      <div style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--tx-3)' }}>命盘指纹</div>
      <h2 id="fp-heading" style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx-0)', margin: '4px 0 2px', letterSpacing: '0.06em' }}>
        {b.year}-{String(b.month).padStart(2, '0')}-{String(b.day).padStart(2, '0')} · {SHICHEN[b.hour].name} · {b.gender === 'male' ? '男' : '女'}
      </h2>
      <p style={{ fontSize: 11, color: 'var(--tx-3)', marginBottom: 12 }}>
        同排盘日 × 同真太阳时辰 × 同性别 → 同一张本命盘
      </p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px 16px' }}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt style={{ fontSize: 10, color: 'var(--tx-3)' }}>{k}</dt>
            <dd style={{ fontSize: 13, color: 'var(--tx-0)' }}>{v}</dd>
          </div>
        ))}
      </dl>
      <a
        href={`/chart/report?key=${encodeURIComponent(readingKey(b))}`}
        target="_blank"
        rel="noopener"
        style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: 'var(--ac)' }}
      >
        查看完整命盘与 13 维解读 ↗
      </a>
    </section>
  );
}

/** 各省代表城市（列表第一个）＋使用者所选城市，在钟表几点出生会排成同一张盘 */
function ClockTable({ chart, lateZishi, highlight }: { chart: ZiweiChart; lateZishi: LateZishiRule; highlight?: string }) {
  const rows = useMemo(() => {
    const date = { year: chart.birthInfo.year, month: chart.birthInfo.month, day: chart.birthInfo.day };
    const cities = PROVINCES.map(p => ({ province: p.name, ...p.cities[0] }));
    const chosen = PROVINCES.flatMap(p => p.cities.map(c => ({ province: p.name, ...c }))).find(c => c.name === highlight);
    if (chosen && !cities.some(c => c.name === chosen.name)) cities.unshift(chosen);
    return cities.map(c => ({
      ...c,
      windows: clockWindows(date, chart.birthInfo.hour, c.longitude, lateZishi).map(formatClockWindow),
    }));
  }, [chart, lateZishi, highlight]);

  return (
    <section style={cardStyle} aria-labelledby="clock-heading">
      <h2 id="clock-heading" style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx-0)' }}>同盘时刻表</h2>
      <p style={{ fontSize: 11, color: 'var(--tx-3)', margin: '4px 0 12px', lineHeight: 1.6 }}>
        同一个真太阳时辰，在不同经度对应不同的钟表时间（东八区标准时间，已含经度与均时差；台湾同为 UTC+8）。
        下表是各地出生能排出这张盘的钟表时间窗。
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '2px 20px' }}>
        {rows.map(r => (
          <div
            key={`${r.province}-${r.name}`}
            style={{
              display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 0', fontSize: 12,
              borderBottom: '1px solid var(--bdr)', color: r.name === highlight ? 'var(--ac)' : 'var(--tx-1)',
            }}
          >
            <span>{r.name}<span style={{ color: 'var(--tx-3)', fontSize: 10 }}> {r.longitude}°E</span></span>
            <span className="font-mono tabular-nums" style={{ textAlign: 'right' }}>{r.windows.join('；') || '—'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function TwinsFinder() {
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [city, setCity] = useState<string | undefined>();
  const [lateZishi, setLateZishi] = useState<LateZishiRule>(SCHOOL_DEFAULT_CONFIG.lateZishi);

  // 晚子时口径沿用命盘页的流派设定；双子索引按默认流派建，其余流派不影响这里
  useEffect(() => {
    setLateZishi(sanitizeSchoolConfig(loadSchoolConfig()).lateZishi ?? SCHOOL_DEFAULT_CONFIG.lateZishi);
  }, []);

  const open = (info: BirthInfo) => {
    setChart(generateChart(info));
    setCity(info.city);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!chart) {
    return (
      <div style={{ maxWidth: 560 }}>
        <BirthForm lateZishi={lateZishi} onSubmit={open} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <button
          type="button"
          onClick={() => setChart(null)}
          style={{ padding: '6px 14px', border: '1px solid var(--bdr-med)', borderRadius: 8, background: 'transparent', color: 'var(--tx-1)', cursor: 'pointer' }}
        >
          ← 重新查找
        </button>
      </div>
      <Fingerprint chart={chart} />
      <ClockTable chart={chart} lateZishi={lateZishi} highlight={city} />
      <TwinsPanel chart={chart} onOpen={open} />
    </div>
  );
}
