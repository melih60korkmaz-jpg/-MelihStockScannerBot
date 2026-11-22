import { TL, type Money } from '../core/money';
import { randInt, rand } from '../core/rng';
import type { GameEvent, GameState, Machine, MachineLease } from '../core/types';
import { MACHINES, machine } from '../data';
import { post } from './ledger';
import { isUnlocked } from './unlock';

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const condM = (m: Machine): number => m.cond ?? 85;
export const hoursM = (m: Machine): number => m.hours ?? m.uses * 8;
/** Güncel değer: yaşa göre amortisman (en az %25) × durum ve çalışma saati düzeltmesi. */
export const machineValue = (s: GameState, m: Machine): Money => {
  const def = machine(m.type), years = (s.clock.day - m.boughtDay) / 365, dep = def?.dep ?? 0.12;
  return Math.round(m.price * Math.max(0.25, 1 - dep * years) * (0.85 + 0.15 * (condM(m) / 100)) * (1 - Math.min(0.15, hoursM(m) / 40000 * 0.3)));
};
export const machineAssetValue = (s: GameState): Money => s.machines.reduce((a, m) => a + machineValue(s, m), 0);
export const machineMonthlyMaint = (s: GameState): Money => s.machines.reduce((a, m) => a + Math.round(TL(machine(m.type)!.maintTL) * s.costIndex), 0);
export const SELL_FACTOR = 0.9;
export const operatorCount = (s: GameState): number => s.staff.filter((x) => x.type === 'operator').length;
export const operatorRequired = (s: GameState): boolean => isUnlocked(s, 'makine');
export const isRentedOut = (s: GameState, m: Machine): boolean => !!m.rentedOut && m.rentedOut.until > s.clock.day;
export const activeLeases = (s: GameState): MachineLease[] => (s.leases ?? []).filter((l) => l.endDay > s.clock.day);
export const leaseDaily = (s: GameState, type: string): Money => Math.round(TL(machine(type)!.rentTL) * 0.75 * s.costIndex);
export const rentOutDaily = (s: GameState, m: Machine): Money => Math.round(TL(machine(m.type)!.rentTL) * 0.6 * s.costIndex);

/**
 * Bir proje-gününde aşamanın gerektirdiği makineler: sahip olunan çalışır durumdakiler yalnızca yakıt, uzun dönem kiralık olanlar ek ücretsiz,
 * diğerleri günlük kira. Makine parkı açıldıktan sonra operatör gerektiren makineler boşta operatör olmadan çalışmaz (o gün kiralanır).
 * Dönen `cost` bir günlük (use=1) maliyettir; arıza kontrolü kullanılan makineler için yapılır.
 */
export function useMachines(s: GameState, req: string[], events: GameEvent[]): { cover: number; cost: Money } {
  if (!req.length) return { cover: 0, cost: 0 };
  let found = 0, cost = 0; const ci = s.costIndex, day = s.clock.day, needOps = operatorRequired(s), nOps = operatorCount(s);
  for (const type of req) {
    const def = machine(type)!;
    const opsUsed = s.machines.filter((x) => x.usedDay === day && machine(x.type)?.op).length + (s.leases ?? []).filter((l) => l.usedDay === day).length * 0;
    const m = s.machines.find((x) => x.type === type && x.brokenUntil <= day && x.usedDay !== day && !isRentedOut(s, x) && (!needOps || !def.op || opsUsed < nOps));
    if (m) {
      const fuel = Math.round(TL(def.fuelTL) * ci); found += condM(m) < 35 ? 0.6 : 1; cost += fuel; m.usedDay = day; m.uses++; m.hours = hoursM(m) + 8; m.cond = Math.max(0, condM(m) - 0.35); m.fuelSpent = (m.fuelSpent ?? 0) + fuel;
      if (rand(s.rng, 'construction') < 0.0015 + ((100 - condM(m)) / 100) * 0.006 + (hoursM(m) / 72000) * 0.004) { // arıza: yıpranmış ve çok çalışmış makinede daha olası
        const days = randInt(s.rng, 'construction', 3, 10); m.brokenUntil = day + days; const fix = Math.round(m.price * 0.03);
        if (s.company && s.company.cash >= fix) { post(s, 'makine_bakim', -fix, { memo: `${def.label} onarım` }); m.maintSpent = (m.maintSpent ?? 0) + fix; }
        events.push({ type: 'MACHINE_BROKEN', day, data: { type, days } });
      }
      continue;
    }
    const lease = (s.leases ?? []).find((l) => l.type === type && l.startDay <= day && l.endDay > day && l.usedDay !== day);
    if (lease) { lease.usedDay = day; found++; cost += Math.round(TL(def.fuelTL) * ci); continue; } // kiralık makine operatörlü gelir; yakıt şirkete ait
    cost += TL(def.rentTL) * ci;
  }
  return { cover: found / req.length, cost: Math.round(cost) };
}

