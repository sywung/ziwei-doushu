/** 命理學雙子的比對層級（客戶端、服務端共用；簽名計算在 signature.ts，僅服務端） */
export type TwinTier = 'main' | 'sihua' | 'full';
export const TWIN_TIERS: TwinTier[] = ['main', 'sihua', 'full'];

export const TWIN_TIER_LABEL: Record<TwinTier, string> = {
  main: '主星格局相同',
  sihua: '主星＋四化相同',
  full: '全盘相同（含六吉六煞）',
};
