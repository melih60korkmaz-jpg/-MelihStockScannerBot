import { DEFAULT_CITIES, PROVINCES, branchCost, buildingType, cityData, provinceStats, type DistrictDef, type Province } from '../../data';
import { TL } from '../../core/money';
import { TAPU_HARCI, askPrice, canTrade, growthLabel, marketParcels, ownedParcels } from '../../sim/land';
import { h, press, toast, askConfirm } from '../dom';
import { planProject } from '../../sim/projects';
import { fmt, fmtM2, nf, pct, skylineSvg, statBar, ZONING_LABEL } from '../components';
import type { App } from '../app';
import { openParcel } from './parcel';
import { openProjectWizard } from './projectWizard';
import { quickPick, quickStartRun, quickText, startConstructionUI } from '../startFlow';

type Metric = 'fiyat' | 'gelir' | 'rekabet' | 'gelisim';
const METRICS: [Metric, string][] = [['fiyat', 'Satış fiyatı'], ['gelir', 'Gelir'], ['rekabet', 'Rekabet'], ['gelisim', 'Gelişim']];
const RANGE: Record<Metric, [number, number]> = { fiyat: [16000, 60000], gelir: [28, 78], rekabet: [30, 78], gelisim: [3, 12] };
const mem = { onlyAffordable: false, zoomTo: '' as string, mode: 'turkey' as 'turkey' | 'province', city: '', district: '', metric: 'fiyat' as Metric, q: '', vb: null as null | { x: number; y: number; w: number; h: number }, vbKey: '' };
const TR_BOX = (() => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of PROVINCES) { x0 = Math.min(x0, p.bbox[0]); y0 = Math.min(y0, p.bbox[1]); x1 = Math.max(x1, p.bbox[2]); y1 = Math.max(y1, p.bbox[3]); } return { x: x0 - 80, y: y0 - 80, w: x1 - x0 + 160, h: y1 - y0 + 160 }; })();
const norm = (s: string) => s.toLocaleLowerCase('tr').replace(/[ıİ]/g, 'i');
/** Değer → antrasit gri kademesi (düşük: koyu, yüksek: açık); seçili bölge CSS ile bordo vurgulanır. */
const RAMP = ['#3E4C8E', '#6B5BA8', '#B0507A', '#E0804E', '#E8C15A'] as const; // düşük → yüksek: çivit → mor → gül → turuncu → sarı (bordo temayla uyumlu)
const hexRgb = (h2: string) => [1, 3, 5].map((i) => parseInt(h2.slice(i, i + 2), 16));
export const rampColor = (t: number): string => { const k = Math.max(0, Math.min(1, t)) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(k)), f = k - i, a = hexRgb(RAMP[i]!), b = hexRgb(RAMP[i + 1]!); return '#' + a.map((v, j) => Math.round(v + (b[j]! - v) * f).toString(16).padStart(2, '0')).join(''); };
const shade = (t: number) => ({ fill: rampColor(t), op: '0.92' });

