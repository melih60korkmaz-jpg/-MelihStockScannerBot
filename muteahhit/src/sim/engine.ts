import { dateOf, isFirstOfMonth, isMonday, isNewYear } from '../core/calendar';
import type { GameEvent, GameState } from '../core/types';
import { TL } from '../core/money';
import { officeFor } from '../data';
import { post } from './ledger';

/**
 * Tek günlük ilerleme. Saf mantık: DOM/Three bilmez. `s` yerinde güncellenir (hız için),
 * ama davranış tamamen state + RNG akışlarının fonksiyonudur (deterministik).
 */
export function advanceDay(s: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  s.clock.day += 1;
  const day = s.clock.day;
  events.push({ type: 'DAY', day });

  if (s.company) {
    if (isFirstOfMonth(day)) monthly(s, events);
    if (isMonday(day)) events.push({ type: 'WEEK', day });
    if (isNewYear(day)) events.push({ type: 'YEAR', day, data: { year: dateOf(day).year } });
  }
  return events;
}

function monthly(s: GameState, events: GameEvent[]): void {
  const c = s.company!;
  const wages = s.staff.reduce((a, x) => a + x.salary, 0);
  if (wages > 0) post(s, 'maas', -wages, { memo: `${s.staff.length} çalışan` });
  const rent = TL(officeFor(c.level).monthlyRentTL);
  post(s, 'kira', -rent, { memo: officeFor(c.level).label });
  events.push({ type: 'MONTH', day: s.clock.day });
  if (c.cash < 0) events.push({ type: 'CASH_NEGATIVE', day: s.clock.day, pause: true, data: { cash: c.cash } });
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
