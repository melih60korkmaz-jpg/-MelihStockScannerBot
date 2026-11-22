import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { netWorth } from '../src/sim/finance';
import { aliveRivals } from '../src/sim/rivals';
import { describeEffect, fill } from '../src/sim/events';
import { createStaff } from '../src/sim/staff';
import { EVENTS, eventDef } from '../src/data';
import type { GameState, Parcel } from '../src/core/types';

/** Katalogdaki HER olayın HER seçimi (başarı ve başarısızlık dalları dahil) uygulanır: istisna, NaN, defter tutarsızlığı ya da çözülmemiş {yer tutucu} olmamalı. */
function base(): GameState {
  const s = newGameState(77); dispatch(s, 'CreateCompany', { name: 'Matris Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  for (const t of ['usta', 'isci', 'isci', 'santiye_sefi', 'satis_danismani']) dispatch(s, 'HireStaff', { type: t });
  const c = s.company!; c.level = 6; c.cash = TL(500_000_000); s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999; advanceDays(s, 70); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 });
  const pc: Parcel = { id: s.nextId++, city: 'ankara', district: 'cankaya', hood: 'Matris', area: 500, zoning: 'konut', taks: 0.4, kaks: 1.6, maxFloors: 5, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1_000_000), boughtDay: -500 }; s.parcels.push(pc);
  dispatch(s, 'CreateProject', { parcelId: pc.id, type: 'apartman', quality: 'standart' }); dispatch(s, 'StartConstruction', { projectId: s.projects[0]!.id }); advanceDays(s, 5); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 });
  return s;
}
describe('olay × seçim matrisi', () => {
  for (const d of EVENTS) d.ch.forEach((ch, ci) => {
    const branches: ('s' | 'f' | null)[] = ch.p !== undefined ? ['s', 'f'] : [null];
    for (const br of branches) it(`${d.id} #${ci}${br ? ' ' + br : ''}`, () => {
      const s = base(); const r = aliveRivals(s)[0]!, st = s.staff[1]!, pr = s.projects[0]!;
      s.pending = { id: d.id, day: s.clock.day, projectId: pr.id, city: 'ankara', staffId: st.id, rivalId: r.id }; s.evtLast[d.id] = s.clock.day;
      expect(fill(s, d.t, s.pending)).not.toMatch(/\{/); expect(fill(s, d.x, s.pending)).not.toMatch(/\{/);
      for (const e of [...ch.e, ...(ch.s ?? []), ...(ch.f ?? [])]) expect(typeof describeEffect(s, e)).toBe('string');
      // başarı/başarısızlık dalını sabitlemek için olasılığı geçici olarak 1/0 yap
      const orig = ch.p; if (br) ch.p = br === 's' ? 1 : 0;
      try { const res = dispatch(s, 'ResolveEvent', { choice: ci }); expect(res.ok).toBe(true); } finally { if (orig !== undefined) ch.p = orig; }
      expect(s.pending).toBeNull(); expect(checkInvariant(s)).toBe(true); expect(Number.isFinite(netWorth(s))).toBe(true); expect(Number.isFinite(s.company!.cash)).toBe(true);
      expect(s.company!.reputation).toBeGreaterThanOrEqual(0); expect(s.company!.reputation).toBeLessThanOrEqual(100); expect(s.company!.creditScore).toBeGreaterThanOrEqual(100);
      for (const q of s.evtQueue ?? []) expect(eventDef(q.id)).toBeDefined();
      advanceDays(s, 25); expect(checkInvariant(s)).toBe(true);
    });
  });
  void createStaff;
});
