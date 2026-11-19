import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { askPrice, canTrade, marketParcels } from '../src/sim/land';
import { planProject, buildable } from '../src/sim/projects';
import { updateWeather } from '../src/sim/construction';
import { monthlyCosts } from '../src/sim/finance';
import { BUILDING_TYPES, CLIMATE, PROVINCES, cityData, districtData, listingTarget, provinceData, branchCost } from '../src/data';
import { pack, unpack } from '../src/save/serialize';

const start = (seed = 3, bg = 'emlakci', city = 'ankara') => { const s = newGameState(seed); expect(dispatch(s, 'CreateCompany', { name: 'Harita Yapı', founderBackground: bg, startCity: city }).ok).toBe(true); return s; };

describe('81 il / 973 ilçe verisi', () => {
  it('81 il, toplam 973 ilçe; her ilin en az 1 ilçesi, benzersiz kimlikler ve geçerli sınır yolları', () => {
    expect(PROVINCES).toHaveLength(81); let total = 0; const plates = new Set<string>();
    for (const p of PROVINCES) {
      plates.add(p.plate); const c = cityData(p.id)!; total += c.districts.length; expect(c.districts.length, p.name).toBeGreaterThan(0);
      expect(p.path.startsWith('M')).toBe(true); expect(p.bbox[2]).toBeGreaterThan(p.bbox[0]); expect(new Set(c.districts.map((d) => d.id)).size).toBe(c.districts.length);
      for (const d of c.districts) { expect(d.path.startsWith('M')).toBe(true); expect(d.saleBase).toBeGreaterThan(5000); expect(d.saleBase).toBeLessThan(160000); for (const k of ['income', 'density', 'infra', 'transit', 'commercial', 'competition'] as const) { expect(d[k]).toBeGreaterThanOrEqual(0); expect(d[k]).toBeLessThanOrEqual(100); } expect(d.growth).toBeGreaterThanOrEqual(0); expect(d.growth).toBeLessThanOrEqual(0.3); }
    }
    expect(plates.size).toBe(81); expect(total).toBe(973);
  });
  it('plaka kodları 01–81; il adları ve bölgeler geçerli', () => {
    expect(PROVINCES.map((p) => p.plate)).toEqual(Array.from({ length: 81 }, (_, i) => String(i + 1).padStart(2, '0')));
    expect(provinceData('istanbul')!.plate).toBe('34'); expect(provinceData('ankara')!.plate).toBe('06'); expect(provinceData('izmir')!.plate).toBe('35'); expect(provinceData('trabzon')!.region).toBe('Karadeniz');
    for (const p of PROVINCES) expect(Object.keys(CLIMATE)).toContain(p.region);
  });
  it('el ayarlı eski ilçeler korunur (denge/test uyumu)', () => {
    expect(districtData('ankara', 'cankaya')).toMatchObject({ saleBase: 52000, income: 80 }); expect(districtData('ankara', 'kecioren')!.saleBase).toBe(29000);
    expect(districtData('istanbul', 'kadikoy')!.saleBase).toBe(88000); expect(districtData('izmir', 'urla')!.growth).toBe(0.16);
  });
  it('fiyat hiyerarşisi: İstanbul > Ankara > küçük il; merkez/çekirdek ilçe çevreden pahalı; turistik ilçe yüksek', () => {
    const avg = (id: string) => { const c = cityData(id)!; return c.districts.reduce((a, d) => a + d.saleBase, 0) / c.districts.length; };
    expect(avg('istanbul')).toBeGreaterThan(avg('ankara')); expect(avg('ankara')).toBeGreaterThan(avg('hakkari')); expect(avg('izmir')).toBeGreaterThan(avg('konya'));
    expect(districtData('mugla', 'bodrum')!.saleBase).toBeGreaterThan(districtData('mugla', 'ula')?.saleBase ?? 0);
    expect(districtData('istanbul', 'besiktas')!.saleBase).toBeGreaterThan(districtData('istanbul', 'sultangazi')!.saleBase * 2);
  });
  it('ilçe özellikleri deterministik', () => { expect(JSON.stringify(cityData('bursa')!.districts.map((d) => [d.id, d.saleBase, d.income]))).toBe(JSON.stringify(cityData('bursa')!.districts.map((d) => [d.id, d.saleBase, d.income]))); });
});

