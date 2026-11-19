import { buildingType, cityData, quality } from '../../data';
import { fairValue, ownedParcels } from '../../sim/land';
import { COMMISSION } from '../../sim/projects';
import { h, press, toast } from '../dom';
import { colored, fmt, nf, ZONING_LABEL } from '../components';
import type { App } from '../app';
import { openParcel } from './parcel';
import { openProjectWizard } from './projectWizard';

/** Projeler sekmesi: taslak projeler ve sahip olunan arsalar. */
export function projectsView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, parcels = ownedParcels(s);
  const projs = h('div', {}); const lots = h('div', {});
  if (!s.projects.length) projs.append(h('div', { class: 'card empty' }, 'Henüz projeniz yok. Arsa dosyasından "Proje başlat" ile ilk projenizi oluşturun.'));
  for (const pr of s.projects) {
    const p = s.parcels.find((x) => x.id === pr.parcelId), t = buildingType(pr.type)!, q = quality(pr.quality)!;
    const land = p?.costBasis ?? 0, profit = pr.expected.revenue - Math.round(pr.expected.revenue * COMMISSION) - pr.budget.total - land;
    projs.append(h('div', { class: 'card', style: 'margin-bottom:10px' },
      h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, h('h3', { style: 'font-size:22px;flex:1' }, pr.name), h('span', { class: 'chip' }, t.label), h('span', { class: 'chip' }, q.label), h('span', { class: 'chip warn' }, 'Taslak')),
      h('div', { class: 'mute', style: 'font-size:12px;margin:4px 0 8px' }, `${p?.hood ?? ''} · ${cityData(pr.cityId)?.label} · ${pr.floors} kat · brüt ${nf(pr.brut)} m² · satılabilir ${nf(pr.satilabilir)} m²`),
      h('div', { class: 'kpis' }, h('div', { class: 'kpi', html: `<small>Proje bütçesi</small><b>${fmt(pr.budget.total)}</b>` }), h('div', { class: 'kpi', html: `<small>Beklenen gelir</small><b>${fmt(pr.expected.revenue)}</b>` }), h('div', { class: 'kpi' }, h('small', {}, 'Beklenen kâr'), h('b', {}, colored(profit)))),
      h('div', { class: 'mute', style: 'font-size:12px;margin-top:8px' }, `~${pr.expected.months} ay sürecek (tahmin). İnşaat aşaması bu sürümde henüz yok; proje taslak olarak saklanır.`),
      h('div', { style: 'display:flex;gap:8px;margin-top:8px;justify-content:flex-end;flex-wrap:wrap' },
        h('button', { class: 'btn', onclick: () => { if (p) { press(app); openParcel(app, p.id, refresh); } } }, 'Arsa dosyası'),
        h('button', { class: 'btn danger', onclick: () => { if (!confirm('Proje iptal edilsin mi? Ödenen tasarım bedeli geri gelmez.')) return; const r = app.store.run('CancelProject', { projectId: pr.id }); if (r.ok) { app.audio.sfx('click'); toast('Proje iptal edildi.'); } else toast(r.error); } }, 'Projeyi iptal et'))));
  }
  if (!parcels.length) lots.append(h('div', { class: 'card empty' }, 'Henüz arsanız yok. Harita sekmesinden bir bölge seçip arsa inceleyin.'));
  for (const p of parcels) {
    lots.append(h('div', { class: 'card pcard mine', role: 'button', tabindex: 0, onclick: () => { press(app); openParcel(app, p.id, refresh); } },
      h('div', { style: 'min-width:0' }, h('div', { class: 't' }, p.hood), h('div', { class: 's' }, `${cityData(p.city)?.label} · ${nf(p.area)} m² · ${ZONING_LABEL[p.zoning]} · maliyet ${fmt(p.costBasis ?? 0)}`),
        h('div', { style: 'margin-top:4px;display:flex;gap:5px' }, p.projectId !== undefined ? h('span', { class: 'chip good' }, 'Projeli') : h('span', { class: 'chip warn' }, 'Boş arsa'), p.listed ? h('span', { class: 'chip' }, 'Satışta') : null)),
      h('div', { class: 'pr' }, fmt(fairValue(s, p)), h('small', {}, 'piyasa değeri')),
      p.projectId === undefined ? h('button', { class: 'btn gold', style: 'min-height:40px', onclick: (e: Event) => { e.stopPropagation(); press(app); openProjectWizard(app, p.id, refresh); } }, 'Proje başlat') : null));
  }
  return h('div', { class: 'cols' }, h('div', { class: 'col' }, h('div', { class: 'lbl-s' }, 'Projeler'), projs), h('div', { class: 'col' }, h('div', { class: 'lbl-s' }, 'Arsalarım'), lots));
}
