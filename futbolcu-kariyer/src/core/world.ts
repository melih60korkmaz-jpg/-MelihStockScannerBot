/** Futbol dünyası: kulüpler, ligler, fikstür, puan durumu ve diğer takımların maç simülasyonu. */
import { Rng, clamp } from './rng';
export interface Kulup { id: number; ad: string; kisa?: string; lig: number; guc: number; renk: string }
export interface TabloSatir { id: number; o: number; g: number; b: number; m: number; a: number; y: number; p: number }
export interface Lig { ad: string; kisa: string; uye: number[]; tablo: TabloSatir[]; maasCarpan: number }
export const LIG_AD = ['Süper Lig', '1. Lig', '2. Lig', '3. Lig'] as const;
export const HAFTA_SAYISI = 22; // 12 takım, çift devre
/** Kısa adlar: tablolarda ve listelerde oyuncunun hemen tanıyacağı kısa biçim (en fazla ~11 karakter). */
export const KISA_SETLERI: Record<'gercek' | 'kurgu', string[][]> = {
  gercek: [
    ['Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzon', 'Başakşehir', 'Sivas', 'Konya', 'Alanya', 'Antalya', 'Kasımpaşa', 'Gaziantep', 'Kayseri'],
    ['Göztepe', 'Altay', 'Samsun', 'Bolu', 'Adana', 'Manisa', 'Gençler', 'Keçiören', 'Bandırma', 'Ümraniye', 'Altınordu', 'Bursa'],
    ['Eskişehir', 'Sakarya', 'Kocaeli', 'Tuzla', 'Ank. Demir', 'Bodrum', 'Pendik', 'Karşıyaka', 'Giresun', 'Menemen', 'Amed', 'Urfa'],
    ['Kırklareli', 'Fethiye', 'Çorum', 'Bayburt', 'Malatya', 'Isparta', 'Niğde', 'Karacabey', 'Düzce', 'Muğla', 'Serik', 'Fatsa']
  ],
  kurgu: [
    ['Marmara', 'Ege', 'Karadeniz', 'Akdeniz', 'Anadolu', 'Toros', 'Boğaziçi', 'Kapadokya', 'Trakya', 'Bozkır', 'Tuna', 'Fırat'],
    ['Sakarya', 'Bursa', 'Konya', 'Kayseri', 'Samsun', 'Trabzon', 'Edirne', 'Mardin', 'Antalya', 'İzmit', 'Eskişehir', 'Denizli'],
    ['Bozova', 'Çamlık', 'Kızılca', 'Gültepe', 'Demirova', 'Limanköy', 'Kuzeyli', 'Meraklı', 'Ovacık', 'Sarıyer', 'Aydınlık', 'Taşlı'],
    ['Dereköy', 'Yeşilova', 'Çayırlı', 'Kuzeytepe', 'Yıldızlı', 'Karakaya', 'Doğanlı', 'Pınarbaşı', 'Sazlıdere', 'Gölbaşı', 'Akpınar', 'Çınarlı']
  ]
};
/** İsim setleri veriden gelir. 'gercek': gerçek kulüp adları (yalnızca düz yazı; logo/forma/gerçek oyuncu adı yok; liste güncel olmayabilir).
 *  'kurgu': tamamen kurgusal adlar. Uygulama mağazası yayını için 'kurgu' daha güvenlidir. */
