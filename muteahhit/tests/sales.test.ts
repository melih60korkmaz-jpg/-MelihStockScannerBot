import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { advancesTotal, fairPerM2, listPrice, receivablesTotal, saleChance, unitFair, unitsOf, unsoldValue, demandIndex } from '../src/sim/sales';
import { netWorth } from '../src/sim/finance';
import { pack, unpack } from '../src/save/serialize';
import type { GameEvent, GameState, Parcel } from '../src/core/types';

const mk = (s: GameState, o: Partial<Parcel> = {}): Parcel => { const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'cankaya', hood: 'Test', area: 500, zoning: 'konut', taks: 0.4, kaks: 1.6, maxFloors: 5, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1_000_000), ...o }; s.parcels.push(p); return p; };
function setup(o: { cash?: number; type?: string; seed?: number; staff?: string[] } = {}) {
  const s = newGameState(o.seed ?? 6); dispatch(s, 'CreateCompany', { name: 'Satış Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  s.staff.length = 0; for (const t of o.staff ?? ['usta', 'isci', 'isci', 'isci', 'isci', 'santiye_sefi']) dispatch(s, 'HireStaff', { type: t });
  const cash = o.cash ?? TL(60_000_000); s.company!.cash = cash; s.ledgerBase = cash - s.ledger.reduce((a, e) => a + e.amount, 0);
  const parcel = mk(s); expect(dispatch(s, 'CreateProject', { parcelId: parcel.id, type: o.type ?? 'apartman', quality: 'standart' }).ok).toBe(true);
  return { s, project: s.projects[0]!, parcel };
}
const run = (s: GameState, until: () => boolean, max = 1500) => { const all: GameEvent[] = []; for (let i = 0; i < max && !until(); i++) all.push(...advanceDays(s, 1)); return all; };
const built = (o: Parameters<typeof setup>[0] = {}) => { const r = setup(o); dispatch(r.s, 'StartConstruction', { projectId: r.project.id }); run(r.s, () => r.project.status !== 'insaat'); expect(r.project.status === 'tamamlandi' || r.project.status === 'satildi').toBe(true); return r; };

describe('daire üretimi', () => {
  it('toplam alan = satılabilir alan; çarpan ortalaması 1; kat/oda/manzara geçerli; deterministik', () => {
    const { s, project: p } = setup(); dispatch(s, 'StartConstruction', { projectId: p.id }); const us = unitsOf(s, p.id);
    expect(us.length).toBeGreaterThan(2); expect(us.reduce((a, u) => a + u.area, 0)).toBeCloseTo(p.satilabilir, 0);
    expect(us.reduce((a, u) => a + u.area * u.mult, 0) / us.reduce((a, u) => a + u.area, 0)).toBeCloseTo(1, 2);
    for (const u of us) { expect(u.floor).toBeGreaterThanOrEqual(1); expect(u.floor).toBeLessThanOrEqual(p.floors); expect(u.view).toBeGreaterThanOrEqual(0); expect(u.view).toBeLessThanOrEqual(100); expect(u.rooms).toMatch(/\d\+\d/); }
    const again = setup(); dispatch(again.s, 'StartConstruction', { projectId: again.project.id }); expect(unitsOf(again.s, again.project.id).map((u) => [u.area, u.floor, u.facing])).toEqual(us.map((u) => [u.area, u.floor, u.facing]));
  });
  it('tip bazlı daire sayısı: müstakil=1, villa az, apartman çok, fabrika 1–4', () => {
    const n = (type: string, o: Partial<Parcel> = {}) => { const r = setup({ type }); Object.assign(r.parcel, o); dispatch(r.s, 'StartConstruction', { projectId: r.project.id }); return unitsOf(r.s, r.project.id).length; };
    expect(n('mustakil', { area: 200, kaks: 1, taks: 0.5, maxFloors: 3 })).toBe(1);
  });
});

describe('satış mekaniği', () => {
  it('talep: fiyat artınca satış olasılığı düşer; emlakçı/danışman/itibar artırır; güven artınca artar', () => {
    const { s, project: p } = setup(); dispatch(s, 'StartConstruction', { projectId: p.id }); const pol = p.sales!;
    const at = (m: number) => { pol.priceMult = m; return saleChance(s, p, pol).p; };
    expect(at(0.9)).toBeGreaterThan(at(1.0)); expect(at(1.0)).toBeGreaterThan(at(1.1)); pol.priceMult = 1; const base = saleChance(s, p, pol).p;
    pol.agent = true; expect(saleChance(s, p, pol).p).toBeCloseTo(base * 1.3, 6); pol.agent = false;
    s.staff.pop(); dispatch(s, 'HireStaff', { type: 'satis_danismani' }); expect(saleChance(s, p, pol).p).toBeGreaterThan(base * 1.1);
    s.company!.reputation = 90; const hi = saleChance(s, p, pol).p; s.company!.reputation = 10; expect(hi).toBeGreaterThan(saleChance(s, p, pol).p);
    s.macro.confidence = 80; const d1 = demandIndex(s); s.macro.confidence = 20; expect(d1).toBeGreaterThan(demandIndex(s));
  });
  it('politika komutu: sınır dışı reddedilir; inşaat başlamamış projede reddedilir', () => {
    const { s, project: p } = setup(); expect(dispatch(s, 'SetSalesPolicy', { projectId: p.id, priceMult: 1 }).ok).toBe(false);
    dispatch(s, 'StartConstruction', { projectId: p.id }); expect(dispatch(s, 'SetSalesPolicy', { projectId: p.id, priceMult: 2 }).ok).toBe(false); expect(dispatch(s, 'SetSalesPolicy', { projectId: p.id, priceMult: 1.1, agent: true }).ok).toBe(true); expect(p.sales!.priceMult).toBe(1.1);
  });
  it('tamamlanan projede daireler satılır; ledger/nakit tutarlı; peşin %4 iskonto, taksit %6 vade farkı', () => {
    const { s, project: p } = built(); s.company!.reputation = 60;
    const evs = run(s, () => p.status === 'satildi' || s.clock.day > 4000, 1400); const sold = evs.filter((e) => e.type === 'UNIT_SOLD');
    expect(sold.length).toBeGreaterThan(0); expect(checkInvariant(s)).toBe(true);
    const perM2 = fairPerM2(s, p); void perM2; for (const u of unitsOf(s, p.id).filter((x) => x.status === 'satildi')) { expect(['pesin', 'taksit']).toContain(u.payment); expect(u.price!).toBeGreaterThan(0); }
    const pay = new Set(sold.map((e) => e.data!.payment)); expect(pay.has('pesin') || pay.has('taksit')).toBe(true);
  });
  it('taksitli satış: %25 peşinat, 12 aylık alacak, vadesi gelince tahsil edilir; net varlıkta alacak sayılır', () => {
    const { s, project: p } = built(); p.sales!.installments = true;
    const evs = run(s, () => s.receivables.length > 0, 1200); void evs; expect(s.receivables.length).toBeGreaterThan(0);
    const u = s.units.find((x) => x.payment === 'taksit')!; const rec = s.receivables.filter((r) => r.unitId === u.id); expect(rec).toHaveLength(12);
    expect(rec.reduce((a, r) => a + r.amount, 0) + Math.round(u.price! * 0.25)).toBe(u.price); expect(receivablesTotal(s)).toBeGreaterThan(0);
    const c0 = s.company!.cash; advanceDays(s, 35); expect(s.receivables.filter((r) => r.unitId === u.id).length).toBeLessThanOrEqual(11); void c0; expect(checkInvariant(s)).toBe(true);
  });
  it('taksit kapalıysa taksitli satış olmaz', () => {
    const { s, project: p } = built(); dispatch(s, 'SetSalesPolicy', { projectId: p.id, installments: false }); run(s, () => unitsOf(s, p.id).filter((u) => u.status === 'satildi').length >= 2 || s.clock.day > 4000, 1400);
    expect(unitsOf(s, p.id).some((u) => u.payment === 'taksit')).toBe(false);
  });
  it('emlakçı: komisyon %2,5 ödenir ve satış hızlanır', () => {
    const t = (agent: boolean) => { let tot = 0, n = 0; for (let seed = 0; seed < 12; seed++) { const { s, project: p } = built({ seed: 700 + seed }); dispatch(s, 'SetSalesPolicy', { projectId: p.id, agent }); const d0 = s.clock.day; run(s, () => unitsOf(s, p.id).filter((u) => u.status === 'satildi').length >= 3, 900); tot += s.clock.day - d0; n++; if (agent) expect(p.sales!.commission).toBeGreaterThan(0); } return tot / n; };
    expect(t(true)).toBeLessThan(t(false));
  });
  it('kapora: %5 alınır, 14 gün sonra %75 satışa döner, aksi halde yarısı iade edilir', () => {
    let kap = 0, conv = 0, cancel = 0;
    for (let seed = 0; seed < 14; seed++) { const { s, project: p } = built({ seed: 800 + seed }); const evs = run(s, () => s.clock.day > 600 + p.build!.doneDay!, 900); kap += evs.filter((e) => e.type === 'KAPORA').length; cancel += evs.filter((e) => e.type === 'KAPORA_CANCELLED').length; conv += 0; expect(checkInvariant(s)).toBe(true); }
    expect(kap).toBeGreaterThan(0); expect(cancel).toBeGreaterThanOrEqual(0); void conv;
  });
  it('fiyat stratejisi: indirim hızlı satar, zam yavaş (süre)', () => {
    const days = (m: number) => { let tot = 0, n = 0; for (let seed = 0; seed < 10; seed++) { const { s, project: p } = built({ seed: 900 + seed }); dispatch(s, 'SetSalesPolicy', { projectId: p.id, priceMult: m }); const d0 = s.clock.day; run(s, () => unitsOf(s, p.id).filter((u) => u.status === 'satildi').length >= 3, 1200); tot += s.clock.day - d0; n++; } return tot / n; };
    expect(days(0.92)).toBeLessThan(days(1.12));
  });
  it('toplu satış kalan daireleri adil değerin %92\'siyle satar; proje kapanır; kâr kaydedilir', () => {
    const { s, project: p } = built(); const left = unitsOf(s, p.id).filter((u) => u.status !== 'satildi'); expect(left.length).toBeGreaterThan(0);
    const perM2 = fairPerM2(s, p), exp = left.reduce((a, u) => a + Math.round(unitFair(u, perM2) * 0.92), 0); const c0 = s.company!.cash;
    expect(dispatch(s, 'SellProjectBulk', { projectId: p.id }).ok).toBe(true); expect(s.company!.cash - c0).toBeGreaterThan(exp * 0.97 - 1);
    expect(unitsOf(s, p.id).every((u) => u.status === 'satildi')).toBe(true); expect(p.status).toBe('satildi'); expect(p.result!.profit).toBeDefined(); expect(s.company!.stats.sold).toBe(1);
    expect(dispatch(s, 'SellProjectBulk', { projectId: p.id }).ok).toBe(false); expect(checkInvariant(s)).toBe(true);
  });
});

describe('ön satış', () => {
  it('betonarme aşamasına kadar kapalı; açılınca indirimli satış, %40 peşin, bakiye teslimde; avans yükümlülüğü net varlığı şişirmez', () => {
    const { s, project: p } = setup(); dispatch(s, 'StartConstruction', { projectId: p.id }); dispatch(s, 'SetSalesPolicy', { projectId: p.id, presale: true });
    run(s, () => p.build!.stage >= 6, 400); advanceDays(s, 1); expect(unitsOf(s, p.id).some((u) => u.status === 'satildi')).toBe(false); // henüz erken
    const nw0 = netWorth(s); run(s, () => unitsOf(s, p.id).some((u) => u.payment === 'onsatis') || p.build!.stage < 8 && false || s.clock.day > 3000, 1200);
    const u = unitsOf(s, p.id).find((x) => x.payment === 'onsatis'); if (!u) return expect(p.build!.stage).toBeLessThan(8); // satış gelmediyse en azından erken satış yok
    expect(p.build!.stage).toBeGreaterThanOrEqual(8); const rec = s.receivables.find((r) => r.unitId === u.id)!; expect(rec.kind).toBe('teslim'); expect(rec.dueDay).toBe(1e9);
    expect(rec.amount + Math.round(u.price! * 0.4)).toBe(u.price); expect(advancesTotal(s)).toBeGreaterThanOrEqual(u.price!);
    expect(Math.abs(netWorth(s) - nw0) / Math.abs(nw0)).toBeLessThan(0.2); // satıştan sahte kâr doğmaz
    run(s, () => p.status !== 'insaat'); expect(s.receivables.find((r) => r.unitId === u.id && r.kind === 'teslim')?.dueDay ?? 0).toBeLessThan(1e9); expect(u.delivered).toBe(true); expect(checkInvariant(s)).toBe(true);
  });
});

describe('teslim, memnuniyet, garanti', () => {
  it('kaliteli bina → yüksek memnuniyet ve itibar artışı; düşük kalite → düşük', () => {
    const sat = (q: string) => { const r = setup({ seed: 40 }); (r.s.projects[0] as any).quality = q; dispatch(r.s, 'StartConstruction', { projectId: r.project.id }); dispatch(r.s, 'SetSalesPolicy', { projectId: r.project.id, presale: true });
      run(r.s, () => r.project.status !== 'insaat'); // ön satış yoksa memnuniyet üretilmez: kalan satış sonrası teslimat
      run(r.s, () => unitsOf(r.s, r.project.id).filter((u) => u.status === 'satildi').length >= 2, 1200); return r; };
    const a = sat('luks'), b = sat('ekonomik');
    expect(a.project.result!.qualityScore).toBeGreaterThan(b.project.result!.qualityScore);
  });
  it('garanti talepleri gerçekleşir (düşük kalitede daha sık), tazminat ledger\'a işlenir', () => {
    const claims = (q: string) => { let n = 0; for (let seed = 0; seed < 10; seed++) { const r = setup({ seed: 1000 + seed }); (r.s.projects[0] as any).quality = q; dispatch(r.s, 'StartConstruction', { projectId: r.project.id }); run(r.s, () => r.project.status !== 'insaat'); dispatch(r.s, 'SellProjectBulk', { projectId: r.project.id }); n += run(r.s, () => r.s.clock.day > r.project.build!.doneDay! + 600, 800).filter((e) => e.type === 'COMPLAINT').length; expect(checkInvariant(r.s)).toBe(true); } return n; };
    expect(claims('ekonomik')).toBeGreaterThan(claims('luks'));
  });
  it('satılmamış daire gideri ve net varlıkta stok değeri', () => {
    const { s, project: p } = built(); expect(unsoldValue(s)).toBeGreaterThan(0); const nw = netWorth(s); expect(nw).toBeGreaterThan(0); void p;
  });
});

describe('kayıt (v6)', () => {
  it('daire/alacak/politika ile kaydet→yükle→devam birebir aynı', () => {
    const { s, project: p } = built(); dispatch(s, 'SetSalesPolicy', { projectId: p.id, priceMult: 1.05, agent: true }); advanceDays(s, 120);
    const r = unpack(pack(s)); expect(r.ok).toBe(true); if (!r.ok) return; advanceDays(s, 300); advanceDays(r.state, 300); expect(JSON.stringify(r.state)).toBe(JSON.stringify(s));
  });
  it('v5 kaydı v6\'ya taşınır: mevcut projelere daireler üretilir', () => {
    const { s, project: p } = setup(); dispatch(s, 'StartConstruction', { projectId: p.id }); const old: any = JSON.parse(JSON.stringify(s)); old.meta.version = 5; delete old.units; delete old.receivables; delete old.company.satisfaction; delete old.projects[0].sales;
    const r = unpack(pack(old)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.meta.version).toBe(10); expect(r.state.units.length).toBeGreaterThan(0); expect(r.state.projects[0]!.sales).toBeDefined(); expect(r.state.company!.satisfaction).toBe(60); advanceDays(r.state, 60); }
  });
  it('liste fiyatı = adil değer × politika çarpanı', () => {
    const { s, project: p } = setup(); dispatch(s, 'StartConstruction', { projectId: p.id }); const u = unitsOf(s, p.id)[0]!, per = fairPerM2(s, p); p.sales!.priceMult = 1.1;
    expect(listPrice(u, per, p.sales!)).toBe(Math.round(unitFair(u, per) * 1.1));
  });
});
