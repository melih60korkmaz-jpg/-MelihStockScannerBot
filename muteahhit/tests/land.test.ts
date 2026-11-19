import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { askPrice, fairValue, landAssetValue, marketParcels, ownedParcels, reservePrice, surveyCost, valueBand } from '../src/sim/land';
import { buildable, planProject } from '../src/sim/projects';
import { netWorth } from '../src/sim/finance';
import { pack, unpack } from '../src/save/serialize';
import { DEFAULT_CITIES, cityData } from '../src/data';
import type { GameState, Parcel } from '../src/core/types';

const start = (seed = 5, bg = 'emlakci') => {
  const s = newGameState(seed);
  expect(dispatch(s, 'CreateCompany', { name: 'Arsa Yapı', founderBackground: bg, startCity: 'ankara' }).ok).toBe(true);
  return s;
};
/** Elle kurulan, sayıları bilinen parsel (Ankara/Çankaya, 400 m², KAKS 1,6, TAKS 0,35, sağlam zemin). */
const mk = (s: GameState, o: Partial<Parcel> = {}): Parcel => {
  const p: Parcel = { id: s.nextId++, city: 'ankara', district: 'cankaya', hood: 'Test Mahallesi', area: 400, zoning: 'konut', taks: 0.35, kaks: 1.6, maxFloors: 6, soil: 'saglam', soilKnown: true,
    roads: 2, corner: false, infra: 90, growth: 0.04, growthKnown: false, unitBase: TL(10000), askMult: 1.1, reserveMult: 1.02, negoLockUntil: 0, owner: 'market', ...o };
  s.parcels.push(p); return p;
};