describe('şube açma ve il pazarı', () => {
  it('başlangıçta yalnızca başlangıç şehri işlem görebilir; diğer varsayılan iller kilitli', () => {
    const s = start(3, 'emlakci', 'izmir'); expect(s.openCities).toEqual(['izmir']); expect(canTrade(s, 'izmir')).toBe(true); expect(canTrade(s, 'ankara')).toBe(false);
    const ank = marketParcels(s).find((p) => p.city === 'ankara')!; const r = dispatch(s, 'BuyLand', { parcelId: ank.id, offerPct: 1 }); expect(r.ok).toBe(false); expect(!r.ok && r.error).toMatch(/şube/);
    expect(dispatch(s, 'OrderSurvey', { parcelId: ank.id, kind: 'soil' }).ok).toBe(false);
  });
  it('şube açılışı: ücret düşer, ilanlar üretilir, iklim/pazar kaydı oluşur, aylık şube gideri eklenir; tekrar açılamaz', () => {
    const s = start(); const c0 = s.company!.cash, cost = TL(branchCost('antalya')); expect(marketParcels(s).some((p) => p.city === 'antalya')).toBe(false);
    expect(dispatch(s, 'OpenBranch', { cityId: 'antalya' }).ok).toBe(true); expect(c0 - s.company!.cash).toBe(cost); expect(canTrade(s, 'antalya')).toBe(true);
    const n = marketParcels(s).filter((p) => p.city === 'antalya').length; expect(n).toBeGreaterThanOrEqual(cityData('antalya')!.districts.length); expect(s.cityMarket.antalya).toBeDefined(); expect(s.weather.antalya).toBeDefined();
    expect(monthlyCosts(s).some((x) => x.memo.includes('şube'))).toBe(true); expect(dispatch(s, 'OpenBranch', { cityId: 'antalya' }).ok).toBe(false); expect(dispatch(s, 'OpenBranch', { cityId: 'yok' }).ok).toBe(false);
    expect(checkInvariant(s)).toBe(true);
    const cheap = marketParcels(s).filter((p) => p.city === 'antalya').sort((a, b) => askPrice(s, a) - askPrice(s, b))[0]!; s.company!.cash += TL(50e6); s.ledgerBase += TL(50e6);
    expect(dispatch(s, 'BuyLand', { parcelId: cheap.id, offerPct: 1 }).ok).toBe(true);
  });
  it('yetersiz nakitte şube açılamaz', () => { const s = start(); s.company!.cash = TL(1000); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0); expect(dispatch(s, 'OpenBranch', { cityId: 'istanbul' }).ok).toBe(false); });
  it('yeni ilin pazarı aylık güncellenir; 20 yıl çok illi oyun tutarlı ve kayıt boyutu makul', () => {
    const s = start(); s.company!.cash = TL(5e9); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0);
    for (const c of ['bursa', 'trabzon', 'van']) dispatch(s, 'OpenBranch', { cityId: c }); advanceDays(s, 365 * 5);
    for (const c of ['bursa', 'trabzon', 'van']) { expect(s.cityMarket[c]!.landIndex).toBeGreaterThan(0.3); expect(marketParcels(s).filter((p) => p.city === c).length).toBeGreaterThanOrEqual(cityData(c)!.districts.length); }
    expect(new Set(s.parcels.map((p) => p.id)).size).toBe(s.parcels.length); expect(checkInvariant(s)).toBe(true); expect(JSON.stringify(s).length).toBeLessThan(2_500_000);
  });
});

describe('il bazlı iklim', () => {
  it('kış: Doğu Anadolu\'da Akdeniz\'e göre çok daha fazla kar', () => {
    const s = start(); const W = s.weather as Record<string, string>; W.van = 'acik'; W.antalya = 'acik'; const cnt = { van: 0, antalya: 0 };
    for (let i = 0; i < 800; i++) { s.clock.day = 10; updateWeather(s); if (W.van === 'kar') cnt.van++; if (W.antalya === 'kar') cnt.antalya++; }
    expect(cnt.van).toBeGreaterThan(cnt.antalya * 5 + 20);
  });
  it('Karadeniz daha yağışlı', () => {
    const s = start(); const W = s.weather as Record<string, string>; W.rize = 'acik'; W.konya = 'acik'; const cnt = { rize: 0, konya: 0 };
    for (let i = 0; i < 1500; i++) { s.clock.day = 300; updateWeather(s); if (W.rize !== 'acik') cnt.rize++; if (W.konya !== 'acik') cnt.konya++; }
    expect(cnt.rize).toBeGreaterThan(cnt.konya);
  });
});

describe('ekonomik oynanabilirlik (her kademe)', () => {
  it('her kademede ilanlar arasında kârlı proje seçeneği bulunur; en iyi marj medyanı makul', () => {
    const s = start(5); s.company!.cash = TL(5e9); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0);
    const byTier = new Map<number, number[]>(); let openedN = 0;
    for (const prov of PROVINCES.filter((_, i) => i % 3 === 0)) { dispatch(s, 'OpenBranch', { cityId: prov.id }); openedN++; }
    for (const p of marketParcels(s)) {
      let best = -Infinity; for (const t of BUILDING_TYPES) { if (buildable(p, t.id).reason) continue; best = Math.max(best, planProject(s, p, t.id, 'standart').margin); }
      if (best > -Infinity) { const tier = provinceData(p.city)!.tier; byTier.set(tier, [...(byTier.get(tier) ?? []), best]); }
    }
    for (const tier of [1, 2, 3, 4]) { const a = (byTier.get(tier) ?? []).sort((x, y) => x - y); if (a.length < 4) continue; const med = a[Math.floor(a.length / 2)]!; expect(med, `kademe ${tier}`).toBeGreaterThan(0.02); expect(med).toBeLessThan(0.35); expect(a.filter((x) => x > 0).length / a.length, `kademe ${tier} kârlı pay`).toBeGreaterThan(0.5); }
    expect(openedN).toBeGreaterThan(20); void listingTarget;
  });
});

describe('kayıt (v7)', () => {
  it('çok illi oyun kaydet→yükle→devam birebir aynı', () => {
    const s = start(); s.company!.cash = TL(2e9); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0); dispatch(s, 'OpenBranch', { cityId: 'samsun' }); advanceDays(s, 100);
    const r = unpack(pack(s)); expect(r.ok).toBe(true); if (!r.ok) return; advanceDays(s, 200); advanceDays(r.state, 200); expect(JSON.stringify(r.state)).toBe(JSON.stringify(s));
  });
  it('v6 kaydı v7\'ye taşınır: başlangıç şehri ve sahip olunan arsaların illeri açık', () => {
    const s = start(7, 'emlakci', 'ankara'); const old: any = JSON.parse(JSON.stringify(s)); old.meta.version = 6; delete old.openCities;
    const r = unpack(pack(old)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.meta.version).toBe(8); expect(r.state.openCities).toContain('ankara'); advanceDays(r.state, 40); }
  });
});
