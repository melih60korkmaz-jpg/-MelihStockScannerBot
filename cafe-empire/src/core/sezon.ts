/** Sezon menüleri, mutfak özeti (tazelik, israf, hazırlık) ve yeni ürün pilot dönemi. */
import { INGREDIENTS, ING, PRODUCTS, PRODUCT, type ProductDef, type ProductId } from '../data/catalog';
import { hooks, levelOf } from './sim';
import { dateOf, dayOf } from './calendar';
import { toggleProduct } from './actions';
import { nearestExpiry } from './supply';
import { D, yaz } from './derin';
import type { Branch, GameState } from './types';

export interface Res { ok: boolean; m: string }
export const SEZONLAR = [
  { id: 'kis', ad: 'Kış', ik: '❄️', aylar: [11, 0, 1] }, { id: 'ilkbahar', ad: 'İlkbahar', ik: '🌸', aylar: [2, 3, 4] },
  { id: 'yaz', ad: 'Yaz', ik: '☀️', aylar: [5, 6, 7] }, { id: 'sonbahar', ad: 'Sonbahar', ik: '🍂', aylar: [8, 9, 10] },
] as const;
export const sezonOf = (ay: number): (typeof SEZONLAR)[number] => SEZONLAR.find((x) => (x.aylar as readonly number[]).includes(ay)) ?? SEZONLAR[0]!;
/** Bir sonraki sezon değişimine kalan gün. */
export function sezonKalan(s: GameState): number { const now = dayOf(s), cur = sezonOf(dateOf(now).ay).id; for (let g = now; g < now + 120; g++) if (sezonOf(dateOf(g).ay).id !== cur) return g - now; return 90; }
export const sezonUrunleri = (ay: number): ProductDef[] => PRODUCTS.filter((p) => p.sezon?.includes(ay));
export function sezonOneri(s: GameState, b: Branch): { ac: ProductDef[]; kapat: ProductDef[]; yaklasan: ProductDef[] } {
  const ay = dateOf(dayOf(s)).ay, sonraki = (ay + 1) % 12, lv = levelOf(s);
  return { ac: sezonUrunleri(ay).filter((p) => !b.menu[p.id]?.aktif && lv >= p.seviye), kapat: PRODUCTS.filter((p) => p.sezon && !p.sezon.includes(ay) && b.menu[p.id]?.aktif), yaklasan: sezonUrunleri(sonraki).filter((p) => !p.sezon!.includes(ay) && !b.menu[p.id]?.aktif) };
}
export function sezonMenuAc(s: GameState, b: Branch): Res {
  const o = sezonOneri(s, b); if (!o.ac.length) return { ok: false, m: 'Açılacak sezon ürünü yok (hepsi menüde ya da seviyen yetmiyor).' }; const acilan: string[] = [];
  for (const p of o.ac) { const r = toggleProduct(s, b, p.id); if (r.ok) acilan.push(p.ad); }
  return acilan.length ? { ok: true, m: `Sezon menüsüne eklendi: ${acilan.join(', ')}.` } : { ok: false, m: 'Ürünler eklenemedi (kasa yetersiz olabilir).' };
}
export function sezonDisiKapat(s: GameState, b: Branch): Res { const o = sezonOneri(s, b); const k: string[] = []; for (const p of o.kapat) if (toggleProduct(s, b, p.id).ok) k.push(p.ad); return k.length ? { ok: true, m: `Sezon dışı ürünler menüden çıkarıldı: ${k.join(', ')}.` } : { ok: false, m: 'Kapatılacak sezon dışı ürün yok.' }; }
/* ---------- Mutfak ---------- */
export interface Taze { id: string; ad: string; ik: string; stok: number; gun: number | null; kullanimGun: number; risk: boolean }
export interface Mutfak { taze: Taze[]; hazirlik: Array<{ id: ProductId; ad: string; sure: number; adet: number; toplamDk: number }>; fire30: number; toplamDk: number }
export function mutfakOzet(s: GameState, b: Branch): Mutfak {
  const now = dayOf(s);
  const taze = INGREDIENTS.filter((d) => d.omur > 0 && d.omur <= 30).map((d) => { const stok = b.stok[d.id] ?? 0, kul = Math.max(1e-6, b.kullanim[d.id] ?? 0), gun = nearestExpiry(b, d.id, now), kg = stok / kul; return { id: d.id, ad: d.ad, ik: d.ikon, stok, gun, kullanimGun: kg, risk: gun !== null && stok > 0 && kg > gun + 0.5 }; });
  const hazirlik = (Object.entries(b.sonAdet) as Array<[ProductId, number]>).filter(([, n]) => n > 0).map(([id, n]) => ({ id, ad: PRODUCT[id].ad, sure: PRODUCT[id].sure, adet: n, toplamDk: PRODUCT[id].sure * n / 60 })).sort((a, z) => z.toplamDk - a.toplamDk);
  return { taze, hazirlik, fire30: b.gecmis.slice(-30).reduce((a, r) => a + r.gider.fire, 0), toplamDk: hazirlik.reduce((a, x) => a + x.toplamDk, 0) };
}
void ING;
/* ---------- Pilot şube: yeni ürünü önce bir şubede dene ---------- */
export interface Pilot { sube: number; bas: number; bit: number; adet: number; gun: number; bitti: boolean; iyi?: boolean; gunAdet?: number; pay?: number; yayildi?: boolean }
export const PILOT_GUN = 14;
export const pilotlar = (s: GameState): Record<string, Pilot> => (D(s).pilot ??= {});
export function pilotBaslat(s: GameState, b: Branch, id: ProductId): Res {
  const pl = pilotlar(s); if (s.subeler.length < 2) return { ok: false, m: 'Pilot için en az 2 şube gerekir.' }; if (pl[id] && !pl[id]!.yayildi) return { ok: false, m: 'Bu ürün için pilot zaten var.' }; if (b.menu[id].aktif) return { ok: false, m: 'Ürün bu şubede zaten menüde.' };
  const r = toggleProduct(s, b, id); if (!r.ok) return r; pl[id] = { sube: b.id, bas: dayOf(s), bit: dayOf(s) + PILOT_GUN, adet: 0, gun: 0, bitti: false }; yaz(s, b, `${PRODUCT[id].ad} için ${PILOT_GUN} günlük pilot başladı.`); return { ok: true, m: `${PRODUCT[id].ad} ${b.ad} şubesinde ${PILOT_GUN} günlük pilota alındı.` };
}
export function pilotYay(s: GameState, id: ProductId): Res {
  const p = pilotlar(s)[id]; if (!p || !p.bitti) return { ok: false, m: 'Pilot henüz bitmedi.' }; const dig: string[] = []; for (const b of s.subeler) if (b.id !== p.sube && !b.menu[id].aktif && toggleProduct(s, b, id).ok) dig.push(b.ad);
  p.yayildi = true; return { ok: true, m: dig.length ? `${PRODUCT[id].ad} ${dig.length} şubeye yayıldı.` : `${PRODUCT[id].ad}: yayılacak şube kalmadı.` };
}
hooks.gunOnce.push((s) => {
  const now = dayOf(s), pl = D(s).pilot; if (!pl) return;
  for (const [id, p] of Object.entries(pl)) {
    if (p.bitti) continue; const b = s.subeler.find((x) => x.id === p.sube); if (!b) { delete pl[id]; continue; } p.adet += b.sonAdet[id as ProductId] ?? 0; p.gun++;
    if (now >= p.bit) { const aktif = PRODUCTS.filter((q) => b.menu[q.id].aktif && q.id !== id), ort = aktif.reduce((a, q) => a + (b.sonAdet[q.id] ?? 0), 0) / Math.max(1, aktif.length); const musteri = b.gecmis.slice(-p.gun).reduce((a, r) => a + r.musteri, 0); p.gunAdet = p.adet / Math.max(1, p.gun); p.pay = musteri ? p.adet / musteri : 0; p.iyi = p.gunAdet >= Math.max(1, ort * 0.8) || p.pay >= 0.05; p.bitti = true; s.log.unshift(`🧪 Pilot bitti: ${PRODUCT[id as ProductId].ad} ${p.iyi ? 'tuttu!' : 'beklenen ilgiyi görmedi.'}`); yaz(s, b, `${PRODUCT[id as ProductId].ad} pilotu ${p.iyi ? 'başarılı' : 'zayıf'} sonuçlandı (günde ${p.gunAdet.toFixed(1)} adet).`); }
  }
});
