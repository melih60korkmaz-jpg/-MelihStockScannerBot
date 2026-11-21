import { focusVenture } from './control';
import { TL, type Money } from '../core/money';
import { dateOf } from '../core/calendar';
import type { GameEvent, GameState, Project, Strategy, Venture, VentureKind } from '../core/types';
import { post } from './ledger';

/**
 * İş kolları: otel ve AVM işletmeciliği, güneş/rüzgâr enerji santralleri ve satın alınan bağlı şirketler.
 * Gelir ve gider her ay deftere işlenir; gelir mevsime, şehre, ekonomik rejime, güvene ve itibara; gider sabit kalır.
 * Rastgelelik RNG akışı tüketmez: ay ve iş kolu kimliğinden türeyen sabit bir gürültü kullanılır (mevcut oyun dengesi bozulmaz).
 */
export const VENTURE_INFO: Record<VentureKind, { label: string; ico: string; rev: number; opex: number; floor: number; minLevel: number; div: 'isletme' | 'enerji' | 'bagli' }> = {
  otel: { label: 'Otel', ico: '🏨', rev: 0.36, opex: 0.62, floor: 0.7, minLevel: 4, div: 'isletme' },
  avm: { label: 'AVM', ico: '🏬', rev: 0.17, opex: 0.26, floor: 0.7, minLevel: 4, div: 'isletme' },
  gunes: { label: 'Güneş santrali', ico: '☀️', rev: 0.20, opex: 0.30, floor: 0.55, minLevel: 5, div: 'enerji' },
  ruzgar: { label: 'Rüzgâr santrali', ico: '🌬️', rev: 0.24, opex: 0.38, floor: 0.55, minLevel: 5, div: 'enerji' },
  bagli: { label: 'Bağlı şirket', ico: '🏛️', rev: 0.20, opex: 0.30, floor: 0.85, minLevel: 6, div: 'bagli' },
};
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
const BUILD_DAYS = { gunes: 60, ruzgar: 120 } as const;

const demandF = (s: GameState): number => (DEMAND[s.macro.regime] ?? 1) * (1 + (s.macro.confidence - 55) / 250) * (0.92 + s.company!.reputation / 600);
const seasonOf = (v: Venture, month: number): number => {
  const m = month - 1;
  switch (v.kind) {
    case 'otel': return (COAST.has(v.city) ? SEAS_TOURISM : SEAS_BUSINESS)[m]!;
    case 'avm': return SEAS_AVM[m]!;
    case 'gunes': return SEAS_SUN[m]! * (SUN_CITY[v.city] ?? 1);
    case 'ruzgar': return SEAS_WIND[m]! * (WIND_CITY[v.city] ?? 1);
    default: return 1;
  }
};
const OCC_BASE = { otel: 0.62, avm: 0.9 } as const;

/** Bölüm stratejisi ve genel müdür etkisi: [gelir çarpanı, gider çarpanı]. */
export function divisionMod(s: GameState, div: 'isletme' | 'enerji' | 'altyapi' | 'bagli'): { rev: number; opex: number } {
  if (div === 'bagli') return { rev: 1, opex: 1 };
  const st: Strategy = s.holding.strategy[div], gm = s.holding.gm[div];
  let rev = st === 'buyume' ? 1.06 : st === 'temkinli' ? 0.96 : 1, opex = st === 'buyume' ? 1.1 : st === 'temkinli' ? 0.9 : 1;
  if (gm) { rev *= 1.05; opex *= 0.97; }
  rev *= focusVenture(s);
  return { rev, opex };
}

export interface MonthResult { revenue: Money; cost: Money; occ: number; broke: boolean }
export function ventureMonth(s: GameState, v: Venture, day = s.clock.day): MonthResult {
  const info = VENTURE_INFO[v.kind], month = dateOf(day).month, mi = Math.floor(day / 30);
  const infl = s.costIndex / v.ci0, mod = divisionMod(s, info.div);
  const baseRev = (v.capex * info.rev) / 12, fixed = (v.capex * info.rev * info.opex) / 12;
  const noise = 1 + (hash01(v.id * 977 + mi) - 0.5) * 0.12;
  let occ = 1, revenue: number, broke = false, extra = 0;
  if (v.kind === 'otel' || v.kind === 'avm') {
    const base = OCC_BASE[v.kind]; occ = clamp(base * demandF(s) * seasonOf(v, month) * noise, v.kind === 'otel' ? 0.18 : 0.5, v.kind === 'otel' ? 0.96 : 0.99);
    revenue = baseRev * (occ / base);
  } else if (v.kind === 'gunes' || v.kind === 'ruzgar') {
    broke = hash01(v.id * 31 + mi * 7) < (v.kind === 'ruzgar' ? 0.05 : 0.02);
    occ = broke ? 0 : seasonOf(v, month) * noise; revenue = broke ? 0 : baseRev * occ;
    if (broke) extra = v.capex * (v.kind === 'ruzgar' ? 0.015 : 0.008);
  } else { occ = (0.8 + v.size / 200) * demandF(s) * noise; revenue = baseRev * occ; }
  return { revenue: Math.round(revenue * infl * mod.rev), cost: Math.round((fixed * mod.opex + extra) * infl), occ, broke };
}

