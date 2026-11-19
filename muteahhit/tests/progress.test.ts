import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { ACHIEVEMENTS, LEVEL_DEFS, QUESTS, officeFor } from '../src/data';
import { checkProgress, levelChecks, metric, nextLevel } from '../src/sim/progress';
import { pack, unpack } from '../src/save/serialize';
import type { GameEvent, GameState, Parcel } from '../src/core/types';

const mk = (s: GameState): Parcel => { const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'cankaya', hood: 'Test', area: 500, zoning: 'konut', taks: 0.4, kaks: 1.6, maxFloors: 5, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1_000_000) }; s.parcels.push(p); return p; };
function setup(cash = TL(60_000_000)) {
  const s = newGameState(31); dispatch(s, 'CreateCompany', { name: 'İlerleme Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  s.company!.cash = cash; s.ledgerBase = cash - s.ledger.reduce((a, e) => a + e.amount, 0); return s;
}

describe('veri', () => {
  it('seviyeler artan; görev/başarım kimlikleri benzersiz; ölçütler tanımlı', () => {
    expect(LEVEL_DEFS.length).toBe(8); LEVEL_DEFS.forEach((l, i) => expect(l.level).toBe(i + 1));
    expect(new Set([...QUESTS, ...ACHIEVEMENTS].map((x) => x.id)).size).toBe(QUESTS.length + ACHIEVEMENTS.length); expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(30);
    const s = setup(); for (const x of [...QUESTS, ...ACHIEVEMENTS]) expect(Number.isFinite(metric(s, x.m))).toBe(true);
  });
});
describe('görevler ve başarımlar', () => {
  it('görev tamamlanınca ödül yatar (gün ilerleyince); tek sefer', () => {
    const s = setup(); const c0 = s.company!.cash; const p = mk(s); void p; const ev: GameEvent[] = advanceDays(s, 8);
    expect(s.progress.quests.q_arsa).toBeDefined(); expect(ev.some((e) => e.type === 'QUEST_DONE' && e.data?.id === 'q_arsa')).toBe(true);
    const gain = s.ledger.filter((e) => e.cat === 'olay_gelir').reduce((a, e) => a + e.amount, 0); expect(gain).toBeGreaterThanOrEqual(TL(200000)); void c0;
    const again = advanceDays(s, 30); expect(again.some((e) => e.type === 'QUEST_DONE' && e.data?.id === 'q_arsa')).toBe(false); expect(checkInvariant(s)).toBe(true);
  });
  it('komut sayaçları: kredi, proje başlatma', () => {
    const s = setup(); dispatch(s, 'TakeLoan', { kind: 'ticari', bank: 'ozel', amount: TL(500000), term: 12 }); expect(s.progress.c.loans).toBe(1);
    const pc = mk(s); dispatch(s, 'CreateProject', { parcelId: pc.id, type: 'apartman', quality: 'standart' }); dispatch(s, 'StartConstruction', { projectId: s.projects[0]!.id }); expect(s.progress.c.started).toBe(1);
  });
  it('başarım kilidi: koşul sağlanınca açılır, ödül yoktur', () => {
    const s = setup(); s.company!.reputation = 55; const cash = s.company!.cash; checkProgress(s, [], false, true); expect(s.progress.ach.a_itibar50).toBeDefined(); expect(s.company!.cash).toBe(cash);
  });
});
describe('seviye ve ofis', () => {
  it('şartlar sağlanınca seviye atlar ve oyun duraklar; ödül verilir', () => {
    const s = setup(TL(100_000_000)); const nl = nextLevel(s)!; expect(nl.level).toBe(2); expect(levelChecks(s, 2).some((x) => !x.ok)).toBe(true);
    s.company!.stats.completed = 1; const ev: GameEvent[] = []; checkProgress(s, ev); expect(s.company!.level).toBe(2); expect(ev.find((e) => e.type === 'LEVEL_UP')?.pause).toBe(true);
  });
  it('ofis yükseltme: seviye ve nakit şartı, kapasite artar, gider artar', () => {
    const s = setup(); expect(dispatch(s, 'UpgradeOffice', {}).ok).toBe(false); s.company!.level = 2; const cap0 = officeFor(s.company!.office).capacity, cash = s.company!.cash;
    expect(dispatch(s, 'UpgradeOffice', {}).ok).toBe(true); expect(s.company!.office).toBe(2); expect(officeFor(2).capacity).toBeGreaterThan(cap0); expect(s.company!.cash).toBeLessThan(cash); expect(checkInvariant(s)).toBe(true);
    expect(dispatch(s, 'UpgradeOffice', {}).ok).toBe(false);
  });
  it('eski kayıt: ilerleme sessizce işlenir, ödül/olay yok', () => {
    const s = setup(); s.company!.stats.completed = 4; const old: any = JSON.parse(JSON.stringify(s)); delete old.progress; delete old.company.office; old.meta.version = 9;
    const cash = old.company.cash; const r = unpack(pack(old)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.company!.office).toBe(1); expect(r.state.progress.ach.a_ilk).toBeDefined(); expect(r.state.company!.cash).toBe(cash); expect(r.state.company!.level).toBeGreaterThanOrEqual(2); advanceDays(r.state, 30); }
  });
});
