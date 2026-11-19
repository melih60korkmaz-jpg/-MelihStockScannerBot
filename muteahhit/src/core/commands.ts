import { TL, mul } from './money';
import type { GameEvent, GameState } from './types';
import { CITIES, background, buildingType, difficulty, officeFor, quality, staffType } from '../data';
import { post } from '../sim/ledger';
import { createStaff } from '../sim/staff';
import { DIFFICULTY_MACRO } from '../sim/macro';
import { SURVEY_DAYS, TAPU_HARCI, QUICK_SALE_DISCOUNT, askPrice, fairValue, reservePrice, surveyCost } from '../sim/land';
import { currentRevenue, newDesignSeed, planProject, projectName } from '../sim/projects';
import { startConstruction, settle } from '../sim/construction';

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
export interface CreateCompanyParams { name: string; founderBackground: string; startCity: string; difficulty?: string; emblem?: Emblem }
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
      level: 1, reputation: bg.reputation, creditScore: bg.creditScore, cash: 0, stats: { completed: 0, sold: 0, profit: 0 },
    };
    post(s, 'sermaye', mul(TL(bg.startCashTL), mult), { memo: 'Kuruluş sermayesi' });
    for (const t of bg.staff) createStaff(s, t);
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
    if (s.staff.length >= officeFor(s.company.level).capacity) return 'Ofis kapasitesi dolu; daha büyük ofis gerekli.';
    return null;
  },
  apply(s, p) {
    const st = createStaff(s, p.type);
    return [ev(s, 'STAFF_HIRED', { id: st.id, name: st.name, type: p.type })];
  },
};

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
    if (!(p.offerPct >= 0.8 && p.offerPct <= 1)) return "Teklif, istenen fiyatın %80–%100'ü arasında olmalı.";
    if (s.clock.day < pc.negoLockUntil) return `Satıcı ${pc.negoLockUntil - s.clock.day} gün daha pazarlığa yanaşmayacak.`;
    const price = Math.round(askPrice(s, pc) * p.offerPct);
    if (s.company.cash < Math.round(price * (1 + TAPU_HARCI))) return 'Arsa ve tapu harcı için yeterli nakit yok.';
    return null;
  },
  apply(s, p) {
    const pc = parcelOf(s, p.parcelId)!;
    const price = Math.round(askPrice(s, pc) * p.offerPct);
    if (price < reservePrice(s, pc)) {
      pc.negoLockUntil = s.clock.day + 3;
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
  validate(s, p) { return s.projects.some((x) => x.id === p.projectId && x.status === 'taslak') ? null : 'İptal edilebilir proje bulunamadı.'; },
  apply(s, p) {
    const pr = s.projects.find((x) => x.id === p.projectId)!; const pc = parcelOf(s, pr.parcelId); if (pc) delete pc.projectId;
    s.projects = s.projects.filter((x) => x.id !== p.projectId);
    return [ev(s, 'PROJECT_CANCELLED', { projectId: p.projectId })];
  },
};

const startConstructionCmd: CommandDef<ProjectRef> = {
  validate(s, p) { const pr = s.projects.find((x) => x.id === p.projectId); if (!pr) return 'Proje bulunamadı.'; if (pr.status !== 'taslak') return 'Bu proje zaten başlatılmış.'; return null; },
  apply(s, p) { return startConstruction(s, s.projects.find((x) => x.id === p.projectId)!); },
};
export const BULK_DISCOUNT = 0.92;
const sellProjectBulk: CommandDef<ProjectRef> = {
  validate(s, p) { const pr = s.projects.find((x) => x.id === p.projectId); if (!pr) return 'Proje bulunamadı.'; if (pr.status !== 'tamamlandi') return 'Yalnızca tamamlanmış projeler satılabilir.'; return null; },
  apply(s, p) {
    const pr = s.projects.find((x) => x.id === p.projectId)!; const parcel = s.parcels.find((x) => x.id === pr.parcelId)!;
    settle(s, pr);
    const price = Math.round(currentRevenue(s, pr) * BULK_DISCOUNT), comm = Math.round(price * 0.01);
    post(s, 'satis', price, { projectId: pr.id, memo: `${pr.name} toplu satış` }); post(s, 'komisyon', -comm, { projectId: pr.id, memo: 'Toplu satış komisyonu' });
    const cost = (pr.result?.cost ?? 0) + (parcel.costBasis ?? 0), profit = price - comm - cost;
    pr.status = 'satildi'; pr.result = { ...pr.result!, revenue: price, profit, soldDay: s.clock.day };
    s.parcels = s.parcels.filter((x) => x.id !== parcel.id);
    s.company!.stats.sold++; s.company!.stats.profit += profit;
    return [ev(s, 'PROJECT_SOLD', { projectId: pr.id, price, profit })];
  },
};

export const COMMANDS = {
  StartConstruction: startConstructionCmd, SellProjectBulk: sellProjectBulk,
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
  return { ok: true, events: def.apply(s, params) };
}
