/** Futbol dünyası: kulüpler, ligler, fikstür, puan durumu ve diğer takımların maç simülasyonu. */
import { Rng, clamp } from './rng';
export interface Kulup { id: number; ad: string; kisa?: string; kod?: string; lig: number; guc: number; renk: string }
export interface TabloSatir { id: number; o: number; g: number; b: number; m: number; a: number; y: number; p: number }
export interface Lig { ad: string; kisa: string; uye: number[]; tablo: TabloSatir[]; maasCarpan: number }
/** Lig yapısı: ilk 4 lig Türkiye piramidi (yükselme/düşme var), sonraki 5 lig Avrupa'nın büyük ligleri (sabit üyeli, transfer hedefi). */
export const LIG_META = [
  { ad: 'Süper Lig', ulke: 'Türkiye', piramit: true, taban: 0.78, maas: 10 }, { ad: '1. Lig', ulke: 'Türkiye', piramit: true, taban: 0.62, maas: 4.5 }, { ad: '2. Lig', ulke: 'Türkiye', piramit: true, taban: 0.48, maas: 2 }, { ad: '3. Lig', ulke: 'Türkiye', piramit: true, taban: 0.34, maas: 1 },
  { ad: 'Premier Lig', ulke: 'İngiltere', piramit: false, taban: 0.97, maas: 60 }, { ad: 'La Liga', ulke: 'İspanya', piramit: false, taban: 0.95, maas: 42 }, { ad: 'Bundesliga', ulke: 'Almanya', piramit: false, taban: 0.93, maas: 38 }, { ad: 'Serie A', ulke: 'İtalya', piramit: false, taban: 0.92, maas: 36 }, { ad: 'Ligue 1', ulke: 'Fransa', piramit: false, taban: 0.89, maas: 28 }
] as const;
export const LIG_AD = LIG_META.map((l) => l.ad);
export const TR_LIG = 4, LIG_SAYISI = LIG_META.length, KULUP_PER_LIG = 12;
export const HAFTA_SAYISI = 22; // 12 takım, çift devre
export type IsimMod = 'gercek' | 'kurgu';
type Set3 = Array<[string, string, string]>; // [tam ad, kısa ad, 3 harfli kod]
/** İsim setleri veriden gelir. 'gercek': gerçek kulüp adları (yalnızca düz yazı; logo/forma/gerçek oyuncu adı yok; liste güncel olmayabilir).
 *  'kurgu': tamamen kurgusal adlar. Uygulama mağazası yayını için 'kurgu' daha güvenlidir. */
