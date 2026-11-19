import { TL, mul } from './money';
import type { GameEvent, GameState } from './types';
import { CITIES, background, difficulty, officeFor, staffType } from '../data';
import { post } from '../sim/ledger';
import { createStaff } from '../sim/staff';

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
      level: 1, reputation: bg.reputation, creditScore: bg.creditScore, cash: 0,
    };
    post(s, 'sermaye', mul(TL(bg.startCashTL), mult), { memo: 'Kuruluş sermayesi' });
    for (const t of bg.staff) createStaff(s, t);
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

export const COMMANDS = {
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
