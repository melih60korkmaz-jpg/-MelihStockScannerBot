/** Kurye filosu ve bulut mutfak: kendi paket servis kanalın; hava kapasiteyi ve talebi etkiler. */
import { hooks } from './sim';
import { D, yaz } from './derin';
import { cityById } from '../data/turkey';
import type { GameState } from './types';

export interface Kur { filo: number; bulut: number; bugun: { talep: number; teslim: number; kayip: number; gelir: number; hava: string }; toplam: number }
export interface Res { ok: boolean; m: string }
export const KURYE_GUN = 1500, BULUT_KUR = 250000, BULUT_GUN = 4000, KURYE_KAP = 16, MAX_FILO = 24, MAX_BULUT = 4;
export function Kr(s: GameState): Kur { return (D(s).kur ??= { filo: 0, bulut: 0, bugun: { talep: 0, teslim: 0, kayip: 0, gelir: 0, hava: 'bulutlu' }, toplam: 0 }); }
const F = (s: GameState): number => s.market.fiyat;
export const HAVA_ETKI: Record<string, { talep: number; kap: number; ad: string }> = { gunesli: { talep: 0.9, kap: 1, ad: 'Güneşli' }, bulutlu: { talep: 1, kap: 1, ad: 'Bulutlu' }, yagmur: { talep: 1.4, kap: 0.7, ad: 'Yağmurlu' }, kar: { talep: 1.2, kap: 0.45, ad: 'Karlı' } };
export function kuryeAyarla(s: GameState, d: number): Res { const k = Kr(s); if (!s.subeler.length) return { ok: false, m: 'Önce bir şube aç.' }; const n = Math.max(0, Math.min(MAX_FILO, k.filo + d)); if (n === k.filo) return { ok: false, m: n === 0 ? 'Filoda kurye yok.' : 'Filo sınırı.' }; k.filo = n; return { ok: true, m: `Filo: ${n} kurye (günlük ${Math.round(n * KURYE_GUN * F(s)).toLocaleString('tr-TR')} ₺).` }; }
export function bulutKur(s: GameState): Res {
  const k = Kr(s); if (k.bulut >= MAX_BULUT) return { ok: false, m: 'Bulut mutfak sınırı.' }; if (!s.subeler.length) return { ok: false, m: 'Önce bir şube aç.' }; const b = Math.round(BULUT_KUR * F(s)); if (s.kasa < b) return { ok: false, m: `Kurulum için ${b.toLocaleString('tr-TR')} ₺ gerekir.` };
  s.kasa -= b; s.capexBugun += b; k.bulut++; yaz(s, undefined, `${k.bulut}. bulut mutfak açıldı.`); return { ok: true, m: `Bulut mutfak açıldı (−${b.toLocaleString('tr-TR')} ₺): yalnız paket servis, talep +%50.` };
}
export function bulutKapat(s: GameState): Res { const k = Kr(s); if (!k.bulut) return { ok: false, m: 'Bulut mutfak yok.' }; k.bulut--; return { ok: true, m: 'Bir bulut mutfak kapatıldı.' }; }
hooks.gunOnce.push((s, toplam) => {
  const k = Kr(s); k.bugun = { talep: 0, teslim: 0, kayip: 0, gelir: 0, hava: k.bugun.hava }; if (!s.subeler.length || (!k.filo && !k.bulut)) return;
  const gider = k.filo * KURYE_GUN * F(s), bg = k.bulut * BULUT_GUN * F(s); toplam.gider.maas += gider; toplam.gider.kira += bg; s.kasa -= gider + bg; if (!k.filo) return;
  const b0 = s.subeler[0]!, hv = s.hava[b0.city] ?? 'bulutlu', he = HAVA_ETKI[hv] ?? HAVA_ETKI.bulutlu!, rap = s.subeler.map((b) => b.gecmis[b.gecmis.length - 1]).filter((x): x is NonNullable<typeof x> => !!x), mus = rap.reduce((a, r) => a + r.musteri, 0), ciro = rap.reduce((a, r) => a + r.toplamGelir, 0), sepet = mus ? ciro / mus : 150;
  const talep = mus * 0.12 * (1 + k.bulut * 0.5) * he.talep * (0.7 + s.marka_puani / 200), kap = k.filo * KURYE_KAP * he.kap, teslim = Math.min(talep, kap), gelir = teslim * sepet * 1.15, maliyet = gelir * 0.34;
  toplam.gelir.paket += gelir; toplam.gider.malzeme += maliyet; s.kasa -= maliyet; k.bugun = { talep, teslim, kayip: Math.max(0, talep - kap), gelir, hava: hv }; k.toplam += gelir; void cityById;
});
