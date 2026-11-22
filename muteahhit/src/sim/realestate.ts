import { TL, type Money } from '../core/money';
import { rand } from '../core/rng';
import type { GameEvent, GameState, Offer, Project, Unit } from '../core/types';
import { monthKey } from '../core/calendar';
import { post } from './ledger';
import { unitFair, fairPerM2, unitsOf } from './sales';

/**
 * Gayrimenkul yönetimi: kiracı nitelikleri (ödeme düzeni, gelir, memnuniyet), depozito, ödeme gecikmesi ve tahliye, sözleşme yenileme ve kira artışı,
 * bina durumu (bakım), arıza giderleri ve portföy raporu. Mevcut kiralama (teklif → kabul) üzerine kurulur; ikinci bir kira sistemi yoktur.
 */
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const RENT_LEAVE = 0.02, RENT_YIELD = 0.0045;
export const INC_POLICIES = { enflasyon: { label: 'Enflasyon kadar', add: 0 }, yuksek: { label: 'Enflasyon + 5 puan', add: 5 }, sabit: { label: 'Sabit (artış yok)', add: -999 } } as const;
export const incPolicy = (s: GameState) => s.estate?.policy ?? 'enflasyon';
export const incPct = (s: GameState): number => { const p = incPolicy(s); return p === 'sabit' ? 0 : clamp(s.macro.inflation + INC_POLICIES[p].add, 3, 60); };

export function tenantProfile(seed: number): { pay: number; income: number; months: number; careless: number } {
  const h = (Math.imul(seed + 17, 2654435761) >>> 0);
  return { pay: 40 + (h % 56), income: 1 + ((h >>> 8) % 5), months: [6, 12, 12, 24][(h >>> 12) % 4]!, careless: ((h >>> 16) % 100) / 100 };
}
export const incomeLabel = (n: number) => ['', 'Düşük gelir', 'Orta-alt gelir', 'Orta gelir', 'Orta-üst gelir', 'Yüksek gelir'][clamp(n, 1, 5)]!;

export const condOf = (p: Project): number => p.cond ?? clamp(p.result?.qualityScore ?? 75, 55, 100);
export const condFactor = (p: Project): number => 0.88 + 0.12 * (condOf(p) / 100) + (p.renovBonus ?? 0);
/** Kiracı memnuniyeti bina durumuna ve kiranın piyasaya göre yüksekliğine bağlıdır. */
export function marketRent(s: GameState, p: Project, u: Unit): Money { return Math.round(unitFair(u, fairPerM2(s, p)) * RENT_YIELD); }

export function newRent(s: GameState, p: Project, u: Unit, amount: Money, offer: Offer): NonNullable<Unit['rent']> {
  const t = tenantProfile(offer.seed), sat = clamp(60 + (condOf(p) - 70) / 2, 40, 85);
  const r = { amount, tenant: offer.buyer, since: s.clock.day, seed: offer.seed, pay: t.pay, income: t.income, sat: Math.round(sat), endDay: s.clock.day + t.months * 30, deposit: amount * 2, arrears: 0, lateMonths: 0, renewals: 0 };
  post(s, 'depozito', r.deposit, { projectId: p.id, memo: `Kiracı depozitosu: ${offer.buyer}` }); void u; return r;
}
/** Eski kayıtlarda eksik alanları doldurur (mevcut kiracılar depozitosuz ve 12 ay sözleşmeli sayılır). */
export function tenantOf(s: GameState, u: Unit): NonNullable<Unit['rent']> | null {
  const r = u.rent; if (!r) return null; const t = tenantProfile(r.seed);
  r.pay ??= t.pay; r.income ??= t.income; r.sat ??= 60; r.endDay ??= r.since + 360; r.deposit ??= 0; r.arrears ??= 0; r.lateMonths ??= 0; r.renewals ??= 0; return r;
}
export const depositsTotal = (s: GameState): Money => s.units.reduce((a, u) => a + (u.rent?.deposit ?? 0), 0);
export const arrearsTotal = (s: GameState): Money => s.units.reduce((a, u) => a + (u.rent?.arrears ?? 0), 0);

