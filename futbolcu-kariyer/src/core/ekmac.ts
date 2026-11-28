/** Lig dışı maçlar: milli takım çağrıları ve Avrupa Kupası. Lig maçıyla aynı maç motorunu kullanır. */
import { Rng, clamp } from './rng';
import { type Game, type MacOzet, clubOf, genel, kisaAd, haberEkle, rngOf, rngKaydet, ligOf } from './game';
import { macBaslat, macOtomatik, macOzeti, type Mac, type MacEk, type OzelMac } from './match';
import { sirala, LIG_META } from './world';
import { turnuvaKur as tKur, turOyna, benimMaci, yarisiyor, grupTablosu, type Turnuva } from './turnuva';
import { formFarki } from './week';
import { ilk11 } from './kadro11';
/** Milli takımlar: [ülke, güç]. Oyuncunun uyruğu milli takımını belirler. */
export const ULKELER: Array<[string, number]> = [['Türkiye', 0.74], ['Almanya', 0.88], ['İspanya', 0.9], ['Fransa', 0.9], ['İtalya', 0.84], ['İngiltere', 0.9], ['Hollanda', 0.84], ['Portekiz', 0.84], ['Brezilya', 0.92], ['Arjantin', 0.92], ['Uruguay', 0.78], ['Kolombiya', 0.76], ['Japonya', 0.72], ['Güney Kore', 0.7], ['Azerbaycan', 0.5], ['İran', 0.62], ['Nijerya', 0.68], ['Gana', 0.62], ['Senegal', 0.7], ['Mısır', 0.64], ['ABD', 0.68], ['Meksika', 0.7], ['Kanada', 0.58], ['Avustralya', 0.6], ['Yeni Zelanda', 0.45]];
export const milliyetOf = (g: Game): string => g.oyuncu.milliyet || g.oyuncu.uyruk;
export const ulkeGuc = (u: string): number => ULKELER.find((x) => x[0] === u)?.[1] ?? 0.5;
export type { Turnuva } from './turnuva';
/** Haftalar: hazırlık maçları; Dünya Kupası eleme grubu (turnuvadan bir önceki sezon); Avrupa Kupası (3 grup günü + ÇF, YF, F); Dünya Kupası (3 grup günü + ÇF, YF, F). */
export const MILLI_HAFTALAR = [7, 15], ELEME_HAFTALAR = [3, 8, 13], KUPA_HAFTALAR = [2, 4, 6, 9, 12, 14], TURNUVA_HAFTALAR = [17, 18, 19, 20, 21, 22], TURNUVA_ADI = 'Dünya Kupası', KUPA_ADI = 'Avrupa Kupası', ELEME_ADI = 'Dünya Kupası Elemeleri';
export interface Milli { resmi?: number; unvan?: number; hazirlik?: number; eleme?: number; turnuvaMac?: number; cagri?: number; cap: number; gol: number; asist: number; guven: number; gecmis: Array<{ sezon: number; hafta: number; rakip: string; gb: number; gr: number; gol: number; puan: number; tur?: string }> }
export interface EkMac { kod?: 'avrupa' | 'dunya' | 'eleme' | 'hazirlik'; grup?: boolean; resmi?: boolean; turnuva?: boolean; tur: 'milli' | 'kupa'; hafta: number; rakipAd: string; rakipGuc: number; rakipId?: number; evde: boolean; ad: string }
export interface EkSonuc { tur: 'milli' | 'kupa'; ad: string; kod?: string; ozet: MacOzet & { ek: MacEk }; bizGol: number; rakipGol: number; penaltilar?: boolean; kazandi?: boolean }
export const milliBos = (): Milli => ({ cap: 0, gol: 0, asist: 0, guven: 55, gecmis: [], resmi: 0 });
const kulupGuc = (g: Game) => (k: string): number => clubOf(g, +k).guc, kulupAd = (g: Game) => (k: string): string => kisaAd(g, +k), ulkeAd = (k: string): string => k;
/** Milli takıma çağrılma: genel yetenek, itibar, teknik heyet güveni, form ve gol katkısı toplanır; ülkenin seviyesine göre eşik aşılırsa çağrılırsın. */
export function milliCagriDurumu(g: Game): { cagrildi: boolean; puan: number; esik: number; faktorler: Array<[string, number]> } {
  const esik = ulkeGuc(milliyetOf(g)) * 85 + 5 - 10, f: Array<[string, number]> = [['Genel yetenek', genel(g)], ['İtibar', g.itibar / 7], ['Teknik heyet güveni', (g.milli.guven - 50) / 12], ['Form', formFarki(g) * 0.5], ['Gol/asist', g.sezonStat.gol * 0.3 + g.sezonStat.asist * 0.15]];
  const puan = +f.reduce((t, x) => t + x[1], 0).toFixed(1); const uygun = !g.sakatlik && g.oyuncu.yas >= 17; return { cagrildi: uygun && puan >= esik, puan, esik: +esik.toFixed(1), faktorler: f.map(([a, b]) => [a, +b.toFixed(1)]) };
}
export const milliCagriliMi = (g: Game): boolean => milliCagriDurumu(g).cagrildi;
/** Milli takım kadrosu (23 kişi): ülkenin seviyesine göre üretilir, sezon boyu sabittir; çağrıldıysan sen de listedesin. */
export interface MilliOyuncu { ad: string; poz: string; ovr: number; ben: boolean }
export function milliKadro(g: Game): MilliOyuncu[] {
  const u = milliyetOf(g), rng = new Rng((g.seed ^ (g.sezon * 7919) ^ u.length * 131) >>> 0), seviye = ulkeGuc(u) * 85 + 5, onbir = ilk11(g, 'M:' + u, false), poz = ['KL', 'STP', 'STP', 'SGB', 'SLB', 'MOS', 'MOS', 'ON', 'SGK', 'SLK', 'SF'];
  const l: MilliOyuncu[] = onbir.map((o) => ({ ad: o.ad, poz: o.poz, ovr: Math.round(clamp(seviye + rng.gauss() * 3.5, 30, 92)), ben: false }));
  for (let i = 0; i < 12; i++) l.push({ ad: ilk11(g, 'M2:' + u + i, false)[i % 10 + 1]!.ad, poz: poz[(i + 1) % poz.length]!, ovr: Math.round(clamp(seviye - 6 + rng.gauss() * 3.5, 30, 90)), ben: false });
  if (milliCagriliMi(g)) { const idx = l.findIndex((x, i) => i < 11 ? x.poz === g.oyuncu.poz : false); const ben: MilliOyuncu = { ad: g.ad, poz: g.oyuncu.poz, ovr: genel(g), ben: true }; if (idx >= 0 && ben.ovr >= l[idx]!.ovr) l[idx] = ben; else l[22] = ben; }
  return l.sort((a, b) => Number(b.ben) - Number(a.ben) || b.ovr - a.ovr);
}
function ekMacOlustur(g: Game, t: Turnuva, kod: 'avrupa' | 'dunya' | 'eleme', milli: boolean): EkMac | null {
  const b = benimMaci(t, g.hafta); if (!b) return null; const rng = new Rng((g.seed ^ (g.sezon * 977 + g.hafta * 31)) >>> 0), evde = kod === 'dunya' ? false : rng.chance(0.5), ad = `${t.ad} · ${b.grup ? (t.kod === 'eleme' ? `${t.tur + 1}. maç` : `Grup ${t.tur + 1}. maç`) : ['Çeyrek final', 'Yarı final', 'Final'][t.tur - 3]}`;
  return { tur: milli ? 'milli' : 'kupa', kod, grup: b.grup, turnuva: kod === 'dunya', resmi: milli, hafta: g.hafta, rakipAd: milli ? b.rakip : kisaAd(g, +b.rakip), rakipGuc: milli ? ulkeGuc(b.rakip) : clubOf(g, +b.rakip).guc, rakipId: milli ? undefined : +b.rakip, evde, ad };
}
/** Önümüzdeki hafta için ek maç var mı? Her hafta sonunda ve oyun başında çağrılır. */
export function ekMacHazirla(g: Game): void {
  g.ekMac = null; const h = g.hafta, kupa = g.kupa;
  if (kupa) { kupa.ben = String(g.kulup); kupa.elendi = !kupa.katilimci.includes(kupa.ben) || kupaElendi(kupa); const e = ekMacOlustur(g, kupa, 'avrupa', false); if (e) { g.ekMac = e; return; } }
  const cagri = milliCagriliMi(g), ben = milliyetOf(g);
  for (const [t, kod] of [[g.eleme, 'eleme'], [g.turnuva, 'dunya']] as const) { if (t && cagri) { t.ben = ben; const e = ekMacOlustur(g, t, kod, true); if (e) { g.ekMac = e; return; } } }
  if (MILLI_HAFTALAR.includes(h) && cagri) { const rng = new Rng((g.seed ^ (g.sezon * 977 + h * 31)) >>> 0), u = rng.pick(ULKELER.filter((x) => x[0] !== ben)); g.ekMac = { tur: 'milli', kod: 'hazirlik', resmi: false, hafta: h, rakipAd: u[0], rakipGuc: u[1], evde: rng.chance(0.5), ad: `${ben} Milli Takımı · Hazırlık maçı` }; }
}
/** Kupada oyuncunun kulübü elendi mi? (grup sonrası ilk 2 dışında kalma veya eleme maçı kaybı) */
function kupaElendi(t: Turnuva): boolean { if (t.tur >= 3 && t.gecenler && !t.gecenler.includes(t.ben)) return true; for (const tur of t.elemeler) for (const m of tur) if (m.oynandi && (m.a === t.ben || m.b === t.ben) && (m.ga > m.gb ? m.a : m.gb > m.ga ? m.b : m.pen === 'a' ? m.a : m.b) !== t.ben) return true; return false; }
export function ekMacCalistir(g: Game, bot = true): { m: Mac } { const e = g.ekMac!; const m = macBaslat(g, { calis: 1, odak: 'dengeli' }, { tur: e.tur, rakipAd: e.rakipAd, bizAd: e.tur === 'milli' ? milliyetOf(g) : kisaAd(g, g.kulup), rakipGuc: e.rakipGuc, bizGuc: e.tur === 'milli' ? ulkeGuc(milliyetOf(g)) : clubOf(g).guc, evde: e.evde }); if (bot) macOtomatik(g, m); return { m }; }
/** Ek maçın sonucunu işler (oynanmışsa verilen özet, yoksa otomatik simüle edilir). Penaltılar yalnızca eleme maçlarında; gruplarda beraberlik geçerlidir. */
export function ekMacIsle(g: Game, ozet?: MacOzet & { ek: MacEk }): EkSonuc | null {
  const e = g.ekMac; if (!e) return null; let oz = ozet; if (!oz) { const { m } = ekMacCalistir(g); oz = macOzeti(g, m); }
  const bizEv = e.evde, bizGol = bizEv ? oz.gev : oz.gdep, rkGol = bizEv ? oz.gdep : oz.gev; let pen = false, kazandi = bizGol > rkGol;
  if (!e.grup && (e.tur === 'kupa' || e.turnuva) && bizGol === rkGol) { const rng = rngOf(g); pen = true; kazandi = rng.chance(0.5 + ((e.tur === 'kupa' ? clubOf(g).guc : ulkeGuc(milliyetOf(g))) - e.rakipGuc) * 1.2); rngKaydet(g, rng); }
  g.enerji = clamp(g.enerji - Math.round(oz.dakika / 90 * 18), 0, 100); g.yorgunluk = clamp(g.yorgunluk + oz.dakika / 10, 0, 100);
  if (e.tur === 'milli') {
    if (oz.oynadi) { if (e.resmi) g.milli.resmi = (g.milli.resmi ?? 0) + 1; if (e.kod === 'hazirlik') g.milli.hazirlik = (g.milli.hazirlik ?? 0) + 1; else if (e.kod === 'eleme') g.milli.eleme = (g.milli.eleme ?? 0) + 1; else g.milli.turnuvaMac = (g.milli.turnuvaMac ?? 0) + 1; g.milli.cap++; g.milli.gol += oz.gol; g.milli.asist += oz.asist; }
    g.milli.guven = clamp(g.milli.guven + (oz.puan - 6.2) * 4, 0, 100); g.milli.gecmis.unshift({ sezon: g.sezon, hafta: e.hafta, rakip: e.rakipAd, gb: bizGol, gr: rkGol, gol: oz.gol, puan: oz.puan, tur: e.kod }); g.itibar = clamp(g.itibar + 1.5 + Math.max(0, oz.puan - 6.5) + oz.gol * 0.8, 0, 100); haberEkle(g, `${g.ad} milli formayla ${e.rakipAd} karşısında ${bizGol}-${rkGol}${oz.gol ? ` (${oz.gol} gol)` : ''}${e.kod && e.kod !== 'hazirlik' ? ` · ${e.ad}` : ''}.`, 'mac');
  } else { if (oz.oynadi) { g.kupaStat.mac++; g.kupaStat.gol += oz.gol; } g.itibar = clamp(g.itibar + 0.8 + oz.gol * 0.6, 0, 100); haberEkle(g, `${e.ad}: ${kisaAd(g, g.kulup)} ${bizGol}-${rkGol} ${e.rakipAd}${pen ? ' (penaltılarla ' + (kazandi ? 'kazandı' : 'elendi') + ')' : ''}.`, 'mac'); }
  g.ekSonuc = { tur: e.tur, ad: e.ad, kod: e.kod, ozet: oz, bizGol, rakipGol: rkGol, penaltilar: pen, kazandi } as EkSonuc; g.ekMac = null; return g.ekSonuc;
}
/** Avrupa Kupası: 5 Avrupa liginin ilk 3'ü + Süper Lig şampiyonu = 16 kulüp, 4 grup. */
export function kupaKur(g: Game, sezon: number): void {
  const k: string[] = []; for (let l = 4; l < g.ligler.length; l++) sirala(g.ligler[l]!).slice(0, 3).forEach((r) => k.push(String(r.id))); k.push(String(sirala(g.ligler[0]!)[0]!.id));
  g.kupa = tKur('avrupa', KUPA_ADI, sezon, k, String(g.kulup), KUPA_HAFTALAR, kulupGuc(g), new Rng((g.seed ^ (sezon * 2654435761)) >>> 0));
}
/** Dünya Kupası eleme grubu (turnuvadan önceki sezon) ve turnuvanın kendisi. */
export function milliTurnuvalariKur(g: Game, sezon: number): void {
  const ben = milliyetOf(g), rng = new Rng((g.seed ^ (sezon * 40503)) >>> 0); const eskiEleme = g.eleme; g.eleme = null; g.turnuva = null;
  if (sezon % 4 === 3) { const rakipler = ULKELER.filter((u) => u[0] !== ben).map((u) => ({ u: u[0], w: 1 / (Math.abs(u[1] - ulkeGuc(ben)) + 0.08) })).sort((a, b) => b.w * rng.range(0.3, 1) - a.w * rng.range(0.3, 1)).slice(0, 3).map((x) => x.u); g.eleme = tKur('eleme', ELEME_ADI, sezon, [ben, ...rakipler], ben, ELEME_HAFTALAR, ulkeGuc, rng, true); }
  if (sezon % 4 === 0) {
    const kalifiye = !eskiEleme || !eskiEleme.katilimci.includes(ben) || (eskiEleme.gecenler?.includes(ben) ?? true); const digerleri = ULKELER.filter((u) => u[0] !== ben).map((u) => ({ u: u[0], p: u[1] + rng.gauss() * 0.04 })).sort((a, b) => b.p - a.p).slice(0, kalifiye ? 15 : 16).map((x) => x.u);
    const field = kalifiye ? [ben, ...digerleri] : digerleri; g.turnuva = tKur('dunya', TURNUVA_ADI, sezon, field, ben, TURNUVA_HAFTALAR, ulkeGuc, rng); if (!kalifiye) haberEkle(g, `${ben}, ${TURNUVA_ADI}'na katılma hakkı kazanamadı.`, 'dunya');
  }
}
/** Haftalık: kupa, eleme ve turnuvada bu haftaya denk gelen turları oynatır (diğer maçlar simüle edilir, bizim maçımız varsa gerçek sonucu kullanılır). */
export function turnuvalariIsle(g: Game): string[] {
  const out: string[] = [], sonuc = g.ekSonuc, rng = rngOf(g);
  for (const [t, guc, ad] of [[g.kupa, kulupGuc(g), kulupAd(g)], [g.eleme, ulkeGuc, ulkeAd], [g.turnuva, ulkeGuc, ulkeAd]] as const) {
    if (!t || t.sampiyon !== null || t.haftalar[t.tur] !== g.hafta) continue; const ben = t.kod === 'avrupa' ? String(g.kulup) : milliyetOf(g); t.ben = ben;
    const bs = sonuc && sonuc.kod === (t.kod === 'avrupa' ? 'avrupa' : t.kod) && sonuc.ad.startsWith(t.ad) ? { bizGol: sonuc.bizGol, rakipGol: sonuc.rakipGol, kazandi: sonuc.kazandi } : undefined;
    const msg = turOyna(t, g.hafta, guc, rng, ad, bs); out.push(...msg);
    if (t.sampiyon !== null && t.sampiyon === ben) { if (t.kod === 'avrupa') { g.stat.kupa++; g.itibar = clamp(g.itibar + 10, 0, 100); g.para += g.sozlesme.maas * 20; haberEkle(g, `${g.ad} ${KUPA_ADI}'nı kaldırdı!`, 'kariyer'); } else if (t.kod === 'dunya') { g.milli.unvan = (g.milli.unvan ?? 0) + 1; g.itibar = clamp(g.itibar + 15, 0, 100); g.para += g.sozlesme.maas * 25; haberEkle(g, `${g.ad} ${ben} ile ${TURNUVA_ADI}'nı kaldırdı!`, 'kariyer'); } }
    if (t.kod === 'eleme' && t.sampiyon !== null) haberEkle(g, `${ELEME_ADI}: ${ben} ${t.gecenler?.includes(ben) ? 'turnuvaya kalifiye oldu!' : 'turnuvaya kalamadı.'}`, 'dunya');
  }
  rngKaydet(g, rng); for (const m of out) haberEkle(g, m, 'dunya'); return out;
}
export { grupTablosu, yarisiyor, benimMaci };
void ligOf; void LIG_META;
