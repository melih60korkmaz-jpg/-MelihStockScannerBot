import type { GameState, Offer, Project, Unit } from '../core/types';
import { brandHex, emblemInner } from './emblem';

/** Alıcı figürü: tohumdan deterministik; profil kıyafeti/aksesuarı belirler. 24×32 kutusunda çizilir. */
const SK = ['#f1c9a5', '#e0ac82', '#c68863', '#8d5a3b'], CL = ['#3b6fb6', '#b64b3b', '#4a8f5a', '#8a5ab6', '#c79a2a', '#4a5568'], HR = ['#2b2118', '#5a3a1e', '#1b1b1f', '#8a8d93'];
export function buyerInner(seed: number, profile: string): string {
  const sk = SK[seed % SK.length]!, cl = CL[(seed >> 2) % CL.length]!, hr = /Emekli/.test(profile) ? '#b9bcc2' : HR[(seed >> 4) % HR.length]!;
  const coat = /Doktor|Muayene/.test(profile) ? '#f2f4f7' : cl, case_ = /Yatırımcı|Girişimci|şirket|Zincir/.test(profile), cane = /Emekli/.test(profile);
  let s = `<ellipse cx="12" cy="31" rx="7" ry="1.4" fill="#0006"/><rect x="8.6" y="20" width="2.8" height="9.5" rx="1" fill="#2b3340"/><rect x="12.6" y="20" width="2.8" height="9.5" rx="1" fill="#2b3340"/>`;
  s += `<path d="M6.5 22 q0-9 5.5-9 q5.5 0 5.5 9z" fill="${coat}"/><circle cx="12" cy="8.5" r="4.6" fill="${sk}"/><path d="M7.6 8 q0-5.4 4.4-5.4 q4.4 0 4.4 5.4 q-2.2-2.4-4.4-2.4 q-2.2 0-4.4 2.4z" fill="${hr}"/>`;
  s += `<circle cx="10.2" cy="9" r=".7" fill="#1b1b1f"/><circle cx="13.8" cy="9" r=".7" fill="#1b1b1f"/><path d="M10.4 11.2 q1.6 1.2 3.2 0" fill="none" stroke="#7a3b2e" stroke-width=".7"/>`;
  if (case_) s += `<rect x="16.4" y="21.5" width="5" height="4" rx=".8" fill="#4a3426"/><path d="M17.8 21.5 v-1 h2.2 v1" fill="none" stroke="#4a3426" stroke-width=".6"/>`;
  if (cane) s += `<path d="M19.5 20 v11" stroke="#7a5a3a" stroke-width="1" stroke-linecap="round"/>`;
  return s;
}
export const buyerSvg = (seed: number, profile: string, size = 40): string => `<svg viewBox="0 0 24 32" width="${size}" height="${Math.round(size * 1.33)}" aria-hidden="true">${buyerInner(seed, profile)}</svg>`;

export interface SceneOpts { sel: number | null; seen: Set<number>; just: Set<number>; offers: Offer[] }
const GLYPH: Record<string, string> = { satildi: '✓', kirada: '⌂', hold: '⛔', kapora: '◔' };
export const unitState = (u: Unit): 'satildi' | 'kirada' | 'hold' | 'kapora' | 'bos' => (u.status === 'satildi' ? 'satildi' : u.rent ? 'kirada' : u.hold ? 'hold' : u.status === 'kapora' ? 'kapora' : 'bos');

/**
 * Satış merkezi kesiti: katlar ve daireler gerçek `units` verisinden çizilir. Her daire durumuna göre renklenir (boş = ışıklı, satıldı = yeşil,
 * kirada = mavi, rezerve = gri); bekleyen tekliflerde daire üstünde nabız atan balon, zeminde de o alıcıların figürleri bulunur.
 */
