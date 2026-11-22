import { TL, type Money } from '../core/money';
import { pick, randInt } from '../core/rng';
import type { GameState, Parcel } from '../core/types';
import { PLACES, SOIL_COST, STAGE_SHARES, buildingType, cityData, districtData, quality } from '../data';
import { COMMISSION, COMMON_RATIO, qualityFit, refSale, askPrice, TAPU_HARCI } from './land';
export { COMMISSION, COMMON_RATIO, qualityFit };
const SOFT_STAGES = new Set(['planlama', 'mimari', 'statik', 'elmek', 'ruhsat']);
const SOFT_SHARE = STAGE_SHARES.filter(([k]) => SOFT_STAGES.has(k)).reduce((a, [, w]) => a + w, 0) / 100; // 0,065
const DESIGN_SHARE = STAGE_SHARES.filter(([k]) => k === 'planlama' || k === 'mimari').reduce((a, [, w]) => a + w, 0) / 100; // 0,025
const SOIL_SHARE = STAGE_SHARES.filter(([k]) => k === 'hafriyat' || k === 'temel').reduce((a, [, w]) => a + w, 0) / 100; // 0,13

export interface Plan {
  ok: boolean; reason?: string;
  floors: number; emsal: number; brut: number; satilabilir: number;
  cost: { base: Money; soil: Money; soilLow: Money; soilHigh: Money; soft: Money; total: Money; totalLow: Money; totalHigh: Money; designFee: Money };
  months: { min: number; max: number };
  salePerM2: Money; revenue: { mid: Money; low: Money; high: Money };
  landCost: Money; commission: Money;
  profit: { mid: Money; low: Money; high: Money }; margin: number; breakEvenPerM2: Money; fit: number;
}

export function buildable(p: Parcel, typeId: string): { floors: number; emsal: number; reason?: string } {
  const t = buildingType(typeId)!;
  const baseFloors = Math.min(p.maxFloors, Math.max(1, Math.ceil(p.kaks / p.taks)));
  const floors = Math.min(baseFloors, t.floorsCap);
  const footprint = p.area * p.taks;
  const emsal = Math.min(p.area * p.kaks, footprint * floors);
  if (!t.zoning.includes(p.zoning)) return { floors, emsal, reason: `İmar durumu (${p.zoning}) bu yapı tipine uygun değil.` };
  if (p.area < t.minArea) return { floors, emsal, reason: `Parsel en az ${t.minArea} m² olmalı (şu an ${p.area} m²).` };
  if (floors < t.minFloors) return { floors, emsal, reason: `İzin verilen kat sayısı (${floors}) bu tip için yetersiz (en az ${t.minFloors}).` };
  return { floors, emsal };
}

/**
 * Fizibilite: maliyet, süre, gelir aralığı, kâr. Fiyatlar BUGÜNÜN endeksleriyle hesaplanır (gelecek fiyat tahmini yok).
 * `landCost`: oyuncu sahibiyse maliyet esası, değilse (arsa dosyasında) istenen fiyat + tapu harcı.
 */
