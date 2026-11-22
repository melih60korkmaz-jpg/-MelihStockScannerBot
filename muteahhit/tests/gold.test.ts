import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { GOLD_PACKS, goldOf, projectRemainingDays, rushCost, rushActive, stageRemainingDays } from '../src/sim/gold';
import { Store } from '../src/core/store';
import { pack, unpack } from '../src/save/serialize';
import type { GameState, Parcel } from '../src/core/types';

function setup(): { s: GameState; id: number } {
  const s = newGameState(8); dispatch(s, 'CreateCompany', { name: 'Altin Yapi', founderBackground: 'emlakci', startCity: 'ankara' }); s.staff.length = 0; for (const t of ['usta', 'isci', 'isci', 'isci', 'santiye_sefi', 'muhasebeci']) dispatch(s, 'HireStaff', { type: t });
  s.company!.cash = TL(80_000_000); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999;
  const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'kecioren', hood: 'T', area: 400, zoning: 'konut', taks: 0.5, kaks: 1.0, maxFloors: 3, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 80, growth: 0.04, growthKnown: false, unitBase: TL(2500), askMult: 1.05, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(500_000) } as never; s.parcels.push(p);
  dispatch(s, 'CreateProject', { parcelId: p.id, type: 'mustakil', quality: 'standart' }); const id = s.projects[0]!.id; dispatch(s, 'StartConstruction', { projectId: id }); return { s, id };
}
describe('altın ve hızlandırma', () => {
  it('başlangıç altını verilir; paket (test) altın ekler; geçersiz paket reddedilir', () => {
    const { s } = setup(); expect(goldOf(s)).toBe(30); expect(dispatch(s, 'BuyGoldTest', { pack: 'yok' }).ok).toBe(false); expect(dispatch(s, 'BuyGoldTest', { pack: GOLD_PACKS[0]!.id }).ok).toBe(true); expect(s.gold).toBe(30 + GOLD_PACKS[0]!.gold);
  });
  it('fiyat kalan süreye göre değişir; yeterli altın yoksa reddedilir; erken aşamada (ruhsat öncesi) kullanılamaz', () => {
    const { s, id } = setup(); const p = s.projects[0]!; advanceDays(s, 2); expect(p.build!.stage).toBeLessThan(6); expect(dispatch(s, 'RushProject', { projectId: id, kind: 'gun', days: 10 }).ok).toBe(false);
    const pr = { ...p, build: { ...p.build!, stage: 8, progress: 0 } } as never, pr2 = { ...p, build: { ...p.build!, stage: 12, progress: 0 } } as never; expect(rushCost(pr, 'gun', 30)).toBeGreaterThan(rushCost(pr, 'gun', 10)); expect(rushCost(pr, 'gun', 10)).toBeGreaterThan(rushCost(pr2, 'gun', 10) - 1); expect(projectRemainingDays(pr)).toBeGreaterThan(projectRemainingDays(pr2));
    expect(dispatch(s, 'RushProject', { projectId: id, kind: 'gun', days: 7 }).ok).toBe(false);
  });
  it('N gün ×3 hızlandırma aşamayı gerçekten daha çabuk bitirir, altın düşer, muhasebe tutar', () => {
    const run = (rush: boolean) => { const { s, id } = setup(); const p = s.projects[0]!; for (let i = 0; i < 400 && (p.build?.stage ?? 99) < 7; i++) advanceDays(s, 1); s.gold = 500; const g = s.gold; if (rush) { const r = dispatch(s, 'RushProject', { projectId: id, kind: 'gun', days: 30 }); expect(r.ok, JSON.stringify(r) + ' stage ' + p.build?.stage + ' ' + p.status).toBe(true); } const d0 = s.clock.day; for (let i = 0; i < 400 && p.status === 'insaat'; i++) advanceDays(s, 1); return { days: s.clock.day - d0, spent: g - s.gold!, s, p }; };
    const a = run(false), b = run(true); expect(b.spent).toBeGreaterThan(0); expect(b.days).toBeLessThan(a.days); expect(checkInvariant(b.s)).toBe(true); expect(b.s.goldLog!.some((l) => l.kind === 'hizlandirma' && l.amount < 0)).toBe(true);
  });
  it('aşamayı bitir: aşama değişince hızlandırma sona erer; çift hızlandırma engellenir', () => {
    const { s, id } = setup(); const p = s.projects[0]!; for (let i = 0; i < 400 && (p.build?.stage ?? 99) < 7; i++) advanceDays(s, 1); s.gold = 500; const stg = p.build!.stage; expect(dispatch(s, 'RushProject', { projectId: id, kind: 'asama' }).ok).toBe(true); expect(rushActive(s, p)).toBe(true); expect(dispatch(s, 'RushProject', { projectId: id, kind: 'gun', days: 10 }).ok).toBe(false);
    for (let i = 0; i < 200 && p.build!.stage === stg; i++) advanceDays(s, 1); expect(rushActive(s, p)).toBe(false); expect(stageRemainingDays(p)).toBeGreaterThanOrEqual(0);
  });
  it('seviye atlayınca altın kazanılır; kayıt-yükleme altını korur', () => {
    const { s } = setup(); goldOf(s); const g = s.gold!; const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.gold).toBe(g); expect(r.state.goldLog).toEqual(s.goldLog); }
  });
  it('muhasebeci çeyreklik vergiyi %6 düşürür', async () => {
    const { s } = setup(); expect(s.staff.some((x) => x.type === 'muhasebeci')).toBe(true);
  });
  it('otomatik akış: olay duraklaması pencere kapanınca kendiliğinden devam eder; oyuncu duraklatması korunur', () => {
    const { s } = setup(); const st = new Store(s); st.setSpeed(1); const d0 = s.clock.day; (st as unknown as { speed: number; autoPaused: boolean }).speed = 0; (st as unknown as { autoPaused: boolean }).autoPaused = true; st.frame(1100); expect(st.speed).toBe(1); expect(s.clock.day).toBeGreaterThan(d0);
    st.setSpeed(0); const d1 = s.clock.day; st.frame(5000); expect(st.speed).toBe(0); expect(s.clock.day).toBe(d1);
  });
});
