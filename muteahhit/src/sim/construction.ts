import { rushMult } from './gold';
import { logStock } from './supplyx';
import { projectMods } from './control';
import { markLandlord } from './deals';
import { traitEff, traitOf } from './staff';
import { dateOf } from '../core/calendar';
import { gauss, rand, randInt } from '../core/rng';
import { TL, type Money } from '../core/money';
import type { BuildState, GameEvent, GameState, Project } from '../core/types';
import { SOIL_COST, STAGES } from '../data';
import { post } from './ledger';
import { autoBuy, stageNeeds, stockQty } from './materials';
import { useMachines } from './machines';
import { checkAllSold, defaultSales, deliverUnits, generateUnits } from './sales';

const TOTAL_TIME = STAGES.reduce((a, s) => a + s.time, 0);
const SPLIT = { malzeme: 0.55, insaat: 0.35, makine: 0.1 } as const;
const TIER_Q: Record<string, number> = { ekonomik: 62, standart: 74, premium: 86, luks: 94 };
export const LAST_STAGE = STAGES.length - 1; // 17
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const FIELD = new Set(['isci', 'usta', 'kalipci', 'demirci', 'elektrikci', 'tesisatci', 'santiye_sefi']);

export const activeProjects = (s: GameState) => s.projects.filter((p) => p.status === 'insaat');

/** Kalan tahmini gün (aşama süreleri toplamı). Şantiye ekranı ve proje kartları aynı hesabı kullanır. */
export function remainingDays(p: Project): number { const b = p.build; if (!b) return 0; const d = stageDays(p); let r = (1 - b.progress) * d[b.stage]!; for (let k = b.stage + 1; k < 18; k++) r += d[k]!; return r; }
export function stageDays(p: Project): number[] {
  const total = Math.max(60, p.expected.months * 30);
  return STAGES.map((st) => (total * st.time) / TOTAL_TIME);
}

/** Saha ekibi kapasitesi (kişi eşdeğeri): bu projeye atananlar tam, atanmamışlar (ortak havuz) aktif projelere bölünür; moral verimi etkiler. */
export function crewCapacity(s: GameState, stageId: string, projectId?: number): number {
  const concrete = stageId === 'temel' || stageId === 'betonarme' || stageId === 'katlar';
  const w: Record<string, number> = { isci: 1, usta: 1.6, kalipci: concrete ? 1.6 : 1, demirci: concrete ? 1.6 : 1, elektrikci: stageId === 'tesisat' ? 1.7 : 1, tesisatci: stageId === 'tesisat' ? 1.7 : 1 };
  const nActive = Math.max(1, activeProjects(s).length); let cap = 0, chief = false;
  for (const x of s.staff) {
    if (x.project !== undefined && x.project !== projectId) continue;
    const share = x.project === undefined ? 1 / nActive : 1;
    cap += (w[x.type] ?? 0) * (0.8 + 0.4 * (x.experience / 100)) * (0.85 + 0.3 * (x.morale / 100)) * share * traitEff(x);
    if (x.type === 'santiye_sefi') chief = true;
  }
  return cap * (chief ? 1.15 : 1);
}
export function crewRatio(s: GameState, p: Project, stageId: string): number { return crewCapacity(s, stageId, p.id) / Math.max(2, p.brut / 70); }
export function crewFactor(s: GameState, p: Project, stageId: string): number {
  const r = crewRatio(s, p, stageId);
  return r < 1 ? 0.55 + 0.45 * r : Math.min(1.3, 1 + (r - 1) * 0.3);
}
const hasRole = (s: GameState, role: string) => s.staff.some((x) => x.type === role);

/** Hava durumu oyundan kaldırıldı: şantiyeler her zaman açık havada çalışır (kayıt uyumu için `weather` alanı 'acik' olarak tutulur). */
export function updateWeather(s: GameState): void { for (const city of Object.keys(s.weather)) s.weather[city] = 'acik'; }

