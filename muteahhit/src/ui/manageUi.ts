import { formatDate } from '../core/calendar';
import { FOCI, MANAGER_TYPES, ORDERS, ORDER_DAYS, activeOrder, canChangeFocus, focusLabel, managerEff, managerOf, projectMods } from '../sim/control';
import { traitOf } from '../sim/staff';
import { staffType } from '../data';
import { h, press, toast } from './dom';
import { dealsOpen } from '../sim/deals';
import { openDeals } from './dealsUi';
import type { App } from './app';

const modal = (label: string, card: HTMLElement): HTMLElement => {
  const m = h('div', { class: 'modal', role: 'dialog', 'aria-label': label }); const close = () => m.remove();
  card.style.cssText += ';width:min(560px,96vw);max-height:90vh;overflow:auto'; card.append(h('button', { class: 'btn', style: 'margin-top:10px', onclick: close }, 'Kapat'));
  m.append(card); m.addEventListener('pointerdown', (e) => { if (e.target === m) close(); }); document.body.append(m); return m;
};
const choice = (title: string, sub: string, onclick: () => void, disabled = false) => h('button', { class: 'btn choice', style: 'display:block;width:100%;text-align:left;margin-top:8px;padding:10px 12px;height:auto', disabled, onclick }, h('b', {}, title), h('div', { class: 'mute', style: 'font-size:12px;margin-top:2px' }, sub));

/** Proje yönetimi: süreli emirler ve proje müdürü. */
export function openManage(app: App, projectId: number): void {
  const m = document.querySelector('.modal.manage'); m?.remove();
  const render = () => {
    const s = app.store.state, p = s.projects.find((x) => x.id === projectId); if (!p) return;
    const ord = activeOrder(s, p), mgr = managerOf(s, p), mods = projectMods(s, p), card = h('div', { class: 'card helpcard' });
    card.append(h('h2', {}, `🎛️ ${p.name}`), h('p', { class: 'mute', style: 'margin:0 0 6px' }, p.status === 'insaat' ? 'Burada verdiğiniz emirler ve atadığınız müdür inşaatı doğrudan etkiler.' : 'Emir yalnızca inşaatı süren projelere verilir.'),
      h('div', { class: 'kpis' }, h('div', { class: 'kpi', html: `<small>Hız</small><b>×${mods.speed.toFixed(2)}</b>` }), h('div', { class: 'kpi', html: `<small>Maliyet</small><b>×${mods.cost.toFixed(2)}</b>` }), h('div', { class: 'kpi', html: `<small>Kalite</small><b>${mods.q >= 0 ? '+' : ''}${mods.q.toFixed(1)}</b>` }), h('div', { class: 'kpi', html: `<small>Kaza riski</small><b>×${mods.risk.toFixed(2)}</b>` })));
    card.append(h('div', { class: 'lbl-s', style: 'margin-top:10px' }, 'Emirler'));
    if (ord) card.append(h('div', { class: 'card', style: 'padding:10px' }, h('b', {}, `${ord.ico} ${ord.label}`), h('div', { class: 'mute', style: 'font-size:12px' }, `${formatDate(p.order!.until)} tarihine kadar · ${ord.desc}`), h('button', { class: 'btn', style: 'margin-top:6px', onclick: () => { const r = app.store.run('IssueOrder', { projectId, order: null }); if (r.ok) { press(app); render(); } else toast(r.error); } }, 'Emri iptal et')));
    else for (const o of ORDERS) card.append(choice(`${o.ico} ${o.label}`, `${ORDER_DAYS} gün · ${o.desc}`, () => { const r = app.store.run('IssueOrder', { projectId, order: o.id }); if (r.ok) { app.audio.sfx('confirm'); toast(`Emir verildi: ${o.label}`); render(); } else { app.audio.sfx('error'); toast(r.error); } }, p.status !== 'insaat'));
    card.append(h('div', { class: 'lbl-s', style: 'margin-top:12px' }, 'Proje müdürü'));
    if (mgr) card.append(h('div', { class: 'card', style: 'padding:10px' }, h('b', {}, `${mgr.name}`), h('div', { class: 'mute', style: 'font-size:12px' }, `${staffType(mgr.type)?.label ?? mgr.type} · ${traitOf(mgr).label} · etki ×${managerEff(mgr).toFixed(2)}`), h('button', { class: 'btn', style: 'margin-top:6px', onclick: () => { const r = app.store.run('SetManager', { projectId, staffId: null }); if (r.ok) { press(app); render(); } else toast(r.error); } }, 'Yetkiyi geri al')));
    const busy = new Set(s.projects.filter((q) => q.id !== projectId && q.manager !== undefined && q.status === 'insaat').map((q) => q.manager));
    const pool = s.staff.filter((x) => MANAGER_TYPES.includes(x.type) && x.id !== mgr?.id && !busy.has(x.id));
    if (!pool.length && !mgr) card.append(h('div', { class: 'empty' }, 'Müdür atanabilecek çalışan yok. Şef, mühendis, usta ya da proje yöneticisi işe alın.'));
    for (const x of pool) card.append(choice(`${x.name} · ${staffType(x.type)?.label ?? x.type}`, `${traitOf(x).label} · deneyim ${Math.round(x.experience)} · moral ${Math.round(x.morale)} · etki ×${managerEff(x).toFixed(2)}`, () => { const r = app.store.run('SetManager', { projectId, staffId: x.id }); if (r.ok) { app.audio.sfx('confirm'); toast(`${x.name} proje müdürü oldu`); render(); } else toast(r.error); }));
    const old = document.querySelector('.modal.manage'); if (old) { const c = old.querySelector('.card'); if (c) { old.replaceChild(card, c); card.style.cssText += ';width:min(560px,96vw);max-height:90vh;overflow:auto'; card.append(h('button', { class: 'btn', style: 'margin-top:10px', onclick: () => old.remove() }, 'Kapat')); } return; }
    modal('Proje yönetimi', card).classList.add('manage');
  };
  render();
}

