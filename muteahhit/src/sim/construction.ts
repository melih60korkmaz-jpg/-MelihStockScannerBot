import { dateOf } from '../core/calendar';
import { gauss, rand } from '../core/rng';
import type { Money } from '../core/money';
import type { BuildState, GameEvent, GameState, Project } from '../core/types';
import { SOIL_COST, STAGES } from '../data';
import { post } from './ledger';

const TOTAL_TIME = STAGES.reduce((a, s) => a + s.time, 0);
const SPLIT = { malzeme: 0.55, insaat: 0.35, makine: 0.1 } as const;
const TIER_Q: Record<string, number> = { ekonomik: 62, standart: 74, premium: 86, luks: 94 };
export const LAST_STAGE = STAGES.length - 1; // 17
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export const activeProjects = (s: GameState) => s.projects.filter((p) => p.status === 'insaat');

/** Aşama günleri: planlanan toplam süreyi aşama zaman paylarına böler. */
export function stageDays(p: Project): number[] {
  const total = Math.max(60, p.expected.months * 30);
  return STAGES.map((st) => (total * st.time) / TOTAL_TIME);
}

/** Saha ekibi kapasitesi (kişi eşdeğeri). Santiye şefi verimi artırır. Çalışanlar aktif projeler arasında bölünür. */
export function crewCapacity(s: GameState, stageId: string): number {
  const concrete = stageId === 'temel' || stageId === 'betonarme' || stageId === 'katlar';
  const w: Record<string, number> = { isci: 1, usta: 1.6, kalipci: concrete ? 1.6 : 1, demirci: concrete ? 1.6 : 1, elektrikci: stageId === 'tesisat' ? 1.7 : 1, tesisatci: stageId === 'tesisat' ? 1.7 : 1 };
  let cap = 0, chief = false;
  for (const x of s.staff) { cap += (w[x.type] ?? 0) * (0.8 + 0.4 * (x.experience / 100)); if (x.type === 'santiye_sefi') chief = true; }
  return cap * (chief ? 1.15 : 1);
}
/** Ekibin işi karşılama oranı (r = kapasite / gereken); 1 = yeterli. */
export function crewRatio(s: GameState, p: Project, stageId: string): number {
  const n = Math.max(1, activeProjects(s).length), need = Math.max(2, p.brut / 70);
  return crewCapacity(s, stageId) / n / need;
}
export function crewFactor(s: GameState, p: Project, stageId: string): number {
  const r = crewRatio(s, p, stageId);
  // Ekipsiz: taşeron yavaşlığı (×0,25). Yeterli ekip: ×1,0. Fazla ekip: azalan getiriyle en çok ×1,3.
  return r < 1 ? 0.25 + 0.75 * r : Math.min(1.3, 1 + (r - 1) * 0.3);
}
const hasRole = (s: GameState, role: string) => s.staff.some((x) => x.type === role);

const RAIN = [0.28, 0.26, 0.24, 0.2, 0.16, 0.08, 0.03, 0.03, 0.08, 0.16, 0.24, 0.28];
const SNOW: Record<string, number> = { istanbul: 0.35, ankara: 0.55, izmir: 0.05 };
export function updateWeather(s: GameState): void {
  const m = dateOf(s.clock.day).month;
  for (const city of Object.keys(s.weather)) {
    const winter = m === 12 || m <= 2 ? 1 : m === 3 || m === 11 ? 0.3 : 0;
    const snow = RAIN[m - 1]! * (SNOW[city] ?? 0.2) * winter, rain = RAIN[m - 1]! - snow, r = rand(s.rng, 'construction');
    s.weather[city] = r < snow ? 'kar' : r < snow + rain ? 'yagmur' : 'acik';
  }
}

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
  p.status = 'insaat'; p.build = b;
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
  b.stageStarted = true; b.stageStartDay = s.clock.day; b.stageMult = +(0.96 + rand(s.rng, 'construction') * 0.11).toFixed(3);
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
}

function completeStage(s: GameState, p: Project, b: BuildState, crew: number, events: GameEvent[]): void {
  const st = STAGES[b.stage]!;
  if (b.stage >= 6) { // yapım aşamaları kaliteyi belirler
    const q = clamp((TIER_Q[p.quality] ?? 74) + (crew - 1) * 8 + gauss(s.rng, 'construction') * 3, 30, 100);
    b.qualitySum += q * st.cost; b.qualityW += st.cost;
  }
  events.push({ type: 'STAGE_COMPLETED', day: s.clock.day, data: { projectId: p.id, stage: b.stage, id: st.id } });
  b.stage++; b.progress = 0; b.stageStarted = false;
}

