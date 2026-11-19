import { formatMoney, type Money } from '../core/money';
import { h } from './dom';

const W = 600;
const nice = (a: number, b: number) => { const pad = (b - a || Math.abs(a) || 1) * 0.12; return [a - pad, b + pad] as const; };

export function sparkline(values: number[], color = '#F5B700', h2 = 34): string {
  if (values.length < 2) return '';
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${h2 - 3 - ((v - min) / span) * (h2 - 6)}`).join(' ');
  return `<svg viewBox="0 0 100 ${h2}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}

interface Pt { label: string; value: number }

function frame(pts: Pt[], fmt: (n: number) => string, build: (x: (i: number) => number, y: (v: number) => number, lo: number, hi: number, H: number) => string, H: number, min: number, max: number, mode: 'line' | 'bar') {
  const wrap = h('div', { class: 'chart' });
  if (pts.length < 2) { wrap.append(h('div', { class: 'empty' }, 'Grafik için en az 2 aylık veri gerekir; her ayın başında güncellenir.')); return wrap; }
  const [lo, hi] = nice(Math.min(min, ...pts.map((p) => p.value)), Math.max(max, ...pts.map((p) => p.value)));
  const L = 56, R = 8, T = 8, B = 20, pw = W - L - R, ph = H - T - B;
  const y = (v: number) => T + ph - ((v - lo) / (hi - lo)) * ph;
  const x = (i: number) => mode === 'bar' ? L + ((i + 0.5) / pts.length) * pw : L + (i / (pts.length - 1)) * pw;
  const grid = [0, 0.5, 1].map((f) => { const v = lo + (hi - lo) * f; return `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${fmt(v)}</text>`; }).join('');
  const step = Math.max(1, Math.ceil(pts.length / 6));
  const xl = pts.map((p, i) => (i % step === 0 || i === pts.length - 1 ? `<text class="ax" x="${x(i)}" y="${H - 5}" text-anchor="${i === pts.length - 1 && pts.length > 2 ? 'end' : i === 0 && mode === 'line' ? 'start' : 'middle'}">${p.label}</text>` : '')).join('');
  const svg = h('div', { html: `<svg viewBox="0 0 ${W} ${H}" role="img">${grid}${build(x, y, lo, hi, H)}${xl}<g class="cur"></g></svg>` }).firstElementChild as SVGSVGElement;
  const rd = h('div', { class: 'rd' }, 'Değeri görmek için grafiğe dokunun.');
  const cur = svg.querySelector('.cur')!;
  const pick = (e: PointerEvent) => {
    const r = svg.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W;
    let i = mode === 'bar' ? Math.floor(((px - L) / pw) * pts.length) : Math.round(((px - L) / pw) * (pts.length - 1));
    i = Math.max(0, Math.min(pts.length - 1, i)); const p = pts[i]!;
    cur.innerHTML = `<line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${T + ph}" stroke="#fff" stroke-opacity=".35"/>` + (mode === 'line' ? `<circle cx="${x(i)}" cy="${y(p.value)}" r="5" fill="#F5B700" stroke="#fff" stroke-width="2"/>` : '');
    rd.innerHTML = `<b>${p.label}</b> · ${fmt(p.value)}`;
  };
  svg.addEventListener('pointerdown', pick); svg.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') pick(e); });
  wrap.append(svg, rd); return wrap;
}

export function lineChart(pts: Pt[], fmt: (n: number) => string = (n) => formatMoney(n as Money), H = 170): HTMLElement {
  return frame(pts, fmt, (x, y, _lo, _hi, Hh) => {
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
    return `<defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#F5B700" stop-opacity=".35"/><stop offset="1" stop-color="#F5B700" stop-opacity="0"/></linearGradient></defs>
      <path d="${d}L${x(pts.length - 1)},${Hh - 20}L${x(0)},${Hh - 20}Z" fill="url(#lg)"/><path d="${d}" fill="none" stroke="#F5B700" stroke-width="2.5" stroke-linejoin="round"/>`;
  }, H, Infinity, -Infinity, 'line');
}

/** Çubuklar: işaretli veride yeşil = kâr/artış, kırmızı = zarar/azalış (renk yalnızca bu anlamda kullanılır). */
export function barChart(pts: Pt[], fmt: (n: number) => string = (n) => formatMoney(n as Money), H = 170): HTMLElement {
  return frame(pts, fmt, (x, y) => {
    const bw = Math.min(34, ((W - 64) / pts.length) * 0.66), z = y(0);
    return `<line class="gl" x1="56" x2="${W - 8}" y1="${z}" y2="${z}" stroke="#ffffff30"/>` + pts.map((p, i) => {
      const yy = y(p.value), top = Math.min(yy, z), hh = Math.max(1.5, Math.abs(yy - z));
      return `<rect x="${x(i) - bw / 2}" y="${top}" width="${bw}" height="${hh}" rx="3" fill="${p.value >= 0 ? '#2ECC8F' : '#E5484D'}"/>`;
    }).join('');
  }, H, 0, 0, 'bar');
}

export function hbars(items: { label: string; value: number }[], fmt: (n: number) => string = (n) => formatMoney(n as Money)): HTMLElement {
  const max = Math.max(1, ...items.map((i) => i.value));
  const w = h('div', {});
  if (!items.length) w.append(h('div', { class: 'empty' }, 'Henüz gider kaydı yok.'));
  for (const it of items) w.append(h('div', { class: 'hb' }, h('span', {}, it.label), h('div', { class: 'bar' }, h('i', { style: `width:${Math.max(2, (it.value / max) * 100)}%` })), h('span', {}, fmt(it.value))));
  return w;
}
