import { incomingSpace } from './materials';
import { activeNego, logStock } from './supplyx';
import { TL, type Money } from '../core/money';
import type { GameEvent, GameState, SupplyContract } from '../core/types';
import { material, supplier } from '../data';
import { post } from './ledger';
import { WAREHOUSE, freeSpace, quoteOrder, spaceOf, unitPrice, usedSpace, whLevel, capacityOf, placeOrder } from './materials';

/**
 * Tedarik katmanı: vadeli alım yükümlülükleri, düzenli tedarik sözleşmeleri, depo (kapasite, kira, bozulma ve kayıp).
 * Hepsi aynı defter ve aynı stok üzerinden işler; ikinci bir stok ya da para sistemi yoktur.
 */
export const payablesTotal = (s: GameState): Money => (s.payables ?? []).reduce((a, p) => a + p.amount, 0);
export const CONTRACT_DISCOUNT = 0.04, CONTRACT_BREAK_MONTHS = 2;
export const SEC_COST_TL = [0, 30_000, 90_000], STAFF_COST_TL = 25_000, SEC_LABEL = ['Güvenlik yok', 'Kamera ve bekçi', 'Tam güvenlik'];
export const warehouseRent = (s: GameState): Money => Math.round((TL(WAREHOUSE[whLevel(s)]!.rentTL) + (whLevel(s) > 0 ? TL(SEC_COST_TL[s.warehouse?.sec ?? 1]!) + TL(STAFF_COST_TL) * (s.warehouse?.staff ?? 0) : 0) + (s.depots ?? []).reduce((a, d) => a + TL(WAREHOUSE[d.level]!.rentTL) * 1.15, 0)) * s.costIndex);

/** Her gün: vadesi gelen ödemeler. Nakit yetmezse 7 gün ertelenir (%1,5 gecikme faizi, itibar kaybı); üçüncü gecikmede zorunlu ödenir. */
export function payablesDaily(s: GameState, events: GameEvent[]): void {
  if (!s.payables?.length || !s.company) return; const day = s.clock.day, c = s.company;
  for (const p of [...s.payables]) {
    if (p.dueDay > day) continue;
    if (c.cash >= p.amount || p.late >= 3) { post(s, 'malzeme', -p.amount, { memo: `Vadeli ödeme: ${p.memo}` }); s.payables = s.payables.filter((x) => x.id !== p.id); events.push({ type: 'PAYABLE_PAID', day, data: { amount: p.amount } }); }
    else { p.late++; p.dueDay = day + 7; p.amount = Math.round(p.amount * 1.015); c.reputation = Math.max(0, c.reputation - 0.5); events.push({ type: 'PAYABLE_LATE', day, data: { memo: p.memo } }); }
  }
}

export function contractError(s: GameState, matId: string, supId: string, qtyPerMonth: number, months: number): string | null {
  const m = material(matId), sp = supplier(supId); if (!m || !sp) return 'Geçersiz malzeme veya tedarikçi.'; if (!s.company) return 'Şirket yok.';
  if (![6, 12].includes(months)) return 'Süre 6 ya da 12 ay olmalı.'; if (!(qtyPerMonth > 0)) return 'Miktar sıfırdan büyük olmalı.';
  if ((s.contracts ?? []).some((c) => c.material === matId)) return 'Bu malzeme için zaten bir sözleşme var.';
  if (spaceOf(matId, qtyPerMonth) > sp.cap) return `${sp.label} aylık bu miktarı karşılayamaz.`; if (spaceOf(matId, qtyPerMonth) > capacityOf(s) * 0.6) return 'Aylık teslimat depo kapasitesinin %60\'ını aşıyor.';
  return null;
}
export function signContract(s: GameState, matId: string, supId: string, qtyPerMonth: number, months: number, dest?: string): string | null {
  const e = contractError(s, matId, supId, qtyPerMonth, months); if (e) return e;
  const ng = activeNego(s, matId, supId), price = Math.round(unitPrice(s, matId, supId) * (1 - CONTRACT_DISCOUNT - (ng?.cDisc ?? 0))); if (ng?.cDisc) ng.until = 0;
  (s.contracts ??= []).push({ id: s.nextId++, material: matId, supplier: supId, qtyPerMonth, price, startDay: s.clock.day, months, nextDay: s.clock.day + 30, taken: 0, missed: 0, dest: dest ?? s.company!.startCity }); return null;
}
export const contractValue = (c: SupplyContract): Money => Math.round(c.price * c.qtyPerMonth);
export function cancelContract(s: GameState, id: number): string | null {
  const c = (s.contracts ?? []).find((x) => x.id === id); if (!c) return 'Sözleşme bulunamadı.'; const pen = contractValue(c) * CONTRACT_BREAK_MONTHS; if (s.company!.cash < pen) return 'Fesih bedeli (2 aylık tutar) için yeterli nakit yok.';
  post(s, 'malzeme', -pen, { memo: `Sözleşme fesih bedeli: ${material(c.material)!.label}` }); s.contracts = s.contracts!.filter((x) => x.id !== id); return null;
}
export function upgradeWarehouse(s: GameState): string | null {
  const lv = whLevel(s), nx = WAREHOUSE[lv + 1]; if (!nx) return 'Depo zaten en büyük kademede.'; const cost = Math.round(TL(nx.upTL) * s.costIndex); if (!s.company || s.company.cash < cost) return 'Depo yatırımı için yeterli nakit yok.';
  post(s, 'depo', -cost, { memo: `Depo yatırımı: ${nx.label}` }); s.warehouse = { ...(s.warehouse ?? {}), level: lv + 1 }; return null;
}

