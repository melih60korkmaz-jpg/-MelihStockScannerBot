/**
 * Derin sistemler: çekirdek/kavurma, tarif laboratuvarı, barista ustalığı, müdavimler, semt olayları,
 * komşu esnaf, personel hikâyeleri, krizler, franchise sözleşmeleri, kahve fuarı, dükkân hikâyesi, rakip zincirler.
 * Tüm durum `s.derin` içinde (JSON), her şey deterministik RNG akışlarıyla çalışır.
 */
import { cityById } from '../data/turkey';
import { PRODUCT, PRODUCTS, type IngId, type ProductId } from '../data/catalog';
import { carpan, hooks, olayIsleyici, refPrice, sellPrice, unitCost, segWeights, newRival } from './sim';
import { dateOf, dayOf } from './calendar';
import { rand } from './rng';
import type { Branch, Employee, GameState } from './types';

export interface Res { ok: boolean; m: string }
const ok = (m: string): Res => ({ ok: true, m }), no = (m: string): Res => ({ ok: false, m });
const cl = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
/** Kayıttan bağımsız, deterministik küçük özet (rastgele sayı akışını tüketmez). */
export function h32(...n: number[]): number { let h = 0x811c9dc5; for (const x of n) { h ^= Math.floor(x) | 0; h = Math.imul(h, 0x01000193); h ^= h >>> 13; } return (h >>> 0); }
const tarihMetni = (gun: number): string => { const d = dateOf(gun); return `${d.ayGun} ${d.ayAdi} ${d.yil}`; };

/* ===================== 1) Çekirdek ve kavurma ===================== */
export interface Cekirdek { id: string; ad: string; kal: number; mal: number; not: string; hasat: number[] }
export const CEKIRDEKLER: Cekirdek[] = [
  { id: 'brezilya', ad: 'Brezilya Santos', kal: 1.0, mal: 1.0, not: 'Dengeli, fındıksı; güvenli seçim.', hasat: [4, 5, 6] },
  { id: 'etiyopya', ad: 'Etiyopya Yirgacheffe', kal: 1.13, mal: 1.22, not: 'Meyvemsi ve çiçeksi; pahalı ama etkileyici.', hasat: [10, 11, 0] },
  { id: 'kolombiya', ad: 'Kolombiya Supremo', kal: 1.07, mal: 1.1, not: 'Karamelli ve tatlı; çok yönlü.', hasat: [3, 4, 9] },
  { id: 'guatemala', ad: 'Guatemala Antigua', kal: 1.09, mal: 1.14, not: 'Çikolatamsı, hafif dumanlı.', hasat: [1, 2, 3] },
  { id: 'robusta', ad: 'Vietnam Robusta', kal: 0.9, mal: 0.78, not: 'Sert ve acımsı; ucuz, krema (crema) verir.', hasat: [10, 11] },
];
export const CEK: Record<string, Cekirdek> = Object.fromEntries(CEKIRDEKLER.map((c) => [c.id, c]));
export const KAVURMA = [
  { ad: 'Açık', kal: 1.02, mal: 1.04, not: 'Asidik, meyvemsi; filtre kahve sevenlere.' },
  { ad: 'Orta', kal: 1.0, mal: 1.0, not: 'Dengeli; herkesin sevdiği.' },
  { ad: 'Koyu', kal: 0.99, mal: 0.97, not: 'Yoğun ve acı; Türk kahvesi ve espresso severlere.' },
];
const UYUM: Array<[string, string, number]> = [['brezilya', 'etiyopya', 0.04], ['kolombiya', 'guatemala', 0.03], ['brezilya', 'robusta', 0.02], ['etiyopya', 'guatemala', -0.03]];
export function harmanUyum(a: string, b: string | null): number { if (!b) return 0; for (const [x, y, v] of UYUM) if ((x === a && y === b) || (x === b && y === a)) return v; return 0; }
/** Kavurmahane gibi sistemlerin harman maliyet/kalitesine çarpan eklemesi için kanca. */
export const harmanEk: { mal: (s: GameState) => number; kal: (s: GameState) => number } = { mal: () => 1, kal: () => 1 };
export function harman(s: GameState, ay = dateOf(dayOf(s)).ay): { kal: number; mal: number; uyum: number; ad: string } {
  const c = D(s).cek, A = CEK[c.ana] ?? CEKIRDEKLER[0]!, B = c.ikinci ? CEK[c.ikinci] : undefined, o = B ? c.oran : 0, K = KAVURMA[c.kavurma] ?? KAVURMA[1]!;
  const sezon = (x: Cekirdek) => (x.hasat.includes(ay) ? 0.93 : 1);
  const uyum = B && o >= 0.2 && o <= 0.5 ? harmanUyum(A.id, B.id) : B ? -0.01 : 0;
  const kal = ((A.kal * (1 - o) + (B?.kal ?? 0) * o) * K.kal + uyum) * (c.gecis > 0 ? 0.97 : 1);
  const mal = (A.mal * sezon(A) * (1 - o) + (B ? B.mal * sezon(B) * o : 0)) * K.mal;
  return { kal: kal * harmanEk.kal(s), mal: mal * harmanEk.mal(s), uyum, ad: c.ad };
}
export function cekirdekAyarla(s: GameState, p: { ana?: string; ikinci?: string | null; oran?: number; kavurma?: 0 | 1 | 2; ad?: string }): Res {
  const c = D(s).cek; let degisti = false;
  if (p.ana && CEK[p.ana] && p.ana !== c.ana) { c.ana = p.ana; degisti = true; }
  if (p.ikinci !== undefined && p.ikinci !== c.ikinci && (p.ikinci === null || CEK[p.ikinci])) { c.ikinci = p.ikinci === c.ana ? null : p.ikinci; degisti = true; }
  if (p.oran !== undefined) c.oran = cl(Math.round(p.oran * 20) / 20, 0.1, 0.6);
  if (p.kavurma !== undefined && p.kavurma !== c.kavurma) { c.kavurma = p.kavurma; degisti = true; }
  if (p.ad !== undefined) c.ad = p.ad.trim().slice(0, 24) || c.ad;
  if (degisti) { const bedel = Math.round(4000 * s.market.fiyat); if (s.kasa < bedel) return no(`Yeni karışım için ${bedel} ₺ gerekir.`); s.kasa -= bedel; s.capexBugun += bedel; c.gecis = 3; yenile(s); return ok(`Karışım güncellendi (−${bedel} ₺). Fırınlar ısınırken 3 gün kalite biraz düşer.`); }
  yenile(s); return ok('Ayar kaydedildi.');
}

/** Tarifin hammadde reçetesi (imza içecek satışı stoktan düşer). */
export function tarifRecete(t: Pick<Tarif, 'sut' | 'sup' | 'sos' | 'shot'>): Partial<Record<IngId, number>> { return { bean: 18 * t.shot, cup: 1, lid: 1, napkin: 1, ...(t.sut < 3 ? { milk: 160 } : {}), ...(t.sup > 0 ? { syrup: 12 } : {}), ...(t.sos > 0 ? { choc: 15 } : {}) }; }
/** Stok yetiyorsa düşer ve true döner. */
export function stokTuket(b: Branch, r: Partial<Record<IngId, number>>): boolean { for (const k of Object.keys(r) as IngId[]) if ((b.stok[k] ?? 0) < (r[k] ?? 0)) return false; for (const k of Object.keys(r) as IngId[]) b.stok[k] = (b.stok[k] ?? 0) - (r[k] ?? 0); return true; }

