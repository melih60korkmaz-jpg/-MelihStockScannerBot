import { h } from './dom';
import { GUIDE, TAB_TOPIC, type Block, type Topic } from './guideContent';
import { startTutorial } from './tutorial';
import type { App } from './app';

/**
 * Rehber: oyunun nasıl oynandığını, her ekranın işini ve takılınca yapılacakları anlatır.
 * Sol: konu listesi + arama, sağ: içerik. Açıkken oyun zamanı bekler (.modal). Hangi ekrandan açılırsa o ekranın konusunda açılır.
 */
export { TAB_TOPIC };
const norm = (s: string) => s.toLocaleLowerCase('tr').replace(/[̇]/g, '');
const flat = (t: Topic): string => norm(t.title + ' ' + t.blocks.map((b) => ('h' in b ? b.h : 'p' in b ? b.p : 'tip' in b ? b.tip : 'warn' in b ? b.warn : 'ul' in b ? b.ul.join(' ') : b.qa.map((x) => x.join(' ')).join(' '))).join(' '));
const INDEX = GUIDE.map((t) => ({ t, text: flat(t) }));

function hl(text: string, q: string): (Node | string)[] {
  if (!q) return [text];
  const out: (Node | string)[] = [], low = norm(text); let i = 0, k: number;
  while ((k = low.indexOf(q, i)) >= 0) { out.push(text.slice(i, k)); out.push(h('mark', {}, text.slice(k, k + q.length))); i = k + q.length; }
  out.push(text.slice(i)); return out;
}

export function openGuide(app: App, topicId?: string): void {
  document.querySelectorAll('.modal.guide').forEach((x) => x.remove());
  let cur = GUIDE.some((t) => t.id === topicId) ? topicId! : GUIDE[0]!.id, q = '';
  const modal = h('div', { class: 'modal guide', role: 'dialog', 'aria-label': 'Rehber' });
  const nav = h('nav', { class: 'gnav', 'aria-label': 'Konular' }), body = h('div', { class: 'gbody' }), count = h('small', { class: 'mute gcount' });
  const search = h('input', { class: 'input gsearch', type: 'search', placeholder: 'Ara: örn. kredi, kapora, moral…', 'aria-label': 'Rehberde ara' }) as HTMLInputElement;
  const close = () => { modal.classList.add('leaving'); setTimeout(() => modal.remove(), app.settings.reduced ? 0 : 160); };
  const matches = () => INDEX.filter((x) => !q || x.text.includes(q));

  const block = (b: Block): HTMLElement => {
    if ('h' in b) return h('h3', {}, ...hl(b.h, q));
    if ('p' in b) return h('p', {}, ...hl(b.p, q));
    if ('ul' in b) return h('ul', {}, ...b.ul.map((x) => h('li', {}, ...hl(x, q))));
    if ('tip' in b) return h('div', { class: 'gtip' }, h('b', {}, '💡 İpucu '), ...hl(b.tip, q));
    if ('warn' in b) return h('div', { class: 'gwarn' }, h('b', {}, '⚠️ Dikkat '), ...hl(b.warn, q));
    return h('div', { class: 'gqa' }, ...b.qa.map(([a, c]) => h('details', {}, h('summary', {}, ...hl(a, q)), h('p', {}, ...hl(c, q)))));
  };
  const render = () => {
    const ms = matches(); if (ms.length && !ms.some((x) => x.t.id === cur)) cur = ms[0]!.t.id;
    nav.innerHTML = '';
    for (const { t } of ms) nav.append(h('button', { class: t.id === cur ? 'on' : '', 'aria-current': t.id === cur ? 'true' : null, onclick: () => { app.audio.sfx('click'); cur = t.id; render(); body.scrollTop = 0; } }, h('span', {}, t.ico), t.title));
    count.textContent = q ? `${ms.length} konuda bulundu` : `${GUIDE.length} konu`;
    body.innerHTML = '';
    const t = GUIDE.find((x) => x.id === cur);
    if (!ms.length || !t) { body.append(h('div', { class: 'empty' }, `"${q}" için sonuç yok. Başka bir sözcük dene ya da "Takıldım!" konusuna bak.`)); return; }
    body.append(h('h2', {}, `${t.ico} ${t.title}`), ...t.blocks.map(block));
    if (q) body.querySelectorAll('details').forEach((d) => { if (d.querySelector('mark')) d.setAttribute('open', ''); });
    nav.querySelector('.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (q) body.querySelector('mark')?.scrollIntoView({ block: 'center' });
  };
  search.addEventListener('input', () => { q = norm(search.value.trim()); render(); });
  modal.append(h('div', { class: 'card guidecard' },
    h('div', { class: 'ghead' }, h('h2', {}, '📖 Rehber'), search, count, ...(typeof app.openTab === 'function' ? [h('button', { class: 'btn', style: 'min-height:38px;font-size:13px', onclick: () => { close(); setTimeout(() => startTutorial(app), 200); } }, 'Anlatıcıyı izle')] : []), h('button', { class: 'btn gold', style: 'min-height:38px', onclick: () => { app.audio.sfx('click'); close(); } }, 'Kapat')),
    h('div', { class: 'gmain' }, nav, body)));
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  document.body.append(modal); render();
}
