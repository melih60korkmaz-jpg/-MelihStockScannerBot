/** Mülk: kira yerine dükkânı satın al. Değer enflasyonla artar, emlak vergisi öder; istersen sat. */
import { hooks } from './sim';
import { dayOf } from './calendar';
import { D, yaz } from './derin';
import type { Branch, GameState } from './types';

export interface MulkKayit { fiyat: number; fiyatIdx: number; gun: number; eskiKira: number }
export interface Mulk { liste: Record<number, MulkKayit>; satisKar: number; vergi: number }
export interface Res { ok: boolean; m: string }
export const KIRA_CARPAN = 13, VERGI_ORAN = 0.004, ISLEM = 0.03;
export function M(s: GameState): Mulk { return (D(s).mulk ??= { liste: {}, satisKar: 0, vergi: 0 }); }
const F = (s: GameState): number => s.market.fiyat;
export const sahip = (s: GameState, b: Branch): boolean => !!M(s).liste[b.id];
/** Mülkün bugünkü değeri: alış fiyatı × fiyat endeksi değişimi^0,9. */
export function deger(s: GameState, b: Branch): number { const k = M(s).liste[b.id]; return k ? Math.round(k.fiyat * Math.pow(F(s) / k.fiyatIdx, 0.9)) : 0; }
export const toplamDeger = (s: GameState): number => s.subeler.reduce((a, b) => a + deger(s, b), 0);
export function alisFiyati(s: GameState, b: Branch): number { return Math.round(b.kira * 12 * KIRA_CARPAN * (1 + ISLEM) / 1000) * 1000; }
/** Yıllık kira tasarrufu / alış fiyatı. */
export const getiri = (s: GameState, b: Branch): number => (alisFiyati(s, b) ? b.kira * 12 / alisFiyati(s, b) : 0);
export function mulkAl(s: GameState, bid: number): Res {
  const b = s.subeler.find((x) => x.id === bid); if (!b) return { ok: false, m: 'Şube yok.' }; if (sahip(s, b)) return { ok: false, m: 'Bu dükkân zaten senin.' }; if (b.kira <= 0) return { ok: false, m: 'Kira yok; satın alınamaz.' };
  const f = alisFiyati(s, b); if (s.kasa < f) return { ok: false, m: `Satın alma bedeli ${f.toLocaleString('tr-TR')} ₺.` }; s.kasa -= f; s.capexBugun += f; M(s).liste[b.id] = { fiyat: Math.round(f / (1 + ISLEM)), fiyatIdx: F(s), gun: dayOf(s), eskiKira: b.kira }; b.kira = 0;
  yaz(s, b, `Dükkânın sahibi oldun (${f.toLocaleString('tr-TR')} ₺).`); return { ok: true, m: `${b.ad} dükkânını satın aldın (−${f.toLocaleString('tr-TR')} ₺): artık kira yok, emlak vergisi var.` };
}
export function mulkSat(s: GameState, bid: number): Res {
  const b = s.subeler.find((x) => x.id === bid); if (!b || !sahip(s, b)) return { ok: false, m: 'Bu dükkân sana ait değil.' }; const k = M(s).liste[b.id]!, d = deger(s, b), net = Math.round(d * (1 - ISLEM)), kar = net - k.fiyat;
  s.kasa += net; M(s).satisKar += kar; b.kira = Math.round(k.eskiKira * Math.pow(F(s) / k.fiyatIdx, 0.85) / 500) * 500; delete M(s).liste[b.id]; yaz(s, b, `Dükkân satıldı ve geri kiralandı (net ${net.toLocaleString('tr-TR')} ₺).`);
  return { ok: true, m: `${b.ad} satıldı: +${net.toLocaleString('tr-TR')} ₺ (${kar >= 0 ? 'kâr' : 'zarar'} ${Math.abs(kar).toLocaleString('tr-TR')} ₺). Yeni kira ${b.kira.toLocaleString('tr-TR')} ₺/ay.` };
}
hooks.gunOnce.push((s, toplam) => {
  const m = M(s); for (const id of Object.keys(m.liste)) { const b = s.subeler.find((x) => x.id === +id); if (!b) { delete m.liste[+id]; continue; } const v = deger(s, b) * VERGI_ORAN / 365; toplam.gider.vergi += v; s.kasa -= v; m.vergi += v; }
});
