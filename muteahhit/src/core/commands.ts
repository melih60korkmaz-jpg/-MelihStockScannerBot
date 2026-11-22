import { TL, mul } from './money';
import type { GameEvent, GameState } from './types';
import { CITIES, branchCost, provinceData, background, buildingType, difficulty, machine, material, officeFor, quality, staffType, supplier } from '../data';
import { dateOf } from './calendar';
import { SERVICE, activeLeases, buyUsed, condM, endLease, isRentedOut, leaseDaily, leaseMachine, recallMachine, rentOutMachine, serviceCost, serviceMachine } from '../sim/machines';
import { condOf, evictTenant, maintainBuilding, maintenanceCost, tenantOf , renovate, renovateError } from '../sim/realestate';
import { WAREHOUSE, freeSpace, quoteOrder, whLevel } from '../sim/materials';
import { watchAd, watchAdError, buyPackError, buyPackTest, rushError, startRush } from '../sim/gold';
import { setWarehouse, warehouseSetError, closeDepot, closeDepotError, openDepot, openDepotError, cancelContract, contractError, contractValue, signContract, upgradeWarehouse } from '../sim/supply';
import { BUDGET_STEPS, decideAgenda, deptCandidates, deptDef, fireGM, getMgmt, hireDeptMgr, hireGM, openDept, refreshCands, setDeptStaff, setGoals } from '../sim/mgmt';
import { isUnlocked } from '../sim/unlock';
import { PROPOSALS } from '../sim/rivalLife';
import { sellableIdle } from '../sim/events';
import { KIND_LABEL, acceptDeal, dealError } from '../sim/deals';
import { acceptOffer } from '../sim/buyers';
import { post } from '../sim/ledger';
import { checkProgress, officeStepFor, track } from '../sim/progress';
import { resolveEvent } from '../sim/events';
import { bidError, placeBid } from '../sim/tenders';
import { quoteInvestor, takeInvestor, equityQuote, sellEquity, refundInvestor } from '../sim/investors';
import { quoteLoan, takeLoan, repayLoan, restructureLoan, type LoanKind } from '../sim/loans';
import { createStaff } from '../sim/staff';
import { negoError, negotiate, type NegoKind } from '../sim/supplyx';
import { buyStake, buyStakeError, ddError, doDD, factoryError, buildFactory, sellStake, sellStakeError, takeover, takeoverError } from '../sim/invest';
import { budgetError, doTransfer, setSubBudget, transferError } from '../sim/consol';
import { buildEnergy, buildError, fireVentureMgr, hireMgrError, hireVentureMgr, manageSite, manageSiteError, operateError, operateProject, opsError, ppaError, sellError, sellVenture, setOps, setPPA, strategyError, type BuildKind } from '../sim/ventures';
import { buyback, goPublic, ipoError, secondaryOffering, tradeError } from '../sim/stock';
import { DIFFICULTY_MACRO } from '../sim/macro';
import { SURVEY_DAYS, TAPU_HARCI, QUICK_SALE_DISCOUNT, askPrice, fairValue, reservePrice, surveyCost } from '../sim/land';
import { newDesignSeed, planProject, projectName } from '../sim/projects';
import { bulkSellRemaining, promoActive, promoCost, unitsOf } from '../sim/sales';
import { canTrade, openCity } from '../sim/land';
import { ORDER_DAYS, FOCI, MANAGER_TYPES, activeOrder, canChangeFocus, decorCost, decorDef, hasDecor, logDecision, orderDef } from '../sim/control';
import { startConstruction, settle, activeProjects } from '../sim/construction';
import { placeOrder, unitPrice } from '../sim/materials';
import { machineValue, SELL_FACTOR } from '../sim/machines';

/**
 * TÜM durum değişiklikleri komutla yapılır. UI'daki her buton bir komuta bağlıdır;
 * `COMMAND_NAMES` ile otomatik test, bağlanmamış/sahte buton olmadığını doğrular.
 */
export interface CommandDef<P> {
  validate(s: GameState, p: P): string | null; // hata mesajı (Türkçe) ya da null
  apply(s: GameState, p: P): GameEvent[];
}

export interface Emblem { shape: number; color: number }
export const EMBLEM_SHAPES = 10; // logo galerisi (ui/emblem.ts LOGOS.length ile aynı olmalı; testle doğrulanır)
export const EMBLEM_COLORS = 8; // kurumsal renk sayısı (BRAND_COLORS.length)
export interface CreateCompanyParams { name: string; founderBackground: string; startCity: string; difficulty?: string; emblem?: Emblem; starterGear?: boolean; founder?: string }
export interface HireStaffParams { type: string }
export interface FireStaffParams { staffId: number }


const ev = (s: GameState, type: string, data?: Record<string, unknown>, pause = false): GameEvent => ({
  type, day: s.clock.day, ...(pause ? { pause } : {}), ...(data ? { data } : {}),
});

const createCompany: CommandDef<CreateCompanyParams> = {
  validate(s, p) {
    if (s.company) return 'Şirket zaten kurulmuş.';
    const name = p.name.trim();
    if (name.length < 2 || name.length > 32) return 'Şirket adı 2–32 karakter olmalı.';
    if (p.founder !== undefined && p.founder.trim().length > 24) return 'Kurucu adı en çok 24 karakter olmalı.';
    if (!background(p.founderBackground)) return 'Geçersiz patron geçmişi.';
    if (!CITIES.some((c) => c.id === p.startCity)) return 'Geçersiz başlangıç şehri.';
    if (p.difficulty !== undefined && !difficulty(p.difficulty)) return 'Geçersiz zorluk.';
    const e = p.emblem;
    if (e && !(Number.isInteger(e.shape) && e.shape >= 0 && e.shape < EMBLEM_SHAPES && Number.isInteger(e.color) && e.color >= 0 && e.color < EMBLEM_COLORS)) return 'Geçersiz amblem.';
    return null;
  },
  apply(s, p) {
    if (p.difficulty) s.meta.difficulty = p.difficulty as typeof s.meta.difficulty;
    const bg = background(p.founderBackground)!;
    const mult = difficulty(s.meta.difficulty)!.capitalMult;
    s.company = {
      name: p.name.trim(), founderBackground: p.founderBackground, startCity: p.startCity,
      emblem: p.emblem ?? { shape: 0, color: 0 }, founder: (p.founder ?? '').trim().slice(0, 24) || 'Patron',
      level: 1, office: 1, reputation: bg.reputation, creditScore: bg.creditScore, cash: 0, stats: { completed: 0, sold: 0, profit: 0 }, safety: 'normal', procurement: { auto: true, supplier: 'yerel' }, lastAccidentDay: -999, satisfaction: 60, ownership: 100, bankrupt: false,
    };
    post(s, 'sermaye', mul(TL(bg.startCashTL), mult), { memo: 'Kuruluş sermayesi' });
    for (const t of bg.staff) createStaff(s, t);
    // Başlangıç ekipmanı: geçmişe bağlı küçük bir hediye (nakit hareketi yok; varlık olarak değerlenir)
    for (const mt of p.starterGear ? bg.machines ?? [] : []) { const m = machine(mt); if (m) s.machines.push({ id: s.nextId++, type: mt, boughtDay: s.clock.day, price: TL(m.priceTL), brokenUntil: 0, uses: 0 }); }
    s.openCities = [p.startCity]; s.weather[p.startCity] ??= 'acik'; openCity(s, p.startCity);
    // Zorluk: ilk dengeli dönemin uzunluğu = krizsiz korumalı başlangıç
    s.macro.calmUntilDay = s.clock.day + DIFFICULTY_MACRO[s.meta.difficulty].calmMonths * 30;
    s.macro.regimeSince = s.clock.day; s.macro.regimeEnd = s.macro.calmUntilDay;
    s.history.push({ day: s.clock.day, cash: s.company.cash, netWorth: s.company.cash });
    return [ev(s, 'COMPANY_CREATED', { name: s.company.name })];
  },
};

const hireStaff: CommandDef<HireStaffParams> = {
  validate(s, p) {
    if (!s.company) return 'Önce şirket kurulmalı.';
    if (!staffType(p.type)) return 'Bilinmeyen personel tipi.';
    if (s.staff.length >= officeFor(s.company.office).capacity) return 'Ofis kapasitesi dolu; daha büyük ofis gerekli.';
    return null;
  },
  apply(s, p) {
    const st = createStaff(s, p.type);
    return [ev(s, 'STAFF_HIRED', { id: st.id, name: st.name, type: p.type })];
  },
};

void activeProjects;
const fireStaff: CommandDef<FireStaffParams> = {
  validate(s, p) {
    if (!s.staff.some((x) => x.id === p.staffId)) return 'Çalışan bulunamadı.';
    return null;
  },
  apply(s, p) {
    const i = s.staff.findIndex((x) => x.id === p.staffId);
    const [gone] = s.staff.splice(i, 1);
    return [ev(s, 'STAFF_FIRED', { id: gone!.id, name: gone!.name })];
  },
};

