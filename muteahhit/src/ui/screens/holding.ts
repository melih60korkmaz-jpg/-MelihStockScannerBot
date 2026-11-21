import { formatDate } from '../../core/calendar';
import { TL } from '../../core/money';
import type { Strategy, Venture } from '../../core/types';
import { cityData } from '../../data';
import { netWorth } from '../../sim/finance';
import { DIV_INFO, divisionPL, type DivKey } from '../../sim/holding';
import { INFRA_MIN_LEVEL, activeInfra, infraCapacity, infraKind } from '../../sim/infra';
import { aliveRivals } from '../../sim/rivals';
import { ACQ_MIN_LEVEL, IPO_MIN_LEVEL, IPO_MIN_NW, SHARES, acquisitionPrice, buybackCost, fairPrice, ipoPrice, marketCap, secondaryProceeds } from '../../sim/stock';
import { ENERGY_TIERS, GM_COST_TL, VENTURE_INFO, energyCapex, ventureSalePrice, ventureValue } from '../../sim/ventures';
import { C, ring } from '../art';
import { lineChart } from '../charts';
import { fmt, nf } from '../components';
import { askConfirm, h, press, toast } from '../dom';
import type { App } from '../app';

type Sub = 'ozet' | 'isletme' | 'enerji' | 'altyapi' | 'borsa';
const mem: { sub: Sub } = { sub: 'ozet' };
/** Dışarıdan (proje kartı vb.) alt sekme seçmek için. */
export const setHoldingSub = (s: string) => { if (['ozet', 'isletme', 'enerji', 'altyapi', 'borsa'].includes(s)) mem.sub = s as Sub; };
const STRAT: [Strategy, string, string][] = [['buyume', 'Büyüme', 'Gelir +%6, gider +%10'], ['dengeli', 'Dengeli', 'Değişiklik yok'], ['temkinli', 'Temkinli', 'Gelir −%4, gider −%10']];
export const HOLDING_MIN_LEVEL = 4;
const signed = (m: number) => `<span class="${m > 0 ? 'pos' : m < 0 ? 'neg' : ''}">${m > 0 ? '+' : ''}${fmt(m)}</span>`;

/** Holding sekmesi: iş kolları (otel/AVM, enerji), altyapı işleri, holding yönetimi ve borsa. */
export function holdingView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!;
  if (c.level < HOLDING_MIN_LEVEL) return h('div', { class: 'card emptyfx' }, h('b', {}, '🏛️ Holding'), h('span', { class: 'mute' }, `Otel, AVM, enerji ve altyapı işleri seviye ${HOLDING_MIN_LEVEL}'te (Bölge Firması) açılır. Şu an seviye ${c.level}.`));
  const seg = h('div', { class: 'seg', role: 'tablist', style: 'margin-bottom:10px;align-self:flex-start;max-width:100%;overflow-x:auto' });
  for (const [id, l] of [['ozet', 'Özet'], ['isletme', 'Otel & AVM'], ['enerji', 'Enerji'], ['altyapi', 'Altyapı'], ['borsa', 'Borsa & Satın alma']] as [Sub, string][]) seg.append(h('button', { class: mem.sub === id ? 'on' : '', role: 'tab', onclick: () => { press(app); mem.sub = id; refresh(); } }, l));
  const body = mem.sub === 'ozet' ? overview(app, refresh) : mem.sub === 'isletme' ? hotels(app, refresh) : mem.sub === 'enerji' ? energy(app, refresh) : mem.sub === 'altyapi' ? infra(app, refresh) : market(app, refresh);
  return h('div', { style: 'display:flex;flex-direction:column' }, seg, body);
}
const run = (app: App, cmd: string, params: object, ok: string, refresh: () => void, sfx: 'confirm' | 'stamp' | 'coin' = 'confirm') => { const r = app.store.run(cmd as never, params as never); if (r.ok) { app.audio.sfx(sfx); toast(ok); } else { app.audio.sfx('error'); toast(r.error); } refresh(); };
const lock = (txt: string) => h('div', { class: 'card', style: 'border-color:var(--accent-bd)' }, h('b', {}, '🔒 Kilitli'), h('div', { class: 'mute', style: 'font-size:13px;margin-top:2px' }, txt));

