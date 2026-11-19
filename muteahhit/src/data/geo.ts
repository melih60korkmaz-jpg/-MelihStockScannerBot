import provincesRaw from './geo/provinces.json';
import districtsRaw from './geo/districts.json';
import metaRaw from './geo/provinceMeta.json';
import overridesRaw from './geo/overrides.json';

export type Zoning = 'konut' | 'ticaret' | 'karma' | 'sanayi';
export interface DistrictDef {
  id: string; label: string; saleBase: number; income: number; density: number; infra: number; transit: number; commercial: number; competition: number; growth: number;
  zoningW: Record<Zoning, number>; areaBias: 'small' | 'mid' | 'large';
  path: string; cx: number; cy: number; areaKm2: number;      // gerçek sınır (SVG yolu, ×10 birim) ve merkez
}
export type Region = 'Marmara' | 'Ege' | 'Akdeniz' | 'İç Anadolu' | 'Karadeniz' | 'Doğu Anadolu' | 'Güneydoğu Anadolu';
export interface Province { id: string; plate: string; name: string; region: Region; tier: 1 | 2 | 3 | 4; anchor: number; costMult: number; branchCostTL: number; path: string; cx: number; cy: number; bbox: [number, number, number, number]; areaKm2: number }
export interface CityFull { id: string; label: string; costMult: number; districts: DistrictDef[]; province: Province }

/** Bölge iklimi: yağış çarpanı ve kar olasılığı. */
export const CLIMATE: Record<Region, { rain: number; snow: number }> = {
  'Marmara': { rain: 1.0, snow: 0.3 }, 'Ege': { rain: 0.8, snow: 0.05 }, 'Akdeniz': { rain: 0.8, snow: 0.02 }, 'İç Anadolu': { rain: 0.7, snow: 0.6 },
  'Karadeniz': { rain: 1.5, snow: 0.35 }, 'Doğu Anadolu': { rain: 0.8, snow: 0.9 }, 'Güneydoğu Anadolu': { rain: 0.5, snow: 0.25 },
};

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
function hash(s: string, salt = 0): number { let h = 2166136261 ^ salt; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; }

const META = metaRaw as unknown as Record<string, { region: Region; tier: 1 | 2 | 3 | 4; anchor: number; costMult: number; branchCostTL: number }>;
const LEGACY = (overridesRaw as any).legacy as Record<string, Omit<DistrictDef, 'label' | 'path' | 'cx' | 'cy' | 'areaKm2'>>;
const NOTABLE = (overridesRaw as any).notable as Record<string, [number, number]>;
const TIER_P = { 1: { income: 62, infra: 82, transit: 72, comp: 68 }, 2: { income: 52, infra: 72, transit: 60, comp: 55 }, 3: { income: 44, infra: 64, transit: 50, comp: 45 }, 4: { income: 36, infra: 56, transit: 42, comp: 36 } } as const;

export const PROVINCES: Province[] = (provincesRaw as any[]).map((p) => ({ ...p, ...META[p.plate]!, bbox: p.bbox as [number, number, number, number] }));
const PROV_BY_ID = new Map(PROVINCES.map((p) => [p.id, p]));

/** İlçe özelliklerini tier, yoğunluk (alan), merkez/çevre konumu ve sabit gürültüden üretir; el ayarlı ilçeler aynen korunur. */
function buildDistricts(prov: Province): DistrictDef[] {
  const raw = (districtsRaw as any)[prov.id] as { id: string; name: string; path: string; cx: number; cy: number; a: number }[];
  const n = raw.length, byArea = [...raw].sort((a, b) => a.a - b.a), rank = new Map(byArea.map((d, i) => [d.id, i])), tp = TIER_P[prov.tier];
  return raw.map((d) => {
    const key = `${prov.id}/${d.id}`, geo = { path: d.path, cx: d.cx, cy: d.cy, areaKm2: d.a }, leg = LEGACY[key];
    if (leg) return { ...leg, label: d.name, ...geo } as DistrictDef;
    const r = n > 1 ? rank.get(d.id)! / (n - 1) : 0, rankScore = 1 - r, h1 = hash(key, 1), h2 = hash(key, 2), h3 = hash(key, 3);
    let density = clamp(95 - 35 * Math.log10(Math.max(1, d.a) / 20), 8, 98); if (n === 1 || /^merkez$/i.test(d.name)) density = clamp(density + 15, 8, 98);
    const note = NOTABLE[key], nm = note && note[0] > 0 ? note[0] : 1;
    const mult = (0.72 + 0.6 * Math.pow(rankScore, 1.3)) * (0.94 + 0.12 * h1) * nm;
    const income = note && note[1] > 0 ? note[1] : clamp(tp.income + 30 * (mult - 1) + (h2 - 0.5) * 10, 15, 95);
    const bigCity = prov.tier === 1, peripheral = bigCity && density < 55;
    const urban = density > 65, mid = density > 40;
    return {
      id: d.id, label: d.name, saleBase: Math.round((prov.anchor * mult) / 100) * 100, income: Math.round(income), density: Math.round(density),
      infra: Math.round(clamp(tp.infra + 0.25 * (density - 50) + (h3 - 0.5) * 12, 25, 98)), transit: Math.round(clamp(tp.transit + 0.4 * (density - 50), 20, 95)),
      commercial: Math.round(clamp(20 + 0.55 * density + (prov.tier === 1 ? 10 : prov.tier === 2 ? 4 : 0), 12, 92)), competition: Math.round(clamp(tp.comp + 0.35 * (density - 50), 15, 95)),
      growth: +(0.03 + 0.09 * h2 + (peripheral ? 0.04 : 0)).toFixed(2),
      zoningW: urban ? { konut: 62, ticaret: 14, karma: 16, sanayi: 8 } : mid ? { konut: 58, ticaret: 9, karma: 14, sanayi: 12 } : { konut: 50, ticaret: 6, karma: 10, sanayi: 14 },
      areaBias: urban ? 'small' : mid ? 'mid' : 'large', ...geo,
    } as DistrictDef;
  });
}

const CACHE = new Map<string, CityFull>();
export function cityData(id: string): CityFull | undefined {
  const hit = CACHE.get(id); if (hit) return hit;
  const prov = PROV_BY_ID.get(id); if (!prov) return undefined;
  const c: CityFull = { id, label: prov.name, costMult: prov.costMult, districts: buildDistricts(prov), province: prov };
  CACHE.set(id, c); return c;
}
export const districtData = (cityId: string, id: string) => cityData(cityId)?.districts.find((d) => d.id === id);
export const provinceData = (id: string) => PROV_BY_ID.get(id);
/** Başlangıçta pazarı hazır gelen şehirler (başlangıç şehri seçenekleri). */
export const DEFAULT_CITIES = ['istanbul', 'ankara', 'izmir'];
export const listingTarget = (d: DistrictDef) => (d.density > 75 ? 3 : d.density > 50 ? 2 : 1);
export const branchCost = (id: string) => (provinceData(id)?.branchCostTL ?? 500000);
export const provinceStats = (id: string) => {
  const c = cityData(id)!, n = c.districts.length, avg = (f: (d: DistrictDef) => number) => c.districts.reduce((a, d) => a + f(d), 0) / n;
  return { saleBase: avg((d) => d.saleBase), income: avg((d) => d.income), competition: avg((d) => d.competition), growth: avg((d) => d.growth), districts: n };
};
