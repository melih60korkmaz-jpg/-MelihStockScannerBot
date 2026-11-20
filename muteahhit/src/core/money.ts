/** Para birimi: kuruş cinsinden TAMSAYI. Float hatası ekonomiyi bozmasın diye. */
export type Money = number;

export const TL = (lira: number): Money => Math.round(lira * 100);

/** Para × oran, yuvarlanmış tamsayı. */
export const mul = (m: Money, k: number): Money => Math.round(m * k);

const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** 12450 ₺ · 4,8 M₺ · 1,2 Mr₺ · 3,4 Tr₺ (trilyon) */
export function formatMoney(m: Money): string {
  const tl = m / 100;
  const a = Math.abs(tl);
  const sign = tl < 0 ? '−' : '';
  if (a >= 1e12) return `${sign}${nf1.format(a / 1e12)} Tr₺`;
  if (a >= 1e9) return `${sign}${nf1.format(a / 1e9)} Mr₺`;
  if (a >= 1e6) return `${sign}${nf1.format(a / 1e6)} M₺`;
  return `${sign}${nf0.format(a)} ₺`;
}
