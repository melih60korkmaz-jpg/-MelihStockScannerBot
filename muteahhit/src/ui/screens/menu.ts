import { formatDate } from '../../core/calendar';
import { formatMoney } from '../../core/money';
import { h, press, toast } from '../dom';
import { emblemSvg } from '../emblem';
import type { App } from '../app';
import { openSettings } from './settings';
import { newGameScreen } from './wizard';
import { savesScreen } from './saves';
import { hubScreen } from './hub';
import { openGuide } from '../guide';

export function menuScreen(app: App): HTMLElement {
  app.audio.setMood('menu');
  app.scene?.setMood('menu'); app.scene?.start();

  const cont = h('div', { class: 'card cont', role: 'button', tabindex: 0, style: 'visibility:hidden' });
  // En yeni geçerli kaydı göster; yoksa "Devam Et" gizli kalır (sahte buton yok).
  void app.saves.loadLatestValid().then((r) => {
    if (!r || !r.state.company) return;
    const c = r.state.company;
    cont.innerHTML = '';
    cont.append(h('span', { html: emblemSvg(c.emblem.shape, c.emblem.color, 46) }),
      h('div', { style: 'flex:1;min-width:0' }, h('div', { class: 'mute', style: 'font-size:11px;letter-spacing:.12em' }, 'DEVAM ET'),
        h('div', { class: 't' }, c.name), h('div', { class: 's num' }, `${formatDate(r.state.clock.day)} · Kasa ${formatMoney(c.cash)}`)),
      h('span', { class: 'btn gold', style: 'min-height:40px' }, '▶'));
    cont.style.visibility = 'visible';
    const go = () => { press(app, 'confirm', 'medium'); app.setStore(new (app.store.constructor as any)(r.state)); app.go(hubScreen(app), 'none'); };
    cont.onclick = go; cont.onkeydown = (e) => { if (e.key === 'Enter') go(); };
    if (r.skipped.length) toast('Bozuk bir kayıt atlandı; son geçerli kayıt yüklendi.');
  }).catch(() => { /* kayıt okunamadı: Devam Et gizli kalır, oyun çalışır */ });

  const btn = (label: string, fn: () => void, cls = '') => h('button', { class: `btn lg ${cls}`, onclick: () => { press(app); fn(); } }, label);
  return h('div', { class: 'menu' }, h('div', { class: 'col' },
    h('div', { class: 'logo' }, h('div', {}, h('div', { class: 'word' }, 'MÜTE', h('i', {}, 'AHHİT')), h('div', { class: 'tag' }, 'TEMELDEN ZİRVEYE'))),
    cont,
    btn('Yeni Oyun', () => app.go(newGameScreen(app), 'setup'), 'gold'),
    btn('Kayıtlar', () => app.go(savesScreen(app), 'calm')),
    btn('Nasıl oynanır?', () => openGuide(app)),
    btn('Ayarlar', () => { openSettings({ ...app, activeTier: () => app.scene?.activeTier ?? 'mid' }); }),
    h('div', { class: 'foot' }, `v1.1 · ${app.persistent ? 'Kayıtlar bu cihazda saklanır' : 'Kayıt kalıcı değil (gizli mod?)'}`),
  ));
}
