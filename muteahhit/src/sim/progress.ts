import { TL } from '../core/money';
import type { GameEvent, GameState, Progress } from '../core/types';
import { ACHIEVEMENTS, LEVEL_DEFS, OFFICE_STEPS, QUESTS } from '../data';
import { netWorth } from './finance';
import { post } from './ledger';

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const newProgress = (): Progress => ({ ach: {}, quests: {}, c: { loans: 0, tendersWon: 0, bids: 0, events: 0, unitsSold: 0, started: 0, bestQuality: 0, crisisMonths: 0, investors: 0, equitySold: 0 } });

/** Tüm görev/başarım/seviye ölçütleri tek yerden okunur (TL cinsinden sayılar). */
export function metric(s: GameState, m: string): number { return metricRaw(s, m); }
function metricRaw(s: GameState, m: string): number {
  const c = s.company!, p = s.progress.c;
  switch (m) {
    case 'completed': return c.stats.completed; case 'sold': return c.stats.sold; case 'profit': return c.stats.profit / 100;
    case 'nw': return netWorth(s) / 100; case 'cash': return c.cash / 100; case 'cities': return s.openCities.length;
    case 'staff': return s.staff.length; case 'machines': return s.machines.length; case 'parcels': return s.parcels.filter((x) => x.owner === 'player' && !x.clientLand).length + s.projects.length;
    case 'rep': return c.reputation; case 'level': return c.level; case 'months': return Math.floor(s.clock.day / 30);
    case 'started': return p.started; case 'loans': return p.loans; case 'tendersWon': return p.tendersWon; case 'bids': return p.bids; case 'events': return p.events;
    case 'unitsSold': return p.unitsSold; case 'bestQuality': return p.bestQuality; case 'crisisMonths': return p.crisisMonths; case 'investors': return p.investors; case 'equitySold': return p.equitySold;
    case 'ventures': return s.ventures.length; case 'energy': return s.ventures.filter((v) => v.kind === 'gunes' || v.kind === 'ruzgar').length;
    case 'hotels': return s.ventures.filter((v) => v.kind === 'otel' || v.kind === 'avm').length; case 'infraDone': return s.infra.filter((j) => j.status === 'bitti').length;
    case 'public': return s.equity?.listed ? 1 : 0; case 'acquired': return s.ventures.filter((v) => v.kind === 'bagli').length;
    default: return 0;
  }
}

/** Olaylardan sayaç türet (komut ve gün olayları aynı yoldan geçer). */
export function track(s: GameState, events: GameEvent[]): void {
  if (!s.company) return; const c = s.progress.c;
  for (const e of events) {
    switch (e.type) {
      case 'LOAN_TAKEN': c.loans++; break; case 'TENDER_WON': c.tendersWon++; break; case 'BID_PLACED': c.bids++; break; case 'EVENT_RESOLVED': c.events++; break;
      case 'UNIT_SOLD': c.unitsSold++; break; case 'PROJECT_STARTED': c.started++; break; case 'INVESTOR_IN': c.investors++; break; case 'EQUITY_SOLD': c.equitySold++; break;
      case 'PROJECT_COMPLETED': c.bestQuality = Math.max(c.bestQuality, Number(e.data?.quality ?? 0)); break;
      case 'BULK_SOLD': c.unitsSold += s.units.filter((u) => u.projectId === e.data?.projectId).length; break;
    }
  }
}

export const nextLevel = (s: GameState) => LEVEL_DEFS.find((l) => l.level === s.company!.level + 1);
export function levelChecks(s: GameState, level: number): { label: string; need: number; have: number; ok: boolean }[] {
  const d = LEVEL_DEFS.find((l) => l.level === level); if (!d) return []; const n = d.need, out: { label: string; need: number; have: number; ok: boolean }[] = [];
  const add = (label: string, need: number | undefined, m: string) => { if (need !== undefined) { const have = metric(s, m); out.push({ label, need, have: Math.round(have), ok: have >= need }); } };
  add('Tamamlanan proje', n.completed, 'completed'); add('Net varlık (₺)', n.nw, 'nw'); add('İtibar', n.rep, 'rep'); add('Şehir', n.cities, 'cities'); return out;
}

function gift(s: GameState, r: { cash?: number; rep?: number; score?: number }, memo: string) {
  const c = s.company!; if (r.cash) post(s, 'olay_gelir', TL(r.cash), { memo }); if (r.rep) c.reputation = clamp(c.reputation + r.rep, 0, 100); if (r.score) c.creditScore = clamp(c.creditScore + r.score, 100, 900);
}

/** Görev, başarım ve seviye kontrolü. `silent` = geçmişe dönük sessiz işleme (eski kayıtlar). */
export function checkProgress(s: GameState, events: GameEvent[], silent = false, achOnly = false): void {
  const c = s.company; if (!c || c.bankrupt) return; const day = s.clock.day, pr = s.progress;
  const cache = new Map<string, number>(); const metric = (st: GameState, m: string) => { let v = cache.get(m); if (v === undefined) { v = metricRaw(st, m); cache.set(m, v); } return v; };
  if (!achOnly) for (const q of QUESTS) if (pr.quests[q.id] === undefined && metric(s, q.m) >= q.n) { pr.quests[q.id] = day; if (!silent) { gift(s, q.r, `Görev: ${q.t}`); events.push({ type: 'QUEST_DONE', day, data: { id: q.id } }); } }
  for (const a of ACHIEVEMENTS) if (pr.ach[a.id] === undefined && metric(s, a.m) >= a.n) { pr.ach[a.id] = day; if (!silent) events.push({ type: 'ACHIEVEMENT', day, data: { id: a.id } }); }
  for (let guard = 0; guard < 8 && !achOnly; guard++) {
    const nl = nextLevel(s); if (!nl || !levelChecks(s, nl.level).every((x) => x.ok)) break;
    c.level = nl.level; if (!silent) { c.creditScore = clamp(c.creditScore + 15, 100, 900); c.reputation = clamp(c.reputation + 2, 0, 100); events.push({ type: 'LEVEL_UP', day, pause: true, data: { level: nl.level, label: nl.label } }); }
  }
}

/** Aylık: kriz dayanıklılığı sayacı (iflas etmeden kriz ayı geçirmek). */
export function progressMonthly(s: GameState): void { if (s.macro.regime === 'kriz' && !s.company?.bankrupt) s.progress.c.crisisMonths++; }

export const officeStepFor = (s: GameState) => OFFICE_STEPS.find((o) => o.office === s.company!.office + 1);
