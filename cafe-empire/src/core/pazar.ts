/** Online platformlar, sosyal medya, sıralama ve bankalar. */
import { cityById } from '../data/turkey';
import { ilceOf } from '../data/regions';
import { dayOf } from './calendar';
import { hooks, ONLINE_BOOST, ONLINE_KOMISYON, marketShare, levelOf } from './sim';
import { fmt, type Result } from './actions';
import type { Branch, GameState } from './types';

const ok = (m: string): Result => ({ ok: true, m }), no = (m: string): Result => ({ ok: false, m });
/* ---------- Online platformlar ---------- */
export interface Platform { id: string; ad: string; ikon: string; giris: number; seviye: number; not: string }
export const PLATFORMLAR: Platform[] = [
  { id: 'lezzet', ad: 'LezzetNet', ikon: '🍽️', giris: 6000, seviye: 1, not: 'Düşük komisyon, küçük kitle' }, { id: 'kapinda', ad: 'Kapında', ikon: '🛵', giris: 12000, seviye: 1, not: 'Dengeli' },
  { id: 'hemen', ad: 'Hemen Geldi', ikon: '⚡', giris: 15000, seviye: 2, not: 'Hızlı teslimat, yüksek kullanıcı' }, { id: 'sepetgo', ad: 'SepetGo', ikon: '🛒', giris: 25000, seviye: 3, not: 'En büyük kitle, en yüksek komisyon' },
];
export const platformBoost = (id: string): number => ONLINE_BOOST[id] ?? 0, platformKomisyon = (id: string): number => ONLINE_KOMISYON[id] ?? 0.2;
export function platformaKatil(s: GameState, b: Branch, id: string): Result {
  const p = PLATFORMLAR.find((x) => x.id === id); if (!p) return no('Platform yok.'); b.online ??= []; if (b.online.includes(id)) return no('Zaten üyesin.'); if (levelOf(s) < p.seviye && s.subeler.length > 0) return no(`Kafe seviyesi ${p.seviye} gerekir.`);
  const c = Math.round(p.giris * s.market.fiyat / 500) * 500; if (s.kasa < c) return no('Kasa yetersiz.'); s.kasa -= c; s.capexBugun += c; b.online.push(id); return ok(`${p.ad} platformuna katıldın (−${fmt(c)}). Siparişler +%${Math.round(platformBoost(id) * 100)} artar; komisyon %${Math.round(platformKomisyon(id) * 100)}.`);
}
export function platformdanCik(b: Branch, id: string): Result { b.online = (b.online ?? []).filter((x) => x !== id); return ok('Platformdan çıkıldı.'); }

/* ---------- Sosyal medya ---------- */
export interface Paylasim { id: string; ad: string; ikon: string; maliyet: number; bekleme: number; takipci: [number, number]; talep: number; not: string }
export const PAYLASIMLAR: Paylasim[] = [
  { id: 'urun', ad: 'Yeni ürün', ikon: '☕', maliyet: 2000, bekleme: 2, takipci: [40, 120], talep: 1.03, not: 'Bir ürünü öne çıkar' }, { id: 'kampanya', ad: 'Kampanya', ikon: '🏷️', maliyet: 3000, bekleme: 3, takipci: [60, 150], talep: 1.05, not: 'İndirim ve fırsat duyurusu' },
  { id: 'mekan', ad: 'Mekan', ikon: '🏠', maliyet: 1500, bekleme: 3, takipci: [30, 90], talep: 1.02, not: 'Dekor ne kadar şıksa o kadar etki' }, { id: 'ekip', ad: 'Ekip videosu', ikon: '🎬', maliyet: 2500, bekleme: 4, takipci: [25, 70], talep: 1.02, not: 'Baristaların samimi videosu (moral +2)' },
];
export function paylas(s: GameState, id: string): Result {
  const p = PAYLASIMLAR.find((x) => x.id === id); if (!p) return no('Paylaşım yok.'); if (!s.subeler.length) return no('Önce bir şube aç.'); const now = dayOf(s), son = s.sosyal.son[id] ?? -99; if (now - son < p.bekleme) return no(`${p.bekleme - (now - son)} gün sonra tekrar paylaşabilirsin.`);
  const c = Math.round(p.maliyet * s.market.fiyat / 100) * 100; if (s.kasa < c) return no('Kasa yetersiz.'); s.kasa -= c; s.capexBugun += c; s.sosyal.son[id] = now;
  const dekorK = id === 'mekan' ? 1 + 0.3 * Math.max(0, ...s.subeler.map((b) => b.dekor ?? 1)) : 1, kazan = Math.round((p.takipci[0] + (p.takipci[1] - p.takipci[0]) * (0.4 + 0.012 * s.marka_puani)) * dekorK); s.sosyal.takipci += kazan;
  { const cur = (s.market.mod['sosyal']?.bit ?? 0) > now ? s.market.mod['sosyal']!.v : 1; s.market.mod['sosyal'] = { v: Math.max(cur, p.talep), bit: now + 3 }; } if (id === 'ekip') for (const b of s.subeler) for (const e of b.staff) { e.memnuniyet = Math.min(100, e.memnuniyet + 2); e.motivasyon = Math.min(100, e.motivasyon + 2); }
  return ok(`${p.ad} paylaşıldı: +${kazan} takipçi (−${fmt(c)}).`);
}
export const AJANS_GUNLUK = 1200;
export function ajansToggle(s: GameState): Result { s.sosyal.ajans = !s.sosyal.ajans; return ok(s.sosyal.ajans ? `Ajans tutuldu (günlük ${fmt(AJANS_GUNLUK * s.market.fiyat)}): haftada bir otomatik paylaşım.` : 'Ajans ile çalışma bitti.'); }
hooks.gunOnce.push((s, toplam) => {
  if (!s.subeler.length) return; const now = dayOf(s); s.sosyal.takipci += Math.round(s.marka_puani * 0.25 + toplam.musteri * 0.01);
  if (s.sosyal.ajans) { const g = AJANS_GUNLUK * s.market.fiyat; toplam.gider.reklam += g; s.kasa -= g; if (now % 7 === 0) { const p = PAYLASIMLAR[Math.floor(now / 7) % PAYLASIMLAR.length]!; s.sosyal.son[p.id] = now; s.sosyal.takipci += Math.round((p.takipci[0] + p.takipci[1]) / 2); s.market.mod['sosyal'] = { v: p.talep, bit: now + 3 }; } }
});

