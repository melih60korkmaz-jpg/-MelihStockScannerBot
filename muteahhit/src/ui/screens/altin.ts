import { formatDate } from '../../core/calendar';
import { GOLD_PACKS, IAP_ENABLED, RUSH_DAYS, goldOf, projectRemainingDays, rushActive, rushCost, stageRemainingDays } from '../../sim/gold';
import { STAGES } from '../../data';
import { fmt, nf } from '../components';
import { askConfirm, h, press, toast } from '../dom';
import type { App } from '../app';

/** Altın: bakiye, inşaat hızlandırma (süreye göre fiyat), paketler (test modu) ve hareketler. */
export function altinView(app: App, refresh: () => void): HTMLElement {
  const s = app.store.state, gold = goldOf(s);
  const act = (cmd: string, params: object, ok: string, sfx: 'confirm' | 'stamp' | 'coin' = 'confirm') => { const r = app.store.run(cmd as never, params as never); if (r.ok) { app.audio.sfx(sfx); toast(ok); } else { app.audio.sfx('error'); toast(r.error); } refresh(); };
  const live = s.projects.filter((p) => p.status === 'insaat' && p.build);
  const rushCards = live.map((p) => { const b = p.build!, st = STAGES[b.stage], active = rushActive(s, p), stRem = Math.ceil(stageRemainingDays(p)), prRem = Math.ceil(projectRemainingDays(p)), canRush = b.stage >= 6;
    return h('div', { class: 'card', style: 'margin-bottom:8px' }, h('div', { style: 'display:flex;gap:8px;align-items:baseline;flex-wrap:wrap' }, h('b', {}, p.name), h('span', { class: 'chip' }, st?.label ?? ''), active ? h('span', { class: 'chip good' }, p.rush!.kind === 'asama' ? '⚡ Aşama hızlandırılıyor' : `⚡ ${Math.max(0, p.rush!.until - s.clock.day)} gün kaldı`) : null),
      h('div', { class: 'mute', style: 'font-size:12px;margin:4px 0' }, `Aşamadan kalan ≈ ${stRem} gün · tüm projeden kalan ≈ ${prRem} gün. Fiyat kalan süreye göre değişir; malzeme ve işçilik maliyetleri normal ödenir, yalnızca süre kısalır.`),
      !canRush ? h('div', { class: 'mute', style: 'font-size:12px' }, 'Hızlandırma ruhsat sonrası inşaat aşamalarında kullanılır.') : active ? null : h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' },
        h('button', { class: 'btn gold', style: 'min-height:38px;flex-direction:column;height:auto;padding:6px 10px', disabled: gold < rushCost(p, 'asama'), onclick: async () => { if (await askConfirm(`Bu aşama çok hızlı bitirilsin mi? (${rushCost(p, 'asama')} altın)`)) act('RushProject', { projectId: p.id, kind: 'asama' }, 'Aşama hızlandırıldı', 'stamp'); } }, h('b', {}, '⚡ Aşamayı bitir'), h('small', {}, `${rushCost(p, 'asama')} 🪙 · ×6 hız`)),
        ...RUSH_DAYS.map((d) => h('button', { class: 'btn', style: 'min-height:38px;flex-direction:column;height:auto;padding:6px 10px', disabled: gold < rushCost(p, 'gun', d), onclick: async () => { if (await askConfirm(`${d} gün boyunca inşaat 3 kat hızlı ilerlesin mi? (${rushCost(p, 'gun', d)} altın)`)) act('RushProject', { projectId: p.id, kind: 'gun', days: d }, `${d} gün hızlandırma başladı`, 'stamp'); } }, h('b', {}, `${d} gün ×3`), h('small', {}, `${rushCost(p, 'gun', d)} 🪙`)))));
  });
  const packs = h('div', { class: 'cols' }, ...GOLD_PACKS.map((pk) => h('div', { class: 'card', style: 'text-align:center' }, h('div', { style: 'font-size:28px' }, '🪙'), h('b', {}, `${pk.gold} Altın`), h('div', { class: 'mute', style: 'font-size:12px' }, pk.label), pk.best ? h('span', { class: 'chip good' }, 'En avantajlı') : null,
    h('button', { class: 'btn gold block', style: 'margin-top:6px', onclick: () => act('BuyGoldTest', { pack: pk.id }, `+${pk.gold} altın (test modu)`, 'coin') }, IAP_ENABLED ? pk.price : `${pk.price} · test`))));
  const log = (s.goldLog ?? []).slice(-12).reverse();
  return h('div', { style: 'display:flex;flex-direction:column;gap:10px' },
    h('div', { class: 'card' }, h('div', { style: 'display:flex;align-items:center;gap:12px;flex-wrap:wrap' }, h('div', { style: 'font-size:36px' }, '🪙'), h('div', {}, h('div', { class: 'lbl-s', style: 'margin:0' }, 'Altın bakiyesi'), h('b', { style: 'font-size:26px' }, nf(gold, 0))),
      h('div', { class: 'mute', style: 'font-size:12px;flex:1;min-width:200px' }, 'Altın yalnızca inşaatı hızlandırmak için harcanır; nakit ya da rekabet avantajı vermez. Seviye atlayınca +10 altın kazanırsın.'))),
    h('div', { class: 'lbl-s' }, '⚡ İnşaat hızlandırma'), ...(rushCards.length ? rushCards : [h('div', { class: 'card empty' }, 'Şu an inşaatı süren proje yok. Bir projeyi başlatınca burada hızlandırabilirsin.')]),
    h('div', { class: 'lbl-s' }, '🛒 Altın paketleri'), h('div', { class: 'mute', style: 'font-size:12px' }, IAP_ENABLED ? 'Satın alma mağaza üzerinden yapılır.' : 'TEST MODU: gerçek ödeme bağlanana kadar paketler ücretsiz verilir; fiyatlar örnektir.'), packs,
    h('div', { class: 'card' }, h('div', { class: 'lbl-s' }, 'Hareketler'), ...(log.length ? log.map((l) => h('div', { class: 'row', style: 'min-height:30px;font-size:13px' }, h('span', {}, `${formatDate(l.day)} · ${l.memo}`), h('b', { class: l.amount < 0 ? 'neg' : 'pos' }, `${l.amount > 0 ? '+' : ''}${l.amount} 🪙`))) : [h('div', { class: 'mute', style: 'font-size:13px' }, 'Henüz hareket yok.')])), h('span', { style: 'display:none' }, fmt(0)));
}
