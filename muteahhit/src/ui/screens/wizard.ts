import { TL, formatMoney, mul } from '../../core/money';
import { newGameState } from '../../core/state';
import { Store } from '../../core/store';
import { BACKGROUNDS, CITIES, DIFFICULTIES, background, difficulty, machine, staffType } from '../../data';
import { h, press } from '../dom';
import { BRAND_COLORS, LOGOS, brandHex, emblemInner, emblemSvg } from '../emblem';
import { brandPreview } from '../brandPreview';
import type { App } from '../app';
import { hubScreen } from './hub';

export function newGameScreen(app: App): HTMLElement {
  const st = { step: 0, founder: '', name: 'Demir Yapı', shape: 0, color: 0, bg: 'eski_kalfa', city: 'ankara', diff: 'gercekci' };
  const TITLES = ['Şirket kimliği', 'Logo galerisi', 'Patron geçmişi', 'Başlangıç şehri', 'Zorluk ve özet'], LAST = TITLES.length - 1;
  const root = h('div', { class: 'page wiz' });
  const prev = brandPreview({ name: st.name, founder: st.founder, shape: st.shape, color: st.color });
  const paintColors = () => { const hex = brandHex(st.color); for (const sv of Array.from(root.querySelectorAll<SVGElement>('svg.emb[data-shape]'))) { sv.innerHTML = emblemInner(Number(sv.dataset.shape), st.color); sv.style.color = hex; } };
  const render = () => {
    root.innerHTML = '';
    const body = h('div', { class: 'body' });
    const err = h('div', { class: 'err', role: 'alert' });
    const choose = (key: 'bg' | 'city' | 'diff', id: string) => () => { st[key] = id; press(app); render(); };
    const swatches = (compact = false) => h('div', { class: `bswatches${compact ? ' compact' : ''}`, role: 'radiogroup', 'aria-label': 'Kurumsal renk' }, ...BRAND_COLORS.map((c) => { const b = h('button', { class: c.id === st.color ? 'sel' : '', style: `--c:${c.hex}`, role: 'radio', 'aria-checked': String(c.id === st.color), 'aria-label': c.name, title: c.name }, h('i', {}), h('span', {}, c.name)); b.onclick = () => { st.color = c.id; press(app, 'click'); prev.update({ color: c.id }); root.querySelectorAll('.bswatches button').forEach((x, k) => { x.classList.toggle('sel', k === c.id); x.setAttribute('aria-checked', String(k === c.id)); }); paintColors(); }; return b; }));

    if (st.step === 0) {
      const founder = h('input', { class: 'input', value: st.founder, maxlength: 24, placeholder: 'Örn. Ahmet Yılmaz', 'aria-label': 'Adınız', autocomplete: 'off' }) as HTMLInputElement;
      founder.oninput = () => { st.founder = founder.value; prev.update({ founder: founder.value }); };
      const input = h('input', { class: 'input', value: st.name, maxlength: 32, 'aria-label': 'Şirket adı', autocomplete: 'off' }) as HTMLInputElement;
      input.oninput = () => { st.name = input.value; prev.update({ name: input.value }); };
      body.append(h('div', { class: 'wsplit' },
        h('div', { class: 'wleft' }, h('div', { class: 'field' }, h('label', {}, 'Adınız (kurucu)'), founder), h('div', { class: 'field' }, h('label', {}, 'Şirket adı'), input), h('div', { class: 'field' }, h('label', {}, 'Kurumsal renk'), swatches()), err),
        h('div', { class: 'wright' }, prev.el)));
    } else if (st.step === 1) {
      const grid = h('div', { class: 'logos', role: 'radiogroup', 'aria-label': 'Logo galerisi' }, ...LOGOS.map((l) => {
        const b = h('button', { class: l.id === st.shape ? 'sel' : '', role: 'radio', 'aria-checked': String(l.id === st.shape), 'aria-label': l.name, title: l.name, html: emblemSvg(l.id, st.color, 58) + `<small>${l.name}</small>` });
        const sv = b.querySelector('svg')!; sv.dataset.shape = String(l.id);
        b.onclick = () => { st.shape = l.id; press(app, 'click'); prev.update({ shape: l.id }); root.querySelectorAll('.logos button').forEach((x) => { const on = x === b; x.classList.toggle('sel', on); x.setAttribute('aria-checked', String(on)); if (on) { x.classList.remove('pick'); void (x as HTMLElement).offsetWidth; x.classList.add('pick'); } }); sel.textContent = LOGOS[l.id]!.name; };
        return b;
      }));
      const sel = h('small', { class: 'mute logosel' }, LOGOS[st.shape]!.name);
      body.append(h('div', { class: 'wsplit' }, h('div', { class: 'wleft' }, grid, sel, swatches(true)), h('div', { class: 'wright' }, prev.el)));
    } else if (st.step === 2) {
      const g = h('div', { class: 'grid g3' });
      for (const b of BACKGROUNDS) g.append(h('div', { class: `card opt ${st.bg === b.id ? 'sel' : ''}`, role: 'button', tabindex: 0, onclick: choose('bg', b.id) },
        h('h3', {}, b.label), h('p', {}, b.story),
        h('div', { class: 'chips' }, h('span', { class: 'chip' }, 'Sermaye ', h('b', {}, formatMoney(TL(b.startCashTL)))), h('span', { class: 'chip' }, 'İtibar ', h('b', {}, String(b.reputation))), h('span', { class: 'chip' }, 'Kredi notu ', h('b', {}, String(b.creditScore))),
          ...b.staff.map((t) => h('span', { class: 'chip' }, h('b', {}, staffType(t)!.label))), ...(b.machines ?? []).map((t) => h('span', { class: 'chip good' }, '🎁 ', h('b', {}, machine(t)!.label))))));
      body.append(g);
    } else if (st.step === 3) {
      const g = h('div', { class: 'grid g3' });
      for (const c of CITIES) g.append(h('div', { class: `card opt ${st.city === c.id ? 'sel' : ''}`, role: 'button', tabindex: 0, onclick: choose('city', c.id) }, h('h3', {}, c.label), h('p', {}, c.blurb)));
      body.append(g, h('p', { class: 'mute', style: 'font-size:12px;margin-top:12px' }, 'Şehir, ilerleyen aşamalarda arsa fiyatlarını ve talebi belirleyecek. Diğer şehirlere sonradan açılabilirsiniz.'));
    } else {
      const g = h('div', { class: 'grid g3', style: 'margin-bottom:14px' });
      for (const d of DIFFICULTIES) g.append(h('div', { class: `card opt ${st.diff === d.id ? 'sel' : ''}`, role: 'button', tabindex: 0, onclick: choose('diff', d.id) }, h('h3', {}, d.label), h('p', {}, d.desc)));
      const bg = background(st.bg)!, cash = mul(TL(bg.startCashTL), difficulty(st.diff)!.capitalMult);
      body.append(g, h('div', { class: 'card' }, h('div', { style: 'display:flex;gap:12px;align-items:center;margin-bottom:8px' }, h('span', { html: emblemSvg(st.shape, st.color, 54) }), h('div', {}, h('b', { style: 'font:700 22px var(--font-h)' }, st.name || '—'), h('div', { class: 'mute', style: 'font-size:12px' }, `Kurucu: ${st.founder.trim() || '—'}`))),
        h('table', { class: 'sum' }, ...[['Logo', `${LOGOS[st.shape]!.name} · ${BRAND_COLORS[st.color]!.name}`], ['Patron', bg.label], ['Şehir', CITIES.find((c) => c.id === st.city)!.label], ['Başlangıç sermayesi', formatMoney(cash)], ['Ekip', bg.staff.map((t) => staffType(t)!.label).join(', ')]]
          .map(([a, b]) => h('tr', {}, h('td', { class: 'mute' }, a), h('td', {}, b)))), err));
    }

    const next = h('button', { class: 'btn gold', onclick: () => {
      if (st.step === 0) {
        if (st.founder.trim().length < 2) { err.textContent = 'Adınız en az 2 karakter olmalı.'; app.audio.sfx('error'); return; }
        if (st.name.trim().length < 2) { err.textContent = 'Şirket adı en az 2 karakter olmalı.'; app.audio.sfx('error'); return; }
      }
      if (st.step < LAST) { press(app); st.step++; render(); return; }
      const store = new Store(newGameState((Date.now() ^ (Math.random() * 1e9)) >>> 0));
      const r = store.run('CreateCompany', { name: st.name, founder: st.founder, founderBackground: st.bg, startCity: st.city, starterGear: true, difficulty: st.diff, emblem: { shape: st.shape, color: st.color } });
      if (!r.ok) { err.textContent = r.error; app.audio.sfx('error'); return; }
      app.setStore(store); void app.saves.autosave(store.state).catch(() => {});
      foundingScene(app, st.name.trim(), st.founder.trim(), st.shape, st.color, () => app.go(hubScreen(app), 'none'));
    } }, st.step < LAST ? 'İleri' : 'Şirketi Kur');
    const back = h('button', { class: 'btn', onclick: () => { press(app); if (st.step === 0) app.menu(); else { st.step--; render(); } } }, st.step === 0 ? 'Vazgeç' : 'Geri');
    root.append(
      h('header', {}, h('h2', {}, `${TITLES[st.step]}`), h('div', { class: 'steps', 'aria-label': `Adım ${st.step + 1}/${TITLES.length}` }, ...TITLES.map((_, i) => h('i', { class: i <= st.step ? 'on' : '' })))),
      body, h('footer', {}, back, next));
  };
  render();
  return root;
}

