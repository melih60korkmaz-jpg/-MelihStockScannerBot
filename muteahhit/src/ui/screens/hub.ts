import { dateOf, formatDate } from '../../core/calendar';
import { formatMoney, TL } from '../../core/money';
import type { Speed } from '../../core/store';
import { OFFICES, STAFF_TYPES, ledgerCat, officeFor } from '../../data';
import { REGIMES } from '../../sim/macro';
import { alerts, monthlyRows, netWorth, projectAssetValue, projectedMonthlyCost, runwayMonths, stockValue } from '../../sim/finance';
import { machineAssetValue } from '../../sim/machines';
import { advancesTotal, receivablesTotal } from '../../sim/sales';
import { barChart, hbars, lineChart, sparkline } from '../charts';
import { h, press, toast } from '../dom';
import { emblemSvg } from '../emblem';
import type { App } from '../app';
import { openSettings } from './settings';
import { mapView } from './map';
import { projectsView } from './projects';
import { opsView } from './ops';
import { landAssetValue, ownedParcels } from '../../sim/land';

const LEVELS = ['Şahıs Müteahhit', 'Küçük Firma', 'Yerel Firma', 'Bölge Firması', 'Şehir Markası', 'Çok Şehirli Firma', 'Ulusal Firma', 'Holding'];
const ICON = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 15l4-4 3 3 5-6"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  team: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14c3 0 5 2 5 5"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  build: '<svg viewBox="0 0 24 24"><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-4h6v4M9 11h2M13 11h2M9 14h2M13 14h2"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h3M11 12h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/><circle cx="9" cy="12" r="0.01"/></svg>',
  pause: '<svg viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M8 5v14M16 5v14" stroke-width="3.2"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
};
type Tab = 'sirket' | 'harita' | 'projeler' | 'operasyon' | 'finans' | 'piyasa';
const TABS: [Tab, string, keyof typeof ICON][] = [['sirket', 'Şirket', 'home'], ['harita', 'Harita', 'pin'], ['projeler', 'Projeler', 'build'], ['operasyon', 'Operasyon', 'team'], ['finans', 'Finans', 'chart'], ['piyasa', 'Piyasa', 'globe']];

const monthLabel = (key: string) => { const [y, m] = key.split('-'); return `${['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'][Number(m) - 1]} ${y!.slice(2)}`; };
const dayLabel = (d: number) => { const x = dateOf(d); return monthLabel(`${x.year}-${String(x.month).padStart(2, '0')}`); };
const signed = (m: number) => `<span class="${m > 0 ? 'pos' : m < 0 ? 'neg' : ''}">${m > 0 ? '+' : ''}${formatMoney(m)}</span>`;

