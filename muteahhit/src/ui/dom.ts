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

/** Mesaj kutusu: tüm bildirimler açılır pencere yerine buraya düşer (kayıt cihazda saklanır, en çok 80). */
export interface Msg { t: number; text: string }
const INBOX_KEY = 'muteahhit.inbox.v1';
let inbox: Msg[] = [], unread = 0; const listeners = new Set<() => void>();
try { const r = JSON.parse(localStorage.getItem(INBOX_KEY) ?? 'null'); if (r && Array.isArray(r.m)) { inbox = r.m; unread = r.u ?? 0; } } catch { /* yok say */ }
const persist = () => { try { localStorage.setItem(INBOX_KEY, JSON.stringify({ m: inbox, u: unread })); } catch { /* yok say */ } };
export const inboxList = (): Msg[] => inbox;
export const inboxUnread = (): number => unread;
export const inboxMarkRead = () => { unread = 0; persist(); listeners.forEach((f) => f()); };
export const inboxClear = () => { inbox = []; unread = 0; persist(); listeners.forEach((f) => f()); };
export const onInbox = (f: () => void) => { listeners.add(f); return () => listeners.delete(f); };
/** Kullanıcının dokunuşuna verilen ret/uyarı cümleleri kısa süre görünür (yoksa düğme bozuk sanılır); gerisi yalnızca kutuya düşer. */
const IMMEDIATE = /🔒|yetersiz|yeterli|yeterince|yapılamaz|olamaz|gerek(ir|li)|bulunamadı|uygun değil|en az|en çok|dolu|zaten|yok\b|açılmadı|yüklenemedi|satın alınamadı/i;
function flash(msg: string) {
  let box = document.getElementById('toasts');
  if (!box) { box = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
  for (const old of Array.from(box.children)) old.remove();
  const t = h('div', { class: 'toast', role: 'status' }, msg); box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 200); }, 2200);
}
export function toast(msg: string, _ms = 2600) {
  if (inbox[0]?.text === msg && Date.now() - inbox[0].t < 3000) return;
  if (IMMEDIATE.test(msg)) flash(msg);
  inbox.unshift({ t: Date.now(), text: msg }); if (inbox.length > 80) inbox.length = 80; unread = Math.min(99, unread + 1); persist(); listeners.forEach((f) => f());
}
/** ✉ düğmesi: okunmamış sayısı rozet olarak görünür. */
export function inboxButton(open: () => void, cls = 'btn ibtn'): HTMLElement {
  const badge = h('i', { class: 'inbadge' }), b = h('button', { class: cls + ' inboxbtn', 'aria-label': 'Mesaj kutusu', onclick: open }, '✉', badge);
  const upd = () => { badge.textContent = unread ? String(unread) : ''; badge.style.display = unread ? 'block' : 'none'; if (unread) { b.classList.remove('ping'); void b.offsetWidth; b.classList.add('ping'); } };
  upd(); const off = onInbox(() => { if (!b.isConnected) { off(); return; } upd(); }); return b;
}
export function openInbox() {
  if (document.querySelector('.inboxmodal')) return;
  const list = h('div', { class: 'bd' }), close = () => { m.remove(); inboxMarkRead(); };
  const draw = () => { list.innerHTML = ''; if (!inbox.length) list.append(h('p', { class: 'mute', style: 'padding:18px;text-align:center' }, 'Mesaj yok.')); for (const x of inbox) list.append(h('div', { class: 'inmsg' }, h('small', { class: 'mute' }, new Date(x.t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })), h('span', {}, x.text))); };
  const m = h('div', { class: 'modal inboxmodal', role: 'dialog', 'aria-label': 'Mesaj kutusu' }, h('div', { class: 'card sheet' },
    h('div', { class: 'hd' }, h('h2', {}, '✉ Mesaj kutusu'), h('button', { class: 'btn', style: 'min-height:36px;font-size:13px;margin-right:8px', onclick: () => { inboxClear(); draw(); } }, 'Temizle'), h('button', { class: 'btn ibtn', 'aria-label': 'Kapat', onclick: close }, '✕')), list));
  m.addEventListener('pointerdown', (e) => { if (e.target === m) close(); }); draw(); document.body.append(m);
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