/** Kuruluş animasyonu: logo büyüyerek belirir, halka dalgası yayılır, ad harf harf yazılır, "KURULDU" mührü basılır. */
function foundingScene(app: App, name: string, founder: string, shape: number, color: number, done: () => void): void {
  const hex = brandHex(color), red = app.settings.reduced;
  const nm = h('b', { class: 'fname' }), box = h('div', { class: 'foundbox' },
    h('div', { class: 'fring', style: `--c:${hex}` }), h('div', { class: 'flogo', html: emblemSvg(shape, color, 120) }), nm, h('small', { class: 'ffounder' }, `Kurucu: ${founder}`), h('div', { class: 'fstamp' }, 'KURULDU'));
  const el = h('div', { class: 'found', role: 'status', 'aria-label': 'Şirket kuruldu' }, box);
  document.body.append(el); app.audio.sfx('stamp'); app.haptic('heavy');
  if (red) nm.textContent = name; else { let i = 0; const t = setInterval(() => { nm.textContent = name.slice(0, ++i); if (i >= name.length) clearInterval(t); }, 55); }
  setTimeout(() => app.audio.sfx('fanfare'), red ? 0 : 600);
  const total = red ? 900 : 2300; setTimeout(() => { el.classList.add('out'); setTimeout(() => { done(); el.remove(); }, red ? 0 : 260); }, total);
  el.addEventListener('pointerdown', () => { /* dokununca hızlandır */ });
}
