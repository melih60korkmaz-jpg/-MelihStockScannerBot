import { TL, type Money } from '../core/money';
import { randInt, rand } from '../core/rng';
import type { GameEvent, GameState, Machine } from '../core/types';
import { machine } from '../data';
import { post } from './ledger';

export const machineValue = (s: GameState, m: Machine): Money => Math.round(m.price * Math.max(0.25, 1 - (0.12 * (s.clock.day - m.boughtDay)) / 365));
export const machineAssetValue = (s: GameState): Money => s.machines.reduce((a, m) => a + machineValue(s, m), 0);
export const machineMonthlyMaint = (s: GameState): Money => s.machines.reduce((a, m) => a + Math.round(TL(machine(m.type)!.maintTL) * s.costIndex), 0);
export const SELL_FACTOR = 0.9;

/**
 * Bir proje-gününde aşamanın gerektirdiği makineler: sahip olunan çalışır durumdakiler yalnızca yakıt, diğerleri günlük kira.
 * Dönen `cost` bir günlük (use=1) maliyettir; arıza kontrolü kullanılan makineler için yapılır.
 */
export function useMachines(s: GameState, req: string[], events: GameEvent[]): { cover: number; cost: Money } {
  if (!req.length) return { cover: 0, cost: 0 };
  let found = 0, cost = 0; const ci = s.costIndex;
  for (const type of req) {
    const def = machine(type)!;
    const m = s.machines.find((x) => x.type === type && x.brokenUntil <= s.clock.day && x.usedDay !== s.clock.day);
    if (m) {
      found++; cost += TL(def.fuelTL) * ci; m.usedDay = s.clock.day; m.uses++;
      if (rand(s.rng, 'construction') < 0.0015 + (m.uses / 9000) * 0.004) { // arıza
        const days = randInt(s.rng, 'construction', 3, 10); m.brokenUntil = s.clock.day + days; const fix = Math.round(m.price * 0.03);
        if (s.company && s.company.cash >= fix) post(s, 'makine', -fix, { memo: `${def.label} onarım` });
        events.push({ type: 'MACHINE_BROKEN', day: s.clock.day, data: { type, days } });
      }
    } else cost += TL(def.rentTL) * ci;
  }
  return { cover: found / req.length, cost: Math.round(cost) };
}
