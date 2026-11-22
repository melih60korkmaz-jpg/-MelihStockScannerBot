import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { netWorth } from '../src/sim/finance';
import { divisionPL } from '../src/sim/holding';
import { acquisitionPrice, fairPrice, SHARES } from '../src/sim/stock';
import { ENERGY_TIERS, ventureMonth, ventureValue } from '../src/sim/ventures';
import { INFRA_KINDS, generateInfraTender, infraCapacity } from '../src/sim/infra';
import { createStaff } from '../src/sim/staff';
import { evaluateTender, placeBid } from '../src/sim/tenders';
import { buildingType } from '../src/data';
import { planProject } from '../src/sim/projects';
import { pack, unpack } from '../src/save/serialize';
import type { GameEvent, GameState, Parcel, Project } from '../src/core/types';

function setup(level = 5, cash = TL(900_000_000)): GameState {
  const s = newGameState(21); dispatch(s, 'CreateCompany', { name: 'Holding Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  const c = s.company!; c.level = level; c.reputation = 70; c.creditScore = 700; c.cash = cash; s.ledgerBase = cash - s.ledger.reduce((a, e) => a + e.amount, 0);
  s.macro.calmUntilDay = 99999; return s;
}
function doneProject(s: GameState, type: 'otel' | 'avm', cost = TL(80_000_000)): Project {
  const p: Project = { id: s.nextId++, parcelId: 1, hood: 'Test', name: type === 'otel' ? 'Deniz Otel' : 'Merkez AVM', type, quality: 'standart', designSeed: 7, status: 'tamamlandi', createdDay: 0, cityId: 'antalya', floors: 6, emsal: 8000, brut: 10400, satilabilir: 6800,
    matIndexAtPlan: 100, budget: { base: cost, soil: 0, soft: 0, total: cost, designFee: 0 }, expected: { revenue: cost, months: 30 }, result: { qualityScore: 80, cost, days: 900, plannedDays: 900 } };
  s.projects.push(p); return p;
}

describe('otel ve AVM işletmeciliği', () => {
  it('seviye kapısı: otel/AVM seviye 4 ister', () => {
    const s = setup(2); const pc: Parcel = { id: 1, city: 'ankara', district: 'cankaya', hood: 'T', area: 9000, zoning: 'ticaret', taks: 0.4, kaks: 1.6, maxFloors: 8, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 90, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1) };
    s.parcels.push(pc); const low = planProject(s, pc, 'otel', 'standart', 0); expect(low.ok).toBe(false);
    s.company!.level = 4; expect(buildingType('otel')?.minLevel).toBe(4);
  });
  it('işletmeye alınca iş kolu doğar, aylık gelir-gider işlenir, defter tutarlı, net değer çift sayılmaz', () => {
    const s = setup(5); const p = doneProject(s, 'otel'); const nw0 = netWorth(s);
    expect(dispatch(s, 'OperateProject', { projectId: p.id }).ok).toBe(true); expect(s.ventures.length).toBe(1); expect(p.operatedBy).toBe(s.ventures[0]!.id);
    expect(dispatch(s, 'OperateProject', { projectId: p.id }).ok).toBe(false);
    advanceDays(s, 365); expect(checkInvariant(s)).toBe(true);
    const v = s.ventures[0]!; expect(v.total.revenue).toBeGreaterThan(0); expect(v.total.cost).toBeGreaterThan(0);
    const net = (v.total.revenue - v.total.cost) / v.capex; expect(net).toBeGreaterThan(0.04); expect(net).toBeLessThan(0.3);
    expect(netWorth(s)).toBeGreaterThan(nw0 * 0.9); expect(ventureValue(s, v)).toBeLessThanOrEqual(v.capex);
    const cash = s.company!.cash; expect(dispatch(s, 'SellVenture', { id: v.id }).ok).toBe(true); expect(s.company!.cash).toBeGreaterThan(cash); expect(s.ventures.length).toBe(0); expect(p.status).toBe('satildi');
  });
  it('mevsim: sahil otelinde yaz > kış; AVM\'de aralık > ocak; getiri makul aralıkta', () => {
    const s = setup(5); const o = doneProject(s, 'otel'); const a = doneProject(s, 'avm'); dispatch(s, 'OperateProject', { projectId: o.id }); dispatch(s, 'OperateProject', { projectId: a.id });
    const [vo, va] = s.ventures as [typeof s.ventures[0], typeof s.ventures[0]];
    const m = (v: typeof vo, month: number) => ventureMonth(s, v, (month - 1) * 30 + 5);
    expect(m(vo, 7).revenue).toBeGreaterThan(m(vo, 1).revenue * 1.8); expect(m(va, 12).revenue).toBeGreaterThan(m(va, 1).revenue);
    for (const v of [vo, va]) { let net = 0; for (let k = 1; k <= 12; k++) { const r = m(v, k); net += r.revenue - r.cost; } const y = net / v.capex; expect(y).toBeGreaterThan(0.06); expect(y).toBeLessThan(0.25); }
  });
});

describe('enerji yatırımları', () => {
  it('santral kurulur: yatırım ödenir, hazır olana dek gelir yok, sonra güneş yazın kıştan fazla; yıllık getiri makul', () => {
    const s = setup(5); const cash0 = s.company!.cash; expect(dispatch(s, 'BuildVenture', { kind: 'gunes', city: 'ankara', tier: 1 }).ok).toBe(true);
    const v = s.ventures[0]!; expect(cash0 - s.company!.cash).toBe(v.capex); expect(v.size).toBe(ENERGY_TIERS.gunes[1]![0]);
    advanceDays(s, 30); expect(v.total.revenue).toBe(0); advanceDays(s, 700); expect(checkInvariant(s)).toBe(true); expect(v.total.revenue).toBeGreaterThan(0);
    const sun = (month: number) => ventureMonth(s, { ...v, id: 5 }, (month - 1) * 30 + 5).revenue; expect(sun(7)).toBeGreaterThan(sun(1) * 2);
    let net = 0; for (let k = 1; k <= 12; k++) { const r = ventureMonth(s, { ...v, id: 5 }, (k - 1) * 30 + 5); net += r.revenue - r.cost; } expect(net / v.capex).toBeGreaterThan(0.05); expect(net / v.capex).toBeLessThan(0.25);
  });
  it('kapılar: seviye 5, açık il, yeterli nakit; hata mesajı döner', () => {
    expect(dispatch(setup(3), 'BuildVenture', { kind: 'gunes', city: 'ankara', tier: 0 }).ok).toBe(false);
    expect(dispatch(setup(5), 'BuildVenture', { kind: 'ruzgar', city: 'istanbul', tier: 0 }).ok).toBe(false);
    expect(dispatch(setup(5, TL(1_000_000)), 'BuildVenture', { kind: 'ruzgar', city: 'ankara', tier: 2 }).ok).toBe(false);
  });
});

describe('holding yönetimi', () => {
  it('strateji ve genel müdür gelir/gideri değiştirir; seviye 6 gerekir; bölüm kâr tablosu defterden gelir', () => {
    const s = setup(5); expect(dispatch(s, 'SetStrategy', { division: 'enerji', strategy: 'buyume' }).ok).toBe(false);
    s.company!.level = 6; dispatch(s, 'BuildVenture', { kind: 'gunes', city: 'ankara', tier: 0 }); const v = s.ventures[0]!, day = 200;
    const base = ventureMonth(s, v, day); dispatch(s, 'SetStrategy', { division: 'enerji', strategy: 'buyume' }); const g = ventureMonth(s, v, day);
    expect(g.revenue).toBeGreaterThan(base.revenue); expect(g.cost).toBeGreaterThan(base.cost);
    dispatch(s, 'SetStrategy', { division: 'enerji', strategy: 'temkinli' }); expect(ventureMonth(s, v, day).cost).toBeLessThan(base.cost);
    dispatch(s, 'SetStrategy', { division: 'enerji', strategy: 'dengeli' }); dispatch(s, 'ToggleGM', { division: 'enerji' }); expect(s.holding.gm.enerji).toBe(true);
    advanceDays(s, 400); const pl = divisionPL(s, 6); expect(pl.enerji.revenue).toBeGreaterThan(0); expect(pl.enerji.cost).toBeGreaterThan(0); expect(checkInvariant(s)).toBe(true);
  });
});

describe('altyapı işleri', () => {
  it('seviye 5 şirketlere altyapı ihalesi açılır; kazanılınca iş doğar; ekip ve makineyle ilerler, hakediş gelir, bitişte teminat iade edilir', () => {
    const s = setup(5, TL(3_000_000_000)); for (let i = 0; i < 24; i++) createStaff(s, i % 3 ? 'isci' : 'usta'); s.staff.forEach((x) => { x.experience = 60; x.morale = 80; });
    for (let i = 0; i < 16; i++) dispatch(s, 'BuyMachine', { type: ['ekskavator', 'dozer', 'kamyon', 'kepce', 'beton_mikseri', 'kule_vinc', 'kompresor', 'beton_pompasi'][i % 8]! });
    s.company!.stats.completed = 10; s.company!.creditScore = 800;
    const t = generateInfraTender(s, 'ankara')!; expect(t.infra).toBe(true); expect(INFRA_KINDS.some((k) => k.id === t.kind)).toBe(true); s.tenders.push(t);
    placeBid(s, t, Math.round(t.refCost * 0.9), []); const ev: GameEvent[] = []; evaluateTender(s, t, ev);
    if (t.status !== 'kazandi') { t.status = 'acik'; t.rivals = []; evaluateTender(s, t, ev); }
    expect(t.status).toBe('kazandi'); expect(s.infra.length).toBe(1); const j = s.infra[0]!; expect(s.projects.length).toBe(0);
    expect(infraCapacity(s, j).cap).toBeGreaterThan(0.5); s.warehouse = { level: 3 };
    for (let d = 0; d < j.months * 30 + 900 && j.status !== 'bitti'; d += 30) { advanceDays(s, 30); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); }
    expect(['kabul', 'garanti', 'bitti']).toContain(j.status); expect(j.status).toBe('bitti'); expect(j.result!.profit).toBeGreaterThan(-j.price); expect(j.bondReturned).toBe(true); advanceDays(s, 60); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); expect(j.pending.length).toBe(0);
    expect(checkInvariant(s)).toBe(true); expect(divisionPL(s, 60).altyapi.revenue).toBeGreaterThan(0);
  });
  it('kapasite yoksa ilerlemez (kapasite durması)', () => {
    const s = setup(5, TL(3_000_000_000)); const t = generateInfraTender(s, 'ankara')!; s.tenders.push(t);
    s.company!.stats.completed = 10; for (let i = 0; i < 12; i++) createStaff(s, 'isci'); placeBid(s, t, t.refCost, []); t.rivals = []; evaluateTender(s, t, []); expect(t.status).toBe('kazandi');
    advanceDays(s, 60); expect(s.infra[0]!.progress).toBe(0); expect(s.infra[0]!.stalled).toBe('kapasite');
  });
});