// ---------------- Özet ----------------
function overview(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!, pl = divisionPL(s, 3), tot = Object.values(pl).reduce((a, d) => a + d.profit, 0);
  const keys: DivKey[] = ['insaat', 'isletme', 'enerji', 'altyapi', 'bagli', 'merkez'];
  const max = Math.max(1, ...keys.map((k) => Math.abs(pl[k].profit)));
  const cards = keys.map((k) => {
    const d = pl[k], info = DIV_INFO[k], count = k === 'isletme' ? s.ventures.filter((v) => v.kind === 'otel' || v.kind === 'avm').length : k === 'enerji' ? s.ventures.filter((v) => v.kind === 'gunes' || v.kind === 'ruzgar').length : k === 'bagli' ? s.ventures.filter((v) => v.kind === 'bagli').length : k === 'altyapi' ? activeInfra(s).length : 0;
    return h('div', { class: `card divc ${d.profit > 0 ? 'good' : d.profit < 0 ? 'bad' : ''}` }, h('div', { class: 'lbl-s' }, `${info.ico} ${info.label}${count ? ` · ${count}` : ''}`),
      h('b', { class: 'fkv', html: signed(d.profit) }), h('small', { class: 'mute' }, `Gelir ${fmt(d.revenue)} · Gider ${fmt(d.cost)}`),
      h('div', { class: 'meter' }, h('i', { style: `width:${Math.round((Math.abs(d.profit) / max) * 100)}%;background:${d.profit >= 0 ? 'var(--ok)' : 'var(--bad)'}` })));
  });
  const mgmt = (div: 'isletme' | 'enerji' | 'altyapi', label: string) => {
    const unlocked = c.level >= 6;
    return h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, label),
      unlocked ? h('div', {}, h('div', { class: 'seg', style: 'margin-bottom:6px' }, ...STRAT.map(([id, l, d]) => h('button', { class: s.holding.strategy[div] === id ? 'on' : '', title: d, onclick: () => run(app, 'SetStrategy', { division: div, strategy: id }, `${label}: ${l} stratejisi`, refresh) }, l))),
        h('small', { class: 'mute' }, STRAT.find((x) => x[0] === s.holding.strategy[div])![2]),
        h('div', { class: 'row', style: 'min-height:44px;margin-top:6px' }, h('div', { class: 'lbl' }, 'Genel müdür', h('small', {}, `Gelir +%5, gider −%3 · ${fmt(Math.round(TL(GM_COST_TL) * s.costIndex))}/ay`)),
          h('button', { class: 'tog', role: 'switch', 'aria-label': `${label} genel müdürü`, 'aria-checked': String(s.holding.gm[div]), onclick: () => run(app, 'ToggleGM', { division: div }, 'Genel müdür ayarı değişti', refresh) }))) : h('div', { class: 'mute', style: 'font-size:12px' }, 'Strateji ve genel müdür seviye 6\'da açılır.'));
  };
  return h('div', {}, h('div', { class: 'card', style: 'margin-bottom:10px' }, h('div', { class: 'lbl-s' }, 'Holding · son 3 ay'), h('div', { style: 'display:flex;gap:16px;flex-wrap:wrap;align-items:baseline' }, h('b', { class: 'fkv', html: signed(tot) }), h('small', { class: 'mute' }, `Net varlık ${fmt(netWorth(s))} · ${s.ventures.length} iş kolu · ${activeInfra(s).length} altyapı işi`))),
    h('div', { class: 'divgrid' }, ...cards), h('div', { class: 'lbl-s', style: 'margin-top:12px' }, 'Bölüm yönetimi'), h('div', { class: 'cols' }, mgmt('isletme', 'Gayrimenkul işletmeleri'), mgmt('enerji', 'Enerji'), mgmt('altyapi', 'Altyapı işleri')));
}

