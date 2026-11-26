import type { GameState } from './types';
const KEY = 'cafe-empire.save.v1';
export const serialize = (s: GameState): string => JSON.stringify(s);
export function deserialize(j: string): GameState { const s = JSON.parse(j) as GameState; if (!s || s.v !== 1 || !Array.isArray(s.subeler)) throw new Error('bozuk kayıt'); return s; }
export function save(s: GameState): boolean { try { localStorage.setItem(KEY, serialize(s)); return true; } catch { return false; } }
export function load(): GameState | null { try { const j = localStorage.getItem(KEY); return j ? deserialize(j) : null; } catch { return null; } }
export function wipe(): void { try { localStorage.removeItem(KEY); } catch { /* yok say */ } }
