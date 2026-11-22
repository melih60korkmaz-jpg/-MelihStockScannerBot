import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { offerPrice, offersOf, monthlyRent, OFFER_DAYS } from '../src/sim/buyers';
import { unitsOf, listPrice, fairPerM2 } from '../src/sim/sales';
import { pack, unpack } from '../src/save/serialize';
import type { GameEvent, GameState, Parcel } from '../src/core/types';

const mk = (s: GameState): Parcel => { const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'cankaya', hood: 'Test', area: 500, zoning: 'konut', taks: 0.4, kaks: 1.6, maxFloors: 5, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1_000_000) }; s.parcels.push(p); return p; };
function built(seed = 7) {
  const s = newGameState(seed); dispatch(s, 'CreateCompany', { name: 'Teklif Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  s.staff.length = 0; for (const t of ['usta', 'isci', 'isci', 'isci', 'isci', 'santiye_sefi']) dispatch(s, 'HireStaff', { type: t });
  const cash = TL(80_000_000); s.company!.cash = cash; s.ledgerBase = cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999;
  const parcel = mk(s); dispatch(s, 'CreateProject', { parcelId: parcel.id, type: 'apartman', quality: 'standart' }); const p = s.projects[0]!; dispatch(s, 'StartConstruction', { projectId: p.id });
  for (let i = 0; i < 1500 && p.status === 'insaat'; i++) advanceDays(s, 1);
  return { s, p };
}
const until = (s: GameState, f: () => boolean, max = 200): GameEvent[] => { const all: GameEvent[] = []; for (let i = 0; i < max && !f(); i++) all.push(...advanceDays(s, 1)); return all; };

describe('alıcı teklifleri', () => {
  it('varsayılan elle onay: teklif gelir, satış kendiliğinden kapanmaz', () => {
    const { s, p } = built(); const evs = until(s, () => offersOf(s, p.id).length > 0, 120); expect(offersOf(s, p.id).length).toBeGreaterThan(0);
    expect(evs.some((e) => e.type === 'OFFER_NEW')).toBe(true); expect(evs.some((e) => e.type === 'UNIT_SOLD')).toBe(false); expect(p.sales!.sold).toBe(0);
  });
  it('kabul: daire satılır, nakit artar, teklif kalkar; kayıt tutarlı', () => {
    const { s, p } = built(); until(s, () => offersOf(s, p.id).length > 0, 120); const o = offersOf(s, p.id)[0]!, c0 = s.company!.cash, u = s.units.find((x) => x.id === o.unitId)!;
    const price = offerPrice(s, p, u, o); const r = dispatch(s, 'AcceptOffer', { offerId: o.id }); expect(r.ok).toBe(true);
    expect(u.status).toBe('satildi'); expect(u.price).toBe(price); expect(s.offers!.some((x) => x.id === o.id)).toBe(false); expect(s.company!.cash).toBeGreaterThan(c0); expect(checkInvariant(s)).toBe(true);
    expect(p.sales!.log!.length).toBe(1); expect(dispatch(s, 'AcceptOffer', { offerId: o.id }).ok).toBe(false);
  });
  it('karşı teklif: alıcının gizli tavanı altındaysa kabul, üstündeyse alıcı gider', () => {
    const { s, p } = built(); until(s, () => offersOf(s, p.id).length > 0, 120); const o = offersOf(s, p.id)[0]!, u = s.units.find((x) => x.id === o.unitId)!;
    expect(dispatch(s, 'CounterOffer', { offerId: o.id, ratio: o.ratio - 0.1 }).ok).toBe(false);
    const hi = +(o.maxRatio + 0.01).toFixed(3); const r1 = dispatch(s, 'CounterOffer', { offerId: o.id, ratio: hi }); expect(r1.ok).toBe(true); expect(u.status).toBe('bos'); expect(s.offers!.some((x) => x.id === o.id)).toBe(false);
    until(s, () => offersOf(s, p.id).length > 0, 120); const o2 = offersOf(s, p.id)[0]!, u2 = s.units.find((x) => x.id === o2.unitId)!;
    expect(dispatch(s, 'CounterOffer', { offerId: o2.id, ratio: o2.maxRatio }).ok).toBe(true); expect(u2.status).toBe('satildi');
  });
  it('red ve süre dolumu: teklif kalkar', () => {
    const { s, p } = built(); until(s, () => offersOf(s, p.id).length > 0, 120); const o = offersOf(s, p.id)[0]!; expect(dispatch(s, 'RejectOffer', { offerId: o.id }).ok).toBe(true);
    until(s, () => offersOf(s, p.id).length > 0, 120); const o2 = offersOf(s, p.id)[0]!; const evs = advanceDays(s, OFFER_DAYS + 1); expect(s.offers!.some((x) => x.id === o2.id)).toBe(false); expect(evs.some((e) => e.type === 'OFFER_LOST')).toBe(true);
  });
  it('otomatik kabul eşiği: eşik üstü teklifler kendiliğinden satılır', () => {
    const { s, p } = built(); expect(dispatch(s, 'SetAutoSell', { projectId: p.id, min: 0.95 }).ok).toBe(true); const evs = until(s, () => p.sales!.sold > 0, 200); expect(evs.some((e) => e.type === 'UNIT_SOLD')).toBe(true);
    expect(dispatch(s, 'SetAutoSell', { projectId: p.id, min: 0.5 }).ok).toBe(false);
  });
  it('daire bazlı kontrol: özel fiyat liste fiyatını değiştirir; rezerve edilen daireye teklif gelmez', () => {
    const { s, p } = built(); const us = unitsOf(s, p.id), u = us[0]!; const l0 = listPrice(u, fairPerM2(s, p), p.sales!); expect(dispatch(s, 'SetUnit', { unitId: u.id, adj: 1.2 }).ok).toBe(true);
    expect(listPrice(u, fairPerM2(s, p), p.sales!)).toBeGreaterThan(l0); expect(dispatch(s, 'SetUnit', { unitId: u.id, adj: 2 }).ok).toBe(false);
    for (const x of us) dispatch(s, 'SetUnit', { unitId: x.id, hold: true }); advanceDays(s, 60); expect(offersOf(s, p.id).length).toBe(0);
  });
});
describe('kiralama', () => {
  it('kiralık ilan → kiracı teklifi → kabul → aylık kira geliri; kiracı ayrılabilir; kayıttan sağ çıkar', () => {
    const { s, p } = built(7); const us = unitsOf(s, p.id); for (const u of us) dispatch(s, 'SetUnit', { unitId: u.id, listing: 'kira' });
    until(s, () => offersOf(s, p.id).some((o) => o.kind === 'kira'), 150); const o = offersOf(s, p.id).find((x) => x.kind === 'kira')!; expect(o).toBeDefined();
    expect(dispatch(s, 'AcceptOffer', { offerId: o.id }).ok).toBe(true); const u = s.units.find((x) => x.id === o.unitId)!; expect(u.rent).toBeDefined(); expect(u.status).toBe('bos'); expect(monthlyRent(s, p.id)).toBe(u.rent!.amount);
    expect(dispatch(s, 'SetUnit', { unitId: u.id, listing: 'sat' }).ok).toBe(false);
    const cash0 = s.company!.cash; advanceDays(s, 35); expect(s.company!.cash).toBeGreaterThan(cash0 - TL(5_000_000)); expect(checkInvariant(s)).toBe(true);
    const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) expect(r.state.units.find((x) => x.id === u.id)!.rent!.tenant).toBe(u.rent!.tenant);
    expect(dispatch(s, 'EndRent', { unitId: u.id }).ok).toBe(true); expect(u.rent).toBeUndefined(); expect(u.listing).toBe('kira');
  });
});

describe('ilan hızı ve öne çıkan ilan', () => {
  it('hızlı ilan daha çok teklif getirir, çok yavaş azaltır; hızlı ilan reklam gideri doğurur', () => {
    const count = (pace: number) => { let n = 0; for (let seed = 21; seed < 25; seed++) { const { s, p } = built(seed); dispatch(s, 'SetPace', { projectId: p.id, pace }); const evs = advanceDays(s, 150); n += evs.filter((e) => e.type === 'OFFER_NEW').length; if (pace === 4) expect(s.ledger.some((e) => e.cat === 'reklam')).toBe(true); expect(checkInvariant(s)).toBe(true); } return n; };
    const slow = count(0), mid = count(2), fast = count(4); expect(fast).toBeGreaterThan(mid); expect(mid).toBeGreaterThanOrEqual(slow);
  });
  it('geçersiz hız reddedilir; öne çıkarma bedel öder, 30 gün sürer, tekrarlanamaz', () => {
    const { s, p } = built(); expect(dispatch(s, 'SetPace', { projectId: p.id, pace: 9 }).ok).toBe(false);
    const u = unitsOf(s, p.id)[0]!, c0 = s.company!.cash; expect(dispatch(s, 'PromoteUnit', { unitId: u.id }).ok).toBe(true); expect(s.company!.cash).toBeLessThan(c0); expect(u.promo!).toBeGreaterThan(s.clock.day);
    expect(dispatch(s, 'PromoteUnit', { unitId: u.id }).ok).toBe(false); dispatch(s, 'SetUnit', { unitId: unitsOf(s, p.id)[1]!.id, hold: true }); expect(dispatch(s, 'PromoteUnit', { unitId: unitsOf(s, p.id)[1]!.id }).ok).toBe(false);
  });
});

describe('kira kısıtları', () => {
  it('yatırımcılı projede kiralama reddedilir', () => {
    const { s, p } = built(); s.investments.push({ id: s.nextId++, projectId: p.id, amount: TL(1_000_000), share: 0.2, day: 0 }); const u = unitsOf(s, p.id)[0]!;
    expect(dispatch(s, 'SetUnit', { unitId: u.id, listing: 'kira' }).ok).toBe(false);
  });
});
