'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  SANJI_CORPORA, bilibiliEmbedUrl, bilibiliPageUrl,
  type SanjiBook, type SanjiCorpus, type SanjiEntry, type SanjiQueryResult,
} from '@/lib/sanji/books';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const FAVS_STORAGE_KEY = 'sanji-favs';

/** 收藏只存在这个浏览器（localStorage 可能被挡，失败就当没有收藏） */
function loadFavs(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVS_STORAGE_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
function saveFavs(favs: Set<string>) {
  try {
    localStorage.setItem(FAVS_STORAGE_KEY, JSON.stringify([...favs]));
  } catch { /* 存不了就只在本次有效 */ }
}

const favKey = (corpus: SanjiCorpus, id: number) => `${corpus}:${id}`;

type ListState =
  | { status: 'loading' }
  | { status: 'ok'; result: SanjiQueryResult }
  | { status: 'error' };

export default function SanjiBrowser() {
  const [corpus, setCorpus] = useState<SanjiCorpus>('tianji');
  const [books, setBooks] = useState<SanjiBook[]>([]);
  const [book, setBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [offset, setOffset] = useState(0);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [favOnly, setFavOnly] = useState(false);
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [playing, setPlaying] = useState<SanjiEntry | null>(null);

  useEffect(() => { setFavs(loadFavs()); }, []);

  // 换语料：重载书册、清掉筛选
  useEffect(() => {
    let cancelled = false;
    setBooks([]); setBook(''); setChapter(''); setOffset(0);
    fetch(`/api/sanji?corpus=${corpus}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { books: SanjiBook[] }) => { if (!cancelled) setBooks(data.books); })
      .catch(err => console.error('[SanjiBrowser] books failed', err));
    return () => { cancelled = true; };
  }, [corpus]);

  // 关键字去抖
  useEffect(() => {
    const timer = setTimeout(() => { setKeyword(keywordInput.trim()); setOffset(0); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const favIds = useMemo(
    () => [...favs].filter(k => k.startsWith(`${corpus}:`)).map(k => Number(k.split(':')[1])),
    [favs, corpus],
  );

  // 判语列表
  useEffect(() => {
    if (favOnly && favIds.length === 0) {
      setList({ status: 'ok', result: { total: 0, offset: 0, entries: [] } });
      return;
    }
    let cancelled = false;
    const p = new URLSearchParams({ corpus, entries: '1', offset: String(offset), limit: String(PAGE_SIZE) });
    if (book) p.set('book', book);
    if (chapter) p.set('chapter', chapter);
    if (keyword) p.set('q', keyword);
    if (favOnly) p.set('ids', favIds.join(','));
    setList({ status: 'loading' });
    fetch(`/api/sanji?${p}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((result: SanjiQueryResult) => { if (!cancelled) setList({ status: 'ok', result }); })
      .catch(err => {
        console.error('[SanjiBrowser] entries failed', err);
        if (!cancelled) setList({ status: 'error' });
      });
    return () => { cancelled = true; };
  }, [corpus, book, chapter, keyword, offset, favOnly, favIds]);

  const toggleFav = (id: number) => {
    setFavs(prev => {
      const next = new Set(prev);
      const k = favKey(corpus, id);
      if (next.has(k)) next.delete(k); else next.add(k);
      saveFavs(next);
      return next;
    });
  };

  const chapters = books.find(b => b.id === book)?.chapters ?? [];
  const result = list.status === 'ok' ? list.result : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] items-start">
      {/* ── 左：筛选 + 判语列表 ── */}
      <section aria-label="判语列表">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {SANJI_CORPORA.map(c => (
            <FilterChip key={c.id} active={corpus === c.id} onClick={() => setCorpus(c.id)}>{c.title}</FilterChip>
          ))}
          <span className="mx-1 h-4 w-px" style={{ background: 'var(--tx-3)', opacity: 0.3 }} />
          <FilterChip active={favOnly} onClick={() => { setFavOnly(v => !v); setOffset(0); }}>
            ★ 只看收藏（{favIds.length}）
          </FilterChip>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <FilterChip small active={book === ''} onClick={() => { setBook(''); setChapter(''); setOffset(0); }}>全部</FilterChip>
          {books.map(b => (
            <FilterChip key={b.id} small active={book === b.id} onClick={() => { setBook(b.id); setChapter(''); setOffset(0); }}>
              {b.title}<span className="ml-1 opacity-50 tabular-nums">{b.count}</span>
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {chapters.length > 0 && (
            <select
              aria-label="章目"
              value={chapter}
              onChange={e => { setChapter(e.target.value); setOffset(0); }}
              className="rounded-lg px-2 py-1.5 text-[12px] max-w-[16rem]"
              style={{ background: 'var(--bg-card, transparent)', border: '1px solid rgba(184,146,42,0.25)', color: 'var(--tx-1)' }}
            >
              <option value="">全部章目</option>
              {chapters.map(c => <option key={c.name} value={c.name}>{c.name}（{c.count}）</option>)}
            </select>
          )}
          <input
            type="search"
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            placeholder="搜寻原话或章目，如：化忌、桂枝"
            aria-label="搜寻判语"
            className="flex-1 min-w-[12rem] rounded-lg px-3 py-1.5 text-[12px]"
            style={{ background: 'var(--bg-card, transparent)', border: '1px solid rgba(184,146,42,0.25)', color: 'var(--tx-0)' }}
          />
        </div>

        {list.status === 'loading' && <p className="text-[12px] animate-pulse" style={{ color: 'var(--tx-3)' }}>载入中…</p>}
        {list.status === 'error' && <p className="text-[12px] text-red-400">判语读取失败，请稍后再试。</p>}
        {result && (
          <>
            <p className="text-[11px] mb-2" style={{ color: 'var(--tx-3)' }}>
              共 {result.total.toLocaleString()} 条
              {result.total > 0 && `，第 ${result.offset + 1}–${result.offset + result.entries.length} 条`}
            </p>
            <ol className="space-y-1.5">
              {result.entries.map(e => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  active={playing?.id === e.id && playing.bvid === e.bvid}
                  bookTitle={books.find(b => b.id === e.book)?.title ?? e.book}
                  fav={favs.has(favKey(corpus, e.id))}
                  onPlay={() => setPlaying(e)}
                  onToggleFav={() => toggleFav(e.id)}
                />
              ))}
            </ol>
            {result.total > PAGE_SIZE && (
              <nav aria-label="分页" className="flex items-center justify-center gap-3 mt-4 text-[12px]">
                <PageButton disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>‹ 上一页</PageButton>
                <span className="tabular-nums" style={{ color: 'var(--tx-3)' }}>
                  {Math.floor(offset / PAGE_SIZE) + 1} / {Math.ceil(result.total / PAGE_SIZE)}
                </span>
                <PageButton disabled={offset + PAGE_SIZE >= result.total} onClick={() => setOffset(offset + PAGE_SIZE)}>下一页 ›</PageButton>
              </nav>
            )}
          </>
        )}
      </section>

      {/* ── 右：播放器 ── */}
      <aside aria-label="视频播放" className="lg:sticky lg:top-4">
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(184,146,42,0.2)', background: 'rgba(0,0,0,0.25)' }}
        >
          <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
            {playing ? (
              <iframe
                key={`${playing.bvid}-${playing.part}-${playing.sec}`}
                src={bilibiliEmbedUrl(playing)}
                title="倪师原视频"
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[12px]" style={{ color: 'var(--tx-3)' }}>
                点左边任一句判语开始播放
              </div>
            )}
          </div>
          {playing && (
            <div className="p-4 space-y-2">
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--tx-0)' }}>「{playing.quote}」</p>
              <p className="text-[11px]" style={{ color: 'var(--tx-3)' }}>
                {playing.h2}{playing.h3 && ` · ${playing.h3}`} · P{playing.part} @{playing.t}
              </p>
              {playing.note && <p className="text-[11px]" style={{ color: 'var(--tx-3)' }}>考据：{playing.note}</p>}
              <a
                href={bilibiliPageUrl(playing)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[11px]"
                style={{ color: 'var(--ac)' }}
              >
                在 bilibili 开启 ↗
              </a>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function EntryRow({ entry, active, bookTitle, fav, onPlay, onToggleFav }: {
  entry: SanjiEntry; active: boolean; bookTitle: string; fav: boolean;
  onPlay: () => void; onToggleFav: () => void;
}) {
  return (
    <li
      className="group flex gap-2 rounded-lg px-3 py-2 transition-colors"
      style={{
        background: active ? 'rgba(184,146,42,0.12)' : 'transparent',
        border: `1px solid ${active ? 'rgba(184,146,42,0.35)' : 'rgba(184,146,42,0.08)'}`,
      }}
    >
      <button type="button" onClick={onPlay} className="flex-1 text-left">
        <span className="block text-[13px] leading-relaxed" style={{ color: 'var(--tx-0)' }}>{entry.quote}</span>
        <span className="block mt-0.5 text-[11px]" style={{ color: 'var(--tx-3)' }}>
          {bookTitle} · {entry.h2}{entry.h3 && ` · ${entry.h3}`}
          <span className="ml-2 font-mono tabular-nums" style={{ color: 'var(--ac)' }}>▶ {entry.t}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleFav}
        aria-label={fav ? '取消收藏' : '收藏'}
        aria-pressed={fav}
        className="self-start text-[16px] leading-none px-1 transition-opacity"
        style={{ color: fav ? 'var(--ac)' : 'var(--tx-3)', opacity: fav ? 1 : 0.5 }}
      >
        {fav ? '★' : '☆'}
      </button>
    </li>
  );
}

function FilterChip({ active, small, onClick, children }: {
  active: boolean; small?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full transition-colors ${small ? 'px-2.5 py-0.5 text-[11px]' : 'px-3.5 py-1 text-[12px] font-medium'}`}
      style={{
        background: active ? 'rgba(184,146,42,0.15)' : 'transparent',
        border: `1px solid ${active ? 'rgba(184,146,42,0.5)' : 'rgba(184,146,42,0.2)'}`,
        color: active ? 'var(--ac)' : 'var(--tx-2)',
      }}
    >
      {children}
    </button>
  );
}

function PageButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-3 py-1 rounded-lg disabled:opacity-30"
      style={{ border: '1px solid rgba(184,146,42,0.25)', color: 'var(--ac)' }}
    >
      {children}
    </button>
  );
}
