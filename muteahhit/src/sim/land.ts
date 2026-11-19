import { TL, type Money } from '../core/money';
import { gauss, rand, randInt, pick } from '../core/rng';
import type { GameEvent, GameState, Parcel, Soil } from '../core/types';
import { CITY_DATA, PLACES, buildingType, cityData, districtData, type DistrictDef, type Zoning } from '../data';
import { post } from './ledger';

export const COMMON_RATIO: Record<string, { brut: number; sat: number }> = { konut: { brut: 1.3, sat: 0.85 }, ticari: { brut: 1.35, sat: 0.8 }, sanayi: { brut: 1.05, sat: 0.95 } };
export const COMMISSION = 0.02;
/** Kalite × bölge geliri uyumu: lüks yalnızca yüksek gelirli bölgede karşılığını verir. */
export function qualityFit(q: string, income: number): number {
  const i = income / 100;
  switch (q) { case 'luks': return 0.7 + 0.45 * i; case 'premium': return 0.85 + 0.25 * i; case 'standart': return 0.95 + 0.1 * i; default: return 1.1 - 0.2 * i; }
}
/** Rekabetçi arsa piyasası: geliştiricinin referans projede bırakacağı kâr (rekabet yüksekse daha dar). */
export const targetMargin = (d: DistrictDef) => 0.17 - 0.07 * (d.competition / 100);
export const TAPU_HARCI = 0.04;
export const QUICK_SALE_DISCOUNT = 0.92;
export const LISTING_TARGET = 4;
const SOIL_PRICE: Record<Soil, number> = { saglam: 1, kaya: 0.97, kil: 0.97, dolgu: 0.92, yeralti_suyu: 0.88, egimli: 0.9 };
const SOIL_W: [Soil, number][] = [['saglam', 45], ['kaya', 10], ['kil', 20], ['dolgu', 12], ['yeralti_suyu', 7], ['egimli', 6]];

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const round5 = (x: number) => Math.max(5, Math.round(x / 5) * 5);
const round05 = (x: number) => Math.round(x * 20) / 20;
function wpick<T>(s: GameState, items: [T, number][]): T {
  const tot = items.reduce((a, [, w]) => a + w, 0); let x = rand(s.rng, 'market') * tot;
  for (const [v, w] of items) { if ((x -= w) <= 0) return v; }
  return items[items.length - 1]![0];
}

/** Bölgenin imar türüne göre referans konut/ticari satış fiyatı (₺/m², endeks 1.0). */
export function refSale(d: DistrictDef, zoning: Zoning): number {
  const com = 0.75 + 0.5 * (d.commercial / 100);
  if (zoning === 'konut') return d.saleBase;
  if (zoning === 'ticaret') return d.saleBase * com;
  if (zoning === 'karma') return d.saleBase * (1 + com) / 2;
  return d.saleBase * 0.5;
}

const REF_TYPE: Record<Zoning, string> = { konut: 'apartman', karma: 'apartman', ticaret: 'ofis', sanayi: 'fabrika' };
/**
 * Artık değer yöntemi: arsa, referans projede (apartman/ofis/fabrika, standart kalite) geliştiriciye hedef kârı bırakacak seviyeye oturur.
 * Böylece pahalı bölgede sırf pahalı diye otomatik kâr yoktur; fırsat farkı tip/kalite uyumu, zemin, gelişim ve döngüden gelir.
 */
export function residualPerEmsal(cityId: string, d: DistrictDef, zoning: Zoning): number {
  const t = buildingType(REF_TYPE[zoning])!, r = COMMON_RATIO[t.use]!, cm = cityData(cityId)!.costMult;
  const saleZoning: Zoning = t.use === 'konut' ? 'konut' : t.use === 'ticari' ? 'ticaret' : 'sanayi';
  const rev = r.sat * refSale(d, saleZoning) * t.saleMult * qualityFit('standart', d.income);
  const cost = r.brut * t.costM2 * cm;
  return Math.max(0.1 * rev, rev * (1 - COMMISSION - targetMargin(d)) - cost);
}

