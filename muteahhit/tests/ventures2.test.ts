import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { netWorth } from '../src/sim/finance';
import { energyPrice, opsOf, productionMWh, selfCoverage, ventureCandidates, ventureMonth } from '../src/sim/ventures';
import { pack, unpack } from '../src/save/serialize';
import type { GameState, Project } from '../src/core/types';

function setup(level = 6): GameState {
  const s = newGameState(33); dispatch(s, 'CreateCompany', { name: 'Isletme Holding', founderBackground: 'emlakci', startCity: 'ankara' });
  const c = s.company!; c.level = level; c.reputation = 70; c.creditScore = 700; c.cash = TL(900_000_000); s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999; for (const x of ['antalya', 'izmir']) if (!s.openCities.includes(x)) s.openCities.push(x); return s;
}
function done(s: GameState, type: string, city = 'ankara'): Project {
  const cost = TL(60_000_000);
  const p: Project = { id: s.nextId++, parcelId: 1, hood: 'Test', name: `Test ${type}`, type, quality: 'standart', designSeed: 7, status: 'tamamlandi', createdDay: 0, cityId: city, floors: 6, satilabilir: 6000,
    matIndexAtPlan: 100, budget: { base: cost, soil: 0, soft: 0, total: cost, designFee: 0 }, expected: { revenue: cost, months: 30 }, result: { qualityScore: 80, cost, days: 900, plannedDays: 900 } } as unknown as Project;
  s.projects.push(p); return p;
}

describe('işletmeler: yeni türler ve yönetim', () => {
  it('iş merkezi ve ofis işletmeye alınır; restoran/otopark kurulur; tatil köyü yalnızca sahilde', () => {
    const s = setup(); const a = done(s, 'is_merkezi'), b = done(s, 'ofis');
    expect(dispatch(s, 'OperateProject', { projectId: a.id }).ok).toBe(true); expect(dispatch(s, 'OperateProject', { projectId: b.id }).ok).toBe(true);
    expect(dispatch(s, 'BuildVenture', { kind: 'restoran', city: 'ankara', tier: 1 }).ok).toBe(true); expect(dispatch(s, 'BuildVenture', { kind: 'otopark', city: 'ankara', tier: 0 }).ok).toBe(true);
    expect(dispatch(s, 'BuildVenture', { kind: 'tatil', city: 'ankara', tier: 0 }).ok).toBe(false);
    expect(s.ventures.length).toBe(4); advanceDays(s, 400); expect(checkInvariant(s)).toBe(true);
    for (const v of s.ventures) expect(v.total.revenue, v.kind).toBeGreaterThan(0);
  });
  it('fiyat, personel, reklam ve müdür ayarları gelir/gideri değiştirir; geçersiz değerler reddedilir', () => {
    const s = setup(); dispatch(s, 'OperateProject', { projectId: done(s, 'otel').id }); const v = s.ventures[0]!, day = 200;
    const base = ventureMonth(s, v, day);
    expect(dispatch(s, 'SetVentureOps', { id: v.id, price: 2 }).ok).toBe(false); expect(dispatch(s, 'SetVentureOps', { id: v.id, staff: 7 }).ok).toBe(false);
    dispatch(s, 'SetVentureOps', { id: v.id, staff: 1 }); expect(ventureMonth(s, v, day).cost).toBeLessThan(base.cost);
    dispatch(s, 'SetVentureOps', { id: v.id, staff: 2, ads: 3 }); expect(ventureMonth(s, v, day).cost).toBeGreaterThan(base.cost);
    dispatch(s, 'SetVentureOps', { id: v.id, ads: 1, price: 0.85 }); expect(ventureMonth(s, v, day).occ).toBeGreaterThanOrEqual(base.occ);
    const cand = ventureCandidates(s, v)[0]!; expect(dispatch(s, 'HireVentureMgr', { id: v.id, candId: 99999 }).ok).toBe(false);
    expect(dispatch(s, 'HireVentureMgr', { id: v.id, candId: cand.id }).ok).toBe(true); expect(opsOf(v).mgr?.name).toBe(cand.name);
    expect(dispatch(s, 'HireVentureMgr', { id: v.id, candId: cand.id }).ok).toBe(false); expect(dispatch(s, 'FireVentureMgr', { id: v.id }).ok).toBe(true); expect(opsOf(v).mgr).toBeNull();
    advanceDays(s, 200); expect(checkInvariant(s)).toBe(true);
  });
  it('site yönetimi: satılmış daireler yeterliyse yönetim üstlenilir, gelir doğar; satınca bağ çözülür', () => {
    const s = setup(); const p = done(s, 'site'); expect(dispatch(s, 'ManageSite', { projectId: p.id }).ok).toBe(false);
    for (let i = 0; i < 10; i++) s.units.push({ id: s.nextId++, projectId: p.id, status: 'satildi', price: TL(2_000_000) } as never);
    const cash = s.company!.cash; expect(dispatch(s, 'ManageSite', { projectId: p.id }).ok).toBe(true); expect(cash - s.company!.cash).toBe(Math.round(TL(2_000_000) * 10 * 0.02)); expect(p.managedBy).toBe(s.ventures[0]!.id);
    expect(dispatch(s, 'ManageSite', { projectId: p.id }).ok).toBe(false); advanceDays(s, 120); expect(s.ventures[0]!.total.revenue).toBeGreaterThan(0); expect(checkInvariant(s)).toBe(true);
    dispatch(s, 'SellVenture', { id: s.ventures[0]!.id }); expect(p.managedBy).toBeUndefined();
  });
  it('kayıt/yükleme: işletme ayarları, PPA ve enerji piyasası korunur', () => {
    const s = setup(); dispatch(s, 'OperateProject', { projectId: done(s, 'avm').id }); dispatch(s, 'SetVentureOps', { id: s.ventures[0]!.id, ads: 2, price: 1.15 }); advanceDays(s, 100);
    const r = unpack(pack(s)); expect(r.ok).toBe(true); if (!r.ok) return; const t = r.state; expect(opsOf(t.ventures[0]!).ads).toBe(2); expect(opsOf(t.ventures[0]!).price).toBe(1.15); expect(t.energy?.price).toBe(s.energy?.price);
  });
});

