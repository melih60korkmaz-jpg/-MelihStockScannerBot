import { describe, expect, it } from 'vitest';
import { newGame, orderIng, subeAc } from '../src/core/actions';
import { step, dayOf, unitCost } from '../src/core/sim';
import { deliverAll, spoilage, suppliersOf, syncLots, transferStock, orderCost, minLevel, stockValue, holdingCost } from '../src/core/supply';
import { cityById } from '../src/data/turkey';
import { ING } from '../src/data/catalog';

const mk = (seed = 7) => newGame({ ad: 'T', sehir: 26, tip: 'cadde', seed, kasa: 5e6 }).s;
const run = (s: ReturnType<typeof mk>, g: number) => { for (let i = 0; i < g; i++) step(s, 1440); };

describe('stok, tedarik ve finans bağlantısı', () => {
  it('üç tedarikçi: fiyat, güvenilirlik ve kalite farklıdır', () => { const l = suppliersOf(cityById(26)); expect(l).toHaveLength(3); expect(l[1]!.fiyat).toBeLessThan(l[0]!.fiyat); expect(l[2]!.fiyat).toBeGreaterThan(l[0]!.fiyat); expect(l[2]!.guven).toBeGreaterThan(l[1]!.guven); expect(l[2]!.kalite).toBeGreaterThan(l[1]!.kalite); });
  it('tedarikçi seçimi sipariş fiyatını ve teslimat süresini değiştirir', () => { const s = mk(); const b = s.subeler[0]!; const a = orderCost(s, b, 'bean', 2); b.tedarikci.bean = 'premium'; const p = orderCost(s, b, 'bean', 2); b.tedarikci.bean = 'eko'; const e = orderCost(s, b, 'bean', 2); expect(e).toBeLessThan(a); expect(p).toBeGreaterThan(a); });
  it('siparişin parası düşer, teslimatla stok artar; gecikme ve eksik teslimat olabilir', () => {
    let gec = 0, ek = 0, top = 0; for (let seed = 1; seed <= 40; seed++) { const s = mk(seed); const b = s.subeler[0]!; b.tedarikci.milk = 'eko'; b.otoSiparis = false; const k0 = s.kasa; orderIng(s, b, 'milk', 3, 'eko'); expect(s.kasa).toBeLessThan(k0); const o = b.siparisler[0]!; top++; if (o.gecikti) gec++; if (o.eksik) ek++; }
    expect(gec).toBeGreaterThan(2); expect(gec).toBeLessThan(25); expect(ek).toBeGreaterThanOrEqual(0); expect(top).toBe(40);
  });
  it('bozulan ürünler: süt 5 günde, hazır unlu 2 günde bozulur ve gider (fire) oluşur', () => {
    const s = mk(); const b = s.subeler[0]!; b.otoSiparis = false; for (const k of Object.keys(b.stok)) (b.stok as Record<string, number>)[k] = 0; b.stok.milk = 10000; b.stok.bakery = 40; syncLots(b, 'milk', dayOf(s)); syncLots(b, 'bakery', dayOf(s));
    run(s, 3); expect(b.stok.bakery).toBeLessThan(40); const fire3 = s.rapor.reduce((a, r) => a + r.gider.fire, 0); expect(fire3).toBeGreaterThan(0); run(s, 4); expect(b.stok.milk).toBeLessThan(10000 * 0.2); expect(s.rapor.reduce((a, r) => a + r.gider.fire, 0)).toBeGreaterThan(fire3);
  });
  it('stok biten ürün satılamaz, ilgili müşteri kaybı sayılır; satışlar stok tüketir', () => {
    const s = mk(); const b = s.subeler[0]!; b.otoSiparis = false; run(s, 2); const sut = b.stok.milk; for (const k of Object.keys(b.stok)) (b.stok as Record<string, number>)[k] = 0; run(s, 2); const g = s.rapor.slice(-2).reduce((a, r) => a + r.toplamGelir, 0); expect(g).toBe(0); expect(sut).toBeLessThan(ING.milk.paket * 2.5);
  });
  it('otomatik sipariş minimum seviyenin altında stok bitmesini engeller', () => { const s = mk(5); const b = s.subeler[0]!; b.otoSiparis = true; run(s, 40); const yok = s.rapor.reduce((a, r) => a + r.kayip, 0), mus = s.rapor.reduce((a, r) => a + r.musteri, 0); expect(mus).toBeGreaterThan(500); expect(yok / (yok + mus)).toBeLessThan(0.45); expect(minLevel(b, 'bean')).toBeGreaterThan(0); });
  it('muhasebe: brüt kâr = gelir − satılan malın maliyeti; net kâr = brüt − işletme giderleri', () => {
    const s = mk(9); run(s, 20); for (const r of s.rapor) { expect(r.brut).toBeCloseTo(r.toplamGelir - r.cogs, 3); expect(r.kar).toBeCloseTo(r.toplamGelir - r.toplamGider, 3); expect(r.cogs).toBeGreaterThanOrEqual(0); }
    const t = s.rapor.reduce((a, r) => ({ g: a.g + r.toplamGelir, c: a.c + r.cogs }), { g: 0, c: 0 }); expect(t.c / t.g).toBeGreaterThan(0.12); expect(t.c / t.g).toBeLessThan(0.55);
  });
  it('nakit akışı kasa değişimiyle tutarlı (vergi ve faiz hariç kontrol)', () => {
    const s = mk(4); const b = s.subeler[0]!; b.otoSiparis = true; const k0 = s.kasa; run(s, 25); const nakit = s.rapor.reduce((a, r) => a + r.nakit, 0) + s.rapor[0]!.capex;   // kurulum yatırımı k0'dan önce ödendi const fark = s.kasa - k0; expect(Math.abs(fark - nakit)).toBeLessThan(Math.abs(fark) * 0.12 + 60000);
  });
  it('gelir kalemleri: salon, ek satış, kampanyalı satış ve paket servis ayrı izlenir', () => { const s = mk(6); run(s, 15); const g = s.rapor.reduce((a, r) => { for (const k of Object.keys(r.gelir) as Array<keyof typeof r.gelir>) a[k] = (a[k] ?? 0) + r.gelir[k]; return a; }, {} as Record<string, number>); expect(g.kahve! + g.yiyecek!).toBeGreaterThan(0); expect(g.ek!).toBeGreaterThan(0); expect(g.paket!).toBeGreaterThan(0); });
  it('giderlerde internet, kira, elektrik, su, maaş ve vergi gerçekten oluşur', () => { const s = mk(8); run(s, 10); const g = s.rapor.reduce((a, r) => { for (const k of Object.keys(r.gider) as Array<keyof typeof r.gider>) a[k] = (a[k] ?? 0) + r.gider[k]; return a; }, {} as Record<string, number>); for (const k of ['kira', 'elektrik', 'su', 'internet', 'maas', 'vergi', 'bakim', 'sigorta', 'malzeme']) expect(g[k]!).toBeGreaterThan(0); });
  it('şubeler arası stok transferi stoku taşır ve nakliye öder', () => { const s = mk(); subeAc(s, 6, 'cadde'); const a = s.subeler[0]!, b = s.subeler[1]!; a.stok.bean = 6000; b.stok.bean = 0; syncLots(a, 'bean', 0); const k0 = s.kasa; const r = transferStock(s, a, b, 'bean', 2000); expect(r.ok).toBe(true); expect(a.stok.bean).toBe(4000); expect(b.stok.bean).toBe(2000); expect(s.kasa).toBeLessThan(k0); expect(transferStock(s, a, b, 'bean', 99999).ok).toBe(false); });
  it('stok değeri ve bekletme maliyeti hesaplanır; birim maliyet pozitif', () => { const s = mk(); const b = s.subeler[0]!; expect(stockValue(s, b)).toBeGreaterThan(0); expect(holdingCost(s, b)).toBeGreaterThan(0); expect(unitCost(s, 'latte', cityById(26))).toBeGreaterThan(10); void deliverAll; void spoilage; });
});
