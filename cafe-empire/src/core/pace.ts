/** Oyun hızı: bir oyun gününün gerçek saniye karşılığı (1× hızda). */
export const GUN_SN = [{ k: 90, ad: 'Hızlı' }, { k: 180, ad: 'Normal' }, { k: 300, ad: 'Yavaş' }] as const;
export const VARSAYILAN_GUN_SN = 180;
export const GUN_DAKIKA = 1440;
/** Gerçek `dt` saniyede ilerleyecek oyun dakikası. */
export const oyunDakikasi = (dt: number, hiz: number, gunSn: number): number => (hiz * GUN_DAKIKA / Math.max(30, gunSn)) * dt;
