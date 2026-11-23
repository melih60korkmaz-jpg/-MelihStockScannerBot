import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { KINDS, generateTender } from '../src/sim/tenders';
import { generateParcel } from '../src/sim/land';
import { advanceDays } from '../src/sim/engine';
import { isUnlocked } from '../src/sim/unlock';
import { cityData } from '../src/data';
import type { GameState } from '../src/core/types';

const mk = (level: number): GameState => { const s = newGameState(41); dispatch(s, 'CreateCompany', { name: 'Olcek Yapi', founderBackground: 'emlakci', startCity: 'ankara' }); s.company!.level = level; s.company!.cash = TL(500_000_000); return s; };
describe('büyüme ve erişim', () => {
  it('malzeme alma (tedarik) ilk seviyeden açık', () => { expect(isUnlocked(mk(1), 'tedarik')).toBe(true); });
  it('büyük ihale türleri seviyeyle açılır: düşük seviyede kampüs/kule çıkmaz, yüksekte çıkar ve daha büyüktür', () => {
    const kinds = (lvl: number) => { const s = mk(lvl), out = new Set<string>(); for (let i = 0; i < 400; i++) { const t = generateTender(s, 'ankara'); if (t) out.add(t.kind); } return out; };
    const low = kinds(2), high = kinds(7); for (const k of ['kampus', 'kent', 'sehirhastane', 'kule']) { expect(low.has(k), 'düşük ' + k).toBe(false); expect(high.has(k), 'yüksek ' + k).toBe(true); }
    const s = mk(7); let big = 0; for (let i = 0; i < 200; i++) { const t = generateTender(s, 'ankara'); if (t && t.area >= 9000) big++; } expect(big).toBeGreaterThan(5); expect(KINDS.length).toBeGreaterThanOrEqual(9);
  });
  it('seviye yükseldikçe daha büyük arsalar çıkar', () => {
    const d = cityData('ankara')!.districts.find((x) => x.areaBias === 'large') ?? cityData('ankara')!.districts[0]!;
    const maxArea = (lvl: number) => { const s = mk(lvl); let m = 0; for (let i = 0; i < 400; i++) m = Math.max(m, generateParcel(s, 'ankara', d.id).area); return m; };
    expect(maxArea(7)).toBeGreaterThan(maxArea(1));
  });
});

describe('inşaat süresi ve malzeme akışı', () => {
  const build = (type: string, zoning: 'konut' | 'ticaret', area: number, kaks: number, taks: number, floors: number) => {
    const s = newGameState(23); dispatch(s, 'CreateCompany', { name: 'Sure Yapi', founderBackground: 'emlakci', startCity: 'istanbul' }); const c = s.company!; c.level = 7; c.cash = TL(5_000_000_000); c.reputation = 80; s.macro.calmUntilDay = 99999; s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0);
    for (const t of ['usta', 'isci', 'isci', 'santiye_sefi']) dispatch(s, 'HireStaff', { type: t });
    const pc = { id: s.nextId++, city: 'istanbul', district: 'kadikoy', hood: 'T', area, zoning, taks, kaks, maxFloors: floors, soil: 'saglam', soilKnown: true, roads: 2, corner: false, infra: 85, growth: 0.04, growthKnown: true, unitBase: TL(60000), askMult: 1, reserveMult: 1, negoLockUntil: 0, owner: 'player', costBasis: TL(1_000_000), boughtDay: 0 } as never; s.parcels.push(pc);
    expect(dispatch(s, 'CreateProject', { parcelId: (pc as { id: number }).id, type, quality: 'standart' }).ok).toBe(true); const p = s.projects.at(-1)!; dispatch(s, 'StartConstruction', { projectId: p.id }); const d0 = s.clock.day;
    for (let i = 0; i < 700 && p.status === 'insaat'; i++) { if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); advanceDays(s, 1); }
    return { days: s.clock.day - d0, status: p.status };
  };
  it('otel ve AVM gibi büyük binalar da depo dolu olsa bile durmaz ve ≈2,5 dakikada (≤375 oyun günü) biter', () => {
    for (const [t, z, a, k, tk, f] of [['otel', 'ticaret', 3000, 2.5, 0.45, 10], ['avm', 'ticaret', 6000, 2.0, 0.5, 5], ['site', 'konut', 5000, 1.5, 0.3, 6]] as const) { const r = build(t, z, a, k, tk, f); expect(r.status, t).toBe('tamamlandi'); expect(r.days, t).toBeLessThanOrEqual(375); }
  });
});
