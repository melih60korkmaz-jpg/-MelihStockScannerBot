/** Başarımlar ve dönemsel görevler. Hepsi simülasyon durumundan hesaplanır; ödüller gerçek nakittir. */
import type { GameState, Gorev } from './types';
import { dayOf } from './calendar';
import { hooks, levelOf } from './sim';
import { INVESTS } from './invest';
import { weekGaps } from './hr';
import { ilSayisi, ilceSayisi } from './region';

export interface Basarim { id: string; ad: string; ac: string; ikon: string; odul: number; ok: (s: GameState) => boolean }
const maxMarka = (s: GameState): number => Math.max(0, ...s.subeler.map((b) => b.marka));
const toplamStaff = (s: GameState): number => s.subeler.reduce((a, b) => a + b.staff.length, 0);
export const BASARIMLAR: Basarim[] = [
  { id: 'ilk_gun', ad: 'İlk gün', ac: 'İlk günü tamamla.', ikon: '🌅', odul: 5000, ok: (s) => s.rapor.length >= 1 },
  { id: 'm100', ad: '100 müşteri', ac: 'Toplam 100 müşteriye hizmet et.', ikon: '🙂', odul: 5000, ok: (s) => s.stat.musteri >= 100 },
  { id: 'm1000', ad: '1.000 müşteri', ac: 'Toplam 1.000 müşteriye hizmet et.', ikon: '👥', odul: 20000, ok: (s) => s.stat.musteri >= 1000 },
  { id: 'm10000', ad: '10.000 müşteri', ac: 'Toplam 10.000 müşteriye hizmet et.', ikon: '🏟️', odul: 100000, ok: (s) => s.stat.musteri >= 10000 },
  { id: 'ilk_kar', ad: 'İlk kârlı gün', ac: 'Bir günü net kârla kapat.', ikon: '💵', odul: 10000, ok: (s) => s.stat.karGun >= 1 },
  { id: 'seri7', ad: '7 gün üst üste kâr', ac: 'Arka arkaya 7 gün net kâr et.', ikon: '🔥', odul: 40000, ok: (s) => (s.stat.seri ?? 0) >= 7 },
  { id: 'seri30', ad: '30 gün üst üste kâr', ac: 'Arka arkaya 30 gün net kâr et.', ikon: '🏆', odul: 150000, ok: (s) => (s.stat.seri ?? 0) >= 30 },
  { id: 'kasa1m', ad: 'Milyoner', ac: 'Kasada 3 milyon ₺ biriktir.', ikon: '💰', odul: 50000, ok: (s) => s.kasa >= 3e6 },
  { id: 'kasa10m', ad: '10 milyon', ac: 'Kasada 10 milyon ₺ biriktir.', ikon: '🏦', odul: 250000, ok: (s) => s.kasa >= 1e7 },
  { id: 'sube2', ad: 'İkinci şube', ac: '2 şubeye ulaş.', ikon: '🏬', odul: 25000, ok: (s) => s.subeler.length >= 2 },
  { id: 'sube5', ad: '5 şube', ac: '5 şubeye ulaş.', ikon: '🏙️', odul: 100000, ok: (s) => s.subeler.length >= 5 },
  { id: 'sube10', ad: '10 şube', ac: '10 şubeye ulaş.', ikon: '🌆', odul: 400000, ok: (s) => s.subeler.length >= 10 },
  { id: 'ilce5', ad: '5 ilçe', ac: '5 ilçenin pazarını aç.', ikon: '🗺️', odul: 30000, ok: (s) => ilceSayisi(s) >= 5 },
  { id: 'ilce15', ad: '15 ilçe', ac: '15 ilçenin pazarını aç.', ikon: '📍', odul: 120000, ok: (s) => ilceSayisi(s) >= 15 },
  { id: 'il3', ad: '3 il', ac: '3 ilin pazarını aç.', ikon: '🇹🇷', odul: 60000, ok: (s) => ilSayisi(s) >= 3 },
  { id: 'il10', ad: '10 il', ac: '10 ilin pazarını aç.', ikon: '🚩', odul: 300000, ok: (s) => ilSayisi(s) >= 10 },
  { id: 'ekip10', ad: '10 kişilik ekip', ac: 'Toplam 10 çalışana ulaş.', ikon: '🧑‍🍳', odul: 25000, ok: (s) => toplamStaff(s) >= 10 },
  { id: 'ekip30', ad: '30 kişilik ekip', ac: 'Toplam 30 çalışana ulaş.', ikon: '🧑‍🤝‍🧑', odul: 100000, ok: (s) => toplamStaff(s) >= 30 },
  { id: 'marka50', ad: 'Tanınan marka', ac: 'Bir şubede marka değerini 50\'ye çıkar.', ikon: '⭐', odul: 40000, ok: (s) => maxMarka(s) >= 50 },
  { id: 'marka80', ad: 'Ünlü marka', ac: 'Bir şubede marka değerini 80\'e çıkar.', ikon: '🌟', odul: 200000, ok: (s) => maxMarka(s) >= 80 },
  { id: 'yorum45', ad: 'Müşteri favorisi', ac: 'Bir şubede yorum puanı 4,5 ★ olsun.', ikon: '💬', odul: 40000, ok: (s) => s.subeler.some((b) => b.yorumPuan >= 4.5) },
  { id: 'kampanya', ad: 'Kampanyacı', ac: 'İlk kampanyanı başlat.', ikon: '🏷️', odul: 8000, ok: (s) => s.subeler.some((b) => b.promo && (b.promo.sabah || b.promo.mutlu || b.promo.ogrenci || b.promo.kart)) },
  { id: 'danisman', ad: 'Fiyat ustası', ac: 'Fiyat danışmanının önerisini uygula.', ikon: '💡', odul: 8000, ok: (s) => s.stat.fiyatDeg >= 1 },
  { id: 'yatirim', ad: 'Yatırımcı', ac: 'İlk ekipman yatırımını yap.', ikon: '🛠️', odul: 10000, ok: (s) => s.subeler.some((b) => Object.values(b.yat ?? {}).some((v) => v > 0)) },
  { id: 'yatirim_tam', ad: 'Tam donanım', ac: 'Bir ekipmanı son seviyeye çıkar.', ikon: '⚙️', odul: 60000, ok: (s) => s.subeler.some((b) => INVESTS.some((d) => (b.yat?.[d.id] ?? 0) >= d.max)) },
  { id: 'franchise1', ad: 'İlk franchise', ac: 'İlk franchise şubeni aç.', ikon: '🤝', odul: 80000, ok: (s) => s.franchise.length >= 1 },
  { id: 'franchise5', ad: '5 franchise', ac: '5 franchise şubesine ulaş.', ikon: '🏢', odul: 300000, ok: (s) => s.franchise.length >= 5 },
  { id: 'merkez', ad: 'Merkezi depo', ac: 'Merkezi depoyu kur.', ikon: '🏭', odul: 40000, ok: (s) => s.merkez.depo >= 1 },
  { id: 'seviye5', ad: 'Ulusal zincir', ac: 'Kafe seviyesi 5\'e ulaş.', ikon: '🏅', odul: 100000, ok: (s) => levelOf(s) >= 5 },
  { id: 'yil1', ad: 'Bir yıl', ac: '365 gün ayakta kal.', ikon: '🎂', odul: 100000, ok: (s) => dayOf(s) >= 365 },
];
export const BASARIM: Record<string, Basarim> = Object.fromEntries(BASARIMLAR.map((b) => [b.id, b]));

