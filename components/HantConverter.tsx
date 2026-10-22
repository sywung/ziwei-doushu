'use client';
import { useEffect } from 'react';

/**
 * 把画面上的简体字转成台湾正体（显示层转换，见 lib/i18n/hant.ts）
 *
 * 在 hydration 之后才开始转（useEffect），避免与服务端 HTML 不一致；
 * 之后 React 更新的文字由 MutationObserver 接手再转一次。
 * 转换表约 1 MB，动态载入，不挡首屏。
 */
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);
// 只含 ASCII 的文字不必转
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

      // 我们自己改写 nodeValue / 属性也会触发回调；转换后的字串再转一次结果不变，不会无限循环
      observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          const inHead = document.head.contains(m.target);
          if (inHead) convertTitle(); // 换页时 Next.js 会改 <title>
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