/** Aylık: sözleşme teslimatları (al ya da öde), stok bozulması ve kaybı. */
export function supplyMonthly(s: GameState, events: GameEvent[]): void {
  const day = s.clock.day;
  for (const c of [...(s.contracts ?? [])]) {
    while (c.nextDay <= day) {
      const m = material(c.material)!, space = spaceOf(c.material, c.qtyPerMonth);
      if (space <= freeSpace(s) + 1e-9) { const r = placeOrder(s, c.material, c.qtyPerMonth, c.supplier, events, { lockedUnit: c.price, contractId: c.id, dest: c.dest, term: 'pesin' }); if (r.ok) c.taken++; else { c.missed++; events.push({ type: 'CONTRACT_MISSED', day, data: { material: c.material, reason: r.error } }); } }
      else { c.missed++; post(s, 'depo', -Math.round(contractValue(c) * 0.1), { memo: `Depo dolu, sözleşme teslimatı reddedildi: ${m.label}` }); events.push({ type: 'CONTRACT_MISSED', day, data: { material: c.material, reason: 'depo' } }); }
      c.nextDay += 30;
    }
    if (day >= c.startDay + c.months * 30) { s.contracts = s.contracts!.filter((x) => x.id !== c.id); events.push({ type: 'CONTRACT_ENDED', day, data: { material: c.material } }); }
  }
  // bozulma ve kayıp: açık sahada iki kat, büyük depoda yarı
  const lvl = whLevel(s), f = (lvl === 0 ? 2 : lvl >= 2 ? 0.5 : 1) * [1.25, 1, 0.7][s.warehouse?.sec ?? 1]!; let lost: Money = 0;
  for (const [id, it] of Object.entries(s.stock)) { const m = material(id); if (!m || it.qty <= 0) continue; const q = it.qty * m.loss * f; it.qty = Math.max(0, it.qty - q); lost += Math.round(q * it.cost); logStock(s, id, q, 'fire', q * it.cost, 'depo kaybı'); }
  if (lost > 0) events.push({ type: 'STOCK_LOSS', day, data: { value: lost } });
}
export const stockLossForecast = (s: GameState): Money => { const lvl = whLevel(s), f = lvl === 0 ? 2 : lvl >= 2 ? 0.5 : 1; return Object.entries(s.stock).reduce((a, [id, it]) => a + Math.round(it.qty * (material(id)?.loss ?? 0) * f * it.cost), 0); };
export const supplyStatus = (s: GameState) => ({ used: usedSpace(s), cap: capacityOf(s), level: whLevel(s) });
void quoteOrder;

export function warehouseSetError(s: GameState, sec: number, staff: number): string | null { if (!s.company) return 'Şirket yok.'; if (![0, 1, 2].includes(sec)) return 'Güvenlik düzeyi 0–2 olmalı.'; if (!Number.isInteger(staff) || staff < 0 || staff > 3) return 'Depo personeli 0–3 olmalı.'; return null; }
export function setWarehouse(s: GameState, sec: number, staff: number): void { s.warehouse = { ...(s.warehouse ?? { level: 0 }), sec, staff }; }
export const MAX_DEPOTS = 4;
export const depotCost = (s: GameState, level: number): Money => Math.round(TL(WAREHOUSE[level]!.upTL) * 0.8 * s.costIndex);
export function openDepotError(s: GameState, city: string, level: number): string | null {
  if (!s.company) return 'Şirket yok.'; if (!s.openCities.includes(city)) return 'Bu ilde şubeniz yok.'; if (!(level >= 1 && level <= 3) || !Number.isInteger(level)) return 'Geçersiz depo kademesi.';
  if ((s.depots ?? []).some((d) => d.city === city)) return 'Bu şehirde zaten ek depo var.'; if ((s.depots ?? []).length >= MAX_DEPOTS) return `En çok ${MAX_DEPOTS} ek depo açılabilir.`; if (s.company.cash < depotCost(s, level)) return 'Depo yatırımı için yeterli nakit yok.'; return null;
}
export function openDepot(s: GameState, city: string, level: number): void { post(s, 'depo', -depotCost(s, level), { memo: `Ek depo: ${city} (${WAREHOUSE[level]!.label})` }); (s.depots ??= []).push({ id: s.nextId++, city, level, since: s.clock.day }); }
export function closeDepotError(s: GameState, id: number): string | null {
  const d = (s.depots ?? []).find((x) => x.id === id); if (!d) return 'Depo bulunamadı.'; if (usedSpace(s) + incomingSpace(s) > capacityOf(s) - WAREHOUSE[d.level]!.cap) return 'Stok bu depo kapatılınca sığmaz; önce stoğu tüketin.'; return null;
}
export function closeDepot(s: GameState, id: number): void { s.depots = (s.depots ?? []).filter((d) => d.id !== id); }
