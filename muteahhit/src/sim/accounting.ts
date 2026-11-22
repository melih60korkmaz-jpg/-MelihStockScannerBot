import { TL, type Money } from '../core/money';
import { dateOf } from '../core/calendar';
import type { GameEvent, GameState } from '../core/types';
import { ledgerCat } from '../data';
import { post } from './ledger';
import { news } from './rivals';

/** Muhasebe: muhasebeci çeyreklik vergiyi %6 düşürür ve yıllık vergi denetiminde ceza riskini azaltır. */
export const hasAccountant = (s: GameState): boolean => s.staff.some((x) => x.type === 'muhasebeci');
export const ACCT_TAX_CUT = 0.06;
const hash01 = (n: number): number => { let a = (n | 0) >>> 0; a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a ^= a >>> 16; return (a >>> 0) / 4294967296; };
export const auditChance = (s: GameState): number => (hasAccountant(s) ? 0.05 : 0.3);
/** Yıllık vergi denetimi: geçen yılın gelirinin %1,5'i (en az 200 bin ₺) ceza; kayıtlar düzenliyse çıkmaz. */
export function taxAuditYearly(s: GameState, events: GameEvent[]): void {
  if (!s.company || s.company.bankrupt) return; const year = dateOf(s.clock.day).year - 1; if (year < dateOf(0).year || s.audits?.some((a) => a.year === year)) return;
  let rev = 0; for (const e of s.ledger) { if (dateOf(e.day).year !== year) continue; if (ledgerCat(e.cat)?.kind === 'gelir') rev += e.amount; }
  if (rev < TL(2_000_000)) return; const hit = hash01(year * 7919 + s.nextId % 97 + 5) < auditChance(s), penalty = hit ? Math.round(Math.max(TL(200_000) * s.costIndex, rev * 0.015)) : 0;
  if (hit) { post(s, 'vergi', -penalty, { memo: `Vergi denetimi cezası (${year})` }); news(s, events, `Vergi denetimi: ${year} kayıtlarında eksik bulundu, ceza ödendi.${hasAccountant(s) ? '' : ' Muhasebeci çalıştırmak bu riski azaltır.'}`, 'warn'); }
  (s.audits ??= []).push({ year, penalty, clean: !hit }); if (s.audits.length > 20) s.audits.shift();
}
export const taxSavedTotal = (s: GameState): Money => s.taxSaved ?? 0;