export function generateParcel(s: GameState, cityId: string, districtId: string, force?: Partial<Pick<Parcel, 'zoning' | 'area' | 'kaks' | 'taks'>>): Parcel {
  const d = districtData(cityId, districtId)!;
  const zoning = force?.zoning ?? wpick(s, (Object.entries(d.zoningW) as [Zoning, number][]).filter(([, w]) => w > 0));
  const range: Record<Zoning, [number, number, number, number]> = { konut: [0.8, 2.2, 0.25, 0.45], ticaret: [1.5, 3.5, 0.4, 0.6], karma: [1.4, 3.0, 0.35, 0.55], sanayi: [0.5, 1.0, 0.4, 0.6] };
  const [k0, k1, t0, t1] = range[zoning];
  const kaks = force?.kaks ?? round05(k0 + rand(s.rng, 'market') * (k1 - k0));
  const taks = force?.taks ?? round05(t0 + rand(s.rng, 'market') * (t1 - t0));
  const [a0, a1] = d.areaBias === 'small' ? [150, 600] : d.areaBias === 'mid' ? [250, 1200] : [500, 4000];
  const area = force?.area !== undefined ? round5(force.area) : round5(a0 * Math.pow(a1 / a0, Math.pow(rand(s.rng, 'market'), 1.3)));
  const soil = wpick(s, SOIL_W);
  const roads = wpick(s, [[1, 50], [2, 35], [3, 15]]);
  const corner = roads >= 2 && rand(s.rng, 'market') < 0.5;
  const infra = Math.round(clamp(d.infra + gauss(s.rng, 'market') * 10, 20, 100));
  const growth = +clamp(d.growth + gauss(s.rng, 'market') * 0.06, 0, 0.3).toFixed(3);
  const maxFloors = Math.max(1, Math.ceil(kaks / taks) + randInt(s.rng, 'market', 0, 1));
  const hood = `${pick(s.rng, 'market', PLACES.hoodPre)} ${PLACES.hoodSuf[0]}`;
  const unitPerM2 = residualPerEmsal(cityId, d, zoning) * kaks * (1 + 0.5 * growth) * Math.pow(SOIL_PRICE[soil], 0.5)
    * (0.9 + 0.1 * (infra / 80)) * (corner ? 1.04 : 1) * (1 + 0.02 * (roads - 1));
  const askMult = +(1.03 + rand(s.rng, 'market') * 0.13).toFixed(3);
  const reserveMult = +clamp(askMult - (0.03 + rand(s.rng, 'market') * 0.09), 0.95, 1.06).toFixed(3);
  return {
    id: s.nextId++, city: cityId, district: districtId, hood, area, zoning, taks, kaks, maxFloors, soil, soilKnown: false,
    roads, corner, infra, growth, growthKnown: false, unitBase: TL(unitPerM2), askMult, reserveMult, negoLockUntil: 0, owner: 'market',
  };
}

export function initMarket(s: GameState): void {
  for (const c of CITY_DATA) s.cityMarket[c.id] = { landIndex: 1, housingIndex: 1 };
  for (const c of CITY_DATA) {
    for (const d of c.districts) for (let i = 0; i < LISTING_TARGET; i++) s.parcels.push(generateParcel(s, c.id, d.id));
    // Başlangıç için her şehirde en ucuz bölgede 2 küçük arsa (ilk müstakil/dubleks projesi için)
    const cheapest = [...c.districts].sort((a, b) => a.saleBase - b.saleBase)[0]!;
    for (let i = 0; i < 2; i++) s.parcels.push(generateParcel(s, c.id, cheapest.id, { zoning: 'konut', area: 180 + 20 * i + randInt(s.rng, 'market', 0, 20), kaks: 1.0, taks: 0.5 }));
  }
}

// ---------- Değerleme ----------
export const landIndex = (s: GameState, p: Parcel) => s.cityMarket[p.city]?.landIndex ?? 1;
export const fairValue = (s: GameState, p: Parcel): Money => Math.round(p.unitBase * p.area * landIndex(s, p));
export const askPrice = (s: GameState, p: Parcel): Money => Math.round(fairValue(s, p) * p.askMult);
const hash01 = (id: number, salt: number) => (((id * 2654435761 + salt * 40503) >>> 0) % 1000) / 1000;

