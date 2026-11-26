import type { GameState } from './types';
/* ===================== Takvim ===================== */
export const MIN_PER_DAY = 1440;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const START_MONTH = 2;   // Mart 2027
export const START_YEAR = 2027;
export function dateOf(gun: number): { ay: number; ayGun: number; yil: number; haftaGun: number; ayAdi: string } {
  let m = START_MONTH, y = START_YEAR, d = gun;
  for (;;) { const n = m === 1 && y % 4 === 0 ? 29 : (MONTH_DAYS[m] ?? 30); if (d < n) break; d -= n; m++; if (m > 11) { m = 0; y++; } }
  return { ay: m, ayGun: d + 1, yil: y, haftaGun: (gun + 0) % 7, ayAdi: MONTH_NAMES[m] ?? '' };      // 1 Mart 2027 = Pazartesi
}
export const dayOf = (s: GameState) => Math.floor(s.dk / MIN_PER_DAY);
export const hourOf = (s: GameState) => (s.dk % MIN_PER_DAY) / 60;
export const dateText = (s: GameState) => { const d = dateOf(dayOf(s)); return `${d.ayGun} ${d.ayAdi} ${d.yil}`; };
export const timeText = (s: GameState) => { const h = Math.floor(hourOf(s)), m = Math.floor((hourOf(s) - h) * 60 / 10) * 10; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