export interface OrderSurveyParams { parcelId: number; kind: 'soil' | 'market' }
export interface BuyLandParams { parcelId: number; offerPct: number }
export interface ParcelRef { parcelId: number }
export interface ListLandParams { parcelId: number; askMult: number }
export interface CreateProjectParams { parcelId: number; type: string; quality: string }
export interface CancelProjectParams { projectId: number }
export interface ProjectRef { projectId: number }

const parcelOf = (s: GameState, id: number) => s.parcels.find((p) => p.id === id);

const orderSurvey: CommandDef<OrderSurveyParams> = {
  validate(s, p) {
    const pc = parcelOf(s, p.parcelId); if (!s.company) return 'Önce şirket kurulmalı.'; if (!pc) return 'Arsa bulunamadı.';
    if (p.kind !== 'soil' && p.kind !== 'market') return 'Geçersiz etüt.';
    if (!canTrade(s, pc.city)) return 'Bu ilde şubeniz yok: önce şube açın.';
    if (p.kind === 'soil' ? pc.soilKnown : pc.growthKnown) return 'Bu etüt zaten yapılmış.';
    if (s.scheduled.some((x) => x.type === 'survey' && x.data.parcelId === p.parcelId && x.data.kind === p.kind)) return 'Bu etüt zaten sürüyor.';
    if (s.company.cash < surveyCost(pc, p.kind)) return 'Etüt için yeterli nakit yok.';
    return null;
  },
  apply(s, p) {
    const pc = parcelOf(s, p.parcelId)!;
    post(s, 'etut', -surveyCost(pc, p.kind), { memo: p.kind === 'soil' ? 'Zemin etüdü' : 'Piyasa ve imar araştırması' });
    s.scheduled.push({ day: s.clock.day + SURVEY_DAYS[p.kind], type: 'survey', data: { parcelId: p.parcelId, kind: p.kind } });
    return [ev(s, 'SURVEY_ORDERED', { parcelId: p.parcelId, kind: p.kind, days: SURVEY_DAYS[p.kind] })];
  },
};

const buyLand: CommandDef<BuyLandParams> = {
  validate(s, p) {
    const pc = parcelOf(s, p.parcelId); if (!s.company) return 'Önce şirket kurulmalı.'; if (!pc) return 'Arsa bulunamadı (başkasına satılmış olabilir).';
    if (pc.owner !== 'market') return 'Bu arsa zaten sizin.';
    if (!canTrade(s, pc.city)) return 'Bu ilde şubeniz yok: önce şube açın.';
    if (!(p.offerPct >= 0.8 && p.offerPct <= 1)) return "Teklif, istenen fiyatın %80–%100'ü arasında olmalı.";
    if (s.clock.day < pc.negoLockUntil && p.offerPct <= (pc.lastOffer ?? 1) + 1e-9) return `Satıcı bu teklife ${pc.negoLockUntil - s.clock.day} gün daha yanaşmayacak; daha yüksek bir teklif (en çok %100) hemen verebilirsiniz.`;
    const price = Math.round(askPrice(s, pc) * p.offerPct);
    if (s.company.cash < Math.round(price * (1 + TAPU_HARCI))) return 'Arsa ve tapu harcı için yeterli nakit yok.';
    return null;
  },
  apply(s, p) {
    const pc = parcelOf(s, p.parcelId)!;
    const price = Math.round(askPrice(s, pc) * p.offerPct);
    if (price < reservePrice(s, pc)) {
      pc.negoLockUntil = s.clock.day + 3; pc.lastOffer = p.offerPct;
      return [ev(s, 'LAND_REJECTED', { parcelId: pc.id, offer: price }, false)];
    }
    const harc = Math.round(price * TAPU_HARCI);
    post(s, 'arsa', -price, { memo: `Arsa alımı (${pc.hood})` });
    post(s, 'arsa', -harc, { memo: 'Tapu harcı' });
    pc.owner = 'player'; pc.boughtDay = s.clock.day; pc.costBasis = price + harc;
    return [ev(s, 'LAND_BOUGHT', { parcelId: pc.id, price, harc })];
  },
};

/** Fırsat arsaları (eski bina, kat karşılığı) ucuza alındığı için hemen elden çıkarılamaz; kat karşılığı arsa zaten sahibine aittir. */
const landLockError = (s: GameState, pc: GameState['parcels'][number]): string | null => {
  if (pc.kat) return 'Kat karşılığı arsa satılamaz: mülkiyet arsa sahibinde kalır.';
  if ((pc.demolishUntil ?? 0) > s.clock.day) return `Eski bina yıkılıyor (${pc.demolishUntil! - s.clock.day} gün).`;
  if (pc.oldBuilding && s.clock.day - (pc.boughtDay ?? -999) < 180) return `Fırsat arsası ${180 - (s.clock.day - (pc.boughtDay ?? 0))} gün daha satılamaz.`;
  return null;
};
const sellLandQuick: CommandDef<ParcelRef> = {
  validate(s, p) { const pc = parcelOf(s, p.parcelId); if (!pc || pc.owner !== 'player') return 'Arsa bulunamadı.'; if (pc.projectId !== undefined) return 'Üzerinde proje olan arsa satılamaz; önce projeyi iptal edin.'; { const e = landLockError(s, pc); if (e) return e; } return null; },
  apply(s, p) {
    const pc = parcelOf(s, p.parcelId)!; const price = Math.round(fairValue(s, pc) * QUICK_SALE_DISCOUNT);
    post(s, 'arsa', price, { memo: `Arsa hızlı satış (${pc.hood})` });
    s.parcels = s.parcels.filter((x) => x.id !== pc.id);
    return [ev(s, 'LAND_SOLD', { parcelId: pc.id, price, quick: true, hood: pc.hood })];
  },
};
const listLand: CommandDef<ListLandParams> = {
  validate(s, p) { const pc = parcelOf(s, p.parcelId); if (!pc || pc.owner !== 'player') return 'Arsa bulunamadı.'; if (pc.projectId !== undefined) return 'Üzerinde proje olan arsa satışa konamaz.'; { const e = landLockError(s, pc); if (e) return e; } if (!(p.askMult >= 0.9 && p.askMult <= 1.25)) return "İstenen fiyat, değerin %90–%125'i arasında olmalı."; return null; },
  apply(s, p) { const pc = parcelOf(s, p.parcelId)!; pc.listed = { askMult: p.askMult, day: s.clock.day }; return [ev(s, 'LAND_LISTED', { parcelId: pc.id })]; },
};
const unlistLand: CommandDef<ParcelRef> = {
  validate(s, p) { const pc = parcelOf(s, p.parcelId); return pc && pc.owner === 'player' && pc.listed ? null : 'Satışta arsa yok.'; },
  apply(s, p) { delete parcelOf(s, p.parcelId)!.listed; return [ev(s, 'LAND_UNLISTED', { parcelId: p.parcelId })]; },
};

const createProject: CommandDef<CreateProjectParams> = {
  validate(s, p) {
    const pc = parcelOf(s, p.parcelId); if (!s.company) return 'Önce şirket kurulmalı.'; if (!pc || pc.owner !== 'player') return 'Önce arsayı satın almalısınız.';
    if (pc.projectId !== undefined) return 'Bu arsada zaten bir proje var.';
    if ((pc.demolishUntil ?? 0) > s.clock.day) return `Eski bina yıkılıyor: ${pc.demolishUntil! - s.clock.day} gün sonra proje başlatabilirsiniz.`;
    if (!buildingType(p.type)) return 'Geçersiz yapı tipi.'; if (!quality(p.quality)) return 'Geçersiz kalite.';
    const plan = planProject(s, pc, p.type, p.quality, pc.costBasis);
    if (!plan.ok) return plan.reason ?? 'Bu arsada bu proje yapılamaz.';
    if (s.company.cash < plan.cost.designFee) return 'Tasarım bedeli için yeterli nakit yok.';
    return null;
  },
  apply(s, p) {
    const pc = parcelOf(s, p.parcelId)!; const plan = planProject(s, pc, p.type, p.quality, pc.costBasis);
    post(s, 'tasarim', -plan.cost.designFee, { memo: 'Mimari ve proje bedeli' });
    const id = s.nextId++;
    s.projects.push({
      id, parcelId: pc.id, hood: pc.hood, name: projectName(s, p.type), type: p.type, quality: p.quality, designSeed: newDesignSeed(s), status: 'taslak', createdDay: s.clock.day, cityId: pc.city,
      floors: plan.floors, emsal: plan.emsal, brut: plan.brut, satilabilir: plan.satilabilir, matIndexAtPlan: s.macro.materialIndex,
      budget: { base: plan.cost.base, soil: plan.cost.soil, soft: plan.cost.soft, total: plan.cost.total, designFee: plan.cost.designFee },
      expected: { revenue: plan.revenue.mid, months: Math.round((plan.months.min + plan.months.max) / 2) },
    });
    pc.projectId = id; delete pc.listed;
    return [ev(s, 'PROJECT_CREATED', { projectId: id })];
  },
};
const cancelProject: CommandDef<CancelProjectParams> = {
  validate(s, p) { const x = s.projects.find((q) => q.id === p.projectId && q.status === 'taslak'); if (x?.contract) return 'Sözleşmeli ihale projesi iptal edilemez.'; return x ? null : 'İptal edilebilir proje bulunamadı.'; },
  apply(s, p) {
    const pr = s.projects.find((x) => x.id === p.projectId)!; const pc = parcelOf(s, pr.parcelId); if (pc) delete pc.projectId;
    refundInvestor(s, p.projectId); s.loans = s.loans.filter((l) => !(l.kind === 'insaat' && l.projectId === p.projectId && l.balance <= 0));
    s.projects = s.projects.filter((x) => x.id !== p.projectId);
    return [ev(s, 'PROJECT_CANCELLED', { projectId: p.projectId })];
  },
};

