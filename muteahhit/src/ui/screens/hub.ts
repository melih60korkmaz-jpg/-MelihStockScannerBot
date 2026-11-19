import { formatDate } from '../../core/calendar';
import { formatMoney } from '../../core/money';
import type { Speed } from '../../core/store';
import { STAFF_TYPES } from '../../data';
import { checkInvariant } from '../../sim/ledger';
import { h, press, toast } from '../dom';
import { emblemSvg } from '../emblem';
import type { App } from '../app';
import { openSettings } from './settings';

/**
 * GEÇİCİ şirket paneli (Faz 3'te gerçek "Şirket Genel Bakış" ekranı bunun yerini alacak).
 * Faz 1 çekirdeğini (komutlar, zaman, defter, kayıt) gerçek oyun akışı içinde doğrular.
 */
export function hubScreen(app: App): HTMLElement {
  app.scene?.stop(); app.audio.setMood('off');
  const root = h('div', { class: 'page', style: 'background:var(--bg)' });
  const log: string[] = []; let msg = '';
  const unsub = app.store.subscribe((evs) => {
    if (!root.isConnected) { unsub(); return; }
    for (const e of evs) if (e.type !== 'DAY' && e.type !== 'SPEED') log.unshift(`${formatDate(e.day)} · ${e.type}`);
    if (evs.some((e) => e.type === 'MONTH')) void app.saves.autosave(app.store.state).catch(() => {});
    draw();
  });

  const draw = () => {
    const s = app.store.state, c = s.company;
    root.innerHTML = '';
    if (!c) { app.menu(); return; }
    const speeds: [Speed, string][] = [[0, '⏸'], [1, '1×'], [2, '2×'], [4, '4×']];
    const body = h('div', { class: 'body' });
    body.append(
      h('div', { class: 'grid g2', style: 'align-items:start' },
        h('div', { class: 'card' },
          h('div', { class: 'mute', style: 'font-size:11px;letter-spacing:.12em' }, 'KASA'),
          h('div', { class: `num ${c.cash < 0 ? '' : ''}`, style: `font:700 40px var(--font-h);color:${c.cash < 0 ? 'var(--bad)' : 'var(--text)'}` }, formatMoney(c.cash)),
          h('div', { class: 'mute', style: 'font-size:12px;margin:2px 0 10px' }, `İtibar ${c.reputation} · Kredi notu ${c.creditScore} · Defter ${checkInvariant(s) ? 'tutarlı' : 'TUTARSIZ'} (${s.ledger.length} kayıt)`),
          h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
            ...speeds.map(([v, l]) => h('button', { class: `btn ${app.store.speed === v ? 'gold' : ''}`, style: 'min-width:56px;padding:0 12px', onclick: () => { press(app); app.store.setSpeed(v); } }, l)),
            h('button', { class: 'btn', onclick: () => { press(app); app.store.setSpeed(0); for (let i = 0; i < 30; i++) app.store.stepDay(); draw(); } }, '+30 gün'))),
        h('div', { class: 'card' },
          h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
            (() => { const sel = h('select', { class: 'input', style: 'flex:1;min-width:150px', 'aria-label': 'Personel tipi' }, ...STAFF_TYPES.map((t) => h('option', { value: t.id }, t.label))) as HTMLSelectElement;
              const b = h('button', { class: 'btn gold', onclick: () => { const r = app.store.run('HireStaff', { type: sel.value }); if (r.ok) press(app, 'confirm'); else { app.audio.sfx('error'); msg = r.error; } draw(); } }, 'İşe Al');
              return h('div', { style: 'display:flex;gap:8px;width:100%' }, sel, b); })()),
          h('div', { class: 'err' }, msg),
          h('div', {}, ...(s.staff.length ? s.staff.map((p) => h('div', { class: 'row', style: 'min-height:44px;padding:6px 0' }, h('div', { class: 'lbl' }, p.name, h('small', {}, `${STAFF_TYPES.find((t) => t.id === p.type)?.label} · deneyim ${p.experience}`)), h('span', { class: 'num', style: 'font-size:13px' }, `${formatMoney(p.salary)}/ay`),
            h('button', { class: 'btn danger', style: 'min-height:38px', onclick: () => { const r = app.store.run('FireStaff', { staffId: p.id }); if (r.ok) app.audio.sfx('click'); draw(); } }, 'Çıkar'))) : [h('div', { class: 'mute' }, 'Henüz çalışan yok')]))),
      ),
      h('div', { class: 'card', style: 'margin-top:12px' }, h('div', { class: 'mute', style: 'font-size:11px;letter-spacing:.12em;margin-bottom:6px' }, 'OLAYLAR'), h('div', { style: 'font-size:12px;color:var(--mute);max-height:90px;overflow:auto' }, ...(log.length ? log.slice(0, 25).map((l) => h('div', {}, l)) : ['—']))),
    );
    root.append(
      h('header', {}, h('span', { html: emblemSvg(c.emblem.shape, c.emblem.color, 40) }), h('h2', {}, `${c.name} · ${formatDate(s.clock.day)}`),
        h('button', { class: 'btn', onclick: () => { press(app); openSettings({ ...app, activeTier: () => app.scene?.activeTier ?? 'mid' }); } }, 'Ayarlar'),
        h('button', { class: 'btn', onclick: async () => { press(app); try { await app.saves.saveManual(1, s); toast('Manuel slot 1 kaydedildi.'); } catch { toast('Kaydedilemedi.'); app.audio.sfx('error'); } } }, 'Kaydet'),
        h('button', { class: 'btn', onclick: async () => { press(app); app.store.setSpeed(0); try { await app.saves.autosave(app.store.state); } catch { /* menü yine açılır */ } app.menu(); } }, 'Ana Menü')),
      body,
      h('footer', {}, h('span', { class: 'mute', style: 'font-size:12px' }, 'Geçici geliştirme paneli — Faz 3\'te şirket ekranı gelecek.')));
  };
  draw();
  return root;
}
