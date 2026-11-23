import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { KINDS, generateTender } from '../src/sim/tenders';
import { generateParcel } from '../src/sim/land';
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