const startConstructionCmd: CommandDef<ProjectRef> = {
  validate(s, p) { const pr = s.projects.find((x) => x.id === p.projectId); if (!pr) return 'Proje bulunamadı.'; if (pr.status !== 'taslak') return 'Bu proje zaten başlatılmış.'; return null; },
  apply(s, p) { return startConstruction(s, s.projects.find((x) => x.id === p.projectId)!); },
};
export interface PlaceOrderParams { material: string; qty: number; supplier: string }
export interface BuyMachineParams { type: string; financed?: boolean; bank?: string }
export interface MachineRef { machineId: number }
export interface AssignStaffParams { staffId: number; projectId: number | null }
export interface SetPolicyParams { safety?: 'dusuk' | 'normal' | 'yuksek'; autoBuy?: boolean; supplier?: string }

const placeOrderCmd: CommandDef<PlaceOrderParams> = {
  validate(s, p) {
    if (!s.company) return 'Önce şirket kurulmalı.'; if (!material(p.material)) return 'Bilinmeyen malzeme.'; if (!supplier(p.supplier)) return 'Bilinmeyen tedarikçi.';
    if (!(p.qty > 0) || p.qty > 1e6) return 'Geçersiz miktar.';
    if (s.company.cash < Math.round(unitPrice(s, p.material, p.supplier) * p.qty)) return 'Sipariş için yeterli nakit yok.';
    return null;
  },
  apply(s, p) { const ev2: GameEvent[] = []; const r = placeOrder(s, p.material, p.qty, p.supplier, ev2); if (r.ok) ev2.push(ev(s, 'ORDER_PLACED', { orderId: r.order.id, arriveDay: r.order.arriveDay })); return ev2; },
};
const buyMachine: CommandDef<BuyMachineParams> = {
  validate(s, p) { const m = machine(p.type); if (!s.company) return 'Önce şirket kurulmalı.'; if (!m) return 'Bilinmeyen makine.'; const price = TL(m.priceTL);
    if (p.financed) { const down = Math.round(price * 0.2); if (s.company.cash < down) return 'Peşinat için yeterli nakit yok.'; const q = quoteLoan(s, { kind: 'makine', bank: p.bank ?? 'ozel', amount: price - down, term: 36 }); return q.ok ? null : (q.error ?? 'Kredi verilemedi.'); }
    if (s.company.cash < price) return 'Satın alma için yeterli nakit yok.'; return null; },
  apply(s, p) {
    const m = machine(p.type)!, price = TL(m.priceTL), out: GameEvent[] = [];
    post(s, 'makine_alim', -price, { memo: m.label }); const id = s.nextId++; s.machines.push({ id, type: p.type, boughtDay: s.clock.day, price, brokenUntil: 0, uses: 0, hours: 0, cond: 100 });
    if (p.financed) { const down = Math.round(price * 0.2); const r = takeLoan(s, { kind: 'makine', bank: p.bank ?? 'ozel', amount: price - down, term: 36, machineId: id }, out); void r; }
    out.push(ev(s, 'MACHINE_BOUGHT', { id, type: p.type })); return out;
  },
};
export interface TakeLoanParams { kind: LoanKind; bank: string; amount: number; term?: number; projectId?: number }
const takeLoanCmd: CommandDef<TakeLoanParams> = {
  validate(s, p) { if (!s.company) return 'Önce şirket kurulmalı.'; const q = quoteLoan(s, p); return q.ok ? null : (q.error ?? 'Kredi verilemedi.'); },
  apply(s, p) { const out: GameEvent[] = []; takeLoan(s, p, out); return out; },
};
export interface RepayLoanParams { loanId: number; amount: number }
const repayLoanCmd: CommandDef<RepayLoanParams> = {
  validate(s, p) { const l = s.loans.find((x) => x.id === p.loanId); if (!l) return 'Kredi bulunamadı.'; if (!(p.amount > 0)) return 'Geçersiz tutar.'; if (l.balance <= 0) return 'Bu kredinin borcu yok.'; if (s.company!.cash < Math.min(p.amount, l.balance)) return 'Nakit yetersiz.'; return null; },
  apply(s, p) { const r = repayLoan(s, p.loanId, p.amount); return [ev(s, 'LOAN_REPAID', { loanId: p.loanId, paid: r.paid ?? 0 })]; },
};
export interface RestructureParams { loanId: number }
const restructureCmd: CommandDef<RestructureParams> = {
  validate(s, p) { const l = s.loans.find((x) => x.id === p.loanId); if (!l || l.balance <= 0) return 'Kredi bulunamadı.'; if (s.company!.creditScore < 250) return 'Kredi notu yeniden yapılandırma için yetersiz (en az 250).'; if (s.company!.cash < Math.round(l.balance * 0.03)) return 'Yapılandırma masrafı için nakit yetersiz.'; return null; },
  apply(s, p) { restructureLoan(s, p.loanId); return [ev(s, 'LOAN_RESTRUCTURED', { loanId: p.loanId })]; },
};
export interface TakeInvestorParams { projectId: number; pct: number }
const takeInvestorCmd: CommandDef<TakeInvestorParams> = {
  validate(s, p) { const pr = s.projects.find((x) => x.id === p.projectId); if (!pr) return 'Proje bulunamadı.'; const q = quoteInvestor(s, pr, p.pct); return q.ok ? null : (q.error ?? 'Yatırımcı bulunamadı.'); },
  apply(s, p) { const out: GameEvent[] = []; takeInvestor(s, s.projects.find((x) => x.id === p.projectId)!, p.pct, out); return out; },
};
export interface SellEquityParams { pct: number }
const sellEquityCmd: CommandDef<SellEquityParams> = {
  validate(s, p) { if (!s.company) return 'Önce şirket kurulmalı.'; const q = equityQuote(s, p.pct); return q.ok ? null : (q.error ?? 'Satış yapılamaz.'); },
  apply(s, p) { const out: GameEvent[] = []; sellEquity(s, p.pct, out); return out; },
};
export interface PlaceBidParams { tenderId: number; price: number }
const placeBidCmd: CommandDef<PlaceBidParams> = {
  validate(s, p) { return bidError(s, s.tenders.find((t) => t.id === p.tenderId), p.price); },
  apply(s, p) { const out: GameEvent[] = []; placeBid(s, s.tenders.find((t) => t.id === p.tenderId)!, Math.round(p.price), out); return out; },
};
export interface ResolveEventParams { choice: number }
const resolveEventCmd: CommandDef<ResolveEventParams> = {
  validate(s, p) { if (!s.pending) return 'Bekleyen karar yok.'; return Number.isInteger(p.choice) && p.choice >= 0 ? null : 'Geçersiz seçim.'; },
  apply(s, p) { const out: GameEvent[] = []; resolveEvent(s, p.choice, out); return out; },
};
const upgradeOffice: CommandDef<Record<string, never>> = {
  validate(s) { const c = s.company; if (!c) return 'Önce şirket kurulmalı.'; const st = officeStepFor(s); if (!st) return 'Ofis zaten en büyük boyutta.'; if (c.level < st.minLevel) return `Bu ofis için şirket seviyesi ${st.minLevel} gerekir.`; if (c.cash < TL(st.costTL)) return 'Taşınma masrafı için yeterli nakit yok.'; return null; },
  apply(s) { const st = officeStepFor(s)!; post(s, 'ofis', -TL(st.costTL), { memo: 'Ofis taşınma ve dekorasyon' }); s.company!.office = st.office; return [ev(s, 'OFFICE_UPGRADED', { office: st.office })]; },
};
const sellMachine: CommandDef<MachineRef> = {
  validate(s, p) { return s.machines.some((m) => m.id === p.machineId) ? null : 'Makine bulunamadı.'; },
  apply(s, p) { const m = s.machines.find((x) => x.id === p.machineId)!; const v = Math.round(machineValue(s, m) * SELL_FACTOR); post(s, 'makine_alim', v, { memo: `${machine(m.type)!.label} satış` }); s.machines = s.machines.filter((x) => x.id !== m.id); return [ev(s, 'MACHINE_SOLD', { type: m.type, value: v })]; },
};
const assignStaff: CommandDef<AssignStaffParams> = {
  validate(s, p) {
    if (!s.staff.some((x) => x.id === p.staffId)) return 'Çalışan bulunamadı.';
    if (p.projectId !== null && !s.projects.some((x) => x.id === p.projectId && x.status !== 'satildi')) return 'Proje bulunamadı.';
    return null;
  },
  apply(s, p) { const x = s.staff.find((q) => q.id === p.staffId)!; if (p.projectId === null) delete x.project; else x.project = p.projectId; return [ev(s, 'STAFF_ASSIGNED', { staffId: x.id, projectId: p.projectId })]; },
};
const setPolicy: CommandDef<SetPolicyParams> = {
  validate(s, p) { if (!s.company) return 'Önce şirket kurulmalı.'; if (p.safety && !['dusuk', 'normal', 'yuksek'].includes(p.safety)) return 'Geçersiz güvenlik düzeyi.'; if (p.supplier && !supplier(p.supplier)) return 'Bilinmeyen tedarikçi.'; return null; },
  apply(s, p) { const c = s.company!; if (p.safety) c.safety = p.safety; if (p.autoBuy !== undefined) c.procurement.auto = p.autoBuy; if (p.supplier) c.procurement.supplier = p.supplier; return [ev(s, 'POLICY_CHANGED')]; },
};