describe('borsa ve satın alma', () => {
  it('halka arz kapıları; arz sonrası nakit artar, sahiplik düşer, fiyat aylık gerçek değere yaklaşır; ikincil satış ve geri alım', () => {
    const s = setup(7, TL(2_000_000_000)); expect(dispatch(setup(5), 'GoPublic', { pct: 15 }).ok).toBe(false); expect(dispatch(s, 'GoPublic', { pct: 40 }).ok).toBe(false);
    const cash0 = s.company!.cash; expect(netWorth(s)).toBeGreaterThanOrEqual(TL(1_000_000_000)); expect(dispatch(s, 'GoPublic', { pct: 15 }).ok).toBe(true);
    expect(s.company!.cash).toBeGreaterThan(cash0); expect(s.company!.ownership).toBe(85); expect(s.equity!.listed).toBe(true); expect(dispatch(s, 'GoPublic', { pct: 15 }).ok).toBe(false);
    expect(s.equity!.shares).toBe(SHARES); advanceDays(s, 365); expect(s.equity!.hist.length).toBeGreaterThan(6); expect(s.equity!.price).toBeGreaterThan(0); expect(fairPrice(s)).toBeGreaterThan(0);
    expect(dispatch(s, 'SecondaryOffering', { pct: 10 }).ok).toBe(true); expect(s.company!.ownership).toBe(75); expect(dispatch(s, 'SecondaryOffering', { pct: 15 }).ok).toBe(true); expect(s.company!.ownership).toBe(60); expect(dispatch(s, 'SecondaryOffering', { pct: 3 }).ok).toBe(false);
    expect(dispatch(s, 'Buyback', { pct: 5 }).ok).toBe(true); expect(s.company!.ownership).toBe(65); expect(checkInvariant(s)).toBe(true);
  });
  it('rakip satın alma: iflas etmiş rakip ucuz; bağlı şirket gelir getirir; tekrar alınamaz', () => {
    const s = setup(6, TL(900_000_000)); advanceDays(s, 120); const alive = s.rivals.find((r) => !r.failed)!; expect(alive).toBeTruthy();
    const failed = { ...alive, id: 9999, name: 'Batık Yapı', failed: true }; s.rivals.push(failed);
    expect(acquisitionPrice(s, failed.id)).toBeLessThan(acquisitionPrice(s, alive.id));
    const cash0 = s.company!.cash; expect(dispatch(s, 'AcquireRival', { rivalId: alive.id }).ok).toBe(true); expect(s.company!.cash).toBeLessThan(cash0);
    expect(s.ventures.some((v) => v.kind === 'bagli')).toBe(true); expect(dispatch(s, 'AcquireRival', { rivalId: alive.id }).ok).toBe(false);
    advanceDays(s, 365); const v = s.ventures.find((x) => x.kind === 'bagli')!; expect(v.total.revenue).toBeGreaterThan(0); expect(checkInvariant(s)).toBe(true);
  });
});

