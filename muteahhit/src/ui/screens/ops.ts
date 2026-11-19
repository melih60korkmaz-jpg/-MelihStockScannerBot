import { formatDate } from '../../core/calendar';
import { TL } from '../../core/money';
import { MACHINES, MATERIALS, OFFICES, STAFF_TYPES, STAGES, SUPPLIERS, machine, officeFor, supplier } from '../../data';
import { incomingQty, leadDays, stockQty, unitPrice } from '../../sim/materials';
import { machineValue } from '../../sim/machines';
import { h, press, toast } from '../dom';
import { fmt, nf, pct } from '../components';
import type { App } from '../app';

type Sub = 'ekip' | 'malzeme' | 'makine' | 'politika';
const mem = { sub: 'ekip' as Sub };
const FIELD = new Set(['isci', 'usta', 'kalipci', 'demirci', 'elektrikci', 'tesisatci', 'santiye_sefi']);
const QUAL = { '-1': 'C', '0': 'B', '1': 'A' } as Record<string, string>;

/** Operasyon sekmesi: ekip ataması ve moral, malzeme stoğu/sipariş, makine parkı, güvenlik ve satın alma politikaları. */
export function opsView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state;
  const seg = h('div', { class: 'seg', role: 'tablist', style: 'margin-bottom:10px;align-self:flex-start' });
  for (const [id, l] of [['ekip', 'Ekip'], ['malzeme', 'Malzeme'], ['makine', 'Makine'], ['politika', 'Politika']] as const) seg.append(h('button', { class: mem.sub === id ? 'on' : '', role: 'tab', onclick: () => { press(app); mem.sub = id; refresh(); } }, l));
  const body = mem.sub === 'ekip' ? team(app, refresh) : mem.sub === 'malzeme' ? materials(app, refresh) : mem.sub === 'makine' ? machines(app, refresh) : policy(app, refresh);
  void s; return h('div', { style: 'display:flex;flex-direction:column' }, seg, body);
}

function team(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!, cap = officeFor(c.office).capacity, payroll = s.staff.reduce((a, x) => a + x.salary, 0);
  const projects = s.projects.filter((p) => p.status === 'insaat' || p.status === 'taslak');
  const avgMorale = s.staff.length ? Math.round(s.staff.reduce((a, x) => a + x.morale, 0) / s.staff.length) : 0;
  const list = h('div', { class: 'card' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px' }, h('div', { class: 'lbl-s', style: 'margin:0' }, `Çalışanlar ${s.staff.length}/${cap}`), h('span', { class: 'mute', style: 'font-size:12px' }, `Aylık maaş ${fmt(payroll)} · ortalama moral ${avgMorale}`)),
    ...(s.staff.length ? s.staff.map((p) => {
      const sel = h('select', { class: 'input', style: 'min-height:38px;font-size:13px;max-width:150px', 'aria-label': `${p.name} ataması`, onchange: () => { const v = (sel as HTMLSelectElement).value; const r = app.store.run('AssignStaff', { staffId: p.id, projectId: v === '' ? null : Number(v) }); if (!r.ok) toast(r.error); } },
        h('option', { value: '' }, 'Ortak havuz'), ...projects.map((pr) => h('option', { value: String(pr.id), ...(p.project === pr.id ? { selected: true } : {}) }, pr.name))) as HTMLSelectElement;
      const isField = FIELD.has(p.type);
      return h('div', { class: 'row', style: 'min-height:52px;padding:6px 0;flex-wrap:wrap' }, h('div', { class: 'lbl', style: 'min-width:130px' }, p.name, h('small', {}, `${STAFF_TYPES.find((t) => t.id === p.type)?.label} · deneyim ${p.experience}`)),
        h('span', { class: `chip ${p.morale >= 65 ? 'good' : p.morale >= 40 ? 'warn' : 'bad'}` }, 'Moral ', h('b', {}, String(p.morale))), isField ? sel : h('span', { class: 'chip' }, 'Ofis'), h('span', { class: 'num', style: 'font-size:13px' }, `${fmt(p.salary)}/ay`),
        h('button', { class: 'btn danger', style: 'min-height:38px', onclick: () => { if (!confirm(`${p.name} işten çıkarılsın mı?`)) return; const r = app.store.run('FireStaff', { staffId: p.id }); if (r.ok) app.audio.sfx('click'); } }, 'Çıkar'));
    }) : [h('div', { class: 'empty' }, 'Henüz çalışan yok.')]),
    h('div', { class: 'hint' }, 'Atanmamış (havuz) saha çalışanları aktif projeler arasında bölünür. Bir projeye atarsanız yalnızca orada çalışır. Moral düşükse verim düşer; iş kazaları ve nakit sıkıntısı moralı kırar.'));
  const hire = h('div', { class: 'hire' });
  for (const t of STAFF_TYPES) hire.append(h('div', { class: 'card' }, h('h3', {}, t.label), h('small', {}, `~${fmt(TL(t.baseSalaryTL * 1.075))} – ${fmt(TL(t.baseSalaryTL * 1.3))} /ay`),
    h('button', { class: 'btn gold', style: 'min-height:40px', disabled: s.staff.length >= cap, onclick: () => { const r = app.store.run('HireStaff', { type: t.id }); if (r.ok) { press(app, 'confirm'); toast(`${t.label} işe alındı.`); } else { app.audio.sfx('error'); toast(r.error); } } }, s.staff.length >= cap ? 'Ofis dolu' : 'İşe al')));
  const nextOffice = OFFICES[c.level];
  return h('div', { class: 'cols' }, list, h('div', { class: 'col' }, h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, `Ofis: ${officeFor(c.office).label}`), h('div', { class: 'mute', style: 'font-size:12px' }, `Kapasite ${cap} kişi · kira ${fmt(TL(officeFor(c.office).monthlyRentTL))}/ay (enflasyonla artar).${nextOffice ? ` Sonraki: ${nextOffice.label} (${nextOffice.capacity} kişi) — şirket seviyesi yükselince.` : ''}`)), hire));
}