export interface OpenBranchParams { cityId: string }
const openBranch: CommandDef<OpenBranchParams> = {
  validate(s, p) {
    if (!s.company) return 'Önce şirket kurulmalı.'; const prov = provinceData(p.cityId); if (!prov) return 'Bilinmeyen il.';
    if (s.openCities.includes(p.cityId)) return 'Bu ilde zaten şubeniz var.';
    if (s.company.cash < TL(branchCost(p.cityId))) return 'Şube açılışı için yeterli nakit yok.';
    return null;
  },
  apply(s, p) { post(s, 'sube', -TL(branchCost(p.cityId)), { memo: `${provinceData(p.cityId)!.name} şubesi` }); openCity(s, p.cityId); return [ev(s, 'BRANCH_OPENED', { cityId: p.cityId })]; },
};

export const BULK_DISCOUNT = 0.92;
const sellProjectBulk: CommandDef<ProjectRef> = {
  validate(s, p) { const pr = s.projects.find((x) => x.id === p.projectId); if (!pr) return 'Proje bulunamadı.'; if (pr.status !== 'tamamlandi') return 'Yalnızca tamamlanmış projeler satılabilir.'; if (!unitsOf(s, pr.id).some((u) => u.status !== 'satildi')) return 'Satılacak daire kalmadı.'; return null; },
  apply(s, p) {
    const pr = s.projects.find((x) => x.id === p.projectId)!; settle(s, pr);
    const evs: GameEvent[] = []; const total = bulkSellRemaining(s, pr, evs);
    return [ev(s, 'BULK_SOLD', { projectId: pr.id, price: total }), ...evs];
  },
};
export interface SalesPolicyParams { projectId: number; priceMult?: number; agent?: boolean; installments?: boolean; presale?: boolean }
const setSalesPolicy: CommandDef<SalesPolicyParams> = {
  validate(s, p) {
    const pr = s.projects.find((x) => x.id === p.projectId); if (!pr || !pr.sales) return 'Satış politikası için inşaat başlamış bir proje gerekir.';
    if (pr.status === 'satildi') return 'Proje satıldı.';
    if (p.priceMult !== undefined && !(p.priceMult >= 0.8 && p.priceMult <= 1.25)) return 'Fiyat çarpanı %80–%125 arasında olmalı.';
    return null;
  },
  apply(s, p) { const pol = s.projects.find((x) => x.id === p.projectId)!.sales!; if (p.priceMult !== undefined) pol.priceMult = +p.priceMult.toFixed(3); if (p.agent !== undefined) pol.agent = p.agent; if (p.installments !== undefined) pol.installments = p.installments; if (p.presale !== undefined) pol.presale = p.presale; return [ev(s, 'SALES_POLICY', { projectId: p.projectId })]; },
};

// ---------------- Holding: iş kolları, altyapı, borsa ----------------
const buildVentureCmd: CommandDef<{ kind: BuildKind; city: string; tier: number }> = {
  validate: (s, p) => buildError(s, p.kind, p.city, p.tier),
  apply(s, p) { const ev0: GameEvent[] = []; buildEnergy(s, p.kind, p.city, p.tier, provinceData(p.city)?.name ?? p.city, ev0); return ev0; },
};
const operateProjectCmd: CommandDef<{ projectId: number }> = {
  validate: (s, p) => operateError(s, s.projects.find((x) => x.id === p.projectId)),
  apply(s, p) { const e: GameEvent[] = []; operateProject(s, s.projects.find((x) => x.id === p.projectId)!, e); return e; },
};
const setVentureOpsCmd: CommandDef<{ id: number; price?: number; staff?: number; ads?: number }> = { validate: (s, p) => opsError(s, p.id, p), apply(s, p) { setOps(s, p.id, p); return [ev(s, 'VENTURE_OPS', { id: p.id })]; } };
const hireVentureMgrCmd: CommandDef<{ id: number; candId: number }> = { validate: (s, p) => hireMgrError(s, p.id, p.candId), apply(s, p) { hireVentureMgr(s, p.id, p.candId); return [ev(s, 'VENTURE_OPS', { id: p.id })]; } };
const fireVentureMgrCmd: CommandDef<{ id: number }> = { validate: (s, p) => { const v = s.ventures.find((x) => x.id === p.id); return v?.ops?.mgr ? null : 'Müdür yok.'; }, apply(s, p) { fireVentureMgr(s, p.id); return [ev(s, 'VENTURE_OPS', { id: p.id })]; } };
const setPPACmd: CommandDef<{ id: number; months: number }> = { validate: (s, p) => ppaError(s, p.id, p.months), apply(s, p) { setPPA(s, p.id, p.months); return [ev(s, 'VENTURE_OPS', { id: p.id })]; } };
const manageSiteCmd: CommandDef<{ projectId: number }> = { validate: (s, p) => manageSiteError(s, s.projects.find((x) => x.id === p.projectId)), apply(s, p) { const e: GameEvent[] = []; manageSite(s, s.projects.find((x) => x.id === p.projectId)!, e); return e; } };
const sellVentureCmd: CommandDef<{ id: number }> = { validate: (s, p) => sellError(s, p.id), apply(s, p) { const e: GameEvent[] = []; sellVenture(s, p.id, e); return e; } };
const setStrategyCmd: CommandDef<{ division: string; strategy: string }> = {
  validate: (s, p) => strategyError(s, p.division, p.strategy),
  apply(s, p) { s.holding.strategy[p.division as 'isletme'] = p.strategy as 'buyume'; return [ev(s, 'STRATEGY_SET', { division: p.division, strategy: p.strategy })]; },
};
const toggleGmCmd: CommandDef<{ division: string }> = {
  validate: (s, p) => strategyError(s, p.division, 'dengeli'),
  apply(s, p) { const d = p.division as 'isletme'; s.holding.gm[d] = !s.holding.gm[d]; return [ev(s, 'GM_SET', { division: d, on: s.holding.gm[d] })]; },
};
const goPublicCmd: CommandDef<{ pct: number }> = { validate: (s, p) => ipoError(s, p.pct), apply(s, p) { const e: GameEvent[] = []; goPublic(s, p.pct, e); return e; } };
const secondaryCmd: CommandDef<{ pct: number }> = { validate: (s, p) => tradeError(s, 'sec', p.pct), apply(s, p) { const e: GameEvent[] = []; secondaryOffering(s, p.pct, e); return e; } };
const buybackCmd: CommandDef<{ pct: number }> = { validate: (s, p) => tradeError(s, 'buy', p.pct), apply(s, p) { buyback(s, p.pct); return [ev(s, 'BUYBACK', { pct: p.pct })]; } };
const acquireCmd: CommandDef<{ rivalId: number; offer?: number }> = { validate: (s, p) => takeoverError(s, p.rivalId, p.offer ?? 1.1), apply(s, p) { const e: GameEvent[] = []; takeover(s, p.rivalId, p.offer ?? 1.1, e); return e; } };
const negotiateCmd: CommandDef<{ material: string; supplier: string; qty: number; kind: NegoKind }> = { validate: (s, p) => negoError(s, p.material, p.supplier, p.qty, p.kind), apply(s, p) { negotiate(s, p.material, p.supplier, p.kind); return [ev(s, 'NEGOTIATED', { supplier: p.supplier })]; } };
const openDepotCmd: CommandDef<{ city: string; level: number }> = { validate: (s, p) => openDepotError(s, p.city, p.level), apply(s, p) { openDepot(s, p.city, p.level); return [ev(s, 'DEPOT_OPENED', { city: p.city })]; } };
const closeDepotCmd: CommandDef<{ id: number }> = { validate: (s, p) => closeDepotError(s, p.id), apply(s, p) { closeDepot(s, p.id); return [ev(s, 'DEPOT_CLOSED', { id: p.id })]; } };
const setWarehouseCmd: CommandDef<{ sec: number; staff: number }> = { validate: (s, p) => warehouseSetError(s, p.sec, p.staff), apply(s, p) { setWarehouse(s, p.sec, p.staff); return [ev(s, 'WAREHOUSE_SET', {})]; } };
const rentAdCmd: CommandDef<{ projectId: number; level: number }> = { validate(s, p) { const pr = s.projects.find((x) => x.id === p.projectId); if (!pr || pr.status !== 'tamamlandi') return 'Bina bulunamadı.'; if (![0, 1, 2, 3].includes(p.level)) return 'Reklam düzeyi 0–3 olmalı.'; return null; }, apply(s, p) { s.projects.find((x) => x.id === p.projectId)!.rentAd = p.level; return [ev(s, 'RENT_AD', { projectId: p.projectId })]; } };
const rushCmd: CommandDef<{ projectId: number; kind: 'gun' | 'asama'; days?: number }> = { validate: (s, p) => rushError(s, p.projectId, p.kind, p.days ?? 10), apply(s, p) { const e: GameEvent[] = []; startRush(s, p.projectId, p.kind, p.days ?? 10, e); return e; } };
const watchAdCmd: CommandDef<Record<string, never>> = { validate: (s) => watchAdError(s), apply(s) { watchAd(s); return [ev(s, 'AD_WATCHED', {})]; } };
const buyGoldCmd: CommandDef<{ pack: string }> = { validate: (s, p) => buyPackError(s, p.pack), apply(s, p) { buyPackTest(s, p.pack); return [ev(s, 'GOLD_BOUGHT', { pack: p.pack })]; } };
const buyStakeCmd: CommandDef<{ rivalId: number; pct: number }> = { validate: (s, p) => buyStakeError(s, p.rivalId, p.pct), apply(s, p) { buyStake(s, p.rivalId, p.pct); return [ev(s, 'STAKE', { rivalId: p.rivalId })]; } };
const sellStakeCmd: CommandDef<{ rivalId: number; pct: number }> = { validate: (s, p) => sellStakeError(s, p.rivalId, p.pct), apply(s, p) { sellStake(s, p.rivalId, p.pct); return [ev(s, 'STAKE', { rivalId: p.rivalId })]; } };
const ddCmd: CommandDef<{ rivalId: number }> = { validate: (s, p) => ddError(s, p.rivalId), apply(s, p) { doDD(s, p.rivalId); return [ev(s, 'DUE_DILIGENCE', { rivalId: p.rivalId })]; } };
const factoryCmd: CommandDef<{ prod: string; city: string; tier: number }> = { validate: (s, p) => factoryError(s, p.prod, p.city, p.tier), apply(s, p) { const e: GameEvent[] = []; buildFactory(s, p.prod, p.city, p.tier, e); return e; } };
const subTransferCmd: CommandDef<{ div: string; kind: 'sermaye' | 'borc' | 'borc_odeme' | 'temettu'; amount: number }> = { validate: (s, p) => transferError(s, p.div, p.kind, p.amount), apply(s, p) { doTransfer(s, p.div, p.kind, p.amount); return [ev(s, 'IC_TRANSFER', { div: p.div })]; } };
const subBudgetCmd: CommandDef<{ div: string; budget: number }> = { validate: (s, p) => budgetError(s, p.div, p.budget), apply(s, p) { setSubBudget(s, p.div, p.budget); return [ev(s, 'IC_BUDGET', { div: p.div })]; } };

