/**
 * 古籍原典查詢庫 — 類型定義
 *
 * 設計：所有古籍以 JSON 靜態數據打包到代碼（公版無版權風險）
 * Next.js 啟動時一次性加載到內存，零 DB 依賴
 */

export interface Paragraph {
  /** 段落唯一 id（用於錨點跳轉） */
  id: string;
  /** 段落序號（章節內） */
  idx: number;
  /** 段落原文（古文） */
  text: string;
  /** 現代翻譯（可選，未來填充） */
  translation?: string;
  /** 倪師註解（可選，標註來源） */
  niNote?: string;
}

export interface Chapter {
  /** 章節標題（如"卷一"、"總論篇"）*/
  title: string;
  /** 章節副標題/簡介（可選）*/
  subtitle?: string;
  paragraphs: Paragraph[];
}

export interface Book {
  /** 書名 */
  title: string;
  /** 書 slug（URL 用，如 'guisuifu'）*/
  slug: string;
  /** 朝代 */
  dynasty: string;
  /** 作者（多人或不詳時填"不詳"或多人）*/
  author: string;
  /** 簡介 */
  intro: string;
  /** 總字數（粗略）*/
  wordCount: number;
  chapters: Chapter[];
}

export interface SearchHit {
  bookSlug: string;
  bookTitle: string;
  chapterTitle: string;
  paragraphId: string;
  /** 高亮片段（含 <mark> 標籤） */
  snippet: string;
  /** 原文 */
  text: string;
}
