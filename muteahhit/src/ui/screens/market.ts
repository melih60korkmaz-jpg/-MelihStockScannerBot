import { formatDate } from '../../core/calendar';
import { MATERIALS, cityData } from '../../data';
import { REGIMES } from '../../sim/macro';
import { STYLE_LABEL, aliveRivals } from '../../sim/rivals';
import { hbars, lineChart, sparkline } from '../charts';
import { C, EMOJI, ring } from '../art';
import { h, press } from '../dom';
import type { App } from '../app';

const mem = { mat: 'demir' };
const newsEmoji = (text: string, tone: string) => /faiz|merkez bankas/i.test(text) ? '🏦' : /kriz|iflas|çöküş|daral/i.test(text) ? '⚠️' : /fiyat|malzeme|demir|beton|çimento/i.test(text) ? '🧱' : /arsa|proje|şirket|firma/i.test(text) ? '🏢' : tone === 'bad' ? '🚨' : tone === 'ok' ? '📈' : tone === 'warn' ? '⚠️' : '📰';

/** Piyasa: makro halkalar + sparkline'lar, konut göstergeleri (il bazlı), malzeme fiyat geçmişi, rakip karşılaştırması, haber kartları. Tümü oyun durumundan. */
export function marketView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, m = s.macro, H = s.macroHistory, c = s.company!;
  // Önceki ay sonuna göre gerçek değişim: faiz/enflasyon/malzeme artışı kötü (maliyet), güven artışı iyi
  const delta = (key: 'policyRate' | 'inflation' | 'confidence' | 'materialIndex') => {
    const prev = H.length >= 2 ? H[H.length - 2]![key] : null, cur = m[key]; if (prev === null || Math.abs(cur - prev) < 0.05) return h('span', {});
    const up = cur > prev, good = key === 'confidence' ? up : !up; return h('span', { class: `dlt ${good ? 'good' : 'bad'}` }, `${up ? '▲' : '▼'} ${Math.abs(cur - prev).toFixed(key === 'materialIndex' || key === 'confidence' ? 0 : 1)}`);
  };
  const mc = (label: string, val: string, key: 'policyRate' | 'inflation' | 'confidence' | 'materialIndex', color: string) =>
    h('div', { class: 'card mc' }, h('div', { class: 'lbl-s' }, label), h('div', { class: 'mcrow' }, h('b', {}, val), delta(key)), h('div', { html: H.length >= 2 ? sparkline(H.slice(-24).map((p) => p[key]), color) : '<div class="mute" style="font-size:11px;margin-top:6px">Ay sonlarında birikir</div>' }));
  const regime = h('div', { class: 'card mkt-hero' },
    h('div', { style: 'flex:1;min-width:190px' }, h('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:6px' }, h('span', { class: `regime ${m.regime}` }, REGIMES[m.regime].label), h('span', { class: 'mute', style: 'font-size:12px' }, `${Math.max(0, Math.round((s.clock.day - m.regimeSince) / 30))} aydır`)), h('span', {}, REGIMES[m.regime].blurb)),
    h('div', { class: 'rings' }, h('div', { html: ring(m.policyRate / 60, C.acc2, `%${m.policyRate.toFixed(1)}`, 'faiz') }), h('div', { html: ring(m.inflation / 80, C.warn, `%${m.inflation.toFixed(1)}`, 'enflasyon') }), h('div', { html: ring(m.confidence / 100, m.confidence >= 55 ? C.ok : m.confidence >= 40 ? C.warn : C.bad, m.confidence.toFixed(0), 'güven') })));
  const metrics = h('div', { class: 'mgrid' }, mc('Politika faizi (yıllık)', `%${m.policyRate.toFixed(1)}`, 'policyRate', '#C64252'), mc('Enflasyon (yıllık)', `%${m.inflation.toFixed(1)}`, 'inflation', '#B9B5B7'), mc('Piyasa güveni', m.confidence.toFixed(0), 'confidence', '#3FBF8A'), mc('Malzeme endeksi', m.materialIndex.toFixed(0), 'materialIndex', '#8E919B'));

  // Konut göstergeleri: açık illerin konut ve arsa endeksi + rakip arzı (gerçek cityMarket)
  const cities = s.openCities.map((id) => ({ id, cm: s.cityMarket[id] })).filter((x) => x.cm);
  const housing = h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, `${EMOJI.piyasa} Konut piyasası (açık iller, başlangıç = 100)`), hbars(cities.map((x) => ({ label: cityData(x.id)?.label ?? x.id, value: Math.round(x.cm!.housingIndex * 100) })), (n) => String(n)),
    h('div', { class: 'mute', style: 'font-size:12px;margin-top:6px' }, cities.map((x) => `${cityData(x.id)?.label}: arsa ${Math.round(x.cm!.landIndex * 100)} · rakip arzı ${(x.cm!.supply ?? 0).toFixed(1)}`).join('  ·  ')));

  // Malzeme fiyat geçmişi
  const hist = s.matHist?.[mem.mat] ?? [], chips = h('div', { class: 'opts' }, ...MATERIALS.map((x) => h('button', { class: mem.mat === x.id ? 'on' : '', onclick: () => { press(app); mem.mat = x.id; refresh(); } }, x.label)));
  const ch = hist.length >= 2 ? (hist.at(-1)! / hist[Math.max(0, hist.length - 13)]! - 1) * 100 : null;
  const mats = h('div', { class: 'card' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' }, h('div', { class: 'lbl-s', style: 'margin:0' }, `${EMOJI.malzeme} Malzeme fiyatı (etkin çarpan)`), ch !== null ? h('b', { class: ch > 0 ? 'neg' : 'pos' }, `${ch > 0 ? '+' : ''}${ch.toFixed(1)}% (12 ay)`) : null), chips,
    lineChart(hist.map((v, i) => ({ label: `${i + 1}. ay`, value: Math.round(v * 100) })), (n) => String(n), 140));

  // Rakipler: itibar ve aktif proje karşılaştırması (biz dahil)
  const rv = aliveRivals(s).slice().sort((a, b) => b.rep - a.rep);
  const rivals = h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Rakip karşılaştırması · itibar'), hbars([{ label: `⭐ ${c.name}`, value: Math.round(c.reputation) }, ...rv.map((r) => ({ label: `${r.name} (${STYLE_LABEL[r.style]})`, value: Math.round(r.rep) }))], (n) => String(n)),
    h('div', { class: 'lbl-s', style: 'margin-top:8px' }, 'Aktif proje sayısı'), hbars([{ label: `⭐ ${c.name}`, value: s.projects.filter((p) => p.status === 'insaat').length }, ...rv.map((r) => ({ label: r.name, value: r.projects }))].filter((x) => x.value > 0), (n) => String(n)),
    h('div', { class: 'mute', style: 'font-size:12px;margin-top:6px' }, `${rv.length} aktif rakip · ${s.rivals.length - rv.length} firma battı.`));
  const news = h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, `${EMOJI.haber} Ekonomi haberleri`), ...(s.news.length ? s.news.slice(0, 10).map((n) => h('div', { class: `ncard ${n.tone}` }, h('span', { class: 'nem' }, newsEmoji(n.text, n.tone)), h('div', {}, h('small', { class: 'mute' }, formatDate(n.day)), h('div', {}, n.text)))) : [h('div', { class: 'empty' }, 'Henüz haber yok. Piyasa değişimleri burada duyurulur.')]));
  return h('div', { style: 'display:flex;flex-direction:column;gap:12px' }, regime, metrics, h('div', { class: 'cols' }, housing, mats), h('div', { class: 'cols' }, rivals, news));
}
