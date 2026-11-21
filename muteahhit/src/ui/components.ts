import { formatMoney, TL, type Money } from '../core/money';
import type { Parcel } from '../core/types';
import type { Plan } from '../sim/projects';
import { h } from './dom';

export const fmt = (m: Money) => formatMoney(m);
export const fmtM2 = (m: Money) => `${new Intl.NumberFormat('tr-TR').format(Math.round(m / 100))} ₺/m²`;
export const pct = (x: number, d = 0) => `%${(x * 100).toFixed(d).replace('.', ',')}`;
export const nf = (n: number, d = 0) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
export const ZONING_LABEL: Record<string, string> = { konut: 'Konut', ticaret: 'Ticaret', karma: 'Karma', sanayi: 'Sanayi' };
export const SOIL_LABEL: Record<string, string> = { saglam: 'Sağlam zemin', kaya: 'Kayalık', kil: 'Sıkışık kil', dolgu: 'Dolgu', yeralti_suyu: 'Yüksek yeraltı suyu', egimli: 'Eğimli arazi' };

export const statBar = (label: string, v: number, max = 100) => h('div', { class: 'stat' }, h('span', {}, label), h('div', { class: 'bar' }, h('i', { style: `width:${Math.min(100, (v / max) * 100)}%` })), h('span', {}, nf(v)));
export const kv = (rows: [string, string | Node, boolean?][]) => { const g = h('div', { class: 'kv' }); for (const [a, b, tot] of rows) { g.append(h('span', { class: tot ? 'tot' : '' }, a), h('span', { class: tot ? 'tot' : '' }, b)); } return g; };
export const colored = (m: Money, f: (m: Money) => string = fmt) => h('span', { class: m > 0 ? 'pos' : m < 0 ? 'neg' : '' }, (m > 0 ? '+' : '') + f(m));

const hash = (id: number, salt: number) => (((id * 2654435761 + salt * 40503) >>> 0) % 1000) / 1000;

