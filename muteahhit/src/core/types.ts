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
  founder?: string;
  /** Yıllık odak (kurul kararı) ve ofis eşyaları; eski kayıtlarda yok. */
  focus?: { id: string; year: number };
  decor?: string[];           // kurucu (oyuncu) adı; eski kayıtlarda yok → 'Patron'
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
  /** Fırsat ilanlarından gelen arsalar (eski kayıtlarda yok): eski bina (yıkım bitene dek proje açılamaz) ve kat karşılığı pay oranı. */
  oldBuilding?: boolean; demolishUntil?: number; kat?: { share: number; owner: string };
  clientLand?: boolean;                     // ihale sahası: işveren arsası, şirketin malı değil
  listed?: { askMult: number; day: number } // oyuncu satışa koyduysa
  projectId?: number;
}
export interface CityMarket { landIndex: number; housingIndex: number; supply?: number }
/** İş kolları (Holding): gayrimenkul işletmeleri, enerji santralleri ve satın alınan bağlı şirketler. */
export type VentureKind = 'otel' | 'avm' | 'gunes' | 'ruzgar' | 'bagli' | 'restoran' | 'otopark' | 'tatil' | 'is_merkezi' | 'ofis' | 'site' | 'depolama' | 'fabrika';
export interface Venture {
  id: number; kind: VentureKind; name: string; city: string; openedDay: number; readyDay: number;
  capex: Money;            // yatırım bedeli (kayıt değeri)
  size: number;            // otel: oda · avm: kiralanabilir m² · gunes/ruzgar: MW · bagli: 0
  quality: number;         // 0 ekonomik … 3 lüks (otel/avm)
  ci0: number;             // açılıştaki maliyet endeksi (enflasyonla gelir/gider ölçeklenir)
  projectId?: number; projectRef?: number; rivalName?: string; brokenUntil?: number; prod?: string; assumedDebt?: Money;
  /** İşletme yönetimi (eski kayıtlarda yok): fiyat çarpanı, personel düzeyi (1–3), reklam düzeyi (0–3), müdür; memnuniyet; sözleşmeli satış; son aylar. */
  ops?: { price: number; staff: number; ads: number; mgr: Exec | null }; sat?: number; ppa?: { price: number; until: number }; hist?: { day: number; rev: Money; cost: Money; occ: number }[];
  last: { revenue: Money; cost: Money; occ: number; day: number };
  total: { revenue: Money; cost: Money };
}
export type Division = 'insaat' | 'isletme' | 'enerji' | 'altyapi' | 'bagli';
export type Strategy = 'buyume' | 'dengeli' | 'temkinli';
/** Rakip şirketteki hisse payı (yüzde). */
export interface Stake { rivalId: number; pct: number; cost: Money; since: number }
/** Şirketler arası (iştirak) işlem: konsolidasyonda elenir. from/to: 'merkez' ya da bölüm anahtarı. */
export interface IcEntry { day: number; from: string; to: string; amount: Money; kind: 'sermaye' | 'borc' | 'borc_odeme' | 'temettu'; memo: string }
export interface HoldingState { strategy: Record<'isletme' | 'enerji' | 'altyapi', Strategy>; gm: Record<'isletme' | 'enerji' | 'altyapi', boolean>; budget?: Record<string, Money> }
export interface StockState { listed: boolean; ipoDay: number; shares: number; price: Money; ipoPrice: Money; hist: number[]; fair?: Money }   // hist: günlük kapanışlar (en çok 240)
/** Altyapı işi (yol, köprü, tünel, baraj…): ihaleyle kazanılır; ilerleme makine ve ekip kapasitesine bağlıdır; hakediş 45 gün vadelidir. */
export interface InfraJob {
  id: number; tenderId: number; kind: string; name: string; city: string; price: Money; advance: Money; bond: Money; trueCost: Money;
  startDay: number; deadline: number; months: number; progress: number; spent: Money; doneShare: number; pending: { day: number; amount: Money }[];
  status: 'devam' | 'kabul' | 'garanti' | 'bitti'; stalled: 'nakit' | 'kapasite' | 'malzeme' | 'teknik' | null; bondReturned?: boolean; result?: { profit: Money; late: number; day: number };
  /** Gelişmiş altyapı alanları (eski kayıtlarda yok): malzeme kalitesi, kabul süreci, tutulan teminat, maliyet aşımı, denetim ve teknik duraklama. */
  qSum?: number; qW?: number; acceptAt?: number; garantiEnd?: number; retention?: Money; overrun?: Money; claimed?: Money; inspections?: number; failedInsp?: number; techUntil?: number; rework?: Money; late?: number; matShort?: string; events?: { day: number; text: string }[];
}
export interface Rival { rel?: number; asked?: number; id: number; name: string; style: 'agresif' | 'dengeli' | 'temkinli'; home: string; cash: Money; rep: number; tech: number; projects: number; wins: number; failed: boolean; since: number; last?: string }
/** Yıllık rapor (isteğe bağlı dizi; eski kayıtlarda yok). */
export interface YearReport {
  year: number; revenue: Money; expense: Money; profit: Money; netWorth: Money; netWorthChange: Money | null; cash: Money;
  completed: number; sold: number; totals: { completed: number; sold: number }; reputation: number; level: number;
  goals?: { score: number; res: { id: string; label: string; pct: number }[] };
  rank: number; rivals: number; leader: string | null; topIncome?: { cat: string; amount: Money }; topExpense?: { cat: string; amount: Money }; staff: number; openProjects: number;
}
/** Karar günlüğü kaydı. */
export interface Decision { day: number; kind: string; title: string; detail: string }
/** Yönetim Merkezi (eski kayıtlarda yok; ilk erişimde oluşturulur). */
export interface Exec { id: number; name: string; role: string; skill: number; exp: number; salary: Money; style: 'temkinli' | 'dengeli' | 'atilgan'; since: number; mistakes: number }
export interface BoardMember { id: number; name: string; role: string; growth: number; risk: number; loyalty: number }
export interface AgendaOption { l: string; d: string; eff: [string, ...(number | string)[]][]; g: number; r: number; act?: { kind: 'mode'; id: 'buyume' | 'tasarruf' | 'denge'; days: number } | { kind: 'loan' } | { kind: 'repay' } | { kind: 'discount'; sector: string } | { kind: 'gmprime' } | { kind: 'gmfire' } | { kind: 'deptbudget'; dept: string } }
export interface AgendaItem { id: string; kind: string; title: string; text: string; options: AgendaOption[]; picked?: number; majority?: number; votes?: number[] }
export interface Goal { id: string; label: string; target: number; weight: number }
export interface GoalResult { id: string; label: string; target: number; actual: number; pct: number }
export interface DeptState { open: boolean; budget: number; mgr: Exec | null; staff: number }
export interface MgmtState {
  gm: Exec | null; cands: Exec[]; candDay: number; board: BoardMember[]; trust: number;
  meeting: { id: number; day: number; items: AgendaItem[] } | null; lastMeetingQ: number;
  mode?: { id: 'buyume' | 'tasarruf' | 'denge'; until: number }; discount?: Record<string, { pct: number; until: number }>;
  goals: { year: number; items: Goal[]; diff: number; base: { nw: Money; debt: Money; started: number; completed: number } } | null;
  goalHist: { year: number; score: number; res: GoalResult[] }[];
  depts: Record<string, DeptState>;
}
export interface Progress { ach: Record<string, number>; quests: Record<string, number>; c: { loans: number; tendersWon: number; bids: number; events: number; unitsSold: number; started: number; bestQuality: number; crisisMonths: number; investors: number; equitySold: number } }
export interface PendingEvent { rivalId?: number; id: string; day: number; projectId?: number; city?: string; staffId?: number }
/** Hikâye zinciri: seçimden N gün sonra çıkacak devam olayı (isteğe bağlı alan; eski kayıtlarda yok). */
export interface QueuedEvent { rivalId?: number; id: string; day: number; projectId?: number; city?: string; staffId?: number }
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
  /** Yönetim emri (süreli) ve proje müdürü; eski kayıtlarda yok. */
  order?: { id: string; until: number };
  manager?: number;
  cond?: number;            // bina durumu 0–100 (bakım); piyasa değerini ve kiracı memnuniyetini etkiler
  rush?: { kind: 'gun' | 'asama'; until: number; stage: number; mult: number }; // altınla inşaat hızlandırma
  rentAd?: number; // kira ilanı reklam düzeyi (0–3): boş kiralık dairelerde kiracı gelme sıklığını artırır, aylık gider doğurur
  renov?: Record<string, number>; renovBonus?: number; // yenileme kayıtları (tür → gün) ve değer/kira çarpanı katkısı
  managedBy?: number;       // site yönetimi işletmesi (iş kolu kimliği)
  operatedBy?: number;       // işletmeye alındıysa iş kolu kimliği (satış merkezi kapanır, değer işletmeden gelir)
}
export interface Order { tier?: number; id: number; material: string; qty: number; unitPrice: Money; supplier: string; placedDay: number; arriveDay: number; delayed: boolean; quality: number; freight?: Money; term?: 'pesin' | 'vade30' | 'vade60'; dest?: string; contractId?: number; rush?: boolean }
/** Vadeli alımların ödeme yükümlülüğü (net varlıktan düşülür). */
export interface Payable { id: number; amount: Money; dueDay: number; memo: string; late: number }
/** Düzenli tedarik sözleşmesi: fiyat kilitlidir, her ay miktar teslim alınır (al ya da öde). */
export interface SupplyContract { id: number; material: string; supplier: string; qtyPerMonth: number; price: Money; startDay: number; months: number; nextDay: number; taken: number; missed: number; dest: string }
export interface Machine {
  id: number; type: string; boughtDay: number; price: Money; brokenUntil: number; uses: number; usedDay?: number;
  /** Çalışma saati, durum (0–100), harcanan yakıt/bakım, kiraya verme geliri; ikinci el ve kiraya verilmişlik (eski kayıtlarda yok). */
  hours?: number; cond?: number; fuelSpent?: Money; maintSpent?: Money; income?: Money; used?: boolean; rentedOut?: { until: number; daily: Money };
}
/** İkinci el makine ilanı ve uzun dönem kiralama sözleşmesi. */
export interface UsedMachine { id: number; type: string; age: number; hours: number; cond: number; price: Money; expires: number }
export interface MachineLease { id: number; type: string; startDay: number; endDay: number; daily: Money; usedDay?: number }
export interface Unit {
  id: number; projectId: number; area: number; rooms: string; floor: number; view: number; facing: 'K' | 'G' | 'D' | 'B'; mult: number;
  status: 'bos' | 'kapora' | 'satildi';
  price?: Money; payment?: 'pesin' | 'taksit' | 'onsatis'; soldDay?: number;
  kaporaUntil?: number; kaporaAmt?: Money;
  delivered?: boolean; sat?: number; warrantyUntil?: number;
  /** Daire bazlı kontrol (eski kayıtlarda yok): özel fiyat çarpanı, rezerve, kiralık ilan, aktif kira sözleşmesi. */
  adj?: number; radj?: number; promo?: number; landlord?: boolean; hold?: boolean; listing?: 'kira';
  rent?: { amount: Money; tenant: string; since: number; seed: number; pay?: number; income?: number; sat?: number; endDay?: number; deposit?: Money; arrears?: Money; lateMonths?: number; renewals?: number };
}
/** Fırsat ilanı: rakipten bina/yarım proje, eski bina arsası ya da kat karşılığı teklifi. `parcel` kabul edilene kadar pazarda değildir. */
export interface Deal {
  id: number; kind: 'bina' | 'harap' | 'yarim' | 'eski' | 'kat'; city: string; seller: string; title: string; story: string; day: number; until: number;
  price: Money; demo: Money; share: number; type: string; quality: string; qscore: number; stage: number; fair: Money; parcel: Parcel;
}
/** Alıcı/kiracı teklifi: oyuncu kabul eder, karşı teklif verir ya da reddeder. `maxRatio` alıcının gizli tavanıdır. */
export interface Offer {
  id: number; projectId: number; unitId: number; kind: 'satis' | 'kira'; buyer: string; profile: string; seed: number;
  ratio: number; maxRatio: number; pay: 'pesin' | 'taksit' | 'onsatis'; day: number; until: number; note: string;
}
export interface Receivable { id: number; unitId: number; projectId: number; amount: Money; dueDay: number; kind: 'taksit' | 'teslim'; missed: number }
export interface SalesPolicy { priceMult: number; agent: boolean; installments: boolean; presale: boolean; contract: Money; commission: Money; sold: number; /** otomatik kabul eşiği (liste fiyatına oran); yoksa tüm teklifler elle onaylanır */ autoMin?: number; /** ilan hızı 0–4 (çok yavaş … çok hızlı); yoksa normal */ pace?: number; /** satış/kira geçmişi */ log?: { d: number; p: Money; k: 's' | 'k' }[] }
export interface Loan {
  id: number; kind: 'ticari' | 'insaat' | 'makine' | 'kisa'; bank: string; principal: Money; balance: Money; rate: number; term: number; remaining: number;
  payment: Money; schedule: 'annuity' | 'interest' | 'bullet'; start: number; nextDue: number; missed: number;
  projectId?: number; machineId?: number; limit?: Money; sub?: string;
}
export interface Investment { id: number; projectId: number; amount: Money; share: number; day: number; paidOut?: boolean }
export interface TenderReq { rep: number; score: number; completed: number; staff: number; machines: number }
export interface Tender {
  infra?: boolean;   // altyapı ihalesi (proje yerine altyapı işi doğurur)
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
  evtQueue?: QueuedEvent[];
  reports?: YearReport[];
  decisions?: Decision[];
  offers?: Offer[];
  deals?: Deal[];
  mgmt?: MgmtState;
  energy?: { price: number; hist: number[] };
  usedMarket?: UsedMachine[]; leases?: MachineLease[];
  estate?: { policy: 'enflasyon' | 'yuksek' | 'sabit' };
  payables?: Payable[]; contracts?: SupplyContract[]; warehouse?: { level: number; sec?: number; staff?: number };
  /** Tedarikçi ilişkileri, pazarlık anlaşmaları, tedarik olayları ve stok hareket defteri (eski kayıtlarda yok). */
  supRel?: Record<string, { trust: number; spent: Money; orders: number }>;
  negos?: { mat: string; sup: string; disc: number; leadCut: number; until: number; freeTerm?: boolean; cDisc?: number }[];
  supEvents?: { id: number; kind: 'fiyat' | 'grev' | 'iflas' | 'firsat' | 'uretim'; sup?: string; mat?: string; val: number; until: number; text: string }[];
  stockLog?: { day: number; mat: string; qty: number; kind: 'giris' | 'cikis' | 'fire' | 'hasar' | 'sayim'; value: Money; ref?: string }[];
  /** Premium para birimi "Altın" (eski kayıtlarda yok; ilk erişimde başlangıç bakiyesi verilir) ve satın alma geçmişi (test modu). */
  taxSaved?: Money; audits?: { year: number; penalty: Money; clean: boolean }[]; ad?: { day: number; n: number };
  gold?: number; goldLog?: { day: number; kind: 'baslangic' | 'seviye' | 'paket' | 'hizlandirma'; amount: number; memo: string }[];
  /** Ek depolar (şehir bazlı; stok ortak havuzda tutulur, kapasite toplanır). */
  depots?: { id: number; city: string; level: number; since: number }[];
  stakes?: Stake[]; ic?: IcEntry[]; dd?: Record<number, { day: number; hidden: Money }>;
  ventures: Venture[]; infra: InfraJob[]; holding: HoldingState; equity: StockState | null; // equity: halka arz/borsa durumu
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
