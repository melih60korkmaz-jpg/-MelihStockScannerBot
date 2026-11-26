/** Tedarikçi ilişkisi: sadakat seviyeleri (indirim, güvenilirlik), ziyaret ve 30 günlük alım sözleşmesi. Varsayılan durumda hiçbir şey değişmez. */
import { cityById } from '../data/turkey';
import { suppliersOf, tedHook } from './supply';
import { hooks } from './sim';
import { dayOf } from './calendar';
import { D, yaz } from './derin';
import type { GameState } from './types';

export interface TedSeviye { min: number; ad: string; ind: number; guv: number; ac: string }
export const TED_SEVIYE: TedSeviye[] = [
  { min: 0, ad: 'Yeni müşteri', ind: 0, guv: 0, ac: 'Standart fiyat ve teslimat.' },
  { min: 20, ad: 'Tanıdık', ind: 0.01, guv: 0, ac: '%1 indirim.' },
  { min: 40, ad: 'Düzenli', ind: 0.03, guv: 0.02, ac: '%3 indirim, daha güvenilir teslimat.' },
  { min: 60, ad: 'Tercihli', ind: 0.05, guv: 0.04, ac: '%5 indirim, geç/eksik teslimat azalır.' },
  { min: 80, ad: 'Stratejik ortak', ind: 0.08, guv: 0.06, ac: '%8 indirim, en güvenilir teslimat.' },
];
export const SOZ_INDIRIM = 0.04, SOZ_GUN = 30;
const anahtar = (city: number, id: string): string => `${city}:${id}`;
export const iliski = (s: GameState, city: number, id: string): { sad: number; harc: number; son: number; soz?: { bas: number; bit: number; hedef: number; harc: number } } => (D(s).ted[anahtar(city, id)] ??= { sad: 0, harc: 0, son: dayOf(s) });
export const tedSeviye = (sad: number): TedSeviye => [...TED_SEVIYE].reverse().find((x) => sad >= x.min) ?? TED_SEVIYE[0]!;
export const sozlesmeHedef = (s: GameState): number => Math.round(80000 * s.market.fiyat / 1000) * 1000;
/** Bu tedarikçide uygulanan toplam indirim (seviye + aktif sözleşme). */
export function tedIndirim(s: GameState, city: number, id: string): number { const r = D(s).ted[anahtar(city, id)]; if (!r) return 0; return tedSeviye(r.sad).ind + (r.soz && r.soz.bit > dayOf(s) ? SOZ_INDIRIM : 0); }
tedHook.fiyat = (s, b, id) => 1 - tedIndirim(s, b.city, id);
tedHook.guven = (s, b, id) => { const r = D(s).ted[anahtar(b.city, id)]; return r ? tedSeviye(r.sad).guv : 0; };
tedHook.siparis = (s, b, id, tutar) => { D(s).say.ted = (D(s).say.ted ?? 0) + 1; const r = iliski(s, b.city, id); r.harc += tutar; r.son = dayOf(s); r.sad = Math.min(100, r.sad + Math.min(2.5, tutar / (25000 * s.market.fiyat))); if (r.soz && r.soz.bit > dayOf(s)) r.soz.harc += tutar; };
tedHook.teslim = (s, b, id, sorun) => { if (!sorun) return; const r = D(s).ted[anahtar(b.city, id)]; if (r) r.sad = Math.max(0, r.sad - 1.5); };
export interface Res { ok: boolean; m: string }
export function tedZiyaret(s: GameState, city: number, id: string): Res {
  const sup = suppliersOf(cityById(city)).find((x) => x.id === id); if (!sup) return { ok: false, m: 'Tedarikçi yok.' }; const r = iliski(s, city, id), now = dayOf(s), k = `tz${city}:${id}`, d = D(s);
  if ((d.son[k] ?? -9) > now - 3) return { ok: false, m: 'Yakın zamanda ziyaret ettin; 3 gün bekle.' }; const bedel = Math.round(2000 * s.market.fiyat); if (s.kasa < bedel) return { ok: false, m: 'Kasa yetersiz.' };
  s.kasa -= bedel; s.capexBugun += bedel; d.son[k] = now; r.sad = Math.min(100, r.sad + 6); return { ok: true, m: `${sup.ad} ziyaret edildi (−${bedel} ₺): sadakat ${Math.round(r.sad)}.` };
}
export function tedSozlesme(s: GameState, city: number, id: string): Res {
  const sup = suppliersOf(cityById(city)).find((x) => x.id === id); if (!sup) return { ok: false, m: 'Tedarikçi yok.' }; const r = iliski(s, city, id), now = dayOf(s);
  if (r.sad < 20) return { ok: false, m: 'Sözleşme için sadakat en az 20 olmalı (ziyaret et, düzenli sipariş ver).' }; if (r.soz && r.soz.bit > now) return { ok: false, m: 'Zaten aktif bir sözleşmen var.' };
  r.soz = { bas: now, bit: now + SOZ_GUN, hedef: sozlesmeHedef(s), harc: 0 }; yaz(s, undefined, `${sup.ad} ile ${SOZ_GUN} günlük alım sözleşmesi imzalandı.`); return { ok: true, m: `${sup.ad}: ${SOZ_GUN} gün %${Math.round(SOZ_INDIRIM * 100)} ek indirim. Hedef: ${SOZ_GUN} günde ${sozlesmeHedef(s)} ₺ alım; tutturamazsan farkın %25'i ceza.` };
}
hooks.gunOnce.push((s) => {
  const d = D(s), now = dayOf(s);
  for (const [k, r] of Object.entries(d.ted)) {
    if (now - r.son > 14) r.sad = Math.max(0, r.sad - 0.15);
    if (r.soz && r.soz.bit <= now) {
      const [city, id] = k.split(':'), sup = suppliersOf(cityById(+city!)).find((x) => x.id === id), ad = sup?.ad ?? 'Tedarikçi';
      if (r.soz.harc >= r.soz.hedef) { r.sad = Math.min(100, r.sad + 8); s.log.unshift(`📜 ${ad} sözleşmesi hedefe ulaştı: sadakat +8.`); yaz(s, undefined, `${ad} sözleşmesini hedefle tamamladın.`); }
      else { const ceza = (r.soz.hedef - r.soz.harc) * 0.25; s.kasa -= ceza; s.capexBugun += ceza; r.sad = Math.max(0, r.sad - 12); s.log.unshift(`📜 ${ad} sözleşmesi hedefin altında kaldı: ceza −${Math.round(ceza)} ₺, sadakat −12.`); }
      delete r.soz;
    }
  }
});