function orderModal(app: App, matId: string, refresh: () => void) {
  const m = MATERIALS.find((x) => x.id === matId)!, st = { sup: app.store.state.company!.procurement.supplier, qty: 10 };
  const body = h('div', { class: 'bd' }), foot = h('div', { class: 'ft' });
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Malzeme siparişi', style: 'z-index:90' }, h('div', { class: 'card wiz', style: 'max-width:760px' }, body, foot));
  const close = () => modal.remove(); modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  const render = () => {
    const s = app.store.state; body.innerHTML = ''; foot.innerHTML = '';
    body.append(h('h2', { style: 'font-size:26px;margin-bottom:8px' }, `${m.label} siparişi`));
    const g = h('div', { class: 'tgrid' });
    for (const sp of SUPPLIERS) g.append(h('div', { class: `card topt ${st.sup === sp.id ? 'sel' : ''}`, role: 'button', tabindex: 0, onclick: () => { press(app); st.sup = sp.id; render(); } }, h('h3', {}, sp.label), h('p', {}, sp.blurb),
      h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, h('span', { class: 'chip' }, h('b', {}, `${fmt(unitPrice(s, matId, sp.id))}`), ` /${m.unit}`), h('span', { class: 'chip' }, `${leadDays(s, sp.id)} gün`), h('span', { class: `chip ${sp.reliability >= 0.9 ? 'good' : sp.reliability < 0.8 ? 'bad' : 'warn'}` }, 'Güven ', h('b', {}, pct(sp.reliability))), h('span', { class: 'chip' }, 'Kalite ', h('b', {}, QUAL[String(sp.quality)])))));
    const input = h('input', { class: 'input', type: 'number', min: 1, step: 1, value: st.qty, 'aria-label': 'Miktar', style: 'max-width:160px', oninput: () => { st.qty = Number((input as HTMLInputElement).value) || 0; tot.textContent = fmt(Math.round(unitPrice(s, matId, st.sup) * st.qty)); } }) as HTMLInputElement;
    const tot = h('b', { style: 'font:700 22px var(--font-h)' }, fmt(Math.round(unitPrice(s, matId, st.sup) * st.qty)));
    body.append(g, h('div', { style: 'display:flex;gap:12px;align-items:center;margin-top:10px;flex-wrap:wrap' }, h('span', { class: 'mute' }, `Miktar (${m.unit})`), input, h('span', { class: 'mute' }, 'Toplam'), tot), h('div', { class: 'hint' }, 'Ödeme sipariş anında yapılır. Ucuz tedarikçi geç/eksik teslim edebilir ve kaliteyi düşürür; kalite, aşama kalitesine yansır.'));
    foot.append(h('button', { class: 'btn', onclick: () => { press(app); close(); } }, 'Vazgeç'), h('button', { class: 'btn gold', onclick: () => { const r = app.store.run('PlaceOrder', { material: matId, qty: st.qty, supplier: st.sup }); if (!r.ok) { app.audio.sfx('error'); toast(r.error); return; } press(app, 'confirm'); toast('Sipariş verildi.'); close(); refresh(); } }, 'Sipariş ver'));
  };
  render(); document.body.append(modal);
}

