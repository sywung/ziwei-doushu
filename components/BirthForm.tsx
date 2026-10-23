'use client';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BirthInfo } from '@/lib/ziwei/types';
import { SHICHEN } from '@/lib/ziwei/constants';
import { useTheme } from '@/components/ThemeProvider';
import { PROVINCES } from '@/lib/ziwei/cities';
import {
  LUNAR_DAY_NAMES, LUNAR_MONTH_NAMES, lunarLeapMonth, resolveBirthMoment, type CalendarKind,
} from '@/lib/ziwei/birth-input';
import { TAIWAN_PROVINCE, clockAheadFor, formToBirthInfo } from '@/lib/ziwei/share';
import { TAIWAN_CLOCK_KIND_LABEL, taiwanClockAhead } from '@/lib/ziwei/dst-tw';
import { calculateTrueSolarTime, sameGregorianDate, type LateZishiRule } from '@/lib/ziwei/true-solar-time';

export interface BirthFormState {
  name: string;
  /** 出生日期以公曆或農曆輸入 */
  calendar: CalendarKind;
  year: string;
  month: string;
  day: string;
  /** 農曆閏月（只在 calendar=lunar 時有意義） */
  isLeapMonth: boolean;
  clockHour: string;
  clockMinute: string;
  unknownTime: boolean;
  province: string;
  city: string;
  longitude: number;
  /** 台灣夏令時／日治時期出生：填的是當時鐘錶時間，要自動減 1 小時（默認 true） */
  dstAdjust?: boolean;
  gender: 'male' | 'female';
}

interface BirthFormProps {
  onSubmit: (info: BirthInfo) => void;
  loading?: boolean;
  initialData?: Partial<BirthFormState>;
  onFormSave?: (data: BirthFormState) => void;
  /** 隱藏內部「立即起盤」按鈕（合盤等場景由父級統一觸發） */
  hideSubmit?: boolean;
  /** 晚子時換日規則（流派設定），默認視為次日 */
  lateZishi?: LateZishiRule;
}

