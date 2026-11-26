/** Merkezi depo ve mutfak: şirket geneli tedarik avantajı (saf hesaplar; sim'e bağımlı değil). */
import type { GameState } from './types';
export type MerkezId = 'depo' | 'mutfak';
export interface MerkezDef { id: MerkezId; ad: string; ikon: string; max: number; maliyet: number[]; gunluk: number; seviye: number; sube: number; etki: string[] }
export const MERKEZ: MerkezDef[] = [
  { id: 'depo', ad: 'Merkezi depo', ikon: '🏭', max: 3, maliyet: [500000, 800000, 1300000], gunluk: 600, seviye: 4, sube: 3, etki: ['Tüm siparişlerde −%3 toplu alım indirimi, nakliye −%50', 'Siparişlerde −%6 indirim, nakliye −%75', 'Siparişlerde −%9 indirim, nakliye bedava'] },
  { id: 'mutfak', ad: 'Merkezi mutfak', ikon: '🥐', max: 2, maliyet: [700000, 1200000], gunluk: 800, seviye: 4, sube: 3, etki: ['Un, ham madde ve hazır unlu ürün −%8, raf ömrü +%30', 'Un, ham madde ve hazır unlu ürün −%14, raf ömrü +%60'] },
];
export const merkezDef = (id: MerkezId): MerkezDef => MERKEZ.find((m) => m.id === id)!;
const MUTFAK_ING = new Set(['flour', 'raw', 'bakery']);
export const merkezIndirim = (s: GameState, ing: string): number => 1 - 0.03 * (s.merkez?.depo ?? 0) - (MUTFAK_ING.has(ing) ? [0, 0.08, 0.14][s.merkez?.mutfak ?? 0]! : 0);
export const nakliyeCarpan = (s: GameState): number => [1, 0.5, 0.25, 0][s.merkez?.depo ?? 0]!;
export const merkezRaf = (s: GameState, ing: string): number => (MUTFAK_ING.has(ing) ? [1, 1.3, 1.6][s.merkez?.mutfak ?? 0]! : 1);
export const merkezGunluk = (s: GameState): number => ((s.merkez?.depo ?? 0) * merkezDef('depo').gunluk + (s.merkez?.mutfak ?? 0) * merkezDef('mutfak').gunluk) * s.market.fiyat;