/** Şirket kabuğu: kalıcı HUD + 4 sekme. Tüm sayılar sim/finans katmanından türetilir (ikinci bir "doğru" yok). */
export function hubScreen(app: App, startTab: Tab = 'sirket'): HTMLElement {
  app.scene?.stop(); app.audio.setMood('off');
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
      h('button', { class: 'btn ibtn', 'aria-label': 'Ayarlar', html: ICON.gear, onclick: () => { press(app); openSettings({ ...app, activeTier: () => app.scene?.activeTier ?? 'mid' }); } }),
      h('button', { class: 'btn ibtn', 'aria-label': 'Ana menü', html: ICON.menu, onclick: async () => { press(app); app.store.setSpeed(0); try { await app.saves.autosave(app.store.state); } catch { /* menü yine açılır */ } app.menu(); } }),
    );
  };
  const drawHud = () => {
    const s = app.store.state, c = s.company; if (!c || !ref.cash) return;
    ref.cash.textContent = formatMoney(c.cash); ref.cashPill!.classList.toggle('neg', c.cash < 0);
    ref.date!.textContent = formatDate(s.clock.day); ref.sub!.textContent = `${LEVELS[c.level - 1]} · İtibar ${c.reputation}`;
    for (const b of ref.speed!) { const on = Number(b.dataset.v) === app.store.speed; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  };
  const drawTabs = () => {
    tabs.innerHTML = '';
    for (const [id, label, ic] of TABS) tabs.append(h('button', { class: `tab ${tab === id ? 'on' : ''}`, 'aria-current': tab === id ? 'page' : null, onclick: () => { if (tab === id) return; press(app); tab = id; drawTabs(); drawView(); } }, h('span', { html: ICON[ic], style: 'display:flex' }), label));
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
    const left = h('div', { class: 'col' },
      h('div', { class: 'card' },
        h('div', { class: 'lbl-s' }, 'Net varlık'),
        h('div', { style: 'display:flex;gap:12px;align-items:flex-end;justify-content:space-between' },
          h('div', {}, h('div', { class: `big ${netWorth(s) < 0 ? 'neg' : ''}` }, formatMoney(netWorth(s))), h('div', { class: 'mute', style: 'font-size:12px', html: (delta === null ? 'İlk ay sonunda karşılaştırma başlar' : `Geçen aya göre ${signed(delta)}`) + (landAssetValue(s) > 0 ? ` · Nakit ${formatMoney(c.cash)} · Arsalar ${formatMoney(landAssetValue(s))}` : '') })),
          h('div', { style: 'width:42%;min-width:110px', html: sparkline(hist.map((p) => p.netWorth), '#F5B700', 44) })),
        h('div', { class: 'lbl-s', style: 'margin-top:12px' }, `Nakit yeterlilik · ${rw === null ? 'sınırsız (gelir giderleri karşılıyor)' : rw.toFixed(1) + ' ay'}`),
        h('div', { class: 'meter', role: 'img', 'aria-label': 'Nakit yeterlilik' }, h('i', { style: `width:${pct}%;background:${col}` }))),
      h('div', { class: 'card kpis' },
        h('div', { class: 'kpi', html: `<small>${last ? 'Son ay gelir' : 'Gelir'}</small><b class="${last && last.income > 0 ? 'pos' : ''}">${last ? formatMoney(last.income) : '—'}</b>` }),
        h('div', { class: 'kpi', html: `<small>${last ? 'Son ay gider' : 'Beklenen aylık gider'}</small><b>${formatMoney(last ? last.expense : projectedMonthlyCost(s))}</b>` }),
        h('div', { class: 'kpi', html: `<small>Son ay net</small><b>${last ? signed(last.net) : '—'}</b>` })));
    const right = h('div', { class: 'col' },
      h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Bugün'), ...alerts(s, formatMoney, formatDate).map((a) => h('div', { class: 'alert' }, h('span', { class: `dot ${a.tone}` }), h('span', {}, a.text)))),
      h('div', { class: 'card' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, h('div', { class: 'lbl-s', style: 'margin:0' }, 'Piyasa nabzı'), h('span', { class: `regime ${m.regime}` }, REGIMES[m.regime].label)),
        h('div', { class: 'kpis', style: 'margin-top:8px' },
          h('div', { class: 'kpi', html: `<small>Faiz</small><b>%${m.policyRate.toFixed(1)}</b>` }), h('div', { class: 'kpi', html: `<small>Enflasyon</small><b>%${m.inflation.toFixed(1)}</b>` }), h('div', { class: 'kpi', html: `<small>Güven</small><b>${m.confidence.toFixed(0)}</b>` }))));
    return h('div', { class: 'cols' }, left, right);
  };

  // ---------------- Finans ----------------
  const finance = (): HTMLElement => {
    const s = app.store.state, rows = monthlyRows(s);
    const seg = h('div', { class: 'seg', role: 'group', style: 'margin-bottom:10px;align-self:flex-start' });
    for (const [id, label] of [['ozet', 'Gelir-Gider'], ['nakit', 'Nakit akışı'], ['gider', 'Gider dağılımı'], ['bilanco', 'Bilanço']] as const)
      seg.append(h('button', { class: sub === id ? 'on' : '', 'aria-pressed': String(sub === id), onclick: () => { press(app); sub = id; drawView(); } }, label));
    const body = h('div', {});
    if (sub === 'ozet') {
      const last = rows.slice(-6);
      const t = h('table', { class: 'tbl' }, h('tr', {}, ...['Ay', 'Gelir', 'Gider', 'Vergi', 'Net'].map((x) => h('th', {}, x))));
      for (const r of last) t.append(h('tr', {}, h('td', {}, monthLabel(r.key)), h('td', { html: formatMoney(r.income) }), h('td', { html: formatMoney(r.expense) }), h('td', { html: formatMoney(r.tax) }), h('td', { html: signed(r.net) })));
      const tot = last.reduce((a, r) => ({ i: a.i + r.income, e: a.e + r.expense, t: a.t + r.tax, n: a.n + r.net }), { i: 0, e: 0, t: 0, n: 0 });
      t.append(h('tr', { class: 'tot' }, h('td', {}, 'Toplam'), h('td', { html: formatMoney(tot.i) }), h('td', { html: formatMoney(tot.e) }), h('td', { html: formatMoney(tot.t) }), h('td', { html: signed(tot.n) })));
      body.append(h('div', { class: 'card', style: 'overflow:auto' }, h('div', { class: 'lbl-s' }, 'Aylık gelir tablosu (son 6 ay)'), t), h('p', { class: 'mute', style: 'font-size:12px' }, `Vergi: çeyrek kârının %25'i. Devreden zarar: ${formatMoney(s.taxLossCarry)}. Sermaye, yatırım ve finansman hareketleri gelir tablosuna girmez.`));
    } else if (sub === 'nakit') {
      const net = rows.map((r) => ({ label: monthLabel(r.key), value: r.operating + r.investing + r.financing }));
      body.append(h('div', { class: 'cols' },
        h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Ay sonu kasa'), lineChart(rows.map((r) => ({ label: monthLabel(r.key), value: r.endCash })))),
        h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Aylık net nakit değişimi'), barChart(net))));
    } else if (sub === 'gider') {
      const tot: Record<string, number> = {};
      for (const r of rows.slice(-12)) for (const [k, v] of Object.entries(r.byCat)) { const kind = ledgerCat(k)?.kind; if (kind === 'gider' || kind === 'vergi') tot[k] = (tot[k] ?? 0) - v; }
      const items = Object.entries(tot).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: ledgerCat(k)?.label ?? k, value: v }));
      body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Son 12 ay gider dağılımı'), hbars(items)));
    } else {
      const cash = s.company!.cash;
      const t = h('table', { class: 'tbl' }, h('tr', {}, h('th', {}, 'Kalem'), h('th', {}, 'Tutar')),
        h('tr', {}, h('td', {}, 'Nakit (kasa)'), h('td', { html: formatMoney(cash) })), h('tr', {}, h('td', {}, `Arsalar (piyasa değeri, ${ownedParcels(s).length} adet)`), h('td', { html: formatMoney(landAssetValue(s)) })), h('tr', {}, h('td', {}, 'Projeler (inşaat maliyeti / biten bina)'), h('td', { html: formatMoney(projectAssetValue(s)) })), h('tr', {}, h('td', {}, `Makineler (${s.machines.length} adet)`), h('td', { html: formatMoney(machineAssetValue(s)) })), h('tr', {}, h('td', {}, 'Malzeme stoğu'), h('td', { html: formatMoney(stockValue(s)) })), h('tr', {}, h('td', {}, 'Alacaklar (taksit, teslim bakiyesi)'), h('td', { html: formatMoney(receivablesTotal(s)) })), h('tr', {}, h('td', {}, 'Alınan avanslar (ön satış, yükümlülük)'), h('td', { html: formatMoney(-advancesTotal(s)) })), h('tr', { class: 'tot' }, h('td', {}, 'Toplam varlık'), h('td', { html: formatMoney(netWorth(s)) })),
        h('tr', {}, h('td', {}, 'Banka borçları'), h('td', {}, formatMoney(0))), h('tr', { class: 'tot' }, h('td', {}, 'Özkaynak (net varlık)'), h('td', { html: signed(netWorth(s)) })));
      body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Bilanço özeti'), t), h('p', { class: 'mute', style: 'font-size:12px' }, 'Arsalar güncel piyasa değeriyle gösterilir. Devam eden projeler, makine ve krediler ilgili sistemler eklendikçe bu tabloya girer. Kasa her zaman defter toplamına eşittir.'));
    }
    return h('div', { style: 'display:flex;flex-direction:column' }, seg, body);
  };

  // ---------------- Piyasa ----------------
  const market = (): HTMLElement => {
    const s = app.store.state, m = s.macro, H = s.macroHistory;
    const mc = (label: string, val: string, key: 'policyRate' | 'inflation' | 'confidence' | 'materialIndex', color: string) =>
      h('div', { class: 'card mc' }, h('div', { class: 'lbl-s' }, label), h('b', {}, val), h('div', { html: H.length >= 2 ? sparkline(H.slice(-24).map((p) => p[key]), color) : '<div class="mute" style="font-size:11px;margin-top:6px">Ay sonlarında birikir</div>' }));
    return h('div', { style: 'display:flex;flex-direction:column;gap:12px' },
      h('div', { class: 'card', style: 'display:flex;gap:12px;align-items:center;flex-wrap:wrap' }, h('span', { class: `regime ${m.regime}` }, REGIMES[m.regime].label), h('span', { style: 'flex:1;min-width:200px' }, REGIMES[m.regime].blurb), h('span', { class: 'mute', style: 'font-size:12px' }, `${Math.max(0, Math.round((s.clock.day - m.regimeSince) / 30))} aydır`)),
      h('div', { class: 'mgrid' }, mc('Politika faizi (yıllık)', `%${m.policyRate.toFixed(1)}`, 'policyRate', '#F5B700'), mc('Enflasyon (yıllık)', `%${m.inflation.toFixed(1)}`, 'inflation', '#FF7A1A'), mc('Piyasa güveni', m.confidence.toFixed(0), 'confidence', '#2ECC8F'), mc('Malzeme endeksi', m.materialIndex.toFixed(0), 'materialIndex', '#3E7BFA')),
      h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Haber bandı'), ...(s.news.length ? s.news.slice(0, 12).map((n) => h('div', { class: 'news' }, h('small', {}, formatDate(n.day)), h('span', { class: `dot ${n.tone}` }), h('span', {}, n.text))) : [h('div', { class: 'empty' }, 'Henüz haber yok. Piyasa değişimleri burada duyurulur.')])));
  };

  const drawView = () => {
    const keep = view.scrollTop; view.innerHTML = '';
    view.append(tab === 'sirket' ? overview() : tab === 'harita' ? mapView(app, drawView) : tab === 'projeler' ? projectsView(app, drawView) : tab === 'operasyon' ? opsView(app, drawView) : tab === 'finans' ? finance() : market());
    view.scrollTop = keep;
  };

  // Olaylar: gün akışı yalnızca HUD'u günceller; ay/komut olayları sekmeyi yeniler
  const REDRAW = new Set(['MONTH', 'STAFF_HIRED', 'STAFF_FIRED', 'MACRO_NEWS', 'TAX_PAID', 'YEAR', 'CASH_NEGATIVE', 'LAND_BOUGHT', 'LAND_SOLD', 'LAND_LISTED', 'LAND_UNLISTED', 'SURVEY_DONE', 'PROJECT_CREATED', 'PROJECT_CANCELLED', 'PROJECT_STARTED', 'STAGE_COMPLETED', 'PROJECT_COMPLETED', 'PROJECT_SOLD', 'CONSTRUCTION_STALLED', 'CONSTRUCTION_RESUMED', 'SOIL_REVEALED', 'ORDER_PLACED', 'MACHINE_BOUGHT', 'MACHINE_SOLD', 'MACHINE_BROKEN', 'STAFF_ASSIGNED', 'POLICY_CHANGED', 'ACCIDENT', 'SUPPLIER_DELAY', 'UNIT_SOLD', 'KAPORA', 'KAPORA_CANCELLED', 'SALES_POLICY', 'BULK_SOLD', 'DELIVERED', 'COMPLAINT', 'DEFAULT', 'RECEIVABLE_MISSED']);
  const unsub = app.store.subscribe((evs) => {
    if (!root.isConnected) { unsub(); return; }
    let redraw = false;
    for (const e of evs) {
      if (REDRAW.has(e.type)) redraw = true;
      if (e.type === 'MONTH') void app.saves.autosave(app.store.state).catch(() => {});
      if (e.type === 'MACRO_NEWS') { const d = e.data as { text: string; tone: string }; app.audio.sfx(d.tone === 'bad' ? 'error' : 'confirm'); toast(d.text, 5000); }
      if (e.type === 'SURVEY_DONE') { app.audio.sfx('confirm'); toast((e.data!.kind === 'soil' ? 'Zemin etüdü tamamlandı.' : 'Piyasa araştırması tamamlandı.'), 4000); }
      if (e.type === 'LAND_SOLD') { app.audio.sfx('confirm'); if (!e.data!.quick) toast(`Arsanız satıldı: ${formatMoney(e.data!.price as number)}`, 4500); }
      if (e.type === 'CONSTRUCTION_STALLED') { app.audio.sfx('error'); toast('Bir şantiyede nakit bitti: inşaat durdu!', 5000); }
      if (e.type === 'UNIT_SOLD') { app.audio.sfx('confirm'); toast(`Daire satıldı: ${formatMoney(e.data!.price as number)}`, 3200); }
      if (e.type === 'KAPORA') toast('Bir müşteri kapora bıraktı.', 2800);
      if (e.type === 'DEFAULT') { app.audio.sfx('error'); toast(`Bir alıcı taksitleri ödemedi: daire stoğa döndü (kayıp ${formatMoney(e.data!.lost as number)}).`, 5000); }
      if (e.type === 'DELIVERED') toast(`Daireler teslim edildi · müşteri memnuniyeti ${e.data!.avgSat}.`, 4500);
      if (e.type === 'COMPLAINT') toast(`Garanti talebi: ${formatMoney(e.data!.cost as number)}`, 3500);
      if (e.type === 'ACCIDENT') { app.audio.sfx('error'); app.haptic('heavy'); toast(`İş kazası! Şantiye ${e.data!.days} gün durdu, tazminat ${formatMoney(e.data!.cost as number)}.`, 5500); }
      if (e.type === 'MACHINE_BROKEN') toast(`Bir makine arızalandı (${e.data!.days} gün).`, 4000);
      if (e.type === 'SUPPLIER_DELAY') toast(`${e.data!.supplier}: teslimat ${e.data!.days} gün gecikecek.`, 4500);
      if (e.type === 'CONSTRUCTION_RESUMED') toast('Nakit sağlandı: inşaat devam ediyor.');
      if (e.type === 'SOIL_REVEALED') { app.audio.sfx((e.data!.extra as number) > 0 ? 'error' : 'confirm'); toast((e.data!.extra as number) === 0 ? 'Hafriyat: zemin beklendiği gibi çıktı.' : `Hafriyatta zemin ortaya çıktı: ${(e.data!.extra as number) > 0 ? 'ek maliyet +' : 'tasarruf '}${formatMoney(Math.abs(e.data!.extra as number))}`, 5000); }
      if (e.type === 'PROJECT_COMPLETED') { app.audio.sfx('stamp'); toast('Bir proje tamamlandı! Projeler sekmesinden şantiyeyi açın.', 5000); }
      if (e.type === 'PROJECT_STARTED') toast('İnşaat başladı.');
      if (e.type === 'PROJECT_SOLD') { app.audio.sfx('confirm'); toast(`Bina satıldı: ${formatMoney(e.data!.price as number)}`, 4500); }
      if (e.type === 'YEAR') toast(`Yeni yıl: personel maaşlarına %${((e.data!.raise as number) * 100).toFixed(0)} zam yapıldı.`, 4500);
      if (e.type === 'CASH_NEGATIVE') { app.audio.sfx('error'); toast('Kasa eksiye düştü! Oyun duraklatıldı.', 5000); }
    }
    drawHud(); if (redraw) drawView();
  });
  buildHud(); drawHud(); drawTabs(); drawView();
  return root;
}