/** Dokunma/kaydırma/yakınlaştırma: SVG viewBox'ını yönetir. Dokunuş ile sürükleme ayrılır (tıklama yalnızca sürüklenmediyse). */
function panZoom(svg: SVGSVGElement, full: { x: number; y: number; w: number; h: number }, vb: { x: number; y: number; w: number; h: number }, onChange: (z: number) => void) {
  const ptrs = new Map<number, { x: number; y: number }>(); let moved = false, pinch = 0;
  const apply = () => { vb.w = Math.min(full.w, Math.max(full.w / 8, vb.w)); vb.h = vb.w * (full.h / full.w); vb.x = Math.min(full.x + full.w - vb.w, Math.max(full.x, vb.x)); vb.y = Math.min(full.y + full.h - vb.h, Math.max(full.y, vb.y)); svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); onChange(full.w / vb.w); };
  const toSvg = (cx: number, cy: number) => { const r = svg.getBoundingClientRect(); return { x: vb.x + ((cx - r.left) / r.width) * vb.w, y: vb.y + ((cy - r.top) / r.height) * vb.h }; };
  const zoomAt = (cx: number, cy: number, f: number) => { const p = toSvg(cx, cy), nw = vb.w / f; vb.x = p.x - (p.x - vb.x) * (nw / vb.w); vb.y = p.y - (p.y - vb.y) * (nw / vb.w); vb.w = nw; apply(); };
  svg.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y); } });
  svg.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (ptrs.size === 1) { if (Math.hypot(dx, dy) > (e.pointerType === 'touch' ? 10 : 4) || moved) { moved = true; const r = svg.getBoundingClientRect(); vb.x -= (dx / r.width) * vb.w; vb.y -= (dy / r.height) * vb.h; apply(); p.x = e.clientX; p.y = e.clientY; } }
    else if (ptrs.size === 2) { moved = true; const other = [...ptrs.entries()].find(([id]) => id !== e.pointerId)![1]; const d0 = Math.hypot(p.x - other.x, p.y - other.y), d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y); if (d0 > 0) zoomAt((e.clientX + other.x) / 2, (e.clientY + other.y) / 2, d1 / d0); p.x = e.clientX; p.y = e.clientY; }
  });
  const up = (e: PointerEvent) => { ptrs.delete(e.pointerId); }; svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  apply(); void pinch;
  let anim = 0;
  const animateTo = (box: { x: number; y: number; w: number; h: number }, ms = 380, done?: () => void) => {
    cancelAnimationFrame(anim); const from = { ...vb }, reduced = document.documentElement.dataset.motion === 'reduced'; const t0 = performance.now();
    const step = (now: number) => { const k = reduced ? 1 : Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); vb.x = from.x + (box.x - from.x) * e; vb.y = from.y + (box.y - from.y) * e; vb.w = from.w + (box.w - from.w) * e; vb.h = vb.w * (full.h / full.w); apply(); if (k < 1) anim = requestAnimationFrame(step); else done?.(); };
    anim = requestAnimationFrame(step);
  };
  return { animateTo, wasDrag: () => moved, zoom: (f: number) => { const r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); }, reset: () => animateTo({ ...full }, 320) };
}

/** Görünüm kimliği: mod/il değişince kaydırma sıfırlanır. */
export const mapKey = () => `${mem.mode}:${mem.mode === 'province' ? mem.city : ''}`;
export function mapView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!; if (!mem.city) { mem.city = c.startCity; }
  const prov = PROVINCES.find((p) => p.id === mem.city)!;
  const view = mem.mode === 'province' ? provinceView(app, refresh, prov) : turkeyView(app, refresh, prov);
  const card = quickStartCard(app, refresh); if (card) view.insertBefore(card, view.firstChild);
  return view;
}