/* ===================== 2) Tarif laboratuvarı ===================== */
export interface Tarif { id: number; ad: string; sut: number; sup: number; sos: number; soguk: boolean; shot: number; fiyat: number; test: number; begeni: number; satis: number; gelir: number }
export const SUTLER = ['Tam yağlı süt', 'Yulaf sütü', 'Badem sütü', 'Süt yok'];
export const SUPLAR = ['Şurup yok', 'Vanilya', 'Karamel', 'Fındık', 'Lavanta'];
export const SOSLAR = ['Sos yok', 'Çikolata', 'Beyaz çikolata'];
export function gercekBegeni(seed: number, t: Pick<Tarif, 'sut' | 'sup' | 'sos' | 'soguk' | 'shot'>): number {
  let p = 50; const { sut, sup, sos, soguk, shot } = t;
  if (soguk) { if (sup === 2) p += 14; if (sup === 1) p += 8; if (sup === 4) p += 10; if (sut === 1) p += 5; } else { if (sup === 3) p += 12; if (sup === 2) p += 6; if (sup === 4) p -= 8; }
  if (sut === 2 && sup === 1) p += 12; if (sut === 2 && sup === 3) p += 10; if (sut === 1 && sup === 4) p += 10; if (sut === 1) p += 4;
  if (sos === 1 && sup === 2) p -= 12; if (sos === 2 && sup === 4) p -= 15; if (sos === 1 && !soguk && sut !== 3) p += 8; if (sup > 0 && sos > 0) p -= 6;
  if (shot === 2 && sut === 3) p += 10; else if (shot === 2) p += 4; if (shot === 1 && sut === 3) p -= 8; if (shot === 2 && soguk) p += 3;
  p += (h32(seed, sut, sup, sos, soguk ? 1 : 0, shot) % 21) - 10;
  return cl(p, 5, 98);
}
export function tarifMaliyet(s: GameState, t: Pick<Tarif, 'sut' | 'sup' | 'sos' | 'shot'>): number { return Math.round(((14 + t.shot * 9 + [6, 9, 12, 0][t.sut]! + [0, 4, 5, 6, 7][t.sup]! + [0, 5, 7][t.sos]!) * s.market.fiyat) * 10) / 10; }
export function tarifTahmin(s: GameState, t: Tarif): { orta: number; pay: number } { const pay = Math.round(20 / (1 + t.test)); const sapma = (h32(s.seed, t.id, t.test) % (2 * pay + 1)) - pay; return { orta: cl(Math.round(t.begeni + sapma), 0, 100), pay }; }
export function tarifOlustur(s: GameState, ad: string, c: { sut: number; sup: number; sos: number; soguk: boolean; shot: number }): Res {
  const d = D(s); if (d.tarif.length >= 6) return no('En fazla 6 tarif tutabilirsin; birini sil.');
  const bedel = Math.round(2500 * s.market.fiyat); if (s.kasa < bedel) return no(`Deneme mutfağı için ${bedel} ₺ gerekir.`);
  const id = Math.max(0, ...d.tarif.map((x) => x.id)) + 1, t: Tarif = { id, ad: ad.trim().slice(0, 22) || `Tarif ${id}`, ...c, fiyat: Math.round(tarifMaliyet(s, c) * 3.4 / 5) * 5, test: 0, begeni: gercekBegeni(s.seed + id, c), satis: 0, gelir: 0 };
  s.kasa -= bedel; s.capexBugun += bedel; d.tarif.push(t); return ok(`"${t.ad}" tarifi yazıldı (−${bedel} ₺). Önerilen satış fiyatı ${t.fiyat} ₺; önce müşterilere tattır.`);
}
export function tarifTat(s: GameState, id: number): Res { const t = D(s).tarif.find((x) => x.id === id); if (!t) return no('Tarif yok.'); const bedel = Math.round(1500 * s.market.fiyat); if (s.kasa < bedel) return no('Tadım için kasa yetersiz.'); s.kasa -= bedel; t.test++; D(s).say.tat = (D(s).say.tat ?? 0) + 1; const e = tarifTahmin(s, t); return ok(`Tadım ${t.test}. tur: müşteri puanı yaklaşık ${e.orta}/100 (±${e.pay}).`); }
export function tarifFiyat(s: GameState, id: number, d: number): Res { const t = D(s).tarif.find((x) => x.id === id); if (!t) return no('Tarif yok.'); t.fiyat = Math.max(20, t.fiyat + d); return ok(`${t.ad}: ${t.fiyat} ₺`); }
export function tarifSil(s: GameState, id: number): Res { const d = D(s); d.tarif = d.tarif.filter((x) => x.id !== id); if (d.imza === id) d.imza = null; return ok('Tarif silindi.'); }
export function tarifImza(s: GameState, id: number): Res {
  const d = D(s), t = d.tarif.find((x) => x.id === id); if (!t) return no('Tarif yok.'); if (!t.test) return no('İmza yapmadan önce en az bir kez tattır.'); if (!s.subeler.length) return no('Önce bir şube aç.');
  const bedel = Math.round(8000 * s.market.fiyat); if (s.kasa < bedel) return no(`Lansman için ${bedel} ₺ gerekir.`); s.kasa -= bedel; d.imza = id; return ok(`"${t.ad}" tüm şubelerde imza içecek oldu (−${bedel} ₺).`);
}
function imzaGunluk(s: GameState, b: Branch, musteri: number): { gelir: number; gider: number } {
  const d = D(s), t = d.tarif.find((x) => x.id === d.imza); if (!t || musteri <= 0) return { gelir: 0, gider: 0 };
  const ay = dateOf(dayOf(s)).ay, yaz = ay >= 5 && ay <= 8, kis = ay <= 1 || ay === 11, sez = t.soguk ? (yaz ? 1.6 : kis ? 0.4 : 1) : yaz ? 0.85 : kis ? 1.2 : 1;
  const ref = refPrice(s, PRODUCT.latte, cityById(b.city)), oran = (0.02 + 0.13 * t.begeni / 100) * sez * cl(Math.pow(ref / t.fiyat, 1.3), 0.3, 1.4);
  const hedef = musteri * oran * 0.6, rc = tarifRecete(t); let adet = 0; for (let i = 0; i < Math.round(hedef) && i < 400; i++) { if (!stokTuket(b, rc)) break; adet++; } if (adet < Math.round(hedef)) D(s).say.imzaStok = (D(s).say.imzaStok ?? 0) + 1;
  t.satis += adet; t.gelir += adet * t.fiyat; if (t.begeni > 70) b.marka = cl(b.marka + 0.03, 0, 100);
  return { gelir: adet * t.fiyat, gider: adet * tarifMaliyet(s, t) };
}

/* ===================== 3) Barista ustalığı ===================== */
export interface Usta { xp: number; art: number; sohbet: number; tasarruf: number; harcanan: number }
export const YETENEKLER = [{ id: 'art', ad: 'Latte art', ac: 'Ürün kalitesi +%1,4 / puan' }, { id: 'sohbet', ad: 'Müşteri sohbeti', ac: 'Talep +%1 / puan' }, { id: 'tasarruf', ad: 'İsrafsız çalışma', ac: 'Malzeme gideri −%1 / puan' }] as const;
export type YetId = (typeof YETENEKLER)[number]['id'];
export const ustaSeviye = (u: Usta): number => Math.min(8, Math.floor(Math.sqrt(u.xp / 4)));
export const ustaPuan = (u: Usta): number => ustaSeviye(u) - u.harcanan;
export const UNVAN = (l: number): string => (l >= 7 ? 'Baş barista' : l >= 5 ? 'Usta barista' : l >= 3 ? 'Kıdemli barista' : l >= 1 ? 'Barista' : 'Çırak');
export function ustaOf(s: GameState, e: Employee): Usta { const d = D(s); return (d.usta[e.id] ??= { xp: 0, art: 0, sohbet: 0, tasarruf: 0, harcanan: 0 }); }
export function ustaYetenek(s: GameState, empId: number, y: YetId): Res {
  const e = s.subeler.flatMap((b) => b.staff).find((x) => x.id === empId); if (!e) return no('Çalışan yok.'); const u = ustaOf(s, e);
  if (ustaPuan(u) <= 0) return no('Yetenek puanı yok; ustalık için zaman ve deneyim gerekir.'); if (u[y] >= 5) return no('Bu yetenek en üst seviyede.'); u[y]++; u.harcanan++; yenile(s); return ok(`${e.ad}: ${YETENEKLER.find((x) => x.id === y)!.ad} ${u[y]}/5`);
}
const baristalar = (b: Branch): Employee[] => b.staff.filter((e) => e.tip === 'barista');
export function ustaOrt(s: GameState, b: Branch): { art: number; sohbet: number; tasarruf: number } {
  const l = baristalar(b); if (!l.length) return { art: 0, sohbet: 0, tasarruf: 0 }; const d = D(s); let a = 0, c = 0, t = 0;
  for (const e of l) { const u = d.usta[e.id]; if (u) { a += u.art; c += u.sohbet; t += u.tasarruf; } } return { art: a / l.length, sohbet: c / l.length, tasarruf: t / l.length };
}
export const DERECE = ['Altın', 'Gümüş', 'Bronz'];
export function sampiyonaKatil(s: GameState, empId: number, bonus = 0): Res {
  const d = D(s), now = dayOf(s), dt = dateOf(now), e = s.subeler.flatMap((b) => b.staff).find((x) => x.id === empId);
  if (!e || e.tip !== 'barista') return no('Yalnızca baristalar katılabilir.'); if (dt.ay !== 9) return no('Şampiyona her yıl Ekim ayında yapılır.'); if (d.sam.some((x) => x.yil === dt.yil)) return no('Bu yılın şampiyonasına zaten katıldın.');
  const bedel = Math.round(8000 * s.market.fiyat); if (s.kasa < bedel) return no(`Kayıt ücreti ${bedel} ₺.`); s.kasa -= bedel;
  const u = ustaOf(s, e), puan = 38 + u.art * 7 + ustaSeviye(u) * 3.5 + e.beceri * 0.18 + rand(s.rng, 'misc') * 22 + cl(bonus, 0, 20), rakip = Array.from({ length: 12 }, (_, i) => 42 + ((h32(s.seed, dt.yil, i) % 4400) / 100)), derece = 1 + rakip.filter((x) => x > puan).length;
  const ad = derece <= 3 ? `${DERECE[derece - 1]} madalya` : `${derece}. sıra`; d.sam.push({ yil: dt.yil, ad: `${e.ad} · ${ad}`, derece });
  const odul = derece === 1 ? [30000, 6, 1.08, 60] : derece === 2 ? [15000, 3, 1.05, 40] : derece === 3 ? [8000, 2, 1.03, 30] : [0, 0.5, 1, 0];
  s.kasa += odul[0]! * s.market.fiyat; for (const b of s.subeler) b.marka = cl(b.marka + odul[1]!, 0, 100); if (odul[3]) d.etki['g:talep:sam'] = { v: odul[2]!, bit: now + odul[3] }; e.motivasyon = cl(e.motivasyon + (derece <= 3 ? 25 : 8), 0, 100); u.xp += derece <= 3 ? 20 : 6;
  const msg = `🏆 ${e.ad} barista şampiyonasında ${ad} oldu!`; s.log.unshift(msg); yaz(s, undefined, msg); yenile(s); return ok(`${msg}${odul[0] ? ` Ödül +${Math.round(odul[0] * s.market.fiyat)} ₺` : ''}`);
}

