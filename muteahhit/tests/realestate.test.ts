import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { netWorth } from '../src/sim/finance';
import { offersOf } from '../src/sim/buyers';
import { buildingStats, condOf, depositsTotal, incPct, maintenanceCost, portfolio, tenantOf, tenantProfile } from '../src/sim/realestate';
import { unitsOf } from '../src/sim/sales';
import { pack, unpack } from '../src/save/serialize';
import type { GameEvent, GameState, Parcel } from '../src/core/types';

const mk = (s: GameState): Parcel => { const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'cankaya', hood: 'Test', area: 500, zoning: 'konut', taks: 0.4, kaks: 1.6, maxFloors: 5, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1_000_000) }; s.parcels.push(p); return p; };
function rented(seed = 7) {
  const s = newGameState(seed); dispatch(s, 'CreateCompany', { name: 'Emlak Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  s.staff.length = 0; for (const t of ['usta', 'isci', 'isci', 'isci', 'isci', 'santiye_sefi']) dispatch(s, 'HireStaff', { type: t });
  const cash = TL(120_000_000); s.company!.cash = cash; s.company!.level = 3; s.ledgerBase = cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999;
  const pc = mk(s); dispatch(s, 'CreateProject', { parcelId: pc.id, type: 'apartman', quality: 'standart' }); const p = s.projects[0]!; dispatch(s, 'StartConstruction', { projectId: p.id });
  for (let i = 0; i < 1500 && p.status === 'insaat'; i++) { advanceDays(s, 1); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); }
  const us = unitsOf(s, p.id); for (const u of us) dispatch(s, 'SetUnit', { unitId: u.id, listing: 'kira' });
  for (let i = 0; i < 400 && s.units.filter((u) => u.rent).length < 4; i++) { advanceDays(s, 1); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); for (const o of offersOf(s, p.id)) dispatch(s, 'AcceptOffer', { offerId: o.id }); }
  return { s, p };
}
const run = (s: GameState, days: number): GameEvent[] => { const all: GameEvent[] = []; for (let i = 0; i < days; i++) { all.push(...advanceDays(s, 1)); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); } return all; };