// ---------------- Otel & AVM ----------------
function ventureCard(app: App, v: Venture, refresh: () => void): HTMLElement {
  const s = app.store.state, info = VENTURE_INFO[v.kind], ready = s.clock.day >= v.readyDay, profit = v.last.revenue - v.last.cost, val = ventureValue(s, v);
  const occ = v.kind === 'otel' || v.kind === 'avm' ? ring(v.last.occ, v.last.occ > 0.6 ? C.ok : v.last.occ > 0.4 ? C.warn : C.bad, `%${Math.round(v.last.occ * 100)}`, v.kind === 'otel' ? 'doluluk' : 'kiracı', 64) : v.kind === 'bagli' ? '' : ring(Math.min(1, v.last.occ / 1.5), v.brokenUntil ? C.bad : C.acc2, v.brokenUntil ? 'ARIZA' : `${nf(v.last.occ, 1)}×`, 'üretim', 64);
  const size = v.kind === 'otel' ? `${v.size} oda` : v.kind === 'avm' ? `${nf(v.size)} m² kiralanabilir` : v.kind === 'bagli' ? '' : `${v.size} MW`;
  return h('div', { class: 'card vcard' }, h('div', { class: 'vico' }, info.ico), h('div', { class: 'vbody' }, h('div', { style: 'display:flex;gap:8px;align-items:baseline;flex-wrap:wrap' }, h('b', {}, v.name), h('span', { class: 'chip' }, info.label), size ? h('span', { class: 'chip' }, size) : null, h('span', { class: 'chip' }, cityData(v.city)?.label ?? v.city)),
    ready ? h('div', { class: 'mute', style: 'font-size:12px;margin-top:2px', html: `Son ay: gelir ${fmt(v.last.revenue)} · gider ${fmt(v.last.cost)} · net ${signed(profit)}` }) : h('div', { class: 'mute', style: 'font-size:12px;margin-top:2px' }, `Yapım sürüyor · açılış ${formatDate(v.readyDay)}`),
    h('div', { class: 'mute', style: 'font-size:12px' }, `Yatırım ${fmt(v.capex)} · değer ${fmt(val)} · toplam net ${fmt(v.total.revenue - v.total.cost)}`)),
    h('div', { html: occ }), h('button', { class: 'btn danger', style: 'min-height:36px;font-size:12px', onclick: async () => { if (await askConfirm(`${v.name} ${fmt(ventureSalePrice(s, v))} bedelle satılsın mı? (değerinin %92'si)`)) run(app, 'SellVenture', { id: v.id }, `${v.name} satıldı`, refresh, 'coin'); } }, 'Sat'));
}
function hotels(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, list = s.ventures.filter((v) => v.kind === 'otel' || v.kind === 'avm');
  const ready = s.projects.filter((p) => (p.type === 'otel' || p.type === 'avm') && p.status === 'tamamlandi' && p.operatedBy === undefined);
  const waiting = s.projects.filter((p) => (p.type === 'otel' || p.type === 'avm') && p.status === 'insaat');
  return h('div', {}, h('div', { class: 'card', style: 'margin-bottom:10px' }, h('div', { class: 'lbl-s' }, '🏨 Otel ve AVM işletmeciliği'), h('div', { class: 'mute', style: 'font-size:13px' }, 'Projeler sekmesinden Otel ya da AVM tipinde proje başlat (seviye 4). Bina bitince daireleri satmak yerine işletmeye al: her ay doluluğa, mevsime ve ekonomiye bağlı gelir, sabit giderler. Yıllık net getiri yaklaşık %12–14\'tür; sahil otelleri yazın çok kazanır, kışın düşer.')),
    ...(ready.length ? [h('div', { class: 'lbl-s' }, 'İşletmeye hazır'), ...ready.map((p) => h('div', { class: 'card vcard' }, h('div', { class: 'vico' }, VENTURE_INFO[p.type as 'otel'].ico), h('div', { class: 'vbody' }, h('b', {}, p.name), h('div', { class: 'mute', style: 'font-size:12px' }, `${cityData(p.cityId)?.label} · maliyet ${fmt(p.result?.cost ?? p.budget.total)}`)),
      h('button', { class: 'btn gold', style: 'min-height:40px', onclick: async () => { if (await askConfirm(`${p.name} işletmeye alınsın mı? (Birimler satışa çıkmaz; geri dönüş için ancak işletmeyi satabilirsiniz.)`)) run(app, 'OperateProject', { projectId: p.id }, `${p.name} işletmeye alındı`, refresh, 'stamp'); } }, 'İşletmeye al')))] : []),
    ...(waiting.length ? [h('div', { class: 'mute', style: 'font-size:12px;margin:6px 0' }, `Yapımı süren: ${waiting.map((p) => p.name).join(', ')}`)] : []),
    h('div', { class: 'lbl-s', style: 'margin-top:8px' }, `İşletmeler (${list.length})`), ...(list.length ? list.map((v) => ventureCard(app, v, refresh)) : [h('div', { class: 'card empty' }, 'Henüz işletmeniz yok.')]));
}