/** Mavi baskı tarzı vaziyet planı: parsel, yol(lar), yapılaşma zarfı (taban alanı), komşu binalar, kuzey oku. */
export function blueprint(p: Parcel): HTMLElement {
  const W = 300, H = 210, aspect = 1 + hash(p.id, 1) * 0.7, pw = Math.min(150, 150 * aspect), ph = pw / aspect * (aspect > 1.4 ? 1.1 : 1.05);
  const x0 = 70 + (150 - pw) / 2, y0 = 40 + (130 - ph) / 2, cut = 6 + hash(p.id, 3) * 14;
  const pts = [[x0, y0], [x0 + pw - cut, y0], [x0 + pw, y0 + cut], [x0 + pw, y0 + ph], [x0, y0 + ph]].map((q) => q.join(',')).join(' ');
  const s = Math.sqrt(p.taks), ew = pw * s * 0.92, eh = ph * s * 0.92, ex = x0 + (pw - ew) / 2, ey = y0 + (ph - eh) / 2;
  let roads = `<rect x="0" y="${y0 + ph + 8}" width="${W}" height="22" fill="#4A5058"/><line x1="0" x2="${W}" y1="${y0 + ph + 19}" y2="${y0 + ph + 19}" stroke="#9299A1" stroke-dasharray="8 6" stroke-width="1.4"/>`;
  if (p.roads >= 2) roads += `<rect x="${x0 + pw + 8}" y="0" width="22" height="${H}" fill="#4A5058"/><line y1="0" y2="${H}" x1="${x0 + pw + 19}" x2="${x0 + pw + 19}" stroke="#9299A1" stroke-dasharray="8 6" stroke-width="1.4"/>`;
  if (p.roads >= 3) roads += `<rect x="0" y="${y0 - 30}" width="${W}" height="22" fill="#4A5058"/><line x1="0" x2="${W}" y1="${y0 - 19}" y2="${y0 - 19}" stroke="#9299A1" stroke-dasharray="8 6" stroke-width="1.4"/>`;
  let nb = ''; for (let i = 0; i < 5; i++) { const nx = 8 + hash(p.id, 10 + i) * 50, ny = 14 + i * 36 + hash(p.id, 20 + i) * 8; if (ny + 20 < y0 + ph + 6) nb += `<rect x="${nx}" y="${ny}" width="${22 + hash(p.id, 30 + i) * 22}" height="${18 + hash(p.id, 40 + i) * 10}" fill="#2b2c32" stroke="#44454d" stroke-width="0.8"/>`; }
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Vaziyet planı"><rect width="${W}" height="${H}" fill="#202328"/>${roads}${nb}
    <polygon points="${pts}" fill="#343940" stroke="#C0C4C8" stroke-width="1.6" stroke-dasharray="5 3"/>
    <rect x="${ex}" y="${ey}" width="${ew}" height="${eh}" fill="#F07824" fill-opacity=".35" stroke="#FF8C32" stroke-width="1.6"/>
    <text x="${ex + ew / 2}" y="${ey + eh / 2 + 3}" text-anchor="middle" font-size="9" font-weight="700" fill="#F5F5F3" font-family="Inter,sans-serif">Taban ${nf(p.area * p.taks)} m²</text>
    <text x="${x0 + pw / 2}" y="${y0 - 5}" text-anchor="middle" font-size="9" fill="#C0C4C8" font-family="Inter,sans-serif">${nf(p.area)} m² parsel${p.corner ? ' · köşe' : ''}</text>
    <text x="${W - 40}" y="${H - 8}" font-size="8" fill="#9299A1" font-family="Inter,sans-serif">${p.roads} yol cephesi</text>
    <g transform="translate(18 ${H - 34})"><path d="M0 -14 L7 4 L0 0 L-7 4 Z" fill="#C0C4C8"/><text x="0" y="16" text-anchor="middle" font-size="8" font-weight="700" fill="#C0C4C8">K</text></g></svg>`;
  return h('div', { class: 'paper', html: svg });
}

/** İzometrik yapılaşma hacmi (kat sayısına göre). */
export function massing(p: Parcel, floors: number): HTMLElement {
  const W = 300, H = 190, fl = Math.max(1, floors), fh = Math.min(11, 120 / fl), asp = 1 + hash(p.id, 1) * 0.7, a = 50 * Math.sqrt(p.taks) * 1.7, b = a / asp;
  const cx = W / 2, cy = 150, c = 0.866, sn = 0.5, hh = fh * fl;
  const P = (x: number, y: number, z: number) => `${(cx + (x - y) * c).toFixed(1)},${(cy + (x + y) * sn - z).toFixed(1)}`;
  const top = [P(0, 0, hh), P(a, 0, hh), P(a, b, hh), P(0, b, hh)].join(' '), left = [P(0, b, 0), P(a, b, 0), P(a, b, hh), P(0, b, hh)].join(' '), right = [P(a, 0, 0), P(a, b, 0), P(a, b, hh), P(a, 0, hh)].join(' ');
  let lines = ''; for (let i = 1; i < fl; i++) lines += `<polyline points="${P(0, b, i * fh)} ${P(a, b, i * fh)} ${P(a, 0, i * fh)}" fill="none" stroke="#17191C" stroke-opacity=".45" stroke-width=".8"/>`;
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Yapılaşma hacmi"><ellipse cx="${cx}" cy="${cy + 18}" rx="${a * 1.1}" ry="${a * 0.45}" fill="#ffffff10"/><polygon points="${left}" fill="#C95B17"/><polygon points="${right}" fill="#F07824"/><polygon points="${top}" fill="#FF8C32"/>${lines}
    <text x="12" y="16" font-size="10" fill="#C0C4C8" font-family="Inter,sans-serif">${fl} kat</text></svg>`;
  return h('div', { html: svg });
}

