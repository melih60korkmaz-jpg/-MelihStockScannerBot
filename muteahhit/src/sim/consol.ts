import { type Money } from '../core/money';
import type { GameState, IcEntry } from '../core/types';
import { ledgerCat } from '../data';
import { divisionOf, DIV_INFO, type DivKey } from './holding';
import { debtTotal } from './loans';
import { machineAssetValue } from './machines';
import { advancesTotal, receivablesTotal } from './sales';
import { depositsTotal } from './realestate';
import { payablesTotal } from './supply';
import { contractAssets } from './tenders';
import { infraAssets } from './infra';
import { landAssetValue } from './land';
import { investorLiability, netWorth, projectAssetValue, stockValue } from './finance';
import { OPS_KINDS, ENERGY_KINDS, ventureValue } from './ventures';
import { stakesValue } from './invest';

/**
 * İştirakler ve konsolide tablo. Bölümler (inşaat, işletmeler, enerji, altyapı, bağlı şirketler, fabrika/makine, gayrimenkul) iştirak olarak izlenir:
 * her birinin kendi kasası, yatırım bütçesi, varlıkları, borçları ve kâr/zararı vardır. Hesaplar defterden türetilir; hiçbir tutar iki kez sayılmaz:
 *  - iştirak kasası = merkezden aktarılan sermaye/borç − geri ödeme/temettü + bölümün birikmiş defter kârı; merkez kasası = gerçek kasa − iştirak kasaları (kalan).
 *  - Şirketler arası işlemler (sermaye, borç, temettü) gerçek nakdi değiştirmez; konsolidasyonda "iştirak yatırımı/özkaynak" ve "şirket içi alacak/borç" olarak elenir.
 *  - Konsolide özkaynak = Σ özkaynak − iştirak yatırımları = net varlık (testle doğrulanır).
 */
export const SUB_KEYS: DivKey[] = ['insaat', 'isletme', 'enerji', 'altyapi', 'bagli', 'makine', 'gayrimenkul'];
export type IcKind = IcEntry['kind'];
const subOf = (s: GameState, d: string) => (SUB_KEYS as string[]).includes(d);

export function icNet(s: GameState, div: string): { capital: Money; loan: Money; net: Money } {
  let capital = 0, loan = 0, net = 0;
  for (const e of s.ic ?? []) {
    const sign = e.to === div ? 1 : e.from === div ? -1 : 0; if (!sign) continue;
    if (e.kind === 'sermaye') { capital += sign * e.amount; net += sign * e.amount; } else if (e.kind === 'borc') { loan += sign * e.amount; net += sign * e.amount; } else if (e.kind === 'borc_odeme') { loan += sign * e.amount; net += sign * e.amount; } else if (e.kind === 'temettu') { net += sign * e.amount; capital += sign * e.amount; }
  }
  return { capital, loan, net };
}
/** Bölümün birikmiş defter kârı (gelir − gider − vergi; yatırım/finansman hariç). */
export function divisionProfitTotal(s: GameState): Record<DivKey, Money> {
  const out = Object.fromEntries(Object.keys(DIV_INFO).map((k) => [k, 0])) as Record<DivKey, Money>;
  for (const e of s.ledger) { const k = ledgerCat(e.cat)?.kind; if (k !== 'gelir' && k !== 'gider' && k !== 'vergi') continue; out[divisionOf(e.cat)] += e.amount; }
  return out;
}
export interface EntityRow { key: DivKey | 'merkez'; label: string; ico: string; treasury: Money; operating: Money; icReceivable: Money; investment: Money; assets: Money; debt: Money; icPayable: Money; liabilities: Money; equity: Money; profitTotal: Money }
export interface Consolidated {
  rows: EntityRow[]; sumAssets: Money; sumLiabilities: Money; sumEquity: Money; elimInvest: Money; elimIc: Money;
  assets: Money; liabilities: Money; equity: Money; netWorth: Money; ok: boolean;
}
/** Bölümlere dağıtılan işletme varlıkları (netWorth bileşenleriyle birebir aynı toplam). */
function operatingAssets(s: GameState): Record<DivKey | 'merkez', Money> {
  const z = Object.fromEntries([...Object.keys(DIV_INFO), 'merkez'].map((k) => [k, 0])) as Record<DivKey | 'merkez', Money>;
  z.insaat = landAssetValue(s) + projectAssetValue(s) + stockValue(s) + receivablesTotal(s) - advancesTotal(s) - payablesTotal(s) - investorLiability(s) + contractAssets(s);
  z.gayrimenkul = -depositsTotal(s); z.makine = machineAssetValue(s); z.altyapi = infraAssets(s); z.bagli = stakesValue(s);
  for (const v of s.ventures) { const val = ventureValue(s, v); if (v.kind === 'bagli') z.bagli += val; else if (v.kind === 'fabrika') z.makine += val; else if (ENERGY_KINDS.includes(v.kind)) z.enerji += val; else if (OPS_KINDS.includes(v.kind)) z.isletme += val; else z.isletme += val; }
  return z;
}
export function consolidate(s: GameState): Consolidated {
  const op = operatingAssets(s), prof = divisionProfitTotal(s), c = s.company!, rows: EntityRow[] = [];
  let subTreasury = 0;
  const assumed: Record<string, Money> = { bagli: s.loans.filter((l) => l.sub === 'bagli').reduce((a, l) => a + l.balance, 0) };
  for (const k of SUB_KEYS) {
    const ic = icNet(s, k), treasury = ic.net + prof[k]; subTreasury += treasury;
    const operating = op[k], assets = treasury + operating, icPayable = Math.max(0, ic.loan), debt = assumed[k] ?? 0, liabilities = icPayable + debt;
    rows.push({ key: k, label: DIV_INFO[k].label, ico: DIV_INFO[k].ico, treasury, operating, icReceivable: 0, investment: 0, assets, debt, icPayable, liabilities, equity: assets - liabilities, profitTotal: prof[k] });
  }
  const mTreasury = c.cash - subTreasury, invest = rows.reduce((a, r) => a + Math.max(0, icNet(s, r.key as string).capital), 0), recv = rows.reduce((a, r) => a + Math.max(0, icNet(s, r.key as string).loan), 0);
  const ext = debtTotal(s) - (assumed.bagli ?? 0), mAssets = mTreasury + recv + invest, mLiab = ext;
  rows.unshift({ key: 'merkez', label: DIV_INFO.merkez.label, ico: DIV_INFO.merkez.ico, treasury: mTreasury, operating: 0, icReceivable: recv, investment: invest, assets: mAssets, debt: ext, icPayable: 0, liabilities: mLiab, equity: mAssets - mLiab, profitTotal: prof.merkez });
  const sumAssets = rows.reduce((a, r) => a + r.assets, 0), sumLiabilities = rows.reduce((a, r) => a + r.liabilities, 0), sumEquity = rows.reduce((a, r) => a + r.equity, 0);
  const elimIc = recv, assets = sumAssets - invest - recv, liabilities = sumLiabilities - recv, equity = assets - liabilities, nw = netWorth(s);
  return { rows, sumAssets, sumLiabilities, sumEquity, elimInvest: invest, elimIc, assets, liabilities, equity, netWorth: nw, ok: Math.abs(equity - nw) <= 2 };
}

