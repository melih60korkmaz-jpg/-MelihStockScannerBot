import { traitOf } from './staff';
import { dateOf, isFirstOfMonth, isMonday, isNewYear } from '../core/calendar';
import type { GameEvent, GameState } from '../core/types';
import { monthKey } from '../core/calendar';
import { ledgerCat } from '../data';
import { compactLedger, post } from './ledger';
import { macroMonthly } from './macro';
import { listingsWeekly, marketMonthly } from './land';
import { constructionDaily } from './construction';
import { deliveries, materialsMonthly } from './materials';
import { salesDaily, salesMonthly } from './sales';
import { monthlyCosts, netWorth } from './finance';
import { checkProgress, progressMonthly, track } from './progress';
import { rivalsMonthly } from './rivals';
import { reportYearly } from './report';
import { eventsDaily, eventsMonthly } from './events';
import { tendersDaily, tendersMonthly } from './tenders';
import { infraDaily, infraMonthly, infraPrune } from './infra';
import { venturesMonthly } from './ventures';
import { stockDaily, stockMonthly } from './stock';
import { loansMonthly, forcedLiquidation, debtTotal } from './loans';

/**
 * Tek günlük ilerleme. Saf mantık: DOM/Three bilmez. `s` yerinde güncellenir (hız için),
 * ama davranış tamamen state + RNG akışlarının fonksiyonudur (deterministik).
 */
export function advanceDay(s: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  if (s.company?.bankrupt) return events;
  s.clock.day += 1;
  const day = s.clock.day;
  events.push({ type: 'DAY', day });

  if (s.company) {
    if (isNewYear(day)) { yearly(s, events); reportYearly(s, events); }
    if (isFirstOfMonth(day)) monthly(s, events);
    if (isMonday(day)) { listingsWeekly(s, events); events.push({ type: 'WEEK', day }); }
    processScheduled(s, events);
    deliveries(s, events);
    constructionDaily(s, events, isMonday(day));
    salesDaily(s, events);
    tendersDaily(s, events);
    infraDaily(s, events);
    stockDaily(s);
    eventsDaily(s, events);
  }
  track(s, events); if (s.clock.day % 6 === 0) checkProgress(s, events);
  return events;
}

/** Zamanlanmış işler (etüt sonuçları vb.). */
function processScheduled(s: GameState, events: GameEvent[]): void {
  if (!s.scheduled.length) return;
  const due = s.scheduled.filter((x) => x.day <= s.clock.day);
  if (!due.length) return;
  s.scheduled = s.scheduled.filter((x) => x.day > s.clock.day);
  for (const x of due) {
    if (x.type === 'survey') {
      const p = s.parcels.find((q) => q.id === x.data.parcelId);
      if (!p) continue; // arsa arada başkasına satıldı: etüt boşa gitti
      if (x.data.kind === 'soil') p.soilKnown = true; else p.growthKnown = true;
      events.push({ type: 'SURVEY_DONE', day: s.clock.day, data: { parcelId: p.id, kind: x.data.kind } });
    }
  }
}

/** Yıllık maaş artışı: enflasyonun %90'ı kadar (işçi kaybetmemek için). */
function yearly(s: GameState, events: GameEvent[]): void {
  const k = 1 + (s.macro.inflation / 100) * 0.9;
  for (const p of s.staff) p.salary = Math.round(p.salary * k);
  compactLedger(s, s.clock.day - 730); // 2 yıldan eski kayıtlar aylık toplamlara indirgenir (kayıt boyutu/performans)
  events.push({ type: 'YEAR', day: s.clock.day, data: { year: dateOf(s.clock.day).year, raise: k - 1 } });
}

