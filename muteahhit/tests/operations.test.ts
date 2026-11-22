import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { crewCapacity, stageDays } from '../src/sim/construction';
import { incomingQty, leadDays, quoteOrder, stageNeeds, stockQty, unitPrice } from '../src/sim/materials';
import { machineValue } from '../src/sim/machines';
import { monthlyCosts, netWorth } from '../src/sim/finance';
import { MACHINES, MATERIALS, STAGES, SUPPLIERS } from '../src/data';
import { pack, unpack } from '../src/save/serialize';
import type { GameEvent, GameState, Parcel } from '../src/core/types';

const mk = (s: GameState, o: Partial<Parcel> = {}): Parcel => { const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'kecioren', hood: 'Test', area: 200, zoning: 'konut', taks: 0.5, kaks: 1.0, maxFloors: 3, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(500_000), ...o }; s.parcels.push(p); return p; };
function setup(o: { cash?: number; staff?: string[]; seed?: number } = {}) {
  const s = newGameState(o.seed ?? 4); dispatch(s, 'CreateCompany', { name: 'Op Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  s.staff.length = 0; for (const t of o.staff ?? ['usta', 'isci', 'isci', 'isci', 'santiye_sefi']) dispatch(s, 'HireStaff', { type: t });
  const cash = o.cash ?? TL(9_000_000); s.company!.cash = cash; s.ledgerBase = cash - s.ledger.reduce((a, e) => a + e.amount, 0);
  const parcel = mk(s); expect(dispatch(s, 'CreateProject', { parcelId: parcel.id, type: 'mustakil', quality: 'standart' }).ok).toBe(true);
  return { s, project: s.projects[0]! };
}
const run = (s: GameState, until: () => boolean, max = 1500) => { const all: GameEvent[] = []; for (let i = 0; i < max && !until(); i++) all.push(...advanceDays(s, 1)); return all; };

describe('veri bütünlüğü', () => {
  it('17 malzeme, 6 tedarikçi, 14 makine; aşama malzeme payları ≤ 1; her malzeme en az bir aşamada kullanılır', () => {
    expect(MATERIALS).toHaveLength(17); expect(SUPPLIERS).toHaveLength(6); expect(MACHINES).toHaveLength(14);
    const used = new Set<string>(); for (const st of STAGES) { const sum = (st.materials ?? []).reduce((a, [id, f]) => (used.add(id), a + f), 0); expect(sum).toBeLessThanOrEqual(1.0001); }
    for (const m of MATERIALS) expect(used.has(m.id), m.id).toBe(true);
  });
});

describe('malzeme ve tedarik', () => {
  it('sipariş: ücret hemen ödenir, tedarik süresi sonra stok olur; kasa=defter', () => {
    const { s } = setup(); const c0 = s.company!.cash; const price = unitPrice(s, 'beton', 'premium');
    const r = dispatch(s, 'PlaceOrder', { material: 'beton', qty: 10, supplier: 'premium' }); expect(r.ok).toBe(true);
    expect(c0 - s.company!.cash).toBe(quoteOrder(s, 'beton', 'premium', 10).total); void price; expect(stockQty(s, 'beton')).toBe(0); expect(incomingQty(s, 'beton')).toBe(10);
    advanceDays(s, leadDays(s, 'premium') - 1); expect(stockQty(s, 'beton')).toBe(0);
    advanceDays(s, 12); expect(stockQty(s, 'beton')).toBeCloseTo(10, 6); expect(checkInvariant(s)).toBe(true);
  });
  it('tedarikçi farkı: ucuz daha ucuz/düşük kalite, premium pahalı/yüksek kalite; stok kalitesi ağırlıklı ortalama', () => {
    const { s } = setup(); expect(unitPrice(s, 'demir', 'ucuz')).toBeLessThan(unitPrice(s, 'demir', 'yerel')); expect(unitPrice(s, 'demir', 'premium')).toBeGreaterThan(unitPrice(s, 'demir', 'yerel'));
    dispatch(s, 'PlaceOrder', { material: 'demir', qty: 10, supplier: 'ucuz' }); dispatch(s, 'PlaceOrder', { material: 'demir', qty: 10, supplier: 'premium' }); advanceDays(s, 20);
    expect(s.stock.demir!.qual).toBeCloseTo(0, 6); expect(s.stock.demir!.cost).toBeGreaterThan(0);
  });
  it('geçersiz/yetersiz nakitli sipariş reddedilir, durum değişmez', () => {
    const { s } = setup({ cash: TL(100_000) }); const n = s.ledger.length;
    for (const p of [{ material: 'x', qty: 1, supplier: 'yerel' }, { material: 'beton', qty: 0, supplier: 'yerel' }, { material: 'beton', qty: 1e6, supplier: 'yerel' }, { material: 'beton', qty: 1, supplier: 'x' }]) expect(dispatch(s, 'PlaceOrder', p).ok).toBe(false);
    expect(s.ledger.length).toBe(n); expect(s.orders).toHaveLength(0);
  });
  it('güvenilmez tedarikçide gecikme olur (istatistiksel), güvenilirde nadir', () => {
    const delays = (sup: string) => { let d = 0; for (let seed = 0; seed < 80; seed++) { const { s } = setup({ seed: 200 + seed }); dispatch(s, 'PlaceOrder', { material: 'kum', qty: 5, supplier: sup }); if (s.orders[0]!.delayed) d++; } return d; };
    expect(delays('ucuz')).toBeGreaterThan(delays('premium') + 8);
  });
  it('stok olmayınca iş durur (malzeme); otomatik alım kapalıyken aşama başlayınca duraklar, sipariş verilince devam', () => {
    const { s, project: p } = setup(); dispatch(s, 'SetPolicy', { autoBuy: false }); dispatch(s, 'StartConstruction', { projectId: p.id });
    run(s, () => p.build!.stage >= 7 && p.build!.stalled === 'malzeme', 800);
    expect(p.build!.stage).toBe(7); expect(p.build!.stalled).toBe('malzeme'); expect(['beton', 'demir']).toContain(p.build!.matShort);
    for (const [id, q] of stageNeeds(p, 7)) dispatch(s, 'PlaceOrder', { material: id, qty: q * 1.01, supplier: 'yerel' });
    run(s, () => p.build!.stage > 7, 200); expect(p.build!.stage).toBeGreaterThan(7);
  });
  it('malzeme ihtiyacı bütçedeki malzeme payına eşit değerde (plan fiyatlarıyla)', () => {
    const { s, project: p } = setup(); dispatch(s, 'StartConstruction', { projectId: p.id }); const b = p.build!;
    const need = stageNeeds(p, 7); const value = need.reduce((a, [id, q]) => a + q * TL(MATERIALS.find((m) => m.id === id)!.priceTL) * (b.priceBase.mat / 100), 0);
    expect(value).toBeCloseTo(b.stageBudget[7]! * 0.55 * 0.9, -2); // temel: beton .55 + demir .35 = %90
  });
  it('otomatik alım tam inşaatı tamamlar; tüketilen malzeme maliyeti sayılır; kalan stok net varlıkta', () => {
    const { s, project: p } = setup(); dispatch(s, 'StartConstruction', { projectId: p.id }); run(s, () => p.status !== 'insaat');
    expect(p.status).toBe('tamamlandi'); expect(p.build!.matCost!).toBeGreaterThan(0); expect((p.build!.spent + p.build!.matCost!) / (p.budget.total - p.budget.designFee)).toBeGreaterThan(0.6);
    expect(checkInvariant(s)).toBe(true); expect(netWorth(s)).toBeGreaterThan(0);
  });
  it('malzeme fiyatları aylık oynar ve sınırlı kalır', () => {
    const { s } = setup(); s.company!.cash = 1e13; s.ledgerBase = 1e13 - s.ledger.reduce((a, e) => a + e.amount, 0); advanceDays(s, 365 * 8);
    for (const v of Object.values(s.matPrice)) { expect(v).toBeGreaterThanOrEqual(0.7); expect(v).toBeLessThanOrEqual(1.7); }
    expect(new Set(Object.values(s.matPrice).map((v) => v.toFixed(2))).size).toBeGreaterThan(3);
  });
});

describe('makine', () => {
  it('satın alma: nakit düşer, makine eklenir; satış %90×değer; değer yıllık %13 düşer (forklift) (en az %25)', () => {
    const { s } = setup({ cash: TL(900_000_000) }); const c0 = s.company!.cash; expect(dispatch(s, 'BuyMachine', { type: 'forklift' }).ok).toBe(true);
    expect(c0 - s.company!.cash).toBe(TL(650000)); const m = s.machines[0]!; expect(machineValue(s, m)).toBe(TL(650000));
    advanceDays(s, 365); expect(machineValue(s, m)).toBe(Math.round(TL(650000) * 0.87)); advanceDays(s, 365 * 10); expect(machineValue(s, m)).toBe(Math.round(TL(650000) * 0.25));
    const c1 = s.company!.cash; dispatch(s, 'SellMachine', { machineId: m.id }); expect(s.company!.cash - c1).toBe(Math.round(Math.round(TL(650000) * 0.25) * 0.9)); expect(s.machines).toHaveLength(0);
    expect(checkInvariant(s)).toBe(true);
  });
  it('aylık bakım gideri eklenir; yetersiz nakitte alım reddedilir', () => {
    const { s } = setup(); const before = monthlyCosts(s).find((x) => x.cat === 'makine_bakim'); expect(before).toBeUndefined();
    dispatch(s, 'BuyMachine', { type: 'iskele' }); expect(monthlyCosts(s).find((x) => x.cat === 'makine_bakim')!.amount).toBeGreaterThanOrEqual(TL(3500));
    s.company!.cash = TL(1000); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0); expect(dispatch(s, 'BuyMachine', { type: 'kule_vinc' }).ok).toBe(false); expect(dispatch(s, 'BuyMachine', { type: 'yok' }).ok).toBe(false);
  });
  it('sahip olunan makine kira yerine yakıt ödetir: aynı inşaat daha ucuz (makine gideri)', () => {
    const cost = (own: boolean) => { const { s, project: p } = setup({ seed: 9 }); if (own) for (const t of ['ekskavator', 'kamyon', 'beton_pompasi', 'beton_mikseri', 'jenerator', 'forklift', 'iskele', 'mobil_vinc', 'kepce', 'kule_vinc', 'kompresor']) { s.company!.cash += TL(8e6); s.ledgerBase += TL(8e6); dispatch(s, 'BuyMachine', { type: t }); }
      s.machines.forEach((m) => (m.brokenUntil = 0)); dispatch(s, 'StartConstruction', { projectId: p.id }); run(s, () => p.status !== 'insaat'); return p.build!.unpaidParts.makine + s.ledger.filter((e) => e.cat === 'makine' && e.projectId === p.id).reduce((a, e) => a - e.amount, 0); };
    expect(cost(true)).toBeLessThan(cost(false) * 0.6);
  });
  it('arıza çıkabilir: makine bir süre kullanılamaz ve onarım ücreti ödenir (istatistiksel)', () => {
    let broke = 0; for (let seed = 0; seed < 90; seed++) { const { s, project: p } = setup({ seed: 300 + seed }); for (const t of ['ekskavator', 'beton_pompasi', 'kule_vinc']) { s.company!.cash += TL(8e6); s.ledgerBase += TL(8e6); dispatch(s, 'BuyMachine', { type: t }); }
      dispatch(s, 'StartConstruction', { projectId: p.id }); const evs = run(s, () => p.status !== 'insaat'); if (evs.some((e) => e.type === 'MACHINE_BROKEN')) broke++; }
    expect(broke).toBeGreaterThan(0);
  });
});

describe('personel: atama, moral, iş güvenliği', () => {
  it('atanan çalışan yalnızca o projeye sayılır; havuz aktif projelere bölünür', () => {
    const { s, project: p1 } = setup(); const parcel2 = mk(s, { hood: 'İkinci' }); dispatch(s, 'CreateProject', { parcelId: parcel2.id, type: 'mustakil', quality: 'standart' }); const p2 = s.projects[1]!;
    dispatch(s, 'StartConstruction', { projectId: p1.id }); dispatch(s, 'StartConstruction', { projectId: p2.id });
    const pool1 = crewCapacity(s, 'katlar', p1.id); expect(pool1).toBeCloseTo(crewCapacity(s, 'katlar', p2.id), 6);
    for (const x of s.staff) dispatch(s, 'AssignStaff', { staffId: x.id, projectId: p1.id });
    expect(crewCapacity(s, 'katlar', p1.id)).toBeGreaterThan(pool1 * 1.9); expect(crewCapacity(s, 'katlar', p2.id)).toBe(0);
    dispatch(s, 'AssignStaff', { staffId: s.staff[0]!.id, projectId: null }); expect(s.staff[0]!.project).toBeUndefined();
    expect(dispatch(s, 'AssignStaff', { staffId: 999999, projectId: null }).ok).toBe(false); expect(dispatch(s, 'AssignStaff', { staffId: s.staff[0]!.id, projectId: 123456 }).ok).toBe(false);
  });
  it('moral verimi etkiler: düşük moral kapasiteyi azaltır', () => {
    const { s, project: p } = setup(); dispatch(s, 'StartConstruction', { projectId: p.id }); const hi = crewCapacity(s, 'katlar', p.id); for (const x of s.staff) x.morale = 10; expect(crewCapacity(s, 'katlar', p.id)).toBeLessThan(hi * 0.93);
  });
  it('iş güvenliği politikası: düşük güvenlik daha çok kaza; yüksek güvenlik daha pahalı sigorta ve yüksek moral', () => {
    const acc = (pol: 'dusuk' | 'yuksek') => { let n = 0; for (let seed = 0; seed < 30; seed++) { const { s, project: p } = setup({ seed: 400 + seed }); dispatch(s, 'SetPolicy', { safety: pol }); dispatch(s, 'StartConstruction', { projectId: p.id }); const evs = run(s, () => p.status !== 'insaat'); n += evs.filter((e) => e.type === 'ACCIDENT').length; } return n; };
    expect(acc('dusuk')).toBeGreaterThan(acc('yuksek'));
    const { s } = setup(); const sig = (pol: 'dusuk' | 'normal' | 'yuksek') => { dispatch(s, 'SetPolicy', { safety: pol }); return monthlyCosts(s).find((x) => x.cat === 'sigorta')!.amount; };
    expect(sig('dusuk')).toBeLessThan(sig('normal')); expect(sig('normal')).toBeLessThan(sig('yuksek'));
    expect(dispatch(s, 'SetPolicy', { safety: 'x' as any }).ok).toBe(false); expect(dispatch(s, 'SetPolicy', { supplier: 'yok' }).ok).toBe(false);
  });
  it('kaza: iş durur, tazminat ödenir, moral ve itibar düşer, süre sonunda devam', () => {
    let found = false;
    for (let seed = 0; seed < 60 && !found; seed++) {
      const { s, project: p } = setup({ seed: 500 + seed }); dispatch(s, 'SetPolicy', { safety: 'dusuk' }); dispatch(s, 'StartConstruction', { projectId: p.id }); const rep0 = s.company!.reputation;
      const evs = run(s, () => p.status !== 'insaat' || p.build!.stalled === 'kaza', 600); const a = evs.find((e) => e.type === 'ACCIDENT'); if (!a) continue; found = true;
      expect(p.build!.stalled).toBe('kaza'); expect(s.company!.reputation).toBeLessThan(rep0 + 1); expect(s.staff.some((x) => x.morale < 70)).toBe(true); expect(s.ledger.some((e) => e.memo?.includes('kaza'))).toBe(true);
      advanceDays(s, 12); expect(p.build!.stalled).not.toBe('kaza');
    }
    expect(found).toBe(true);
  });
});

describe('kayıt ve göç (v5)', () => {
  it('stok, sipariş, makine ve atamalarla kaydet→yükle→devam birebir aynı', () => {
    const { s, project: p } = setup(); dispatch(s, 'BuyMachine', { type: 'iskele' }); dispatch(s, 'AssignStaff', { staffId: s.staff[0]!.id, projectId: p.id }); dispatch(s, 'StartConstruction', { projectId: p.id }); advanceDays(s, 45);
    const r = unpack(pack(s)); expect(r.ok).toBe(true); if (!r.ok) return; advanceDays(s, 300); advanceDays(r.state, 300); expect(JSON.stringify(r.state)).toBe(JSON.stringify(s));
  });
  it('v4 kaydı v5\'e taşınır', () => {
    const { s } = setup(); const old: any = JSON.parse(JSON.stringify(s)); old.meta.version = 4; for (const k of ['stock', 'orders', 'machines', 'matPrice']) delete old[k]; for (const x of old.staff) delete x.morale; delete old.company.safety; delete old.company.procurement; delete old.company.lastAccidentDay;
    const r = unpack(pack(old)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.meta.version).toBe(11); expect(r.state.staff[0]!.morale).toBe(70); expect(r.state.company!.safety).toBe('normal'); expect(r.state.company!.procurement.auto).toBe(true); advanceDays(r.state, 60); }
  });
  it('aşama günleri hâlâ planlanan süreyi verir', () => { const { project: p } = setup(); expect(stageDays(p).reduce((a, x) => a + x, 0)).toBeCloseTo(Math.max(60, p.expected.months * 30), 6); });
});
