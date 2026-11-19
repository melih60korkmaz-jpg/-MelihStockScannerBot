import { DEFAULT_CITIES, PROVINCES, branchCost, cityData, provinceStats, type DistrictDef, type Province } from '../../data';
import { TL } from '../../core/money';
import { askPrice, canTrade, growthLabel, marketParcels, ownedParcels } from '../../sim/land';
import { h, press, toast } from '../dom';
import { fmt, fmtM2, nf, pct, statBar, ZONING_LABEL } from '../components';
import type { App } from '../app';
import { openParcel } from './parcel';

type Metric = 'fiyat' | 'gelir' | 'rekabet' | 'gelisim';
const METRICS: [Metric, string][] = [['fiyat', 'Satış fiyatı'], ['gelir', 'Gelir'], ['rekabet', 'Rekabet'], ['gelisim', 'Gelişim']];
const RANGE: Record<Metric, [number, number]> = { fiyat: [16000, 60000], gelir: [28, 78], rekabet: [30, 78], gelisim: [3, 12] };
const mem = { mode: 'turkey' as 'turkey' | 'province', city: '', district: '', metric: 'fiyat' as Metric, q: '', vb: null as null | { x: number; y: number; w: number; h: number }, vbKey: '' };
const TR_BOX = (() => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of PROVINCES) { x0 = Math.min(x0, p.bbox[0]); y0 = Math.min(y0, p.bbox[1]); x1 = Math.max(x1, p.bbox[2]); y1 = Math.max(y1, p.bbox[3]); } return { x: x0 - 80, y: y0 - 80, w: x1 - x0 + 160, h: y1 - y0 + 160 }; })();
const norm = (s: string) => s.toLocaleLowerCase('tr').replace(/[ıİ]/g, 'i');
const shade = (t: number) => { const k = Math.max(0, Math.min(1, t)); return { fill: k > 0.5 ? '#F5B700' : '#2f7fa8', op: (0.18 + Math.abs(k - 0.5) * 1.5).toFixed(2) }; };

/** Dokunma/kaydırma/yakınlaştırma: SVG viewBox'ını yönetir. Dokunuş ile sürükleme ayrılır (tıklama yalnızca sürüklenmediyse). */
function panZoom(svg: SVGSVGElement, full: { x: number; y: number; w: number; h: number }, vb: { x: number; y: number; w: number; h: number }, onChange: (z: number) => void) {
  const ptrs = new Map<number, { x: number; y: number }>(); let moved = false, pinch = 0;
  const apply = () => { vb.w = Math.min(full.w, Math.max(full.w / 8, vb.w)); vb.h = vb.w * (full.h / full.w); vb.x = Math.min(full.x + full.w - vb.w, Math.max(full.x, vb.x)); vb.y = Math.min(full.y + full.h - vb.h, Math.max(full.y, vb.y)); svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); onChange(full.w / vb.w); };
  const toSvg = (cx: number, cy: number) => { const r = svg.getBoundingClientRect(); return { x: vb.x + ((cx - r.left) / r.width) * vb.w, y: vb.y + ((cy - r.top) / r.height) * vb.h }; };
  const zoomAt = (cx: number, cy: number, f: number) => { const p = toSvg(cx, cy), nw = vb.w / f; vb.x = p.x - (p.x - vb.x) * (nw / vb.w); vb.y = p.y - (p.y - vb.y) * (nw / vb.w); vb.w = nw; apply(); };
  svg.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y); } });
  svg.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (ptrs.size === 1) { if (Math.hypot(dx, dy) > 4 || moved) { moved = true; const r = svg.getBoundingClientRect(); vb.x -= (dx / r.width) * vb.w; vb.y -= (dy / r.height) * vb.h; apply(); p.x = e.clientX; p.y = e.clientY; } }
    else if (ptrs.size === 2) { moved = true; const other = [...ptrs.entries()].find(([id]) => id !== e.pointerId)![1]; const d0 = Math.hypot(p.x - other.x, p.y - other.y), d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y); if (d0 > 0) zoomAt((e.clientX + other.x) / 2, (e.clientY + other.y) / 2, d1 / d0); p.x = e.clientX; p.y = e.clientY; }
  });
  const up = (e: PointerEvent) => { ptrs.delete(e.pointerId); }; svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  apply(); void pinch;
  return { wasDrag: () => moved, zoom: (f: number) => { const r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); }, reset: () => { Object.assign(vb, full); apply(); } };
}

