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
  const t = h('div', { class: 'toast', role: 'status' }, msg); box.append(t);
  while (box.children.length > 3) box.firstElementChild!.remove();
  setTimeout(() => t.remove(), ms);
}

export const fmtInt = (n: number) => new Intl.NumberFormat('tr-TR').format(Math.round(n));
