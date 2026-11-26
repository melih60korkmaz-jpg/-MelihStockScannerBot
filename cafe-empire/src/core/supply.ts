import { shelfMult } from './invest';
import { INGREDIENTS, ING, type IngId } from '../data/catalog';
import { cityById, type City } from '../data/turkey';
import { dayOf } from './calendar';
import { rand } from './rng';
import type { Branch, GameState, Lot, Order } from './types';

/* ===================== Tedarikçiler, stok partileri, bozulma, sipariş ===================== */
export interface Supplier { id: string; ad: string; fiyat: number; teslim: number; guven: number; kalite: number; not: string }
export function suppliersOf(c: City): Supplier[] {
  const v = ((c.id * 37) % 7 - 3) / 100;
  return [
    { id: 'yerel', ad: `${c.ad} Toptan`, fiyat: 1.0 + v, teslim: 0, guven: 0.93, kalite: 1.0, not: 'Dengeli: güvenilir, standart fiyat.' },
    { id: 'eko', ad: 'Anadolu Ekonomik Dağıtım', fiyat: 0.87 + v, teslim: 1, guven: 0.8, kalite: 0.92, not: 'Ucuz ama geç gelebilir ve kalite daha düşük.' },
    { id: 'premium', ad: 'Gurme Tedarik', fiyat: 1.17 + v, teslim: 0, guven: 0.97, kalite: 1.1, not: 'Pahalı; yüksek kalite, çok güvenilir.' },
  ];
}
export const supplier = (c: City, id: string | undefined): Supplier => { const l = suppliersOf(c); return l.find((x) => x.id === id) ?? l[0]!; };
/** Bir paketin piyasa fiyatı (tedarikçi çarpanı hariç). */
export function ingPrice(s: GameState, id: IngId, c: City): number { const d = ING[id]; return d.fiyat * s.market.fiyat * (id === 'bean' ? s.market.bean : 1) * (0.9 + 0.2 * c.maliyet); }
export function orderCost(s: GameState, b: Branch, id: IngId, paket: number): number { const c = cityById(b.city); return ingPrice(s, id, c) * supplier(c, b.tedarikci[id]).fiyat * paket; }
export function orderStock(s: GameState, b: Branch, id: IngId, paket: number): boolean {
  const c = cityById(b.city), sup = supplier(c, b.tedarikci[id]), price = ingPrice(s, id, c) * sup.fiyat * paket; if (paket <= 0 || s.kasa < price) return false;
  s.kasa -= price; b.bugun.alim += price; const gec = s.market.mod['gecikme'] && s.market.mod['gecikme'].bit > dayOf(s) ? 3 : 0, gecikti = rand(s.rng, 'market') > sup.guven, eksik = rand(s.rng, 'market') > sup.guven + (1 - sup.guven) * 0.4;
  const o: Order = { id: s.sn++, ing: id, paket, teslim: dayOf(s) + ING[id].teslim + sup.teslim + gec + (gecikti ? 2 : 0), odenen: price, kim: sup.id, gecikti, eksik }; b.siparisler.push(o); return true;
}
function addLot(b: Branch, id: IngId, q: number, son: number, kal: number): void { const l = (b.partiler[id] ??= []); l.push({ q, son, kal }); }
export function syncLots(b: Branch, id: IngId, now: number): void {
  const l = (b.partiler[id] ??= []), stok = b.stok[id] ?? 0; let tot = l.reduce((a, x) => a + x.q, 0);
  if (tot > stok + 0.01) { let fazla = tot - stok; for (const x of l) { const d = Math.min(x.q, fazla); x.q -= d; fazla -= d; if (fazla <= 0) break; } b.partiler[id] = l.filter((x) => x.q > 0.01); } else if (tot < stok - 0.01) { const o = ING[id].omur * shelfMult(b); addLot(b, id, stok - tot, o ? now + o : 1e9, 1); }
}
/** Teslimat: gecikmiş/eksik siparişler dahil. Bozulan partileri düşer; bozulan ürünün maliyetini döndürür. */
export function deliverAll(s: GameState, log: (m: string) => void): void {
  const now = dayOf(s);
  for (const b of s.subeler) {
    const kal: Order[] = []; const c = cityById(b.city);
    for (const o of b.siparisler) {
      if (o.teslim > now) { kal.push(o); continue; } const d = ING[o.ing], sup = supplier(c, o.kim); const q = o.paket * d.paket * (o.eksik ? 0.82 : 1);
      syncLots(b, o.ing, now); b.stok[o.ing] = (b.stok[o.ing] ?? 0) + q; addLot(b, o.ing, q, d.omur ? now + d.omur * shelfMult(b) : 1e9, sup.kalite);
      if (['bean', 'milk', 'bakery', 'raw', 'tea'].includes(o.ing)) b.malKalite = b.malKalite * 0.8 + sup.kalite * 0.2;
      if (o.gecikti || o.eksik) log(`${sup.ad}: ${d.ad} siparişi ${o.gecikti ? 'geç geldi' : ''}${o.gecikti && o.eksik ? ' ve ' : ''}${o.eksik ? 'eksik teslim edildi' : ''}.`);
    }
    b.siparisler = kal;
  }
}
export function spoilage(s: GameState, b: Branch): number {
  const now = dayOf(s), c = cityById(b.city); let cost = 0;
  for (const d of INGREDIENTS) {
    syncLots(b, d.id, now); if (!d.omur) continue; const l = b.partiler[d.id] ?? []; let kaybolan = 0; for (const x of l) if (x.son <= now) { kaybolan += x.q; x.q = 0; }
    if (kaybolan > 0) { b.stok[d.id] = Math.max(0, (b.stok[d.id] ?? 0) - kaybolan); cost += kaybolan / d.paket * ingPrice(s, d.id, c) * 0.95; } b.partiler[d.id] = l.filter((x) => x.q > 0.01);
  }
  return cost;
}
export function stockValue(s: GameState, b: Branch): number { const c = cityById(b.city); return INGREDIENTS.reduce((a, d) => a + (b.stok[d.id] ?? 0) / d.paket * ingPrice(s, d.id, c), 0); }
export const holdingCost = (s: GameState, b: Branch): number => { const c = cityById(b.city); return INGREDIENTS.reduce((a, d) => a + (b.stok[d.id] ?? 0) / d.paket * ingPrice(s, d.id, c) * (['milk', 'raw', 'bakery'].includes(d.id) ? 0.0016 : 0.0005), 0); };
export function nearestExpiry(b: Branch, id: IngId, now: number): number | null { const l = b.partiler[id]; if (!l || !l.length || !ING[id].omur) return null; return Math.max(0, Math.min(...l.filter((x) => x.q > 0).map((x) => x.son)) - now); }
export function minLevel(b: Branch, id: IngId): number { const d = ING[id], k = Math.max(b.kullanim[id] ?? 0, d.paket * 0.03); return b.minStok[id] ?? k * (d.teslim + 1.2); }
export function autoOrder(s: GameState, b: Branch): void {
  for (const d of INGREDIENTS) {
    const gelen = b.siparisler.filter((o) => o.ing === d.id).reduce((a, o) => a + o.paket * d.paket, 0), k = Math.max(b.kullanim[d.id] ?? 0, d.paket * 0.03), mevcut = (b.stok[d.id] ?? 0) + gelen;
    if (mevcut < minLevel(b, d.id)) { const hedef = Math.max(minLevel(b, d.id) * 1.8, k * (d.teslim + (d.omur && d.omur < 10 ? Math.min(2.5, d.omur - 1) : 3.5))); const paket = Math.max(1, Math.ceil((hedef - mevcut) / d.paket)); orderStock(s, b, d.id, paket); }
  }
}
export interface TransferResult { ok: boolean; m: string }
export function transferStock(s: GameState, from: Branch, to: Branch, id: IngId, qty: number): TransferResult {
  if (from === to) return { ok: false, m: 'Aynı şube.' }; if (qty <= 0 || (from.stok[id] ?? 0) < qty) return { ok: false, m: 'Kaynak şubede yeterli stok yok.' }; const now = dayOf(s), d = ING[id], c = cityById(from.city);
  const ship = 400 * s.market.fiyat + (from.city !== to.city ? 1500 * s.market.fiyat : 0) + qty / d.paket * ingPrice(s, id, c) * 0.03; if (s.kasa < ship) return { ok: false, m: 'Nakliye için kasa yetersiz.' };
  s.kasa -= ship; from.bugun.gider.malzeme += 0; syncLots(from, id, now); const moved: Lot[] = []; let kalan = qty; for (const x of from.partiler[id] ?? []) { if (kalan <= 0) break; const t = Math.min(x.q, kalan); x.q -= t; kalan -= t; moved.push({ q: t, son: x.son, kal: x.kal }); }
  from.stok[id] = (from.stok[id] ?? 0) - qty; to.stok[id] = (to.stok[id] ?? 0) + qty; for (const m of moved) (to.partiler[id] ??= []).push(m); return { ok: true, m: `${Math.round(qty)} ${d.birim} ${d.ad} nakledildi (nakliye ${Math.round(ship)} ₺).` };
}
export function usageOf(b: Branch, recipes: (id: string) => Partial<Record<IngId, number>>): Partial<Record<IngId, number>> {
  const u: Partial<Record<IngId, number>> = {}; for (const id of Object.keys(b.bugun.adet)) { const r = recipes(id), n = (b.bugun.adet as Record<string, number>)[id] ?? 0; for (const k of Object.keys(r) as IngId[]) u[k] = (u[k] ?? 0) + (r[k] ?? 0) * n; } return u;
}
