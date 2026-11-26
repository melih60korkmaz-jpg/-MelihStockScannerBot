/** Şube panosu: dükkânları dışarıdan, tek bakışta yönetmek için (3B/animasyonlu bina yok). */
import { cityById } from '../data/turkey';
import { SHOP, INGREDIENTS } from '../data/catalog';
import { ilceOf } from '../data/regions';
import { fmt } from '../core/actions';
import { dayOf, levelOf } from '../core/sim';
import { minLevel } from '../core/supply';
import { gaps } from '../core/hr';
import { dateOf } from '../core/calendar';
import type { Branch, GameState } from '../core/types';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c] ?? c);
export interface Uyari { ik: string; m: string }
export function uyarilar(s: GameState, b: Branch): Uyari[] {
  const u: Uyari[] = []; const az = INGREDIENTS.filter((i) => i.id !== 'clean' && !b.siparisler.some((o) => o.ing === i.id) && (b.stok[i.id] ?? 0) < Math.max(minLevel(b, i.id), 1));
  if (!b.acik) u.push({ ik: '⏸', m: 'Kapalı' }); if (az.length) u.push({ ik: '📦', m: `Stok: ${az.slice(0, 2).map((i) => i.ad).join(', ')}` }); const g = gaps(b, dateOf(dayOf(s)).haftaGun, dayOf(s)).length; if (g) u.push({ ik: '🗓️', m: `${g} saat vardiya boş` });
  if (b.hijyen < 45) u.push({ ik: '🧽', m: 'Hijyen düşük' }); if (b.sikayetler.length) u.push({ ik: '😠', m: `${b.sikayetler.length} şikâyet` }); if (b.backlog > 400) u.push({ ik: '⏱️', m: 'Kuyruk uzun' }); if (!b.staff.length) u.push({ ik: '🚪', m: 'Personel yok' });
  return u;
}
function spark(b: Branch): string {
  const h = b.gecmis.slice(-14); if (h.length < 2) return '<div class="tiny muted">veri birikiyor…</div>'; const mx = Math.max(1, ...h.map((x) => Math.abs(x.kar))), w = 100 / h.length;
  return `<svg viewBox="0 0 100 24" class="spk" preserveAspectRatio="none"><line x1="0" x2="100" y1="12" y2="12" stroke="rgba(255,255,255,.18)" stroke-width=".5"/>${h.map((x, i) => `<rect x="${(i * w + w * 0.12).toFixed(1)}" y="${(x.kar >= 0 ? 12 - Math.abs(x.kar) / mx * 11 : 12).toFixed(1)}" width="${(w * 0.76).toFixed(1)}" height="${Math.max(0.6, Math.abs(x.kar) / mx * 11).toFixed(1)}" fill="${x.kar >= 0 ? '#5fc08a' : '#e8665f'}"/>`).join('')}</svg>`;
}
export function panoHtml(s: GameState, secili: number, filtre: number | null = null): string {
  const bugunM = s.subeler.reduce((a, b) => a + b.bugun.musteri, 0), bugunG = s.subeler.reduce((a, b) => a + Object.values(b.bugun.gelir).reduce((x, y) => x + y, 0), 0), son7 = s.rapor.slice(-7).reduce((a, r) => a + r.kar, 0);
  const iller = Object.keys(s.bolge.il).map(Number).sort((a, b) => a - b), cip = iller.length > 1 ? `<div class="pfl"><button data-pf="" class="cx ${filtre === null ? 'on' : ''}">Tümü</button>${iller.map((i) => `<button data-pf="${i}" class="cx ${filtre === i ? 'on' : ''}">${esc(cityById(i).ad)}</button>`).join('')}</div>` : '';
  const kartlar = s.subeler.filter((b) => filtre === null || b.city === filtre).map((b) => {
    const ci = cityById(b.city), d = ilceOf(b.ilce), u = uyarilar(s, b), g = Object.values(b.bugun.gelir).reduce((x, y) => x + y, 0), renk = b.memnuniyet >= 65 ? 'var(--ok)' : b.memnuniyet >= 45 ? 'var(--am)' : 'var(--bad)';
    return `<div class="pk ${b.id === secili ? 'sel' : ''} ${b.acik ? '' : 'kapali'}" data-p="${b.id}"><div class="pkh"><b>${SHOP[b.tip].ikon} ${esc(d?.ad ?? ci.ad)}</b><span class="tiny muted">${esc(ci.ad)} · ${SHOP[b.tip].ad}</span></div>
      <div class="pkg"><div><div class="tiny muted">Bugün</div><b>${b.bugun.musteri}</b> <span class="tiny muted">müşteri</span></div><div><div class="tiny muted">Gelir</div><b>${fmt(g)}</b></div><div><div class="tiny muted">Memnuniyet</div><b style="color:${renk}">${Math.round(b.memnuniyet)}</b></div></div>
      ${spark(b)}<div class="pku">${u.length ? u.slice(0, 3).map((x) => `<span class="uy" title="${esc(x.m)}">${x.ik} ${esc(x.m)}</span>`).join('') : '<span class="uy ok">✓ Sorun yok</span>'}</div></div>`;
  }).join('');
  const fr = s.franchise.map((f) => `<div class="pk fr"><div class="pkh"><b>🤝 ${esc(ilceOf(f.ilce)?.ad ?? f.ad)}</b><span class="tiny muted">Bayi · ${esc(cityById(f.il).ad)}</span></div><div class="pkg"><div><div class="tiny muted">Ciro/gün</div><b>${fmt(f.ciro)}</b></div><div><div class="tiny muted">Payın</div><b class="good">${fmt(f.royalty)}</b></div><div><div class="tiny muted">Kalite</div><b>${Math.round(f.kalite)}</b></div></div></div>`).join('');
  return `<div class="pano-ust"><div><span class="tiny muted">Şube</span> <b>${s.subeler.length}</b>${s.franchise.length ? ` <span class="tiny muted">+ ${s.franchise.length} bayi</span>` : ''}</div><div><span class="tiny muted">Bugün müşteri</span> <b>${bugunM}</b></div><div><span class="tiny muted">Bugün gelir</span> <b>${fmt(bugunG)}</b></div><div><span class="tiny muted">7 gün net</span> <b class="${son7 >= 0 ? 'good' : 'badc'}">${fmt(son7)}</b></div><div><span class="tiny muted">Seviye</span> <b>${levelOf(s)}</b></div></div>${cip}<div class="pgrid">${kartlar}${s.franchise.length && (filtre === null) ? fr : ''}</div>`;
}
