'use client';
import { motion } from 'framer-motion';
import { SHICHEN } from '@/lib/ziwei/constants';
import {
  FLOW_LAYER_KEYS, FLOW_LAYER_LABEL,
  type FlowLayerKey, type FlowLayers, type FlowTarget,
} from '@/lib/ziwei/flow-layers';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { CHILDHOOD_DAXIAN_INDEX, getChildhoodYears } from '@/lib/ziwei/yunxian-context';

/** 本命 + 六层运限（大限 / 小限 / 流年 / 流月 / 流日 / 流时） */
export type TimeView = 'mingpan' | FlowLayerKey;

interface TimeNavProps {
  chart: ZiweiChart;
  view: TimeView;
  onViewChange: (view: TimeView) => void;
  target: FlowTarget;
  onTargetChange: (target: FlowTarget) => void;
  /** 大限视图点选的大限；童限为 CHILDHOOD_DAXIAN_INDEX */
  daXianIndex: number;
  onDaXianChange: (index: number) => void;
  flow: FlowLayers | null;
  /** 目标日期无效（如出生前）时的说明 */
  flowError: string | null;
}

const SIHUA_COLORS: Record<string, string> = {
  '禄': '#4ade80',
  '权': '#60a5fa',
  '科': '#facc15',
  '忌': '#f87171',
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const toDateInput = (t: FlowTarget) => `${t.year}-${pad2(t.month)}-${pad2(t.day)}`;

/** 公历日期加减（跨月、闰年由 Date 处理） */
function shiftTarget(t: FlowTarget, unit: 'year' | 'month' | 'day', delta: number): FlowTarget {
  const d = new Date(Date.UTC(t.year, t.month - 1, t.day));
  if (unit === 'year') d.setUTCFullYear(d.getUTCFullYear() + delta);
  if (unit === 'month') d.setUTCMonth(d.getUTCMonth() + delta);
  if (unit === 'day') d.setUTCDate(d.getUTCDate() + delta);
  return { ...t, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** 各视图的「上一个 / 下一个」步进单位 */
const STEP_UNIT: Partial<Record<TimeView, 'year' | 'month' | 'day'>> = {
  xiaoxian: 'year', liunian: 'year', liuyue: 'month', liuri: 'day',
};

export default function TimeNav({
  chart, view, onViewChange, target, onTargetChange, daXianIndex, onDaXianChange, flow, flowError,
}: TimeNavProps) {
  const hasChildhood = getChildhoodYears(chart).length > 0;
  const layer = view !== 'mingpan' && flow ? flow.layers[view] : null;
  const stepUnit = STEP_UNIT[view];

  return (
    <div className="mb-3 space-y-1.5">
      {/* ── 层级 Tab ── */}
      <div
        className="grid grid-cols-7 rounded-xl p-1 gap-1"
        style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
      >
        <TabButton active={view === 'mingpan'} onClick={() => onViewChange('mingpan')}>本命</TabButton>
        {FLOW_LAYER_KEYS.map(key => (
          <TabButton key={key} active={view === key} onClick={() => onViewChange(key)}>
            {FLOW_LAYER_LABEL[key]}
          </TabButton>
        ))}
      </div>

      {/* ── 大限选择 ── */}
      {view === 'daxian' && (
        <div className="flex flex-wrap gap-1 px-1">
          {hasChildhood && (
            <ChipButton active={daXianIndex === CHILDHOOD_DAXIAN_INDEX} onClick={() => onDaXianChange(CHILDHOOD_DAXIAN_INDEX)}>
              童限 1–{chart.daXians[0].startAge - 1}
            </ChipButton>
          )}
          {chart.daXians.map((dx, i) => (
            <ChipButton key={i} active={daXianIndex === i} onClick={() => onDaXianChange(i)}>
              {dx.startAge}–{dx.endAge}
              {i === chart.currentDaXianIndex && <span className="ml-0.5 opacity-60">·今</span>}
            </ChipButton>
          ))}
        </div>
      )}

      {/* ── 目标时刻（小限、流年、流月、流日、流时）── */}
      {view !== 'mingpan' && view !== 'daxian' && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 text-[10px]" style={{ color: 'var(--t-faint)' }}>
          {stepUnit && (
            <StepButton label="上一个" onClick={() => onTargetChange(shiftTarget(target, stepUnit, -1))}>‹</StepButton>
          )}
          <input
            type="date"
            aria-label="运限日期"
            value={toDateInput(target)}
            onChange={e => {
              const [y, m, d] = e.target.value.split('-').map(Number);
              if (y && m && d) onTargetChange({ ...target, year: y, month: m, day: d });
            }}
            className="rounded-md px-1.5 py-0.5 text-[10px] font-mono"
            style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
          />
          {stepUnit && (
            <StepButton label="下一个" onClick={() => onTargetChange(shiftTarget(target, stepUnit, 1))}>›</StepButton>
          )}
          {view === 'liushi' && (
            <select
              aria-label="流时时辰"
              value={target.hour}
              onChange={e => onTargetChange({ ...target, hour: Number(e.target.value) })}
              className="rounded-md px-1 py-0.5 text-[10px]"
              style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            >
              {SHICHEN.map(sc => <option key={sc.branch} value={sc.branch}>{sc.name}（{sc.range}）</option>)}
            </select>
          )}
          <button
            type="button"
            onClick={() => onTargetChange(nowTarget())}
            className="px-1.5 py-0.5 rounded-md hover:opacity-100 opacity-70"
            style={{ border: '1px solid var(--t-border)' }}
          >
            今天
          </button>
          {flow && <span className="ml-1">农历 {flow.lunarDate} · 虚岁 {flow.nominalAge}</span>}
        </div>
      )}

      {/* ── 叠加四化说明 ── */}
      {flowError && view !== 'mingpan' && (
        <div className="px-1 text-[10px] text-red-400/80">{flowError}</div>
      )}
      {layer && (
        <motion.div
          key={`${view}-${layer.ganzhi}`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 px-1 flex-wrap"
        >
          <span className="text-[9px]" style={{ color: 'var(--t-faint)' }}>
            {FLOW_LAYER_LABEL[layer.key]} {layer.ganzhi} 四化：
          </span>
          {layer.mingBranch === null && (
            <span className="text-[9px]" style={{ color: 'var(--t-faint)' }}>此时不在任何大限内</span>
          )}
          {(['禄', '权', '科', '忌'] as const).map(sh => {
            const starName = Object.keys(layer.siHua).find(k => layer.siHua[k] === sh);
            if (!starName) return null;
            return (
              <span key={sh} className="text-[9px] font-medium" style={{ color: SIHUA_COLORS[sh] }}>
                {starName}化{sh}
              </span>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

/** 现在的公历日期与时辰（23 点起算次日子时的换日交给使用者自行调整日期） */
export function nowTarget(): FlowTarget {
  const now = new Date();
  return {
    year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(),
    hour: Math.floor(((now.getHours() + 1) % 24) / 2),
  };
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="py-1.5 text-[10px] font-medium rounded-lg transition-all duration-200"
      style={{
        background: active ? 'rgba(212,168,67,0.12)' : 'transparent',
        color: active ? 'var(--t-gold)' : 'var(--t-faint)',
        border: active ? '1px solid rgba(212,168,67,0.25)' : '1px solid transparent',
      }}
    >
      {children}
    </button>
  );
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-0.5 text-[10px] font-mono tabular-nums rounded-full transition-all duration-150"
      style={{
        background: active ? 'rgba(147,51,234,0.15)' : 'transparent',
        color: active ? 'rgb(192,132,252)' : 'var(--t-faint)',
        border: `1px solid ${active ? 'rgba(147,51,234,0.45)' : 'var(--t-border)'}`,
      }}
    >
      {children}
    </button>
  );
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="w-5 h-5 flex items-center justify-center rounded-md"
      style={{ border: '1px solid var(--t-border)', color: 'var(--t-text2)' }}
    >
      {children}
    </button>
  );
}
