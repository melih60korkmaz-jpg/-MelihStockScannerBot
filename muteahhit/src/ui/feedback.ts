import { h, press, toast } from './dom';
import type { App } from './app';

/** Geri bildirim: mail uygulamasını hazır metinle açar (sunucu yok, kişisel veri toplanmaz). */
export const FEEDBACK_MAIL = 'mlhkrkmz6061@gmail.com';
const VERSION = '1.2.0';
const KINDS = [['hata', '🐞 Hata'], ['oneri', '💡 Öneri'], ['denge', '⚖️ Denge / zorluk']] as const;

export function feedbackMailto(kind: string, text: string, ctx: string): string {
  const label = KINDS.find((k) => k[0] === kind)?.[1].replace(/^\S+\s/, '') ?? 'Geri bildirim';
  const subject = `[Müteahhit v${VERSION}] ${label}`, body = `${text.trim()}\n\n— — —\n${ctx}`;
  return `mailto:${FEEDBACK_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function openFeedback(app: App): void {
  if (document.querySelector('.fbmodal')) return;
  let kind: string = KINDS[0][0];
  const s = app.store.state, ctx = `Sürüm ${VERSION} · Oyun günü ${s.clock.day} · Seviye ${s.company?.level ?? '-'} · Kasa ${s.company ? Math.round(s.company.cash / 100) : '-'} ₺`;
  const ta = h('textarea', { class: 'input', rows: 5, maxlength: 800, placeholder: 'Ne oldu? Nerede takıldın? Ne olsun isterdin?', 'aria-label': 'Geri bildirim metni', style: 'width:100%;resize:none' }) as HTMLTextAreaElement;
  const seg = h('div', { class: 'seg', style: 'margin-bottom:10px' });
  const drawSeg = () => { seg.innerHTML = ''; for (const [id, l] of KINDS) seg.append(h('button', { class: kind === id ? 'on' : '', onclick: () => { press(app); kind = id; drawSeg(); } }, l)); };
  drawSeg();
  const close = () => m.remove();
  const send = () => {
    if (ta.value.trim().length < 5) { app.audio.sfx('error'); toast('Lütfen en az birkaç kelime yazın.'); return; }
    press(app, 'stamp', 'medium'); const url = feedbackMailto(kind, ta.value, ctx);
    if ((window as unknown as { __NATIVE_SHELL?: string }).__NATIVE_SHELL && (window as unknown as { ReactNativeWebView?: { postMessage(s: string): void } }).ReactNativeWebView) (window as unknown as { ReactNativeWebView: { postMessage(s: string): void } }).ReactNativeWebView.postMessage(JSON.stringify({ t: 'mail', url }));
    else window.location.href = url;
    toast('Mail uygulaması açılıyor; göndermeyi unutmayın. Açılmazsa "Kopyala"yı kullanın.');
  };
  const copy = async () => { try { await navigator.clipboard.writeText(`${ta.value.trim()}\n\n${ctx}\n(${FEEDBACK_MAIL})`); toast('Kopyalandı. Mail olarak gönderebilirsiniz.'); } catch { toast(`Kopyalanamadı. Adres: ${FEEDBACK_MAIL}`); } };
  const m = h('div', { class: 'modal fbmodal', role: 'dialog', 'aria-label': 'Geri bildirim' }, h('div', { class: 'card sheet' },
    h('div', { class: 'hd' }, h('h2', {}, '💬 Geri bildirim'), h('button', { class: 'btn ibtn', 'aria-label': 'Kapat', onclick: close }, '✕')),
    h('div', { class: 'bd' }, h('p', { class: 'mute', style: 'font-size:13px;margin:8px 0' }, `Hatayı ya da fikrini yaz; mail olarak ${FEEDBACK_MAIL} adresine hazırlanır. Yalnızca sürüm ve oyun günü eklenir, kişisel bilgi eklenmez.`), seg, ta,
      h('div', { style: 'display:flex;gap:8px;margin-top:10px;justify-content:flex-end' }, h('button', { class: 'btn', onclick: () => { press(app); void copy(); } }, 'Kopyala'), h('button', { class: 'btn gold', onclick: send }, 'Gönder ▸')))));
  m.addEventListener('pointerdown', (e) => { if (e.target === m) close(); }); document.body.append(m);
}