/* ---------- Görevler ---------- */
type GorevTur = 'kar' | 'musteri' | 'ilce' | 'sube' | 'kampanya' | 'memnun' | 'vardiya' | 'ilce_sube';
const toplamKar = (s: GameState): number => s.stat.netKar, toplamMus = (s: GameState): number => s.stat.musteri;
const olcum = (s: GameState, t: string): number => { switch (t as GorevTur) { case 'kar': return toplamKar(s); case 'musteri': return toplamMus(s); case 'ilce': return ilceSayisi(s); case 'sube': return s.subeler.length; case 'kampanya': return s.subeler.filter((b) => b.promo && (b.promo.sabah || b.promo.mutlu || b.promo.ogrenci || b.promo.kart)).length; case 'memnun': return Math.max(0, ...s.subeler.map((b) => b.memnuniyet)); case 'vardiya': return s.subeler.reduce((a, b) => a + weekGaps(b, dayOf(s)), 0); default: return 0; } };
/** Görev ilerlemesi 0–1. */
export function ilerleme(s: GameState, g: Gorev): number {
  const v = olcum(s, g.olc); if (g.olc === 'vardiya') return g.hedef === 0 ? (v === 0 ? 1 : Math.max(0, 1 - v / Math.max(1, g.taban))) : 0;
  if (g.olc === 'memnun') return Math.max(0, Math.min(1, (v - g.taban) / Math.max(1, g.hedef - g.taban)));
  return Math.max(0, Math.min(1, (v - g.taban) / Math.max(1, g.hedef)));
}
function yeniGorev(s: GameState, n: number, mevcut: Set<string>): Gorev | null {
  const now = dayOf(s), son7 = s.rapor.slice(-7), ort = son7.length ? son7.reduce((a, r) => a + r.kar, 0) / son7.length : 0, mus = son7.length ? son7.reduce((a, r) => a + r.musteri, 0) / son7.length : 60, memn = Math.max(0, ...s.subeler.map((b) => b.memnuniyet));
  const sablon: Array<() => Gorev | null> = [
    () => { const h = Math.max(30000, Math.round(Math.max(0, ort) * 30 * 1.15 / 5000) * 5000); return { id: 'kar', ad: 'Kâr hedefi', ac: `30 günde toplam ${Math.round(h / 1000)} B ₺ net kâr et.`, olc: 'kar', hedef: h, bas: now, bit: now + 30, odul: Math.round(h * 0.2 / 1000) * 1000, taban: toplamKar(s), tamam: false }; },
    () => { const h = Math.max(300, Math.round(mus * 14 * 1.12 / 50) * 50); return { id: 'musteri', ad: 'Müşteri hedefi', ac: `14 günde ${h} müşteriye hizmet et.`, olc: 'musteri', hedef: h, bas: now, bit: now + 14, odul: Math.round(h * 12 / 1000) * 1000, taban: toplamMus(s), tamam: false }; },
    () => ({ id: 'ilce', ad: 'Yeni pazar', ac: 'Yeni bir ilçenin pazarını aç.', olc: 'ilce', hedef: 1, bas: now, bit: now + 45, odul: 25000, taban: ilceSayisi(s), tamam: false }),
    () => ({ id: 'sube', ad: 'Büyüme', ac: 'Yeni bir şube aç.', olc: 'sube', hedef: 1, bas: now, bit: now + 60, odul: 40000, taban: s.subeler.length, tamam: false }),
    () => ({ id: 'kampanya', ad: 'Kampanya zamanı', ac: 'Bir şubede kampanya başlat.', olc: 'kampanya', hedef: 1, bas: now, bit: now + 20, odul: 8000, taban: olcum(s, 'kampanya'), tamam: false }),
    () => memn < 90 ? { id: 'memnun', ad: 'Memnuniyet', ac: `Bir şubede memnuniyeti ${Math.min(95, Math.round(memn + 8))}'e çıkar.`, olc: 'memnun', hedef: Math.min(95, Math.round(memn + 8)), bas: now, bit: now + 30, odul: 20000, taban: memn, tamam: false } : null,
    () => { const v = olcum(s, 'vardiya'); return v > 0 ? { id: 'vardiya', ad: 'Eksiksiz vardiya', ac: 'Haftalık barista/kasiyer boşluğunu sıfırla (Vardiyalar).', olc: 'vardiya', hedef: 0, bas: now, bit: now + 14, odul: 12000, taban: v, tamam: false } : null; },
  ];
  for (let i = 0; i < sablon.length; i++) { const g = sablon[(n + i) % sablon.length]!(); if (g && !mevcut.has(g.id)) return g; } return null;
}
export function gorevleriGuncelle(s: GameState): string[] {
  const log: string[] = []; const now = dayOf(s);
  for (const g of s.gorevler) { if (g.tamam) continue; if (ilerleme(s, g) >= 1) { g.tamam = true; g.basari = now; s.kasa += g.odul; s.log.unshift(`🎯 Görev tamam: ${g.ad} (+${Math.round(g.odul)} ₺)`); log.push(g.ad); } }
  s.gorevler = s.gorevler.filter((g) => !(g.tamam && now - (g.basari ?? now) > 3) && !(!g.tamam && now > g.bit));
  const active = new Set(s.gorevler.map((g) => g.id)); let k = now; while (s.gorevler.filter((g) => !g.tamam).length < 3) { const g = yeniGorev(s, k++, active); if (!g) break; s.gorevler.push(g); active.add(g.id); }
  return log;
}
/** Günlük kapanışta çağrılır: istatistik, başarım ve görevler. */
export function hedefleriKontrolEt(s: GameState): void {
  const r = s.rapor[s.rapor.length - 1]; if (r) { s.stat.musteri += r.musteri; s.stat.netKar += r.kar; if (r.kar > 0) { s.stat.karGun++; s.stat.seri = (s.stat.seri ?? 0) + 1; } else s.stat.seri = 0; s.stat.enIyiGun = Math.max(s.stat.enIyiGun, r.kar); }
  for (const b of BASARIMLAR) if (s.basarim[b.id] === undefined && b.ok(s)) { s.basarim[b.id] = dayOf(s); s.kasa += b.odul; s.log.unshift(`🏆 Başarım: ${b.ad} (+${b.odul} ₺)`); }
  gorevleriGuncelle(s); s.log = s.log.slice(0, 40);
}
hooks.gunSonu.push(hedefleriKontrolEt);
