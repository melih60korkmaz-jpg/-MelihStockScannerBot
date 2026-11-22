import { focusVenture } from './control';
import { sectorDiscount } from './mgmt';
import { TL, type Money } from '../core/money';
import { dateOf } from '../core/calendar';
import type { GameEvent, GameState, Project, Strategy, Venture, VentureKind } from '../core/types';
import { post } from './ledger';
import { makeExec } from './mgmt';

/**
 * İş kolları: otel ve AVM işletmeciliği, güneş/rüzgâr enerji santralleri ve satın alınan bağlı şirketler.
 * Gelir ve gider her ay deftere işlenir; gelir mevsime, şehre, ekonomik rejime, güvene ve itibara; gider sabit kalır.
 * Rastgelelik RNG akışı tüketmez: ay ve iş kolu kimliğinden türeyen sabit bir gürültü kullanılır (mevcut oyun dengesi bozulmaz).
 */
export type VInfo = { label: string; ico: string; rev: number; opex: number; floor: number; minLevel: number; div: 'isletme' | 'enerji' | 'bagli' };
export const VENTURE_INFO: Record<VentureKind, VInfo> = {
  otel: { label: 'Otel', ico: '🏨', rev: 0.36, opex: 0.62, floor: 0.7, minLevel: 4, div: 'isletme' },
  avm: { label: 'AVM', ico: '🏬', rev: 0.17, opex: 0.26, floor: 0.7, minLevel: 4, div: 'isletme' },
  is_merkezi: { label: 'İş merkezi', ico: '🏢', rev: 0.13, opex: 0.24, floor: 0.75, minLevel: 4, div: 'isletme' },
  ofis: { label: 'Ofis kompleksi', ico: '🏙️', rev: 0.12, opex: 0.22, floor: 0.75, minLevel: 4, div: 'isletme' },
  restoran: { label: 'Restoran', ico: '🍽️', rev: 0.45, opex: 0.78, floor: 0.5, minLevel: 4, div: 'isletme' },
  otopark: { label: 'Otopark', ico: '🅿️', rev: 0.15, opex: 0.27, floor: 0.7, minLevel: 4, div: 'isletme' },
  tatil: { label: 'Tatil köyü', ico: '🏝️', rev: 0.31, opex: 0.58, floor: 0.65, minLevel: 6, div: 'isletme' },
  site: { label: 'Site yönetimi', ico: '🏘️', rev: 0.36, opex: 0.7, floor: 0.3, minLevel: 4, div: 'isletme' },
  gunes: { label: 'Güneş santrali', ico: '☀️', rev: 0.20, opex: 0.30, floor: 0.55, minLevel: 5, div: 'enerji' },
  ruzgar: { label: 'Rüzgâr santrali', ico: '🌬️', rev: 0.24, opex: 0.38, floor: 0.55, minLevel: 5, div: 'enerji' },
  depolama: { label: 'Enerji depolama', ico: '🔋', rev: 0.17, opex: 0.28, floor: 0.6, minLevel: 5, div: 'enerji' },
  bagli: { label: 'Bağlı şirket', ico: '🏛️', rev: 0.20, opex: 0.30, floor: 0.85, minLevel: 6, div: 'bagli' },
};
export const OPS_KINDS: VentureKind[] = ['otel', 'avm', 'is_merkezi', 'ofis', 'restoran', 'otopark', 'tatil', 'site'];
export const ENERGY_KINDS: VentureKind[] = ['gunes', 'ruzgar', 'depolama'];
export const GM_COST_TL = 150_000; // genel müdür aylık maaşı (maliyet endeksiyle artar)
export const MAX_VENTURES = 14;

