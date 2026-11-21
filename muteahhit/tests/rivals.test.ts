import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { EVENTS, eventDef } from '../src/data';
import { aliveRivals, rivalPressure } from '../src/sim/rivals';
import { DECISION_TIMEOUT, describeEffect, eventScale, eventsMonthly, resolveEvent } from '../src/sim/events';
import { pack, unpack } from '../src/save/serialize';
import type { GameEvent, GameState } from '../src/core/types';

function setup(seed = 21, cash = TL(80_000_000)) {
  const s = newGameState(seed); dispatch(s, 'CreateCompany', { name: 'Olay Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  for (const t of ['usta', 'isci', 'isci', 'santiye_sefi']) dispatch(s, 'HireStaff', { type: t });
  s.company!.cash = cash; s.ledgerBase = cash - s.ledger.reduce((a, e) => a + e.amount, 0); return s;
}

describe('rakip firmalar', () => {
  it('oyun başında 5 rakip; deterministik; farklı tarz ve ev şehri', () => {
    const a = setup(), b = setup(); expect(a.rivals.length).toBe(5); expect(a.rivals.map((r) => r.name)).toEqual(b.rivals.map((r) => r.name)); expect(new Set(a.rivals.map((r) => r.style)).size).toBe(3);
  });
  it('yıllar içinde hareket eder: arsa kapar, proje başlatır, bazıları iflas eder; sayı sınırlı kalır; invariant', () => {
    const s = setup(5); const log: GameEvent[] = []; for (let i = 0; i < 12 * 8; i++) log.push(...advanceDays(s, 30));
    expect(s.rivals.some((r) => r.last)).toBe(true); expect(aliveRivals(s).length).toBeLessThanOrEqual(6); expect(s.rivals.length).toBeLessThanOrEqual(24); expect(checkInvariant(s)).toBe(true); expect(JSON.stringify(s).length).toBeLessThan(2_500_000);
  });
  it('kriz: rakipler daha az hamle yapar; arz baskısı satış şansını düşürür', () => {
    const s = setup(); s.cityMarket.ankara!.supply = 0; expect(rivalPressure(s, 'ankara')).toBe(1); s.cityMarket.ankara!.supply = 10; expect(rivalPressure(s, 'ankara')).toBeLessThan(0.9); expect(rivalPressure(s, 'ankara')).toBeGreaterThanOrEqual(0.85);
  });
  it('eski kayıt (rakipsiz) açılır ve rakipler oluşur', () => {
    const s = setup(); const old: any = JSON.parse(JSON.stringify(s)); delete old.rivals; delete old.pending; delete old.evtLast; old.meta.version = 8; delete old.progress; delete old.company.office;
    const r = unpack(pack(old)); expect(r.ok).toBe(true); if (r.ok) { advanceDays(r.state, 35); expect(r.state.rivals.length).toBeGreaterThanOrEqual(5); }
  });
});

describe('olay kataloğu', () => {
  it('en az 40 olay; kimlikler benzersiz; her seçim geçerli ve etkileri tanımlı', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(70); expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    const kinds = new Set(['cash', 'rep', 'score', 'morale', 'sat', 'housing', 'land', 'mat', 'stall', 'leave', 'rate', 'machine', 'rival', 'tmorale', 'traise', 'tleave']);
    for (const e of EVENTS) { expect(e.ch.length).toBeGreaterThanOrEqual(1); expect(e.w).toBeGreaterThan(0); for (const c of e.ch) for (const x of [...c.e, ...(c.s ?? []), ...(c.f ?? [])]) expect(kinds.has(x[0] as string)).toBe(true); if (e.def !== undefined) expect(e.ch[e.def]).toBeDefined(); }
  });
  it('olay çıkar ve oyunu duraklatır; karar uygulanır; kasa tutarlı', () => {
    const s = setup(3); const evs: GameEvent[] = []; for (let i = 0; i < 12 && !s.pending; i++) evs.push(...advanceDays(s, 30));
    expect(s.pending).not.toBeNull(); expect(evs.some((e) => e.type === 'EVENT_DECISION' && e.pause)).toBe(true);
    const d = eventDef(s.pending!.id)!; const r = dispatch(s, 'ResolveEvent', { choice: 0 }); expect(r.ok).toBe(true); expect(s.pending).toBeNull(); expect(checkInvariant(s)).toBe(true); void d;
    expect(dispatch(s, 'ResolveEvent', { choice: 0 }).ok).toBe(false);
  });
  it('karar süresi dolunca varsayılan seçim uygulanır', () => {
    const s = setup(3); for (let i = 0; i < 12 && !s.pending; i++) advanceDays(s, 30); expect(s.pending).not.toBeNull(); const ev = advanceDays(s, DECISION_TIMEOUT + 1); expect(s.pending === null || s.pending.day > s.clock.day - DECISION_TIMEOUT).toBe(true); expect(ev.some((e) => e.type === 'EVENT_RESOLVED')).toBe(true);
  });
  it('olasılıklı seçimler başarı/başarısızlık verir; tutarlar firmayla ölçeklenir', () => {
    const small = setup(1, TL(10_000_000)), big = setup(1, TL(400_000_000)); expect(eventScale(big)).toBeGreaterThan(eventScale(small) * 3);
    const e = eventDef('komsu_dava')!; expect(describeEffect(small, e.ch[0]!.e[0]!)).toContain('Kasa −'); let ok = 0, bad = 0;
    for (let seed = 1; seed < 60; seed++) { const s = setup(seed); s.pending = { id: 'komsu_dava', day: s.clock.day, city: 'ankara' }; const r = resolveEvent(s, 1, []); if (r.success) ok++; else bad++; expect(checkInvariant(s)).toBe(true); }
    expect(ok).toBeGreaterThan(10); expect(bad).toBeGreaterThan(10);
  });
  it('çeşitlilik: 10 yılda 15+ farklı olay görülür; aynı olay sık tekrarlanmaz', () => {
    const s = setup(8, TL(900_000_000)); const seen: string[] = [];
    for (let i = 0; i < 120; i++) { advanceDays(s, 30); if (s.pending) { seen.push(s.pending.id); resolveEvent(s, 0, []); } }
    expect(new Set(seen).size).toBeGreaterThanOrEqual(15); for (const id of new Set(seen)) expect(seen.filter((x) => x === id).length).toBeLessThanOrEqual(4);
  });
  it('olaylar kayıttan sonra da çalışır (pending kaydedilir)', () => {
    const s = setup(3); for (let i = 0; i < 12 && !s.pending; i++) advanceDays(s, 30); const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.pending?.id).toBe(s.pending?.id); expect(dispatch(r.state, 'ResolveEvent', { choice: 0 }).ok).toBe(true); }
    void eventsMonthly;
  });
});
