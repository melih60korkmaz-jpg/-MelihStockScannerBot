import { TL, mul } from './money';
import { pick, randInt } from './rng';
import type { GameEvent, GameState } from './types';
import { NAMES, officeFor, staffType } from '../data';
import { post } from '../sim/ledger';

/**
 * TÜM durum değişiklikleri komutla yapılır. UI'daki her buton bir komuta bağlıdır;
 * `COMMAND_NAMES` ile otomatik test, bağlanmamış/sahte buton olmadığını doğrular.
 */
export interface CommandDef<P> {
  validate(s: GameState, p: P): string | null; // hata mesajı (Türkçe) ya da null
  apply(s: GameState, p: P): GameEvent[];
}

export interface CreateCompanyParams { name: string; founderBackground: string; startCity: string }
export interface HireStaffParams { type: string }
export interface FireStaffParams { staffId: number }

export const STARTING_CAPITAL = TL(6_000_000);
export const FOUNDER_BACKGROUNDS = ['muhendis_mirasci', 'eski_kalfa', 'emlakci'] as const;
export const START_CITIES = ['istanbul', 'ankara', 'izmir'] as const;

const ev = (s: GameState, type: string, data?: Record<string, unknown>, pause = false): GameEvent => ({
  type, day: s.clock.day, ...(pause ? { pause } : {}), ...(data ? { data } : {}),
});

const createCompany: CommandDef<CreateCompanyParams> = {
  validate(s, p) {
    if (s.company) return 'Şirket zaten kurulmuş.';
    const name = p.name.trim();
    if (name.length < 2 || name.length > 32) return 'Şirket adı 2–32 karakter olmalı.';
    if (!(FOUNDER_BACKGROUNDS as readonly string[]).includes(p.founderBackground)) return 'Geçersiz patron geçmişi.';
    if (!(START_CITIES as readonly string[]).includes(p.startCity)) return 'Geçersiz başlangıç şehri.';
    return null;
  },
  apply(s, p) {
    s.company = {
      name: p.name.trim(), founderBackground: p.founderBackground, startCity: p.startCity,
      level: 1, reputation: 10, creditScore: 500, cash: 0,
    };
    post(s, 'sermaye', STARTING_CAPITAL, { memo: 'Kuruluş sermayesi' });
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
    const def = staffType(p.type)!;
    const experience = randInt(s.rng, 'misc', 10, 40);
    // Deneyimli = pahalı: maaş deneyimle %0–%30 artar.
    const salary = mul(TL(def.baseSalaryTL), 1 + (experience / 100) * 0.75);
    const name = `${pick(s.rng, 'misc', NAMES.first)} ${pick(s.rng, 'misc', NAMES.last)}`;
    const id = s.nextId++;
    s.staff.push({ id, type: p.type, name, salary, experience, hiredDay: s.clock.day });
    return [ev(s, 'STAFF_HIRED', { id, name, type: p.type })];
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
