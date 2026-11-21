import type { Quality, Motion, Fx } from '../../platform/settings';
import { hapticsSupported } from '../../platform/haptics';
import { h, press, type UiCtx } from '../dom';
import type { SettingsStore } from '../../platform/settings';
import type { App } from '../app';
import { startTutorial } from '../tutorial';

export function openSettings(ctx: UiCtx & { settings: SettingsStore; activeTier?: () => string }, onClose?: () => void) {
  const S = ctx.settings;
  const body = h('div', { class: 'bd' });
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Ayarlar' });
  const close = () => { modal.remove(); onClose?.(); };
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });

  const toggle = (get: () => boolean, set: (v: boolean) => void, disabled = false) => {
    const b = h('button', { class: 'tog', role: 'switch', 'aria-checked': String(get()), disabled }) as HTMLButtonElement;
    b.onclick = () => { set(!get()); b.setAttribute('aria-checked', String(get())); ctx.audio.sfx('toggle'); ctx.haptic('light'); refresh(); };
    return b;
  };
  const slider = (get: () => number, set: (v: number) => void, enabled: () => boolean, preview: () => void) => {
    const r = h('input', { type: 'range', min: 0, max: 100, step: 1, value: Math.round(get() * 100), 'aria-label': 'Ses seviyesi' }) as HTMLInputElement;
    const paint = () => { r.style.setProperty('--p', `${r.value}%`); r.disabled = !enabled(); };
    r.oninput = () => { set(Number(r.value) / 100); paint(); };
    r.onchange = preview; paint(); (r as any).__paint = paint; return r;
  };
  const seg = <T extends string>(opts: [T, string][], get: () => T, set: (v: T) => void) => {
    const w = h('div', { class: 'seg', role: 'group' });
    const draw = () => { w.innerHTML = ''; for (const [v, l] of opts) { const b = h('button', { class: get() === v ? 'on' : '', 'aria-pressed': String(get() === v) }, l); b.onclick = () => { set(v); press(ctx, 'click'); draw(); }; w.append(b); } };
    draw(); return w;
  };
  const row = (label: string, ctl: Node, sub?: string) => h('div', { class: 'row' }, h('div', { class: 'lbl' }, label, sub ? h('small', {}, sub) : null), ctl);

  const sliders: HTMLInputElement[] = [];
  const refresh = () => sliders.forEach((s) => (s as any).__paint?.());

  const draw = () => {
    body.innerHTML = '';
    sliders.length = 0;
    const mv = slider(() => S.value.musicVol, (v) => S.set('musicVol', v), () => S.value.musicOn, () => {});
    const sv = slider(() => S.value.sfxVol, (v) => S.set('sfxVol', v), () => S.value.sfxOn, () => ctx.audio.sfx('confirm'));
    sliders.push(mv, sv);
    body.append(
      h('div', { class: 'sec' }, 'Ses'),
      row('Müzik', toggle(() => S.value.musicOn, (v) => S.set('musicOn', v))),
      row('Müzik seviyesi', mv),
      row('Ses efektleri', toggle(() => S.value.sfxOn, (v) => S.set('sfxOn', v))),
      row('Efekt seviyesi', sv),
      h('div', { class: 'sec' }, 'Oyun'),
      ...(typeof (ctx as unknown as { openTab?: unknown }).openTab === 'function' ? [row('Oyunu tanıt (rehber)', h('button', { class: 'btn', style: 'min-height:40px', onclick: () => { close(); startTutorial(ctx as unknown as App); } }, 'Başlat'), 'Şef Ayşe oyunu adım adım yeniden anlatır.')] : []),
      row('Kaldığım yerden devam', toggle(() => S.value.autoResume, (v) => S.set('autoResume', v)), 'Açılışta son kayıtla doğrudan oyuna girer. Kayıt otomatik alınır (işlem yapıldıktan birkaç saniye sonra, her ay ve uygulamadan çıkarken).'),
      h('div', { class: 'sec' }, 'Dokunma'),
      row('Titreşim', toggle(() => S.value.haptics && hapticsSupported(), (v) => S.set('haptics', v), !hapticsSupported()),
        hapticsSupported() ? undefined : 'Bu tarayıcı titreşimi desteklemiyor (iPhone Safari dahil). Yerel uygulamada çalışacak.'),
      h('div', { class: 'sec' }, 'Görünüm'),
      row('Animasyonlar', seg<Motion>([['full', 'Tam'], ['reduced', 'Azaltılmış']], () => S.value.motion, (v) => S.set('motion', v)), 'Azaltılmışta kamera hareketi ve geçişler durur.'),
      row('Animasyon yoğunluğu', seg<Fx>([['full', 'Canlı'], ['calm', 'Sakin']], () => S.value.fx, (v) => S.set('fx', v)), 'Sakin: konfeti ve büyük kutlama sahneleri kapanır, bildirimler sade kalır.'),
      row('Grafik kalitesi', seg<Quality>([['auto', 'Otomatik'], ['low', 'Düşük'], ['mid', 'Orta'], ['high', 'Yüksek']], () => S.value.quality, (v) => S.set('quality', v)),
        S.value.quality === 'auto' && ctx.activeTier ? `Şu an: ${({ low: 'Düşük', mid: 'Orta', high: 'Yüksek' } as Record<string, string>)[ctx.activeTier()] ?? ''}` : undefined),
      h('p', { class: 'mute', style: 'font-size:12px;margin-top:14px' }, 'Tercihleriniz bu cihazda otomatik saklanır.'),
      h('p', { class: 'mute', style: 'font-size:11px;margin-top:6px' }, 'Harita verisi: geoBoundaries (CC BY 4.0), www.geoboundaries.org — il ve ilçe sınırları sadeleştirilmiştir.'),
    );
  };
  draw();
  modal.append(h('div', { class: 'card sheet' },
    h('div', { class: 'hd' }, h('h2', {}, 'Ayarlar'), h('button', { class: 'btn', 'aria-label': 'Kapat', onclick: () => { press(ctx); close(); } }, 'Kapat')),
    body));
  document.body.append(modal);
  return close;
}
