import { dateOf, formatDate } from '../../core/calendar';
import { formatMoney, TL } from '../../core/money';
import type { Speed } from '../../core/store';
import { OFFICES, STAFF_TYPES, ledgerCat, officeFor } from '../../data';
import { REGIMES } from '../../sim/macro';
import { alerts, monthlyRows, netWorth, projectAssetValue, projectedMonthlyCost, runwayMonths, stockValue } from '../../sim/finance';
import { machineAssetValue } from '../../sim/machines';
import { advancesTotal, receivablesTotal } from '../../sim/sales';
import { barChart, donut, hbars, lineChart, pairBars, sparkline } from '../charts';
import { celebrate, countTo, flyDelta, h, press, toast } from '../dom';
import { emblemSvg } from '../emblem';
import type { App } from '../app';
import { cityData } from '../../data';
import { openSettings } from './settings';
import { mapKey, mapView } from './map';
import { projectsView } from './projects';
import { opsView } from './ops';
import { landAssetValue, ownedParcels } from '../../sim/land';
import { loansView, partnersView } from './bank';
import { tendersView } from './tenders';
import { marketView } from './market';
import { deliveryScene, tenderWinScene } from '../cinema';
import { levelCard, nextQuest, questsCard } from './progress';
import { ACHIEVEMENTS, LEVEL_DEFS, QUESTS, STAGES } from '../../data';
import { heroBanner } from '../hero';
import { openHQ } from '../hq';
import { pageHead } from '../pagehead';
import { holdingView, setHoldingSub } from './holding';
import { openGuide, TAB_TOPIC } from '../guide';
import { startTutorial, tutorialDone } from '../tutorial';
import { saveView } from '../../platform/lastView';
import { BIG_PROFIT, achievementCard, crisisBanner, levelUpScene, successCard } from '../moments';
import { openEventDecision } from './eventModal';
import { openYearReport } from '../reportUi';
import { mgmtCard, openManage } from '../manageUi';
import { STYLE_LABEL, aliveRivals } from '../../sim/rivals';
import { eventDef } from '../../data';
import { creditCapacity, debtTotal } from '../../sim/loans';
import { C, EMOJI, ring } from '../art';
import { investorLiability } from '../../sim/finance';
import { contractAssets } from '../../sim/tenders';

const LEVELS = LEVEL_DEFS.map((l) => l.label);
const ICON = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 15l4-4 3 3 5-6"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  team: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14c3 0 5 2 5 5"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  build: '<svg viewBox="0 0 24 24"><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-4h6v4M9 11h2M13 11h2M9 14h2M13 14h2"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h3M11 12h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/><circle cx="9" cy="12" r="0.01"/></svg>',
  pause: '<svg viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M8 5v14M16 5v14" stroke-width="3.2"/></svg>',
  doc: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  hold: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V5h6v3M3 13h18M11 13v2h2v-2"/></svg>',
};
type Tab = 'sirket' | 'harita' | 'projeler' | 'operasyon' | 'ihale' | 'holding' | 'finans' | 'piyasa';
const TABS: [Tab, string, keyof typeof ICON][] = [['sirket', 'Şirket', 'home'], ['harita', 'Harita', 'pin'], ['projeler', 'Projeler', 'build'], ['operasyon', 'Operasyon', 'team'], ['ihale', 'İhale', 'doc'], ['holding', 'Holding', 'hold'], ['finans', 'Finans', 'chart'], ['piyasa', 'Piyasa', 'globe']];

const monthLabel = (key: string) => { const [y, m] = key.split('-'); return `${['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'][Number(m) - 1]} ${y!.slice(2)}`; };
const dayLabel = (d: number) => { const x = dateOf(d); return monthLabel(`${x.year}-${String(x.month).padStart(2, '0')}`); };
const signed = (m: number) => `<span class="${m > 0 ? 'pos' : m < 0 ? 'neg' : ''}">${m > 0 ? '+' : ''}${formatMoney(m)}</span>`;

