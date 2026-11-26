/** İstatistik merkezi: seriler, eğilim, tahmin, hafta günü, ürün sıralaması, menü mühendisliği, neden açıklamaları. Salt okunur (günlük ürün kaydı hariç). */
import { cityById } from '../data/turkey';
import { PRODUCTS, PRODUCT, type ProductId } from '../data/catalog';
import { hooks, sellPrice, unitCost } from './sim';
import { dateOf, dayOf } from './calendar';
import { D, semtOlaylari } from './derin';
import type { Branch, DayReport, GameState } from './types';

export type Metrik = 'ciro' | 'kar' | 'musteri' | 'memnuniyet' | 'kayip';
export const METRIKLER: Array<[Metrik, string, string]> = [['ciro', 'Ciro', '₺'], ['kar', 'Net kâr', '₺'], ['musteri', 'Müşteri', 'kişi'], ['memnuniyet', 'Memnuniyet', ''], ['kayip', 'Kaçan müşteri', 'kişi']];
const deger = (r: DayReport, m: Metrik): number => (m === 'ciro' ? r.toplamGelir : m === 'kar' ? r.kar : m === 'musteri' ? r.musteri : m === 'memnuniyet' ? r.memnuniyet : r.kayip);
/** Son `gun` günün serisi (eskiden yeniye). b yoksa şirket geneli. */
export function seri(s: GameState, b: Branch | null, m: Metrik, gun: number): Array<{ gun: number; v: number }> {
  const l = (b ? b.gecmis : s.rapor).slice(-gun); return l.map((r) => ({ gun: r.gun, v: deger(r, m) }));
}
export interface Egilim { ort: number; min: number; max: number; son: number; egim: number; degisim: number; enIyiGun: number; enKotuGun: number }
export function egilim(a: Array<{ gun: number; v: number }>): Egilim {
  const n = a.length; if (!n) return { ort: 0, min: 0, max: 0, son: 0, egim: 0, degisim: 0, enIyiGun: -1, enKotuGun: -1 };
  const v = a.map((x) => x.v), ort = v.reduce((p, q) => p + q, 0) / n, mx = Math.max(...v), mn = Math.min(...v); let sx = 0, sy = 0, sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sx += i; sy += v[i]!; sxy += i * v[i]!; sxx += i * i; }
  const den = n * sxx - sx * sx, egim = den ? (n * sxy - sx * sy) / den : 0, h = Math.floor(n / 2), ilk = v.slice(0, h).reduce((p, q) => p + q, 0) / Math.max(1, h), son = v.slice(h).reduce((p, q) => p + q, 0) / Math.max(1, n - h);
  return { ort, min: mn, max: mx, son: v[n - 1]!, egim, degisim: ilk ? (son - ilk) / Math.abs(ilk) : 0, enIyiGun: a[v.indexOf(mx)]!.gun, enKotuGun: a[v.indexOf(mn)]!.gun };
}
/** Doğrusal eğilimle ileriye tahmin (hafta günü etkisi ile ayarlı). */
export function tahmin(a: Array<{ gun: number; v: number }>, n = 7, negatifOlabilir = false): number[] {
  const k = a.length; if (k < 4) return []; const e = egilim(a), v = a.map((x) => x.v), ort = e.ort, hg = Array.from({ length: 7 }, () => ({ t: 0, n: 0 }));
  for (const x of a) { const g = dateOf(x.gun).haftaGun; hg[g]!.t += x.v; hg[g]!.n++; } const adj = hg.map((x) => (x.n && ort ? (x.t / x.n) / ort : 1)); const baz = v.slice(-Math.min(7, k)).reduce((p, q) => p + q, 0) / Math.min(7, k);
  return Array.from({ length: n }, (_, i) => { const gun = a[k - 1]!.gun + 1 + i, g = dateOf(gun).haftaGun, v0 = baz + e.egim * (i + 1) * 0.6; const t = v0 * (adj[g] ?? 1); return negatifOlabilir ? t : Math.max(0, t); });
}
export const HAFTA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
export function haftaGunOrt(s: GameState, b: Branch | null, m: Metrik, gun = 56): number[] {
  const a = seri(s, b, m, gun), t = Array(7).fill(0) as number[], n = Array(7).fill(0) as number[]; for (const x of a) { const g = dateOf(x.gun).haftaGun; t[g]! += x.v; n[g]!++; } return t.map((x, i) => (n[i] ? x / n[i]! : 0));
}
/* ---------- Günlük ürün kaydı ---------- */
export interface GunKayit { gun: number; sube: Record<number, Partial<Record<ProductId, number>>> }
hooks.gunOnce.push((s) => {
  const d = D(s), l = (d.gun90 ??= []), kayit: GunKayit = { gun: dayOf(s) - 1, sube: {} }; for (const b of s.subeler) if (b.kuruldu) kayit.sube[b.id] = { ...b.sonAdet };
  l.push(kayit); if (l.length > 90) l.shift();
});
export interface UrunSatir { id: ProductId; adet: number; gelir: number; marj: number; pay: number }
export function urunSirasi(s: GameState, b: Branch | null, gun = 30): UrunSatir[] {
  const l = (D(s).gun90 ?? []).slice(-gun), top: Partial<Record<ProductId, number>> = {}; for (const k of l) for (const [bid, m] of Object.entries(k.sube)) { if (b && +bid !== b.id) continue; for (const [id, n] of Object.entries(m) as Array<[ProductId, number]>) top[id] = (top[id] ?? 0) + (n ?? 0); }
  const ref = b ?? s.subeler[0]; const tot = Object.values(top).reduce((a, x) => a + (x ?? 0), 0) || 1;
  return (Object.entries(top) as Array<[ProductId, number]>).map(([id, adet]) => { const fiyat = ref ? sellPrice(s, ref, id) : PRODUCT[id].fiyat, mal = ref ? unitCost(s, id, cityById(ref.city)) : 0; return { id, adet, gelir: adet * fiyat, marj: fiyat - mal, pay: adet / tot }; }).sort((a, z) => z.gelir - a.gelir);
}
/* ---------- Menü mühendisliği ---------- */
export type MenuSinif = 'yildiz' | 'inek' | 'bilmece' | 'kopek';
export const MENU_SINIF: Record<MenuSinif, { ad: string; ik: string; ac: string }> = {
  yildiz: { ad: 'Yıldız', ik: '⭐', ac: 'Hem çok satıyor hem kârlı: öne çıkar, kalitesini koru.' },
  inek: { ad: 'Nakit inek', ik: '🐄', ac: 'Çok satıyor ama marjı düşük: fiyatı hafifçe artır ya da maliyeti düşür.' },
  bilmece: { ad: 'Bilmece', ik: '🧩', ac: 'Kârlı ama az satıyor: tanıt, kampanyada öne çıkar.' },
  kopek: { ad: 'Sorunlu', ik: '🐶', ac: 'Az satıyor ve marjı düşük: menüden çıkarmayı düşün.' },
};
export interface MenuSatir extends UrunSatir { sinif: MenuSinif }
export function menuMuhendisligi(s: GameState, b: Branch, gun = 30): MenuSatir[] {
  const l = urunSirasi(s, b, gun).filter((x) => b.menu[x.id]?.aktif); if (!l.length) return [];
  const ortPay = 1 / l.length * 0.7, ortMarj = l.reduce((a, x) => a + x.marj * x.adet, 0) / Math.max(1, l.reduce((a, x) => a + x.adet, 0));
  return l.map((x) => ({ ...x, sinif: x.pay >= ortPay ? (x.marj >= ortMarj ? 'yildiz' : 'inek') : (x.marj >= ortMarj ? 'bilmece' : 'kopek') }));
}
/* ---------- Şube tablosu ---------- */
export interface SubeSatir { b: Branch; ciro: number; kar: number; musteri: number; memn: number; marj: number }
export function subeTablosu(s: GameState, gun = 30): SubeSatir[] {
  return s.subeler.filter((b) => b.kuruldu).map((b) => { const l = b.gecmis.slice(-gun), ciro = l.reduce((a, r) => a + r.toplamGelir, 0), kar = l.reduce((a, r) => a + r.kar, 0), mus = l.reduce((a, r) => a + r.musteri, 0); return { b, ciro, kar, musteri: mus, memn: l.length ? l.reduce((a, r) => a + r.memnuniyet, 0) / l.length : b.memnuniyet, marj: ciro ? kar / ciro : 0 }; }).sort((a, z) => z.ciro - a.ciro);
}
/* ---------- Neden açıklamaları ---------- */
export function neden(s: GameState, b: Branch): string[] {
  const g = b.gecmis; if (g.length < 8) return ['Henüz yeterli veri yok (en az 8 gün).'];
  const r = g[g.length - 1]!, onc = g.slice(-8, -1), ort = onc.reduce((a, x) => a + x.toplamGelir, 0) / onc.length, d = ort ? (r.toplamGelir - ort) / ort : 0, out: string[] = [];
  out.push(Math.abs(d) < 0.05 ? `Dünkü ciro son haftaya yakın (${d >= 0 ? '+' : ''}${Math.round(d * 100)}%).` : `Dünkü ciro son haftanın ortalamasından %${Math.abs(Math.round(d * 100))} ${d > 0 ? 'yüksek' : 'düşüktü'}.`);
  const ev = semtOlaylari(s, b, r.gun); for (const e of ev) out.push(`${e.ikon} ${e.ad}: talebe ${e.talep >= 1 ? '+' : ''}${Math.round((e.talep - 1) * 100)}% etki.`);
  const hg = haftaGunOrt(s, b, 'ciro', 56), tm = hg.reduce((a, x) => a + x, 0) / 7, k = dateOf(r.gun).haftaGun; if (tm && Math.abs(hg[k]! / tm - 1) > 0.08) out.push(`${HAFTA[k]} günleri normalde ortalamadan %${Math.abs(Math.round((hg[k]! / tm - 1) * 100))} ${hg[k]! > tm ? 'yüksek' : 'düşük'} gelir.`);
  const kayipOran = r.musteri + r.kayip ? r.kayip / (r.musteri + r.kayip) : 0, onKayip = onc.reduce((a, x) => a + x.kayip, 0) / Math.max(1, onc.reduce((a, x) => a + x.musteri + x.kayip, 0)); if (kayipOran > onKayip + 0.04) out.push(`⏱️ Dün ${r.kayip} müşteri kuyruk/stok/fiyat yüzünden kaçtı (oran %${Math.round(kayipOran * 100)}).`);
  const dm = r.memnuniyet - onc.reduce((a, x) => a + x.memnuniyet, 0) / onc.length; if (Math.abs(dm) >= 3) out.push(`🙂 Memnuniyet son haftaya göre ${dm > 0 ? '+' : ''}${dm.toFixed(1)} puan oynadı.`);
  const dd = D(s); for (const [k2, e] of Object.entries(dd.etki)) { if (e.bit <= dayOf(s)) continue; const [sc, tp] = k2.split(':'); if (sc === 'g' || sc === `b${b.id}`) out.push(`📌 Aktif etki: ${tp} ×${e.v.toFixed(2)} (${e.bit - dayOf(s)} gün).`); }
  if (b.hijyen < 50) out.push('🧽 Hijyen düşük; talebi baskılıyor.'); return out.slice(0, 6);
}
void PRODUCTS;
