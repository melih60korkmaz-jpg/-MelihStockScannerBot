import type { AudioEngine, Sfx } from '../audio/engine';

type Child = Node | string | null | undefined | false;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, any> = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'style') el.setAttribute('style', v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v; else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c) el.append(c as Node | string);
  return el;
}

export interface UiCtx { audio: AudioEngine; haptic: (k?: 'light' | 'medium' | 'heavy') => void }

export function press(ctx: UiCtx, sfx: Sfx = 'click', hk: 'light' | 'medium' | 'heavy' = 'light') { ctx.audio.sfx(sfx); ctx.haptic(hk); }

/** Bildirimler üst üste binmesin: ortak kapta alt alta dizilir (en çok 3). */
export function toast(msg: string, ms = 2600) {
  let box = document.getElementById('toasts');
  if (!box) { box = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
  for (const old of Array.from(box.children)) if (old.textContent === msg) old.remove();
  const t = h('div', { class: 'toast', role: 'status' }, msg); box.append(t);
  while (box.children.length > 2) box.firstElementChild!.remove();
  setTimeout(() => t.remove(), ms);
}

/** Kutlama: renkli parçacık yağmuru (hareket azaltma açıksa yalnızca kısa bir parıltı). */
export function celebrate(reduced: boolean) {
  const box = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  const n = reduced ? 0 : 36, cols = ['#F5B700', '#2ECC8F', '#3E7BFA', '#FF7A1A', '#E8EEF2'];
  for (let i = 0; i < n; i++) box.append(h('i', { style: `left:${Math.round(Math.random() * 100)}%;background:${cols[i % cols.length]};animation-delay:${(Math.random() * 0.5).toFixed(2)}s;animation-duration:${(1.4 + Math.random() * 1.1).toFixed(2)}s;transform:rotate(${Math.round(Math.random() * 360)}deg)` }));
  if (reduced) box.classList.add('glow'); document.body.append(box); setTimeout(() => box.remove(), reduced ? 900 : 2800);
}

export const fmtInt = (n: number) => new Intl.NumberFormat('tr-TR').format(Math.round(n));