/* ===================== 4) Müdavimler ve müşteri tipleri ===================== */
export interface Mudavim { ad: string; urun: ProductId; bag: number; gel: number }
const ISIMLER = ['Emekli Hasan Amca', 'Öğrenci Elif', 'Yazar Mert', 'Turist Anna', 'Muhasebeci Selin', 'Fotoğrafçı Deniz', 'Komşu Ayşe Teyze', 'Bisikletçi Kaan', 'Doktor Zeynep', 'Taksici Rıza', 'Mimar Burcu', 'Öğretmen Osman', 'Girişimci Ece', 'Müzisyen Baran'];
export const MUD_MAX = 10;
function mudGunluk(s: GameState, b: Branch, musteri: number): { gelir: number; gider: number } {
  const d = D(s), l = (d.mud[b.id] ??= []); let gelir = 0, gider = 0, now = dayOf(s);
  const sans = musteri * 0.004 * Math.max(0, b.memnuniyet - 42) / 25 * (1 + 0.15 * ustaOrt(s, b).sohbet);
  if (l.length < MUD_MAX && rand(s.rng, 'misc') < Math.min(0.5, sans)) {
    const akt = PRODUCTS.filter((p) => b.menu[p.id]?.aktif && p.seviye <= 3), p = akt.length ? akt[Math.floor(rand(s.rng, 'misc') * akt.length)]! : null, ad = ISIMLER.filter((x) => !l.some((m) => m.ad === x));
    if (p && ad.length) { const m: Mudavim = { ad: ad[Math.floor(rand(s.rng, 'misc') * ad.length)]!, urun: p.id, bag: 35, gel: 0 }; l.push(m); yaz(s, b, `${m.ad} artık sürekli uğruyor (favorisi ${p.ad}).`); if (l.length === 1) ms(s, b, 'ilk_mud', 'İlk müdavim kazanıldı.'); }
  }
  for (const m of [...l]) {
    const mi = b.menu[m.urun], var_ = !!mi?.aktif, pahali = (mi?.fiyat ?? 1) > 1.2;
    m.bag = cl(m.bag + (var_ && !pahali && b.memnuniyet >= 52 ? 0.7 : 0) - (!var_ ? 1.8 : 0) - (pahali ? 0.8 : 0) - (b.memnuniyet < 45 ? 0.5 : 0) + (b.hijyen > 70 ? 0.1 : -0.1), 0, 100);
    if (var_ && b.acik && rand(s.rng, 'misc') < m.bag / 140 && stokTuket(b, PRODUCT[m.urun].recete)) { const fiyat = sellPrice(s, b, m.urun); m.gel++; d.say.mudGel = (d.say.mudGel ?? 0) + 1; gelir += fiyat; gider += unitCost(s, m.urun, cityById(b.city)); }
    if (m.bag < 4) { l.splice(l.indexOf(m), 1); yaz(s, b, `${m.ad} artık uğramıyor… (${PRODUCT[m.urun].ad} bulunmadı ya da fiyat/hizmet hoşuna gitmedi)`); }
  }
  void now; if (l.filter((m) => m.bag >= 80).length >= 3) ms(s, b, 'sadik3', 'Üç sadık müdavim: dükkân artık bir mahalle ocağı.'); return { gelir, gider };
}
export const mudavimSayi = (s: GameState, b: Branch): number => (D(s).mud[b.id] ?? []).length;
export const SEG_AD = { ogr: 'Öğrenci', cal: 'Çalışan', tur: 'Turist', aile: 'Aile', emk: 'Emekli/mahalle' } as const;
export const SEG_NOT = { ogr: 'Uygun fiyat, soğuk içecek, tatlı sever; öğleden sonra gelir.', cal: 'Sabah espresso/latte, hızlı servis ister; fiyata az duyarlı.', tur: 'Yaz sezonu, gösterişli içecek ve yerel lezzet arar.', aile: 'Hafta sonu, tatlı ve geniş masa; çocuklu gelir.', emk: 'Çay ve Türk kahvesi, sakin ortam, sabah saatleri.' } as const;
export function musteriTipleri(b: Branch): Array<{ id: keyof typeof SEG_AD; ad: string; pay: number; not: string }> { const w = segWeights(b, cityById(b.city)), t = Object.values(w).reduce((a, x) => a + x, 0) || 1; return (Object.keys(SEG_AD) as Array<keyof typeof SEG_AD>).map((id) => ({ id, ad: SEG_AD[id], pay: w[id] / t, not: SEG_NOT[id] })).sort((a, b2) => b2.pay - a.pay); }

/* ===================== 5) Semt olayları ===================== */
export interface Semt { id: string; ad: string; ikon: string; talep: number; sira: number; top: number; baslangic: number }
function bayram(gun: number): { ad: string; sira: number; top: number } | null {
  for (let n = -1; n < 14; n++) { const rb = Math.round(8 + 354.37 * n), kb = Math.round(76 + 354.37 * n), r = gun - rb, k = gun - kb; if (r >= 0 && r < 3) return { ad: 'Ramazan Bayramı', sira: r + 1, top: 3 }; if (k >= 0 && k < 4) return { ad: 'Kurban Bayramı', sira: k + 1, top: 4 }; }
  return null;
}
export function semtOlaylari(s: GameState, b: Branch, gun: number): Semt[] {
  const c = cityById(b.city), p = c.profil, dt = dateOf(gun), out: Semt[] = []; const ekle = (id: string, ad: string, ikon: string, talep: number, sira: number, top: number): void => { out.push({ id, ad, ikon, talep, sira, top, baslangic: gun - sira + 1 }); };
  const by = bayram(gun); if (by) ekle('bayram', by.ad, '🎉', cl(1 - 0.42 * p.cal + 0.3 * (p.tur + p.aile), 0.7, 1.3), by.sira, by.top);
  if ((dt.ay === 0 && dt.ayGun >= 5 && dt.ayGun <= 22) || (dt.ay === 5 && dt.ayGun <= 14)) ekle('sinav', 'Sınav dönemi', '📚', 1 + 0.55 * p.ogr, 1, 1);
  if (dt.ay === 8 && dt.ayGun >= 8 && dt.ayGun <= 21) ekle('okul', 'Okullar açıldı', '🎒', 1 + 0.32 * p.ogr, 1, 1);
  if (dt.haftaGun === 5 && h32(c.id, Math.floor(gun / 7)) % 4 === 0) ekle('mac', 'Derbi maç akşamı', '⚽', 1.09, 1, 1);
  for (let g = 0; g < 2; g++) { if (h32(c.id, gun - g, 7) % 45 === 0) { ekle('festival', 'Festival / konser', '🎪', 1.05 + 0.25 * (p.tur + p.aile), g + 1, 2); break; } }
  if (dt.ay >= 6 && dt.ay <= 7 && h32(c.id, Math.floor(gun / 5)) % 6 === 0) ekle('sicak', 'Sıcak hava dalgası', '🌡️', 1.07, (gun % 5) + 1, 5);
  if (dt.ay === 1 && dt.ayGun === 14) ekle('sevgili', 'Sevgililer Günü', '💝', 1.18, 1, 1);
  if (dt.ay === 11 && dt.ayGun >= 30) ekle('yilbasi', 'Yılbaşı hazırlığı', '🎄', 1.14, dt.ayGun - 29, 2);
  if (dt.ay === 4 && dt.ayGun >= 8 && dt.ayGun <= 14 && dt.haftaGun === 6) ekle('anneler', 'Anneler Günü', '🌷', 1.1, 1, 1);
  return out;
}
export function semtCarpan(s: GameState, b: Branch, gun: number): number {
  const d = D(s); let k = 1; for (const e of semtOlaylari(s, b, gun)) { const hz = d.hazir[`${b.id}:${e.id}:${e.baslangic}`]; k *= hz ? (e.talep >= 1 ? 1 + (e.talep - 1) * 1.5 : 1 + (e.talep - 1) * 0.5) : e.talep; } return k;
}
export function takvim(s: GameState, b: Branch, gun = 12): Array<{ gun: number; olaylar: Semt[] }> { const now = dayOf(s); return Array.from({ length: gun }, (_, i) => ({ gun: now + i, olaylar: semtOlaylari(s, b, now + i) })); }