export type IsimMod = 'gercek' | 'kurgu';
export const ISIM_SETLERI: Record<IsimMod, string[][]> = {
  gercek: [
    ['Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor', 'Başakşehir', 'Sivasspor', 'Konyaspor', 'Alanyaspor', 'Antalyaspor', 'Kasımpaşa', 'Gaziantep FK', 'Kayserispor'],
    ['Göztepe', 'Altay', 'Samsunspor', 'Boluspor', 'Adanaspor', 'Manisa FK', 'Gençlerbirliği', 'Keçiörengücü', 'Bandırmaspor', 'Ümraniyespor', 'Altınordu', 'Bursaspor'],
    ['Eskişehirspor', 'Sakaryaspor', 'Kocaelispor', 'Tuzlaspor', 'Ankara Demirspor', 'Bodrumspor', 'Pendikspor', 'Karşıyaka', 'Giresunspor', 'Menemen FK', 'Amed SK', 'Şanlıurfaspor'],
    ['Kırklarelispor', 'Fethiyespor', 'Çorum FK', 'Bayburt İl Özel İdare', 'Yeni Malatyaspor', 'Isparta 32 Spor', 'Niğde Anadolu', 'Karacabey Belediyespor', 'Düzcespor', 'Muğlaspor', 'Serik Belediyespor', 'Fatsa Belediyespor']
  ],
  kurgu: [
    ['Marmara Yıldız', 'Ege Şimşek', 'Karadeniz Fırtına', 'Akdeniz Güneş', 'Anadolu Kartal', 'Toros Aslan', 'Boğaziçi SK', 'Kapadokya Atlı', 'Trakya Kurt', 'Bozkır Gücü', 'Tuna Spor', 'Fırat Yıldızı'],
    ['Sakarya Nehir', 'Bursa Çınar', 'Konya Selçuk', 'Kayseri Doruk', 'Samsun Liman', 'Trabzon Dalga', 'Edirne Kule', 'Mardin Taş', 'Antalya Palmiye', 'İzmit Körfez', 'Eskişehir Porsuk', 'Denizli Pamuk'],
    ['Bozova Kaplan', 'Çamlık Gençlik', 'Kızılcahamam Gücü', 'Gültepe Birlik', 'Demirova Spor', 'Limanköy', 'Kuzeyli Spor', 'Meraklı SK', 'Ovacık Gücü', 'Sarıyer Yıldızı', 'Aydınlık Spor', 'Taşlıbayır SK'],
    ['Dereköy Gençlik', 'Yeşilova Spor', 'Çayırlı Birlik', 'Kuzeytepe SK', 'Yıldızlı Köy', 'Karakaya Spor', 'Doğanlı SK', 'Pınarbaşı Gücü', 'Sazlıdere Spor', 'Gölbaşı Gençlik', 'Akpınar SK', 'Çınarlı Birlik']
  ]
};
const RENKLER = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#00acc1', '#6d4c41', '#d81b60', '#546e7a', '#7cb342', '#3949ab'];
const TABAN = [0.9, 0.72, 0.54, 0.38];
export function kulupleriKur(mod: IsimMod = 'gercek'): Kulup[] { const ISIMLER = ISIM_SETLERI[mod], out: Kulup[] = []; for (let l = 0; l < 4; l++) for (let i = 0; i < 12; i++) out.push({ id: l * 12 + i, ad: ISIMLER[l]![i]!, kisa: KISA_SETLERI[mod][l]![i]!, lig: l, guc: +(TABAN[l]! - i * 0.012).toFixed(3), renk: RENKLER[i % RENKLER.length]! }); return out; }
export const tabloBos = (uye: number[]): TabloSatir[] => uye.map((id) => ({ id, o: 0, g: 0, b: 0, m: 0, a: 0, y: 0, p: 0 }));
export function ligleriKur(): Lig[] { return LIG_AD.map((ad, l) => { const uye = Array.from({ length: 12 }, (_, i) => l * 12 + i); return { ad, kisa: `L${l}`, uye, tablo: tabloBos(uye), maasCarpan: [10, 4.5, 2, 1][l]! }; }); }
/** Daire yöntemi fikstürü: 11 tur, ikinci yarıda ev/deplasman yer değiştirir. hafta 1-22. */
export function fikstur(uye: number[], hafta: number): Array<[number, number]> {
  const n = uye.length, dz = [...uye], r = (hafta - 1) % (n - 1), out: Array<[number, number]> = [];
  for (let k = 0; k < r; k++) dz.splice(1, 0, dz.pop()!);
  for (let i = 0; i < n / 2; i++) { const a = dz[i]!, b = dz[n - 1 - i]!; const evAlt = (i + r) % 2 === 0; out.push(hafta > n - 1 ? (evAlt ? [b, a] : [a, b]) : (evAlt ? [a, b] : [b, a])); }
  return out;
}
export function sirala(l: Lig): TabloSatir[] { return l.tablo.slice().sort((x, y) => y.p - x.p || (y.a - y.y) - (x.a - x.y) || y.a - x.a || x.id - y.id); }
export function sonucYaz(l: Lig, ev: number, dep: number, gev: number, gdep: number): void {
  const E = l.tablo.find((r) => r.id === ev)!, D = l.tablo.find((r) => r.id === dep)!; E.o++; D.o++; E.a += gev; E.y += gdep; D.a += gdep; D.y += gev;
  if (gev > gdep) { E.g++; E.p += 3; D.m++; } else if (gev < gdep) { D.g++; D.p += 3; E.m++; } else { E.b++; D.b++; E.p++; D.p++; }
}
/** Oyuncunun dahil olmadığı maçların simülasyonu (güç farkına dayalı Poisson). */
export function takimMaci(rng: Rng, evGuc: number, depGuc: number): [number, number] {
  const fark = evGuc - depGuc + 0.05; const le = clamp(1.35 + fark * 2.6, 0.25, 4), ld = clamp(1.1 - fark * 2.4, 0.2, 3.6); return [rng.poisson(le), rng.poisson(ld)];
}
