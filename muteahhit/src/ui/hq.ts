import { TL, formatMoney } from '../core/money';
import { ACHIEVEMENTS, officeFor } from '../data';
import { officeStepFor } from '../sim/progress';
import { formatDate } from '../core/calendar';
import type { GameState } from '../core/types';
import { buildingPhoto, C, EMOJI } from './art';
import { brandHex, emblemInner, emblemSvg } from './emblem';
import { hourOf, skyAt } from './hero';
import { h, press, toast, celebrate } from './dom';
import { hqArt } from './artwork';
import type { App } from './app';

export type RoomKind = 'lobi' | 'acik' | 'toplanti-s' | 'toplanti-b' | 'yonetici' | 'proje' | 'basari' | 'luks' | 'logo';
/** Merkez seviyesine (ofis 1–4) göre kat planı — alttan üste. Oyuncunun sahip olmadığı seviyenin odaları asla gösterilmez. */
export function hqRooms(office: number): RoomKind[] {
  switch (Math.max(1, Math.min(4, office))) {
    case 1: return ['acik', 'toplanti-s'];
    case 2: return ['lobi', 'acik', 'yonetici', 'proje'];
    case 3: return ['lobi', 'acik', 'acik', 'toplanti-b', 'yonetici', 'basari', 'proje'];
    default: return ['logo', 'acik', 'acik', 'acik', 'toplanti-b', 'proje', 'basari', 'acik', 'luks', 'yonetici', 'luks'];
  }
}
const hash = (x: number) => { let a = (x * 2654435761) >>> 0; a ^= a >>> 15; return (Math.imul(a, 2246822519) >>> 0) / 4294967296; };

/**
 * Genel merkez kesiti. Seviye → kat/oda planı (`hqRooms`), personel sayısı → masadaki çalışanlar, tamamlanan proje sayısı → vitrin çerçeveleri,
 * açılan başarım sayısı → başarı rafı, net varlık geçmişi → monitörler. Gökyüzü/ışıklar günün saatine göre yumuşak değişir; ofis ışıkları akşam/gece yanar.
 */
