import { formatDate } from '../../core/calendar';
import { BULK } from '../../sim/sales';
import { fairPerM2, listPrice, saleChance, unitFair, unitsOf, receivablesTotal, PRESALE_DISCOUNT, AGENT_FEE } from '../../sim/sales';
import { h, press, toast } from '../dom';
import { colored, fmt, fmtM2, nf, pct } from '../components';
import type { App } from '../app';

const FACE: Record<string, string> = { K: 'Kuzey', G: 'Güney', D: 'Doğu', B: 'Batı' };
const PAY: Record<string, string> = { pesin: 'Peşin', taksit: 'Taksit', onsatis: 'Ön satış' };

/** Satış Merkezi: fiyat/emlakçı/taksit/ön satış politikası, daire listesi, tahsilat ve müşteri durumu. */
export function openSales(app: App, projectId: number, onClose?: () => void): void {
  const body = h('div', { class: 'bd' });
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Satış merkezi' }, h('div', { class: 'card pfile', style: 'width:min(980px,97vw)' }, body));
  const close = () => { modal.remove(); onClose?.(); };
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  const unsub = app.store.subscribe((evs) => { if (!modal.isConnected) { unsub(); return; } if (evs.some((e) => ['UNIT_SOLD', 'KAPORA', 'KAPORA_CANCELLED', 'SALES_POLICY', 'PROJECT_SOLD', 'BULK_SOLD', 'DELIVERED', 'MONTH', 'PROJECT_COMPLETED', 'DEFAULT'].includes(e.type))) render(); });

  const render = () => {
    const s = app.store.state, p = s.projects.find((x) => x.id === projectId);
    if (!p || !p.sales) { close(); return; }
    const keep = body.querySelector('.tscroll')?.scrollTop ?? 0;
    const pol = p.sales, us = unitsOf(s, p.id), sold = us.filter((u) => u.status === 'satildi'), perM2 = fairPerM2(s, p), ch = saleChance(s, p, pol);
    const open = p.status === 'tamamlandi' || (p.status === 'insaat' && pol.presale && !!p.build && p.build.stage >= 8);
    const avgDays = ch.p > 0 ? 1 / ch.p : Infinity, left = us.filter((u) => u.status !== 'satildi').length;
    const demandLabel = ch.p * 30 > 0.35 ? 'Yüksek' : ch.p * 30 > 0.18 ? 'Orta' : 'Düşük', recv = receivablesTotal(s);
    body.innerHTML = '';
    body.append(h('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:6px' }, h('h2', { style: 'font-size:26px;flex:1' }, `Satış merkezi · ${p.name}`), h('button', { class: 'btn', onclick: () => { press(app); close(); } }, 'Kapat')));
    // özet
    body.append(h('div', { class: 'kpis', style: 'margin-bottom:8px' },
      h('div', { class: 'kpi', html: `<small>Satılan</small><b>${sold.length}/${us.length}</b>` }), h('div', { class: 'kpi', html: `<small>Sözleşme geliri</small><b>${fmt(pol.contract)}</b>` }), h('div', { class: 'kpi', html: `<small>Tahsil edilecek</small><b>${fmt(recv)}</b>` })));
    // politika
    const out = h('b', {}, pct(pol.priceMult, 0)), rng = h('input', { type: 'range', min: 80, max: 125, step: 1, value: Math.round(pol.priceMult * 100), 'aria-label': 'Fiyat çarpanı' }) as HTMLInputElement; rng.style.setProperty('--p', `${((pol.priceMult * 100 - 80) / 45) * 100}%`);
    rng.oninput = () => { out.textContent = `%${rng.value}`; rng.style.setProperty('--p', `${((Number(rng.value) - 80) / 45) * 100}%`); };
    rng.onchange = () => { app.store.run('SetSalesPolicy', { projectId, priceMult: Number(rng.value) / 100 }); };
    const tog = (label: string, sub: string, key: 'agent' | 'installments' | 'presale', dis = '') => h('div', { class: 'row', style: 'min-height:46px' }, h('div', { class: 'lbl' }, label, h('small', {}, dis || sub)),
      h('button', { class: 'tog', role: 'switch', 'aria-label': label, 'aria-checked': String(pol[key]), onclick: () => { app.audio.sfx('toggle'); app.store.run('SetSalesPolicy', { projectId, [key]: !pol[key] } as never); } }));
    out.textContent = pct(pol.priceMult, 0);
    body.append(h('div', { class: 'cols' },
      h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Satış politikası'),
        h('div', { class: 'row', style: 'min-height:50px' }, h('div', { class: 'lbl' }, 'Fiyat (adil değere göre)', h('small', {}, 'Düşük fiyat hızlı satar, yüksek fiyat kârı artırır ama bekletir')), h('div', { class: 'offer', style: 'min-width:190px;flex:none' }, rng, out)),
        tog('Emlakçı', `Satışı %30 hızlandırır · komisyon ${pct(AGENT_FEE, 1)}`, 'agent'), tog('Taksitli satış', 'Fiyat +%6, %25 peşin, 12 ay vade (temerrüt riski)', 'installments'),
        tog('Ön satış', `İnşaat sürerken (betonarmeden sonra) %${Math.round((1 - PRESALE_DISCOUNT) * 100)} indirimle, %40 peşin`, 'presale', p.status === 'insaat' && (!p.build || p.build.stage < 8) ? 'Betonarme aşamasından itibaren açılır' : p.status === 'tamamlandi' ? 'Bina bitti; ön satış gerekmiyor' : '')),
      h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Piyasa görünümü'),
        h('div', { class: 'kv' }, ...[['Satışa açık', open ? 'Evet' : 'Hayır (bina bitince ya da ön satışla)'], ['Talep', `${demandLabel} (piyasa ${ch.demand.toFixed(2)} · marka ${ch.brand.toFixed(2)})`], ['Tahmini satış hızı', Number.isFinite(avgDays) && open ? `daire başına ~${Math.round(avgDays)} gün` : '—'], ['m² adil fiyat', fmtM2(perM2)], ['Müşteri memnuniyeti', String(s.company!.satisfaction)], ['Satılmamış', `${left} daire`]].flatMap(([a, b]) => [h('span', {}, a!), h('span', {}, b!)])),
        p.status === 'tamamlandi' && left > 0 ? h('button', { class: 'btn block', style: 'margin-top:10px', onclick: () => { const tot = us.filter((u) => u.status !== 'satildi').reduce((a, u) => a + Math.round(unitFair(u, perM2) * BULK), 0); if (!confirm(`Kalan ${left} daire yatırımcıya ${fmt(tot)} bedelle satılsın mı? (adil değerin %92'si)`)) return; const r = app.store.run('SellProjectBulk', { projectId }); if (r.ok) { press(app, 'confirm', 'medium'); toast('Kalan daireler toplu satıldı.'); } else toast(r.error); } }, `Kalanları toplu sat (%92)`) : null)));
    // daire tablosu
    const t = h('table', { class: 'tbl' }, h('tr', {}, ...['Kat', 'Oda', 'm²', 'Manzara', 'Cephe', 'Liste fiyatı', 'Durum'].map((x) => h('th', {}, x))));
    for (const u of us) {
      const st = u.status === 'satildi' ? h('span', { class: 'pos' }, `${PAY[u.payment ?? 'pesin']} · ${fmt(u.price ?? 0)}${u.delivered ? ` · ☺ ${u.sat ?? '-'}` : ''}`) : u.status === 'kapora' ? h('span', { class: 'warn' }, `Kapora (${formatDate(u.kaporaUntil ?? 0)})`) : h('span', { class: 'mute' }, 'Boş');
      t.append(h('tr', {}, h('td', {}, String(u.floor)), h('td', {}, u.rooms), h('td', {}, nf(u.area, 0)), h('td', {}, String(u.view)), h('td', {}, FACE[u.facing]!), h('td', {}, fmt(listPrice(u, perM2, pol))), h('td', {}, st)));
    }
    body.append(h('div', { class: 'card tscroll', style: 'margin-top:8px;max-height:200px;overflow:auto' }, h('div', { class: 'lbl-s' }, 'Daireler'), t));
    void colored;
    (body.querySelector('.tscroll') as HTMLElement).scrollTop = keep;
  };
  render(); document.body.append(modal);
}
