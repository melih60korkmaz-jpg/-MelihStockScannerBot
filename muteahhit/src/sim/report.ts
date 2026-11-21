import type { Money } from '../core/money';
import { dateOf } from '../core/calendar';
import type { GameEvent, GameState, YearReport } from '../core/types';
import { ledgerCat } from '../data';
import { netWorth } from './finance';
import { standing } from './rivalLife';

/**
 * Yıllık rapor: biten takvim yılının geliri, gideri, kârı, net değer değişimi, en büyük gelir/gider kalemi,
 * tamamlanan işler ve rakipler arasındaki sıra. Yalnızca defterden okunur; rastgele sayı üretmez.
 */
export function buildYearReport(s: GameState, year: number): YearReport {
  const c = s.company!; let rev = 0, exp = 0; const inc: Record<string, number> = {}, out: Record<string, number> = {};
  for (const e of s.ledger) {
    if (dateOf(e.day).year !== year) continue;
    const kind = ledgerCat(e.cat)?.kind;
    if (kind === 'gelir') { rev += e.amount; inc[e.cat] = (inc[e.cat] ?? 0) + e.amount; } else if (kind === 'gider') { exp += -e.amount; out[e.cat] = (out[e.cat] ?? 0) + -e.amount; }
  }
  const top = (m: Record<string, number>): { cat: string; amount: Money } | undefined => { let best: [string, number] | undefined; for (const kv of Object.entries(m)) if (!best || kv[1] > best[1]) best = kv; return best ? { cat: best[0], amount: Math.round(best[1]) } : undefined; };
  const prev = s.reports?.[s.reports.length - 1], nw = netWorth(s), st = standing(s);
  const rep: YearReport = {
    year, revenue: Math.round(rev), expense: Math.round(exp), profit: Math.round(rev - exp), netWorth: nw, netWorthChange: prev ? nw - prev.netWorth : null, cash: c.cash,
    completed: c.stats.completed - (prev?.totals.completed ?? 0), sold: c.stats.sold - (prev?.totals.sold ?? 0), totals: { completed: c.stats.completed, sold: c.stats.sold },
    reputation: Math.round(c.reputation), level: c.level, rank: st.rank, rivals: st.total, leader: st.list[0]!.me ? null : st.list[0]!.name,
    topIncome: top(inc), topExpense: top(out), staff: s.staff.length, openProjects: s.projects.filter((p) => p.status === 'insaat').length,
  };
  return rep;
}

/** Yeni yılda (1 Ocak) bir önceki yılın raporu kaydedilir; ilk yıl kuruluş yılı olduğu için kısmi olabilir. */
export function reportYearly(s: GameState, events: GameEvent[]): void {
  if (!s.company || s.company.bankrupt) return;
  const year = dateOf(s.clock.day).year - 1; s.reports ??= [];
  if (s.reports.some((r) => r.year === year)) return;
  if (year < dateOf(0).year) return;
  const r = buildYearReport(s, year); s.reports.push(r); if (s.reports.length > 30) s.reports.shift();
  events.push({ type: 'YEAR_REPORT', day: s.clock.day, data: { year } });
}
