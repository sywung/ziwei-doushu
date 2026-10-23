/**
 * 站點根地址。部署時在 .env.local 裡配置 NEXT_PUBLIC_SITE_URL（見 .env.example）；
 * 未配置時用本機開發地址，避免 fork 部署後把 sitemap、canonical 指向別人的域名。
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** 只取域名部分，用於界面上展示（如分享卡底部） */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

/**
 * 贊助連結（頁尾「贊助本站」）。預設為本 fork 維護者的綠界贊助頁；
 * 自架者可用 NEXT_PUBLIC_DONATE_URL 換成自己的，設成空字串則不顯示。
 */
export const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL ?? 'https://donate.twater.cc/r/ziwei';
