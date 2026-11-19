import { TL } from '../core/money';
import { officeFor, OFFICE_STEPS } from '../data';
import { officeStepFor } from '../sim/progress';
import { formatMoney } from '../core/money';
import { formatDate } from '../core/calendar';
import type { GameState } from '../core/types';
import { buildingArt, C, EMOJI } from './art';
import { emblemSvg } from './emblem';
import { SKY, phaseNow } from './hero';
import { h, press, toast, celebrate } from './dom';
import type { App } from './app';

const FLOORS = [2, 4, 7, 11];
const hash = (x: number) => { let a = (x * 2654435761) >>> 0; a ^= a >>> 15; return (Math.imul(a, 2246822519) >>> 0) / 4294967296; };

/** Genel merkez kesiti: ofis seviyesi kat sayısını ve odaları, personel sayısı çalışanları, gerçek net varlık geçmişi monitörleri belirler. */
export function hqSvg(s: GameState, now = new Date(), rising = false): string {
  const c = s.company!, off = c.office, n = FLOORS[Math.min(3, off - 1)]!, fh = 19, W = 420, gy = 236, bw = 176, bx = 122, top = gy - n * fh - 14;
  const ph = phaseNow(now), night = ph === 'gece', [t0, t1, t2] = SKY[ph], lit = night || ph === 'aksam' || ph === 'safak';
  const hist = s.history.slice(-14).map((p) => p.netWorth), lo = Math.min(...hist, 0), hi = Math.max(...hist, 1);
  const chart = (x: number, y: number, w: number, hh: number) => { if (hist.length < 2) return `<path d="M${x} ${y + hh / 2} h${w}" stroke="${C.acc2}" stroke-width="1"/>`; const pts = hist.map((v, i) => `${(x + (i / (hist.length - 1)) * w).toFixed(1)},${(y + hh - ((v - lo) / (hi - lo || 1)) * hh).toFixed(1)}`).join(' '); return `<polyline class="monln" pathLength="1" points="${pts}" fill="none" stroke="${C.acc2}" stroke-width="1.3"/>`; };
  let sv = `<defs><linearGradient id="hqsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t0}"/><stop offset=".65" stop-color="${t1}"/><stop offset="1" stop-color="${t2}"/></linearGradient></defs><rect width="${W}" height="260" fill="url(#hqsky)"/>`;
  if (night) for (let i = 0; i < 40; i++) sv += `<circle cx="${(hash(i) * W).toFixed(0)}" cy="${(hash(i + 90) * 110).toFixed(0)}" r="${(0.4 + hash(i + 7) * 0.8).toFixed(1)}" fill="#F2F0F0" opacity="${(0.3 + hash(i + 3) * 0.5).toFixed(2)}"/>`;
  // arka şehir siluetleri
  for (let i = 0; i < 22; i++) { const w = 22 + hash(i + 50) * 22, x = i * 19 - 6, hh = 40 + hash(i + 11) * (50 + off * 22); sv += `<rect x="${x.toFixed(0)}" y="${(gy - hh).toFixed(0)}" width="${w.toFixed(0)}" height="${hh.toFixed(0)}" fill="${night ? '#17181d' : '#3b3f55'}" opacity=".9"/>`; if (lit) for (let k = 0; k < 6; k++) sv += `<rect x="${(x + 3 + (k % 3) * 6).toFixed(0)}" y="${(gy - hh + 6 + Math.floor(k / 3) * 12 + hash(i * 9 + k) * 20).toFixed(0)}" width="3" height="4" fill="#ffd9a0" opacity=".7"/>`; }
  // bina gövdesi (kesit)
  sv += `<g class="hqbld${rising ? ' rise' : ''}"><rect x="${bx - 6}" y="${top}" width="${bw + 12}" height="${gy - top}" fill="#1b1c21" stroke="${C.line}" stroke-width="2"/>`;
  const people = Math.min(s.staff.length, n * 3 + 2); let pi = 0;
  const person = (x: number, y: number, col: string) => `<circle cx="${x}" cy="${y - 7}" r="2.6" fill="#e0b494"/><rect x="${x - 2.6}" y="${y - 4.5}" width="5.2" height="6.5" rx="1.5" fill="${col}"/>`;
  for (let f = 0; f < n; f++) {
    const y = gy - (f + 1) * fh - 14 + 14, kind = f === 0 ? 'lobi' : f === n - 1 && n > 3 ? 'mudur' : off >= 3 && f === Math.floor(n / 2) ? 'toplanti' : 'acik';
    sv += `<rect x="${bx}" y="${y}" width="${bw}" height="${fh - 1.5}" fill="${lit ? '#3a2f26' : '#2b2f3a'}"/><rect x="${bx}" y="${y + fh - 3}" width="${bw}" height="1.5" fill="#0e0f12"/>`;
    if (kind === 'lobi') { sv += `<rect x="${bx + 14}" y="${y + 9}" width="40" height="6" rx="1" fill="${C.acc}"/>${person(bx + 24, y + 9, '#8E919B')}<rect x="${bx + bw - 54}" y="${y + 5}" width="40" height="9" rx="1" fill="#16171A" stroke="${C.line}"/>${chart(bx + bw - 51, y + 7, 34, 5)}`; }
    else if (kind === 'toplanti') { sv += `<rect x="${bx + 30}" y="${y + 10}" width="${bw - 70}" height="4" rx="2" fill="#6b4e3a"/><rect x="${bx + bw - 34}" y="${y + 3}" width="22" height="11" fill="#16171A" stroke="${C.mute}" stroke-width=".6"/>${chart(bx + bw - 32, y + 5, 18, 7)}`; for (let k = 0; k < 4; k++) sv += person(bx + 42 + k * 24, y + 14, ['#C64252', '#8E919B', '#3a3d4a', '#F2F0F0'][k]!); }
    else if (kind === 'mudur') { sv += `<rect x="${bx + 20}" y="${y + 10}" width="44" height="4" fill="#6b4e3a"/>${person(bx + 42, y + 10, '#F2F0F0')}<rect x="${bx + 70}" y="${y + 3}" width="36" height="10" fill="#16171A" stroke="${C.mute}" stroke-width=".6"/>${chart(bx + 73, y + 5, 30, 6)}<path d="M${bx + 120} ${y + 14} h40" stroke="${C.acc2}" stroke-width="3"/>`; }
    else { const desks = 4; for (let k = 0; k < desks; k++) { const dx = bx + 14 + k * 40; sv += `<rect x="${dx}" y="${y + 11}" width="26" height="3.5" fill="#5b4a3a"/><rect x="${dx + 6}" y="${y + 6}" width="11" height="6.5" fill="#16171A" stroke="${C.mute}" stroke-width=".5"/>${chart(dx + 7.5, y + 7.3, 8, 3.6)}`; if (pi < people) { sv += person(dx + 11, y + 13, ['#C64252', '#8E919B', '#3a3d4a', '#A83246', '#2f5aa8'][pi % 5]!); pi++; } } }
  }
  // dış cephe camı: kesiti çerçeveleyen sütunlar
  sv += `<rect x="${bx - 6}" y="${top}" width="6" height="${gy - top}" fill="#303137"/><rect x="${bx + bw}" y="${top}" width="6" height="${gy - top}" fill="#303137"/><rect x="${bx - 8}" y="${top - 6}" width="${bw + 16}" height="8" fill="${C.acc}"/>`;
  if (off >= 4) sv += `<circle cx="${bx + bw / 2}" cy="${top - 14}" r="9" fill="none" stroke="${C.mute}" stroke-width="1.2"/><text x="${bx + bw / 2}" y="${top - 10.5}" text-anchor="middle" font-size="10" font-weight="700" fill="${C.mute}">H</text>`;
  sv += `<rect x="${bx + 30}" y="${top - 20}" width="${bw - 60}" height="14" rx="2" fill="#16171A" stroke="${C.acc2}"/><text x="${bx + bw / 2}" y="${top - 10}" text-anchor="middle" font-size="9" font-weight="700" fill="${C.text}" font-family="Barlow Condensed,sans-serif">${c.name.replace(/[<>&]/g, '').toUpperCase().slice(0, 18)}</text></g>`;
  // yol, ağaçlar, hareketli arabalar
  sv += `<rect y="${gy}" width="${W}" height="24" fill="#101113"/><path d="M0 ${gy + 12} H${W}" stroke="#38383F" stroke-dasharray="10 8"/>`;
  for (let i = 0; i < 6; i++) sv += `<circle cx="${20 + i * 70 + hash(i) * 20}" cy="${gy - 6}" r="${5 + hash(i + 4) * 3}" fill="#3a6b4f" opacity=".85"/>`;
  const cars = Math.min(5, 1 + Math.floor(s.openCities.length / 2) + off); for (let i = 0; i < cars; i++) sv += `<g class="hqcar" style="animation-duration:${14 + i * 4}s;animation-delay:${-i * 3.5}s"><rect x="-22" y="${gy + 14 + (i % 2) * 6}" width="16" height="6" rx="2" fill="${['#C64252', '#8E919B', '#F2F0F0', '#E0A13A', '#3E7BFA'][i % 5]}"/>${lit ? `<circle cx="-6" cy="${gy + 17 + (i % 2) * 6}" r="1.6" fill="#ffe9b0"/>` : ''}</g>`;
  return `<svg viewBox="0 0 ${W} 260" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Genel merkez">${sv}</svg>`;
}