/* ===================== 6) Komşu esnaf ===================== */
export interface Esnaf { id: string; ad: string; ikon: string; talep: number; not: string }
export const ESNAFLAR: Esnaf[] = [
  { id: 'firin', ad: 'Mahalle Fırını', ikon: '🥖', talep: 0.02, not: 'Sabah simidi/poğaça; ortak kampanyada tatlı-tuzlu paket.' },
  { id: 'kitap', ad: 'Kitapçı', ikon: '📚', talep: 0.025, not: 'Okur öğrenciler dükkâna yönlenir.' },
  { id: 'cicek', ad: 'Çiçekçi', ikon: '💐', talep: 0.02, not: 'Vitrin ve hediye paketleri; dükkân daha şık görünür.' },
  { id: 'spor', ad: 'Spor Salonu', ikon: '🏋️', talep: 0.03, not: 'Sabah ve akşam protein-kahve trafiği.' },
  { id: 'eczane', ad: 'Eczane', ikon: '💊', talep: 0.015, not: 'Yaşlı müşteri akışı ve güvenilir komşuluk.' },
  { id: 'berber', ad: 'Berber', ikon: '💈', talep: 0.02, not: 'Erkek müşteri trafiği; bekleyene ikram.' },
];
export function esnafOf(s: GameState, b: Branch): Esnaf[] { const sira = [...ESNAFLAR].sort((a, c) => (h32(b.id, s.seed, a.id.length, a.id.charCodeAt(0)) - h32(b.id, s.seed, c.id.length, c.id.charCodeAt(0)))); return sira.slice(0, 4); }
export function esnafIliski(s: GameState, b: Branch, id: string): number { return D(s).esnaf[b.id]?.[id] ?? 15; }
export function esnafZiyaret(s: GameState, b: Branch, id: string): Res {
  const d = D(s), e = ESNAFLAR.find((x) => x.id === id); if (!e) return no('Esnaf yok.'); const k = `z${b.id}${id}`, now = dayOf(s); if ((d.son[k] ?? -9) > now - 2) return no('Yakın zamanda ziyaret ettin; birkaç gün bekle.');
  const bedel = Math.round(1500 * s.market.fiyat); if (s.kasa < bedel) return no('Kasa yetersiz.'); s.kasa -= bedel; d.son[k] = now; (d.esnaf[b.id] ??= {})[id] = cl(esnafIliski(s, b, id) + 8, 0, 100); return ok(`${e.ad} ziyaret edildi (−${bedel} ₺): ilişki ${Math.round(d.esnaf[b.id]![id]!)}.`);
}
export function ortakKampanya(s: GameState, b: Branch, id: string): Res {
  const d = D(s), e = ESNAFLAR.find((x) => x.id === id); if (!e) return no('Esnaf yok.'); if (esnafIliski(s, b, id) < 40) return no('Ortak kampanya için ilişki en az 40 olmalı.'); const now = dayOf(s); if ((d.ortak[b.id]?.[id] ?? 0) > now) return no('Bu ortak kampanya zaten sürüyor.');
  const bedel = Math.round(4000 * s.market.fiyat); if (s.kasa < bedel) return no('Kasa yetersiz.'); s.kasa -= bedel; (d.ortak[b.id] ??= {})[id] = now + 14; d.say.ortak = (d.say.ortak ?? 0) + 1; yenile(s); yaz(s, b, `${e.ad} ile ortak kampanya başladı.`); return ok(`${e.ad} ile 14 günlük ortak kampanya (−${bedel} ₺).`);
}
function esnafCarpan(s: GameState, b: Branch): number {
  const d = D(s), now = dayOf(s); let k = 1; for (const e of esnafOf(s, b)) { const r = esnafIliski(s, b, e.id); k += e.talep * (r >= 60 ? 1 : 0.4 * r / 60); if ((d.ortak[b.id]?.[e.id] ?? 0) > now) k += 0.04 + r / 100 * 0.05; } return k;
}