/** Yıllık odak seçimi (yılda bir kez). */
export function openFocus(app: App): void {
  const s = app.store.state, cur = focusLabel(s), can = canChangeFocus(s), card = h('div', { class: 'card helpcard' });
  card.append(h('h2', {}, '🎯 Yıllık odak'), h('p', { class: 'mute', style: 'margin:0' }, can ? 'Bu yıl şirketin yönünü siz belirleyin. Yılda bir kez seçilir.' : `Bu yılın odağı seçildi: ${cur.label}. Yeni yılda yeniden seçebilirsiniz.`));
  let m: HTMLElement;
  for (const f of FOCI) card.append(choice(`${f.ico} ${f.label}${f.id === cur.id ? ' · seçili' : ''}`, f.desc, () => { const r = app.store.run('SetFocus', { id: f.id }); if (r.ok) { app.audio.sfx('confirm'); toast(`Yıllık odak: ${f.label}`); m.remove(); } else toast(r.error); }, !can));
  m = modal('Yıllık odak', card);
}

/** Karar günlüğü: verdiğiniz kararlar ve etkileri. */
export function openDecisions(app: App): void {
  const s = app.store.state, list = s.decisions ?? [], ICO: Record<string, string> = { odak: '🎯', emir: '🎛️', mudur: '👷', ofis: '🪑', firsat: '📢', kurul: '🏛️', olay: '📌' };
  const card = h('div', { class: 'card helpcard' }, h('h2', {}, '📒 Karar günlüğü'), h('p', { class: 'mute', style: 'margin:0 0 6px' }, 'Verdiğiniz kararlar ve anlık etkileri (son 80).'),
    ...(list.length ? list.slice(0, 40).map((d) => h('div', { class: 'row', style: 'align-items:flex-start;padding:8px 0' }, h('span', { style: 'width:26px' }, ICO[d.kind] ?? '📌'), h('div', { class: 'lbl' }, d.title, h('small', {}, d.detail), h('small', { class: 'mute' }, formatDate(d.day))))) : [h('div', { class: 'empty' }, 'Henüz karar yok. Olaylar, kurul toplantıları ve emirleriniz burada birikir.')]));
  modal('Karar günlüğü', card);
}

/** Şirket sekmesi "Yönetim" kartı. */
export function mgmtCard(app: App): HTMLElement {
  const s = app.store.state, f = focusLabel(s), can = canChangeFocus(s), n = (s.decisions ?? []).length;
  return h('div', { class: 'card' },
    h('div', { class: 'row', style: 'min-height:44px' }, h('div', { class: 'lbl' }, `${f.ico} Yıllık odak: ${f.label}`, h('small', {}, can ? 'Bu yıl henüz seçmediniz' : f.desc)), h('button', { class: can ? 'btn gold' : 'btn', style: 'min-height:36px;font-size:12px', onclick: () => { press(app); openFocus(app); } }, can ? 'Seç' : 'Gör')),
    h('div', { class: 'row', style: 'min-height:44px' }, h('div', { class: 'lbl' }, '📢 Fırsat ilanları', h('small', {}, s.company!.level >= 2 ? `${dealsOpen(s).length} açık fırsat: rakip binaları, eski bina arsaları, kat karşılığı` : 'Seviye 2\'de başlar')), h('button', { class: dealsOpen(s).length ? 'btn gold' : 'btn', style: 'min-height:36px;font-size:12px', onclick: () => { press(app); openDeals(app); } }, 'Aç')),
    h('div', { class: 'row', style: 'min-height:44px' }, h('div', { class: 'lbl' }, '🧭 Yönetim Merkezi', h('small', {}, s.mgmt?.meeting ? '🔔 Kurul toplantısı bekliyor' : 'Genel müdür, kurul, hedefler, departmanlar')), h('button', { class: s.mgmt?.meeting ? 'btn gold' : 'btn', style: 'min-height:36px;font-size:12px', onclick: () => { press(app); app.openTab?.('yonetim'); } }, 'Aç')),
    h('div', { class: 'row', style: 'min-height:44px' }, h('div', { class: 'lbl' }, '📒 Karar günlüğü', h('small', {}, `${n} kayıt`)), h('button', { class: 'btn', style: 'min-height:36px;font-size:12px', onclick: () => { press(app); openDecisions(app); } }, `Aç (${n})`)));
}
