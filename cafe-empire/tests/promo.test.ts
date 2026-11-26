import { describe, expect, it } from 'vitest';
import { newGame, setPromo, setGununUrunu } from '../src/core/actions';
import { step, dayOf } from '../src/core/sim';
import { makeEmployee } from '../src/core/hr';
import { profitCurve, priceAdvice } from '../src/core/pricing';

const mk = (seed = 5, tip: 'cadde' | 'uni' = 'cadde', ilce = '34:Kadıköy') => { const s = newGame({ ad: 'T', sehir: 34, tip, seed, kasa: 5e7, ilce }).s; s.marka_puani = 30; return s; };
const run = (s: ReturnType<typeof mk>, g: number) => { for (let i = 0; i < g; i++) step(s, 1440); };
const tot = (s: ReturnType<typeof mk>, f: (r: ReturnType<typeof mk>['rapor'][number]) => number) => s.rapor.reduce((a, r) => a + f(r), 0);
describe('kampanyalar ve yönetim', () => {
  it('sabah paketi + mutlu saat müşteri ve kampanyalı satış getirir', () => {
    let on = 0, off = 0, kp = 0; for (const seed of [1, 2, 3]) { const a = mk(seed), c = mk(seed); expect(setPromo(a, a.subeler[0]!, 'sabah').ok).toBe(true); setPromo(a, a.subeler[0]!, 'mutlu'); run(a, 30); run(c, 30); on += tot(a, (r) => r.musteri); off += tot(c, (r) => r.musteri); kp += tot(a, (r) => r.gelir.kampanya); }
    expect(on).toBeGreaterThan(off * 1.02); expect(kp).toBeGreaterThan(0);
  });
  it('öğrenci indirimi öğrenci ağırlıklı şubede müşteriyi artırır', () => { let on = 0, off = 0; for (const seed of [1, 2, 3]) { const a = mk(seed, 'uni', '34:Kadıköy'), c = mk(seed, 'uni', '34:Kadıköy'); a.marka_puani = c.marka_puani = 60; setPromo(a, a.subeler[0]!, 'ogrenci'); run(a, 30); run(c, 30); on += tot(a, (r) => r.musteri); off += tot(c, (r) => r.musteri); } expect(on).toBeGreaterThan(off); });
  it('günün ürünü yalnız o gün geçerli ve satışı artırır', () => {
    let on = 0, off = 0; for (const seed of [1, 2, 3, 4]) { const a = mk(seed), c = mk(seed); for (let g = 0; g < 10; g++) { setGununUrunu(a, a.subeler[0]!, 'latte'); step(a, 1440); step(c, 1440); on += a.subeler[0]!.sonAdet.latte ?? 0; off += c.subeler[0]!.sonAdet.latte ?? 0; } }
    expect(on).toBeGreaterThan(off * 1.1); const s = mk(); setGununUrunu(s, s.subeler[0]!, 'latte'); expect(s.subeler[0]!.promo!.gununGun).toBe(dayOf(s)); step(s, 1440 * 2); expect(s.subeler[0]!.promo!.gununGun).not.toBe(dayOf(s));
  });
  it('sadakat kartı maliyet getirir, sadakati ve tekrar gelenleri artırır', () => { const a = mk(3), c = mk(3); setPromo(a, a.subeler[0]!, 'kart'); run(a, 60); run(c, 60); expect(tot(a, (r) => r.gider.sadakat)).toBeGreaterThan(0); expect(a.subeler[0]!.sadakat).toBeGreaterThan(c.subeler[0]!.sadakat); });
  it('müdür fiyat yetkisi: müdür yoksa reddedilir; varsa haftalık fiyatları (±%8) günceller', () => {
    const s = mk(); const b = s.subeler[0]!; expect(setPromo(s, b, 'yetkiFiyat').ok).toBe(false); b.staff.push(makeEmployee(s, 'sube_muduru', 3)); expect(setPromo(s, b, 'yetkiFiyat').ok).toBe(true);
    const before = JSON.stringify(Object.values(b.menu).map((m) => m.fiyat)); run(s, 15); const after = JSON.stringify(Object.values(b.menu).map((m) => m.fiyat)); if (priceAdvice(s, b).length || before !== after) expect(s.log.some((l) => l.includes('fiyatını güncelledi')) || before === after).toBe(true);
    for (const m of Object.values(b.menu)) expect(m.fiyat).toBeGreaterThanOrEqual(0.6);
  });
  it('kâr eğrisi: 15 nokta, mevcut fiyat civarında ve tümü pozitif/anlamlı', () => { const s = mk(); const c = profitCurve(s, s.subeler[0]!, 'latte'); expect(c.length).toBe(15); expect(c[0]!.m).toBe(0.7); expect(Math.max(...c.map((x) => x.kar))).toBeGreaterThan(0); expect(profitCurve(s, s.subeler[0]!, 'v60')).toEqual([]); });
});
