import { dateOf, formatDate, monthKey } from '../core/calendar';
import type { Offer, Unit } from '../core/types';
import { flexLabel, monthlyRent, offerPrice, offersOf, rentOf } from '../sim/buyers';
import { AGENT_FEE, BULK, PACES, PRESALE_DISCOUNT, fairPerM2, listPrice, paceOf, promoActive, promoCost, receivablesTotal, saleChance, unitFair, unitsOf } from '../sim/sales';
import { donut, lineChart } from './charts';
import { fmt, fmtM2, nf, pct } from './components';
import { askConfirm, h, press, toast } from './dom';
import { buyerSvg, sceneSvg, unitState } from './salesScene';
import type { App } from './app';

const FACE: Record<string, string> = { K: 'Kuzey', G: 'Güney', D: 'Doğu', B: 'Batı' };
const PAY: Record<string, string> = { pesin: 'Peşin', taksit: 'Taksit (12 ay)', onsatis: 'Ön satış' };
const ST_LABEL: Record<string, string> = { bos: 'Boş', satildi: 'Satıldı', kirada: 'Kirada', hold: 'Rezerve', kapora: 'Kaporalı' };
const TABS: [string, string][] = [['bina', '🏢 Bina'], ['teklif', '📨 Teklifler'], ['ilan', '📢 İlan'], ['daire', '📋 Daireler'], ['grafik', '📊 Grafik'], ['politika', '⚙️ Politika']];
type Tab = 'bina' | 'teklif' | 'ilan' | 'daire' | 'grafik' | 'politika';

/**
 * Satış merkezi: bina kesiti, alıcı/kiracı teklifleri, daire bazlı kontrol, satış grafikleri ve politika.
 * Satış kendiliğinden kapanmaz: alıcılar teklifle gelir; oyuncu kabul eder, karşı teklif verir ya da reddeder (isterse danışmana otomatik kabul yetkisi verir).
 */