/** Şirket kabuğu: kalıcı HUD + 4 sekme. Tüm sayılar sim/finans katmanından türetilir (ikinci bir "doğru" yok). */
export function hubScreen(app: App, startTab: Tab = 'sirket'): HTMLElement {
  app.scene?.stop(); app.audio.ambient({ on: false, working: false, weather: 'acik' });
  const root = h('div', { class: 'shell' });
  let tab: Tab = startTab, sub = 'ozet';
  const hud = h('header', { class: 'hud' }), view = h('div', { class: 'view' }), tabs = h('nav', { class: 'tabs', 'aria-label': 'Ana sekmeler' });
  root.append(hud, view, tabs);

  // HUD bir kez kurulur, olaylarda yerinde güncellenir (hızlı akışta dokunma kaybolmasın)
  const ref: { cash?: HTMLElement; cashPill?: HTMLElement; date?: HTMLElement; sub?: HTMLElement; speed?: HTMLButtonElement[] } = {};
  const buildHud = () => {
    const c = app.store.state.company!;
    const speeds: [Speed, string][] = [[0, ''], [1, '1×'], [2, '2×'], [4, '4×']];
    const seg = h('div', { class: 'seg speeds', role: 'group', 'aria-label': 'Oyun hızı' });
    ref.speed = [];
    for (const [v, l] of speeds) { const b = h('button', { 'aria-label': v === 0 ? 'Duraklat' : `Hız ${l}`, ...(v === 0 ? { html: ICON.pause } : {}), onclick: () => { press(app); app.store.setSpeed(v); } }, v === 0 ? null : l) as HTMLButtonElement; b.dataset.v = String(v); ref.speed.push(b); seg.append(b); }
    seg.append(h('button', { 'aria-label': 'Olay çıkana kadar en çok 30 gün atla', onclick: () => { press(app); app.store.skip(30); } }, '⏭30'));
    ref.cash = h('b', {}); ref.cashPill = h('div', { class: 'pill cash' }, h('small', {}, 'KASA'), ref.cash);
    ref.date = h('b', { style: 'font-size:17px' }); ref.sub = h('small', {});
    hud.innerHTML = '';
    hud.append(
      h('div', { class: 'id' }, h('span', { html: emblemSvg(c.emblem.shape, c.emblem.color, 38) }), h('div', { style: 'min-width:0' }, h('b', {}, c.name), ref.sub)),
      ref.cashPill, h('div', { class: 'sp' }), h('div', { class: 'pill' }, h('small', {}, 'TARİH'), ref.date), seg,
      h('button', { class: 'btn ibtn guidebtn', 'aria-label': 'Rehber: oyun nasıl oynanır', title: 'Rehber', onclick: () => { press(app); openGuide(app, TAB_TOPIC[tab]); } }, '?'),
      h('button', { class: 'btn ibtn', 'aria-label': 'Ayarlar', html: ICON.gear, onclick: () => { press(app); openSettings({ ...app, activeTier: () => app.scene?.activeTier ?? 'mid' }); } }),
      h('button', { class: 'btn ibtn', 'aria-label': 'Ana menü', html: ICON.menu, onclick: async () => { press(app); app.store.setSpeed(0); try { await app.saves.autosave(app.store.state); } catch { /* menü yine açılır */ } app.menu(); } }),
    );
  };
  // Kasa göstergesi: değişimde kısa sayaç animasyonu ve yeşil/kırmızı vurgu
  let shownCash: number | null = null, tween = 0;
  const setCash = (v: number) => {
    const el = ref.cash!; if (shownCash === null || app.settings.reduced || Math.abs(v - shownCash) < 100) { shownCash = v; el.textContent = formatMoney(v); return; }
    if (shownCash < 0 && v >= 0) { app.audio.sfx('fanfare'); toast('🛡️ Nakit yeniden pozitif: kriz atlatıldı.', 5000); }
    const from = shownCash, t0 = performance.now(), up = v > from; cancelAnimationFrame(tween); shownCash = v; if (Math.abs(v - from) >= 50_000) flyDelta(ref.cashPill!, `${up ? '+' : '−'}${formatMoney(Math.abs(v - from))}`, up);
    ref.cashPill!.classList.remove('up', 'down'); ref.cashPill!.classList.add(up ? 'up' : 'down');
    const step = (now: number) => { const k = Math.min(1, (now - t0) / 550), e = 1 - Math.pow(1 - k, 3); el.textContent = formatMoney(Math.round(from + (v - from) * e)); if (k < 1) tween = requestAnimationFrame(step); else { el.textContent = formatMoney(v); setTimeout(() => ref.cashPill?.classList.remove('up', 'down'), 500); } };
    tween = requestAnimationFrame(step);
  };
  const moodNow = () => { const s = app.store.state, c = s.company; return c && (s.macro.regime === 'kriz' || c.cash < 0 || s.loans.some((l) => l.missed > 0)) ? 'tense' as const : 'game' as const; };
  const drawHud = () => {
    const s = app.store.state, c = s.company; if (!c || !ref.cash) return;
    setCash(c.cash); ref.cashPill!.classList.toggle('neg', c.cash < 0);
    ref.date!.textContent = formatDate(s.clock.day); ref.sub!.textContent = `${LEVELS[c.level - 1]} · İtibar ${c.reputation}`;
    for (const b of ref.speed!) { const on = Number(b.dataset.v) === app.store.speed; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  };
  const drawTabs = () => {
    tabs.innerHTML = '';
    const coach = nextQuest(app.store.state)?.tab;
    for (const [id, label, ic] of TABS) { if (id === 'holding' && app.store.state.company!.level < 4 && tab !== 'holding') continue; tabs.append(h('button', { class: `tab ${tab === id ? 'on' : ''}${coach === id && tab !== id ? ' coach' : ''}`, 'aria-current': tab === id ? 'page' : null, onclick: () => { if (tab === id) return; press(app); tab = id; saveView({ company: app.store.state.company!.name, tab }); drawTabs(); drawView(); } }, h('span', { html: ICON[ic], style: 'display:flex' }), label)) }
  };

  // ---------------- Şirket ----------------
  const overview = (): HTMLElement => {
    const s = app.store.state, c = s.company!;
    const rows = monthlyRows(s).filter((r) => r.key < `${dateOf(s.clock.day).year}-${String(dateOf(s.clock.day).month).padStart(2, '0')}`);
    const last = rows.at(-1);
    const hist = s.history.slice(-13);
    const prev = hist.length >= 2 ? hist.at(-2)!.netWorth : null;
    const delta = prev === null ? null : netWorth(s) - prev;
    const rw = runwayMonths(s);
    const pct = rw === null ? 100 : Math.min(100, (rw / 12) * 100);
    const col = rw === null || rw >= 6 ? 'var(--ok)' : rw >= 3 ? 'var(--warn)' : 'var(--bad)';
    const m = s.macro;
    const nwBig = h('div', { class: `big ${netWorth(s) < 0 ? 'neg' : ''}` }, formatMoney(lastNW ?? netWorth(s)));
    { const to = netWorth(s), from = lastNW ?? to; lastNW = to; setTimeout(() => countTo(nwBig, from, to, (n) => formatMoney(n)), 60); }
    const left = h('div', { class: 'col' },
      h('div', { class: 'card' },
        h('div', { class: 'lbl-s' }, 'Net varlık'),
        h('div', { style: 'display:flex;gap:12px;align-items:flex-end;justify-content:space-between' },
          h('div', {}, nwBig, h('div', { class: 'mute', style: 'font-size:12px', html: (delta === null ? 'İlk ay sonunda karşılaştırma başlar' : `Geçen aya göre ${signed(delta)}`) + (landAssetValue(s) > 0 ? ` · Nakit ${formatMoney(c.cash)} · Arsalar ${formatMoney(landAssetValue(s))}` : '') })),
          h('div', { style: 'width:42%;min-width:110px', html: sparkline(hist.map((p) => p.netWorth), '#FF8C32', 44) })),
        h('div', { class: 'lbl-s', style: 'margin-top:12px' }, `Nakit yeterlilik · ${rw === null ? 'sınırsız (gelir giderleri karşılıyor)' : rw.toFixed(1) + ' ay'}`),
        h('div', { class: 'meter', role: 'img', 'aria-label': 'Nakit yeterlilik' }, h('i', { style: `width:${pct}%;background:${col}` }))),
      h('div', { class: 'card kpis' },
        h('div', { class: 'kpi', html: `<small>${last ? 'Son ay gelir' : 'Gelir'}</small><b class="${last && last.income > 0 ? 'pos' : ''}">${last ? formatMoney(last.income) : '—'}</b>` }),
        h('div', { class: 'kpi', html: `<small>${last ? 'Son ay gider' : 'Beklenen aylık gider'}</small><b>${formatMoney(last ? last.expense : projectedMonthlyCost(s))}</b>` }),
        h('div', { class: 'kpi', html: `<small>Son ay net</small><b>${last ? signed(last.net) : '—'}</b>` })));
    const right = h('div', { class: 'col' },
      questsCard(app), levelCard(app, drawView),
      h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Bugün'), ...alerts(s, formatMoney, formatDate).map((a) => h('div', { class: 'alert' }, h('span', { class: `dot ${a.tone}` }), h('span', {}, a.text)))),
      h('div', { class: 'card' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, h('div', { class: 'lbl-s', style: 'margin:0' }, 'Piyasa nabzı'), h('span', { class: `regime ${m.regime}` }, REGIMES[m.regime].label)),
        h('div', { class: 'kpis', style: 'margin-top:8px' },
          h('div', { class: 'kpi', html: `<small>Faiz</small><b>%${m.policyRate.toFixed(1)}</b>` }), h('div', { class: 'kpi', html: `<small>Enflasyon</small><b>%${m.inflation.toFixed(1)}</b>` }), h('div', { class: 'kpi', html: `<small>Güven</small><b>${m.confidence.toFixed(0)}</b>` }))));
    const hero = heroBanner(s); hero.addEventListener('click', () => { press(app); openHQ(app); });
    // Bölümlere ayrılmış düzen: Bugün → Projelerim | Para durumum → Şirket seviyesi → Piyasa
    const L = Array.from(left.children), R = Array.from(right.children);
    const sec = (ico: string, t: string) => h('div', { class: 'sechd' }, h('span', {}, ico), t);
    const act = s.projects.filter((p) => p.status === 'insaat');
    const mini = h('div', { class: 'card' }, ...(act.length ? act.map((p) => {
      const b = p.build, st = b ? STAGES[b.stage] : null, prog = b ? (STAGES.slice(1, b.stage).reduce((a, x) => a + x.cost, 0) + STAGES[b.stage]!.cost * b.progress) / 100 : 0, crew = s.staff.filter((x) => x.project === p.id).length;
      return h('div', { class: 'pmini' }, h('div', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:baseline' }, h('b', {}, p.name), h('small', { class: 'mute' }, `%${Math.round(prog * 100)}`)),
        h('div', { class: 'meter' }, h('i', { style: `width:${Math.round(prog * 100)}%;background:var(--accent2)` })),
        h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px' }, h('small', { class: 'mute' }, `${st?.label ?? 'Başlıyor'} · 👷 ${crew ? crew + ' atanmış' : 'ortak havuz'}`), h('button', { class: 'btn', style: 'min-height:32px;font-size:12px;margin-left:auto', onclick: () => { press(app); openManage(app, p.id); } }, '🎛️ Yönet'), h('button', { class: 'btn', style: 'min-height:32px;font-size:12px', onclick: () => { press(app); app.openSite(p.id); } }, 'Şantiyeyi aç')));
    }) : [h('div', { class: 'empty' }, 'Aktif şantiye yok. Harita sekmesinden arsa alıp proje başlat.')]), h('button', { class: 'btn', style: 'margin-top:8px;min-height:36px', onclick: () => { press(app); app.openTab?.('projeler'); } }, 'Tüm projeler ▸'));
    const newLeft = h('div', { class: 'col' }, sec('🎯', 'Bugün ne yapmalıyım?'), R[0]!, R[2]!, sec('🏗️', 'Projelerim'), mini);
    const newRight = h('div', { class: 'col' }, sec('💰', 'Para durumum'), L[0]!, L[1]!, sec('🧭', 'Yönetim'), mgmtCard(app), sec('🏅', 'Şirket seviyesi'), R[1]!, sec('📈', 'Piyasa'), R[3]!);
    return h('div', {}, hero, h('div', { class: 'cols', style: 'margin-top:12px' }, newLeft, newRight));
  };

  // ---------------- Finans ----------------
  const finance = (): HTMLElement => {
    const s = app.store.state, rows = monthlyRows(s);
    const seg = h('div', { class: 'seg', role: 'group', style: 'margin-bottom:10px;align-self:flex-start' });
    for (const [id, label] of [['ozet', 'Gelir-Gider'], ['nakit', 'Nakit akışı'], ['gider', 'Gider dağılımı'], ['bilanco', 'Bilanço'], ['krediler', 'Krediler'], ['ortaklar', 'Ortaklar']] as const)
      seg.append(h('button', { class: sub === id ? 'on' : '', 'aria-pressed': String(sub === id), onclick: () => { press(app); sub = id; drawView(); } }, label));
    const body = h('div', {});
    if (sub === 'krediler') body.append(loansView(app, drawView));
    else if (sub === 'ortaklar') body.append(partnersView(app, drawView));
    else if (sub === 'ozet') {
      const last = rows.slice(-6);
      const t = h('table', { class: 'tbl' }, h('tr', {}, ...['Ay', 'Gelir', 'Gider', 'Vergi', 'Net'].map((x) => h('th', {}, x))));
      for (const r of last) t.append(h('tr', {}, h('td', {}, monthLabel(r.key)), h('td', { html: formatMoney(r.income) }), h('td', { html: formatMoney(r.expense) }), h('td', { html: formatMoney(r.tax) }), h('td', { html: signed(r.net) })));
      const tot = last.reduce((a, r) => ({ i: a.i + r.income, e: a.e + r.expense, t: a.t + r.tax, n: a.n + r.net }), { i: 0, e: 0, t: 0, n: 0 });
      t.append(h('tr', { class: 'tot' }, h('td', {}, 'Toplam'), h('td', { html: formatMoney(tot.i) }), h('td', { html: formatMoney(tot.e) }), h('td', { html: formatMoney(tot.t) }), h('td', { html: signed(tot.n) })));
      { // Üst özet kartları: kasa / net varlık / son ay net / borç — önceki aya göre gerçek değişim rozetiyle
        const hs = s.history, cur = s.company!.cash, prevCash = hs.length >= 2 ? hs.at(-2)!.cash : null, nwNow = netWorth(s), prevNW = hs.length >= 2 ? hs.at(-2)!.netWorth : null, lastRow = rows.at(-1), debtNow = debtTotal(s);
        const chip = (d: number | null, goodUp: boolean) => d === null || d === 0 ? '' : `<span class="dlt ${(d > 0) === goodUp ? 'good' : 'bad'}">${d > 0 ? '▲' : '▼'} ${formatMoney(Math.abs(d))}</span>`;
        const card = (ico: string, label: string, val: string, d: number | null, goodUp: boolean, series: number[], tone: string) => h('div', { class: `card fk ${tone}` }, h('div', { class: 'lbl-s' }, `${ico} ${label}`), h('b', { class: 'fkv', html: val }), h('div', { html: chip(d, goodUp) || '<span class="mute" style="font-size:12px">Karşılaştırma ay sonunda</span>' }), h('div', { html: series.length >= 2 ? sparkline(series, tone === 'bad' ? '#FF4D5A' : tone === 'good' ? '#3FBF8A' : '#FF8C32', 26) : '' }));
        body.append(h('div', { class: 'fkgrid' },
          card(EMOJI.finans, 'Kasa', formatMoney(cur), prevCash === null ? null : cur - prevCash, true, hs.slice(-12).map((p) => p.cash), cur < 0 ? 'bad' : 'neutral'),
          card(EMOJI.sirket, 'Net varlık', formatMoney(nwNow), prevNW === null ? null : nwNow - prevNW, true, hs.slice(-12).map((p) => p.netWorth), nwNow < 0 ? 'bad' : 'neutral'),
          card('📈', 'Son ay net', lastRow ? signed(lastRow.net) : '—', lastRow && rows.length >= 2 ? lastRow.net - rows.at(-2)!.net : null, true, rows.slice(-8).map((r) => r.net), lastRow ? (lastRow.net >= 0 ? 'good' : 'bad') : 'neutral'),
          card(EMOJI.kredi, 'Toplam borç', formatMoney(debtNow), null, false, [], debtNow > 0 ? 'neutral' : 'good')));
      }
      { // Finansal sağlık göstergeleri (hepsi gerçek veriden): borç/limit, kârlılık, likidite, öz sermaye payı
        const cap = creditCapacity(s), debt = debtTotal(s), inc = last.reduce((a, r) => a + r.income, 0), net = last.reduce((a, r) => a + r.net, 0), margin = inc > 0 ? net / inc : 0, rwm = runwayMonths(s), nw = netWorth(s), assets = nw + debt;
        body.append(h('div', { class: 'card gauges' },
          h('div', { class: 'gg' }, h('div', { html: ring(cap.total > 0 ? debt / cap.total : 0, debt / Math.max(1, cap.total) > 0.8 ? C.bad : debt / Math.max(1, cap.total) > 0.5 ? C.warn : C.ok, `%${Math.round((cap.total > 0 ? debt / cap.total : 0) * 100)}`, 'limit') }), h('small', {}, `${EMOJI.kredi} Borç ${formatMoney(debt)}`), h('span', { class: `gst ${debt / Math.max(1, cap.total) > 0.8 ? 'bad' : debt / Math.max(1, cap.total) > 0.5 ? 'warn' : 'ok'}` }, debt / Math.max(1, cap.total) > 0.8 ? 'Riskli' : debt / Math.max(1, cap.total) > 0.5 ? 'Dikkat' : 'Sağlıklı')),
          h('div', { class: 'gg' }, h('div', { html: ring(Math.max(0, Math.min(1, 0.5 + margin)), margin >= 0 ? C.ok : C.bad, `${margin < -0.005 ? '−' : ''}%${Math.abs(Math.round(margin * 100))}`, 'marj') }), h('small', {}, '📊 Kârlılık (6 ay)'), h('span', { class: `gst ${margin >= 0.1 ? 'ok' : margin >= 0 ? 'warn' : 'bad'}` }, margin >= 0.1 ? 'Sağlıklı' : margin >= 0 ? 'Dikkat' : 'Zarar')),
          h('div', { class: 'gg' }, h('div', { html: ring(rwm === null ? 1 : rwm / 12, rwm === null || rwm >= 6 ? C.ok : rwm >= 3 ? C.warn : C.bad, rwm === null ? '∞' : rwm.toFixed(1), 'ay') }), h('small', {}, `${EMOJI.finans} Nakit yeterlilik`), h('span', { class: `gst ${rwm === null || rwm >= 6 ? 'ok' : rwm >= 3 ? 'warn' : 'bad'}` }, rwm === null || rwm >= 6 ? 'Sağlıklı' : rwm >= 3 ? 'Dikkat' : 'Riskli')),
          h('div', { class: 'gg' }, h('div', { html: ring(assets > 0 ? Math.max(0, nw) / assets : 0, C.acc2, `%${Math.round((assets > 0 ? Math.max(0, nw) / assets : 0) * 100)}`, 'özkaynak') }), h('small', {}, `${EMOJI.sirket} Şirket değeri ${formatMoney(nw)}`))));
      }
      body.append(h('div', { class: 'cols', style: 'margin-bottom:12px' }, h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Gelir ve gider (son 6 ay)'), pairBars(last.map((r) => ({ label: monthLabel(r.key), a: r.income, b: r.expense })))), h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Net varlık gelişimi'), lineChart(s.history.slice(-24).map((p) => ({ label: dayLabel(p.day), value: p.netWorth })), undefined, 150))),
        h('div', { class: 'card', style: 'overflow:auto' }, h('div', { class: 'lbl-s' }, 'Aylık gelir tablosu (son 6 ay)'), t), h('p', { class: 'mute', style: 'font-size:12px' }, `Vergi: çeyrek kârının %25'i. Devreden zarar: ${formatMoney(s.taxLossCarry)}. Sermaye, yatırım ve finansman hareketleri gelir tablosuna girmez.`));
    } else if (sub === 'nakit') {
      const net = rows.map((r) => ({ label: monthLabel(r.key), value: r.operating + r.investing + r.financing }));
      body.append(h('div', { class: 'cols' },
        h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Ay sonu kasa'), lineChart(rows.map((r) => ({ label: monthLabel(r.key), value: r.endCash })))),
        h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Aylık net nakit değişimi'), barChart(net))));
    } else if (sub === 'gider') {
      const tot: Record<string, number> = {};
      for (const r of rows.slice(-12)) for (const [k, v] of Object.entries(r.byCat)) { const kind = ledgerCat(k)?.kind; if (kind === 'gider' || kind === 'vergi') tot[k] = (tot[k] ?? 0) - v; }
      const items = Object.entries(tot).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: ledgerCat(k)?.label ?? k, value: v }));
      body.append(h('div', { class: 'cols' }, h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, '🧾 Son 12 ay gider dağılımı'), donut(items)), h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Kalem kalem'), hbars(items))));
    } else {
      const cash = s.company!.cash;
      const t = h('table', { class: 'tbl' }, h('tr', {}, h('th', {}, 'Kalem'), h('th', {}, 'Tutar')),
        h('tr', {}, h('td', {}, 'Nakit (kasa)'), h('td', { html: formatMoney(cash) })), h('tr', {}, h('td', {}, `Arsalar (piyasa değeri, ${ownedParcels(s).length} adet)`), h('td', { html: formatMoney(landAssetValue(s)) })), h('tr', {}, h('td', {}, 'Projeler (inşaat maliyeti / biten bina)'), h('td', { html: formatMoney(projectAssetValue(s)) })), h('tr', {}, h('td', {}, `Makineler (${s.machines.length} adet)`), h('td', { html: formatMoney(machineAssetValue(s)) })), h('tr', {}, h('td', {}, 'Malzeme stoğu'), h('td', { html: formatMoney(stockValue(s)) })), h('tr', {}, h('td', {}, 'Alacaklar (taksit, teslim bakiyesi)'), h('td', { html: formatMoney(receivablesTotal(s)) })), h('tr', {}, h('td', {}, 'Alınan avanslar (ön satış, yükümlülük)'), h('td', { html: formatMoney(-advancesTotal(s)) })), h('tr', { class: 'tot' }, h('td', {}, 'Toplam varlık'), h('td', { html: formatMoney(netWorth(s) + debtTotal(s) + investorLiability(s)) })),
        h('tr', {}, h('td', {}, `Banka borçları (${s.loans.length} kredi)`), h('td', { html: formatMoney(-debtTotal(s)) })), h('tr', {}, h('td', {}, 'Yatırımcı fonları (proje sonunda iade)'), h('td', { html: formatMoney(-investorLiability(s)) })), h('tr', {}, h('td', {}, 'İhale: hakediş, teminat, kazanılmamış avans'), h('td', { html: formatMoney(contractAssets(s)) })), h('tr', { class: 'tot' }, h('td', {}, 'Özkaynak (net varlık)'), h('td', { html: signed(netWorth(s)) })));
      body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Bilanço özeti'), t), h('p', { class: 'mute', style: 'font-size:12px' }, 'Arsalar güncel piyasa değeriyle gösterilir. Devam eden projeler, makine ve krediler ilgili sistemler eklendikçe bu tabloya girer. Kasa her zaman defter toplamına eşittir.'));
    }
    return h('div', { style: 'display:flex;flex-direction:column' }, seg, body);
  };

  // ---------------- Piyasa ----------------
  let lastViewKey = '', lastNW: number | null = null;
  // Kullanıcı bir alanla uğraşırken (yazı, kaydırıcı, açılır liste) otomatik yenileme o alanı silmesin: bırakınca yenile
  let pendingRedraw = false, dragging = false;
  const inputBusy = () => { const a = document.activeElement as HTMLElement | null; return dragging || (!!a && view.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && (a as HTMLInputElement).type !== 'checkbox'); };
  const flushRedraw = () => setTimeout(() => { if (pendingRedraw && !inputBusy() && root.isConnected) { pendingRedraw = false; drawView(); } }, 200);
  view.addEventListener('pointerdown', (e) => { const el = e.target as HTMLElement; if (el.tagName === 'INPUT' || el.tagName === 'SELECT') dragging = true; });
  const upHandler = () => { if (!root.isConnected) { for (const ev of ['pointerup', 'pointercancel']) window.removeEventListener(ev, upHandler); return; } if (dragging) { dragging = false; flushRedraw(); } };
  for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, upHandler);
  view.addEventListener('focusout', flushRedraw); view.addEventListener('change', flushRedraw);
  const drawView = () => {
    const vkey = `${tab}:${tab === 'harita' ? mapKey() : ''}`, keep = vkey === lastViewKey ? view.scrollTop : 0; lastViewKey = vkey; view.innerHTML = '';
    if (tab !== 'sirket') view.append(pageHead(app, tab));
    view.append(tab === 'sirket' ? overview() : tab === 'harita' ? mapView(app, drawView) : tab === 'projeler' ? projectsView(app, drawView) : tab === 'operasyon' ? opsView(app, drawView) : tab === 'ihale' ? tendersView(app, drawView) : tab === 'holding' ? holdingView(app, drawView) : tab === 'finans' ? finance() : marketView(app, drawView));
    view.scrollTop = keep;
  };

  // Olaylar: gün akışı yalnızca HUD'u günceller; ay/komut olayları sekmeyi yeniler
  const REDRAW = new Set(['MONTH', 'STAFF_HIRED', 'STAFF_FIRED', 'MACRO_NEWS', 'TAX_PAID', 'YEAR', 'CASH_NEGATIVE', 'LAND_BOUGHT', 'LAND_SOLD', 'LAND_LISTED', 'LAND_UNLISTED', 'SURVEY_DONE', 'PROJECT_CREATED', 'PROJECT_CANCELLED', 'PROJECT_STARTED', 'STAGE_COMPLETED', 'PROJECT_COMPLETED', 'PROJECT_SOLD', 'CONSTRUCTION_STALLED', 'CONSTRUCTION_RESUMED', 'SOIL_REVEALED', 'ORDER_PLACED', 'MACHINE_BOUGHT', 'MACHINE_SOLD', 'MACHINE_BROKEN', 'STAFF_ASSIGNED', 'POLICY_CHANGED', 'ACCIDENT', 'SUPPLIER_DELAY', 'UNIT_SOLD', 'KAPORA', 'KAPORA_CANCELLED', 'SALES_POLICY', 'BULK_SOLD', 'DELIVERED', 'COMPLAINT', 'DEFAULT', 'RECEIVABLE_MISSED', 'BRANCH_OPENED', 'LOAN_TAKEN', 'LOAN_DRAWN', 'LOAN_REPAID', 'LOAN_RESTRUCTURED', 'LOAN_MISSED', 'LOAN_ROLLED', 'SEIZURE', 'INVESTOR_IN', 'INVESTOR_PAID', 'DIVIDEND', 'EQUITY_SOLD', 'TENDER_NEW', 'TENDER_WON', 'TENDER_LOST', 'BID_PLACED', 'HAKEDIS', 'CONTRACT_DONE', 'BANKRUPT', 'EVENT_DECISION', 'EVENT_RESOLVED', 'RIVAL_FAILED', 'QUEST_DONE', 'ACHIEVEMENT', 'LEVEL_UP', 'OFFICE_UPGRADED', 'VENTURE_OPENED', 'VENTURE_BROKE', 'VENTURE_SOLD', 'INFRA_DONE', 'IPO', 'ACQUIRED', 'STRATEGY_SET', 'GM_SET', 'BUYBACK', 'YEAR_REPORT', 'DEAL_NEW', 'DEAL_DONE', 'DEAL_LOST', 'OFFER_NEW', 'OFFER_LOST', 'RENT_STARTED', 'RENT_ENDED', 'UNIT_SET', 'FOCUS_SET', 'ORDER_SET', 'MANAGER_SET', 'DECOR_BOUGHT']);
  const unsub = app.store.subscribe((evs) => {
    if (!root.isConnected) { unsub(); return; }
    let redraw = false;
    for (const e of evs) {
      if (e.pause && !['EVENT_DECISION', 'LEVEL_UP', 'BANKRUPT', 'CASH_NEGATIVE', 'TENDER_WON', 'PROJECT_COMPLETED', 'CONTRACT_DONE', 'INFRA_DONE', 'IPO'].includes(e.type)) toast('⏸ Oyun duraklatıldı — önemli bir gelişme var. Devam için hız düğmesine dokunun.', 3500);
      if (REDRAW.has(e.type)) redraw = true;
      if (e.type === 'MONTH') void app.saves.autosave(app.store.state).catch(() => {});
      if (e.type === 'MACRO_NEWS') { const d = e.data as { text: string; tone: string }; app.audio.sfx(d.tone === 'bad' ? 'error' : 'confirm'); toast(d.text, 5000); }
      if (e.type === 'SURVEY_DONE') { app.audio.sfx('confirm'); toast((e.data!.kind === 'soil' ? 'Zemin etüdü tamamlandı.' : 'Piyasa araştırması tamamlandı.'), 4000); }
      if (e.type === 'LAND_SOLD') { app.audio.sfx('confirm'); if (!e.data!.quick) toast(`Arsanız satıldı: ${formatMoney(e.data!.price as number)}`, 4500); }
      if (e.type === 'CONSTRUCTION_STALLED') { app.audio.sfx('error'); toast('Bir şantiyede nakit bitti: inşaat durdu!', 5000); }
      if (e.type === 'UNIT_SOLD') { app.audio.sfx('coin'); toast(`Daire satıldı: ${formatMoney(e.data!.price as number)}`, 3200); }
      if (e.type === 'DEAL_NEW') { app.audio.sfx('bell'); toast('📢 Yeni fırsat ilanı: Şirket › Yönetim › Fırsat ilanları', 4200); }
      if (e.type === 'OFFER_NEW') { app.audio.sfx('bell'); const pn = app.store.state.projects.find((x) => x.id === e.data!.projectId)?.name ?? 'projenize'; toast(`📨 Yeni ${e.data!.kind === 'kira' ? 'kiracı' : 'alıcı'} teklifi: ${pn}. Projeler › Satış merkezi`, 3800); }
      if (e.type === 'RENT_STARTED') toast(`🔑 Kira sözleşmesi başladı: ${formatMoney(e.data!.amount as number)}/ay`, 3000);
      if (e.type === 'RENT_ENDED' && e.data!.by !== 'oyuncu') toast(`Kiracı ayrıldı: ${e.data!.tenant as string}. Daire yeniden kiralık.`, 3200);
      if (e.type === 'KAPORA') toast('Bir müşteri kapora bıraktı.', 2800);
      if (e.type === 'DEFAULT') { app.audio.sfx('error'); toast(`Bir alıcı taksitleri ödemedi: daire stoğa döndü (kayıp ${formatMoney(e.data!.lost as number)}).`, 5000); }
      if (e.type === 'DELIVERED') toast(`Daireler teslim edildi · müşteri memnuniyeti ${e.data!.avgSat}.`, 4500);
      if (e.type === 'COMPLAINT') toast(`Garanti talebi: ${formatMoney(e.data!.cost as number)}`, 3500);
      if (e.type === 'ACCIDENT') { app.audio.sfx('error'); app.haptic('heavy'); toast(`İş kazası! Şantiye ${e.data!.days} gün durdu, tazminat ${formatMoney(e.data!.cost as number)}.`, 5500); }
      if (e.type === 'MACHINE_BROKEN') toast(`Bir makine arızalandı (${e.data!.days} gün).`, 4000);
      if (e.type === 'SUPPLIER_DELAY') toast(`${e.data!.supplier}: teslimat ${e.data!.days} gün gecikecek.`, 4500);
      if (e.type === 'CONSTRUCTION_RESUMED') toast('Nakit sağlandı: inşaat devam ediyor.');
      if (e.type === 'SOIL_REVEALED') { app.audio.sfx((e.data!.extra as number) > 0 ? 'error' : 'confirm'); toast((e.data!.extra as number) === 0 ? 'Hafriyat: zemin beklendiği gibi çıktı.' : `Hafriyatta zemin ortaya çıktı: ${(e.data!.extra as number) > 0 ? 'ek maliyet +' : 'tasarruf '}${formatMoney(Math.abs(e.data!.extra as number))}`, 5000); }
      if (e.type === 'PROJECT_COMPLETED') { const pr = app.store.state.projects.find((x) => x.id === e.data!.projectId); if (pr && !document.querySelector('.site')) deliveryScene(app, pr); toast('Bir proje tamamlandı! Projeler sekmesinden şantiyeyi açın.', 5000); }
      if (e.type === 'PROJECT_STARTED') toast('İnşaat başladı.');
      if (e.type === 'PROJECT_SOLD') { if ((e.data!.profit as number) >= BIG_PROFIT) successCard(app, e.data!.price as number, e.data!.profit as number); else { app.audio.sfx('coin'); toast(`Bina satıldı: ${formatMoney(e.data!.price as number)}`, 4500); } }
      if (e.type === 'YEAR_REPORT') openYearReport(app, e.data!.year as number);
      if (e.type === 'YEAR') toast(`Yeni yıl: personel maaşlarına %${((e.data!.raise as number) * 100).toFixed(0)} zam yapıldı.`, 4500);
      if (e.type === 'LOAN_MISSED') { app.audio.sfx('error'); toast(`Kredi taksiti ödenemedi (${e.data!.missed}/3)! Kredi notu düştü. 3 kaçırmada haciz başlar.`, 6000); }
      if (e.type === 'SEIZURE') { app.audio.sfx('alarm'); app.haptic('heavy'); toast(`Haciz: varlıklarınız zorla satıldı (${formatMoney(e.data!.raised as number)}).`, 6000); }
      if (e.type === 'LOAN_DRAWN') toast(`İnşaat kredisinden ${formatMoney(e.data!.amount as number)} kullanıldı.`, 3000);
      if (e.type === 'LOAN_ROLLED') toast('İnşaat kredisi vadesi doldu: ticari krediye devredildi.', 4500);
      if (e.type === 'HAKEDIS') app.audio.sfx('coin');
      if (e.type === 'TENDER_NEW' && !evs.some((x) => x.type === 'TENDER_NEW' && x !== e && evs.indexOf(x) < evs.indexOf(e))) toast(evs.filter((x) => x.type === 'TENDER_NEW').length > 1 ? 'Yeni ihaleler açıldı. İhale sekmesine bakın.' : 'Yeni ihale açıldı. İhale sekmesine bakın.', 3500);
      if (e.type === 'TENDER_WON') { const tn = app.store.state.tenders.find((x) => x.id === e.data!.tenderId); if (tn) tenderWinScene(app, tn); toast(e.data!.infra ? 'Altyapı ihalesini kazandınız! Avans yattı; iş Holding › Altyapı\'da başladı (makine ve ekip gerekir).' : 'İhaleyi kazandınız! Avans yattı; projeyi Projeler sekmesinden başlatın.', 6000); }
      if (e.type === 'INFRA_DONE') { app.audio.sfx('fanfare'); celebrate(app.settings.reduced); toast(`Altyapı işi teslim edildi: ${e.data!.name} · kâr ${formatMoney(e.data!.profit as number)}${(e.data!.late as number) > 0 ? ` (${e.data!.late} gün gecikme)` : ''}`, 6500); }
      if (e.type === 'VENTURE_OPENED') { app.audio.sfx('stamp'); toast(`🏛️ Yeni iş kolu: ${e.data!.name}`, 4500); }
      if (e.type === 'VENTURE_BROKE') toast(`⚠️ ${e.data!.name}: santral arızası, bu ay üretim yok.`, 4500);
      if (e.type === 'VENTURE_SOLD') toast(`İş kolu satıldı: ${formatMoney(e.data!.price as number)}`, 3500);
      if (e.type === 'IPO') { app.audio.sfx('fanfare'); celebrate(app.settings.reduced); toast(`📈 Şirket halka açıldı! Kaynak ${formatMoney(e.data!.proceeds as number)}`, 6000); }
      if (e.type === 'ACQUIRED') { app.audio.sfx('stamp'); toast(`🏛️ ${e.data!.rival} satın alındı (bağlı şirket)`, 5000); }
      if (e.type === 'TENDER_LOST') { app.audio.sfx('error'); toast(e.data!.reason === 'elendi' ? 'İhaleden elendiniz: olağan dışı düşük teklif.' : `İhaleyi kaybettiniz. Kazanan: ${e.data!.winner}.`, 5000); }
      if (e.type === 'HAKEDIS') toast(`Hakediş tahsil edildi: ${formatMoney(e.data!.amount as number)}`, 3500);
      if (e.type === 'CONTRACT_DONE') { app.audio.sfx('fanfare'); celebrate(app.settings.reduced); toast(`İhale işi teslim edildi · kâr ${formatMoney(e.data!.profit as number)}${(e.data!.penalty as number) > 0 ? ` (gecikme cezası ${formatMoney(e.data!.penalty as number)})` : ''}`, 6000); }
      if (e.type === 'INVESTOR_PAID') toast(`Yatırımcıya ödeme yapıldı: ${formatMoney(e.data!.amount as number)}`, 4000);
      if (e.type === 'DIVIDEND') toast(`Ortaklara temettü: ${formatMoney(e.data!.amount as number)}`, 4000);
      if (e.type === 'MONTH') { app.audio.setMood(moodNow()); const hs = app.store.state.history, a2 = hs.at(-2)?.netWorth, b2 = hs.at(-1)?.netWorth; if (a2 && b2 !== undefined && a2 > 0 && b2 < a2 * 0.85) { hud.classList.remove('lossflash'); void hud.offsetWidth; hud.classList.add('lossflash'); crisisBanner(app, a2 - b2, Math.round((1 - b2 / a2) * 100)); } }
      if (e.type === 'PROJECT_CREATED') { app.audio.sfx('stamp'); toast('Yeni proje dosyası açıldı.', 2600); const t = tabs.querySelector('.tab:nth-child(3)'); t?.classList.remove('ping'); void (t as HTMLElement | null)?.offsetWidth; t?.classList.add('ping'); }
      if (e.type === 'EVENT_DECISION') { app.audio.sfx('bell'); openEventDecision(app); }
      if (e.type === 'EVENT_RESOLVED') { const d = eventDef(e.data!.id as string); const ch = d?.ch[e.data!.choice as number]; { const who = (e.data!.who as string | undefined) ?? 'Bir çalışan', fk = (x: string) => x.replace(/\{kisi\}/g, who); toast(`${d ? fk(d.t) : 'Olay'}: ${ch ? fk(ch.l) : ''}${e.data!.auto ? ' (süre doldu)' : ''}${e.data!.success === true ? ' — başarılı' : e.data!.success === false ? ' — olmadı' : ''}`, 4500); } }
      if (e.type === 'OFFICE_UPGRADED' && !document.querySelector('.hq')) { app.audio.sfx('fanfare'); openHQ(app); }
      if (e.type === 'QUEST_DONE') { drawTabs(); app.audio.sfx('confirm'); toast(`Görev tamam: ${QUESTS.find((q) => q.id === e.data!.id)?.t ?? ''}`, 4000); }
      if (e.type === 'ACHIEVEMENT') achievementCard(app, e.data!.id as string);
      if (e.type === 'LEVEL_UP') { drawTabs(); app.audio.sfx('fanfare'); app.haptic('heavy'); levelUpScene(app, e.data!.level as number, e.data!.label as string); }
      if (e.type === 'BANKRUPT') { app.audio.sfx('alarm'); app.haptic('heavy'); showBankrupt(); }
      if (e.type === 'CASH_NEGATIVE') { app.audio.sfx('error'); toast('Kasa eksiye düştü! Oyun duraklatıldı.', 5000); }
    }
    drawHud(); if (redraw) { if (inputBusy()) pendingRedraw = true; else drawView(); }
  });
  const showBankrupt = () => {
    if (document.querySelector('.bankrupt')) return; const s = app.store.state;
    const m = h('div', { class: 'modal bankrupt', role: 'alertdialog', 'aria-label': 'İflas' }, h('div', { class: 'card', style: 'width:min(460px,95vw);text-align:center' }, h('h2', { style: 'color:var(--bad,#ff6b6b)' }, 'İflas'), h('p', {}, `${s.company!.name} borçlarını ödeyemedi ve tüm varlıkları tükendi. Şirket kapandı.`), h('p', { class: 'mute' }, `Dayanma süresi: ${Math.round(s.clock.day / 30)} ay · Tamamlanan proje: ${s.company!.stats.completed}`), h('div', { style: 'display:flex;gap:8px;justify-content:center' }, h('button', { class: 'btn gold', onclick: () => { m.remove(); app.menu(); } }, 'Ana menü'))));
    document.body.append(m);
  };
  if (app.store.state.company?.bankrupt) showBankrupt();
  if (app.store.state.pending) setTimeout(() => openEventDecision(app), 0);
  // Yeni oyunda (gün ≤ 1) anlatıcı bir kez başlar; otomasyon tarayıcılarında (webdriver) kendiliğinden açılmaz.
  if (app.store.state.clock.day <= 1 && !tutorialDone() && !navigator.webdriver) setTimeout(() => { if (root.isConnected) startTutorial(app); }, 900);
  app.openTab = (t, sb) => { if (t === 'holding' && sb) setHoldingSub(sb); tab = t; saveView({ company: app.store.state.company!.name, tab }); if (sb) sub = sb; drawTabs(); drawView(); };
  root.addEventListener('unmount', () => { unsub(); cancelAnimationFrame(tween); if (app.openTab) delete app.openTab; });
  buildHud(); drawHud(); drawTabs(); drawView(); app.audio.setMood(moodNow());
  return root;
}
