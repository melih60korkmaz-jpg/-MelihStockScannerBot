/** Oyun durumu ve kariyer akışı. Tüm sistemler burada birbirine bağlanır. Saf (DOM'suz) ve testlenebilir. */
import { Rng, clamp } from './rng';
import { YETENEKLER, type YetenekId, type Yetenekler, type Pozisyon, ilkYetenekler, genelPuan, yetenekTavani, yasCarpani, POZ_GRUP, POZ_AD } from './skills';
import { kulupleriKur, ligleriKur, LIG_META, TR_LIG, type IsimMod, fikstur, sirala, sonucYaz, takimMaci, HAFTA_SAYISI, tabloBos, type Kulup, type Lig } from './world';
import { kadroKur } from './week';
import { EKIPMAN_GIDERI } from './ekipman';
import { kimlikKur } from './kimlik';
import { milliBos, type Milli, type Kupa, type Turnuva, type EkMac, type EkSonuc } from './ekmac';
import { ANTRENMANLAR, antrenmanOf, HAFTALIK_ANTRENMAN, type AntrenmanDef } from './training';
import { esyaOf, ANTRENORLER, YASAM_GIDERI, type Antrenor } from './economy';
export const SURUM = 6;
export interface Gorunum { ten: number; sac: number; sacRenk: number }
export interface Oyuncu { ad: string; soyad: string; cinsiyet: 'Erkek' | 'Kadın'; kita: string; uyruk: string; dogumUlke?: string; vatandasliklar?: string[]; milliyet?: string; etnik?: string; yas: number; poz: Pozisyon; numara: number; gorunum: Gorunum; yet: Yetenekler; pot: number; xp: Record<string, number> }
export interface Sozlesme { kulup: number; maas: number; golPrimi: number; asistPrimi: number; sure: number; bedel: number }
export interface Sakatlik { tur: string; hafta: number }
export interface Haber { sezon: number; hafta: number; bas: string; tur: 'mac' | 'kariyer' | 'ilis' | 'dunya' }
export interface MacOzet { sezon: number; hafta: number; ev: number; dep: number; gev: number; gdep: number; dakika: number; gol: number; asist: number; sut: number; isabet: number; pas: number; basariliPas: number; topKaybi: number; dripling: number; mucadele: number; puan: number; oynadi: boolean }
export interface Game {
  v: number; id: string; ad: string; seed: number; rng: number; sezon: number; hafta: number; oyuncu: Oyuncu; kulup: number; sozlesme: Sozlesme;
  kulupler: Kulup[]; ligler: Lig[]; para: number; itibar: number; enerji: number; yorgunluk: number; sakatlik: Sakatlik | null; antrenor: string | null; menajer: boolean; esyalar: Record<string, number>;
  iliski: { td: number; takim: number; taraftar: number; kiz: number; sponsor: number }; haftaAntrenman: number; gunlukRapor: string[]; haberler: Haber[]; maclar: MacOzet[]; stat: { mac: number; gol: number; asist: number; sari: number; kirmizi: number; kupa: number }; gecmis: Array<{ sezon: number; kulup: number; lig: number; poz: number; mac: number; gol: number; asist: number }>; sezonStat: { mac: number; gol: number; asist: number }; son: number; kadro: Futbolcu[]; oduller: string[]; teklifler: Teklif[]; transferler: Array<{ sezon: number; hafta: number; kimden: number; kime: number; imza: number }>; uyum: number; menajerKomisyon: number; mut: number; toplamHafta: number; sponsorlar: SponsorAnlasma[]; sponsorTeklifleri: SponsorTeklif[]; olayGecmis: Record<string, number>; gecikmeli: Gecikmeli[]; bekleyenOlay: string | null; haftaSosyal: number; kizVar: boolean; kizAd: string; bayraklar: Record<string, number>; sonMacHafta: number; milli: Milli; kupa: Kupa | null; turnuva?: Turnuva | null; ekMac: EkMac | null; ekSonuc: (EkSonuc & { kazandi?: boolean }) | null; kupaStat: { mac: number; gol: number }; rehab: number; nuks: number; icecek: Record<string, number>; haftaIcecek: number; kramponlar: Record<string, number>; giyilen: string; tema: 'modern' | 'klasik'; emekli: Emekli | null; kariyerOdulleri: Array<{ sezon: number; ad: string }>
}
export interface Emekli { sezon: number; yas: number; puan: number; ozet: string[] }
export interface SponsorAnlasma { marka: string; kat: string; macBasi: number; prim: number; sartTip: 'gol' | 'puan' | 'mac'; sartHedef: number; kalan: number; ilerleme: number; memnun: number; sonSezonKarsilandi: boolean; kazanc: number; sayac: number }
export interface SponsorTeklif { id: number; marka: string; kat: string; macBasi: number; prim: number; sartTip: 'gol' | 'puan' | 'mac'; sartHedef: number; sure: number; kalan: number }
export interface Gecikmeli { hafta: number; etki: Record<string, unknown>; haber?: string; baslik: string }
export interface Teklif { id: number; kulup: number; maas: number; golPrimi: number; asistPrimi: number; sure: number; rol: 0 | 1 | 2; imza: number; bedel: number; kalan: number; pazarlik: number }
export interface Futbolcu { ovr?: number; ad: string; kulup: number; yas: number; hucum: number; gol: number; asist: number; mac: number; puan: number }
export interface Yaratim { ad: string; soyad: string; cinsiyet: 'Erkek' | 'Kadın'; kita: string; uyruk: string; dogumUlke?: string; vatandasliklar?: string[]; milliyet?: string; etnik?: string; lig: number; poz: Pozisyon; numara: number; gorunum: Gorunum; seed?: number; isim?: IsimMod }
export const KITALAR = ['Avrupa', 'Asya', 'Afrika', 'Kuzey Amerika', 'Güney Amerika', 'Okyanusya'];
export const UYRUKLAR: Record<string, string[]> = { Avrupa: ['Türkiye', 'Almanya', 'İspanya', 'Fransa', 'İtalya', 'Hollanda', 'Portekiz', 'İngiltere'], Asya: ['Japonya', 'Güney Kore', 'Azerbaycan', 'İran'], Afrika: ['Nijerya', 'Gana', 'Senegal', 'Mısır'], 'Kuzey Amerika': ['ABD', 'Meksika', 'Kanada'], 'Güney Amerika': ['Brezilya', 'Arjantin', 'Uruguay', 'Kolombiya'], Okyanusya: ['Avustralya', 'Yeni Zelanda'] };
export const clubOf = (g: Game, id = g.kulup): Kulup => g.kulupler[id]!;
/** Tablolar/listeler için kısa ad (eski kayıtlarda kısa ad yoksa tam ad). */
export const kisaAd = (g: Game, id: number): string => g.kulupler[id]!.kisa ?? g.kulupler[id]!.ad;
/** 3 harfli kod (tablolar için). Eski kayıtlarda yoksa kısa addan türetilir. */
export const kodAd = (g: Game, id: number): string => g.kulupler[id]!.kod ?? kisaAd(g, id).replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '').slice(0, 3).toLocaleUpperCase('tr-TR');
export const ulkeOf = (g: Game, id: number): string => LIG_META[ligOf(g, id)]!.ulke;
export const yurtdisi = (g: Game, id = g.kulup): boolean => ulkeOf(g, id) !== 'Türkiye';
export const ligOf = (g: Game, id: number): number => g.ligler.findIndex((l) => l.uye.includes(id));
export const ligim = (g: Game): number => ligOf(g, g.kulup);
export const genel = (g: Game): number => genelPuan(g.oyuncu.yet, g.oyuncu.poz);
export const yas = (g: Game): number => g.oyuncu.yas;
export function transferDegeri(g: Game): number { const o = genel(g), y = g.oyuncu.yas, pot = g.oyuncu.pot; const yasK = y <= 20 ? 1.5 : y <= 24 ? 1.2 : y <= 28 ? 1 : y <= 31 ? 0.6 : 0.3; return Math.round(Math.pow(Math.max(1, o), 3.1) * 0.9 * yasK * (0.8 + pot / 200) / 1000) * 1000; }
export function baslangicSozlesme(g: Game, kulup: number, rng: Rng): Sozlesme { const l = ligOf(g, kulup), carp = g.ligler[l]!.maasCarpan; return { kulup, maas: Math.round(carp * 3500 * (0.9 + rng.next() * 0.3) / 50) * 50, golPrimi: Math.round(carp * 400 / 50) * 50, asistPrimi: Math.round(carp * 200 / 50) * 50, sure: 2, bedel: transferDegeri(g) } }
export function yeniOyun(y: Yaratim, slotId = 'slot'): Game {
  const seed = y.seed ?? (Date.now() & 0x7fffffff), rng = new Rng(seed), kulupler = kulupleriKur(y.isim ?? 'gercek'), ligler = ligleriKur();
  const yet = ilkYetenekler(y.poz, rng), pot = clamp(Math.round(77 + rng.gauss() * 7 + rng.range(0, 10)), 66, 98);
  const oyuncu: Oyuncu = { ad: y.ad, soyad: y.soyad, cinsiyet: y.cinsiyet, kita: y.kita, ...kimlikKur(y), yas: 16, poz: y.poz, numara: y.numara, gorunum: y.gorunum, yet, pot, xp: {} };
  const hedefLig = clamp(y.lig, 2, 3); void TR_LIG; // kariyer alt kulüpten başlar: 3. Lig (önerilen) ya da 2. Lig (zor)
  const kulup = ligler[hedefLig]!.uye[rng.int(0, 11)]!;
  const g: Game = { v: SURUM, id: slotId, ad: `${y.ad} ${y.soyad}`, seed, rng: rng.s, sezon: 1, hafta: 1, oyuncu, kulup, sozlesme: { kulup, maas: 0, golPrimi: 0, asistPrimi: 0, sure: 2, bedel: 0 }, kulupler, ligler, para: 5000, itibar: 5, enerji: 100, yorgunluk: 0, sakatlik: null, antrenor: null, menajer: false, esyalar: {}, iliski: { td: 50, takim: 50, taraftar: 50, kiz: 0, sponsor: 45 }, haftaAntrenman: 0, gunlukRapor: [], haberler: [], maclar: [], stat: { mac: 0, gol: 0, asist: 0, sari: 0, kirmizi: 0, kupa: 0 }, gecmis: [], sezonStat: { mac: 0, gol: 0, asist: 0 }, son: Date.now(), kadro: [], oduller: [], teklifler: [], transferler: [], uyum: 0, menajerKomisyon: 0.05, mut: 60, toplamHafta: 0, sponsorlar: [], sponsorTeklifleri: [], olayGecmis: {}, gecikmeli: [], bekleyenOlay: null, haftaSosyal: 0, kizVar: false, kizAd: '', bayraklar: {}, sonMacHafta: -1, milli: milliBos(), kupa: null, ekMac: null, ekSonuc: null, kupaStat: { mac: 0, gol: 0 }, rehab: 0, nuks: 0, icecek: { klasik: 1 }, haftaIcecek: 0, kramponlar: {}, giyilen: 'temel', tema: 'modern', emekli: null, kariyerOdulleri: [] };
  g.kadro = kadroKur(kulupler, rng);
  g.sozlesme = baslangicSozlesme(g, kulup, rng); haberEkle(g, `${g.ad} ${clubOf(g).ad} ile ilk profesyonel sözleşmesini imzaladı.`, 'kariyer'); return g;
}
export const rngOf = (g: Game): Rng => new Rng(g.rng);
export const rngKaydet = (g: Game, r: Rng): void => { g.rng = r.s; };
export function haberEkle(g: Game, bas: string, tur: Haber['tur']): void { g.haberler.unshift({ sezon: g.sezon, hafta: g.hafta, bas, tur }); if (g.haberler.length > 40) g.haberler.length = 40; }
export const antrenorOf = (g: Game): Antrenor | null => (g.antrenor ? ANTRENORLER.find((a) => a.id === g.antrenor) ?? null : null);
export const antrenmanVerimi = (g: Game, def: AntrenmanDef): number => { const a = antrenorOf(g); if (!a) return 1; return 1 + 0.12 * a.seviye + (a.uzmanlik === def.kat || a.uzmanlik === 'genel' ? 0.15 : 0.0); };
/** Antrenman uygular: başarı 0-1. Enerji düşer, yorgunluk artar, yetenek (potansiyel/yaş/yorgunluğa göre) gelişir. */
export interface AntrenmanSonucu { ok: boolean; neden?: string; kazanc: Array<{ id: YetenekId; delta: number; yeni: number }>; enerji: number; sakatlandi: boolean; puan: number }
export function antrenmanYap(g: Game, id: string, basari: number): AntrenmanSonucu {
  const def = antrenmanOf(id), s = clamp(basari, 0, 1);
  if (g.sakatlik) return { ok: false, neden: 'Sakatsın: antrenman yapamazsın. Tedavi ol.', kazanc: [], enerji: 0, sakatlandi: false, puan: 0 };
  if (g.haftaAntrenman >= HAFTALIK_ANTRENMAN) return { ok: false, neden: 'Bu hafta antrenman hakkın doldu. Haftayı ilerlet.', kazanc: [], enerji: 0, sakatlandi: false, puan: 0 };
  if (g.enerji < def.enerji) return { ok: false, neden: 'Enerjin yetersiz. Dinlen ya da Volt iç.', kazanc: [], enerji: 0, sakatlandi: false, puan: 0 };
  const rng = rngOf(g), o = g.oyuncu, yorgunlukK = 1 - g.yorgunluk / 200, verim = antrenmanVerimi(g, def), yasK = yasCarpani(o.yas), kazanc: AntrenmanSonucu['kazanc'] = [];
  for (const k of YETENEKLER) { const w = def.kazanc[k]; if (!w) continue; const tavan = yetenekTavani(o.pot, o.poz, k), bos = Math.max(0, 1 - o.yet[k] / tavan); const d = 2.2 * w * (0.25 + s) * Math.pow(bos, 1.25) * yasK * yorgunlukK * verim * (0.92 + g.mut / 100 * 0.16); if (d <= 0) continue; const once = o.yet[k]; o.yet[k] = Math.min(tavan, o.yet[k] + d); kazanc.push({ id: k, delta: o.yet[k] - once, yeni: o.yet[k] }); }
  g.enerji = clamp(g.enerji - def.enerji, 0, 100); g.yorgunluk = clamp(g.yorgunluk + def.enerji * 0.9, 0, 100); g.haftaAntrenman++;
  // aşırı yorgunlukta sakatlık riski
  const risk = 0.012 + Math.pow(g.yorgunluk / 100, 2.2) * 0.12 * (1 - o.yet.dayaniklilik / 220); let sakat = false; if (rng.chance(risk)) { sakat = true; const hafta = rng.int(1, g.yorgunluk > 70 ? 6 : 3); g.sakatlik = { tur: rng.pick(['Adale kasılması', 'Bilek burkulması', 'Kas yırtığı']), hafta }; haberEkle(g, `${g.ad} antrenmanda sakatlandı: ${g.sakatlik.tur} (${hafta} hafta).`, 'kariyer'); }
  rngKaydet(g, rng); return { ok: true, kazanc, enerji: def.enerji, sakatlandi: sakat, puan: Math.round(s * 100) };
}
/** Antrenör işe al/çıkar */
export function antrenorAl(g: Game, id: string): { ok: boolean; m: string } { const a = ANTRENORLER.find((x) => x.id === id); if (!a) return { ok: false, m: 'Bilinmeyen antrenör.' }; if (g.antrenor === id) return { ok: false, m: 'Zaten çalışıyor.' }; if (g.itibar < a.seviye * 6 - 6) return { ok: false, m: `Bu antrenör için itibarın yetmiyor (${a.seviye * 6 - 6}+).` }; if (g.para < a.maas * 4) return { ok: false, m: `En az 4 haftalık maaşı kadar paran olmalı (${a.maas * 4} ₺).` }; g.antrenor = id; return { ok: true, m: `${a.ad} işe alındı.` }; }
export const antrenorCikar = (g: Game): void => { g.antrenor = null; };
/** Dinlenme/tedavi */
export function dinlen(g: Game): { ok: boolean; m: string } { if (g.haftaAntrenman >= HAFTALIK_ANTRENMAN + 1) return { ok: false, m: 'Zaten dinlendin.' }; g.haftaAntrenman = HAFTALIK_ANTRENMAN + 1; g.enerji = clamp(g.enerji + 25, 0, 100); g.yorgunluk = clamp(g.yorgunluk - 25, 0, 100); return { ok: true, m: 'Dinlendin: enerji +25, yorgunluk -25. Bu hafta başka antrenman yapamazsın.' }; }
export const TEDAVI_UCRETI = 6000;
export function tedaviOl(g: Game): { ok: boolean; m: string } { if (!g.sakatlik) return { ok: false, m: 'Sakat değilsin.' }; if (g.para < TEDAVI_UCRETI) return { ok: false, m: `Tedavi için ${TEDAVI_UCRETI} ₺ gerekir.` }; g.para -= TEDAVI_UCRETI; g.sakatlik.hafta = Math.max(0, g.sakatlik.hafta - 2); if (g.sakatlik.hafta <= 0) { g.sakatlik = null; return { ok: true, m: 'Tedavi tamamlandı, sağlığına kavuştun.' }; } return { ok: true, m: `Tedavi: ${g.sakatlik.hafta} hafta kaldı.` }; }
export function satinAl(g: Game, id: string): { ok: boolean; m: string } { const e = esyaOf(id); if (g.esyalar[id]) return { ok: false, m: 'Zaten sahipsin.' }; if (g.para < e.fiyat) return { ok: false, m: 'Paran yetmiyor.' }; g.para -= e.fiyat; g.esyalar[id] = 1; haberEkle(g, `${g.ad} ${e.ad} satın aldı.`, 'kariyer'); return { ok: true, m: `${e.ad} satın alındı. Lüks +${e.luks}.` }; }
export const luks = (g: Game): number => Object.keys(g.esyalar).reduce((t, k) => t + esyaOf(k).luks, 0);
export const bakimGideri = (g: Game): number => Object.keys(g.esyalar).reduce((t, k) => t + esyaOf(k).bakim, 0);
export const kiraGeliri = (g: Game): number => Object.keys(g.esyalar).reduce((a, k) => a + (esyaOf(k).kira ?? 0), 0);
export function haftalikGelirGider(g: Game): { maas: number; antrenor: number; bakim: number; yasam: number; menajer: number; kira: number; ekipman: number; net: number } { const a = antrenorOf(g), maas = g.sozlesme.maas, antrenor = a ? a.maas : 0, bakim = bakimGideri(g), yasam = YASAM_GIDERI, menajer = g.menajer ? Math.round(maas * g.menajerKomisyon) : 0, kira = kiraGeliri(g), ekipman = EKIPMAN_GIDERI; return { maas, antrenor, bakim, yasam, menajer, kira, ekipman, net: maas + kira - antrenor - bakim - yasam - menajer - ekipman }; }
export const SAKAT_CARPAN = 0;
export { ANTRENMANLAR, HAFTA_SAYISI, POZ_GRUP, POZ_AD, sirala, fikstur, sonucYaz, takimMaci, tabloBos };
