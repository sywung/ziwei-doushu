/**
 * 站点根地址。部署时在 .env.local 里配置 NEXT_PUBLIC_SITE_URL（见 .env.example）；
 * 未配置时用本机开发地址，避免 fork 部署后把 sitemap、canonical 指向别人的域名。
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** 只取域名部分，用于界面上展示（如分享卡底部） */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

/**
 * 赞助连结（页尾「赞助本站」）。预设为本 fork 维护者的绿界赞助页；
 * 自架者可用 NEXT_PUBLIC_DONATE_URL 换成自己的，设成空字串则不显示。
 */
export const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL ?? 'https://donate.twater.cc/r/ziwei';
