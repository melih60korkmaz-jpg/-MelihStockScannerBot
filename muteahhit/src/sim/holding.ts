import type { Division, GameState } from '../core/types';
import type { Money } from '../core/money';
import { ledgerCat } from '../data';
import { monthlyRows } from './finance';

/** Holding bölümleri: defter kategorilerinden bölüm bazlı gelir-gider-kâr (ortak merkez giderleri ayrı "Merkez" satırındadır). */
export type DivKey = Division | 'merkez';
export const DIV_INFO: Record<DivKey, { label: string; ico: string }> = {
  insaat: { label: 'İnşaat ve satış', ico: '🏗️' }, isletme: { label: 'Gayrimenkul işletmeleri', ico: '🏨' }, enerji: { label: 'Enerji', ico: '⚡' },
  altyapi: { label: 'Altyapı işleri', ico: '🛣️' }, bagli: { label: 'Bağlı şirketler', ico: '🏛️' }, merkez: { label: 'Merkez (ofis, maaş, faiz, vergi)', ico: '🏢' },
};
const EXPLICIT: Record<string, DivKey> = { isletme_gelir: 'isletme', isletme_gider: 'isletme', enerji_gelir: 'enerji', enerji_gider: 'enerji', altyapi_gelir: 'altyapi', altyapi_gider: 'altyapi', bagli_gelir: 'bagli' };
const CONSTRUCTION = new Set(['satis', 'hakedis', 'kira_geliri', 'malzeme', 'tasarim', 'etut', 'insaat', 'makine', 'komisyon', 'garanti']);
export const divisionOf = (cat: string): DivKey => EXPLICIT[cat] ?? (CONSTRUCTION.has(cat) ? 'insaat' : 'merkez');

export interface DivPL { revenue: Money; cost: Money; profit: Money }
/** Son `months` ayın bölüm bazlı gelir/gider/kâr özeti (tamamlanmış aylar). */
export function divisionPL(s: GameState, months = 1): Record<DivKey, DivPL> {
  const out = Object.fromEntries((Object.keys(DIV_INFO) as DivKey[]).map((k) => [k, { revenue: 0, cost: 0, profit: 0 }])) as Record<DivKey, DivPL>;
  for (const r of monthlyRows(s).slice(-months)) for (const [cat, amt] of Object.entries(r.byCat)) {
    const kind = ledgerCat(cat)?.kind; if (kind !== 'gelir' && kind !== 'gider' && kind !== 'vergi') continue;
    const d = out[divisionOf(cat)], a = amt as number; if (a >= 0) d.revenue += a; else d.cost += -a; d.profit += a;
  }
  return out;
}
