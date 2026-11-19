import { CITY_DATA, cityData } from '../../data';
import { askPrice, marketParcels, ownedParcels, growthLabel } from '../../sim/land';
import { h, press } from '../dom';
import { fmt, fmtM2, nf, pct, statBar, ZONING_LABEL } from '../components';
import type { App } from '../app';
import { openParcel } from './parcel';

type Metric = 'fiyat' | 'gelir' | 'rekabet' | 'gelisim';
const METRICS: [Metric, string][] = [['fiyat', 'Satış fiyatı'], ['gelir', 'Gelir düzeyi'], ['rekabet', 'Rekabet'], ['gelisim', 'Gelişim']];
const mem = { city: '', metric: 'fiyat' as Metric, district: '' };

const DECOR_SCALE = '<g transform="scale(1.4 1)">';
const DECOR: Record<string, string> = {
  istanbul: '<path d="M44 0 C50 20 40 35 50 50 C60 65 52 85 56 100" fill="none" stroke="#2a6f97" stroke-width="5" opacity=".55"/><path d="M0 50 H100" stroke="#ffffff10" stroke-width="2"/>',
  ankara: '<path d="M0 62 C30 55 55 70 100 58" fill="none" stroke="#ffffff12" stroke-width="2.2"/><path d="M36 0 V100 M0 40 H100" stroke="#ffffff0e" stroke-width="1.6"/>',
  izmir: '<path d="M0 0 H22 C26 30 14 55 24 100 H0Z" fill="#2a6f97" opacity=".4"/><path d="M60 0 V100 M0 46 H100" stroke="#ffffff0e" stroke-width="1.6"/>',
};

