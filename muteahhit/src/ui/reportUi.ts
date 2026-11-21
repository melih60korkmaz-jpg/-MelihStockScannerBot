import { cityData, ledgerCat } from '../data';
import { rivalProfile, rivalWorth, standing } from '../sim/rivalLife';
import { STYLE_LABEL } from '../sim/rivals';
import type { Rival } from '../core/types';
import { canChangeFocus } from '../sim/control';
import { openFocus } from './manageUi';
import { fmt } from './components';
import { h } from './dom';
import { emblemSvg } from './emblem';
import type { App } from './app';

const catLabel = (id: string) => ledgerCat(id)?.label ?? id;
const openModal = (label: string, body: HTMLElement): void => {
  const m = h('div', { class: 'modal', role: 'dialog', 'aria-label': label }); const close = () => m.remove();
  body.style.cssText += ';max-height:88vh;overflow:auto'; body.append(h('button', { class: 'btn gold', style: 'margin-top:10px', onclick: close }, 'Kapat'));
  m.append(body); m.addEventListener('pointerdown', (e) => { if (e.target === m) close(); }); document.body.append(m);
};

/** Rakip kartı: logo, sahibi, slogan, hikâye, güç ve son hamle. */
export function openRival(app: App, r: Rival): void {
  const s = app.store.state, p = rivalProfile(s, r), st = standing(s), pos = st.list.findIndex((x) => x.id === r.id) + 1;
  const stat = (k: string, v: string) => h('div', { class: 'row', style: 'min-height:34px' }, h('div', { class: 'lbl' }, k), h('b', {}, v));
  openModal(r.name, h('div', { class: 'card helpcard' },
    h('div', { style: 'display:flex;gap:12px;align-items:center' }, h('div', { html: emblemSvg(p.shape, p.color, 64) }), h('div', {}, h('h2', { style: 'margin:0' }, r.name), h('div', { class: 'mute', style: 'font-size:13px' }, `${p.owner} · ${cityData(r.home)?.label ?? r.home}`))),
    h('p', { style: 'font-style:italic;margin:10px 0 4px' }, `“${p.motto}”`), h('p', { class: 'mute', style: 'margin:0 0 8px;font-size:13px' }, p.story),
    stat('Tarz', STYLE_LABEL[r.style]), stat('İtibar', String(Math.round(r.rep))), stat('Teknik güç', String(Math.round(r.tech))), stat('Aktif proje', String(r.projects)), stat('Kazandığı ihale', String(r.wins)),
    r.failed ? null : stat('Tahmini değer', fmt(rivalWorth(r))), r.failed ? null : stat('Sektör sırası', `${pos}. / ${st.total}`),
    h('div', { class: 'mute', style: 'font-size:12px;margin-top:6px' }, p.status)));
}

/** Yıllık rapor penceresi: seçili yıl (varsayılan en yeni) ve önceki yıllar için sekmeler. */
export function openYearReport(app: App, year?: number): void {
  const s = app.store.state, reps = s.reports ?? [];
  if (!reps.length) { openModal('Yıllık rapor', h('div', { class: 'card helpcard' }, h('h2', {}, '📋 Yıllık rapor'), h('p', { class: 'mute' }, 'İlk rapor, ilk takvim yılınız bittiğinde (1 Ocak) hazırlanır.'))); return; }
  const r = reps.find((x) => x.year === year) ?? reps[reps.length - 1]!, i = reps.indexOf(r), prev = reps[i - 1];
  const line = (k: string, v: string, tone = '') => h('div', { class: 'row', style: 'min-height:34px' }, h('div', { class: 'lbl' }, k), h('b', { class: tone }, v));
  const sign = (v: number) => (v > 0 ? '+' : '') + fmt(v);
  const verdict = r.profit < 0 ? 'Zarar yılı. Giderleri ve maaş yükünü gözden geçirin.' : r.rank === 1 ? 'Sektörün lideri sizsiniz. Zirveyi korumaya bakın.' : r.profit > 0 && (r.netWorthChange ?? 1) > 0 ? 'İyi bir yıl: hem kâr ettiniz hem değer kazandınız.' : 'Kârlı ama değer artmadı; yatırım ve borç dengesine bakın.';
  const tabs = h('div', { class: 'seg', style: 'margin-bottom:8px;flex-wrap:wrap' }, ...reps.slice(-6).map((x) => h('button', { class: x.year === r.year ? 'on' : '', onclick: (e: Event) => { (e.target as HTMLElement).closest('.modal')?.remove(); openYearReport(app, x.year); } }, String(x.year))));
  openModal('Yıllık rapor', h('div', { class: 'card helpcard' }, h('h2', {}, `📋 ${r.year} yıllık raporu`), tabs,
    line('Gelir', fmt(r.revenue), 'pos'), line('Gider', fmt(r.expense), 'neg'), line('Faaliyet kârı', sign(r.profit), r.profit >= 0 ? 'pos' : 'neg'),
    line('Net değer', fmt(r.netWorth)), r.netWorthChange !== null ? line('Yıllık değişim', sign(r.netWorthChange), r.netWorthChange >= 0 ? 'pos' : 'neg') : null,
    r.topIncome ? line('En büyük gelir', `${catLabel(r.topIncome.cat)} · ${fmt(r.topIncome.amount)}`) : null, r.topExpense ? line('En büyük gider', `${catLabel(r.topExpense.cat)} · ${fmt(r.topExpense.amount)}`) : null,
    line('Tamamlanan iş', String(r.completed)), line('Satılan proje', String(r.sold)), line('İtibar / seviye', `${r.reputation} · ${r.level}`), line('Ekip', `${r.staff} kişi`),
    line('Sektör sırası', `${r.rank}. / ${r.rivals}${r.leader ? ` (lider: ${r.leader})` : ''}`, r.rank === 1 ? 'pos' : ''),
    prev ? h('div', { class: 'mute', style: 'font-size:12px;margin-top:4px' }, `Geçen yıl kâr: ${fmt(prev.profit)}`) : null,
    h('p', { style: 'margin:8px 0 0;font-weight:600' }, verdict),
    canChangeFocus(app.store.state) && app.store.state.company!.level >= 2 ? h('button', { class: 'btn gold', style: 'margin-top:8px', onclick: () => openFocus(app) }, '🎯 Yeni yılın odağını seç') : null));
}
