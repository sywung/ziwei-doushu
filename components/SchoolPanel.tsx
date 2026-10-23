'use client';
import {
  SCHOOL_DEFAULT_CONFIG, SCHOOL_LABELS, SCHOOL_OPTIONS, SCHOOL_SWITCHABLE_KEYS,
  nonDefaultSchoolKeys, type SchoolConfig,
} from '@/lib/ziwei/school-config';

interface SchoolPanelProps {
  value: SchoolConfig;
  onChange: (next: SchoolConfig) => void;
}

/** 排盘流派设定：只列 generateChart 实作的六项（见 SCHOOL_SWITCHABLE_KEYS） */
export default function SchoolPanel({ value, onChange }: SchoolPanelProps) {
  const changed = nonDefaultSchoolKeys(value);

  return (
    <details
      style={{
        marginBottom: 16, padding: '10px 14px', borderRadius: 10,
        border: '1px solid var(--bdr-med)', background: 'var(--bg-1)',
      }}
    >
      <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--tx-1)' }}>
        排盘流派设定
        {changed.length > 0 && (
          <span style={{ marginLeft: 8, color: 'var(--ac)' }}>（已改 {changed.length} 项）</span>
        )}
      </summary>

      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '10px 16px', marginTop: 12,
        }}
      >
        {SCHOOL_SWITCHABLE_KEYS.map(key => {
          const options = SCHOOL_OPTIONS[key];
          const current = options.find(o => o.value === value[key]);
          return (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--tx-2)' }}>{SCHOOL_LABELS[key]}</span>
              <select
                value={value[key]}
                onChange={e => onChange({ ...value, [key]: e.target.value })}
                style={{
                  padding: '6px 8px', borderRadius: 6, fontSize: 13,
                  border: `1px solid ${value[key] === SCHOOL_DEFAULT_CONFIG[key] ? 'var(--bdr-med)' : 'var(--ac)'}`,
                  background: 'var(--bg-0)', color: 'var(--tx-0)',
                }}
              >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {'desc' in (current ?? {}) && (
                <span style={{ color: 'var(--tx-3)', fontSize: 11, lineHeight: 1.5 }}>
                  {(current as { desc?: string }).desc}
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={changed.length === 0}
          onClick={() => onChange(SCHOOL_DEFAULT_CONFIG)}
          style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 12,
            border: '1px solid var(--bdr-med)', background: 'transparent', color: 'var(--tx-1)',
            cursor: changed.length === 0 ? 'not-allowed' : 'pointer', opacity: changed.length === 0 ? 0.5 : 1,
          }}
        >
          恢复默认
        </button>
        {changed.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--tx-3)', lineHeight: 1.6 }}>
            命盘与运限已按所选流派重排；13 维解读与命理学双子是按默认流派的盘计算，与此盘不同处以盘面为准。
          </span>
        )}
      </div>
    </details>
  );
}