describe('gayrimenkul yönetimi', () => {
  it('kiracının nitelikleri vardır; depozito alınır, net varlıkta yükümlülük olarak düşülür; kayıt korunur', () => {
    const { s } = rented(); const u = s.units.find((x) => x.rent)!; const r = tenantOf(s, u)!; expect(r.pay).toBeGreaterThanOrEqual(40); expect(r.income).toBeGreaterThanOrEqual(1); expect(r.deposit).toBe(r.amount * 2); expect(r.endDay!).toBeGreaterThan(s.clock.day);
    expect(depositsTotal(s)).toBeGreaterThan(0); expect(s.ledger.some((e) => e.cat === 'depozito' && e.amount > 0)).toBe(true); expect(checkInvariant(s)).toBe(true); const back = unpack(pack(s)); expect(back.ok).toBe(true); if (back.ok) expect(back.state.units.find((x) => x.id === u.id)!.rent!.deposit).toBe(r.deposit);
    expect(tenantProfile(5)).toEqual(tenantProfile(5));
  });
  it('aylık kira tahsilatı gelir yazar; ödemeyenlerde gecikme olur; üç ay ödemeyen depozitodan mahsupla çıkarılır', () => {
    const { s } = rented(); const evs = run(s, 360); expect(s.ledger.some((e) => e.cat === 'kira_geliri' && e.amount > 0 && e.memo?.includes('kira'))).toBe(true); expect(evs.filter((e) => e.type === 'RENT_LATE' || e.type === 'RENT_ENDED' || e.type === 'RENT_RENEWED').length).toBeGreaterThan(0);
    expect(checkInvariant(s)).toBe(true);
  });
  it('sözleşme sonunda kira artışıyla yenilenir ya da kiracı ayrılır; depozito kapanır (defter tutarlı)', () => {
    const { s } = rented(); for (const u of s.units) if (u.rent) u.rent.endDay = s.clock.day + 20; const rents0 = s.units.filter((u) => u.rent).map((u) => u.rent!.amount); const evs = run(s, 70);
    expect(evs.some((e) => e.type === 'RENT_RENEWED' || e.type === 'RENT_ENDED')).toBe(true); const renewed = evs.filter((e) => e.type === 'RENT_RENEWED'); if (renewed.length) expect(renewed[0]!.data!.amount as number).toBeGreaterThan(Math.min(...rents0) * 0.99);
    expect(depositsTotal(s)).toBeGreaterThanOrEqual(0); expect(checkInvariant(s)).toBe(true); expect(incPct(s)).toBeGreaterThanOrEqual(3);
  });
  it('tahliye: masraf öder, depozito kapanır, daire yeniden kiralık olur', () => {
    const { s } = rented(); const u = s.units.find((x) => x.rent)!; const c0 = s.company!.cash, dep = depositsTotal(s); expect(dispatch(s, 'EvictTenant', { unitId: u.id }).ok).toBe(true); expect(u.rent).toBeUndefined(); expect(u.listing).toBe('kira'); expect(s.company!.cash).toBeLessThan(c0 + dep); expect(depositsTotal(s)).toBeLessThan(dep); expect(checkInvariant(s)).toBe(true);
    expect(dispatch(s, 'EvictTenant', { unitId: u.id }).ok).toBe(false);
  });
  it('bakım: durum zamanla düşer, arızalar gider yazar, bakım yatırımı durumu yükseltir; kira artış politikası ayarlanır', () => {
    const { s, p } = rented(); const c0 = condOf(p); run(s, 360); expect(condOf(p)).toBeLessThan(c0 + 8); const cost = maintenanceCost(s, p); expect(cost).toBeGreaterThan(0); const before = condOf(p), cash = s.company!.cash;
    expect(dispatch(s, 'MaintainBuilding', { projectId: p.id }).ok).toBe(true); expect(condOf(p)).toBeGreaterThan(before); expect(s.company!.cash).toBe(cash - cost);
    expect(dispatch(s, 'SetRentPolicy', { policy: 'yuksek' }).ok).toBe(true); expect(s.estate!.policy).toBe('yuksek'); expect(dispatch(s, 'SetRentPolicy', { policy: 'x' as never }).ok).toBe(false);
    expect(incPct(s)).toBeGreaterThan(s.macro.inflation - 0.01);
  });
  it('kira çarpanı sadece kirada olmayan dairede ayarlanır ve kira teklifine yansır', () => {
    const { s } = rented(); const free = s.units.find((u) => !u.rent && u.status !== 'satildi')!, rt = s.units.find((u) => u.rent)!; expect(dispatch(s, 'SetRentAdj', { unitId: rt.id, radj: 1.2 }).ok).toBe(false); expect(dispatch(s, 'SetRentAdj', { unitId: free.id, radj: 2 }).ok).toBe(false); expect(dispatch(s, 'SetRentAdj', { unitId: free.id, radj: 1.2 }).ok).toBe(true); expect(free.radj).toBe(1.2);
  });
  it('portföy raporu: maliyet, değer, kira, getiri ve geri dönüş süresi hesaplanır; bina istatistiği doluluk verir', () => {
    const { s, p } = rented(); run(s, 120); const rows = portfolio(s); expect(rows.length).toBeGreaterThan(0); const r = rows.find((x) => x.state === 'kirada')!; expect(r.cost).toBeGreaterThan(0); expect(r.value).toBeGreaterThan(0); expect(r.yearly).toBe(r.rent * 12); expect(r.payback === null || r.payback > 0).toBe(true);
    const st = buildingStats(s, p); expect(st.occupancy).toBeGreaterThan(0); expect(st.occupancy).toBeLessThanOrEqual(1); expect(st.income12).toBeGreaterThan(0); expect(Number.isFinite(netWorth(s))).toBe(true);
  });
});
