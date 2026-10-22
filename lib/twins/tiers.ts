/** 命理学双子的比对层级（客户端、服务端共用；签名计算在 signature.ts，仅服务端） */
export type TwinTier = 'main' | 'sihua' | 'full';
export const TWIN_TIERS: TwinTier[] = ['main', 'sihua', 'full'];

export const TWIN_TIER_LABEL: Record<TwinTier, string> = {
  main: '主星格局相同',
  sihua: '主星＋四化相同',
  full: '全盘相同（含六吉六煞）',
};