// ---------------- Enerji ----------------
function energy(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!; if (c.level < 5) return lock('Enerji yatırımları seviye 5\'te (Şehir Markası) açılır.');
  let kind: 'gunes' | 'ruzgar' = 'gunes', city = s.openCities[0] ?? 'ankara';
  const list = s.ventures.filter((v) => v.kind === 'gunes' || v.kind === 'ruzgar');
  const form = h('div', { class: 'card', style: 'margin-bottom:10px' });
  const draw = () => {
    form.innerHTML = ''; const info = VENTURE_INFO[kind];
    const kseg = h('div', { class: 'seg', style: 'margin-bottom:8px' }, ...(['gunes', 'ruzgar'] as const).map((k) => h('button', { class: kind === k ? 'on' : '', onclick: () => { kind = k; draw(); } }, `${VENTURE_INFO[k].ico} ${VENTURE_INFO[k].label}`)));
    const sel = h('select', { class: 'input', 'aria-label': 'Şehir', style: 'max-width:200px', onchange: () => { city = (sel as HTMLSelectElement).value; } }, ...s.openCities.map((id) => h('option', { value: id, ...(id === city ? { selected: true } : {}) }, cityData(id)?.label ?? id))) as HTMLSelectElement;
    const tiers = h('div', { class: 'tiers' }, ...ENERGY_TIERS[kind].map(([mw], i) => { const cap = energyCapex(s, kind, i), net = cap * info.rev * (1 - info.opex);
      return h('button', { class: 'btn', style: 'flex-direction:column;align-items:flex-start;height:auto;padding:8px 10px;text-align:left', disabled: c.cash < cap, onclick: async () => { if (await askConfirm(`${mw} MW ${info.label} için ${fmt(cap)} yatırım yapılsın mı? ${kind === 'gunes' ? 'Yaklaşık 2 ayda' : 'Yaklaşık 4 ayda'} devreye girer.`)) run(app, 'BuildVenture', { kind, city, tier: i }, `${mw} MW ${info.label} yapımına başlandı`, refresh, 'stamp'); } }, h('b', {}, `${mw} MW`), h('small', {}, `Yatırım ${fmt(cap)}`), h('small', { class: 'mute' }, `Yıllık net ≈ ${fmt(Math.round(net))}`)); }));
    form.append(h('div', { class: 'lbl-s' }, '⚡ Yeni santral'), kseg, h('div', { class: 'row', style: 'min-height:44px' }, h('div', { class: 'lbl' }, 'Şehir', h('small', {}, kind === 'gunes' ? 'Güneşli iller (Antalya, Adana, Konya) daha çok üretir.' : 'Rüzgârlı iller (İzmir, İstanbul, Kocaeli) daha çok üretir.')), sel), tiers,
      h('div', { class: 'mute', style: 'font-size:12px;margin-top:6px' }, kind === 'gunes' ? 'Yaz ayları güçlü, kış zayıf. Arıza ihtimali düşük.' : 'Kış ayları güçlü, yaz zayıf. Arıza ihtimali daha yüksek ve onarımı pahalı.'));
  };
  draw();
  return h('div', {}, form, h('div', { class: 'lbl-s' }, `Santraller (${list.length})`), ...(list.length ? list.map((v) => ventureCard(app, v, refresh)) : [h('div', { class: 'card empty' }, 'Henüz santraliniz yok.')]));
}

