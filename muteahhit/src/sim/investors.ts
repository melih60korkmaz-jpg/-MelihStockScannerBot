import type { Money } from '../core/money';
import type { GameEvent, GameState, Investment, Project } from '../core/types';
import { post } from './ledger';
import { netWorth } from './finance';

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const MAX_EQUITY_SOLD = 40;

export const investmentOf = (s: GameState, projectId: number): Investment | undefined => s.investments.find((i) => i.projectId === projectId && !i.paidOut);

/** Yatırımcı teklifi: bütçenin %pct'si kadar fon; kâr payı = pct × (1.25 − itibar etkisi). Düşük itibar daha çok pay ister. */
export function quoteInvestor(s: GameState, p: Project, pct: number): { ok: boolean; error?: string; amount: Money; share: number } {
  const c = s.company; const fail = (error: string) => ({ ok: false, error, amount: 0, share: 0 });
  if (!c) return fail('Şirket yok.'); if (c.bankrupt) return fail('Şirket iflas etti.');
  if (p.status !== 'taslak' && p.status !== 'insaat') return fail('Yatırımcı yalnızca taslak/inşaat aşamasındaki projeye girer.');
  if (investmentOf(s, p.id)) return fail('Bu projede zaten bir yatırımcı var.');
  if (!(pct >= 20 && pct <= 50)) return fail('Fon oranı %20–%50 arasında olmalı.');
  if (c.reputation < 8) return fail('Yatırımcı bulmak için itibarınız yetersiz (en az 8).');
  const amount = Math.round(p.budget.total * pct / 100);
  const share = +clamp((pct / 100) * (1.3 - c.reputation / 400), 0.15, 0.7).toFixed(3);
  return { ok: true, amount, share };
}
export function takeInvestor(s: GameState, p: Project, pct: number, events: GameEvent[]): Investment | null {
  const q = quoteInvestor(s, p, pct); if (!q.ok) return null;
  const inv: Investment = { id: s.nextId++, projectId: p.id, amount: q.amount, share: q.share, day: s.clock.day };
  s.investments.push(inv); post(s, 'ortak', q.amount, { projectId: p.id, memo: 'Yatırımcı fonu' });
  events.push({ type: 'INVESTOR_IN', day: s.clock.day, data: { projectId: p.id, amount: q.amount, share: q.share } }); return inv;
}
/** Proje kapanışı: yatırımcıya anapara + kâr payı, ortaklara temettü. Zararda pay 0 (anapara yine geri ödenir). */
export function settleProject(s: GameState, p: Project, profit: Money, events: GameEvent[]): { investor: Money; dividend: Money } {
  let investor = 0, dividend = 0; const inv = investmentOf(s, p.id), c = s.company!;
  if (inv) { investor = inv.amount + Math.round(Math.max(0, profit) * inv.share); inv.paidOut = true; post(s, 'ortak_odeme', -investor, { projectId: p.id, memo: 'Yatırımcı ödemesi' }); events.push({ type: 'INVESTOR_PAID', day: s.clock.day, data: { projectId: p.id, amount: investor } }); }
  if (profit > 0 && c.ownership < 100) { dividend = Math.round((profit - Math.round(inv ? profit * inv.share : 0)) * (1 - c.ownership / 100)); if (dividend > 0) { post(s, 'temettu', -dividend, { projectId: p.id, memo: 'Ortaklara temettü' }); events.push({ type: 'DIVIDEND', day: s.clock.day, data: { projectId: p.id, amount: dividend } }); } }
  return { investor, dividend };
}
export function refundInvestor(s: GameState, projectId: number): void {
  const inv = investmentOf(s, projectId); if (!inv) return; inv.paidOut = true; post(s, 'ortak_odeme', -inv.amount, { projectId, memo: 'Yatırımcı iadesi (proje iptal)' });
}
export function equityQuote(s: GameState, pct: number): { ok: boolean; error?: string; price: Money } {
  const c = s.company; if (!c) return { ok: false, error: 'Şirket yok.', price: 0 }; if (c.bankrupt) return { ok: false, error: 'Şirket iflas etti.', price: 0 };
  if (!(pct >= 5 && pct <= 40)) return { ok: false, error: 'Pay oranı %5–%40 arasında olmalı.', price: 0 };
  if (100 - c.ownership + pct > MAX_EQUITY_SOLD) return { ok: false, error: `En çok %${MAX_EQUITY_SOLD} pay satılabilir (şu an %${100 - c.ownership} satıldı).`, price: 0 };
  const base = Math.max(0, netWorth(s)); if (base <= 0) return { ok: false, error: 'Şirketin net değeri pozitif değil.', price: 0 };
  return { ok: true, price: Math.round(base * pct / 100 * (0.8 + c.reputation / 250)) };
}
export function sellEquity(s: GameState, pct: number, events: GameEvent[]): Money | null {
  const q = equityQuote(s, pct); if (!q.ok) return null; const c = s.company!;
  c.ownership = clamp(c.ownership - pct, 60, 100); post(s, 'ortak', q.price, { memo: `Şirket payı satışı (%${pct})` });
  events.push({ type: 'EQUITY_SOLD', day: s.clock.day, data: { pct, price: q.price } }); return q.price;
}