/* ===================== 7–8) Olay motoru: personel hikâyeleri ve krizler ===================== */
export const KARAKTERLER = [
  { id: 'caliskan', ad: 'Çalışkan', ik: '💪', not: 'Kaliteyi yükseltir.' }, { id: 'tembel', ad: 'Rahatına düşkün', ik: '😴', not: 'Kaliteyi biraz düşürür.' }, { id: 'hirsli', ad: 'Hırslı', ik: '🚀', not: 'Hızlı öğrenir, zam ister.' },
  { id: 'sadik', ad: 'Sadık', ik: '🤝', not: 'Neredeyse hiç istifa etmez.' }, { id: 'dedikodu', ad: 'Dedikoducu', ik: '🗣️', not: 'Ekip moralini zedeler.' }, { id: 'yaratici', ad: 'Yaratıcı', ik: '🎨', not: 'Marka ve tarif başarısını artırır.' }, { id: 'gergin', ad: 'Gergin', ik: '😬', not: 'Çabuk yorulur.' },
] as const;
export const karakterOf = (s: GameState, e: Employee): (typeof KARAKTERLER)[number] => { const d = D(s); const id = (d.trait[e.id] ??= KARAKTERLER[h32(s.seed, e.id, e.gorunum) % KARAKTERLER.length]!.id); return KARAKTERLER.find((k) => k.id === id) ?? KARAKTERLER[0]!; };
interface Ef { kasa?: number; marka?: number; hijyen?: number; memn?: number; etki?: [string, number, number]; mot?: number; zam?: number; mud?: number; hik?: string; sans?: [number, Ef, Ef]; msg?: string; kamera?: boolean; istifa?: boolean; terfi?: boolean; zinciri?: boolean; bedelHaz?: boolean; sendika?: boolean }
interface Ctx { emp?: number; zin?: string; olay?: string; baslangic?: number; fiyat?: number }
interface Opt { ad: string; ac: string; ef: (s: GameState, b: Branch, c: Ctx) => Ef }
interface OlayDef { id: string; ad: string; ik: string; metin: (s: GameState, b: Branch, c: Ctx) => string; olasi: (s: GameState, b: Branch) => number; sogu: number; opt: Opt[] }
const F = (s: GameState): number => s.market.fiyat;
const denetimSonuc = (s: GameState, b: Branch, h: number): Ef => h >= 70 ? { marka: 3, msg: 'Denetimi parlak bir notla geçtin.', hik: 'Gıda denetimini başarıyla geçti.' } : h >= 45 ? { kasa: -8000 * F(s), marka: -1, msg: 'Uyarı aldın; idari para cezası kesildi.' } : { kasa: -20000 * F(s), marka: -4, etki: [`b${b.id}:talep`, 0.15, 3], msg: 'Dükkân 3 gün mühürlendi ve ağır ceza kesildi.', hik: 'Hijyen yüzünden denetimde 3 gün kapatıldı.' };
export const OLAYLAR: OlayDef[] = [
  { id: 'denetim', ad: 'Gıda denetimi', ik: '🧑‍⚖️', sogu: 40, olasi: () => 0.004, metin: (_s, b) => `${b.ad} için belediye gıda denetimi ekibi kapıda. Hijyen puanın şu an ${Math.round(b.hijyen)}.`,
    opt: [{ ad: 'Seferberlik: derin temizlik (−6 B ₺)', ac: 'Hijyen +15 olduktan sonra denetime girersin.', ef: (s, b) => ({ kasa: -6000 * F(s), hijyen: 15, sans: [1, denetimSonuc(s, b, b.hijyen + 15), {}] }) }, { ad: 'Olduğu gibi karşıla', ac: 'Mevcut hijyenle denetim sonucu belirlenir.', ef: (s, b) => denetimSonuc(s, b, b.hijyen) }] },
  { id: 'yorum', ad: 'Yorum fırtınası', ik: '⛈️', sogu: 30, olasi: (_s, b) => (b.memnuniyet < 68 ? 0.006 : 0.0015), metin: (_s, b) => `${b.ad} hakkında sosyal medyada haksız/haklı bir kötü yorum hızla yayılıyor.`,
    opt: [{ ad: 'Samimi, açık bir yanıt yaz', ac: '%55: tartışma yatışır, marka + ; olmazsa 7 gün talep −%7.', ef: (_s, b) => ({ sans: [0.55, { marka: 1, msg: 'Yanıtın beğenildi.' }, { etki: [`b${b.id}:talep`, 0.93, 7], msg: 'Tartışma büyüdü; bir hafta talep düştü.' }] }) },
      { ad: 'İkram günü düzenle (−3 B ₺)', ac: 'Kızgın müşteriyi kazan; marka +2.', ef: (s) => ({ kasa: -3000 * F(s), marka: 2, msg: 'İkram günü yorumları tatlıya bağladı.' }) },
      { ad: 'Avukata başvur (−12 B ₺)', ac: '%50 yorum silinir; olmazsa 14 gün talep −%10.', ef: (s, b) => ({ kasa: -12000 * F(s), sans: [0.5, { msg: 'Yorum kaldırıldı.' }, { marka: -1, etki: [`b${b.id}:talep`, 0.9, 14], msg: 'Dava uzadı, itibar zedelendi.' }] }) },
      { ad: 'Yok say', ac: '10 gün talep −%12.', ef: (_s, b) => ({ etki: [`b${b.id}:talep`, 0.88, 10], msg: 'Yorum görmezden gelindi; müşteri çekindi.' }) }] },
  { id: 'ariza', ad: 'Espresso makinesi bozuldu', ik: '🛠️', sogu: 45, olasi: (_s, b) => 0.003 / (1 + 0.5 * (b.yat?.espresso ?? 0)), metin: (_s, b) => `${b.ad} şubesinin espresso makinesi sabah bozuldu. Kahve çıkmıyor!`,
    opt: [{ ad: 'Acil tamir (−18 B ₺)', ac: 'Servis hemen gelir; kayıp yok.', ef: (s) => ({ kasa: -18000 * F(s), msg: 'Makine aynı gün onarıldı.' }) }, { ad: 'Yedek makine kirala (−5 B ₺)', ac: '3 gün talep −%10.', ef: (s, b) => ({ kasa: -5000 * F(s), etki: [`b${b.id}:talep`, 0.9, 3] }) }, { ad: 'Idare et, bekle', ac: '4 gün talep −%40; memnuniyet −3.', ef: (_s, b) => ({ etki: [`b${b.id}:talep`, 0.6, 4], memn: -3 }) }] },
  { id: 'tedarik', ad: 'Çekirdek tedarik krizi', ik: '🚢', sogu: 60, olasi: (s) => (s.market.bean > 1.2 ? 0.004 : 0.0015), metin: () => 'Liman grevi yüzünden çekirdek sevkiyatı aksıyor; depodaki ürün tükenirse kalite düşecek.',
    opt: [{ ad: 'Acil alternatif tedarik (−15 B ₺)', ac: 'Kalite etkilenmez.', ef: (s) => ({ kasa: -15000 * F(s) }) }, { ad: 'Robusta ile idare et', ac: '10 gün kalite −%4, maliyet düşer.', ef: () => ({ etki: ['g:kalite:tedarik', 0.96, 10], kasa: 4000 }) }, { ad: 'Bekle', ac: '7 gün kalite −%8.', ef: () => ({ etki: ['g:kalite:tedarik', 0.92, 7] }) }] },
  { id: 'hirsizlik', ad: 'Kasa hırsızlığı', ik: '🕵️', sogu: 80, olasi: (s, b) => (D(s).kamera[b.id] ? 0.0004 : 0.002), metin: (_s, b) => `${b.ad} şubesinde kasadan para eksik çıktı. Güvenlik kamerası yok.`,
    opt: [{ ad: 'Kamera sistemi kur (−10 B ₺)', ac: 'Bir daha olma ihtimali çok düşer.', ef: (s) => ({ kasa: -10000 * F(s), kamera: true }) }, { ad: 'Polise bildir', ac: 'Kayıp −%50; küçük itibar etkisi.', ef: (s) => ({ kasa: -6000 * F(s) }) }, { ad: 'Kabullen', ac: 'Kayıp tam; ekip moral −5.', ef: (s) => ({ kasa: -12000 * F(s), mot: -5 }) }] },
  { id: 'sendika', ad: 'Sendikal baskı', ik: '✊', sogu: 120, olasi: (s) => (s.subeler.reduce((a, b) => a + b.staff.length, 0) >= 12 && s.subeler.reduce((a, b) => a + b.staff.reduce((x, e) => x + e.memnuniyet, 0), 0) / s.subeler.reduce((a, b) => a + b.staff.length, 1) < 58 ? 0.01 : 0), metin: () => 'Çalışanlar maaşlar ve çalışma saatleri yüzünden sendikalaşma sinyali veriyor.',
    opt: [{ ad: 'Herkese prim öde (−25 B ₺)', ac: 'Moral +12, grev riski kalkar.', ef: (s) => ({ kasa: -25000 * F(s), mot: 12, msg: 'Prim dağıtıldı; ekip sakinleşti.' }) }, { ad: 'Toplantı yap, zam sözü ver', ac: 'Moral +5 ama 30 gün içinde zam beklenir.', ef: () => ({ mot: 5, etki: ['g:talep:sendika', 0.97, 14] }) }, { ad: 'Görmezden gel', ac: '%60 grev: 4 gün tüm şubelerde talep −%35.', ef: () => ({ sans: [0.6, { sendika: true, msg: 'Grev başladı!' }, { mot: -6 }] }) }] },
  { id: 'zam', ad: 'Zam talebi', ik: '🙋', sogu: 25, olasi: (s, b) => (b.staff.some((e) => e.tip !== 'sube_muduru' && s.derin?.trait[e.id] === 'hirsli') ? 0.01 : 0.002), metin: (s, b, c) => { const e = b.staff.find((x) => x.id === c.emp); return e ? `${e.ad} (${karakterOf(s, e).ad}) maaş zammı ve unvan terfisi istiyor.` : 'Bir çalışan zam istiyor.'; },
    opt: [{ ad: 'Yüzde 10 zam', ac: 'Moral +10.', ef: () => ({ zam: 0.1, mot: 10 }) }, { ad: 'Yüzde 20 zam + terfi', ac: 'Moral +25; ustalık puanı kazanır; maaş yükü artar.', ef: () => ({ zam: 0.2, mot: 25, terfi: true }) }, { ad: 'Şimdilik hayır', ac: 'Moral −12; hırslıysa istifa riski.', ef: () => ({ mot: -12, istifa: true }) }] },
  { id: 'kapma', ad: 'Rakip barista kapıyor', ik: '🧲', sogu: 40, olasi: (s, b) => (D(s).rakip.some((r) => r.kisilik === 'agresif' && r.sehirler.includes(b.city)) && baristalar(b).some((e) => (s.derin?.usta[e.id]?.art ?? 0) >= 2) ? 0.006 : 0), metin: (s, b, c) => { const e = b.staff.find((x) => x.id === c.emp); return `${c.zin ?? 'Rakip zincir'}, ${e?.ad ?? 'baristan'}'a %30 yüksek maaş teklif etti.`; },
    opt: [{ ad: 'Karşı teklif: %20 zam', ac: 'Kalır, sadakati artar.', ef: () => ({ zam: 0.2, mot: 15 }) }, { ad: 'Gitmesine izin ver', ac: 'Ustalık kaybolur; pozisyon boşalır.', ef: () => ({ istifa: true, mot: -4 }) }] },
  { id: 'bayi', ad: 'Bayi kalite sorunu', ik: '📉', sogu: 40, olasi: (s) => (s.franchise.some((f) => f.kalite < 45) ? 0.02 : 0), metin: (s) => { const f = s.franchise.slice().sort((a, b) => a.kalite - b.kalite)[0]; return `${f?.ad ?? 'Bir bayi'} (kalite ${Math.round(f?.kalite ?? 0)}) markanı kötü temsil ediyor; müşteri şikâyetleri geliyor.`; },
    opt: [{ ad: 'Ekip gönder, eğit (−10 B ₺)', ac: 'Kalite +12.', ef: (s) => ({ kasa: -10000 * F(s), zinciri: true }) }, { ad: 'Yazılı uyarı ver', ac: 'Kalite +4; bayi memnuniyeti −5.', ef: () => ({ marka: 0 }) }, { ad: 'Görmezden gel', ac: 'Marka −2.', ef: () => ({ marka: -2 }) }] },
  { id: 'semt', ad: 'Semt olayı', ik: '📅', sogu: 0, olasi: () => 0, metin: (_s, b, c) => `${b.ad} çevresinde "${c.olay}" başlıyor. Hazırlık yapmak etkiyi ${ (c.fiyat ?? 0) > 0 ? 'büyütür' : 'hafifletir'}.`,
    opt: [{ ad: 'Hazırlan', ac: 'Fazladan stok, süsleme ve ek vardiya. Etki %50 değişir (iyi olay büyür, kötü olay hafifler).', ef: (s, _b, c) => ({ kasa: -(c.fiyat ?? 3000) * F(s), bedelHaz: true }) }, { ad: 'Olduğu gibi bırak', ac: 'Normal akış.', ef: () => ({}) }] },
  { id: 'hikaye', ad: 'Dükkândan bir sahne', ik: '📖', sogu: 14, olasi: (s, b) => (s.derin?.hik[b.id]?.length ?? 0) >= 2 ? 0.015 : 0, metin: (s, b) => hikayeMetni(s, b), opt: [{ ad: 'Çay ikram et', ac: 'Küçük bir iyilik; memnuniyet +1.', ef: () => ({ memn: 1, marka: 0.2, kasa: -200 }) }, { ad: 'Selam ver, geç', ac: 'Hiçbir şey olmaz.', ef: () => ({}) }, { ad: 'Fotoğrafını çekip paylaş', ac: 'Marka +0,5; sosyal takipçi artar.', ef: () => ({ marka: 0.5 }) }] },
];
const OLAY: Record<string, OlayDef> = Object.fromEntries(OLAYLAR.map((o) => [o.id, o]));
function uygula(s: GameState, b: Branch, ef: Ef, c: Ctx, now: number): string[] {
  const d = D(s), m: string[] = [];
  if (ef.sans) { const r = rand(s.rng, 'events') < ef.sans[0]; m.push(...uygula(s, b, r ? ef.sans[1] : ef.sans[2], c, now)); }
  if (ef.kasa) { s.kasa += ef.kasa; if (ef.kasa < 0) s.capexBugun += -ef.kasa; }
  if (ef.marka) b.marka = cl(b.marka + ef.marka, 0, 100); if (ef.hijyen) b.hijyen = cl(b.hijyen + ef.hijyen, 0, 100); if (ef.memn) b.memnuniyet = cl(b.memnuniyet + ef.memn, 0, 100);
  if (ef.etki) d.etki[`${ef.etki[0]}`] = { v: ef.etki[1], bit: now + ef.etki[2] };
  if (ef.mot) for (const e of b.staff) e.motivasyon = cl(e.motivasyon + ef.mot, 0, 100);
  const e = b.staff.find((x) => x.id === c.emp) ?? s.subeler.flatMap((x) => x.staff).find((x) => x.id === c.emp);
  if (ef.zam && e) { e.maas = Math.round(e.maas * (1 + ef.zam) / 500) * 500; e.motivasyon = cl(e.motivasyon + 10, 0, 100); m.push(`${e.ad} maaşı ${Math.round(e.maas)} ₺ oldu.`); }
  if (ef.terfi && e) { const u = ustaOf(s, e); u.xp = Math.max(u.xp, (ustaSeviye(u) + 1) ** 2 * 4); m.push(`${e.ad} terfi etti: ${UNVAN(ustaSeviye(u))}.`); }
  if (ef.istifa && e && (!ef.zam)) { const kal = d.trait[e.id] === 'sadik' || (d.trait[e.id] !== 'hirsli' && rand(s.rng, 'events') < 0.5); if (!kal) { const ob = s.subeler.find((x) => x.staff.includes(e)); if (ob) { ob.staff = ob.staff.filter((x) => x !== e); m.push(`${e.ad} işten ayrıldı.`); } } }
  if (ef.kamera) d.kamera[b.id] = true; if (ef.sendika) for (const x of s.subeler) d.etki[`b${x.id}:talep:grev`] = { v: 0.65, bit: now + 4 };
  if (ef.zinciri) { const f = s.franchise.slice().sort((a, z) => a.kalite - z.kalite)[0]; if (f) { f.kalite = cl(f.kalite + 12, 0, 100); f.denetim = now; } }
  if (ef.bedelHaz) d.hazir[`${b.id}:${c.olay}:${c.baslangic}`] = 1;
  if (ef.msg) m.push(ef.msg); if (ef.hik) yaz(s, b, ef.hik); return m;
}
function olayUret(s: GameState, ev: OlayDef, b: Branch, c: Ctx = {}): void {
  const pid = s.en++; (D(s).bag[pid] = { ...c, tip: ev.id });
  s.bekleyen.push({ id: pid, tip: 'd_' + ev.id, baslik: ev.ad, metin: ev.metin(s, b, c), ikon: ev.ik, secenek: ev.opt.map((o) => ({ ad: o.ad, ac: o.ac })), branch: b.id, city: b.city });
  D(s).son['o_' + ev.id] = dayOf(s);
}
olayIsleyici.push((s, p, secim) => {
  if (!p.tip.startsWith('d_')) return null; const ev = OLAY[p.tip.slice(2)]; if (!ev) return null; /* başka modüllerin (yatırım, afet, mevzuat…) olayları kendi işleyicisinde */ const d = D(s), c = d.bag[p.id] ?? {}; delete d.bag[p.id];
  const b = s.subeler.find((x) => x.id === p.branch) ?? s.subeler[0]; if (!b) return ''; const o = ev.opt[secim] ?? ev.opt[ev.opt.length - 1]!; const m = uygula(s, b, o.ef(s, b, c), c, dayOf(s)); if (!['semt', 'hikaye'].includes(ev.id)) d.say.kriz = (d.say.kriz ?? 0) + 1; yenile(s); const msg = m.join(' ') || 'Karar uygulandı.'; s.log.unshift(`📣 ${ev.ad}: ${msg}`); return msg;
});
const hikayeKitap: Record<string, string[]> = {
  ogrenci: ['Üç öğrenci bütün öğleden sonra aynı masada ders çalıştı; biri çaydan sonra "bir yeni içecek önerebilir miyiz?" dedi.', 'Sınav öncesi masalar sabaha kadar dolu kalmak istiyor.'],
  is: ['Toplantıdan çıkan takım elbiseli bir müşteri "yarın aynı saatte aynı masa" diye rica etti.', 'Sabah kuyruğunda herkes saatine bakıyor; hız bu dükkânın dili.'],
  turist: ['İki turist haritayı masaya serip dükkânın yerel lezzetini sordu.', 'Bir grup yabancı barista tezgâhında fotoğraf çektirmek istiyor.'],
  aile: ['Küçük bir çocuk kekini yemeden önce baristaya resim çizdi.', 'Hafta sonu kalabalığında bir aile birlikte kutlama pastası bekliyor.'],
  mahalle: ['Emekli komşular çay tazelenmesini sabırla bekliyor; sohbetin keyfi bu dükkânın kalbi.', 'Mahalle bakkalı akşam üstü kahve almaya uğradı.'],
  sik: ['Şık salonda biri fotoğraf çekerken ışığa "biraz daha loş olabilir" dedi.', 'Kendi fincanını getiren bir müşteri dekora hayran kaldı.'],
};
export function hikayeMetni(s: GameState, b: Branch): string { const k = kimlik(s, b).id, l = hikayeKitap[k] ?? hikayeKitap.mahalle!; return l[h32(s.seed, b.id, dayOf(s)) % l.length]!; }