export function hqSvg(s: GameState, now = new Date(), rising = false): string {
  const c = s.company!, off = c.office, rooms = hqRooms(off), n = rooms.length, fh = off >= 4 ? 17 : 19, W = 420, gy = 236, bw = off === 1 ? 140 : off === 2 ? 160 : off === 3 ? 180 : 196, bx = (W - bw) / 2 + (off >= 4 ? -14 : 0), top = gy - n * fh - 14;
  const { sky, night, sun, isDay } = skyAt(hourOf(now)), lit = night > 0.35;
  const hist = s.history.slice(-14).map((p) => p.netWorth), lo = Math.min(...hist, 0), hi = Math.max(...hist, 1);
  const chart = (x: number, y: number, w: number, hh: number) => { if (hist.length < 2) return `<path d="M${x} ${y + hh / 2} h${w}" stroke="${C.acc2}" stroke-width="1"/>`; const pts = hist.map((v, i) => `${(x + (i / (hist.length - 1)) * w).toFixed(1)},${(y + hh - ((v - lo) / (hi - lo || 1)) * hh).toFixed(1)}`).join(' '); return `<polyline class="monln" pathLength="1" points="${pts}" fill="none" stroke="${C.acc2}" stroke-width="1.3"/>`; };
  let sv = `<defs><linearGradient id="hqsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".65" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient><linearGradient id="hqglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fc3d6" stop-opacity=".28"/><stop offset="1" stop-color="#9fc3d6" stop-opacity=".05"/></linearGradient></defs><rect width="${W}" height="260" fill="url(#hqsky)"/>`;
  if (night > 0.3) for (let i = 0; i < 40; i++) sv += `<circle cx="${(hash(i) * W).toFixed(0)}" cy="${(hash(i + 90) * 110).toFixed(0)}" r="${(0.4 + hash(i + 7) * 0.8).toFixed(1)}" fill="#F5F5F3" opacity="${(night * (0.3 + hash(i + 3) * 0.5)).toFixed(2)}"/>`;
  { const sx = 30 + sun * (W - 60), sy = 150 - Math.sin(sun * Math.PI) * 110; // güneş (gün) / ay (gece) yayı
    sv += isDay ? `<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="13" fill="${sun < 0.15 || sun > 0.85 ? '#ffb070' : '#fff3c9'}" opacity=".95"/>` : `<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="9" fill="#e9e4dc"/><circle cx="${(sx + 4).toFixed(0)}" cy="${(sy - 2).toFixed(0)}" r="8" fill="${sky[0]}"/>`; }
  for (let i = 0; i < 22; i++) { const w = 22 + hash(i + 50) * 22, x = i * 19 - 6, hh = 40 + hash(i + 11) * (50 + off * 22); sv += `<rect x="${x.toFixed(0)}" y="${(gy - hh).toFixed(0)}" width="${w.toFixed(0)}" height="${hh.toFixed(0)}" fill="${night > 0.5 ? '#17181d' : '#3b3f55'}" opacity=".9"/>`; if (night > 0.2) for (let k = 0; k < 6; k++) sv += `<rect x="${(x + 3 + (k % 3) * 6).toFixed(0)}" y="${(gy - hh + 6 + Math.floor(k / 3) * 12 + hash(i * 9 + k) * 20).toFixed(0)}" width="3" height="4" fill="#ffd9a0" opacity="${(night * 0.7).toFixed(2)}"/>`; }
  sv += `<g class="hqbld${rising ? ' rise' : ''}"><rect x="${bx - 6}" y="${top}" width="${bw + 12}" height="${gy - top}" fill="#1b1c21" stroke="${C.line}" stroke-width="2"/>`;
  const people = Math.min(s.staff.length, n * 3 + 2); let pi = 0;
  const person = (x: number, y: number, col: string) => `<circle cx="${x}" cy="${y - 7}" r="2.6" fill="#e0b494"/><rect x="${x - 2.6}" y="${y - 4.5}" width="5.2" height="6.5" rx="1.5" fill="${col}"/>`;
  const done = s.projects.filter((p) => p.status === 'satildi' || p.status === 'tamamlandi'), nAch = Object.keys(s.progress.ach).length;
  const palette = ['#FF8C32', '#9299A1', '#41474F', '#F07824', '#4A5058'];
  rooms.forEach((kind, f) => {
    const y = gy - (f + 1) * fh, w = bw; // oda zemini
    const warm = kind === 'luks' ? '#3a2f26' : kind === 'yonetici' ? '#3a2f26' : '#2f2a26';
    sv += `<g class="hqfloor" data-f="${f}"><rect x="${bx}" y="${y}" width="${w}" height="${fh - 1.5}" fill="${lit ? warm : '#2b2f3a'}" class="hqroom"/><rect x="${bx}" y="${y + fh - 3}" width="${w}" height="1.5" fill="#0e0f12"/>`;
    if (kind === 'lobi' || kind === 'logo') sv += `<rect x="${bx + 14}" y="${y + fh - 10}" width="${kind === 'logo' ? 60 : 40}" height="6" rx="1" fill="${C.acc}"/>${person(bx + 24, y + fh - 9, '#9299A1')}<rect x="${bx + w - 56}" y="${y + 4}" width="42" height="9" rx="1" fill="#17191C" stroke="${C.line}"/>${chart(bx + w - 53, y + 6, 36, 5)}`;
    else if (kind === 'toplanti-s') sv += `<rect x="${bx + 30}" y="${y + fh - 9}" width="${w - 70}" height="4" rx="2" fill="#6b4e3a"/>${[0, 1, 2].map((k) => person(bx + 44 + k * 26, y + fh - 4, palette[k]!)).join('')}<rect x="${bx + w - 34}" y="${y + 3}" width="22" height="9" fill="#17191C" stroke="${C.mute}" stroke-width=".6"/>${chart(bx + w - 32, y + 4.5, 18, 5)}`;
    else if (kind === 'toplanti-b') { sv += `<rect x="${bx + 20}" y="${y + fh - 9}" width="${w - 56}" height="4.5" rx="2" fill="#6b4e3a"/><rect x="${bx + w - 40}" y="${y + 2}" width="30" height="11" fill="#17191C" stroke="${C.mute}" stroke-width=".6"/>${chart(bx + w - 38, y + 4, 26, 6)}`; for (let k = 0; k < 6; k++) sv += person(bx + 30 + k * 21, y + fh - 4, palette[k % 5]!); }
    else if (kind === 'yonetici') sv += `<rect x="${bx + 16}" y="${y + fh - 9}" width="46" height="4" fill="#6b4e3a"/>${person(bx + 40, y + fh - 8, '#F5F5F3')}<rect x="${bx + 70}" y="${y + 3}" width="36" height="10" fill="#17191C" stroke="${C.mute}" stroke-width=".6"/>${chart(bx + 73, y + 5, 30, 6)}<rect x="${bx + w - 30}" y="${y + 3}" width="22" height="11" fill="url(#hqglass)" stroke="${C.line}"/>`;
    else if (kind === 'luks') sv += `<rect x="${bx + 12}" y="${y + fh - 8}" width="56" height="4" fill="#4a3a30"/>${person(bx + 40, y + fh - 8, '#F5F5F3')}<rect x="${bx + 84}" y="${y + fh - 8}" width="40" height="5" rx="2" fill="${C.acc}"/><circle cx="${bx + w - 30}" cy="${y + 5}" r="3.4" fill="#ffd9a0" opacity="${lit ? 0.9 : 0.3}"/><path d="M${bx + w - 30} ${y} v2" stroke="${C.mute}"/><rect x="${bx + w - 18}" y="${y + 6}" width="5" height="9" fill="#3a6b4f"/>`;
    else if (kind === 'proje') { const k = Math.min(5, done.length); if (!k) sv += `<text x="${bx + w / 2}" y="${y + 11}" text-anchor="middle" font-size="6" fill="${C.dim}">Proje vitrini</text>`; for (let i = 0; i < k; i++) { const fx = bx + 12 + i * ((w - 24) / 5); sv += `<rect x="${fx}" y="${y + 3}" width="22" height="12" rx="1" fill="#17191C" stroke="${C.acc2}" stroke-width=".8"/><rect x="${fx + 5 + (i % 3)}" y="${y + 6}" width="${8 + (i % 2) * 4}" height="9" fill="#41474F"/><rect x="${fx + 7}" y="${y + 8}" width="2" height="2" fill="#9fb3c6"/>`; } }
    else if (kind === 'basari') { const k = Math.min(8, nAch); if (!k) sv += `<text x="${bx + w / 2}" y="${y + 11}" text-anchor="middle" font-size="6" fill="${C.dim}">Başarı rafı</text>`; sv += `<rect x="${bx + 10}" y="${y + fh - 6}" width="${w - 20}" height="2" fill="#5b4a3a"/>`; for (let i = 0; i < k; i++) sv += `<path d="M${bx + 20 + i * 18} ${y + fh - 8} l4 -3 4 3 v-6 l-4 -3 -4 3z" fill="${i % 3 === 2 ? '#FFB15C' : i % 3 === 1 ? C.acc2 : '#9299A1'}" stroke="#17191C" stroke-width=".5"/>`; }
    else { for (let k = 0; k < 4; k++) { const dx = bx + 14 + k * ((w - 28) / 4); sv += `<rect x="${dx}" y="${y + fh - 8}" width="26" height="3.5" fill="#5b4a3a"/><rect x="${dx + 6}" y="${y + fh - 13}" width="11" height="6.5" fill="#17191C" stroke="${C.mute}" stroke-width=".5"/>${chart(dx + 7.5, y + fh - 11.7, 8, 3.6)}`; if (pi < people) { sv += person(dx + 11, y + fh - 6, palette[pi % 5]!); pi++; } } }
    if (off >= 3 && (kind === 'toplanti-b' || kind === 'yonetici' || kind === 'luks')) sv += `<rect x="${bx + w - 4}" y="${y}" width="4" height="${fh - 1.5}" fill="url(#hqglass)"/>`; // panoramik cam
    sv += `</g>`;
  });
  sv += `<rect x="${bx - 6}" y="${top}" width="6" height="${gy - top}" fill="#41474F"/><rect x="${bx + bw}" y="${top}" width="6" height="${gy - top}" fill="#41474F"/><rect x="${bx - 8}" y="${top - 6}" width="${bw + 16}" height="8" fill="${C.acc}"/>`;
  if (off >= 4) sv += `<circle cx="${bx + bw / 2}" cy="${top - 14}" r="9" fill="none" stroke="${C.mute}" stroke-width="1.2"/><text x="${bx + bw / 2}" y="${top - 10.5}" text-anchor="middle" font-size="10" font-weight="700" fill="${C.mute}">H</text><rect x="${bx + bw + 10}" y="${top + 6}" width="14" height="${Math.max(30, (gy - top) * 0.6)}" rx="2" fill="#17191C" stroke="${C.acc2}"/><text x="${bx + bw + 17}" y="${top + 12 + Math.max(30, (gy - top) * 0.6) / 2}" text-anchor="middle" font-size="9" font-weight="700" fill="${C.text}" transform="rotate(-90 ${bx + bw + 17} ${top + 6 + Math.max(30, (gy - top) * 0.6) / 2})" font-family="Barlow Condensed,sans-serif" letter-spacing="2">${c.name.replace(/[<>&]/g, '').toUpperCase().slice(0, 14)}</text>`;
  { const bh = brandHex(c.emblem.color), nm = c.name.replace(/[<>&]/g, '').toUpperCase().slice(0, 16), sx = bx + 14, sw = bw - 28; // çatı tabelası: şirket logosu + ad (marka rengi çerçeve)
    sv += `<rect x="${sx}" y="${top - 24}" width="${sw}" height="18" rx="3" fill="#16171A" stroke="${bh}" stroke-width="1.6"/><svg x="${sx + 3}" y="${top - 22}" width="14" height="14" viewBox="0 0 48 48" style="color:${bh}">${emblemInner(c.emblem.shape, c.emblem.color)}</svg><text x="${sx + 22 + (sw - 22) / 2}" y="${top - 11}" text-anchor="middle" font-size="9" font-weight="700" fill="${C.text}" font-family="Barlow Condensed,sans-serif" letter-spacing="1">${nm}</text></g>`; }
  sv += `<rect y="${gy}" width="${W}" height="24" fill="#17191C"/><path d="M0 ${gy + 12} H${W}" stroke="#4A5058" stroke-dasharray="10 8"/>`;
  for (let i = 0; i < 6; i++) sv += `<circle cx="${20 + i * 70 + hash(i) * 20}" cy="${gy - 6}" r="${5 + hash(i + 4) * 3}" fill="#3a6b4f" opacity=".85"/>`;
  const cars = Math.min(5, 1 + Math.floor(s.openCities.length / 2) + off); for (let i = 0; i < cars; i++) sv += `<g class="hqcar" style="animation-duration:${14 + i * 4}s;animation-delay:${-i * 3.5}s"><rect x="-22" y="${gy + 14 + (i % 2) * 6}" width="16" height="6" rx="2" fill="${['#FF8C32', '#9299A1', '#F5F5F3', '#F5C542', '#9299A1'][i % 5]}"/>${lit ? `<circle cx="-6" cy="${gy + 17 + (i % 2) * 6}" r="1.6" fill="#ffe9b0"/>` : ''}</g>`;
  return `<svg viewBox="0 0 ${W} 260" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Genel merkez" data-lit="${lit ? 1 : 0}">${sv}</svg>`;
}

