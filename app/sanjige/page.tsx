/**
 * 三紀 · 字幕導播：倪師判語逐句對照 B 站原視頻
 */
import Link from 'next/link';
import SanjiBrowser from './SanjiBrowser';

export const metadata = {
  title: '三纪 · 字幕导播 · 倪海厦天纪人纪判语逐句回放',
  description: '倪海厦《天纪》4,886 条、《人纪》19,294 条判语，按书册检索，点句直达 B 站原视频那一秒。',
};

export default function SanjigePage() {
  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <header
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(184,146,42,0.15)' }}
      >
        <Link href="/" style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.3em', textDecoration: 'none' }}>
          ← 返回首页
        </Link>
        <div style={{ fontSize: '12px', color: 'var(--tx-3)', letterSpacing: '0.3em' }}>三纪 · 字幕导播</div>
        <Link href="/chart" style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.2em', textDecoration: 'none' }}>
          起盘 →
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, color: 'var(--tx-0)', letterSpacing: '0.12em' }}>
          三纪 · 字幕导播
        </h1>
        <p className="mt-2 mb-6" style={{ fontSize: '13px', color: 'var(--tx-2)', lineHeight: 1.7 }}>
          倪海厦先生《天纪》《人纪》的判语逐句对照原视频：选书册或搜关键字，点一句就从那一秒开始播放。地纪尚无语料。
        </p>
        <SanjiBrowser />
        <footer className="mt-10 text-[11px] leading-relaxed" style={{ color: 'var(--tx-3)' }}>
          语料：<a href="https://github.com/Renhuai123/nihai-tianji-corpus" style={{ color: 'var(--ac)' }}>nihai-tianji-corpus</a>、
          <a href="https://github.com/Renhuai123/nihai-renji-corpus" style={{ color: 'var(--ac)' }}>nihai-renji-corpus</a>
          （王多鱼AI 整理），授权 CC BY-NC-SA 4.0，仅供非商业使用。视频版权归原权利人，播放由 bilibili 提供。
        </footer>
      </main>
    </div>
  );
}