/* ===================== 9) Franchise sözleşmeleri (franchise.ts kullanır) ===================== */
export const SOZLESME = {
  standart: { ad: 'Standart', giris: 1, royalty: 0.08, pazarlama: 0.02, kalite: 0, ac: 'Dengeli: giriş ücreti normal, %8 royalty.' },
  premium: { ad: 'Premium', giris: 1.5, royalty: 0.05, pazarlama: 0.02, kalite: 6, ac: 'Yüksek giriş ücreti, düşük royalty; bayi daha kaliteli işletir.' },
  esnek: { ad: 'Esnek', giris: 0.6, royalty: 0.12, pazarlama: 0.02, kalite: -8, ac: 'Düşük giriş, yüksek royalty; bayiler kolay bulunur ama kalite kayabilir.' },
} as const;
export type SozlesmeId = keyof typeof SOZLESME;

/* ===================== 10) Kahve fuarı ===================== */
export interface FuarKayit { yil: number; tur: 'tarif' | 'harman'; ad: string; puan: number; stant: 0 | 1 }
export function fuarDurum(s: GameState): { asama: 'bekle' | 'kayit' | 'fuar'; kalan: number; yil: number } {
  const now = dayOf(s), dt = dateOf(now), yil = dt.yil; if (dt.ay === 3 && dt.ayGun >= 10 && dt.ayGun <= 12) return { asama: 'fuar', kalan: 0, yil };
  let g = now; for (let i = 0; i < 400; i++, g++) { const x = dateOf(g); if (x.ay === 3 && x.ayGun === 10) break; } const kalan = g - now;
  return { asama: (dt.ay === 2 && dt.ayGun >= 15) || (dt.ay === 3 && dt.ayGun < 10) ? 'kayit' : 'bekle', kalan, yil };
}
export function fuarKayit(s: GameState, tur: 'tarif' | 'harman', stant: 0 | 1, bonus = 0): Res {
  const d = D(s), du = fuarDurum(s); if (du.asama !== 'kayit') return no('Kayıt dönemi 15 Mart – 9 Nisan arasında. Fuar 10–12 Nisan.'); if (d.fuar.kayit?.yil === du.yil) return no('Bu yıl zaten kayıt oldun.');
  let ad = '', puan = 0; if (tur === 'tarif') { const t = d.tarif.find((x) => x.id === d.imza); if (!t) return no('Fuara bir imza tarif götürmelisin (Tarif laboratuvarı).'); ad = t.ad; puan = t.begeni; } else { const h = harman(s); ad = h.ad; puan = cl((h.kal - 0.85) * 200, 0, 100); }
  const bedel = Math.round((stant ? 15000 : 6000) * s.market.fiyat); if (s.kasa < bedel) return no(`Kayıt ve stant bedeli ${bedel} ₺.`); s.kasa -= bedel; d.fuar.kayit = { yil: du.yil, tur, ad, puan: puan + cl(bonus, 0, 20) * 0.6, stant }; return ok(`Fuara "${ad}" ile kayıt oldun (−${bedel} ₺).`);
}
function fuarSonuc(s: GameState, toplam: { gelir: { etkinlik: number } }): void {
  const d = D(s), k = d.fuar.kayit, dt = dateOf(dayOf(s) - 1); if (!k || dt.ay !== 3 || dt.ayGun !== 12 || d.fuar.gecmis.some((x) => x.yil === k.yil)) return;
  const ort = s.subeler.reduce((a, b) => a + ustaOrt(s, b).art, 0) / Math.max(1, s.subeler.length), marka = s.marka_puani, puan = k.puan * 0.7 + ort * 4 + marka * 0.15 + (k.stant ? 5 : 0) + rand(s.rng, 'misc') * 20;
  const rak = [...d.rakip.map((r, i) => 35 + r.guc * 12 + (h32(s.seed, k.yil, i) % 3000) / 100), ...Array.from({ length: 8 }, (_, i) => 30 + (h32(s.seed, k.yil, 99 + i) % 4500) / 100)], derece = 1 + rak.filter((x) => x > puan).length;
  const ad = derece === 1 ? 'Altın' : derece === 2 ? 'Gümüş' : derece === 3 ? 'Bronz' : 'Katılım'; const od = derece === 1 ? [50000, 8, 1.1, 45] : derece === 2 ? [25000, 5, 1.06, 30] : derece === 3 ? [10000, 3, 1.03, 20] : [0, 1, 1, 0];
  s.kasa += od[0]! * s.market.fiyat; for (const b of s.subeler) b.marka = cl(b.marka + od[1]!, 0, 100); if (od[3]) d.etki['g:talep:fuar'] = { v: od[2]!, bit: dayOf(s) + od[3] };
  const stant = (k.stant ? 30000 : 12000) * s.market.fiyat * (1 + marka / 100); toplam.gelir.etkinlik += stant; if (derece === 1) d.fuar.kupa++;
  d.fuar.gecmis.push({ yil: k.yil, derece: ad }); d.fuar.kayit = null; const msg = `☕ Kahve Fuarı: "${k.ad}" ${ad === 'Katılım' ? 'katılım ödülü aldı' : ad + ' madalya kazandı'}${od[0] ? ` (+${Math.round(od[0] * s.market.fiyat)} ₺ ödül)` : ''}; stant satışı ${Math.round(stant)} ₺.`; s.log.unshift(msg); yaz(s, undefined, msg);
  s.bekleyen.push({ id: s.en++, tip: 'd_hikaye_fuar', baslik: 'Kahve Fuarı sonuçlandı', metin: msg, ikon: '🏅', secenek: [{ ad: 'Harika!', ac: 'Devam' }] });
}

