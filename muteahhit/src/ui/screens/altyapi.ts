import { formatDate } from '../../core/calendar';
import { material } from '../../data';
import { MAT_SHARE, RETENTION, WARRANTY_DAYS, infraCapacity, infraKind, jobNeeds, jobQuality } from '../../sim/infra';
import { stockQty } from '../../sim/materials';
import { unlockState } from '../../sim/unlock';
import { fmt, nf, pct } from '../components';
import { h, press } from '../dom';
import { tendersView } from './tenders';
import type { App } from '../app';
import type { InfraJob } from '../../core/types';

type Sub = 'ihale' | 'isler' | 'kabul' | 'gecmis';
const mem = { sub: 'ihale' as Sub };
export const setInfraSub = (s: string) => { if (['ihale', 'isler', 'kabul', 'gecmis'].includes(s)) mem.sub = s as Sub; };
const PHASES: [string, number, number][] = [['Mobilizasyon', 0, 0.1], ['Ana işler', 0.1, 0.8], ['Tamamlama', 0.8, 1]];

/** Altyapı ve Taahhüt: kamu ihaleleri (kazanma ihtimali ve kâr tahminiyle), yürüyen işler (iş programı, malzeme, makine/ekip kapasitesi), geçici/kesin kabul ve geçmiş. */
export function altyapiView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, ul = unlockState(s, 'altyapi');
  if (!ul.open) return h('div', { class: 'card emptyfx', style: 'text-align:center;padding:20px' }, h('div', { style: 'font-size:36px' }, '🔒'), h('b', {}, 'Altyapı ve Taahhüt henüz kapalı'), ...ul.missing.map((x) => h('div', {}, '• ' + x)));
  const jobs = s.infra.filter((j) => j.status === 'devam'), acc = s.infra.filter((j) => j.status === 'kabul' || j.status === 'garanti'), done = s.infra.filter((j) => j.status === 'bitti'), openT = s.tenders.filter((t) => t.infra && t.status === 'acik');
  const seg = h('div', { class: 'seg', role: 'tablist', style: 'margin-bottom:10px;align-self:flex-start;max-width:100%;overflow-x:auto' });
  for (const [id, l] of [['ihale', `İhaleler (${openT.length})`], ['isler', `Yürüyen işler (${jobs.length})`], ['kabul', `Kabul ve garanti (${acc.length})`], ['gecmis', `Geçmiş (${done.length})`]] as [Sub, string][]) seg.append(h('button', { class: mem.sub === id ? 'on' : '', onclick: () => { press(app); mem.sub = id; refresh(); } }, l));
  const body = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
  const k = (l: string, v: string) => h('div', { class: 'kpi', html: `<small>${l}</small><b>${v}</b>` });
  const book = s.infra.filter((j) => j.status !== 'bitti').reduce((a, j) => a + j.price, 0), pend = s.infra.reduce((a, j) => a + j.pending.reduce((x, p) => x + p.amount, 0) + (j.retention ?? 0), 0);
  body.append(h('div', { class: 'kpis' }, k('Sipariş defteri', fmt(book)), k('Tahsil edilecek', fmt(pend)), k('Aktif iş', String(jobs.length + acc.length)), k('Biten iş', String(done.length)), k('Toplam kâr', fmt(done.reduce((a, j) => a + (j.result?.profit ?? 0), 0)))));

  if (mem.sub === 'ihale') body.append(h('div', { class: 'mute', style: 'font-size:12px' }, 'Teklif verirken kazanma ihtimali ve beklenen kâr hesaplanır. En düşük teklif her zaman kazanmaz: teknik yeterlilik, itibar, kredi notu ve kapasite de puanı belirler. Gecikme cezası günlük %0,1 (en çok %10).'), tendersView(app, refresh, 'infra'));
  else if (mem.sub === 'isler') body.append(...(jobs.length ? jobs.map((j) => jobCard(j)) : [h('div', { class: 'card empty' }, 'Yürüyen altyapı işi yok. İhaleler sekmesinden teklif verin.')]));
  else if (mem.sub === 'kabul') body.append(...(acc.length ? acc.map((j) => jobCard(j)) : [h('div', { class: 'card empty' }, 'Kabul veya garanti sürecinde iş yok.')]));
  else body.append(...(done.length ? done.slice().reverse().map((j) => h('div', { class: 'card', style: 'padding:10px 12px' }, h('b', {}, `${infraKind(j.kind)?.ico ?? ''} ${j.name}`), h('div', { class: 'mute', style: 'font-size:12px' }, `Sözleşme ${fmt(j.price)}${j.claimed ? ` + ek iş ${fmt(j.claimed)}` : ''} · kâr `, h('b', { class: (j.result?.profit ?? 0) >= 0 ? 'pos' : 'neg' }, fmt(j.result?.profit ?? 0)), ` · ${j.result!.late > 0 ? `${j.result!.late} gün gecikme` : 'zamanında'} · ${formatDate(j.result!.day)}`))) : [h('div', { class: 'card empty' }, 'Henüz biten iş yok.')]));
  return h('div', { style: 'display:flex;flex-direction:column' }, seg, body);

  function jobCard(j: InfraJob): HTMLElement {
    const kd = infraKind(j.kind)!, cap = infraCapacity(s, j), late = s.clock.day - j.deadline, pendJ = j.pending.reduce((a, x) => a + x.amount, 0), stat = j.status === 'devam' ? (j.stalled ? { t: ({ nakit: 'Nakit yok', kapasite: 'Kapasite yetersiz', malzeme: 'Malzeme yok', teknik: 'Teknik sorun' } as Record<string, string>)[j.stalled] ?? '', c: 'bad' } : { t: 'İlerliyor', c: 'good' }) : j.status === 'kabul' ? { t: `Geçici kabul bekleniyor (${formatDate(j.acceptAt ?? s.clock.day)})`, c: 'warn' } : { t: `Garanti süresinde (${formatDate(j.garantiEnd ?? s.clock.day)}'e kadar)`, c: 'warn' };
    const phases = PHASES.map(([n, a, b]) => { const f = Math.max(0, Math.min(1, (j.progress - a) / (b - a))); return h('div', { style: 'flex:' + (b - a) }, h('div', { class: 'meter', style: 'height:7px' }, h('i', { style: `width:${Math.round(f * 100)}%;background:${f >= 1 ? 'var(--ok)' : 'var(--accent2)'}` })), h('small', { class: 'mute', style: 'font-size:10px' }, n)); });
    const needs = j.status === 'devam' ? jobNeeds(s, j, Math.min(1 - j.progress, cap.cap / (j.months * 30))) : [];
    return h('div', { class: 'card' }, h('div', { style: 'display:flex;gap:8px;align-items:baseline;flex-wrap:wrap' }, h('span', { style: 'font-size:22px' }, kd.ico), h('b', {}, j.name), h('span', { class: `chip ${stat.c}` }, stat.t)),
      h('div', { style: 'display:flex;gap:4px;margin:6px 0' }, ...phases), h('div', { style: 'text-align:right;font-weight:800' }, `%${Math.round(j.progress * 100)}`),
      h('div', { class: 'kpis' }, k('Sözleşme', fmt(j.price)), k('Tahsil edilecek', fmt(pendJ)), k('Teslim', formatDate(j.deadline)), k('Maliyet aşımı', fmt(j.overrun ?? 0)), k('Ek iş (karşılanan)', fmt(j.claimed ?? 0)), k('Denetim', `${j.inspections ?? 0} (${j.failedInsp ?? 0} red)`)),
      j.status === 'devam' ? h('div', { class: 'mute', style: 'font-size:12px;margin-top:6px' }, `Makine %${Math.round(cap.machine * 100)} · ekip %${Math.round(cap.crew * 100)} · hız ×${nf(cap.cap, 2)}${late > 0 ? ` · ${late} gün gecikmiş (günlük ceza %0,1)` : ''} · malzeme kalitesi ${jobQuality(j) >= 0.2 ? 'iyi' : jobQuality(j) <= -0.2 ? 'düşük' : 'orta'} (denetim şansını etkiler)`) : null,
      needs.length ? h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px' }, ...needs.map(([id, q]) => { const have = stockQty(s, id), days = q > 0 ? have / q : 99, bad = days < 3; return h('span', { class: `chip ${bad ? 'bad' : days < 8 ? 'warn' : 'good'}`, title: `Günlük ihtiyaç ${nf(q, 2)} ${material(id)?.unit}` }, `${material(id)?.label}: ${days > 99 ? '99+' : days.toFixed(0)} gün`); })) : null,
      j.status === 'garanti' ? h('div', { class: 'mute', style: 'font-size:12px;margin-top:6px' }, `Tutulan teminat ${fmt(j.retention ?? 0)} (sözleşmenin %${RETENTION * 100}'i) ve kalan banka teminatı kesin kabulde (${WARRANTY_DAYS} gün) çözülür.`) : null,
      (j.events ?? []).length ? h('div', { style: 'margin-top:6px' }, ...(j.events ?? []).slice(-4).reverse().map((e) => h('div', { class: 'mute', style: 'font-size:11px' }, `${formatDate(e.day)} · ${e.text}`))) : null, void MAT_SHARE, void pct);
  }
}
