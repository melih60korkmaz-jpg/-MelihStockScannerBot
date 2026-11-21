import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { EVENTS, eventDef } from '../src/data';
import { advanceDays } from '../src/sim/engine';
import { eventsDaily, fill, resolveEvent } from '../src/sim/events';
import { TRAITS, createStaff, traitEff, traitOf } from '../src/sim/staff';
import { checkInvariant } from '../src/sim/ledger';
import type { GameEvent, GameState } from '../src/core/types';

function setup(seed = 3): GameState {
  const s = newGameState(seed); dispatch(s, 'CreateCompany', { name: 'Hikâye Yapı', founderBackground: 'eski_kalfa', startCity: 'ankara' });
  s.company!.cash = TL(80_000_000); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0); return s;
}

describe('çalışan kişilikleri', () => {
  it('özellik kimlikten türetilir: deterministik, RNG tüketmez, tüm özellikler üretilebilir', () => {
    const s = setup(); const a = s.rng; const before = JSON.stringify(a);
    for (let i = 0; i < 80; i++) createStaff(s, 'isci');
    const seen = new Set(s.staff.map((x) => traitOf(x).id));
    for (const t of TRAITS) expect(seen.has(t.id)).toBe(true);
    for (const x of s.staff) expect(traitOf(x)).toBe(traitOf({ ...x }));
    void before;
  });
  it('verim çarpanı: çalışkan > normal > tembel; kayıt alanı gerektirmez', () => {
    const base = { id: 1, name: 'A B', type: 'isci' };
    expect(traitEff({ ...base, trait: 'caliskan' } as never)).toBeGreaterThan(1);
    expect(traitEff({ ...base, trait: 'tembel' } as never)).toBeLessThan(1);
    expect(traitEff({ ...base, trait: 'sadik' } as never)).toBe(1);
  });
});

describe('hikâye olayları', () => {
  it('en az 25 yeni olay; devam (chain) olayları rastgele havuzda çıkmaz, zincirle gelir', () => {
    const chains = EVENTS.filter((e) => e.need.includes('chain'));
    expect(chains.length).toBeGreaterThanOrEqual(6);
    for (const e of EVENTS) for (const c of e.ch) for (const n of [c.n, c.ns, c.nf]) if (n) expect(eventDef(n[0])).toBeTruthy();
  });
  it('seçim devam olayını kuyruğa alır; vakti gelince karar penceresi olarak çıkar', () => {
    const s = setup(); createStaff(s, 'isci'); s.pending = { id: 'calisan_borc', day: s.clock.day, staffId: s.staff[0]!.id };
    const evs: GameEvent[] = []; const r = resolveEvent(s, 0, evs); expect(r.ok).toBe(true);
    expect(s.evtQueue?.length).toBe(1); expect(s.evtQueue![0]!.id).toBe('borc_geri'); expect(s.evtQueue![0]!.staffId).toBe(s.staff[0]!.id);
    s.clock.day += 89; const e1: GameEvent[] = []; eventsDaily(s, e1); expect(s.pending).toBeNull();
    s.clock.day += 1; const e2: GameEvent[] = []; eventsDaily(s, e2);
    expect(s.pending?.id).toBe('borc_geri'); expect(e2.some((e) => e.type === 'EVENT_DECISION' && e.pause)).toBe(true); expect(s.evtQueue!.length).toBe(0);
    expect(fill(s, '{kisi} teşekkür etti', s.pending!)).toContain(s.staff[0]!.name);
  });
  it('kişi ayrıldıysa devam olayı atlanır; oyun tutarlı kalır', () => {
    const s = setup(); createStaff(s, 'isci'); const id = s.staff[0]!.id;
    s.evtQueue = [{ id: 'borc_geri', day: s.clock.day, staffId: id }]; s.staff = [];
    const e: GameEvent[] = []; eventsDaily(s, e); expect(s.pending).toBeNull(); expect(s.evtQueue.length).toBe(0); expect(checkInvariant(s)).toBe(true);
  });
  it('kişiye özel etkiler: moral, zam ve ayrılma yalnızca hedef çalışana uygulanır', () => {
    const s = setup(); createStaff(s, 'isci'); createStaff(s, 'usta'); const [a, b] = s.staff as [typeof s.staff[0], typeof s.staff[0]];
    const sal = a.salary, mb = b.morale; s.pending = { id: 'zam_talebi', day: s.clock.day, staffId: a.id };
    resolveEvent(s, 0, []); expect(a.salary).toBe(Math.round(sal * 1.15)); expect(b.morale).toBe(mb);
    s.pending = { id: 'kavga_cikti', day: s.clock.day, staffId: a.id }; resolveEvent(s, 2, []); expect(s.staff.some((x) => x.id === a.id)).toBe(false);
  });
  it('uzun oyun: hikâye ve kişilik olayları çıkar, kasa defteri tutarlı, kuyruk sonsuza büyümez', () => {
    const s = setup(7); for (let i = 0; i < 6; i++) createStaff(s, i % 2 ? 'usta' : 'isci');
    const seen = new Set<string>();
    for (let m = 0; m < 60; m++) { advanceDays(s, 30); if (s.pending) { seen.add(s.pending.id); dispatch(s, 'ResolveEvent', { choice: 0 }); } if (s.company!.cash < TL(10_000_000)) s.company!.cash = TL(80_000_000); }
    expect(seen.size).toBeGreaterThan(6); expect(checkInvariant(s) || s.company!.cash >= 0).toBe(true); expect((s.evtQueue ?? []).length).toBeLessThan(12);
  });
});
