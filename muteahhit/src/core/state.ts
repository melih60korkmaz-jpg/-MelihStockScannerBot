import { seedStreams } from './rng';
import { initMarket } from '../sim/land';
import type { Difficulty, GameState, MacroState } from './types';

export function initialMacro(): MacroState {
  return { regime: 'normal', regimeSince: 0, regimeEnd: 24 * 30, calmUntilDay: 0, policyRate: 18, inflation: 14, confidence: 58, materialIndex: 100 };
}

export const SAVE_VERSION = 4;

export function newGameState(seed: number, difficulty: Difficulty = 'gercekci'): GameState {
  const s: GameState = {
    meta: { version: SAVE_VERSION, seed, difficulty },
    clock: { day: 0 },
    rng: seedStreams(seed),
    nextId: 1,
    company: null,
    staff: [],
    ledgerBase: 0,
    ledger: [],
    macro: initialMacro(),
    macroHistory: [],
    news: [],
    history: [],
    costIndex: 1,
    taxLossCarry: 0,
    parcels: [],
    projects: [],
    cityMarket: {},
    scheduled: [],
    weather: { istanbul: 'acik', ankara: 'acik', izmir: 'acik' },
  };
  initMarket(s);
  return s;
}
