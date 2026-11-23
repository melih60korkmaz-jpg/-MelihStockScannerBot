import { formatDate } from '../core/calendar';
import type { Offer, Unit } from '../core/types';
import { monthlyRent, offerPrice, offersOf, rentOf } from '../sim/buyers';
import { AGENT_FEE, BULK, PACES, PRESALE_DISCOUNT, fairPerM2, listPrice, paceOf, saleChance, unitFair, unitsOf } from '../sim/sales';
import { fmt, fmtM2, nf, pct } from './components';
import { askConfirm, h, press, toast } from './dom';
import { buyerSvg, sceneSvg, unitState } from './salesScene';
import type { App } from './app';

const PAY: Record<string, string> = { pesin: 'Peşin', taksit: 'Taksit', onsatis: 'Ön satış' };
const ST_LABEL: Record<string, string> = { sahip: 'Arsa sahibi', bos: 'Boş', satildi: 'Satıldı', kirada: 'Kirada', hold: 'Rezerve', kapora: 'Kaporalı' };
const TABS: [string, string][] = [['bina', '🏢 Bina'], ['teklif', '📨 Teklifler'], ['ayar', '⚙️ Ayarlar']];
type Tab = 'bina' | 'teklif' | 'ayar';
/** Danışmanın kendiliğinden kabul ettiği alt sınır: liste fiyatının %97'si. */
const AUTO_MIN = 0.97;
/** Sade ilan hızı: Yavaş / Normal / Hızlı (PACES kimlikleri 1, 2, 3). */
const SIMPLE_PACES = [1, 2, 3];

/**
 * Satış merkezi (sade): bina kesiti, gelen teklifler ve birkaç ayar. Alıcılar teklifle gelir; oyuncu kabul eder,
 * pazarlık eder ya da reddeder. İsterse danışmana yetki verir (liste fiyatının %97'si ve üstü kendiliğinden kabul).
 */