export function planTable(plan: Plan, o: { landOwned: boolean; soilKnown: boolean }): HTMLElement {
  const range = (lo: Money, mid: Money, hi: Money, f = fmt) => (lo === hi ? f(mid) : `${f(mid)} (${f(lo)} – ${f(hi)})`);
  const wrap = h('div', {});
  if (!plan.ok) { wrap.append(h('div', { class: 'hint warn' }, plan.reason ?? 'Bu yapı bu parselde yapılamaz.')); return wrap; }
  wrap.append(kv([
    ['Kat sayısı', String(plan.floors)], ['Emsal alanı', `${nf(plan.emsal)} m²`], ['Brüt inşaat alanı', `${nf(plan.brut)} m²`], ['Satılabilir alan', `${nf(plan.satilabilir)} m²`],
    [o.landOwned ? 'Arsa maliyeti (gerçekleşen)' : 'Arsa maliyeti (istenen fiyat + harç)', fmt(plan.landCost)],
    ['İnşaat (yumuşak giderler dahil)', fmt(plan.cost.total - plan.cost.soil)],
    [o.soilKnown ? 'Zemin etkisi' : 'Zemin etkisi (etüt yok: beklenen)', plan.cost.soilLow === plan.cost.soilHigh ? fmt(plan.cost.soil) : `${fmt(plan.cost.soil)} (${fmt(plan.cost.soilLow)} – ${fmt(plan.cost.soilHigh)})`],
    ['Toplam proje maliyeti', range(plan.cost.totalLow, plan.cost.total, plan.cost.totalHigh), true],
    ['Tahmini süre', `${plan.months.min}–${plan.months.max} ay`],
    ['Satış fiyatı (bugünkü)', fmtM2(plan.salePerM2)],
    ['Gelir', range(plan.revenue.low, plan.revenue.mid, plan.revenue.high)],
    ['Satış komisyonu', fmt(-plan.commission)],
  ]));
  const k = kv([['Kâr', h('span', {}, colored(plan.profit.mid), plan.profit.low === plan.profit.high ? '' : h('small', { class: 'mute' }, ` (${fmt(plan.profit.low)} – ${fmt(plan.profit.high)})`)), true], ['Kâr marjı', pct(plan.margin, 1)], ['Başa baş satış fiyatı', fmtM2(plan.breakEvenPerM2)], ['Toplam nakit ihtiyacı (kredisiz)', fmt((o.landOwned ? 0 : plan.landCost) + plan.cost.totalHigh)]]);
  wrap.append(h('div', { style: 'height:6px' }), k, h('div', { class: 'hint' }, 'Tüm fiyatlar bugünün piyasa endekslerine göredir. Satış gelirleri proje bitince ve satıldıkça gelir; arada piyasa değişebilir.'));
  void TL; return wrap;
}


/**
 * Bölge silueti: GERÇEK bölge verisinden çizilir — nüfus yoğunluğu → bina sayısı/yüksekliği, gelir düzeyi → cephe (yüksek gelirde bordo cam),
 * ulaşım → metro hattı ve istasyon, düşük yoğunlukta ağaçlar. Tohum bölge kimliğidir (her bölge farklı, aynı bölge hep aynı).
 */
export function skylineSvg(id: string, density: number, income: number, transit: number, W = 260, H = 58): string {
  let hsh = 2166136261; for (const ch of id) hsh = Math.imul(hsh ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => { hsh = (Math.imul(hsh, 1664525) + 1013904223) >>> 0; return hsh / 4294967296; };
  const n = 6 + Math.round(density / 12), maxH = 14 + density * 0.34, bw = W / n;
  const wall = income > 62 ? '#3a3128' : '#343940', glass = income > 62 ? '#FF8C32' : '#9299A1';
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img" aria-label="Bölge silueti"><rect width="${W}" height="${H}" fill="#17191C"/>`;
  for (let i = 0; i < n; i++) {
    const w = bw * (0.7 + rnd() * 0.5), x = i * bw + (bw - w) / 2, hh = Math.min(H - 12, maxH * (0.45 + rnd() * 0.75)), y = H - 9 - hh;
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${hh.toFixed(1)}" fill="${wall}"/>`;
    const cols = Math.max(1, Math.floor(w / 5)), rows = Math.floor(hh / 6);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (rnd() < 0.42) s += `<rect x="${(x + 1.5 + c * 5).toFixed(1)}" y="${(y + 2 + r * 6).toFixed(1)}" width="2.4" height="3" fill="${glass}" opacity="${(0.35 + rnd() * 0.5).toFixed(2)}"/>`;
  }
  if (density < 45) for (let i = 0; i < 5; i++) { const x = 10 + rnd() * (W - 20); s += `<circle cx="${x.toFixed(1)}" cy="${H - 14}" r="${(3 + rnd() * 2).toFixed(1)}" fill="#3FBF8A" opacity=".55"/><rect x="${(x - 0.6).toFixed(1)}" y="${H - 12}" width="1.2" height="4" fill="#5b5d66"/>`; }
  s += `<rect x="0" y="${H - 9}" width="${W}" height="9" fill="#17191C"/>`;
  if (transit > 55) { s += `<line x1="0" x2="${W}" y1="${H - 4.5}" y2="${H - 4.5}" stroke="#F07824" stroke-width="1.6" stroke-dasharray="${transit > 75 ? '' : '6 4'}"/>`; for (let i = 1; i < 4; i++) s += `<circle cx="${(W * i) / 4}" cy="${H - 4.5}" r="2.4" fill="#F5F5F3"/>`; }
  return s + '</svg>';
}
