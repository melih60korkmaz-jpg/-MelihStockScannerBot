import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { netWorth } from '../src/sim/finance';
import { CITIES } from '../src/data';
import { pack, unpack } from '../src/save/serialize';

describe('uzun koşu ve dayanıklılık', () => {
  it.each(CITIES.map((c) => c.id))('%s: şirket kurulur, ilan vardır, 4 yıl hatasız ilerler, kayıt gidiş-dönüş tutarlı', (city) => {
    const s = newGameState(99); expect(dispatch(s, 'CreateCompany', { name: 'Uzun Koşu', founderBackground: 'eski_kalfa', startCity: city }).ok).toBe(true);
    expect(s.parcels.filter((p) => p.city === city && p.owner === 'market').length).toBeGreaterThan(5);
    for (let i = 0; i < 8; i++) { advanceDays(s, 180); if (s.pending) dispatch(s, 'ResolveEvent', { choice: 0 }); expect(Number.isFinite(netWorth(s))).toBe(true); }
    expect(checkInvariant(s)).toBe(true);
    const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.clock.day).toBe(s.clock.day); expect(netWorth(r.state)).toBe(netWorth(s)); }
  });
  it('performans: 1 yıl simülasyon 1,5 sn altında; kayıt boyutu makul', () => {
    const s = newGameState(5); dispatch(s, 'CreateCompany', { name: 'Hız Yapı', founderBackground: 'emlakci', startCity: 'istanbul' });
    const t0 = performance.now(); advanceDays(s, 365); const ms = performance.now() - t0; expect(ms).toBeLessThan(1500);
    expect(pack(s).length).toBeLessThan(2_500_000);
  });
  it('iflas sonrası oyun ilerlemez ve komutlar güvenli reddedilir/çalışır (çökmez)', () => {
    const s = newGameState(5); dispatch(s, 'CreateCompany', { name: 'Batık Yapı', founderBackground: 'emlakci', startCity: 'ankara' }); s.company!.bankrupt = true;
    const d = s.clock.day; advanceDays(s, 30); expect(s.clock.day).toBe(d); expect(dispatch(s, 'TakeLoan', { kind: 'ticari', bank: 'ozel', amount: 100000 * 100, term: 12 }).ok).toBe(false);
  });
});
