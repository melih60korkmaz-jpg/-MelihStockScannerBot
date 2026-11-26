/** Mevzuat ve devlet: ruhsat yenileme, vergi denetimi, uyum puanı (muhasebeci), teşvik başvuruları. */
import { hooks, olayIsleyici } from './sim';
import { dayOf } from './calendar';
import { rand } from './rng';
import { D, yaz } from './derin';
import type { Branch, GameState } from './types';

export interface Tesvik { durum: 'bekle' | 'onay' | 'red'; bit: number; tutar: number }
export interface Mev { uyum: number; muhasebe: boolean; ruhsat: Record<number, number>; tesvik: Record<number, Tesvik>; cezaCd: Record<number, number>; denetCd: number; ceza: number; destek: number }
export interface Res { ok: boolean; m: string }
export const RUHSAT_GUN = 365, RUHSAT_UCRET = 6000, MUHASEBE_AYLIK = 8000, TESVIK_BASVURU = 1500;
export function Mv(s: GameState): Mev { return (D(s).mev ??= { uyum: 60, muhasebe: false, ruhsat: {}, tesvik: {}, cezaCd: {}, denetCd: -999, ceza: 0, destek: 0 }); }
const F = (s: GameState): number => s.market.fiyat;
export const ruhsatBit = (s: GameState, b: Branch): number => Mv(s).ruhsat[b.id] ?? b.acilis + RUHSAT_GUN;
export const ruhsatKalan = (s: GameState, b: Branch): number => ruhsatBit(s, b) - dayOf(s);
export function ruhsatYenile(s: GameState, bid: number): Res {
  const b = s.subeler.find((x) => x.id === bid); if (!b) return { ok: false, m: 'Şube yok.' }; const kal = ruhsatKalan(s, b); if (kal > 60) return { ok: false, m: `Ruhsat henüz yenilenemez (${kal} gün var; son 60 günde yenilenir).` }; const c = Math.round(RUHSAT_UCRET * F(s)); if (s.kasa < c) return { ok: false, m: `Yenileme ücreti ${c.toLocaleString('tr-TR')} ₺.` };
  s.kasa -= c; s.capexBugun += c; Mv(s).ruhsat[b.id] = Math.max(ruhsatBit(s, b), dayOf(s)) + RUHSAT_GUN; return { ok: true, m: `${b.ad} ruhsatı 1 yıl yenilendi (−${c.toLocaleString('tr-TR')} ₺).` };
}
export function muhasebeci(s: GameState): Res { const m = Mv(s); m.muhasebe = !m.muhasebe; return { ok: true, m: m.muhasebe ? `Muhasebeci tutuldu (aylık ${Math.round(MUHASEBE_AYLIK * F(s)).toLocaleString('tr-TR')} ₺): uyum yükselir.` : 'Muhasebeci çıkarıldı: uyum yavaşça düşer.' }; }
export function tesvikUygun(s: GameState, b: Branch): string | null { const m = Mv(s); if (m.tesvik[b.id]) return 'Başvuru zaten yapıldı.'; if (dayOf(s) - b.acilis > 180) return 'Teşvik yalnız ilk 180 günde başvurulabilir.'; if (b.staff.length < 3) return 'En az 3 çalışan istihdam etmelisin.'; return null; }
export function tesvikBasvur(s: GameState, bid: number): Res {
  const b = s.subeler.find((x) => x.id === bid); if (!b) return { ok: false, m: 'Şube yok.' }; const nd = tesvikUygun(s, b); if (nd) return { ok: false, m: nd }; const c = Math.round(TESVIK_BASVURU * F(s)); if (s.kasa < c) return { ok: false, m: 'Başvuru ücreti için kasa yetersiz.' }; s.kasa -= c; s.capexBugun += c;
  Mv(s).tesvik[b.id] = { durum: 'bekle', bit: dayOf(s) + 14, tutar: Math.round(35000 * F(s) * (b.staff.length >= 5 ? 1.3 : 1) / 500) * 500 }; return { ok: true, m: 'Teşvik başvurusu yapıldı; sonuç 14 gün içinde.' };
}
hooks.gunOnce.push((s, toplam) => {
  const m = Mv(s), now = dayOf(s); if (!s.subeler.length) return; const n = s.subeler.length;
  if (m.muhasebe) { const c = MUHASEBE_AYLIK * F(s) / 30; toplam.gider.vergi += c; s.kasa -= c; m.uyum = Math.min(100, m.uyum + 0.08); } else m.uyum = Math.max(20, m.uyum - 0.03);
  for (const b of s.subeler) {
    const kal = ruhsatKalan(s, b); if (kal < -15 && (m.cezaCd[b.id] ?? -99) < now - 30 && rand(s.rng, 'events') < 0.15) { const c = Math.round((kal < -45 ? 25000 : 8000) * F(s)); toplam.gider.vergi += c; s.kasa -= c; m.ceza += c; m.cezaCd[b.id] = now; s.log.unshift(`⚖️ ${b.ad}: ruhsatsız çalışma cezası −${c.toLocaleString('tr-TR')} ₺. Ruhsatı yenile!`); if (kal < -45) D(s).etki[`b${b.id}:talep:muhr`] = { v: 0.3, bit: now + 3 }; }
    const t = m.tesvik[b.id]; if (t && t.durum === 'bekle' && now >= t.bit) { if (rand(s.rng, 'events') < 0.7) { t.durum = 'onay'; toplam.gelir.etkinlik += t.tutar; m.destek += t.tutar; s.log.unshift(`🏛️ ${b.ad}: istihdam teşviki onaylandı (+${t.tutar.toLocaleString('tr-TR')} ₺).`); yaz(s, b, 'İstihdam teşviki alındı.'); } else { t.durum = 'red'; s.log.unshift(`🏛️ ${b.ad}: teşvik başvurusu reddedildi.`); } }
  }
  if (now > 120 && m.denetCd < now - 180 && s.bekleyen.length < 3 && rand(s.rng, 'events') < 0.004) { m.denetCd = now; s.bekleyen.push({ id: s.en++, tip: 'd_mevvergi', baslik: 'Vergi denetimi', metin: `Vergi müfettişleri ${s.marka.ad} defterlerini incelemek istiyor. Uyum puanın ${Math.round(m.uyum)}.`, ikon: '🧾', secenek: [{ ad: 'Belgeleri kendin sun', ac: 'Ücretsiz; sonuç uyum puanına bağlı.' }, { ad: 'Muhasebeciye devret (−8 B ₺)', ac: 'Uyum puanı +25 sayılır.' }] }); }
  void n;
});
olayIsleyici.push((s, p, secim) => {
  if (p.tip !== 'd_mevvergi') return null; const m = Mv(s), n = s.subeler.length; if (secim === 1) { const c = Math.round(8000 * F(s)); s.kasa -= c; s.capexBugun += c; } const eff = m.uyum + (secim === 1 ? 25 : 0);
  if (eff >= 70) { m.uyum = Math.min(100, m.uyum + 5); return 'Denetim temiz çıktı: uyum +5.'; }
  const c = Math.round((eff >= 40 ? 15000 : 50000) * F(s) * Math.sqrt(n)); s.kasa -= c; s.capexBugun += c; m.ceza += c; if (eff < 40) m.uyum = 50; for (const b of s.subeler) b.marka = Math.max(0, b.marka - (eff < 40 ? 2 : 0.5)); return `Vergi cezası kesildi: −${c.toLocaleString('tr-TR')} ₺.`;
});
