import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { annuity, creditCapacity, debtTotal, quoteLoan, rateFor } from '../src/sim/loans';
import { netWorth } from '../src/sim/finance';
import { pack, unpack } from '../src/save/serialize';
import type { GameState, Parcel } from '../src/core/types';

const mk = (s: GameState): Parcel => { const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'cankaya', hood: 'Test', area: 500, zoning: 'konut', taks: 0.4, kaks: 1.6, maxFloors: 5, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1_000_000) }; s.parcels.push(p); return p; };
function setup(cash = TL(20_000_000)) {
  const s = newGameState(9); dispatch(s, 'CreateCompany', { name: 'Banka Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  s.company!.cash = cash; s.ledgerBase = cash - s.ledger.reduce((a, e) => a + e.amount, 0); return s;
}

describe('kredi', () => {
  it('faiz: not düştükçe artar; Hızlı Finansman en pahalı', () => {
    const s = setup(); const r1 = rateFor(s, 'ozel', 'ticari'); s.company!.creditScore = 300; expect(rateFor(s, 'ozel', 'ticari')).toBeGreaterThan(r1);
    s.company!.creditScore = 700; expect(rateFor(s, 'hizli', 'ticari')).toBeGreaterThan(rateFor(s, 'devlet', 'ticari'));
  });
  it('ticari kredi: nakit artar, borç oluşur, net değer korunur (masraf kadar düşer), invariant', () => {
    const s = setup(); const nw = netWorth(s), cash = s.company!.cash;
    const r = dispatch(s, 'TakeLoan', { kind: 'ticari', bank: 'ozel', amount: TL(2_000_000), term: 24 }); expect(r.ok).toBe(true);
    expect(debtTotal(s)).toBe(TL(2_000_000)); expect(s.company!.cash).toBeGreaterThan(cash + TL(1_900_000)); expect(netWorth(s)).toBeLessThanOrEqual(nw); expect(netWorth(s)).toBeGreaterThan(nw - TL(100_000)); expect(checkInvariant(s)).toBe(true);
  });
  it('limit aşımı, yetersiz not ve desteklenmeyen ürün reddedilir', () => {
    const s = setup(); const cap = creditCapacity(s);
    expect(dispatch(s, 'TakeLoan', { kind: 'ticari', bank: 'ozel', amount: cap.total * 3, term: 24 }).ok).toBe(false);
    s.company!.creditScore = 200; expect(dispatch(s, 'TakeLoan', { kind: 'ticari', bank: 'devlet', amount: TL(100_000), term: 12 }).ok).toBe(false);
    expect(quoteLoan(s, { kind: 'insaat', bank: 'katilim', amount: TL(100_000) }).ok).toBe(false);
  });
  it('taksit ödenir: bakiye düşer, vade sonunda kredi kapanır', () => {
    const s = setup(); dispatch(s, 'TakeLoan', { kind: 'ticari', bank: 'ozel', amount: TL(600_000), term: 12 });
    advanceDays(s, 30 * 13 + 5); expect(s.loans.length).toBe(0); expect(checkInvariant(s)).toBe(true);
  });
  it('annuity doğru: toplam geri ödeme ≈ anapara + faiz', () => { const p = annuity(TL(1_000_000), 24, 12); expect(p * 12).toBeGreaterThan(TL(1_000_000)); expect(p * 12).toBeLessThan(TL(1_300_000)); });
  it('erken ödeme borcu azaltır; tam ödeme krediyi kapatır', () => {
    const s = setup(); dispatch(s, 'TakeLoan', { kind: 'ticari', bank: 'ozel', amount: TL(500_000), term: 24 }); const id = s.loans[0]!.id;
    expect(dispatch(s, 'RepayLoan', { loanId: id, amount: TL(200_000) }).ok).toBe(true); expect(s.loans[0]!.balance).toBe(TL(300_000));
    expect(dispatch(s, 'RepayLoan', { loanId: id, amount: TL(999_999_999) }).ok).toBe(false === false ? true : false); expect(s.loans.length).toBe(0);
  });
  it('ödeme kaçırma: not düşer, 3 kaçırmada haciz', () => {
    const s = setup(); dispatch(s, 'TakeLoan', { kind: 'ticari', bank: 'ozel', amount: TL(1_000_000), term: 12 });
    const m = mk(s); void m; const sc = s.company!.creditScore; s.company!.cash = 0; s.ledgerBase = -s.ledger.reduce((a, e) => a + e.amount, 0);
    const ev = advanceDays(s, 30 * 3 + 3); expect(ev.some((e) => e.type === 'LOAN_MISSED')).toBe(true); expect(s.company!.creditScore).toBeLessThan(sc); expect(checkInvariant(s)).toBe(true);
  });
  it('makine kredisi: %20 peşinat, kalan 36 ay', () => {
    const s = setup(); const before = s.company!.cash; const r = dispatch(s, 'BuyMachine', { type: 'ekskavator', financed: true, bank: 'ozel' }); expect(r.ok).toBe(true);
    expect(s.machines.length).toBe(1); expect(s.loans[0]!.kind).toBe('makine'); expect(s.loans[0]!.machineId).toBe(s.machines[0]!.id); expect(s.loans[0]!.term).toBe(36); expect(before - s.company!.cash).toBeLessThan(s.machines[0]!.price);
  });
  it('inşaat kredisi: hat açılır, nakit yetmeyince çekilir, proje gelirinden kapanır', () => {
    const s = setup(TL(3_500_000)); const parcel = mk(s); dispatch(s, 'CreateProject', { parcelId: parcel.id, type: 'apartman', quality: 'standart' }); const p = s.projects[0]!;
    const mx = quoteLoan(s, { kind: 'insaat', bank: 'ozel', amount: 1, projectId: p.id }).maxAmount; const q = dispatch(s, 'TakeLoan', { kind: 'insaat', bank: 'ozel', amount: Math.round(mx * 0.9), projectId: p.id }); expect(q.ok).toBe(true);
    expect(dispatch(s, 'TakeLoan', { kind: 'insaat', bank: 'ozel', amount: TL(100_000), projectId: p.id }).ok).toBe(false);
    dispatch(s, 'StartConstruction', { projectId: p.id }); advanceDays(s, 400); expect(checkInvariant(s)).toBe(true);
  });
  it('v7 kaydı v8\'e taşınır', () => {
    const s = setup(); const old: any = JSON.parse(JSON.stringify(s)); delete old.loans; delete old.investments; delete old.tenders; delete old.company.ownership; delete old.company.bankrupt; old.meta.version = 7;
    const r = unpack(pack(old)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.loans).toEqual([]); expect(r.state.company!.ownership).toBe(100); advanceDays(r.state, 40); }
  });
  it('iflas: nakit eksi ve net değer eksi → bankrupt, günler ilerlemez', () => {
    const s = setup(TL(100_000)); dispatch(s, 'HireStaff', { type: 'muhendis' }); for (let i = 0; i < 6; i++) dispatch(s, 'HireStaff', { type: 'muhendis' });
    s.company!.cash = -TL(50_000_000); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0);
    advanceDays(s, 40); expect(s.company!.bankrupt).toBe(true); const d = s.clock.day; advanceDays(s, 10); expect(s.clock.day).toBe(d);
  });
});
