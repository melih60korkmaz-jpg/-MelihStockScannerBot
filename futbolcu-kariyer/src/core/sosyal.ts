/** İlişkiler ve sosyal eylemler. İlişkiler yalnızca gösterge değildir: rol, performans, teklifler ve olaylar üzerinde etkisi vardır. */
import { clamp } from './rng';
import { type Game, haberEkle } from './game';
export const HAFTALIK_SOSYAL = 2;
export interface SosyalEylem { id: 'td' | 'takim' | 'taraftar' | 'kiz' | 'sponsor'; ad: string; ik: string; ac: string; enerji: number; para: number; kazanc: number; mut: number; kosul?: (g: Game) => string | null }
export const SOSYAL: SosyalEylem[] = [
  { id: 'td', ad: 'Teknik direktörle konuş', ik: '🧑‍💼', ac: 'Güven artar; oyun süren etkilenir', enerji: 6, para: 0, kazanc: 7, mut: 0 },
  { id: 'takim', ad: 'Takıma yemek ver', ik: '🍽️', ac: 'Soyunma odası kimyası güçlenir', enerji: 4, para: 3500, kazanc: 9, mut: 1 },
  { id: 'taraftar', ad: 'Taraftarlarla buluş', ik: '📣', ac: 'Taraftar desteği artar', enerji: 8, para: 0, kazanc: 7, mut: 1 },
  { id: 'kiz', ad: 'Partnerle vakit geçir', ik: '💞', ac: 'Mutluluk ve ilişki artar', enerji: 5, para: 2500, kazanc: 9, mut: 3, kosul: (g) => (g.kizVar ? null : 'Henüz bir ilişkin yok (olaylarla tanışabilirsin).') },
  { id: 'sponsor', ad: 'Sponsor etkinliğine katıl', ik: '🎤', ac: 'Sponsor memnuniyeti artar', enerji: 8, para: 0, kazanc: 7, mut: 0, kosul: (g) => (g.sponsorlar.length ? null : 'Aktif sponsorun yok.') }
];
export function sosyalYap(g: Game, id: SosyalEylem['id']): { ok: boolean; m: string } {
  const e = SOSYAL.find((x) => x.id === id)!, yok = e.kosul?.(g); if (yok) return { ok: false, m: yok }; if (g.haftaSosyal >= HAFTALIK_SOSYAL) return { ok: false, m: `Bu hafta ${HAFTALIK_SOSYAL} sosyal eylem hakkını kullandın.` };
  if (g.enerji < e.enerji) return { ok: false, m: 'Enerjin yetersiz.' }; if (g.para < e.para) return { ok: false, m: 'Paran yetmiyor.' };
  g.enerji = clamp(g.enerji - e.enerji, 0, 100); g.para -= e.para; g.iliski[id] = clamp(g.iliski[id] + e.kazanc * (g.iliski[id] > 80 ? 0.5 : 1), 0, 100); g.mut = clamp(g.mut + e.mut, 0, 100); g.haftaSosyal++;
  if (id === 'sponsor') for (const a of g.sponsorlar) a.memnun = clamp(a.memnun + 5, 0, 100); return { ok: true, m: `${e.ad}: ilişki +${Math.round(e.kazanc)}${e.para ? `, ${e.para.toLocaleString('tr-TR')} ₺ harcandı` : ''}.` };
}
/** Her hafta: ilişkiler doğal olarak 50'ye (partner için aşağıya) doğru yavaşça kayar; mutluluk dinamikleri. */
export function iliskiHaftalik(g: Game): string[] {
  const s: string[] = []; for (const k of ['td', 'takim', 'taraftar'] as const) g.iliski[k] = clamp(g.iliski[k] + Math.sign(50 - g.iliski[k]) * 0.4, 0, 100);
  if (g.kizVar) { g.iliski.kiz = clamp(g.iliski.kiz - 1.6, 0, 100); if (g.iliski.kiz <= 0) { g.kizVar = false; g.iliski.kiz = 0; s.push(`${g.kizAd} ile ilişkiniz sona erdi.`); haberEkle(g, `${g.ad} ilişkisini bitirdi.`, 'ilis'); g.mut = clamp(g.mut - 10, 0, 100); } else if (g.iliski.kiz > 70) g.mut = clamp(g.mut + 0.8, 0, 100); }
  g.iliski.sponsor = clamp(g.iliski.sponsor + Math.sign(50 - g.iliski.sponsor) * 0.3, 0, 100);
  const luksTaban = Math.min(30, Math.round(Object.keys(g.esyalar).length * 1.8)); g.mut = clamp(g.mut + (luksTaban + 45 - g.mut) * 0.03 + (g.enerji < 25 ? -0.8 : 0) + (g.yorgunluk > 70 ? -0.8 : 0), 0, 100); return s;
}
/** Mutluluğun oyuna etkisi: ~0.92-1.08 çarpan */
export const mutCarpan = (g: Game): number => 0.92 + (g.mut / 100) * 0.16;
/** İlişkilerin somut sonuçları (arayüzde gösterilir) */
export function iliskiEtkileri(g: Game): string[] { const e: string[] = [], r = g.iliski; e.push(r.td < 25 ? '⚠ Teknik direktör güveni çok düşük: ilk 11\'den çıkarılabilirsin.' : r.td > 70 ? '✅ Teknik direktör sana güveniyor: ilk 11 garantisine yakınsın.' : 'Teknik direktör güveni normal.'); e.push(r.takim < 30 ? '⚠ Soyunma odası gergin: paslar daha çok kaçıyor.' : r.takim > 70 ? '✅ Takım kimyası yüksek: paslar daha isabetli.' : 'Takım kimyası normal.'); e.push(r.taraftar < 25 ? '⚠ Taraftar seni yuhalıyor: evinde baskı artıyor.' : r.taraftar > 70 ? '✅ Taraftar arkanda: evinde baskı azalıyor, forma satışı gelir getiriyor.' : 'Taraftar ilgisi normal.'); if (g.kizVar) e.push(r.kiz < 30 ? '⚠ İlişkin tehlikede: mutluluğun düşebilir.' : r.kiz > 70 ? '✅ İlişkin çok iyi: mutluluğun artıyor.' : 'İlişkin dengeli.'); e.push(r.sponsor > 70 ? '✅ Sponsorlar memnun: daha iyi teklifler ve %10 fazla ödeme.' : r.sponsor < 25 ? '⚠ Sponsorlar memnuniyetsiz: ödemeler düşüyor.' : 'Sponsor ilişkisi normal.'); return e; }