/** Oyuncunun görebildiği tahmini değer aralığı: araştırma yoksa geniş, varsa dar. Gerçek değer aralık içindedir. */
export function valueBand(s: GameState, p: Parcel): { lo: Money; hi: Money } {
  const spread = p.growthKnown ? 0.03 : 0.1, fair = fairValue(s, p);
  const off = (hash01(p.id, 1) - 0.5) * spread;
  return { lo: Math.round(fair * (1 + off - spread)), hi: Math.round(fair * (1 + off + spread)) };
}
export function growthLabel(p: Parcel): { label: string; sure: boolean } {
  if (p.growthKnown) return { label: p.growth < 0.06 ? 'Düşük' : p.growth < 0.14 ? 'Orta' : 'Yüksek', sure: true };
  const noisy = p.growth + (hash01(p.id, 2) - 0.5) * 0.12;
  return { label: noisy < 0.06 ? 'Düşük' : noisy < 0.14 ? 'Orta' : 'Yüksek', sure: false };
}
export const surveyCost = (p: Parcel, kind: 'soil' | 'market'): Money => (kind === 'soil' ? TL(20000) + TL(35) * p.area : TL(12000) + TL(10) * p.area);
export const SURVEY_DAYS = { soil: 5, market: 3 } as const;
export const ownedParcels = (s: GameState) => s.parcels.filter((p) => p.owner === 'player');
export const marketParcels = (s: GameState) => s.parcels.filter((p) => p.owner === 'market');
/** Biten (satılmamış) binası olan arsa, bina değeriyle birlikte sayıldığı için burada hariç tutulur. */
export const landAssetValue = (s: GameState): Money => ownedParcels(s).reduce((a, p) => a + (s.projects.some((x) => x.parcelId === p.id && x.status === 'tamamlandi') ? 0 : fairValue(s, p)), 0);

/** Pazarlık: satıcının gizli eşiği güvenle sertleşir (güven yüksek → satıcı inatçı). */
export function reservePrice(s: GameState, p: Parcel): Money {
  const r = Math.round(fairValue(s, p) * p.reserveMult * (1 + ((s.macro.confidence - 58) / 100) * 0.1));
  return Math.min(r, askPrice(s, p)); // istenen fiyat her zaman kabul edilir
}

// ---------- Aylık/haftalık işleyiş ----------
const REGIME_HOUSING: Record<string, number> = { kriz: -0.8, daralma: -0.25, genisleme: 0.25, asiri_isinma: 0.4, normal: 0, toparlanma: 0.1 };
export function marketMonthly(s: GameState, events: GameEvent[]): void {
  const m = s.macro, vol = s.meta.difficulty === 'acimasiz' ? 1.3 : s.meta.difficulty === 'rahat' ? 0.8 : 1;
  for (const c of CITY_DATA) {
    const cm = (s.cityMarket[c.id] ??= { landIndex: 1, housingIndex: 1 });
    const pct = m.inflation / 12 * 0.85 + (m.confidence - 55) * 0.012 - (m.policyRate - m.inflation - 4) * 0.025 + (REGIME_HOUSING[m.regime] ?? 0) + gauss(s.rng, 'market') * 0.35 * vol;
    const h = clamp(pct, -3, 4);
    cm.housingIndex = Math.max(0.3, cm.housingIndex * (1 + h / 100));
    cm.landIndex = Math.max(0.3, cm.landIndex * (1 + clamp(h * 1.25, -5, 5) / 100));
  }
  // Parsel bazlı gelişim potansiyeli: yüksek potansiyelli arsa piyasadan hızlı değerlenir
  for (const p of s.parcels) p.unitBase = Math.round(p.unitBase * (1 + (p.growth * 0.35) / 12));
  // Piyasa devri: ilanların bir kısmı başkasına satılır, yenileri çıkar
  let sold = 0;
  s.parcels = s.parcels.filter((p) => { if (p.owner === 'market' && rand(s.rng, 'market') < 0.12) { sold++; return false; } return true; });
  for (const c of CITY_DATA) for (const d of c.districts) {
    const n = s.parcels.filter((p) => p.owner === 'market' && p.city === c.id && p.district === d.id).length;
    for (let i = n; i < LISTING_TARGET; i++) s.parcels.push(generateParcel(s, c.id, d.id));
  }
  void sold; void events;
}

/** Her pazartesi: oyuncunun satışa koyduğu arsalar için alıcı gelir mi? */
export function listingsWeekly(s: GameState, events: GameEvent[]): void {
  for (const p of [...s.parcels]) {
    if (p.owner !== 'player' || !p.listed) continue;
    const chance = clamp(0.1 * (s.macro.confidence / 58) * Math.exp(-9 * (p.listed.askMult - 1)), 0.01, 0.35);
    if (rand(s.rng, 'market') >= chance) continue;
    const price = Math.round(fairValue(s, p) * p.listed.askMult);
    const comm = Math.round(price * 0.02); // emlakçı komisyonu
    post(s, 'arsa', price, { memo: `Arsa satışı (${p.hood})` });
    post(s, 'komisyon', -comm, { memo: 'Arsa satış komisyonu' });
    s.parcels = s.parcels.filter((x) => x.id !== p.id);
    events.push({ type: 'LAND_SOLD', day: s.clock.day, data: { parcelId: p.id, price, comm, hood: p.hood } });
  }
}
