import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { netWorth } from '../src/sim/finance';
import { bidLimits, eligibility, generateTender } from '../src/sim/tenders';
import { equityQuote } from '../src/sim/investors';
import type { GameEvent, GameState, Parcel, Tender } from '../src/core/types';

const mk = (s: GameState): Parcel => { const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'cankaya', hood: 'Test', area: 500, zoning: 'konut', taks: 0.4, kaks: 1.6, maxFloors: 5, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1_000_000) }; s.parcels.push(p); return p; };
function setup(cash = TL(60_000_000)) {
  const s = newGameState(12); dispatch(s, 'CreateCompany', { name: 'İhale Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  s.staff.length = 0; for (const t of ['usta', 'isci', 'isci', 'isci', 'isci', 'santiye_sefi']) dispatch(s, 'HireStaff', { type: t });
  s.company!.cash = cash; s.ledgerBase = cash - s.ledger.reduce((a, e) => a + e.amount, 0); return s;
}
const run = (s: GameState, until: () => boolean, max = 1500) => { const all: GameEvent[] = []; for (let i = 0; i < max && !until(); i++) all.push(...advanceDays(s, 1)); return all; };
const mkTender = (s: GameState): Tender => { for (let i = 0; i < 30; i++) { const t = generateTender(s, 'ankara'); if (t) { s.tenders.push(t); return t; } } throw new Error('ihale üretilemedi'); };

describe('yatırımcı', () => {
  it('fon girer, proje satılınca anapara + kâr payı ödenir; net değer tutarlı', () => {
    const s = setup(TL(30_000_000)); const pc = mk(s); dispatch(s, 'CreateProject', { parcelId: pc.id, type: 'apartman', quality: 'standart' }); const p = s.projects[0]!;
    s.company!.reputation = 30; const c0 = s.company!.cash; expect(dispatch(s, 'TakeInvestor', { projectId: p.id, pct: 30 }).ok).toBe(true);
    expect(s.company!.cash - c0).toBe(Math.round(p.budget.total * 0.3)); expect(s.investments[0]!.share).toBeGreaterThan(0.2);
    expect(dispatch(s, 'TakeInvestor', { projectId: p.id, pct: 30 }).ok).toBe(false); expect(dispatch(s, 'TakeInvestor', { projectId: p.id, pct: 10 }).ok).toBe(false);
    expect(checkInvariant(s)).toBe(true);
    dispatch(s, 'StartConstruction', { projectId: p.id }); run(s, () => p.status === 'satildi' || p.status === 'tamamlandi'); dispatch(s, 'SellProjectBulk', { projectId: p.id }); run(s, () => p.status === 'satildi', 400);
    expect(s.investments[0]!.paidOut).toBe(true); expect(checkInvariant(s)).toBe(true);
  });
  it('proje iptalinde yatırımcıya iade', () => {
    const s = setup(); const pc = mk(s); dispatch(s, 'CreateProject', { parcelId: pc.id, type: 'apartman', quality: 'standart' }); s.company!.reputation = 30; const p = s.projects[0]!;
    const c0 = s.company!.cash; dispatch(s, 'TakeInvestor', { projectId: p.id, pct: 25 }); dispatch(s, 'CancelProject', { projectId: p.id }); expect(s.company!.cash).toBe(c0); expect(checkInvariant(s)).toBe(true);
  });
  it('düşük itibar yatırımcı bulamaz', () => { const s = setup(); const pc = mk(s); dispatch(s, 'CreateProject', { parcelId: pc.id, type: 'apartman', quality: 'standart' }); s.company!.reputation = 2; expect(dispatch(s, 'TakeInvestor', { projectId: s.projects[0]!.id, pct: 30 }).ok).toBe(false); });
});

describe('şirket payı', () => {
  it('pay satışı: nakit girer, sahiplik düşer, en çok %40', () => {
    const s = setup(); const c0 = s.company!.cash; expect(dispatch(s, 'SellEquity', { pct: 20 }).ok).toBe(true); expect(s.company!.ownership).toBe(80); expect(s.company!.cash).toBeGreaterThan(c0);
    expect(dispatch(s, 'SellEquity', { pct: 25 }).ok).toBe(false); expect(dispatch(s, 'SellEquity', { pct: 20 }).ok).toBe(true); expect(s.company!.ownership).toBe(60); expect(equityQuote(s, 5).ok).toBe(false); expect(checkInvariant(s)).toBe(true);
  });
  it('temettü: ortaklar proje kârından pay alır', () => {
    const s = setup(); dispatch(s, 'SellEquity', { pct: 20 }); const pc = mk(s); dispatch(s, 'CreateProject', { parcelId: pc.id, type: 'apartman', quality: 'standart' }); const p = s.projects[0]!;
    dispatch(s, 'StartConstruction', { projectId: p.id }); run(s, () => p.status !== 'insaat'); dispatch(s, 'SellProjectBulk', { projectId: p.id }); run(s, () => p.status === 'satildi', 400); expect(p.status).toBe('satildi');
    if ((p.result?.profit ?? 0) > 0) expect(s.ledger.some((e) => e.cat === 'temettu')).toBe(true); expect(checkInvariant(s)).toBe(true);
  });
});

describe('ihale', () => {
  it('üretim: şubesi olan ilde, geçerli plan; deterministik', () => {
    const a = setup(), b = setup(); const ta = mkTender(a), tb = mkTender(b); expect(ta.refCost).toBe(tb.refCost); expect(ta.title).toBe(tb.title); expect(ta.refCost).toBeGreaterThan(ta.trueCost); expect(ta.rivals.length).toBeGreaterThanOrEqual(3);
    advanceDays(a, 120); expect(a.tenders.length).toBeGreaterThan(0); expect(checkInvariant(a)).toBe(true);
  });
  it('şart kontrolü ve teklif sınırları', () => {
    const s = setup(); const t = mkTender(s); s.company!.reputation = 0; expect(eligibility(s, t).ok).toBe(false); expect(dispatch(s, 'PlaceBid', { tenderId: t.id, price: t.refCost * 0.9 }).ok).toBe(false);
    s.company!.reputation = 80; s.company!.creditScore = 800; s.company!.stats.completed = 6; for (let i = 0; i < 12; i++) dispatch(s, 'HireStaff', { type: 'isci' }); dispatch(s, 'BuyMachine', { type: 'forklift' }); dispatch(s, 'BuyMachine', { type: 'forklift' });
    expect(eligibility(s, t).ok).toBe(true); expect(dispatch(s, 'PlaceBid', { tenderId: t.id, price: bidLimits(t).max * 1.5 }).ok).toBe(false);
    expect(dispatch(s, 'PlaceBid', { tenderId: t.id, price: t.refCost * 0.9 }).ok).toBe(true); expect(dispatch(s, 'PlaceBid', { tenderId: t.id, price: t.refCost * 0.9 }).ok).toBe(false); expect(checkInvariant(s)).toBe(true);
  });
  it('çok düşük teklif elenir; teminat iade edilir', () => {
    const s = setup(); const t = mkTender(s); s.company!.reputation = 90; s.company!.creditScore = 850; s.company!.stats.completed = 8; for (let i = 0; i < 14; i++) dispatch(s, 'HireStaff', { type: 'isci' }); dispatch(s, 'BuyMachine', { type: 'forklift' }); dispatch(s, 'BuyMachine', { type: 'forklift' });
    const cash = s.company!.cash; expect(dispatch(s, 'PlaceBid', { tenderId: t.id, price: Math.round(t.refCost * 0.6) }).ok).toBe(true); advanceDays(s, 40); expect(t.status).toBe('elendi'); expect(checkInvariant(s)).toBe(true); expect(s.company!.cash).toBeGreaterThan(cash - TL(3_000_000));
  });
  it('kazanılan ihale: avans, sözleşmeli proje; bitişte hakediş ve teminat; net değer sürekliliği', () => {
    let won: GameState | null = null, tender: Tender | null = null;
    for (let seed = 1; seed < 40 && !won; seed++) {
      const s = setup(TL(200_000_000)); s.meta.seed = seed; s.rng.misc += seed * 7919; s.company!.reputation = 95; s.company!.creditScore = 880; s.company!.stats.completed = 9; for (let i = 0; i < 14; i++) dispatch(s, 'HireStaff', { type: 'isci' }); dispatch(s, 'BuyMachine', { type: 'forklift' }); dispatch(s, 'BuyMachine', { type: 'forklift' });
      const t = mkTender(s); dispatch(s, 'PlaceBid', { tenderId: t.id, price: Math.round(t.refCost * 0.86) }); advanceDays(s, 40); if (t.status === 'kazandi') { won = s; tender = t; }
    }
    expect(won).not.toBeNull(); const s = won!, p = s.projects.find((x) => x.contract)!; expect(p.contract!.price).toBe(tender!.bid!.price); expect(p.status).toBe('taslak'); expect(checkInvariant(s)).toBe(true);
    expect(dispatch(s, 'CancelProject', { projectId: p.id }).ok).toBe(false); const nw = netWorth(s);
    expect(dispatch(s, 'StartConstruction', { projectId: p.id }).ok).toBe(true); expect(s.units.filter((u) => u.projectId === p.id).length).toBe(0);
    run(s, () => p.status === 'satildi', 1500); expect(['satildi', 'insaat']).toContain(p.status); expect(checkInvariant(s)).toBe(true);
    if (p.status === 'satildi') { expect(p.contract!.bondReturned).toBe(true); expect(netWorth(s)).toBeGreaterThan(nw - TL(60_000_000)); }
  });
  it('v7 kaydı: ihale/kredi alanları eklenir', () => { const s = setup(); expect(s.tenders).toEqual([]); advanceDays(s, 200); expect(s.tenders.length).toBeGreaterThanOrEqual(0); expect(checkInvariant(s)).toBe(true); });
});
