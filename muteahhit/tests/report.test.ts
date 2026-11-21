import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { advanceDays } from '../src/sim/engine';
import { rivalProfile, standing } from '../src/sim/rivalLife';
import { pack, unpack } from '../src/save/serialize';

function setup() {
  const s = newGameState(33); dispatch(s, 'CreateCompany', { name: 'Rapor Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
  s.macro.calmUntilDay = 99999; return s;
}
describe('yıllık rapor ve canlı rakipler', () => {
  it('her yıl sonu rapor üretilir, defterle tutarlıdır ve kayıttan sağ çıkar', () => {
    const s = setup(); const evs = advanceDays(s, 365 * 2 + 5);
    expect((s.reports ?? []).length).toBeGreaterThanOrEqual(2);
    expect(evs.filter((e) => e.type === 'YEAR_REPORT').length).toBe(s.reports!.length);
    const r = s.reports![0]!; expect(r.profit).toBe(r.revenue - r.expense); expect(r.rank).toBeGreaterThanOrEqual(1); expect(r.rank).toBeLessThanOrEqual(r.rivals);
    expect(r.netWorthChange).toBeNull(); expect(s.reports![1]!.netWorthChange).not.toBeNull();
    const back = unpack(pack(s)); expect(back.ok).toBe(true); if (back.ok) expect(back.state.reports!.length).toBe(s.reports!.length);
  });
  it('rakip kimliği id ve addan türetilir: kararlı, her rakip için tanımlı', () => {
    const s = setup(); advanceDays(s, 40);
    expect(s.rivals.length).toBeGreaterThan(0);
    for (const r of s.rivals) { const a = rivalProfile(s, r), b = rivalProfile(s, r); expect(a).toEqual(b); expect(a.owner.length).toBeGreaterThan(3); expect(a.shape).toBeGreaterThanOrEqual(0); expect(a.shape).toBeLessThan(10); expect(a.color).toBeLessThan(8); expect(a.story).not.toMatch(/\{/); }
    const st = standing(s); expect(st.list.filter((x) => x.me).length).toBe(1); expect(st.total).toBe(st.list.length);
  });
});
