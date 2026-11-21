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
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 200); }, ms);
}

/** Kutlama: renkli parçacık yağmuru (hareket azaltma açıksa yalnızca kısa bir parıltı). */
export function celebrate(reduced: boolean) {
  if (document.documentElement.dataset.fx === 'calm') return; // "Sakin" yoğunluk: kutlama efekti yok
  const box = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  const n = reduced ? 0 : 36, cols = ['#FF8C32', '#F07824', '#F5F5F3', '#C0C4C8', '#9299A1'];
  for (let i = 0; i < n; i++) box.append(h('i', { style: `left:${Math.round(Math.random() * 100)}%;background:${cols[i % cols.length]};animation-delay:${(Math.random() * 0.5).toFixed(2)}s;animation-duration:${(1.4 + Math.random() * 1.1).toFixed(2)}s;transform:rotate(${Math.round(Math.random() * 360)}deg)` }));
  if (reduced) box.classList.add('glow'); document.body.append(box); setTimeout(() => box.remove(), reduced ? 900 : 2800);
}

export const fmtInt = (n: number) => new Intl.NumberFormat('tr-TR').format(Math.round(n));

/** Sayı animasyonu: from → to (easeOutCubic). Hareket azaltma açıksa doğrudan son değer. */
export function countTo(el: HTMLElement, from: number, to: number, fmt: (n: number) => string, ms = 650) {
  if (document.documentElement.dataset.motion === 'reduced' || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now(); const step = (now: number) => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(from + (to - from) * e)); if (k < 1 && el.isConnected) requestAnimationFrame(step); else el.textContent = fmt(to); };
  requestAnimationFrame(step);
}
/** Para hareketinde göstergeden süzülen +/− etiketi. */
export function flyDelta(host: HTMLElement, text: string, up: boolean) {
  if (document.documentElement.dataset.motion === 'reduced') return;
  const s = h('span', { class: `fly ${up ? 'up' : 'down'}` }, text); host.append(s); setTimeout(() => s.remove(), 1100);
}

/**
 * Uygulama içi onay penceresi. Tarayıcı `confirm()` iletişim kutuları gömülü görüntüleyicilerde (iOS dosya önizlemesi, sandbox iframe)
 * sessizce engellenir ve "düğme çalışmıyor" gibi görünür; bu yüzden hiçbir yerde `confirm()` kullanılmaz.
 */
export function askConfirm(text: string, yes = 'Onayla', no = 'Vazgeç'): Promise<boolean> {
  return new Promise((resolve) => {
    const [title, ...rest] = text.split('\n'); const body = rest.join('\n').trim();
    const m = h('div', { class: 'modal askc', role: 'alertdialog', style: 'z-index:140' });
    const done = (v: boolean) => { m.remove(); resolve(v); };
    m.append(h('div', { class: 'card', style: 'width:min(460px,94vw);max-height:90vh;overflow:auto' }, h('h3', { style: 'font-size:22px;margin-bottom:6px' }, title), body ? h('p', { style: 'margin:0 0 12px;white-space:pre-line;font-size:14px;color:var(--mute)' }, body) : null,
      h('div', { style: 'display:flex;gap:10px;justify-content:flex-end' }, h('button', { class: 'btn', onclick: () => done(false) }, no), h('button', { class: 'btn gold', onclick: () => done(true) }, yes))));
    m.addEventListener('pointerdown', (e) => { if (e.target === m) done(false); }); document.body.append(m);
  });
}