// ---------------- Altyapı ----------------
function infra(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!; if (c.level < INFRA_MIN_LEVEL) return lock(`Altyapı ihaleleri seviye ${INFRA_MIN_LEVEL}'te (Şehir Markası) açılır.`);
  const open = s.tenders.filter((t) => t.infra && t.status === 'acik').length, jobs = s.infra.filter((j) => j.status === 'devam'), done = s.infra.filter((j) => j.status === 'bitti');
  return h('div', {}, h('div', { class: 'card', style: 'margin-bottom:10px' }, h('div', { class: 'lbl-s' }, '🛣️ Kamu işleri ve altyapı'), h('div', { class: 'mute', style: 'font-size:13px' }, 'Yol, köprü, tünel, baraj ve şebeke ihaleleri İhale sekmesinde açılır. Kazanırsan iş burada yürür: ilerleme makine parkına ve saha ekibine bağlıdır, her %10 ilerleme bir hakediş doğurur (45 gün sonra tahsil).'),
    h('button', { class: 'btn', style: 'margin-top:8px;min-height:38px', onclick: () => { press(app); app.openTab?.('ihale'); } }, `Altyapı ihalelerine git (${open} açık) ▸`)),
    h('div', { class: 'lbl-s' }, `Devam eden işler (${jobs.length})`),
    ...(jobs.length ? jobs.map((j) => { const k = infraKind(j.kind)!, cap = infraCapacity(s, j), late = s.clock.day - j.deadline, pend = j.pending.reduce((a, x) => a + x.amount, 0);
      return h('div', { class: 'card', style: 'margin-bottom:8px' }, h('div', { style: 'display:flex;gap:8px;align-items:baseline;flex-wrap:wrap' }, h('span', { style: 'font-size:22px' }, k.ico), h('b', {}, j.name), j.stalled ? h('span', { class: 'chip bad' }, j.stalled === 'nakit' ? 'Nakit yok' : 'Kapasite yetersiz') : h('span', { class: 'chip good' }, 'İlerliyor')),
        h('div', { class: 'meter', style: 'margin:6px 0' }, h('i', { style: `width:${Math.round(j.progress * 100)}%;background:var(--accent2)` })),
        h('div', { class: 'kpis' }, h('div', { class: 'kpi', html: `<small>İlerleme</small><b>%${Math.round(j.progress * 100)}</b>` }), h('div', { class: 'kpi', html: `<small>Sözleşme</small><b>${fmt(j.price)}</b>` }), h('div', { class: 'kpi', html: `<small>Tahsil edilecek</small><b>${fmt(pend)}</b>` }), h('div', { class: 'kpi', html: `<small>Teslim</small><b class="${late > 0 ? 'neg' : ''}">${formatDate(j.deadline)}</b>` })),
        h('div', { class: 'mute', style: 'font-size:12px;margin-top:6px' }, `Makine kapasitesi %${Math.round(cap.machine * 100)} · Ekip kapasitesi %${Math.round(cap.crew * 100)} · hız çarpanı ${nf(cap.cap, 2)}×${cap.cap < 0.6 ? ' — makine/ekip ekleyin (Operasyon)' : ''}`));
    }) : [h('div', { class: 'card empty' }, 'Devam eden altyapı işi yok.')]),
    ...(done.length ? [h('div', { class: 'lbl-s', style: 'margin-top:10px' }, `Biten işler (${done.length})`), ...done.slice(-4).reverse().map((j) => h('div', { class: 'card', style: 'padding:8px 12px;margin-bottom:6px' }, h('b', {}, `${infraKind(j.kind)!.ico} ${j.name}`), h('div', { class: 'mute', style: 'font-size:12px', html: `Kâr ${signed(j.result?.profit ?? 0)} · ${j.result!.late > 0 ? `${j.result!.late} gün gecikme` : 'zamanında'}` })))] : []));
}

