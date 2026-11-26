/** Kavurmahane: kendi çekirdeğini kavur (maliyet düşer, kalite artar), fazlasını diğer kafelere toptan sat. */
import { hooks, ingPrice, levelOf } from './sim';
import { cityById } from '../data/turkey';
import { dayOf } from './calendar';
import { D, harmanEk, yaz } from './derin';
import type { GameState } from './types';

export interface Kav { seviye: number; toptan: number; gelir: number; kg: number; gunKg: number; gunGelir: number }
export interface Res { ok: boolean; m: string }
export const KAV_SEVIYE = [
  { ad: 'Kurulu değil', kur: 0, gun: 0, kap: 0, ind: 0, kal: 0, sube: 0, sev: 0 },
  { ad: 'Mikro kavurma atölyesi', kur: 600000, gun: 2500, kap: 40, ind: 0.07, kal: 0.02, sube: 3, sev: 2 },
  { ad: 'Yerel kavurmahane', kur: 900000, gun: 6000, kap: 120, ind: 0.12, kal: 0.035, sube: 6, sev: 3 },
  { ad: 'Bölgesel kavurma tesisi', kur: 1800000, gun: 14000, kap: 320, ind: 0.17, kal: 0.05, sube: 10, sev: 4 },
];
export const TOPTAN = [{ ad: 'Düşük fiyat', fiyat: 0.88, talep: 1 }, { ad: 'Piyasa fiyatı', fiyat: 1.05, talep: 0.75 }, { ad: 'Yüksek fiyat', fiyat: 1.25, talep: 0.45 }];
export function K(s: GameState): Kav { return (D(s).kav ??= { seviye: 0, toptan: 1, gelir: 0, kg: 0, gunKg: 0, gunGelir: 0 }); }
const F = (s: GameState): number => s.market.fiyat;
export const ozKullanimKg = (s: GameState): number => s.subeler.reduce((a, b) => a + (b.kullanim.bean ?? 0), 0) / 1000;
/** Kavurmahanenin kendi şubelerini karşılama oranı (kapasite / ihtiyaç, en çok 1). */
export function karsilama(s: GameState): number { const k = KAV_SEVIYE[K(s).seviye]!, kul = ozKullanimKg(s); return k.kap && kul > 0 ? Math.min(1, k.kap / kul) : k.kap ? 1 : 0; }
harmanEk.mal = (s) => 1 - KAV_SEVIYE[K(s).seviye]!.ind * karsilama(s);
harmanEk.kal = (s) => 1 + KAV_SEVIYE[K(s).seviye]!.kal * karsilama(s);
export function kavNeden(s: GameState): string | null {
  const k = K(s), n = KAV_SEVIYE[k.seviye + 1]; if (!n) return 'En üst seviyedesin.'; const nb = s.subeler.length, bedel = Math.round(n.kur * F(s));
  if (levelOf(s) < n.sev) return `Kafe seviyesi ${n.sev} gerekir.`; if (nb < n.sube) return `En az ${n.sube} şube gerekir (şu an ${nb}).`; if (s.kasa < bedel) return `Yatırım için ${bedel.toLocaleString('tr-TR')} ₺ gerekir.`; return null;
}
export function kavYukselt(s: GameState): Res {
  const nd = kavNeden(s); if (nd) return { ok: false, m: nd }; const k = K(s), n = KAV_SEVIYE[k.seviye + 1]!, bedel = Math.round(n.kur * F(s)); s.kasa -= bedel; s.capexBugun += bedel; k.seviye++; yaz(s, undefined, `${n.ad} açıldı.`);
  return { ok: true, m: `${n.ad} kuruldu (−${bedel.toLocaleString('tr-TR')} ₺): çekirdek maliyeti −%${Math.round(n.ind * 100)}, kalite +%${(n.kal * 100).toFixed(1)}.` };
}
export function kavToptan(s: GameState, i: number): Res { K(s).toptan = Math.max(0, Math.min(2, i)); return { ok: true, m: `Toptan satış: ${TOPTAN[K(s).toptan]!.ad}.` }; }
hooks.gunOnce.push((s, toplam) => {
  const k = K(s), sv = KAV_SEVIYE[k.seviye]!; k.gunKg = 0; k.gunGelir = 0; if (!k.seviye) return;
  const gider = sv.gun * F(s); toplam.gider.bakim += gider; s.kasa -= gider;
  const artik = Math.max(0, sv.kap - ozKullanimKg(s)); if (artik <= 0) return;
  const pazar = Math.max(0.2, Math.min(0.9, 0.35 + s.marka_puani / 150)), kg = artik * pazar * TOPTAN[k.toptan]!.talep, fiyat = ingPrice(s, 'bean', cityById(34)) * TOPTAN[k.toptan]!.fiyat, maliyet = kg * ingPrice(s, 'bean', cityById(34)) * 0.62;
  toplam.gelir.toplu += kg * fiyat; toplam.gider.malzeme += maliyet; s.kasa -= maliyet; k.kg += kg; k.gelir += kg * fiyat; k.gunKg = kg; k.gunGelir = kg * fiyat; void dayOf;
});
