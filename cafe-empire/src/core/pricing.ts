/** Fiyat danışmanı ve menü yönetimi: simülasyonun müşteri seçim modelini beklenen değerle çözer. */
import { PRODUCTS, PRODUCT, type ProductId, type ProductDef } from '../data/catalog';
import { cityById } from '../data/turkey';
import type { Branch, GameState } from './types';
import { dateOf } from './calendar';
import { dayOf } from './calendar';
import { hooks, dailyDemand, priceFactor, refPrice, unitCost, levelOf, segWeights, SEG_KEYS, SEG_ESNEKLIK, adEffect } from './sim';
import { profilBranch } from './region';

export interface Oneri { id: ProductId; simdi: number; oneri: number; fiyatSimdi: number; fiyatOneri: number; kazanc: number; neden: string }
const clamp = (v: number, a: number, z: number): number => Math.max(a, Math.min(z, v));
/** Bir menü çarpanı vektörü için beklenen günlük brüt kâr (satış − malzeme maliyeti). */
function dayProfit(s: GameState, b: Branch, mult: Record<string, number>, aktif: ProductDef[], A0: number, f0: number): number {
  const c = cityById(b.city), pf = profilBranch(b), ae = adEffect(b, dayOf(s)), month = dateOf(dayOf(s)).ay, yaz = month >= 5 && month <= 8, kis = month <= 1 || month === 11;
  const real = Object.fromEntries(aktif.map((p) => [p.id, b.menu[p.id].fiyat])) as Record<string, number>; for (const p of aktif) b.menu[p.id].fiyat = mult[p.id]!;
  const A = A0 * priceFactor(s, b, ae) / f0; for (const p of aktif) b.menu[p.id].fiyat = real[p.id]!;
  const sw = segWeights(b, c), tot = SEG_KEYS.reduce((a, k) => a + sw[k], 0), rvAv = (s.rakipler[b.city] ?? []); const rv = rvAv.length ? rvAv.reduce((a, r) => a + (r.kampanya ? r.fiyat * (1 - r.kampanya.indirim) : r.fiyat), 0) / rvAv.length : 1;
  const refK = (0.92 + 0.08 * pf.gelir); let profit = 0;
  for (const kat of ['kahve', 'yiyecek'] as const) {
    const L = aktif.filter((p) => p.kat === kat); if (!L.length) continue; const itemsPerArrival = (kat === 'kahve' ? 1.22 : 1.06) / 1.12;
    for (const k of SEG_KEYS) {
      const eks = SEG_ESNEKLIK(k) - 0.25 * (c.gelir - 1) - (b.tip === 'luks' ? 0.5 : 0); let W = 0; const w = L.map((p) => { const sez = p.soguk ? (yaz ? 1.9 : kis ? 0.35 : 1) : p.sicak ? (yaz ? 0.85 : kis ? 1.2 : 1) : 1, pr = mult[p.id]! * (ae.indirim ? 0.9 : 1) * (rv > 0 ? Math.pow(1 / rv, 0.25) : 1), x = p.talep * p.aff[SEG_KEYS.indexOf(k)]! * sez * Math.exp(-eks * (pr - 1)) * (0.85 + 0.15 * b.menu[p.id].kalite); W += x; return x; });
      L.forEach((p, i) => { const fiyat = refPrice(s, p, c) * refK * mult[p.id]!; profit += A * itemsPerArrival * (sw[k] / tot) * (w[i]! / W) * (fiyat - unitCost(s, p.id, c)); });
    }
  }
  return profit;
}
/** Her aktif ürün için kâr artıran fiyat önerisi (koordinat inişi). */
export function priceAdvice(s: GameState, b: Branch): Oneri[] {
  const lv = levelOf(s), c = cityById(b.city), aktif = PRODUCTS.filter((p) => b.menu[p.id].aktif && lv >= p.seviye); if (aktif.length < 2) return [];
  const A0 = dailyDemand(s, b), f0 = priceFactor(s, b, adEffect(b, dayOf(s))), cur: Record<string, number> = Object.fromEntries(aktif.map((p) => [p.id, b.menu[p.id].fiyat])), best = { ...cur };
  for (let pass = 0; pass < 2; pass++) for (const p of aktif) { let bm = best[p.id]!, bv = dayProfit(s, b, best, aktif, A0, f0); for (let m = 0.7; m <= 1.4001; m += 0.05) { const t = { ...best, [p.id]: Math.round(m * 100) / 100 }; const v = dayProfit(s, b, t, aktif, A0, f0); if (v > bv + 1e-6) { bv = v; bm = t[p.id]!; } } best[p.id] = bm; }
  const base = dayProfit(s, b, cur, aktif, A0, f0), res: Oneri[] = [];
  for (const p of aktif) { const pr = (m: number) => Math.round(refPrice(s, p, c) * (0.92 + 0.08 * profilBranch(b).gelir) * m), alone = { ...cur, [p.id]: best[p.id]! }, gain = dayProfit(s, b, alone, aktif, A0, f0) - base; const was = cur[p.id]!, now = best[p.id]!; if (Math.abs(now - was) < 0.03 || gain < 20) continue; res.push({ id: p.id, simdi: was, oneri: now, fiyatSimdi: pr(was), fiyatOneri: pr(now), kazanc: Math.round(gain), neden: now > was ? 'Müşteri bu üründe fiyata duyarsız; marjı artırmak kâr getirir.' : 'Fiyat yüksek: müşteri diğer ürünlere veya rakibe kayıyor; indirim hacimle telafi olur.' }); }
  return res.sort((a, z) => z.kazanc - a.kazanc);
}
export function applyAdvice(b: Branch, list: Oneri[]): number { for (const o of list) b.menu[o.id].fiyat = o.oneri; return list.length; }
/** Menü yapısı önerileri (gerçek sayılara dayalı kısa kurallar). */
export function menuAdvice(s: GameState, b: Branch): string[] {
  const lv = levelOf(s), c = cityById(b.city), out: string[] = [], month = dateOf(dayOf(s)).ay, yaz = month >= 5 && month <= 8, kis = month <= 1 || month === 11;
  const aktif = PRODUCTS.filter((p) => b.menu[p.id].aktif);
  for (const p of aktif) { const pr = Math.round(refPrice(s, p, c) * b.menu[p.id].fiyat), cost = unitCost(s, p.id, c); if ((pr - cost) / pr < 0.5 && p.kat === 'kahve' && p.id !== 'cay') out.push(`${p.ad}: marj %${Math.round((pr - cost) / pr * 100)} — fiyatı artır ya da reçete maliyetini düşür (tedarikçi).`); }
  if (yaz && !aktif.some((p) => p.soguk)) out.push('Yaz geldi: soğuk içecekler (Iced latte, Soğuk kahve, Cold brew) satışı ciddi artırır; menüye ekle.'); if (kis && !aktif.some((p) => p.id === 'sahlep')) out.push('Kış: sıcak içecekler (Sahlep, Dibek, Türk kahvesi) daha çok tutuluyor.');
  const eksikGida = !aktif.some((p) => p.kat === 'yiyecek' && p.id !== 'kurabiye'); if (eksikGida) out.push('Yiyecek çeşidi az: yanında alınan ürün sepeti büyütür (ek satış geliri).');
  const aday = PRODUCTS.filter((p) => !b.menu[p.id].aktif && lv >= p.seviye).map((p) => ({ p, m: (refPrice(s, p, c) - unitCost(s, p.id, c)) / refPrice(s, p, c) })).sort((a, z) => z.m - a.m)[0];
  if (aday && aday.m > 0.7) out.push(`Menüde olmayan ${aday.p.ad} yüksek marjlı (%${Math.round(aday.m * 100)}); eklemeyi düşün${aday.p.kurulum && !b.acilan[aday.p.id] ? ` (kurulum ${Math.round(aday.p.kurulum)} ₺)` : ''}.`);
  const dun = Object.entries(b.sonAdet).sort((a, z) => (z[1] ?? 0) - (a[1] ?? 0)); const sat = dun.reduce((a, [, n]) => a + (n ?? 0), 0); if (sat > 30 && (dun[0]?.[1] ?? 0) / sat > 0.35) out.push(`${PRODUCT[dun[0]![0] as ProductId].ad} satışların %${Math.round((dun[0]![1] ?? 0) / sat * 100)}'ini oluşturuyor: stok bitmesin, tedarikçiyi güvenilir seç.`);
  return out;
}
/** Bu şubenin menüsünü (fiyat + açık ürünler) diğer şubelere kopyalar; açılış ücreti gerektiren ürünler atlanır. */
export function copyMenu(s: GameState, from: Branch): { sube: number; atlanan: number } {
  let atlanan = 0, n = 0; const lv = levelOf(s);
  for (const to of s.subeler) { if (to === from) continue; n++; for (const p of PRODUCTS) { const f = from.menu[p.id], t = to.menu[p.id]; t.fiyat = f.fiyat; if (f.aktif !== t.aktif) { if (f.aktif && (lv < p.seviye || (p.kurulum && !to.acilan[p.id]))) { atlanan++; continue; } t.aktif = f.aktif; if (f.aktif) to.acilan[p.id] = true; } } if (PRODUCTS.filter((q) => to.menu[q.id].aktif).length < 3) for (const p of PRODUCTS.slice(0, 3)) to.menu[p.id].aktif = true; }
  return { sube: n, atlanan };
}