export function startConstruction(s: GameState, p: Project): GameEvent[] {
  const parcel = s.parcels.find((x) => x.id === p.parcelId)!;
  const total0 = p.budget.total - p.budget.soil;
  const stageBudget: Money[] = STAGES.map((st) => Math.round((total0 * st.cost) / 100));
  const soilPlanned = parcel.soilKnown ? (SOIL_COST[parcel.soil] ?? 1) : 1.1;
  stageBudget[6] = stageBudget[6]! + Math.round((p.budget.soil * 3) / 13); stageBudget[7] = stageBudget[7]! + Math.round((p.budget.soil * 10) / 13);
  const b: BuildState = {
    stage: 1, progress: 0, startDay: s.clock.day, stageStartDay: s.clock.day, stageStarted: false, stageBudget, stageMult: 1, soilPlanned, permitMult: 1,
    priceBase: { mat: s.macro.materialIndex, cost: s.costIndex }, spent: 0, unpaid: 0, unpaidParts: { malzeme: 0, insaat: 0, makine: 0 },
    qualitySum: 0, qualityW: 0, stalled: null, stalledDays: 0, soilExtra: 0,
  };
  s.weather[p.cityId] ??= 'acik'; p.status = 'insaat'; p.build = b; p.sales = defaultSales(); if (!p.contract) { s.units.push(...generateUnits(s, p)); markLandlord(s, p, parcel); }
  return [{ type: 'PROJECT_STARTED', day: s.clock.day, data: { projectId: p.id } }];
}

/** Ödemeyi tahakkuktan nakite çevirir (haftalık / teslimde). */
export function settle(s: GameState, p: Project): void {
  const b = p.build; if (!b || b.unpaid <= 0) return;
  let paid = 0;
  for (const k of ['malzeme', 'insaat', 'makine'] as const) {
    const amt = Math.round(b.unpaidParts[k]); if (amt > 0) { post(s, k, -amt, { projectId: p.id, memo: p.name }); paid += amt; }
    b.unpaidParts[k] = 0;
  }
  b.spent += paid; b.unpaid = 0;
}

const priceFactor = (s: GameState, b: BuildState) => 0.6 * (s.macro.materialIndex / b.priceBase.mat) + 0.4 * (s.costIndex / b.priceBase.cost);

function onStageStart(s: GameState, p: Project, b: BuildState, events: GameEvent[]): void {
  const st = STAGES[b.stage]!;
  b.stageStarted = true; b.stageStartDay = s.clock.day; b.stageMult = +(0.96 + rand(s.rng, 'construction') * 0.11).toFixed(3); b.qAdj = 0;
  if (st.permit) b.permitMult = +(0.8 + rand(s.rng, 'construction') * 1.0).toFixed(2);
  if (st.id === 'hafriyat') {
    const parcel = s.parcels.find((x) => x.id === p.parcelId)!;
    if (!parcel.soilKnown) {
      parcel.soilKnown = true;
      const actual = SOIL_COST[parcel.soil] ?? 1, total0 = b.stageBudget.reduce((a, x) => a + x, 0) - Math.round(p.budget.soil);
      const extra = Math.round(total0 * 0.13 * (actual - b.soilPlanned));
      b.soilExtra = extra; b.stageBudget[6] = b.stageBudget[6]! + Math.round((extra * 3) / 13); b.stageBudget[7] = b.stageBudget[7]! + Math.round((extra * 10) / 13);
      events.push({ type: 'SOIL_REVEALED', day: s.clock.day, ...(Math.abs(extra) > 0 ? { pause: extra > 0 } : {}), data: { projectId: p.id, soil: parcel.soil, extra } });
    }
  }
  autoBuy(s, p, events); // yeni aşamanın malzemesini sipariş et
}

function completeStage(s: GameState, p: Project, b: BuildState, crew: number, events: GameEvent[]): void {
  const st = STAGES[b.stage]!;
  if (b.stage >= 6) { // yapım aşamaları kaliteyi belirler: kademe + ekip + malzeme kalitesi (A +6, C −6)
    const q = clamp((TIER_Q[p.quality] ?? 74) + (crew - 1) * 8 + (b.qAdj ?? 0) * 6 + projectMods(s, p).q + gauss(s.rng, 'construction') * 3, 30, 100);
    b.qualitySum += q * st.cost; b.qualityW += st.cost;
  }
  events.push({ type: 'STAGE_COMPLETED', day: s.clock.day, data: { projectId: p.id, stage: b.stage, id: st.id } });
  onStageDone(s, p, b.stage); b.stage++; b.progress = 0; b.stageStarted = false;
}

