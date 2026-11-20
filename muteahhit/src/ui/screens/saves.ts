import { formatDate } from '../../core/calendar';
import { formatMoney } from '../../core/money';
import { MANUAL_SLOTS } from '../../save/manager';
import { h, press, toast, askConfirm } from '../dom';
import type { App } from '../app';
import { hubScreen } from './hub';
import { Store } from '../../core/store';

export function savesScreen(app: App): HTMLElement {
  const body = h('div', { class: 'body' });
  const root = h('div', { class: 'page' }, h('header', {}, h('button', { class: 'btn back', 'aria-label': 'Geri', onclick: () => { press(app); app.menu(); } }, '‹'), h('h2', {}, 'Kayıtlar')), body);
  const draw = async () => {
    body.innerHTML = '';
    let list: Awaited<ReturnType<typeof app.saves.list>> = [];
    try { list = await app.saves.list(); } catch { body.append(h('p', { class: 'mute' }, 'Kayıtlar okunamadı.')); return; }
    if (!list.length) { body.append(h('div', { class: 'card' }, 'Henüz kayıt yok. Yeni bir oyun başlatın; oyun her ay başında otomatik kaydeder.')); return; }
    for (const s of list) {
      const bad = s.savedAt === 0;
      const when = bad ? '' : new Date(s.savedAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
      const label = s.slot.startsWith('auto') ? `Otomatik ${s.slot.slice(4)}` : `Manuel ${s.slot.replace('manual', '')}`;
      body.append(h('div', { class: 'card slot' },
        h('div', { style: 'flex:1;min-width:0' }, h('div', { class: 't' }, bad ? '(bozuk kayıt)' : s.company), h('div', { class: 's num' }, bad ? label : `${label} · ${formatDate(s.day)} · ${formatMoney(s.cash)} · ${when}`)),
        h('button', { class: 'btn gold', disabled: bad, onclick: async () => {
          press(app, 'confirm');
          const r = await app.saves.load(s.slot);
          if (!r.ok) { toast(`Yüklenemedi: ${r.detail}`); app.audio.sfx('error'); return; }
          app.setStore(new Store(r.state)); app.go(hubScreen(app), 'none');
        } }, 'Yükle'),
        h('button', { class: 'btn danger', 'aria-label': 'Sil', onclick: async () => { askConfirm(`${bad ? 'Bozuk kayıt' : s.company} silinsin mi?`).then(async (ok) => { if (!ok) return; await app.saves.remove(s.slot); app.audio.sfx('click'); void draw();  });} }, 'Sil')));
    }
    body.append(h('p', { class: 'mute', style: 'font-size:12px' }, `3 otomatik ve ${MANUAL_SLOTS} manuel slot bulunur.`));
  };
  void draw();
  return root;
}