function endTenancy(s: GameState, p: Project, u: Unit, why: string, events: GameEvent[], deduct = 0): void {
  const r = tenantOf(s, u); if (!r) return; const refund = Math.max(0, (r.deposit ?? 0) - (r.arrears ?? 0) - deduct);
  if ((r.deposit ?? 0) > 0) post(s, 'depozito', -(r.deposit ?? 0), { projectId: p.id, memo: `Depozito kapandı: ${r.tenant}` });
  const kept = (r.deposit ?? 0) - refund; if (kept > 0) post(s, 'kira_geliri', kept, { projectId: p.id, memo: `Depozitodan mahsup: ${r.tenant} (borç/hasar)` });
  events.push({ type: 'RENT_ENDED', day: s.clock.day, data: { projectId: p.id, unitId: u.id, tenant: r.tenant, why } }); delete u.rent; u.listing = 'kira';
}
export function evictTenant(s: GameState, unitId: number, events: GameEvent[]): string | null {
  const u = s.units.find((x) => x.id === unitId), r = u && tenantOf(s, u), p = u && s.projects.find((x) => x.id === u.projectId); if (!u || !r || !p) return 'Kiracı bulunamadı.';
  const legal = Math.round(r.amount * (r.arrears ? 1.5 : 3)); if (s.company!.cash < legal) return 'Tahliye masrafı için yeterli nakit yok.';
  post(s, 'emlak_bakim', -legal, { projectId: p.id, memo: `Tahliye masrafı: ${r.tenant}` }); endTenancy(s, p, u, 'tahliye', events); return null;
}
/** Yenileme: dış cephe, iç mekân, tesisat, asansör ekleme, ortak alan. Bina durumunu ve değer/kira çarpanını kalıcı yükseltir; her tür 2 yılda bir yapılabilir. */
export const RENOVATIONS: Record<string, { label: string; pct: number; cond: number; bonus: number; minFloors?: number }> = {
  cephe: { label: 'Dış cephe yenileme', pct: 0.035, cond: 8, bonus: 0.02 }, ic: { label: 'İç mekân yenileme', pct: 0.04, cond: 6, bonus: 0.03 }, tesisat: { label: 'Tesisat yenileme', pct: 0.03, cond: 10, bonus: 0.01 },
  asansor: { label: 'Asansör ekleme', pct: 0.02, cond: 5, bonus: 0.02, minFloors: 4 }, ortak: { label: 'Ortak alan iyileştirme', pct: 0.015, cond: 4, bonus: 0.01 },
};
export const renovCost = (s: GameState, p: Project, kind: string): Money => Math.round(ownedValue(s, p) * (RENOVATIONS[kind]?.pct ?? 0));
export function renovateError(s: GameState, projectId: number, kind: string): string | null {
  const p = s.projects.find((x) => x.id === projectId), d = RENOVATIONS[kind]; if (!p || p.status !== 'tamamlandi') return 'Bina bulunamadı.'; if (!d) return 'Geçersiz yenileme.'; if (!ownedUnits(s, p).length) return 'Bu binada şirkete ait birim yok.';
  if (d.minFloors && (p.floors ?? 0) < d.minFloors) return `Asansör için en az ${d.minFloors} katlı bina gerekir.`; if (p.renov?.[kind] !== undefined && s.clock.day - p.renov[kind]! < 730) return 'Bu yenileme son 2 yılda yapıldı.';
  if (s.company!.cash < renovCost(s, p, kind)) return 'Yenileme için yeterli nakit yok.'; return null;
}
export function renovate(s: GameState, projectId: number, kind: string): void {
  const p = s.projects.find((x) => x.id === projectId)!, d = RENOVATIONS[kind]!, cost = renovCost(s, p, kind);
  post(s, 'emlak_bakim', -cost, { projectId: p.id, memo: `${d.label}: ${p.name}` }); p.cond = clamp(condOf(p) + d.cond, 0, 100); p.renovBonus = Math.min(0.12, (p.renovBonus ?? 0) + d.bonus); (p.renov ??= {})[kind] = s.clock.day;
}
/** Sat–tut analizi: boşluk (%8), bakım (%0,4) ve vergi (%15) sonrası net getiri + beklenen değer artışı, mevduat alternatifiyle karşılaştırılır. */
export function holdAnalysis(s: GameState, rows: PortfolioRow[]): { value: Money; saleCash: Money; gross: number; net: number; growth: number; alt: number; payback: number | null; advice: 'tut' | 'sat' } {
  const value = rows.reduce((a, r) => a + r.value, 0), cost = rows.reduce((a, r) => a + r.cost, 0), p = rows[0]?.project, parcel = p && s.parcels.find((x) => x.id === p.parcelId), growth = parcel?.growth ?? 0.04;
  const potentialRent = rows.reduce((a, r) => a + (r.unit.rent ? r.rent : Math.round(r.value * RENT_YIELD)), 0) * 12, grossYield = value > 0 ? potentialRent / value : 0, netYield = (grossYield * 0.92 - 0.004) * 0.85, alt = (s.macro.policyRate / 100) * 0.8;
  const netAnnual = value * netYield; return { value, saleCash: Math.round(value * 0.97), gross: grossYield, net: netYield, growth, alt, payback: netAnnual > 0 ? cost / netAnnual : null, advice: netYield + growth >= alt ? 'tut' : 'sat' };
}
export function maintainBuilding(s: GameState, projectId: number): string | null {
  const p = s.projects.find((x) => x.id === projectId); if (!p || p.status === 'satildi' || p.status === 'taslak') return 'Bina bulunamadı.'; const cost = maintenanceCost(s, p); if (cost <= 0) return 'Bu binada şirkete ait birim yok.';
  if (s.company!.cash < cost) return 'Bakım yatırımı için yeterli nakit yok.'; if (condOf(p) >= 99) return 'Bina zaten çok iyi durumda.';
  post(s, 'emlak_bakim', -cost, { projectId: p.id, memo: `Bakım yatırımı: ${p.name}` }); p.cond = clamp(condOf(p) + 12, 0, 100); return null;
}
export const ownedUnits = (s: GameState, p: Project): Unit[] => unitsOf(s, p.id).filter((u) => u.status !== 'satildi' && !u.landlord);
export const ownedValue = (s: GameState, p: Project): Money => { const per = fairPerM2(s, p); return ownedUnits(s, p).reduce((a, u) => a + unitFair(u, per), 0); };
export const maintenanceCost = (s: GameState, p: Project): Money => Math.round(ownedValue(s, p) * 0.004);

