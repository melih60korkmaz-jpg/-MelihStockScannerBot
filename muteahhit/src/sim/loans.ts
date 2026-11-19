import { TL, type Money } from '../core/money';
import type { GameEvent, GameState, Loan } from '../core/types';
import { bank } from '../data';
import { netWorth } from './finance';
import { post, setPostHook } from './ledger';

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export type LoanKind = Loan['kind'];

export const debtTotal = (s: GameState): Money => s.loans.reduce((a, l) => a + l.balance, 0);
export const annuity = (P: Money, rate: number, n: number): Money => { const i = rate / 1200; return Math.round(i === 0 ? P / n : (P * i) / (1 - Math.pow(1 + i, -n))); };

const KIND_PREMIUM: Record<LoanKind, number> = { ticari: 0, insaat: 1, makine: -1, kisa: 10 };
/** Faiz = politika faizi + banka marjı + not primi + ürün primi (sabit faiz: açılışta belirlenir). */
export function rateFor(s: GameState, bankId: string, kind: LoanKind): number {
  const b = bank(bankId)!, sc = s.company!.creditScore;
  return +clamp(s.macro.policyRate + b.margin + Math.max(0, 700 - sc) / 100 * 0.6 + KIND_PREMIUM[kind], s.macro.policyRate + 1, 90).toFixed(2);
}
/** Toplam borç kapasitesi: özkaynak × not çarpanı + itibar. Mevcut borç düşülür. */
export function creditCapacity(s: GameState): { total: Money; used: Money; available: Money } {
  const c = s.company!, equity = Math.max(0, netWorth(s) + debtTotal(s)); // özkaynak (borç düşülmeden), zaten net varlık borcu düşüyor
  const total = Math.round(equity * clamp(c.creditScore / 600, 0.3, 1.4) + c.reputation * TL(30000)), used = debtTotal(s);
  return { total, used, available: Math.max(0, total - used) };
}

export interface LoanRequest { kind: LoanKind; bank: string; amount: Money; term?: number; projectId?: number; machineId?: number }
export interface Quote { ok: boolean; error?: string; rate: number; payment: Money; fee: Money; term: number; schedule: Loan['schedule']; maxAmount: Money }
const TERMS: Record<LoanKind, [number, number]> = { ticari: [12, 60], insaat: [24, 24], makine: [12, 48], kisa: [3, 3] };

export function quoteLoan(s: GameState, r: LoanRequest): Quote {
  const c = s.company, b = bank(r.bank), empty: Quote = { ok: false, rate: 0, payment: 0, fee: 0, term: 0, schedule: 'annuity', maxAmount: 0 };
  if (!c || !b) return { ...empty, error: 'Geçersiz banka.' }; if (c.bankrupt) return { ...empty, error: 'Şirket iflas etti.' };
  if (!b.products.includes(r.kind)) return { ...empty, error: `${b.label} bu ürünü sunmuyor.` };
  if (c.creditScore < b.minScore) return { ...empty, error: `Kredi notunuz (${c.creditScore}) ${b.label} için yetersiz (en az ${b.minScore}).` };
  const [t0, t1] = TERMS[r.kind], term = clamp(r.term ?? t1, t0, t1), cap = creditCapacity(s);
  let max = cap.available;
  if (r.kind === 'insaat') { const p = s.projects.find((x) => x.id === r.projectId); if (!p || (p.status !== 'taslak' && p.status !== 'insaat')) return { ...empty, error: 'İnşaat kredisi için taslak/inşaat halindeki bir proje gerekir.' }; if (s.loans.some((l) => l.kind === 'insaat' && l.projectId === p.id)) return { ...empty, error: 'Bu proje için zaten inşaat krediniz var.' }; max = Math.min(max, Math.round((p.budget.total - p.budget.designFee) * 0.7)); }
  if (r.kind === 'kisa') max = Math.min(max, TL(3_000_000));
  const rate = rateFor(s, r.bank, r.kind), schedule: Loan['schedule'] = r.kind === 'insaat' ? 'interest' : r.kind === 'kisa' ? 'bullet' : 'annuity';
  const feeBase = r.amount, fee = Math.round(feeBase * (b.fee + (r.kind === 'kisa' ? 0.0 : 0)));
  if (!(r.amount > 0)) return { ...empty, rate, term, schedule, maxAmount: max, error: 'Tutar sıfırdan büyük olmalı.' };
  const payment = schedule === 'annuity' ? annuity(r.amount, rate, term) : Math.round((r.amount * rate) / 1200);
  if (r.amount > max) return { ok: false, rate, payment, fee, term, schedule, maxAmount: max, error: max <= 0 ? 'Kredi limitiniz dolu.' : `Bu ürün için en çok ${(max / 100).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺ kredi alabilirsiniz.` };
  return { ok: true, rate, payment, fee, term, schedule, maxAmount: max };
}

