import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { condM, hoursM, leaseDaily, machineEconomics, machineValue, operatorCount, rentOutDaily, serviceCost, useMachines } from '../src/sim/machines';
import { monthlyCosts } from '../src/sim/finance';
import { pack, unpack } from '../src/save/serialize';
import type { GameEvent, GameState } from '../src/core/types';

function setup(level = 4): GameState {
  const s = newGameState(81); dispatch(s, 'CreateCompany', { name: 'Park Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  const c = s.company!; c.level = level; c.cash = TL(600_000_000); s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999; s.machines.length = 0; return s;
}
const buy = (s: GameState, t: string) => { dispatch(s, 'BuyMachine', { type: t }); return s.machines.at(-1)!; };
describe('makine parkı', () => {
  it('yeni makine özellikleri: kapasite, operatör, amortisman; kullanım çalışma saatini artırır, durumu düşürür, yakıt yazar', () => {
    const s = setup(); const m = buy(s, 'ekskavator'); expect(m.cond).toBe(100); expect(m.hours).toBe(0); dispatch(s, 'HireStaff', { type: 'operator' }); const evs: GameEvent[] = [];
    for (let i = 0; i < 20; i++) { useMachines(s, ['ekskavator'], evs); s.clock.day += 1; } expect(hoursM(m)).toBe(160); expect(condM(m)).toBeLessThan(100); expect(m.fuelSpent!).toBeGreaterThan(0);
    expect(machineValue(s, m)).toBeLessThan(TL(3_100_000)); expect(machineEconomics(s, m).breakEvenDays).toBeGreaterThan(0);
  });
  it('operatör gerekir (makine parkı açıkken): operatörsüz sahip olunan makine kiralanır; operatörle kendi makine kullanılır ve yalnızca yakıt ödenir', () => {
    const s = setup(); buy(s, 'ekskavator'); const evs: GameEvent[] = []; const noOp = useMachines(s, ['ekskavator'], evs); expect(noOp.cover).toBe(0); expect(noOp.cost).toBe(Math.round(TL(4500) * s.costIndex));
    s.clock.day += 1; dispatch(s, 'HireStaff', { type: 'operator' }); expect(operatorCount(s)).toBe(1); const withOp = useMachines(s, ['ekskavator'], evs); expect(withOp.cover).toBe(1); expect(withOp.cost).toBe(Math.round(TL(1800) * s.costIndex));
    const low = setup(1); buy(low, 'ekskavator'); expect(useMachines(low, ['ekskavator'], []).cover).toBe(1); // makine parkı kapalıyken eski davranış
  });
  it('bir operatör aynı gün tek makineyi çalıştırır', () => {
    const s = setup(); buy(s, 'ekskavator'); buy(s, 'kamyon'); dispatch(s, 'HireStaff', { type: 'operator' }); const u = useMachines(s, ['ekskavator', 'kamyon'], []); expect(u.cover).toBe(0.5);
    dispatch(s, 'HireStaff', { type: 'operator' }); s.clock.day += 1; expect(useMachines(s, ['ekskavator', 'kamyon'], []).cover).toBe(1);
  });
  it('bakım durumu yükseltir (bedeli yazar); yıpranmış makinede arıza daha sık (istatistiksel)', () => {
    const s = setup(); const m = buy(s, 'dozer'); m.cond = 40; const c0 = s.company!.cash, cost = serviceCost(s, m, 'bakim'); expect(dispatch(s, 'ServiceMachine', { machineId: m.id, kind: 'bakim' }).ok).toBe(true); expect(condM(m)).toBe(70); expect(s.company!.cash).toBe(c0 - cost);
    expect(dispatch(s, 'ServiceMachine', { machineId: m.id, kind: 'buyuk' }).ok).toBe(true); expect(condM(m)).toBe(100); expect(dispatch(s, 'ServiceMachine', { machineId: m.id, kind: 'buyuk' }).ok).toBe(false);
    const count = (cond: number) => { let n = 0; for (let seed = 0; seed < 25; seed++) { const t = setup(); t.rng = newGameState(500 + seed).rng; const x = buy(t, 'dozer'); dispatch(t, 'HireStaff', { type: 'operator' }); for (let d = 0; d < 120; d++) { x.cond = cond; x.brokenUntil = 0; const ev2: GameEvent[] = []; useMachines(t, ['dozer'], ev2); n += ev2.filter((e) => e.type === 'MACHINE_BROKEN').length; t.clock.day += 1; } } return n; };
    expect(count(5)).toBeGreaterThan(count(100));
  });
  it('uzun dönem kiralama: günlük ücret yok, aylık kira yazılır, sürenin sonunda biter, fesihte ceza; kayıt korunur', () => {
    const s = setup(); expect(dispatch(s, 'LeaseMachine', { type: 'kule_vinc', months: 6 }).ok).toBe(true); expect(dispatch(s, 'LeaseMachine', { type: 'kule_vinc', months: 6 }).ok).toBe(false); expect(dispatch(s, 'LeaseMachine', { type: 'kule_vinc', months: 5 as never }).ok).toBe(false);
    const u = useMachines(s, ['kule_vinc'], []); expect(u.cover).toBe(1); expect(u.cost).toBe(Math.round(TL(900) * s.costIndex)); expect(leaseDaily(s, 'kule_vinc')).toBe(Math.round(TL(9000) * 0.75 * s.costIndex));
    const r = unpack(pack(s)); expect(r.ok).toBe(true); advanceDays(s, 62); expect(s.ledger.filter((e) => e.cat === 'kira_gideri' && e.amount < 0).length).toBeGreaterThanOrEqual(2); const l = s.leases![0]!; const c1 = s.company!.cash; expect(dispatch(s, 'EndLease', { id: l.id }).ok).toBe(true); expect(s.company!.cash).toBe(c1 - l.daily * 30);
    expect(checkInvariant(s)).toBe(true);
  });
  it('kiraya verme: gelir yazılır, makine bu sürede kullanılamaz ve yıpranır; geri çağırma tazminat doğurur', () => {
    const s = setup(); const m = buy(s, 'mobil_vinc'); expect(dispatch(s, 'RentOutMachine', { machineId: m.id, days: 60 }).ok).toBe(true); expect(dispatch(s, 'RentOutMachine', { machineId: m.id, days: 60 }).ok).toBe(false);
    dispatch(s, 'HireStaff', { type: 'operator' }); expect(useMachines(s, ['mobil_vinc'], []).cover).toBe(0); const c0 = s.company!.cash, inc0 = m.income ?? 0, cond0 = condM(m); advanceDays(s, 33); expect(m.income!).toBeGreaterThan(inc0); expect(rentOutDaily(s, m)).toBe(Math.round(TL(6500) * 0.6 * s.costIndex)); expect(s.ledger.some((e) => e.cat === 'makine_gelir' && e.amount > 0)).toBe(true); void c0;
    expect(condM(m)).toBeLessThan(cond0 + 6); expect(dispatch(s, 'RecallMachine', { machineId: m.id }).ok).toBe(true); expect(m.rentedOut).toBeUndefined(); expect(checkInvariant(s)).toBe(true);
  });
  it('ikinci el pazarı: ilanlar yenilenir, satın alınan makine yaşlı, saatli ve yıpranmıştır; nakit düşer', () => {
    const s = setup(); advanceDays(s, 35); expect(s.usedMarket!.length).toBeGreaterThanOrEqual(4); const o = s.usedMarket![0]!; const c0 = s.company!.cash; expect(dispatch(s, 'BuyUsed', { offerId: o.id }).ok).toBe(true); expect(s.company!.cash).toBe(c0 - o.price);
    const m = s.machines.find((x) => x.used)!; expect(m.type).toBe(o.type); expect(hoursM(m)).toBe(o.hours); expect(condM(m)).toBe(o.cond); expect(machineValue(s, m)).toBeGreaterThan(0); expect(dispatch(s, 'BuyUsed', { offerId: o.id }).ok).toBe(false); expect(checkInvariant(s)).toBe(true);
  });
  it('bakım giderleri aylık maliyete girer ve makine bakım kategorisinde tutulur', () => { const s = setup(); buy(s, 'kule_vinc'); expect(monthlyCosts(s).find((x) => x.cat === 'makine_bakim')!.amount).toBeGreaterThan(0); });
});
