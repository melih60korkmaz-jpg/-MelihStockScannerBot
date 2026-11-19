import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { askPrice, marketParcels } from '../src/sim/land';
import { crewCapacity, crewFactor, stageDays, updateWeather } from '../src/sim/construction';
import { netWorth, projectAssetValue } from '../src/sim/finance';
import { STAGES } from '../src/data';
import { pack, unpack } from '../src/save/serialize';
import type { GameState, GameEvent, Parcel } from '../src/core/types';

const mk = (s: GameState, o: Partial<Parcel> = {}): Parcel => {
  const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'kecioren', hood: 'Test Mahallesi', area: 200, zoning: 'konut', taks: 0.5, kaks: 1.0, maxFloors: 3, soil: 'saglam', soilKnown: true,
    roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1.0, negoLockUntil: 0, owner: 'player', costBasis: TL(500_000), ...o };
  s.parcels.push(p); return p;
};
/** Oyuncuya ait arsa + proje + ekip kurulu oyun. */
function setup(o: { cash?: number; type?: string; quality?: string; staff?: string[]; parcel?: Partial<Parcel>; seed?: number } = {}) {
  const s = newGameState(o.seed ?? 3); dispatch(s, 'CreateCompany', { name: 'İnşaat Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  s.staff.length = 0; for (const t of o.staff ?? ['usta', 'isci', 'isci', 'isci', 'santiye_sefi']) dispatch(s, 'HireStaff', { type: t });
  const cash = o.cash ?? TL(8_000_000); s.company!.cash = cash; s.ledgerBase = cash - s.ledger.reduce((a, e) => a + e.amount, 0);
  const parcel = mk(s, o.parcel);
  const r = dispatch(s, 'CreateProject', { parcelId: parcel.id, type: o.type ?? 'mustakil', quality: o.quality ?? 'standart' }); expect(r.ok, JSON.stringify(r)).toBe(true);
  return { s, parcel, project: s.projects[0]! };
}
function runUntil(s: GameState, cond: () => boolean, max = 1500): GameEvent[] {
  const all: GameEvent[] = []; for (let i = 0; i < max && !cond(); i++) all.push(...advanceDays(s, 1)); return all;
}

describe('inşaat — tam döngü', () => {
  it('18 aşama sırayla biter, bina tamamlanır, kasa=defter, bütçeyle uyumlu', () => {
    const { s, project: p } = setup(); const cashBefore = s.company!.cash;
    expect(dispatch(s, 'StartConstruction', { projectId: p.id }).ok).toBe(true); expect(p.status).toBe('insaat');
    const evs = runUntil(s, () => p.status !== 'insaat');
    expect(p.status).toBe('tamamlandi');
    const stages = evs.filter((e) => e.type === 'STAGE_COMPLETED').map((e) => e.data!.stage as number);
    expect(stages).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));                 // 1..17 sırayla
    expect(evs.filter((e) => e.type === 'PROJECT_COMPLETED')).toHaveLength(1);
    expect(checkInvariant(s)).toBe(true);
    const b = p.build!; expect(b.unpaid).toBe(0);
    // maliyet: bütçe (hafriyat sürprizi dahil) ± enflasyon/sapma payı
    const planned = p.budget.total - p.budget.designFee; // inşaat kısmı
    expect((b.spent + (b.matCost ?? 0)) / planned).toBeGreaterThan(0.55); expect((b.spent + (b.matCost ?? 0)) / planned).toBeLessThan(1.45); // kendi ekip taşeron işçilik bedelinden tasarruf ettirir
    // ledgerdan ödenen toplam = spent
    const paid = -s.ledger.filter((e) => e.projectId === p.id).reduce((a, e) => a + e.amount, 0); expect(paid).toBe(b.spent);
    expect(cashBefore - s.company!.cash).toBeGreaterThan(b.spent); // aylık giderler de düştü
  });
  it('süre: planlanan aralığın makul çevresinde (yeterli ekip, hava normal)', () => {
    const { s, project: p } = setup(); dispatch(s, 'StartConstruction', { projectId: p.id }); runUntil(s, () => p.status !== 'insaat');
    const ratio = p.result!.days / p.result!.plannedDays; expect(ratio).toBeGreaterThan(0.6); expect(ratio).toBeLessThan(2.0);
  });
  it('kalite puanı 30–100; kaliteli seçim daha yüksek puan verir', () => {
    const q = (qual: string) => { const { s, project: p } = setup({ quality: qual, seed: 8 }); dispatch(s, 'StartConstruction', { projectId: p.id }); runUntil(s, () => p.status !== 'insaat'); return p.result!.qualityScore; };
    const eco = q('ekonomik'), lux = q('luks'); expect(eco).toBeGreaterThanOrEqual(30); expect(lux).toBeLessThanOrEqual(100); expect(lux).toBeGreaterThan(eco + 15);
  });
  it('itibar tamamlanmayla güncellenir; istatistik sayılır', () => {
    const { s, project: p } = setup(); const r0 = s.company!.reputation; dispatch(s, 'StartConstruction', { projectId: p.id }); runUntil(s, () => p.status !== 'insaat');
    expect(s.company!.stats.completed).toBe(1); const q = p.result!.qualityScore; const exp = Math.round((q - 60) / 8) + (p.result!.days <= p.result!.plannedDays * 1.05 ? 2 : p.result!.days > p.result!.plannedDays * 1.3 ? -2 : 0);
    expect(Math.abs(s.company!.reputation - (r0 + exp))).toBeLessThanOrEqual(6); // kazalar (−2) olabilir
  });
  it('çift başlatma ve taslak olmayan projede iptal reddedilir', () => {
    const { s, project: p } = setup(); dispatch(s, 'StartConstruction', { projectId: p.id });
    expect(dispatch(s, 'StartConstruction', { projectId: p.id }).ok).toBe(false); expect(dispatch(s, 'CancelProject', { projectId: p.id }).ok).toBe(false);
  });
});