// ---- Yönetim: odak, emir, müdür, ofis eşyası ----
const setFocusCmd: CommandDef<{ id: string }> = {
  validate(s, p) { if (!s.company) return 'Önce şirket kurulmalı.'; if (!FOCI.some((f) => f.id === p.id)) return 'Geçersiz odak.'; if (!canChangeFocus(s)) return 'Yıllık odak yılda bir kez seçilir.'; return null; },
  apply(s, p) { const f = FOCI.find((x) => x.id === p.id)!; s.company!.focus = { id: f.id, year: dateOf(s.clock.day).year }; logDecision(s, 'odak', `Yıllık odak: ${f.label}`, f.desc); return [ev(s, 'FOCUS_SET', { id: f.id })]; },
};
const issueOrderCmd: CommandDef<{ projectId: number; order: string | null }> = {
  validate(s, p) { const pr = s.projects.find((x) => x.id === p.projectId); if (!pr || pr.status !== 'insaat') return 'Emir yalnızca inşaatı süren projeye verilir.'; if (p.order !== null && !orderDef(p.order)) return 'Geçersiz emir.'; if (p.order !== null && activeOrder(s, pr)) return 'Önce mevcut emri iptal edin ya da bitmesini bekleyin.'; return null; },
  apply(s, p) { const pr = s.projects.find((x) => x.id === p.projectId)!; if (p.order === null) { delete pr.order; return [ev(s, 'ORDER_SET', { projectId: pr.id, order: null })]; } const o = orderDef(p.order)!; pr.order = { id: o.id, until: s.clock.day + ORDER_DAYS }; logDecision(s, 'emir', `${pr.name}: ${o.label}`, `${ORDER_DAYS} gün · ${o.desc}`); return [ev(s, 'ORDER_SET', { projectId: pr.id, order: o.id })]; },
};
const setManagerCmd: CommandDef<{ projectId: number; staffId: number | null }> = {
  validate(s, p) { const pr = s.projects.find((x) => x.id === p.projectId); if (!pr || pr.status === 'satildi') return 'Proje bulunamadı.'; if (p.staffId === null) return null; const x = s.staff.find((q) => q.id === p.staffId); if (!x || !MANAGER_TYPES.includes(x.type)) return 'Müdür; şef, mühendis, usta ya da proje yöneticisi olmalı.'; const other = s.projects.find((q) => q.manager === p.staffId && q.id !== pr.id && q.status === 'insaat'); if (other) return `${x.name} zaten ${other.name} projesini yönetiyor.`; return null; },
  apply(s, p) { const pr = s.projects.find((x) => x.id === p.projectId)!; if (p.staffId === null) { delete pr.manager; return [ev(s, 'MANAGER_SET', { projectId: pr.id })]; } const x = s.staff.find((q) => q.id === p.staffId)!; pr.manager = x.id; x.project = pr.id; logDecision(s, 'mudur', `${pr.name}: müdür ${x.name}`, `Proje yönetimi ${x.name}'e devredildi.`); return [ev(s, 'MANAGER_SET', { projectId: pr.id, staffId: x.id })]; },
};
const buyDecorCmd: CommandDef<{ id: string }> = {
  validate(s, p) { const c = s.company; if (!c) return 'Önce şirket kurulmalı.'; const d = decorDef(p.id); if (!d) return 'Geçersiz eşya.'; if (hasDecor(s, d.id)) return 'Bu eşya zaten var.'; if (c.office < d.minOffice) return 'Bu eşya için daha büyük bir ofis gerekir.'; if (c.cash < decorCost(d)) return 'Yeterli nakit yok.'; return null; },
  apply(s, p) { const d = decorDef(p.id)!; post(s, 'ofis', -decorCost(d), { memo: `Ofis: ${d.label}` }); (s.company!.decor ??= []).push(d.id); logDecision(s, 'ofis', `Ofis: ${d.label}`, d.desc); return [ev(s, 'DECOR_BOUGHT', { id: d.id })]; },
};