export function advanceConstruction(s: GameState, p: Project, events: GameEvent[]): void {
  const b = p.build!; if (p.status !== 'insaat') return;
  const days = stageDays(p), weather = s.weather[p.cityId] ?? 'acik';
  let remaining = 1;
  while (remaining > 1e-9 && b.stage <= LAST_STAGE) {
    const st = STAGES[b.stage]!;
    if (!b.stageStarted) onStageStart(s, p, b, events);
    const crew = st.office ? (hasRole(s, st.office) ? 1.25 : 0.85) : crewFactor(s, p, st.id);
    const wm = st.outdoor ? (weather === 'kar' ? 0.2 : weather === 'yagmur' ? 0.5 : 1) : 1;
    const mult = Math.max(0.05, crew * wm), d = (days[b.stage]! * (st.permit ? b.permitMult : 1)) || 1;
    const need = ((1 - b.progress) * d) / mult;       // bu aşamayı bitirmek için gereken (gün)
    const use = Math.min(remaining, need), dp = (use * mult) / d;
    // Kendi ekibiniz taşeron işçilik bedelinin (%35) karşıladığı kısmı tasarruf ettirir; maaşı zaten ayrıca ödüyorsunuz.
    const cov = st.office ? 0 : Math.min(1, crewRatio(s, p, st.id)), labor = 1 - SPLIT.insaat * cov;
    const stageCost = st.prepaid ? 0 : b.stageBudget[b.stage]! * priceFactor(s, b) * b.stageMult * labor, cost = Math.round(stageCost * dp);
    if (cost > 0 && cost > (s.company!.cash - b.unpaid)) { // nakit yok: iş durur
      // Olay tekrarı sınırlı: kısa süreli "bir gün çalışıp bir gün durma" dalgalanması bildirim yağdırmasın
      if (!b.stalled && s.clock.day - (b.stallEvtDay ?? -999) > 14) { events.push({ type: 'CONSTRUCTION_STALLED', day: s.clock.day, data: { projectId: p.id, reason: 'nakit' } }); b.stallEvtDay = s.clock.day; }
      b.stalled = 'nakit'; b.stalledDays++; b.stallStreak = (b.stallStreak ?? 0) + 1; return;
    }
    if (b.stalled) { b.stalled = null; if ((b.stallStreak ?? 0) >= 3) events.push({ type: 'CONSTRUCTION_RESUMED', day: s.clock.day, data: { projectId: p.id } }); b.stallStreak = 0; }
    b.progress += dp; remaining -= use;
    if (cost > 0) { b.unpaid += cost; for (const k of ['malzeme', 'insaat', 'makine'] as const) b.unpaidParts[k] += cost * (SPLIT[k] * (k === 'insaat' ? (1 - cov) / labor : 1 / labor)); }
    if (b.progress >= 1 - 1e-9) completeStage(s, p, b, crew, events);
  }
  if (b.stage > LAST_STAGE) finishProject(s, p, events);
}

function finishProject(s: GameState, p: Project, events: GameEvent[]): void {
  const b = p.build!; settle(s, p);
  const q = b.qualityW > 0 ? b.qualitySum / b.qualityW : 70, days = s.clock.day - b.startDay, planned = p.expected.months * 30;
  b.doneDay = s.clock.day; p.status = 'tamamlandi';
  p.result = { qualityScore: Math.round(q * 10) / 10, cost: b.spent + p.budget.designFee, days, plannedDays: planned };
  const c = s.company!; c.stats.completed++;
  const rep = Math.round((q - 60) / 8) + (days <= planned * 1.05 ? 2 : days > planned * 1.3 ? -2 : 0);
  c.reputation = clamp(c.reputation + rep, 0, 100);
  events.push({ type: 'PROJECT_COMPLETED', day: s.clock.day, pause: true, data: { projectId: p.id, quality: p.result.qualityScore, days, planned, rep } });
}

export function constructionDaily(s: GameState, events: GameEvent[], monday: boolean): void {
  updateWeather(s);
  for (const p of activeProjects(s)) { advanceConstruction(s, p, events); if (monday && p.status === 'insaat') settle(s, p); }
}

/** Bina bitti ve kalite puanı: toplu satış fiyatı için kalite çarpanı ×(1 + (q−74)×0,004). */
export const qualityMult = (q: number) => 1 + (q - 74) * 0.004;
