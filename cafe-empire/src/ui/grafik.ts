/** İstatistik merkezi sayfası: çizgi/çubuk/halka grafikleri (satır içi SVG), nedenler, ürün sıralaması, şube karşılaştırması. */
import { PRODUCT } from '../data/catalog';
import { dateOf } from '../core/calendar';
import { fmt } from '../core/actions';
import { METRIKLER, seri, egilim, tahmin, haftaGunOrt, HAFTA, urunSirasi, subeTablosu, neden, type Metrik } from '../core/analiz';
import { musteriTipleri } from '../core/derin';
import { esc, bar, tr, S as getS, type Helpers } from './panels';
import { hareketli } from './art';

const st = { sube: 0, aralik: 30, metrik: 'ciro' as Metrik };
const kisa = (v: number): string => (Math.abs(v) >= 1e6 ? `${tr(v / 1e6)} Mn` : Math.abs(v) >= 1e3 ? `${tr(v / 1e3, Math.abs(v) >= 1e4 ? 0 : 1)} B` : String(Math.round(v)));
const gunKisa = (g: number): string => { const d = dateOf(g); return `${d.ayGun} ${d.ayAdi.slice(0, 3)}`; };
const bir = (m: Metrik, v: number): string => (m === 'ciro' || m === 'kar' ? `${kisa(v)} ₺` : m === 'memnuniyet' ? tr(v, 0) : String(Math.round(v)));
export function cizgi(pts: number[], gel: number[], g0: number, renk: string, m: Metrik): string {
  const W = 320, H = 130, L = 6, R = 6, T = 14, B = 20, hepsi = [...pts, ...gel]; if (pts.length < 2) return '<div class="small muted" style="padding:20px;text-align:center">Grafik için en az 2 günlük veri gerekir.</div>';
  let mn = Math.min(...hepsi), mx = Math.max(...hepsi); if (mn === mx) { mn -= 1; mx += 1; } if (mn > 0 && mn < mx * 0.5) mn = 0; const n = pts.length + gel.length, x = (i: number): number => L + (W - L - R) * (i / Math.max(1, n - 1)), y = (v: number): number => T + (H - T - B) * (1 - (v - mn) / (mx - mn));
  const yol = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' '), alan = `${yol} L${x(pts.length - 1).toFixed(1)} ${H - B} L${x(0).toFixed(1)} ${H - B}z`, tah = gel.length ? `M${x(pts.length - 1).toFixed(1)} ${y(pts[pts.length - 1]!).toFixed(1)} ${gel.map((v, i) => `L${x(pts.length + i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')}` : '';
  const sy = y(mn < 0 && mx > 0 ? 0 : mn), bi = pts.indexOf(Math.max(...pts)), id = `g${Math.abs(Math.round(mx)) % 997}${m}`;
  return `<svg class="grf" viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${renk}" stop-opacity=".45"/><stop offset="1" stop-color="${renk}" stop-opacity="0"/></linearGradient></defs>${[0, 0.5, 1].map((k) => `<line x1="${L}" x2="${W - R}" y1="${(T + (H - T - B) * k).toFixed(1)}" y2="${(T + (H - T - B) * k).toFixed(1)}" stroke="rgba(160,220,225,.12)"/>`).join('')}<path d="${alan}" fill="url(#${id})" class="gal"/><path d="${yol}" fill="none" stroke="${renk}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" class="gcz"/>${tah ? `<path d="${tah}" fill="none" stroke="${renk}" stroke-width="2" stroke-dasharray="4 4" opacity=".8"/>` : ''}<circle cx="${x(bi).toFixed(1)}" cy="${y(pts[bi]!).toFixed(1)}" r="3" fill="#ffd45c"/><circle cx="${x(pts.length - 1).toFixed(1)}" cy="${y(pts[pts.length - 1]!).toFixed(1)}" r="4" fill="${renk}" class="gnk"/><text x="${L}" y="9" font-size="8.5" fill="#86a0a6">${bir(m, mx)}</text><text x="${L}" y="${H - B + 9}" font-size="8.5" fill="#86a0a6">${bir(m, mn)}</text><text x="${L}" y="${H - 4}" font-size="8.5" fill="#86a0a6">${gunKisa(g0)}</text><text x="${W - R}" y="${H - 4}" font-size="8.5" fill="#86a0a6" text-anchor="end">${gel.length ? 'tahmin ›' : 'bugün'}</text><line x1="${L}" x2="${W - R}" y1="${sy.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="rgba(255,255,255,.18)" stroke-dasharray="2 3"/></svg>`;
}
export function cubuk(v: number[], etiket: string[], renk = '#e3874a'): string {
  const W = 320, H = 100, mx = Math.max(1, ...v), bw = (W - 20) / v.length; const bi = v.indexOf(Math.max(...v));
  return `<svg class="grf" viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true">${v.map((x, i) => { const h = (H - 26) * (x / mx), xx = 10 + i * bw + 4; return `<rect x="${xx.toFixed(1)}" y="${(H - 16 - h).toFixed(1)}" width="${(bw - 8).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="3" fill="${i === bi ? '#ffd45c' : renk}" class="gcb" style="animation-delay:${i * 0.05}s"/><text x="${(xx + (bw - 8) / 2).toFixed(1)}" y="${H - 4}" font-size="8.5" fill="#86a0a6" text-anchor="middle">${etiket[i]}</text>`; }).join('')}</svg>`;
}
export function halka(parts: Array<{ ad: string; v: number; renk: string }>, boy = 96): string {
  const top = parts.reduce((a, p) => a + p.v, 0) || 1, R = 34, C = 2 * Math.PI * R; let off = 0;
  return `<svg class="grf" viewBox="0 0 90 90" width="${boy}" height="${boy}" aria-hidden="true"><circle cx="45" cy="45" r="${R}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="12"/>${parts.map((p) => { const l = C * p.v / top, c = `<circle cx="45" cy="45" r="${R}" fill="none" stroke="${p.renk}" stroke-width="12" stroke-dasharray="${l.toFixed(1)} ${(C - l).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 45 45)" class="ghl"/>`; off += l; return c; }).join('')}</svg>`;
}
const RENKLER = ['#e3874a', '#4fd6a8', '#5fb3ff', '#ff7aa8', '#b07cff'];
export function pGrafik(): string {
  const s = getS(), b = st.sube ? s.subeler.find((x) => x.id === st.sube) ?? null : null; if (st.sube && !b) st.sube = 0;
  const m = st.metrik, a = seri(s, b, m, st.aralik), e = egilim(a), gel = tahmin(a, 7, m === 'kar'), pts = a.map((x) => x.v), mi = METRIKLER.find((x) => x[0] === m)!;
  const chips = (items: Array<[string, string, boolean]>, act: string): string => `<div class="chiprow" style="margin:4px 0">${items.map(([v, ad, on]) => `<button class="cx ${on ? 'on' : ''}" data-a="${act}" data-v="${v}">${ad}</button>`).join('')}</div>`;
  const sube = chips([['0', 'Tüm şirket', !b], ...s.subeler.map((x): [string, string, boolean] => [String(x.id), esc(x.ilce ? x.ilce.split(':').pop()! : x.ad), b?.id === x.id])], 'grSube');
  const ok = e.degisim > 0.02 ? '▲' : e.degisim < -0.02 ? '▼' : '▬', okc = e.degisim > 0.02 ? 'good' : e.degisim < -0.02 ? 'badc' : 'muted';
  const urun = urunSirasi(s, b, 30).slice(0, 7), uMax = Math.max(1, ...urun.map((x) => x.gelir)), hg = haftaGunOrt(s, b, m, 56);
  const nd = (b ? [b] : s.subeler.slice(0, 3)).flatMap((x) => [`<b>${esc(x.ad)}</b>`, ...neden(s, x)]);
  const tip = s.subeler.length ? musteriTipleri(b ?? s.subeler[0]!) : [], tab = subeTablosu(s, 30);
  const SEG = ['#e3874a', '#4fd6a8', '#5fb3ff', '#ff7aa8', '#b07cff'];
  return `<div class="cardx grctl" style="padding:6px 10px">${sube}<div class="row" style="gap:8px;flex-wrap:nowrap">${chips(METRIKLER.map((x): [string, string, boolean] => [x[0], x[1], m === x[0]]), 'grMetrik')}${chips([['14', '14 gün', st.aralik === 14], ['30', '30 gün', st.aralik === 30], ['90', '90 gün', st.aralik === 90]], 'grAralik')}</div></div>
  <div class="duo"><div class="duoL"><div class="cardx"><div class="row"><b>${hareketli('📈')} ${mi[1]} · son ${a.length} gün</b><span class="${okc}">${ok} %${Math.abs(Math.round(e.degisim * 100))}</span></div>${cizgi(pts, gel, a[0]?.gun ?? 0, RENKLER[METRIKLER.findIndex((x) => x[0] === m) % 5]!, m)}<div class="stg"><div><small>ORTALAMA</small><b>${bir(m, e.ort)}</b></div><div><small>EN İYİ GÜN</small><b>${bir(m, e.max)}</b><small>${e.enIyiGun >= 0 ? gunKisa(e.enIyiGun) : ''}</small></div><div><small>EN KÖTÜ GÜN</small><b>${bir(m, e.min)}</b><small>${e.enKotuGun >= 0 ? gunKisa(e.enKotuGun) : ''}</small></div></div>${gel.length ? `<div class="tiny muted">Kesikli çizgi: gelecek 7 gün tahmini (eğilim + hafta günü etkisi). Önümüzdeki hafta ortalama ${bir(m, gel.reduce((p, q) => p + q, 0) / gel.length)}.</div>` : ''}</div>
  <div class="cardx"><b>🗓️ Hafta günü profili (${mi[1]})</b>${cubuk(hg, HAFTA)}<div class="tiny muted">Sarı çubuk: en güçlü gün.</div></div>
  <div class="cardx"><b>❓ Neden böyle?</b>${nd.map((x) => `<div class="small" style="padding:3px 0;border-top:1px solid var(--line)">${x.startsWith('<b>') ? x : esc(x)}</div>`).join('') || '<div class="small muted">Şube yok.</div>'}</div></div>
  <div class="duoR"><div class="cardx"><b>☕ En çok kazandıran ürünler (30 gün)</b>${urun.map((x) => `<div class="row small" style="margin-top:6px"><span>${PRODUCT[x.id].ikon} ${PRODUCT[x.id].ad}</span><b>${kisa(x.gelir)} ₺ · ${x.adet} adet</b></div>${bar(x.gelir / uMax * 100, 'var(--am)')}<div class="tiny muted">Adet başı marj ${tr(x.marj, 0)} ₺ · pay %${Math.round(x.pay * 100)}</div>`).join('') || '<div class="small muted" style="margin-top:6px">Satış verisi birkaç günde dolar.</div>'}</div>
  <div class="cardx"><div class="art"><div class="artbox">${halka(tip.map((x, i) => ({ ad: x.ad, v: x.pay, renk: SEG[i % 5]! })))}</div><div style="flex:1"><b>👥 Müşteri tipleri</b>${tip.map((x, i) => `<div class="row small"><span><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${SEG[i % 5]};margin-right:5px"></i>${x.ad}</span><b>%${Math.round(x.pay * 100)}</b></div>`).join('')}</div></div></div>
  <div class="cardx"><b>🏬 Şube karşılaştırması (30 gün)</b>${tab.map((x, i) => `<div class="row small" style="margin-top:6px"><span>${i + 1}. ${esc(x.b.ad)}</span><b>${kisa(x.ciro)} ₺</b></div><div class="tiny muted">Kâr ${kisa(x.kar)} ₺ (%${Math.round(x.marj * 100)}) · ${x.musteri} müşteri · ☺ ${Math.round(x.memn)}</div>`).join('') || '<div class="small muted">Şube yok.</div>'}</div></div></div>`;
}
export function handleGrafik(a: string, d: DOMStringMap, h: Helpers): boolean {
  switch (a) {
    case 'grSube': st.sube = +d.v!; h.refresh(); return true; case 'grMetrik': st.metrik = d.v as Metrik; h.refresh(); return true; case 'grAralik': st.aralik = +d.v!; h.refresh(); return true;
    default: return false;
  }
}
void fmt;