function materials(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!;
  const supSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Tercih edilen tedarikçi' });
  for (const sp of SUPPLIERS) supSeg.append(h('button', { class: c.procurement.supplier === sp.id ? 'on' : '', onclick: () => { press(app); app.store.run('SetPolicy', { supplier: sp.id }); } }, sp.label));
  const auto = h('button', { class: 'tog', role: 'switch', 'aria-label': 'Otomatik satın alma', 'aria-checked': String(c.procurement.auto), onclick: () => { app.store.run('SetPolicy', { autoBuy: !c.procurement.auto }); app.audio.sfx('toggle'); } });
  const needs = h('div', {}); const act = s.projects.filter((p) => p.status === 'insaat' && p.build);
  for (const p of act) { const b = p.build!, st = STAGES[b.stage]; if (!st?.materials?.length) continue; needs.append(h('div', { class: 'alert' }, h('span', { class: `dot ${b.stalled === 'malzeme' ? 'bad' : 'info'}` }), h('span', {}, `${p.name} · ${st.label}: `, ...st.materials.map(([id]) => { const have = stockQty(s, id) + incomingQty(s, id); return h('span', { class: 'chip', style: 'margin:0 4px 2px 0' }, MATERIALS.find((m) => m.id === id)!.label, ' ', h('b', {}, nf(have, 1))); })))); }
  const t = h('table', { class: 'tbl' }, h('tr', {}, ...['Malzeme', 'Stok', 'Yolda', 'Birim fiyat', 'Trend', ''].map((x) => h('th', {}, x))));
  for (const m of MATERIALS) {
    const mp = s.matPrice[m.id] ?? 1, trend = mp > 1.04 ? '▲' : mp < 0.96 ? '▼' : '•';
    t.append(h('tr', {}, h('td', {}, m.label), h('td', {}, `${nf(stockQty(s, m.id), 1)} ${m.unit}`), h('td', {}, incomingQty(s, m.id) > 0 ? nf(incomingQty(s, m.id), 1) : '—'), h('td', {}, fmt(unitPrice(s, m.id, c.procurement.supplier))), h('td', { class: mp > 1.04 ? 'neg' : mp < 0.96 ? 'pos' : '' }, `${trend} ${(mp * 100 - 100).toFixed(0)}%`),
      h('td', {}, h('button', { class: 'btn', style: 'min-height:34px;padding:0 10px;font-size:12px', onclick: () => { press(app); orderModal(app, m.id, refresh); } }, 'Sipariş'))));
  }
  return h('div', { class: 'cols' }, h('div', { class: 'card', style: 'overflow:auto' }, h('div', { class: 'lbl-s' }, 'Malzeme stoğu ve fiyatlar'), t),
    h('div', { class: 'col' }, h('div', { class: 'card' }, h('div', { class: 'row', style: 'border:0;min-height:44px' }, h('div', { class: 'lbl' }, 'Otomatik satın alma', h('small', {}, 'Aktif aşamaların malzemesini tercih edilen tedarikçiden sipariş eder')), auto), h('div', { class: 'lbl-s', style: 'margin-top:6px' }, 'Tercih edilen tedarikçi'), supSeg,
      h('div', { class: 'hint' }, SUPPLIERS.find((x) => x.id === c.procurement.supplier)!.blurb)),
      h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Aktif şantiyelerin ihtiyacı (stok + yolda)'), ...(act.length ? [needs] : [h('div', { class: 'empty' }, 'Aktif şantiye yok.')]))));
}

function machines(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state; void refresh;
  const owned = h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, `Makine parkınız (${s.machines.length})`));
  if (!s.machines.length) owned.append(h('div', { class: 'empty' }, 'Henüz makineniz yok. Gerekli makineler şantiyede otomatik kiralanır (günlük kira); sahip olursanız yalnızca yakıt ödersiniz.'));
  for (const m of s.machines) { const d = machine(m.type)!, broken = m.brokenUntil > s.clock.day; owned.append(h('div', { class: 'row', style: 'min-height:48px;padding:4px 0;flex-wrap:wrap' }, h('div', { class: 'lbl' }, d.label, h('small', {}, `${Math.round((s.clock.day - m.boughtDay) / 30)} aylık · ${m.uses} gün kullanıldı`)),
    h('span', { class: `chip ${broken ? 'bad' : 'good'}` }, broken ? `Arızalı (${formatDate(m.brokenUntil)})` : 'Çalışıyor'), h('span', { class: 'num', style: 'font-size:13px' }, fmt(machineValue(s, m))),
    h('button', { class: 'btn danger', style: 'min-height:36px', onclick: () => { if (!confirm(`${d.label} satılsın mı? (değerinin %90'ı)`)) return; const r = app.store.run('SellMachine', { machineId: m.id }); if (r.ok) { app.audio.sfx('confirm'); toast('Makine satıldı.'); } } }, 'Sat'))); }
  const cat = h('div', { class: 'hire' });
  for (const d of MACHINES) { const used = STAGES.filter((st) => st.machines?.includes(d.id)).map((st) => st.label);
    cat.append(h('div', { class: 'card' }, h('h3', {}, d.label), h('small', {}, d.blurb), h('small', {}, `Kira ${fmt(TL(d.rentTL))}/gün · yakıt ${fmt(TL(d.fuelTL))}/gün · bakım ${fmt(TL(d.maintTL))}/ay`), h('small', {}, `Kullanıldığı aşamalar: ${used.join(', ') || '—'}`),
      h('button', { class: 'btn', style: 'min-height:40px', disabled: s.company!.cash < Math.round(TL(d.priceTL) * 0.2), title: '%20 peşinat, kalan 36 ay Özel Banka kredisi', onclick: () => { const r = app.store.run('BuyMachine', { type: d.id, financed: true, bank: 'ozel' }); if (r.ok) { press(app, 'confirm'); toast(`${d.label} kredili alındı (%20 peşin).`); } else { app.audio.sfx('error'); toast(r.error); } } }, 'Kredili al'),
      h('button', { class: 'btn gold', style: 'min-height:40px', disabled: s.company!.cash < TL(d.priceTL), onclick: () => { const r = app.store.run('BuyMachine', { type: d.id }); if (r.ok) { press(app, 'confirm'); toast(`${d.label} satın alındı.`); } else { app.audio.sfx('error'); toast(r.error); } } }, `Satın al · ${fmt(TL(d.priceTL))}`))); }
  return h('div', { class: 'col' }, owned, h('div', { class: 'lbl-s' }, 'Makine kataloğu'), cat, h('div', { class: 'hint' }, 'Sahip olunan makine yılda %12 değer kaybeder (en çok %75), aylık bakım ister ve kullanıldıkça arızalanabilir. Sık kullanılan makineler için sahip olmak kiradan ucuza gelir; seyrek kullanılanlar için kiralamak daha iyidir.'));
}

