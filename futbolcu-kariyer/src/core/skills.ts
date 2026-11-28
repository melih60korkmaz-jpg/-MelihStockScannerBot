import type { Rng } from './rng';
import { clamp } from './rng';
export const YETENEKLER = ['surat', 'guc', 'teknik', 'gorus', 'sut', 'pas', 'bitiricilik', 'topKontrol', 'dribbling', 'kafa', 'savunma', 'serbest', 'penalti', 'dayaniklilik'] as const;
export type YetenekId = (typeof YETENEKLER)[number];
export const YETENEK_AD: Record<YetenekId, string> = { surat: 'Sürat', guc: 'Güç', teknik: 'Teknik', gorus: 'Görüş', sut: 'Şut', pas: 'Pas', bitiricilik: 'Bitiricilik', topKontrol: 'Top Kontrolü', dribbling: 'Dribbling', kafa: 'Kafa', savunma: 'Savunma', serbest: 'Serbest Vuruş', penalti: 'Penaltı', dayaniklilik: 'Dayanıklılık' };
export const YETENEK_ACIKLAMA: Record<YetenekId, string> = { surat: 'Koşu hızı ve ilk adım', guc: 'Fizik ve mücadele', teknik: 'Top üzerindeki hakimiyet ve falso', gorus: 'Oyun okuma, pas açıları', sut: 'Şut gücü ve isabeti', pas: 'Pas doğruluğu', bitiricilik: 'Pozisyonu golle bitirme', topKontrol: 'Topu yumuşak karşılama', dribbling: 'Rakip geçme', kafa: 'Kafa vuruşu ve hava hakimiyeti', savunma: 'Top kapma ve markaj', serbest: 'Duran top şutu', penalti: 'Penaltı atışı', dayaniklilik: 'Kondisyon ve toparlanma' };
export type Yetenekler = Record<YetenekId, number>;
export const POZISYONLAR = ['KL', 'STP', 'SGB', 'SLB', 'OL', 'MOS', 'ON', 'SGK', 'SLK', 'SF'] as const;
export type Pozisyon = (typeof POZISYONLAR)[number];
export const POZ_AD: Record<Pozisyon, string> = { KL: 'Kaleci', STP: 'Stoper', SGB: 'Sağ bek', SLB: 'Sol bek', OL: 'Ön libero', MOS: 'Merkez orta saha', ON: 'On numara', SGK: 'Sağ kanat', SLK: 'Sol kanat', SF: 'Santrafor' };
/** Her mevkinin yetenek ağırlıkları (genel puanı ve başlangıç dağılımını belirler). Toplam ~1. */
export const POZ_AGIRLIK: Record<Pozisyon, Partial<Record<YetenekId, number>>> = {
  KL: { gorus: .22, topKontrol: .2, guc: .15, savunma: .2, penalti: .08, dayaniklilik: .07, pas: .08 },
  STP: { savunma: .26, guc: .18, kafa: .16, surat: .08, pas: .08, topKontrol: .06, dayaniklilik: .1, gorus: .08 },
  SGB: { surat: .16, savunma: .18, dayaniklilik: .14, pas: .12, dribbling: .08, guc: .08, teknik: .08, gorus: .08, kafa: .04, topKontrol: .04 },
  SLB: { surat: .16, savunma: .18, dayaniklilik: .14, pas: .12, dribbling: .08, guc: .08, teknik: .08, gorus: .08, kafa: .04, topKontrol: .04 },
  OL: { savunma: .2, pas: .16, guc: .14, gorus: .14, dayaniklilik: .12, topKontrol: .1, teknik: .08, kafa: .06 },
  MOS: { pas: .2, gorus: .16, teknik: .12, topKontrol: .12, dayaniklilik: .12, savunma: .08, dribbling: .08, sut: .06, surat: .06 },
  ON: { gorus: .2, pas: .18, teknik: .16, dribbling: .12, sut: .1, topKontrol: .1, serbest: .06, bitiricilik: .08 },
  SGK: { surat: .22, dribbling: .18, teknik: .12, pas: .1, sut: .1, bitiricilik: .08, topKontrol: .08, dayaniklilik: .07, gorus: .05 },
  SLK: { surat: .22, dribbling: .18, teknik: .12, pas: .1, sut: .1, bitiricilik: .08, topKontrol: .08, dayaniklilik: .07, gorus: .05 },
  SF: { bitiricilik: .22, sut: .16, kafa: .12, guc: .1, surat: .1, topKontrol: .08, dribbling: .06, teknik: .06, penalti: .05, gorus: .05 }
};
export function genelPuan(y: Yetenekler, poz: Pozisyon): number { const w = POZ_AGIRLIK[poz]; let s = 0, t = 0; for (const k of YETENEKLER) { const a = w[k] ?? 0.01; s += y[k] * a; t += a; } return Math.round(s / t); }
/** Başlangıç yetenekleri: yıldız değil, gelişmeye açık. Önemli yetenekler yüksek, diğerleri düşük. */
export function ilkYetenekler(poz: Pozisyon, rng: Rng): Yetenekler {
  const w = POZ_AGIRLIK[poz], maxW = Math.max(...Object.values(w) as number[]), y = {} as Yetenekler;
  for (const k of YETENEKLER) { const rel = (w[k] ?? 0) / maxW; const base = 22 + rel * 26; y[k] = clamp(Math.round(base + rng.gauss() * 3), 12, 58); }
  if (poz === 'KL') { y.savunma = Math.max(y.savunma, 40); y.bitiricilik = Math.min(y.bitiricilik, 18); y.dribbling = Math.min(y.dribbling, 20); } else { y.penalti = Math.min(y.penalti, 45); }
  return y;
}
/** Yetenek tavanı: potansiyel + mevkiye uygunluk. */
export function yetenekTavani(pot: number, poz: Pozisyon, k: YetenekId): number { const w = POZ_AGIRLIK[poz], maxW = Math.max(...Object.values(w) as number[]), rel = (w[k] ?? 0) / maxW; return clamp(Math.round(pot - 22 + rel * 22 + (k === 'dayaniklilik' || k === 'surat' ? 0 : 0)), 35, 99); }
export const yasCarpani = (yas: number): number => (yas <= 17 ? 1.35 : yas <= 20 ? 1.2 : yas <= 24 ? 1 : yas <= 28 ? 0.7 : yas <= 31 ? 0.4 : 0.15);
export const POZ_GRUP = (p: Pozisyon): 'kaleci' | 'defans' | 'orta' | 'hucum' => (p === 'KL' ? 'kaleci' : p === 'STP' || p === 'SGB' || p === 'SLB' ? 'defans' : p === 'OL' || p === 'MOS' || p === 'ON' ? 'orta' : 'hucum');