/** İnşaat süresi çarpanı: 1 = eski (uzun) süreler. */
export const BUILD_TIME = 0.7;
export function planProject(s: GameState, p: Parcel, typeId: string, qualityId: string, landCost?: Money): Plan {
  const t = buildingType(typeId), q = quality(qualityId), city = cityData(p.city), d = districtData(p.city, p.district);
  if (!t || !q || !city || !d) throw new Error('planProject: geçersiz girdi');
  const b = buildable(p, typeId);
  const common = COMMON_RATIO[t.use]!;
  const brut = b.emsal * common.brut, satilabilir = b.emsal * common.sat;
  const matIdx = s.macro.materialIndex / 100;
  const base = Math.round(brut * TL(t.costM2) * q.costMult * city.costMult * matIdx * 0.935); // yapım aşamaları (hafriyat→teslim)
  const total0 = Math.round(base / 0.935);                                                     // yumuşak giderler dahil toplam (soil hariç)
  const soilTrue = SOIL_COST[p.soil] ?? 1, soilPlanned = p.soilKnown ? soilTrue : 1.1;
  const soilAdj = (f: number) => Math.round(total0 * SOIL_SHARE * (f - 1));
  const soil = soilAdj(soilPlanned), soilLow = p.soilKnown ? soil : soilAdj(1.0), soilHigh = p.soilKnown ? soil : soilAdj(1.4);
  const soft = Math.round(total0 * SOFT_SHARE), designFee = Math.round(total0 * DESIGN_SHARE);
  const total = total0 + soil, totalLow = total0 + soilLow, totalHigh = total0 + soilHigh;
  const sizeF = Math.min(1, Math.max(0, (brut - 300) / 3000));
  const mid = (t.monthsMin + (t.monthsMax - t.monthsMin) * sizeF * (soilPlanned > 1.15 ? 1.1 : 1)) * BUILD_TIME; // şantiye süresi (oyuncu şikâyeti üzerine %30 kısaltıldı)
  const months = { min: Math.max(2, Math.round(mid * 0.85)), max: Math.round(mid * 1.15) };
  const housing = s.cityMarket[p.city]?.housingIndex ?? 1;
  const fit = qualityFit(qualityId, d.income);
  const salePerM2 = Math.round(TL(refSale(d, t.use === 'konut' ? 'konut' : t.use === 'ticari' ? 'ticaret' : 'sanayi')) * t.saleMult * q.saleMult * fit * housing);
  const revMid = Math.round(satilabilir * salePerM2 * (1 - (p.kat?.share ?? 0))); // kat karşılığında arsa sahibinin payı düşer
  const band = 0.08 + (s.macro.regime === 'kriz' ? 0.12 : s.macro.regime === 'daralma' || s.macro.regime === 'asiri_isinma' ? 0.04 : 0);
  const land = landCost ?? Math.round(askPrice(s, p) * (1 + TAPU_HARCI));
  const commission = Math.round(revMid * COMMISSION);
  const prof = (rev: Money, cost: Money) => rev - Math.round(rev * COMMISSION) - cost - land;
  const profit = { mid: prof(revMid, total), low: prof(Math.round(revMid * (1 - band)), totalHigh), high: prof(Math.round(revMid * (1 + band)), totalLow) };
  const breakEvenPerM2 = satilabilir > 0 ? Math.round((total + land) / (satilabilir * (1 - COMMISSION))) : 0;
  const empty = { floors: b.floors, emsal: b.emsal, brut, satilabilir };
  const lvlReason = t.minLevel && s.company && s.company.level < t.minLevel ? `${t.label} için şirket seviyesi ${t.minLevel} gerekir.` : undefined, why = b.reason ?? lvlReason;
  return { ok: !why, ...(why ? { reason: why } : {}), ...empty, cost: { base, soil, soilLow, soilHigh, soft, total, totalLow, totalHigh, designFee }, months, salePerM2, revenue: { mid: revMid, low: Math.round(revMid * (1 - band)), high: Math.round(revMid * (1 + band)) }, landCost: land, commission, profit, margin: revMid > 0 ? profit.mid / revMid : 0, breakEvenPerM2, fit };
}

export function projectName(s: GameState, typeId: string): string {
  const t = buildingType(typeId)!;
  const words = PLACES.projectWords[t.use]!, suf = PLACES.projectSuffix[typeId] ?? ['Projesi'];
  return `${pick(s.rng, 'misc', words)} ${pick(s.rng, 'misc', suf)}`;
}
export const newDesignSeed = (s: GameState) => randInt(s.rng, 'misc', 1, 2 ** 30);

/** Mevcut piyasa koşullarında binanın tahmini toplam satış değeri (kalite puanı varsa ona göre). */
export function currentRevenue(s: GameState, pr: { parcelId: number; type: string; quality: string; satilabilir: number; result?: { qualityScore: number } }): Money {
  const parcel = s.parcels.find((x) => x.id === pr.parcelId);
  if (!parcel) return 0;
  const plan = planProject(s, parcel, pr.type, pr.quality, 0);
  const qm = pr.result ? 1 + (pr.result.qualityScore - 74) * 0.004 : 1;
  return Math.round(plan.revenue.mid * qm);
}