const hash01 = (n: number): number => { let a = (n | 0) >>> 0; a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a ^= a >>> 16; return (a >>> 0) / 4294967296; };
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const DEMAND: Record<string, number> = { genisleme: 1.1, normal: 1, asiri_isinma: 1.08, toparlanma: 1.03, daralma: 0.88, kriz: 0.7 };
const COAST = new Set(['antalya', 'izmir']);
const SEAS_TOURISM = [0.6, 0.6, 0.75, 0.95, 1.2, 1.4, 1.55, 1.55, 1.3, 1.0, 0.7, 0.65], SEAS_BUSINESS = [0.9, 0.95, 1.0, 1.05, 1.05, 1.0, 0.95, 0.9, 1.05, 1.1, 1.0, 0.95];
const SEAS_AVM = [0.92, 0.9, 0.95, 1, 1, 0.98, 0.95, 0.95, 1, 1.02, 1.08, 1.2];
const SEAS_SUN = [0.45, 0.6, 0.85, 1.1, 1.35, 1.5, 1.55, 1.45, 1.15, 0.85, 0.55, 0.4], SEAS_WIND = [1.3, 1.25, 1.15, 1.0, 0.85, 0.8, 0.85, 0.85, 0.9, 1.05, 1.2, 1.3];
export const SUN_CITY: Record<string, number> = { antalya: 1.15, adana: 1.12, konya: 1.08, izmir: 1.06, ankara: 1.0, bursa: 0.94, istanbul: 0.9, kocaeli: 0.9 };
export const WIND_CITY: Record<string, number> = { izmir: 1.25, istanbul: 1.1, kocaeli: 1.05, bursa: 1.0, konya: 0.95, ankara: 0.9, antalya: 0.9, adana: 0.85 };
/** Enerji santrali boyutları: [MW, yatırım M₺]. */
export const ENERGY_TIERS: Record<'gunes' | 'ruzgar', [number, number][]> = {
  gunes: [[1, 9], [3, 25], [8, 62]],
  ruzgar: [[2, 22], [6, 60], [15, 140]],
};
/** Doğrudan kurulan işletmelerin boyutları: [kapasite, yatırım M₺]. Restoran: koltuk · otopark: araç yeri · tatil köyü: oda · depolama: MWh. */
export type BuildKind = 'gunes' | 'ruzgar' | 'restoran' | 'otopark' | 'tatil' | 'depolama';
export const BUILD_TIERS: Record<BuildKind, [number, number][]> = { ...ENERGY_TIERS, restoran: [[40, 1.5], [100, 4], [220, 9]], otopark: [[80, 3], [250, 9], [700, 24]], tatil: [[80, 60], [220, 150]], depolama: [[3, 14], [8, 34]] };
export const SIZE_UNIT: Record<string, string> = { gunes: 'MW', ruzgar: 'MW', restoran: 'koltuk', otopark: 'araç yeri', tatil: 'oda', depolama: 'MWh', otel: 'oda', avm: 'm²', is_merkezi: 'm²', ofis: 'm²', site: 'daire' };
const BUILD_DAYS: Record<BuildKind, number> = { gunes: 60, ruzgar: 120, restoran: 45, otopark: 60, tatil: 240, depolama: 90 };
export const COAST_ONLY = new Set(['antalya', 'izmir']);

const demandF = (s: GameState): number => (DEMAND[s.macro.regime] ?? 1) * (1 + (s.macro.confidence - 55) / 250) * (0.92 + s.company!.reputation / 600);
const seasonOf = (v: Venture, month: number): number => {
  const m = month - 1;
  switch (v.kind) {
    case 'otel': case 'tatil': return (COAST.has(v.city) ? SEAS_TOURISM : SEAS_BUSINESS)[m]!;
    case 'restoran': return COAST.has(v.city) ? (SEAS_TOURISM[m]! + 1) / 2 : SEAS_BUSINESS[m]!;
    case 'avm': case 'otopark': return SEAS_AVM[m]!;
    case 'is_merkezi': case 'ofis': return SEAS_BUSINESS[m]!;
    case 'gunes': return SEAS_SUN[m]! * (SUN_CITY[v.city] ?? 1);
    case 'ruzgar': return SEAS_WIND[m]! * (WIND_CITY[v.city] ?? 1);
    default: return 1;
  }
};
const OCC_BASE: Partial<Record<VentureKind, number>> = { otel: 0.62, avm: 0.9, is_merkezi: 0.88, ofis: 0.86, restoran: 0.55, otopark: 0.6, tatil: 0.58 };
const OCC_BOUNDS: Partial<Record<VentureKind, [number, number]>> = { otel: [0.18, 0.96], avm: [0.5, 0.99], is_merkezi: [0.4, 0.99], ofis: [0.4, 0.99], restoran: [0.15, 0.95], otopark: [0.2, 0.97], tatil: [0.1, 0.97] };
export const DEFAULT_OPS = { price: 1, staff: 2, ads: 1, mgr: null as null };
export const opsOf = (v: Venture) => v.ops ?? DEFAULT_OPS;
const STAFF_COST = [0.82, 1, 1.28], ADS_COST = [0, 0.02, 0.05, 0.09], ADS_EFF = [0.97, 1, 1.05, 1.09];
export const STAFF_LABEL = ['Tasarruflu', 'Standart', 'Premium'], ADS_LABEL = ['Reklam yok', 'Az', 'Orta', 'Yoğun'];

