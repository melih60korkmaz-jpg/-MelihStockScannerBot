import type { Money } from './money';
import type { RngState } from './rng';

export type Difficulty = 'rahat' | 'gercekci' | 'acimasiz';

export interface LedgerEntry {
  day: number;
  cat: string;          // 'sermaye' | 'maas' | 'kira' | ...
  amount: Money;        // + gelir, − gider (kuruş)
  projectId?: number;
  memo?: string;
}

export interface Staff {
  id: number;
  type: string;         // data/staffTypes id
  name: string;
  salary: Money;        // aylık
  experience: number;   // 0-100
  hiredDay: number;
}

export interface Company {
  name: string;
  founderBackground: string;
  startCity: string;
  emblem: { shape: number; color: number };
  level: number;
  reputation: number;   // 0-100
  creditScore: number;  // 0-1000
  cash: Money;          // ÖNBELLEK: her zaman ledgerBase + Σledger
}

export type Regime = 'normal' | 'genisleme' | 'asiri_isinma' | 'daralma' | 'kriz' | 'toparlanma';
export interface MacroState {
  regime: Regime; regimeSince: number; regimeEnd: number; calmUntilDay: number;
  policyRate: number;   // yıllık %
  inflation: number;    // yıllık %
  confidence: number;   // 0–100
  materialIndex: number; // 100 = başlangıç
}
export interface MacroPoint { day: number; regime: Regime; policyRate: number; inflation: number; confidence: number; materialIndex: number }
export interface NewsItem { day: number; text: string; tone: 'info' | 'ok' | 'warn' | 'bad' }
export interface HistoryPoint { day: number; cash: Money; netWorth: Money }

export interface GameState {
  meta: { version: number; seed: number; difficulty: Difficulty };
  clock: { day: number };
  rng: RngState;
  nextId: number;
  company: Company | null;
  staff: Staff[];
  /** Sıkıştırılmış eski kayıtların toplamı (compactLedger). cash = ledgerBase + Σ ledger */
  ledgerBase: Money;
  ledger: LedgerEntry[];
  macro: MacroState;
  macroHistory: MacroPoint[];
  news: NewsItem[];
  history: HistoryPoint[];
  /** Sabit giderler (kira, ofis…) için birikimli enflasyon çarpanı. */
  costIndex: number;
  /** Önceki çeyreklerden devreden zarar (vergi matrahından düşer). */
  taxLossCarry: Money;
}

export interface GameEvent {
  type: string;
  day: number;
  /** true ise oyun otomatik duraklar (karar/önemli olay). */
  pause?: boolean;
  data?: Record<string, unknown>;
}