describe('inşaat — nakit, ekip, hava, zemin', () => {
  it('nakit yetmeyince iş durur (CONSTRUCTION_STALLED), nakit gelince devam eder; kasa eksiye düşmez (inşaat yüzünden)', () => {
    const { s, project: p } = setup({ cash: TL(900_000) }); dispatch(s, 'StartConstruction', { projectId: p.id });
    const evs = runUntil(s, () => !!p.build!.stalled || p.status !== 'insaat', 600);
    expect(['nakit', 'malzeme']).toContain(p.build!.stalled); expect(evs.some((e) => e.type === 'CONSTRUCTION_STALLED')).toBe(true);
    const st = p.build!.stage, pr = p.build!.progress, sd = p.build!.stalledDays; advanceDays(s, 10);
    expect(p.build!.stalledDays).toBeGreaterThanOrEqual(sd + 5);                       // çoğu gün durdu (kötü havada yarım iş karşılanabilir)
    expect(p.build!.stage === st ? p.build!.progress - pr : 1).toBeLessThan(0.5);     // anlamlı ilerleme yok
    // nakit enjekte et
    s.ledger.push({ day: s.clock.day, cat: 'sermaye', amount: TL(9_000_000) }); s.company!.cash += TL(9_000_000);
    const evs2 = advanceDays(s, 14); expect(evs2.some((e) => e.type === 'CONSTRUCTION_RESUMED')).toBe(true); expect(p.build!.stalled).toBeNull();
  });
  it('ekip büyüdükçe inşaat hızlanır; ekipsiz çok yavaş', () => {
    const dur = (staff: string[]) => { const { s, project: p } = setup({ staff, seed: 5 }); dispatch(s, 'StartConstruction', { projectId: p.id }); runUntil(s, () => p.status !== 'insaat', 2500); return p.status === 'tamamlandi' ? p.result!.days : Infinity; };
    const none = dur([]), small = dur(['isci']), good = dur(['usta', 'usta', 'isci', 'isci', 'isci', 'isci', 'santiye_sefi']);
    expect(good).toBeLessThan(small); expect(small).toBeLessThan(none);
  });
  it('aktif projeler ekibi paylaşır', () => {
    const { s, project: p1 } = setup(); const parcel2 = mk(s, { hood: 'İkinci' }); dispatch(s, 'CreateProject', { parcelId: parcel2.id, type: 'mustakil', quality: 'standart' });
    dispatch(s, 'StartConstruction', { projectId: p1.id }); const f1 = crewFactor(s, p1, 'katlar'); dispatch(s, 'StartConstruction', { projectId: s.projects[1]!.id });
    const f2 = crewFactor(s, p1, 'katlar'); expect(f2).toBeLessThan(f1); expect(crewCapacity(s, 'katlar')).toBeGreaterThan(0);
  });
  it('kış ve yağış dış aşamaları yavaşlatır (istatistiksel)', () => {
    const s = newGameState(1); const count = (month0: number) => { let bad = 0; for (let i = 0; i < 600; i++) { s.clock.day = month0 * 30 + 3; updateWeather(s); if (s.weather.ankara !== 'acik') bad++; } return bad; };
    expect(count(0)).toBeGreaterThan(count(6) * 3); // Ocak, Temmuz'dan çok daha sorunlu
  });
  it('bilinmeyen zemin hafriyatta ortaya çıkar: maliyet sürprizi + olay; bilinen zeminde sürpriz yok', () => {
    const run = (known: boolean) => { const { s, project: p } = setup({ parcel: { soil: 'yeralti_suyu', soilKnown: known }, seed: 6 }); dispatch(s, 'StartConstruction', { projectId: p.id }); const evs = runUntil(s, () => p.build!.stage > 6 || p.status !== 'insaat'); return { p, evs, s }; };
    const unk = run(false), kn = run(true);
    const ev = unk.evs.find((e) => e.type === 'SOIL_REVEALED'); expect(ev).toBeDefined(); expect(ev!.data!.extra as number).toBeGreaterThan(0);
    expect(unk.p.build!.soilExtra).toBeGreaterThan(0); expect(kn.evs.some((e) => e.type === 'SOIL_REVEALED')).toBe(false); expect(kn.p.build!.soilExtra).toBe(0);
    expect(unk.s.parcels.find((x) => x.id === unk.p.parcelId)!.soilKnown).toBe(true);
  });
  it('ruhsat süresi rastgele gecikebilir; aşama günleri toplamı planlanan süreyi verir', () => {
    const { project: p } = setup(); const d = stageDays(p).reduce((a, x) => a + x, 0); expect(Math.abs(d - Math.max(60, p.expected.months * 30))).toBeLessThan(0.001);
    expect(STAGES).toHaveLength(18);
  });
});

