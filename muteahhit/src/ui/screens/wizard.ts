import { EMBLEM_COLORS, EMBLEM_SHAPES } from '../../core/commands';
import { TL, formatMoney, mul } from '../../core/money';
import { newGameState } from '../../core/state';
import { Store } from '../../core/store';
import { BACKGROUNDS, CITIES, DIFFICULTIES, background, difficulty, staffType } from '../../data';
import { h, press } from '../dom';
import { emblemSvg } from '../emblem';
import type { App } from '../app';
import { hubScreen } from './hub';

export function newGameScreen(app: App): HTMLElement {
  const st = { step: 0, name: 'Demir Yapı', shape: 2, color: 0, bg: 'eski_kalfa', city: 'ankara', diff: 'gercekci' };
  const TITLES = ['Şirketin', 'Patron geçmişi', 'Başlangıç şehri', 'Zorluk ve özet'];
  const root = h('div', { class: 'page' });
  const render = () => {
    root.innerHTML = '';
    const body = h('div', { class: 'body' });
    const err = h('div', { class: 'err', role: 'alert' });
    const choose = (key: 'bg' | 'city' | 'diff', id: string) => () => { st[key] = id; press(app); render(); };

    if (st.step === 0) {
      const input = h('input', { class: 'input', value: st.name, maxlength: 32, 'aria-label': 'Şirket adı', autocomplete: 'off' }) as HTMLInputElement;
      input.oninput = () => { st.name = input.value; prev.querySelector('.nm')!.textContent = st.name || 'Şirket adı'; };
      const prev = h('div', { class: 'card', style: 'display:flex;gap:14px;align-items:center;padding:16px' },
        h('span', { class: 'em', html: emblemSvg(st.shape, st.color, 72) }), h('div', {}, h('div', { class: 'mute', style: 'font-size:11px;letter-spacing:.12em' }, 'İNŞAAT'), h('h2', { class: 'nm', style: 'font-size:30px' }, st.name)));
      const grid = h('div', { class: 'emblems' });
      for (let i = 0; i < EMBLEM_SHAPES; i++) { const b = h('button', { class: i === st.shape ? 'sel' : '', 'aria-label': `Amblem ${i + 1}`, html: emblemSvg(i, st.color, 100) }); const sv = b.querySelector('svg')!; sv.removeAttribute('width'); sv.removeAttribute('height'); sv.style.cssText = 'width:100%;height:auto;display:block'; b.onclick = () => { st.shape = i; press(app); render(); }; grid.append(b); }
      const sw = h('div', { class: 'swatches' }); for (let i = 0; i < EMBLEM_COLORS; i++) { const b = h('button', { class: i === st.color ? 'sel' : '', style: `background:${emblemColor(i)}`, 'aria-label': `Renk ${i + 1}` }); b.onclick = () => { st.color = i; press(app); render(); }; sw.append(b); }
      body.append(h('div', { class: 'grid g2', style: 'align-items:start' },
        h('div', { class: 'grid' }, prev, h('div', { class: 'field' }, h('label', {}, 'Şirket adı'), input), err),
        h('div', { class: 'grid' }, h('div', { class: 'field' }, h('label', {}, 'Amblem'), grid), sw)));
    } else if (st.step === 1) {
      const g = h('div', { class: 'grid g3' });
      for (const b of BACKGROUNDS) g.append(h('div', { class: `card opt ${st.bg === b.id ? 'sel' : ''}`, role: 'button', tabindex: 0, onclick: choose('bg', b.id) },
        h('h3', {}, b.label), h('p', {}, b.story),
        h('div', { class: 'chips' }, h('span', { class: 'chip' }, 'Sermaye ', h('b', {}, formatMoney(TL(b.startCashTL)))), h('span', { class: 'chip' }, 'İtibar ', h('b', {}, String(b.reputation))), h('span', { class: 'chip' }, 'Kredi notu ', h('b', {}, String(b.creditScore))),
          ...b.staff.map((t) => h('span', { class: 'chip' }, h('b', {}, staffType(t)!.label))))));
      body.append(g);
    } else if (st.step === 2) {
      const g = h('div', { class: 'grid g3' });
      for (const c of CITIES) g.append(h('div', { class: `card opt ${st.city === c.id ? 'sel' : ''}`, role: 'button', tabindex: 0, onclick: choose('city', c.id) }, h('h3', {}, c.label), h('p', {}, c.blurb)));
      body.append(g, h('p', { class: 'mute', style: 'font-size:12px;margin-top:12px' }, 'Şehir, ilerleyen aşamalarda arsa fiyatlarını ve talebi belirleyecek. Diğer şehirlere sonradan açılabilirsiniz.'));
    } else {
      const g = h('div', { class: 'grid g3', style: 'margin-bottom:14px' });
      for (const d of DIFFICULTIES) g.append(h('div', { class: `card opt ${st.diff === d.id ? 'sel' : ''}`, role: 'button', tabindex: 0, onclick: choose('diff', d.id) }, h('h3', {}, d.label), h('p', {}, d.desc)));
      const bg = background(st.bg)!, cash = mul(TL(bg.startCashTL), difficulty(st.diff)!.capitalMult);
      body.append(g, h('div', { class: 'card' }, h('table', { class: 'sum' },
        ...[['Şirket', st.name || '—'], ['Patron', bg.label], ['Şehir', CITIES.find((c) => c.id === st.city)!.label], ['Başlangıç sermayesi', formatMoney(cash)], ['Ekip', bg.staff.map((t) => staffType(t)!.label).join(', ')]]
          .map(([a, b]) => h('tr', {}, h('td', { class: 'mute' }, a), h('td', {}, b)))), err));
    }

    const next = h('button', { class: 'btn gold', onclick: () => {
      if (st.step === 0 && st.name.trim().length < 2) { err.textContent = 'Şirket adı en az 2 karakter olmalı.'; app.audio.sfx('error'); return; }
      if (st.step < 3) { press(app); st.step++; render(); return; }
      const store = new Store(newGameState((Date.now() ^ (Math.random() * 1e9)) >>> 0));
      const r = store.run('CreateCompany', { name: st.name, founderBackground: st.bg, startCity: st.city, difficulty: st.diff, emblem: { shape: st.shape, color: st.color } });
      if (!r.ok) { err.textContent = r.error; app.audio.sfx('error'); return; }
      press(app, 'stamp', 'heavy'); app.setStore(store);
      void app.saves.autosave(store.state).catch(() => {});
      app.go(hubScreen(app), 'none');
    } }, st.step < 3 ? 'İleri' : 'Şirketi Kur');
    const back = h('button', { class: 'btn', onclick: () => { press(app); if (st.step === 0) app.menu(); else { st.step--; render(); } } }, st.step === 0 ? 'Vazgeç' : 'Geri');
    root.append(
      h('header', {}, h('h2', {}, `${TITLES[st.step]}`), h('div', { class: 'steps', 'aria-label': `Adım ${st.step + 1}/4` }, ...[0, 1, 2, 3].map((i) => h('i', { class: i <= st.step ? 'on' : '' })))),
      body, h('footer', {}, back, next));
  };
  render();
  return root;
}
import { EMBLEM_COLORS_HEX } from '../emblem';
const emblemColor = (i: number) => EMBLEM_COLORS_HEX[i] ?? '#fff';
