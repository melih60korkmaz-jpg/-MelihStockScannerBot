import type { Money } from '../core/money';
import { monthKey } from '../core/calendar';
import type { GameState, LedgerEntry } from '../core/types';

/** Tek giriş noktası: para yalnızca buradan hareket eder, nakit önbelleği aynı anda güncellenir. */
export function post(s: GameState, cat: string, amount: Money, opts: { projectId?: number; memo?: string } = {}): void {
  if (!Number.isInteger(amount)) throw new Error(`Ledger: tamsayı olmayan tutar (${amount})`);
  if (!s.company) throw new Error('Ledger: şirket yok');
  const e: LedgerEntry = { day: s.clock.day, cat, amount };
  if (opts.projectId !== undefined) e.projectId = opts.projectId;
  if (opts.memo) e.memo = opts.memo;
  s.ledger.push(e);
  s.company.cash += amount;
}

export const ledgerSum = (s: GameState): Money => s.ledger.reduce((a, e) => a + e.amount, 0);

/** Değişmez kural: nakit = ledgerBase + Σ ledger. */
export function checkInvariant(s: GameState): boolean {
  return !s.company || s.company.cash === s.ledgerBase + ledgerSum(s);
}

/**
 * Kayıt boyutunu korur: `beforeDay`'den eski girişleri (ay+kategori+proje) toplamlarına indirir.
 * Toplam değişmez → invariant korunur. Bakiye için ayrıntı gerekmeyen eski veriler özetlenir.
 */
export function compactLedger(s: GameState, beforeDay: number): void {
  const old: LedgerEntry[] = [];
  const keep: LedgerEntry[] = [];
  for (const e of s.ledger) (e.day < beforeDay ? old : keep).push(e);
  if (old.length === 0) return;
  const groups = new Map<string, LedgerEntry>();
  for (const e of old) {
    const k = `${monthKey(e.day)}|${e.cat}|${e.projectId ?? ''}`;
    const g = groups.get(k);
    if (g) g.amount += e.amount;
    else groups.set(k, { day: e.day, cat: e.cat, amount: e.amount, ...(e.projectId !== undefined ? { projectId: e.projectId } : {}) });
  }
  s.ledger = [...groups.values(), ...keep];
}
