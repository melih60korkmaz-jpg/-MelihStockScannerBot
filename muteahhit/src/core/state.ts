import { seedStreams } from './rng';
import type { Difficulty, GameState } from './types';

export const SAVE_VERSION = 1;

export function newGameState(seed: number, difficulty: Difficulty = 'gercekci'): GameState {
  return {
    meta: { version: SAVE_VERSION, seed, difficulty },
    clock: { day: 0 },
    rng: seedStreams(seed),
    nextId: 1,
    company: null,
    staff: [],
    ledgerBase: 0,
    ledger: [],
  };
}