/* ===================== 11) Dükkân hikâyesi ===================== */
export function kimlik(s: GameState, b: Branch): { id: string; ad: string; ik: string } {
  const t = musteriTipleri(b)[0]!;
  if (b.tip === 'luks' && b.marka >= 55) return { id: 'sik', ad: 'Şık salon', ik: '🥂' }; return t.id === 'ogr' ? { id: 'ogrenci', ad: 'Öğrenci kafesi', ik: '📚' } : t.id === 'cal' ? { id: 'is', ad: 'İş kafesi', ik: '💼' } : t.id === 'tur' ? { id: 'turist', ad: 'Turist durağı', ik: '🧳' } : t.id === 'aile' ? { id: 'aile', ad: 'Aile kafesi', ik: '👨‍👩‍👧' } : { id: 'mahalle', ad: 'Mahalle ocağı', ik: '🍵' };
}
export function yaz(s: GameState, b: Branch | undefined, m: string): void { const d = D(s), k = b?.id ?? 0, l = (d.hik[k] ??= []); l.unshift(`${tarihMetni(dayOf(s))} — ${m}`); if (l.length > 40) l.length = 40; }
function ms(s: GameState, b: Branch, id: string, m: string): void { const d = D(s), k = `ms${b.id}:${id}`; if (d.son[k]) return; d.son[k] = dayOf(s) + 1; yaz(s, b, `⭐ ${m}`); s.log.unshift(`⭐ ${b.ad}: ${m}`); }
function donumNoktalari(s: GameState, b: Branch): void {
  const r = b.gecmis, top = r.reduce((a, x) => a + x.musteri, 0), now = dayOf(s);
  if (top >= 100) ms(s, b, 'm100', 'İlk 100 müşteriye hizmet verildi.'); if (top >= 2000) ms(s, b, 'm2000', 'Bu dükkân 2.000 müşteriyi ağırladı.'); if (r.length && r[r.length - 1]!.toplamGelir >= 30000 * s.market.fiyat) ms(s, b, 'g30', 'Rekor gün: 30 bin ₺ üstü ciro.');
  if (b.marka >= 40) ms(s, b, 'marka40', 'Semtte tanınan bir isim oldu.'); if (b.marka >= 70) ms(s, b, 'marka70', 'Şehrin konuştuğu kafelerden biri.'); if (b.yorumPuan >= 4.5) ms(s, b, 'y45', 'Yorum puanı 4,5 yıldızı gördü.'); if (now - b.acilis >= 365) ms(s, b, 'yil1', 'Bir yaşına girdi.'); if (b.staff.length >= 8) ms(s, b, 'ekip8', 'Ekip 8 kişiyi buldu.');
}

/* ===================== 12) Rakip zincirler ===================== */
export interface Kisi { satin?: number; id: string; ad: string; kisilik: 'agresif' | 'kalite' | 'gelenek' | 'franchise'; sehirler: number[]; guc: number; son: string; casus: number; slogan: string }
export const KISILIK_AD = { agresif: 'Agresif fiyat', kalite: 'Kalite odaklı', gelenek: 'Geleneksel', franchise: 'Hızlı büyüme' } as const;
const STRATEJI = { agresif: 'agresif', kalite: 'kalite', gelenek: 'dengeli', franchise: 'ucuz' } as const;
function rakipBaslat(): Kisi[] { return [
  { id: 'kocak', ad: 'Koçak Kahve Evleri', kisilik: 'agresif', sehirler: [], guc: 1.2, son: 'Henüz sahaya çıkmadı.', casus: -99, slogan: 'En ucuz kahve bizde!' },
  { id: 'beanify', ad: 'Beanify', kisilik: 'kalite', sehirler: [], guc: 1.0, son: 'Henüz sahaya çıkmadı.', casus: -99, slogan: 'Her fincan bir hikâye.' },
  { id: 'dem', ad: 'Dem & Demlik', kisilik: 'gelenek', sehirler: [], guc: 0.8, son: 'Henüz sahaya çıkmadı.', casus: -99, slogan: 'Eski dost, eski tat.' },
  { id: 'ay', ad: 'Ay Çekirdek', kisilik: 'franchise', sehirler: [], guc: 1.1, son: 'Henüz sahaya çıkmadı.', casus: -99, slogan: 'Her köşeye bir Ay!' }]; }
export function casusluk(s: GameState, id: string): Res { const r = D(s).rakip.find((x) => x.id === id); if (!r) return no('Rakip yok.'); const bedel = Math.round(6000 * s.market.fiyat); if (s.kasa < bedel) return no('Kasa yetersiz.'); s.kasa -= bedel; r.casus = dayOf(s); D(s).say.casus = (D(s).say.casus ?? 0) + 1; return ok(`${r.ad} hakkında gizli müşteri raporu alındı (−${bedel} ₺).`); }
function rakipGunluk(s: GameState): void {
  const d = D(s), now = dayOf(s); if (!s.subeler.length || now < 20) return;
  for (const r of d.rakip) {
    if (r.satin) continue;
    if (rand(s.rng, 'rivals') < 0.012 * ZORLUK[d.zorluk].rakip * r.guc * (r.kisilik === 'franchise' ? 1.6 : 1) && r.sehirler.length < 30) {
      const sehirler = [...new Set(s.subeler.map((b) => b.city))], hedef = rand(s.rng, 'rivals') < 0.7 ? sehirler[Math.floor(rand(s.rng, 'rivals') * sehirler.length)]! : -1; if (hedef < 0 || r.sehirler.includes(hedef)) continue;
      const c = cityById(hedef), rv = (s.rakipler[hedef] ??= []), x = newRival(s, c); x.ad = `${r.ad} ${c.ad}`; x.strateji = STRATEJI[r.kisilik]; x.kalite = r.kisilik === 'kalite' ? 3 : 2; x.fiyat = r.kisilik === 'agresif' ? 0.82 : r.kisilik === 'kalite' ? 1.18 : 1; x.sube = 1 + (r.kisilik === 'franchise' ? 1 : 0); rv.push(x); r.sehirler.push(hedef); r.guc = Math.min(2.5, r.guc + 0.05);
      r.son = `${c.ad} şehrinde yeni şube açtı.`; s.log.unshift(`🏁 ${r.ad}, ${c.ad} şehrinde şube açtı (${r.slogan})`); yaz(s, undefined, `${r.ad} ${c.ad} şehrine girdi.`);
    }
    if (r.sehirler.length && rand(s.rng, 'rivals') < 0.006) r.son = r.kisilik === 'agresif' ? 'İndirim kampanyası başlattı.' : r.kisilik === 'kalite' ? 'Yeni çekirdek harmanı tanıttı.' : r.kisilik === 'gelenek' ? 'Eski müşterilerine ikram günü yaptı.' : 'Bayilik başvurularını açtı.';
  }
}

/* ===================== Zafer: Kahve İmparatoru ===================== */
export interface ZaferMadde { ad: string; v: number; h: number; fmt?: 'para' }
export function zaferMaddeleri(s: GameState): ZaferMadde[] { return [
  { ad: 'Şube sayısı', v: s.subeler.length, h: 20 }, { ad: 'Açık il', v: Object.keys(s.bolge.il).length, h: 8 }, { ad: 'Marka itibarı', v: Math.round(s.marka_puani), h: 85 },
  { ad: 'Kasa', v: s.kasa, h: 20e6, fmt: 'para' }, { ad: 'Fuarda altın madalya', v: D(s).fuar.kupa, h: 1 }, { ad: 'Franchise bayi', v: s.franchise.length, h: 3 }]; }
export const zaferTamam = (s: GameState): boolean => zaferMaddeleri(s).every((m) => m.v >= m.h);

/* ===================== Durum ===================== */
export interface TedIliski { sad: number; harc: number; son: number; soz?: { bas: number; bit: number; hedef: number; harc: number } }
export interface Derin {
  yol?: import('./rehber').Yol; karar?: import('./karar').KararDefteri; acilan?: Record<string, number>;
  kav?: import('./kavurma').Kav; kur?: import('./kurye').Kur; mulk?: import('./mulk').Mulk; sad?: import('./sadakat').Sad; basin?: import('./basin').Basin; anket?: import('./anket').Anket; mev?: import('./mevzuat').Mev; surd?: import('./surdur').Surd; afet?: import('./afet').Afet;
  yat?: import('./yatirim').Yat; servis?: import('./servis').Servis;
  pilot?: Record<string, import('./sezon').Pilot>;
  donem?: import('./donem').DonemDurum;
  gun90?: Array<import('./analiz').GunKayit>;
  cek: { ana: string; ikinci: string | null; oran: number; kavurma: 0 | 1 | 2; ad: string; gecis: number };
  tarif: Tarif[]; imza: number | null; usta: Record<number, Usta>; sam: Array<{ yil: number; ad: string; derece: number }>;
  mud: Record<number, Mudavim[]>; esnaf: Record<number, Record<string, number>>; ortak: Record<number, Record<string, number>>; hik: Record<number, string[]>;
  trait: Record<number, string>; hazir: Record<string, number>; etki: Record<string, { v: number; bit: number }>; son: Record<string, number>; kamera: Record<number, boolean>;
  bag: Record<number, Ctx & { tip?: string }>; fuar: { kayit: FuarKayit | null; kupa: number; gecmis: Array<{ yil: number; derece: string }> }; rakip: Kisi[];
  kalB: Record<number, number>; talepB: Record<number, number>;
  ted: Record<string, TedIliski>; say: Record<string, number>; zorluk: 'kolay' | 'normal' | 'zor'; zafer: number; ipucu: Record<string, number>;
  /** İlk adımlar rehberi ilerlemesi (eski kayıtlarda yoktur; ilk kullanımda oluşur). */
  ogr?: import('./ogretici').OgrKayit;
}
export function derinInit(): Derin { return { cek: { ana: 'brezilya', ikinci: null, oran: 0.3, kavurma: 1, ad: 'Ev Karışımı', gecis: 0 }, tarif: [], imza: null, usta: {}, sam: [], mud: {}, esnaf: {}, ortak: {}, hik: {}, trait: {}, hazir: {}, etki: {}, son: {}, kamera: {}, bag: {}, fuar: { kayit: null, kupa: 0, gecmis: [] }, rakip: rakipBaslat(), kalB: {}, talepB: {}, ted: {}, say: {}, zorluk: 'normal', zafer: 0, ipucu: {} }; }
export function D(s: GameState): Derin { const d = (s.derin ??= derinInit()); d.say ??= {}; d.ted ??= {}; d.zorluk ??= 'normal'; d.ipucu ??= {}; d.zafer ??= 0; return d; }
export const ZORLUK = { kolay: { ad: 'Kolay', kasa: 1.5, olay: 0.6, rakip: 0.7, ac: 'Fazla başlangıç parası, az kriz, yavaş rakipler.' }, normal: { ad: 'Normal', kasa: 1, olay: 1, rakip: 1, ac: 'Dengeli oyun.' }, zor: { ad: 'Zor', kasa: 0.7, olay: 1.4, rakip: 1.5, ac: 'Az başlangıç parası, sık kriz, saldırgan rakipler.' } } as const;