const SAFETY_MULT = { dusuk: 1.8, normal: 1, yuksek: 0.45 } as const;
function maybeAccident(s: GameState, p: Project, b: BuildState, cap: number, weather: string, events: GameEvent[]): boolean {
  const c = s.company!, workers = Math.min(25, cap), chief = s.staff.some((x) => x.type === 'santiye_sefi');
  const careful = Math.min(1.6, Math.max(0.7, s.staff.reduce((m, x) => (FIELD.has(x.type) ? m * (traitOf(x).id === 'dikkatli' ? 0.96 : traitOf(x).id === 'dikkatsiz' ? 1.06 : 1) : m), 1)));
  const prob = 0.0005 * Math.sqrt(workers + 1) * SAFETY_MULT[c.safety] * (chief ? 0.7 : 1) * careful * projectMods(s, p).risk;
  if (rand(s.rng, 'construction') >= prob) return false;
  const days = randInt(s.rng, 'construction', 3, 9), comp = Math.round(TL(randInt(s.rng, 'construction', 60, 260) * 1000) * s.costIndex);
  b.accidentUntil = s.clock.day + days; b.stalled = 'kaza';
  post(s, 'insaat', -comp, { projectId: p.id, memo: 'İş kazası tazminat ve sağlık' });
  for (const x of s.staff) if (FIELD.has(x.type)) x.morale = clamp(x.morale - 8, 0, 100);
  c.reputation = clamp(c.reputation - 2, 0, 100); c.lastAccidentDay = s.clock.day;
  events.push({ type: 'ACCIDENT', day: s.clock.day, pause: true, data: { projectId: p.id, days, cost: comp } });
  return true;
}

function stall(s: GameState, p: Project, b: BuildState, reason: 'nakit' | 'malzeme' | 'kaza', events: GameEvent[]) {
  if (b.stalled !== reason && s.clock.day - (b.stallEvtDay ?? -999) > 14) { events.push({ type: 'CONSTRUCTION_STALLED', day: s.clock.day, data: { projectId: p.id, reason } }); b.stallEvtDay = s.clock.day; }
  b.stalled = reason; b.stalledDays++; b.stallStreak = (b.stallStreak ?? 0) + 1;
}

export function advanceConstruction(s: GameState, p: Project, events: GameEvent[]): void {
  const b = p.build!; if (p.status !== 'insaat') return;
  const days = stageDays(p), weather = s.weather[p.cityId] ?? 'acik';
  let remaining = 1;
  while (remaining > 1e-9 && b.stage <= LAST_STAGE) {
    const st = STAGES[b.stage]!;
    if (!b.stageStarted) onStageStart(s, p, b, events);
    if (b.accidentUntil !== undefined) { if (s.clock.day < b.accidentUntil) { stall(s, p, b, 'kaza', events); return; } delete b.accidentUntil; b.stalled = null; }
    const cap = st.office ? 0 : crewCapacity(s, st.id, p.id);
    const crew = st.office ? (hasRole(s, st.office) ? 1.25 : 0.85) : crewFactor(s, p, st.id);
    if (!st.office && b.stage >= 6 && maybeAccident(s, p, b, cap, weather, events)) return;
    const wm = 1;
    const pm = projectMods(s, p), mult = Math.max(0.05, crew * wm * pm.speed * rushMult(s, p)), d = (days[b.stage]! * (st.permit ? b.permitMult : 1)) || 1;
    const need = ((1 - b.progress) * d) / mult;
    let use = Math.min(remaining, need), dp = (use * mult) / d;

    // malzeme: stok yetmiyorsa ilerleme stokla sınırlanır, hiç yoksa iş durur
    const needs = stageNeeds(p, b.stage); let short = '';
    for (const [id, q] of needs) { const can = q > 0 ? stockQty(s, id) / q : Infinity; if (can < dp) { dp = can; short = id; } }
    if (dp < 1e-6) { b.matShort = short; stall(s, p, b, 'malzeme', events); if (s.clock.day % 3 === 0) autoBuy(s, p, events); return; }
    if (short) { use = (dp * d) / mult; b.matShort = short; } else delete b.matShort;

    // maliyet: tahakkuk (işçilik, malzeme kalemi dışı giderler) + makine günü (sahip: yakıt, değilse kira)
    const full = st.prepaid ? 0 : b.stageBudget[b.stage]! * priceFactor(s, b) * b.stageMult * pm.cost;
    const cov = st.office ? 0 : Math.min(1, crewRatio(s, p, st.id));
    const fracSum = (st.materials ?? []).reduce((a, [, f]) => a + f, 0), hasMach = !!st.machines?.length;
    const partMal = full * SPLIT.malzeme * (1 - fracSum) * dp, partIns = full * SPLIT.insaat * (1 - SPLIT.insaat * 0 - cov) * dp, partMak0 = hasMach ? 0 : full * SPLIT.makine * dp;
    // machine usage probe (cost only; breakdown rolled only when the day is committed below)
    const probe = hasMach && !st.prepaid ? machineProbe(s, st.machines!) : { cost: 0, cover: 0 };
    const mDay = Math.round(probe.cost * use);
    const cost = Math.round(partMal + partIns + partMak0 + mDay);
    if (cost > 0 && cost > (s.company!.cash - b.unpaid) && !ensureCash(s, p.id, cost + b.unpaid, events)) { stall(s, p, b, 'nakit', events); return; }
    if (b.stalled) { b.stalled = null; if ((b.stallStreak ?? 0) >= 3) events.push({ type: 'CONSTRUCTION_RESUMED', day: s.clock.day, data: { projectId: p.id } }); b.stallStreak = 0; }
    if (hasMach && !st.prepaid) { const u = useMachines(s, st.machines!, events); b.machCover = u.cover; }
    // stok tüket + malzeme kalitesi
    let qa = 0; for (const [id, q] of needs) { const it = s.stock[id]; if (it) { b.matCost = (b.matCost ?? 0) + Math.round(q * dp * it.cost); logStock(s, id, Math.min(it.qty, q * dp), 'cikis', Math.min(it.qty, q * dp) * it.cost, p.name); it.qty = Math.max(0, it.qty - q * dp); qa += (q > 0 ? (st.materials!.find((m) => m[0] === id)![1]) : 0) * it.qual; } }
    if (needs.length) b.qAdj = (b.qAdj ?? 0) + (qa / Math.max(0.0001, fracSum)) * dp;
    b.progress += dp; remaining -= use;
    if (cost > 0) { b.unpaid += cost; b.unpaidParts.malzeme += partMal; b.unpaidParts.insaat += partIns; b.unpaidParts.makine += partMak0 + mDay; }
    if (b.progress >= 1 - 1e-9) completeStage(s, p, b, crew, events);
  }
  if (b.stage > LAST_STAGE) finishProject(s, p, events);
}

