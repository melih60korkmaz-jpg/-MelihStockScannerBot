/** Kayıt sistemi: 3 slot, sürüm uyumlu, otomatik/manuel kayıt. */
import { SURUM, type Game } from './game';
export const SLOT_SAYISI = 3, ANAHTAR = 'fk_slot_';
export interface SlotBilgi { slot: number; ad: string; kulup: string; sezon: number; hafta: number; yas: number; guncelleme: number }
export interface Depo { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
const bellek = (): Depo => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }; };
let depo: Depo = typeof localStorage !== 'undefined' ? (() => { try { localStorage.setItem('fk_t', '1'); localStorage.removeItem('fk_t'); return localStorage; } catch { return bellek(); } })() : bellek();
export const depoAyarla = (d: Depo): void => { depo = d; };
/** Eski sürümleri günceller. Her yeni sürümde buraya bir adım eklenir. */
export function migrate(ham: any): Game { const g = ham as Game; const v = typeof g.v === 'number' ? g.v : 0; if (v < 1) { g.kadro ??= []; g.oduller ??= []; g.haberler ??= []; g.maclar ??= []; g.v = 1; } return g; }
export function kaydet(g: Game, slot: number): boolean { try { g.son = Date.now(); depo.setItem(ANAHTAR + slot, JSON.stringify(g)); return true; } catch { return false; } }
export function yukle(slot: number): Game | null { try { const s = depo.getItem(ANAHTAR + slot); if (!s) return null; const g = migrate(JSON.parse(s)); return g.v <= SURUM ? g : null; } catch { return null; } }
export function sil(slot: number): void { depo.removeItem(ANAHTAR + slot); }
export function slotlar(): Array<SlotBilgi | null> { const out: Array<SlotBilgi | null> = []; for (let i = 1; i <= SLOT_SAYISI; i++) { const g = yukle(i); out.push(g ? { slot: i, ad: g.ad, kulup: g.kulupler[g.kulup]!.ad, sezon: g.sezon, hafta: g.hafta, yas: g.oyuncu.yas, guncelleme: g.son } : null); } return out; }
export const bosSlot = (): number => { for (let i = 1; i <= SLOT_SAYISI; i++) if (!depo.getItem(ANAHTAR + i)) return i; return 0; };
