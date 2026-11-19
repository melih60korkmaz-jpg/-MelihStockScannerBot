import type { GameState } from '../core/types';
import { LEVEL_DEFS } from '../data';
import { emblemSvg } from './emblem';
import { h } from './dom';

export type Phase = 'gece' | 'safak' | 'gunduz' | 'aksam';
/** Gerçek yerel saate göre gökyüzü evresi (gün doğumu / gündüz / akşam / gece). */
export const phaseNow = (d = new Date()): Phase => { const hr = d.getHours(); return hr < 5 || hr >= 21 ? 'gece' : hr < 8 ? 'safak' : hr < 17 ? 'gunduz' : 'aksam'; };
export const SKY: Record<Phase, [string, string, string]> = { gece: ['#0b0c10', '#1a1b24', '#2a2230'], safak: ['#2b2540', '#8a4a58', '#e0a070'], gunduz: ['#34507a', '#6f8fb5', '#c9d3dc'], aksam: ['#241d33', '#7a3a4f', '#e08a5a'] };

const hashStr = (s: string) => { let x = 2166136261; for (const c of s) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0; return x; };
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/**
 * Şirket ana ekranı şehir manzarası. Tamamı GERÇEK oyun verisinden türer:
 * şirket seviyesi → silüetin yoğunluğu ve kule yüksekliği; devam eden inşaat sayısı → vinçler; ilk aktif projenin ilerlemesi → yapım halindeki bina.
 * Hafif bulutlar CSS ile (hareket azaltma açıksa durur). Yalnızca Şirket sekmesi açıkken kurulur.
 */