/* ===================== Çarpanlar ve günlük döngü ===================== */
function etkiCarpan(d: Derin, now: number, scope: string, tip: string): number { let k = 1; for (const [key, e] of Object.entries(d.etki)) { if (e.bit <= now) continue; const [sc, tp] = key.split(':'); if (sc === scope && tp === tip) k *= e.v; } return k; }
export function yenile(s: GameState): void {
  const d = D(s), now = dayOf(s), h = harman(s);
  for (const b of s.subeler) {
    const u = ustaOrt(s, b), ek = (id: string): number => b.staff.reduce((a, e) => a + (d.trait[e.id] === id ? 1 : 0), 0), n = Math.max(1, b.staff.length);
    d.kalB[b.id] = h.kal * (1 + 0.014 * u.art) * (1 + 0.04 * (ek('caliskan') - ek('tembel')) / n) * etkiCarpan(d, now, 'g', 'kalite') * etkiCarpan(d, now, `b${b.id}`, 'kalite') * (1 + 0.012 * ek('yaratici') / n);
    const mudBonus = (d.mud[b.id] ?? []).reduce((a, m) => a + (m.bag >= 80 ? 0.004 : m.bag >= 50 ? 0.0015 : 0), 0);
    d.talepB[b.id] = semtCarpan(s, b, now) * esnafCarpan(s, b) * (1 + 0.01 * u.sohbet) * (1 + mudBonus) * etkiCarpan(d, now, 'g', 'talep') * etkiCarpan(d, now, `b${b.id}`, 'talep') * (1 - 0.03 * ek('dedikodu') / n);
  }
}
carpan.talep.push((s, b) => s.derin?.talepB[b.id] ?? 1);
carpan.kalite.push((s, b) => s.derin?.kalB[b.id] ?? 1);
hooks.gunOnce.push((s, toplam) => {
  const d = D(s), now = dayOf(s), h = harman(s);
  for (const k of Object.keys(d.etki)) if (d.etki[k]!.bit <= now) delete d.etki[k];
  if (d.cek.gecis > 0) d.cek.gecis--;
  // çekirdek maliyeti: kahve ham maddesi toplam malzemenin ~%42'si
  const kahveCogs = toplam.gider.malzeme * 0.42, ekMal = kahveCogs * (h.mal - 1); if (ekMal) { toplam.gider.malzeme += ekMal; s.kasa -= ekMal; }
  let tasarruf = 0;
  for (const b of s.subeler) {
    if (!b.kuruldu) continue; const son = b.gecmis[b.gecmis.length - 1], must = son?.musteri ?? 0;
    // barista gelişimi ve karakter
    for (const e of b.staff) { karakterOf(s, e); if (e.tip === 'barista') { const u = ustaOf(s, e), eski = ustaSeviye(u); u.xp += d.trait[e.id] === 'hirsli' ? 1.5 : 1; if (ustaSeviye(u) > eski) { const m = `${e.ad} ${UNVAN(ustaSeviye(u))} oldu.`; yaz(s, b, m); s.log.unshift(`🎓 ${m}`); } }
      const t = d.trait[e.id]; if (t === 'caliskan') e.motivasyon = cl(e.motivasyon + 0.15, 0, 100); else if (t === 'tembel') e.motivasyon = cl(e.motivasyon - 0.1, 0, 100); else if (t === 'gergin') e.yorgunluk = cl(e.yorgunluk + 0.4, 0, 100); else if (t === 'dedikodu') for (const x of b.staff) if (x !== e) x.motivasyon = cl(x.motivasyon - 0.03, 0, 100); }
    const ust = ustaOrt(s, b); if (son) tasarruf += son.gider.malzeme * 0.01 * ust.tasarruf;
    // imza içecek ve müdavimler
    const im = imzaGunluk(s, b, must), mu = mudGunluk(s, b, must); toplam.gelir.kahve += im.gelir; toplam.gelir.ek += mu.gelir; const g = im.gider + mu.gider; if (g) toplam.gider.malzeme += g;   // hammadde stoktan düşer (nakit alımda ödendi)
    // esnaf ilişkisi azalır
    for (const e of esnafOf(s, b)) { const m = (d.esnaf[b.id] ??= {}); m[e.id] = cl((m[e.id] ?? 15) - 0.12, 0, 100); }
    donumNoktalari(s, b);
  }
  if (tasarruf) toplam.gider.malzeme -= tasarruf;
  rakipGunluk(s); fuarSonuc(s, toplam);
  // hafta başı: barista fuarı değil — kimlik güncelle
  if (dateOf(now).haftaGun === 0) for (const b of s.subeler) { const k = kimlik(s, b); if (d.son[`kim${b.id}`] !== undefined && d.son[`kim${b.id}`] !== k.id.length * 1000 + k.id.charCodeAt(0)) yaz(s, b, `Dükkânın kimliği değişti: artık "${k.ad}".`); d.son[`kim${b.id}`] = k.id.length * 1000 + k.id.charCodeAt(0); }
  // olay üretimi (günde en çok 1; kuyruk doluysa üretme)
  if (s.bekleyen.length < 2 && s.subeler.length) {
    for (const b of s.subeler) { if (!b.kuruldu) continue; const ev0 = semtOlaylari(s, b, now).find((e) => e.sira === 1 && Math.abs(e.talep - 1) >= 0.07 && !(`${b.id}:${e.id}:${e.baslangic}` in d.hazir)); if (ev0 && (d.son['o_semt'] ?? -9) < now - 1) { const cc: Ctx = { olay: ev0.id, baslangic: ev0.baslangic, fiyat: 3000 * (1 + 5 * Math.abs(ev0.talep - 1)) }; const ev = { ...OLAY.semt!, ad: `${ev0.ikon} ${ev0.ad}`, metin: (): string => `${b.ad} çevresinde "${ev0.ad}" başlıyor (talep ${ev0.talep >= 1 ? '+' : ''}${Math.round((ev0.talep - 1) * 100)}%). Hazırlık yapmak etkiyi ${ev0.talep >= 1 ? 'büyütür' : 'hafifletir'}.` }; olayUret(s, ev, b, cc); break; } }
    if (s.bekleyen.length < 2) { const adaylar = OLAYLAR.filter((o) => o.id !== 'semt' && o.sogu > 0); for (const b of s.subeler) { if (!b.kuruldu) continue; for (const o of adaylar) { if ((d.son['o_' + o.id] ?? -999) > now - o.sogu) continue; if (rand(s.rng, 'events') < o.olasi(s, b) * (o.id === 'semt' || o.id === 'hikaye' ? 1 : ZORLUK[d.zorluk].olay)) { const c: Ctx = {}; if (o.id === 'zam' || o.id === 'kapma') { const e = b.staff.find((x) => x.tip !== 'sube_muduru' && (o.id === 'zam' ? d.trait[x.id] === 'hirsli' || rand(s.rng, 'events') < 0.3 : x.tip === 'barista')); if (!e) continue; c.emp = e.id; if (o.id === 'kapma') c.zin = d.rakip.find((r) => r.kisilik === 'agresif')?.ad; } olayUret(s, o, b, c); break; } } if (s.bekleyen.length >= 2) break; } }
  }
  if (!d.zafer && zaferTamam(s)) { d.zafer = dayOf(s); s.bekleyen.push({ id: s.en++, tip: 'd_hikaye_zafer', baslik: 'KAHVE İMPARATORU!', metin: `${s.marka.ad} Türkiye'nin kahve imparatorluğuna dönüştü: ${s.subeler.length} şube, ${Object.keys(s.bolge.il).length} il, ${s.franchise.length} bayi. Oyuna istediğin kadar devam edebilirsin.`, ikon: '👑', secenek: [{ ad: 'Devam et', ac: 'İmparatorluk büyümeye devam.' }] }); s.log.unshift('👑 Kahve İmparatoru oldun!'); yaz(s, undefined, '👑 Kahve İmparatoru unvanı kazanıldı.'); }
  yenile(s);
});