// ---- Satış merkezi: teklifler, daire bazlı kontrol, kira ----
const offerErr = (s: GameState, id: number) => { const o = (s.offers ?? []).find((x) => x.id === id); if (!o) return 'Teklif artık geçerli değil.'; const u = s.units.find((x) => x.id === o.unitId), pr = s.projects.find((x) => x.id === o.projectId); if (!u || !pr || u.status === 'satildi') return 'Daire artık müsait değil.'; return null; };
const acceptOfferCmd: CommandDef<{ offerId: number }> = {
  validate: (s, p) => offerErr(s, p.offerId),
  apply(s, p) { const o = s.offers!.find((x) => x.id === p.offerId)!, evs: GameEvent[] = []; acceptOffer(s, o, o.ratio, evs); return evs; },
};
const counterOfferCmd: CommandDef<{ offerId: number; ratio: number }> = {
  validate(s, p) { const e = offerErr(s, p.offerId); if (e) return e; const o = s.offers!.find((x) => x.id === p.offerId)!; if (!(p.ratio >= o.ratio && p.ratio <= 1.2)) return 'Karşı teklif, mevcut tekliften yüksek ve en çok liste fiyatının %120\'si olmalı.'; return null; },
  apply(s, p) {
    const o = s.offers!.find((x) => x.id === p.offerId)!, evs: GameEvent[] = [];
    if (p.ratio <= o.maxRatio + 1e-9) { acceptOffer(s, o, p.ratio, evs); evs.push(ev(s, 'COUNTER_RESULT', { offerId: o.id, ok: true })); }
    else { s.offers = s.offers!.filter((x) => x.id !== o.id); evs.push(ev(s, 'OFFER_LOST', { projectId: o.projectId, offerId: o.id, reason: 'karsi' })); evs.push(ev(s, 'COUNTER_RESULT', { offerId: o.id, ok: false })); }
    return evs;
  },
};
const rejectOfferCmd: CommandDef<{ offerId: number }> = {
  validate: (s, p) => ((s.offers ?? []).some((x) => x.id === p.offerId) ? null : 'Teklif artık geçerli değil.'),
  apply(s, p) { const o = s.offers!.find((x) => x.id === p.offerId)!; s.offers = s.offers!.filter((x) => x.id !== o.id); return [ev(s, 'OFFER_LOST', { projectId: o.projectId, offerId: o.id, reason: 'red' })]; },
};
const setUnitCmd: CommandDef<{ unitId: number; adj?: number; hold?: boolean; listing?: 'sat' | 'kira' }> = {
  validate(s, p) {
    const u = s.units.find((x) => x.id === p.unitId); if (!u) return 'Daire bulunamadı.'; if (u.status === 'satildi') return 'Daire satıldı.';
    if (p.adj !== undefined && !(p.adj >= 0.8 && p.adj <= 1.3)) return 'Özel fiyat %80–%130 arasında olmalı.';
    if (p.listing === 'kira') { const pr = s.projects.find((x) => x.id === u.projectId); if (pr && !pr.contract) { const inv = s.investments.find((i) => i.projectId === pr.id && !i.paidOut); if (inv) return 'Yatırımcılı projede kiralama yapılamaz: yatırımcı satış kârıyla ödenir. Önce yatırımcı payı kapanmalı.'; } }
    if (p.listing === 'sat' && u.rent) return 'Önce kirayı sonlandırın.'; if (p.hold && u.rent) return 'Kiradaki daire rezerve edilemez.';
    return null;
  },
  apply(s, p) {
    const u = s.units.find((x) => x.id === p.unitId)!;
    if (p.adj !== undefined) { if (Math.abs(p.adj - 1) < 0.005) delete u.adj; else u.adj = +p.adj.toFixed(3); }
    if (p.hold !== undefined) { if (p.hold) { u.hold = true; s.offers = (s.offers ?? []).filter((x) => x.unitId !== u.id); } else delete u.hold; }
    if (p.listing === 'kira') { u.listing = 'kira'; s.offers = (s.offers ?? []).filter((x) => x.unitId !== u.id); } else if (p.listing === 'sat') { delete u.listing; s.offers = (s.offers ?? []).filter((x) => x.unitId !== u.id); }
    return [ev(s, 'UNIT_SET', { unitId: u.id })];
  },
};
const setAutoSellCmd: CommandDef<{ projectId: number; min: number | null }> = {
  validate(s, p) { const pr = s.projects.find((x) => x.id === p.projectId); if (!pr?.sales) return 'Proje bulunamadı.'; if (p.min !== null && !(p.min >= 0.9 && p.min <= 1.1)) return 'Eşik %90–%110 arasında olmalı.'; return null; },
  apply(s, p) { const pol = s.projects.find((x) => x.id === p.projectId)!.sales!; if (p.min === null) delete pol.autoMin; else pol.autoMin = +p.min.toFixed(3); return [ev(s, 'SALES_POLICY', { projectId: p.projectId })]; },
};
const endRentCmd: CommandDef<{ unitId: number }> = {
  validate(s, p) { const u = s.units.find((x) => x.id === p.unitId); return u?.rent ? null : 'Bu dairede kira sözleşmesi yok.'; },
  apply(s, p) { const u = s.units.find((x) => x.id === p.unitId)!; delete u.rent; u.listing = 'kira'; return [ev(s, 'RENT_ENDED', { projectId: u.projectId, unitId: u.id, by: 'oyuncu' })]; },
};

const setPaceCmd: CommandDef<{ projectId: number; pace: number }> = {
  validate(s, p) { const pr = s.projects.find((x) => x.id === p.projectId); if (!pr?.sales) return 'Proje bulunamadı.'; if (!Number.isInteger(p.pace) || p.pace < 0 || p.pace > 4) return 'Geçersiz ilan hızı.'; return null; },
  apply(s, p) { const pol = s.projects.find((x) => x.id === p.projectId)!.sales!; pol.pace = p.pace; return [ev(s, 'SALES_POLICY', { projectId: p.projectId, pace: p.pace })]; },
};
const promoteUnitCmd: CommandDef<{ unitId: number }> = {
  validate(s, p) { const u = s.units.find((x) => x.id === p.unitId), pr = u && s.projects.find((x) => x.id === u.projectId); if (!u || !pr?.sales) return 'Daire bulunamadı.'; if (u.status === 'satildi' || u.rent) return 'Bu daire öne çıkarılamaz.'; if (u.hold) return 'Önce daireyi ilana koyun.'; if (promoActive(s, u)) return 'Bu daire zaten öne çıkarılmış.'; if (s.company!.cash < promoCost(s, pr, u)) return 'Yeterli nakit yok.'; return null; },
  apply(s, p) { const u = s.units.find((x) => x.id === p.unitId)!, pr = s.projects.find((x) => x.id === u.projectId)!, c = promoCost(s, pr, u); post(s, 'reklam', -c, { projectId: pr.id, memo: `${pr.name}: öne çıkan ilan` }); u.promo = s.clock.day + 30; return [ev(s, 'UNIT_SET', { unitId: u.id })]; },
};

const acceptDealCmd: CommandDef<{ dealId: number }> = {
  validate: (s, p) => dealError(s, p.dealId),
  apply(s, p) { const d = s.deals!.find((x) => x.id === p.dealId)!, evs: GameEvent[] = []; logDecision(s, 'firsat', `${KIND_LABEL[d.kind]}: ${d.title}`, d.kind === 'kat' ? `Kat karşılığı (%${Math.round(d.share * 100)} arsa sahibine)` : `Bedel ${(d.price / 100 / 1e6).toFixed(2).replace('.', ',')} M₺`); acceptDeal(s, d, evs); return evs; },
};
const declineDealCmd: CommandDef<{ dealId: number }> = {
  validate: (s, p) => ((s.deals ?? []).some((x) => x.id === p.dealId) ? null : 'Bu fırsat artık yok.'),
  apply(s, p) { s.deals = s.deals!.filter((x) => x.id !== p.dealId); return [ev(s, 'DEAL_LOST', { dealId: p.dealId })]; },
};

const proposeCmd: CommandDef<{ rivalId: number; kind: string }> = {
  validate(s, p) {
    const r = s.rivals.find((x) => x.id === p.rivalId), pr = PROPOSALS[p.kind]; if (!r || r.failed || r.last === 'satin_alindi') return 'Bu firma artık faaliyette değil.'; if (!pr) return 'Geçersiz teklif.';
    if ((r.rel ?? 0) <= -30) return `${r.name} sizinle görüşmek istemiyor (ilişki düşük).`; if (s.clock.day - (r.asked ?? -999) < 90) return 'Bu firmayla yakın zamanda görüştünüz; 90 gün bekleyin.';
    if ((s.evtQueue ?? []).some((x) => x.rivalId === r.id) || s.pending?.rivalId === r.id) return 'Bu firmayla görüşme sürüyor.';
    if (p.kind === 'arsa' && !s.parcels.some((x) => sellableIdle(s, x))) return 'Satılabilecek boş arsanız yok (en az 120 gündür elinizde olmalı).';
    if (p.kind === 'makine' && !s.machines.length) return 'Kiralanacak makineniz yok.'; return null;
  },
  apply(s, p) { const r = s.rivals.find((x) => x.id === p.rivalId)!, pr = PROPOSALS[p.kind]!; r.asked = s.clock.day; (s.evtQueue ??= []).push({ id: pr.ev, day: s.clock.day + 3, rivalId: r.id }); logDecision(s, 'firsat', `${r.name}: ${pr.label}`, 'Görüşme başlatıldı; yanıt birkaç gün içinde gelir.'); return [ev(s, 'PROPOSED', { rivalId: r.id, kind: p.kind })]; },
};

