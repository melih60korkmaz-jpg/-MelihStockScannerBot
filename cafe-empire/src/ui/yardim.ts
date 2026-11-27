/** Oyun rehberi (? ekranı) ve ilk adımlar çubuğu. Mantık core/ogretici.ts'te; burası yalnızca çizim ve olaylar. */
import { YARDIM_KONULARI, YOK_LISTESI } from '../data/yardim';
import { OGR, Og, ogrAtla, ogrDurum, ogrGorunur, ogrKapat, ogrYenidenAc, type OgrAdim } from '../core/ogretici';
import { grupAcik, tabAcik } from '../core/kademe';
import { grupOf } from './panels';
import { kapatAnimli } from './anim';
import type { GameState } from '../core/types';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c] ?? c);
export interface YardimCb { git: (tab: string) => void; ogrAc?: () => void }
let sonKonu = 'amac', kucuk = false;

/** Bir sekmeye gidilebilir mi (kilitli değilse)? */
const gidilir = (s: GameState | null, tab: string): boolean => !!s && grupAcik(s, grupOf(tab).id) && tabAcik(s, tab);

function icerik(s: GameState | null, id: string): string {
  if (id === 'yok') return `<h2>🚧 Oyunda olmayanlar</h2><p class="ydoz">Bunlar şu an oyunda yok; yukarıdaki başlıklardaki her şey ise gerçekten çalışıyor.</p><ul>${YOK_LISTESI.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`;
  const k = YARDIM_KONULARI.find((x) => x.id === id) ?? YARDIM_KONULARI[0]!;
  const git = k.git && gidilir(s, k.git[0]) ? `<button class="btn sm pri" data-yd="git" data-t="${k.git[0]}">${esc(k.git[1])} ›</button>` : '';
  return `<h2>${k.ik} ${esc(k.ad)}</h2><p class="ydoz">${esc(k.ozet)}</p><ul>${k.maddeler.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>${git}`;
}
function liste(sel: string): string {
  return YARDIM_KONULARI.map((k, i) => `<button data-yk="${k.id}" class="${k.id === sel ? 'on' : ''}"><i>${i + 1}</i><span>${k.ik} ${esc(k.ad)}</span></button>`).join('') + `<button data-yk="yok" class="yok ${sel === 'yok' ? 'on' : ''}"><i>!</i><span>🚧 Oyunda olmayanlar</span></button>`;
}
/** ? ekranını açar. Oyun dışında (başlık ekranı) s = null verilir. */
export function yardimAc(root: HTMLElement, s: GameState | null, cb: YardimCb): void {
  if (root.querySelector('.yd')) return;
  const o = document.createElement('div'); o.className = 'yd';
  const ogrBtn = s ? `<button class="btn sm" data-yd="ogr">🧭 İlk adımlar</button>` : '';
  o.innerHTML = `<div class="ydbox" role="dialog" aria-label="Oyun rehberi"><div class="ydtop"><b>? Oyun rehberi</b><span class="sp"></span>${ogrBtn}<button class="ibtn" data-yd="kapat" aria-label="Kapat">✕</button></div><div class="ydbody"><nav class="ydlist" id="ydList">${liste(sonKonu)}</nav><section class="ydcont" id="ydCont">${icerik(s, sonKonu)}</section></div></div>`;
  root.appendChild(o);
  const kapat = (): void => { kapatAnimli(o); };
  o.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-yk],[data-yd]'); if (!el) { if (e.target === o) kapat(); return; }
    if (el.dataset.yk) { sonKonu = el.dataset.yk; o.querySelectorAll('#ydList button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.yk === sonKonu)); const c = o.querySelector('#ydCont') as HTMLElement; c.innerHTML = icerik(s, sonKonu); c.scrollTop = 0; return; }
    const a = el.dataset.yd;
    if (a === 'kapat') kapat();
    else if (a === 'git') { kapat(); cb.git(el.dataset.t!); }
    else if (a === 'ogr' && s) { ogrYenidenAc(s); kapat(); cb.ogrAc?.(); }
  });
}
export const yardimAcikMi = (root: HTMLElement): boolean => !!root.querySelector('.yd');

/* ===================== İlk adımlar çubuğu ===================== */
export interface OgrCb { git: (a: OgrAdim) => void; degisti: () => void }
/** Çubuğu yeniden çizer (görünmemesi gerekiyorsa kaldırır). */
export function ogrCiz(root: HTMLElement, s: GameState | null, cb: OgrCb): void {
  root.querySelector('.ogr')?.remove();
  if (!s || !ogrGorunur(s)) return;
  const d = ogrDurum(s), sd = d.siradaki; if (!sd) return;
  const o = Og(s), yuzde = (d.yapilan / d.toplam) * 100;
  const kutu = document.createElement('div'); kutu.className = 'ogr';
  const git = sd.git || sd.eylem ? `<button class="btn sm pri" data-ogr="git">Git ›</button>` : '';
  kutu.innerHTML = kucuk
    ? `<div class="ogrbox mini"><button data-ogr="ac" aria-label="İlk adımları göster">🧭 ${d.yapilan}/${d.toplam}</button></div>`
    : `<div class="ogrbox"><div class="ogrtop"><span>🧭 İlk adımlar · ${d.sira}/${d.toplam}</span><span class="sp"></span><button data-ogr="kucult" aria-label="Küçült">▾</button><button data-ogr="kapat" aria-label="Rehberi kapat">✕</button></div><b>${sd.ik} ${esc(sd.ad)}</b><div class="ograc">${esc(sd.ac)}</div><div class="ogrbar"><i style="width:${yuzde}%"></i></div><div class="chiprow">${git}<button class="btn sm" data-ogr="atla">Atla</button></div></div>`;
  root.appendChild(kutu); void o;
  kutu.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-ogr]'); if (!el) return; const a = el.dataset.ogr;
    if (a === 'kucult') { kucuk = true; ogrCiz(root, s, cb); }
    else if (a === 'ac') { kucuk = false; ogrCiz(root, s, cb); }
    else if (a === 'kapat') { ogrKapat(s); cb.degisti(); ogrCiz(root, s, cb); }
    else if (a === 'atla') { ogrAtla(s); cb.degisti(); ogrCiz(root, s, cb); }
    else if (a === 'git') cb.git(sd);
  });
}
export { OGR };
