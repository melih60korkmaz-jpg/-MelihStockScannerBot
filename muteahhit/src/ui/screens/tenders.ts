import { infraKind } from '../../sim/infra';
import { emblemSvg } from '../emblem';
import { formatDate } from '../../core/calendar';
import { cityData, buildingType, quality } from '../../data';
import { h, press, toast } from '../dom';
import { fmt, nf } from '../components';
import type { App } from '../app';
import { buildingPhoto, emptyArt } from '../art';
import { hbars } from '../charts';
import type { Tender } from '../../core/types';
import { bidLimits, bondOf, eligibility, winOdds } from '../../sim/tenders';

const KIND: Record<string, string> = { okul: 'Okul', belediye: 'Belediye', hastane: 'Hastane', fabrika: 'Sanayi', konut: 'Konut' };
const STATUS: Record<string, [string, string]> = { acik: ['Açık', 'good'], kazandi: ['Kazandınız', 'good'], kaybetti: ['Kaybettiniz', 'bad'], elendi: ['Elendiniz', 'bad'], iptal: ['Teklif verilmedi', ''] };

/** İhale sekmesi: açık ihaleler, şartlar, teklif ve sonuçlar. */
export function tendersView(app: App, refresh: () => void, only?: 'infra'): HTMLElement {
  const s = app.store.state, open = s.tenders.filter((t) => t.status === 'acik' && (only !== 'infra' || t.infra)), done = s.tenders.filter((t) => t.status !== 'acik' && (only !== 'infra' || t.infra));
  const card = (t: Tender) => {
    const el = eligibility(s, t), st = STATUS[t.status]!, bt = buildingType(t.type);
    const floorsOf = Math.max(2, Math.round(t.area / 700) + 1);
    return h('div', { class: `card pj st-${t.status === 'acik' ? 'insaat' : t.status === 'kazandi' ? 'tamamlandi' : 'taslak'}`, style: 'margin-bottom:10px' }, h('div', { class: 'pcover infrac', html: t.infra ? `<div class="infraico">${infraKind(t.kind)?.ico ?? '🛣️'}</div>` : buildingPhoto(t.type, floorsOf, 1, t.id, t.quality) }), h('div', { class: 'pbody' },
      h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, h('h3', { style: 'font-size:20px;flex:1' }, t.title), h('span', { class: 'chip' }, t.infra ? `${infraKind(t.kind)?.ico ?? ''} ${infraKind(t.kind)?.label ?? t.kind}` : KIND[t.kind] ?? t.kind), h('span', { class: 'chip' }, t.client === 'kamu' ? 'Kamu ihalesi' : 'Özel ihale'), h('span', { class: `chip ${st[1]}` }, st[0])),
      h('div', { class: 'mute', style: 'font-size:12px;margin:4px 0 8px' }, t.infra ? `${cityData(t.city)?.label} · altyapı işi · süre ${t.months} ay · ${t.status === 'acik' ? `sonuç ${formatDate(t.evalDay)}` : ''}` : `${cityData(t.city)?.label} · ${bt?.label} · ${quality(t.quality)?.label} · ${nf(t.area)} m² arsa · süre ${t.months} ay · ${t.status === 'acik' ? `sonuç ${formatDate(t.evalDay)}` : ''}`),
      h('div', { class: 'kpis' }, h('div', { class: 'kpi', html: `<small>Yaklaşık maliyet</small><b>${fmt(t.refCost)}</b>` }), h('div', { class: 'kpi', html: `<small>Teklif aralığı</small><b>${fmt(bidLimits(t).min)} – ${fmt(bidLimits(t).max)}</b>` }), h('div', { class: 'kpi', html: `<small>${t.bid ? 'Teklifiniz' : 'Teminat'}</small><b>${t.bid ? fmt(t.bid.price) : '%' + (t.bondPct * 100).toFixed(0)}</b>` })),
      t.status === 'acik' ? h('div', { class: 'pjfacts' }, h('span', {}, '🏢 Rakip ', h('b', {}, String(t.rivals.length))), h('span', {}, '📊 Rekabet ', h('b', {}, t.rivals.length >= 4 ? 'yüksek' : 'orta')), h('span', {}, '📜 Teminat ', h('b', {}, '%' + (t.bondPct * 100).toFixed(0)))) : null,
      t.status === 'acik' ? h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px' }, ...el.checks.map((c) => h('span', { class: `chip ${c.ok ? 'good' : 'bad'}`, title: `${c.label}: gerekli ${c.need}, sizde ${c.have}` }, `${c.label} ${c.have}/${c.need}`))) : null,
      t.result ? h('div', { style: 'margin-top:8px' }, h('div', { class: 'mute', style: 'font-size:12px' }, `${t.status === 'kazandi' ? '🏆' : '📉'} ${t.result.reason ? t.result.reason + ' ' : ''}Kazanan: ${t.result.winner}.`), ...(t.result.scores.length ? [hbars(t.result.scores.map((x) => ({ label: x.name, value: x.score })), (n) => String(n))] : [])) : null,
      t.status === 'acik' && !t.bid ? h('div', { style: 'display:flex;justify-content:flex-end;margin-top:10px' }, h('button', { class: 'btn gold', disabled: !s.openCities.includes(t.city), onclick: () => { press(app); openBid(app, t, refresh); } }, s.openCities.includes(t.city) ? (el.ok ? 'Teklif ver' : 'Teklif ver (şart eksik)') : 'Şube gerekli')) : t.bid && t.status === 'acik' ? h('div', { class: 'chip good', style: 'margin-top:8px' }, 'Teklif verildi, sonuç bekleniyor') : null));
  };
  const contracts = s.projects.filter((p) => p.contract && p.status !== 'satildi');
  return h('div', { class: 'cols' },
    h('div', { class: 'col' }, h('div', { class: 'lbl-s' }, '📜 Açık ihaleler'), ...(open.length ? open.map(card) : [h('div', { class: 'card emptyfx' }, h('div', { html: emptyArt('arsa') }), h('b', {}, 'Şu an açık ihale yok'), h('span', { class: 'mute' }, 'İhaleler her ay şubenizin bulunduğu illerde açılır; yeni il için Harita sekmesinden şube açın.'), h('button', { class: 'btn', onclick: () => app.openTab?.('harita') }, 'Haritaya git'))])),
    h('div', { class: 'col' },
      h('div', { class: 'lbl-s' }, '🤝 Sözleşmeli işler'), ...(contracts.length ? contracts.map((p) => h('div', { class: 'card', style: 'margin-bottom:8px' }, h('b', {}, p.name), h('div', { class: 'mute', style: 'font-size:12px' }, `${p.contract!.client} · sözleşme ${fmt(p.contract!.price)} · teslim ${formatDate(p.contract!.deadline)} · bekleyen hakediş ${fmt(p.contract!.pending.reduce((a, x) => a + x.amount, 0))}`), h('div', { class: 'mute', style: 'font-size:12px' }, 'Gecikmede günlük %0,1 ceza (en çok %10). Projeler sekmesinden inşaatı başlatın.'))) : [h('div', { class: 'card empty' }, 'Sözleşmeli iş yok.')]),
      h('div', { class: 'lbl-s', style: 'margin-top:12px' }, 'Sonuçlanan ihaleler'), ...(done.length ? [...done].reverse().map(card) : [h('div', { class: 'card empty' }, 'Henüz sonuçlanan ihale yok.')])));
}

