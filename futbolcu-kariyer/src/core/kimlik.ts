/** Kimlik sistemi: doğum ülkesi, vatandaşlıklar (birden fazla olabilir), milliyet (oynanan milli takım) ve etnik köken ayrı alanlardır. */
import type { Game, Oyuncu } from './game';
import { haberEkle, ulkeOf } from './game';
import { LIG_META } from './world';
import { clamp } from './rng';
export const ETNIKLER = ['Türk', 'Kürt', 'Arap', 'Slav', 'Germen', 'Latin', 'Anglo-Sakson', 'Batı Afrikalı', 'Doğu Asyalı', 'Yerli Amerikalı', 'Karma'];
export const MAX_VATANDASLIK = 3, VATANDASLIK_MIN_SEZON = 3;
const ETNIK_ULKE: Record<string, string> = { Türkiye: 'Türk', Azerbaycan: 'Türk', Almanya: 'Germen', Hollanda: 'Germen', İngiltere: 'Anglo-Sakson', ABD: 'Anglo-Sakson', Kanada: 'Anglo-Sakson', Avustralya: 'Anglo-Sakson', 'Yeni Zelanda': 'Anglo-Sakson', İspanya: 'Latin', Fransa: 'Latin', İtalya: 'Latin', Portekiz: 'Latin', Brezilya: 'Latin', Arjantin: 'Latin', Uruguay: 'Latin', Kolombiya: 'Latin', Meksika: 'Latin', Nijerya: 'Batı Afrikalı', Gana: 'Batı Afrikalı', Senegal: 'Batı Afrikalı', Mısır: 'Arap', İran: 'Doğu Asyalı', Japonya: 'Doğu Asyalı', 'Güney Kore': 'Doğu Asyalı' };
export const varsayilanEtnik = (ulke: string): string => ETNIK_ULKE[ulke] ?? 'Karma';
export interface KimlikGirdi { uyruk?: string; dogumUlke?: string; vatandasliklar?: string[]; milliyet?: string; etnik?: string }
/** Girdiden tutarlı kimlik üretir: vatandaşlıklar benzersiz ve en çok 3; milliyet vatandaşlıklardan biri olmak zorundadır. */
export function kimlikKur(y: KimlikGirdi): Pick<Oyuncu, 'uyruk' | 'dogumUlke' | 'vatandasliklar' | 'milliyet' | 'etnik'> {
  const dogum = y.dogumUlke || y.uyruk || 'Türkiye'; const v = [...new Set((y.vatandasliklar?.length ? y.vatandasliklar : [y.uyruk || dogum]).filter(Boolean))].slice(0, MAX_VATANDASLIK);
  const milliyet = y.milliyet && v.includes(y.milliyet) ? y.milliyet : v[0]!; return { uyruk: v[0]!, dogumUlke: dogum, vatandasliklar: v, milliyet, etnik: y.etnik || varsayilanEtnik(dogum) };
}
export const vatandasliklarOf = (o: Oyuncu): string[] => o.vatandasliklar?.length ? o.vatandasliklar : [o.uyruk];
export const milliUygunMu = (o: Oyuncu, ulke: string): boolean => vatandasliklarOf(o).includes(ulke);
/** Resmi (eleme/turnuva) maçta oynayan oyuncu milli takım değiştiremez; hazırlık maçları sayılmaz. */
export function milliDegistir(g: Game, ulke: string): { ok: boolean; m: string } {
  const o = g.oyuncu; if (!milliUygunMu(o, ulke)) return { ok: false, m: `${ulke} vatandaşı değilsin; o milli takımı seçemezsin.` };
  if ((o.milliyet || o.uyruk) === ulke) return { ok: false, m: 'Zaten bu milli takımdasın.' };
  if ((g.milli.resmi ?? 0) > 0) return { ok: false, m: 'Resmî bir maçta (eleme/turnuva) forma giydin; milli takımını artık değiştiremezsin.' };
  if (g.turnuva && g.turnuva.sampiyon === null && !g.turnuva.elendi) return { ok: false, m: 'Turnuva sürerken milli takım değiştirilemez.' };
  const eski = o.milliyet || o.uyruk; o.milliyet = ulke; g.milli.guven = clamp(40, 0, 100); g.ekMac = g.ekMac && g.ekMac.tur === 'milli' ? null : g.ekMac;
  haberEkle(g, `${g.ad} ${eski} yerine ${ulke} milli takımını temsil etme kararı aldı.`, 'kariyer'); return { ok: true, m: `Artık ${ulke} milli takımı için oynayacaksın. Teknik heyet güveni sıfırlandı (40).` };
}
/** Ülkede en az 3 sezon yaşayıp oynayan oyuncu o ülkenin vatandaşlığına başvurabilir (en çok 3 vatandaşlık). */
export const ulkedeSezon = (g: Game, ulke: string): number => g.gecmis.filter((x) => LIG_META[x.lig]?.ulke === ulke).length + (ulkeKulup(g) === ulke ? 1 : 0);
export const ulkeKulup = (g: Game): string => ulkeOf(g, g.kulup);
export function vatandaslikBasvur(g: Game, ulke: string): { ok: boolean; m: string } {
  const o = g.oyuncu; if (vatandasliklarOf(o).includes(ulke)) return { ok: false, m: 'Zaten vatandaşısın.' }; if (vatandasliklarOf(o).length >= MAX_VATANDASLIK) return { ok: false, m: `En çok ${MAX_VATANDASLIK} vatandaşlığa sahip olabilirsin.` };
  const n = ulkedeSezon(g, ulke); if (n < VATANDASLIK_MIN_SEZON) return { ok: false, m: `${ulke} vatandaşlığı için orada en az ${VATANDASLIK_MIN_SEZON} sezon oynamalısın (şu an ${n}).` };
  const ucret = 150000; if (g.para < ucret) return { ok: false, m: `Başvuru masrafı ${ucret} ₺.` }; g.para -= ucret; o.vatandasliklar = [...vatandasliklarOf(o), ulke]; haberEkle(g, `${g.ad} ${ulke} vatandaşlığı aldı.`, 'kariyer'); return { ok: true, m: `${ulke} vatandaşlığı alındı. Artık o milli takımı da seçebilirsin.` };
}