/** Şehir haritası: ilçe karoları seçilen ölçüte göre renklenir; ilçeye dokununca ilanlar listelenir. */
export function mapView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!;
  if (!mem.city) mem.city = c.startCity;
  const city = cityData(mem.city)!; if (!city.districts.some((d) => d.id === mem.district)) mem.district = city.districts[0]!.id;
  const hi = s.cityMarket[city.id]?.housingIndex ?? 1;
  const val = (d: typeof city.districts[number]): number => (mem.metric === 'fiyat' ? d.saleBase * hi : mem.metric === 'gelir' ? d.income : mem.metric === 'rekabet' ? d.competition : d.growth * 100);
  const range: Record<Metric, [number, number]> = { fiyat: [25000, 90000], gelir: [20, 90], rekabet: [25, 95], gelisim: [2, 16] };
  const fv = (d: typeof city.districts[number]) => (mem.metric === 'fiyat' ? `${nf(d.saleBase * hi / 1000, 0)}k ₺/m²` : mem.metric === 'gelisim' ? pct(d.growth) : String(d.competition && mem.metric === 'rekabet' ? d.competition : d.income));

  const toolbar = h('div', { class: 'toolbar' });
  const citySeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Şehir' });
  for (const ct of CITY_DATA) citySeg.append(h('button', { class: mem.city === ct.id ? 'on' : '', onclick: () => { press(app); mem.city = ct.id; mem.district = ''; refresh(); } }, ct.label));
  const metSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Harita katmanı' });
  for (const [id, l] of METRICS) metSeg.append(h('button', { class: mem.metric === id ? 'on' : '', onclick: () => { press(app); mem.metric = id; refresh(); } }, l));
  toolbar.append(citySeg, metSeg);

  const market = marketParcels(s), mine = ownedParcels(s);
  let tiles = '';
  for (const d of city.districts) {
    const t = Math.max(0, Math.min(1, (val(d) - range[mem.metric][0]) / (range[mem.metric][1] - range[mem.metric][0])));
    const n = market.filter((p) => p.city === city.id && p.district === d.id).length, my = mine.filter((p) => p.city === city.id && p.district === d.id).length;
    const m = { x: d.map.x * 1.4, y: d.map.y, w: d.map.w * 1.4, h: d.map.h };
    tiles += `<g class="tile ${mem.district === d.id ? 'sel' : ''}" data-d="${d.id}" role="button" tabindex="0" aria-label="${d.label}">
      <rect class="t" x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" rx="3" fill="#153242" stroke="#ffffff22" stroke-width=".6"/>
      <rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" rx="3" fill="#F5B700" fill-opacity="${(0.08 + t * 0.78).toFixed(2)}"/>
      <text class="nm" x="${m.x + 2.5}" y="${m.y + 7.5}" style="paint-order:stroke;stroke:#0008;stroke-width:.8px">${d.label}</text>
      <text class="vl" x="${m.x + 2.5}" y="${m.y + 14}" style="paint-order:stroke;stroke:#0008;stroke-width:.7px">${fv(d)}</text>
      <text class="ct" x="${m.x + 2.5}" y="${m.y + m.h - 3}">${n} ilan${my ? ` · ${my} arsanız` : ''}</text></g>`;
  }
  const svgWrap = h('div', { class: 'mapbox', html: `<svg viewBox="0 0 140 100" role="group" aria-label="${city.label} haritası">${DECOR_SCALE}${DECOR[city.id] ?? ''}</g>${tiles}</svg><div class="legend"><span>Düşük</span><i></i><span>Yüksek</span></div>` });
  svgWrap.querySelectorAll<SVGGElement>('.tile').forEach((g) => { const go = () => { press(app); mem.district = g.dataset.d!; refresh(); }; g.addEventListener('click', go); g.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') go(); }); });

  // Sağ panel
  const d = city.districts.find((x) => x.id === mem.district)!;
  const list = market.filter((p) => p.city === city.id && p.district === d.id).sort((a, b) => askPrice(s, a) - askPrice(s, b));
  const mineHere = mine.filter((p) => p.city === city.id && p.district === d.id);
  const card = (p: typeof market[number], isMine: boolean) => h('div', { class: `card pcard ${isMine ? 'mine' : ''}`, role: 'button', tabindex: 0, onclick: () => { press(app); openParcel(app, p.id, refresh); } },
    h('div', { style: 'min-width:0' }, h('div', { class: 't' }, `${p.hood}`), h('div', { class: 's' }, `${nf(p.area)} m² · ${ZONING_LABEL[p.zoning]} · KAKS ${p.kaks.toFixed(2).replace('.', ',')} · ${p.maxFloors} kat`),
      h('div', { style: 'margin-top:4px;display:flex;gap:5px;flex-wrap:wrap' }, h('span', { class: 'chip' }, 'Gelişim ', h('b', {}, growthLabel(p).label + (growthLabel(p).sure ? '' : '?'))), p.soilKnown ? h('span', { class: 'chip' }, 'Zemin etüdü ✓') : null, p.corner ? h('span', { class: 'chip' }, 'Köşe') : null, isMine && p.projectId !== undefined ? h('span', { class: 'chip good' }, 'Projeli') : null)),
    h('div', { class: 'pr' }, isMine ? 'Sizin' : fmt(askPrice(s, p)), h('small', {}, isMine ? 'dosyayı aç' : fmtM2(askPrice(s, p) / p.area))));
  const side = h('div', { class: 'col' },
    h('div', { class: 'card' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' }, h('h3', { style: 'font-size:24px' }, `${d.label}`), h('span', { class: 'mute', style: 'font-size:12px' }, `Konut ≈ ${fmtM2(Math.round(d.saleBase * 100 * hi))}`)),
      statBar('Gelir düzeyi', d.income), statBar('Nüfus yoğunluğu', d.density), statBar('Altyapı', d.infra), statBar('Ulaşım', d.transit), statBar('Ticari potansiyel', d.commercial), statBar('Rekabet', d.competition)),
    ...(mineHere.length ? [h('div', { class: 'lbl-s' }, 'Bu bölgedeki arsalarınız'), ...mineHere.map((p) => card(p, true))] : []),
    h('div', { class: 'lbl-s' }, `Satılık arsalar (${list.length})`), ...(list.length ? list.map((p) => card(p, false)) : [h('div', { class: 'card empty' }, 'Bu bölgede şu an ilan yok; her ay yeni ilanlar çıkar.')]));

  return h('div', { style: 'display:flex;flex-direction:column' }, toolbar, h('div', { class: 'mapwrap' }, svgWrap, side));
}
