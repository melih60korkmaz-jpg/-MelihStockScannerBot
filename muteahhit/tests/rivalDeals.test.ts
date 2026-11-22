import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { aliveRivals } from '../src/sim/rivals';
import { relLabel, relOf } from '../src/sim/rivalLife';
import { eventDef } from '../src/data';
import { pack, unpack } from '../src/save/serialize';
import type { GameState, Parcel } from '../src/core/types';

function setup(): GameState {
  const s = newGameState(52); dispatch(s, 'CreateCompany', { name: 'Ortak Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  const c = s.company!; c.level = 3; c.cash = TL(400_000_000); s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999; advanceDays(s, 35); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); return s;
}
describe('rakiple ortaklık ve pazarlık', () => {
  it('olaylar tanımlı: rakip olayları {rakip} içerir, zincir olaylar rastgele gelmez', () => {
    for (const id of ['rv_ortak', 'rv_ortak_son', 'rv_ihale', 'rv_sorusturma', 'rv_arsa', 'rv_makine', 'rv_konsorsiyum', 'rv_fiyat', 'rv_dost', 'rv_dusman']) { const d = eventDef(id)!; expect(d).toBeDefined(); expect(d.c).toBe('rakip'); }
    expect(eventDef('rv_ortak_son')!.need).toContain('chain'); expect(eventDef('rv_sorusturma')!.need).toContain('chain');
  });
  it('teklif: görüşme kuyruğa girer, rakip adıyla karar olayı çıkar; ortaklık ilişkiyi artırır ve sonuç zinciri gelir', () => {
    const s = setup(); const r = aliveRivals(s)[0]!; expect(dispatch(s, 'ProposeToRival', { rivalId: r.id, kind: 'ortak' }).ok).toBe(true);
    expect(dispatch(s, 'ProposeToRival', { rivalId: r.id, kind: 'konsorsiyum' }).ok).toBe(false);
    for (let i = 0; i < 6 && !s.pending; i++) advanceDays(s, 1); expect(s.pending?.id).toBe('rv_ortak'); expect(s.pending?.rivalId).toBe(r.id);
    expect(dispatch(s, 'ResolveEvent', { choice: 0 }).ok).toBe(true); expect(relOf(r)).toBe(20); expect(relLabel(r)).toBe('Tarafsız'); expect(s.evtQueue!.some((q) => q.id === 'rv_ortak_son' && q.rivalId === r.id)).toBe(true);
    expect(checkInvariant(s)).toBe(true); expect(s.decisions!.some((d) => d.title.includes(r.name))).toBe(true);
  });
  it('düşman firma görüşmeyi reddeder; 90 gün bekleme; geçersiz teklif', () => {
    const s = setup(); const r = aliveRivals(s)[0]!; r.rel = -50; expect(dispatch(s, 'ProposeToRival', { rivalId: r.id, kind: 'ortak' }).ok).toBe(false); expect(relLabel(r)).toBe('Soğuk');
    r.rel = 0; expect(dispatch(s, 'ProposeToRival', { rivalId: r.id, kind: 'yok' }).ok).toBe(false); expect(dispatch(s, 'ProposeToRival', { rivalId: r.id, kind: 'arsa' }).ok).toBe(false); // boş arsa yok
  });
  it('arsa satışı: rakip prim öder, arsa gider, nakit artar; boş arsa yoksa etki yok', () => {
    const s = setup(); const r = aliveRivals(s)[0]!, pc: Parcel = { id: s.nextId++, city: 'ankara', district: 'cankaya', hood: 'Satılık', area: 500, zoning: 'konut', taks: 0.4, kaks: 1.6, maxFloors: 5, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1_000_000) }; s.parcels.push(pc); pc.boughtDay = s.clock.day;
    expect(dispatch(s, 'ProposeToRival', { rivalId: r.id, kind: 'arsa' }).ok).toBe(false); pc.boughtDay = s.clock.day - 130; expect(dispatch(s, 'ProposeToRival', { rivalId: r.id, kind: 'arsa' }).ok).toBe(true); for (let i = 0; i < 6 && !s.pending; i++) advanceDays(s, 1); expect(s.pending?.id).toBe('rv_arsa');
    const c0 = s.company!.cash; expect(dispatch(s, 'ResolveEvent', { choice: 0 }).ok).toBe(true); expect(s.parcels.some((x) => x.id === pc.id)).toBe(false); expect(s.company!.cash).toBeGreaterThan(c0); expect(relOf(r)).toBe(5); expect(checkInvariant(s)).toBe(true);
  });
  it('ilişki ihale fiyatını etkiler ve kayıttan sağ çıkar', () => {
    const s = setup(); const r = aliveRivals(s)[0]!; r.rel = 55; const back = unpack(pack(s)); expect(back.ok).toBe(true); if (back.ok) expect(back.state.rivals.find((x) => x.id === r.id)!.rel).toBe(55);
  });
});
