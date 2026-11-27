/** "Yoğun Saat" mini oyunu: oyuncunun elle oynadığı servis turunun ödül kuralları.
 *  Oynanış arayüzde (ui/servis.ts); burada yalnız günlük hak ve ödül hesabı var (deterministik, testlenebilir). */
import { D } from './derin';
import { dayOf } from './sim';
import type { GameState } from './types';

export interface Servis { gun: number; kez: number; enIyi: number; toplam: number }
export const SERVIS_SURE = 45;
export const servisOf = (s: GameState): Servis => (D(s).servis ??= { gun: -1, kez: 0, enIyi: 0, toplam: 0 });
/** Günde bir kez oynanır ve en az bir şube gerekir. */
export const servisHazirMi = (s: GameState): boolean => s.subeler.length > 0 && servisOf(s).gun !== dayOf(s);
/** Zorluk (1-4): şube sayısı ve seviyeyle artar. */
export const servisZorluk = (s: GameState): number => Math.min(4, 1 + Math.floor(s.subeler.length / 2) + (s.seviye >= 4 ? 1 : 0));
export const yildizOf = (puan: number): number => (puan >= 420 ? 3 : puan >= 220 ? 2 : puan >= 80 ? 1 : 0);
export function servisParasi(s: GameState, puan: number): number { return Math.round(Math.min(Math.max(0, puan), 700) * (200 + 60 * s.subeler.length) / 100) * 100; }
export interface ServisSonuc { para: number; yildiz: number; rekor: boolean }
export function servisOdul(s: GameState, puan: number): ServisSonuc | null {
  if (!servisHazirMi(s)) return null; const v = servisOf(s), para = servisParasi(s, puan), yildiz = yildizOf(puan);
  s.kasa += para; for (const b of s.subeler) b.marka = Math.min(100, b.marka + yildiz * 0.6);
  const rekor = puan > v.enIyi; v.gun = dayOf(s); v.kez++; v.toplam += puan; if (rekor) v.enIyi = puan; return { para, yildiz, rekor };
}
