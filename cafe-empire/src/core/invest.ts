/** İşletme geliştirme: ekipman / kapasite / kalite / verimlilik yatırımları. Her yatırımın sim etkisi gerçektir. */
import type { Branch, GameState } from './types';
import { cityById } from '../data/turkey';

export interface InvestDef { id: string; ad: string; ikon: string; max: number; maliyet: number; seviye: number; etki: string; bakim: number }
export const INVESTS: InvestDef[] = [
  { id: 'espresso', ad: 'Profesyonel espresso makinesi', ikon: '☕', max: 3, maliyet: 90000, seviye: 1, bakim: 350, etki: 'Servis kapasitesi +%8, içecek kalitesi +%3 (seviye başına).' },
  { id: 'degirmen', ad: 'Hassas kahve değirmeni', ikon: '⚙️', max: 2, maliyet: 35000, seviye: 1, bakim: 120, etki: 'İçecek kalitesi +%3, çekirdek israfı azalır (seviye başına).' },
  { id: 'soguk', ad: 'Soğutmalı depo ve vitrin', ikon: '🧊', max: 2, maliyet: 55000, seviye: 2, bakim: 400, etki: 'Raf ömrü +%25 (seviye başına): daha az bozulma/fire.' },
  { id: 'pos', ad: 'Hızlı POS ve sipariş sistemi', ikon: '🧾', max: 2, maliyet: 30000, seviye: 1, bakim: 150, etki: 'Servis kapasitesi +%5, bekleme kısalır (seviye başına).' },
  { id: 'mutfak', ad: 'Mutfak ve fırın ekipmanı', ikon: '🍳', max: 3, maliyet: 75000, seviye: 2, bakim: 300, etki: 'Servis kapasitesi +%6, yiyecek kalitesi +%3 (seviye başına).' },
  { id: 'enerji', ad: 'Enerji verimli ekipman', ikon: '🔌', max: 3, maliyet: 60000, seviye: 2, bakim: 0, etki: 'Elektrik gideri −%8 (seviye başına).' },
  { id: 'kurumsal', ad: 'Kurumsal kimlik ve marka programı', ikon: '🏷️', max: 3, maliyet: 80000, seviye: 2, bakim: 0, etki: 'Marka değeri her gün biraz daha artar (seviye başına +0,03/gün).' },
  { id: 'arge', ad: 'Ürün geliştirme (Ar-Ge)', ikon: '🧪', max: 3, maliyet: 70000, seviye: 3, bakim: 0, etki: 'Tüm ürünlerde kalite +%4 (seviye başına).' },
];
export const INVEST: Record<string, InvestDef> = Object.fromEntries(INVESTS.map((i) => [i.id, i]));
export const yl = (b: Branch, id: string): number => b.yat?.[id] ?? 0;
export const capMult = (b: Branch): number => 1 + 0.08 * yl(b, 'espresso') + 0.05 * yl(b, 'pos') + 0.06 * yl(b, 'mutfak');
export const qualMult = (b: Branch): number => 1 + 0.03 * yl(b, 'espresso') + 0.03 * yl(b, 'degirmen') + 0.03 * yl(b, 'mutfak') * 0.5 + 0.04 * yl(b, 'arge');
export const shelfMult = (b: Branch): number => 1 + 0.25 * yl(b, 'soguk');
export const energyMult = (b: Branch): number => 1 - 0.08 * yl(b, 'enerji');
export const brandDaily = (b: Branch): number => 0.03 * yl(b, 'kurumsal');
export const wasteMult = (b: Branch): number => 1 - 0.05 * yl(b, 'degirmen');
/** Aylık yatırım bakım gideri (günlük). */
export const maintenanceDaily = (b: Branch): number => INVESTS.reduce((a, d) => a + d.bakim * yl(b, d.id), 0) / 30;
export function investCost(s: GameState, b: Branch, id: string): number { const d = INVEST[id]!, c = cityById(b.city); return Math.round(d.maliyet * Math.pow(1.7, yl(b, id)) * (0.9 + 0.2 * c.maliyet) * s.market.fiyat / 500) * 500; }
export function buyInvest(s: GameState, b: Branch, id: string, seviyeNow: number): { ok: boolean; m: string } {
  const d = INVEST[id]; if (!d) return { ok: false, m: 'Yatırım yok.' }; if (yl(b, id) >= d.max) return { ok: false, m: 'Zaten en üst seviye.' }; if (seviyeNow < d.seviye) return { ok: false, m: `Kafe seviyesi ${d.seviye} gerekir.` };
  const cost = investCost(s, b, id); if (s.kasa < cost) return { ok: false, m: 'Kasa yetersiz.' };
  s.kasa -= cost; s.capexBugun += cost; b.yat = { ...(b.yat ?? {}), [id]: yl(b, id) + 1 }; return { ok: true, m: `${d.ad} seviye ${yl(b, id)} yapıldı (−${Math.round(cost)} ₺).` };
}