describe('enerji şirketi', () => {
  it('depolama kurulur; PPA sabit fiyat verir, iptal edilir; üretim hava ve mevsime bağlıdır', () => {
    const s = setup(); dispatch(s, 'BuildVenture', { kind: 'gunes', city: 'antalya', tier: 1 }); dispatch(s, 'BuildVenture', { kind: 'depolama', city: 'ankara', tier: 0 });
    const g = s.ventures[0]!, d = s.ventures[1]!; expect(d.kind).toBe('depolama'); advanceDays(s, 150);
    expect(productionMWh(s, g, 190)).toBeGreaterThan(productionMWh(s, g, 5) * 1.5);
    expect(dispatch(s, 'SetPPA', { id: d.id, months: 12 }).ok).toBe(false); expect(dispatch(s, 'SetPPA', { id: g.id, months: 7 }).ok).toBe(false);
    expect(dispatch(s, 'SetPPA', { id: g.id, months: 12 }).ok).toBe(true); expect(g.ppa!.price).toBeCloseTo(energyPrice(s) * 0.97, 2); expect(dispatch(s, 'SetPPA', { id: g.id, months: 12 }).ok).toBe(false);
    advanceDays(s, 400); expect(g.total.revenue).toBeGreaterThan(0); expect(checkInvariant(s)).toBe(true); expect(dispatch(s, 'SetPPA', { id: g.id, months: 0 }).ok).toBe(true); expect(g.ppa).toBeUndefined();
  });
  it('kendi tüketimi karşılama: işletmeler elektrik tüketir, santral üretimi kapsama oranını verir ve gideri düşürür', () => {
    const s = setup(); dispatch(s, 'OperateProject', { projectId: done(s, 'avm').id }); const before = ventureMonth(s, s.ventures[0]!, 200).cost;
    expect(selfCoverage(s).cons).toBeGreaterThan(0); expect(selfCoverage(s).coverage).toBe(0);
    dispatch(s, 'BuildVenture', { kind: 'gunes', city: 'antalya', tier: 2 }); advanceDays(s, 100);
    expect(selfCoverage(s).coverage).toBeGreaterThan(0); expect(ventureMonth(s, s.ventures[0]!, 200).cost).toBeLessThan(before);
  });
  it('10 yıl: enerji + işletme karması defteri bozmaz, net değer sonlu', () => {
    const s = setup(); dispatch(s, 'OperateProject', { projectId: done(s, 'otel', 'antalya').id }); dispatch(s, 'BuildVenture', { kind: 'ruzgar', city: 'izmir', tier: 1 }); dispatch(s, 'BuildVenture', { kind: 'restoran', city: 'ankara', tier: 0 });
    advanceDays(s, 3650); expect(checkInvariant(s)).toBe(true); expect(Number.isFinite(netWorth(s))).toBe(true);
  });
});