function monthly(s: GameState, events: GameEvent[]): void {
  const c = s.company!;
  macroMonthly(s, events);
  rivalsMonthly(s, events);
  marketMonthly(s, events);
  materialsMonthly(s, events);
  moraleMonthly(s);
  salesMonthly(s, events);
  loansMonthly(s, events);
  tendersMonthly(s, events);
  infraMonthly(s); infraPrune(s);
  venturesMonthly(s, events);
  stockMonthly(s);
  eventsMonthly(s, events);
  progressMonthly(s);
  s.costIndex *= 1 + (s.macro.inflation / 100 / 12) * 0.85;
  for (const x of monthlyCosts(s)) post(s, x.cat, -x.amount, { memo: x.memo });
  if ([1, 4, 7, 10].includes(dateOf(s.clock.day).month)) quarterlyTax(s, events);
  s.history.push({ day: s.clock.day, cash: c.cash, netWorth: netWorth(s) });
  if (s.history.length > 240) s.history.shift();
  events.push({ type: 'MONTH', day: s.clock.day });
  if (c.cash < 0) { forcedLiquidation(s, -c.cash, events); }
  if (c.cash < 0 && netWorth(s) < 0 && s.loans.length + debtTotal(s) >= 0) { c.bankrupt = true; events.push({ type: 'BANKRUPT', day: s.clock.day, pause: true, data: {} }); }
  if (c.cash < 0) events.push({ type: 'CASH_NEGATIVE', day: s.clock.day, pause: true, data: { cash: c.cash } });
}

/** Moral hedefe yaklaşır: güvenlik politikası, yakın kaza, nakit sıkıntısı etkiler. */
function moraleMonthly(s: GameState): void {
  const c = s.company!; const team = Math.min(6, 2 * s.staff.filter((x) => traitOf(x).id === 'takimci').length); const target = 68 + team + (c.safety === 'yuksek' ? 6 : c.safety === 'dusuk' ? -6 : 0) - (s.clock.day - c.lastAccidentDay < 90 ? 10 : 0) - (c.cash < 0 ? 8 : 0);
  for (const x of s.staff) x.morale = Math.round(Math.min(100, Math.max(0, x.morale + (target - x.morale) * 0.25)));
}

export const CORPORATE_TAX = 0.25;

/**
 * Çeyreklik geçici vergi: önceki çeyreğin faaliyet sonucu (gelir − gider). Zarar devreder; kâr önce devreden zarara mahsup edilir.
 * Sermaye, yatırım ve finansman hareketleri matraha girmez.
 */
function quarterlyTax(s: GameState, events: GameEvent[]): void {
  const day = s.clock.day;
  const d = dateOf(day);
  const startMonth = d.month - 3 <= 0 ? d.month + 9 : d.month - 3, startYear = d.month - 3 <= 0 ? d.year - 1 : d.year;
  const startKey = `${startYear}-${String(startMonth).padStart(2, '0')}`, endKey = monthKey(day);
  let result = 0;
  for (const e of s.ledger) {
    if (e.day >= day) continue;
    const k = monthKey(e.day);
    if (k < startKey || k >= endKey) continue;
    const kind = ledgerCat(e.cat)?.kind;
    if (kind === 'gelir' || kind === 'gider') result += e.amount;
  }
  if (result <= 0) { s.taxLossCarry += -result; return; }
  const taxable = Math.max(0, result - s.taxLossCarry);
  s.taxLossCarry = Math.max(0, s.taxLossCarry - result);
  const tax = Math.round(taxable * CORPORATE_TAX);
  if (tax > 0) { post(s, 'vergi', -tax, { memo: 'Çeyreklik geçici vergi' }); events.push({ type: 'TAX_PAID', day, data: { amount: tax } }); }
}

/** Birden çok gün; `pause` bayraklı olayda durur (oyuncu karar versin). */
export function advanceDays(s: GameState, n: number, stopOnPause = false): GameEvent[] {
  const all: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    const evs = advanceDay(s);
    all.push(...evs);
    if (stopOnPause && evs.some((e) => e.pause)) break;
  }
  return all;
}