// ---- Yönetim Merkezi ----
const hireGmCmd: CommandDef<{ candId: number }> = { validate: (s, p) => { if (!s.company) return 'Önce şirket kurulmalı.'; refreshCands(s); const m = getMgmt(s), c = m.cands.find((x) => x.id === p.candId); if (!c) return 'Aday bulunamadı.'; if (m.gm) return 'Önce mevcut genel müdürü görevden alın.'; if (!isUnlocked(s, 'yonetim')) return 'Yönetim Merkezi henüz açılmadı.'; return s.company.cash < c.salary * 2 ? 'İşe giriş masrafı (2 maaş) için yeterli nakit yok.' : null; }, apply(s, p) { hireGM(s, p.candId); return [ev(s, 'MGMT_CHANGED', { what: 'gm' })]; } };
const fireGmCmd: CommandDef<Record<string, never>> = { validate: (s) => { const m = getMgmt(s); if (!m.gm) return 'Genel müdür yok.'; return s.company!.cash < m.gm.salary * 4 ? 'Kıdem tazminatı (4 maaş) için yeterli nakit yok.' : null; }, apply(s) { fireGM(s); return [ev(s, 'MGMT_CHANGED', { what: 'gm' })]; } };
const decideAgendaCmd: CommandDef<{ itemId: string; option: number }> = { validate(s, p) { const m = getMgmt(s), it = m.meeting?.items.find((x) => x.id === p.itemId); if (!it) return 'Toplantı gündemi bulunamadı.'; if (it.picked !== undefined) return 'Bu madde karara bağlandı.'; if (!it.options[p.option]) return 'Geçersiz seçenek.'; return null; }, apply(s, p) { const evs: GameEvent[] = []; decideAgenda(s, p.itemId, p.option, evs); return evs; } };
const setGoalsCmd: CommandDef<{ ids: string[]; diff: number }> = { validate: (s, p) => { if (!s.company) return 'Önce şirket kurulmalı.'; const m = getMgmt(s); if (!isUnlocked(s, 'yonetim')) return 'Yönetim Merkezi henüz açılmadı.'; if (!(p.diff >= 0.8 && p.diff <= 1.4)) return 'Zorluk çarpanı 0,8–1,4 arasında olmalı.'; if (!p.ids?.length) return 'En az bir hedef seçin.'; if (m.goals?.year === dateOf(s.clock.day).year) return 'Bu yılın hedefleri zaten belirlendi.'; return null; }, apply(s, p) { setGoals(s, p.ids, p.diff); return [ev(s, 'MGMT_CHANGED', { what: 'goals' })]; } };
const openDeptCmd: CommandDef<{ dept: string }> = { validate(s, p) { const def = deptDef(p.dept), m = getMgmt(s); if (!def) return 'Geçersiz departman.'; if (m.depts[p.dept]!.open) return 'Departman zaten açık.'; if (s.company!.level < def.level) return `Departman için şirket seviyesi ${def.level} gerekir.`; return s.company!.cash < Math.round(TL(def.openTL) * s.costIndex) ? 'Kuruluş masrafı için yeterli nakit yok.' : null; }, apply(s, p) { openDept(s, p.dept); return [ev(s, 'MGMT_CHANGED', { what: 'dept' })]; } };
const deptBudgetCmd: CommandDef<{ dept: string; mult: number }> = { validate(s, p) { const d = getMgmt(s).depts[p.dept]; if (!d?.open) return 'Önce departmanı kurun.'; return BUDGET_STEPS.includes(p.mult) ? null : 'Geçersiz bütçe düzeyi.'; }, apply(s, p) { getMgmt(s).depts[p.dept]!.budget = p.mult; return [ev(s, 'MGMT_CHANGED', { what: 'dept' })]; } };
const hireDeptMgrCmd: CommandDef<{ dept: string; candId: number }> = { validate(s, p) { const d = getMgmt(s).depts[p.dept]; if (!d?.open) return 'Önce departmanı kurun.'; const c = deptCandidates(s, p.dept).find((x) => x.id === p.candId); if (!c) return 'Aday bulunamadı.'; if (d.mgr) return 'Önce mevcut müdürü görevden alın.'; return s.company!.cash < c.salary * 2 ? 'İşe giriş masrafı için yeterli nakit yok.' : null; }, apply(s, p) { hireDeptMgr(s, p.dept, p.candId); return [ev(s, 'MGMT_CHANGED', { what: 'dept' })]; } };
const fireDeptMgrCmd: CommandDef<{ dept: string }> = { validate(s, p) { const d = getMgmt(s).depts[p.dept]; return d?.mgr ? null : 'Departman müdürü yok.'; }, apply(s, p) { const d = getMgmt(s).depts[p.dept]!; post(s, 'yonetim', -d.mgr!.salary * 3, { memo: `Tazminat: ${d.mgr!.name}` }); d.mgr = null; return [ev(s, 'MGMT_CHANGED', { what: 'dept' })]; } };
const deptStaffCmd: CommandDef<{ dept: string; delta: number }> = { validate(s, p) { const d = getMgmt(s).depts[p.dept]; if (!d?.open) return 'Önce departmanı kurun.'; if (![1, -1].includes(p.delta)) return 'Geçersiz değişim.'; const n = d.staff + p.delta; return n < 0 || n > 12 ? 'Personel sayısı 0–12 arasında olmalı.' : null; }, apply(s, p) { setDeptStaff(s, p.dept, p.delta); return [ev(s, 'MGMT_CHANGED', { what: 'dept' })]; } };

const placeOrderCmd2: CommandDef<PlaceOrderParams & { tier?: number; term?: 'pesin' | 'vade30' | 'vade60'; rush?: boolean; dest?: string }> = {
  validate(s, p) {
    if (!s.company) return 'Önce şirket kurulmalı.'; if (!(p.qty > 0) || p.qty > 1e6) return 'Geçersiz miktar.';
    const q = quoteOrder(s, p.material, p.supplier, p.qty, { term: p.term, rush: p.rush, dest: p.dest, tier: p.tier }); if (!q.ok) return q.error ?? 'Sipariş verilemedi.';
    if (q.space > freeSpace(s) + 1e-9) return `Depo kapasitesi yetersiz: ${freeSpace(s).toFixed(0)} m³ boş, sipariş ${q.space.toFixed(0)} m³.`;
    if ((p.term ?? 'pesin') === 'pesin' && s.company.cash < q.total) return 'Sipariş için yeterli nakit yok.'; return null;
  },
  apply(s, p) { const ev2: GameEvent[] = []; const r = placeOrder(s, p.material, p.qty, p.supplier, ev2, { term: p.term, rush: p.rush, dest: p.dest, tier: p.tier }); if (r.ok) ev2.push(ev(s, 'ORDER_PLACED', { orderId: r.order.id, arriveDay: r.order.arriveDay })); return ev2; },
};
const signContractCmd: CommandDef<{ material: string; supplier: string; qtyPerMonth: number; months: number }> = { validate: (s, p) => (!isUnlocked(s, 'tedarik') ? 'Satın Alma ve Tedarik henüz açılmadı.' : contractError(s, p.material, p.supplier, p.qtyPerMonth, p.months)), apply(s, p) { signContract(s, p.material, p.supplier, p.qtyPerMonth, p.months); return [ev(s, 'SUPPLY_CHANGED', {})]; } };
const cancelContractCmd: CommandDef<{ id: number }> = { validate(s, p) { const c = (s.contracts ?? []).find((x) => x.id === p.id); if (!c) return 'Sözleşme bulunamadı.'; return s.company!.cash < contractValue(c) * 2 ? 'Fesih bedeli (2 aylık tutar) için yeterli nakit yok.' : null; }, apply(s, p) { cancelContract(s, p.id); return [ev(s, 'SUPPLY_CHANGED', {})]; } };
const upgradeWarehouseCmd: CommandDef<Record<string, never>> = { validate(s) { const nx = WAREHOUSE[whLevel(s) + 1]; if (!nx) return 'Depo zaten en büyük kademede.'; if (!isUnlocked(s, 'tedarik')) return 'Satın Alma ve Tedarik henüz açılmadı.'; return s.company!.cash < Math.round(TL(nx.upTL) * s.costIndex) ? 'Depo yatırımı için yeterli nakit yok.' : null; }, apply(s) { upgradeWarehouse(s); return [ev(s, 'SUPPLY_CHANGED', {})]; } };

const evictCmd: CommandDef<{ unitId: number }> = { validate(s, p) { const u = s.units.find((x) => x.id === p.unitId); if (!u?.rent) return 'Bu dairede kiracı yok.'; const r = tenantOf(s, u)!; return s.company!.cash < Math.round(r.amount * (r.arrears ? 1.5 : 3)) ? 'Tahliye masrafı için yeterli nakit yok.' : null; }, apply(s, p) { const evs: GameEvent[] = []; evictTenant(s, p.unitId, evs); return evs; } };
const renovateCmd: CommandDef<{ projectId: number; kind: string }> = { validate: (s, p) => renovateError(s, p.projectId, p.kind), apply(s, p) { renovate(s, p.projectId, p.kind); return [ev(s, 'RENOVATED', { projectId: p.projectId })]; } };
const maintainCmd: CommandDef<{ projectId: number }> = { validate(s, p) { const pr = s.projects.find((x) => x.id === p.projectId); if (!pr || pr.status === 'satildi' || pr.status === 'taslak') return 'Bina bulunamadı.'; const c = maintenanceCost(s, pr); if (c <= 0) return 'Bu binada şirkete ait birim yok.'; if (condOf(pr) >= 99) return 'Bina zaten çok iyi durumda.'; return s.company!.cash < c ? 'Bakım yatırımı için yeterli nakit yok.' : null; }, apply(s, p) { maintainBuilding(s, p.projectId); return [ev(s, 'ESTATE_CHANGED', {})]; } };
const rentPolicyCmd: CommandDef<{ policy: 'enflasyon' | 'yuksek' | 'sabit' }> = { validate: (s, p) => (['enflasyon', 'yuksek', 'sabit'].includes(p.policy) ? (isUnlocked(s, 'gayrimenkul') ? null : 'Gayrimenkul Yönetimi henüz açılmadı.') : 'Geçersiz politika.'), apply(s, p) { s.estate = { policy: p.policy }; return [ev(s, 'ESTATE_CHANGED', {})]; } };
const rentAdjCmd: CommandDef<{ unitId: number; radj: number }> = { validate(s, p) { const u = s.units.find((x) => x.id === p.unitId); if (!u || u.status === 'satildi') return 'Daire bulunamadı.'; if (u.rent) return 'Kiradaki dairenin kirası sözleşme yenilemesinde güncellenir.'; return p.radj >= 0.8 && p.radj <= 1.3 ? null : 'Kira çarpanı %80–%130 arasında olmalı.'; }, apply(s, p) { const u = s.units.find((x) => x.id === p.unitId)!; if (Math.abs(p.radj - 1) < 0.005) delete u.radj; else u.radj = +p.radj.toFixed(3); s.offers = (s.offers ?? []).filter((o) => !(o.unitId === u.id && o.kind === 'kira')); return [ev(s, 'ESTATE_CHANGED', {})]; } };

