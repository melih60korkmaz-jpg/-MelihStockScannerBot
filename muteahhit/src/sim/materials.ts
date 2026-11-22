import { factoryMatMult, freightMult } from './invest';
import { addTrust, logStock, supplyAdjust } from './supplyx';
import { gauss, rand, randInt } from '../core/rng';
import { ensureCash } from './loans';
import { TL, type Money } from '../core/money';
import { cityData } from '../data';
import type { GameEvent, GameState, Order, Project } from '../core/types';
import { MATERIALS, STAGES, material, supplier } from '../data';
import { projectedMonthlyCost } from './finance';
import { post } from './ledger';
import { mgmtMatMult } from './mgmt';

const SPLIT_MAT = 0.55;
import { stageDays as stageDaysOf } from './construction';
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const hasRole = (s: GameState, role: string) => s.staff.some((x) => x.type === role);

/** Birim fiyat (kuruş): temel fiyat × makro malzeme endeksi × malzemeye özgü sapma × tedarikçi çarpanı (satın alma sorumlusu %3 indirim). */
export function unitPrice(s: GameState, matId: string, supId: string): Money {
  const m = material(matId)!, sp = supplier(supId)!;
  return Math.round(TL(m.priceTL) * (s.macro.materialIndex / 100) * (s.matPrice[matId] ?? 1) * sp.price * (hasRole(s, 'satin_alma') ? 0.97 : 1) * mgmtMatMult(s) * factoryMatMult(s, matId));
}
export const leadDays = (s: GameState, supId: string) => Math.max(1, supplier(supId)!.lead - (hasRole(s, 'satin_alma') ? 1 : 0));
export const stockQty = (s: GameState, id: string) => s.stock[id]?.qty ?? 0;
export const incomingQty = (s: GameState, id: string) => s.orders.filter((o) => o.material === id).reduce((a, o) => a + o.qty, 0);

/** Bir aşama için toplam malzeme ihtiyacı: bütçedeki malzeme payı, plan fiyatlarıyla alınacak miktara çevrilir. */
export function stageNeeds(p: Project, stageIdx: number): [string, number][] {
  const b = p.build, st = STAGES[stageIdx]; if (!b || !st?.materials?.length) return [];
  return st.materials.map(([id, frac]) => [id, (b.stageBudget[stageIdx]! * SPLIT_MAT * frac) / (TL(material(id)!.priceTL) * (b.priceBase.mat / 100))] as [string, number]);
}

