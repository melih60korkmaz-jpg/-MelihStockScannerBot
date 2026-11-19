import { ACHIEVEMENTS, LEVEL_DEFS, QUESTS, officeFor } from '../../data';
import { levelChecks, metric, nextLevel, officeStepFor } from '../../sim/progress';
import { h, press, toast } from '../dom';
import { fmt, nf } from '../components';
import type { App } from '../app';
import { TL } from '../../core/money';

const fmtVal = (label: string, v: number) => (label.includes('₺') ? nf(v / 1e6, 1) + ' M' : nf(v));

/** Seviye kartı: şirket unvanı, sonraki seviye şartları ve ofis yükseltme. */
export function levelCard(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!, cur = LEVEL_DEFS[c.level - 1]!, nl = nextLevel(s), card = h('div', { class: 'card' });
  card.append(h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' }, h('div', { class: 'lbl-s', style: 'margin:0' }, 'Şirket seviyesi'), h('span', { class: 'chip good' }, `Seviye ${c.level}/${LEVEL_DEFS.length}`)), h('div', { style: 'font:600 20px var(--display,inherit);margin:4px 0' }, cur.label));
  if (nl) {
    const checks = levelChecks(s, nl.level), done = checks.filter((x) => x.ok).length;
    card.append(h('div', { class: 'meter' }, h('i', { style: `width:${Math.round((done / Math.max(1, checks.length)) * 100)}%;background:var(--gold)` })), h('div', { class: 'mute', style: 'font-size:12px;margin:6px 0 4px' }, `Sonraki: ${nl.label}`),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:5px' }, ...checks.map((x) => h('span', { class: `chip ${x.ok ? 'good' : ''}`, title: `${x.label}: ${fmtVal(x.label, x.have)} / ${fmtVal(x.label, x.need)}` }, `${x.label.replace(' (₺)', '')} ${fmtVal(x.label, x.have)}/${fmtVal(x.label, x.need)}`))));
  } else card.append(h('div', { class: 'mute', style: 'font-size:12px' }, 'En üst seviyedesiniz.'));
  const st = officeStepFor(s);
  card.append(h('div', { class: 'mute', style: 'font-size:12px;margin-top:8px' }, `Ofis: ${officeFor(c.office).label} · ${officeFor(c.office).capacity} kişi.${st ? ` Sonraki ofis ${fmt(TL(st.costTL))}, seviye ${st.minLevel} ister.` : ''}`));
  if (st) card.append(h('button', { class: 'btn', style: 'margin-top:6px;min-height:38px', disabled: c.level < st.minLevel || c.cash < TL(st.costTL), onclick: () => { const r = app.store.run('UpgradeOffice', {}); if (r.ok) { app.audio.sfx('stamp'); toast('Yeni ofise taşındınız!'); refresh(); } else { app.audio.sfx('error'); toast(r.error); } } }, 'Ofisi büyüt'));
  return card;
}

/** Görev kartı: sıradaki 3 görev ve ilerleme; başarım penceresi. */
export function questsCard(app: App): HTMLElement {
  const s = app.store.state, open = QUESTS.filter((q) => s.progress.quests[q.id] === undefined).slice(0, 3), doneN = Object.keys(s.progress.quests).length;
  const card = h('div', { class: 'card' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' }, h('div', { class: 'lbl-s', style: 'margin:0' }, 'Görevler'), h('span', { class: 'mute', style: 'font-size:12px' }, `${doneN}/${QUESTS.length} tamam`)));
  if (!open.length) card.append(h('div', { class: 'empty' }, 'Tüm görevler tamamlandı!'));
  for (const q of open) {
    const have = Math.min(q.n, metric(s, q.m)), pct = Math.round((have / q.n) * 100), rw = [q.r.cash ? fmt(TL(q.r.cash)) : '', q.r.rep ? `+${q.r.rep} itibar` : '', q.r.score ? `+${q.r.score} not` : ''].filter(Boolean).join(' · ');
    card.append(h('div', { style: 'padding:6px 0;border-top:1px solid var(--line)' }, h('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, h('b', {}, q.t), h('span', { class: 'mute', style: 'font-size:11px' }, rw)), h('div', { class: 'mute', style: 'font-size:12px' }, q.x), h('div', { class: 'meter', style: 'margin-top:4px' }, h('i', { style: `width:${pct}%;background:var(--ok)` }))));
  }
  card.append(h('button', { class: 'btn', style: 'margin-top:8px;min-height:38px', onclick: () => { press(app); openAchievements(app); } }, `Başarımlar ${Object.keys(s.progress.ach).length}/${ACHIEVEMENTS.length}`));
  return card;
}

export function openAchievements(app: App): void {
  const s = app.store.state, modal = h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Başarımlar' }); const close = () => modal.remove(); modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  const list = h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;overflow:auto;max-height:70vh;padding:2px' });
  for (const a of ACHIEVEMENTS) { const got = s.progress.ach[a.id] !== undefined; list.append(h('div', { class: 'card', style: `padding:10px;opacity:${got ? 1 : 0.55}` }, h('div', { style: 'display:flex;gap:6px;align-items:center' }, h('span', { style: `font-size:18px;filter:${got ? 'none' : 'grayscale(1)'}` }, got ? '🏆' : '🔒'), h('b', {}, a.t)), h('div', { class: 'mute', style: 'font-size:12px;margin-top:2px' }, a.x))); }
  modal.append(h('div', { class: 'card', style: 'width:min(780px,96vw)' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px' }, h('h3', {}, `Başarımlar · ${Object.keys(s.progress.ach).length}/${ACHIEVEMENTS.length}`), h('button', { class: 'btn', onclick: close }, 'Kapat')), list));
  document.body.append(modal);
}