export function sceneSvg(s: GameState, p: Project, us: Unit[], o: SceneOpts): string {
  const c = s.company!, W = 440, H = 300, gy = 258, F = Math.max(1, Math.min(p.floors, 40)), fh = Math.min(F < 4 ? 62 : 36, 190 / F), bw = Math.min(280, 150 + Math.min(8, Math.max(...Array.from({ length: F }, (_, i) => us.filter((u) => u.floor === i + 1).length), 1)) * 16), bx = (W - bw) / 2, top = gy - F * fh;
  const hex = brandHex(c.emblem.color), nm = c.name.replace(/[<>&]/g, '').toUpperCase().slice(0, 18), byFloor = new Map<number, Unit[]>();
  for (const u of us) { const f = Math.min(F, Math.max(1, u.floor)); (byFloor.get(f) ?? byFloor.set(f, []).get(f)!).push(u); }
  const offerOf = new Map<number, Offer>(); for (const x of o.offers) offerOf.set(x.unitId, x);
  let sv = `<defs><linearGradient id="scsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3550"/><stop offset=".65" stop-color="#6b5a6e"/><stop offset="1" stop-color="#d98a52"/></linearGradient><linearGradient id="scbld" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a5058"/><stop offset=".5" stop-color="#5b626b"/><stop offset="1" stop-color="#434950"/></linearGradient></defs>`;
  sv += `<rect width="${W}" height="${gy}" fill="url(#scsky)"/><circle cx="360" cy="52" r="20" fill="#ffd9a0" opacity=".9"/>`;
  sv += `<g class="sc-cloud" style="animation-duration:46s"><ellipse cx="80" cy="46" rx="30" ry="8" fill="#fff" opacity=".22"/><ellipse cx="100" cy="42" rx="20" ry="7" fill="#fff" opacity=".22"/></g><g class="sc-cloud" style="animation-duration:70s;animation-delay:-30s"><ellipse cx="260" cy="30" rx="26" ry="6" fill="#fff" opacity=".18"/></g>`;
  for (let i = 0; i < 9; i++) { const x = i * 52 - 10, hh = 34 + ((i * 37) % 46); sv += `<rect x="${x}" y="${gy - hh}" width="40" height="${hh}" fill="#1f2430" opacity=".55"/>`; }
  sv += `<rect y="${gy}" width="${W}" height="${H - gy}" fill="#23262b"/><rect y="${gy}" width="${W}" height="6" fill="#3a3f46"/><path d="M0 ${gy + 24} H${W}" stroke="#6a717a" stroke-dasharray="14 10" stroke-width="1.5"/>`;
  // bina gövdesi
  sv += `<rect x="${bx - 5}" y="${top - 4}" width="${bw + 10}" height="${F * fh + 4}" fill="#2f343b"/><rect x="${bx}" y="${top}" width="${bw}" height="${F * fh}" fill="url(#scbld)"/><rect x="${bx - 8}" y="${top - 9}" width="${bw + 16}" height="8" rx="2" fill="${hex}"/>`;
  sv += `<g><rect x="${bx + 10}" y="${top - 31}" width="${bw - 20}" height="19" rx="3" fill="#16171A" stroke="${hex}" stroke-width="1.5"/><svg x="${bx + 13}" y="${top - 29}" width="15" height="15" viewBox="0 0 48 48" style="color:${hex}">${emblemInner(c.emblem.shape, c.emblem.color)}</svg><text x="${bx + 33 + (bw - 54) / 2}" y="${top - 18}" text-anchor="middle" font-size="9" font-weight="700" fill="#f5f5f3" letter-spacing=".5">${nm}</text></g>`;
  // daireler
  const bubbles: string[] = [];
  for (let f = 1; f <= F; f++) {
    const row = (byFloor.get(f) ?? []).slice().sort((a, b) => a.id - b.id), n = row.length, ry = gy - f * fh; if (!n) continue;
    const cw = (bw - 12) / n;
    row.forEach((u, i) => {
      const st = unitState(u), x = bx + 6 + i * cw + 2, w = Math.max(6, cw - 4), y = ry + 4, hh = Math.max(8, fh - 8), pop = o.just.has(u.id) ? ' pop' : '', sel = o.sel === u.id ? ' sel' : '', off = offerOf.get(u.id);
      sv += `<g class="sc-cell ${st}${pop}${sel}" data-u="${u.id}" tabindex="0" role="button" aria-label="${u.floor}. kat ${u.rooms} ${st}"><rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="2.5"/>`;
      if (w > 15 && hh > 16) sv += `<text x="${x + w / 2}" y="${y + hh / 2 + 3.5}" text-anchor="middle" font-size="${Math.min(12, hh * 0.45)}">${GLYPH[st] ?? ''}</text>`;
      if (st === 'bos' && w > 30 && hh > 22) sv += `<text x="${x + w / 2}" y="${y + hh - 4}" text-anchor="middle" font-size="7" class="sc-rm">${u.rooms}</text>`;
      sv += `</g>`;
      if (off) bubbles.push(`<g class="sc-bubble" style="animation-delay:${(u.id % 7) * 0.2}s"><circle cx="${x + w - 2}" cy="${y + 1}" r="6.5" fill="${off.kind === 'kira' ? '#3E7BFA' : '#FF8C32'}" stroke="#17191C" stroke-width="1.2"/><text x="${x + w - 2}" y="${y + 4.2}" text-anchor="middle" font-size="9" font-weight="800" fill="#17191C">${off.kind === 'kira' ? 'K' : '!'}</text></g>`);
    });
  }
  sv += bubbles.join('');
  // giriş ve satış ofisi
  sv += `<rect x="${W / 2 - 11}" y="${gy - 24}" width="22" height="24" rx="2" fill="#16171A" stroke="${hex}" stroke-width="1.2"/><path d="M${W / 2} ${gy - 24} V${gy}" stroke="#ffffff22"/>`;
  sv += `<g><rect x="16" y="${gy - 34}" width="58" height="34" rx="3" fill="#3b4048" stroke="${hex}"/><rect x="22" y="${gy - 26}" width="20" height="14" fill="#ffd9a0" opacity=".85"/><text x="45" y="${gy - 38}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#f5f5f3">SATIŞ OFİSİ</text><path d="M66 ${gy - 34} v-26" stroke="#c9ccd2" stroke-width="1.4"/><path class="sc-flag" d="M66 ${gy - 60} q9 -4 16 0 q-7 4 -16 0 q9 6 16 2 v10 q-9 -4 -16 0z" fill="${hex}"/></g>`;
  // yoldaki arabalar
  sv += `<g class="sc-car" style="animation-duration:15s"><rect x="-30" y="${gy + 11}" width="22" height="8" rx="3" fill="#F5C542"/><rect x="-26" y="${gy + 7}" width="12" height="6" rx="2" fill="#F5C542"/><circle cx="-24" cy="${gy + 20}" r="2.5" fill="#111"/><circle cx="-14" cy="${gy + 20}" r="2.5" fill="#111"/></g><g class="sc-car rev" style="animation-duration:22s;animation-delay:-9s"><rect x="-30" y="${gy + 29}" width="22" height="8" rx="3" fill="#C0C4C8"/><rect x="-26" y="${gy + 25}" width="12" height="6" rx="2" fill="#C0C4C8"/><circle cx="-24" cy="${gy + 38}" r="2.5" fill="#111"/><circle cx="-14" cy="${gy + 38}" r="2.5" fill="#111"/></g>`;
  // bekleyen alıcılar: kapıya doğru yürür, sonra bekler
  o.offers.slice(0, 6).forEach((x, i) => {
    const tx = W / 2 + 22 + i * 17, fresh = !o.seen.has(x.id), cls = fresh ? 'sc-walker new' : 'sc-walker idle';
    sv += `<g class="${cls}" style="--tx:${tx}px;--ty:${gy - 22}px;--dl:${i * 0.25}s;transform:translate(var(--tx),var(--ty))"><g class="sc-bob" style="animation-delay:${(i % 4) * 0.3}s"><svg width="15" height="20" viewBox="0 0 24 32">${buyerInner(x.seed, x.profile)}</svg></g></g>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Satış merkezi: bina kesiti">${sv}</svg>`;
}
