import { gauss, rand, randInt } from '../core/rng';
import { ensureCash } from './loans';
import { TL, type Money } from '../core/money';
import type { GameEvent, GameState, Order, Project } from '../core/types';
import { MATERIALS, STAGES, material, supplier } from '../data';
import { projectedMonthlyCost } from './finance';
import { post } from './ledger';

const SPLIT_MAT = 0.55;
import { stageDays as stageDaysOf } from './construction';
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const hasRole = (s: GameState, role: string) => s.staff.some((x) => x.type === role);

/** Birim fiyat (kuruş): temel fiyat × makro malzeme endeksi × malzemeye özgü sapma × tedarikçi çarpanı (satın alma sorumlusu %3 indirim). */
export function unitPrice(s: GameState, matId: string, supId: string): Money {
  const m = material(matId)!, sp = supplier(supId)!;
  return Math.round(TL(m.priceTL) * (s.macro.materialIndex / 100) * (s.matPrice[matId] ?? 1) * sp.price * (hasRole(s, 'satin_alma') ? 0.97 : 1));
}
export const leadDays = (s: GameState, supId: string) => Math.max(1, supplier(supId)!.lead - (hasRole(s, 'satin_alma') ? 1 : 0));
export const stockQty = (s: GameState, id: string) => s.stock[id]?.qty ?? 0;
export const incomingQty = (s: GameState, id: string) => s.orders.filter((o) => o.material === id).reduce((a, o) => a + o.qty, 0);

/** Bir aşama için toplam malzeme ihtiyacı: bütçedeki malzeme payı, plan fiyatlarıyla alınacak miktara çevrilir. */
export function stageNeeds(p: Project, stageIdx: number): [string, number][] {
  const b = p.build, st = STAGES[stageIdx]; if (!b || !st?.materials?.length) return [];
  return st.materials.map(([id, frac]) => [id, (b.stageBudget[stageIdx]! * SPLIT_MAT * frac) / (TL(material(id)!.priceTL) * (b.priceBase.mat / 100))] as [string, number]);
}

export function placeOrder(s: GameState, matId: string, qty: number, supId: string, events: GameEvent[]): { ok: true; order: Order } | { ok: false; error: string } {
  if (!material(matId) || !supplier(supId)) return { ok: false, error: 'Geçersiz malzeme veya tedarikçi.' };
  if (!(qty > 0) || !isFinite(qty)) return { ok: false, error: 'Miktar sıfırdan büyük olmalı.' };
  const price = unitPrice(s, matId, supId), cost = Math.round(price * qty);
  if (!s.company || s.company.cash < cost) return { ok: false, error: 'Sipariş için yeterli nakit yok.' };
  const sp = supplier(supId)!, delayed = rand(s.rng, 'construction') > sp.reliability, extra = delayed ? randInt(s.rng, 'construction', 3, 8) : 0;
  post(s, 'malzeme', -cost, { memo: `${material(matId)!.label} · ${sp.label}` });
  const o: Order = { id: s.nextId++, material: matId, qty, unitPrice: price, supplier: supId, placedDay: s.clock.day, arriveDay: s.clock.day + leadDays(s, supId) + extra, delayed, quality: sp.quality };
  s.orders.push(o);
  if (delayed) events.push({ type: 'SUPPLIER_DELAY', day: s.clock.day, data: { supplier: sp.label, material: matId, days: extra } });
  return { ok: true, order: o };
}

/** Her gün: gelen siparişler stoğa girer (kalite ağırlıklı ortalama). */
export function deliveries(s: GameState, events: GameEvent[]): void {
  if (!s.orders.length) return;
  const due = s.orders.filter((o) => o.arriveDay <= s.clock.day); if (!due.length) return;
  s.orders = s.orders.filter((o) => o.arriveDay > s.clock.day);
  for (const o of due) {
    const cur = (s.stock[o.material] ??= { qty: 0, qual: 0, cost: o.unitPrice }), tot = cur.qty + o.qty;
    cur.qual = tot > 0 ? (cur.qual * cur.qty + o.quality * o.qty) / tot : o.quality; cur.cost = tot > 0 ? (cur.cost * cur.qty + o.unitPrice * o.qty) / tot : o.unitPrice; cur.qty = tot;
    events.push({ type: 'MATERIAL_DELIVERED', day: s.clock.day, data: { material: o.material, qty: o.qty } });
  }
}

/** Otomatik satın alma: aktif projelerin mevcut (ve yaklaşan) aşama ihtiyacındaki eksiği tercih edilen tedarikçiden sipariş eder. */
export function autoBuy(s: GameState, p: Project, events: GameEvent[]): void {
  const c = s.company; if (!c || !c.procurement.auto || !p.build) return;
  const b = p.build, sup = c.procurement.supplier, need = new Map<string, number>();
  const add = (idx: number, f: number) => { for (const [id, q] of stageNeeds(p, idx)) need.set(id, (need.get(id) ?? 0) + q * f); };
  const r = 1 - b.progress; if (b.stage <= 17) add(b.stage, r);
  // Sonraki aşamanın ilk günlerinin malzemesi tedarik süresi kadar önceden sipariş edilir (bekleme olmasın)
  if (b.stage < 17) { const nd = stageDaysOf(p)[b.stage + 1] || 1; add(b.stage + 1, Math.min(1, (leadDays(s, sup) + 6) / nd)); }
  // diğer aktif projelerin aynı malzeme ihtiyacı kendi çağrısında hesaplanır; burada stok + yoldaki dikkate alınır
  const reserve = projectedMonthlyCost(s) * 2; // iki aylık sabit gider nakitte kalsın
  let budget = Math.max(0, c.cash - reserve);
  for (const [id, q] of need) {
    const deficit = q - stockQty(s, id) - incomingQty(s, id); if (deficit <= 1e-6) continue;
    const price = unitPrice(s, id, sup); let qty = Math.ceil(deficit * 1000) / 1000;
    if (price * qty > budget) { if (p.build && p.status === 'insaat') { ensureCash(s, p.id, Math.round(price * qty) + reserve, events); budget = Math.max(0, c.cash - reserve); } if (price * qty > budget) qty = Math.floor((budget / price) * 1000) / 1000; } if (qty <= 0) continue;
    const r2 = placeOrder(s, id, qty, sup, events); if (r2.ok) budget -= Math.round(price * qty);
  }
}

/** Aylık: malzeme fiyatları ortalamaya dönen rastgele yürüyüşle oynar; ani sıçramalar haber olur. */
export function materialsMonthly(s: GameState, events: GameEvent[]): void {
  void events;
  for (const m of MATERIALS) {
    const cur = s.matPrice[m.id] ?? 1; const shock = rand(s.rng, 'market') < 0.015 ? (rand(s.rng, 'market') < 0.5 ? 0.14 : -0.1) : 0;
    const next = clamp(cur * (1 + (1 - cur) * 0.12 + gauss(s.rng, 'market') * m.vol + shock), 0.7, 1.7); s.matPrice[m.id] = +next.toFixed(4);
    { const hist = ((s.matHist ??= {})[m.id] ??= []); hist.push(+(next * (s.macro.materialIndex / 100)).toFixed(3)); if (hist.length > 36) hist.shift(); }
    if (shock > 0) { const text = `${m.label} fiyatı aniden yükseldi.`; s.news.unshift({ day: s.clock.day, text, tone: 'warn' }); if (s.news.length > 30) s.news.length = 30; events.push({ type: 'MACRO_NEWS', day: s.clock.day, data: { regime: s.macro.regime, text, tone: 'warn' } }); }
  }
}