export const SERVICE = { bakim: { label: 'Bakım', cond: 30, pct: 0 }, buyuk: { label: 'Büyük bakım', cond: 100, pct: 0.07 } } as const;
export const serviceCost = (s: GameState, m: Machine, kind: keyof typeof SERVICE): Money => (kind === 'bakim' ? Math.round(TL(machine(m.type)!.maintTL) * 2.5 * s.costIndex) : Math.round(m.price * SERVICE.buyuk.pct));
export function serviceMachine(s: GameState, id: number, kind: keyof typeof SERVICE): string | null {
  const m = s.machines.find((x) => x.id === id); if (!m) return 'Makine bulunamadı.'; if (isRentedOut(s, m)) return 'Kiradaki makineye bakım yapılamaz.'; if (condM(m) >= 99) return 'Makine zaten çok iyi durumda.';
  const c = serviceCost(s, m, kind); if (s.company!.cash < c) return 'Bakım için yeterli nakit yok.';
  post(s, 'makine_bakim', -c, { memo: `${machine(m.type)!.label}: ${SERVICE[kind].label}` }); m.maintSpent = (m.maintSpent ?? 0) + c; m.cond = clamp(condM(m) + SERVICE[kind].cond, 0, 100); if (kind === 'buyuk') m.hours = Math.round(hoursM(m) * 0.7); m.brokenUntil = Math.min(m.brokenUntil, s.clock.day); return null;
}
/** Kiraya verme: makine o süre boyunca şirketin işlerinde kullanılamaz; günlük bedelin %60'ı kazanılır, makine yıpranır ve hasar riski vardır. */
export function rentOutMachine(s: GameState, id: number, days: number): string | null {
  const m = s.machines.find((x) => x.id === id); if (!m) return 'Makine bulunamadı.'; if (![30, 60, 90].includes(days)) return 'Süre 30, 60 ya da 90 gün olmalı.'; if (isRentedOut(s, m)) return 'Makine zaten kirada.'; if (m.brokenUntil > s.clock.day) return 'Arızalı makine kiralanamaz.'; if (!isUnlocked(s, 'makine')) return 'Makine Parkı henüz açılmadı.';
  m.rentedOut = { until: s.clock.day + days, daily: rentOutDaily(s, m) }; return null;
}
export function recallMachine(s: GameState, id: number): string | null {
  const m = s.machines.find((x) => x.id === id); if (!m || !isRentedOut(s, m)) return 'Makine kirada değil.'; const pen = m.rentedOut!.daily * 7; post(s, 'makine_bakim', -pen, { memo: `Erken geri çağırma tazminatı: ${machine(m.type)!.label}` }); delete m.rentedOut; return null;
}
export function leaseMachine(s: GameState, type: string, months: number): string | null {
  const def = machine(type); if (!def) return 'Geçersiz makine.'; if (![3, 6, 12].includes(months)) return 'Süre 3, 6 ya da 12 ay olmalı.'; if (!isUnlocked(s, 'makine')) return 'Makine Parkı henüz açılmadı.';
  if (activeLeases(s).some((l) => l.type === type)) return 'Bu makine için zaten kiralama var.'; const d = leaseDaily(s, type); if (s.company!.cash < d * 30) return 'İlk ay kirası için yeterli nakit yok.';
  (s.leases ??= []).push({ id: s.nextId++, type, startDay: s.clock.day, endDay: s.clock.day + months * 30, daily: d }); post(s, 'kira_gideri', -d * 30, { memo: `${def.label} kiralama (ilk ay)` }); return null;
}
export function endLease(s: GameState, id: number): string | null {
  const l = (s.leases ?? []).find((x) => x.id === id); if (!l) return 'Kiralama bulunamadı.'; const pen = l.daily * 30; if (s.company!.cash < pen) return 'Fesih bedeli (1 aylık kira) için yeterli nakit yok.';
  post(s, 'kira_gideri', -pen, { memo: `Kiralama fesih bedeli: ${machine(l.type)!.label}` }); s.leases = s.leases!.filter((x) => x.id !== id); return null;
}
export function buyUsed(s: GameState, offerId: number): string | null {
  const o = (s.usedMarket ?? []).find((x) => x.id === offerId); if (!o) return 'İlan artık yok.'; if (!isUnlocked(s, 'makine')) return 'Makine Parkı henüz açılmadı.'; if (s.company!.cash < o.price) return 'Satın alma için yeterli nakit yok.';
  const def = machine(o.type)!; post(s, 'makine_alim', -o.price, { memo: `${def.label} (ikinci el)` });
  s.machines.push({ id: s.nextId++, type: o.type, boughtDay: s.clock.day - Math.round(o.age * 365), price: TL(def.priceTL), brokenUntil: 0, uses: Math.round(o.hours / 8), hours: o.hours, cond: o.cond, used: true }); s.usedMarket = s.usedMarket!.filter((x) => x.id !== offerId); return null;
}
/** Aylık: rutin bakım durumu iyileştirir; kiradaki makineler gelir getirir ve yıpranır; kiralama bedelleri; ikinci el ilanları yenilenir. */
export function machinesMonthly(s: GameState, events: GameEvent[]): void {
  const day = s.clock.day;
  for (const m of s.machines) {
    const def = machine(m.type)!; m.maintSpent = (m.maintSpent ?? 0) + Math.round(TL(def.maintTL) * s.costIndex); m.cond = clamp(condM(m) + 6, 0, 100);
    if (m.rentedOut) {
      const left = m.rentedOut.until - day, days = Math.max(0, Math.min(30, left + 30)); const inc = m.rentedOut.daily * days; if (inc > 0) { post(s, 'makine_gelir', inc, { memo: `${def.label} kiraya verildi` }); m.income = (m.income ?? 0) + inc; }
      m.cond = clamp(condM(m) - 7, 0, 100);
      if (rand(s.rng, 'market') < 0.03) { m.cond = clamp(condM(m) - 15, 0, 100); events.push({ type: 'MACHINE_DAMAGED', day, data: { type: m.type } }); }
      if (m.rentedOut.until <= day) { delete m.rentedOut; events.push({ type: 'MACHINE_RETURNED', day, data: { type: m.type } }); }
    }
  }
  for (const l of [...(s.leases ?? [])]) { if (l.endDay <= day) { s.leases = s.leases!.filter((x) => x.id !== l.id); events.push({ type: 'LEASE_ENDED', day, data: { type: l.type } }); } else post(s, 'kira_gideri', -l.daily * 30, { memo: `${machine(l.type)!.label} kiralama` }); }
  // ikinci el pazarı
  s.usedMarket = (s.usedMarket ?? []).filter((x) => x.expires > day);
  while (s.usedMarket.length < 4) {
    const def = MACHINES[randInt(s.rng, 'market', 0, MACHINES.length - 1)]!, age = 2 + randInt(s.rng, 'market', 0, 8), hours = Math.round(age * 1200 * (0.7 + rand(s.rng, 'market') * 0.6)), cond = Math.round(clamp(88 - age * 3 - rand(s.rng, 'market') * 20, 35, 90));
    const price = Math.round(TL(def.priceTL) * Math.max(0.25, 1 - def.dep * age) * (0.85 + 0.15 * cond / 100) * (0.88 + rand(s.rng, 'market') * 0.14) * s.costIndex);
    s.usedMarket.push({ id: s.nextId++, type: def.id, age, hours, cond, price, expires: day + 60 });
  }
}
/** Sahip olmanın kiralamaya göre ekonomisi: yıllık sabit maliyet (amortisman + bakım + operatör payı) ve başabaş kullanım günü. */
export function machineEconomics(s: GameState, m: Machine): { ownDaily: Money; rentDaily: Money; breakEvenDays: number; utilization: number; annualFixed: Money; fuelDaily: Money; yearsOwned: number } {
  const def = machine(m.type)!, ci = s.costIndex, rent = Math.round(TL(def.rentTL) * ci), fuel = Math.round(TL(def.fuelTL) * ci);
  const annualFixed = Math.round(m.price * def.dep + TL(def.maintTL) * ci * 12 + (def.op ? TL(36_000) * ci * 12 * 0.5 : 0)), yearsOwned = Math.max(0.1, (s.clock.day - m.boughtDay) / 365), util = Math.min(1, m.uses / Math.max(1, yearsOwned * 365));
  const be = rent - fuel > 0 ? annualFixed / (rent - fuel) : 999, usedDays = Math.max(1, m.uses / yearsOwned);
  return { ownDaily: Math.round(annualFixed / usedDays + fuel), rentDaily: rent, breakEvenDays: Math.round(be), utilization: util, annualFixed, fuelDaily: fuel, yearsOwned };
}
