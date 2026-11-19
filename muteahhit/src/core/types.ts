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

export type Soil = 'saglam' | 'kaya' | 'kil' | 'dolgu' | 'yeralti_suyu' | 'egimli';
export interface Parcel {
  id: number; city: string; district: string; hood: string;
  area: number; zoning: 'konut' | 'ticaret' | 'karma' | 'sanayi';
  taks: number; kaks: number; maxFloors: number;
  soil: Soil; soilKnown: boolean;           // gerçek zemin gizli: etütle açılır
  roads: number; corner: boolean; infra: number;
  growth: number; growthKnown: boolean;     // gerçek gelişim potansiyeli (0–0.3): piyasa araştırmasıyla netleşir
  unitBase: Money;                          // m² başına adil değer (endeks 1.0'da, kuruş)
  askMult: number; reserveMult: number;     // satıcının istediği ve gizli kabul eşiği (adil değere göre)
  negoLockUntil: number;
  owner: 'market' | 'player';
  boughtDay?: number; costBasis?: Money;
  listed?: { askMult: number; day: number } // oyuncu satışa koyduysa
  projectId?: number;
}
export interface CityMarket { landIndex: number; housingIndex: number }
export interface Project {
  id: number; parcelId: number; name: string; type: string; quality: string; designSeed: number;
  status: 'taslak';
  createdDay: number; cityId: string;
  floors: number; emsal: number; brut: number; satilabilir: number;
  matIndexAtPlan: number;
  budget: { base: Money; soil: Money; soft: Money; total: Money; designFee: Money };
  expected: { revenue: Money; months: number };
}
export interface Scheduled { day: number; type: 'survey'; data: { parcelId: number; kind: 'soil' | 'market' } }

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
  parcels: Parcel[];
  projects: Project[];
  cityMarket: Record<string, CityMarket>;
  scheduled: Scheduled[];
}

export interface GameEvent {
  type: string;
  day: number;
  /** true ise oyun otomatik duraklar (karar/önemli olay). */
  pause?: boolean;
  data?: Record<string, unknown>;
}
