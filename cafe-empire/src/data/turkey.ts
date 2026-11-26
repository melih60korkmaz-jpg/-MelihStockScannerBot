import raw from './provinces.json';

/** 81 ilin kafe pazarı verisi. Nüfus gerçekçi (bin); diğer göstergeler 0–1 endekstir. */
export type Region = 'M' | 'E' | 'A' | 'I' | 'K' | 'D' | 'G';
export const REGION_NAME: Record<Region, string> = { M: 'Marmara', E: 'Ege', A: 'Akdeniz', I: 'İç Anadolu', K: 'Karadeniz', D: 'Doğu Anadolu', G: 'Güneydoğu Anadolu' };

export interface Segments { ogr: number; cal: number; tur: number; aile: number; emk: number }
export interface City {
  id: number;            // plaka kodu
  ad: string;
  region: Region;
  nufus: number;         // bin kişi
  lon: number; lat: number;
  path: string;          // SVG sınırı (haritadaki gerçek şekil)
  gelir: number;         // ortalama gelir seviyesi endeksi (0.6–1.6; 1 = ülke ortalaması)
  turizm: number;        // turizm potansiyeli 0–1
  ogrenci: number;       // öğrenci yoğunluğu 0–1
  sanayi: number;        // sanayi çalışanı yoğunluğu 0–1
  kiyi: boolean;         // sahil kenti mi
  rekabet: number;       // kafe rekabeti 0–1
  kira: number;          // kira endeksi (1 = ortalama il)
  maliyet: number;       // işletme maliyet endeksi (elektrik, hizmet, malzeme)
  talep: number;         // kafe talebi endeksi (nüfus × gelir × çekim)
  profil: Segments;      // müşteri profili (toplam 1)
}

