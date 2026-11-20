import { formatDate } from '../core/calendar';
import { formatMoney } from '../core/money';
import { ACHIEVEMENTS, LEVEL_DEFS, officeFor } from '../data';
import { officeStepFor } from '../sim/progress';
import { badge, EMOJI } from './art';
import { celebrate, h } from './dom';
import { achTier } from './screens/progress';
import { CRISIS_ART } from './artwork';
import type { App } from './app';

/**
 * Önem derecesine göre farklı yoğunlukta "an" bildirimleri.
 *  küçük  → toast (dom.ts)       orta → başarım kartı (konfetisiz)       büyük → sahne/modal (+ konfeti yalnızca "Canlı" modda)
 *  kriz   → sakin ama dikkat çeken şerit (kayıp tutarı + yönlendirme)
 * Hareket azaltma / "Sakin" ayarı: konfeti ve zıplama kapanır, içerik aynı kalır.
 */
function stack(): HTMLElement {
  let box = document.getElementById('moments');
  if (!box) { box = h('div', { id: 'moments', 'aria-live': 'polite' }); document.body.append(box); }
  return box;
}
function put(card: HTMLElement, ms: number, max = 2) {
  const box = stack(); box.append(card);
  while (box.children.length > max) box.firstElementChild!.remove();
  const out = () => { if (!card.isConnected || card.classList.contains('out')) return; card.classList.add('out'); setTimeout(() => card.remove(), 220); };
  card.addEventListener('pointerdown', out); setTimeout(out, ms);
}

/** Orta yoğunluk: açılan başarımın rozeti, adı, açıklaması, tarihi ve etkisi. Aynı başarım için yinelenen kart açılmaz. */
const shown = new Set<string>();
export function achievementCard(app: App, id: string): void {
  const a = ACHIEVEMENTS.find((x) => x.id === id); if (!a || shown.has(id)) return; shown.add(id);
  const s = app.store.state, day = s.progress.ach[id] ?? s.clock.day, sameKind = ACHIEVEMENTS.filter((x) => x.m === a.m && s.progress.ach[x.id] !== undefined).length;
  const effect = s.company!.office >= 3 ? 'Genel merkez başarı rafına eklendi.' : 'Rozet koleksiyonuna eklendi.';
  app.audio.sfx('confirm');
  put(h('div', { class: 'momcard ach' },
    h('div', { class: 'momico', html: badge(a.m, achTier(a), true, 52) }),
    h('div', { class: 'mombody' }, h('small', { class: 'lbl-s' }, `${EMOJI.basari ?? '🏆'} Başarım açıldı`), h('b', {}, a.t), h('div', { class: 'mute' }, a.x), h('small', { class: 'mute' }, `${formatDate(day)} · ${effect}${sameKind > 1 ? ` (${sameKind}. rozet)` : ''}`))), 5200);
}

/** Büyük yoğunluk: seviye atlama sahnesi — yeni seviye, açılan özellikler, sıradaki hedef. Gerçek veri: LEVEL_DEFS + officeStepFor. */
export function levelUpScene(app: App, level: number, label: string): void {
  const s = app.store.state, next = LEVEL_DEFS.find((d) => d.level === level + 1), st = officeStepFor(s);
  const unlocks: string[] = [];
  if (st && st.minLevel === level) unlocks.push(`${EMOJI.sirket} ${officeFor(st.office).label} artık alınabilir (${officeFor(st.office).capacity} kişi)`);
  unlocks.push(`📈 Kredi puanı +15 · itibar +2`);
  const need = next ? Object.entries(next.need).map(([k, v]) => `${({ completed: 'Tamamlanan proje', nw: 'Net varlık', rep: 'İtibar', cities: 'Şehir' } as Record<string, string>)[k] ?? k}: ${k === 'nw' ? formatMoney((v as number) * 100) : v}`) : [];
  document.querySelectorAll('.modal.lvlup').forEach((x) => x.remove()); // art arda atlama: yalnızca en güncel sahne
  const m = h('div', { class: 'modal lvlup', role: 'dialog', 'aria-label': 'Seviye atlandı' });
  const close = () => { m.classList.add('leaving'); setTimeout(() => m.remove(), 200); };
  m.append(h('div', { class: 'card lvlcard' },
    h('div', { class: 'lvlnum' }, String(level)), h('small', { class: 'lbl-s' }, 'Yeni seviye'), h('h2', {}, label),
    h('div', { class: 'lvlsec' }, h('b', {}, 'Açılanlar'), ...unlocks.map((u) => h('div', { class: 'mute' }, u))),
    next ? h('div', { class: 'lvlsec' }, h('b', {}, `Sıradaki: ${next.label}`), ...need.map((u) => h('div', { class: 'mute' }, u))) : h('div', { class: 'chip good' }, 'En üst seviye'),
    h('button', { class: 'btn gold', onclick: close }, 'Devam')));
  m.addEventListener('pointerdown', (e) => { if (e.target === m) close(); }); document.body.append(m);
  if (app.settings.bigFx) celebrate(false);
}

/** Büyük yoğunluk: finansal başarı — yalnızca gerçek kârlı satışlarda (kâr ≥ 5 M₺) kart; daha küçükleri toast kalır. */
export const BIG_PROFIT = 500_000_000; // kuruş (5 milyon ₺)
export function successCard(app: App, price: number, profit: number): void {
  app.audio.sfx('coin');
  put(h('div', { class: 'momcard good' }, h('div', { class: 'momico big' }, '💰'), h('div', { class: 'mombody' }, h('small', { class: 'lbl-s' }, 'Büyük kazanç'), h('b', {}, `Satış ${formatMoney(price)}`), h('div', { class: 'mute' }, `Net kâr ${formatMoney(profit)} · şirket değeri arttı`))), 5200);
  if (app.settings.bigFx) celebrate(false);
}

/** Kriz: net varlıkta ani düşüş. Abartısız; kayıp tutarı + yönlendirme (Finans sekmesi). */
export function crisisBanner(app: App, loss: number, pct: number): void {
  app.audio.sfx('alarm');
  const b = h('div', { class: 'momcard bad' }, h('div', { class: 'momico thumb' }, h('img', { src: CRISIS_ART, alt: '', decoding: 'async' })), h('div', { class: 'mombody' }, h('small', { class: 'lbl-s' }, 'Dikkat'), h('b', {}, `Net varlık bu ay %${pct} düştü (−${formatMoney(loss)})`), h('div', { class: 'mute' }, 'Gider ve borçlarınızı Finans sekmesinden inceleyin.')), h('button', { class: 'btn', onclick: () => { app.openTab?.('finans'); b.dispatchEvent(new Event('pointerdown')); } }, 'Finans'));
  put(b, 8000);
}
