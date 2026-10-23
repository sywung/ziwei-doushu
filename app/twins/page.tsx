/**
 * 命理學雙子：同一張本命盤在各地的出生時刻表，以及 1950–2026 年裡配置相同的盤
 */
import Link from 'next/link';
import TwinsFinder from './TwinsFinder';

export const metadata = {
  title: '命理学双子 · 同盘时刻表与同构命盘',
  description: '同年月日、同真太阳时辰、同性别即同一张本命盘。查各地几点出生会和你同盘，并在 1950–2026 年全部出生时刻里找配置相同的盘。',
};

export default function TwinsPage() {
  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <header
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(184,146,42,0.15)' }}
      >
        <Link href="/" style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.3em', textDecoration: 'none' }}>
          ← 返回首页
        </Link>
        <div style={{ fontSize: '12px', color: 'var(--tx-3)', letterSpacing: '0.3em' }}>命理学双子</div>
        <Link href="/chart" style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.2em', textDecoration: 'none' }}>
          起盘 →
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, color: 'var(--tx-0)', letterSpacing: '0.12em' }}>
          命理学双子
        </h1>
        <p className="mt-2 mb-6" style={{ fontSize: '13px', color: 'var(--tx-2)', lineHeight: 1.7, maxWidth: 680 }}>
          同年月日、同真太阳时辰、同性别的人，本命盘完全一样。填生辰后可看到：各地要在钟表几点出生才会和你同盘，
          以及 1950–2026 年每一个出生时刻里，星曜配置和你相同的盘（同一农历年的「同年同构」与跨年代的「跨年同构」）。
        </p>
        <TwinsFinder />
        <footer className="mt-10 text-[11px] leading-relaxed" style={{ color: 'var(--tx-3)', maxWidth: 680 }}>
          配对只看排盘日、真太阳时辰与性别；出生地只用来把钟表时间换成真太阳时（经度＋均时差），本身不参与配对。
          时刻表是换算出来的出生时间窗，不是真人纪录。配置相同指星曜落宫相同，13 维解读另参考五行局、身宫、杂曜等，不一定相同。
        </footer>
      </main>
    </div>
  );
}
