import { TL, type Money } from '../core/money';
import type { GameEvent, GameState } from '../core/types';
import { monthlyRows, netWorth } from './finance';
import { post } from './ledger';
import { aliveRivals } from './rivals';
import { VENTURE_INFO, MAX_VENTURES } from './ventures';

/**
 * Borsa ve ortaklık: halka arz, hisse fiyatı, ikincil satış, geri alım ve rakip şirket satın alma.
 * Mevcut ortaklık sistemiyle (company.ownership, en çok %40 pay satılır) birlikte çalışır: pay hiçbir zaman %60'ın altına inmez.
 */
export const SHARES = 100_000_000, IPO_MIN_LEVEL = 7, IPO_MIN_NW = TL(1_000_000_000), ACQ_MIN_LEVEL = 6, MIN_OWNERSHIP = 60;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const hash01 = (n: number): number => { let a = (n | 0) >>> 0; a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a ^= a >>> 16; return (a >>> 0) / 4294967296; };

/** Hisse fiyatını belirleyen etkenler (çarpana eklenen paylar): kâr, borç yükü, devam eden projeler, sektör/kriz ve yatırımcı güveni. */
export function priceDrivers(s: GameState): { profit: number; debt: number; projects: number; sector: number; trust: number } {
  const rows = monthlyRows(s).slice(-4, -1), profit3 = rows.reduce((a, r) => a + r.net, 0), nw = Math.max(1, netWorth(s)), debt = s.loans.reduce((a, l) => a + l.balance, 0);
  const reg = s.macro.regime, sector = reg === 'kriz' ? -0.12 : reg === 'daralma' ? -0.06 : reg === 'asiri_isinma' ? 0.05 : 0.02;
  const trust = clamp(((s.company?.reputation ?? 50) - 50) / 400 + (s.macro.confidence - 50) / 400, -0.2, 0.2);
  return { profit: clamp((profit3 * 4) / nw, -0.15, 0.25), debt: -clamp(debt / (nw + debt), 0, 1) * 0.18, projects: Math.min(0.08, s.projects.filter((p) => p.status === 'insaat').length * 0.012), sector, trust };
}
export const fairPrice = (s: GameState): Money => {
  const c = s.company!, h = s.history, past = h.length >= 7 ? h[h.length - 7]!.netWorth : h[0]?.netWorth ?? 0, nw = Math.max(1, netWorth(s));
  const growth = past > 0 ? clamp((nw / past - 1) * 0.5, -0.3, 0.3) : 0;
  const d = priceDrivers(s), mult = clamp(0.9 + (s.macro.confidence - 50) / 200 + (c.reputation - 50) / 300 + growth + d.profit + d.debt + d.projects + d.sector, 0.6, 1.9);
  return Math.max(1, Math.round((nw * mult) / SHARES));
};
export const marketCap = (s: GameState): Money => (s.equity ? s.equity.price * SHARES : 0);
export const ownedShare = (s: GameState): number => s.company!.ownership;

export function ipoError(s: GameState, pct: number): string | null {
  const c = s.company; if (!c) return 'Şirket yok.'; if (c.bankrupt) return 'Şirket iflas etti.';
  if (s.equity?.listed) return 'Şirket zaten halka açık.'; if (c.level < IPO_MIN_LEVEL) return `Halka arz için şirket seviyesi ${IPO_MIN_LEVEL} gerekir.`;
  if (netWorth(s) < IPO_MIN_NW) return 'Halka arz için net varlık en az 1 milyar ₺ olmalı.'; if (c.reputation < 55) return 'Halka arz için itibar en az 55 olmalı.';
  if (!(pct >= 10 && pct <= 25)) return 'Halka arz oranı %10–%25 olmalı.'; if (c.ownership - pct < MIN_OWNERSHIP) return `Sahiplik %${MIN_OWNERSHIP}'ın altına inemez (şu an %${c.ownership}).`;
  return null;
}
export const ipoPrice = (s: GameState): Money => Math.max(1, Math.round(fairPrice(s) * 0.92));
/** Halka arz net geliri: brüt hasılat − aracı kurum/hazırlık (%3) − izahname ve denetim (sabit). Halka açık şirket ayrıca aylık uyum/denetim gideri öder. */
export const IPO_FIXED_TL = 8_000_000, LISTED_MONTHLY_TL = 600_000;
export const ipoProceeds = (s: GameState, pct: number): Money => Math.round(ipoPrice(s) * SHARES * pct / 100 * 0.97) - Math.round(TL(IPO_FIXED_TL) * s.costIndex);
export function goPublic(s: GameState, pct: number, events: GameEvent[]): Money {
  const c = s.company!, price = ipoPrice(s), proceeds = ipoProceeds(s, pct);
  post(s, 'hisse', proceeds, { memo: `Halka arz (%${pct})` }); c.ownership -= pct; c.reputation = clamp(c.reputation + 3, 0, 100);
  s.equity = { listed: true, ipoDay: s.clock.day, shares: SHARES, price, ipoPrice: price, hist: [price], fair: fairPrice(s) };
  events.push({ type: 'IPO', day: s.clock.day, pause: true, data: { pct, price, proceeds } }); return proceeds;
}
export function tradeError(s: GameState, kind: 'sec' | 'buy', pct: number): string | null {
  const c = s.company; if (!c) return 'Şirket yok.'; if (!s.equity?.listed) return 'Şirket halka açık değil.';
  if (kind === 'sec') { if (!(pct >= 3 && pct <= 15)) return 'İkincil satış oranı %3–%15 olmalı.'; if (c.ownership - pct < MIN_OWNERSHIP) return `Sahiplik %${MIN_OWNERSHIP}'ın altına inemez.`; return null; }
  if (!(pct >= 1 && pct <= 10)) return 'Geri alım oranı %1–%10 olmalı.'; if (c.ownership + pct > 100) return 'Şirketin tamamına sahipsiniz.';
  if (c.cash < buybackCost(s, pct)) return 'Geri alım için yeterli nakit yok.'; return null;
}
export const secondaryProceeds = (s: GameState, pct: number): Money => Math.round(s.equity!.price * SHARES * pct / 100 * 0.95);
export const buybackCost = (s: GameState, pct: number): Money => Math.round(s.equity!.price * SHARES * pct / 100 * 1.02);
export function secondaryOffering(s: GameState, pct: number, events: GameEvent[]): Money {
  const v = secondaryProceeds(s, pct); post(s, 'hisse', v, { memo: `İkincil hisse satışı (%${pct})` }); s.company!.ownership -= pct;
  s.equity!.price = Math.max(1, Math.round(s.equity!.price * (1 - pct / 200))); events.push({ type: 'EQUITY_SOLD', day: s.clock.day, data: { pct, price: v } }); return v;
}
export function buyback(s: GameState, pct: number): Money {
  const v = buybackCost(s, pct); post(s, 'hisse', -v, { memo: `Hisse geri alımı (%${pct})` }); s.company!.ownership += pct;
  s.equity!.price = Math.round(s.equity!.price * (1 + pct / 150)); return v;
}
/**
 * Aylık: adil değer (net varlık × çarpan) yeniden hesaplanır; itibar etkisi uygulanır.
 * Günlük: fiyat, adil değere doğru yumuşakça çekilir (mean-reversion, günde ≤%3 hareket) ve ±%1,2 gürültü alır:
 * grafik her oyun günü hareket eder ama düzenli ve dengeli kalır; fiyat adil değerden uzun süre kopmaz.
 */
