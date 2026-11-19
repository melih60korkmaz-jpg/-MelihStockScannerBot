import { TL, mul } from '../core/money';
import { pick, randInt } from '../core/rng';
import type { GameState, Staff } from '../core/types';
import { NAMES, staffType } from '../data';

/** Deneyimli = pahalı: maaş deneyimle %0–%75×deneyim/100 artar. */
export function createStaff(s: GameState, type: string): Staff {
  const def = staffType(type);
  if (!def) throw new Error(`Bilinmeyen personel tipi: ${type}`);
  const experience = randInt(s.rng, 'misc', 10, 40);
  const salary = mul(TL(def.baseSalaryTL), 1 + (experience / 100) * 0.75);
  const name = `${pick(s.rng, 'misc', NAMES.first)} ${pick(s.rng, 'misc', NAMES.last)}`;
  const st: Staff = { id: s.nextId++, type, name, salary, experience, hiredDay: s.clock.day };
  s.staff.push(st);
  return st;
}