export const ISIM_SETLERI: Record<IsimMod, Set3[]> = {
  gercek: [
    [['Galatasaray', 'Galatasaray', 'GAL'], ['Fenerbahçe', 'Fenerbahçe', 'FEN'], ['Beşiktaş', 'Beşiktaş', 'BJK'], ['Trabzonspor', 'Trabzon', 'TRA'], ['Başakşehir', 'Başakşehir', 'BAŞ'], ['Sivasspor', 'Sivas', 'SİV'], ['Konyaspor', 'Konya', 'KON'], ['Alanyaspor', 'Alanya', 'ALA'], ['Antalyaspor', 'Antalya', 'ANT'], ['Kasımpaşa', 'Kasımpaşa', 'KAS'], ['Gaziantep FK', 'Gaziantep', 'GAZ'], ['Kayserispor', 'Kayseri', 'KAY']],
    [['Göztepe', 'Göztepe', 'GÖZ'], ['Altay', 'Altay', 'ALT'], ['Samsunspor', 'Samsun', 'SAM'], ['Boluspor', 'Bolu', 'BOL'], ['Adanaspor', 'Adana', 'ADA'], ['Manisa FK', 'Manisa', 'MAN'], ['Gençlerbirliği', 'Gençler', 'GEN'], ['Keçiörengücü', 'Keçiören', 'KEÇ'], ['Bandırmaspor', 'Bandırma', 'BAN'], ['Ümraniyespor', 'Ümraniye', 'ÜMR'], ['Altınordu', 'Altınordu', 'ALN'], ['Bursaspor', 'Bursa', 'BUR']],
    [['Eskişehirspor', 'Eskişehir', 'ESK'], ['Sakaryaspor', 'Sakarya', 'SAK'], ['Kocaelispor', 'Kocaeli', 'KOC'], ['Tuzlaspor', 'Tuzla', 'TUZ'], ['Ankara Demirspor', 'Ank. Demir', 'ADM'], ['Bodrumspor', 'Bodrum', 'BOD'], ['Pendikspor', 'Pendik', 'PEN'], ['Karşıyaka', 'Karşıyaka', 'KAR'], ['Giresunspor', 'Giresun', 'GİR'], ['Menemen FK', 'Menemen', 'MEN'], ['Amed SK', 'Amed', 'AMD'], ['Şanlıurfaspor', 'Urfa', 'URF']],
    [['Kırklarelispor', 'Kırklareli', 'KIR'], ['Fethiyespor', 'Fethiye', 'FET'], ['Çorum FK', 'Çorum', 'ÇOR'], ['Bayburt İl Özel İdare', 'Bayburt', 'BAY'], ['Yeni Malatyaspor', 'Malatya', 'MAL'], ['Isparta 32 Spor', 'Isparta', 'ISP'], ['Niğde Anadolu', 'Niğde', 'NİĞ'], ['Karacabey Belediyespor', 'Karacabey', 'KRC'], ['Düzcespor', 'Düzce', 'DÜZ'], ['Muğlaspor', 'Muğla', 'MUĞ'], ['Serik Belediyespor', 'Serik', 'SER'], ['Fatsa Belediyespor', 'Fatsa', 'FAT']],
    [['Manchester City', 'Man City', 'MCI'], ['Liverpool', 'Liverpool', 'LIV'], ['Arsenal', 'Arsenal', 'ARS'], ['Chelsea', 'Chelsea', 'CHE'], ['Manchester United', 'Man Utd', 'MUN'], ['Tottenham', 'Tottenham', 'TOT'], ['Newcastle United', 'Newcastle', 'NEW'], ['Aston Villa', 'Aston Villa', 'AVL'], ['Brighton', 'Brighton', 'BHA'], ['West Ham United', 'West Ham', 'WHU'], ['Everton', 'Everton', 'EVE'], ['Leicester City', 'Leicester', 'LEI']],
    [['Real Madrid', 'R. Madrid', 'RMA'], ['Barcelona', 'Barcelona', 'BAR'], ['Atlético Madrid', 'Atlético', 'ATM'], ['Sevilla', 'Sevilla', 'SEV'], ['Real Sociedad', 'R. Sociedad', 'RSO'], ['Villarreal', 'Villarreal', 'VIL'], ['Valencia', 'Valencia', 'VAL'], ['Athletic Bilbao', 'Bilbao', 'ATH'], ['Real Betis', 'Betis', 'BET'], ['Celta Vigo', 'Celta', 'CEL'], ['Getafe', 'Getafe', 'GET'], ['Osasuna', 'Osasuna', 'OSA']],
    [['Bayern Münih', 'Bayern', 'BYM'], ['Borussia Dortmund', 'Dortmund', 'BVB'], ['Bayer Leverkusen', 'Leverkusen', 'LEV'], ['RB Leipzig', 'Leipzig', 'RBL'], ['Eintracht Frankfurt', 'Frankfurt', 'SGE'], ['Stuttgart', 'Stuttgart', 'VFB'], ['Wolfsburg', 'Wolfsburg', 'WOB'], ['Freiburg', 'Freiburg', 'SCF'], ['Mönchengladbach', 'Gladbach', 'BMG'], ['Hoffenheim', 'Hoffenheim', 'TSG'], ['Werder Bremen', 'Bremen', 'SVW'], ['Union Berlin', 'Union', 'FCU']],
    [['Inter', 'Inter', 'INT'], ['Milan', 'Milan', 'MIL'], ['Juventus', 'Juventus', 'JUV'], ['Napoli', 'Napoli', 'NAP'], ['Roma', 'Roma', 'ROM'], ['Lazio', 'Lazio', 'LAZ'], ['Atalanta', 'Atalanta', 'ATA'], ['Fiorentina', 'Fiorentina', 'FIO'], ['Bologna', 'Bologna', 'BLG'], ['Torino', 'Torino', 'TOR'], ['Genoa', 'Genoa', 'GNO'], ['Udinese', 'Udinese', 'UDI']],
    [['Paris Saint-Germain', 'PSG', 'PSG'], ['Marsilya', 'Marsilya', 'MRS'], ['Monaco', 'Monaco', 'MON'], ['Lyon', 'Lyon', 'LYO'], ['Lille', 'Lille', 'LIL'], ['Nice', 'Nice', 'NCE'], ['Rennes', 'Rennes', 'REN'], ['Lens', 'Lens', 'RCL'], ['Nantes', 'Nantes', 'NAN'], ['Strasbourg', 'Strasbourg', 'STR'], ['Montpellier', 'Montpellier', 'MTP'], ['Reims', 'Reims', 'REI']]
  ],
  kurgu: [
    [['Marmara Yıldız', 'Marmara', 'MAR'], ['Ege Şimşek', 'Ege', 'EGE'], ['Karadeniz Fırtına', 'Karadeniz', 'KRD'], ['Akdeniz Güneş', 'Akdeniz', 'AKD'], ['Anadolu Kartal', 'Anadolu', 'ANA'], ['Toros Aslan', 'Toros', 'TOR'], ['Boğaziçi SK', 'Boğaziçi', 'BOĞ'], ['Kapadokya Atlı', 'Kapadokya', 'KAP'], ['Trakya Kurt', 'Trakya', 'TRK'], ['Bozkır Gücü', 'Bozkır', 'BZK'], ['Tuna Spor', 'Tuna', 'TUN'], ['Fırat Yıldızı', 'Fırat', 'FIR']],
    [['Sakarya Nehir', 'Sakarya', 'SKN'], ['Bursa Çınar', 'Bursa', 'BRC'], ['Konya Selçuk', 'Konya', 'KNS'], ['Kayseri Doruk', 'Kayseri', 'KYD'], ['Samsun Liman', 'Samsun', 'SML'], ['Trabzon Dalga', 'Trabzon', 'TRD'], ['Edirne Kule', 'Edirne', 'EDK'], ['Mardin Taş', 'Mardin', 'MRT'], ['Antalya Palmiye', 'Antalya', 'ANP'], ['İzmit Körfez', 'İzmit', 'İZK'], ['Eskişehir Porsuk', 'Eskişehir', 'ESP'], ['Denizli Pamuk', 'Denizli', 'DNP']],
    [['Bozova Kaplan', 'Bozova', 'BOZ'], ['Çamlık Gençlik', 'Çamlık', 'ÇAM'], ['Kızılcahamam Gücü', 'Kızılca', 'KZL'], ['Gültepe Birlik', 'Gültepe', 'GLT'], ['Demirova Spor', 'Demirova', 'DMV'], ['Limanköy', 'Limanköy', 'LMK'], ['Kuzeyli Spor', 'Kuzeyli', 'KZY'], ['Meraklı SK', 'Meraklı', 'MRK'], ['Ovacık Gücü', 'Ovacık', 'OVC'], ['Sarıyer Yıldızı', 'Sarıyer', 'SRY'], ['Aydınlık Spor', 'Aydınlık', 'AYD'], ['Taşlıbayır SK', 'Taşlı', 'TŞL']],
    [['Dereköy Gençlik', 'Dereköy', 'DRK'], ['Yeşilova Spor', 'Yeşilova', 'YŞL'], ['Çayırlı Birlik', 'Çayırlı', 'ÇYR'], ['Kuzeytepe SK', 'Kuzeytepe', 'KZT'], ['Yıldızlı Köy', 'Yıldızlı', 'YLD'], ['Karakaya Spor', 'Karakaya', 'KRK'], ['Doğanlı SK', 'Doğanlı', 'DĞN'], ['Pınarbaşı Gücü', 'Pınarbaşı', 'PNR'], ['Sazlıdere Spor', 'Sazlıdere', 'SZL'], ['Gölbaşı Gençlik', 'Gölbaşı', 'GLB'], ['Akpınar SK', 'Akpınar', 'AKP'], ['Çınarlı Birlik', 'Çınarlı', 'ÇNR']],
    [['Northport United', 'Northport', 'NPU'], ['Westbridge Rovers', 'Westbridge', 'WBR'], ['Eastham City', 'Eastham', 'EHC'], ['Ironvale Town', 'Ironvale', 'IRV'], ['Kingsmere FC', 'Kingsmere', 'KGM'], ['Oakfield Athletic', 'Oakfield', 'OKF'], ['Redcliffe Wanderers', 'Redcliffe', 'RDC'], ['Stonebury County', 'Stonebury', 'STB'], ['Marshgate Albion', 'Marshgate', 'MGA'], ['Highmoor Rangers', 'Highmoor', 'HMR'], ['Brookside Argyle', 'Brookside', 'BKS'], ['Thornwick Villa', 'Thornwick', 'THV']],
    [['Costa Real', 'Costa Real', 'CRL'], ['Sierra Norte', 'S. Norte', 'SNT'], ['Valle Dorado', 'V. Dorado', 'VDR'], ['Puerto Sol', 'P. Sol', 'PSL'], ['Monte Alto', 'M. Alto', 'MAL'], ['Rio Verde', 'Rio Verde', 'RVD'], ['Campo Azul', 'C. Azul', 'CAZ'], ['Isla Blanca', 'I. Blanca', 'IBL'], ['Playa Brava', 'P. Brava', 'PBR'], ['Torre Vieja', 'T. Vieja', 'TVJ'], ['Cerro Luna', 'C. Luna', 'CLN'], ['Nueva Aurora', 'N. Aurora', 'NAU']],
    [['Rhein Adler', 'Rhein', 'RHA'], ['Nordstadt 04', 'Nordstadt', 'NSD'], ['Sachsen Blitz', 'Sachsen', 'SBL'], ['Alpen Löwen', 'Alpen', 'ALL'], ['Elbe Sturm', 'Elbe', 'ELS'], ['Harz Wölfe', 'Harz', 'HZW'], ['Mosel Union', 'Mosel', 'MSU'], ['Ruhr Stahl', 'Ruhr', 'RST'], ['Bodensee SC', 'Bodensee', 'BDS'], ['Schwaben FC', 'Schwaben', 'SCH'], ['Havel 09', 'Havel', 'HAV'], ['Oder Falken', 'Oder', 'ODF']],
    [['Roma Antica', 'R. Antica', 'RAN'], ['Milano Rossa', 'M. Rossa', 'MRO'], ['Torino Nera', 'T. Nera', 'TNE'], ['Napoli Azzurra', 'N. Azzurra', 'NAZ'], ['Firenze Viola', 'F. Viola', 'FVI'], ['Genova Mare', 'G. Mare', 'GMR'], ['Verona Scala', 'V. Scala', 'VSC'], ['Bari Sole', 'Bari', 'BSL'], ['Parma Oro', 'Parma', 'PRO'], ['Lecce Barocca', 'Lecce', 'LBR'], ['Siena Palio', 'Siena', 'SPL'], ['Pisa Torre', 'Pisa', 'PTR']],
    [['Paris Étoile', 'P. Étoile', 'PET'], ['Marne Royale', 'Marne', 'MRN'], ['Côte Azur FC', 'Côte Azur', 'CTA'], ['Lyon Vallée', 'L. Vallée', 'LVA'], ['Nord Lion', 'Nord', 'NRL'], ['Bretagne Mer', 'Bretagne', 'BTM'], ['Alsace Blanc', 'Alsace', 'ALB'], ['Loire Fleur', 'Loire', 'LRF'], ['Garonne SC', 'Garonne', 'GRN'], ['Provence Soleil', 'Provence', 'PRV'], ['Seine Argent', 'Seine', 'SNA'], ['Rhône Aigle', 'Rhône', 'RHN']]
  ]
};
const RENKLER = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#00acc1', '#6d4c41', '#d81b60', '#546e7a', '#7cb342', '#3949ab'];
export function kulupleriKur(mod: IsimMod = 'gercek'): Kulup[] { const out: Kulup[] = []; for (let l = 0; l < LIG_SAYISI; l++) for (let i = 0; i < KULUP_PER_LIG; i++) { const [ad, kisa, kod] = ISIM_SETLERI[mod][l]![i]!; out.push({ id: l * KULUP_PER_LIG + i, ad, kisa, kod, lig: l, guc: +(LIG_META[l].taban - i * 0.013).toFixed(3), renk: RENKLER[i % RENKLER.length]! }); } return out; }
export const tabloBos = (uye: number[]): TabloSatir[] => uye.map((id) => ({ id, o: 0, g: 0, b: 0, m: 0, a: 0, y: 0, p: 0 }));
export function ligleriKur(): Lig[] { return LIG_META.map((m, l) => { const uye = Array.from({ length: KULUP_PER_LIG }, (_, i) => l * KULUP_PER_LIG + i); return { ad: m.ad, kisa: `L${l}`, uye, tablo: tabloBos(uye), maasCarpan: m.maas }; }); }
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