const REV_CAT: Record<VentureKind, string> = { otel: 'isletme_gelir', avm: 'isletme_gelir', gunes: 'enerji_gelir', ruzgar: 'enerji_gelir', bagli: 'bagli_gelir' };
const COST_CAT: Record<VentureKind, string> = { otel: 'isletme_gider', avm: 'isletme_gider', gunes: 'enerji_gider', ruzgar: 'enerji_gider', bagli: 'isletme_gider' };

export function ventureValue(s: GameState, v: Venture): Money {
  const years = Math.max(0, (s.clock.day - v.openedDay) / 365), f = Math.max(VENTURE_INFO[v.kind].floor, 1 - 0.012 * years);
  return Math.round(v.capex * f);
}
export const venturesValue = (s: GameState): Money => s.ventures.reduce((a, v) => a + ventureValue(s, v), 0);
export const ventureSalePrice = (s: GameState, v: Venture): Money => Math.round(ventureValue(s, v) * 0.92);

/** Her ay: gelir/gider deftere işlenir, genel müdür maaşı ödenir. */
export function venturesMonthly(s: GameState, events: GameEvent[]): void {
  if (!s.company || !s.ventures.length && !Object.values(s.holding.gm).some(Boolean)) return;
  const day = s.clock.day;
  for (const v of s.ventures) {
    if (day < v.readyDay) continue;
    const r = ventureMonth(s, v);
    if (r.revenue > 0) post(s, REV_CAT[v.kind], r.revenue, { memo: v.name });
    if (r.cost > 0) post(s, COST_CAT[v.kind], -r.cost, { memo: v.name });
    v.last = { revenue: r.revenue, cost: r.cost, occ: r.occ, day }; v.total.revenue += r.revenue; v.total.cost += r.cost;
    if (r.broke) { v.brokenUntil = day + 30; events.push({ type: 'VENTURE_BROKE', day, data: { id: v.id, name: v.name } }); } else v.brokenUntil = undefined;
  }
  for (const d of ['isletme', 'enerji', 'altyapi'] as const) if (s.holding.gm[d]) post(s, d === 'isletme' ? 'isletme_gider' : d === 'enerji' ? 'enerji_gider' : 'altyapi_gider', -Math.round(TL(GM_COST_TL) * s.costIndex), { memo: 'Genel müdür maaşı' });
}

// ---------------- komutlar için doğrulama/uygulama ----------------
const QUALITY_ID: Record<string, number> = { ekonomik: 0, standart: 1, premium: 2, luks: 3 };
export function operateError(s: GameState, p: Project | undefined): string | null {
  if (!s.company) return 'Şirket yok.'; if (!p) return 'Proje bulunamadı.';
  if (p.type !== 'otel' && p.type !== 'avm') return 'Yalnızca otel ve AVM işletmeye alınabilir.';
  if (p.status !== 'tamamlandi') return 'Proje henüz tamamlanmadı (ya da zaten satıldı).';
  if (p.operatedBy !== undefined) return 'Bu proje zaten işletmede.';
  if (s.units.some((u) => u.projectId === p.id && u.status !== 'bos')) return 'Satılmış ya da kaporalı birim var; işletmeye alınamaz.';
  if (s.company.level < VENTURE_INFO[p.type].minLevel) return `Şirket seviyesi ${VENTURE_INFO[p.type].minLevel} gerekir.`;
  if (s.ventures.length >= MAX_VENTURES) return 'İş kolu sınırına ulaşıldı.';
  return null;
}
export function operateProject(s: GameState, p: Project, events: GameEvent[]): Venture {
  const kind = p.type as 'otel' | 'avm', rooms = Math.max(12, Math.round(p.satilabilir / 32));
  const v: Venture = { id: s.nextId++, kind, name: p.name, city: p.cityId, openedDay: s.clock.day, readyDay: s.clock.day, capex: p.result?.cost ?? p.budget.total, size: kind === 'otel' ? rooms : Math.round(p.satilabilir), quality: QUALITY_ID[p.quality] ?? 1, ci0: s.costIndex, projectId: p.id, last: { revenue: 0, cost: 0, occ: 0, day: s.clock.day }, total: { revenue: 0, cost: 0 } };
  s.ventures.push(v); p.operatedBy = v.id; s.units = s.units.filter((u) => u.projectId !== p.id);
  events.push({ type: 'VENTURE_OPENED', day: s.clock.day, data: { id: v.id, kind, name: v.name } }); return v;
}