/** Bölüm stratejisi ve genel müdür etkisi: [gelir çarpanı, gider çarpanı]. */
export function divisionMod(s: GameState, div: 'isletme' | 'enerji' | 'altyapi' | 'bagli'): { rev: number; opex: number } {
  if (div === 'bagli') return { rev: 1, opex: 1 };
  const st: Strategy = s.holding.strategy[div], gm = s.holding.gm[div];
  let rev = st === 'buyume' ? 1.06 : st === 'temkinli' ? 0.96 : 1, opex = st === 'buyume' ? 1.1 : st === 'temkinli' ? 0.9 : 1;
  if (gm) { rev *= 1.05; opex *= 0.97; }
  rev *= focusVenture(s);
  return { rev, opex };
}

// ---- enerji piyasası ve iç tüketim ----
export const energyPrice = (s: GameState): number => s.energy?.price ?? 1;
/** Aylık spot fiyat endeksi: ortalamaya dönen, kış ve krizde baskı yapan, ay bazlı sabit gürültülü yürüyüş (RNG kullanmaz). */
export function energyMonthly(s: GameState): void {
  const e = (s.energy ??= { price: 1, hist: [] }), mi = Math.floor(s.clock.day / 30), month = dateOf(s.clock.day).month, winter = month === 12 || month <= 2 ? 0.03 : 0, crisis = s.macro.regime === 'kriz' ? -0.05 : s.macro.regime === 'asiri_isinma' ? 0.03 : 0;
  e.price = +clamp(e.price + (1 - e.price) * 0.14 + (hash01(mi * 131 + 7) - 0.5) * 0.12 + winter + crisis, 0.6, 1.6).toFixed(3); e.hist.push(e.price); if (e.hist.length > 36) e.hist.shift();
}
const MWH_PER_MW = { gunes: 150, ruzgar: 220 } as const;
/** Üretim (MWh/ay): kapasite × mevsim × şehir; arızalı ve bakım aylarında düşer. */
export function productionMWh(s: GameState, v: Venture, day = s.clock.day): number {
  if (v.kind !== 'gunes' && v.kind !== 'ruzgar') return 0; if (day < v.readyDay || v.brokenUntil) return 0;
  return v.size * MWH_PER_MW[v.kind] * seasonOf(v, dateOf(day).month) * plantEff(s, v) * (maintMonth(v) === dateOf(day).month ? 0.4 : 1);
}
export const consumptionMWh = (v: Venture): number => (OPS_KINDS.includes(v.kind) && v.kind !== 'site' ? (v.capex / 100 / 1e6) * 1.2 : 0);
export const maintMonth = (v: Venture): number => 1 + (v.id % 12);
export const plantAge = (s: GameState, v: Venture): number => Math.max(0, (s.clock.day - v.openedDay) / 365);
export const PLANT_LIFE = 25;
export const plantEff = (s: GameState, v: Venture): number => (plantAge(s, v) >= PLANT_LIFE ? 0 : Math.max(0.5, 1 - (v.kind === 'gunes' ? 0.006 : 0.004) * plantAge(s, v)));
/** Grubun kendi santral üretimiyle karşıladığı elektrik oranı (0–1): işletmelerin elektrik gideri bu oranda düşer. */
export function selfCoverage(s: GameState): { prod: number; cons: number; coverage: number } {
  let prod = 0, cons = 0; for (const v of s.ventures) { prod += productionMWh(s, v); cons += consumptionMWh(v); }
  return { prod, cons, coverage: cons > 0 ? Math.min(1, prod / cons) : 0 };
}
export const storageBonus = (s: GameState, v: Venture): number => { if (v.kind !== 'gunes' && v.kind !== 'ruzgar') return 0; const mwh = s.ventures.filter((x) => x.kind === 'depolama' && x.city === v.city && s.clock.day >= x.readyDay).reduce((a, x) => a + x.size, 0); return 0.04 * Math.min(1, mwh / Math.max(1, v.size)); };

