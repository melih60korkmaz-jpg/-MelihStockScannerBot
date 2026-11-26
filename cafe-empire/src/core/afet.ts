/** Bölgesel afetler ve sigorta: deprem, sel, yangın, fırtına, elektrik kesintisi. Sigorta ve jeneratör hasarı azaltır. */
import { REGION_NAME, cityById } from '../data/turkey';
import { SHOP } from '../data/catalog';
import { hooks, olayIsleyici } from './sim';
import { dateOf, dayOf } from './calendar';
import { rand } from './rng';
import { D, h32, yaz } from './derin';
import type { Branch, GameState } from './types';

export interface AfetKayit { gun: number; tur: string; sube: string; hasar: number; karsilanan: number }
export interface Afet { plan: Record<number, number>; jenerator: Record<number, boolean>; gecmis: AfetKayit[]; son: number; odenenPrim: number; karsilanan: number }
export interface Res { ok: boolean; m: string }
export const PLANLAR = [{ ad: 'Sigortasız', oran: 0, prim: 0, kapsam: 0 }, { ad: 'Temel sigorta', oran: 0.012, prim: 0.012, kapsam: 0.6 }, { ad: 'Kapsamlı sigorta', oran: 0.025, prim: 0.025, kapsam: 0.9 }];
export const TURLER: Record<string, { ad: string; ik: string; hasar: number; kapali: number }> = {
  deprem: { ad: 'Deprem', ik: '🌋', hasar: 0.35, kapali: 7 }, sel: { ad: 'Sel baskını', ik: '🌊', hasar: 0.25, kapali: 5 }, yangin: { ad: 'Yangın', ik: '🔥', hasar: 0.4, kapali: 8 },
  firtina: { ad: 'Şiddetli fırtına', ik: '🌪️', hasar: 0.1, kapali: 2 }, kesinti: { ad: 'Uzun elektrik kesintisi', ik: '🔌', hasar: 0.02, kapali: 2 },
};
export const JENERATOR = 40000;
export function Af(s: GameState): Afet { return (D(s).afet ??= { plan: {}, jenerator: {}, gecmis: [], son: -99, odenenPrim: 0, karsilanan: 0 }); }
const F = (s: GameState): number => s.market.fiyat;
export const varlik = (s: GameState, b: Branch): number => Math.round(SHOP[b.tip].kurulum * 0.55 * F(s));
/** Şehir riski 0–1 (tür bazında). */
export function risk(cityId: number, tur: string): number {
  const c = cityById(cityId), r = c.region, h = (h32(cityId, tur.length) % 20) / 100;
  switch (tur) { case 'deprem': return ({ M: 0.9, E: 0.75, D: 0.8, I: 0.45, A: 0.45, K: 0.4, G: 0.5 } as Record<string, number>)[r]! * 0.8 + h * 0.2; case 'sel': return ({ K: 0.9, A: 0.55, M: 0.45, E: 0.35, I: 0.2, D: 0.3, G: 0.25 } as Record<string, number>)[r]! * 0.8 + h * 0.2; case 'firtina': return (c.kiyi ? 0.7 : 0.3) + h * 0.3;
    case 'kesinti': return ({ D: 0.8, I: 0.5, K: 0.55, G: 0.4, A: 0.35, E: 0.35, M: 0.3 } as Record<string, number>)[r]!; default: return 0.3 + h; }
}
export function planDegistir(s: GameState, bid: number, plan: number): Res { const b = s.subeler.find((x) => x.id === bid); if (!b) return { ok: false, m: 'Şube yok.' }; Af(s).plan[b.id] = Math.max(0, Math.min(2, plan)); return { ok: true, m: `${b.ad}: ${PLANLAR[Af(s).plan[b.id]!]!.ad} (yıllık prim ≈ ${Math.round(varlik(s, b) * PLANLAR[Af(s).plan[b.id]!]!.prim).toLocaleString('tr-TR')} ₺).` }; }
export function jeneratorAl(s: GameState, bid: number): Res { const b = s.subeler.find((x) => x.id === bid); if (!b) return { ok: false, m: 'Şube yok.' }; if (Af(s).jenerator[b.id]) return { ok: false, m: 'Zaten jeneratör var.' }; const c = Math.round(JENERATOR * F(s)); if (s.kasa < c) return { ok: false, m: `Jeneratör ${c.toLocaleString('tr-TR')} ₺.` }; s.kasa -= c; s.capexBugun += c; Af(s).jenerator[b.id] = true; return { ok: true, m: `${b.ad} için yedek jeneratör alındı (−${c.toLocaleString('tr-TR')} ₺).` }; }
const MEVSIM: Record<string, (ay: number) => number> = { sel: (a) => ([9, 10, 11, 0, 1, 2].includes(a) ? 1.4 : 0.6), kesinti: (a) => ([11, 0, 1, 6, 7].includes(a) ? 1.6 : 0.7), firtina: (a) => ([9, 10, 11, 0, 1].includes(a) ? 1.3 : 0.8) };
hooks.gunOnce.push((s, toplam) => {
  const a = Af(s), now = dayOf(s), ay = dateOf(now).ay; if (!s.subeler.length) return;
  for (const b of s.subeler) { const pl = PLANLAR[a.plan[b.id] ?? 0]!; if (pl.prim) { const c = varlik(s, b) * pl.prim / 365; toplam.gider.sigorta += c; s.kasa -= c; a.odenenPrim += c; } }
  if (now < 30 || now - a.son < 20 || s.bekleyen.length >= 3) return;
  for (const b of s.subeler) { if (!b.kuruldu) continue; for (const tur of Object.keys(TURLER)) { const p = (tur === 'yangin' ? 0.00015 : tur === 'deprem' ? 0.00012 : tur === 'sel' ? 0.0005 : tur === 'firtina' ? 0.0006 : 0.001) * risk(b.city, tur) * (MEVSIM[tur]?.(ay) ?? 1); if (rand(s.rng, 'events') < p) { baslat(s, b, tur); return; } } }
});
function baslat(s: GameState, b: Branch, tur: string): void {
  const a = Af(s), t = TURLER[tur]!, pid = s.en++; a.son = dayOf(s); (D(s).bag[pid] = { olay: tur, emp: b.id } as never);
  const kapsam = PLANLAR[a.plan[b.id] ?? 0]!.kapsam, hasar = Math.round(varlik(s, b) * t.hasar * (tur === 'kesinti' && a.jenerator[b.id] ? 0 : 1)), net = Math.round(hasar * (1 - kapsam));
  s.bekleyen.push({ id: pid, tip: 'd_afet', baslik: `${t.ik} ${t.ad}!`, metin: `${b.ad} (${cityById(b.city).ad}, ${REGION_NAME[cityById(b.city).region]}) etkilendi. Tahmini hasar ${hasar.toLocaleString('tr-TR')} ₺; ${kapsam ? `sigorta %${Math.round(kapsam * 100)} karşılıyor, sana ${net.toLocaleString('tr-TR')} ₺ düşüyor.` : 'sigortan yok, tamamı sana ait.'}${tur === 'kesinti' && a.jenerator[b.id] ? ' Jeneratör sayesinde hasar yok.' : ''}`, ikon: t.ik, branch: b.id, secenek: [{ ad: `Acil onarım (${net.toLocaleString('tr-TR')} ₺)`, ac: `${Math.max(1, Math.round(t.kapali * 0.4))} gün kapalı kalır.` }, { ad: `Aşamalı onarım (${Math.round(net * 0.7).toLocaleString('tr-TR')} ₺)`, ac: `${t.kapali} gün kapalı kalır, maliyet %30 düşer.` }] });
}
olayIsleyici.push((s, p, secim) => {
  if (p.tip !== 'd_afet') return null; const d = D(s), c = d.bag[p.id] as { olay?: string; emp?: number } | undefined; delete d.bag[p.id]; const b = s.subeler.find((x) => x.id === c?.emp), tur = c?.olay ?? '', t = TURLER[tur]; if (!b || !t) return ''; const a = Af(s), kapsam = PLANLAR[a.plan[b.id] ?? 0]!.kapsam;
  const brut = Math.round(varlik(s, b) * t.hasar * (tur === 'kesinti' && a.jenerator[b.id] ? 0 : 1)), net = Math.round(brut * (1 - kapsam) * (secim === 1 ? 0.7 : 1)), gun = secim === 1 ? t.kapali : Math.max(1, Math.round(t.kapali * 0.4));
  s.kasa -= net; s.capexBugun += net; a.karsilanan += Math.round(brut * kapsam); a.gecmis.unshift({ gun: dayOf(s), tur: t.ad, sube: b.ad, hasar: brut, karsilanan: Math.round(brut * kapsam) }); if (a.gecmis.length > 20) a.gecmis.length = 20;
  if (brut > 0 || tur !== 'kesinti') d.etki[`b${b.id}:talep:afet`] = { v: 0.05, bit: dayOf(s) + gun }; if (tur === 'kesinti') b.hijyen = Math.max(0, b.hijyen - 0); yaz(s, b, `${t.ad}: hasar ${brut.toLocaleString('tr-TR')} ₺, ${gun} gün kapalı.`);
  return `${t.ad} onarımı: −${net.toLocaleString('tr-TR')} ₺${kapsam && brut ? ` (sigorta ${Math.round(brut * kapsam).toLocaleString('tr-TR')} ₺ karşıladı)` : ''}, ${gun} gün kapalı.`;
});