export function mapView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!; if (!mem.city) { mem.city = c.startCity; }
  const prov = PROVINCES.find((p) => p.id === mem.city)!;
  return mem.mode === 'province' ? provinceView(app, refresh, prov) : turkeyView(app, refresh, prov);
}

// ---------------- Türkiye ----------------
function turkeyView(app: App, refresh: () => void, sel: Province): HTMLElement {
  const s = app.store.state, c = s.company!, hiOf = (id: string) => s.cityMarket[id]?.housingIndex ?? 1;
  const val = (p: Province) => { const st = provinceStats(p.id); return mem.metric === 'fiyat' ? st.saleBase * hiOf(p.id) : mem.metric === 'gelir' ? st.income : mem.metric === 'rekabet' ? st.competition : st.growth * 100; };
  const toolbar = h('div', { class: 'toolbar' }); const metSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Harita katmanı' });
  for (const [id, l] of METRICS) metSeg.append(h('button', { class: mem.metric === id ? 'on' : '', onclick: () => { press(app); mem.metric = id; refresh(); } }, l));
  toolbar.append(metSeg, h('span', { class: 'mute', style: 'font-size:12px' }, `${s.openCities.length} il açık · 81 il`));

  const svg = h('div', { html: `<svg viewBox="${TR_BOX.x} ${TR_BOX.y} ${TR_BOX.w} ${TR_BOX.h}" role="group" aria-label="Türkiye haritası" data-z="1"></svg>` }).firstElementChild as SVGSVGElement;
  let paths = '', labels = '';
  for (const p of PROVINCES) {
    const [lo, hi] = RANGE[mem.metric], t = (val(p) - lo) / (hi - lo), sh = shade(t), open = s.openCities.includes(p.id);
    paths += `<path class="pv ${open ? 'open' : 'lock'} ${p.id === sel.id ? 'sel' : ''}" data-id="${p.id}" d="${p.path}" fill="${sh.fill}" fill-opacity="${sh.op}"><title>${p.name}</title></path>`;
    labels += `<text class="lb2" x="${p.cx}" y="${p.cy}" font-size="${p.areaKm2 > 9000 ? 150 : p.areaKm2 > 3500 ? 120 : 90}" text-anchor="middle">${p.name}</text>`;
  }
  const st = PROVINCES.find((p) => p.id === c.startCity)!;
  svg.innerHTML = `<rect x="${TR_BOX.x}" y="${TR_BOX.y}" width="${TR_BOX.w}" height="${TR_BOX.h}" fill="transparent"/>${paths}${labels}<circle cx="${st.cx}" cy="${st.cy}" r="60" fill="#F5B700" stroke="#000" stroke-width="12"/>`;
  const wrap = h('div', { class: 'mapbox', style: 'position:relative' }, svg, h('div', { class: 'legend' }, h('span', {}, 'Düşük'), h('i', {}), h('span', {}, 'Yüksek'), h('span', { style: 'margin-left:10px' }, '● Başlangıç · altın çerçeve = açık il')));
  const vb = mem.vb && mem.vbKey === 'tr' ? mem.vb : { ...TR_BOX }; mem.vb = vb; mem.vbKey = 'tr';
  const pz = panZoom(svg, TR_BOX, vb, (z) => svg.setAttribute('data-z', z > 3.2 ? '3' : z > 1.8 ? '2' : '1'));
  svg.addEventListener('click', (e) => { if (pz.wasDrag()) return; const el = (e.target as Element).closest('[data-id]'); if (!el) return; press(app); mem.city = el.getAttribute('data-id')!; mem.district = ''; refresh(); });
  wrap.append(h('div', { class: 'zbtns' }, h('button', { class: 'btn glass', 'aria-label': 'Yakınlaştır', onclick: () => pz.zoom(1.6) }, '+'), h('button', { class: 'btn glass', 'aria-label': 'Uzaklaştır', onclick: () => pz.zoom(1 / 1.6) }, '−'), h('button', { class: 'btn glass', 'aria-label': 'Sıfırla', onclick: () => pz.reset() }, '⌂')));

  // Sağ panel: arama + il listesi + seçili il kartı
  const input = h('input', { class: 'input search', type: 'search', placeholder: 'İl ara…', value: mem.q, 'aria-label': 'İl ara', oninput: () => { mem.q = (input as HTMLInputElement).value; fill(); } }) as HTMLInputElement;
  const list = h('div', { class: 'plist' });
  const fill = () => {
    list.innerHTML = ''; const q = norm(mem.q);
    for (const p of PROVINCES.filter((x) => !q || norm(x.name).includes(q) || x.plate.includes(q))) {
      const open = s.openCities.includes(p.id), stt = provinceStats(p.id);
      list.append(h('div', { class: `prow ${p.id === sel.id ? 'sel' : ''}`, role: 'button', tabindex: 0, onclick: () => { press(app); mem.city = p.id; mem.district = ''; refresh(); } }, h('span', { class: 'plate' }, p.plate), h('div', { class: 'nm' }, p.name, h('small', {}, `${p.region} · ${stt.districts} ilçe · ${fmtM2(Math.round(stt.saleBase * hiOf(p.id) * 100))}`)), h('span', { class: `chip ${open ? 'good' : ''}` }, open ? 'Açık' : 'Kilitli')));
    }
    if (!list.children.length) list.append(h('div', { class: 'empty' }, 'Eşleşen il yok.'));
  };
  fill();
  const stt = provinceStats(sel.id), open = s.openCities.includes(sel.id), cost = TL(branchCost(sel.id));
  const card = h('div', { class: 'card', style: 'margin-bottom:8px' },
    h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;gap:8px' }, h('h3', { style: 'font-size:24px' }, `${sel.name}`), h('span', { class: 'mute', style: 'font-size:12px' }, `${sel.plate} · ${sel.region}`)),
    statBar('Gelir düzeyi', stt.income), statBar('Rekabet', stt.competition), h('div', { class: 'kv', style: 'margin-top:6px' }, h('span', {}, 'Konut fiyatı (ort.)'), h('span', {}, fmtM2(Math.round(stt.saleBase * hiOf(sel.id) * 100))), h('span', {}, 'İlçe sayısı'), h('span', {}, String(stt.districts)), h('span', {}, 'Şube durumu'), h('span', {}, open ? (sel.id === c.startCity ? 'Başlangıç şehri' : 'Açık') : 'Kilitli')),
    h('div', { style: 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap' },
      h('button', { class: 'btn gold', style: 'flex:1', onclick: () => { press(app); mem.mode = 'province'; mem.vb = null; refresh(); } }, 'İlçeleri gör'),
      open ? null : h('button', { class: 'btn', style: 'flex:1', disabled: c.cash < cost, onclick: () => { if (!confirm(`${sel.name} şubesi açılsın mı? ${fmt(cost)} (tek seferlik) + aylık şube gideri.`)) return; const r = app.store.run('OpenBranch', { cityId: sel.id }); if (r.ok) { press(app, 'stamp', 'heavy'); toast(`${sel.name} şubesi açıldı: ilanlar görünür.`); } else { app.audio.sfx('error'); toast(r.error); } } }, `Şube aç · ${fmt(cost)}`)));
  return h('div', { style: 'display:flex;flex-direction:column' }, toolbar, h('div', { class: 'tmap' }, wrap, h('div', {}, card, input, list)));
}

// ---------------- İl: gerçek ilçe sınırları ----------------
function provinceView(app: App, refresh: () => void, prov: Province): HTMLElement {
  const s = app.store.state, c = s.company!, city = cityData(prov.id)!, open = canTrade(s, prov.id), hi = s.cityMarket[prov.id]?.housingIndex ?? 1;
  if (!city.districts.some((d) => d.id === mem.district)) mem.district = [...city.districts].sort((a, b) => b.saleBase - a.saleBase)[0]!.id;
  const val = (d: DistrictDef) => (mem.metric === 'fiyat' ? d.saleBase * hi : mem.metric === 'gelir' ? d.income : mem.metric === 'rekabet' ? d.competition : d.growth * 100);
  const fv = (d: DistrictDef) => (mem.metric === 'fiyat' ? `${nf((d.saleBase * hi) / 1000, 0)}k` : mem.metric === 'gelisim' ? pct(d.growth) : String(mem.metric === 'gelir' ? d.income : d.competition));
  const toolbar = h('div', { class: 'toolbar' }); const metSeg = h('div', { class: 'seg', role: 'group' });
  for (const [id, l] of METRICS) metSeg.append(h('button', { class: mem.metric === id ? 'on' : '', onclick: () => { press(app); mem.metric = id; refresh(); } }, l));
  toolbar.append(h('button', { class: 'btn', onclick: () => { press(app); mem.mode = 'turkey'; mem.vb = null; refresh(); } }, '‹ Türkiye'), h('b', { style: 'font:700 22px var(--font-h)' }, prov.name), metSeg, h('span', { class: `chip ${open ? 'good' : ''}` }, open ? 'Şube açık' : 'Şube kilitli'));
  const b = prov.bbox, pad = Math.max(b[2] - b[0], b[3] - b[1]) * 0.04, full = { x: b[0] - pad, y: b[1] - pad, w: b[2] - b[0] + 2 * pad, h: b[3] - b[1] + 2 * pad };
  const svg = h('div', { html: `<svg viewBox="${full.x} ${full.y} ${full.w} ${full.h}" role="group" aria-label="${prov.name} ilçeleri" data-z="1"></svg>` }).firstElementChild as SVGSVGElement;
  const [lo, hiR] = RANGE[mem.metric]; const rl = mem.metric === 'fiyat' ? [Math.min(...city.districts.map((d) => d.saleBase * hi)), Math.max(...city.districts.map((d) => d.saleBase * hi))] : [lo, hiR];
  const lblSize = Math.max(full.w, full.h) / 38; let paths = '', labels = '';
  const minArea = prov.areaKm2 / Math.max(6, city.districts.length) * 0.9;
  for (const d of city.districts) {
    const t = (val(d) - rl[0]!) / ((rl[1]! - rl[0]!) || 1), sh = shade(t);
    paths += `<path class="dv ${d.id === mem.district ? 'sel' : ''}" data-id="${d.id}" d="${d.path}" fill="${sh.fill}" fill-opacity="${sh.op}"><title>${d.label}</title></path>`;
    labels += `<text class="${d.areaKm2 >= minArea ? '' : 'lb2'}" x="${d.cx}" y="${d.cy}" font-size="${lblSize}" text-anchor="middle">${d.label}</text>`;
  }
  svg.innerHTML = `<rect x="${full.x}" y="${full.y}" width="${full.w}" height="${full.h}" fill="transparent"/>${paths}${labels}`;
  const key = `p:${prov.id}`, vb = mem.vb && mem.vbKey === key ? mem.vb : { ...full }; mem.vb = vb; mem.vbKey = key;
  const pz = panZoom(svg, full, vb, (z) => svg.setAttribute('data-z', z > 2.8 ? '3' : z > 1.6 ? '2' : '1'));
  svg.addEventListener('click', (e) => { if (pz.wasDrag()) return; const el = (e.target as Element).closest('[data-id]'); if (!el) return; press(app); mem.district = el.getAttribute('data-id')!; refresh(); });
  const wrap = h('div', { class: 'mapbox', style: 'position:relative' }, svg, h('div', { class: 'legend' }, h('span', {}, 'Düşük'), h('i', {}), h('span', {}, 'Yüksek')));
  wrap.append(h('div', { class: 'zbtns' }, h('button', { class: 'btn glass', 'aria-label': 'Yakınlaştır', onclick: () => pz.zoom(1.6) }, '+'), h('button', { class: 'btn glass', 'aria-label': 'Uzaklaştır', onclick: () => pz.zoom(1 / 1.6) }, '−'), h('button', { class: 'btn glass', 'aria-label': 'Sıfırla', onclick: () => pz.reset() }, '⌂')));

  const d = city.districts.find((x) => x.id === mem.district)!; void fv;
  const market = marketParcels(s), mine = ownedParcels(s);
  const list = market.filter((p) => p.city === prov.id && p.district === d.id).sort((a, b2) => askPrice(s, a) - askPrice(s, b2)), mineHere = mine.filter((p) => p.city === prov.id && p.district === d.id);
  const pcard = (p: typeof market[number], isMine: boolean) => h('div', { class: `card pcard ${isMine ? 'mine' : ''}`, role: 'button', tabindex: 0, onclick: () => { press(app); openParcel(app, p.id, refresh); } },
    h('div', { style: 'min-width:0' }, h('div', { class: 't' }, p.hood), h('div', { class: 's' }, `${nf(p.area)} m² · ${ZONING_LABEL[p.zoning]} · KAKS ${p.kaks.toFixed(2).replace('.', ',')} · ${p.maxFloors} kat`),
      h('div', { style: 'margin-top:4px;display:flex;gap:5px;flex-wrap:wrap' }, h('span', { class: 'chip' }, 'Gelişim ', h('b', {}, growthLabel(p).label + (growthLabel(p).sure ? '' : '?'))), p.soilKnown ? h('span', { class: 'chip' }, 'Zemin etüdü ✓') : null, p.corner ? h('span', { class: 'chip' }, 'Köşe') : null, isMine && p.projectId !== undefined ? h('span', { class: 'chip good' }, 'Projeli') : null)),
    h('div', { class: 'pr' }, isMine ? 'Sizin' : fmt(askPrice(s, p)), h('small', {}, isMine ? 'dosyayı aç' : fmtM2(askPrice(s, p) / p.area))));
  const cost = TL(branchCost(prov.id));
  const side = h('div', { class: 'col' },
    h('div', { class: 'card' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' }, h('h3', { style: 'font-size:24px' }, d.label), h('span', { class: 'mute', style: 'font-size:12px' }, `Konut ≈ ${fmtM2(Math.round(d.saleBase * 100 * hi))} · ${nf(d.areaKm2)} km²`)),
      statBar('Gelir düzeyi', d.income), statBar('Nüfus yoğunluğu', d.density), statBar('Altyapı', d.infra), statBar('Ulaşım', d.transit), statBar('Ticari potansiyel', d.commercial), statBar('Rekabet', d.competition)),
    ...(open ? [] : [h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'İlanlar kilitli'), h('p', { class: 'mute', style: 'font-size:13px;margin:0 0 8px' }, `${prov.name} ilinde arsa görmek ve almak için şube açın (${fmt(cost)} + aylık şube gideri).`), h('button', { class: 'btn gold block', disabled: c.cash < cost, onclick: () => { if (!confirm(`${prov.name} şubesi açılsın mı? ${fmt(cost)}`)) return; const r = app.store.run('OpenBranch', { cityId: prov.id }); if (r.ok) { press(app, 'stamp', 'heavy'); toast(`${prov.name} şubesi açıldı.`); } else { app.audio.sfx('error'); toast(r.error); } } }, `Şube aç · ${fmt(cost)}`))]),
    ...(open && mineHere.length ? [h('div', { class: 'lbl-s' }, 'Bu ilçedeki arsalarınız'), ...mineHere.map((p) => pcard(p, true))] : []),
    ...(open ? [h('div', { class: 'lbl-s' }, `Satılık arsalar (${list.length})`), ...(list.length ? list.map((p) => pcard(p, false)) : [h('div', { class: 'card empty' }, 'Bu ilçede şu an ilan yok; her ay yeni ilanlar çıkar.')])] : []));
  void DEFAULT_CITIES;
  return h('div', { style: 'display:flex;flex-direction:column' }, toolbar, h('div', { class: 'tmap' }, wrap, side));
}
