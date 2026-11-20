import { h, type UiCtx } from '../dom';
import type { SettingsStore } from '../../platform/settings';

const WORD = 'MÜTEAHHİT';

/** Dokun → açılış (vinç kancası, harf blokları yerleşir). Dokunmayla atlanır. */
export function playIntro(ctx: UiCtx & { settings: SettingsStore }): Promise<void> {
  return new Promise((resolve) => {
    const reduced = ctx.settings.reduced;
    const rig = h('div', { class: 'rig' }, reduced ? null : h('div', { class: 'hook' }));
    const timers: number[] = [];
    [...WORD].forEach((ch, i) => {
      const delay = 0.9 + i * 0.13;
      rig.append(h('div', { class: 'blk', style: `animation-delay:${delay}s` }, ch));
      if (!reduced) timers.push(window.setTimeout(() => ctx.audio.sfx('clink'), (delay + 0.4) * 1000));
    });
    const el = h('div', { class: 'intro', role: 'img', 'aria-label': 'Müteahhit' }, rig, h('div', { class: 'beam' }), h('div', { class: 'sub' }, 'TEMELDEN ZİRVEYE'));
    document.body.append(el);
    let done = false;
    const finish = () => {
      if (done) return; done = true; timers.forEach(clearTimeout);
      el.classList.add('fade'); setTimeout(() => { el.remove(); resolve(); }, reduced ? 50 : 900);
    };
    if (!reduced) timers.push(window.setTimeout(() => ctx.audio.sfx('stamp'), 2300));
    timers.push(window.setTimeout(finish, reduced ? 1400 : 4300));
    el.addEventListener('pointerdown', finish);
  });
}

/** İlk dokunuş kapısı: tarayıcılar sesi dokunuş olmadan başlatmaz (özellikle iPhone). */
export function tapGate(): Promise<void> {
  return new Promise((resolve) => {
    const el = h('div', { class: 'splash', role: 'button', tabindex: 0, 'aria-label': 'Başlamak için dokunun' },
      h('div', { style: 'font:700 28px var(--font-h);letter-spacing:.2em;color:var(--gold)' }, 'MÜTEAHHİT'),
      h('div', { class: 'hint' }, 'BAŞLAMAK İÇİN DOKUN'));
    const go = () => { el.remove(); resolve(); };
    el.addEventListener('pointerdown', go, { once: true });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go(); });
    document.body.append(el);
  });
}