export interface MonthResult { revenue: Money; cost: Money; occ: number; broke: boolean }
export function ventureMonth(s: GameState, v: Venture, day = s.clock.day): MonthResult {
  const info = VENTURE_INFO[v.kind], month = dateOf(day).month, mi = Math.floor(day / 30), ops = opsOf(v), sat = v.sat ?? 65;
  const infl = s.costIndex / v.ci0, mod = divisionMod(s, info.div);
  const baseRev = (v.capex * info.rev) / 12, fixed = (v.capex * info.rev * info.opex) / 12;
  const noise = 1 + (hash01(v.id * 977 + mi) - 0.5) * 0.12;
  let occ = 1, revenue: number, broke = false, extra = 0, cost: number;
  const base = OCC_BASE[v.kind];
  if (base !== undefined) {
    const [lo, hi] = OCC_BOUNDS[v.kind]!, priceEl = clamp(Math.pow(ops.price, -1.2), 0.55, 1.45), sEff = 1 + 0.002 * (sat - 65);
    occ = clamp(base * demandF(s) * seasonOf(v, month) * noise * priceEl * ADS_EFF[ops.ads]! * sEff, lo, hi); revenue = baseRev * (occ / base) * ops.price;
    const mgrCut = ops.mgr ? 1 - 0.04 * (ops.mgr.skill / 80) : 1, elec = 0.08 * (1 - 0.7 * selfCoverage(s).coverage);
    cost = fixed * STAFF_COST[ops.staff - 1]! * mgrCut * (0.92 + elec) * mod.opex + baseRev * ADS_COST[ops.ads]! + (ops.mgr?.salary ?? 0) / infl;
  } else if (v.kind === 'gunes' || v.kind === 'ruzgar') {
    const staffMul = [1.4, 1, 0.7][ops.staff - 1]!, storage = s.ventures.some((x) => x.kind === 'depolama' && x.city === v.city && day >= x.readyDay) ? 0.7 : 1;
    broke = hash01(v.id * 31 + mi * 7) < (v.kind === 'ruzgar' ? 0.05 : 0.02) * staffMul * storage;
    const age = plantEff(s, v), maint = maintMonth(v) === month ? 0.4 : 1, spot = v.ppa && v.ppa.until > day ? v.ppa.price : energyPrice(s), sc = selfCoverage(s), sold = sc.prod > 0 ? 1 - Math.min(1, sc.cons / sc.prod) : 1;
    occ = broke ? 0 : seasonOf(v, month) * noise * age * maint; revenue = broke ? 0 : baseRev * occ * spot * (1 + storageBonus(s, v)) * sold;
    if (broke) extra = v.capex * (v.kind === 'ruzgar' ? 0.015 : 0.008);
    cost = fixed * mod.opex * STAFF_COST[ops.staff - 1]! + extra;
  } else if (v.kind === 'depolama') {
    const spread = 1 + 0.9 * Math.abs(energyPrice(s) - 1) + (hash01(v.id * 53 + mi) - 0.5) * 0.1; occ = noise * spread; revenue = baseRev * occ; cost = fixed * mod.opex * STAFF_COST[ops.staff - 1]!;
  } else if (v.kind === 'site') {
    occ = noise; revenue = baseRev * occ * (1 + 0.04 * (ops.staff - 2)) * (0.9 + 0.2 * sat / 100); cost = fixed * mod.opex * STAFF_COST[ops.staff - 1]!;
  } else { occ = (0.8 + v.size / 200) * demandF(s) * noise; revenue = baseRev * occ; cost = fixed * mod.opex; }
  return { revenue: Math.round(revenue * infl * mod.rev), cost: Math.round(cost * infl), occ, broke };
}

