/**
 * lib/ziwei/db-analysis —— 開源佔位版（論斷內容庫不在開源範圍）
 *
 * 線上完整版包含 14 主星 × 13 宮位語境的詳細命理論斷（一句話定調 / 核心論斷 /
 * 命盤依據 / 經典出處），屬於核心內容、不隨排盤引擎開源。此文件僅保留 SEO
 * 知識頁框架所需的「類型 + 宮位/主題標籤」（紫微斗數通用術語，非獨有內容），
 * 論斷內容庫 STAR_DB 置空 —— 因此知識庫詳情頁會生成 0 條靜態路由。
 *
 * 排盤內核（安星算法、四化、格局識別、古籍原文）完全開放，
 * 見 lib/ziwei 下的 algorithm.ts / patterns.ts / sihua.ts 等。
 */

export type TopicKey =
  | 'overview' | 'personality' | 'love' | 'career' | 'wealth' | 'health'
  | 'family' | 'children' | 'move' | 'friends' | 'home' | 'spirit' | 'parents';

// iztro zh-CN 宮位名：命宮保留「宮」字，其餘無「宮」字，「交友」在 iztro 裡叫「僕役」
export const TOPIC_PALACE_NAME: Record<TopicKey, string> = {
  overview:    '命宫',
  personality: '命宫',
  love:        '夫妻',
  career:      '官禄',
  wealth:      '财帛',
  health:      '疾厄',
  family:      '兄弟',
  children:    '子女',
  move:        '迁移',
  friends:     '仆役',
  home:        '田宅',
  spirit:      '福德',
  parents:     '父母',
};

export const TOPIC_LABEL: Record<TopicKey, string> = {
  overview:    '命格总览',
  personality: '性格特质',
  love:        '感情婚姻',
  career:      '事业职业',
  wealth:      '财富运势',
  health:      '健康状况',
  family:      '兄弟合伙',
  children:    '子女缘分',
  move:        '迁移外出',
  friends:     '人际贵人',
  home:        '田宅不动产',
  spirit:      '精神福德',
  parents:     '父母长辈',
};

/**
 * 論斷內容庫（14 主星 × 各宮位語境的詳細斷語）——核心內容，不在開源範圍。
 * 此處置空；知識庫 SEO 頁因 `exists=false` 生成 0 條靜態詳情路由，但列表框架仍可運行。
 */
export const STAR_DB: Record<string, unknown> = {};
