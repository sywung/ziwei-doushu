'use client';
import { useEffect, useState } from 'react';
import { SHICHEN } from '@/lib/ziwei/constants';
import { readingKey } from '@/lib/reading/key';
import { TWIN_TIER_LABEL, type TwinTier } from '@/lib/twins/tiers';
import type { TwinsResult } from '@/lib/twins/store';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';

/**
 * 命理学双子：1950–2026 每个出生时刻里，与本盘配置相同的盘
 * 点样本即以同一性别起那张盘，方便对照同配置的人生解读。
 */
interface TwinsPanelProps {
  chart: ZiweiChart;
  onOpen: (info: BirthInfo) => void;
}

type State =
  | { status: 'loading' }
  | { status: 'ok'; result: TwinsResult }
  | { status: 'error' };

export default function TwinsPanel({ chart, onOpen }: TwinsPanelProps) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [tier, setTier] = useState<TwinTier>('full');

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetch(`/api/twins?key=${encodeURIComponent(readingKey(chart.birthInfo))}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((result: TwinsResult) => { if (!cancelled) setState({ status: 'ok', result }); })
      .catch(err => {
        console.error('[TwinsPanel] fetch failed', err);
        if (!cancelled) setState({ status: 'error' });
      });
    return () => { cancelled = true; };
  }, [chart]);

  const current = state.status === 'ok' ? state.result.tiers.find(t => t.tier === tier) : undefined;

  return (
    <section
      aria-labelledby="twins-heading"
      className="mt-4 rounded-xl p-3 card-glass"
      style={{ border: '1px solid var(--t-border)' }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 id="twins-heading" className="text-[12px] font-medium tracking-wide" style={{ color: 'var(--t-gold)' }}>
          命理学双子
        </h3>
        {state.status === 'ok' && (
          <span className="text-[9px]" style={{ color: 'var(--t-faint)' }}>
            在 {state.result.yearMin}–{state.result.yearMax} 年每一个出生时刻里，找星曜配置与本盘相同的盘
          </span>
        )}
      </div>

      {state.status === 'loading' && (
        <p className="text-[10px] animate-pulse" style={{ color: 'var(--t-faint)' }}>比对中…</p>
      )}
      {state.status === 'error' && (
        <p className="text-[10px] text-red-400/80">双子资料读取失败，请稍后再试。</p>
      )}

      {state.status === 'ok' && (
        <>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {state.result.tiers.map(t => (
              <button
                key={t.tier}
                type="button"
                onClick={() => setTier(t.tier)}
                className="py-1 px-1.5 rounded-lg text-[10px] text-left transition-all"
                style={{
                  background: tier === t.tier ? 'rgba(212,168,67,0.12)' : 'transparent',
                  border: `1px solid ${tier === t.tier ? 'rgba(212,168,67,0.3)' : 'var(--t-border)'}`,
                  color: tier === t.tier ? 'var(--t-gold)' : 'var(--t-faint)',
                }}
              >
                <div>{TWIN_TIER_LABEL[t.tier]}</div>
                <div className="font-mono tabular-nums text-[11px]">{t.total.toLocaleString()} 张</div>
              </button>
            ))}
          </div>

          {current && current.total === 0 && (
            <p className="text-[10px]" style={{ color: 'var(--t-faint)' }}>
              这一层没有其他配置相同的盘——这张盘的组合在这段年代里是独一份。
            </p>
          )}
          {current && current.total > 0 && (
            <>
              <div className="flex flex-wrap gap-1">
                {current.samples.map(key => {
                  const [y, m, d, h] = key.split('-').map(Number);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onOpen({ year: y, month: m, day: d, hour: h, gender: chart.birthInfo.gender })}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums hover:brightness-125"
                      style={{ border: '1px solid var(--t-border)', color: 'var(--t-text2)' }}
                    >
                      {y}-{String(m).padStart(2, '0')}-{String(d).padStart(2, '0')} {SHICHEN[h].name}
                    </button>
                  );
                })}
              </div>
              {current.total > current.samples.length && (
                <p className="mt-1.5 text-[9px]" style={{ color: 'var(--t-faint)' }}>
                  依年代平均抽出 {current.samples.length} 张；点任一张以同性别起盘对照。
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
