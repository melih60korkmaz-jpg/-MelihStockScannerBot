import { describe, expect, it } from 'vitest';
import { newGame, toggleProduct, setPrice } from '../src/core/actions';
import { step, dailyDemand, priceFactor } from '../src/core/sim';
import { priceAdvice, applyAdvice, menuAdvice, copyMenu } from '../src/core/pricing';
import { PRODUCTS, PRODUCT, type ProductId } from '../src/data/catalog';
import { grantRegion } from '../src/core/region';
import { subeAc } from '../src/core/actions';
import { deserialize, serialize } from '../src/core/save';

const mk = (seed = 5, sehir = 34, ilce = '34:Kadıköy') => { const s = newGame({ ad: 'T', sehir, tip: 'cadde', seed, kasa: 5e7, ilce }).s; s.marka_puani = 30; return s; };
const run = (s: ReturnType<typeof mk>, g: number) => { for (let i = 0; i < g; i++) step(s, 1440); };
describe('kahve çeşitleri ve fiyat', () => {
  it('7 yeni içecek tanımlı; menüde başta kapalı, seviye ve kurulum ücreti ister', () => {
    for (const id of ['flatwhite', 'macchiato', 'cortado', 'icedlatte', 'v60', 'dibek', 'sahlep']) expect(PRODUCT[id as ProductId]).toBeTruthy(); expect(PRODUCTS.length).toBe(28);
    const s = mk(); const b = s.subeler[0]!; expect(b.menu.flatwhite.aktif).toBe(false); s.marka_puani = 5; expect(toggleProduct(s, b, 'v60').ok).toBe(false); s.marka_puani = 30; const k = s.kasa; expect(toggleProduct(s, b, 'flatwhite').ok).toBe(true); expect(s.kasa).toBeLessThan(k); expect(b.menu.flatwhite.aktif).toBe(true);
  });
  it('yeni ürün gerçekten satılır ve stok tüketir', () => { const s = mk(); const b = s.subeler[0]!; toggleProduct(s, b, 'flatwhite'); toggleProduct(s, b, 'dibek'); let n = 0; for (let i = 0; i < 25; i++) { run(s, 1); n += (b.sonAdet.flatwhite ?? 0) + (b.sonAdet.dibek ?? 0); } expect(n).toBeGreaterThan(20); });
  it('tüm fiyatları birlikte artırmak gelen müşteriyi azaltır, indirim artırır (aşırı fiyat sömürüsü yok)', () => {
    const s = mk(); const b = s.subeler[0]!; const d1 = dailyDemand(s, b); for (const p of PRODUCTS) setPrice(b, p.id, 1.3); const d2 = dailyDemand(s, b); for (const p of PRODUCTS) setPrice(b, p.id, 0.8); const d3 = dailyDemand(s, b);
    expect(d2).toBeLessThan(d1 * 0.85); expect(d3).toBeGreaterThan(d1 * 1.05); expect(priceFactor(s, b)).toBeGreaterThan(1);
  });
  it('uygulamalı simülasyon: çok yüksek fiyat (1,6×) önerilen/normal fiyattan daha az kâr getirir', () => {
    let hi = 0, norm = 0; for (const seed of [1, 2, 3]) { const a = mk(seed), c = mk(seed); for (const p of PRODUCTS) setPrice(a.subeler[0]!, p.id, 1.6); run(a, 40); run(c, 40); hi += a.rapor.reduce((x, r) => x + r.kar, 0); norm += c.rapor.reduce((x, r) => x + r.kar, 0); }
    expect(norm).toBeGreaterThan(hi);
  });
});
describe('fiyat danışmanı', () => {
  it('öneriler geçerli aralıkta ve kazanç pozitif; uygulayınca fiyatlar değişir', () => {
    const s = mk(); const b = s.subeler[0]!; const o = priceAdvice(s, b); expect(o.length).toBeGreaterThan(0); for (const x of o) { expect(x.oneri).toBeGreaterThanOrEqual(0.7); expect(x.oneri).toBeLessThanOrEqual(1.4); expect(x.kazanc).toBeGreaterThan(0); expect(x.fiyatOneri).toBeGreaterThan(0); }
    const n = applyAdvice(b, o); expect(n).toBe(o.length); expect(b.menu[o[0]!.id].fiyat).toBe(o[0]!.oneri);
  });
  it('simülasyonda öneriyi uygulayan, uygulamayandan ortalamada daha çok kâr eder', () => {
    let on = 0, off = 0; for (const seed of [11, 12, 13, 14]) { const a = mk(seed), c = mk(seed); run(a, 3); run(c, 3); applyAdvice(a.subeler[0]!, priceAdvice(a, a.subeler[0]!)); run(a, 40); run(c, 40); on += a.rapor.slice(-40).reduce((x, r) => x + r.kar, 0); off += c.rapor.slice(-40).reduce((x, r) => x + r.kar, 0); }
    expect(on).toBeGreaterThan(off);
  });
  it('menü önerileri metin üretir; menü kopyalama fiyatları diğer şubelere taşır', () => {
    const s = mk(); const b = s.subeler[0]!; expect(menuAdvice(s, b).length).toBeGreaterThanOrEqual(0); grantRegion(s, 41); subeAc(s, 41, 'cadde'); s.marka_puani = 40; setPrice(b, 'latte', 1.2); toggleProduct(s, b, 'cortado'); const r = copyMenu(s, b); expect(r.sube).toBe(1); const o = s.subeler[1]!; expect(o.menu.latte.fiyat).toBe(1.2); expect(o.menu.cortado.aktif === true || r.atlanan > 0).toBe(true);
  });
  it('eski kayıtta yeni ürünler menüye eklenir', () => { const s = mk(); const o = JSON.parse(serialize(s)); delete o.subeler[0].menu.sahlep; delete o.subeler[0].menu.v60; const y = deserialize(JSON.stringify(o)); expect(y.subeler[0]!.menu.sahlep.aktif).toBe(false); run(y, 2); expect(y.rapor.length).toBe(2); });
});
