/** Dükkân bulma ve "Kirala ve kur" sihirbazı: semt sınıfı, ilanlar, açılış maliyeti dökümü, tahmini aylık sonuç. */
import { cityById } from '../data/turkey';
import { SHOP, type ShopTypeId, type StaffTypeId } from '../data/catalog';
import { type Ilce, ilceKey, profilOf } from '../data/regions';
import { dayOf } from './calendar';
import { ilAcik, ilceAcik, ilceAc, ilceDurum, ilceCost } from './region';
import { rentOf, subeAc, fmt, type Result } from './actions';
import { levelOf } from './sim';
import { INVEST } from './invest';
import { marketWage } from './hr';
import type { GameState } from './types';

export type Sinif = 'Seçkin' | 'Canlı' | 'Mahalle' | 'Ekonomik';
export const SINIFLAR: Sinif[] = ['Seçkin', 'Canlı', 'Mahalle', 'Ekonomik'];
export function sinifOf(d: Ilce): Sinif { const p = profilOf(d), sk = 0.5 * p.kira + 0.5 * p.gelir; return sk >= 1.25 ? 'Seçkin' : sk >= 1.0 ? 'Canlı' : sk >= 0.75 ? 'Mahalle' : 'Ekonomik'; }
export const SINIF_ART: Record<Sinif, { sube: number; prestij: number }> = { Seçkin: { sube: 4, prestij: 35 }, Canlı: { sube: 2, prestij: 18 }, Mahalle: { sube: 0, prestij: 0 }, Ekonomik: { sube: 0, prestij: 0 } };
/** Karşılanmayan şartlar (boşsa açılabilir). */
export function sinifSartlari(s: GameState, d: Ilce): string[] { const r = SINIF_ART[sinifOf(d)], u: string[] = []; if (s.subeler.length < r.sube) u.push(`${r.sube} şube gerekiyor (şu an ${s.subeler.length})`); if (s.marka_puani < r.prestij) u.push(`Marka itibarı ${r.prestij} gerekiyor (şu an ${Math.round(s.marka_puani)})`); return u; }
/** Mekân türleri: kilit şartı seviye ve il uygunluğu. */
export function turSartlari(s: GameState, d: Ilce, tip: ShopTypeId): string[] { const t = SHOP[tip], u: string[] = []; const why = t.uygun(cityById(d.il)); if (why) u.push(why); if (t.seviye > levelOf(s) && s.subeler.length > 0) u.push(`Kafe seviyesi ${t.seviye} gerekiyor (şu an ${levelOf(s)})`); return u; }

export interface Ilan { id: string; ilce: string; tip: ShopTypeId; ad: string; m2: number; masa: number; kira: number; depozito: number; trafik: 'Düşük' | 'Orta' | 'Yüksek'; sigara: boolean }
const hash = (str: string): number => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const AD = ['Ana caddede küçük dükkan', 'Meydan ve durak köşesi', 'Hastane yanı', 'Ara sokakta geniş dükkan', 'Okul karşısı', 'Çarşı girişi', 'Sahil yolu üstü', 'İş merkezi zemin kat', 'Metro çıkışı', 'Pasaj içi', 'Park kenarı', 'Köşe başı'];
export const TRAFIK_K = { Düşük: 0.88, Orta: 1, Yüksek: 1.15 } as const;
/** Bir ilçe + mekân türü için 5 ilan (deterministik; "yeni ilanlar" sayacıyla değişir). */
export function ilanlar(s: GameState, d: Ilce, tip: ShopTypeId): Ilan[] {
  const c = cityById(d.il), st = SHOP[tip], pf = profilOf(d), tur = s.ilanYenile[`${ilceKey(d)}|${tip}`] ?? 0, base = rentOf(s, c, tip);
  return Array.from({ length: 5 }, (_, i) => {
    const k = `${s.seed}|${d.id}|${tip}|${tur}|${i}`, h1 = hash(k + 'a'), h2 = hash(k + 'b'), h3 = hash(k + 'c'), h4 = hash(k + 'd'), m2 = Math.round(st.m2 * (0.8 + 0.5 * h1)), kira = Math.round(base * pf.kira * Math.pow(m2 / st.m2, 0.75) * (0.85 + 0.35 * h2) / 500) * 500;
    const ts = h3 + (pf.talep - 1) * 0.25, trafik = ts > 0.66 ? 'Yüksek' : ts > 0.3 ? 'Orta' : 'Düşük';
    return { id: `${d.id}-${tip}-${tur}-${i}`, ilce: ilceKey(d), tip, ad: AD[Math.floor(hash(k + 'n') * AD.length)]!, m2, masa: Math.max(2, Math.round(m2 / 6.5)), kira: Math.max(2000, kira), depozito: Math.max(2000, kira) * 3, trafik, sigara: h4 > 0.55 };
  });
}
export const yenileBedel = (s: GameState): number => Math.round(5000 * s.market.fiyat / 500) * 500;
export function ilanYenile(s: GameState, d: Ilce, tip: ShopTypeId): Result { const c = yenileBedel(s); if (s.kasa < c) return { ok: false, m: 'Kasa yetersiz.' }; s.kasa -= c; s.capexBugun += c; const k = `${ilceKey(d)}|${tip}`; s.ilanYenile[k] = (s.ilanYenile[k] ?? 0) + 1; return { ok: true, m: `Yeni ilanlar listelendi (−${fmt(c)}).` }; }