function openBid(app: App, t: Tender, refresh: () => void): void {
  const s = app.store.state, { min, max } = bidLimits(t); let price = Math.round((min + max) / 2);
  const out = h('div', { style: 'min-height:90px;margin:8px 0;font-size:13px' }), lab = h('b', { style: 'font-size:22px' }, '');
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-label': 'İhale teklifi' }); const close = () => modal.remove(); modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  const rng = h('input', { type: 'range', min: Math.round(min * 0.9), max, step: Math.max(1, Math.round((max - min) / 200)), value: price, 'aria-label': 'Teklif tutarı', oninput: () => { price = Number((rng as HTMLInputElement).value); upd(); } });
  const go = h('button', { class: 'btn gold', onclick: () => { const r = app.store.run('PlaceBid', { tenderId: t.id, price }); if (r.ok) { app.audio.sfx('stamp'); toast('Teklif verildi. Sonuç ihale gününde açıklanır.'); close(); refresh(); } else { app.audio.sfx('error'); toast(r.error); } } }, 'Teklifi ver') as HTMLButtonElement;
  const upd = () => {
    const margin = (price - t.trueCost) / price, low = price < min, el = eligibility(s, t);
    lab.textContent = fmt(price); out.innerHTML = '';
    const wo = winOdds(s, t, price), lines = [`Kazanma ihtimali: ~%${Math.round(wo.odds * 100)} (rakip tekliflerine, itibarına, teknik gücüne ve kredi notuna göre tahmin)`, `Beklenen değer: kâr × ihtimal ≈ ${fmt(Math.round((price - t.trueCost) * wo.odds))}`, `Teminat: ${fmt(bondOf(t, price, s))} (sözleşmede iade)`, `Tahmini kâr: ${fmt(price - t.trueCost)} (%${(margin * 100).toFixed(1)})`, price < t.trueCost ? 'Bu fiyatla zarar edersiniz.' : '', low ? 'Yaklaşık maliyetin %80\'inin altı olağan dışı düşük teklif sayılır: elenirsiniz.' : 'Fiyat ne kadar düşükse puanınız artar; ama kâr da düşer. Rakipler yaklaşık maliyetin %86–100\'i arasında teklif verir.', ...el.checks.filter((c) => !c.ok).map((c) => `Eksik şart: ${c.label} (${c.have}/${c.need})`)];
    for (const l of lines) if (l) out.append(h('div', { class: l.startsWith('Eksik') || l.startsWith('Bu fiyat') || l.includes('elenirsiniz') ? 'neg' : 'mute' }, l));
    go.disabled = !el.ok || s.company!.cash < bondOf(t, price, s);
  };
  modal.append(h('div', { class: 'card', style: 'width:min(480px,95vw)' }, h('div', { class: 'letterhead' }, h('span', { html: emblemSvg(s.company!.emblem.shape, s.company!.emblem.color, 30) }), h('div', {}, h('b', {}, s.company!.name), h('small', {}, `Teklif mektubu · Yetkili: ${s.company!.founder ?? 'Patron'}`))), h('h3', {}, t.title), h('div', { class: 'mute', style: 'font-size:12px' }, `Yaklaşık maliyet ${fmt(t.refCost)} · ${t.client === 'kamu' ? 'kamu: yaklaşık maliyet üstü teklif geçersiz' : 'özel: en çok %12 üstü'} · avans %10, hakediş aşama aşama (45 gün vadeli)`), lab, rng, out, h('div', { style: 'display:flex;gap:8px;justify-content:flex-end' }, h('button', { class: 'btn', onclick: close }, 'Vazgeç'), go)));
  document.body.append(modal); upd();
}
