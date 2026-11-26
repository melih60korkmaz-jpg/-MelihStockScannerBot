import { describe, expect, it } from 'vitest';
import { NAV, GRUPLAR, grupOf, PANELS } from '../src/ui/panels';
import { oyunDakikasi, GUN_SN, VARSAYILAN_GUN_SN } from '../src/core/pace';
import { newGame } from '../src/core/actions';
import { deserialize, serialize } from '../src/core/save';

describe('menü yapısı', () => {
  it('her sayfa tam bir grupta; en fazla 6 grup; her sayfanın paneli var', () => {
    const tabs = GRUPLAR.flatMap((g) => g.tabs); expect(GRUPLAR.length).toBeLessThanOrEqual(6); expect(new Set(tabs).size).toBe(tabs.length); expect([...tabs].sort()).toEqual(NAV.map((n) => n[0]).sort());
    for (const [id] of NAV) { expect(PANELS[id]).toBeTypeOf('function'); expect(grupOf(id).tabs).toContain(id); }
    for (const g of GRUPLAR) expect(g.tabs.length).toBeLessThanOrEqual(4);
  });
  it('sayfa başlıkları kısa ve benzersiz', () => { const ad = NAV.map((n) => n[2]); expect(new Set(ad).size).toBe(ad.length); for (const a of ad) expect(a.length).toBeLessThanOrEqual(20); });
});
describe('gün süresi (hız)', () => {
  it('varsayılan gün 3 dakika; hız çarpanı orantılı; seçenekler artan', () => {
    expect(VARSAYILAN_GUN_SN).toBe(180); expect(oyunDakikasi(180, 1, 180)).toBeCloseTo(1440, 6); expect(oyunDakikasi(90, 2, 180)).toBeCloseTo(1440, 6); expect(oyunDakikasi(1, 0, 180)).toBe(0); expect(oyunDakikasi(1, 4, 90)).toBeCloseTo(64, 6);
    const k = GUN_SN.map((g) => g.k); expect([...k].sort((a, b) => a - b)).toEqual(k); expect(k[0]).toBeGreaterThanOrEqual(90);
  });
  it('yeni oyun ve eski kayıt varsayılan gün süresini alır', () => { const s = newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed: 1 }).s; expect(s.ayar.gunSn).toBe(180); const o = JSON.parse(serialize(s)); delete o.ayar.gunSn; expect(deserialize(JSON.stringify(o)).ayar.gunSn).toBe(180); });
  it('1× hızda bir gün ≥ 90 sn: günlük kapanış gerçek zamanla orantılı (dakika sayacı)', () => { let dk = 0; const dt = 1 / 30; for (let i = 0; i < 30 * 180; i++) dk += oyunDakikasi(dt, 1, 180); expect(Math.round(dk)).toBe(1440); });
});
