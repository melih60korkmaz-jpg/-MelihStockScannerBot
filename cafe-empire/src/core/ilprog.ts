/** İl sekmeleri: her ilin profiline göre farklı sekmeler açılır ve o sekmelerde gerçek eylemler vardır. */
import { cityById } from '../data/turkey';
import { dayOf } from './calendar';
import { hooks } from './sim';
import type { GameState } from './types';

export type IlSekme = 'ozet' | 'rakip' | 'turizm' | 'kampus' | 'kurumsal';
export const SEKME_AD: Record<IlSekme, string> = { ozet: '📍 Özet', rakip: '🥊 Rakipler', turizm: '🧳 Turizm', kampus: '🎓 Kampüs', kurumsal: '🏢 Kurumsal' };
export const SEKME_NEDEN: Record<IlSekme, string> = { ozet: 'Her ilde', rakip: 'Her ilde', turizm: 'Turistik ya da sahil il', kampus: 'Öğrenci yoğun il', kurumsal: 'Sanayi/iş merkezi ya da büyükşehir' };
/** İlin profiline göre açılan sekmeler (özet ve rakipler her ilde vardır). */
export function ilSekmeleri(il: number): IlSekme[] {
  const c = cityById(il), r: IlSekme[] = ['ozet'];
  if (c.turizm >= 0.45 || c.kiyi) r.push('turizm'); if (c.ogrenci >= 0.5) r.push('kampus'); if (c.sanayi >= 0.5 || c.nufus >= 3000) r.push('kurumsal'); r.push('rakip'); return r;
}
export interface IRes { ok: boolean; m: string }
const ok = (m: string): IRes => ({ ok: true, m }), no = (m: string): IRes => ({ ok: false, m });
export const ildeSubeler = (s: GameState, il: number) => s.subeler.filter((b) => b.city === il);
const kontrol = (s: GameState, il: number, sek: IlSekme): string | null => { if (s.bolge.il[il] === undefined) return 'Bu il açık değil.'; if (!ilSekmeleri(il).includes(sek)) return 'Bu sekme bu ilde yok.'; if (!ildeSubeler(s, il).length) return 'Önce bu ilde bir şube aç.'; return null; };

export const turistMaliyet = (s: GameState, il: number): number => Math.round(20000 * s.market.fiyat * ildeSubeler(s, il).length / 500) * 500;
export function turistPaketi(s: GameState, il: number): IRes {
  const e = kontrol(s, il, 'turizm'); if (e) return no(e); const k = 'turist_' + il, now = dayOf(s); if ((s.market.mod[k]?.bit ?? 0) > now) return no('Turist paketi zaten sürüyor.');
  const c = turistMaliyet(s, il); if (s.kasa < c) return no(`Kasa yetersiz (${c} ₺).`); s.kasa -= c; s.capexBugun += c; s.market.mod[k] = { v: 1.15, bit: now + 30 }; for (const b of ildeSubeler(s, il)) b.marka = Math.min(100, b.marka + 1);
  return ok(`${cityById(il).ad}: turist paketi 30 gün sürecek (−${c} ₺, talep +%15).`);
}
export const kampusMaliyet = (s: GameState, il: number): number => Math.round(15000 * s.market.fiyat * ildeSubeler(s, il).length / 500) * 500;
export function kampusAnlasma(s: GameState, il: number): IRes {
  const e = kontrol(s, il, 'kampus'); if (e) return no(e); const k = 'kampus_' + il, now = dayOf(s); if ((s.market.mod[k]?.bit ?? 0) > now) return no('Kampüs anlaşması zaten sürüyor.');
  const c = kampusMaliyet(s, il); if (s.kasa < c) return no(`Kasa yetersiz (${c} ₺).`); s.kasa -= c; s.capexBugun += c; s.market.mod[k] = { v: 1.1, bit: now + 30 };
  return ok(`${cityById(il).ad}: kampüs anlaşması 30 gün sürecek (−${c} ₺, talep +%10).`);
}
/** Kurumsal toplu sipariş: günlük sabit ciro (maliyeti %38), memnuniyet düşerse iptal olur. */
export const kurumsalGunluk = (s: GameState, il: number): number => Math.round(1500 * s.market.fiyat * ildeSubeler(s, il).length * (0.6 + 0.8 * cityById(il).sanayi) / 100) * 100;
export function kurumsalSozlesme(s: GameState, il: number): IRes {
  const e = kontrol(s, il, 'kurumsal'); if (e) return no(e); s.ilprog[il] ??= {}; const now = dayOf(s); if ((s.ilprog[il]!.kurumsal?.bit ?? 0) > now) return no('Sözleşme zaten sürüyor.');
  const ort = ildeSubeler(s, il).reduce((a, b) => a + b.memnuniyet, 0) / ildeSubeler(s, il).length; if (ort < 55) return no(`Kurumsal müşteriler en az 55 memnuniyet ister (şu an ${Math.round(ort)}).`);
  s.ilprog[il]!.kurumsal = { gunluk: kurumsalGunluk(s, il), bit: now + 30 }; return ok(`${cityById(il).ad}: 30 günlük kurumsal sözleşme (günlük ≈ ${s.ilprog[il]!.kurumsal!.gunluk} ₺ ciro).`);
}
export function kurumsalIptal(s: GameState, il: number): IRes { if (!s.ilprog[il]?.kurumsal) return no('Sözleşme yok.'); delete s.ilprog[il]!.kurumsal; return ok('Sözleşme sonlandırıldı.'); }
hooks.gunOnce.push((s, toplam) => {
  const now = dayOf(s);
  for (const k of Object.keys(s.ilprog)) { const il = +k, p = s.ilprog[il]!.kurumsal; if (!p) continue; const bs = ildeSubeler(s, il);
    if (!bs.length || p.bit <= now) { delete s.ilprog[il]!.kurumsal; s.log.unshift(`${cityById(il).ad}: kurumsal sözleşme sona erdi.`); continue; }
    const ort = bs.reduce((a, b) => a + b.memnuniyet, 0) / bs.length; if (ort < 45) { delete s.ilprog[il]!.kurumsal; for (const b of bs) b.marka = Math.max(0, b.marka - 1); s.log.unshift(`⚠️ ${cityById(il).ad}: memnuniyet düştü, kurumsal sözleşme iptal edildi.`); continue; }
    const cogs = p.gunluk * 0.38; toplam.gelir.toplu += p.gunluk; toplam.gider.malzeme += cogs; s.kasa -= cogs; }
});
