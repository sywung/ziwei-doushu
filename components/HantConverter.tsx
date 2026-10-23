'use client';
import { useEffect } from 'react';

/**
 * 把畫面上的簡體字轉成台灣正體（顯示層轉換，見 lib/i18n/hant.ts）
 *
 * 在 hydration 之後才開始轉（useEffect），避免與服務端 HTML 不一致；
 * 之後 React 更新的文字由 MutationObserver 接手再轉一次。
 * 轉換表約 1 MB，動態載入，不擋首屏。
 */
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);
// 只含 ASCII 的文字不必轉
const HAS_CJK = /[㐀-鿿]/;

export default function HantConverter() {
  useEffect(() => {
    let observer: MutationObserver | null = null;
    let cancelled = false;

    import('@/lib/i18n/hant').then(({ toHant }) => {
      if (cancelled) return;

      const convertText = (node: Text) => {
        const parent = node.parentElement;
        const value = node.nodeValue;
        if (!value || !parent || SKIP_TAGS.has(parent.tagName) || !HAS_CJK.test(value)) return;
        const converted = toHant(value);
        if (converted !== value) node.nodeValue = converted;
      };

      const convertAttrs = (el: Element) => {
        for (const attr of ATTRS) {
          const value = el.getAttribute(attr);
          if (!value || !HAS_CJK.test(value)) continue;
          const converted = toHant(value);
          if (converted !== value) el.setAttribute(attr, converted);
        }
      };

      const convertTree = (root: Node) => {
        if (root.nodeType === Node.TEXT_NODE) return convertText(root as Text);
        if (root.nodeType !== Node.ELEMENT_NODE) return;
        const el = root as Element;
        if (SKIP_TAGS.has(el.tagName)) return;
        convertAttrs(el);
        el.querySelectorAll(ATTRS.map(a => `[${a}]`).join(',')).forEach(convertAttrs);
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) convertText(n as Text);
      };

      const convertTitle = () => {
        const converted = toHant(document.title);
        if (converted !== document.title) document.title = converted;
      };

      convertTree(document.body);
      convertTitle();

      // 我們自己改寫 nodeValue / 屬性也會觸發回調；轉換後的字串再轉一次結果不變，不會無限循環
      observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          const inHead = document.head.contains(m.target);
          if (inHead) convertTitle(); // 換頁時 Next.js 會改 <title>
          else if (m.type === 'characterData') convertText(m.target as Text);
          else if (m.type === 'attributes') convertAttrs(m.target as Element);
          else m.addedNodes.forEach(convertTree);
        }
      });
      observer.observe(document.body, {
        subtree: true, childList: true, characterData: true,
        attributes: true, attributeFilter: [...ATTRS],
      });
      observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    }).catch(err => console.error('[HantConverter] failed to load converter', err));

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  return null;
}