export function buildError(s: GameState, kind: 'gunes' | 'ruzgar', city: string, tier: number): string | null {
  const c = s.company; if (!c) return 'Şirket yok.'; if (c.bankrupt) return 'Şirket iflas etti.';
  if (c.level < VENTURE_INFO[kind].minLevel) return `Şirket seviyesi ${VENTURE_INFO[kind].minLevel} gerekir.`;
  if (!s.openCities.includes(city)) return 'Bu ilde şubeniz yok.';
  const t = ENERGY_TIERS[kind][tier]; if (!t) return 'Geçersiz boyut.';
  if (s.ventures.length >= MAX_VENTURES) return 'İş kolu sınırına ulaşıldı.';
  if (c.cash < energyCapex(s, kind, tier)) return 'Yatırım için yeterli nakit yok.';
  return null;
}
export const energyCapex = (s: GameState, kind: 'gunes' | 'ruzgar', tier: number): Money => Math.round(TL(ENERGY_TIERS[kind][tier]![1] * 1_000_000) * s.costIndex);
export function buildEnergy(s: GameState, kind: 'gunes' | 'ruzgar', city: string, tier: number, cityLabel: string, events: GameEvent[]): Venture {
  const capex = energyCapex(s, kind, tier), mw = ENERGY_TIERS[kind][tier]![0];
  post(s, 'yatirim_isletme', -capex, { memo: `${VENTURE_INFO[kind].label} yatırımı` });
  const v: Venture = { id: s.nextId++, kind, name: `${cityLabel} ${mw} MW ${VENTURE_INFO[kind].label}`, city, openedDay: s.clock.day, readyDay: s.clock.day + BUILD_DAYS[kind], capex, size: mw, quality: 1, ci0: s.costIndex, last: { revenue: 0, cost: 0, occ: 0, day: s.clock.day }, total: { revenue: 0, cost: 0 } };
  s.ventures.push(v); events.push({ type: 'VENTURE_OPENED', day: s.clock.day, data: { id: v.id, kind, name: v.name } }); return v;
}

export function sellError(s: GameState, id: number): string | null { return s.company ? (s.ventures.some((v) => v.id === id) ? null : 'İş kolu bulunamadı.') : 'Şirket yok.'; }
export function sellVenture(s: GameState, id: number, events: GameEvent[]): Money {
  const v = s.ventures.find((x) => x.id === id)!, price = ventureSalePrice(s, v);
  post(s, 'yatirim_isletme', price, { memo: `${v.name} satışı` }); s.ventures = s.ventures.filter((x) => x.id !== id);
  if (v.projectId !== undefined) { const p = s.projects.find((x) => x.id === v.projectId); if (p) { p.status = 'satildi'; p.operatedBy = undefined; p.result = { ...p.result!, revenue: price, profit: price - (p.result?.cost ?? 0) + v.total.revenue - v.total.cost, soldDay: s.clock.day }; s.company!.stats.sold++; } }
  events.push({ type: 'VENTURE_SOLD', day: s.clock.day, data: { id, price } }); return price;
}

export function strategyError(s: GameState, div: string, st: string): string | null {
  if (!s.company) return 'Şirket yok.'; if (s.company.level < 6) return 'Holding yönetimi için şirket seviyesi 6 gerekir.';
  if (!['isletme', 'enerji', 'altyapi'].includes(div)) return 'Geçersiz bölüm.'; if (!['buyume', 'dengeli', 'temkinli'].includes(st)) return 'Geçersiz strateji.'; return null;
}