/** Krediyi kullandırır. İnşaat kredisi limittir: nakit ihtiyaç oldukça çekilir (başlangıçta bakiye 0). */
export function takeLoan(s: GameState, r: LoanRequest, events: GameEvent[]): { ok: true; loan: Loan } | { ok: false; error: string } {
  const q = quoteLoan(s, r); if (!q.ok) return { ok: false, error: q.error ?? 'Kredi verilemedi.' };
  const id = s.nextId++, day = s.clock.day, isLine = r.kind === 'insaat';
  const loan: Loan = { id, kind: r.kind, bank: r.bank, principal: r.amount, balance: isLine ? 0 : r.amount, rate: q.rate, term: q.term, remaining: q.term, payment: isLine ? 0 : q.payment, schedule: q.schedule, start: day, nextDue: day + 30, missed: 0 };
  if (r.projectId !== undefined) loan.projectId = r.projectId; if (r.machineId !== undefined) loan.machineId = r.machineId; if (isLine) loan.limit = r.amount;
  s.loans.push(loan);
  if (q.fee > 0) post(s, 'kredi_harc', -q.fee, { memo: `${bank(r.bank)!.label} kredi masrafı` });
  if (!isLine) post(s, 'kredi_cekim', r.amount, { memo: `${bank(r.bank)!.label} ${r.kind} kredisi`, ...(r.projectId !== undefined ? { projectId: r.projectId } : {}) });
  events.push({ type: 'LOAN_TAKEN', day, data: { loanId: id, kind: r.kind, amount: r.amount, rate: q.rate } });
  return { ok: true, loan };
}

/** İnşaat hattından gerektiğinde nakit çeker; nakit yeterliyse hiçbir şey yapmaz. true = istenen nakit sağlandı. */
export function ensureCash(s: GameState, projectId: number, needCash: Money, events: GameEvent[]): boolean {
  const c = s.company!; if (c.cash >= needCash) return true;
  const line = s.loans.find((l) => l.kind === 'insaat' && l.projectId === projectId && (l.limit ?? 0) > l.balance); if (!line) return false;
  const draw = Math.min((line.limit ?? 0) - line.balance, Math.max(needCash - c.cash, Math.round((line.limit ?? 0) * 0.04)));
  if (draw <= 0) return false; line.balance += draw; post(s, 'kredi_cekim', draw, { projectId, memo: 'İnşaat kredisi kullanımı' });
  events.push({ type: 'LOAN_DRAWN', day: s.clock.day, data: { loanId: line.id, amount: draw } });
  return c.cash >= needCash;
}

/** Proje gelirleri (satış/hakediş) inşaat kredisini önce kapatır. */
export function sweepProject(s: GameState, projectId: number, cashIn: Money): void {
  const line = s.loans.find((l) => l.kind === 'insaat' && l.projectId === projectId && l.balance > 0); if (!line || cashIn <= 0) return;
  const pay = Math.min(line.balance, cashIn); line.balance -= pay; post(s, 'kredi_odeme', -pay, { projectId, memo: 'İnşaat kredisi kapatma (proje geliri)' });
  if (line.balance <= 0 && line.drawnDone) { /* tür güvenliği */ }
}
declare module '../core/types' { interface Loan { drawnDone?: boolean } }
setPostHook((s, cat, amount, projectId) => { if ((cat === 'satis' || cat === 'hakedis') && projectId !== undefined && amount > 0) sweepProject(s, projectId, amount); });

export function repayLoan(s: GameState, loanId: number, amount: Money): { ok: boolean; error?: string; paid?: Money } {
  const l = s.loans.find((x) => x.id === loanId); if (!l) return { ok: false, error: 'Kredi bulunamadı.' };
  const pay = Math.min(amount, l.balance); if (!(pay > 0)) return { ok: false, error: 'Ödenecek tutar yok.' };
  if (s.company!.cash < pay) return { ok: false, error: 'Nakit yetersiz.' };
  l.balance -= pay; post(s, 'kredi_odeme', -pay, { memo: `Erken ödeme (${bank(l.bank)!.label})` });
  if (l.schedule === 'annuity' && l.balance > 0) l.payment = annuity(l.balance, l.rate, Math.max(1, l.remaining));
  if (l.balance <= 0 && l.kind !== 'insaat') s.loans = s.loans.filter((x) => x.id !== l.id);
  return { ok: true, paid: pay };
}

/** Yeniden yapılandırma: vade ×2, faiz +4 puan, %3 masraf; kaçırılan ödemeler sıfırlanır. Not ≥ 250 ister. */
export function restructureLoan(s: GameState, loanId: number): { ok: boolean; error?: string } {
  const l = s.loans.find((x) => x.id === loanId); if (!l || l.balance <= 0) return { ok: false, error: 'Kredi bulunamadı.' };
  if (s.company!.creditScore < 250) return { ok: false, error: 'Kredi notu yeniden yapılandırma için yetersiz (en az 250).' };
  const fee = Math.round(l.balance * 0.03); if (s.company!.cash < fee) return { ok: false, error: 'Yapılandırma masrafı için nakit yetersiz.' };
  post(s, 'kredi_harc', -fee, { memo: 'Yeniden yapılandırma masrafı' });
  l.rate = +(l.rate + 4).toFixed(2); l.remaining = Math.min(120, Math.max(l.remaining, 6) * 2); l.term = Math.max(l.term, l.remaining); l.schedule = l.schedule === 'interest' || l.schedule === 'bullet' ? 'annuity' : l.schedule;
  l.payment = annuity(l.balance, l.rate, l.remaining); l.missed = 0; l.nextDue = s.clock.day + 30;
  return { ok: true };
}