export function openSales(app: App, projectId: number, onClose?: () => void): void {
  const mem = { tab: 'bina' as Tab, sel: null as number | null, counter: null as number | null, angle: -90 };
  const seen = new Set<number>(), just = new Set<number>(); let scroll = 0;
  const card = h('div', { class: 'card sc' });
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Satış merkezi' }, card);
  const close = () => { modal.remove(); onClose?.(); };
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  const WATCH = ['UNIT_SOLD', 'KAPORA', 'KAPORA_CANCELLED', 'SALES_POLICY', 'PROJECT_SOLD', 'BULK_SOLD', 'DELIVERED', 'MONTH', 'PROJECT_COMPLETED', 'DEFAULT', 'OFFER_NEW', 'OFFER_LOST', 'RENT_STARTED', 'RENT_ENDED', 'UNIT_SET'];
  const unsub = app.store.subscribe((evs) => { if (!modal.isConnected) { unsub(); return; } if (evs.some((e) => WATCH.includes(e.type))) render(); });
  const act = (cmd: string, params: Record<string, unknown>, sfx: 'coin' | 'stamp' | 'toggle' | 'click' | 'confirm' = 'click'): boolean => {
    const r = app.store.run(cmd as never, params as never); if (!r.ok) { app.audio.sfx('error'); toast(r.error); return false; } app.audio.sfx(sfx); return true;
  };

  const render = () => {
    const s = app.store.state, p = s.projects.find((x) => x.id === projectId);
    if (!p || !p.sales) { close(); return; }
    const pol = p.sales, us = unitsOf(s, p.id), perM2 = fairPerM2(s, p), offers = offersOf(s, p.id), ch = saleChance(s, p, pol);
    const sold = us.filter((u) => u.status === 'satildi'), rented = us.filter((u) => u.rent), free = us.filter((u) => unitState(u) === 'bos');
    const open = p.status === 'tamamlandi' || (p.status === 'insaat' && pol.presale && !!p.build && p.build.stage >= 8);
    scroll = card.querySelector('.scb')?.scrollTop ?? scroll; card.innerHTML = '';
    card.append(h('div', { class: 'sch' }, h('h2', {}, `🏢 Satış merkezi · ${p.name}`), h('span', { class: 'sck-mini mute' }, `${sold.length}/${us.length} satıldı · ${free.length} boş · ${rented.length} kirada · ${fmt(monthlyRent(s, p.id))}/ay · ${offers.length} teklif`), h('button', { class: 'btn', style: 'margin-left:auto', onclick: () => { press(app); close(); } }, 'Kapat')));
    const k = (l: string, v: string) => h('div', { class: 'kpi', html: `<small>${l}</small><b>${v}</b>` });
    card.append(h('div', { class: 'sck' }, k('Satılan', `${sold.length}/${us.length}`), k('Boş', String(free.length)), k('Kirada', `${rented.length}`), k('Aylık kira', fmt(monthlyRent(s, p.id))), k('Bekleyen teklif', String(offers.length)), k('Sözleşme geliri', fmt(pol.contract)), k('Tahsil edilecek', fmt(receivablesTotal(s)))));
    card.append(h('div', { class: 'sct' }, ...TABS.map(([id, label]) => h('button', { class: `btn${mem.tab === id ? ' on' : ''}`, onclick: () => { press(app); mem.tab = id as Tab; mem.counter = null; render(); } }, id === 'teklif' && offers.length ? `${label} (${offers.length})` : label))));
    const body = h('div', { class: 'scb' }); card.append(body);
    if (!open && !us.some((u) => u.status === 'satildi')) body.append(h('div', { class: 'card', style: 'margin-bottom:8px;padding:10px' }, h('b', {}, 'Satışa henüz açık değil. '), h('span', { class: 'mute' }, 'Bina bitince alıcılar gelmeye başlar; ön satışı Politika sekmesinden açarsanız betonarme aşamasından itibaren de gelirler.')));

    // ---------- Bina ----------
    if (mem.tab === 'bina') {
      const scene = h('div', { class: 'sc-scene', html: sceneSvg(s, p, us, { sel: mem.sel, seen, just, offers }) });
      scene.addEventListener('click', (e) => { const g = (e.target as Element).closest('[data-u]'); if (g) { press(app); mem.sel = Number(g.getAttribute('data-u')); render(); } });
      scene.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element).hasAttribute('data-u')) { mem.sel = Number((e.target as Element).getAttribute('data-u')); render(); } });
      const legend = h('div', { class: 'sc-legend' }, ...([['#2a2e34', 'Boş'], ['#2ECC8F', 'Satıldı'], ['#3E7BFA', 'Kirada'], ['#6b7078', 'Rezerve'], ['#FF8C32', 'Teklif var']] as const).map(([c, t]) => h('span', { html: `<i style="background:${c}"></i>${t}` })));
      const left = h('div', {}, scene, legend), sel = us.find((u) => u.id === mem.sel);
      body.append(h('div', { class: 'sc-grid' }, left, sel ? unitPanel(sel) : overview()));
    }
    // ---------- Teklifler ----------
    else if (mem.tab === 'teklif') {
      if (!offers.length) body.append(h('div', { class: 'card emptyfx', style: 'text-align:center;padding:18px' }, h('div', { style: 'font-size:34px' }, '🚶'), h('b', {}, 'Şu an bekleyen teklif yok'), h('div', { class: 'mute', style: 'font-size:13px' }, open ? `Alıcılar geldikçe burada görünür. Tahmini: ${ch.p > 0 ? `daire başına ~${Math.round(1 / ch.p)} günde bir ilgi` : 'ilgi yok'}. Fiyatı düşürmek, emlakçı tutmak ya da danışman çalıştırmak ilgiyi artırır.` : 'Satış başlayınca alıcılar gelir.')));
      for (const o of offers) body.append(offerCard(o));
    }
    // ---------- İlan ----------
    else if (mem.tab === 'ilan') {
      const pace = paceOf(pol), listed = us.filter((u) => u.status !== 'satildi' && !u.rent && !u.hold), unsold = us.filter((u) => u.status !== 'satildi' && !u.hold).reduce((a, u) => a + unitFair(u, perM2), 0);
      const perDay = ch.p * pace.flow * listed.length, wk = perDay * 7, ad = Math.round(unsold * pace.cost), target = -90 + pace.id * 45;
      const gauge = h('div', { class: 'gauge', html: `<svg viewBox="-70 -62 140 84" width="100%" role="img" aria-label="İlan hızı göstergesi"><path d="M-56 0 A56 56 0 0 1 56 0" fill="none" stroke="#ffffff1c" stroke-width="10" stroke-linecap="round"/><path d="M-56 0 A56 56 0 0 1 56 0" fill="none" stroke="url(#gg)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(pace.id / 4) * 176 + 0.1} 400"/><defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="#3FBF8A"/><stop offset=".5" stop-color="#E8B93A"/><stop offset="1" stop-color="#FF5A4A"/></linearGradient></defs>${PACES.map((x) => `<text x="${Math.cos(((-180 + x.id * 45) * Math.PI) / 180) * 66}" y="${Math.sin(((-180 + x.id * 45) * Math.PI) / 180) * 66 + 3}" text-anchor="middle" font-size="9">${x.ico}</text>`).join('')}<path class="gneedle" d="M-3 0 L0 -50 L3 0 Z" fill="#f5f5f3" style="transform:rotate(${mem.angle}deg)"/><circle r="5" fill="#f5f5f3"/></svg>` });
      const nd = gauge.querySelector('.gneedle') as SVGElement | null;
      if (nd) { requestAnimationFrame(() => requestAnimationFrame(() => { nd.style.transform = `rotate(${target}deg)`; })); mem.angle = target; }
      body.append(h('div', { class: 'cols' },
        h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'İlan hızı'), gauge,
          h('div', { style: 'text-align:center;font-weight:800;font-size:18px' }, `${pace.ico} ${pace.label}`), h('div', { class: 'mute', style: 'font-size:12px;text-align:center;margin-bottom:8px' }, pace.desc),
          h('div', { class: 'seg', style: 'flex-wrap:wrap' }, ...PACES.map((x) => h('button', { class: pace.id === x.id ? 'on' : '', onclick: () => { act('SetPace', { projectId, pace: x.id }, 'toggle'); } }, `${x.ico} ${x.label}`))),
          h('div', { class: 'kpis', style: 'margin-top:10px' }, k('Alıcı akışı', listed.length && open ? (wk >= 1 ? `haftada ~${wk.toFixed(1)}` : `~${Math.round(1 / Math.max(perDay, 1e-6))} günde 1`) : '—'), k('Teklif düzeyi', `${pace.ratio >= 0 ? '+' : ''}%${Math.round(pace.ratio * 100)}`), k('Aylık reklam', ad ? fmt(ad) : 'yok'))),
        h('div', { class: 'card' }, h('div', { style: 'display:flex;align-items:center;gap:6px;flex-wrap:wrap' }, h('div', { class: 'lbl-s', style: 'margin:0;flex:1' }, `İlandaki daireler (${listed.length}/${us.filter((u) => u.status !== 'satildi' && !u.rent).length})`),
          h('button', { class: 'btn', style: 'min-height:32px;font-size:12px', onclick: () => { let n = 0; for (const u of us) if (u.status !== 'satildi' && !u.rent && u.hold) if (app.store.run('SetUnit', { unitId: u.id, hold: false } as never).ok) n++; if (n) app.audio.sfx('confirm'); } }, 'Hepsini ilana koy'),
          h('button', { class: 'btn', style: 'min-height:32px;font-size:12px', onclick: () => { for (const u of us) if (u.status !== 'satildi' && !u.rent && !u.hold) app.store.run('SetUnit', { unitId: u.id, hold: true } as never); app.audio.sfx('toggle'); } }, 'Hepsini kaldır')),
          ...us.filter((u) => u.status !== 'satildi').map((u) => {
            const on = !u.hold && !u.rent, pr = promoActive(s, u), cost = promoCost(s, p, u);
            return h('div', { class: 'row', style: 'min-height:50px;gap:8px' },
              h('div', { class: 'lbl' }, `${u.floor}. kat · ${u.rooms} · ${nf(u.area, 0)} m²`, h('small', {}, u.rent ? `Kirada · ${fmt(u.rent.amount)}/ay` : `${u.hold ? 'İlanda değil' : u.listing === 'kira' ? 'Kiralık ilan' : 'Satılık ilan'} · ${fmt(listPrice(u, perM2, pol))}${pr ? ` · ⭐ ${Math.max(0, (u.promo ?? 0) - s.clock.day)} gün öne çıkıyor` : ''}`)),
              u.rent ? h('span', { class: 'sc-chip' }, 'Kirada') : h('div', { style: 'display:flex;gap:6px;align-items:center' },
                on && !pr ? h('button', { class: 'btn', style: 'min-height:32px;font-size:12px', title: 'Bu daireye 30 gün boyunca 2 kat alıcı', disabled: s.company!.cash < cost, onclick: () => { act('PromoteUnit', { unitId: u.id }, 'coin'); } }, `⭐ ${fmt(cost)}`) : null,
                h('button', { class: 'tog', role: 'switch', 'aria-label': 'İlanda', 'aria-checked': String(on), onclick: () => { act('SetUnit', { unitId: u.id, hold: on }, 'toggle'); } })));
          })),
      ));
    }
    // ---------- Daireler ----------
    else if (mem.tab === 'daire') {
      const t = h('table', { class: 'tbl' }, h('tr', {}, ...['Kat', 'Oda', 'm²', 'Manzara', 'Cephe', 'Liste', 'Durum'].map((x) => h('th', {}, x))));
      for (const u of us) {
        const st = unitState(u), cell = u.status === 'satildi' ? h('span', { class: 'pos-t' }, `${PAY[u.payment ?? 'pesin']} · ${fmt(u.price ?? 0)}`) : u.rent ? h('span', { style: 'color:#6ea0ff' }, `Kirada · ${fmt(u.rent.amount)}/ay`) : h('span', { class: st === 'hold' ? 'mute' : '' }, `${ST_LABEL[st]}${u.listing === 'kira' ? ' · kiralık' : ''}${offers.some((o) => o.unitId === u.id) ? ' · 📨' : ''}`);
        const tr = h('tr', { style: 'cursor:pointer', onclick: () => { press(app); mem.sel = u.id; mem.tab = 'bina'; render(); } }, h('td', {}, String(u.floor)), h('td', {}, u.rooms), h('td', {}, nf(u.area, 0)), h('td', {}, String(u.view)), h('td', {}, FACE[u.facing]!), h('td', {}, fmt(listPrice(u, perM2, pol)) + (u.adj ? ` (${u.adj > 1 ? '+' : ''}${Math.round((u.adj - 1) * 100)}%)` : '')), h('td', {}, cell));
        t.append(tr);
      }
      body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Daireler · dokunun, binada açılsın'), t));
    }
    // ---------- Grafik ----------
    else if (mem.tab === 'grafik') {
      const log = (pol.log ?? []).slice().sort((a, b) => a.d - b.d), sales = log.filter((x) => x.k === 's');
      let cum = 0; const pts = sales.map((x) => ({ label: formatDate(x.d), value: (cum += x.p) }));
      body.append(h('div', { class: 'cols' },
        h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Birikimli satış geliri'), pts.length >= 2 ? lineChart(pts, (n) => fmt(n), 150) : h('div', { class: 'empty' }, 'En az iki satıştan sonra çizilir.'), h('div', { class: 'mute', style: 'font-size:12px;margin-top:4px' }, `Beklenen toplam: ${fmt(p.expected.revenue)} · gerçekleşen ${fmt(pol.contract)} (${pct(p.expected.revenue > 0 ? pol.contract / p.expected.revenue : 0)})`)),
        h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Aylık işlem sayısı (satış + kira)'), ((): HTMLElement => {
          const by = new Map<string, number>(); for (const x of log) by.set(monthKey(x.d), (by.get(monthKey(x.d)) ?? 0) + 1);
          const now = dateOf(s.clock.day), months: { label: string; value: number }[] = [];
          for (let i = 11; i >= 0; i--) { let m = now.month - i, y = now.year; while (m <= 0) { m += 12; y--; } const key = `${y}-${String(m).padStart(2, '0')}`; months.push({ label: key, value: by.get(key) ?? 0 }); }
          return log.length ? countBars(months) : h('div', { class: 'empty' }, 'Henüz işlem yok.');
        })()),
      ), h('div', { class: 'cols', style: 'margin-top:10px' },
        h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Daire durumu'), donut([{ label: 'Satıldı', value: sold.length }, { label: 'Kirada', value: rented.length }, { label: 'Boş', value: free.length }, { label: 'Rezerve', value: us.filter((u) => unitState(u) === 'hold').length }, { label: 'Kaporalı', value: us.filter((u) => u.status === 'kapora').length }], (n) => String(n))),
        h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Özet'), h('div', {}, ...([['Ortalama satış fiyatı', sold.length ? fmt(Math.round(sold.reduce((a, u) => a + (u.price ?? 0), 0) / sold.length)) : '—'], ['m² adil fiyat', fmtM2(perM2)], ['Aylık kira geliri', fmt(monthlyRent(s, p.id))], ['Kira getirisi', rented.length ? pct((monthlyRent(s, p.id) * 12) / Math.max(1, rented.reduce((a, u) => a + unitFair(u, perM2), 0)), 1) + ' / yıl' : '—'], ['Komisyon (emlakçı)', fmt(pol.commission)]] as [string, string][]).map(([a, b]) => h('div', { class: 'row', style: 'min-height:30px' }, h('div', { class: 'lbl' }, a), h('b', {}, b)))))));
    }
    // ---------- Politika ----------
    else {
      const out = h('b', {}, pct(pol.priceMult, 0)), rng = h('input', { type: 'range', min: 80, max: 125, step: 1, value: Math.round(pol.priceMult * 100), 'aria-label': 'Fiyat çarpanı' }) as HTMLInputElement; rng.style.setProperty('--p', `${((pol.priceMult * 100 - 80) / 45) * 100}%`);
      rng.oninput = () => { out.textContent = `%${rng.value}`; rng.style.setProperty('--p', `${((Number(rng.value) - 80) / 45) * 100}%`); };
      rng.onchange = () => { app.store.run('SetSalesPolicy', { projectId, priceMult: Number(rng.value) / 100 }); };
      const tog = (label: string, sub: string, key: 'agent' | 'installments' | 'presale', dis = '') => h('div', { class: 'row', style: 'min-height:46px' }, h('div', { class: 'lbl' }, label, h('small', {}, dis || sub)), h('button', { class: 'tog', role: 'switch', 'aria-label': label, 'aria-checked': String(pol[key]), onclick: () => { app.audio.sfx('toggle'); app.store.run('SetSalesPolicy', { projectId, [key]: !pol[key] } as never); } }));
      const dan = s.staff.filter((x) => x.type === 'satis_danismani').length, auto = pol.autoMin !== undefined;
      const autoBtn = (v: number) => h('button', { class: `btn${auto && Math.abs(pol.autoMin! - v) < 0.001 ? ' gold' : ''}`, style: 'min-height:34px;font-size:12px', onclick: () => { act('SetAutoSell', { projectId, min: v }, 'toggle'); } }, `≥ %${Math.round(v * 100)}`);
      body.append(h('div', { class: 'cols' },
        h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Satış politikası'),
          h('div', { class: 'row', style: 'min-height:50px' }, h('div', { class: 'lbl' }, 'Genel fiyat (adil değere göre)', h('small', {}, 'Düşük fiyat daha çok teklif getirir, yüksek fiyat kârı artırır ama bekletir. Daireye özel fiyatı Bina sekmesinden ayarlarsınız.')), h('div', { class: 'offer', style: 'min-width:190px;flex:none' }, rng, out)),
          tog('Emlakçı', `Alıcı akışını %30 artırır · komisyon ${pct(AGENT_FEE, 1)}`, 'agent'), tog('Taksitli satış', 'Alıcılar taksit de önerir: fiyat +%6, %25 peşin, 12 ay vade', 'installments'),
          tog('Ön satış', `İnşaat sürerken (betonarmeden sonra) %${Math.round((1 - PRESALE_DISCOUNT) * 100)} indirimle, %40 peşin`, 'presale', p.status === 'insaat' && (!p.build || p.build.stage < 8) ? 'Betonarme aşamasından itibaren açılır' : p.status === 'tamamlandi' ? 'Bina bitti; ön satış gerekmiyor' : '')),
        h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Satış danışmanına yetki'),
          h('div', { class: 'mute', style: 'font-size:13px;margin-bottom:6px' }, `Varsayılan: her teklifi siz onaylarsınız. İsterseniz belirli bir orandan yüksek satış tekliflerini danışmanınız kendisi kabul eder (kira teklifleri hep elle). Satış danışmanı: ${dan} kişi.`),
          h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, autoBtn(0.95), autoBtn(0.98), autoBtn(1.0), h('button', { class: `btn${auto ? '' : ' gold'}`, style: 'min-height:34px;font-size:12px', onclick: () => { act('SetAutoSell', { projectId, min: null }, 'toggle'); } }, 'Elle onay')),
          h('div', { class: 'mute', style: 'font-size:12px;margin-top:6px' }, auto ? `Şu an: teklif oranı ≥ %${Math.round(pol.autoMin! * 100)} olanlar otomatik kabul.` : 'Şu an: tüm teklifler elle.'),
          p.status === 'tamamlandi' && us.some((u) => u.status !== 'satildi') ? h('button', { class: 'btn block', style: 'margin-top:12px', onclick: async () => { const rest = us.filter((u) => u.status !== 'satildi'), tot = rest.reduce((a, u) => a + Math.round(unitFair(u, perM2) * BULK), 0); if (!(await askConfirm(`Kalan ${rest.length} daire yatırımcıya ${fmt(tot)} bedelle satılsın mı?\n(Adil değerin %92'si; kiradaki daireler de dahil, kiracılar ayrılır.)`))) return; if (act('SellProjectBulk', { projectId }, 'stamp')) toast('Toplu satış yapıldı'); } }, 'Kalanı toplu sat (%92)') : null)));
    }
    const sb = card.querySelector('.scb') as HTMLElement | null; if (sb) sb.scrollTop = scroll;
    for (const o of offers) seen.add(o.id);

    // ---- yardımcılar ----
    function overview(): HTMLElement {
      const hint = h('div', { class: 'card sc-detail' }, h('div', { class: 'lbl-s' }, 'Binayı yönetin'), h('p', { class: 'mute', style: 'font-size:13px;margin:0 0 8px' }, 'Bir daireye dokunun: özel fiyat verin, rezerve edin, kiralığa çıkarın. Turuncu balonlu dairelerde bekleyen bir teklif var.'),
        h('div', {}, ...([['Talep', `${ch.p * 30 > 0.35 ? 'Yüksek' : ch.p * 30 > 0.18 ? 'Orta' : 'Düşük'} (piyasa ${ch.demand.toFixed(2)} · marka ${ch.brand.toFixed(2)})`], ['Alıcı akışı', open && ch.p > 0 ? `daire başına ~${Math.round(1 / ch.p)} günde bir` : '—'], ['m² adil fiyat', fmtM2(perM2)], ['Boş daire', `${free.length}`]] as [string, string][]).map(([a, b]) => h('div', { class: 'row', style: 'min-height:30px' }, h('div', { class: 'lbl' }, a), h('b', {}, b)))));
      const box = h('div', {}, hint); if (offers.length) box.append(h('div', { class: 'lbl-s', style: 'margin-top:8px' }, 'Bekleyen teklifler'), ...offers.slice(0, 2).map((o) => offerCard(o)));
      return box;
    }
    function unitPanel(u: Unit): HTMLElement {
      const st = unitState(u), list = listPrice(u, perM2, pol), uo = offers.filter((o) => o.unitId === u.id);
      const adjOut = h('b', {}, `%${Math.round((u.adj ?? 1) * 100)}`), adj = h('input', { type: 'range', min: 80, max: 130, step: 1, value: Math.round((u.adj ?? 1) * 100), 'aria-label': 'Daireye özel fiyat', disabled: u.status === 'satildi' }) as HTMLInputElement; adj.style.setProperty('--p', `${(((u.adj ?? 1) * 100 - 80) / 50) * 100}%`);
      adj.oninput = () => { adjOut.textContent = `%${adj.value}`; adj.style.setProperty('--p', `${((Number(adj.value) - 80) / 50) * 100}%`); };
      adj.onchange = () => { act('SetUnit', { unitId: u.id, adj: Number(adj.value) / 100 }, 'toggle'); };
      const box = h('div', { class: 'card sc-detail' },
        h('div', { style: 'display:flex;gap:8px;align-items:center' }, h('h3', { style: 'font-size:20px;flex:1' }, `${u.floor}. kat · ${u.rooms} · ${nf(u.area, 0)} m²`), h('span', { class: 'sc-chip' }, ST_LABEL[st]), h('button', { class: 'btn', style: 'min-height:32px;font-size:12px', onclick: () => { mem.sel = null; render(); } }, '✕')),
        h('div', { class: 'mute', style: 'font-size:12px;margin-bottom:6px' }, `Manzara ${u.view}/100 · ${FACE[u.facing]} cephe · adil değer ${fmt(unitFair(u, perM2))}`));
      if (u.status === 'satildi') {
        box.append(h('div', { class: 'row' }, h('div', { class: 'lbl' }, 'Satış bedeli', h('small', {}, `${PAY[u.payment ?? 'pesin']} · ${formatDate(u.soldDay ?? 0)}`)), h('b', { class: 'pos-t' }, fmt(u.price ?? 0))), u.delivered ? h('div', { class: 'mute', style: 'font-size:12px' }, `Teslim edildi · memnuniyet ${u.sat ?? '-'}`) : h('span', {}));
        return box;
      }
      box.append(h('div', { class: 'row', style: 'min-height:48px' }, h('div', { class: 'lbl' }, 'Liste fiyatı', h('small', {}, 'Bu daireye özel fiyat (genel fiyata ek)')), h('div', { class: 'offer', style: 'min-width:170px;flex:none' }, adj, adjOut)), h('div', { class: 'row', style: 'min-height:30px' }, h('div', { class: 'lbl' }, 'Güncel liste'), h('b', {}, fmt(list))));
      if (u.rent) {
        box.append(h('div', { class: 'row' }, h('div', { class: 'lbl' }, `Kiracı: ${u.rent.tenant}`, h('small', {}, `${formatDate(u.rent.since)} tarihinden beri`)), h('b', { style: 'color:#6ea0ff' }, `${fmt(u.rent.amount)}/ay`)),
          h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-top:6px' }, h('button', { class: 'btn', onclick: async () => { if (await askConfirm('Kira sözleşmesi sonlandırılsın mı?\nDaire yeniden kiralık ilana döner.')) act('EndRent', { unitId: u.id }, 'click'); } }, 'Kirayı sonlandır')));
      } else {
        box.append(h('div', { class: 'seg', style: 'margin:8px 0' }, h('button', { class: u.listing !== 'kira' && !u.hold ? 'on' : '', onclick: () => { act('SetUnit', { unitId: u.id, listing: 'sat', hold: false }, 'toggle'); } }, '🏷️ Satılık'), h('button', { class: u.listing === 'kira' && !u.hold ? 'on' : '', onclick: () => { act('SetUnit', { unitId: u.id, listing: 'kira', hold: false }, 'toggle'); } }, '🔑 Kiralık'), h('button', { class: u.hold ? 'on' : '', onclick: () => { act('SetUnit', { unitId: u.id, hold: !u.hold }, 'toggle'); } }, '⛔ Rezerve')),
          h('div', { class: 'mute', style: 'font-size:12px' }, u.hold ? 'Rezerve: bu daireye alıcı gelmez (örneğin en iyi daireyi sonraya bırakmak için).' : u.listing === 'kira' ? `Kiracılar aylık yaklaşık ${fmt(rentOf(s, p!, u))} kira önerir (yıllık getiri ~%5,4).` : 'Satılık: alıcı teklifleri gelir.'));
      }
      if (uo.length) box.append(h('div', { class: 'lbl-s', style: 'margin-top:8px' }, 'Bu daire için teklif'), ...uo.map((o) => offerCard(o)));
      return box;
    }
    function offerCard(o: Offer): HTMLElement {
      const u = s.units.find((x) => x.id === o.unitId); if (!u) return h('div', {});
      const price = offerPrice(s, p!, u, o), list = listPrice(u, perM2, pol), diff = o.kind === 'satis' ? o.ratio - 1 : 0, left = Math.max(0, o.until - s.clock.day), tone = diff >= 0.005 ? 'pos-t' : diff >= -0.035 ? 'warn-t' : 'bad-t';
      const kira = o.kind === 'kira', yearly = kira ? (price * 12) / Math.max(1, unitFair(u, perM2)) : 0;
      const counterRow = mem.counter === o.id ? h('div', { class: 'acts' }, ...[0.02, 0.04, 0.06, 0.09].map((d) => { const r = Math.min(1.2, +(o.ratio + d).toFixed(3)), pr = offerPrice(s, p!, u, { kind: o.kind, ratio: r, pay: o.pay }); return h('button', { class: 'btn', onclick: () => { counter(o, u, r); } }, `%${Math.round(r * 100)} · ${fmt(pr)}${kira ? '/ay' : ''}`); }), h('button', { class: 'btn', onclick: () => { mem.counter = null; render(); } }, 'Vazgeç')) : null;
      return h('div', { class: 'offer-card' },
        h('div', { class: 'av', html: buyerSvg(o.seed, o.profile, 38) }),
        h('div', { class: 'body' },
          h('div', { style: 'display:flex;gap:8px;align-items:baseline;flex-wrap:wrap' }, h('b', {}, o.buyer), h('span', { class: 'mute', style: 'font-size:12px' }, `${o.profile} · ${kira ? 'kiracı' : 'alıcı'}`), h('span', { class: 'sc-chip', style: 'margin-left:auto' }, flexLabel(o))),
          h('div', { class: 'mute', style: 'font-size:12px' }, `${o.note} · ${u.floor}. kat ${u.rooms} · ${nf(u.area, 0)} m²`),
          h('div', { class: 'pr' }, kira ? `${fmt(price)}/ay` : fmt(price), h('small', { class: kira ? 'mute' : tone }, kira ? `yıllık getiri ${pct(yearly, 1)}` : `liste ${fmt(list)} · teklif oranı %${Math.round(o.ratio * 100)} · ${PAY[o.pay]} (${o.pay === 'pesin' ? '%4 peşin iskonto' : o.pay === 'taksit' ? '%6 vade farkı' : '%10 ön satış iskontosu'})`)),
          h('div', { class: 'tleft', title: `${left} gün sonra gider` }, h('i', { style: `width:${Math.round((left / Math.max(1, o.until - o.day)) * 100)}%` })),
          h('div', { class: 'acts' }, h('button', { class: 'btn gold', onclick: () => { accept(o, u); } }, kira ? '✅ Kirala' : '✅ Kabul et'), h('button', { class: 'btn', onclick: () => { press(app); mem.counter = mem.counter === o.id ? null : o.id; render(); } }, '🤝 Karşı teklif'), h('button', { class: 'btn', onclick: () => { act('RejectOffer', { offerId: o.id }, 'click'); } }, '✖ Reddet'), h('span', { class: 'mute', style: 'font-size:11px;align-self:center' }, `${left} gün`)),
          counterRow));
    }
    function accept(o: Offer, u: Unit) { if (act('AcceptOffer', { offerId: o.id }, o.kind === 'kira' ? 'stamp' : 'coin')) { just.add(u.id); setTimeout(() => { just.delete(u.id); }, 1600); toast(o.kind === 'kira' ? `${o.buyer} kiracı oldu` : `${o.buyer} daireyi aldı`, 2400); } }
    function counter(o: Offer, u: Unit, ratio: number) {
      mem.counter = null; if (!act('CounterOffer', { offerId: o.id, ratio }, 'click')) return;
      const done = s.units.find((x) => x.id === u.id), ok = done?.status === 'satildi' || !!done?.rent;
      if (ok) { just.add(u.id); setTimeout(() => { just.delete(u.id); }, 1600); app.audio.sfx('coin'); toast(`${o.buyer} karşı teklifi kabul etti`, 2600); } else { app.audio.sfx('error'); toast(`${o.buyer} pazarlığı çok bularak vazgeçti`, 2800); }
    }
  };
  render(); document.body.append(modal);
}

/** Tam sayı sayımlar için basit çubuklar (genel çubuk grafiği ondalık eksen çiziyordu). */
function countBars(pts: { label: string; value: number }[]): HTMLElement {
  const max = Math.max(1, ...pts.map((p) => p.value)), W = 360, H = 120, bw = W / pts.length;
  const bars = pts.map((p, i) => { const hh = (p.value / max) * (H - 28), x = i * bw + 4; return `<g><rect class="br" style="--i:${i}" x="${x}" y="${H - 16 - hh}" width="${bw - 8}" height="${Math.max(1.5, hh)}" rx="3" fill="${p.value ? '#FF8C32' : '#ffffff1a'}"/>${p.value ? `<text x="${x + (bw - 8) / 2}" y="${H - 20 - hh}" text-anchor="middle" font-size="10" fill="#f5f5f3">${p.value}</text>` : ''}<text x="${x + (bw - 8) / 2}" y="${H - 3}" text-anchor="middle" font-size="8" fill="#9aa0a8">${p.label.slice(5)}</text></g>`; }).join('');
  const w = document.createElement('div'); w.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Aylık işlem sayısı">${bars}</svg>`; return w;
}
