import { formatDate } from '../../core/calendar';
import { buildingType } from '../../data';
import { offerPrice } from '../../sim/buyers';
import { RENOVATIONS, renovCost, holdAnalysis, INC_POLICIES, arrearsTotal, buildingStats, condOf, depositsTotal, incPct, incPolicy, incomeLabel, marketRent, maintenanceCost, portfolio, tenantOf, tenantProfile } from '../../sim/realestate';
import { unlockState } from '../../sim/unlock';
import { buyerSvg } from '../salesScene';
import { fmt, nf, pct } from '../components';
import { askConfirm, h, press, toast } from '../dom';
import type { App } from '../app';

type Sub = 'portfoy' | 'kiracilar' | 'teklifler' | 'bakim' | 'rapor' | 'politika';
const mem = { sub: 'portfoy' as Sub, filter: 'hepsi' as 'hepsi' | 'kirada' | 'bos' };
export const setEstateSub = (s: string) => { if (['portfoy', 'kiracilar', 'teklifler', 'bakim', 'rapor', 'politika'].includes(s)) mem.sub = s as Sub; };
const STATE_TR = { kirada: 'Kirada', bos: 'Boş', kiralik: 'Kiralık ilan', satilik: 'Satılık', rezerve: 'Rezerve' } as const;