/** Haritanın en üstündeki tek dokunuşluk yol: taslak proje varsa "İnşaatı başlat", yoksa uygun arsa + proje önerisiyle "Satın al ve başlat". */
function quickStartCard(app: App, refresh: () => void): HTMLElement | null {
  const s = app.store.state;
  if (s.projects.some((p) => p.status === 'insaat')) return null;
  const draft = s.projects.find((p) => p.status === 'taslak' && !p.contract);
  if (draft) return h('div', { class: 'card qstart' }, h('div', { class: 'qt' }, h('b', {}, `🏗️ ${draft.name} hazır`), h('small', {}, `Proje oluşturuldu; inşaat henüz başlamadı. Bütçe ${fmt(draft.budget.total)}.`)), h('button', { class: 'btn gold lg', onclick: () => { press(app); startConstructionUI(app, draft.id, () => app.openSite(draft.id)); } }, 'İnşaatı başlat'));
  const idle = ownedParcels(s).find((p) => p.projectId === undefined);
  if (idle) return h('div', { class: 'card qstart' }, h('div', { class: 'qt' }, h('b', {}, `📐 ${idle.hood} arsanız boşta`), h('small', {}, 'Bir sonraki adım: yapı tipini seçip projeyi başlatın.')), h('button', { class: 'btn gold lg', onclick: () => { press(app); openProjectWizard(app, idle.id, refresh); } }, 'Proje başlat'));
  const q = quickPick(s);
  if (!q) return h('div', { class: 'card qstart' }, h('div', { class: 'qt' }, h('b', {}, '🏁 Hızlı başlangıç'), h('small', {}, 'Nakitinizle alınabilecek uygun arsa bulunamadı. Finans › Krediler\'den kredi alabilir ya da başka bir ilde şube açabilirsiniz.')));
  return h('div', { class: 'card qstart' }, h('div', { class: 'qt' }, h('b', {}, '🏁 Hızlı başlangıç önerisi'), h('small', {}, quickText(q))), h('button', { class: 'btn gold lg', onclick: () => { press(app); quickStartRun(app, q); refresh(); } }, 'Satın al ve başlat'));
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
  svg.innerHTML = `<rect x="${TR_BOX.x}" y="${TR_BOX.y}" width="${TR_BOX.w}" height="${TR_BOX.h}" fill="transparent"/>${paths}${labels}<circle cx="${st.cx}" cy="${st.cy}" r="60" fill="#C64252" stroke="#F2F0F0" stroke-width="12"/>`;
  const wrap = h('div', { class: 'mapbox', style: 'position:relative' }, svg, h('div', { class: 'legend' }, h('span', {}, 'Düşük'), h('i', {}), h('span', {}, 'Yüksek'), h('span', { style: 'margin-left:10px' }, '● Başlangıç · bordo çerçeve = açık il')));
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
    h('div', { html: skylineSvg(sel.id, cityData(sel.id)!.districts.reduce((a, x) => a + x.density, 0) / cityData(sel.id)!.districts.length, stt.income, cityData(sel.id)!.districts.reduce((a, x) => a + x.transit, 0) / cityData(sel.id)!.districts.length), style: 'margin:-4px -4px 8px;border-radius:10px;overflow:hidden' }),
    h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;gap:8px' }, h('h3', { style: 'font-size:24px' }, `${sel.name}`), h('span', { class: 'mute', style: 'font-size:12px' }, `${sel.plate} · ${sel.region}`)),
    statBar('Gelir düzeyi', stt.income), statBar('Rekabet', stt.competition), h('div', { class: 'kv', style: 'margin-top:6px' }, h('span', {}, 'Konut fiyatı (ort.)'), h('span', {}, fmtM2(Math.round(stt.saleBase * hiOf(sel.id) * 100))), h('span', {}, 'İlçe sayısı'), h('span', {}, String(stt.districts)), h('span', {}, 'Şube durumu'), h('span', {}, open ? (sel.id === c.startCity ? 'Başlangıç şehri' : 'Açık') : 'Kilitli')),
    h('div', { style: 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap' },
      h('button', { class: 'btn gold', style: 'flex:1', onclick: () => { press(app); const b = sel.bbox, pad = Math.max(b[2] - b[0], b[3] - b[1]) * 0.25, w = (b[2] - b[0]) + pad * 2; pz.animateTo({ x: b[0] - pad, y: b[1] - pad, w, h: w * (TR_BOX.h / TR_BOX.w) }, 420, () => { mem.mode = 'province'; mem.vb = null; refresh(); }); } }, 'İlçeleri gör'),
      open ? null : h('button', { class: 'btn', style: 'flex:1', disabled: c.cash < cost, onclick: () => { askConfirm(`${sel.name} şubesi açılsın mı? ${fmt(cost)} (tek seferlik) + aylık şube gideri.`).then(async (ok) => { if (!ok) return; const r = app.store.run('OpenBranch', { cityId: sel.id }); if (r.ok) { press(app, 'stamp', 'heavy'); toast(`${sel.name} şubesi açıldı: ilanlar görünür.`); } else { app.audio.sfx('error'); toast(r.error); }  });} }, `Şube aç · ${fmt(cost)}`)));
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
  }
  // Etiket çakışması: büyük ilçeden başlayarak yerleştir; çakışan etiketler yalnızca yakınlaşınca görünür (lb2)
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  for (const d of [...city.districts].sort((x, y) => y.areaKm2 - x.areaKm2)) {
    const w = lblSize * 0.56 * d.label.length, box = { x0: d.cx - w / 2, x1: d.cx + w / 2, y0: d.cy - lblSize, y1: d.cy + lblSize * 0.25 };
    const hit = placed.some((q) => box.x0 < q.x1 && box.x1 > q.x0 && box.y0 < q.y1 && box.y1 > q.y0), show = d.areaKm2 >= minArea && !hit; if (show) placed.push(box);
    labels += `<text class="${show ? '' : 'lb2'}" x="${d.cx}" y="${d.cy}" font-size="${lblSize}" text-anchor="middle">${d.label}</text>`;
  }
  svg.innerHTML = `<rect x="${full.x}" y="${full.y}" width="${full.w}" height="${full.h}" fill="transparent"/>${paths}${labels}`;
  const key = `p:${prov.id}`, vb = mem.vb && mem.vbKey === key ? mem.vb : { ...full }; mem.vb = vb; mem.vbKey = key;
  const pz = panZoom(svg, full, vb, (z) => svg.setAttribute('data-z', z > 2.8 ? '3' : z > 1.6 ? '2' : '1'));
  svg.addEventListener('click', (e) => { if (pz.wasDrag()) return; const el = (e.target as Element).closest('[data-id]'); if (!el) return; press(app); mem.district = el.getAttribute('data-id')!; mem.zoomTo = mem.district; mem.vb = { ...vb }; refresh(); });
  const wrap = h('div', { class: 'mapbox', style: 'position:relative' }, svg, h('div', { class: 'legend' }, h('span', {}, 'Düşük'), h('i', {}), h('span', {}, 'Yüksek')));
  wrap.append(h('div', { class: 'zbtns' }, h('button', { class: 'btn glass', 'aria-label': 'Yakınlaştır', onclick: () => pz.zoom(1.6) }, '+'), h('button', { class: 'btn glass', 'aria-label': 'Uzaklaştır', onclick: () => pz.zoom(1 / 1.6) }, '−'), h('button', { class: 'btn glass', 'aria-label': 'Sıfırla', onclick: () => pz.reset() }, '⌂')));

  const d = city.districts.find((x) => x.id === mem.district)!; void fv;
  if (mem.zoomTo) { // seçilen ilçeye akıcı yakınlaşma (yeni görünüm kurulduktan sonra)
    const zid = mem.zoomTo; mem.zoomTo = '';
    requestAnimationFrame(() => { const el = svg.querySelector(`path[data-id="${zid}"]`) as SVGGraphicsElement | null; if (!el || !el.isConnected) return; const b = el.getBBox(), pad = Math.max(b.width, b.height) * 0.9, w = Math.max(full.w / 2.6, Math.max(b.width, b.height) * 2.6, b.width + pad); const tw = Math.min(full.w, w); pz.animateTo({ x: b.x + b.width / 2 - tw / 2, y: b.y + b.height / 2 - (tw * (full.h / full.w)) / 2, w: tw, h: tw * (full.h / full.w) }, 420); });
  }
  const market = marketParcels(s), mine = ownedParcels(s);
  const allHere = market.filter((p) => p.city === prov.id && p.district === d.id).sort((a, b2) => askPrice(s, a) - askPrice(s, b2)), mineHere = mine.filter((p) => p.city === prov.id && p.district === d.id);
  const list = mem.onlyAffordable ? allHere.filter((p) => c.cash >= Math.round(askPrice(s, p) * (1 + TAPU_HARCI) * 0.8)) : allHere;
  const canAfford = (p: typeof market[number]) => c.cash >= Math.round(askPrice(s, p) * (1 + TAPU_HARCI) * 0.8);
  const pcard = (p: typeof market[number], isMine: boolean) => h('div', { class: `card pcard ${isMine ? 'mine' : ''}`, role: 'button', tabindex: 0, onclick: () => { press(app); openParcel(app, p.id, refresh); } },
    h('div', { style: 'min-width:0' }, h('div', { class: 't' }, p.hood), h('div', { class: 's' }, `${nf(p.area)} m² · ${ZONING_LABEL[p.zoning]} · KAKS ${p.kaks.toFixed(2).replace('.', ',')} · ${p.maxFloors} kat`),
      h('div', { style: 'margin-top:4px;display:flex;gap:5px;flex-wrap:wrap' }, !isMine ? (canAfford(p) ? h('span', { class: 'chip good' }, 'Alabilirsiniz') : h('span', { class: 'chip bad' }, 'Nakit yetersiz')) : null, h('span', { class: 'chip' }, 'Gelişim ', h('b', {}, growthLabel(p).label + (growthLabel(p).sure ? '' : '?'))), p.soilKnown ? h('span', { class: 'chip' }, 'Zemin etüdü ✓') : null, p.corner ? h('span', { class: 'chip' }, 'Köşe') : null, isMine && p.projectId !== undefined ? h('span', { class: 'chip good' }, 'Projeli') : null)),
    h('div', { class: 'pr' }, isMine ? 'Sizin' : fmt(askPrice(s, p)), h('small', {}, isMine ? 'dosyayı aç' : fmtM2(askPrice(s, p) / p.area))),
    isMine && p.projectId === undefined ? h('button', { class: 'btn gold', style: 'min-height:40px', onclick: (e: Event) => { e.stopPropagation(); press(app); openProjectWizard(app, p.id, refresh); } }, 'Proje başlat') : null,
    isMine && p.projectId !== undefined ? h('button', { class: s.projects.find((x) => x.id === p.projectId)?.status === 'taslak' ? 'btn gold' : 'btn', style: 'min-height:40px', onclick: (e: Event) => { e.stopPropagation(); press(app); const pr = s.projects.find((x) => x.id === p.projectId); if (!pr) return; if (pr.status === 'taslak') startConstructionUI(app, pr.id, () => app.openSite(pr.id)); else app.openSite(pr.id); } }, s.projects.find((x) => x.id === p.projectId)?.status === 'taslak' ? '🏗️ İnşaatı başlat' : 'Şantiye') : null);
  const cost = TL(branchCost(prov.id));
  // Öneri: bu ilçede nakitle alınabilen ilanlar arasında en yüksek tahmini marjlı (arsa + yapı tipi) kombinasyon
  let suggestion: HTMLElement | null = null;
  if (open) {
    let best: { p: typeof market[number]; type: string; m: number } | null = null;
    for (const p of allHere) { if (!canAfford(p)) continue; for (const tp of ['mustakil', 'apartman', 'villa', 'ofis', 'site', 'fabrika', 'depo', 'is_merkezi']) { try { const pl = planProject(s, p, tp, 'standart', Math.round(askPrice(s, p) * (1 + TAPU_HARCI))); if (pl.ok && pl.margin > 0.02 && (!best || pl.margin > best.m)) best = { p, type: tp, m: pl.margin }; } catch { /* uygun değil */ } } }
    if (!best && allHere.some(canAfford)) suggestion = h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Sizin için öneri'), h('div', { class: 'mute', style: 'font-size:13px' }, 'Bu ilçedeki alabileceğiniz arsalarda kârlı bir proje görünmüyor (marj ≤ %2). Başka bir ilçe ya da il deneyin.'));
    if (best) suggestion = h('div', { class: 'card', style: 'border-color:var(--accent-bd)' }, h('div', { class: 'lbl-s' }, 'Sizin için öneri'), h('div', { style: 'display:flex;gap:10px;align-items:center' }, h('div', { style: 'flex:1;min-width:0' }, h('b', {}, best.p.hood), h('div', { class: 'mute', style: 'font-size:12px' }, `${nf(best.p.area)} m² · ${buildingType(best.type)?.label} · tahmini marj %${Math.round(best.m * 100)} · ${fmt(askPrice(s, best.p))}`)), h('button', { class: 'btn gold', style: 'min-height:40px', onclick: () => { press(app); openParcel(app, best!.p.id, refresh); } }, 'İncele')));
  }
  const side = h('div', { class: 'col' },
    ...(open ? [] : [h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'İlanlar kilitli'), h('p', { class: 'mute', style: 'font-size:13px;margin:0 0 8px' }, `${prov.name} ilinde arsa görmek ve almak için şube açın (${fmt(cost)} + aylık şube gideri).`), h('button', { class: 'btn gold block', disabled: c.cash < cost, onclick: () => { askConfirm(`${prov.name} şubesi açılsın mı? ${fmt(cost)}`).then(async (ok) => { if (!ok) return; const r = app.store.run('OpenBranch', { cityId: prov.id }); if (r.ok) { press(app, 'stamp', 'heavy'); toast(`${prov.name} şubesi açıldı.`); } else { app.audio.sfx('error'); toast(r.error); }  });} }, `Şube aç · ${fmt(cost)}`))]),
    h('div', { class: 'card' }, h('div', { html: skylineSvg(d.id, d.density, d.income, d.transit), style: 'margin:-4px -4px 8px;border-radius:10px;overflow:hidden' }), h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' }, h('h3', { style: 'font-size:24px' }, d.label), h('span', { class: 'mute', style: 'font-size:12px' }, `Konut ≈ ${fmtM2(Math.round(d.saleBase * 100 * hi))} · ${nf(d.areaKm2)} km²`)),
      statBar('Gelir düzeyi', d.income), statBar('Nüfus yoğunluğu', d.density), statBar('Altyapı', d.infra), statBar('Ulaşım', d.transit), statBar('Ticari potansiyel', d.commercial), statBar('Rekabet', d.competition)),
    ...(open && mineHere.length ? [h('div', { class: 'lbl-s' }, 'Bu ilçedeki arsalarınız'), ...mineHere.map((p) => pcard(p, true))] : []),
    ...(open && suggestion ? [suggestion] : []),
    ...(open ? [h('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:8px' }, h('div', { class: 'lbl-s', style: 'margin:0' }, `Satılık arsalar (${list.length}/${allHere.length})`), h('div', { class: 'seg', role: 'group' }, h('button', { class: !mem.onlyAffordable ? 'on' : '', onclick: () => { press(app); mem.onlyAffordable = false; refresh(); } }, 'Tümü'), h('button', { class: mem.onlyAffordable ? 'on' : '', onclick: () => { press(app); mem.onlyAffordable = true; refresh(); } }, 'Alabileceklerim'))), ...(list.length ? list.map((p) => pcard(p, false)) : [h('div', { class: 'card empty' }, 'Bu ilçede şu an ilan yok; her ay yeni ilanlar çıkar.')])] : []));
  void DEFAULT_CITIES;
  // İlk oyuncular için yol haritası: bulunduğu adım vurgulanır
  const draft = s.projects.some((x) => x.status === 'taslak'), anyProj = s.projects.length > 0, ownedIdle = mine.some((x) => x.projectId === undefined);
  const stepNow = draft ? 5 : ownedIdle ? 4 : anyProj ? 0 : 2;
  const guide = anyProj && !draft && !ownedIdle ? null : h('div', { class: 'guide' }, ...['1 · İlçe seç', '2 · Arsa seç', '3 · Satın al', '4 · Proje başlat', '5 · Şantiyeyi başlat'].map((l, i) => h('span', { class: `gstep ${i + 1 === stepNow || (stepNow === 2 && i === 1) ? 'on' : i + 1 < stepNow ? 'done' : ''}` }, l)));
  return h('div', { style: 'display:flex;flex-direction:column' }, toolbar, ...(guide ? [guide] : []), h('div', { class: 'tmap' }, wrap, side));
}
