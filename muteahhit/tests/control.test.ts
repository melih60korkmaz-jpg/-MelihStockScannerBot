import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { activeOrder, projectMods, BOARD_IDS } from '../src/sim/control';
import { createStaff } from '../src/sim/staff';
import { eventDef } from '../src/data';
import { pack, unpack } from '../src/save/serialize';
import type { GameState, Project } from '../src/core/types';

function setup(): GameState {
  const s = newGameState(41); dispatch(s, 'CreateCompany', { name: 'Yönetim Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  const c = s.company!; c.level = 3; c.cash = TL(300_000_000); s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999; return s;
}
const proj = (s: GameState): Project => { const p = { id: s.nextId++, parcelId: 1, hood: 'T', name: 'Test Sitesi', type: 'konut', quality: 'standart', designSeed: 1, status: 'insaat', createdDay: 0, cityId: 'ankara', floors: 5, emsal: 1, brut: 3000, satilabilir: 2000, matIndexAtPlan: 100, budget: { base: 1, soil: 0, soft: 0, total: 1, designFee: 0 }, expected: { revenue: 1, months: 12 }, build: { stage: 6, progress: 0, spent: 0, unpaid: 0, matCost: 0 } } as unknown as Project; s.projects.push(p); return p; };

describe('yönetim katmanı', () => {
  it('odak yılda bir kez seçilir ve karar günlüğüne yazılır', () => {
    const s = setup(); expect(dispatch(s, 'SetFocus', { id: 'luks' }).ok).toBe(true); expect(s.company!.focus!.id).toBe('luks');
    expect(dispatch(s, 'SetFocus', { id: 'konut' }).ok).toBe(false); expect(s.decisions![0]!.kind).toBe('odak');
    expect(dispatch(s, 'SetFocus', { id: 'yok' } as never).ok).toBe(false);
  });
  it('emir süreli etki verir, ikinci emir reddedilir, süre dolunca biter', () => {
    const s = setup(); const p = proj(s); expect(projectMods(s, p).speed).toBe(1);
    expect(dispatch(s, 'IssueOrder', { projectId: p.id, order: 'hizlandir' }).ok).toBe(true); expect(projectMods(s, p).speed).toBeGreaterThan(1.1); expect(projectMods(s, p).risk).toBeGreaterThan(1);
    expect(dispatch(s, 'IssueOrder', { projectId: p.id, order: 'kalite' }).ok).toBe(false);
    s.clock.day += 50; expect(activeOrder(s, p)).toBeNull(); expect(projectMods(s, p).speed).toBe(1);
  });
  it('proje müdürü: yalnızca uygun görevliler, her biri tek projede; etki verir', () => {
    const s = setup(); const p = proj(s), p2 = proj(s); const sef = createStaff(s, 'santiye_sefi'), isci = createStaff(s, 'isci'); s.staff.push(sef, isci);
    expect(dispatch(s, 'SetManager', { projectId: p.id, staffId: isci.id }).ok).toBe(false);
    expect(dispatch(s, 'SetManager', { projectId: p.id, staffId: sef.id }).ok).toBe(true); expect(projectMods(s, p).speed).toBeGreaterThan(1); expect(projectMods(s, p).q).toBeGreaterThan(0);
    expect(dispatch(s, 'SetManager', { projectId: p2.id, staffId: sef.id }).ok).toBe(false);
    s.staff = s.staff.filter((x) => x.id !== sef.id); expect(projectMods(s, p).speed).toBe(1);
  });
  it('ofis eşyası: bir kez alınır, nakit düşer, ihale/moral etkisi vardır', () => {
    const s = setup(); const c0 = s.company!.cash; expect(dispatch(s, 'BuyDecor', { id: 'maket' }).ok).toBe(true); expect(s.company!.cash).toBeLessThan(c0);
    expect(dispatch(s, 'BuyDecor', { id: 'maket' }).ok).toBe(false); expect(dispatch(s, 'BuyDecor', { id: 'toplanti' }).ok).toBe(false); // ofis 1
  });
  it('yönetim kurulu olayları tanımlı, rastgele havuza girmez ve çeyrekte toplanır', () => {
    for (const id of BOARD_IDS) { const d = eventDef(id)!; expect(d.c).toBe('kurul'); expect(d.need).toContain('chain'); expect(d.ch.length).toBeGreaterThanOrEqual(2); }
    const s = setup(); const seen: string[] = []; for (let i = 0; i < 4; i++) { const evs = advanceDays(s, 100); for (const e of evs) if (e.type === 'EVENT_DECISION' && BOARD_IDS.includes(e.data!.id as string)) { seen.push(e.data!.id as string); dispatch(s, 'ResolveEvent', { choice: 0 }); } if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); }
    expect(seen.length).toBeGreaterThanOrEqual(1); expect(s.decisions!.some((d) => d.kind === 'kurul')).toBe(true);
  });
  it('kayıttan sağ çıkar', () => {
    const s = setup(); dispatch(s, 'SetFocus', { id: 'holding' }); dispatch(s, 'BuyDecor', { id: 'kahve' }); const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.company!.focus!.id).toBe('holding'); expect(r.state.company!.decor).toEqual(['kahve']); expect(r.state.decisions!.length).toBe(2); }
  });
});
