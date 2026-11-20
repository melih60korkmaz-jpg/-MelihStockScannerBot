import { formatMoney, type Money } from '../core/money';
import { h } from './dom';

const W = 600;
const nice = (a: number, b: number) => { const pad = (b - a || Math.abs(a) || 1) * 0.12; return [a - pad, b + pad] as const; };

export function sparkline(values: number[], color = '#C64252', h2 = 34): string {
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
    cur.innerHTML = `<line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${T + ph}" stroke="#fff" stroke-opacity=".35"/>` + (mode === 'line' ? `<circle cx="${x(i)}" cy="${y(p.value)}" r="5" fill="#C64252" stroke="#fff" stroke-width="2"/>` : '');
    rd.innerHTML = `<b>${p.label}</b> · ${fmt(p.value)}`;
  };
  svg.addEventListener('pointerdown', pick); svg.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') pick(e); });
  wrap.append(svg, rd); return wrap;
}

export function lineChart(pts: Pt[], fmt: (n: number) => string = (n) => formatMoney(n as Money), H = 170): HTMLElement {
  return frame(pts, fmt, (x, y, _lo, _hi, Hh) => {
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
    return `<defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#C64252" stop-opacity=".35"/><stop offset="1" stop-color="#C64252" stop-opacity="0"/></linearGradient></defs>
      <path class="ar" d="${d}L${x(pts.length - 1)},${Hh - 20}L${x(0)},${Hh - 20}Z" fill="url(#lg)"/><path class="ln" pathLength="1" d="${d}" fill="none" stroke="#C64252" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  }, H, Infinity, -Infinity, 'line');
}

/** Çubuklar: işaretli veride yeşil = kâr/artış, kırmızı = zarar/azalış (renk yalnızca bu anlamda kullanılır). */
export function barChart(pts: Pt[], fmt: (n: number) => string = (n) => formatMoney(n as Money), H = 170): HTMLElement {
  return frame(pts, fmt, (x, y) => {
    const bw = Math.min(34, ((W - 64) / pts.length) * 0.66), z = y(0);
    return `<line class="gl" x1="56" x2="${W - 8}" y1="${z}" y2="${z}" stroke="#ffffff30"/>` + pts.map((p, i) => {
      const yy = y(p.value), top = Math.min(yy, z), hh = Math.max(1.5, Math.abs(yy - z));
      return `<rect class="br" style="--i:${i};transform-origin:center ${p.value >= 0 ? 'bottom' : 'top'}" x="${x(i) - bw / 2}" y="${top}" width="${bw}" height="${hh}" rx="3" fill="${p.value >= 0 ? '#3FBF8A' : '#FF4D5A'}"/>`;
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

/** Gelir–gider karşılaştırması: aynı ayın iki çubuğu (gelir bordo, gider gri). Veriler defterden gelir. */
export function pairBars(pts: { label: string; a: number; b: number }[], fmt: (n: number) => string = (n) => formatMoney(n as Money), H = 150): HTMLElement {
  const wrap = h('div', { class: 'chart' });
  if (!pts.length) { wrap.append(h('div', { class: 'empty' }, 'Henüz aylık veri yok.')); return wrap; }
  const max = Math.max(1, ...pts.flatMap((p) => [p.a, p.b])), L = 56, R = 8, T = 8, B = 20, pw = W - L - R, ph = H - T - B, gw = pw / pts.length, bw = Math.min(22, gw * 0.34), y = (v: number) => T + ph - (v / max) * ph;
  const grid = [0, 0.5, 1].map((f) => `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(max * f)}" y2="${y(max * f)}"/><text class="ax" x="${L - 6}" y="${y(max * f) + 3}" text-anchor="end">${fmt(max * f)}</text>`).join('');
  const bars = pts.map((p, i) => { const cx = L + gw * (i + 0.5); return `<rect class="br" style="--i:${i * 2};transform-origin:center bottom" x="${cx - bw - 1}" y="${y(p.a)}" width="${bw}" height="${Math.max(1.5, T + ph - y(p.a))}" rx="3" fill="#C64252"/><rect class="br" style="--i:${i * 2 + 1};transform-origin:center bottom" x="${cx + 1}" y="${y(p.b)}" width="${bw}" height="${Math.max(1.5, T + ph - y(p.b))}" rx="3" fill="#737277"/><text class="ax" x="${cx}" y="${H - 5}" text-anchor="middle">${p.label}</text>`; }).join('');
  const rd = h('div', { class: 'rd' }, h('span', { class: 'lgd' }, h('i', { style: 'background:#C64252' }), 'Gelir'), h('span', { class: 'lgd' }, h('i', { style: 'background:#737277' }), 'Gider'));
  const svg = h('div', { html: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Aylık gelir ve gider">${grid}${bars}</svg>` }).firstElementChild!;
  svg.addEventListener('pointerdown', (ev) => { const e = ev as PointerEvent; const r = (svg as SVGSVGElement).getBoundingClientRect(), i = Math.max(0, Math.min(pts.length - 1, Math.floor((((e.clientX - r.left) / r.width) * W - L) / gw))), p = pts[i]!; rd.innerHTML = `<b>${p.label}</b> · Gelir ${fmt(p.a)} · Gider ${fmt(p.b)} · Net ${fmt(p.a - p.b)}`; });
  wrap.append(svg, rd); return wrap;
}

const DONUT_COLORS = ['#C64252', '#E0A13A', '#8E919B', '#3FBF8A', '#A83246', '#5B8DEF', '#737277'];
/** Halka grafik + yüzdeli açıklama. Dilimler gerçek tutarlardan; küçük kalemler "Diğer"de toplanır (en çok 6 dilim). */
export function donut(items: { label: string; value: number }[], fmt: (n: number) => string = (n) => formatMoney(n as Money)): HTMLElement {
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value), top = sorted.slice(0, 6), rest = sorted.slice(6).reduce((a, i) => a + i.value, 0), parts = rest > 0 ? [...top, { label: 'Diğer', value: rest }] : top, total = parts.reduce((a, i) => a + i.value, 0) || 1;
  const R = 15.9155; let off = 0, segs = '';
  parts.forEach((p, i) => { const f = (p.value / total) * 100; segs += `<circle r="${R}" cx="21" cy="21" fill="none" stroke="${DONUT_COLORS[i % DONUT_COLORS.length]}" stroke-width="6" stroke-dasharray="${f.toFixed(2)} ${(100 - f).toFixed(2)}" stroke-dashoffset="${(25 - off).toFixed(2)}" class="dseg" style="animation-delay:${i * 70}ms"/>`; off += f; });
  const wrap = document.createElement('div'); wrap.className = 'donutw';
  wrap.innerHTML = `<svg viewBox="0 0 42 42" class="donut" role="img" aria-label="Dağılım"><circle r="${R}" cx="21" cy="21" fill="none" stroke="#27282D" stroke-width="6"/>${segs}<text x="21" y="22.5" text-anchor="middle" font-size="5" font-weight="700" fill="#F2F0F0">${fmt(total)}</text></svg><ul class="dleg">${parts.map((p, i) => `<li><i style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></i><span>${p.label}</span><b>%${Math.round((p.value / total) * 100)}</b></li>`).join('')}</ul>`;
  return wrap;
}
