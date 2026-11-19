export type Tier = 'low' | 'mid' | 'high';
export const TIER_FPS: Record<Tier, number> = { low: 30, mid: 60, high: 60 };
const ORDER: Tier[] = ['low', 'mid', 'high'];
export interface QualityState { tier: Tier; ceil: Tier; good: number; bad: number; upFails: number; justUp: boolean }
export const newQuality = (tier: Tier): QualityState => ({ tier, ceil: tier, good: 0, bad: 0, upFails: 0, justUp: false });

/**
 * Otomatik kalite politikası (saf, test edilebilir): 2 sn'lik FPS penceresi verilir; kademe değişirse yeni kademeyi döndürür.
 * - FPS < min(40, hedef×0,7) iki pencere üst üste → bir kademe düşer (yükselmeden hemen sonra düşüş "başarısız deneme" sayılır).
 * - FPS ≥ hedef×0,93 beş pencere (10 sn) sürerse ve tavanın altındaysak bir kademe yükselir; 2 başarısız denemeden sonra yükseltme bırakılır.
 */
export function qualityStep(st: QualityState, fps: number): Tier | null {
  const target = TIER_FPS[st.tier], ix = ORDER.indexOf(st.tier);
  if (fps < Math.min(40, target * 0.7)) {
    st.bad++; st.good = 0;
    if (st.bad >= 2 && ix > 0) { if (st.justUp) st.upFails++; st.justUp = false; st.bad = 0; st.tier = ORDER[ix - 1]!; return st.tier; }
    return null;
  }
  st.bad = 0; st.good = fps >= target * 0.93 ? st.good + 1 : 0;
  if (st.good >= 5) { st.good = 0; if (ix < ORDER.indexOf(st.ceil) && st.upFails < 2) { st.justUp = true; st.tier = ORDER[ix + 1]!; return st.tier; } st.justUp = false; }
  return null;
}
