import { describe, expect, it } from 'vitest';
import { NAV, GRUPLAR, grupOf, PANELS } from '../src/ui/panels';
import { PAGES } from '../src/ui/pages';
import { oyunDakikasi, GUN_SN, VARSAYILAN_GUN_SN } from '../src/core/pace';
import { newGame } from '../src/core/actions';
import { deserialize, serialize } from '../src/core/save';

describe('menü yapısı', () => {
  it('10 ana sekme; her grup sayfası tanımlı ve tek grupta; grup başına en çok 10 sayfa', () => {
    const tabs = GRUPLAR.flatMap((g) => g.tabs); expect(GRUPLAR.length).toBe(10); expect(new Set(tabs).size).toBe(tabs.length); const tum = { ...PANELS, ...PAGES }; const nav = new Set(NAV.map((n) => n[0]));
    for (const id of tabs) { expect(nav.has(id)).toBe(true); expect(tum[id]).toBeTypeOf('function'); expect(grupOf(id).tabs).toContain(id); }
    for (const g of GRUPLAR) expect(g.tabs.length).toBeLessThanOrEqual(10);
    for (const id of ['menu', 'personel', 'vardiya', 'gelisim']) expect(tum[id]).toBeTypeOf('function');   // Şubeler detayı içindeki sayfalar
  });
  it('sayfa başlıkları kısa ve benzersiz', () => { const ad = NAV.map((n) => n[2]); expect(new Set(ad).size).toBe(ad.length); for (const a of ad) expect(a.length).toBeLessThanOrEqual(20); });
  it('alt menü sırası: Merkez, Türkiye, Dükkânlar, Depo, Tanıtım, Gelişim, Kasa, Ayarlar', () => { expect(GRUPLAR.map((g) => g.ad)).toEqual(['Merkez', 'Türkiye', 'Dükkânlar', 'Atölye', 'Semt', 'Depo', 'Tanıtım', 'Gelişim', 'Kasa', 'Ayarlar']); });
});
describe('gün süresi (hız)', () => {
  it('varsayılan gün 3 dakika; hız çarpanı orantılı; seçenekler artan', () => {
    expect(VARSAYILAN_GUN_SN).toBe(180); expect(oyunDakikasi(180, 1, 180)).toBeCloseTo(1440, 6); expect(oyunDakikasi(90, 2, 180)).toBeCloseTo(1440, 6); expect(oyunDakikasi(1, 0, 180)).toBe(0); expect(oyunDakikasi(1, 4, 90)).toBeCloseTo(64, 6);
    const k = GUN_SN.map((g) => g.k); expect([...k].sort((a, b) => a - b)).toEqual(k); expect(k[0]).toBeGreaterThanOrEqual(90);
  });
  it('yeni oyun ve eski kayıt varsayılan gün süresini alır', () => { const s = newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed: 1 }).s; expect(s.ayar.gunSn).toBe(180); const o = JSON.parse(serialize(s)); delete o.ayar.gunSn; expect(deserialize(JSON.stringify(o)).ayar.gunSn).toBe(180); });
  it('1× hızda bir gün ≥ 90 sn: günlük kapanış gerçek zamanla orantılı (dakika sayacı)', () => { let dk = 0; const dt = 1 / 30; for (let i = 0; i < 30 * 180; i++) dk += oyunDakikasi(dt, 1, 180); expect(Math.round(dk)).toBe(1440); });
});
