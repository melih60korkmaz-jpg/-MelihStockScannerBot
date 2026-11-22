import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { DEMO_DAYS, dealCash, dealDiscount, dealProfit, dealsOpen, makeDeal } from '../src/sim/deals';
import { unitsOf } from '../src/sim/sales';
import { planProject } from '../src/sim/projects';
import { pack, unpack } from '../src/save/serialize';
import type { Deal, GameState } from '../src/core/types';

function setup(seed = 31): GameState {
  const s = newGameState(seed); dispatch(s, 'CreateCompany', { name: 'Fırsat Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  for (const t of ['usta', 'isci', 'isci', 'isci', 'isci', 'santiye_sefi']) dispatch(s, 'HireStaff', { type: t });
  const c = s.company!; c.level = 4; c.cash = TL(900_000_000); s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999; return s;
}
const give = (s: GameState, kind: Deal['kind']): Deal => { let d: Deal | null = null; for (let i = 0; i < 20 && !d; i++) d = makeDeal(s, kind); expect(d).not.toBeNull(); (s.deals ??= []).push(d!); return d!; };

describe('fırsat ilanları', () => {
  it('her tür için fırsat üretilir; indirimli ve süreli', () => {
    const s = setup(); for (const k of ['bina', 'yarim', 'eski', 'kat'] as const) { const d = give(s, k); expect(d.until).toBeGreaterThan(s.clock.day); expect(d.parcel.owner).toBe('market'); if (k !== 'kat') expect(dealDiscount(d)).toBeGreaterThan(0.05); else { expect(d.share).toBeGreaterThanOrEqual(0.3); expect(d.price).toBe(0); } }
    expect(dealsOpen(s).length).toBe(4);
  });
  it('aylık akışta fırsatlar çıkar (en çok 6 açık) ve süresi dolanlar temizlenir', () => {
    const s = setup(); let n = 0; for (let m = 0; m < 14; m++) { const evs = advanceDays(s, 30); n += evs.filter((e) => e.type === 'DEAL_NEW').length; expect((s.deals ?? []).length).toBeLessThanOrEqual(6); }
    expect(n).toBeGreaterThan(2); advanceDays(s, 90); expect((s.deals ?? []).every((d) => d.until > s.clock.day - 31)).toBe(true);
  });
  it('bitmiş bina: devralınır, satış merkezi açılır, nakit ve defter tutarlı', () => {
    const s = setup(); const d = give(s, 'bina'), c0 = s.company!.cash; expect(dispatch(s, 'AcceptDeal', { dealId: d.id }).ok).toBe(true);
    expect(c0 - s.company!.cash).toBe(dealCash(d)); const p = s.projects.at(-1)!; expect(p.status).toBe('tamamlandi'); expect(unitsOf(s, p.id).length).toBeGreaterThan(0); expect(p.sales).toBeDefined(); expect(checkInvariant(s)).toBe(true);
    expect(dispatch(s, 'AcceptDeal', { dealId: d.id }).ok).toBe(false);
    p.sales!.autoMin = 0; advanceDays(s, 400); expect(p.sales!.sold).toBeGreaterThan(0); expect(checkInvariant(s)).toBe(true);
  });
  it('eski bina arsası: yıkım bitene kadar proje açılamaz', () => {
    const s = setup(); const d = give(s, 'eski'); expect(dispatch(s, 'AcceptDeal', { dealId: d.id }).ok).toBe(true); const pc = s.parcels.find((x) => x.id === d.parcel.id)!; expect(pc.owner).toBe('player'); expect(pc.demolishUntil).toBe(s.clock.day + DEMO_DAYS);
    const r = dispatch(s, 'CreateProject', { parcelId: pc.id, type: d.type, quality: d.quality }); expect(r.ok).toBe(false); advanceDays(s, DEMO_DAYS + 1); expect(dispatch(s, 'CreateProject', { parcelId: pc.id, type: d.type, quality: d.quality }).ok).toBe(true);
  });
  it('kat karşılığı: arsa bedeli yok, gelir arsa sahibiyle paylaşılır, dairelerin payı ayrılır', () => {
    const s = setup(); const d = give(s, 'kat'), c0 = s.company!.cash; expect(dispatch(s, 'AcceptDeal', { dealId: d.id }).ok).toBe(true); expect(c0 - s.company!.cash).toBe(d.demo);
    const pc = s.parcels.find((x) => x.id === d.parcel.id)!; expect(pc.kat!.share).toBe(d.share);
    const full = planProject(s, { ...pc, kat: undefined }, d.type, d.quality, 0).revenue.mid, shared = planProject(s, pc, d.type, d.quality, 0).revenue.mid; expect(shared).toBeLessThan(full * (1 - d.share) * 1.01);
    advanceDays(s, DEMO_DAYS + 1); expect(dispatch(s, 'CreateProject', { parcelId: pc.id, type: d.type, quality: d.quality }).ok).toBe(true); const p = s.projects.at(-1)!;
    expect(dispatch(s, 'StartConstruction', { projectId: p.id }).ok).toBe(true); const us = unitsOf(s, p.id), land = us.filter((u) => u.landlord), tot = us.reduce((a, u) => a + u.area, 0);
    expect(land.length).toBeGreaterThan(0); expect(land.reduce((a, u) => a + u.area, 0) / tot).toBeGreaterThan(d.share - 0.15); expect(land.reduce((a, u) => a + u.area, 0) / tot).toBeLessThan(d.share + 0.15); expect(land.every((u) => u.status === 'satildi' && u.price === 0)).toBe(true);
  });
  it('yarım inşaat: devralınır, ilerlemiş aşamadan sürer, kalite geçmiş işe bağlıdır', () => {
    const s = setup(); const d = give(s, 'yarim'); expect(dispatch(s, 'AcceptDeal', { dealId: d.id }).ok).toBe(true); const p = s.projects.at(-1)!; expect(p.status).toBe('insaat'); expect(p.build!.stage).toBe(d.stage); expect(p.build!.qualityW).toBeGreaterThan(0);
    advanceDays(s, 60); expect(p.build!.stage).toBeGreaterThanOrEqual(d.stage); expect(checkInvariant(s)).toBe(true);
  });
  it('nakit yetmezse kabul edilmez; reddet fırsatı kaldırır; kayıttan sağ çıkar', () => {
    const s = setup(); const d = give(s, 'bina'), d2 = give(s, 'eski'); s.company!.cash = 100; s.ledgerBase = 100 - s.ledger.reduce((a, e) => a + e.amount, 0); expect(dispatch(s, 'AcceptDeal', { dealId: d.id }).ok).toBe(false);
    expect(dispatch(s, 'DeclineDeal', { dealId: d2.id }).ok).toBe(true); expect(s.deals!.some((x) => x.id === d2.id)).toBe(false);
    const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.deals!.length).toBe(1); expect(r.state.deals![0]!.parcel.area).toBe(d.parcel.area); }
  });
  it('hemen al-sat engellenir: kat karşılığı arsa satılamaz, eski bina arsası yıkım ve 180 gün boyunca satılamaz', () => {
    const s = setup(); const k = give(s, 'kat'); dispatch(s, 'AcceptDeal', { dealId: k.id }); const pk = s.parcels.find((x) => x.id === k.parcel.id)!;
    expect(dispatch(s, 'SellLandQuick', { parcelId: pk.id }).ok).toBe(false); expect(dispatch(s, 'ListLand', { parcelId: pk.id, askMult: 1 }).ok).toBe(false);
    const e = give(s, 'eski'); dispatch(s, 'AcceptDeal', { dealId: e.id }); const pe = s.parcels.find((x) => x.id === e.parcel.id)!; expect(dispatch(s, 'SellLandQuick', { parcelId: pe.id }).ok).toBe(false);
    s.clock.day += 100; expect(dispatch(s, 'SellLandQuick', { parcelId: pe.id }).ok).toBe(false); s.clock.day += 90; expect(dispatch(s, 'SellLandQuick', { parcelId: pe.id }).ok).toBe(true);
  });
  it('bitmiş bina fırsatı mantıklı indirimli: kalite puanı değeri etkiler ve kaba kâr makul sınırda', () => {
    const s = setup(); for (let i = 0; i < 12; i++) { const d = give(s, 'bina'); expect(dealDiscount(d)).toBeGreaterThan(0.04); expect(dealDiscount(d)).toBeLessThan(0.3); const pr = dealProfit(s, d); expect(pr).toBeLessThan(d.fair * 0.25); }
  });
});
