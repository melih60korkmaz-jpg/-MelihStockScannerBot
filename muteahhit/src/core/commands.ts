import { TL, mul } from './money';
import type { GameEvent, GameState } from './types';
import { CITIES, branchCost, provinceData, background, buildingType, difficulty, machine, material, officeFor, quality, staffType, supplier } from '../data';
import { post } from '../sim/ledger';
import { checkProgress, officeStepFor, track } from '../sim/progress';
import { resolveEvent } from '../sim/events';
import { bidError, placeBid } from '../sim/tenders';
import { quoteInvestor, takeInvestor, equityQuote, sellEquity, refundInvestor } from '../sim/investors';
import { quoteLoan, takeLoan, repayLoan, restructureLoan, type LoanKind } from '../sim/loans';
import { createStaff } from '../sim/staff';
import { DIFFICULTY_MACRO } from '../sim/macro';
import { SURVEY_DAYS, TAPU_HARCI, QUICK_SALE_DISCOUNT, askPrice, fairValue, reservePrice, surveyCost } from '../sim/land';
import { newDesignSeed, planProject, projectName } from '../sim/projects';
import { bulkSellRemaining, unitsOf } from '../sim/sales';
import { canTrade, openCity } from '../sim/land';
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
export const EMBLEM_SHAPES = 12;
export const EMBLEM_COLORS = 6;
export interface CreateCompanyParams { name: string; founderBackground: string; startCity: string; difficulty?: string; emblem?: Emblem; starterGear?: boolean }
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
      emblem: p.emblem ?? { shape: 0, color: 0 },
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

const sellLandQuick: CommandDef<ParcelRef> = {
  validate(s, p) { const pc = parcelOf(s, p.parcelId); if (!pc || pc.owner !== 'player') return 'Arsa bulunamadı.'; if (pc.projectId !== undefined) return 'Üzerinde proje olan arsa satılamaz; önce projeyi iptal edin.'; return null; },
  apply(s, p) {
    const pc = parcelOf(s, p.parcelId)!; const price = Math.round(fairValue(s, pc) * QUICK_SALE_DISCOUNT);
    post(s, 'arsa', price, { memo: `Arsa hızlı satış (${pc.hood})` });
    s.parcels = s.parcels.filter((x) => x.id !== pc.id);
    return [ev(s, 'LAND_SOLD', { parcelId: pc.id, price, quick: true, hood: pc.hood })];
  },
};
const listLand: CommandDef<ListLandParams> = {
  validate(s, p) { const pc = parcelOf(s, p.parcelId); if (!pc || pc.owner !== 'player') return 'Arsa bulunamadı.'; if (pc.projectId !== undefined) return 'Üzerinde proje olan arsa satışa konamaz.'; if (!(p.askMult >= 0.9 && p.askMult <= 1.25)) return "İstenen fiyat, değerin %90–%125'i arasında olmalı."; return null; },
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
    post(s, 'makine_alim', -price, { memo: m.label }); const id = s.nextId++; s.machines.push({ id, type: p.type, boughtDay: s.clock.day, price, brokenUntil: 0, uses: 0 });
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

export const COMMANDS = {
  StartConstruction: startConstructionCmd, SellProjectBulk: sellProjectBulk, OpenBranch: openBranch, SetSalesPolicy: setSalesPolicy, PlaceOrder: placeOrderCmd, BuyMachine: buyMachine, UpgradeOffice: upgradeOffice, ResolveEvent: resolveEventCmd, PlaceBid: placeBidCmd, TakeLoan: takeLoanCmd, TakeInvestor: takeInvestorCmd, SellEquity: sellEquityCmd, RepayLoan: repayLoanCmd, RestructureLoan: restructureCmd, SellMachine: sellMachine, AssignStaff: assignStaff, SetPolicy: setPolicy,
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
