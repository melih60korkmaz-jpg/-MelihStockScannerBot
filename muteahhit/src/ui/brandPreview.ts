import { h } from './dom';
import { BRAND_COLORS, brandHex, emblemInner, emblemSvg } from './emblem';

export interface BrandState { name: string; founder: string; shape: number; color: number; city?: string }
const esc = (s: string) => s.replace(/[<>&"]/g, '');

/** Merkez tabelası: küçük bir bina cephesi; çatı tabelasında logo ve ad, yanda dikey bayrak. Marka rengi yalnızca logoda/şeritte. */
export function facadeSvg(b: BrandState, w = 240, hgt = 130): string {
  const hex = brandHex(b.color), name = esc(b.name || 'Şirket adı').toUpperCase().slice(0, 18), fs = name.length > 12 ? 9 : 11;
  let wins = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) wins += `<rect x="${58 + c * 21}" y="${64 + r * 14}" width="12" height="8" rx="1" fill="${(r + c) % 3 === 0 ? '#ffd9a0' : '#3b4048'}" opacity="${(r + c) % 3 === 0 ? 0.9 : 1}"/>`;
  return `<svg viewBox="0 0 240 130" width="${w}" height="${hgt}" role="img" aria-label="Şirket merkezi tabelası"><defs><linearGradient id="bfsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2228"/><stop offset="1" stop-color="#a8531f"/></linearGradient></defs>
  <rect width="240" height="130" fill="url(#bfsky)"/><rect x="0" y="112" width="240" height="18" fill="#17191C"/>
  <rect x="48" y="52" width="144" height="62" fill="#292D32" stroke="#4A5058"/>${wins}<rect x="112" y="98" width="16" height="16" fill="#17191C"/>
  <rect x="42" y="22" width="156" height="30" rx="4" fill="#17191C" stroke="${hex}" stroke-width="2"/>
  <svg x="48" y="25" width="24" height="24" viewBox="0 0 48 48" style="color:${hex}">${emblemInner(b.shape, b.color)}</svg>
  <text x="80" y="42" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="700" font-size="${fs + 4}" fill="#F5F5F3" letter-spacing="1.2">${name}</text>
  <rect x="204" y="30" width="22" height="70" rx="3" fill="#17191C" stroke="${hex}"/><svg x="206" y="34" width="18" height="18" viewBox="0 0 48 48" style="color:${hex}">${emblemInner(b.shape, b.color)}</svg>
  <rect x="204" y="58" width="22" height="2" fill="${hex}" opacity=".7"/></svg>`;
}

/**
 * Canlı şirket önizlemesi: şirket tabelası, kartvizit ve merkez tabelası. `update` çağrısı adı yazarken, logo/renk değişirken anında yansıtır;
 * renk değişimi CSS `color` geçişiyle akıcıdır, logo değişimi kısa bir büyüme animasyonu tetikler.
 */
export function brandPreview(init: BrandState) {
  let cur = { ...init };
  const logo = (cls: string, size: number) => h('span', { class: `blogo ${cls}`, html: emblemSvg(cur.shape, cur.color, size) });
  const signName = h('b', { class: 'bn' }), signFounder = h('small', { class: 'bf' });
  const sign = h('div', { class: 'bsign' }, logo('l1', 52), h('div', { class: 'bst' }, h('small', {}, 'İNŞAAT · TAAHHÜT'), signName));
  const cardName = h('b', { class: 'bn' }), cardFounder = h('div', { class: 'bfn' });
  const card = h('div', { class: 'bizcard' }, h('div', { class: 'bizstripe' }), logo('l2', 38), h('div', { class: 'bizb' }, cardName, h('small', {}, 'Müteahhit · İnşaat ve Taahhüt'), h('hr', {}), cardFounder, h('small', { class: 'bizr' }, 'Kurucu & Genel Müdür')));
  const facade = h('div', { class: 'bfacade' });
  const cap = (t: string, el: HTMLElement) => h('div', { class: 'bcap' }, h('small', {}, t), el);
  const root = h('div', { class: 'bprev', 'aria-label': 'Şirket önizlemesi' }, cap('Şirket tabelası', sign), cap('Kartvizit', card), cap('Merkez tabelası', facade));
  const paint = (shapeChanged: boolean, colorChanged: boolean) => {
    const nm = cur.name.trim() || 'Şirket adı', fo = cur.founder.trim() || 'Kurucu adı';
    signName.textContent = nm; cardName.textContent = nm; cardFounder.textContent = fo; signFounder.textContent = fo;
    const hex = brandHex(cur.color);
    root.style.setProperty('--brand', hex);
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('.blogo'))) {
      const svg = el.querySelector('svg')!;
      svg.innerHTML = emblemInner(cur.shape, cur.color); svg.style.color = hex;
      if (shapeChanged) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    }
    if (colorChanged) { root.classList.remove('flash'); void root.offsetWidth; root.classList.add('flash'); }
    facade.innerHTML = facadeSvg(cur);
  };
  paint(false, false);
  return { el: root, update(next: Partial<BrandState>) { const sc = next.shape !== undefined && next.shape !== cur.shape, cc = next.color !== undefined && next.color !== cur.color; cur = { ...cur, ...next }; paint(sc, cc); } };
}
export { BRAND_COLORS };
