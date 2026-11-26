/** Sürdürülebilirlik: programlar yeşil skoru artırır; skor talebi ve itibarı yükseltir, fireyi ve elektriği azaltır. */
import { carpan, hooks } from './sim';
import { D, yaz } from './derin';
import type { GameState } from './types';

export interface Surd { prog: Record<string, boolean>; sertifika: boolean; tasarruf: number }
export interface Res { ok: boolean; m: string }
export interface Program { id: string; ad: string; ik: string; ac: string; kur: number; gun: number; skor: number }
export const PROGRAMLAR: Program[] = [
  { id: 'geri', ad: 'Geri dönüşüm ve kompost', ik: '♻️', ac: 'Fire (bozulma) gideri −%10.', kur: 8000, gun: 100, skor: 20 },
  { id: 'fincan', ad: 'Kendi fincanını getir indirimi', ik: '🥤', ac: 'Bardak maliyeti düşer, yeşil müşteri artar.', kur: 3000, gun: 0, skor: 15 },
  { id: 'yerel', ad: 'Yerel ve adil ticaret tedarik', ik: '🌾', ac: 'Malzeme maliyeti +%2 ama kalite +%1 ve itibar.', kur: 0, gun: 0, skor: 20 },
  { id: 'gunes', ad: 'Güneş paneli', ik: '☀️', ac: 'Elektrik gideri −%25 (şube başı yatırım).', kur: 90000, gun: 0, skor: 25 },
  { id: 'sifir', ad: 'Sıfır atık sertifikası', ik: '🏅', ac: 'Dört programı tamamlayınca alınır: talep +%4, itibar +.', kur: 30000, gun: 150, skor: 20 },
];
export function Sr(s: GameState): Surd { return (D(s).surd ??= { prog: {}, sertifika: false, tasarruf: 0 }); }
const F = (s: GameState): number => s.market.fiyat;
export const skor = (s: GameState): number => PROGRAMLAR.reduce((a, p) => a + (Sr(s).prog[p.id] ? p.skor : 0), 0);
export function programKur(s: GameState, id: string): Res {
  const p = PROGRAMLAR.find((x) => x.id === id), k = Sr(s); if (!p) return { ok: false, m: 'Program yok.' }; if (!s.subeler.length) return { ok: false, m: 'Önce bir şube aç.' };
  if (k.prog[id]) { k.prog[id] = false; if (id === 'sifir') k.sertifika = false; return { ok: true, m: `${p.ad} bırakıldı.` }; }
  if (id === 'sifir' && !['geri', 'fincan', 'yerel', 'gunes'].every((x) => k.prog[x])) return { ok: false, m: 'Önce diğer dört programı tamamla.' }; if (id === 'sifir' && s.subeler.length < 3) return { ok: false, m: 'Sertifika için en az 3 şube gerekir.' };
  const b = Math.round(p.kur * F(s) * (id === 'sifir' ? 1 : s.subeler.length)); if (s.kasa < b) return { ok: false, m: `Yatırım için ${b.toLocaleString('tr-TR')} ₺ gerekir.` }; s.kasa -= b; s.capexBugun += b; k.prog[id] = true; if (id === 'sifir') { k.sertifika = true; yaz(s, undefined, 'Sıfır Atık sertifikası alındı.'); }
  return { ok: true, m: `${p.ad} başladı (−${b.toLocaleString('tr-TR')} ₺). Yeşil skor ${skor(s)}.` };
}
carpan.talep.push((s) => { const k = D(s).surd; if (!k) return 1; return 1 + 0.06 * skor(s) / 100 + (k.sertifika ? 0.04 : 0) + (k.prog.fincan ? 0.005 : 0); });
hooks.gunOnce.push((s, toplam) => {
  const k = Sr(s); if (!Object.values(k.prog).some(Boolean) || !s.subeler.length) return; const n = s.subeler.length;
  for (const p of PROGRAMLAR) if (k.prog[p.id] && p.gun) { const c = p.gun * F(s) * (p.id === 'sifir' ? 1 : n); toplam.gider.bakim += c; s.kasa -= c; }
  if (k.prog.geri) { const t = toplam.gider.fire * 0.1; toplam.gider.fire -= t; k.tasarruf += t; }
  if (k.prog.fincan) { const t = toplam.gider.malzeme * 0.008; toplam.gider.malzeme -= t; k.tasarruf += t; }
  if (k.prog.yerel) { const c = toplam.gider.malzeme * 0.02; toplam.gider.malzeme += c; s.kasa -= c; }
  if (k.prog.gunes) { const t = toplam.gider.elektrik * 0.25; toplam.gider.elektrik -= t; s.kasa += t; k.tasarruf += t; }
  if (skor(s) >= 50) for (const b of s.subeler) b.marka = Math.min(100, b.marka + 0.02 + (k.sertifika ? 0.01 : 0));
});