/** Ofis ışıkları: akşam/gece katlar alttan üste sırayla yanar, gündüz sönük kalır (hareket azaltmada anında). */
function animateLights(scene: HTMLElement, reduced: boolean) {
  const svg = scene.querySelector('svg'); if (!svg) return; const lit = svg.getAttribute('data-lit') === '1';
  const rooms = [...svg.querySelectorAll<SVGElement>('.hqroom')]; rooms.forEach((r) => r.classList.toggle('lt-on', false));
  rooms.forEach((r, i) => { const on = () => r.classList.toggle('lt-on', lit); if (reduced) on(); else setTimeout(on, 120 + i * 90); });
}

/** Genel Merkez ekranı: kesit görünüm + ofis seviyesi, yükseltme (animasyonlu), proje galerisi ve başarı rafı. */
export function openHQ(app: App, onClose?: () => void): void {
  const modal = h('div', { class: 'modal hq', role: 'dialog', 'aria-label': 'Genel merkez' }), card = h('div', { class: 'card hqcard' }); modal.append(card);
  const close = () => { modal.classList.add('leaving'); setTimeout(() => { modal.remove(); onClose?.(); }, app.settings.reduced ? 0 : 200); }; modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
  let rising = false, view: 'kesit' | 'manzara' = 'kesit';
  const render = () => {
    const s = app.store.state, c = s.company!, o = officeFor(c.office), st = officeStepFor(s), done = s.projects.filter((p) => p.status === 'satildi' || p.status === 'tamamlandi');
    const wins = s.tenders.filter((t) => t.status === 'kazandi'), got = ACHIEVEMENTS.filter((a) => s.progress.ach[a.id] !== undefined);
    card.innerHTML = '';
    const scene = h('div', { class: 'hqscene' }); if (view === 'manzara' && hqArt(c.office)) scene.append(h('img', { class: 'hqpaint', src: hqArt(c.office), alt: `${o.label} manzara resmi`, decoding: 'async' })); else scene.innerHTML = hqSvg(s, new Date(), rising);
    if (hqArt(c.office)) scene.append(h('div', { class: 'seg hqview' }, h('button', { class: view === 'kesit' ? 'on' : '', onclick: () => { view = 'kesit'; render(); } }, 'Kesit'), h('button', { class: view === 'manzara' ? 'on' : '', onclick: () => { view = 'manzara'; render(); } }, 'Manzara'))); const wasRising = rising; rising = false;
    const info = h('div', { class: 'hqinfo' },
      h('div', { style: 'display:flex;gap:10px;align-items:center' }, h('span', { html: emblemSvg(c.emblem.shape, c.emblem.color, 42) }), h('div', { style: 'min-width:0' }, h('h2', { style: 'font-size:24px;line-height:1' }, c.name), h('small', { class: 'mute' }, `${EMOJI.sirket} ${o.label} · seviye ${c.level}`), h('small', { class: 'mute', style: 'display:block' }, `Kurucu: ${c.founder ?? 'Patron'}`))), h('button', { class: 'btn', style: 'margin-left:auto', onclick: close }, 'Kapat'),
      h('div', { class: 'kpis', style: 'margin:8px 0' }, h('div', { class: 'kpi', html: `<small>Kapasite</small><b>${s.staff.length}/${o.capacity}</b>` }), h('div', { class: 'kpi', html: `<small>Aylık kira</small><b>${formatMoney(TL(o.monthlyRentTL))}</b>` }), h('div', { class: 'kpi', html: `<small>Tamamlanan</small><b>${c.stats.completed}</b>` })),
      st ? h('div', { class: 'card', style: 'padding:10px' }, h('b', {}, `Sonraki merkez: ${officeFor(st.office).label}`), h('div', { class: 'mute', style: 'font-size:12px;margin:2px 0 8px' }, `${officeFor(st.office).capacity} kişi · seviye ${st.minLevel} gerekir · taşınma ${formatMoney(TL(st.costTL))}`), h('button', { class: 'btn gold', disabled: c.level < st.minLevel || c.cash < TL(st.costTL), onclick: () => { const r = app.store.run('UpgradeOffice', {}); if (r.ok) { app.audio.sfx('fanfare'); celebrate(app.settings.reduced); toast('Yeni genel merkeze taşındınız!'); rising = true; render(); } else { app.audio.sfx('error'); toast(r.error); } } }, c.level < st.minLevel ? `Seviye ${st.minLevel} gerekli` : 'Merkezi yükselt')) : h('div', { class: 'chip good' }, 'En üst merkez seviyesindesiniz'),
      h('div', { class: 'lbl-s', style: 'margin-top:10px' }, `🏗️ Proje galerisi (${done.length}) · 🤝 Kazanılan ihale (${wins.length}) · 🏆 Başarım (${got.length})`),
      h('div', { class: 'gallery' }, ...(done.length ? done.slice().reverse().map((p) => h('div', { class: 'gitem' }, h('div', { class: 'gart', html: buildingPhoto(p.type, p.floors, 1, p.designSeed, p.quality) }), h('b', {}, p.name), h('small', { class: 'mute' }, p.status === 'satildi' ? `Kâr ${formatMoney(p.result?.profit ?? 0)} · ${formatDate(p.result?.soldDay ?? 0)}` : 'Teslim edildi'))) : [h('div', { class: 'empty' }, 'Tamamlanan projeleriniz burada sergilenir.')])),
      ...(c.office >= 3 && got.length ? [h('div', { class: 'lbl-s', style: 'margin-top:8px' }, '🏆 Başarı rafı'), h('div', { class: 'shelf' }, ...got.slice(-8).map((a) => h('span', { class: 'shelfitem', title: `${a.t}: ${a.x}` }, '🏆')))] : []));
    card.append(scene, info); if (view === 'kesit') animateLights(scene, app.settings.reduced); void wasRising;
  };
  const unsub = app.store.subscribe((evs) => { if (!modal.isConnected) { unsub(); return; } if (evs.some((e) => ['PROJECT_COMPLETED', 'PROJECT_SOLD', 'OFFICE_UPGRADED', 'STAFF_HIRED', 'STAFF_FIRED', 'MONTH', 'ACHIEVEMENT', 'TENDER_WON'].includes(e.type))) render(); });
  modal.addEventListener('unmount', unsub); render(); document.body.append(modal); press(app, 'whoosh');
}
