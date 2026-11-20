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
  project?: number;     // atandığı proje (yoksa ortak havuz)
  morale: number;       // 0–100
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
  office: number;
  reputation: number;   // 0-100
  creditScore: number;  // 0-1000
  stats: { completed: number; sold: number; profit: Money };
  safety: 'dusuk' | 'normal' | 'yuksek';
  procurement: { auto: boolean; supplier: string };
  lastAccidentDay: number;
  satisfaction: number;        // müşteri memnuniyeti (kayan ortalama, 0–100)
  ownership: number;           // şirketin sizdeki payı (%100 = hisse satılmadı)
  bankrupt: boolean;
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
  negoLockUntil: number; lastOffer?: number;
  owner: 'market' | 'player';
  boughtDay?: number; costBasis?: Money;
  clientLand?: boolean;                     // ihale sahası: işveren arsası, şirketin malı değil
  listed?: { askMult: number; day: number } // oyuncu satışa koyduysa
  projectId?: number;
}
export interface CityMarket { landIndex: number; housingIndex: number; supply?: number }
export interface Rival { id: number; name: string; style: 'agresif' | 'dengeli' | 'temkinli'; home: string; cash: Money; rep: number; tech: number; projects: number; wins: number; failed: boolean; since: number; last?: string }
export interface Progress { ach: Record<string, number>; quests: Record<string, number>; c: { loans: number; tendersWon: number; bids: number; events: number; unitsSold: number; started: number; bestQuality: number; crisisMonths: number; investors: number; equitySold: number } }
export interface PendingEvent { id: string; day: number; projectId?: number; city?: string }
export interface BuildState {
  stage: number;               // STAGES indeksi (1–17); 18 = bitti
  progress: number;            // aşama ilerlemesi 0–1
  startDay: number; stageStartDay: number;
  stageBudget: Money[];        // aşama başına planlanan bütçe (baz fiyat), soil planı dahil
  stageStarted: boolean;       // mevcut aşama başlangıç kancası çalıştı mı
  stageMult: number;           // mevcut aşamanın rastgele maliyet sapması
  soilPlanned: number;         // plandaki zemin çarpanı
  permitMult: number;          // ruhsat süresi çarpanı
  priceBase: { mat: number; cost: number };
  spent: Money;                // ödenen (tahakkuk: işçilik, makine, diğer)
  matCost?: Money;             // stoktan tüketilen malzemenin (alış fiyatıyla) bedeli
  unpaid: Money;               // tahakkuk eden, henüz ödenmeyen
  unpaidParts: { malzeme: Money; insaat: Money; makine: Money };
  qualitySum: number; qualityW: number;
  stalled: null | 'nakit' | 'malzeme' | 'kaza';
  accidentUntil?: number;
  machCover?: number;          // son günkü makine kapsama oranı (0–1)
  matShort?: string;           // eksik malzeme (arayüz için)
  qAdj?: number;               // mevcut aşamada kullanılan malzeme kalitesi (−1…+1, dp ağırlıklı)
  stalledDays: number;
  stallStreak?: number;        // art arda durma günü (olay tekrarını sınırlar)
  stallEvtDay?: number;        // son DURDU olayının günü
  soilExtra: Money;            // zemin sürprizi (+/−)
  doneDay?: number;
}
export interface Project {
  id: number; parcelId: number; hood: string; name: string; type: string; quality: string; designSeed: number;
  status: 'taslak' | 'insaat' | 'tamamlandi' | 'satildi';
  build?: BuildState;
  sales?: SalesPolicy;
  contract?: Contract;
  result?: { qualityScore: number; cost: Money; days: number; plannedDays: number; revenue?: Money; profit?: Money; soldDay?: number };
  createdDay: number; cityId: string;
  floors: number; emsal: number; brut: number; satilabilir: number;
  matIndexAtPlan: number;
  budget: { base: Money; soil: Money; soft: Money; total: Money; designFee: Money };
  expected: { revenue: Money; months: number };
}
export interface Order { id: number; material: string; qty: number; unitPrice: Money; supplier: string; placedDay: number; arriveDay: number; delayed: boolean; quality: number }
export interface Machine { id: number; type: string; boughtDay: number; price: Money; brokenUntil: number; uses: number; usedDay?: number }
export interface Unit {
  id: number; projectId: number; area: number; rooms: string; floor: number; view: number; facing: 'K' | 'G' | 'D' | 'B'; mult: number;
  status: 'bos' | 'kapora' | 'satildi';
  price?: Money; payment?: 'pesin' | 'taksit' | 'onsatis'; soldDay?: number;
  kaporaUntil?: number; kaporaAmt?: Money;
  delivered?: boolean; sat?: number; warrantyUntil?: number;
}
export interface Receivable { id: number; unitId: number; projectId: number; amount: Money; dueDay: number; kind: 'taksit' | 'teslim'; missed: number }
export interface SalesPolicy { priceMult: number; agent: boolean; installments: boolean; presale: boolean; contract: Money; commission: Money; sold: number }
export interface Loan {
  id: number; kind: 'ticari' | 'insaat' | 'makine' | 'kisa'; bank: string; principal: Money; balance: Money; rate: number; term: number; remaining: number;
  payment: Money; schedule: 'annuity' | 'interest' | 'bullet'; start: number; nextDue: number; missed: number;
  projectId?: number; machineId?: number; limit?: Money;
}
export interface Investment { id: number; projectId: number; amount: Money; share: number; day: number; paidOut?: boolean }
export interface TenderReq { rep: number; score: number; completed: number; staff: number; machines: number }
export interface Tender {
  id: number; kind: string; title: string; city: string; client: 'kamu' | 'ozel'; type: string; quality: string; area: number; months: number;
  refCost: Money; trueCost: Money; req: TenderReq; bondPct: number; openDay: number; evalDay: number;
  bid?: { price: Money; day: number; bond: Money }; rivals: { name: string; price: Money; tech: number; rep: number }[];
  status: 'acik' | 'kazandi' | 'kaybetti' | 'elendi' | 'iptal'; result?: { winner: string; scores: { name: string; score: number }[]; reason?: string };
}
export interface Contract { tenderId: number; client: string; price: Money; advance: Money; deadline: number; bond: Money; bondReturned?: boolean; pending: { day: number; amount: Money }[]; doneShare: number }
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
  weather: Record<string, 'acik' | 'yagmur' | 'kar'>;
  stock: Record<string, { qty: number; qual: number; cost: number }>;
  orders: Order[];
  matPrice: Record<string, number>;
  machines: Machine[];
  units: Unit[];
  receivables: Receivable[];
  /** Şubesi olan (ilan görüp alım yapabildiğiniz) iller. Başlangıç şehri ücretsizdir. */
  openCities: string[];
  loans: Loan[];
  investments: Investment[];
  tenders: Tender[];
  rivals: Rival[];
  pending: PendingEvent | null;
  evtLast: Record<string, number>;
  progress: Progress;
  /** Malzeme fiyat geçmişi (aylık etkin çarpan; en çok 36 ay). Eski kayıtlarda yoktur. */
  matHist?: Record<string, number[]>;
}

export interface GameEvent {
  type: string;
  day: number;
  /** true ise oyun otomatik duraklar (karar/önemli olay). */
  pause?: boolean;
  data?: Record<string, unknown>;
}
