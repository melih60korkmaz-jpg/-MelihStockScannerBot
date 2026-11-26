/** Franchise: markanı başkalarına işlettir; giriş ücreti, royalty ve pazarlama payı kazan, kaliteyi ve markayı koru. */
import { cityById } from '../data/turkey';
import { SHOP, type ShopTypeId } from '../data/catalog';
import { ILCELER, ilceKey, ilceOf, profilOf } from '../data/regions';
import { hooks, levelOf, refPrice } from './sim';
import { setupCost } from './actions';
import { ilceAcik } from './region';
import { dayOf } from './calendar';
import { rand } from './rng';
import { SOZLESME, type SozlesmeId } from './derin';
import type { Franchise, GameState } from './types';

export const ROYALTY = 0.08, PAZARLAMA = 0.02;
export const MAX_FR = (s: GameState): number => levelOf(s) * 4;
export interface FRes { ok: boolean; m: string }
const ok = (m: string): FRes => ({ ok: true, m }), no = (m: string): FRes => ({ ok: false, m });
export function franchiseBedelleri(s: GameState, il: number, tip: ShopTypeId, soz: SozlesmeId = 'standart'): { giris: number; destek: number } { const base = setupCost(s, cityById(il), tip); return { giris: Math.round(base * 0.5 * SOZLESME[soz].giris / 1000) * 1000, destek: Math.round(base * 0.12 / 1000) * 1000 }; }
export function franchiseNeden(s: GameState, ilceId: number, tip: ShopTypeId): string | null {
  const d = ILCELER[ilceId]; if (!d) return 'İlçe yok.'; const key = ilceKey(d);
  if (levelOf(s) < 5) return 'Franchise için kafe seviyesi 5 (ulusal zincir) gerekir.'; if (s.franchise.length >= MAX_FR(s)) return `Franchise sınırı dolu (${MAX_FR(s)}).`;
  if (!ilceAcik(s, d)) return 'Önce bu ilçenin pazarını aç.'; if (s.subeler.some((b) => b.ilce === key)) return 'Bu ilçede kendi şuben var.'; if (s.franchise.some((f) => f.ilce === key)) return 'Bu ilçede zaten bir bayin var.';
  const why = SHOP[tip].uygun(cityById(d.il)); if (why) return why; const { destek } = franchiseBedelleri(s, d.il, tip); if (s.kasa < destek) return `Kurulum desteği için ${destek} ₺ gerekir.`; return null;
}
let fid = 1;
export function franchiseVer(s: GameState, ilceId: number, tip: ShopTypeId, soz: SozlesmeId = 'standart'): FRes {
  const neden = franchiseNeden(s, ilceId, tip); if (neden) return no(neden); const d = ILCELER[ilceId]!, { giris, destek } = franchiseBedelleri(s, d.il, tip, soz), now = dayOf(s);
  s.kasa -= destek; s.capexBugun += destek; s.frBugun = (s.frBugun ?? 0) + giris;
  const f: Franchise = { id: Math.max(fid, ...s.franchise.map((x) => x.id + 1)), ad: `${s.marka.ad} ${d.ad} (Bayi)`, il: d.il, ilce: ilceKey(d), tip, acilis: now, kalite: 55 + SOZLESME[soz].kalite, memnuniyet: 65, destek: 1, ciro: 0, royalty: 0, toplam: 0, dusukGun: 0, denetim: now, sozlesme: soz }; fid = f.id + 1; s.franchise.push(f);
  s.log.unshift(`🤝 Yeni bayi: ${f.ad}`); return ok(`${f.ad} açıldı. Giriş ücreti ${giris} ₺ günün gelirine eklenecek; kurulum desteği −${destek} ₺.`);
}
export function franchiseDestek(s: GameState, id: number, d: number): FRes { const f = s.franchise.find((x) => x.id === id); if (!f) return no('Bayi yok.'); f.destek = Math.max(0, Math.min(3, f.destek + d)); return ok(`Destek seviyesi ${f.destek} (günlük ${Math.round(f.destek * 400 * s.market.fiyat)} ₺).`); }
export function franchiseDenetim(s: GameState, id: number): FRes { const f = s.franchise.find((x) => x.id === id); if (!f) return no('Bayi yok.'); const c = Math.round(4000 * s.market.fiyat); if (s.kasa < c) return no('Denetim için kasa yetersiz.'); if (dayOf(s) - f.denetim < 7) return no('Denetim haftada bir yapılabilir.'); s.kasa -= c; f.denetim = dayOf(s); f.kalite = Math.min(100, f.kalite + 6); return ok(`${f.ad} denetlendi (−${c} ₺): kalite arttı.`); }
export function franchiseSonlandir(s: GameState, id: number): FRes { const f = s.franchise.find((x) => x.id === id); if (!f) return no('Bayi yok.'); const t = Math.round(Math.max(20000, f.royalty * 20)); if (s.kasa < t) return no(`Tazminat ${t} ₺ ödenemiyor.`); s.kasa -= t; s.franchise = s.franchise.filter((x) => x !== f); s.marka_puani = Math.max(0, s.marka_puani - 1); return ok(`${f.ad} sözleşmesi feshedildi (tazminat −${t} ₺).`); }
/** Bir bayinin beklenen günlük cirosu (tahmin; gerçek gün şansa göre ±%8 sapar). */
export function tahminCiro(s: GameState, f: Franchise): number {
  const d = ilceOf(f.ilce), c = cityById(f.il), pf = d ? profilOf(d) : { talep: 1, gelir: 1 }, olg = 0.8 + 0.2 * Math.min(1, Math.max(0, dayOf(s) - f.acilis) / 150), marka = 0.4 + 0.012 * s.marka_puani;
  const musteri = SHOP[f.tip as ShopTypeId].potansiyel * 1.9 * pf.talep * olg * marka * Math.max(0.3, f.kalite / 70);
  const son = s.rapor.slice(-14), ms = son.reduce((a, r) => a + r.musteri, 0), g = son.reduce((a, r) => a + r.toplamGelir - r.gelir.franchise, 0), sepet = ms > 50 ? g / ms : 150;
  return musteri * sepet * (0.9 + 0.1 * pf.gelir) * (c.gelir > 0 ? (0.82 + 0.28 * c.gelir) / (0.82 + 0.28 * 1.0) : 1) * 0.75;
}
hooks.gunOnce.push((s, toplam) => {
  let gelir = s.frBugun ?? 0; s.frBugun = 0; let destek = 0;
  for (const f of [...s.franchise]) {
    const soz = SOZLESME[f.sozlesme ?? 'standart'], hedef = 45 + 0.35 * s.marka_puani + 12 * f.destek + soz.kalite - (dayOf(s) - f.denetim > 45 ? 8 : 0);
    f.kalite = Math.max(0, Math.min(100, f.kalite + (hedef - f.kalite) * 0.06 + (rand(s.rng, 'misc') - 0.5) * 1.2));
    const ciro = tahminCiro(s, f) * (0.92 + 0.16 * rand(s.rng, 'misc')), pay = ciro * (soz.royalty + soz.pazarlama); f.ciro = ciro; f.royalty = pay; f.toplam += pay; gelir += pay; destek += f.destek * 400 * s.market.fiyat;
    const mh = 50 + (f.kalite - 50) * 0.4 + f.destek * 5 + (ciro > 8000 ? 6 : 0); f.memnuniyet = Math.max(0, Math.min(100, f.memnuniyet + (mh - f.memnuniyet) * 0.05));
    s.marka_puani = Math.max(0, Math.min(100, s.marka_puani + (f.kalite < 45 ? -0.02 : f.kalite > 75 ? 0.02 : 0)));
    f.dusukGun = f.kalite < 35 || f.memnuniyet < 30 ? f.dusukGun + 1 : 0;
    if (f.dusukGun >= 14) { s.franchise = s.franchise.filter((x) => x !== f); s.marka_puani = Math.max(0, s.marka_puani - 2); s.log.unshift(`⚠️ ${f.ad} kalite/memnuniyet düşüklüğü nedeniyle ayrıldı; marka zarar gördü.`); }
  }
  toplam.gelir.franchise += gelir; toplam.gider.bakim += destek; s.kasa -= destek;
});
