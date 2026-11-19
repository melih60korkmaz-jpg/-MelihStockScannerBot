/** Oyun takvimi: gün 0 = 1 Ocak 2027. Gerçek takvim (artık yıl dahil), UTC ile deterministik. */
const START = Date.UTC(2027, 0, 1);
const DAY_MS = 86_400_000;

export interface GameDate { year: number; month: number; day: number; weekday: number } // month 1-12, weekday 0=Pzt

export function dateOf(dayIndex: number): GameDate {
  const d = new Date(START + dayIndex * DAY_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: (d.getUTCDay() + 6) % 7 };
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const formatDate = (dayIndex: number): string => {
  const d = dateOf(dayIndex);
  return `${d.day} ${MONTHS[d.month - 1]} ${d.year}`;
};
export const isFirstOfMonth = (dayIndex: number) => dateOf(dayIndex).day === 1;
export const isMonday = (dayIndex: number) => dateOf(dayIndex).weekday === 0;
export const isNewYear = (dayIndex: number) => { const d = dateOf(dayIndex); return d.month === 1 && d.day === 1; };
/** Aylık gruplama anahtarı: 'YYYY-MM' */
export const monthKey = (dayIndex: number) => { const d = dateOf(dayIndex); return `${d.year}-${String(d.month).padStart(2, '0')}`; };
