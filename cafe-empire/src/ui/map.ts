import { CITIES, MAP_H, MAP_W, REGION_NAME, type City } from '../data/turkey';
import type { GameState } from '../core/types';

export type Metric = 'bolge' | 'talep' | 'kira' | 'rekabet' | 'turizm' | 'ogrenci' | 'gelir';
export const METRICS: Array<[Metric, string]> = [['bolge', 'Bölge'], ['talep', 'Kafe talebi'], ['kira', 'Kira'], ['rekabet', 'Rekabet'], ['turizm', 'Turizm'], ['ogrenci', 'Öğrenci'], ['gelir', 'Gelir']];
const REGION_COLOR: Record<string, string> = { M: '#4d7ea8', E: '#5aa38a', A: '#c99a4a', I: '#a38b6a', K: '#4f9a62', D: '#8a6fa3', G: '#c0705a' };
const cent = new Map<number, [number, number]>();
export function centroid(c: City): [number, number] {
  let r = cent.get(c.id); if (r) return r; const n = c.path.match(/-?\d+(\.\d+)?/g) ?? []; let sx = 0, sy = 0, k = 0; for (let i = 0; i + 1 < n.length; i += 2) { sx += +n[i]!; sy += +n[i + 1]!; k++; } r = [sx / Math.max(1, k), sy / Math.max(1, k)]; cent.set(c.id, r); return r;
}
const ramp = (t: number): string => { t = Math.max(0, Math.min(1, t)); const a = [48, 78, 98], b = [244, 182, 96]; return `rgb(${Math.round(a[0]! + (b[0]! - a[0]!) * t)},${Math.round(a[1]! + (b[1]! - a[1]!) * t)},${Math.round(a[2]! + (b[2]! - a[2]!) * t)})`; };
export function metricValue(c: City, m: Metric): number {
  switch (m) { case 'talep': return Math.min(1, Math.log(1 + c.talep * 1.2) / 3.9); case 'kira': return Math.min(1, (c.kira - 0.5) / 2.9); case 'rekabet': return c.rekabet; case 'turizm': return c.turizm; case 'ogrenci': return c.ogrenci; case 'gelir': return (c.gelir - 0.6) / 1.0; default: return 0; }
}
export function mapSvg(s: GameState | null, metric: Metric, selected: number): string {
  const pins: string[] = []; const by: Record<number, number> = {}; if (s) for (const b of s.subeler) by[b.city] = (by[b.city] ?? 0) + 1;
  const paths = CITIES.map((c) => `<path class="il${c.id === selected ? ' sel' : ''}" data-il="${c.id}" d="${c.path}" fill="${metric === 'bolge' ? REGION_COLOR[c.region] : ramp(metricValue(c, metric))}"><title>${c.ad}</title></path>`).join('');
  for (const id of Object.keys(by)) { const c = CITIES[+id - 1]!, [x, y] = centroid(c); pins.push(`<g class="pin"><circle cx="${x}" cy="${y}" r="13"/><text x="${x}" y="${y}">${by[+id]! > 1 ? by[+id] : '☕'}</text></g>`); }
  return `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" role="img" aria-label="Türkiye haritası">${paths}${pins.join('')}</svg>`;
}
export const regionName = (c: City) => REGION_NAME[c.region];
