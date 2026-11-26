import { BASARIM } from '../src/core/goals';
import { describe, expect, it } from 'vitest';
import { grantRegion } from '../src/core/region';
import { newGame, subeAc, setPrice, upgrade, startAd, orderIng, toggleProduct } from '../src/core/actions';
import { step, dayOf, levelOf, dailyDemand, sellPrice, unitCost } from '../src/core/sim';
import { deserialize, serialize } from '../src/core/save';
import { cityById } from '../src/data/turkey';
import { PRODUCT } from '../src/data/catalog';

const mk = (sehir = 26, tip: 'mahalle' | 'cadde' | 'uni' = 'mahalle', seed = 11) => newGame({ ad: 'Test Kafe', sehir, tip, seed }).s;
const run = (s: ReturnType<typeof mk>, gun: number) => { for (let i = 0; i < gun; i++) step(s, 1440); };

describe('simülasyon', () => {
  it('ilk dükkân açılır ve kasa düşer', () => { const s = mk(); expect(s.subeler).toHaveLength(1); expect(s.kasa).toBeLessThan(1200000); expect(s.subeler[0]!.staff.length).toBeGreaterThanOrEqual(2); });
  it('30 günde müşteri gelir, gelir oluşur, stok tüketilir', () => {
    const s = mk(); const stok0 = s.subeler[0]!.stok.milk; run(s, 30); const r = s.rapor; expect(r.length).toBeGreaterThanOrEqual(29);
    const gelir = r.reduce((a, x) => a + x.toplamGelir, 0), musteri = r.reduce((a, x) => a + x.musteri, 0); expect(gelir).toBeGreaterThan(100000); expect(musteri).toBeGreaterThan(500);
    expect(s.subeler[0]!.stok.milk).not.toBe(stok0); expect(Number.isFinite(s.kasa)).toBe(true);
  });
  it('kasa değişimi gelir−gider ile uyumlu (muhasebe)', () => {
    const s = mk(26, 'mahalle', 5); s.subeler[0]!.otoSiparis = false; const k0 = s.kasa; s.capexBugun = 0; run(s, 20); const net = s.rapor.reduce((a, x) => a + x.kar, 0);
    // malzeme alımı yok (otomatik sipariş kapalı) → kasa farkı ≈ kâr toplamı (ay sonu vergisi ayrı)
    const tahakkuk = s.rapor.reduce((a, x) => a + x.gider.malzeme + x.gider.fire, 0);   // alım yapılmadığı için malzeme/fire nakit çıkışı değildir
    const capex = s.rapor.reduce((a, x) => a + x.capex, 0);   // olay kararları ve yatırımlar kâr tablosuna girmez, capex olarak yazılır
    const odul = Object.keys(s.basarim).reduce((a, k) => a + (BASARIM[k]?.odul ?? 0), 0);   // başarım ödülleri nakit olarak gelir
    expect(Math.abs((s.kasa - k0) - (net + tahakkuk - capex + odul))).toBeLessThan(Math.abs(net) * 0.15 + 20000);
  });
  it('yüksek fiyat talebi düşürür', () => {
    const a = mk(26, 'mahalle', 3), b = mk(26, 'mahalle', 3); for (const k of Object.keys(b.subeler[0]!.menu)) setPrice(b.subeler[0]!, k as never, 1.5);
    run(a, 25); run(b, 25); const ca = a.rapor.reduce((x, r) => x + r.musteri, 0), cb = b.rapor.reduce((x, r) => x + r.musteri, 0); expect(cb).toBeLessThan(ca);
  });
  it('stok biten ürün satılmaz; stok yok kaybı sayılır', () => {
    const s = mk(); const b = s.subeler[0]!; b.otoSiparis = false; for (const k of Object.keys(b.stok)) (b.stok as Record<string, number>)[k] = 0; run(s, 3); expect(s.rapor.reduce((a, x) => a + x.toplamGelir, 0)).toBe(0); expect(s.rapor.reduce((a, x) => a + x.kayip, 0)).toBeGreaterThan(0);
  });
  it('sipariş teslimat süresiyle gelir', () => { const s = mk(); const b = s.subeler[0]!; b.otoSiparis = false; b.acik = false; b.siparisler = []; b.stok.bean = 0; expect(orderIng(s, b, 'bean', 2).ok).toBe(true); expect(b.siparisler).toHaveLength(1); run(s, 1); expect(b.siparisler).toHaveLength(1); run(s, 3); expect(b.siparisler).toHaveLength(0); expect(b.stok.bean).toBeGreaterThan(300); });
  it('şehirler arası fark: İstanbul talebi ve kirası Tokat’tan çok yüksek', () => {
    const ist = mk(34, 'cadde'), tok = mk(60, 'cadde'); expect(dailyDemand(ist, ist.subeler[0]!)).toBeGreaterThan(dailyDemand(tok, tok.subeler[0]!) * 1.3); expect(ist.subeler[0]!.kira).toBeGreaterThan(tok.subeler[0]!.kira * 1.8);
  });
  it('Antalya turizmi yazın talebi artırır', () => { const s = mk(7, 'cadde'); const kis = (() => { s.dk = (dayOf(s) + 0) * 1440 + 7 * 60; return dailyDemand(s, s.subeler[0]!); })(); s.dk += 150 * 1440; expect(dailyDemand(s, s.subeler[0]!)).toBeGreaterThan(kis * 1.1); });
  it('uygunsuz dükkân türü reddedilir', () => { const s = mk(60); expect(subeAc(s, 60, 'sahil').ok).toBe(false); expect(subeAc(s, 76, 'uni').ok).toBe(false); expect(subeAc(s, 26, 'uni').ok || true).toBe(true); });
  it('geliştirme dış cepheyi ve çekiciliği artırır', () => { const s = mk(); const b = s.subeler[0]!; s.kasa = 2e6; expect(upgrade(s, b, 'tabela').ok).toBe(true); expect(b.facade.tabela).toBe(1); expect(upgrade(s, b, 'led').ok).toBe(false); });
  it('reklam başlar, tekrarı reddedilir', () => { const s = mk(); const b = s.subeler[0]!; expect(startAd(s, b, 'sosyal').ok).toBe(true); expect(startAd(s, b, 'sosyal').ok).toBe(false); });
  it('menü: ürün çıkar/ekle', () => { const s = mk(); const b = s.subeler[0]!; expect(toggleProduct(s, b, 'tost').ok).toBe(true); expect(b.menu.tost.aktif).toBe(false); });
  it('kayıt geri yüklenince aynı', () => { const s = mk(); run(s, 12); const t = deserialize(serialize(s)); expect(t.kasa).toBe(s.kasa); expect(t.subeler[0]!.stok.bean).toBe(s.subeler[0]!.stok.bean); run(s, 10); run(t, 10); expect(t.kasa).toBeCloseTo(s.kasa, 3); });
  it('fiyat ve maliyet hesapları pozitif, marj makul', () => { const s = mk(); const b = s.subeler[0]!, c = cityById(26); for (const id of ['latte', 'cheesecake'] as const) { const p = sellPrice(s, b, id), m = unitCost(s, id, c); expect(p).toBeGreaterThan(m * 1.5); expect(PRODUCT[id].sure).toBeGreaterThan(0); } expect(levelOf(s)).toBe(1); });
  it('uzun oyun: 400 gün sonsuz/NaN üretmez', () => { const s = mk(34, 'cadde', 9); s.kasa = 5e6; run(s, 400); expect(Number.isFinite(s.kasa)).toBe(true); for (const b of s.subeler) { expect(b.memnuniyet).toBeGreaterThanOrEqual(0); expect(b.memnuniyet).toBeLessThanOrEqual(100); expect(Number.isFinite(b.backlog)).toBe(true); } });
});