export function openSales(app: App, projectId: number, onClose?: () => void): void {
  const mem = { tab: 'bina' as Tab, sel: null as number | null, counter: null as number | null };
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
    const mine = us.filter((u) => !u.landlord), sold = us.filter((u) => u.status === 'satildi' && !u.landlord), rented = us.filter((u) => u.rent), free = us.filter((u) => unitState(u) === 'bos');
    const open = p.status === 'tamamlandi' || (p.status === 'insaat' && pol.presale && !!p.build && p.build.stage >= 8);
    scroll = card.querySelector('.scb')?.scrollTop ?? scroll; card.innerHTML = '';
    card.append(h('div', { class: 'sch' }, h('h2', {}, `🏢 Satış · ${p.name}`), h('span', { class: 'sck-mini mute' }, `${sold.length}/${mine.length} satıldı · ${offers.length} teklif`), h('button', { class: 'btn', style: 'margin-left:auto', onclick: () => { press(app); close(); } }, 'Kapat')));
    const k = (l: string, v: string) => h('div', { class: 'kpi', html: `<small>${l}</small><b>${v}</b>` });
    card.append(h('div', { class: 'sck' }, k('Satılan', `${sold.length}/${mine.length}`), k('Boş', String(free.length)), k('Teklif', String(offers.length)), ...(rented.length ? [k('Aylık kira', fmt(monthlyRent(s, p.id)))] : [])));
    card.append(h('div', { class: 'sct' }, ...TABS.map(([id, label]) => h('button', { class: `btn${mem.tab === id ? ' on' : ''}`, onclick: () => { press(app); mem.tab = id as Tab; mem.counter = null; render(); } }, id === 'teklif' && offers.length ? `${label} (${offers.length})` : label))));
    const body = h('div', { class: 'scb' }); card.append(body);
    if (!open && !sold.length) body.append(h('div', { class: 'card', style: 'margin-bottom:8px;padding:10px' }, h('b', {}, 'Satışa henüz açık değil. '), h('span', { class: 'mute' }, 'Bina bitince alıcılar gelmeye başlar. Ön satışı Ayarlar\'dan açarsan betonarme aşamasından itibaren de gelirler.')));

    // ---------- Bina ----------
    if (mem.tab === 'bina') {
      const scene = h('div', { class: 'sc-scene', html: sceneSvg(s, p, us, { sel: mem.sel, seen, just, offers }) });
      scene.addEventListener('click', (e) => { const g = (e.target as Element).closest('[data-u]'); if (g) { press(app); mem.sel = Number(g.getAttribute('data-u')); render(); } });
      scene.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element).hasAttribute('data-u')) { mem.sel = Number((e.target as Element).getAttribute('data-u')); render(); } });
      const legend = h('div', { class: 'sc-legend' }, ...([['#2a2e34', 'Boş'], ['#2ECC8F', 'Satıldı'], ['#3E7BFA', 'Kirada'], ['#FF8C32', 'Teklif var']] as const).map(([c, t]) => h('span', { html: `<i style="background:${c}"></i>${t}` })));
      const sel = us.find((u) => u.id === mem.sel);
      body.append(h('div', { class: 'sc-grid' }, h('div', {}, scene, legend), sel ? unitPanel(sel) : overview()));
    }
    // ---------- Teklifler ----------
    else if (mem.tab === 'teklif') {
      const auto = pol.autoMin !== undefined;
      body.append(h('div', { class: 'card', style: 'margin-bottom:8px' }, h('div', { class: 'row', style: 'min-height:46px' }, h('div', { class: 'lbl' }, '🤖 Danışman kendisi kabul etsin', h('small', {}, `Liste fiyatının %${Math.round(AUTO_MIN * 100)}'si ve üstü satış teklifleri beklemeden kabul edilir.`)),
        h('button', { class: 'tog', role: 'switch', 'aria-label': 'Otomatik kabul', 'aria-checked': String(auto), onclick: () => { act('SetAutoSell', { projectId, min: auto ? null : AUTO_MIN }, 'toggle'); } }))));
      if (!offers.length) body.append(h('div', { class: 'card emptyfx', style: 'text-align:center;padding:18px' }, h('div', { style: 'font-size:34px' }, '🚶'), h('b', {}, 'Şu an bekleyen teklif yok'), h('div', { class: 'mute', style: 'font-size:13px;margin-top:4px' }, open ? 'Alıcılar birkaç gün içinde gelir. Daha hızlı olsun istersen Ayarlar\'dan fiyatı düşür ya da ilan hızını artır.' : 'Bina bitince ya da ön satış açılınca alıcılar gelir.')));
      for (const o of offers) body.append(offerCard(o));
    }
    // ---------- Ayarlar ----------
    else {
      const out = h('b', {}, pct(pol.priceMult, 0)), rng = h('input', { type: 'range', min: 80, max: 125, step: 1, value: Math.round(pol.priceMult * 100), 'aria-label': 'Satış fiyatı' }) as HTMLInputElement; rng.style.setProperty('--p', `${((pol.priceMult * 100 - 80) / 45) * 100}%`);
      rng.oninput = () => { out.textContent = `%${rng.value}`; rng.style.setProperty('--p', `${((Number(rng.value) - 80) / 45) * 100}%`); };
      rng.onchange = () => { app.store.run('SetSalesPolicy', { projectId, priceMult: Number(rng.value) / 100 }); };
      const tog = (label: string, sub: string, key: 'agent' | 'presale', dis = '') => h('div', { class: 'row', style: 'min-height:46px' }, h('div', { class: 'lbl' }, label, h('small', {}, dis || sub)), h('button', { class: 'tog', role: 'switch', 'aria-label': label, 'aria-checked': String(pol[key]), onclick: () => { app.audio.sfx('toggle'); app.store.run('SetSalesPolicy', { projectId, [key]: !pol[key] } as never); } }));
      const pace = paceOf(pol), rest = us.filter((u) => u.status !== 'satildi');
      body.append(h('div', { class: 'card' },
        h('div', { class: 'row', style: 'min-height:50px' }, h('div', { class: 'lbl' }, 'Satış fiyatı', h('small', {}, 'Düşük fiyat daha çok teklif getirir; yüksek fiyat kârı artırır ama bekletir.')), h('div', { class: 'offer', style: 'min-width:170px;flex:none' }, rng, out)),
        h('div', { class: 'lbl-s', style: 'margin-top:8px' }, 'İlan hızı'),
        h('div', { class: 'seg', style: 'flex-wrap:wrap' }, ...SIMPLE_PACES.map((id) => { const x = PACES[id]!; return h('button', { class: pace.id === id ? 'on' : '', onclick: () => { act('SetPace', { projectId, pace: id }, 'toggle'); } }, `${x.ico} ${x.label}`); })),
        h('div', { class: 'mute', style: 'font-size:12px;margin:4px 0 8px' }, SIMPLE_PACES.includes(pace.id) ? pace.desc : 'Özel hız seçili; yukarıdan değiştirebilirsin.'),
        tog('Emlakçı', `Alıcı akışı %30 artar · komisyon ${pct(AGENT_FEE, 1)}`, 'agent'),
        tog('Ön satış', `İnşaat sürerken (betonarmeden sonra) %${Math.round((1 - PRESALE_DISCOUNT) * 100)} indirimle, %40 peşin`, 'presale', p.status === 'insaat' && (!p.build || p.build.stage < 8) ? 'Betonarme aşamasından itibaren açılır' : p.status === 'tamamlandi' ? 'Bina bitti; ön satış gerekmiyor' : ''),
        p.status === 'tamamlandi' && rest.length ? h('button', { class: 'btn block', style: 'margin-top:12px', onclick: async () => { const tot = rest.reduce((a, u) => a + Math.round(unitFair(u, perM2) * BULK), 0); if (!(await askConfirm(`Kalan ${rest.length} daire yatırımcıya ${fmt(tot)} bedelle satılsın mı?\n(Adil değerin %92'si; kiradaki daireler de dahil, kiracılar ayrılır.)`))) return; if (act('SellProjectBulk', { projectId }, 'stamp')) toast('Toplu satış yapıldı'); } }, 'Kalanı hemen toplu sat (%92)') : null));
    }
    const sb = card.querySelector('.scb') as HTMLElement | null; if (sb) sb.scrollTop = scroll;
    for (const o of offers) seen.add(o.id);

    // ---- yardımcılar ----
    function overview(): HTMLElement {
      const flow = open && ch.p > 0 ? `daire başına ~${Math.round(1 / ch.p)} günde bir` : '—';
      const hint = h('div', { class: 'card sc-detail' }, h('div', { class: 'lbl-s' }, 'Binayı yönet'), h('p', { class: 'mute', style: 'font-size:13px;margin:0 0 8px' }, 'Bir daireye dokun: satılık ya da kiralık yap. Turuncu balonlu dairelerde bekleyen teklif var.'),
        h('div', {}, ...([['m² fiyatı', fmtM2(perM2)], ['Alıcı akışı', flow], ['Boş daire', String(free.length)]] as [string, string][]).map(([a, b]) => h('div', { class: 'row', style: 'min-height:30px' }, h('div', { class: 'lbl' }, a), h('b', {}, b)))));
      const box = h('div', {}, hint); if (offers.length) box.append(h('div', { class: 'lbl-s', style: 'margin-top:8px' }, 'Bekleyen teklifler'), ...offers.slice(0, 2).map((o) => offerCard(o)));
      return box;
    }
    function unitPanel(u: Unit): HTMLElement {
      const st = unitState(u), list = listPrice(u, perM2, pol), uo = offers.filter((o) => o.unitId === u.id);
      const box = h('div', { class: 'card sc-detail' },
        h('div', { style: 'display:flex;gap:8px;align-items:center' }, h('h3', { style: 'font-size:20px;flex:1' }, `${u.floor}. kat · ${u.rooms} · ${nf(u.area, 0)} m²`), h('span', { class: 'sc-chip' }, ST_LABEL[st]), h('button', { class: 'btn', style: 'min-height:32px;font-size:12px', onclick: () => { mem.sel = null; render(); } }, '✕')));
      if (u.landlord) { box.append(h('div', { class: 'mute', style: 'font-size:13px;padding:6px 0' }, 'Kat karşılığı anlaşması gereği bu daire arsa sahibine ait: satılamaz.')); return box; }
      if (u.status === 'satildi') {
        box.append(h('div', { class: 'row' }, h('div', { class: 'lbl' }, 'Satış bedeli', h('small', {}, `${PAY[u.payment ?? 'pesin']} · ${formatDate(u.soldDay ?? 0)}`)), h('b', { class: 'pos-t' }, fmt(u.price ?? 0))));
        return box;
      }
      box.append(h('div', { class: 'row', style: 'min-height:36px' }, h('div', { class: 'lbl' }, 'Liste fiyatı'), h('b', {}, fmt(list))));
      if (u.rent) {
        box.append(h('div', { class: 'row' }, h('div', { class: 'lbl' }, `Kiracı: ${u.rent.tenant}`, h('small', {}, `${formatDate(u.rent.since)} tarihinden beri`)), h('b', { style: 'color:#6ea0ff' }, `${fmt(u.rent.amount)}/ay`)),
          h('button', { class: 'btn', style: 'margin-top:6px', onclick: async () => { if (await askConfirm('Kira sözleşmesi sonlandırılsın mı?\nDaire yeniden kiralık ilana döner.')) act('EndRent', { unitId: u.id }, 'click'); } }, 'Kirayı sonlandır'));
      } else {
        box.append(h('div', { class: 'seg', style: 'margin:8px 0' }, h('button', { class: u.listing !== 'kira' ? 'on' : '', onclick: () => { act('SetUnit', { unitId: u.id, listing: 'sat', hold: false }, 'toggle'); } }, '🏷️ Satılık'), h('button', { class: u.listing === 'kira' ? 'on' : '', onclick: () => { act('SetUnit', { unitId: u.id, listing: 'kira', hold: false }, 'toggle'); } }, '🔑 Kiralık')),
          h('div', { class: 'mute', style: 'font-size:12px' }, u.listing === 'kira' ? `Kiracılar aylık yaklaşık ${fmt(rentOf(s, p!, u))} kira önerir.` : 'Satılık: alıcı teklifleri gelir.'));
      }
      if (uo.length) box.append(h('div', { class: 'lbl-s', style: 'margin-top:8px' }, 'Bu daire için teklif'), ...uo.map((o) => offerCard(o)));
      return box;
    }
    function offerCard(o: Offer): HTMLElement {
      const u = s.units.find((x) => x.id === o.unitId); if (!u) return h('div', {});
      const price = offerPrice(s, p!, u, o), list = listPrice(u, perM2, pol), diff = o.kind === 'satis' ? o.ratio - 1 : 0, left = Math.max(0, o.until - s.clock.day), tone = diff >= 0.005 ? 'pos-t' : diff >= -0.035 ? 'warn-t' : 'bad-t';
      const kira = o.kind === 'kira';
      const gap = Math.round(Math.abs(diff) * 100), vs = diff >= 0.005 ? `liste fiyatından %${gap} yüksek` : diff <= -0.005 ? `liste fiyatından %${gap} düşük` : 'liste fiyatında';
      const counterRow = mem.counter === o.id ? h('div', { class: 'acts' }, ...[0.02, 0.04, 0.06, 0.09].map((d) => { const r = Math.min(1.2, +(o.ratio + d).toFixed(3)), pr = offerPrice(s, p!, u, { kind: o.kind, ratio: r, pay: o.pay }); return h('button', { class: 'btn', onclick: () => { counter(o, u, r); } }, `${fmt(pr)}`); })) : null;
      return h('div', { class: 'offer-card' },
        h('div', { class: 'av', html: buyerSvg(o.seed, o.profile, 38) }),
        h('div', { class: 'body' },
          h('div', { style: 'display:flex;gap:8px;align-items:baseline;flex-wrap:wrap' }, h('b', {}, o.buyer), h('span', { class: 'mute', style: 'font-size:12px' }, `${u.floor}. kat ${u.rooms} · ${nf(u.area, 0)} m²`), h('span', { class: 'mute', style: 'font-size:12px;margin-left:auto' }, `${left} gün`)),
          h('div', { class: 'pr' }, kira ? `${fmt(price)}/ay` : fmt(price), h('small', { class: kira ? 'mute' : tone }, kira ? 'kira teklifi' : `${vs} · ${PAY[o.pay]}`)),
          h('div', { class: 'tleft', title: `${left} gün sonra gider` }, h('i', { style: `width:${Math.round((left / Math.max(1, o.until - o.day)) * 100)}%` })),
          h('div', { class: 'acts' }, h('button', { class: 'btn gold', onclick: () => { accept(o, u); } }, kira ? '✅ Kirala' : '✅ Kabul et'), h('button', { class: 'btn', onclick: () => { press(app); mem.counter = mem.counter === o.id ? null : o.id; render(); } }, '🤝 Pazarlık'), h('button', { class: 'btn', onclick: () => { act('RejectOffer', { offerId: o.id }, 'click'); } }, '✖')),
          counterRow));
    }
    function accept(o: Offer, u: Unit) { if (act('AcceptOffer', { offerId: o.id }, o.kind === 'kira' ? 'stamp' : 'coin')) { just.add(u.id); setTimeout(() => { just.delete(u.id); }, 1600); toast(o.kind === 'kira' ? `${o.buyer} kiracı oldu` : `${o.buyer} daireyi aldı`, 2400); } }
    function counter(o: Offer, u: Unit, ratio: number) {
      mem.counter = null; if (!act('CounterOffer', { offerId: o.id, ratio }, 'click')) return;
      const done = s.units.find((x) => x.id === u.id), ok = done?.status === 'satildi' || !!done?.rent;
      if (ok) { just.add(u.id); setTimeout(() => { just.delete(u.id); }, 1600); app.audio.sfx('coin'); toast(`${o.buyer} pazarlığı kabul etti`, 2600); } else { app.audio.sfx('error'); toast(`${o.buyer} pazarlığı çok bularak vazgeçti`, 2800); }
    }
  };
  render(); document.body.append(modal);
}
