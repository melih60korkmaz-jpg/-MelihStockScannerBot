/** İlçe verisi (sınırlar © OpenStreetMap contributors, Overture Maps Foundation — ODbL 1.0; üretim: scripts/build-districts.py). */
import raw from './districts.json';
import { cityById } from './turkey';

export interface Ilce { id: number; il: number; ad: string; path: string; c: [number, number]; km2: number; komsu: number[] }
interface RawD { p: number; a: string; d: string; c: [number, number]; m2: number; n: number[] }
export const ILCELER: Ilce[] = (raw.ilce as RawD[]).map((o, i) => ({ id: i, il: o.p, ad: o.a, path: o.d, c: o.c, km2: o.m2, komsu: o.n }));
export const IL_KOMSU: Record<number, number[]> = Object.fromEntries(Object.entries(raw.komsu as Record<string, number[]>).map(([k, v]) => [+k, v]));
const BY_IL = new Map<number, Ilce[]>(); for (const d of ILCELER) { const l = BY_IL.get(d.il) ?? []; l.push(d); BY_IL.set(d.il, l); }
export const ilcelerOf = (il: number): Ilce[] => BY_IL.get(il) ?? [];
export const ilceKey = (d: Ilce): string => `${d.il}:${d.ad}`;
const BY_KEY = new Map<string, Ilce>(ILCELER.map((d) => [ilceKey(d), d]));
export const ilceOf = (key: string | undefined): Ilce | undefined => (key ? BY_KEY.get(key) : undefined);