const FAULTS: [string, number, number][] = [['Asansör arızası', 0.004, 0.5], ['Çatı sorunu', 0.006, 0.7], ['Tesisat sorunu', 0.005, 1], ['Dış cephe yenileme', 0.012, 0.25], ['Ortak alan onarımı', 0.002, 1.2]];
/** Aylık: kira tahsilatı (gecikme/borç), memnuniyet, sözleşme yenileme veya ayrılma, bina durumu ve arızalar. */
export function realestateMonthly(s: GameState, events: GameEvent[]): void {
  const day = s.clock.day;
  for (const p of s.projects) {
    if (p.status !== 'tamamlandi') continue; const owned = ownedUnits(s, p); if (!owned.length) continue;
    // bina durumu: yavaş yıpranma; arıza olasılığı durum kötüleştikçe artar
    p.cond = clamp(condOf(p) - 0.2, 0, 100);
    const cnd = condOf(p), age = Math.min(1.5, 0.6 + (day - (p.build?.doneDay ?? p.createdDay)) / 1500);
    if (owned.some((u) => u.rent) || owned.length > 1) for (const [name, pct, w] of FAULTS) if (rand(s.rng, 'market') < 0.006 * w * age * (1 + (60 - cnd) / 50)) {
      const cost = Math.round(ownedValue(s, p) * pct); post(s, 'emlak_bakim', -cost, { projectId: p.id, memo: `${p.name}: ${name}` }); p.cond = clamp(cnd + 6, 0, 100);
      for (const u of owned) if (u.rent) { const r = tenantOf(s, u)!; r.sat = clamp(r.sat! - 3, 0, 100); }
      events.push({ type: 'BUILDING_FAULT', day, data: { projectId: p.id, name, cost } }); break;
    }
  }
  for (const u of s.units) {
    if (!u.rent) continue; const p = s.projects.find((x) => x.id === u.projectId); if (!p) continue; const r = tenantOf(s, u)!;
    // tahsilat: ödeme düzeni düşükse gecikme; gecikmiş kira bir sonraki ay (olasılıkla) tahsil edilir
    const late = rand(s.rng, 'market') < ((100 - r.pay!) / 100) * 0.35;
    if (late) { r.arrears = (r.arrears ?? 0) + r.amount; r.lateMonths = (r.lateMonths ?? 0) + 1; events.push({ type: 'RENT_LATE', day, data: { projectId: p.id, unitId: u.id, tenant: r.tenant } }); }
    else { post(s, 'kira_geliri', r.amount, { projectId: p.id, memo: `${p.name}: kira (${u.rooms}, ${u.floor}. kat)` }); if ((r.arrears ?? 0) > 0 && rand(s.rng, 'market') < 0.7) { post(s, 'kira_geliri', r.arrears!, { projectId: p.id, memo: `${p.name}: gecikmiş kira tahsilatı` }); r.arrears = 0; r.lateMonths = 0; } }
    if ((r.lateMonths ?? 0) >= 3) { endTenancy(s, p, u, 'temerrüt', events); continue; } // 3 ay ödemezse depozitodan mahsup edilir ve sözleşme biter
    // memnuniyet: bina durumu ve kira/piyasa oranı
    const mr = marketRent(s, p, u), target = clamp(40 + 0.5 * condOf(p) + (1 - r.amount / Math.max(1, mr)) * 60, 5, 95); r.sat = Math.round(clamp(r.sat! + (target - r.sat!) * 0.25, 0, 100));
    // hasar: özensiz kiracılar depozitodan düşülecek hasar bırakabilir
    if (rand(s.rng, 'market') < tenantProfile(r.seed).careless * 0.012) { const dmg = Math.round(r.amount * (0.4 + rand(s.rng, 'market'))); post(s, 'emlak_bakim', -dmg, { projectId: p.id, memo: `${p.name}: kiracı hasarı` }); events.push({ type: 'RENT_DAMAGE', day, data: { projectId: p.id, unitId: u.id, amount: dmg } }); }
    // sözleşme sonu: yenileme (kira artışıyla) ya da ayrılma
    if (day >= (r.endDay ?? day + 1)) {
      const inc = incPct(s), accept = clamp(0.92 - Math.max(0, inc - s.macro.inflation) / 40 + (r.sat! - 60) / 200 - (r.lateMonths ?? 0) * 0.05, 0.08, 0.97);
      if (rand(s.rng, 'market') < accept) { r.amount = Math.round(Math.min(mr * 1.15, r.amount * (1 + inc / 100))); r.endDay = day + 360; r.renewals = (r.renewals ?? 0) + 1; events.push({ type: 'RENT_RENEWED', day, data: { projectId: p.id, unitId: u.id, tenant: r.tenant, amount: r.amount } }); }
      else endTenancy(s, p, u, 'sözleşme bitti', events); continue;
    }
    if (rand(s.rng, 'market') < RENT_LEAVE * (1 + (60 - r.sat!) / 60) * 0.6) endTenancy(s, p, u, 'ayrıldı', events);
  }
}