/** Gayrimenkul Yönetimi: portföy, kiracılar, kira teklifleri, bina bakımı, finansal rapor ve kira politikası. */
export function gayrimenkulView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, ul = unlockState(s, 'gayrimenkul');
  if (!ul.open) return h('div', { class: 'card emptyfx', style: 'text-align:center;padding:20px' }, h('div', { style: 'font-size:36px' }, '🔒'), h('b', {}, 'Gayrimenkul Yönetimi henüz kapalı'), ...ul.missing.map((x) => h('div', {}, '• ' + x)));
  const act = (cmd: string, params: object, ok: string, sfx: 'confirm' | 'stamp' | 'coin' = 'confirm') => { const r = app.store.run(cmd as never, params as never); if (r.ok) { app.audio.sfx(sfx); toast(ok); } else { app.audio.sfx('error'); toast(r.error); } refresh(); return r.ok; };
  const rows = portfolio(s), offers = (s.offers ?? []).filter((o) => o.kind === 'kira'), rentedRows = rows.filter((r) => r.state === 'kirada');
  const seg = h('div', { class: 'seg', role: 'tablist', style: 'margin-bottom:10px;align-self:flex-start;max-width:100%;overflow-x:auto' });
  for (const [id, l] of [['portfoy', `Portföy (${rows.length})`], ['kiracilar', `Kiracılar (${rentedRows.length})`], ['teklifler', `Teklifler${offers.length ? ` (${offers.length})` : ''}`], ['bakim', 'Bakım'], ['rapor', 'Rapor'], ['politika', 'Politika']] as [Sub, string][]) seg.append(h('button', { class: mem.sub === id ? 'on' : '', onclick: () => { press(app); mem.sub = id; refresh(); } }, l));
  const body = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
  const k = (l: string, v: string) => h('div', { class: 'kpi', html: `<small>${l}</small><b>${v}</b>` });
  const monthly = rentedRows.reduce((a, r) => a + r.rent, 0), value = rows.reduce((a, r) => a + r.value, 0), cost = rows.reduce((a, r) => a + r.cost, 0), occ = rows.length ? rentedRows.length / rows.length : 0;
  body.append(h('div', { class: 'kpis' }, k('Portföy değeri', fmt(value)), k('Aylık kira', fmt(monthly)), k('Doluluk', pct(occ)), k('Yıllık kira', fmt(monthly * 12)), k('Depozito yükümlülüğü', fmt(depositsTotal(s))), k('Gecikmiş kira', fmt(arrearsTotal(s)))));

  if (mem.sub === 'portfoy') {
    const filt = rows.filter((r) => mem.filter === 'hepsi' || (mem.filter === 'kirada' ? r.state === 'kirada' : r.state !== 'kirada'));
    const t = h('table', { class: 'tbl' }, h('tr', {}, ...['Mülk', 'Tür', 'Durum', 'Değer', 'Kira/ay', 'Net getiri', 'Geri dönüş', 'Sat / Tut'].map((x) => h('th', {}, x))));
    for (const r of filt) t.append(h('tr', {}, h('td', {}, `${r.project.name} · ${r.unit.floor}. kat ${r.unit.rooms}`), h('td', {}, buildingType(r.project.type)?.label ?? r.project.type), h('td', {}, STATE_TR[r.state]), h('td', {}, fmt(r.value)), h('td', {}, r.state === 'kirada' ? fmt(r.rent) : h('span', { class: 'mute' }, `~${fmt(r.rent)}`)), h('td', {}, r.state === 'kirada' ? pct(r.yieldPct, 1) : '—'), h('td', {}, r.payback ? `${r.payback.toFixed(1)} yıl` : '—')));
    body.append(h('div', { class: 'seg' }, ...([['hepsi', 'Hepsi'], ['kirada', 'Kirada'], ['bos', 'Boş / satılık']] as const).map(([id, l]) => h('button', { class: mem.filter === id ? 'on' : '', onclick: () => { mem.filter = id; refresh(); } }, l))),
      h('div', { class: 'card', style: 'overflow:auto' }, filt.length ? t : h('div', { class: 'empty' }, 'Portföyde mülk yok. Biten projeleriniz ve devraldığınız binalar burada görünür; Satış merkezinden daireleri "Kiralık" yapın.'), h('div', { class: 'mute', style: 'font-size:11px;margin-top:6px' }, 'Maliyet, projenin toplam maliyeti ve arsa bedelinin alan oranıyla payıdır. Net getiri: yıllık kira − son 12 ay bakım gideri.')));
  }
  else if (mem.sub === 'kiracilar') {
    body.append(...(rentedRows.length ? rentedRows.map((r) => { const t = tenantOf(s, r.unit)!; return h('div', { class: 'offer-card' }, h('div', { class: 'av', html: buyerSvg(t.seed, 'Kiracı', 38) }), h('div', { class: 'body' },
      h('div', { style: 'display:flex;gap:8px;align-items:baseline;flex-wrap:wrap' }, h('b', {}, t.tenant), h('span', { class: 'mute', style: 'font-size:12px' }, `${r.project.name} · ${r.unit.floor}. kat ${r.unit.rooms}`)),
      h('div', { class: 'pr' }, `${fmt(t.amount)}/ay`, h('small', { class: 'mute' }, `piyasa kirası ${fmt(marketRent(s, r.project, r.unit))}`)),
      h('div', { class: 'mute', style: 'font-size:12px' }, `Ödeme düzeni ${t.pay}/100 · ${incomeLabel(t.income!)} · memnuniyet ${t.sat} · bitiş ${formatDate(t.endDay!)} · depozito ${fmt(t.deposit!)}${t.arrears ? ` · borç ${fmt(t.arrears)}` : ''}${t.renewals ? ` · ${t.renewals}. yenileme` : ''}`),
      h('div', { class: 'tleft' }, h('i', { style: `width:${t.sat}%` })),
      h('div', { class: 'acts' }, h('button', { class: 'btn danger', onclick: async () => { if (await askConfirm(`${t.tenant} tahliye edilsin mi?\nTahliye masrafı ${fmt(Math.round(t.amount * (t.arrears ? 1.5 : 3)))}; depozito borçlara mahsup edilir.`)) act('EvictTenant', { unitId: r.unit.id }, 'Kiracı tahliye edildi', 'stamp'); } }, 'Tahliye et')))); }) : [h('div', { class: 'card empty' }, 'Kiracı yok.')]));
  }
  else if (mem.sub === 'teklifler') {
    body.append(...(offers.length ? offers.map((o) => { const u = s.units.find((x) => x.id === o.unitId), p = s.projects.find((x) => x.id === o.projectId); if (!u || !p) return h('div', {}); const pr = offerPrice(s, p, u, o), tp = tenantProfile(o.seed), mr = marketRent(s, p, u), left = Math.max(0, o.until - s.clock.day);
      return h('div', { class: 'offer-card' }, h('div', { class: 'av', html: buyerSvg(o.seed, o.profile, 38) }), h('div', { class: 'body' },
        h('div', { style: 'display:flex;gap:8px;align-items:baseline;flex-wrap:wrap' }, h('b', {}, o.buyer), h('span', { class: 'mute', style: 'font-size:12px' }, `${o.profile} · ${p.name} ${u.floor}. kat ${u.rooms}`)),
        h('div', { class: 'pr' }, `${fmt(pr)}/ay`, h('small', { class: pr >= mr ? 'pos-t' : 'warn-t' }, `piyasa ${fmt(mr)} · ${pr >= mr ? '+' : ''}${Math.round((pr / mr - 1) * 100)}%`)),
        h('div', { class: 'mute', style: 'font-size:12px' }, `Ödeme düzeni ${tp.pay}/100 · ${incomeLabel(tp.income)} · sözleşme ${tp.months} ay · depozito ${fmt(pr * 2)} · ${o.note}`),
        h('div', { class: 'acts' }, h('button', { class: 'btn gold', onclick: () => act('AcceptOffer', { offerId: o.id }, `${o.buyer} kiracı oldu`, 'stamp') }, '✅ Kirala'), h('button', { class: 'btn', onclick: () => act('CounterOffer', { offerId: o.id, ratio: Math.min(1.2, +(o.ratio + 0.05).toFixed(3)) }, 'Karşı teklif gönderildi', 'confirm') }, '🤝 +%5 iste'), h('button', { class: 'btn', onclick: () => act('RejectOffer', { offerId: o.id }, 'Teklif reddedildi', 'confirm') }, '✖ Reddet'), h('span', { class: 'mute', style: 'font-size:11px;align-self:center' }, `${left} gün`)))); }) : [h('div', { class: 'card empty' }, 'Bekleyen kira teklifi yok. Satış merkezinde bir daireyi "Kiralık" yapın; kiracılar teklifle gelir.')]));
  }
  else if (mem.sub === 'bakim') {
    const bl = s.projects.filter((p) => p.status === 'tamamlandi' && buildingStats(s, p).units > 0);
    body.append(...(bl.length ? bl.map((p) => { const st = buildingStats(s, p), c = maintenanceCost(s, p); return h('div', { class: 'card' }, h('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' }, h('h3', { style: 'font-size:18px;flex:1' }, p.name), h('span', { class: `chip ${st.cond >= 70 ? 'good' : st.cond < 45 ? 'warn' : ''}` }, `Durum ${st.cond}/100`)),
      h('div', { class: 'meter', style: 'margin:6px 0' }, h('i', { style: `width:${st.cond}%;background:${st.cond >= 70 ? 'var(--ok)' : st.cond >= 45 ? 'var(--warn)' : 'var(--bad)'}` })),
      h('div', { class: 'mute', style: 'font-size:12px' }, `${st.units} birim · doluluk ${pct(st.occupancy)} · son 12 ay kira ${fmt(st.income12)} · bakım ${fmt(st.maint12)}. Düşük durum arıza olasılığını, değer kaybını ve kiracı memnuniyetsizliğini artırır.`),
      h('div', { class: 'row', style: 'min-height:38px;margin-top:6px' }, h('div', { class: 'lbl' }, '📢 Kira ilanı reklamı', h('small', {}, 'Boş kiralık dairelerde kiracı gelme sıklığı +%25/seviye; ilan başına aylık gider')), h('div', { class: 'seg' }, ...['Yok', 'Standart', 'Öne çıkan', 'Premium'].map((l, i) => h('button', { class: (p.rentAd ?? 0) === i ? 'on' : '', style: 'min-height:34px;font-size:12px', onclick: () => act('SetRentAd', { projectId: p.id, level: i }, 'Reklam ayarı kaydedildi') }, l)))),
      h('div', { class: 'lbl-s', style: 'margin-top:8px' }, 'Yenileme (kalıcı değer ve kira artışı)'), h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, ...Object.entries(RENOVATIONS).map(([k, d]) => { const done = p.renov?.[k] !== undefined && s.clock.day - p.renov[k]! < 730; return h('button', { class: 'btn', style: 'min-height:36px;font-size:12px;flex-direction:column;height:auto;padding:5px 9px', disabled: done || (d.minFloors !== undefined && (p.floors ?? 0) < d.minFloors) || s.company!.cash < renovCost(s, p, k), onclick: async () => { if (await askConfirm(`${d.label} için ${fmt(renovCost(s, p, k))} harcansın mı? Durum +${d.cond}, değer ve kira +%${Math.round(d.bonus * 100)}.`)) act('RenovateBuilding', { projectId: p.id, kind: k }, `${d.label} tamamlandı`, 'stamp'); } }, h('b', {}, d.label), h('small', {}, done ? 'yapıldı' : fmt(renovCost(s, p, k)))); })),
      h('button', { class: 'btn gold', style: 'margin-top:6px', disabled: s.company!.cash < c || condOf(p) >= 99, onclick: () => act('MaintainBuilding', { projectId: p.id }, 'Bakım yapıldı: bina durumu yükseldi', 'confirm') }, `Bakım yatırımı (+12 durum) · ${fmt(c)}`)); }) : [h('div', { class: 'card empty' }, 'Bakım gerektiren bina yok.')]));
  }
  else if (mem.sub === 'rapor') {
    const t = h('table', { class: 'tbl' }, h('tr', {}, ...['Bina', 'Birim', 'Doluluk', 'Maliyet', 'Değer', 'Yıllık kira', 'Bakım (12 ay)', 'Net getiri', 'Geri dönüş'].map((x) => h('th', {}, x))));
    const byP = new Map<number, typeof rows>(); for (const r of rows) (byP.get(r.project.id) ?? byP.set(r.project.id, []).get(r.project.id)!).push(r);
    let tc = 0, tv = 0, ty = 0, tm = 0;
    for (const [, rs] of byP) { const p = rs[0]!.project, c = rs.reduce((a, r) => a + r.cost, 0), v = rs.reduce((a, r) => a + r.value, 0), y = rs.reduce((a, r) => a + r.yearly, 0), m = rs.reduce((a, r) => a + r.maint, 0), net = y - m, st = buildingStats(s, p); tc += c; tv += v; ty += y; tm += m;
      t.append(h('tr', {}, h('td', {}, p.name), h('td', {}, String(rs.length)), h('td', {}, pct(st.occupancy)), h('td', {}, fmt(c)), h('td', {}, fmt(v)), h('td', {}, fmt(y)), h('td', {}, fmt(m)), h('td', {}, v > 0 ? pct(net / v, 1) : '—'), h('td', {}, net > 0 ? `${(c / net).toFixed(1)} yıl` : '—'), (() => { const a = holdAnalysis(s, rs); return h('td', { title: `Brüt %${(a.gross * 100).toFixed(1)} · net %${(a.net * 100).toFixed(1)} · değer artışı %${(a.growth * 100).toFixed(1)} · mevduat alternatifi %${(a.alt * 100).toFixed(1)} · satışta nakit ${fmt(a.saleCash)}` }, a.advice === 'tut' ? '✔ Tut' : '⚠ Sat'); })())); }
    t.append(h('tr', { class: 'tot' }, h('td', {}, 'Toplam'), h('td', {}, String(rows.length)), h('td', {}, pct(occ)), h('td', {}, fmt(tc)), h('td', {}, fmt(tv)), h('td', {}, fmt(ty)), h('td', {}, fmt(tm)), h('td', {}, tv > 0 ? pct((ty - tm) / tv, 1) : '—'), h('td', {}, ty - tm > 0 ? `${(tc / (ty - tm)).toFixed(1)} yıl` : '—')));
    body.append(h('div', { class: 'card', style: 'overflow:auto' }, h('div', { class: 'lbl-s' }, 'Gayrimenkul finansal raporu'), rows.length ? t : h('div', { class: 'empty' }, 'Rapor için portföy gerekir.'), h('div', { class: 'mute', style: 'font-size:11px;margin-top:6px' }, `Piyasa değeri bina durumuna göre ayarlıdır. Kira geliri konsolide gelir tablosunda "Kira geliri" kaleminde ve Holding özetinde Gayrimenkul bölümünde görünür.`)));
  }
  else {
    const pol = incPolicy(s);
    body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Kira artış politikası'), h('div', { class: 'mute', style: 'font-size:12px;margin-bottom:6px' }, `Sözleşme yenilemede uygulanır (şu an %${incPct(s).toFixed(1)}). Yüksek artış kiracının ayrılma olasılığını yükseltir; kira piyasanın %15 üstüne çıkamaz.`),
      h('div', { class: 'seg', style: 'flex-wrap:wrap' }, ...(Object.keys(INC_POLICIES) as (keyof typeof INC_POLICIES)[]).map((id) => h('button', { class: pol === id ? 'on' : '', onclick: () => act('SetRentPolicy', { policy: id }, 'Kira politikası güncellendi', 'confirm') }, INC_POLICIES[id].label)))));
    const free = rows.filter((r) => r.state !== 'kirada').slice(0, 12);
    body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Boş birimlerde kira fiyatı'), ...(free.length ? free.map((r) => h('div', { class: 'row', style: 'min-height:46px' }, h('div', { class: 'lbl' }, `${r.project.name} · ${r.unit.floor}. kat ${r.unit.rooms}`, h('small', {}, `Aylık kira ~${fmt(r.rent)} · ${STATE_TR[r.state]}`)), (() => { const out = h('b', {}, `%${Math.round((r.unit.radj ?? 1) * 100)}`), rng = h('input', { type: 'range', min: 80, max: 130, step: 5, value: Math.round((r.unit.radj ?? 1) * 100), 'aria-label': 'Kira çarpanı' }) as HTMLInputElement; rng.oninput = () => { out.textContent = `%${rng.value}`; }; rng.onchange = () => act('SetRentAdj', { unitId: r.unit.id, radj: Number(rng.value) / 100 }, 'Kira fiyatı güncellendi', 'confirm'); return h('div', { class: 'offer', style: 'min-width:170px;flex:none' }, rng, out); })())) : [h('div', { class: 'empty' }, 'Boş birim yok.')])));
  }
  void nf; return h('div', { style: 'display:flex;flex-direction:column' }, seg, body);
}
