/** Genel turnuva motoru: grup aşaması (puan tablosu, averaj), çeyrek final, yarı final, final. Avrupa Kupası, Dünya Kupası ve eleme grupları aynı motoru kullanır.
 *  Anahtarlar metindir (kulüp için kulüp numarası, milli takım için ülke adı). Bütün sonuçlar gerçek skorlardan hesaplanır. */
import { Rng } from './rng';
import { takimMaci } from './world';
export interface TMac { a: string; b: string; ga: number; gb: number; oynandi: boolean; pen?: 'a' | 'b' }
export interface GrupSatir { id: string; o: number; g: number; b: number; m: number; ag: number; yg: number; av: number; p: number }
export interface Turnuva {
  kod: 'avrupa' | 'dunya' | 'eleme'; ad: string; sezon: number; ben: string; katilimci: string[]; gruplar: string[][]; gunler: TMac[][];
  /** 0-2: grup günü; 3: çeyrek final; 4: yarı final; 5: final */
  tur: number; elemeler: TMac[][]; haftalar: number[]; elendi: boolean; sampiyon: string | null; grupOnly?: boolean; gecenler?: string[];
}
export const TUR_AD = ['1. grup maçı', '2. grup maçı', '3. grup maçı', 'Çeyrek final', 'Yarı final', 'Final'];
/** Gün başına eşleşmeler (4 takım, her takım herkesle bir kez oynar). */
const GUN_ESLESME: Array<Array<[number, number]>> = [[[0, 3], [1, 2]], [[0, 2], [3, 1]], [[0, 1], [2, 3]]];
export function turnuvaKur(kod: Turnuva['kod'], ad: string, sezon: number, katilimci: string[], ben: string, haftalar: number[], guc: (k: string) => number, rng: Rng, grupOnly = false): Turnuva {
  let gruplar: string[][];
  if (grupOnly) gruplar = [katilimci.slice(0, 4)];
  else { const sirali = katilimci.slice().sort((a, b) => guc(b) - guc(a)); gruplar = [[], [], [], []]; for (let p = 0; p < 4; p++) { const kova = sirali.slice(p * 4, p * 4 + 4); for (let i = kova.length - 1; i > 0; i--) { const j = rng.int(0, i); [kova[i], kova[j]] = [kova[j]!, kova[i]!]; } kova.forEach((k, gi) => gruplar[gi]!.push(k)); } }
  const gunler: TMac[][] = [0, 1, 2].map((d) => gruplar.flatMap((gr) => GUN_ESLESME[d]!.map(([x, y]) => ({ a: gr[x]!, b: gr[y]!, ga: 0, gb: 0, oynandi: false }))));
  return { kod, ad, sezon, ben, katilimci: katilimci.slice(), gruplar, gunler, tur: 0, elemeler: [], haftalar, elendi: false, sampiyon: null, grupOnly, gecenler: undefined };
}
/** Grup tablosu: puan, averaj, atılan gol, (eşitlikte) güç ve ad ile deterministik sıralanır. */
export function grupTablosu(t: Turnuva, gi: number, guc: (k: string) => number = () => 0): GrupSatir[] {
  const gr = t.gruplar[gi]!, s = new Map<string, GrupSatir>(gr.map((id) => [id, { id, o: 0, g: 0, b: 0, m: 0, ag: 0, yg: 0, av: 0, p: 0 }]));
  for (const gun of t.gunler) for (const m of gun) { if (!m.oynandi || !s.has(m.a) || !s.has(m.b)) continue; const A = s.get(m.a)!, B = s.get(m.b)!; A.o++; B.o++; A.ag += m.ga; A.yg += m.gb; B.ag += m.gb; B.yg += m.ga; if (m.ga > m.gb) { A.g++; B.m++; A.p += 3; } else if (m.ga < m.gb) { B.g++; A.m++; B.p += 3; } else { A.b++; B.b++; A.p++; B.p++; } }
  for (const x of s.values()) x.av = x.ag - x.yg; return [...s.values()].sort((a, b) => b.p - a.p || b.av - a.av || b.ag - a.ag || guc(b.id) - guc(a.id) || (a.id < b.id ? -1 : 1));
}
export const grupBitti = (t: Turnuva): boolean => t.gunler[2]!.every((m) => m.oynandi);
/** Elemede kalan takımlar (grup bittikten sonra). */
export function canliTakimlar(t: Turnuva): string[] {
  if (t.tur < 3) return t.gruplar.flat(); const onceki = t.elemeler[t.tur - 3]; return onceki ? onceki.map((m) => kazananOf(m)) : [];
}
export const kazananOf = (m: TMac): string => (m.ga > m.gb ? m.a : m.gb > m.ga ? m.b : m.pen === 'a' ? m.a : m.b);
/** Bu hafta oyuncunun takımının oynayacağı maç (yoksa null). */
export function benimMaci(t: Turnuva, hafta: number): { mac: TMac; evde: boolean; grup: boolean; rakip: string } | null {
  if (t.elendi || t.sampiyon !== null || t.haftalar[t.tur] !== hafta) return null;
  const liste = t.tur < 3 ? t.gunler[t.tur]! : (t.elemeler[t.tur - 3] ?? sonrakiEleme(t)); const m = liste.find((x) => !x.oynandi && (x.a === t.ben || x.b === t.ben)); if (!m) return null; return { mac: m, evde: m.a === t.ben, grup: t.tur < 3, rakip: m.a === t.ben ? m.b : m.a };
}
/** Eleme turunun eşleşmelerini hazırlar (önceki turun kazananları / grup birincileri ve ikincileri). */
function sonrakiEleme(t: Turnuva): TMac[] {
  if (t.elemeler[t.tur - 3]) return t.elemeler[t.tur - 3]!; let cift: Array<[string, string]>;
  if (t.tur === 3) { const ilk = t.gruplar.map((_, gi) => grupTablosuSon(t, gi)); cift = [[ilk[0]![0]!, ilk[1]![1]!], [ilk[1]![0]!, ilk[0]![1]!], [ilk[2]![0]!, ilk[3]![1]!], [ilk[3]![0]!, ilk[2]![1]!]]; }
  else { const onceki = t.elemeler[t.tur - 4]!.map(kazananOf); cift = []; for (let i = 0; i < onceki.length; i += 2) cift.push([onceki[i]!, onceki[i + 1]!]); }
  const liste = cift.map(([a, b]) => ({ a, b, ga: 0, gb: 0, oynandi: false })); t.elemeler[t.tur - 3] = liste; return liste;
}
const grupTablosuSon = (t: Turnuva, gi: number): string[] => grupTablosu(t, gi).slice(0, 2).map((x) => x.id);
const oyna = (rng: Rng, ga: number, gb: number): [number, number] => takimMaci(rng, ga, gb);
/** Bu haftanın turunu oynatır. benSonuc verilirse oyuncunun maçı o skorla işlenir. Mesaj listesi döner. */
export function turOyna(t: Turnuva, hafta: number, guc: (k: string) => number, rng: Rng, ad: (k: string) => string, benSonuc?: { bizGol: number; rakipGol: number; kazandi?: boolean }): string[] {
  const out: string[] = []; if (t.sampiyon !== null || t.haftalar[t.tur] !== hafta) return out;
  const benVarMi = (m: TMac): boolean => m.a === t.ben || m.b === t.ben;
  const yaz = (m: TMac, knockout: boolean): void => {
    if (benSonuc && benVarMi(m)) { const bizA = m.a === t.ben; m.ga = bizA ? benSonuc.bizGol : benSonuc.rakipGol; m.gb = bizA ? benSonuc.rakipGol : benSonuc.bizGol; if (knockout && m.ga === m.gb) m.pen = benSonuc.kazandi ? (bizA ? 'a' : 'b') : (bizA ? 'b' : 'a'); }
    else { [m.ga, m.gb] = oyna(rng, guc(m.a), guc(m.b)); if (knockout && m.ga === m.gb) m.pen = rng.chance(0.5 + (guc(m.a) - guc(m.b)) * 0.8) ? 'a' : 'b'; }
    m.oynandi = true;
  };
  if (t.tur < 3) {
    for (const m of t.gunler[t.tur]!) { if (!m.oynandi) yaz(m, false); }
    const benMac = t.gunler[t.tur]!.find(benVarMi); if (benMac) out.push(`${t.ad} · ${TUR_AD[t.tur]}: ${ad(benMac.a)} ${benMac.ga}-${benMac.gb} ${ad(benMac.b)}`);
    if (t.tur === 2) { // grup bitti
      t.gecenler = t.gruplar.flatMap((_, gi) => grupTablosuSon(t, gi)); const gi = t.gruplar.findIndex((g) => g.includes(t.ben));
      if (gi >= 0) { const sira = grupTablosu(t, gi, guc).findIndex((x) => x.id === t.ben) + 1; if (sira > 2) { t.elendi = true; out.push(`${t.ad}: grubu ${sira}. bitirdin, elendin.`); } else out.push(`${t.ad}: grubu ${sira}. bitirdin, üst tura çıktın!`); }
      if (t.grupOnly) { t.sampiyon = grupTablosu(t, 0, guc)[0]!.id; out.push(`${t.ad} grup birincisi: ${ad(t.sampiyon)}`); return out; }
    }
    t.tur++; return out;
  }
  const liste = sonrakiEleme(t); for (const m of liste) if (!m.oynandi) yaz(m, true);
  const benMac = liste.find(benVarMi); if (benMac) { out.push(`${t.ad} · ${TUR_AD[t.tur]}: ${ad(benMac.a)} ${benMac.ga}-${benMac.gb} ${ad(benMac.b)}${benMac.pen ? ' (pen.)' : ''}`); if (kazananOf(benMac) !== t.ben) { t.elendi = true; out.push(`${t.ad} ${TUR_AD[t.tur]}: elendin.`); } else if (t.tur < 5) out.push(`${t.ad}: ${TUR_AD[t.tur]}'ı geçtin!`); }
  if (t.tur === 5) { t.sampiyon = kazananOf(liste[0]!); out.push(`🏆 ${t.ad} şampiyonu: ${ad(t.sampiyon)}`); } else t.tur++; return out;
}
/** Oyuncunun takımı turnuvada hâlâ yarışıyor mu? */
export const yarisiyor = (t: Turnuva | null | undefined): boolean => !!t && !t.elendi && t.sampiyon === null && t.katilimci.includes(t.ben);
