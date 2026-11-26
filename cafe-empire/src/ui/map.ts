import { CITIES, cityById, MAP_H, MAP_W, REGION_NAME, type City } from '../data/turkey';
import type { GameState } from '../core/types';
import { ilDurum } from '../core/region';
import { ilceDurum } from '../core/region';
import { ILCELER, ilcelerOf, ilceKey, ilceOf, profilOf, type Ilce } from '../data/regions';

export type Metric = 'erisim' | 'bolge' | 'talep' | 'kira' | 'rekabet' | 'turizm' | 'ogrenci' | 'gelir';
export const METRICS: Array<[Metric, string]> = [['erisim', 'Erişim'], ['bolge', 'Bölge'], ['talep', 'Kafe talebi'], ['kira', 'Kira'], ['rekabet', 'Rekabet'], ['turizm', 'Turizm'], ['ogrenci', 'Öğrenci'], ['gelir', 'Gelir']];
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

/* ===================== Bölge (il / ilçe) haritası ===================== */
export interface Fx { k: 'il' | 'ilce' | 'sube'; id: string; t: number }
export type VB = [number, number, number, number];
export const NAT_VB: VB = [0, 0, MAP_W, MAP_H];
const boxes = new Map<number, [number, number, number, number]>();
export function pathBox(c: City): [number, number, number, number] {
  let b = boxes.get(c.id); if (b) return b; const n = (c.path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]!); x1 = Math.max(x1, n[i]!); y0 = Math.min(y0, n[i + 1]!); y1 = Math.max(y1, n[i + 1]!); } b = [x0, y0, x1, y1]; boxes.set(c.id, b); return b;
}
/** İli ekrana oturtan görünüm kutusu (ulusal harita oranında, ortalanmış). */
export function zoomVb(il: number): VB {
  const [x0, y0, x1, y1] = pathBox(cityById(il)), r = MAP_W / MAP_H; let w = (x1 - x0) * 1.18, h = (y1 - y0) * 1.18; if (w / h < r) w = h * r; else h = w / r; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; return [cx - w / 2, cy - h / 2, w, h];
}
export interface RegOpts { metric: Metric; sel: number; zoomIl: number | null; selIlce: number | null; vb: VB; fx: Fx[]; now: number; lv: number; start?: boolean }
const STATE_FILL = { acik: '#c98a3c', satilik: '#2f6b6f', kilitli: '#34404d' } as const;
export function regionMap(s: GameState, o: RegOpts): string {
  const recent = (k: Fx['k'], id: string): boolean => o.fx.some((f) => f.k === k && f.id === id && o.now - f.t < 1600);
  const by: Record<number, number> = {}, byI: Record<string, number> = {}; for (const b of s.subeler) { by[b.city] = (by[b.city] ?? 0) + 1; if (b.ilce) byI[b.ilce] = (byI[b.ilce] ?? 0) + 1; }
  const z = o.zoomIl; const vbw = o.vb[2];
  const paths = CITIES.map((c) => {
    const st = ilDurum(s, c.id, o.lv), isZ = z === c.id; let fill: string;
    if (o.metric === 'erisim' || o.metric === 'bolge') fill = o.metric === 'bolge' ? REGION_COLOR[c.region]! : STATE_FILL[st.d]; else fill = ramp(metricValue(c, o.metric));
    const cl = `il ${st.d === 'acik' ? 'open' : st.d === 'satilik' ? 'buy' : 'lock'}${c.id === o.sel ? ' sel' : ''}${isZ ? ' zin' : ''}${recent('il', String(c.id)) ? ' pop' : ''}`;
    return `<path class="${cl}" data-il="${c.id}" d="${c.path}" fill="${fill}" style="${z !== null && !isZ ? 'opacity:.28' : st.d === 'kilitli' && o.metric !== 'bolge' && o.metric !== 'erisim' ? 'opacity:.5' : ''}"><title>${c.ad}</title></path>`;
  }).join('');
  let ilceLayer = '', labels = '';
  if (z !== null) {
    const L = ilcelerOf(z);
    ilceLayer = L.map((d) => {
      const dd = o.start ? { d: 'satilik' as const } : ilceDurum(s, d), p = profilOf(d); let fill: string;
      if (o.metric === 'talep') fill = ramp(Math.min(1, p.talep / 2)); else if (o.metric === 'gelir') fill = ramp((p.gelir - 0.5) / 1.0); else if (o.metric === 'kira') fill = ramp((p.kira - 0.5) / 1.1); else fill = o.start ? ramp(Math.min(1, p.talep / 2)) : STATE_FILL[dd.d];
      const cl = `ilce ${dd.d === 'acik' ? 'open' : dd.d === 'satilik' ? 'buy' : 'lock'}${d.id === o.selIlce ? ' sel' : ''}${recent('ilce', ilceKey(d)) ? ' pop' : ''}`;
      return `<path class="${cl}" data-ilce="${d.id}" d="${d.path}" fill="${fill}"><title>${d.ad}</title></path>`;
    }).join('');
    const fs = (vbw / 52).toFixed(2); const med = [...L].map((d) => d.km2).sort((a, b) => a - b)[Math.floor(L.length / 2)] ?? 0; labels = vbw > MAP_W * 0.6 ? '' : L.filter((d) => d.km2 >= med * 1.3 || d.id === o.selIlce || byI[ilceKey(d)]).map((d) => `<text class="ilad" x="${d.c[0]}" y="${d.c[1]}" font-size="${fs}">${d.ad}</text>`).join('');
  }
  const pins: string[] = [], fxs: string[] = [];
  if (z === null) { for (const id of Object.keys(by)) { const c = CITIES[+id - 1]!, [x, y] = centroid(c); pins.push(`<g class="pin${recent('sube', id) ? ' drop' : ''}"><circle cx="${x}" cy="${y}" r="${(vbw / 110).toFixed(1)}"/><text x="${x}" y="${y}" font-size="${(vbw / 95).toFixed(1)}">${by[+id]! > 1 ? by[+id] : '☕'}</text></g>`); } }
  else for (const k of Object.keys(byI)) { const d = ilceOf(k); if (!d || d.il !== z) continue; pins.push(`<g class="pin${recent('sube', k) ? ' drop' : ''}"><circle cx="${d.c[0]}" cy="${d.c[1] - vbw / 80}" r="${(vbw / 70).toFixed(2)}"/><text x="${d.c[0]}" y="${d.c[1] - vbw / 80}" font-size="${(vbw / 60).toFixed(2)}">${byI[k]! > 1 ? byI[k] : '☕'}</text></g>`); }
  for (const f of o.fx) { if (o.now - f.t > 1600) continue; let x = 0, y = 0; if (f.k === 'il') { [x, y] = centroid(cityById(+f.id)); } else { const d = ilceOf(f.id); if (!d) continue; [x, y] = d.c; } fxs.push(`<circle class="ripple" cx="${x}" cy="${y}" r="${(z === null ? vbw / 45 : vbw / 30).toFixed(1)}"/><circle class="ripple r2" cx="${x}" cy="${y}" r="${(z === null ? vbw / 45 : vbw / 30).toFixed(1)}"/>`); }
  return `<svg id="mapsvg" viewBox="${o.vb.map((v) => v.toFixed(2)).join(' ')}" role="img" aria-label="Türkiye haritası">${paths}${ilceLayer}${labels}${pins.join('')}${fxs.join('')}</svg>`;
}
export { ILCELER, type Ilce };