/** [gelir, turizm, öğrenci, sanayi] — bilinen şehirler için elle ayarlanmış değerler. */
const OVERRIDE: Record<number, [number, number, number, number]> = {
  34: [1.55, 0.9, 0.7, 0.6], 6: [1.35, 0.35, 0.85, 0.4], 35: [1.25, 0.75, 0.7, 0.5], 16: [1.12, 0.35, 0.55, 0.85], 41: [1.25, 0.2, 0.4, 0.95],
  7: [1.1, 1.0, 0.45, 0.2], 48: [1.2, 1.0, 0.35, 0.15], 26: [1.05, 0.3, 1.0, 0.45], 61: [0.98, 0.55, 0.55, 0.25], 55: [0.96, 0.3, 0.55, 0.3],
  60: [0.82, 0.25, 0.35, 0.2], 27: [0.92, 0.4, 0.45, 0.7], 42: [0.92, 0.35, 0.65, 0.5], 38: [1.0, 0.3, 0.55, 0.6], 25: [0.8, 0.2, 0.7, 0.1],
  50: [0.85, 0.95, 0.2, 0.1], 9: [1.0, 0.7, 0.35, 0.3], 20: [1.0, 0.55, 0.45, 0.6], 33: [0.95, 0.55, 0.45, 0.5], 1: [0.88, 0.35, 0.5, 0.55],
  31: [0.8, 0.5, 0.35, 0.4], 21: [0.75, 0.3, 0.5, 0.2], 63: [0.7, 0.45, 0.4, 0.2], 47: [0.72, 0.65, 0.25, 0.1], 65: [0.68, 0.35, 0.55, 0.05],
  17: [1.0, 0.65, 0.65, 0.3], 22: [0.98, 0.35, 0.55, 0.3], 59: [1.12, 0.4, 0.3, 0.8], 54: [1.05, 0.35, 0.5, 0.7], 10: [0.98, 0.6, 0.4, 0.35],
  45: [0.98, 0.3, 0.45, 0.55], 14: [1.0, 0.55, 0.45, 0.3], 53: [0.9, 0.5, 0.3, 0.1], 77: [1.0, 0.5, 0.2, 0.3], 15: [0.9, 0.35, 0.4, 0.2],
  32: [0.9, 0.35, 0.55, 0.2], 3: [0.82, 0.4, 0.35, 0.25], 44: [0.82, 0.25, 0.6, 0.3], 23: [0.82, 0.2, 0.45, 0.15], 81: [0.95, 0.3, 0.3, 0.5],
  67: [0.9, 0.2, 0.4, 0.5], 78: [0.9, 0.3, 0.4, 0.5], 74: [0.88, 0.35, 0.3, 0.2], 57: [0.85, 0.5, 0.2, 0.1], 43: [0.85, 0.3, 0.45, 0.3],
  64: [0.85, 0.2, 0.35, 0.4], 70: [0.82, 0.3, 0.3, 0.2], 51: [0.82, 0.25, 0.3, 0.2], 52: [0.85, 0.35, 0.3, 0.2], 28: [0.85, 0.3, 0.25, 0.15],
  58: [0.82, 0.25, 0.45, 0.15], 19: [0.82, 0.2, 0.3, 0.3], 5: [0.85, 0.3, 0.25, 0.15], 8: [0.82, 0.35, 0.15, 0.1], 36: [0.7, 0.2, 0.3, 0.05], 76: [0.68, 0.1, 0.2, 0.05],
};
const KIYI = new Set([1, 7, 9, 10, 17, 28, 31, 33, 34, 35, 37, 39, 41, 48, 52, 53, 54, 55, 57, 59, 61, 67, 74, 77, 81, 8, 16]);
const REGION_DEFAULT: Record<Region, [number, number, number, number]> = { M: [1.0, 0.35, 0.4, 0.5], E: [0.95, 0.45, 0.4, 0.35], A: [0.9, 0.45, 0.35, 0.3], I: [0.88, 0.25, 0.4, 0.3], K: [0.86, 0.3, 0.3, 0.2], D: [0.72, 0.2, 0.35, 0.1], G: [0.72, 0.25, 0.3, 0.15] };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function derive(id: number, region: Region, nufus: number): Omit<City, 'id' | 'ad' | 'region' | 'nufus' | 'lon' | 'lat' | 'path'> {
  const [gelir, turizm, ogrenci, sanayi] = OVERRIDE[id] ?? REGION_DEFAULT[region];
  const size = clamp((Math.log10(nufus) - 1.9) / 2.3, 0, 1);                   // 85 bin → 0, 15,7 milyon → 1
  const kira = clamp(0.5 + 2.1 * Math.pow(size, 1.15) * (0.82 + 0.3 * gelir), 0.5, 3.4);
  const rekabet = clamp(0.15 + 0.7 * Math.pow(size, 0.75) + 0.12 * (gelir - 1), 0.1, 0.95);
  const maliyet = clamp(0.85 + 0.35 * size + 0.1 * (gelir - 1), 0.82, 1.4);
  const talep = nufus * gelir * (1 + 0.5 * turizm + 0.35 * ogrenci) / 1000;     // milyon "etkin kişi"
  const s = { ogr: 0.1 + 0.45 * ogrenci, cal: 0.2 + 0.4 * sanayi + 0.1 * size, tur: 0.04 + 0.5 * turizm, aile: 0.25 - 0.06 * ogrenci, emk: 0.2 - 0.1 * (ogrenci + turizm) / 2 + 0.05 * (1 - size) };
  const tot = s.ogr + s.cal + s.tur + s.aile + s.emk;
  const profil: Segments = { ogr: s.ogr / tot, cal: s.cal / tot, tur: s.tur / tot, aile: s.aile / tot, emk: s.emk / tot };
  return { gelir, turizm, ogrenci, sanayi, kiyi: KIYI.has(id), rekabet, kira, maliyet, talep, profil };
}

export const MAP_W: number = raw.w;
export const MAP_H: number = raw.h;
export const CITIES: City[] = raw.iller.map((r) => ({
  id: r.id, ad: r.ad, region: r.bolge as Region, nufus: r.nufus, lon: r.lon, lat: r.lat, path: r.path, ...derive(r.id, r.bolge as Region, r.nufus),
}));
export const cityById = (id: number): City => { const c = CITIES[id - 1]; if (!c) throw new Error('il yok: ' + id); return c; };