const REV_CAT: Record<VentureKind, string> = { otel: 'isletme_gelir', avm: 'isletme_gelir', is_merkezi: 'isletme_gelir', ofis: 'isletme_gelir', restoran: 'isletme_gelir', otopark: 'isletme_gelir', tatil: 'isletme_gelir', site: 'isletme_gelir', gunes: 'enerji_gelir', ruzgar: 'enerji_gelir', depolama: 'enerji_gelir', bagli: 'bagli_gelir' };
const COST_CAT: Record<VentureKind, string> = { otel: 'isletme_gider', avm: 'isletme_gider', is_merkezi: 'isletme_gider', ofis: 'isletme_gider', restoran: 'isletme_gider', otopark: 'isletme_gider', tatil: 'isletme_gider', site: 'isletme_gider', gunes: 'enerji_gider', ruzgar: 'enerji_gider', depolama: 'enerji_gider', bagli: 'isletme_gider' };

export function ventureValue(s: GameState, v: Venture): Money {
  const years = Math.max(0, (s.clock.day - v.openedDay) / 365), f = Math.max(VENTURE_INFO[v.kind].floor, 1 - 0.012 * years);
  return Math.round(v.capex * f);
}
export const venturesValue = (s: GameState): Money => s.ventures.reduce((a, v) => a + ventureValue(s, v), 0);
export const ventureSalePrice = (s: GameState, v: Venture): Money => Math.round(ventureValue(s, v) * 0.92);

/** Her ay: enerji fiyatı güncellenir; gelir/gider deftere işlenir, memnuniyet ve geçmiş güncellenir, genel müdür maaşı ödenir. */
export function venturesMonthly(s: GameState, events: GameEvent[]): void {
  if (!s.company) return; energyMonthly(s);
  if (!s.ventures.length && !Object.values(s.holding.gm).some(Boolean)) return;
  const day = s.clock.day;
  for (const v of s.ventures) {
    if (day < v.readyDay) continue;
    const r = ventureMonth(s, v);
    if (r.revenue > 0) post(s, REV_CAT[v.kind], r.revenue, { memo: v.name });
    if (r.cost > 0) post(s, COST_CAT[v.kind], -r.cost, { memo: v.name });
    v.last = { revenue: r.revenue, cost: r.cost, occ: r.occ, day }; v.total.revenue += r.revenue; v.total.cost += r.cost;
    (v.hist ??= []).push({ day, rev: r.revenue, cost: r.cost, occ: r.occ }); if (v.hist.length > 12) v.hist.shift();
    // memnuniyet: personel, reklam, fiyat, müdür becerisi ve kaliteye göre hedefe yaklaşır
    if (OPS_KINDS.includes(v.kind)) { const o = opsOf(v), target = clamp(50 + 12 * (o.staff - 2) + (o.mgr ? o.mgr.skill * 0.2 : 0) + v.quality * 4 - 30 * (o.price - 1) + (o.ads - 1) * 2, 10, 95); v.sat = Math.round(clamp((v.sat ?? 65) + (target - (v.sat ?? 65)) * 0.3, 0, 100)); }
    if (r.broke) { v.brokenUntil = day + 30; events.push({ type: 'VENTURE_BROKE', day, data: { id: v.id, name: v.name } }); } else v.brokenUntil = undefined;
    if ((v.kind === 'gunes' || v.kind === 'ruzgar') && v.ppa && v.ppa.until <= day) { delete v.ppa; events.push({ type: 'PPA_ENDED', day, data: { id: v.id, name: v.name } }); }
  }
  for (const d of ['isletme', 'enerji', 'altyapi'] as const) if (s.holding.gm[d]) post(s, d === 'isletme' ? 'isletme_gider' : d === 'enerji' ? 'enerji_gider' : 'altyapi_gider', -Math.round(TL(GM_COST_TL) * s.costIndex), { memo: 'Genel müdür maaşı' });
}