export type Konsept = 'takeaway' | 'self' | 'garson' | 'karma';
export const KONSEPT: Record<Konsept, { ad: string; ac: string; hiz: number; sepet: number; not: string }> = {
  takeaway: { ad: 'Take away', ac: 'Hızlı devir', hiz: 3, sepet: 1, not: 'Kapasite +%15, sepet −%10' }, self: { ad: 'Self servis', ac: 'Dengeli', hiz: 2, sepet: 2, not: 'Dengeli' },
  garson: { ad: 'Garsonlu', ac: 'Sepet +%18', hiz: 1, sepet: 3, not: 'Sepet +%40 ikinci ürün, kapasite −%10, servis personeli gerekir' }, karma: { ad: 'Karma', ac: 'Sepet +%8', hiz: 2, sepet: 2, not: 'Sepet +%15 ikinci ürün' } };
export const DEKOR = [{ ad: 'Basit', ac: 'Memnuniyet düşük', k: 1250, sik: 1 }, { ad: 'Standart', ac: 'Dengeli', k: 2500, sik: 2 }, { ad: 'Premium', ac: 'Instagram etkisi', k: 5000, sik: 3 }] as const;
export const EKIPMAN = [{ id: 'espresso', ad: 'Profesyonel espresso makinesi', ac: 'Kapasite ve kalite artar' }, { id: 'mutfak', ad: 'Mutfak', ac: 'Kahvaltı ve burger satılır; yiyecek kalitesi' }, { id: 'pos', ad: 'Hızlı POS', ac: 'Kasa hızlanır' }] as const;
export const MAAS_KADEME = [{ ad: 'Asgari ücret', k: 0.9, moral: 55, ac: 'Moral düşük' }, { ad: 'Piyasa', k: 1, moral: 72, ac: 'Normal' }, { ad: 'Piyasa üstü', k: 1.15, moral: 86, ac: 'Moral yüksek' }] as const;
export interface KurSecim { ilan: Ilan; ad: string; konsept: Konsept; dekor: 0 | 1 | 2; ekipman: string[]; personel: number; maas: 0 | 1 | 2; odeme: 'nakit' | 'kredi' }
export function varsayilanSecim(ilan: Ilan, ad: string): KurSecim { const n = Math.max(2, Math.min(5, Math.round(ilan.m2 / 25))); return { ilan, ad, konsept: 'self', dekor: 1, ekipman: ['espresso'], personel: n, maas: 1, odeme: 'nakit' }; }
export function kadro(n: number): Partial<Record<StaffTypeId, number>> { const k = Math.max(1, Math.min(10, n)); if (k === 1) return { barista: 1 }; if (k === 2) return { barista: 1, kasiyer: 1 }; if (k === 3) return { barista: 2, kasiyer: 1 }; if (k === 4) return { barista: 2, kasiyer: 1, temizlik: 1 }; return { barista: Math.ceil(k * 0.4), kasiyer: Math.max(1, Math.floor(k * 0.2)), servis: Math.max(1, Math.floor(k * 0.2)), temizlik: 1 }; }
export interface Dokum { kurulum: number; ruhsat: number; depozito: number; dekor: number; ekipman: number; pazar: number; ise: number; toplam: number; kredi: number; komisyon: number; nakit: number; maasAylik: number }
export const KREDI_ORAN = 0.5, KREDI_KOM = 0.025;
export function dokum(s: GameState, sc: KurSecim, d: Ilce): Dokum {
  const c = cityById(d.il), st = SHOP[sc.ilan.tip], F = s.market.fiyat, mk = 0.9 + 0.2 * c.maliyet;
  const kurulum = Math.round(st.kurulum * mk * Math.pow(sc.ilan.m2 / st.m2, 0.8) / 1000) * 1000, ruhsat = Math.round(kurulum * 0.08 / 1000) * 1000, depozito = sc.ilan.depozito, dekor = Math.round(sc.ilan.m2 * DEKOR[sc.dekor].k * mk * F / 1000) * 1000;
  const ekipman = Math.round(sc.ekipman.reduce((a, id) => a + (INVEST[id]?.maliyet ?? 0) * F * (sc.ilan.m2 / 86) * 0.9, 0) / 1000) * 1000, pazar = ilceAcik(s, d) ? 0 : ilceCost(s, d), ise = Math.round(sc.personel * 2500 * F / 500) * 500;
  const toplam = kurulum + ruhsat + depozito + dekor + ekipman + pazar + ise, kredi = sc.odeme === 'kredi' ? Math.round(toplam * KREDI_ORAN / 1000) * 1000 : 0, komisyon = Math.round(kredi * KREDI_KOM);
  const maasAylik = Object.entries(kadro(sc.personel)).reduce((a, [tp, n]) => a + marketWage(tp as StaffTypeId, 1, F, c.maliyet) * (n ?? 0), 0) * MAAS_KADEME[sc.maas].k;
  return { kurulum, ruhsat, depozito, dekor, ekipman, pazar, ise, toplam, kredi, komisyon, nakit: toplam - kredi + komisyon, maasAylik: Math.round(maasAylik / 500) * 500 };
}
export interface Tahmin { musteri: number; kacan: number; ciro: number; kar: number; geriDonus: number | null }
/** Aylık tahmin: talep (ilçe, trafik, dekor, konsept) ile kapasiteyi karşılaştırır; ±%25 belirsizdir. */
export function tahmin(s: GameState, sc: KurSecim, d: Ilce): Tahmin {
  const c = cityById(d.il), st = SHOP[sc.ilan.tip], pf = profilOf(d), F = s.market.fiyat, k = kadro(sc.personel), dk = dokum(s, sc, d);
  const marka = 0.4 + 0.012 * (0.5 * s.marka_puani + 3), dekorK = 1 + (sc.dekor - 1) * 0.05 * (pf.gelir >= 1.2 && sc.dekor === 0 ? 0.9 : 1);
  const talep = st.potansiyel * 1.9 * pf.talep * 0.9 * marka * TRAFIK_K[sc.ilan.trafik] * dekorK * (st.m2 > 0 ? Math.pow(sc.ilan.m2 / st.m2, 0.35) : 1);
  const servis = (k.barista ?? 0) + 0.5 * (k.kasiyer ?? 0) + (sc.ekipman.includes('espresso') ? 0.4 : 0) + (sc.ekipman.includes('pos') ? 0.25 : 0), kap = servis * 90 * ({ takeaway: 1.15, self: 1, garson: 0.9, karma: 1 } as const)[sc.konsept] * (sc.konsept === 'garson' && !(k.servis ?? 0) ? 0.85 : 1);
  const gercek = talep * 0.65, musteri = Math.min(gercek, kap), kacan = Math.max(0, gercek - kap);   // kaçan müşteri, stok kesintisi, hava ve ilk aylar için gerçekçilik payı
  const son = s.rapor.slice(-30), ms = son.reduce((a, r) => a + r.musteri, 0), sepet0 = ms > 100 ? son.reduce((a, r) => a + r.toplamGelir - r.gelir.franchise, 0) / ms : 140 * (0.82 + 0.28 * c.gelir), sepet = sepet0 * (0.92 + 0.08 * pf.gelir) * ({ takeaway: 0.92, self: 1, garson: 1.18, karma: 1.08 } as const)[sc.konsept];
  const ciroG = musteri * sepet, sabitG = (st.m2 * (55 + 14 + 6 + 18) + 1200 * 0 + 3000 + 1900 + 900 + 1200) / 30 * F * (sc.ilan.m2 / st.m2), giderG = dk.maasAylik / 30 + sc.ilan.kira / 30 + sabitG + ciroG * 0.3;
  const karG = ciroG - giderG, ay = karG * 30; return { musteri: Math.round(musteri), kacan: Math.round(kacan), ciro: Math.round(ciroG * 30), kar: Math.round(ay), geriDonus: ay > 0 ? Math.ceil(dk.toplam / ay) : null };
}
export function kurNeden(s: GameState, sc: KurSecim, d: Ilce): string | null {
  if (!ilAcik(s, d.il)) return 'Bu ilin pazarı kapalı (Harita → il aç).'; const sart = [...sinifSartlari(s, d), ...turSartlari(s, d, sc.ilan.tip)]; if (sart.length) return sart[0]!;
  if (!ilceAcik(s, d)) { const du = ilceDurum(s, d); if (du.d === 'kilitli') return du.neden; }
  const dk = dokum(s, sc, d); if (s.kasa < dk.nakit) return `Kasa yetersiz (${fmt(dk.nakit)} gerekir).`; if (sc.ad.trim().length < 2) return 'Şube adı gir.'; return null;
}
/** Sihirbazı tamamlar: gerekirse ilçe pazarını açar, kredi çeker, şubeyi kurar. */
export function subeKur(s: GameState, sc: KurSecim, d: Ilce): Result {
  const neden = kurNeden(s, sc, d); if (neden) return { ok: false, m: neden }; const dk = dokum(s, sc, d), mk = MAAS_KADEME[sc.maas], kasa0 = s.kasa, borc0 = s.borc, faiz0 = s.faiz;
  if (dk.kredi) { s.borc += dk.kredi; s.kasa += dk.kredi - dk.komisyon; s.faiz = (borc0 * (faiz0 ?? 0.002) + dk.kredi * 0.0018) / s.borc; }
  let acildi = false; const geri = (m: string): Result => { s.kasa = kasa0; s.borc = borc0; s.faiz = faiz0; if (acildi) delete s.bolge.ilce[ilceKey(d)]; return { ok: false, m }; };
  if (!ilceAcik(s, d)) { const r = ilceAc(s, d); if (!r.ok) return geri(r.m); acildi = true; }
  const r = subeAc(s, d.il, sc.ilan.tip, undefined, ilceKey(d), { maliyet: dk.toplam - dk.pazar - dk.depozito, m2: sc.ilan.m2, kira: sc.ilan.kira, trafik: TRAFIK_K[sc.ilan.trafik], masa: sc.ilan.masa, konsept: sc.konsept, dekor: sc.dekor, depozito: sc.ilan.depozito, ad: sc.ad.trim().slice(0, 28), ekipman: sc.ekipman, personel: kadro(sc.personel), maasCarpan: mk.k, moral: mk.moral });
  if (!r.ok) { if (!ilceAcik(s, d)) return geri(r.m); return geri(r.m); }
  s.kasa -= dk.depozito; s.capexBugun += dk.depozito; s.log.unshift(`🏬 ${sc.ad} kuruldu (${dayOf(s)}. gün).`); return { ok: true, m: `${sc.ad} açıldı! Hayırlı olsun. (−${fmt(dk.nakit)})` };
}
