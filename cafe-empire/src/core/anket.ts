/** Müşteri anketi (gerçek memnuniyet kırılımı ve istek listesi) ve iki şubede A/B test. */
import { PRODUCTS, PRODUCT, type ProductId } from '../data/catalog';
import { hooks } from './sim';
import { dayOf } from './calendar';
import { D, h32, tarifTat } from './derin';
import type { Branch, GameState } from './types';

export interface AnketSonuc { gun: number; hizmet: number; kalite: number; fiyat: number; tekrar: number; istek: ProductId[]; oneri: string[] }
export type Degisken = 'fiyat10' | 'fiyat-10' | 'sabah' | 'mutlu' | 'kart';
export interface AB { a: number; b: number; degisken: Degisken; bas: number; bit: number; eskiFiyat: Record<string, number>; eskiPromo: { sabah?: boolean; mutlu?: boolean; kart?: boolean }; sonuc?: { ciro: number; kar: number; musteri: number; bitti: boolean; uygulandi?: boolean } }
export interface Anket { son: Record<number, number>; sonuc: Record<number, AnketSonuc>; ab: AB | null }
export interface Res { ok: boolean; m: string }
export const DEGISKENLER: Array<{ id: Degisken; ad: string; ac: string }> = [
  { id: 'fiyat10', ad: 'Fiyatlar +%10', ac: 'Menü fiyatlarını %10 artır.' }, { id: 'fiyat-10', ad: 'Fiyatlar −%10', ac: 'Menü fiyatlarını %10 düşür.' },
  { id: 'sabah', ad: 'Sabah paketi', ac: 'Sabah kahve+yiyecek paketini aç.' }, { id: 'mutlu', ad: 'Mutlu saat', ac: 'Mutlu saat indirimini aç.' }, { id: 'kart', ad: 'Sadakat kartı', ac: 'Sadakat kartı kampanyasını aç.' },
];
export const AB_GUN = 14;
export function A(s: GameState): Anket { return (D(s).anket ??= { son: {}, sonuc: {}, ab: null }); }
const F = (s: GameState): number => s.market.fiyat;
export function anketYap(s: GameState, b: Branch): Res {
  const a = A(s), now = dayOf(s); if ((a.son[b.id] ?? -99) > now - 30) return { ok: false, m: 'Bu şubede anket 30 günde bir yapılabilir.' }; const c = Math.round(3000 * F(s)); if (s.kasa < c) return { ok: false, m: `Anket bedeli ${c.toLocaleString('tr-TR')} ₺.` };
  s.kasa -= c; s.capexBugun += c; a.son[b.id] = now; const m = b.mus; const aday = PRODUCTS.filter((p) => !b.menu[p.id].aktif && p.seviye <= 3).sort((x, y) => (y.talep * (1 + (h32(s.seed, b.id, y.id.length) % 30) / 100)) - (x.talep * (1 + (h32(s.seed, b.id, x.id.length) % 30) / 100))).slice(0, 3).map((p) => p.id);
  const oneri: string[] = []; if (m.hizmet < 60) oneri.push('Servis yavaş: vardiyaya personel ekle.'); if (m.urunKal < 60) oneri.push('Ürün kalitesi düşük: çekirdek ve tedarikçiyi iyileştir.'); if (m.fiyatMemn < 55) oneri.push('Fiyat memnuniyeti zayıf: fiyat danışmanını çalıştır.'); if (b.hijyen < 60) oneri.push('Temizlik iyileştirilmeli.'); if (!oneri.length) oneri.push('Belirgin bir sorun görünmüyor. 👏');
  a.sonuc[b.id] = { gun: now, hizmet: m.hizmet, kalite: m.urunKal, fiyat: m.fiyatMemn, tekrar: m.tekrar, istek: aday, oneri }; const t = D(s).tarif.find((x) => x.id === D(s).imza); if (t) { t.test++; void tarifTat; }
  return { ok: true, m: `Anket tamamlandı (−${c.toLocaleString('tr-TR')} ₺). ${t ? 'İmza içeceğin tadım turu da sayıldı.' : ''}` };
}
export function abBaslat(s: GameState, aId: number, bId: number, v: Degisken): Res {
  const a = A(s), sa = s.subeler.find((x) => x.id === aId), sb = s.subeler.find((x) => x.id === bId); if (!sa || !sb || aId === bId) return { ok: false, m: 'İki farklı şube seç.' }; if (a.ab && !a.ab.sonuc?.bitti) return { ok: false, m: 'Zaten süren bir test var.' }; if (sa.gecmis.length < 14 || sb.gecmis.length < 14) return { ok: false, m: 'Test için iki şubede de en az 14 günlük geçmiş gerekir.' };
  const eski: Record<string, number> = {}; for (const [id, m] of Object.entries(sb.menu)) eski[id] = m.fiyat; const ep = { sabah: sb.promo?.sabah, mutlu: sb.promo?.mutlu, kart: sb.promo?.kart }; sb.promo ??= {};
  if (v === 'fiyat10') for (const m of Object.values(sb.menu)) m.fiyat = Math.min(1.7, m.fiyat * 1.1); else if (v === 'fiyat-10') for (const m of Object.values(sb.menu)) m.fiyat = Math.max(0.7, m.fiyat * 0.9); else sb.promo[v] = true;
  a.ab = { a: aId, b: bId, degisken: v, bas: dayOf(s), bit: dayOf(s) + AB_GUN, eskiFiyat: eski, eskiPromo: ep }; return { ok: true, m: `A/B test başladı: ${sb.ad} şubesinde "${DEGISKENLER.find((x) => x.id === v)!.ad}" deneniyor, ${sa.ad} kontrol şubesi.` };
}
function geriAl(sb: Branch, ab: AB): void { for (const [id, f] of Object.entries(ab.eskiFiyat)) if (sb.menu[id as ProductId]) sb.menu[id as ProductId].fiyat = f; sb.promo ??= {}; sb.promo.sabah = ab.eskiPromo.sabah; sb.promo.mutlu = ab.eskiPromo.mutlu; sb.promo.kart = ab.eskiPromo.kart; }
export function abSonuc(s: GameState, uygula: boolean): Res {
  const ab = A(s).ab; if (!ab || !ab.sonuc?.bitti) return { ok: false, m: 'Test henüz bitmedi.' }; const sb = s.subeler.find((x) => x.id === ab.b), sa = s.subeler.find((x) => x.id === ab.a); if (!sb || !sa) { A(s).ab = null; return { ok: false, m: 'Şube bulunamadı.' }; }
  if (uygula) { for (const x of s.subeler) { if (x === sb) continue; if (ab.degisken === 'fiyat10') for (const m of Object.values(x.menu)) m.fiyat = Math.min(1.7, m.fiyat * 1.1); else if (ab.degisken === 'fiyat-10') for (const m of Object.values(x.menu)) m.fiyat = Math.max(0.7, m.fiyat * 0.9); else { x.promo ??= {}; x.promo[ab.degisken as 'sabah'] = true; } } ab.sonuc.uygulandi = true; A(s).ab = null; return { ok: true, m: 'Değişiklik tüm şubelere uygulandı.' }; }
  geriAl(sb, ab); A(s).ab = null; return { ok: true, m: 'Değişiklik geri alındı.' };
}
hooks.gunOnce.push((s) => {
  const ab = A(s).ab; if (!ab || ab.sonuc?.bitti || dayOf(s) < ab.bit) return; const sa = s.subeler.find((x) => x.id === ab.a), sb = s.subeler.find((x) => x.id === ab.b); if (!sa || !sb) { A(s).ab = null; return; }
  const top = (b: Branch, bas: number, bit: number, f: (r: Branch['gecmis'][number]) => number): number => b.gecmis.filter((r) => r.gun >= bas && r.gun < bit).reduce((x, r) => x + f(r), 0), oran = (b: Branch, f: (r: Branch['gecmis'][number]) => number): number => { const once = top(b, ab.bas - AB_GUN, ab.bas, f), son = top(b, ab.bas, ab.bit, f); return once ? son / once : 1; };
  const lift = (f: (r: Branch['gecmis'][number]) => number): number => oran(sb, f) / Math.max(0.01, oran(sa, f)) - 1; ab.sonuc = { ciro: lift((r) => r.toplamGelir), kar: lift((r) => r.kar), musteri: lift((r) => r.musteri), bitti: true }; s.log.unshift(`🧪 A/B test bitti: ${DEGISKENLER.find((x) => x.id === ab.degisken)!.ad} — kâr farkı %${Math.round(ab.sonuc.kar * 100)}`);
});
void PRODUCT;