describe('teslim sonrası: toplu satış, net varlık, kayıt', () => {
  it('toplu satış: gelir ledger\'a, arsa pazardan çıkar, kâr istatistiği; net varlık tutarlı', () => {
    const { s, project: p } = setup(); dispatch(s, 'StartConstruction', { projectId: p.id }); runUntil(s, () => p.status !== 'insaat');
    const nw0 = netWorth(s); expect(projectAssetValue(s)).toBeGreaterThan(0);
    const c0 = s.company!.cash; expect(dispatch(s, 'SellProjectBulk', { projectId: p.id }).ok).toBe(true);
    expect(p.status).toBe('satildi'); expect(s.company!.cash).toBeGreaterThan(c0); expect(s.parcels.some((x) => x.id === p.parcelId)).toBe(false);
    expect(s.company!.stats.sold).toBe(1); expect(p.result!.revenue).toBeGreaterThan(0); expect(checkInvariant(s)).toBe(true);
    expect(Math.abs(netWorth(s) - nw0) / nw0).toBeLessThan(0.25); // satış %82, değerleme %85: makul fark
    expect(dispatch(s, 'SellProjectBulk', { projectId: p.id }).ok).toBe(false);
  });
  it('inşaat sırasında kaydet→yükle→devam birebir aynı sonucu verir', () => {
    const { s, project: p } = setup(); dispatch(s, 'StartConstruction', { projectId: p.id }); advanceDays(s, 50);
    expect(p.status).toBe('insaat'); const r = unpack(pack(s)); expect(r.ok).toBe(true); if (!r.ok) return;
    advanceDays(s, 400); advanceDays(r.state, 400); expect(JSON.stringify(r.state)).toBe(JSON.stringify(s));
  });
  it('v3 kaydı v4\'e taşınır', () => {
    const { s } = setup(); const old: any = JSON.parse(JSON.stringify(s)); old.meta.version = 3; delete old.weather; delete old.company.stats; for (const pr of old.projects) delete pr.hood;
    const r = unpack(pack(old)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.meta.version).toBe(8); expect(r.state.company!.stats.completed).toBe(0); expect(r.state.projects[0]!.hood).toBe('Test Mahallesi'); advanceDays(r.state, 60); }
  });
  it('aynı tohum aynı inşaat', () => {
    const run = () => { const { s, project: p } = setup({ seed: 12 }); dispatch(s, 'StartConstruction', { projectId: p.id }); advanceDays(s, 500); return JSON.stringify([s.projects, s.company, s.weather]); };
    expect(run()).toBe(run());
  });
});

void askPrice; void marketParcels;
