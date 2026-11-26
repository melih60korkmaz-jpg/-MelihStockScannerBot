/** Basın ve itibar: bülten, influencer anlaşmaları, haberler ve basın imajı (talebi ±%5 etkiler). */
import { carpan, hooks } from './sim';
import { dayOf } from './calendar';
import { rand } from './rng';
import { D, h32, yaz } from './derin';
import type { GameState } from './types';

export interface Influencer { id: string; ad: string; takipci: number; ucret: number; kalite: number }
export interface Haber { gun: number; baslik: string; pozitif: boolean }
export interface Basin { imaj: number; haberler: Haber[]; adaylar: Influencer[]; yenile: number; aktif: Record<string, number>; cdBulten: number; krizCd: number }
export interface Res { ok: boolean; m: string }
const ISIMLER = ['Kahve Günlüğü', 'Gezgin Elif', 'Mutfak Mert', 'Şehir Rehberi', 'Barista Deniz', 'Lezzet Avcısı', 'Cafe Hop', 'Sabah Kahvesi', 'Yerel Tadlar', 'Fincan Hikâyeleri'];
export function B(s: GameState): Basin { return (D(s).basin ??= { imaj: 0, haberler: [], adaylar: [], yenile: -99, cdBulten: -99, krizCd: -99, aktif: {} }); }
const F = (s: GameState): number => s.market.fiyat;
export function adaylariYenile(s: GameState): void { const b = B(s), now = dayOf(s); b.yenile = now; b.adaylar = Array.from({ length: 3 }, (_, i) => { const h = h32(s.seed, now, i), takip = [8000, 25000, 80000, 250000, 800000][h % 5]!; return { id: `inf${now}_${i}`, ad: ISIMLER[h % ISIMLER.length]!, takipci: takip, ucret: Math.round(takip * 0.45 / 500) * 500, kalite: 0.6 + (h % 40) / 100 }; }); }
export const imajEtki = (s: GameState): number => 1 + B(s).imaj / 100 * 0.05;
carpan.talep.push((s) => imajEtki(s));
export function bulten(s: GameState): Res {
  const b = B(s), now = dayOf(s); if (!s.subeler.length) return { ok: false, m: 'Önce bir şube aç.' }; if (b.cdBulten > now - 10) return { ok: false, m: 'Bülten 10 günde bir gönderilebilir.' }; const c = Math.round(8000 * F(s)); if (s.kasa < c) return { ok: false, m: `Bülten bedeli ${c.toLocaleString('tr-TR')} ₺.` };
  s.kasa -= c; s.capexBugun += c; b.cdBulten = now; const iyi = Math.max(...s.subeler.map((x) => x.marka)) >= 20 && Math.max(...s.subeler.map((x) => x.yorumPuan)) >= 3.8, sans = iyi ? 0.55 : 0.25;
  if (rand(s.rng, 'misc') < sans) { b.imaj = Math.min(100, b.imaj + 8); D(s).etki['g:talep:basin'] = { v: 1.03, bit: now + 10 }; haber(s, `${s.marka.ad} yerel basında: "${['Mahallenin yeni gözdesi', 'Kahve tutkunlarının yeni adresi', 'Taze çekirdek, sıcak servis'][h32(now) % 3]}"`, true); return { ok: true, m: 'Bülten haber oldu! Basın imajı +8, 10 gün talep +%3.' }; }
  return { ok: true, m: 'Bülten gönderildi ama haber olmadı.' };
}
export function haber(s: GameState, baslik: string, pozitif: boolean): void { const b = B(s); b.haberler.unshift({ gun: dayOf(s), baslik, pozitif }); if (b.haberler.length > 15) b.haberler.length = 15; s.log.unshift(`${pozitif ? '📰' : '🗞️'} ${baslik}`); yaz(s, undefined, baslik); }
export function influencerAnlas(s: GameState, id: string): Res {
  const b = B(s), x = b.adaylar.find((y) => y.id === id), now = dayOf(s); if (!x) return { ok: false, m: 'Aday yok.' }; if (Object.values(b.aktif).some((bit) => bit > now)) return { ok: false, m: 'Aynı anda tek influencer anlaşması olur.' };
  const c = Math.round(x.ucret * F(s)); if (s.kasa < c) return { ok: false, m: `Anlaşma bedeli ${c.toLocaleString('tr-TR')} ₺.` }; s.kasa -= c; s.capexBugun += c; b.aktif[x.id] = now + 14; const v = 1 + Math.min(0.1, x.takipci / 1e6 * 0.08 * x.kalite * 1.6); D(s).etki['g:talep:inf'] = { v, bit: now + 14 }; b.adaylar = b.adaylar.filter((y) => y !== x);
  if (rand(s.rng, 'misc') < 0.12) { b.imaj = Math.max(-100, b.imaj - 15); delete D(s).etki['g:talep:inf']; haber(s, `${x.ad} hakkında tartışma: ${s.marka.ad} ile anlaşması gündemde.`, false); return { ok: true, m: `${x.ad} skandala karıştı! Anlaşma sonuç vermedi, basın imajı −15.` }; }
  return { ok: true, m: `${x.ad} ile 14 günlük anlaşma (−${c.toLocaleString('tr-TR')} ₺): talep +%${Math.round((v - 1) * 100)}.` };
}
export function krizAciklamasi(s: GameState): Res { const b = B(s), now = dayOf(s), neg = Object.keys(D(s).etki).filter((k) => k.endsWith(':basinneg')); if (!neg.length) return { ok: false, m: 'Açıklama gerektiren olumsuz bir haber yok.' }; const c = Math.round(5000 * F(s)); if (s.kasa < c) return { ok: false, m: 'Kasa yetersiz.' }; s.kasa -= c; s.capexBugun += c; for (const k of neg) delete D(s).etki[k]; b.imaj = Math.min(100, b.imaj + 5); b.krizCd = now; return { ok: true, m: `Basın açıklaması yapıldı (−${c.toLocaleString('tr-TR')} ₺): olumsuz etki kalktı.` }; }
hooks.gunOnce.push((s) => {
  if (!s.subeler.length) return; const b = B(s), now = dayOf(s), d = D(s); b.imaj *= 0.99; if (now - b.yenile >= 7) adaylariYenile(s);
  if (rand(s.rng, 'misc') < 0.025) { const iyi = Math.max(...s.subeler.map((x) => x.yorumPuan)), yeterli = s.subeler.some((x) => x.yorumlar.length >= 10) && Math.max(...s.subeler.map((x) => x.marka)) >= 15, kotu = yeterli && (s.subeler.some((x) => x.hijyen < 35) || iyi < 2.8);
    if (kotu && rand(s.rng, 'misc') < 0.7) { b.imaj = Math.max(-100, b.imaj - 10); d.etki['g:talep:basinneg'] = { v: 0.97, bit: now + 5 }; haber(s, `${s.marka.ad} hakkında şikâyet haberi: "Müşteriler dert yanıyor"`, false); }
    else if (iyi >= 4.2) { b.imaj = Math.min(100, b.imaj + 6); d.etki['g:talep:basinpoz'] = { v: 1.025, bit: now + 7 }; haber(s, `${s.marka.ad}: "Şehrin en çok beğenilen kafelerinden"`, true); } }
});