// ---------------- komutlar için doğrulama/uygulama ----------------
const QUALITY_ID: Record<string, number> = { ekonomik: 0, standart: 1, premium: 2, luks: 3 };
export function operateError(s: GameState, p: Project | undefined): string | null {
  if (!s.company) return 'Şirket yok.'; if (!p) return 'Proje bulunamadı.';
  if (!['otel', 'avm', 'is_merkezi', 'ofis'].includes(p.type)) return 'Yalnızca otel, AVM, iş merkezi ve ofis binaları işletmeye alınabilir.';
  if (p.status !== 'tamamlandi') return 'Proje henüz tamamlanmadı (ya da zaten satıldı).';
  if (p.operatedBy !== undefined) return 'Bu proje zaten işletmede.';
  if (s.units.some((u) => u.projectId === p.id && u.status !== 'bos')) return 'Satılmış ya da kaporalı birim var; işletmeye alınamaz.';
  if (s.company.level < VENTURE_INFO[p.type as 'otel'].minLevel) return `Şirket seviyesi ${VENTURE_INFO[p.type as 'otel'].minLevel} gerekir.`;
  if (s.ventures.length >= MAX_VENTURES) return 'İş kolu sınırına ulaşıldı.';
  return null;
}
export function operateProject(s: GameState, p: Project, events: GameEvent[]): Venture {
  const kind = p.type as 'otel' | 'avm' | 'is_merkezi' | 'ofis', rooms = Math.max(12, Math.round(p.satilabilir / 32));
  const v: Venture = { id: s.nextId++, kind, name: p.name, city: p.cityId, openedDay: s.clock.day, readyDay: s.clock.day, capex: p.result?.cost ?? p.budget.total, size: kind === 'otel' ? rooms : Math.round(p.satilabilir), quality: QUALITY_ID[p.quality] ?? 1, ci0: s.costIndex, projectId: p.id, last: { revenue: 0, cost: 0, occ: 0, day: s.clock.day }, total: { revenue: 0, cost: 0 } };
  s.ventures.push(v); p.operatedBy = v.id; s.units = s.units.filter((u) => u.projectId !== p.id);
  events.push({ type: 'VENTURE_OPENED', day: s.clock.day, data: { id: v.id, kind, name: v.name } }); return v;
}

export function buildError(s: GameState, kind: BuildKind, city: string, tier: number): string | null {
  const c = s.company; if (!c) return 'Şirket yok.'; if (c.bankrupt) return 'Şirket iflas etti.';
  if (!BUILD_TIERS[kind]) return 'Geçersiz tür.'; if (c.level < VENTURE_INFO[kind].minLevel) return `Şirket seviyesi ${VENTURE_INFO[kind].minLevel} gerekir.`;
  if (!s.openCities.includes(city)) return 'Bu ilde şubeniz yok.'; if (kind === 'tatil' && !COAST_ONLY.has(city)) return 'Tatil köyü yalnızca sahil illerinde (Antalya, İzmir) kurulur.';
  const t = BUILD_TIERS[kind][tier]; if (!t) return 'Geçersiz boyut.';
  if (s.ventures.length >= MAX_VENTURES) return 'İş kolu sınırına ulaşıldı.';
  if (c.cash < buildCapex(s, kind, tier)) return 'Yatırım için yeterli nakit yok.';
  return null;
}
export const buildCapex = (s: GameState, kind: BuildKind, tier: number): Money => Math.round(TL(BUILD_TIERS[kind][tier]![1] * 1_000_000) * s.costIndex * (1 - (kind === 'gunes' || kind === 'ruzgar' || kind === 'depolama' ? sectorDiscount(s, 'enerji') : 0)));
export const energyCapex = (s: GameState, kind: 'gunes' | 'ruzgar', tier: number): Money => buildCapex(s, kind, tier);
export function buildEnergy(s: GameState, kind: BuildKind, city: string, tier: number, cityLabel: string, events: GameEvent[]): Venture {
  const capex = buildCapex(s, kind, tier), size = BUILD_TIERS[kind][tier]![0];
  post(s, 'yatirim_isletme', -capex, { memo: `${VENTURE_INFO[kind].label} yatırımı` });
  const v: Venture = { id: s.nextId++, kind, name: `${cityLabel} ${size} ${SIZE_UNIT[kind]} ${VENTURE_INFO[kind].label}`, city, openedDay: s.clock.day, readyDay: s.clock.day + BUILD_DAYS[kind], capex, size, quality: 1, ci0: s.costIndex, last: { revenue: 0, cost: 0, occ: 0, day: s.clock.day }, total: { revenue: 0, cost: 0 }, ops: { ...DEFAULT_OPS }, sat: 65 };
  s.ventures.push(v); events.push({ type: 'VENTURE_OPENED', day: s.clock.day, data: { id: v.id, kind, name: v.name } }); return v;
}