/** Depo kademeleri: kapasite m³ eşdeğeri; bakım kirası aylık. Seviye 0 açık sahadır (kayıp oranı iki katı). */
export const WAREHOUSE = [
  { level: 0, label: 'Açık saha', cap: 600, upTL: 0, rentTL: 0 }, { level: 1, label: 'Kapalı depo', cap: 2500, upTL: 1_500_000, rentTL: 25_000 },
  { level: 2, label: 'Büyük depo', cap: 9000, upTL: 6_000_000, rentTL: 70_000 }, { level: 3, label: 'Lojistik merkezi', cap: 30000, upTL: 20_000_000, rentTL: 200_000 },
];
export const whLevel = (s: GameState) => s.warehouse?.level ?? 0;
export const capacityOf = (s: GameState) => WAREHOUSE[whLevel(s)]!.cap;
export const spaceOf = (matId: string, qty: number) => (material(matId)?.space ?? 0.05) * qty;
export const usedSpace = (s: GameState) => Object.entries(s.stock).reduce((a, [id, it]) => a + spaceOf(id, it.qty), 0);
export const incomingSpace = (s: GameState) => s.orders.reduce((a, o) => a + spaceOf(o.material, o.qty), 0);
export const freeSpace = (s: GameState) => Math.max(0, capacityOf(s) - usedSpace(s) - incomingSpace(s));
export const TERM_PREMIUM = { pesin: 0, vade30: 0.025, vade60: 0.05 } as const, TERM_DAYS = { pesin: 0, vade30: 30, vade60: 60 } as const;
export interface OrderOpts { term?: 'pesin' | 'vade30' | 'vade60'; rush?: boolean; dest?: string; contractId?: number; lockedUnit?: Money }
export interface OrderQuote { ok: boolean; error?: string; unit: Money; goods: Money; discount: Money; premium: Money; freight: Money; total: Money; lead: number; space: number; mismatch: boolean }
const regionOf = (cityId: string) => cityData(cityId)?.province.region;
/** Sipariş teklifi: birim fiyat, toplu indirim, vade farkı, nakliye (bölge uyumsuzluğu ve ekspres ek ücret), teslim süresi. Para hareketi yok. */
export function quoteOrder(s: GameState, matId: string, supId: string, qty: number, o: OrderOpts = {}): OrderQuote {
  const empty: OrderQuote = { ok: false, unit: 0, goods: 0, discount: 0, premium: 0, freight: 0, total: 0, lead: 0, space: 0, mismatch: false };
  const m = material(matId), sp = supplier(supId); if (!m || !sp) return { ...empty, error: 'Geçersiz malzeme veya tedarikçi.' };
  if (!(qty > 0) || !isFinite(qty)) return { ...empty, error: 'Miktar sıfırdan büyük olmalı.' };
  const term = o.term ?? 'pesin'; if (!sp.terms.includes(term)) return { ...empty, error: `${sp.label} bu ödeme koşulunu sunmuyor.` };
  const dest = o.dest ?? s.company?.startCity ?? 'ankara', mismatch = !sp.regions.includes(regionOf(dest) ?? ''), space = spaceOf(matId, qty);
  if (space > sp.cap) return { ...empty, error: `${sp.label} tek seferde en çok ${sp.cap} m³ teslim eder (bu sipariş ${space.toFixed(0)} m³).`, space, mismatch };
  const adj = supplyAdjust(s, matId, supId); if (adj.blocked && o.contractId === undefined) return { ...empty, error: adj.blocked };
  const unit = o.lockedUnit ?? Math.round(unitPrice(s, matId, supId) * adj.price * (supId === 'ithal' ? 1 + (s.macro.inflation / 100) * 0.15 : 1)), gross = Math.round(unit * qty);
  const discount = o.lockedUnit !== undefined ? 0 : Math.round(gross * (gross >= TL(20_000_000) * s.costIndex ? 0.04 : gross >= TL(5_000_000) * s.costIndex ? 0.02 : 0)), goods = gross - discount, premium = Math.round(goods * TERM_PREMIUM[term]);
  const freight = Math.round(goods * (0.03 + (mismatch ? 0.04 : 0) + (o.rush ? 0.06 : 0)) * freightMult(s)), lead = Math.max(1, leadDays(s, supId) + (mismatch ? 3 : 0) - (o.rush ? 2 : 0) + adj.lead);
  return { ok: true, unit, goods, discount, premium, freight, total: goods + premium + freight, lead, space, mismatch };
}

export function placeOrder(s: GameState, matId: string, qty: number, supId: string, events: GameEvent[], o: OrderOpts = {}): { ok: true; order: Order } | { ok: false; error: string } {
  const q = quoteOrder(s, matId, supId, qty, o); if (!q.ok) return { ok: false, error: q.error ?? 'Sipariş verilemedi.' };
  if (q.space > freeSpace(s) + 1e-9 && o.contractId === undefined) return { ok: false, error: `Depo kapasitesi yetersiz: ${freeSpace(s).toFixed(0)} m³ boş, sipariş ${q.space.toFixed(0)} m³.` };
  const term = o.term ?? 'pesin'; if (!s.company || (term === 'pesin' && s.company.cash < q.total)) return { ok: false, error: 'Sipariş için yeterli nakit yok.' };
  const sp = supplier(supId)!, delayed = rand(s.rng, 'construction') > sp.reliability, extra = delayed ? randInt(s.rng, 'construction', 3, 8) : 0, lbl = `${material(matId)!.label} · ${sp.label}`;
  if (term === 'pesin') { post(s, 'malzeme', -(q.goods + q.premium), { memo: lbl }); if (q.freight > 0) post(s, 'malzeme', -q.freight, { memo: `Nakliye: ${lbl}` }); }
  else (s.payables ??= []).push({ id: s.nextId++, amount: q.total, dueDay: s.clock.day + TERM_DAYS[term], memo: `${lbl} (${term === 'vade30' ? '30' : '60'} gün vadeli)`, late: 0 });
  const o2: Order = { id: s.nextId++, material: matId, qty, unitPrice: Math.round(q.total / qty), supplier: supId, placedDay: s.clock.day, arriveDay: s.clock.day + q.lead + extra, delayed, quality: sp.quality, freight: q.freight, term, ...(o.dest ? { dest: o.dest } : {}), ...(o.rush ? { rush: true } : {}), ...(o.contractId !== undefined ? { contractId: o.contractId } : {}) };
  s.orders.push(o2); addTrust(s, supId, 0.4, q.goods);
  if (delayed) events.push({ type: 'SUPPLIER_DELAY', day: s.clock.day, data: { supplier: sp.label, material: matId, days: extra } });
  return { ok: true, order: o2 };
}

