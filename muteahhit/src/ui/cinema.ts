import { formatMoney } from '../core/money';
import type { Project, Tender } from '../core/types';
import { buildingType } from '../data';
import { buildingArt } from './art';
import { celebrate, h } from './dom';
import { TENDER_ART } from './artwork';
import type { App } from './app';

/** Kısa sinematik sahneler: teslim, büyük ihale, şantiye açılışı. Dokununca ya da süre dolunca kapanır; hareket azaltmada sade. */
function scene(app: App, cls: string, inner: HTMLElement[], ms: number): void {
  document.querySelectorAll('.cine').forEach((x) => x.remove());
  const el = h('div', { class: `cine ${cls}`, role: 'dialog' }, h('div', { class: 'cinebox' }, ...inner)); document.body.append(el);
  let done = false; const end = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => el.remove(), app.settings.reduced ? 0 : 260); };
  el.addEventListener('pointerdown', end); setTimeout(end, app.settings.reduced ? ms * 0.6 : ms);
}

export function deliveryScene(app: App, p: Project): void {
  const q = p.result?.qualityScore ?? 0, days = p.result?.days ?? 0, plan = p.result?.plannedDays ?? 0, stars = q >= 85 ? 5 : q >= 75 ? 4 : q >= 65 ? 3 : q >= 55 ? 2 : 1;
  app.audio.sfx('fanfare'); celebrate(app.settings.reduced);
  scene(app, 'delivery', [h('div', { class: 'cart', html: buildingArt(p.type, p.floors, 1, p.designSeed, p.quality) }), h('div', { class: 'ctitle' }, 'PROJE TESLİM EDİLDİ'), h('h2', {}, p.name),
    h('div', { class: 'cstars' }, '★'.repeat(stars) + '☆'.repeat(5 - stars)), h('div', { class: 'cfacts' }, h('span', {}, `🏗️ ${buildingType(p.type)?.label}`), h('span', {}, `⭐ Kalite ${q}`), h('span', {}, `📅 ${days} gün${plan ? ` (plan ${plan})` : ''}`))], 4200);
}
export function tenderWinScene(app: App, t: Tender): void {
  app.audio.sfx('fanfare'); celebrate(app.settings.reduced);
  scene(app, 'tender', [...(TENDER_ART ? [h('div', { class: 'cart wide' }, h('img', { src: TENDER_ART, alt: '', decoding: 'async' }))] : []), h('div', { class: 'cemoji' }, '🤝'), h('div', { class: 'ctitle' }, 'İHALE KAZANILDI'), h('h2', {}, t.title), h('div', { class: 'cfacts' }, h('span', {}, `💰 Sözleşme ${formatMoney(t.bid?.price ?? 0)}`), h('span', {}, `💸 %10 avans yattı`), h('span', {}, `📅 ${t.months} ay`))], 4000);
}
/** Şantiye tanıtımı: proje adı ve binanın silueti kısaca belirir; 3D sahne arkada yüklenir. */
export function siteIntro(app: App, p: Project): void {
  if (app.settings.reduced) return;
  scene(app, 'siteintro', [h('div', { class: 'ctitle' }, '🚧 ŞANTİYE'), h('h2', {}, p.name), h('div', { class: 'cart sm', html: buildingArt(p.type, p.floors, p.status === 'insaat' ? 0.5 : 0.05, p.designSeed, p.quality) })], 1100);
}