export interface PortfolioRow { unit: Unit; project: Project; cost: Money; value: Money; rent: Money; yearly: Money; maint: Money; net: Money; yieldPct: number; payback: number | null; state: 'kirada' | 'bos' | 'kiralik' | 'satilik' | 'rezerve' }
/** Portföy satırları: yalnızca şirkete ait (satılmamış, arsa sahibine ait olmayan) birimler. Maliyet payı alan oranıyla dağıtılır; bakım gideri son 12 ayın defterinden gelir. */
export function portfolio(s: GameState): PortfolioRow[] {
  const out: PortfolioRow[] = [], cut = s.clock.day - 365, maintBy = new Map<number, Money>();
  for (const e of s.ledger) if (e.day >= cut && e.cat === 'emlak_bakim' && (e as { projectId?: number }).projectId !== undefined) { const id = (e as { projectId?: number }).projectId!; maintBy.set(id, (maintBy.get(id) ?? 0) - e.amount); }
  for (const p of s.projects) {
    if (p.status !== 'tamamlandi') continue; const per = fairPerM2(s, p), us = unitsOf(s, p.id).filter((u) => !u.landlord), area = us.reduce((a, u) => a + u.area, 0) || 1, parcel = s.parcels.find((x) => x.id === p.parcelId), total = (p.result?.cost ?? 0) + (parcel?.costBasis ?? 0);
    const mine = us.filter((u) => u.status !== 'satildi'), mArea = mine.reduce((a, u) => a + u.area, 0) || 1, maintP = maintBy.get(p.id) ?? 0;
    for (const u of mine) {
      const value = Math.round(unitFair(u, per) * condFactor(p)), cost = Math.round((total * u.area) / area), rent = u.rent ? (tenantOf(s, u) ? u.rent.amount : 0) : Math.round(value * RENT_YIELD * (u.radj ?? 1)), yearly = u.rent ? rent * 12 : 0, maint = Math.round((maintP * u.area) / mArea), net = yearly - maint;
      out.push({ unit: u, project: p, cost, value, rent, yearly, maint, net, yieldPct: value > 0 ? net / value : 0, payback: net > 0 ? cost / net : null, state: u.rent ? 'kirada' : u.hold ? 'rezerve' : u.listing === 'kira' ? 'kiralik' : 'satilik' });
    }
  }
  return out;
}
export function buildingStats(s: GameState, p: Project): { units: number; rented: number; occupancy: number; income12: Money; maint12: Money; cond: number } {
  const owned = ownedUnits(s, p), rented = owned.filter((u) => u.rent).length, cut = s.clock.day - 365; let inc = 0, mt = 0;
  for (const e of s.ledger) { const pid = (e as { projectId?: number }).projectId; if (pid !== p.id || e.day < cut) continue; if (e.cat === 'kira_geliri') inc += e.amount; else if (e.cat === 'emlak_bakim') mt -= e.amount; }
  return { units: owned.length, rented, occupancy: owned.length ? rented / owned.length : 0, income12: inc, maint12: mt, cond: Math.round(condOf(p)) };
}
void monthKey; void TL;