/** Site yönetimi: satılmış konut projelerinin yönetimini üstlenerek aidat ve hizmet geliri elde edilir (kurulum bedeli satış gelirinin %2'si). */
export const SITE_TYPES = ['apartman', 'site', 'rezidans', 'luks', 'villa'];
export const soldUnitsOf = (s: GameState, p: Project) => s.units.filter((u) => u.projectId === p.id && u.status === 'satildi' && !u.landlord && (u.price ?? 0) > 0);
export function manageSiteError(s: GameState, p: Project | undefined): string | null {
  if (!s.company) return 'Şirket yok.'; if (!p) return 'Proje bulunamadı.'; if (s.company.level < VENTURE_INFO.site.minLevel) return `Şirket seviyesi ${VENTURE_INFO.site.minLevel} gerekir.`;
  if (!SITE_TYPES.includes(p.type)) return 'Yalnızca konut projelerinin yönetimi üstlenilebilir.'; if (p.managedBy !== undefined) return 'Bu sitenin yönetimi zaten sizde.'; if (p.operatedBy !== undefined) return 'Bu proje işletmede.';
  const sold = soldUnitsOf(s, p); if (sold.length < 8) return 'Yönetim için en az 8 satılmış daire gerekir.'; if (s.ventures.length >= MAX_VENTURES) return 'İş kolu sınırına ulaşıldı.';
  const setup = Math.round(sold.reduce((a, u) => a + (u.price ?? 0), 0) * 0.02); if (s.company.cash < setup) return 'Kurulum bedeli için yeterli nakit yok.'; return null;
}
export function manageSite(s: GameState, p: Project, events: GameEvent[]): Venture {
  const sold = soldUnitsOf(s, p), setup = Math.round(sold.reduce((a, u) => a + (u.price ?? 0), 0) * 0.02);
  post(s, 'yatirim_isletme', -setup, { memo: `Site yönetimi kurulumu: ${p.name}` });
  const v: Venture = { id: s.nextId++, kind: 'site', name: `${p.name} yönetimi`, city: p.cityId, openedDay: s.clock.day, readyDay: s.clock.day, capex: setup, size: sold.length, quality: QUALITY_ID[p.quality] ?? 1, ci0: s.costIndex, projectRef: p.id, last: { revenue: 0, cost: 0, occ: 0, day: s.clock.day }, total: { revenue: 0, cost: 0 }, ops: { ...DEFAULT_OPS }, sat: Math.round(p.result?.qualityScore ?? 65) } as Venture;
  s.ventures.push(v); p.managedBy = v.id; events.push({ type: 'VENTURE_OPENED', day: s.clock.day, data: { id: v.id, kind: 'site', name: v.name } }); return v;
}
export function opsError(s: GameState, id: number, o: { price?: number; staff?: number; ads?: number }): string | null {
  const v = s.ventures.find((x) => x.id === id); if (!v) return 'İş kolu bulunamadı.'; if (!OPS_KINDS.includes(v.kind) && v.kind !== 'gunes' && v.kind !== 'ruzgar' && v.kind !== 'depolama') return 'Bu iş kolunun işletme ayarı yok.';
  if (o.price !== undefined && (!(o.price >= 0.7 && o.price <= 1.4) || !OPS_KINDS.includes(v.kind))) return 'Fiyat çarpanı %70–%140 arasında olmalı (yalnızca işletmeler).';
  if (o.staff !== undefined && ![1, 2, 3].includes(o.staff)) return 'Personel düzeyi 1–3 olmalı.'; if (o.ads !== undefined && (![0, 1, 2, 3].includes(o.ads) || !OPS_KINDS.includes(v.kind))) return 'Reklam düzeyi 0–3 olmalı (yalnızca işletmeler).'; return null;
}
export function setOps(s: GameState, id: number, o: { price?: number; staff?: number; ads?: number }): void {
  const v = s.ventures.find((x) => x.id === id)!, cur = { ...opsOf(v) }; if (o.price !== undefined) cur.price = +o.price.toFixed(2); if (o.staff !== undefined) cur.staff = o.staff; if (o.ads !== undefined) cur.ads = o.ads; v.ops = cur;
}
export const ventureCandidates = (s: GameState, v: Venture) => [0, 1, 2].map((i) => makeExec(Math.floor(s.clock.day / 90) * 1000 + v.id * 10 + i, `${VENTURE_INFO[v.kind].label} müdürü`, s.costIndex, s.clock.day));
export function hireMgrError(s: GameState, id: number, candId: number): string | null {
  const v = s.ventures.find((x) => x.id === id); if (!v || !OPS_KINDS.includes(v.kind)) return 'İşletme bulunamadı.'; if (opsOf(v).mgr) return 'Önce mevcut müdürü görevden alın.';
  const c = ventureCandidates(s, v).find((x) => x.id === candId); if (!c) return 'Aday bulunamadı.'; if (s.company!.cash < c.salary * 2) return 'İşe giriş masrafı için yeterli nakit yok.'; return null;
}
export function hireVentureMgr(s: GameState, id: number, candId: number): string | null {
  const err = hireMgrError(s, id, candId); if (err) return err; const v = s.ventures.find((x) => x.id === id)!, c = ventureCandidates(s, v).find((x) => x.id === candId)!;
  post(s, 'isletme_gider', -c.salary * 2, { memo: `${v.name}: müdür işe giriş` }); v.ops = { ...opsOf(v), mgr: { ...c, since: s.clock.day } }; return null;
}
export function fireVentureMgr(s: GameState, id: number): string | null {
  const v = s.ventures.find((x) => x.id === id); if (!v || !opsOf(v).mgr) return 'Müdür yok.'; const sev = opsOf(v).mgr!.salary * 3; post(s, 'isletme_gider', -sev, { memo: `${v.name}: müdür tazminatı` }); v.ops = { ...opsOf(v), mgr: null }; return null;
}
export function ppaError(s: GameState, id: number, months: number): string | null {
  const v = s.ventures.find((x) => x.id === id); if (!v || (v.kind !== 'gunes' && v.kind !== 'ruzgar')) return 'Yalnızca güneş ve rüzgâr santralleri sözleşmeli satış yapabilir.'; if (![0, 12, 24].includes(months)) return 'Süre 12 ya da 24 ay (0 = iptal) olmalı.';
  if (months > 0 && v.ppa && v.ppa.until > s.clock.day) return 'Zaten sözleşmeli satış var.'; return null;
}
export function setPPA(s: GameState, id: number, months: number): void { const v = s.ventures.find((x) => x.id === id)!; if (months === 0) delete v.ppa; else v.ppa = { price: +(energyPrice(s) * 0.97).toFixed(3), until: s.clock.day + months * 30 }; }