/** Maliyet tahmini için makine durumu (arıza kontrolü yok). */
function machineProbe(s: GameState, req: string[]): { cover: number; cost: Money } {
  let found = 0, cost = 0; const taken = new Set<number>();
  for (const type of req) {
    const m = s.machines.find((x) => x.type === type && x.brokenUntil <= s.clock.day && x.usedDay !== s.clock.day && !taken.has(x.id));
    const def = MACH.get(type)!; if (m) { found++; taken.add(m.id); cost += TL(def.fuelTL) * s.costIndex; } else cost += TL(def.rentTL) * s.costIndex;
  }
  return { cover: found / req.length, cost: Math.round(cost) };
}
import { MACHINES } from '../data';
import { ensureCash } from './loans';
import { finishContract, onStageDone } from './tenders';
const MACH = new Map(MACHINES.map((m) => [m.id, m]));

function finishProject(s: GameState, p: Project, events: GameEvent[]): void {
  const b = p.build!; settle(s, p);
  const q = b.qualityW > 0 ? b.qualitySum / b.qualityW : 70, days = s.clock.day - b.startDay, planned = p.expected.months * 30;
  b.doneDay = s.clock.day; p.status = 'tamamlandi';
  p.result = { qualityScore: Math.round(q * 10) / 10, cost: b.spent + (b.matCost ?? 0) + p.budget.designFee, days, plannedDays: planned };
  const c = s.company!; c.stats.completed++; c.creditScore = clamp(c.creditScore + 10, 100, 900);
  const rep = Math.round((q - 60) / 8) + (days <= planned * 1.05 ? 2 : days > planned * 1.3 ? -2 : 0);
  c.reputation = clamp(c.reputation + rep, 0, 100);
  events.push({ type: 'PROJECT_COMPLETED', day: s.clock.day, pause: true, data: { projectId: p.id, quality: p.result.qualityScore, days, planned, rep } });
  if (p.contract) { finishContract(s, p, events); return; }
  deliverUnits(s, p, events); checkAllSold(s, p, events);
}

export function constructionDaily(s: GameState, events: GameEvent[], monday: boolean): void {
  updateWeather(s);
  const act = activeProjects(s);
  if (monday && s.company?.procurement.auto) for (const p of act) autoBuy(s, p, events);
  for (const p of act) { advanceConstruction(s, p, events); if (monday && p.status === 'insaat') settle(s, p); }
}

export const qualityMult = (q: number) => 1 + (q - 74) * 0.004;