/* ---------- Sıralama ---------- */
const ZINCIR = ['Demlik Evi', 'Çekirdek Kafe', 'Fincan & Co', 'Moka Durağı', 'Latte House', 'Aroma Lab', 'Barista Evi', 'Kahve Dünyam', 'Bean Roasters', 'Mola Kahve'];
const hs = (x: string): number => { let h = 2166136261; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
export interface Sira { ad: string; puan: number; ben: boolean; sube: number }
/** Zincir sıralaması: 30 günlük ciro (yapay zincirler deterministik olarak büyür). */
export function zincirSirasi(s: GameState): Sira[] {
  const gun = dayOf(s), son = s.rapor.slice(-30), ben = son.reduce((a, r) => a + r.toplamGelir, 0);
  const l: Sira[] = ZINCIR.map((ad, i) => { const taban = 200000 + hs(s.seed + ad) * 900000, buyume = 0.5 + hs(ad + 'g') * 2.2, sube = Math.round(2 + hs(ad + 's') * 6 + gun / 120 * (1 + i % 3)); return { ad, puan: Math.round(taban * (1 + buyume * gun / 365)), ben: false, sube }; });
  l.push({ ad: s.marka.ad, puan: Math.round(ben), ben: true, sube: s.subeler.length + s.franchise.length }); return l.sort((a, b) => b.puan - a.puan);
}
export function ilSirasi(s: GameState, il: number): Array<{ ad: string; pay: number; ben: boolean }> {
  const ms = marketShare(s, il), l = ms.rakipler.map((x) => ({ ad: x.r.ad, pay: x.pay, ben: false })); if (s.subeler.some((b) => b.city === il)) l.push({ ad: s.marka.ad, pay: ms.sen, ben: true }); return l.sort((a, b) => b.pay - a.pay);
}
export const ilceAdi = (b: Branch): string => ilceOf(b.ilce)?.ad ?? cityById(b.city).ad;

/* ---------- Bankalar ---------- */
export interface Banka { id: string; ad: string; faiz: number; komisyon: number; limit: number; not: string }
export const BANKALAR: Banka[] = [
  { id: 'lira', ad: 'Lira Bankası', faiz: 0.0018, komisyon: 0.025, limit: 1500000, not: 'Dengeli faiz' }, { id: 'bogaz', ad: 'Boğaz Bank', faiz: 0.0014, komisyon: 0.04, limit: 1000000, not: 'Düşük faiz, yüksek komisyon' },
  { id: 'anadolu', ad: 'Anadolu Katılım', faiz: 0.0016, komisyon: 0.03, limit: 2000000, not: 'Faizsiz yapı (kâr payı)' }, { id: 'marmara', ad: 'Marmara Finans', faiz: 0.0024, komisyon: 0.01, limit: 3000000, not: 'Yüksek limit, pahalı faiz' },
];
export function krediCek(s: GameState, bankaId: string, tutar: number): Result {
  const b = BANKALAR.find((x) => x.id === bankaId); if (!b) return no('Banka yok.'); if (s.borc + tutar > b.limit * (1 + Math.min(2, s.marka_puani / 50))) return no(`${b.ad} limiti dolu.`);
  const kom = Math.round(tutar * b.komisyon); const bor = s.borc; s.borc += tutar; s.kasa += tutar - kom; s.faiz = (bor * (s.faiz ?? 0.002) + tutar * b.faiz) / s.borc; return ok(`${b.ad}: ${fmt(tutar)} kredi (komisyon ${fmt(kom)}, günlük faiz %${(b.faiz * 100).toFixed(2).replace('.', ',')}).`);
}
