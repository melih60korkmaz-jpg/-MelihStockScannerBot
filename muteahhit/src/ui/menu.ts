import { unlockState } from '../sim/unlock';
import { h, press, toast } from './dom';
import type { App } from './app';

/** Kategorili ana menü: yatay telefonda yan panel. Kilitli sayfaların açılma koşulları açıkça gösterilir. */
export interface MenuItem { label: string; ico: string; tab: string; sub?: string; unlock?: string }
export const MENU: { group: string; ico: string; items: MenuItem[] }[] = [
  { group: 'ŞİRKET', ico: '🏢', items: [{ label: 'Yönetim Merkezi', ico: '🧭', tab: 'yonetim', unlock: 'yonetim' }, { label: 'Finans', ico: '📊', tab: 'finans' }, { label: 'Personel', ico: '👥', tab: 'operasyon', sub: 'ekip' }, { label: 'Hukuk ve departmanlar', ico: '⚖️', tab: 'yonetim', sub: 'dept', unlock: 'yonetim' }] },
  { group: 'İNŞAAT', ico: '🏗️', items: [{ label: 'Arsalar', ico: '📍', tab: 'harita' }, { label: 'Projeler ve şantiyeler', ico: '🏗️', tab: 'projeler' }, { label: 'İhaleler', ico: '📑', tab: 'ihale' }, { label: 'Makine Parkı', ico: '🚜', tab: 'makine', unlock: 'makine' }, { label: 'Satın Alma ve Tedarik', ico: '🧱', tab: 'tedarik', unlock: 'tedarik' }, { label: 'Altyapı ve Taahhüt', ico: '🛣️', tab: 'altyapi', unlock: 'altyapi' }, { label: 'Fırsat ilanları', ico: '📢', tab: 'deals' }] },
  { group: 'TİCARET', ico: '🏷️', items: [{ label: 'Satış merkezi', ico: '🏷️', tab: 'projeler' }, { label: 'Gayrimenkul Yönetimi', ico: '🏘️', tab: 'gayrimenkul', unlock: 'gayrimenkul' }, { label: 'İşletmeler (otel, AVM)', ico: '🏨', tab: 'holding', sub: 'isletme', unlock: 'isletme' }] },
  { group: 'HOLDİNG', ico: '🏛️', items: [{ label: 'İştirakler', ico: '🏛️', tab: 'holding', sub: 'ozet', unlock: 'isletme' }, { label: 'İşletmeler', ico: '🏨', tab: 'holding', sub: 'isletme', unlock: 'isletme' }, { label: 'Enerji', ico: '⚡', tab: 'holding', sub: 'enerji', unlock: 'enerji' }, { label: 'Fabrikalar (üretim)', ico: '🏭', tab: 'holding', sub: 'fabrika', unlock: 'fabrika' }, { label: 'Konsolide tablo', ico: '🧾', tab: 'holding', sub: 'konsolide', unlock: 'iştirak' }, { label: 'Lojistik ve makine', ico: '🚛', tab: 'makine', sub: 'rapor', unlock: 'makine' }] },
  { group: 'PİYASALAR', ico: '📈', items: [{ label: 'Borsa (kendi hissen)', ico: '📈', tab: 'holding', sub: 'borsa', unlock: 'borsa' }, { label: 'Yatırımlar ve satın alma', ico: '💼', tab: 'holding', sub: 'yatirim', unlock: 'satinalma' }, { label: 'Piyasa ve rakipler', ico: '🌐', tab: 'piyasa' }] },
  { group: 'DÜNYA', ico: '🗺️', items: [{ label: 'Türkiye haritası', ico: '🗺️', tab: 'harita' }, { label: 'Haberler ve rakipler', ico: '📰', tab: 'piyasa' }] },
];
export function registerMenu(items: { group: string; ico: string; items: MenuItem[] }[]): void { void items; }

export function openMenu(app: App, current: string, go: (tab: string, sub?: string) => void): void {
  const s = app.store.state, panel = h('div', { class: 'card menupanel', role: 'navigation', 'aria-label': 'Ana menü' }), modal = h('div', { class: 'modal menumodal', role: 'dialog', 'aria-label': 'Menü' }, panel);
  const close = () => { panel.classList.add('out'); setTimeout(() => modal.remove(), 160); };
  panel.append(h('div', { style: 'display:flex;align-items:center;margin-bottom:6px' }, h('h2', { style: 'font-size:22px;flex:1' }, '☰ Menü'), h('button', { class: 'btn', style: 'min-height:34px', onclick: () => { press(app); close(); } }, 'Kapat')));
  const grid = h('div', { class: 'menugrid' });
  for (const g of MENU) {
    const col = h('div', { class: 'mgroup' }, h('div', { class: 'lbl-s' }, `${g.ico} ${g.group}`));
    for (const it of g.items) {
      const st = it.unlock ? unlockState(s, it.unlock) : { open: true, missing: [] as string[] };
      col.append(h('button', { class: `mitem${current === it.tab ? ' cur' : ''}${st.open ? '' : ' locked'}`, onclick: () => { if (!st.open) { app.audio.sfx('error'); toast(`🔒 ${it.label}: ${st.missing.join(' · ')}`, 4200); return; } press(app); close(); go(it.tab, it.sub); } }, h('span', {}, it.ico), h('b', {}, it.label), st.open ? null : h('small', {}, `🔒 ${st.missing[0] ?? ''}`)));
    }
    grid.append(col);
  }
  panel.append(grid); modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); }); document.body.append(modal);
}