/** Bir ilçenin ticari profili: çarpanlar (1 = il ortalaması). */
export interface IlceProfil { talep: number; gelir: number; kira: number; turizm: number; ogrenci: number; etiket: string }
const ASCII: Record<string, string> = { ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ü: 'u', Ü: 'U', ş: 's', Ş: 'S', ç: 'c', Ç: 'C', â: 'a', Â: 'A', î: 'i', û: 'u' };
const fold = (s: string): string => s.replace(/[ğĞıİöÖüÜşŞçÇâÂîû]/g, (ch) => ASCII[ch] ?? ch);
// İstanbul: [talep, gelir, kira, turizm, öğrenci, etiket] — elle girilmiş tahmini profil
const IST: Record<string, [number, number, number, number, number, string]> = {
  Adalar: [0.45, 1.2, 0.9, 0.9, 0.1, 'Turistik · sakin'], Arnavutkoy: [0.7, 0.75, 0.6, 0.1, 0.1, 'Gelişen'], Atasehir: [1.25, 1.35, 1.35, 0.15, 0.2, 'İş / finans merkezi'], Avcilar: [1.0, 0.9, 0.85, 0.1, 0.5, 'Üniversite · konut'],
  Bagcilar: [1.25, 0.7, 0.7, 0.1, 0.1, 'Yoğun konut'], Bahcelievler: [1.15, 0.85, 0.8, 0.1, 0.2, 'Yoğun konut'], Bakirkoy: [1.35, 1.35, 1.4, 0.4, 0.2, 'Sahil · yüksek gelir'], Basaksehir: [1.0, 1.1, 1.0, 0.1, 0.2, 'Yeni konut'],
  Bayrampasa: [0.9, 0.75, 0.7, 0.1, 0.1, 'Konut · ticaret'], Besiktas: [1.55, 1.4, 1.5, 0.7, 0.5, 'Turistik · öğrenci · sahil'], Beykoz: [0.75, 1.1, 0.9, 0.4, 0.1, 'Boğaz · sakin'], Beylikduzu: [1.2, 1.05, 1.0, 0.1, 0.3, 'Yeni konut · AVM'],
  Beyoglu: [1.9, 1.1, 1.5, 1.0, 0.3, 'Turizm · eğlence'], Buyukcekmece: [0.75, 1.0, 0.8, 0.3, 0.1, 'Sahil'], Catalca: [0.3, 0.8, 0.4, 0.05, 0.05, 'Kırsal'], Cekmekoy: [0.75, 1.0, 0.9, 0.1, 0.1, 'Yeşil · konut'],
  Esenler: [1.0, 0.65, 0.65, 0.1, 0.1, 'Yoğun konut'], Esenyurt: [1.5, 0.7, 0.7, 0.1, 0.2, 'En kalabalık ilçe'], Eyupsultan: [1.0, 0.9, 0.9, 0.4, 0.2, 'Tarihi · konut'], Fatih: [1.8, 0.85, 1.2, 1.0, 0.6, 'Tarihi yarımada · turizm'],
  Gaziosmanpasa: [1.0, 0.7, 0.7, 0.1, 0.1, 'Konut'], Gungoren: [0.8, 0.7, 0.65, 0.05, 0.1, 'Konut · sanayi'], Kadikoy: [1.8, 1.3, 1.4, 0.6, 0.7, 'Kafe kültürü · öğrenci'], Kagithane: [1.0, 0.85, 0.9, 0.1, 0.2, 'İş · konut'],
  Kartal: [1.0, 0.95, 0.9, 0.1, 0.2, 'Konut · sahil'], Kucukcekmece: [1.3, 0.8, 0.8, 0.15, 0.3, 'Yoğun konut · üniversite'], Maltepe: [1.0, 1.0, 0.95, 0.1, 0.4, 'Sahil · konut'], Pendik: [1.1, 0.85, 0.8, 0.15, 0.2, 'Konut · liman'],
  Sancaktepe: [0.9, 0.75, 0.7, 0.05, 0.1, 'Gelişen'], Sariyer: [1.1, 1.3, 1.3, 0.5, 0.5, 'Boğaz · üniversite'], Silivri: [0.5, 0.9, 0.55, 0.3, 0.1, 'Sahil · yazlık'], Sultanbeyli: [0.8, 0.55, 0.55, 0.05, 0.1, 'Yoğun konut'],
  Sultangazi: [1.0, 0.6, 0.6, 0.05, 0.1, 'Yoğun konut'], Sile: [0.35, 0.9, 0.5, 0.6, 0.05, 'Turistik · yazlık'], Sisli: [1.7, 1.3, 1.5, 0.6, 0.3, 'İş · alışveriş'], Tuzla: [0.6, 0.85, 0.8, 0.05, 0.3, 'Sanayi · tersane'],
  Umraniye: [1.35, 0.95, 0.9, 0.1, 0.2, 'Yoğun konut · iş'], Uskudar: [1.45, 1.1, 1.1, 0.6, 0.6, 'Tarihi · öğrenci'], Zeytinburnu: [1.0, 0.75, 0.8, 0.2, 0.2, 'Konut · ticaret'],
};
const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };
const PROF = new Map<number, IlceProfil>();
function buildProfiles(il: number): void {
  const L = ilcelerOf(il); if (!L.length || PROF.has(L[0]!.id)) return; const c = cityById(il);
  if (il === 34) { for (const d of L) { const t = IST[fold(d.ad)] ?? [1, 1, 1, 0.1, 0.2, '']; PROF.set(d.id, { talep: t[0], gelir: t[1], kira: t[2], turizm: t[3], ogrenci: t[4], etiket: t[5] }); } return; }
  const meanKm = L.reduce((a, d) => a + d.km2, 0) / L.length;
  const raw = L.map((d) => { const merkez = fold(d.ad) === fold(c.ad) || /merkez/i.test(d.ad) ? 1.8 : 1; const yogun = 0.55 + 0.9 * hash(d.ad + il); const buyuk = 0.8 + 0.4 * Math.min(1.5, d.km2 / meanKm) / 1.5; return merkez * yogun * buyuk; });
  const m = raw.reduce((a, v) => a + v, 0) / raw.length;
  L.forEach((d, i) => { const t = raw[i]! / m, g = 0.8 + 0.4 * hash(d.ad + 'g' + il); PROF.set(d.id, { talep: Math.round(t * 100) / 100, gelir: Math.round(g * 100) / 100, kira: Math.round((0.6 + 0.4 * t) * 100) / 100, turizm: c.turizm, ogrenci: c.ogrenci, etiket: t > 1.5 ? 'Kalabalık · merkezi' : t < 0.6 ? 'Seyrek nüfuslu' : '' }); });
}
export function profilOf(d: Ilce): IlceProfil { buildProfiles(d.il); return PROF.get(d.id)!; }
export const NEUTRAL: IlceProfil = { talep: 1, gelir: 1, kira: 1, turizm: -1, ogrenci: -1, etiket: '' };
