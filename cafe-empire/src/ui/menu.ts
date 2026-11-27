/** "Tüm menüler" ekranı: bütün kategorileri ve içindeki sayfaları tek bakışta, açılır-kapanır gruplar halinde gösterir.
 *  Her sayfa kendi ekranını açar; burası yalnızca haritadır. */
import { GRUPLAR, NAV, grupOf } from './panels';
import { grupAcik, kilitNedeni, tabAcik } from '../core/kademe';
import { kapatAnimli } from './anim';
import type { GameState } from '../core/types';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c] ?? c);
export interface MenuCb { git: (tab: string) => void; kilit: (id: string) => void }
const acik = new Set<string>();   // açık (genişletilmiş) kategoriler; oturum boyunca hatırlanır

function bolum(s: GameState, g: (typeof GRUPLAR)[number], aktifGrup: string): string {
  const grupKilit = !grupAcik(s, g.id), n = g.tabs.filter((t) => !grupKilit && tabAcik(s, t)).length, ac = acik.has(g.id) || g.id === aktifGrup && !acik.has('!' + g.id);
  const tiles = g.tabs.map((id) => {
    const nv = NAV.find((x) => x[0] === id)!, kilit = grupKilit || !tabAcik(s, id);
    return kilit ? `<button class="mnt lock" data-mk="${id}" data-g="${g.id}"><i>${nv[1]}</i><span>${esc(nv[2])}</span><u>🔒</u></button>` : `<button class="mnt" data-mt="${id}"><i>${nv[1]}</i><span>${esc(nv[2])}</span></button>`;
  }).join('');
  const neden = grupKilit ? `<div class="mnn">🔒 ${esc(kilitNedeni(s, g.id))}</div>` : '';
  return `<section class="mng ${ac ? 'open' : ''}" style="--c:${g.renk}"><button class="mnh" data-mg="${g.id}" aria-expanded="${ac}"><i>${g.ik}</i><span><b>${esc(g.ad)}</b><small>${esc(g.ac)}</small></span><em>${grupKilit ? '🔒' : `${n}/${g.tabs.length}`}</em><u>▾</u></button><div class="mnb">${neden}<div class="mntg">${tiles}</div></div></section>`;
}
/** Menü ekranını açar. aktifTab: şu an açık sayfa (kendi kategorisi açık gelir). */
export function menuAc(root: HTMLElement, s: GameState, aktifTab: string, cb: MenuCb): void {
  if (root.querySelector('.mn')) return;
  const aktif = grupOf(aktifTab).id, o = document.createElement('div'); o.className = 'mn';
  const ciz = (): string => GRUPLAR.map((g) => bolum(s, g, aktif)).join('');
  o.innerHTML = `<div class="mnbox" role="dialog" aria-label="Tüm menüler"><div class="mntop"><b>☰ Tüm menüler</b><span class="sp"></span><button class="ibtn" data-mx="kapat" aria-label="Kapat">✕</button></div><div class="mnlist" id="mnList">${ciz()}</div></div>`;
  root.appendChild(o);
  o.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-mg],[data-mt],[data-mk],[data-mx]'); if (!el) { if (e.target === o) kapatAnimli(o); return; }
    if (el.dataset.mx) { kapatAnimli(o); return; }
    if (el.dataset.mt) { kapatAnimli(o); cb.git(el.dataset.mt); return; }
    if (el.dataset.mk) { cb.kilit(el.dataset.mk); return; }
    if (el.dataset.mg) { const id = el.dataset.mg, sec = el.closest('.mng') as HTMLElement, simdi = sec.classList.toggle('open'); el.setAttribute('aria-expanded', String(simdi)); if (simdi) { acik.add(id); acik.delete('!' + id); } else { acik.delete(id); acik.add('!' + id); } }
  });
}
export const menuAcikMi = (root: HTMLElement): boolean => !!root.querySelector('.mn');