const SHICHEN_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export default function BirthForm({ onSubmit, loading, initialData, onFormSave, hideSubmit, lateZishi = 'next-day' }: BirthFormProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [form, setForm] = useState<BirthFormState>({
    name: initialData?.name ?? '',
    calendar: initialData?.calendar ?? 'solar',
    isLeapMonth: initialData?.isLeapMonth ?? false,
    year: initialData?.year ?? '',
    month: initialData?.month ?? '',
    day: initialData?.day ?? '',
    clockHour: initialData?.clockHour ?? '8',
    clockMinute: initialData?.clockMinute ?? '0',
    unknownTime: initialData?.unknownTime ?? false,
    province: initialData?.province ?? '',
    city: initialData?.city ?? '',
    longitude: initialData?.longitude ?? 120,
    gender: initialData?.gender ?? 'male',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // 表單狀態變化時實時同步給父級（合盤等場景下父級靠這個收集雙方數據）
  useEffect(() => {
    onFormSave?.({ ...form });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const cityList = useMemo(() => {
    const prov = PROVINCES.find(p => p.name === form.province);
    return prov ? prov.cities : [];
  }, [form.province]);

  // ─── 校驗邏輯 ───────────────────────────────────────────
  const y = parseInt(form.year) || 0;
  const m = parseInt(form.month) || 0;
  const d = parseInt(form.day) || 0;
  const isLunar = form.calendar === 'lunar';
  const leapMonthOfYear = isLunar && y ? lunarLeapMonth(y) : 0;
  const isLeap = isLunar && form.isLeapMonth && leapMonthOfYear === m;
  const clockHour = parseInt(form.clockHour) || 0;
  const clockMinute = parseInt(form.clockMinute) || 0;
  const longitude = form.province ? form.longitude : undefined;

  // 換算公曆、真太陽時、晚子時換日（與送出的 formToBirthInfo 同一套）
  const moment = useMemo(() => resolveBirthMoment({
    calendar: form.calendar, year: y, month: m, day: d, isLeapMonth: isLeap,
    unknownTime: form.unknownTime, clockHour, clockMinute, longitude,
    clockAheadMinutes: clockAheadFor(form),
  }, lateZishi), [form.calendar, y, m, d, isLeap, form.unknownTime, clockHour, clockMinute, longitude, lateZishi, form.province, form.dstAdjust]);
  // 台灣出生、日期落在夏令時／日治時期：鐘錶比 UTC+8 快 1 小時
  const isTaiwan = form.province === TAIWAN_PROVINCE;
  const twClockKind = isTaiwan && moment && !form.unknownTime ? taiwanClockAhead(moment.inputDate) : null;
  const standardClock = (() => {
    const mins = ((clockHour * 60 + clockMinute - 60) % 1440 + 1440) % 1440;
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  })();
  // 日期還沒填完時，時辰預覽先只做經度修正
  const solarPreview = moment?.solar ?? calculateTrueSolarTime({ year: 0, month: 0, day: 0, clockHour, clockMinute, longitude });
  const branch = form.unknownTime ? 0 : (moment?.branch ?? solarPreview.branch);
  const offsetMin = Math.round(solarPreview.totalCorrectionMinutes);
  const shichenInfo = SHICHEN[branch];
  const fmtDate = (g: { year: number; month: number; day: number }) => `${g.year}-${g.month}-${g.day}`;

  const errors = {
    year: !form.year ? '请选择出生年份'
      : y < 1900 || y > 2026 ? '年份范围：1900–2026'
      : '',
    month: !form.month ? '请选择月份' : '',
    day: !form.day ? '请选择日期'
      : !form.year || !form.month || moment ? ''
      : isLunar ? `农历${isLeap ? '闰' : ''}${LUNAR_MONTH_NAMES[m - 1]}没有${LUNAR_DAY_NAMES[d - 1]}`
      : `${m}月没有${d}日`,
  };
  const hasError = Object.values(errors).some(Boolean);

  // ─── 完成度（用於進度條） ────────────────────────────────
  const steps = [
    !!form.year && !!form.month && !!form.day && !errors.year && !errors.month && !errors.day,
    !!form.province && !!form.city,
    form.unknownTime || (!!form.clockHour && !!form.clockMinute),
    true, // 性別有默認值
  ];
  const completedSteps = steps.filter(Boolean).length;

  // ─── Summary chip：全部必填完成後顯示 ───────────────────
  const showSummary = steps[0] && steps[2] && !hasError;
  const summaryText = showSummary
    ? [
        isLunar ? `农历${y}年${isLeap ? '闰' : ''}${LUNAR_MONTH_NAMES[m - 1]}${LUNAR_DAY_NAMES[d - 1]}` : `${y}年${m}月${d}日`,
        form.city || (form.province ? form.province : ''),
        form.unknownTime ? '时辰不详' : `${SHICHEN_NAMES[branch]}时`,
        form.gender === 'male' ? '男' : '女',
      ].filter(Boolean).join(' · ')
    : '';

  const handleProvince = (prov: string) => {
    const provData = PROVINCES.find(p => p.name === prov);
    const firstCity = provData?.cities[0];
    setForm({ ...form, province: prov, city: firstCity?.name || '', longitude: firstCity?.longitude ?? 120 });
  };

  const handleCity = (cityName: string) => {
    const prov = PROVINCES.find(p => p.name === form.province);
    const cityData = prov?.cities.find(c => c.name === cityName);
    setForm({ ...form, city: cityName, longitude: cityData?.longitude ?? 120 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setTouched({ year: true, month: true, day: true });
    if (hasError) return;
    onFormSave?.({ ...form });
    const info = formToBirthInfo({ ...form, isLeapMonth: isLeap }, { lateZishi });
    if (info) onSubmit(info);
  };

  // ─── 樣式變量 ────────────────────────────────────────────
  const bg = isDark ? 'rgba(8,16,40,0.85)' : 'rgba(255,255,255,0.92)';
  const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(200,160,60,0.2)';
  // 暗色模式標籤提亮：從 rgba(74,112,144,1) → rgba(180,200,225,0.9)
  const labelClr = isDark ? 'rgba(180,200,225,0.9)' : 'rgba(120,80,10,0.55)';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,252,240,0.8)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(200,160,60,0.25)';
  // 輸入文字提亮：從 #c8d8f0 → #e8eef8
  const inputClr = isDark ? '#e8eef8' : '#2a1a00';
  const focusBorder = isDark ? 'rgba(212,168,67,0.5)' : 'rgba(180,120,20,0.5)';
  const errorClr = isDark ? '#f87171' : '#dc2626';
  const panelBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,250,235,0.7)';
  const panelBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(200,160,60,0.2)';
  const goldText = isDark ? '#d4a843' : '#7a5008';
  const summaryBg = isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.07)';
  const summaryBorder = isDark ? 'rgba(37,99,235,0.35)' : 'rgba(37,99,235,0.25)';
  const summaryClr = isDark ? 'rgba(147,197,253,0.9)' : 'rgba(37,99,235,0.85)';

  const inputStyle = {
    background: inputBg,
    border: `1px solid ${inputBorder}`,
    color: inputClr,
    borderRadius: '14px',
    padding: '10px 14px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s',
  } as React.CSSProperties;

  const errorInputStyle = { ...inputStyle, borderColor: errorClr };

  function FieldError({ msg }: { msg: string }) {
    return (
      <AnimatePresence>
        {msg && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ color: errorClr, fontSize: '11px', marginTop: '4px' }}
          >
            ✕ {msg}
          </motion.p>
        )}
      </AnimatePresence>
    );
  }

  const showErr = (field: string) => touched[field] || submitAttempted;

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ background: bg, border: `1px solid ${border}`, borderRadius: '24px', padding: '28px', backdropFilter: 'blur(20px)' }}
    >
      {/* 標題 */}
      <h3 style={{ color: goldText, fontSize: '12px', letterSpacing: '0.4em', textAlign: 'center', marginBottom: '20px', fontWeight: 500 }}>
        ── 输入生辰八字 ──
      </h3>

      {/* ── 進度條 ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        {steps.map((done, i) => (
          <motion.div
            key={i}
            animate={{ background: done ? (isDark ? '#d4a843' : '#b07820') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(200,160,60,0.15)') }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, height: '2px', borderRadius: '2px' }}
          />
        ))}
      </div>

      {/* ── 姓名 ── */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: labelClr, marginBottom: '6px', letterSpacing: '0.05em' }}>姓名（可选）</label>
        <input
          type="text"
          placeholder="请输入姓名"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = focusBorder; }}
          onBlur={e => { e.target.style.borderColor = inputBorder; }}
        />
      </div>

      {/* ── 出生日期 ── */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontSize: '11px', color: labelClr, letterSpacing: '0.05em' }}>出生日期（{isLunar ? '农历' : '公历'}）</label>
          <div role="group" aria-label="历法" style={{ display: 'flex', borderRadius: '8px', border: `1px solid ${inputBorder}`, overflow: 'hidden' }}>
            {(['solar', 'lunar'] as const).map(cal => (
              <button
                key={cal}
                type="button"
                aria-pressed={form.calendar === cal}
                onClick={() => setForm({ ...form, calendar: cal, month: '', day: '', isLeapMonth: false })}
                style={{
                  padding: '3px 12px', fontSize: '11px', border: 'none', cursor: 'pointer',
                  background: form.calendar === cal ? focusBorder : 'transparent',
                  color: form.calendar === cal ? '#fff' : labelClr,
                }}
              >
                {cal === 'solar' ? '公历' : '农历'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div>
            <select
              aria-label="出生年份"
              value={form.year}
              onChange={e => { setForm({ ...form, year: e.target.value }); setTouched(t => ({ ...t, year: true })); }}
              style={showErr('year') && errors.year ? errorInputStyle : inputStyle}
              required
            >
              <option value="">年份</option>
              {Array.from({ length: 127 }, (_, i) => 2026 - i).map(yr => (
                <option key={yr} value={String(yr)}>{yr}</option>
              ))}
            </select>
            <FieldError msg={showErr('year') ? errors.year : ''} />
          </div>
          <div>
            <select
              aria-label="出生月份"
              value={form.month}
              onChange={e => { setForm({ ...form, month: e.target.value }); setTouched(t => ({ ...t, month: true })); }}
              style={showErr('month') && errors.month ? errorInputStyle : inputStyle}
              required
            >
              <option value="">月份</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(mo => (
                <option key={mo} value={String(mo)}>{isLunar ? LUNAR_MONTH_NAMES[mo - 1] : `${mo} 月`}</option>
              ))}
            </select>
            <FieldError msg={showErr('month') ? errors.month : ''} />
          </div>
          <div>
            <select
              aria-label="出生日"
              value={form.day}
              onChange={e => { setForm({ ...form, day: e.target.value }); setTouched(t => ({ ...t, day: true })); }}
              style={showErr('day') && errors.day ? errorInputStyle : inputStyle}
              required
            >
              <option value="">日期</option>
              {Array.from({ length: isLunar ? 30 : 31 }, (_, i) => i + 1).map(dy => (
                <option key={dy} value={String(dy)}>{isLunar ? LUNAR_DAY_NAMES[dy - 1] : `${dy} 日`}</option>
              ))}
            </select>
            <FieldError msg={showErr('day') ? errors.day : ''} />
          </div>
        </div>
        {isLunar && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '8px', cursor: leapMonthOfYear && leapMonthOfYear === m ? 'pointer' : 'not-allowed' }}>
            <input
              type="checkbox"
              checked={isLeap}
              disabled={!leapMonthOfYear || leapMonthOfYear !== m}
              onChange={e => setForm({ ...form, isLeapMonth: e.target.checked })}
              style={{ width: '14px', height: '14px' }}
            />
            <span style={{ fontSize: '10px', color: labelClr }}>
              闰月
              {y > 0 && (leapMonthOfYear
                ? `（${y} 年闰${LUNAR_MONTH_NAMES[leapMonthOfYear - 1]}${leapMonthOfYear === m ? '' : '，选该月才可勾选'}）`
                : `（${y} 年没有闰月）`)}
            </span>
          </label>
        )}
        {moment && (isLunar || !sameGregorianDate(moment.inputDate, moment.chartDate)) && (
          <p style={{ fontSize: '10px', color: labelClr, marginTop: '6px', lineHeight: 1.6 }}>
            {isLunar && <>对应公历 {fmtDate(moment.inputDate)}</>}
            {!sameGregorianDate(moment.inputDate, moment.chartDate) && (
              <>{isLunar ? '；' : ''}真太阳时{branch === 0 ? '为晚子时' : '跨日'}，以 {fmtDate(moment.chartDate)} 排盘</>
            )}
          </p>
        )}
      </div>

      {/* ── 出生地點 ── */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: labelClr, marginBottom: '6px', letterSpacing: '0.05em' }}>出生地点（用于真太阳时校正）</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <select
            value={form.province}
            onChange={e => handleProvince(e.target.value)}
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = focusBorder; }}
            onBlur={e => { e.target.style.borderColor = inputBorder; }}
          >
            <option value="">省份 / 直辖市</option>
            {PROVINCES.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
          <select
            value={form.city}
            onChange={e => handleCity(e.target.value)}
            disabled={!form.province}
            style={{ ...inputStyle, opacity: form.province ? 1 : 0.45 }}
            onFocus={e => { e.target.style.borderColor = focusBorder; }}
            onBlur={e => { e.target.style.borderColor = inputBorder; }}
          >
            <option value="">{form.province ? '城市' : '先选省份'}</option>
            {cityList.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <AnimatePresence mode="wait">
          {form.province ? (
            <motion.p
              key="location-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: '10px', color: isDark ? 'rgba(180,210,235,0.85)' : 'rgba(100,70,10,0.5)', marginTop: '5px' }}
            >
              {form.city || '（请选择城市）'} · 经度 {form.longitude.toFixed(1)}°E · 校正 {offsetMin > 0 ? '+' : ''}{offsetMin} 分钟（经度＋均时差）
            </motion.p>
          ) : (
            <motion.p
              key="location-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: '10px', color: isDark ? 'rgba(165,185,210,0.7)' : 'rgba(140,100,20,0.45)', marginTop: '5px' }}
            >
              * 倪海厦批命用真太阳时，建议填写出生地以自动校正时辰
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── 出生時間 ── */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: labelClr, marginBottom: '6px', letterSpacing: '0.05em' }}>出生时间（{isTaiwan ? '台湾当地钟表时间' : '北京时间'}）</label>
        <div style={{ borderRadius: '14px', padding: '12px', background: panelBg, border: `1px solid ${panelBorder}`, opacity: form.unknownTime ? 0.45 : 1, pointerEvents: form.unknownTime ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <select
              value={form.clockHour}
              onChange={e => setForm({ ...form, clockHour: e.target.value })}
              style={inputStyle}
            >
              {Array.from({ length: 24 }, (_, i) => i).map(h => (
                <option key={h} value={String(h)}>{h.toString().padStart(2, '0')} 时</option>
              ))}
            </select>
            <select
              value={form.clockMinute}
              onChange={e => setForm({ ...form, clockMinute: e.target.value })}
              style={inputStyle}
            >
              {Array.from({ length: 60 }, (_, i) => i).map(min => (
                <option key={min} value={String(min)}>{min.toString().padStart(2, '0')} 分</option>
              ))}
            </select>
          </div>
          {/* 真太陽時結果 */}
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <span style={{ fontSize: '10px', color: isDark ? 'rgba(170,195,220,0.75)' : 'rgba(140,100,20,0.5)' }}>真太阳时 → </span>
            <span style={{ fontSize: '15px', color: goldText, fontWeight: 600, letterSpacing: '0.08em' }}>
              {SHICHEN_NAMES[branch]}时
            </span>
            {shichenInfo && (
              <span style={{ fontSize: '10px', color: isDark ? 'rgba(170,195,220,0.75)' : 'rgba(140,100,20,0.5)', marginLeft: '4px' }}>
                （{shichenInfo.range}）
              </span>
            )}
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.unknownTime}
            onChange={e => setForm({ ...form, unknownTime: e.target.checked })}
            style={{ width: '14px', height: '14px', borderRadius: '4px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '10px', color: isDark ? 'rgba(165,185,210,0.7)' : 'rgba(140,100,20,0.45)' }}>
            不知道出生时间，以子时（23:00–01:00）起盘
          </span>
        </label>
        {twClockKind && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', marginTop: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.dstAdjust !== false}
              onChange={e => setForm({ ...form, dstAdjust: e.target.checked })}
              style={{ width: '14px', height: '14px', marginTop: '1px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '10px', lineHeight: 1.6, color: labelClr }}>
              这天台湾实施{TAIWAN_CLOCK_KIND_LABEL[twClockKind]}，钟表比标准时间快 1 小时。
              填的是当时钟表时间（出生证明多为此）→ 自动减 1 小时，以标准时间 {standardClock} 排盘；
              若已自行换算成标准时间请取消勾选。
            </span>
          </label>
        )}
      </div>

      {/* ── 性別 ── */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: labelClr, marginBottom: '6px', letterSpacing: '0.05em' }}>性别</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {(['male', 'female'] as const).map(g => {
            const active = form.gender === g;
            const isMale = g === 'male';
            const accent = isMale ? '37,99,235' : '225,29,72';
            return (
              <motion.button
                key={g}
                type="button"
                onClick={() => setForm({ ...form, gender: g })}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: `1px solid ${active ? `rgba(${accent},0.6)` : inputBorder}`,
                  background: active ? `rgba(${accent},0.08)` : inputBg,
                  color: active ? `rgba(${accent},0.9)` : (isDark ? 'rgba(190,205,225,0.7)' : 'rgba(100,80,40,0.4)'),
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
              >
                {isMale ? '♂ 男' : '♀ 女'}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── 確認信息 Summary Chip ── */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 12 }}
            exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div style={{
              background: summaryBg,
              border: `1px solid ${summaryBorder}`,
              borderRadius: '12px',
              padding: '9px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '12px', color: summaryClr }}>✓</span>
              <span style={{ fontSize: '11px', color: summaryClr, letterSpacing: '0.03em', flex: 1 }}>
                {summaryText}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 提交按鈕 ── */}
      {!hideSubmit && <motion.button
        type="submit"
        disabled={loading}
        whileHover={loading ? {} : { scale: 1.01 }}
        whileTap={loading ? {} : { scale: 0.98 }}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '16px',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          background: loading
            ? (isDark ? 'rgba(212,168,67,0.15)' : 'rgba(180,120,20,0.15)')
            : (isDark
              ? 'linear-gradient(135deg, rgba(180,130,40,0.9), rgba(240,200,80,0.9))'
              : 'linear-gradient(135deg, #9a6210, #c88020)'),
          color: loading ? (isDark ? 'rgba(212,168,67,0.4)' : 'rgba(120,80,10,0.4)') : (isDark ? '#08080a' : '#fff8e8'),
          boxShadow: loading ? 'none' : (isDark ? '0 4px 20px rgba(212,168,67,0.2)' : '0 4px 16px rgba(140,100,20,0.25)'),
          transition: 'all 0.2s',
        }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}
            />
            紫微起盘中…
          </span>
        ) : '立即起盘 · 解命运密码'}
      </motion.button>}
    </motion.form>
  );
}