describe('arsa pazarı', () => {
  it('her bölgede ilan var; kimlikler benzersiz; sayılar tamsayı ve tutarlı', () => {
    const s = start(); const ids = new Set<number>();
    for (const p of s.parcels) {
      expect(ids.has(p.id)).toBe(false); ids.add(p.id);
      expect(Number.isInteger(p.unitBase) && p.unitBase > 0).toBe(true);
      expect(p.maxFloors).toBeGreaterThanOrEqual(Math.ceil(p.kaks / p.taks)); // emsal ulaşılabilir
      expect(p.reserveMult).toBeLessThan(p.askMult); expect(p.area % 5).toBe(0);
    }
    const per = new Map<string, number>(); for (const p of marketParcels(s)) per.set(`${p.city}/${p.district}`, (per.get(`${p.city}/${p.district}`) ?? 0) + 1);
    const total = DEFAULT_CITIES.reduce((a, id) => a + cityData(id)!.districts.length, 0); expect(per.size).toBe(total); expect(total).toBe(39 + 25 + 30); for (const n of per.values()) expect(n).toBeGreaterThanOrEqual(1);
  });
  it('başlangıç sermayesiyle alınabilir küçük arsa her şehirde var', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s = start(seed, 'eski_kalfa'); // en az sermaye (5 M₺)
      for (const city of ['istanbul', 'ankara', 'izmir']) {
        const cheap = marketParcels(s).filter((p) => p.city === city && askPrice(s, p) * 1.04 <= s.company!.cash * 0.5 && p.zoning === 'konut');
        expect(cheap.length, `${city} tohum ${seed}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it('aynı tohum aynı pazar', () => { expect(JSON.stringify(newGameState(9).parcels)).toBe(JSON.stringify(newGameState(9).parcels)); });
  it('tahmini değer aralığı gerçek değeri içerir; araştırma aralığı daraltır', () => {
    const s = start();
    for (const p of s.parcels.slice(0, 40)) {
      const f = fairValue(s, p), b = valueBand(s, p);
      expect(b.lo).toBeLessThanOrEqual(f); expect(b.hi).toBeGreaterThanOrEqual(f);
      const w0 = b.hi - b.lo; p.growthKnown = true; const b2 = valueBand(s, p); expect(b2.hi - b2.lo).toBeLessThan(w0); p.growthKnown = false;
    }
  });
  it('1 yıl: piyasa devri olur ama oyuncunun arsası kalır; kimlikler benzersiz', () => {
    const s = start(); const mine = mk(s, { owner: 'player', costBasis: TL(1) });
    const before = new Set(marketParcels(s).map((p) => p.id)); advanceDays(s, 365);
    expect(s.parcels.includes(mine)).toBe(true);
    const after = marketParcels(s); expect(after.filter((p) => before.has(p.id)).length).toBeLessThan(before.size);
    expect(new Set(s.parcels.map((p) => p.id)).size).toBe(s.parcels.length);
    expect(Object.values(s.cityMarket).every((c) => c.landIndex > 0.3 && Number.isFinite(c.landIndex))).toBe(true);
  });
  it('kriz rejiminde arsa endeksi düşer, genişlemede yükselir', () => {
    const run = (regime: 'kriz' | 'genisleme') => {
      const s = start(33); s.macro.regime = regime; s.macro.regimeEnd = 1e9; s.macro.confidence = regime === 'kriz' ? 15 : 78; s.company!.cash = 1e13; s.ledgerBase = 1e13 - s.ledger.reduce((a, e) => a + e.amount, 0);
      advanceDays(s, 240); return s.cityMarket.ankara!.landIndex;
    };
    expect(run('genisleme')).toBeGreaterThan(run('kriz'));
  });
});

describe('satın alma, pazarlık, etüt', () => {
  it('istenen fiyat her zaman kabul edilir; ledger: fiyat + %4 tapu harcı; kasa=defter', () => {
    const s = start(); const p = mk(s); const cash0 = s.company!.cash;
    const r = dispatch(s, 'BuyLand', { parcelId: p.id, offerPct: 1 }); expect(r.ok && r.events[0]!.type).toBe('LAND_BOUGHT');
    const price = Math.round(askPrice(s, p)); // ask fiyatı (aynı gün, endeks değişmedi)
    expect(cash0 - s.company!.cash).toBe(price + Math.round(price * 0.04));
    expect(p.owner).toBe('player'); expect(p.costBasis).toBe(price + Math.round(price * 0.04)); expect(checkInvariant(s)).toBe(true);
  });
  it('düşük teklif reddedilir, 3 gün kilit; kilit bitince tekrar denenebilir', () => {
    const s = start(); const p = mk(s, { reserveMult: 1.05, askMult: 1.15 });
    const r = dispatch(s, 'BuyLand', { parcelId: p.id, offerPct: 0.8 }); expect(r.ok && r.events[0]!.type).toBe('LAND_REJECTED');
    expect(p.owner).toBe('market'); expect(s.company!.cash).toBe(s.ledgerBase + s.ledger.reduce((a, e) => a + e.amount, 0));
    expect(dispatch(s, 'BuyLand', { parcelId: p.id, offerPct: 0.8 }).ok).toBe(false); // aynı/düşük teklif kilitli
    advanceDays(s, 3); const reserve = reservePrice(s, p), ask = askPrice(s, p);
    const ok = dispatch(s, 'BuyLand', { parcelId: p.id, offerPct: Math.min(1, reserve / ask + 0.001) });
    expect(ok.ok && ok.events[0]!.type).toBe('LAND_BOUGHT');
  });
  it('reddedilen tekliften sonra daha yüksek teklif kilide takılmaz; istenen fiyat her zaman alınır', () => {
    const s = start(); const p = mk(s, { reserveMult: 1.05, askMult: 1.15 });
    expect(dispatch(s, 'BuyLand', { parcelId: p.id, offerPct: 0.8 }).ok && p.owner === 'market').toBe(true);
    expect(dispatch(s, 'BuyLand', { parcelId: p.id, offerPct: 0.85 }).ok).toBe(true); // 0,85 > 0,80: kilit yok
    const hi = dispatch(s, 'BuyLand', { parcelId: p.id, offerPct: 1 }); expect(hi.ok && hi.events[0]!.type).toBe('LAND_BOUGHT'); expect(checkInvariant(s)).toBe(true);
  });
  it('geçersiz teklif/yetersiz nakit reddedilir, durum değişmez', () => {
    const s = start(); const p = mk(s); const n = s.ledger.length;
    expect(dispatch(s, 'BuyLand', { parcelId: p.id, offerPct: 0.5 }).ok).toBe(false);
    s.company!.cash = TL(1000); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0);
    expect(dispatch(s, 'BuyLand', { parcelId: p.id, offerPct: 1 }).ok).toBe(false); expect(s.ledger.length).toBe(n); expect(p.owner).toBe('market');
  });
  it('zemin etüdü: ücret hemen, sonuç 5 gün sonra; çift sipariş yok', () => {
    const s = start(); const p = mk(s, { soilKnown: false, soil: 'yeralti_suyu' }); const cost = surveyCost(p, 'soil'); const c0 = s.company!.cash;
    expect(dispatch(s, 'OrderSurvey', { parcelId: p.id, kind: 'soil' }).ok).toBe(true);
    expect(c0 - s.company!.cash).toBe(cost); expect(dispatch(s, 'OrderSurvey', { parcelId: p.id, kind: 'soil' }).ok).toBe(false);
    advanceDays(s, 4); expect(p.soilKnown).toBe(false); advanceDays(s, 1); expect(p.soilKnown).toBe(true);
    expect(dispatch(s, 'OrderSurvey', { parcelId: p.id, kind: 'soil' }).ok).toBe(false); // zaten biliniyor
  });
  it('piyasa araştırması gelişim potansiyelini netleştirir', () => {
    const s = start(); const p = mk(s); dispatch(s, 'OrderSurvey', { parcelId: p.id, kind: 'market' }); advanceDays(s, 3); expect(p.growthKnown).toBe(true);
  });
});

describe('fizibilite — elle doğrulanmış örnek (Ankara/Çankaya, 400 m², KAKS 1,6, TAKS 0,35, apartman, standart)', () => {
  it('imar hesabı: emsal 640, brüt 832, satılabilir 544, kat 5', () => {
    const s = start(); const p = mk(s); const b = buildable(p, 'apartman');
    expect(b.floors).toBe(5); expect(b.emsal).toBeCloseTo(640, 6);
    const plan = planProject(s, p, 'apartman', 'standart', TL(4_800_000));
    expect(plan.brut).toBeCloseTo(832, 6); expect(plan.satilabilir).toBeCloseTo(544, 6);
  });
  it('maliyet: 832 × 14.000 = 11,648 M₺; yumuşak %6,5; tasarım %2,5; zemin sağlam → ek yok', () => {
    const s = start(); const p = mk(s); const plan = planProject(s, p, 'apartman', 'standart', TL(4_800_000));
    expect(Math.abs(plan.cost.total - TL(11_648_000))).toBeLessThanOrEqual(2);
    expect(Math.abs(plan.cost.soft - Math.round(TL(11_648_000) * 0.065))).toBeLessThanOrEqual(2);
    expect(Math.abs(plan.cost.designFee - Math.round(TL(11_648_000) * 0.025))).toBeLessThanOrEqual(2);
    expect(plan.cost.soil).toBe(0);
  });
  it('gelir: 544 m² × (52.000 × fit 1,03) ₺ = 29,14 M₺; kâr = gelir − komisyon − maliyet − arsa', () => {
    const s = start(); const p = mk(s); const land = TL(4_800_000); const plan = planProject(s, p, 'apartman', 'standart', land);
    expect(plan.salePerM2).toBe(TL(52000 * (0.95 + 0.1 * 0.8)));
    const rev = Math.round(544 * plan.salePerM2); expect(plan.revenue.mid).toBe(rev);
    expect(plan.profit.mid).toBe(rev - Math.round(rev * 0.02) - plan.cost.total - land);
    expect(plan.revenue.low).toBeLessThan(rev); expect(plan.revenue.high).toBeGreaterThan(rev);
    expect(plan.profit.low).toBeLessThan(plan.profit.mid); expect(plan.profit.high).toBeGreaterThan(plan.profit.mid);
    // başa baş fiyatında kâr ≈ 0
    const be = Math.round(544 * plan.breakEvenPerM2 * 0.98) - plan.cost.total - land; expect(Math.abs(be)).toBeLessThan(TL(5));
  });
  it('zemin: bilinmiyorsa beklenen +%10 ve geniş aralık; bilinen kötü zemin maliyeti artırır', () => {
    const s = start(); const known = mk(s, { soil: 'yeralti_suyu', soilKnown: true }), unk = mk(s, { soil: 'yeralti_suyu', soilKnown: false });
    const a = planProject(s, known, 'apartman', 'standart', 0), b = planProject(s, unk, 'apartman', 'standart', 0);
    expect(a.cost.soil).toBeGreaterThan(b.cost.soil); expect(b.cost.totalHigh).toBeGreaterThan(b.cost.totalLow); expect(a.cost.totalHigh).toBe(a.cost.totalLow);
    expect(Math.abs(a.cost.soil - Math.round(TL(11_648_000) * 0.13 * 0.4))).toBeLessThanOrEqual(2);
  });
  it('malzeme endeksi bütçeyi orantılı artırır', () => {
    const s = start(); const p = mk(s); const a = planProject(s, p, 'apartman', 'standart', 0).cost.total; s.macro.materialIndex = 150;
    expect(planProject(s, p, 'apartman', 'standart', 0).cost.total / a).toBeCloseTo(1.5, 3);
  });
  it('kalite: lüks yüksek gelirli bölgede, ekonomik düşük gelirli bölgede daha uyumlu', () => {
    const s = start(); const rich = mk(s, { district: 'cankaya' }), poor = mk(s, { district: 'kecioren' });
    const f = (p: Parcel, q: string) => planProject(s, p, 'apartman', q, 0).fit;
    expect(f(rich, 'luks')).toBeGreaterThan(f(poor, 'luks')); expect(f(poor, 'ekonomik')).toBeGreaterThan(f(rich, 'ekonomik'));
  });
  it('yapılabilirlik kuralları: site küçük parselde, fabrika konut imarında, kat yetersizliği reddedilir', () => {
    const s = start(); const p = mk(s);
    expect(buildable(p, 'site').reason).toMatch(/en az 1500/); expect(buildable(p, 'fabrika').reason).toMatch(/İmar/);
    const low = mk(s, { kaks: 0.8, taks: 0.4, maxFloors: 2 }); expect(buildable(low, 'apartman').reason).toMatch(/kat sayısı/);
    expect(buildable(low, 'mustakil').reason).toBeUndefined();
    const v = planProject(s, mk(s, { kaks: 3, taks: 0.3, maxFloors: 10, area: 500 }), 'mustakil', 'standart', 0); expect(v.floors).toBe(2); // tip kat sınırı
    expect(v.emsal).toBeCloseTo(500 * 0.3 * 2, 6); // emsal tavanı = taban × kat
  });
});

describe('proje oluşturma ve arsa satışı', () => {
  it('proje: tasarım bedeli ledger\'a, arsa projeye bağlanır, ikinci proje reddedilir, iptal serbest bırakır', () => {
    const s = start(); const p = mk(s, { owner: 'player', costBasis: TL(4_000_000) }); const c0 = s.company!.cash;
    const plan = planProject(s, p, 'apartman', 'standart', p.costBasis);
    expect(dispatch(s, 'CreateProject', { parcelId: p.id, type: 'apartman', quality: 'standart' }).ok).toBe(true);
    expect(c0 - s.company!.cash).toBe(plan.cost.designFee); expect(s.ledger.at(-1)!.cat).toBe('tasarim');
    expect(p.projectId).toBe(s.projects[0]!.id); expect(s.projects[0]!.budget.total).toBe(plan.cost.total);
    expect(dispatch(s, 'CreateProject', { parcelId: p.id, type: 'mustakil', quality: 'standart' }).ok).toBe(false);
    expect(dispatch(s, 'SellLandQuick', { parcelId: p.id }).ok).toBe(false); // projeli arsa satılamaz
    expect(dispatch(s, 'CancelProject', { projectId: s.projects[0]!.id }).ok).toBe(true);
    expect(p.projectId).toBeUndefined(); expect(s.company!.cash).toBe(c0 - plan.cost.designFee); // tasarım bedeli geri gelmez
    expect(checkInvariant(s)).toBe(true);
  });
  it('sahip olunmayan arsada ve uygunsuz tipte proje reddedilir', () => {
    const s = start(); const m = mk(s), o = mk(s, { owner: 'player', costBasis: 1 });
    expect(dispatch(s, 'CreateProject', { parcelId: m.id, type: 'apartman', quality: 'standart' }).ok).toBe(false);
    expect(dispatch(s, 'CreateProject', { parcelId: o.id, type: 'fabrika', quality: 'standart' }).ok).toBe(false);
  });
  it('hızlı satış: adil değerin %92\'si; arsa pazardan çıkar', () => {
    const s = start(); const p = mk(s, { owner: 'player', costBasis: 1 }); const c0 = s.company!.cash, fair = fairValue(s, p);
    expect(dispatch(s, 'SellLandQuick', { parcelId: p.id }).ok).toBe(true);
    expect(s.company!.cash - c0).toBe(Math.round(fair * 0.92)); expect(s.parcels.includes(p)).toBe(false);
  });
  it('satışa koyma: düşük istenen fiyat daha hızlı satılır; komisyon ödenir', () => {
    const weeks = (mult: number) => {
      let tot = 0, n = 0;
      for (let seed = 0; seed < 25; seed++) {
        const s = start(100 + seed); s.company!.cash = 1e12; s.ledgerBase = 1e12 - s.ledger.reduce((a, e) => a + e.amount, 0);
        const p = mk(s, { owner: 'player', costBasis: 1 }); dispatch(s, 'ListLand', { parcelId: p.id, askMult: mult });
        let w = 0; while (s.parcels.includes(p) && w < 150) { advanceDays(s, 7); w++; }
        if (!s.parcels.includes(p)) { tot += w; n++; expect(s.ledger.some((e) => e.cat === 'komisyon')).toBe(true); expect(checkInvariant(s)).toBe(true); }
      }
      return n ? tot / n : Infinity;
    };
    expect(weeks(0.95)).toBeLessThan(weeks(1.2));
  });
  it('satıştan çekme; aralık dışı fiyat reddi', () => {
    const s = start(); const p = mk(s, { owner: 'player', costBasis: 1 });
    expect(dispatch(s, 'ListLand', { parcelId: p.id, askMult: 2 }).ok).toBe(false);
    dispatch(s, 'ListLand', { parcelId: p.id, askMult: 1 }); expect(p.listed).toBeDefined(); dispatch(s, 'UnlistLand', { parcelId: p.id }); expect(p.listed).toBeUndefined();
  });
  it('net varlık arsaları piyasa değeriyle içerir ve endeksle değişir', () => {
    const s = start(); const c = s.company!.cash; mk(s, { owner: 'player', costBasis: 1 });
    const v = landAssetValue(s); expect(v).toBeGreaterThan(0); expect(netWorth(s)).toBe(c + v);
    s.cityMarket.ankara!.landIndex = 2; expect(landAssetValue(s)).toBe(v * 2);
  });
});

describe('kayıt göçü v2→v3 ve gidiş-dönüş', () => {
  it('arsalı oyun kaydedilip yüklenince birebir aynı devam eder', () => {
    const s = start(12); const p = [...marketParcels(s)].sort((a, b) => askPrice(s, a) - askPrice(s, b))[0]!; p.reserveMult = 0.95; dispatch(s, 'BuyLand', { parcelId: p.id, offerPct: 1 }); advanceDays(s, 100);
    const r = unpack(pack(s)); expect(r.ok).toBe(true); if (!r.ok) return;
    advanceDays(s, 400); advanceDays(r.state, 400); expect(JSON.stringify(r.state)).toBe(JSON.stringify(s));
    expect(ownedParcels(r.state).length).toBe(1);
  });
  it('v2 kaydı v3\'e taşınır: pazar oluşur', () => {
    const s = start(); const old: any = JSON.parse(JSON.stringify(s)); old.meta.version = 2; for (const k of ['parcels', 'projects', 'cityMarket', 'scheduled']) delete old[k];
    const r = unpack(pack(old)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.meta.version).toBe(10); expect(marketParcels(r.state).length).toBeGreaterThanOrEqual(94); }
  });
});