export function heroBanner(s: GameState, now = new Date()): HTMLElement {
  const c = s.company!, lvl = c.level, W = 1200, H = 120, ph = phaseNow(now), night = ph === 'gece', [t0, t1, t2] = SKY[ph];
  const active = s.projects.filter((p) => p.status === 'insaat'), r = rng(hashStr(c.name) ^ (lvl * 977));
  const lit = night ? 0.8 : ph === 'aksam' || ph === 'safak' ? 0.35 : 0.08, wallFar = night ? '#15161c' : '#3b3f55', wallMid = night ? '#1d1e25' : '#4a4d63', wallNear = night ? '#26272e' : '#2e3038';
  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Şirket şehir manzarası"><defs><linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t0}"/><stop offset=".6" stop-color="${t1}"/><stop offset="1" stop-color="${t2}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#hsky)"/>`;
  if (night) { for (let i = 0; i < 55; i++) svg += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 60).toFixed(0)}" r="${(0.4 + r() * 0.8).toFixed(1)}" fill="#F2F0F0" opacity="${(0.3 + r() * 0.5).toFixed(2)}"/>`; svg += `<circle cx="${W * 0.82}" cy="24" r="9" fill="#e9e4dc"/><circle cx="${W * 0.82 + 4}" cy="22" r="8" fill="${t0}"/>`; }
  else { const sx = ph === 'safak' ? W * 0.18 : ph === 'aksam' ? W * 0.84 : W * 0.7, sy = ph === 'gunduz' ? 24 : 70; svg += `<circle cx="${sx}" cy="${sy}" r="${ph === 'gunduz' ? 11 : 16}" fill="${ph === 'gunduz' ? '#fff3c9' : '#ffd9a0'}" opacity=".95"/>`; }
  // katmanlı silüet: uzak / orta / yakın. Seviye yükseldikçe daha yoğun ve yüksek.
  const layer = (n: number, hMin: number, hMax: number, base: number, fill: string, windows: boolean) => {
    let out = ''; const bw = W / n;
    for (let i = 0; i < n; i++) {
      const w = bw * (0.75 + r() * 0.5), x = i * bw + (bw - w) / 2, hh = hMin + r() * (hMax - hMin) * (0.35 + Math.min(1, lvl / 6) * 0.65), y = base - hh;
      out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${hh.toFixed(1)}" fill="${fill}"/>`;
      if (windows && lit > 0.05) { const cols = Math.max(1, Math.floor(w / 6)), rows = Math.floor(hh / 8); for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) if (r() < 0.38) out += `<rect x="${(x + 2 + cc * 6).toFixed(1)}" y="${(y + 3 + rr * 8).toFixed(1)}" width="2.6" height="3.4" fill="${night ? '#ffd9a0' : '#ffe6c2'}" opacity="${(lit * (0.5 + r() * 0.5)).toFixed(2)}"/>`; }
      if (hh > 60 && i % 3 === 0) out += `<rect x="${(x + w / 2 - 0.6).toFixed(1)}" y="${(y - 8).toFixed(1)}" width="1.2" height="8" fill="${fill}"/>${night ? `<circle cx="${(x + w / 2).toFixed(1)}" cy="${(y - 8).toFixed(1)}" r="1.4" fill="#ff4d5a"/>` : ''}`;
    }
    return out;
  };
  const dens = 12 + lvl * 4;
  svg += layer(dens + 4, 14, 52, 96, wallFar, false) + layer(dens + 1, 16, 70, 104, wallMid, true) + layer(Math.max(4, dens - 2), 12, 46 + lvl * 4, 114, wallNear, true);
  // yapım halindeki bina + vinçler: aktif proje sayısı kadar (en çok 3)
  const cranes = Math.min(3, active.length);
  for (let i = 0; i < cranes; i++) {
    const p = active[i]!, prog = p.build ? Math.min(1, (p.build.stage + p.build.progress) / 18) : 0, x = 170 + i * 330 + r() * 40, bh = 12 + prog * 46, top = 114 - bh;
    svg += `<rect x="${x}" y="${top.toFixed(1)}" width="34" height="${bh.toFixed(1)}" fill="#2a2b31" stroke="#5b5d66" stroke-width=".6"/>`;
    for (let f = 0; f < Math.floor(bh / 7); f++) svg += `<line x1="${x}" x2="${x + 34}" y1="${(114 - f * 7).toFixed(1)}" y2="${(114 - f * 7).toFixed(1)}" stroke="#5b5d66" stroke-width=".5"/>`;
    const cx = x + 42, ct = 114 - Math.max(70, bh + 26);
    svg += `<g class="hcrane" style="transform-origin:${cx}px ${ct}px"><rect x="${cx - 1.2}" y="${ct}" width="2.4" height="${114 - ct}" fill="#C64252"/><line x1="${cx - 40}" x2="${cx + 26}" y1="${ct}" y2="${ct}" stroke="#C64252" stroke-width="2"/><line x1="${cx - 36}" x2="${cx - 36}" y1="${ct}" y2="${ct + 18}" stroke="#A5A1A3" stroke-width=".7"/><rect x="${cx - 40}" y="${ct + 18}" width="8" height="5" fill="#A5A1A3"/></g>`;
    if (night) svg += `<circle cx="${cx}" cy="${ct - 2}" r="1.6" fill="#ff4d5a" class="hblink"/>`;
  }
  svg += `<rect x="0" y="114" width="${W}" height="6" fill="#0d0e10"/></svg>`;
  const clouds = ph === 'gece' ? '' : `<i class="hcl c1"></i><i class="hcl c2"></i><i class="hcl c3"></i>`;
  const title = LEVEL_DEFS[lvl - 1]!.label;
  return h('div', { class: `hero ph-${ph}`, role: 'button', tabindex: '0', 'aria-label': 'Genel merkezi aç', html: `<div class="hsvg">${svg}</div>${clouds}<div class="hid"><span class="hem">${emblemSvg(c.emblem.shape, c.emblem.color, 44)}</span><div><b>${c.name.replace(/[<>&]/g, '')}</b><small>${title} · ${active.length ? `${active.length} şantiye aktif` : 'şantiye yok'}</small></div></div><span class="hgo">Genel Merkez ▸</span>` });
}