describe('kayıt', () => {
  it('iş kolları, altyapı, holding ve borsa durumu kayıt/yüklemede korunur; v10 kaydı v11\'e taşınır', () => {
    const s = setup(7, TL(2_000_000_000)); dispatch(s, 'BuildVenture', { kind: 'ruzgar', city: 'ankara', tier: 0 }); dispatch(s, 'GoPublic', { pct: 10 }); s.holding.strategy.enerji = 'buyume';
    const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.ventures.length).toBe(1); expect(r.state.equity!.listed).toBe(true); expect(r.state.holding.strategy.enerji).toBe('buyume'); }
    const old = JSON.parse(JSON.stringify(newGameState(3))) as Record<string, unknown>; delete old.ventures; delete old.infra; delete old.holding; delete old.equity; (old.meta as { version: number }).version = 10;
    dispatch(Object.assign(newGameState(3)), 'CreateCompany', { name: 'Eski', founderBackground: 'emlakci', startCity: 'ankara' });
    const base = newGameState(4); dispatch(base, 'CreateCompany', { name: 'Eski Yapı', founderBackground: 'emlakci', startCity: 'ankara' }); const raw = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
    delete raw.ventures; delete raw.infra; delete raw.holding; delete raw.equity; (raw.meta as { version: number }).version = 10;
    const m = unpack(pack(raw as unknown as GameState)); expect(m.ok).toBe(true); if (m.ok) { expect(m.state.meta.version).toBe(11); expect(m.state.ventures).toEqual([]); expect(m.state.holding.gm.enerji).toBe(false); expect(m.state.equity).toBeNull(); }
  });
});

