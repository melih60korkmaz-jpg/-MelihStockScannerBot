import { STAGES, buildingType, cityData } from '../data';
import type { Deal } from '../core/types';
import { dealCash, dealDiscount, dealProfit, dealsOpen, KIND_ICO, KIND_LABEL, DEMO_DAYS, DEAL_DAYS } from '../sim/deals';
import { rivalProfile } from '../sim/rivalLife';
import { buildingPhoto } from './art';
import { fmt, nf, pct } from './components';
import { h, press, toast, askConfirm } from './dom';
import { emblemSvg } from './emblem';
import { buyerSvg } from './salesScene';
import type { App } from './app';

type Filter = 'hepsi' | Deal['kind'];
const FILTERS: [Filter, string][] = [['hepsi', 'Hepsi'], ['bina', '🏢 Bitmiş bina'], ['harap', '🛠️ Yenileme'], ['yarim', '🏗️ Yarım inşaat'], ['eski', '🏚️ Eski bina'], ['kat', '🤝 Kat karşılığı']];

/** Fırsat ilanları: rakiplerden indirimli bina, yarım inşaat, eski bina arsası ve kat karşılığı teklifleri. */
export function openDeals(app: App, onClose?: () => void): void {
  let filter: Filter = 'hepsi';
  const card = h('div', { class: 'card sc' }), modal = h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Fırsat ilanları' }, card);
  const close = () => { modal.remove(); onClose?.(); };
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  const unsub = app.store.subscribe((evs) => { if (!modal.isConnected) { unsub(); return; } if (evs.some((e) => ['DEAL_NEW', 'DEAL_DONE', 'DEAL_LOST', 'MONTH'].includes(e.type))) render(); });
  const render = () => {
    const s = app.store.state, all = dealsOpen(s), list = all.filter((d) => filter === 'hepsi' || d.kind === filter), keep = card.querySelector('.scb')?.scrollTop ?? 0;
    card.innerHTML = '';
    card.append(h('div', { class: 'sch' }, h('h2', {}, '📢 Fırsat ilanları'), h('span', { class: 'sck-mini mute' }, `${all.length} açık fırsat · kasa ${fmt(s.company!.cash)}`), h('button', { class: 'btn', style: 'margin-left:auto', onclick: () => { press(app); close(); } }, 'Kapat')));
    card.append(h('div', { class: 'sct' }, ...FILTERS.map(([id, label]) => h('button', { class: `btn${filter === id ? ' on' : ''}`, onclick: () => { press(app); filter = id; render(); } }, id === 'hepsi' ? `${label} (${all.length})` : `${label} (${all.filter((d) => d.kind === id).length})`))));
    const body = h('div', { class: 'scb' }); card.append(body);
    if (!list.length) body.append(h('div', { class: 'card emptyfx', style: 'text-align:center;padding:18px' }, h('div', { style: 'font-size:34px' }, '📭'), h('b', {}, 'Şu an böyle bir ilan yok'), h('div', { class: 'mute', style: 'font-size:13px' }, s.company!.level < 2 ? 'Fırsat ilanları şirket seviye 2\'de başlar.' : 'Her ay yeni ilanlar düşer: rakiplerin sıkıştığı, mal sahiplerinin teklif getirdiği zamanları kollayın. Yarım inşaat ilanları seviye 3\'te açılır.')));
    for (const d of list) body.append(dealCard(d));
    (body as HTMLElement).scrollTop = keep;
    function dealCard(d: Deal): HTMLElement {
      const t = buildingType(d.type), rv = s.rivals.find((r) => r.name === d.seller), prof = dealProfit(s, d), cash = dealCash(d), left = Math.max(0, d.until - s.clock.day), disc = dealDiscount(d);
      const art = d.kind === 'bina' || d.kind === 'harap' ? buildingPhoto(d.type, d.parcel.maxFloors, 1, d.id, d.quality) : d.kind === 'yarim' ? buildingPhoto(d.type, d.parcel.maxFloors, STAGES.slice(1, d.stage).reduce((a, x) => a + x.cost, 0) / 100, d.id, d.quality) : buildingPhoto('apartman', 3, 1, d.id, 'ekonomik');
      const who = rv ? (() => { const p = rivalProfile(s, rv); return h('span', { html: emblemSvg(p.shape, p.color, 26) }); })() : h('span', { html: buyerSvg(d.id, 'Emekli', 24) });
      const kp = (k: string, v: string, tone = '') => h('div', {}, k, h('b', { class: tone }, v));
      return h('div', { class: 'deal-card' },
        h('div', { class: `art${d.kind === 'eski' || d.kind === 'kat' ? ' old' : ''}`, html: art }, h('span', { class: 'rib' }, `${KIND_ICO[d.kind]} ${KIND_LABEL[d.kind]}`)),
        h('div', { class: 'info' },
          h('h3', { style: 'font-size:18px' }, d.title), h('div', { class: 'sellr' }, who, h('span', {}, `${d.seller} · ${cityData(d.city)?.label ?? d.city}`)),
          h('div', { class: 'mute', style: 'font-size:12px' }, d.story),
          h('div', { class: 'kp' }, ...(d.kind === 'kat' ? [kp('Arsa bedeli', 'yok'), kp('Arsa sahibi payı', `%${Math.round(d.share * 100)}`), kp('Yıkım masrafı', fmt(d.demo)), kp('Tahmini kâr', fmt(prof), prof >= 0 ? 'pos-t' : 'bad-t')] : [kp(d.kind === 'eski' ? 'Arsa değeri' : 'Piyasa değeri', fmt(d.fair)), kp('İstenen', fmt(d.price)), kp('İndirim', pct(disc, 0), disc >= 0.2 ? 'pos-t' : ''), ...(d.demo ? [kp('Yıkım', fmt(d.demo))] : []), ...(d.kind === 'yarim' ? [kp('Aşama', `${STAGES[d.stage]!.label} · kalite ${d.qscore}`)] : d.kind === 'bina' ? [kp('Kalite', String(d.qscore)), kp('Satılabilir', `${nf(d.parcel.area, 0)} m² arsa`)] : []), kp('Tahmini kâr', fmt(prof), prof >= 0 ? 'pos-t' : 'bad-t')].flat()) as HTMLElement[]),
          h('div', { class: 'offer-card', style: 'padding:0;border:0;background:none;margin:0;animation:none' }, h('div', { class: 'body' }, h('div', { class: 'tleft', title: `${left} gün sonra gider` }, h('i', { style: `width:${Math.round((left / DEAL_DAYS) * 100)}%` })))),
          h('div', { class: 'acts' },
            h('button', { class: 'btn gold', disabled: s.company!.cash < cash, onclick: async () => {
              const msg = d.kind === 'kat' ? `${d.title}\nYıkım masrafı ${fmt(d.demo)} ödenir. Yıkım ${DEMO_DAYS} gün sürer; sonra yeni bina yapılır ve daireler %${Math.round(d.share * 100)} arsa sahibine aittir.` : `${d.title}\n${fmt(cash)} (tapu harcı dahil) ödenecek.${d.kind === 'eski' ? ` Yıkım ${DEMO_DAYS} gün sürer.` : ''}`;
              if (!(await askConfirm(msg, 'Kabul et'))) return; const r = app.store.run('AcceptDeal', { dealId: d.id }); if (r.ok) { app.audio.sfx('stamp'); toast(d.kind === 'harap' ? 'Bina devralındı: Gayrimenkul Yönetimi › Bakım ve yenileme' : d.kind === 'bina' ? 'Bina devralındı: Projeler › Satış merkezi' : d.kind === 'yarim' ? 'Yarım inşaat devralındı, iş sürüyor' : d.kind === 'eski' ? 'Arsa alındı, yıkım başladı' : 'Anlaşma imzalandı, yıkım başladı'); } else { app.audio.sfx('error'); toast(r.error); }
            } }, d.kind === 'kat' ? '🤝 Anlaş' : '✅ Satın al'),
            h('button', { class: 'btn', onclick: () => { app.store.run('DeclineDeal', { dealId: d.id }); } }, 'Geç'), h('span', { class: 'mute', style: 'font-size:11px;align-self:center' }, `${left} gün · ${t?.label ?? d.type}`))));
    }
  };
  render(); document.body.append(modal);
}
