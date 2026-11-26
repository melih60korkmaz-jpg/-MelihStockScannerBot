/** Bölge açma: iller ve ilçeler parayla, seviye ve komşuluk kurallarıyla, zamanla açılır. */
import { cityById, CITIES } from '../data/turkey';
import { IL_KOMSU, ILCELER, ilcelerOf, ilceKey, ilceOf, profilOf, NEUTRAL, type Ilce, type IlceProfil } from '../data/regions';
import type { Branch, GameState } from './types';
import { dayOf } from './calendar';

export interface RRes { ok: boolean; m: string }
const ok = (m: string): RRes => ({ ok: true, m }), no = (m: string): RRes => ({ ok: false, m });
export const fmtTL = (v: number): string => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2).replace('.', ',') + ' M ₺' : Math.abs(v) >= 1e3 ? Math.round(v / 1e3).toLocaleString('tr-TR') + ' B ₺' : Math.round(v) + ' ₺');
export const START_IL = 34;

export const ilAcik = (s: GameState, il: number): boolean => s.bolge.il[il] !== undefined;
export const ilceAcik = (s: GameState, d: Ilce): boolean => s.bolge.ilce[ilceKey(d)] !== undefined;
/** İl pazarına giriş bedeli: nüfus ve gelir düzeyine göre. */
export function ilCost(s: GameState, il: number): number { const c = cityById(il); return Math.round((100000 + c.nufus * 180) * (0.8 + 0.4 * c.gelir) * s.market.fiyat / 5000) * 5000; }
/** Yeni il için gereken kafe seviyesi (büyük şehirler daha ileride). */
export const ilLevel = (il: number): number => { const n = cityById(il).nufus; return n < 600 ? 2 : n < 2500 ? 3 : 4; };
/** Sınırdaşı olan açık il var mı? Ulusal zincir (seviye 5+) sınır şartından muaf. */
export const komsuAcik = (s: GameState, il: number): boolean => (IL_KOMSU[il] ?? []).some((k) => ilAcik(s, k));
export type Durum = { d: 'acik' } | { d: 'satilik'; bedel: number } | { d: 'kilitli'; neden: string; bedel: number };
export function ilDurum(s: GameState, il: number, lv: number): Durum {
  if (ilAcik(s, il)) return { d: 'acik' }; const bedel = ilCost(s, il), need = ilLevel(il);
  if (lv < need) return { d: 'kilitli', neden: `Kafe seviyesi ${need} gerekir`, bedel };
  if (lv < 5 && !komsuAcik(s, il)) return { d: 'kilitli', neden: 'Önce komşu bir ilin pazarını aç (seviye 5\'te sınır şartı kalkar)', bedel };
  return { d: 'satilik', bedel };
}
export function ilAc(s: GameState, il: number, lv: number): RRes {
  const st = ilDurum(s, il, lv); if (st.d === 'acik') return no('Bu il zaten açık.'); if (st.d === 'kilitli') return no(st.neden + '.'); if (s.kasa < st.bedel + 50000) return no(`Kasa yetersiz (${fmtTL(st.bedel + 50000)} gerekir).`);
  s.kasa -= st.bedel; s.capexBugun += st.bedel; s.bolge.il[il] = dayOf(s); s.log.unshift(`${cityById(il).ad} pazarı açıldı.`); return ok(`${cityById(il).ad} pazarı açıldı (−${fmtTL(st.bedel)}). Şimdi bir ilçe aç.`);
}
/** İlçe bedeli: ilin toplam pazar bedelinin, ilçenin ticari ağırlığına göre payı. */
export function ilceWeight(d: Ilce): number { const p = profilOf(d); return p.talep * Math.sqrt(p.gelir); }
export function ilceCost(s: GameState, d: Ilce): number { const L = ilcelerOf(d.il), tot = L.reduce((a, x) => a + ilceWeight(x), 0); return Math.max(20000, Math.round(ilCost(s, d.il) * ilceWeight(d) / tot / 1000) * 1000); }
export function ilceDurum(s: GameState, d: Ilce): Durum {
  if (ilceAcik(s, d)) return { d: 'acik' }; const bedel = ilceCost(s, d);
  if (!ilAcik(s, d.il)) return { d: 'kilitli', neden: `Önce ${cityById(d.il).ad} pazarını aç`, bedel };
  const sahip = ilcelerOf(d.il).some((x) => ilceAcik(s, x)); if (sahip && !d.komsu.some((k) => ilceAcik(s, ILCELER[k]!))) return { d: 'kilitli', neden: 'Önce sınırdaş bir ilçeni aç', bedel };
  return { d: 'satilik', bedel };
}
export function ilceAc(s: GameState, d: Ilce): RRes {
  const st = ilceDurum(s, d); if (st.d === 'acik') return no('Bu ilçe zaten açık.'); if (st.d === 'kilitli') return no(st.neden + '.'); if (s.kasa < st.bedel) return no(`Kasa yetersiz (${fmtTL(st.bedel)}).`);
  s.kasa -= st.bedel; s.capexBugun += st.bedel; s.bolge.ilce[ilceKey(d)] = dayOf(s); s.log.unshift(`${d.ad} ilçesi açıldı.`); return ok(`${d.ad} ilçesi açıldı (−${fmtTL(st.bedel)}). Burada şube açabilirsin.`);
}
export const enIyiIlce = (il: number): Ilce | undefined => [...ilcelerOf(il)].sort((a, b) => ilceWeight(b) - ilceWeight(a))[0];
/** Ücretsiz bölge verir (yeni oyunun başlangıç ilçesi ve testler için). */
export function grantRegion(s: GameState, il: number, key?: string): string | undefined {
  s.bolge.il[il] ??= dayOf(s); const d = (key ? ilceOf(key) : undefined) ?? [...ilcelerOf(il)].find((x) => ilceAcik(s, x)) ?? enIyiIlce(il); if (!d) return undefined; s.bolge.ilce[ilceKey(d)] ??= dayOf(s); return ilceKey(d);
}
export const emptyBolge = (): GameState['bolge'] => ({ il: {}, ilce: {} });
/** Eski kayıtlar için: şubesi olan yerleri açık say. */
export function migrateBolge(s: GameState): void {
  s.bolge ??= emptyBolge(); if (s.bolge.il[START_IL] === undefined && !s.subeler.length) s.bolge.il[START_IL] = 0;
  for (const b of s.subeler) { s.bolge.il[b.city] ??= b.acilis; const d = ilceOf(b.ilce) ?? enIyiIlce(b.city); if (d) { b.ilce ??= ilceKey(d); s.bolge.ilce[ilceKey(d)] ??= b.acilis; } }
}
export const profilBranch = (b: Branch): IlceProfil => { const d = ilceOf(b.ilce); return d ? profilOf(d) : NEUTRAL; };
/** Yeni açılan bir pazarın olgunlaşması: 150 günde tam potansiyele ulaşır. */
export function olgunluk(s: GameState, b: Branch): number { const g = s.bolge.ilce[b.ilce ?? ''] ?? b.acilis; return 0.8 + 0.2 * Math.min(1, Math.max(0, dayOf(s) - g) / 150); }
export const ilSayisi = (s: GameState): number => Object.keys(s.bolge.il).length;
export const ilceSayisi = (s: GameState): number => Object.keys(s.bolge.ilce).length;
export { CITIES };