// ---------------- Borsa & satın alma ----------------
function market(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!, e = s.equity;
  const ipoBox = () => {
    if (e?.listed) return null; let pct = 15;
    const reqs: [string, boolean][] = [[`Şirket seviyesi ${IPO_MIN_LEVEL} (şu an ${c.level})`, c.level >= IPO_MIN_LEVEL], [`Net varlık ≥ ${fmt(IPO_MIN_NW)} (şu an ${fmt(netWorth(s))})`, netWorth(s) >= IPO_MIN_NW], [`İtibar ≥ 55 (şu an ${Math.round(c.reputation)})`, c.reputation >= 55]];
    const lab = h('b', {}), info = h('small', { class: 'mute' }), rng = h('input', { type: 'range', min: 10, max: 25, step: 5, value: pct, 'aria-label': 'Halka arz oranı', style: 'flex:1' }) as HTMLInputElement;
    const upd = () => { pct = Number(rng.value); lab.textContent = `%${pct}`; info.textContent = `Fiyat ≈ ${fmt(ipoPrice(s))}/hisse · beklenen kaynak ≈ ${fmt(Math.round(ipoPrice(s) * SHARES * pct / 100 * 0.97))}`; }; rng.oninput = upd; upd();
    return h('div', { class: 'card', style: 'margin-bottom:10px' }, h('div', { class: 'lbl-s' }, '📊 Halka arz'), ...reqs.map(([t, ok]) => h('div', { class: 'alert' }, h('span', { class: `dot ${ok ? 'ok' : 'bad'}` }), h('span', {}, t))),
      h('div', { style: 'display:flex;gap:10px;align-items:center;margin:8px 0' }, rng, lab), info,
      h('button', { class: 'btn gold', style: 'margin-top:8px;min-height:40px', disabled: !reqs.every((r) => r[1]), onclick: async () => { if (await askConfirm(`Şirketin %${pct}'i halka arz edilsin mi? Sahipliğiniz %${c.ownership - pct} olur.`)) run(app, 'GoPublic', { pct }, 'Şirket halka arz edildi!', refresh, 'stamp'); } }, 'Halka arz et'));
  };
  const trade = () => {
    if (!e?.listed) return null; let sec = 5, buy = 3; const hist = e.hist.map((v, i) => ({ label: `${i + 1}`, value: v }));
    const secLab = h('small', { class: 'mute' }), buyLab = h('small', { class: 'mute' });
    const secR = h('input', { type: 'range', min: 3, max: 15, step: 1, value: sec, 'aria-label': 'İkincil satış oranı', style: 'flex:1' }) as HTMLInputElement, buyR = h('input', { type: 'range', min: 1, max: 10, step: 1, value: buy, 'aria-label': 'Geri alım oranı', style: 'flex:1' }) as HTMLInputElement;
    const u1 = () => { sec = Number(secR.value); secLab.textContent = `%${sec} sat → ${fmt(secondaryProceeds(s, sec))}`; }, u2 = () => { buy = Number(buyR.value); buyLab.textContent = `%${buy} geri al → ${fmt(buybackCost(s, buy))}`; }; secR.oninput = u1; buyR.oninput = u2; u1(); u2();
    return h('div', { class: 'card', style: 'margin-bottom:10px' }, h('div', { class: 'lbl-s' }, '📈 Borsa'), h('div', { class: 'kpis' }, h('div', { class: 'kpi', html: `<small>Hisse fiyatı</small><b>${fmt(e.price)}</b>` }), h('div', { class: 'kpi', html: `<small>Piyasa değeri</small><b>${fmt(marketCap(s))}</b>` }), h('div', { class: 'kpi', html: `<small>Sahipliğiniz</small><b>%${c.ownership}</b>` }), h('div', { class: 'kpi', html: `<small>Halka arz fiyatı</small><b>${fmt(e.ipoPrice)}</b>` })),
      e.hist.length >= 2 ? lineChart(hist, (n) => fmt(n), 130) : h('div', { class: 'mute', style: 'font-size:12px' }, 'Fiyat grafiği ay sonlarında oluşur.'), h('div', { class: 'mute', style: 'font-size:12px;margin:4px 0' }, `Adil değer ≈ ${fmt(fairPrice(s))}/hisse. Fiyat adil değere yaklaşır; itibar, güven ve büyüme etkiler.`),
      h('div', { class: 'cols' }, h('div', {}, h('div', { style: 'display:flex;gap:8px;align-items:center' }, secR, secLab), h('button', { class: 'btn', style: 'min-height:38px;margin-top:6px', onclick: async () => { if (await askConfirm(`%${sec} ikincil satış yapılsın mı? Fiyat biraz düşer.`)) run(app, 'SecondaryOffering', { pct: sec }, 'İkincil satış tamamlandı', refresh, 'coin'); } }, 'Hisse sat')),
        h('div', {}, h('div', { style: 'display:flex;gap:8px;align-items:center' }, buyR, buyLab), h('button', { class: 'btn', style: 'min-height:38px;margin-top:6px', onclick: async () => { if (await askConfirm(`%${buy} hisse geri alınsın mı?`)) run(app, 'Buyback', { pct: buy }, 'Hisse geri alındı', refresh); } }, 'Geri al'))));
  };
  const rivals = s.rivals.filter((r) => r.last !== 'satin_alindi').slice().sort((a, b) => Number(a.failed) - Number(b.failed) || b.rep - a.rep).slice(0, 8);
  const acq = h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, '🏛️ Rakip şirket satın alma'), c.level < ACQ_MIN_LEVEL ? h('div', { class: 'mute', style: 'font-size:13px' }, `Şirket satın almak seviye ${ACQ_MIN_LEVEL}'da (Çok Şehirli Firma) açılır. Satın alınan şirket bağlı şirket olarak aylık gelir getirir ve rakip azalır; iflas etmiş şirketler çok ucuzdur.`) : h('div', { class: 'mute', style: 'font-size:12px;margin-bottom:6px' }, 'Satın alınan şirket bağlı şirket olur: aylık gelir getirir, rakip azalır, itibar artar. İflas etmiş şirketler ucuzdur.'),
    ...(c.level >= ACQ_MIN_LEVEL ? rivals.map((r) => { const price = acquisitionPrice(s, r.id);
      return h('div', { class: 'row', style: 'min-height:48px' }, h('div', { class: 'lbl' }, `${r.name}${r.failed ? ' (iflas)' : ''}`, h('small', {}, `${cityData(r.home)?.label ?? r.home} · itibar ${Math.round(r.rep)} · teknik ${Math.round(r.tech)} · ${r.projects} proje`)), h('button', { class: 'btn', style: 'min-height:36px;font-size:12px', disabled: c.cash < price, onclick: async () => { if (await askConfirm(`${r.name} ${fmt(price)} bedelle satın alınsın mı?`)) run(app, 'AcquireRival', { rivalId: r.id }, `${r.name} satın alındı`, refresh, 'stamp'); } }, fmt(price))); }) : []));
  void aliveRivals;
  return h('div', {}, ipoBox(), trade(), acq);
}