/** Her gün: gelen siparişler stoğa girer (kalite ağırlıklı ortalama). Güvenilmez tedarikçilerde eksik ya da hatalı teslimat çıkabilir; hak ediş iade/indirim olarak işlenir. */
export function deliveries(s: GameState, events: GameEvent[]): void {
  if (!s.orders.length) return;
  const due = s.orders.filter((o) => o.arriveDay <= s.clock.day); if (!due.length) return;
  s.orders = s.orders.filter((o) => o.arriveDay > s.clock.day);
  for (const o of due) {
    const sp = supplier(o.supplier), rel = sp?.reliability ?? 0.9, roll = rand(s.rng, 'construction'); let qty = o.qty, qual = o.quality, issue: 'eksik' | 'hatali' | null = null;
    if (o.contractId === undefined && roll < (1 - rel) * 0.35) { issue = 'eksik'; qty = o.qty * (0.82 + rand(s.rng, 'construction') * 0.1); }
    else if (o.contractId === undefined && roll < (1 - rel) * 0.6) { issue = 'hatali'; qual -= 1; }
    if (issue) {
      const credit = Math.round(issue === 'eksik' ? (o.qty - qty) * o.unitPrice * 0.7 : o.qty * o.unitPrice * 0.03);
      if (credit > 0) { const pay = (s.payables ?? []).find((x) => x.memo.startsWith(`${material(o.material)!.label} · ${sp?.label}`) && x.amount >= credit); if (pay) pay.amount -= credit; else post(s, 'malzeme', credit, { memo: `${issue === 'eksik' ? 'Eksik teslimat' : 'Hatalı malzeme'} iadesi: ${sp?.label ?? ''}` }); }
      events.push({ type: 'MATERIAL_ISSUE', day: s.clock.day, data: { material: o.material, supplier: sp?.label ?? '', kind: issue, qty: Math.round(o.qty - qty) } });
    }
    const cur = (s.stock[o.material] ??= { qty: 0, qual: 0, cost: o.unitPrice }), tot = cur.qty + qty;
    cur.qual = tot > 0 ? (cur.qual * cur.qty + qual * qty) / tot : qual; cur.cost = tot > 0 ? (cur.cost * cur.qty + o.unitPrice * qty) / tot : o.unitPrice; cur.qty = tot;
    logStock(s, o.material, qty, 'giris', qty * o.unitPrice, sp?.label); if (issue) addTrust(s, o.supplier, -1.5); else addTrust(s, o.supplier, 0.3);
    events.push({ type: 'MATERIAL_DELIVERED', day: s.clock.day, data: { material: o.material, qty } });
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
    { const sp = material(id)!.space, free = freeSpace(s), capQ = supplier(sup)?.cap ?? 1e9; if (sp > 0) qty = Math.min(qty, Math.floor((Math.min(free, capQ) / sp) * 1000) / 1000); if (qty <= 1e-6) continue; }
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