export function stockMonthly(s: GameState): void {
  const e = s.equity; if (!e?.listed || !s.company) return;
  post(s, 'yonetim', -Math.round(TL(LISTED_MONTHLY_TL) * s.costIndex), { memo: 'Borsa uyum, denetim ve yatırımcı ilişkileri' });
  e.fair = fairPrice(s);
  const c = s.company; if (e.price > e.ipoPrice * 1.3) c.reputation = clamp(c.reputation + 0.5, 0, 100); else if (e.price < e.ipoPrice * 0.7) c.reputation = clamp(c.reputation - 0.5, 0, 100);
}
export function stockDaily(s: GameState): void {
  const e = s.equity; if (!e?.listed || !s.company) return;
  if (e.fair === undefined) e.fair = fairPrice(s);
  const noise = (hash01(s.clock.day * 131 + 17) - 0.5) * 0.024, drift = ((e.fair - e.price) / e.price) * 0.06;
  e.price = Math.max(1, Math.round(e.price * (1 + clamp(drift + noise, -0.03, 0.03)))); e.hist.push(e.price); if (e.hist.length > 240) e.hist.shift();
}

// ---------------- rakip satın alma ----------------
export function acquisitionPrice(s: GameState, rivalId: number): Money {
  const r = s.rivals.find((x) => x.id === rivalId)!;
  const value = r.cash * 1.1 + r.projects * TL(6_000_000) + r.wins * TL(3_000_000);
  return Math.max(TL(8_000_000), Math.round(value * (r.failed ? 0.45 : 1.35 + r.rep / 200)));
}
export function acquireError(s: GameState, rivalId: number): string | null {
  const c = s.company; if (!c) return 'Şirket yok.'; if (c.bankrupt) return 'Şirket iflas etti.'; if (c.level < ACQ_MIN_LEVEL) return `Şirket satın almak için seviye ${ACQ_MIN_LEVEL} gerekir.`;
  const r = s.rivals.find((x) => x.id === rivalId); if (!r) return 'Rakip bulunamadı.'; if (r.last === 'satin_alindi') return 'Bu şirket zaten satın alındı.';
  if (s.ventures.length >= MAX_VENTURES) return 'İş kolu sınırına ulaşıldı.'; if (c.cash < acquisitionPrice(s, rivalId)) return 'Satın alma için yeterli nakit yok.';
  void aliveRivals; return null;
}
export function acquireRival(s: GameState, rivalId: number, events: GameEvent[]): void {
  const r = s.rivals.find((x) => x.id === rivalId)!, price = acquisitionPrice(s, rivalId), c = s.company!;
  post(s, 'yatirim_isletme', -price, { memo: `${r.name} satın alındı` });
  s.ventures.push({ id: s.nextId++, kind: 'bagli', name: `${r.name} (bağlı şirket)`, city: r.home, openedDay: s.clock.day, readyDay: s.clock.day, capex: price, size: r.tech, quality: 1, ci0: s.costIndex, rivalName: r.name, last: { revenue: 0, cost: 0, occ: 1, day: s.clock.day }, total: { revenue: 0, cost: 0 } });
  const wasFailed = r.failed; r.failed = true; r.projects = 0; r.last = 'satin_alindi'; r.cash = 0; c.reputation = clamp(c.reputation + (wasFailed ? 1 : 2), 0, 100);
  events.push({ type: 'ACQUIRED', day: s.clock.day, data: { rival: r.name, price } });
}
void VENTURE_INFO;