const serviceMachineCmd: CommandDef<{ machineId: number; kind: 'bakim' | 'buyuk' }> = { validate(s, p) { const m = s.machines.find((x) => x.id === p.machineId); if (!m) return 'Makine bulunamadı.'; if (!(p.kind in SERVICE)) return 'Geçersiz bakım türü.'; if (isRentedOut(s, m)) return 'Kiradaki makineye bakım yapılamaz.'; if (condM(m) >= 99) return 'Makine zaten çok iyi durumda.'; return s.company!.cash < serviceCost(s, m, p.kind) ? 'Bakım için yeterli nakit yok.' : null; }, apply(s, p) { serviceMachine(s, p.machineId, p.kind); return [ev(s, 'MACHINE_CHANGED', {})]; } };
const rentOutCmd: CommandDef<{ machineId: number; days: number }> = { validate(s, p) { const m = s.machines.find((x) => x.id === p.machineId); if (!m) return 'Makine bulunamadı.'; if (![30, 60, 90].includes(p.days)) return 'Süre 30, 60 ya da 90 gün olmalı.'; if (isRentedOut(s, m)) return 'Makine zaten kirada.'; if (m.brokenUntil > s.clock.day) return 'Arızalı makine kiralanamaz.'; return isUnlocked(s, 'makine') ? null : 'Makine Parkı henüz açılmadı.'; }, apply(s, p) { rentOutMachine(s, p.machineId, p.days); return [ev(s, 'MACHINE_CHANGED', {})]; } };
const recallCmd: CommandDef<{ machineId: number }> = { validate(s, p) { const m = s.machines.find((x) => x.id === p.machineId); return m && isRentedOut(s, m) ? null : 'Makine kirada değil.'; }, apply(s, p) { recallMachine(s, p.machineId); return [ev(s, 'MACHINE_CHANGED', {})]; } };
const leaseCmd: CommandDef<{ type: string; months: number }> = { validate(s, p) { if (!machine(p.type)) return 'Geçersiz makine.'; if (![3, 6, 12].includes(p.months)) return 'Süre 3, 6 ya da 12 ay olmalı.'; if (!isUnlocked(s, 'makine')) return 'Makine Parkı henüz açılmadı.'; if (activeLeases(s).some((l) => l.type === p.type)) return 'Bu makine için zaten kiralama var.'; return s.company!.cash < leaseDaily(s, p.type) * 30 ? 'İlk ay kirası için yeterli nakit yok.' : null; }, apply(s, p) { leaseMachine(s, p.type, p.months); return [ev(s, 'MACHINE_CHANGED', {})]; } };
const endLeaseCmd: CommandDef<{ id: number }> = { validate(s, p) { const l = (s.leases ?? []).find((x) => x.id === p.id); if (!l) return 'Kiralama bulunamadı.'; return s.company!.cash < l.daily * 30 ? 'Fesih bedeli (1 aylık kira) için yeterli nakit yok.' : null; }, apply(s, p) { endLease(s, p.id); return [ev(s, 'MACHINE_CHANGED', {})]; } };
const buyUsedCmd: CommandDef<{ offerId: number }> = { validate(s, p) { const o = (s.usedMarket ?? []).find((x) => x.id === p.offerId); if (!o) return 'İlan artık yok.'; if (!isUnlocked(s, 'makine')) return 'Makine Parkı henüz açılmadı.'; return s.company!.cash < o.price ? 'Satın alma için yeterli nakit yok.' : null; }, apply(s, p) { buyUsed(s, p.offerId); return [ev(s, 'MACHINE_CHANGED', {})]; } };

export const COMMANDS = {
  ServiceMachine: serviceMachineCmd, RentOutMachine: rentOutCmd, RecallMachine: recallCmd, LeaseMachine: leaseCmd, EndLease: endLeaseCmd, BuyUsed: buyUsedCmd,
  EvictTenant: evictCmd, MaintainBuilding: maintainCmd, RenovateBuilding: renovateCmd, SetRentPolicy: rentPolicyCmd, SetRentAdj: rentAdjCmd,
  SignContract: signContractCmd, CancelContract: cancelContractCmd, UpgradeWarehouse: upgradeWarehouseCmd,
  HireGM: hireGmCmd, FireGM: fireGmCmd, DecideAgenda: decideAgendaCmd, SetGoals: setGoalsCmd, OpenDept: openDeptCmd, SetDeptBudget: deptBudgetCmd, HireDeptMgr: hireDeptMgrCmd, FireDeptMgr: fireDeptMgrCmd, DeptStaff: deptStaffCmd,
  ProposeToRival: proposeCmd,
  AcceptDeal: acceptDealCmd, DeclineDeal: declineDealCmd,
  SetPace: setPaceCmd, PromoteUnit: promoteUnitCmd,
  AcceptOffer: acceptOfferCmd, CounterOffer: counterOfferCmd, RejectOffer: rejectOfferCmd, SetUnit: setUnitCmd, SetAutoSell: setAutoSellCmd, EndRent: endRentCmd,
  SetFocus: setFocusCmd, IssueOrder: issueOrderCmd, SetManager: setManagerCmd, BuyDecor: buyDecorCmd,
  BuildVenture: buildVentureCmd, OperateProject: operateProjectCmd, SellVenture: sellVentureCmd, SetVentureOps: setVentureOpsCmd, HireVentureMgr: hireVentureMgrCmd, FireVentureMgr: fireVentureMgrCmd, SetPPA: setPPACmd, Negotiate: negotiateCmd, OpenDepot: openDepotCmd, RushProject: rushCmd, GrantGoldPack: buyGoldCmd, GrantAdReward: watchAdCmd, SetWarehouse: setWarehouseCmd, SetRentAd: rentAdCmd, CloseDepot: closeDepotCmd, BuyStake: buyStakeCmd, SellStake: sellStakeCmd, DueDiligence: ddCmd, BuildFactory: factoryCmd, SubTransfer: subTransferCmd, SetSubBudget: subBudgetCmd, ManageSite: manageSiteCmd, SetStrategy: setStrategyCmd, ToggleGM: toggleGmCmd, GoPublic: goPublicCmd, SecondaryOffering: secondaryCmd, Buyback: buybackCmd, AcquireRival: acquireCmd,
  StartConstruction: startConstructionCmd, SellProjectBulk: sellProjectBulk, OpenBranch: openBranch, SetSalesPolicy: setSalesPolicy, PlaceOrder: placeOrderCmd2, BuyMachine: buyMachine, UpgradeOffice: upgradeOffice, ResolveEvent: resolveEventCmd, PlaceBid: placeBidCmd, TakeLoan: takeLoanCmd, TakeInvestor: takeInvestorCmd, SellEquity: sellEquityCmd, RepayLoan: repayLoanCmd, RestructureLoan: restructureCmd, SellMachine: sellMachine, AssignStaff: assignStaff, SetPolicy: setPolicy,
  OrderSurvey: orderSurvey, BuyLand: buyLand, SellLandQuick: sellLandQuick, ListLand: listLand, UnlistLand: unlistLand, CreateProject: createProject, CancelProject: cancelProject,
  CreateCompany: createCompany,
  HireStaff: hireStaff,
  FireStaff: fireStaff,
} as const;

export type CommandName = keyof typeof COMMANDS;
export const COMMAND_NAMES = Object.keys(COMMANDS) as CommandName[];

export type CommandResult = { ok: true; events: GameEvent[] } | { ok: false; error: string };

export function dispatch<N extends CommandName>(s: GameState, name: N, params: Parameters<(typeof COMMANDS)[N]['validate']>[1]): CommandResult {
  const def = COMMANDS[name] as CommandDef<typeof params>;
  const err = def.validate(s, params);
  if (err) return { ok: false, error: err };
  const events = def.apply(s, params); track(s, events); checkProgress(s, events, false, true);
  return { ok: true, events };
}