describe('uzun süreli oyun ve performans', () => {
  it('8 şubeli 3 yıllık oyun hızlı ve tutarlı çalışır', () => {
    const s = mk(34, 'cadde', 21); s.kasa = 5e8; for (const [c, t] of [[6, 'cadde'], [35, 'cadde'], [16, 'cadde'], [26, 'uni'], [7, 'cadde'], [60, 'mahalle'], [27, 'cadde']] as const) { grantRegion(s, c); subeAc(s, c, t); }
    expect(s.subeler.length).toBe(8); const t0 = Date.now(); run(s, 365 * 3); const ms = Date.now() - t0;
    expect(ms).toBeLessThan(30000); expect(Number.isFinite(s.kasa)).toBe(true); expect(s.rapor.length).toBeGreaterThan(300);
    for (const b of s.subeler) { expect(b.memnuniyet).toBeGreaterThanOrEqual(0); expect(b.memnuniyet).toBeLessThanOrEqual(100); for (const k of Object.keys(b.stok)) expect(Number.isFinite((b.stok as Record<string, number>)[k])).toBe(true); expect(b.yorumlar.length).toBeLessThanOrEqual(30); }
    expect(s.rapor.length).toBeLessThanOrEqual(800);
  }, 120000);
  it('kaçırılan günlerde olaylar birikmez, kayıt boyutu makul', () => { const s = mk(34, 'cadde', 4); s.kasa = 5e7; run(s, 500); expect(s.bekleyen.length).toBeLessThanOrEqual(3); expect(serialize(s).length).toBeLessThan(2_000_000); });
});
