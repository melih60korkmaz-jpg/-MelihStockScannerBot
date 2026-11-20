import { STAGES, buildingType, cityData, quality } from '../../data';
import { fairValue, ownedParcels } from '../../sim/land';
import { COMMISSION } from '../../sim/projects';
import { h, press, toast, askConfirm } from '../dom';
import { colored, fmt, nf, ZONING_LABEL } from '../components';
import type { App } from '../app';
import { startConstructionUI } from '../startFlow';
import { buildingArt, emptyArt, EMOJI } from '../art';
import { remainingDays } from '../../sim/construction';
import { formatDate } from '../../core/calendar';
import { openParcel } from './parcel';
import { openProjectWizard } from './projectWizard';
import { openSales } from './sales';
import { unitsOf } from '../../sim/sales';

/** Projeler sekmesi: taslak projeler ve sahip olunan arsalar. */
export function projectsView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, parcels = ownedParcels(s);
  const projs = h('div', {}); const lots = h('div', {});
  if (!s.projects.length) projs.append(h('div', { class: 'card emptyfx' }, h('div', { html: emptyArt('proje') }), h('b', {}, 'Henüz projeniz yok'), h('span', { class: 'mute' }, 'Arsa dosyasından "Proje başlat" ile ilk projenizi oluşturun.'), h('button', { class: 'btn gold', onclick: () => app.openTab?.('harita') }, 'Haritaya git')));
  const STATUS: Record<string, [string, string]> = { taslak: ['Taslak', 'warn'], insaat: ['İnşaat', 'good'], tamamlandi: ['Teslim edildi', 'good'], satildi: ['Satıldı', ''] };
  for (const pr of s.projects) {
    const p = s.parcels.find((x) => x.id === pr.parcelId), t = buildingType(pr.type)!, q = quality(pr.quality)!, b = pr.build;
    const land = p?.costBasis ?? 0, profit = pr.status === 'satildi' ? (pr.result?.profit ?? 0) : pr.expected.revenue - (pr.contract ? 0 : Math.round(pr.expected.revenue * COMMISSION)) - pr.budget.total - land;
    const stage = pr.status === 'insaat' && b ? STAGES[b.stage]! : null;
    const prog = pr.status === 'insaat' && b ? (STAGES.slice(1, b.stage).reduce((a, x) => a + x.cost, 0) + STAGES[b.stage]!.cost * b.progress) / 100 : pr.status === 'taslak' ? 0 : 1;
    const spent = b ? b.spent + (b.matCost ?? 0) + b.unpaid : 0, left = Math.max(0, pr.budget.total - spent), eta = pr.status === 'insaat' && b ? remainingDays(pr) : null;
    projs.append(h('div', { class: `card pj st-${pr.status}`, style: 'margin-bottom:10px' }, h('div', { class: 'pcover', html: buildingArt(pr.type, pr.floors, pr.status === 'taslak' ? 0.02 : prog, pr.designSeed, pr.quality) }), h('div', { class: 'pbody' },
      h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, h('h3', { style: 'font-size:22px;flex:1' }, pr.name), h('span', { class: 'chip' }, t.label), h('span', { class: 'chip' }, q.label), h('span', { class: `chip ${STATUS[pr.status]![1]}` }, STATUS[pr.status]![0]), b?.stalled ? h('span', { class: 'chip bad' }, 'Nakit yok') : null),
      h('div', { class: 'mute', style: 'font-size:12px;margin:4px 0 8px' }, `${pr.hood} · ${cityData(pr.cityId)?.label} · ${pr.floors} kat · brüt ${nf(pr.brut)} m² · satılabilir ${nf(pr.satilabilir)} m²`),
      h('div', { class: 'kpis' }, h('div', { class: 'kpi', html: `<small>Proje bütçesi</small><b>${fmt(pr.budget.total)}</b>` }), h('div', { class: 'kpi', html: `<small>${pr.status === 'satildi' ? 'Satış' : 'Beklenen gelir'}</small><b>${fmt(pr.status === 'satildi' ? (pr.result?.revenue ?? 0) : pr.expected.revenue)}</b>` }), h('div', { class: 'kpi' }, h('small', {}, pr.status === 'satildi' ? 'Gerçekleşen kâr' : 'Beklenen kâr'), h('b', {}, colored(profit)))),
      pr.contract ? h('div', { class: 'mute', style: 'font-size:12px;margin-top:6px' }, `İhale işi · ${pr.contract.client} · teslim ${pr.contract.deadline - app.store.state.clock.day} gün kaldı`) : null,
      pr.sales && !pr.contract && pr.status !== 'taslak' ? h('div', { class: 'mute', style: 'font-size:12px;margin-top:6px' }, `Satış: ${unitsOf(s, pr.id).filter((u) => u.status === 'satildi').length}/${unitsOf(s, pr.id).length} daire · sözleşme ${fmt(pr.sales.contract)}${pr.sales.presale ? ' · ön satış açık' : ''}`) : null,
      pr.status === 'insaat' && b ? h('div', { class: 'pjfacts' }, h('span', {}, '📅 Tahmini bitiş ', h('b', {}, formatDate(app.store.state.clock.day + Math.round(eta ?? 0)))), h('span', {}, '💸 Gerçekleşen ', h('b', {}, fmt(spent))), h('span', {}, '🧾 Kalan bütçe ', h('b', { class: left <= 0 ? 'neg' : '' }, fmt(left)))) : null,
      pr.status === 'insaat' || pr.status === 'tamamlandi' ? h('div', { style: 'margin-top:8px' }, h('div', { class: 'meter' }, h('i', { style: `width:${Math.round(prog * 100)}%;background:var(--gold)` })), h('div', { class: 'mute', style: 'font-size:12px' }, stage ? `${stage.label} · bütçe ilerlemesi ${Math.round(prog * 100)}%` : `Kalite puanı ${pr.result?.qualityScore ?? '-'}`)) : null,
      h('div', { style: 'display:flex;gap:8px;margin-top:10px;justify-content:flex-end;flex-wrap:wrap' },
        pr.sales && !pr.contract && (pr.status === 'insaat' || pr.status === 'tamamlandi') ? h('button', { class: pr.status === 'tamamlandi' ? 'btn gold' : 'btn', onclick: () => { press(app); openSales(app, pr.id, refresh); } }, 'Satış merkezi') : null,
        pr.status === 'taslak' ? h('button', { class: 'btn gold', onclick: () => { press(app); startConstructionUI(app, pr.id, () => app.openSite(pr.id)); } }, '🏗️ İnşaatı başlat') : null,
        pr.status !== 'satildi' ? h('button', { class: pr.status === 'taslak' || pr.status === 'insaat' ? 'btn gold' : 'btn', onclick: () => { press(app); app.openSite(pr.id); } }, pr.status === 'taslak' ? 'Şantiyeyi gör' : pr.status === 'insaat' ? 'Şantiyeyi aç' : 'Binayı aç') : null,
        p && !pr.contract && pr.status !== 'satildi' ? h('button', { class: 'btn', onclick: () => { press(app); openParcel(app, p.id, refresh); } }, 'Arsa dosyası') : null,
        pr.status === 'taslak' && !pr.contract ? h('button', { class: 'btn danger', onclick: () => { askConfirm('Proje iptal edilsin mi? Ödenen tasarım bedeli geri gelmez.').then(async (ok) => { if (!ok) return; const r = app.store.run('CancelProject', { projectId: pr.id }); if (r.ok) { app.audio.sfx('click'); toast('Proje iptal edildi.'); } else toast(r.error);  });} }, 'Projeyi iptal et') : null))));
  }
  if (!parcels.length) lots.append(h('div', { class: 'card emptyfx' }, h('div', { html: emptyArt('arsa') }), h('b', {}, 'Henüz arsanız yok'), h('span', { class: 'mute' }, 'Harita sekmesinden bir bölge seçip arsa inceleyin.'), h('button', { class: 'btn', onclick: () => app.openTab?.('harita') }, 'Arsa bul')));
  for (const p of parcels) {
    lots.append(h('div', { class: 'card pcard mine', role: 'button', tabindex: 0, onclick: () => { press(app); openParcel(app, p.id, refresh); } },
      h('div', { style: 'min-width:0' }, h('div', { class: 't' }, p.hood), h('div', { class: 's' }, `${cityData(p.city)?.label} · ${nf(p.area)} m² · ${ZONING_LABEL[p.zoning]} · maliyet ${fmt(p.costBasis ?? 0)}`),
        h('div', { style: 'margin-top:4px;display:flex;gap:5px' }, p.projectId !== undefined ? h('span', { class: 'chip good' }, 'Projeli') : h('span', { class: 'chip warn' }, 'Boş arsa'), p.listed ? h('span', { class: 'chip' }, 'Satışta') : null)),
      h('div', { class: 'pr' }, fmt(fairValue(s, p)), h('small', {}, 'piyasa değeri')),
      p.projectId === undefined ? h('button', { class: 'btn gold', style: 'min-height:40px', onclick: (e: Event) => { e.stopPropagation(); press(app); openProjectWizard(app, p.id, refresh); } }, 'Proje başlat') : null));
  }
  return h('div', { class: 'cols' }, h('div', { class: 'col' }, h('div', { class: 'lbl-s' }, `${EMOJI.insaat} Projeler`), projs), h('div', { class: 'col' }, h('div', { class: 'lbl-s' }, `${EMOJI.harita} Arsalarım`), lots));
}