function policy(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, c = s.company!; void refresh;
  const opts: ['dusuk' | 'normal' | 'yuksek', string, string][] = [['dusuk', 'Düşük', 'Sigorta maliyeti çok düşük; kaza riski ~%80 daha yüksek, moral düşer.'], ['normal', 'Normal', 'Dengeli maliyet ve risk.'], ['yuksek', 'Yüksek', 'Sigorta maliyeti ~3× ; kaza riski ~%55 daha düşük, moral artar.']];
  const g = h('div', { class: 'grid g3' });
  for (const [id, l, d] of opts) g.append(h('div', { class: `card opt ${c.safety === id ? 'sel' : ''}`, role: 'button', tabindex: 0, onclick: () => { press(app); app.store.run('SetPolicy', { safety: id }); } }, h('h3', {}, l), h('p', {}, d)));
  return h('div', { class: 'col' }, h('div', { class: 'lbl-s' }, 'İş güvenliği politikası'), g, h('div', { class: 'card' }, kvPol(s)));
}
const kvPol = (s: App['store']['state']) => h('div', { class: 'hint' }, `Son kaza: ${s.company!.lastAccidentDay < 0 ? 'yok' : formatDate(s.company!.lastAccidentDay)} · Şantiye şefi varsa kaza riski ~%30 azalır.`);
