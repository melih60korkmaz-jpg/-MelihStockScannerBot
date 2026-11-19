import { eventDef } from '../../data';
import { DECISION_TIMEOUT, describeEffect, fill } from '../../sim/events';
import { h, press, toast } from '../dom';
import type { App } from '../app';

const CAT: Record<string, string> = { mevzuat: 'Mevzuat', piyasa: 'Piyasa', doga: 'Doğa', insan: 'İnsan kaynağı', hukuk: 'Hukuk', guvenlik: 'Güvenlik', firsat: 'Fırsat', rakip: 'Rakip', finans: 'Finans' };

/** Karar olayı penceresi: seçimlerin sabit etkileri gösterilir; riskli seçimlerde olasılık yazar. */
export function openEventDecision(app: App): void {
  const s = app.store.state, p = s.pending; if (!p || document.querySelector('.evtmodal')) return; const d = eventDef(p.id); if (!d) return;
  const left = Math.max(0, DECISION_TIMEOUT - (s.clock.day - p.day));
  const modal = h('div', { class: 'modal evtmodal', role: 'dialog', 'aria-label': d.t });
  const card = h('div', { class: 'card', style: 'width:min(640px,96vw);max-height:92vh;overflow:auto' },
    h('div', { style: 'display:flex;gap:8px;align-items:center' }, h('span', { class: 'chip' }, CAT[d.c] ?? d.c), h('span', { class: 'mute', style: 'font-size:12px' }, `Karar süresi: ${left} gün (sonra varsayılan seçim)`)),
    h('h3', { style: 'font-size:24px;margin:6px 0' }, d.t), h('p', { style: 'margin:0 0 10px' }, fill(s, d.x, p)));
  d.ch.forEach((c, i) => {
    const sure = [...c.e].map((e) => describeEffect(s, e)).filter(Boolean);
    const risk = c.p !== undefined ? [`%${Math.round(c.p * 100)} başarı`, ...(c.f ?? []).map((e) => 'Olmazsa: ' + describeEffect(s, e)).filter((x) => !x.endsWith(': '))] : [];
    card.append(h('button', { class: 'btn', style: 'display:block;width:100%;text-align:left;margin-top:8px;padding:10px 12px;height:auto', onclick: () => { const r = app.store.run('ResolveEvent', { choice: i }); if (r.ok) { app.audio.sfx('confirm'); modal.remove(); } else { app.audio.sfx('error'); toast(r.error); } } },
      h('b', {}, c.l), sure.length || risk.length ? h('div', { class: 'mute', style: 'font-size:12px;margin-top:2px' }, [...sure, ...risk].join(' · ')) : null));
  });
  modal.append(card); document.body.append(modal); press(app, 'stamp');
}
