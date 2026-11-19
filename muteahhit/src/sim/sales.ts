import { gauss, rand, rand as rnd } from '../core/rng';
import type { Money } from '../core/money';
import type { GameEvent, GameState, Project, Receivable, SalesPolicy, Unit } from '../core/types';
import { districtData } from '../data';
import { post } from './ledger';
import { planProject } from './projects';

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
function seeded(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const AVG_AREA: Record<string, number> = { mustakil: 0, apartman: 95, site: 110, villa: 220, rezidans: 75, luks: 140, ofis: 70, is_merkezi: 90, fabrika: 0, depo: 0 };
const SPEED: Record<string, number> = { mustakil: 0.8, apartman: 1, site: 1.05, villa: 0.5, rezidans: 0.9, luks: 0.55, ofis: 0.7, is_merkezi: 0.6, fabrika: 0.3, depo: 0.35 };
export const PRESALE_DISCOUNT = 0.9, CASH_DISCOUNT = 0.96, INSTALLMENT_MARKUP = 1.06, DOWN_TAKSIT = 0.25, DOWN_PRESALE = 0.4, KAPORA = 0.05, AGENT_FEE = 0.025, BULK = 0.92;
export const WARRANTY_DAYS = 730;
export const defaultSales = (): SalesPolicy => ({ priceMult: 1, agent: false, installments: true, presale: false, contract: 0, commission: 0, sold: 0 });

const rooms = (a: number, use: string) => (use !== 'konut' ? 'işyeri' : a < 55 ? '1+1' : a < 80 ? '2+1' : a < 110 ? '3+1' : a < 150 ? '4+1' : '5+1');

/** Projeden daireler üretir (tohumdan deterministik; oyun RNG'sini tüketmez). Toplam alan = satılabilir alan. */
export function generateUnits(s: GameState, p: Project): Unit[] {
  const r = seeded(p.designSeed ^ 0x51ed), avg = AVG_AREA[p.type] ?? 90;
  const n = avg > 0 ? Math.max(1, Math.round(p.satilabilir / avg)) : p.type === 'mustakil' ? 1 : Math.max(1, Math.min(4, Math.round(p.satilabilir / 1500)));
  const w = Array.from({ length: n }, () => 0.8 + r() * 0.4), sw = w.reduce((a, x) => a + x, 0), per = Math.ceil(n / Math.max(1, p.floors)), F = Math.max(1, p.floors);
  const use = p.type === 'ofis' || p.type === 'is_merkezi' ? 'ticari' : p.type === 'fabrika' || p.type === 'depo' ? 'sanayi' : 'konut';
  const FAC = { G: 1.02, D: 1.0, B: 1.0, K: 0.98 } as const, faces = ['K', 'G', 'D', 'B'] as const;
  const out: Unit[] = [];
  for (let i = 0; i < n; i++) {
    const area = Math.round(((p.satilabilir * w[i]!) / sw) * 10) / 10, floor = Math.min(F, Math.floor(i / per) + 1), view = Math.round(clamp(30 + r() * 45 + (floor / F) * 25, 0, 100)), facing = faces[Math.floor(r() * 4)]!;
    const fm = 1 + clamp((floor - 1) * 0.012, 0, 0.1) - (floor === 1 && F > 2 ? 0.04 : 0);
    out.push({ id: s.nextId++, projectId: p.id, area, rooms: rooms(area, use), floor, view, facing, mult: fm * (0.97 + 0.06 * (view / 100)) * FAC[facing], status: 'bos' });
  }
  const aw = out.reduce((a, u) => a + u.area, 0), am = out.reduce((a, u) => a + u.area * u.mult, 0) / aw;
  for (const u of out) u.mult = +(u.mult / am).toFixed(4); // ortalama çarpan 1: toplam gelir plana uyar
  return out;
}

export const unitsOf = (s: GameState, projectId: number) => s.units.filter((u) => u.projectId === projectId);

/** Bugünkü piyasada m² satış fiyatı (kalite puanı varsa ona göre). */
export function fairPerM2(s: GameState, p: Project): Money {
  const parcel = s.parcels.find((x) => x.id === p.parcelId); if (!parcel) return 0;
  const qm = p.result ? 1 + (p.result.qualityScore - 74) * 0.004 : 1;
  return Math.round(planProject(s, parcel, p.type, p.quality, 0).salePerM2 * qm);
}
export const unitFair = (u: Unit, perM2: Money): Money => Math.round(u.area * perM2 * u.mult);
export const listPrice = (u: Unit, perM2: Money, pol: SalesPolicy): Money => Math.round(unitFair(u, perM2) * pol.priceMult);
export const salesOpen = (p: Project) => p.status === 'tamamlandi' || (p.status === 'insaat' && !!p.sales?.presale && !!p.build && p.build.stage >= 8);
export const isPresale = (p: Project) => p.status === 'insaat';

/** Piyasa talebi çarpanı: güven yüksek, reel faiz düşükse talep güçlü. */
export const demandIndex = (s: GameState) => clamp(0.3 + s.macro.confidence / 80 - Math.max(0, s.macro.policyRate - s.macro.inflation - 4) / 40, 0.1, 1.6);

/** Bir dairenin günlük satış olasılığı ve bileşenleri (arayüz de kullanır). */
export function saleChance(s: GameState, p: Project, pol: SalesPolicy): { p: number; demand: number; price: number; brand: number } {
  const c = s.company!, d = districtData(p.cityId, s.parcels.find((x) => x.id === p.parcelId)?.district ?? '');
  const demand = demandIndex(s), price = Math.exp(-6 * (pol.priceMult - 1)), brand = 0.7 + 0.6 * ((0.6 * c.reputation + 0.4 * c.satisfaction) / 100);
  const staff = 1 + Math.min(0.45, 0.15 * s.staff.filter((x) => x.type === 'satis_danismani').length), agent = pol.agent ? 1.3 : 1;
  const comp = 1 - 0.4 * ((d?.competition ?? 50) / 100), pres = isPresale(p) ? 0.6 : 1;
  return { p: clamp(0.012 * demand * price * brand * staff * agent * comp * (SPEED[p.type] ?? 1) * pres, 0, 0.25), demand, price, brand };
}

function addReceivable(s: GameState, u: Unit, amount: Money, dueDay: number, kind: Receivable['kind']) { if (amount > 0) s.receivables.push({ id: s.nextId++, unitId: u.id, projectId: u.projectId, amount, dueDay, kind, missed: 0 }); }

/** Satışı kesinleştirir: ödeme türüne göre nakit ve alacaklar. */
function closeSale(s: GameState, p: Project, u: Unit, events: GameEvent[]) {
  const pol = p.sales!, perM2 = fairPerM2(s, p), pres = isPresale(p), base = listPrice(u, perM2, pol), dep = u.kaporaAmt ?? 0;
  const inst = pol.installments && rand(s.rng, 'market') < 0.5;
  let price: Money, payment: Unit['payment'];
  if (pres) { price = Math.round(base * PRESALE_DISCOUNT); payment = 'onsatis'; }
  else if (inst) { price = Math.round(base * INSTALLMENT_MARKUP); payment = 'taksit'; }
  else { price = Math.round(base * CASH_DISCOUNT); payment = 'pesin'; }
  const down = payment === 'pesin' ? price : Math.round(price * (payment === 'onsatis' ? DOWN_PRESALE : DOWN_TAKSIT));
  const cashNow = down - dep; if (cashNow > 0) post(s, 'satis', cashNow, { projectId: p.id, memo: `${p.name} · ${u.rooms} (${u.floor}. kat)` });
  if (payment === 'taksit') { const rest = price - down, each = Math.floor(rest / 12); for (let k = 1; k <= 12; k++) addReceivable(s, u, k === 12 ? rest - each * 11 : each, s.clock.day + 30 * k, 'taksit'); }
  if (payment === 'onsatis') addReceivable(s, u, price - down, 1e9, 'teslim'); // teslimde vadesi belirlenir
  if (pol.agent) { const fee = Math.round(price * AGENT_FEE); post(s, 'komisyon', -fee, { projectId: p.id, memo: 'Emlakçı komisyonu' }); pol.commission += fee; }
  Object.assign(u, { status: 'satildi' as const, price, payment, soldDay: s.clock.day }); delete u.kaporaUntil; delete u.kaporaAmt;
  pol.contract += price; pol.sold++;
  events.push({ type: 'UNIT_SOLD', day: s.clock.day, data: { projectId: p.id, unitId: u.id, price, payment } });
}

/** Her gün: tamamlanan ya da ön satışa açık projelerde boş dairelere alıcı gelir; kaporalar sonuçlanır; vadesi gelen alacaklar tahsil edilir. */
export function salesDaily(s: GameState, events: GameEvent[]): void {
  if (!s.company) return;
  for (const p of s.projects) {
    if (!p.sales) continue;
    for (const u of s.units) {
      if (u.projectId !== p.id) continue;
      if (u.status === 'kapora' && u.kaporaUntil !== undefined && u.kaporaUntil <= s.clock.day) {
        if (rand(s.rng, 'market') < 0.75 && salesOpen(p)) closeSale(s, p, u, events);
        else { const keep = Math.round((u.kaporaAmt ?? 0) * 0.5), back = (u.kaporaAmt ?? 0) - keep; if (back > 0) post(s, 'satis', -back, { projectId: p.id, memo: 'Kapora iadesi' }); u.status = 'bos'; delete u.kaporaUntil; delete u.kaporaAmt; events.push({ type: 'KAPORA_CANCELLED', day: s.clock.day, data: { projectId: p.id, unitId: u.id } }); }
      }
    }
    if (!salesOpen(p)) continue;
    const ch = saleChance(s, p, p.sales), perM2 = fairPerM2(s, p);
    for (const u of s.units) {
      if (u.projectId !== p.id || u.status !== 'bos') continue;
      if (rand(s.rng, 'market') >= ch.p) continue;
      if (!isPresale(p) && rand(s.rng, 'market') < 0.3) { // kapora bırakır
        const amt = Math.round(listPrice(u, perM2, p.sales) * KAPORA); post(s, 'satis', amt, { projectId: p.id, memo: 'Kapora' }); Object.assign(u, { status: 'kapora' as const, kaporaAmt: amt, kaporaUntil: s.clock.day + 14 });
        events.push({ type: 'KAPORA', day: s.clock.day, data: { projectId: p.id, unitId: u.id } });
      } else closeSale(s, p, u, events);
    }
    checkAllSold(s, p, events);
  }
  // alacaklar
  for (const r of [...s.receivables]) {
    if (r.dueDay > s.clock.day) continue;
    const pr = s.projects.find((x) => x.id === r.projectId);
    if (rand(s.rng, 'market') < (s.company.reputation >= 30 ? 0.97 : 0.93)) { post(s, 'satis', r.amount, { projectId: r.projectId, memo: r.kind === 'teslim' ? 'Teslim bakiyesi' : 'Taksit tahsilatı' }); s.receivables = s.receivables.filter((x) => x.id !== r.id); }
    else {
      r.missed++; r.dueDay = s.clock.day + 30; events.push({ type: 'RECEIVABLE_MISSED', day: s.clock.day, data: { projectId: r.projectId, missed: r.missed } });
      if (r.missed >= 3) { // temerrüt: kalan alacaklar silinir, daire stoğa döner
        const u = s.units.find((x) => x.id === r.unitId); const lost = s.receivables.filter((x) => x.unitId === r.unitId).reduce((a, x) => a + x.amount, 0);
        s.receivables = s.receivables.filter((x) => x.unitId !== r.unitId); if (u) { u.status = 'bos'; u.delivered = false; if (pr?.sales) { pr.sales.contract -= (u.price ?? 0) - 0; pr.sales.sold--; } delete u.price; delete u.payment; }
        events.push({ type: 'DEFAULT', day: s.clock.day, data: { projectId: r.projectId, lost } });
      }
    }
  }
}

/** Tüm daireler satıldı ve teslim edildiyse proje kapanır; kâr kesinleşir. */
export function checkAllSold(s: GameState, p: Project, events: GameEvent[]): void {
  if (p.status !== 'tamamlandi') return;
  const us = unitsOf(s, p.id); if (!us.length || us.some((u) => u.status !== 'satildi')) return;
  const parcel = s.parcels.find((x) => x.id === p.parcelId), land = parcel?.costBasis ?? 0, pol = p.sales!;
  const profit = pol.contract - pol.commission - (p.result?.cost ?? 0) - land;
  p.status = 'satildi'; p.result = { ...p.result!, revenue: pol.contract, profit, soldDay: s.clock.day };
  s.parcels = s.parcels.filter((x) => x.id !== p.parcelId);
  s.company!.stats.sold++; s.company!.stats.profit += profit;
  events.push({ type: 'PROJECT_SOLD', day: s.clock.day, data: { projectId: p.id, price: pol.contract, profit } });
}

/** Teslim: satılmış dairelerin müşteri memnuniyeti, gecikme tazminatı, ön satış bakiyelerinin vadesi. */
export function deliverUnits(s: GameState, p: Project, events: GameEvent[]): void {
  const c = s.company!, q = p.result!.qualityScore, late = Math.max(0, p.result!.days - p.result!.plannedDays * 1.15), perM2 = fairPerM2(s, p), sat: number[] = [];
  for (const u of unitsOf(s, p.id)) {
    if (u.status !== 'satildi' || u.delivered) continue;
    const fair = unitFair(u, perM2), valueGap = fair > 0 ? clamp(((fair - (u.price ?? fair)) / fair) * 30, -10, 10) : 0;
    u.sat = Math.round(clamp(55 + (q - 70) * 0.6 - Math.min(25, late * 0.05) + valueGap + gauss(s.rng, 'market') * 4, 0, 100)); u.delivered = true; u.warrantyUntil = s.clock.day + WARRANTY_DAYS; sat.push(u.sat);
    for (const r of s.receivables) if (r.unitId === u.id && r.kind === 'teslim') r.dueDay = s.clock.day + 14;
    if (u.payment === 'onsatis' && late > 0) { const comp = Math.round((u.price ?? 0) * 0.01 * (late / 30)); if (comp > 0) post(s, 'garanti', -comp, { projectId: p.id, memo: 'Gecikme tazminatı' }); }
  }
  if (sat.length) { const avg = sat.reduce((a, x) => a + x, 0) / sat.length; c.satisfaction = Math.round(c.satisfaction * 0.7 + avg * 0.3); c.reputation = clamp(c.reputation + Math.round((avg - 60) / 15), 0, 100); events.push({ type: 'DELIVERED', day: s.clock.day, data: { projectId: p.id, avgSat: Math.round(avg), units: sat.length } }); }
}

/** Aylık: garanti talepleri (kalite düşükse sık ve pahalı), satılmamış daire gideri. */
export function salesMonthly(s: GameState, events: GameEvent[]): void {
  for (const u of s.units) {
    const p = s.projects.find((x) => x.id === u.projectId); if (!p) continue;
    if (u.delivered && u.warrantyUntil !== undefined && u.warrantyUntil > s.clock.day) {
      const q = p.result?.qualityScore ?? 70, prob = 0.012 * clamp(1 + (74 - q) / 20, 0.3, 3);
      if (rand(s.rng, 'market') < prob) { const cost = Math.round((u.price ?? 0) * (0.003 + rnd(s.rng, 'market') * 0.012)); post(s, 'garanti', -cost, { projectId: p.id, memo: `Garanti: ${p.name}` }); u.sat = Math.max(0, (u.sat ?? 60) - 4); events.push({ type: 'COMPLAINT', day: s.clock.day, data: { projectId: p.id, cost } }); }
    }
  }
  // satılmamış dairelerin bakım/aidat gideri (aylık %0,05)
  for (const p of s.projects) {
    if (p.status !== 'tamamlandi') continue; const perM2 = fairPerM2(s, p);
    const val = unitsOf(s, p.id).filter((u) => u.status !== 'satildi').reduce((a, u) => a + unitFair(u, perM2), 0), cost = Math.round(val * 0.0005);
    if (cost > 0) post(s, 'insaat', -cost, { projectId: p.id, memo: 'Satılmamış daire giderleri' });
  }
}

export const receivablesTotal = (s: GameState): Money => s.receivables.reduce((a, r) => a + r.amount, 0);
/** Ön satıştan alınan avans yükümlülüğü: teslim edilmemiş ön satış sözleşmelerinin toplam bedeli. */
export const advancesTotal = (s: GameState): Money => s.units.reduce((a, u) => a + (u.status === 'satildi' && u.payment === 'onsatis' && !u.delivered ? (u.price ?? 0) : 0), 0);
export function unsoldValue(s: GameState): Money {
  let t = 0; for (const p of s.projects) { if (p.status !== 'tamamlandi') continue; const perM2 = fairPerM2(s, p); t += unitsOf(s, p.id).filter((u) => u.status !== 'satildi').reduce((a, u) => a + unitFair(u, perM2), 0); }
  return Math.round(t * 0.9);
}

/** Kalan satılmamış daireleri yatırımcıya toplu satar (adil değerin %92'si). */
export function bulkSellRemaining(s: GameState, p: Project, events: GameEvent[]): Money {
  const perM2 = fairPerM2(s, p); let total = 0;
  for (const u of unitsOf(s, p.id)) {
    if (u.status === 'satildi') continue;
    const dep = u.kaporaAmt ?? 0, price = Math.round(unitFair(u, perM2) * BULK);
    post(s, 'satis', price - dep, { projectId: p.id, memo: `${p.name} toplu satış` });
    Object.assign(u, { status: 'satildi' as const, price, payment: 'pesin' as const, soldDay: s.clock.day, delivered: true, sat: 60, warrantyUntil: s.clock.day + WARRANTY_DAYS }); delete u.kaporaUntil; delete u.kaporaAmt;
    p.sales!.contract += price; p.sales!.sold++; total += price;
  }
  if (total > 0) { const comm = Math.round(total * 0.01); post(s, 'komisyon', -comm, { projectId: p.id, memo: 'Toplu satış komisyonu' }); p.sales!.commission += comm; }
  checkAllSold(s, p, events); return total;
}
void SPEED;
