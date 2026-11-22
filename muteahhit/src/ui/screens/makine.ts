import { formatDate } from '../../core/calendar';
import { MACHINES, STAGES, machine } from '../../data';
import { TL } from '../../core/money';
import { SERVICE, activeLeases, condM, hoursM, isRentedOut, leaseDaily, machineEconomics, machineValue, operatorCount, operatorRequired, rentOutDaily, serviceCost } from '../../sim/machines';
import { unlockState } from '../../sim/unlock';
import { machineArt } from '../art';
import { fmt, pct } from '../components';
import { askConfirm, h, press, toast } from '../dom';
import type { App } from '../app';

type Sub = 'park' | 'yeni' | 'ikinci' | 'kiralama' | 'operator' | 'rapor';
const mem = { sub: 'park' as Sub };
export const setMakineSub = (s: string) => { if (['park', 'yeni', 'ikinci', 'kiralama', 'operator', 'rapor'].includes(s)) mem.sub = s as Sub; };

/** Makine Parkı: park durumu (saat, durum, yakıt), yeni ve ikinci el alım, kiralama ve kiraya verme, operatörler ve ekonomik rapor. */
export function makineView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!, ul = unlockState(s, 'makine');
  if (!ul.open) return h('div', { class: 'card emptyfx', style: 'text-align:center;padding:20px' }, h('div', { style: 'font-size:36px' }, '🔒'), h('b', {}, 'Makine Parkı henüz kapalı'), ...ul.missing.map((x) => h('div', {}, '• ' + x)), h('div', { class: 'mute', style: 'font-size:12px;margin-top:8px' }, 'Bu arada Operasyon › Makine sekmesinden makine alabilirsiniz.'));
  const act = (cmd: string, params: object, ok: string, sfx: 'confirm' | 'stamp' | 'coin' = 'confirm') => { const r = app.store.run(cmd as never, params as never); if (r.ok) { app.audio.sfx(sfx); toast(ok); } else { app.audio.sfx('error'); toast(r.error); } refresh(); return r.ok; };
  const seg = h('div', { class: 'seg', role: 'tablist', style: 'margin-bottom:10px;align-self:flex-start;max-width:100%;overflow-x:auto' });
  for (const [id, l] of [['park', `Park (${s.machines.length})`], ['yeni', 'Yeni alım'], ['ikinci', 'İkinci el'], ['kiralama', 'Kiralama'], ['operator', `Operatörler (${operatorCount(s)})`], ['rapor', 'Rapor']] as [Sub, string][]) seg.append(h('button', { class: mem.sub === id ? 'on' : '', onclick: () => { press(app); mem.sub = id; refresh(); } }, l));
  const body = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
  const fleetVal = s.machines.reduce((a, m) => a + machineValue(s, m), 0), needOp = s.machines.filter((m) => machine(m.type)?.op).length, inUse = s.machines.filter((m) => m.usedDay === s.clock.day).length, out = s.machines.filter((m) => isRentedOut(s, m)).length;
  const k = (l: string, v: string) => h('div', { class: 'kpi', html: `<small>${l}</small><b>${v}</b>` });
  body.append(h('div', { class: 'kpis' }, k('Park değeri', fmt(fleetVal)), k('Çalışan', `${inUse}/${s.machines.length}`), k('Kirada (verilen)', String(out)), k('Operatör', `${operatorCount(s)} / ${needOp}`), k('Kiralık (alınan)', String(activeLeases(s).length))));
  if (operatorRequired(s) && needOp > operatorCount(s)) body.append(h('div', { class: 'alert' }, h('span', { class: 'dot warn' }), h('span', {}, `Operatör yetersiz: ${needOp} makine operatör gerektiriyor, ${operatorCount(s)} operatörünüz var. Operatörsüz makine o gün kiralanır (ek maliyet). Operatörler sekmesinden işe alın.`)));

  if (mem.sub === 'park') {
    body.append(...(s.machines.length ? s.machines.map((m) => { const d = machine(m.type)!, broken = m.brokenUntil > s.clock.day, rented = isRentedOut(s, m), val = machineValue(s, m), cond = condM(m), e = machineEconomics(s, m);
      return h('div', { class: 'card mcard' }, h('div', { class: 'mart', html: machineArt(m.type, broken ? 'broken' : m.usedDay === s.clock.day ? 'ok' : 'idle') }), h('div', { style: 'flex:1;min-width:0' },
        h('div', { style: 'display:flex;gap:6px;align-items:center;flex-wrap:wrap' }, h('b', {}, d.label), m.used ? h('span', { class: 'chip' }, 'İkinci el') : null, h('span', { class: `chip ${broken ? 'bad' : rented ? 'warn' : m.usedDay === s.clock.day ? 'good' : ''}` }, broken ? `⚠️ Arızalı · ${formatDate(m.brokenUntil)}` : rented ? `Kirada · ${formatDate(m.rentedOut!.until)}` : m.usedDay === s.clock.day ? 'Şantiyede' : 'Boşta'), d.op ? h('span', { class: 'chip' }, '👷 operatör') : null),
        h('div', { class: 'gauge2' }, h('span', {}, 'Durum'), h('div', { class: 'meter' }, h('i', { style: `width:${cond}%;background:var(--${cond > 60 ? 'ok' : cond > 35 ? 'warn' : 'bad'})` })), h('b', {}, `${Math.round(cond)}`)),
        h('div', { class: 'mute', style: 'font-size:11px;margin:2px 0' }, `${d.cap} · ${hoursM(m).toLocaleString('tr-TR')} saat · yakıt ${fmt(m.fuelSpent ?? 0)} · bakım ${fmt(m.maintSpent ?? 0)}${m.income ? ` · kira geliri ${fmt(m.income)}` : ''} · değer ${fmt(val)}`),
        h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-top:4px' },
          h('button', { class: 'btn', style: 'min-height:34px;font-size:12px', disabled: rented || cond >= 99 || c.cash < serviceCost(s, m, 'bakim'), onclick: () => act('ServiceMachine', { machineId: m.id, kind: 'bakim' }, 'Bakım yapıldı') }, `🔧 Bakım · ${fmt(serviceCost(s, m, 'bakim'))}`),
          h('button', { class: 'btn', style: 'min-height:34px;font-size:12px', disabled: rented || cond >= 99 || c.cash < serviceCost(s, m, 'buyuk'), onclick: () => act('ServiceMachine', { machineId: m.id, kind: 'buyuk' }, 'Büyük bakım yapıldı') }, `🛠️ Büyük bakım · ${fmt(serviceCost(s, m, 'buyuk'))}`),
          rented ? h('button', { class: 'btn', style: 'min-height:34px;font-size:12px', onclick: () => act('RecallMachine', { machineId: m.id }, 'Makine geri çağrıldı', 'stamp') }, 'Geri çağır') : h('button', { class: 'btn', style: 'min-height:34px;font-size:12px', disabled: broken, onclick: async () => { const ok = await askConfirm(`${d.label} kiraya verilsin mi?\nGünlük ${fmt(rentOutDaily(s, m))} (piyasa kirasının %60'ı), 60 gün. Bu sürede şantiyelerde kullanılamaz, yıpranır ve hasar riski vardır.`, 'Kiraya ver'); if (ok) act('RentOutMachine', { machineId: m.id, days: 60 }, 'Makine kiraya verildi', 'stamp'); } }, `🤝 Kiraya ver · ${fmt(rentOutDaily(s, m))}/gün`),
          h('button', { class: 'btn danger', style: 'min-height:34px;font-size:12px', disabled: rented, onclick: async () => { if (await askConfirm(`${d.label} satılsın mı? (değerinin %90'ı: ${fmt(Math.round(val * 0.9))})`)) act('SellMachine', { machineId: m.id }, 'Makine satıldı', 'coin'); } }, 'Sat')),
        h('div', { class: 'mute', style: 'font-size:11px;margin-top:4px' }, `Kendi makinen: ~${fmt(e.ownDaily)}/kullanım günü · dışarıdan kira ${fmt(e.rentDaily)}/gün · yılda ${e.breakEvenDays} günden fazla kullanırsan satın almak kârlı`))); }) : [h('div', { class: 'card empty' }, 'Makineniz yok. Gerekli makineler şantiyede günlük kiralanır; sahip olmak kullanım yeterliyse daha ucuzdur.')]));
  }
  else if (mem.sub === 'yeni') {
    body.append(h('div', { class: 'hire' }, ...MACHINES.map((d) => { const used = STAGES.filter((st) => st.machines?.includes(d.id)).map((st) => st.label); return h('div', { class: 'card mcat' }, h('div', { class: 'mart', html: machineArt(d.id) }), h('h3', { style: 'margin-top:8px' }, d.label), h('small', {}, `${d.cap}${d.op ? ' · operatör gerekir' : ''}`), h('small', {}, `Kira ${fmt(TL(d.rentTL))}/gün · yakıt ${fmt(TL(d.fuelTL))}/gün · bakım ${fmt(TL(d.maintTL))}/ay · yıllık amortisman %${Math.round(d.dep * 100)}`), h('small', { class: 'mute' }, `Kullanıldığı aşamalar: ${used.join(', ') || '—'}`),
      h('button', { class: 'btn', style: 'min-height:40px', disabled: c.cash < Math.round(TL(d.priceTL) * 0.2), onclick: () => { const r = app.store.run('BuyMachine', { type: d.id, financed: true }); if (r.ok) { press(app, 'confirm'); toast(`${d.label} kredili alındı.`); } else toast(r.error); refresh(); } }, `Kredili · ${fmt(Math.round(TL(d.priceTL) * 0.2))} peşin`),
      h('button', { class: 'btn gold', style: 'min-height:40px', disabled: c.cash < TL(d.priceTL), onclick: () => act('BuyMachine', { type: d.id }, `${d.label} satın alındı`, 'coin') }, `Satın al · ${fmt(TL(d.priceTL))}`)); })));
  }
  else if (mem.sub === 'ikinci') {
    body.append(h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'İkinci el ilanları'), h('div', { class: 'mute', style: 'font-size:12px;margin-bottom:6px' }, 'Daha ucuz ama yaşlı ve yıpranmış: arıza olasılığı yüksek, bakım ihtiyacı fazla. İlanlar 60 gün açık kalır, aylık yenilenir.'), ...((s.usedMarket ?? []).length ? s.usedMarket!.map((o) => { const d = machine(o.type)!; return h('div', { class: 'row', style: 'min-height:56px' }, h('div', { class: 'lbl' }, `${d.label} · ${o.age} yaşında`, h('small', {}, `${o.hours.toLocaleString('tr-TR')} saat · durum ${o.cond}/100 · yeni fiyatın %${Math.round((o.price / (TL(d.priceTL) * s.costIndex)) * 100)}'i`)), h('button', { class: 'btn gold', style: 'min-height:36px;font-size:12px', disabled: c.cash < o.price, onclick: () => act('BuyUsed', { offerId: o.id }, `${d.label} (ikinci el) alındı`, 'coin') }, fmt(o.price))); }) : [h('div', { class: 'empty' }, 'İlan yok. Ay başında yenilenir.')])));
  }
  else if (mem.sub === 'kiralama') {
    const ls = activeLeases(s);
    body.append(h('div', { class: 'cols' }, h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Uzun dönem kiralama (operatörlü)'), h('div', { class: 'mute', style: 'font-size:12px;margin-bottom:6px' }, 'Günlük kiranın %75\'i, her ay peşin; şantiyelerde operatör dahil kullanılır (yalnızca yakıt ayrıca). Fesih bedeli 1 aylık kira.'),
      ...MACHINES.map((d) => { const has = ls.some((l) => l.type === d.id); return h('div', { class: 'row', style: 'min-height:46px' }, h('div', { class: 'lbl' }, d.label, h('small', {}, `${fmt(leaseDaily(s, d.id))}/gün · ay ${fmt(leaseDaily(s, d.id) * 30)}`)), has ? h('span', { class: 'chip good' }, 'Kirada') : h('div', { class: 'seg' }, ...([3, 6, 12] as const).map((mo) => h('button', { disabled: c.cash < leaseDaily(s, d.id) * 30, onclick: () => act('LeaseMachine', { type: d.id, months: mo }, `${d.label} kiralandı (${mo} ay)`, 'stamp') }, `${mo}a`)))); })),
      h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, `Aktif kiralamalar (${ls.length})`), ...(ls.length ? ls.map((l) => h('div', { class: 'row', style: 'min-height:46px' }, h('div', { class: 'lbl' }, machine(l.type)!.label, h('small', {}, `Bitiş ${formatDate(l.endDay)} · ${fmt(l.daily * 30)}/ay`)), h('button', { class: 'btn danger', style: 'min-height:34px;font-size:12px', onclick: async () => { if (await askConfirm(`Kiralama feshedilsin mi?\nFesih bedeli ${fmt(l.daily * 30)}.`)) act('EndLease', { id: l.id }, 'Kiralama feshedildi', 'stamp'); } }, 'Feshet'))) : [h('div', { class: 'empty' }, 'Aktif kiralama yok.')]))));
  }
  else if (mem.sub === 'operator') {
    const ops = s.staff.filter((x) => x.type === 'operator');
    body.append(h('div', { class: 'cols' }, h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Operatörler'), h('div', { class: 'mute', style: 'font-size:12px;margin-bottom:6px' }, 'Makine Parkı açıldıktan sonra operatör gerektiren makineleri operatör çalıştırır; bir operatör aynı gün tek makine kullanır. Operatörler Operasyon › Ekip listesinde de görünür.'),
      h('button', { class: 'btn gold block', disabled: c.cash < 100, onclick: () => act('HireStaff', { type: 'operator' }, 'Operatör işe alındı', 'confirm') }, '+ Operatör işe al'),
      ...(ops.length ? ops.map((o) => h('div', { class: 'row', style: 'min-height:46px' }, h('div', { class: 'lbl' }, o.name, h('small', {}, `Moral ${Math.round(o.morale)} · deneyim ${Math.round(o.experience)} · ${fmt(o.salary)}/ay`)))) : [h('div', { class: 'empty' }, 'Operatör yok.')])),
      h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Operatör gerektiren makineler'), ...s.machines.filter((m) => machine(m.type)?.op).map((m) => h('div', { class: 'row', style: 'min-height:34px' }, h('div', { class: 'lbl' }, machine(m.type)!.label), h('span', { class: 'mute' }, m.usedDay === s.clock.day ? 'çalışıyor' : 'boşta'))), s.machines.some((m) => machine(m.type)?.op) ? null : h('div', { class: 'empty' }, 'Operatör gerektiren makineniz yok.'))));
  }
  else {
    const t = h('table', { class: 'tbl' }, h('tr', {}, ...['Makine', 'Yaş', 'Saat', 'Yakıt', 'Bakım', 'Gelir', 'Değer', 'Kendi/gün', 'Kira/gün'].map((x) => h('th', {}, x))));
    for (const m of s.machines) { const e = machineEconomics(s, m); t.append(h('tr', {}, h('td', {}, machine(m.type)!.label), h('td', {}, `${e.yearsOwned.toFixed(1)}y`), h('td', {}, hoursM(m).toLocaleString('tr-TR')), h('td', {}, fmt(m.fuelSpent ?? 0)), h('td', {}, fmt(m.maintSpent ?? 0)), h('td', {}, fmt(m.income ?? 0)), h('td', {}, fmt(machineValue(s, m))), h('td', { class: e.ownDaily < e.rentDaily ? 'pos' : 'neg' }, fmt(e.ownDaily)), h('td', {}, fmt(e.rentDaily)))); }
    body.append(h('div', { class: 'card', style: 'overflow:auto' }, h('div', { class: 'lbl-s' }, 'Makine ekonomisi'), s.machines.length ? t : h('div', { class: 'empty' }, 'Rapor için makine gerekir.'), h('div', { class: 'mute', style: 'font-size:11px;margin-top:6px' }, `Kendi/gün = yıllık sabit maliyet (amortisman + bakım + operatör payı) ÷ kullanım günü + yakıt. Yeşil: sahip olmak kiralamadan ucuz. Park kullanım oranı: ${pct(s.machines.length ? s.machines.reduce((a, m) => a + machineEconomics(s, m).utilization, 0) / s.machines.length : 0)}.`)));
  }
  void SERVICE; return h('div', { style: 'display:flex;flex-direction:column' }, seg, body);
}
