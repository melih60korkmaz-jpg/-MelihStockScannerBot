import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { monthlyCosts } from '../src/sim/finance';
import { deptCandidates, deptEffect, deptPerf, getMgmt, gmQ, majorityOf, mgmtMatMult, mgmtPenaltyMult, mgmtRateDelta, mgmtSaleMult, mgmtTender, refreshCands, suggestGoals } from '../src/sim/mgmt';
import { rateFor } from '../src/sim/loans';
import { unitPrice } from '../src/sim/materials';
import { unlockState } from '../src/sim/unlock';
import { pack, unpack } from '../src/save/serialize';
import type { GameState } from '../src/core/types';

function setup(level = 5, seed = 61): GameState {
  const s = newGameState(seed); dispatch(s, 'CreateCompany', { name: 'Yönetim Holding', founderBackground: 'emlakci', startCity: 'ankara' });
  const c = s.company!; c.level = level; c.reputation = 60; c.creditScore = 700; c.cash = TL(500_000_000); s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999; return s;
}
const sum = (s: GameState) => monthlyCosts(s).reduce((a, x) => a + x.amount, 0);

describe('açılma sistemi', () => {
  it('koşullar açıkça listelenir; seviye yükselince açılır', () => {
    const s = setup(1); const u = unlockState(s, 'altyapi'); expect(u.open).toBe(false); expect(u.missing.join(' ')).toMatch(/Şirket seviyesi 5/);
    s.company!.level = 5; s.company!.reputation = 40; expect(unlockState(s, 'altyapi').open).toBe(true); expect(unlockState(setup(1), 'yonetim').open).toBe(false);
  });
});
describe('genel müdür', () => {
  it('işe alınır, maaş giderlere eklenir, etki üretir; görevden alınınca tazminat ödenir', () => {
    const s = setup(); refreshCands(s); const m = getMgmt(s), c = m.cands.slice().sort((a, b) => b.skill - a.skill)[0]!; const c0 = s.company!.cash, base = sum(s), sale0 = mgmtSaleMult(s), tnd0 = mgmtTender(s);
    expect(dispatch(s, 'HireGM', { candId: c.id }).ok).toBe(true); expect(s.company!.cash).toBe(c0 - c.salary * 2); expect(sum(s)).toBe(base + c.salary); expect(gmQ(s)).toBeGreaterThan(0.3); expect(mgmtSaleMult(s)).toBeGreaterThan(sale0); expect(mgmtTender(s)).toBeGreaterThan(tnd0);
    expect(dispatch(s, 'HireGM', { candId: c.id }).ok).toBe(false); const c1 = s.company!.cash; expect(dispatch(s, 'FireGM', {}).ok).toBe(true); expect(s.company!.cash).toBe(c1 - c.salary * 4); expect(m.gm).toBeNull(); expect(checkInvariant(s)).toBe(true);
  });
  it('düşük becerili genel müdür zaman içinde hatalı karar verir; kayıt-yükleme korunur', () => {
    const s = setup(); refreshCands(s); const m = getMgmt(s), bad = m.cands.slice().sort((a, b) => a.skill - b.skill)[0]!; dispatch(s, 'HireGM', { candId: bad.id }); let mistakes = 0;
    for (let i = 0; i < 60; i++) { const evs = advanceDays(s, 30); mistakes += evs.filter((e) => e.type === 'GM_MISTAKE').length; if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); if (s.company!.bankrupt) break; }
    expect(m.gm!.mistakes).toBe(mistakes); expect(mistakes).toBeGreaterThan(0); const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) expect(r.state.mgmt!.gm!.name).toBe(m.gm!.name);
  });
});
describe('departmanlar', () => {
  it('kurulur, maliyet doğar, performans bütçe/müdür/personelle artar ve gerçek sistemlere etki eder', () => {
    const s = setup(); const c0 = s.company!.cash, base = sum(s);
    for (const d of ['satis', 'satinalma', 'finans', 'strateji', 'hukuk', 'ik', 'insaat']) expect(dispatch(s, 'OpenDept', { dept: d }).ok).toBe(true);
    expect(s.company!.cash).toBeLessThan(c0); expect(sum(s)).toBeGreaterThan(base); expect(dispatch(s, 'OpenDept', { dept: 'satis' }).ok).toBe(false);
    const p0 = deptPerf(s, 'satis'); dispatch(s, 'DeptStaff', { dept: 'satis', delta: 1 }); dispatch(s, 'DeptStaff', { dept: 'satis', delta: 1 }); dispatch(s, 'SetDeptBudget', { dept: 'satis', mult: 1.5 });
    const cand = deptCandidates(s, 'satis').sort((a, b) => b.skill - a.skill)[0]!; expect(dispatch(s, 'HireDeptMgr', { dept: 'satis', candId: cand.id }).ok).toBe(true); expect(deptPerf(s, 'satis')).toBeGreaterThan(p0 + 15);
    for (const d of ['satinalma', 'finans', 'strateji', 'hukuk', 'ik', 'insaat']) { dispatch(s, 'SetDeptBudget', { dept: d, mult: 2 }); dispatch(s, 'DeptStaff', { dept: d, delta: 1 }); dispatch(s, 'DeptStaff', { dept: d, delta: 1 }); dispatch(s, 'DeptStaff', { dept: d, delta: 1 }); const c2 = deptCandidates(s, d).sort((a, b) => b.skill - a.skill)[0]!; dispatch(s, 'HireDeptMgr', { dept: d, candId: c2.id }); }
    expect(deptEffect(s, 'satis')).toBeGreaterThan(0.3); expect(mgmtSaleMult(s)).toBeGreaterThan(1.03); expect(mgmtMatMult(s)).toBeLessThan(1); expect(mgmtRateDelta(s)).toBeLessThan(0); expect(mgmtPenaltyMult(s)).toBeLessThan(1);
    const s2 = setup(); expect(unitPrice(s, 'demir', 'yerel')).toBeLessThan(unitPrice(s2, 'demir', 'yerel')); expect(rateFor(s, 'ozel', 'ticari')).toBeLessThan(rateFor(s2, 'ozel', 'ticari'));
    expect(dispatch(s, 'DeptStaff', { dept: 'satis', delta: -1 }).ok).toBe(true); expect(checkInvariant(s)).toBe(true);
  });
  it('seviye yetmezse departman kurulamaz', () => { const s = setup(2); expect(dispatch(s, 'OpenDept', { dept: 'strateji' }).ok).toBe(false); });
});
describe('yönetim kurulu', () => {
  it('çeyrek başında toplantı açılır; karar oylamaya göre güveni değiştirir ve etkisini uygular', () => {
    const s = setup(); const m = getMgmt(s); let found = false;
    for (let i = 0; i < 14 && !found; i++) { advanceDays(s, 30); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); found = !!m.meeting; }
    expect(found).toBe(true); const mt = m.meeting!; expect(mt.items.length).toBe(3);
    const it = mt.items[0]!, votes = it.id ? 0 : 0; void votes; const tr0 = m.board.map((b) => b.loyalty);
    for (const item of [...mt.items]) { expect(dispatch(s, 'DecideAgenda', { itemId: item.id, option: 0 }).ok).toBe(true); expect(dispatch(s, 'DecideAgenda', { itemId: item.id, option: 0 }).ok).toBe(false); }
    expect(m.meeting).toBeNull(); expect(m.board.some((b, i) => b.loyalty !== tr0[i])).toBe(true); expect(s.decisions!.filter((d) => d.kind === 'kurul').length).toBe(3); expect(checkInvariant(s)).toBe(true);
  });
  it('büyüme duruşu satış ve şantiye çarpanını artırır, tasarruf düşürür; süre dolunca biter', () => {
    const s = setup(); const m = getMgmt(s); const s0 = mgmtSaleMult(s); m.mode = { id: 'buyume', until: s.clock.day + 100 }; expect(mgmtSaleMult(s)).toBeGreaterThan(s0); m.mode = { id: 'tasarruf', until: s.clock.day + 100 }; expect(mgmtSaleMult(s)).toBeLessThan(s0);
    m.mode = { id: 'buyume', until: s.clock.day - 1 }; expect(mgmtSaleMult(s)).toBe(s0);
  });
  it('çoğunluk hesabı: eşitlikte ilk seçenek', () => { expect(majorityOf([1, 1, 0, 2, 1], 3)).toBe(1); expect(majorityOf([0, 1], 2)).toBe(0); });
  it('toplantı 45 gün karara bağlanmazsa ertelenir ve güven düşer', () => {
    const s = setup(); const m = getMgmt(s); for (let i = 0; i < 14 && !m.meeting; i++) { advanceDays(s, 30); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); } expect(m.meeting).not.toBeNull();
    const tr0 = m.board[0]!.loyalty; for (let i = 0; i < 3; i++) { advanceDays(s, 30); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); } expect(m.board[0]!.loyalty).toBeLessThan(tr0);
  });
});
describe('yıllık hedefler', () => {
  it('belirlenir, yıl sonunda puanlanır ve yıllık rapora yazılır; yılda bir kez', () => {
    const s = setup(); expect(dispatch(s, 'SetGoals', { ids: [], diff: 1 }).ok).toBe(false); expect(dispatch(s, 'SetGoals', { ids: ['ciro', 'kar'], diff: 5 }).ok).toBe(false);
    expect(suggestGoals(s).length).toBe(8); expect(dispatch(s, 'SetGoals', { ids: ['ciro', 'kar', 'sehir', 'memnuniyet'], diff: 1 }).ok).toBe(true); expect(dispatch(s, 'SetGoals', { ids: ['ciro'], diff: 1 }).ok).toBe(false);
    for (let i = 0; i < 13; i++) { advanceDays(s, 30); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); }
    const m = getMgmt(s); expect(m.goalHist.length).toBe(1); const h = m.goalHist[0]!; expect(h.res.length).toBe(4); expect(h.score).toBeGreaterThanOrEqual(0); expect(m.goals).toBeNull();
    expect(s.reports![0]!.goals!.score).toBe(h.score); expect(checkInvariant(s)).toBe(true);
  });
});