/** Haciz: boş arsalar (%80), makineler (%70), satılmamış daireler (%80) zorla satılır; açık tutar kapanana kadar. */
export function forcedLiquidation(s: GameState, shortfall: Money, events: GameEvent[]): Money {
  let raised = 0; const c = s.company!;
  const take = (label: string, v: Money) => { post(s, 'arsa', v, { memo: `Haciz satışı: ${label}` }); raised += v; };
  for (const p of [...s.parcels]) { if (raised >= shortfall) break; if (p.owner === 'player' && p.projectId === undefined) { const v = Math.round(p.unitBase * p.area * (s.cityMarket[p.city]?.landIndex ?? 1) * 0.8); s.parcels = s.parcels.filter((x) => x.id !== p.id); take(p.hood, v); } }
  for (const m of [...s.machines]) { if (raised >= shortfall) break; const def = Math.round(m.price * Math.max(0.25, 1 - (0.12 * (s.clock.day - m.boughtDay)) / 365) * 0.7); s.machines = s.machines.filter((x) => x.id !== m.id); post(s, 'makine_alim', def, { memo: 'Haciz: makine satışı' }); raised += def; }
  c.creditScore = clamp(c.creditScore - 150, 100, 900); c.reputation = clamp(c.reputation - 6, 0, 100);
  events.push({ type: 'SEIZURE', day: s.clock.day, pause: true, data: { raised, shortfall } }); return raised;
}

/** Aylık: taksitler, faiz tahakkuku, kaçırılan ödemeler, kredi notu. */
export function loansMonthly(s: GameState, events: GameEvent[]): void {
  const c = s.company!, day = s.clock.day; let anyMissed = false;
  for (const l of [...s.loans]) {
    if (l.nextDue > day + 5) continue;
    const interest = Math.round((l.balance * l.rate) / 1200);
    let principal = 0, due = 0;
    if (l.schedule === 'annuity') { const last = l.remaining <= 1; due = last ? l.balance + interest : Math.min(l.payment, l.balance + interest); principal = Math.max(0, due - interest); }
    else if (l.schedule === 'bullet') { due = interest + (l.remaining <= 1 ? l.balance : 0); principal = l.remaining <= 1 ? l.balance : 0; }
    else { due = interest; principal = 0; if (l.remaining <= 1 && l.balance > 0) { /* vade sonu: ticari krediye devir */ l.schedule = 'annuity'; l.rate = +(l.rate + 3).toFixed(2); l.remaining = 24; l.term = 24; l.payment = annuity(l.balance, l.rate, 24); events.push({ type: 'LOAN_ROLLED', day, data: { loanId: l.id } }); } }
    if (due <= 0 && l.balance <= 0) { if (l.kind !== 'insaat') s.loans = s.loans.filter((x) => x.id !== l.id); l.nextDue = day + 30; continue; }
    if (c.cash >= due) {
      if (interest > 0) post(s, 'faiz', -interest, { memo: `${bank(l.bank)!.label} faiz` }); if (principal > 0) { post(s, 'kredi_odeme', -principal, { memo: `${bank(l.bank)!.label} anapara` }); l.balance -= principal; }
      l.remaining = Math.max(0, l.remaining - 1); l.missed = 0; l.nextDue = day + 30;
      if (l.balance <= 0 && l.kind !== 'insaat') s.loans = s.loans.filter((x) => x.id !== l.id);
    } else {
      anyMissed = true; l.missed++; const late = Math.round(due * 0.02); l.balance += late; l.nextDue = day + 30; c.creditScore = clamp(c.creditScore - 40, 100, 900); c.reputation = clamp(c.reputation - 1, 0, 100);
      events.push({ type: 'LOAN_MISSED', day, pause: true, data: { loanId: l.id, missed: l.missed, due } });
      if (l.missed >= 3) { const raised = forcedLiquidation(s, due, events); if (raised >= due && c.cash >= due) { l.missed = 2; } }
    }
  }
  // kredi notu
  const lev = debtTotal(s) / Math.max(1, Math.abs(netWorth(s)) + debtTotal(s));
  if (!anyMissed) c.creditScore = clamp(c.creditScore + (s.loans.length === 0 ? 1.5 : lev < 0.5 ? 3 : lev < 0.75 ? 1 : -3), 100, 900);
  c.creditScore = Math.round(c.creditScore * 10) / 10;
}