/** Seçilen ürün için fiyat çarpanına göre beklenen günlük brüt kâr eğrisi (diğer ürünler sabit). */
export function profitCurve(s: GameState, b: Branch, id: ProductId): { m: number; fiyat: number; kar: number }[] {
  const lv = levelOf(s), c = cityById(b.city), aktif = PRODUCTS.filter((p) => b.menu[p.id].aktif && lv >= p.seviye), p0 = PRODUCT[id]; if (!aktif.some((p) => p.id === id)) return [];
  const A0 = dailyDemand(s, b), f0 = priceFactor(s, b, adEffect(b, dayOf(s))), cur: Record<string, number> = Object.fromEntries(aktif.map((p) => [p.id, b.menu[p.id].fiyat])), out: { m: number; fiyat: number; kar: number }[] = [];
  const set = (m: number) => { const t = { ...cur, [id]: m }; return Math.round(dayProfit(s, b, t, aktif, A0, f0)); };
  for (let m = 0.7; m <= 1.4001; m += 0.05) { const mm = Math.round(m * 100) / 100; out.push({ m: mm, fiyat: Math.round(refPrice(s, p0, c) * (0.92 + 0.08 * profilBranch(b).gelir) * mm), kar: set(mm) }); } return out;
}
/** Şube müdürü fiyat yetkisi: haftada bir önerileri (en çok ±%8) uygular. */
hooks.gunSonu = (s: GameState): void => {
  if (dayOf(s) % 7 !== 0) return;
  for (const b of s.subeler) { if (!b.promo?.yetkiFiyat) continue; const m = b.staff.find((e) => e.tip === 'sube_muduru'); if (!m) continue; let n = 0; for (const o of priceAdvice(s, b)) { b.menu[o.id].fiyat = Math.round(clamp(o.oneri, o.simdi - 0.08, o.simdi + 0.08) * 100) / 100; n++; } if (n) s.log.unshift(`${m.ad} (${b.ad}) ${n} ürünün fiyatını güncelledi.`); }
  s.log = s.log.slice(0, 40);
};