/** Genel Merkez ekranı: kesit görünüm + ofis seviyesi, yükseltme (animasyonlu) ve tamamlanan projeler galerisi. */
export function openHQ(app: App, onClose?: () => void): void {
  const modal = h('div', { class: 'modal hq', role: 'dialog', 'aria-label': 'Genel merkez' }), card = h('div', { class: 'card hqcard' }); modal.append(card);
  const close = () => { modal.classList.add('leaving'); setTimeout(() => { modal.remove(); onClose?.(); }, app.settings.reduced ? 0 : 200); }; modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  let rising = false;
  const render = () => {
    const s = app.store.state, c = s.company!, o = officeFor(c.office), st = officeStepFor(s), done = s.projects.filter((p) => p.status === 'satildi' || p.status === 'tamamlandi');
    const wins = s.tenders.filter((t) => t.status === 'kazandi');
    card.innerHTML = '';
    const scene = h('div', { class: 'hqscene', html: hqSvg(s, new Date(), rising) }); rising = false;
    const info = h('div', { class: 'hqinfo' },
      h('div', { style: 'display:flex;gap:10px;align-items:center' }, h('span', { html: emblemSvg(c.emblem.shape, c.emblem.color, 42) }), h('div', { style: 'min-width:0' }, h('h2', { style: 'font-size:24px;line-height:1' }, c.name), h('small', { class: 'mute' }, `${EMOJI.sirket} ${o.label} · seviye ${c.level}`))), h('button', { class: 'btn', style: 'margin-left:auto', onclick: close }, 'Kapat'),
      h('div', { class: 'kpis', style: 'margin:8px 0' }, h('div', { class: 'kpi', html: `<small>Kapasite</small><b>${s.staff.length}/${o.capacity}</b>` }), h('div', { class: 'kpi', html: `<small>Aylık kira</small><b>${formatMoney(TL(o.monthlyRentTL))}</b>` }), h('div', { class: 'kpi', html: `<small>Tamamlanan</small><b>${c.stats.completed}</b>` })),
      st ? h('div', { class: 'card', style: 'padding:10px' }, h('b', {}, `Sonraki merkez: ${officeFor(st.office).label}`), h('div', { class: 'mute', style: 'font-size:12px;margin:2px 0 8px' }, `${officeFor(st.office).capacity} kişi · seviye ${st.minLevel} gerekir · taşınma ${formatMoney(TL(st.costTL))}`), h('button', { class: 'btn gold', disabled: c.level < st.minLevel || c.cash < TL(st.costTL), onclick: () => { const r = app.store.run('UpgradeOffice', {}); if (r.ok) { app.audio.sfx('fanfare'); celebrate(app.settings.reduced); toast('Yeni genel merkeze taşındınız!'); rising = true; render(); } else { app.audio.sfx('error'); toast(r.error); } } }, c.level < st.minLevel ? `Seviye ${st.minLevel} gerekli` : 'Merkezi yükselt')) : h('div', { class: 'chip good' }, 'En üst merkez seviyesindesiniz'),
      h('div', { class: 'lbl-s', style: 'margin-top:10px' }, `🏗️ Proje galerisi (${done.length}) · 🤝 Kazanılan ihale (${wins.length})`),
      h('div', { class: 'gallery' }, ...(done.length ? done.slice().reverse().map((p) => h('div', { class: 'gitem' }, h('div', { class: 'gart', html: buildingArt(p.type, p.floors, 1, p.designSeed, p.quality) }), h('b', {}, p.name), h('small', { class: 'mute' }, p.status === 'satildi' ? `Kâr ${formatMoney(p.result?.profit ?? 0)} · ${formatDate(p.result?.soldDay ?? 0)}` : 'Teslim edildi'))) : [h('div', { class: 'empty' }, 'Tamamlanan projeleriniz burada sergilenir.')])));
    card.append(scene, info);
  };
  const unsub = app.store.subscribe((evs) => { if (!modal.isConnected) { unsub(); return; } if (evs.some((e) => ['PROJECT_COMPLETED', 'PROJECT_SOLD', 'OFFICE_UPGRADED', 'STAFF_HIRED', 'STAFF_FIRED', 'MONTH'].includes(e.type))) render(); });
  modal.addEventListener('unmount', unsub); render(); document.body.append(modal); press(app, 'whoosh' as never);
}
void OFFICE_STEPS;