describe('altyapı ihalesi akışı ve başarımlar', () => {
  it('seviye 5 şirkette aylık döngü altyapı ihalesi üretir; seviye 3 şirkette hiç üretmez', () => {
    const hi = setup(5, TL(500_000_000)); for (let m = 0; m < 30; m++) advanceDays(hi, 30);
    expect(hi.tenders.some((t) => t.infra)).toBe(true);
    const lo = setup(3, TL(500_000_000)); for (let m = 0; m < 30; m++) advanceDays(lo, 30); expect(lo.tenders.some((t) => t.infra)).toBe(false);
  });
  it('yeni başarımlar tetiklenir ve yalnızca bir kez açılır', async () => {
    const { checkProgress } = await import('../src/sim/progress');
    const s = setup(7, TL(2_000_000_000)); dispatch(s, 'BuildVenture', { kind: 'gunes', city: 'ankara', tier: 0 }); dispatch(s, 'GoPublic', { pct: 10 });
    expect(s.progress.ach.a_enerji).toBeDefined(); expect(s.progress.ach.a_borsa).toBeDefined();
    const e2: GameEvent[] = []; checkProgress(s, e2, false, true); expect(e2.filter((e) => e.type === 'ACHIEVEMENT').length).toBe(0);
  });
});

describe('borsa fiyatı: günlük, dengeli hareket', () => {
  it('her gün bir fiyat noktası; günlük değişim ≤%3; fiyat adil değerden kopmaz; grafik 240 noktayı aşmaz', () => {
    const s = setup(7, TL(2_000_000_000)); dispatch(s, 'GoPublic', { pct: 15 }); const e = s.equity!; let worst = 0, far = 0, prev = e.price;
    for (let d = 0; d < 730; d++) { advanceDays(s, 1); const move = Math.abs(e.price / prev - 1); worst = Math.max(worst, move); prev = e.price; far = Math.max(far, Math.abs(e.price / (e.fair ?? e.price) - 1)); }
    expect(worst).toBeLessThanOrEqual(0.0301); expect(far).toBeLessThan(0.45); expect(e.hist.length).toBe(240); expect(new Set(e.hist.slice(-60)).size).toBeGreaterThan(30);
  });
});
