/** Lig dışı maçlar: milli takım çağrıları ve Avrupa Kupası. Lig maçıyla aynı maç motorunu kullanır. */
import { Rng, clamp } from './rng';
import { type Game, type MacOzet, clubOf, genel, kisaAd, haberEkle, rngOf, rngKaydet, ligOf } from './game';
import { macBaslat, macOtomatik, macOzeti, type Mac, type MacEk, type OzelMac } from './match';
import { takimMaci, sirala, LIG_META } from './world';
/** Milli takımlar: [ülke, güç]. Oyuncunun uyruğu milli takımını belirler. */
export const ULKELER: Array<[string, number]> = [['Türkiye', 0.74], ['Almanya', 0.88], ['İspanya', 0.9], ['Fransa', 0.9], ['İtalya', 0.84], ['İngiltere', 0.9], ['Hollanda', 0.84], ['Portekiz', 0.84], ['Brezilya', 0.92], ['Arjantin', 0.92], ['Uruguay', 0.78], ['Kolombiya', 0.76], ['Japonya', 0.72], ['Güney Kore', 0.7], ['Azerbaycan', 0.5], ['İran', 0.62], ['Nijerya', 0.68], ['Gana', 0.62], ['Senegal', 0.7], ['Mısır', 0.64], ['ABD', 0.68], ['Meksika', 0.7], ['Kanada', 0.58], ['Avustralya', 0.6], ['Yeni Zelanda', 0.45]];
export const milliyetOf = (g: Game): string => g.oyuncu.milliyet || milliyetOf(g);
export const ulkeGuc = (u: string): number => ULKELER.find((x) => x[0] === u)?.[1] ?? 0.5;
export const MILLI_HAFTALAR = [7, 15], KUPA_HAFTALAR = [6, 11, 16, 21], KUPA_TUR_AD = ['Son 16', 'Çeyrek final', 'Yarı final', 'Final'];
export interface Milli { unvan?: number; cap: number; gol: number; asist: number; guven: number; gecmis: Array<{ sezon: number; hafta: number; rakip: string; gb: number; gr: number; gol: number; puan: number }> }
export const TURNUVA_HAFTALAR = [17, 18, 19, 20], TURNUVA_TUR_AD = ['Son 16', 'Çeyrek final', 'Yarı final', 'Final'], TURNUVA_ADI = 'Dünya Kupası';
export interface Turnuva { sezon: number; katilimci: string[]; tur: number; elendi: boolean; sampiyon: string | null; gecmis: Array<{ tur: number; a: string; b: string; ga: number; gb: number; kazanan: string }> }
export interface Kupa { sezon: number; katilimci: number[]; tur: number; elendi: boolean; sampiyon: number | null; gecmis: Array<{ tur: number; a: number; b: number; ga: number; gb: number; kazanan: number }> }
export interface EkMac { turnuva?: boolean; tur: 'milli' | 'kupa'; hafta: number; rakipAd: string; rakipGuc: number; rakipId?: number; evde: boolean; ad: string }
export interface EkSonuc { tur: 'milli' | 'kupa'; ad: string; ozet: MacOzet & { ek: MacEk }; bizGol: number; rakipGol: number; penaltilar?: boolean }
export const milliBos = (): Milli => ({ cap: 0, gol: 0, asist: 0, guven: 55, gecmis: [] });
/** Milli takıma çağrılma: oyuncunun kalitesi ülkenin takım seviyesine yeterince yakınsa ve güven varsa. */
export function milliCagriliMi(g: Game): boolean { const q = ulkeGuc(milliyetOf(g)) * 85 + 5, o = genel(g) + g.itibar / 7 + (g.milli.guven - 50) / 12 + (g.sezonStat.gol * 0.3); return !g.sakatlik && g.oyuncu.yas >= 17 && o >= q - 10; }
/** Önümüzdeki hafta için ek maç var mı? Her hafta sonunda ve oyun başında çağrılır. */
export function ekMacHazirla(g: Game): void {
  g.ekMac = null; const h = g.hafta; const kupa = g.kupa;
  if (kupa && !kupa.elendi && kupa.katilimci.includes(g.kulup) && KUPA_HAFTALAR[kupa.tur] === h) { const r = rakipBul(g, kupa); if (r !== null) { g.ekMac = { tur: 'kupa', hafta: h, rakipAd: kisaAd(g, r), rakipGuc: clubOf(g, r).guc, rakipId: r, evde: new Rng(g.seed + h + g.sezon).chance(0.5), ad: `Avrupa Kupası · ${KUPA_TUR_AD[kupa.tur]}` }; return; } }
  const tn = g.turnuva; if (tn && tn.sampiyon === null && !tn.elendi && TURNUVA_HAFTALAR[tn.tur] === h && milliCagriliMi(g)) { const r = turnuvaRakip(g, tn); if (r) { g.ekMac = { tur: 'milli', turnuva: true, hafta: h, rakipAd: r, rakipGuc: ulkeGuc(r), evde: false, ad: `${TURNUVA_ADI} · ${TURNUVA_TUR_AD[tn.tur]}` }; return; } }
  if (MILLI_HAFTALAR.includes(h) && milliCagriliMi(g)) { const rng = new Rng((g.seed ^ (g.sezon * 977 + h * 31)) >>> 0), adaylar = ULKELER.filter((u) => u[0] !== milliyetOf(g)), u = rng.pick(adaylar); g.ekMac = { tur: 'milli', hafta: h, rakipAd: u[0], rakipGuc: u[1], evde: rng.chance(0.5), ad: `${milliyetOf(g)} Milli Takımı` }; }
}
function rakipBul(g: Game, k: Kupa): number | null { const sira = k.katilimci.filter((x) => k.gecmis.every((m) => !(m.kazanan !== x && (m.a === x || m.b === x)))); const i = sira.indexOf(g.kulup); if (i < 0) return null; return sira[i % 2 === 0 ? i + 1 : i - 1] ?? null; }
export function ekMacCalistir(g: Game, bot = true): { m: Mac } { const e = g.ekMac!; const m = macBaslat(g, { calis: 1, odak: 'dengeli' }, { tur: e.tur, rakipAd: e.rakipAd, bizAd: e.tur === 'milli' ? milliyetOf(g) : kisaAd(g, g.kulup), rakipGuc: e.rakipGuc, bizGuc: e.tur === 'milli' ? ulkeGuc(milliyetOf(g)) : clubOf(g).guc, evde: e.evde }); if (bot) macOtomatik(g, m); return { m }; }
/** Ek maçın sonucunu işler (oynanmışsa verilen özet, yoksa otomatik simüle edilir). */
export function ekMacIsle(g: Game, ozet?: MacOzet & { ek: MacEk }): EkSonuc | null {
  const e = g.ekMac; if (!e) return null; let oz = ozet; if (!oz) { const { m } = ekMacCalistir(g); oz = macOzeti(g, m); }
  const bizEv = e.evde, bizGol = bizEv ? oz.gev : oz.gdep, rkGol = bizEv ? oz.gdep : oz.gev; let pen = false, kazandi = bizGol > rkGol;
  if ((e.tur === 'kupa' || e.turnuva) && bizGol === rkGol) { const rng = rngOf(g); pen = true; kazandi = rng.chance(0.5 + (clubOf(g).guc - e.rakipGuc) * 1.2); rngKaydet(g, rng); }
  g.enerji = clamp(g.enerji - Math.round(oz.dakika / 90 * 18), 0, 100); g.yorgunluk = clamp(g.yorgunluk + oz.dakika / 10, 0, 100);
  if (e.tur === 'milli') { if (oz.oynadi) { g.milli.cap++; g.milli.gol += oz.gol; g.milli.asist += oz.asist; } g.milli.guven = clamp(g.milli.guven + (oz.puan - 6.2) * 4, 0, 100); g.milli.gecmis.unshift({ sezon: g.sezon, hafta: e.hafta, rakip: e.rakipAd, gb: bizGol, gr: rkGol, gol: oz.gol, puan: oz.puan }); g.itibar = clamp(g.itibar + 1.5 + Math.max(0, oz.puan - 6.5) + oz.gol * 0.8, 0, 100); haberEkle(g, `${g.ad} milli formayla ${e.rakipAd} karşısında ${bizGol}-${rkGol}${oz.gol ? ` (${oz.gol} gol)` : ''}.`, 'mac'); }
  else { if (oz.oynadi) { g.kupaStat.mac++; g.kupaStat.gol += oz.gol; } g.itibar = clamp(g.itibar + 0.8 + oz.gol * 0.6, 0, 100); haberEkle(g, `${e.ad}: ${kisaAd(g, g.kulup)} ${bizGol}-${rkGol} ${e.rakipAd}${pen ? ' (penaltılarla ' + (kazandi ? 'kazandı' : 'elendi') + ')' : ''}.`, 'mac'); }
  g.ekSonuc = { tur: e.tur, ad: e.ad, ozet: oz, bizGol, rakipGol: rkGol, penaltilar: pen, kazandi } as EkSonuc & { kazandi: boolean }; g.ekMac = null; return g.ekSonuc;
}
/** Sezon başında: son sezonun tablolarından 16 takımlık Avrupa Kupası kadrosu belirlenir (5 Avrupa liginin ilk 3'ü + Süper Lig şampiyonu). */
export function kupaKur(g: Game, sezon: number): void {
  const k: number[] = []; for (let l = 4; l < g.ligler.length; l++) sirala(g.ligler[l]!).slice(0, 3).forEach((r) => k.push(r.id)); k.push(sirala(g.ligler[0]!)[0]!.id);
  const rng = new Rng((g.seed ^ (sezon * 2654435761)) >>> 0); for (let i = k.length - 1; i > 0; i--) { const j = rng.int(0, i); [k[i], k[j]] = [k[j]!, k[i]!]; }
  g.kupa = { sezon, katilimci: k, tur: 0, elendi: false, sampiyon: null, gecmis: [] };
}
/** Kupa turunu oynatır (diğer maçlar simüle edilir; bizim maçımız sonucu varsa kullanılır). */
export function kupaTurIsle(g: Game): string[] {
  const k = g.kupa; const out: string[] = []; if (!k || k.sampiyon !== null) return out; if (KUPA_HAFTALAR[k.tur] !== g.hafta) return out;
  const rng = rngOf(g), canli = k.katilimci.filter((x) => k.gecmis.every((m) => !(m.kazanan !== x && (m.a === x || m.b === x))));
  const kazananlar: number[] = []; for (let i = 0; i < canli.length; i += 2) { const a = canli[i]!, b = canli[i + 1]!; let ga: number, gb: number, kaz: number;
    if ((a === g.kulup || b === g.kulup) && g.ekSonuc && g.ekSonuc.tur === 'kupa') { const bizA = a === g.kulup; ga = bizA ? g.ekSonuc.bizGol : g.ekSonuc.rakipGol; gb = bizA ? g.ekSonuc.rakipGol : g.ekSonuc.bizGol; kaz = ga > gb ? a : gb > ga ? b : ((g.ekSonuc as unknown as { kazandi: boolean }).kazandi ? g.kulup : (bizA ? b : a)); }
    else { [ga, gb] = takimMaci(rng, clubOf(g, a).guc, clubOf(g, b).guc); kaz = ga > gb ? a : gb > ga ? b : (rng.chance(0.5 + (clubOf(g, a).guc - clubOf(g, b).guc)) ? a : b); }
    k.gecmis.push({ tur: k.tur, a, b, ga, gb, kazanan: kaz }); kazananlar.push(kaz); if (a === g.kulup || b === g.kulup) { if (kaz === g.kulup) out.push(`🏆 Avrupa Kupası ${KUPA_TUR_AD[k.tur]}: ${kisaAd(g, g.kulup)} bir üst tura çıktı!`); else { k.elendi = true; out.push(`Avrupa Kupası ${KUPA_TUR_AD[k.tur]}: elendin.`); } } }
  rngKaydet(g, rng); if (k.tur === 3) { k.sampiyon = kazananlar[0]!; out.push(`🏆 Avrupa Kupası şampiyonu: ${kisaAd(g, k.sampiyon)}`); if (k.sampiyon === g.kulup) { g.stat.kupa++; g.itibar = clamp(g.itibar + 10, 0, 100); g.para += g.sozlesme.maas * 20; haberEkle(g, `${g.ad} Avrupa Kupası'nı kaldırdı!`, 'kariyer'); } } else k.tur++; return out;
}
const canliUlkeler = (t: Turnuva): string[] => t.katilimci.filter((x) => t.gecmis.every((m) => !(m.kazanan !== x && (m.a === x || m.b === x))));
function turnuvaRakip(g: Game, t: Turnuva): string | null { const c = canliUlkeler(t), i = c.indexOf(milliyetOf(g)); if (i < 0) return null; return c[i % 2 === 0 ? i + 1 : i - 1] ?? null; }
/** Dört sezonda bir: 16 ülkelik Dünya Kupası. Oyuncunun ülkesi her zaman katılır; geri kalanı en güçlü 15 ülke. */
export function turnuvaKur(g: Game, sezon: number): void {
  if (sezon % 4 !== 0) { g.turnuva = null; return; } const ben = milliyetOf(g), rng = new Rng((g.seed ^ (sezon * 40503)) >>> 0);
  const k = ULKELER.filter((u) => u[0] !== ben).sort((a, b) => b[1] - a[1]).slice(0, 15).map((u) => u[0]); k.push(ben); for (let i = k.length - 1; i > 0; i--) { const j = rng.int(0, i); [k[i], k[j]] = [k[j]!, k[i]!]; }
  g.turnuva = { sezon, katilimci: k, tur: 0, elendi: false, sampiyon: null, gecmis: [] };
}
/** Turnuva turunu oynatır: bizim maçımız oynandıysa sonucu kullanılır, aksi hâlde ülkemiz simüle edilir. */
export function turnuvaTurIsle(g: Game): string[] {
  const t = g.turnuva, out: string[] = []; if (!t || t.sampiyon !== null || TURNUVA_HAFTALAR[t.tur] !== g.hafta) return out;
  const rng = rngOf(g), canli = canliUlkeler(t), ben = milliyetOf(g), kazananlar: string[] = [];
  for (let i = 0; i < canli.length; i += 2) { const a = canli[i]!, b = canli[i + 1]!; let ga: number, gb: number, kaz: string;
    if ((a === ben || b === ben) && g.ekSonuc && g.ekSonuc.tur === 'milli' && g.ekSonuc.ad.startsWith(TURNUVA_ADI)) { const bizA = a === ben; ga = bizA ? g.ekSonuc.bizGol : g.ekSonuc.rakipGol; gb = bizA ? g.ekSonuc.rakipGol : g.ekSonuc.bizGol; kaz = ga > gb ? a : gb > ga ? b : (g.ekSonuc.kazandi ? ben : (bizA ? b : a)); }
    else { [ga, gb] = takimMaci(rng, 0.2 + ulkeGuc(a) * 0.75, 0.2 + ulkeGuc(b) * 0.75); kaz = ga > gb ? a : gb > ga ? b : (rng.chance(0.5 + (ulkeGuc(a) - ulkeGuc(b))) ? a : b); }
    t.gecmis.push({ tur: t.tur, a, b, ga, gb, kazanan: kaz }); kazananlar.push(kaz);
    if (a === ben || b === ben) { if (kaz === ben) out.push(`🌍 ${TURNUVA_ADI} ${TURNUVA_TUR_AD[t.tur]}: ${ben} bir üst tura çıktı!`); else { t.elendi = true; out.push(`${TURNUVA_ADI} ${TURNUVA_TUR_AD[t.tur]}: ${ben} elendi.`); } } }
  rngKaydet(g, rng);
  if (t.tur === 3) { t.sampiyon = kazananlar[0]!; out.push(`🏆 ${TURNUVA_ADI} şampiyonu: ${t.sampiyon}`); if (t.sampiyon === ben) { g.milli.unvan = (g.milli.unvan ?? 0) + 1; g.itibar = clamp(g.itibar + 15, 0, 100); g.para += g.sozlesme.maas * 25; haberEkle(g, `${g.ad} ${ben} ile ${TURNUVA_ADI}'nı kaldırdı!`, 'kariyer'); } } else t.tur++;
  for (const m of out) haberEkle(g, m, 'dunya'); return out;
}
void ligOf; void LIG_META;
export const canliUlkelerTest = canliUlkeler;