export function sellError(s: GameState, id: number): string | null { return s.company ? (s.ventures.some((v) => v.id === id) ? null : 'İş kolu bulunamadı.') : 'Şirket yok.'; }
export function sellVenture(s: GameState, id: number, events: GameEvent[]): Money {
  const v = s.ventures.find((x) => x.id === id)!, price = ventureSalePrice(s, v);
  post(s, 'yatirim_isletme', price, { memo: `${v.name} satışı` }); s.ventures = s.ventures.filter((x) => x.id !== id);
  if (v.projectId !== undefined) { const p = s.projects.find((x) => x.id === v.projectId); if (p) { p.status = 'satildi'; p.operatedBy = undefined; p.result = { ...p.result!, revenue: price, profit: price - (p.result?.cost ?? 0) + v.total.revenue - v.total.cost, soldDay: s.clock.day }; s.company!.stats.sold++; } }
  if (v.projectRef !== undefined) { const sp = s.projects.find((x) => x.id === v.projectRef); if (sp && sp.managedBy === v.id) sp.managedBy = undefined; }
  events.push({ type: 'VENTURE_SOLD', day: s.clock.day, data: { id, price } }); return price;
}

export function strategyError(s: GameState, div: string, st: string): string | null {
  if (!s.company) return 'Şirket yok.'; if (s.company.level < 6) return 'Holding yönetimi için şirket seviyesi 6 gerekir.';
  if (!['isletme', 'enerji', 'altyapi'].includes(div)) return 'Geçersiz bölüm.'; if (!['buyume', 'dengeli', 'temkinli'].includes(st)) return 'Geçersiz strateji.'; return null;
}
