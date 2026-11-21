import { h } from './dom';

/**
 * Canlı hisse grafiği: yumuşatılmış çizgi + alan, 20 günlük ortalama, halka arz seviyesi, nabız atan son fiyat noktası.
 * Veri her oyun günü gelir; `update` yalnızca yolu ve metinleri günceller (yeniden kurmaz). Renk son değişime göre yeşil/kırmızı.
 */
const RANGES: [string, number][] = [['1 ay', 30], ['3 ay', 90], ['6 ay', 180]];
const W = 640, H = 190, PL = 8, PR = 58, PT = 12, PB = 18;
export function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0]![0].toFixed(1)},${pts[0]![1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i]!, [nx, ny] = pts[i + 1]!; d += ` Q${x.toFixed(1)},${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)},${((y + ny) / 2).toFixed(1)}`; }
  const l = pts[pts.length - 1]!; return d + ` T${l[0].toFixed(1)},${l[1].toFixed(1)}`;
}
export const sma = (v: number[], n: number): (number | null)[] => v.map((_, i) => (i < n - 1 ? null : v.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n));

export function stockChart(fmt: (n: number) => string, ipo: number) {
  let range = 90, hist: number[] = [];
  const head = h('div', { class: 'schead' }), price = h('b', { class: 'scprice' }), chg = h('span', { class: 'scchg' }), sub = h('small', { class: 'mute scsub' });
  head.append(price, chg, sub);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'scsvg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Hisse fiyat grafiği');
  const chips = h('div', { class: 'seg scrange' }, ...RANGES.map(([l, n]) => h('button', { class: n === range ? 'on' : '', onclick: () => { range = n; chips.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', RANGES[i]![1] === n)); paint(false); } }, l)));
  const el = h('div', { class: 'sc' }, head, svg, chips);
  const paint = (tick: boolean) => {
    const data = hist.slice(-range); if (data.length < 2) { svg.innerHTML = ''; price.textContent = data.length ? fmt(data[0]!) : '—'; return; }
    const ma = sma(hist, 20).slice(-range), lo0 = Math.min(...data, ...ma.filter((x): x is number => x !== null)), hi0 = Math.max(...data, ...ma.filter((x): x is number => x !== null)), pad = (hi0 - lo0) * 0.12 || hi0 * 0.02, lo = lo0 - pad, hi = hi0 + pad;
    const x = (i: number) => PL + (i / (data.length - 1)) * (W - PL - PR), y = (v: number) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
    const pts = data.map((v, i) => [x(i), y(v)] as [number, number]), last = pts[pts.length - 1]!, up = data[data.length - 1]! >= data[Math.max(0, data.length - 2)]!, col = data[data.length - 1]! >= data[0]! ? '#3FBF8A' : '#FF4D5A'; // renk: seçili aralığın genel yönü (günlük titremede renk değişmez)
    const line = smoothPath(pts), area = `${line} L${last[0]},${H - PB} L${pts[0]![0]},${H - PB} Z`;
    const maPts = ma.map((v, i) => (v === null ? null : [x(i), y(v)] as [number, number])).filter((p): p is [number, number] => p !== null);
    let grid = ''; for (let k = 0; k <= 3; k++) { const v = lo + ((hi - lo) * k) / 3, yy = y(v); if (Math.abs(yy - last[1]) < 13) { grid += `<line x1="${PL}" x2="${W - PR}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#4A5058" stroke-opacity=".35" stroke-dasharray="3 5"/>`; continue; } grid += `<line x1="${PL}" x2="${W - PR}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#4A5058" stroke-opacity=".35" stroke-dasharray="3 5"/><text x="${W - PR + 6}" y="${(yy + 3).toFixed(1)}" font-size="10" fill="#9299A1">${fmt(Math.round(v))}</text>`; }
    const ipoY = ipo >= lo && ipo <= hi ? y(ipo) : null;
    svg.innerHTML = `<defs><linearGradient id="scg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".32"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>${grid}
      ${ipoY !== null ? `<line x1="${PL}" x2="${W - PR}" y1="${ipoY.toFixed(1)}" y2="${ipoY.toFixed(1)}" stroke="#FFB15C" stroke-opacity=".7" stroke-dasharray="6 4"/><text x="${PL + 4}" y="${(ipoY - 4).toFixed(1)}" font-size="10" fill="#FFB15C">halka arz</text>` : ''}
      <path d="${area}" fill="url(#scg)"/>${maPts.length > 2 ? `<path d="${smoothPath(maPts)}" fill="none" stroke="#C0C4C8" stroke-width="1.4" stroke-opacity=".65" stroke-dasharray="4 3"/>` : ''}
      <path d="${line}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
      <circle class="scpulse" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5" fill="${col}"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.4" fill="${col}" stroke="#17191C" stroke-width="1.4"/>
      <text x="${W - PR + 6}" y="${(last[1] + 4).toFixed(1)}" font-size="11" font-weight="700" fill="${col}">${fmt(data[data.length - 1]!)}</text>`;
    const cur = data[data.length - 1]!, prev = data[data.length - 2]!, first = data[0]!;
    price.textContent = fmt(cur); chg.className = `scchg ${up ? 'up' : 'down'}`; chg.textContent = `${up ? '▲' : '▼'} %${Math.abs((cur / prev - 1) * 100).toFixed(2).replace('.', ',')}`;
    sub.textContent = `${range === 30 ? '1 ay' : range === 90 ? '3 ay' : '6 ay'}: ${cur >= first ? '+' : '−'}%${Math.abs((cur / first - 1) * 100).toFixed(1).replace('.', ',')} · halka arza göre ${cur >= ipo ? '+' : '−'}%${Math.abs((cur / ipo - 1) * 100).toFixed(1).replace('.', ',')}`;
    if (tick) { price.classList.remove('flash'); void (price as HTMLElement).offsetWidth; price.classList.add('flash'); }
  };
  return { el, update(next: number[]) { const changed = next.length !== hist.length || next[next.length - 1] !== hist[hist.length - 1]; hist = next.slice(); paint(changed && !!svg.firstChild); } };
}
