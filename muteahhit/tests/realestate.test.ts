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

describe('yenileme ve sat-tut analizi', () => {
  it('yenileme parayı düşer, durumu ve değeri kalıcı yükseltir; 2 yıl içinde tekrar yapılamaz; analiz sonlu', async () => {
    const { dispatch } = await import('../src/core/commands'); const { newGameState } = await import('../src/core/state'); const { TL } = await import('../src/core/money');
    const { renovCost, holdAnalysis, portfolio, ownedValue, RENOVATIONS } = await import('../src/sim/realestate'); const { checkInvariant } = await import('../src/sim/ledger');
    const s = newGameState(91); dispatch(s, 'CreateCompany', { name: 'Yenileme Yapı', founderBackground: 'emlakci', startCity: 'ankara' }); const c = s.company!; c.cash = TL(900_000_000); s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0);
    const p = { id: s.nextId++, parcelId: 1, hood: 'T', name: 'Eski Apt', type: 'apartman', quality: 'standart', designSeed: 1, status: 'tamamlandi', createdDay: 0, cityId: 'ankara', floors: 6, satilabilir: 800, matIndexAtPlan: 100, budget: { base: 1, soil: 0, soft: 0, total: 1, designFee: 0 }, expected: { revenue: 1, months: 1 }, result: { qualityScore: 60, cost: TL(20_000_000), days: 1, plannedDays: 1 } } as never;
    s.projects.push(p); for (let i = 0; i < 6; i++) s.units.push({ id: s.nextId++, projectId: (p as { id: number }).id, area: 100, rooms: '2+1', floor: i, view: 1, facing: 'G', mult: 1, status: 'bos' } as never);
    const pr = s.projects.at(-1)!; const v0 = ownedValue(s, pr), cash0 = c.cash, cond0 = pr.cond ?? 60; expect(RENOVATIONS.cephe).toBeDefined();
    expect(dispatch(s, 'RenovateBuilding', { projectId: pr.id, kind: 'yok' }).ok).toBe(false); expect(dispatch(s, 'RenovateBuilding', { projectId: pr.id, kind: 'cephe' }).ok).toBe(true);
    expect(cash0 - c.cash).toBe(Math.round(v0 * 0.035)); expect(pr.cond!).toBeGreaterThan(cond0); expect(ownedValue(s, pr)).toBeGreaterThan(v0); expect(dispatch(s, 'RenovateBuilding', { projectId: pr.id, kind: 'cephe' }).ok).toBe(false); expect(renovCost(s, pr, 'ic')).toBeGreaterThan(0);
    const a = holdAnalysis(s, portfolio(s).filter((r) => r.project.id === pr.id)); expect(Number.isFinite(a.net)).toBe(true); expect(['tut', 'sat']).toContain(a.advice); expect(a.saleCash).toBeLessThan(a.value); expect(checkInvariant(s)).toBe(true);
  });
});

describe('kira ilanı reklamı ve yenileme fırsatı', () => {
  it('reklam düzeyi doğrulanır, boş kiralık dairelere aylık gider yazar; yenileme fırsatı düşük durumlu bina oluşturur', async () => {
    const { dispatch } = await import('../src/core/commands'); const { newGameState } = await import('../src/core/state'); const { TL } = await import('../src/core/money'); const { advanceDays } = await import('../src/sim/engine'); const { checkInvariant } = await import('../src/sim/ledger');
    const { condOf } = await import('../src/sim/realestate'); const { makeDeal } = await import('../src/sim/deals');
    const s = newGameState(93); dispatch(s, 'CreateCompany', { name: 'Reklam Yapı', founderBackground: 'emlakci', startCity: 'ankara' }); const c = s.company!; c.cash = TL(900_000_000); c.level = 5; s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999;
    const p = { id: s.nextId++, parcelId: 1, hood: 'T', name: 'Reklam Apt', type: 'apartman', quality: 'standart', designSeed: 1, status: 'tamamlandi', createdDay: 0, cityId: 'ankara', floors: 6, satilabilir: 800, matIndexAtPlan: 100, budget: { base: 1, soil: 0, soft: 0, total: 1, designFee: 0 }, expected: { revenue: 1, months: 1 }, result: { qualityScore: 80, cost: TL(20_000_000), days: 1, plannedDays: 1 } } as never; s.projects.push(p);
    for (let i = 0; i < 4; i++) s.units.push({ id: s.nextId++, projectId: (p as { id: number }).id, area: 100, rooms: '2+1', floor: i, view: 1, facing: 'G', mult: 1, status: 'bos', listing: 'kira' } as never);
    const pr = s.projects.at(-1)!; expect(dispatch(s, 'SetRentAd', { projectId: pr.id, level: 9 }).ok).toBe(false); expect(dispatch(s, 'SetRentAd', { projectId: pr.id, level: 3 }).ok).toBe(true); expect(pr.rentAd).toBe(3);
    const l0 = s.ledger.length; advanceDays(s, 35); expect(s.ledger.slice(l0).some((e) => e.cat === 'reklam' && e.amount < 0 && e.memo?.includes('Kira ilanı'))).toBe(true); expect(checkInvariant(s)).toBe(true);
    let found = false; for (let i = 0; i < 40 && !found; i++) { s.nextId = 3000 + i * 3; const d = makeDeal(s, 'harap'); if (d) { found = true; expect(d.kind).toBe('harap'); expect(d.qscore).toBeLessThan(55); expect(d.price).toBeLessThan(d.fair * 0.65); } }
    expect(found).toBe(true); void condOf;
  });
});

describe('yenileme fırsatı kabulü', () => {
  it('harap bina devralınınca düşük durumlu tamamlanmış proje olur; yenileme durumu ve değeri yükseltir', async () => {
    const { dispatch } = await import('../src/core/commands'); const { newGameState } = await import('../src/core/state'); const { TL } = await import('../src/core/money'); const { makeDeal } = await import('../src/sim/deals');
    const { condOf, ownedValue } = await import('../src/sim/realestate'); const { checkInvariant } = await import('../src/sim/ledger');
    const s = newGameState(94); dispatch(s, 'CreateCompany', { name: 'Harap Yapı', founderBackground: 'emlakci', startCity: 'ankara' }); const c = s.company!; c.cash = TL(2_000_000_000); c.level = 5; s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0);
    let d = null as ReturnType<typeof makeDeal>; for (let i = 0; i < 30 && !d; i++) { s.nextId = 5000 + i * 3; d = makeDeal(s, 'harap'); } expect(d).not.toBeNull(); (s.deals ??= []).push(d!);
    const r = dispatch(s, 'AcceptDeal', { dealId: d!.id }); expect(r.ok, JSON.stringify(r)).toBe(true); const p = s.projects.at(-1)!; expect(p.status).toBe('tamamlandi'); expect(condOf(p)).toBeLessThan(55);
    const v0 = ownedValue(s, p), c0 = condOf(p); for (const k of ['cephe', 'ic', 'tesisat']) expect(dispatch(s, 'RenovateBuilding', { projectId: p.id, kind: k }).ok, k).toBe(true); expect(condOf(p)).toBeGreaterThan(c0 + 15); expect(ownedValue(s, p)).toBeGreaterThan(v0); expect(checkInvariant(s)).toBe(true);
  });
});