export function transferError(s: GameState, div: string, kind: IcKind, amount: number): string | null {
  const c = s.company; if (!c) return 'Şirket yok.'; if (c.level < 6) return 'İştirak yönetimi seviye 6\'da açılır.'; if (!subOf(s, div)) return 'Geçersiz iştirak.';
  if (!['sermaye', 'borc', 'borc_odeme', 'temettu'].includes(kind)) return 'Geçersiz işlem.'; if (!(amount > 0) || !Number.isFinite(amount) || !Number.isInteger(amount)) return 'Tutar geçersiz.';
  const cons = consolidate(s), row = cons.rows.find((r) => r.key === div)!, merkez = cons.rows[0]!;
  if (kind === 'sermaye' || kind === 'borc') { if (merkez.treasury < amount) return 'Merkez kasasında yeterli tutar yok.'; return null; }
  if (kind === 'borc_odeme') { if (amount > row.icPayable) return 'Ödenecek şirket içi borçtan fazla.'; if (row.treasury < amount) return 'İştirak kasasında yeterli tutar yok.'; return null; }
  if (row.treasury < amount) return 'İştirak kasasında yeterli tutar yok.'; return null;
}
const MEMO: Record<IcKind, string> = { sermaye: 'Sermaye aktarımı', borc: 'Şirket içi borç', borc_odeme: 'Şirket içi borç ödemesi', temettu: 'İştirak temettüsü' };
/** Gerçek nakit hareketi yoktur: yalnızca şirketler arası kayıt (konsolidasyonda elenir). */
export function doTransfer(s: GameState, div: string, kind: IcKind, amount: number): void {
  const toSub = kind === 'sermaye' || kind === 'borc'; (s.ic ??= []).push({ day: s.clock.day, from: toSub ? 'merkez' : div, to: toSub ? div : 'merkez', amount, kind, memo: MEMO[kind] }); if (s.ic.length > 400) s.ic.shift();
}
export function budgetError(s: GameState, div: string, budget: number): string | null { if (!s.company) return 'Şirket yok.'; if (!subOf(s, div)) return 'Geçersiz iştirak.'; if (!(budget >= 0) || !Number.isFinite(budget)) return 'Bütçe geçersiz.'; return null; }
export function setSubBudget(s: GameState, div: string, budget: number): void { (s.holding.budget ??= {})[div] = Math.round(budget); }
