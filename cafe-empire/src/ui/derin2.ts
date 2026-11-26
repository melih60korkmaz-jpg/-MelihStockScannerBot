/** Tedarikçi ilişkisi ve Yorumlar sayfaları. */
import { cityById } from '../data/turkey';
import { suppliersOf } from '../core/supply';
import { dayOf } from '../core/calendar';
import { TED_SEVIYE, iliski, tedSeviye, tedIndirim, tedZiyaret, tedSozlesme, sozlesmeHedef, SOZ_GUN, SOZ_INDIRIM } from '../core/tedarik2';
import { NEDENLER, yorumYanit } from '../core/yorum';
import { fmt, type Result } from '../core/actions';
import { ctx, cur, esc, bar, tr, bchips, S as getS, type Helpers } from './panels';
import { kamyon, muteri, hareketli } from './art';

const RENK: Record<string, string> = { yerel: '#3aa89a', eko: '#d98a3a', premium: '#7a5cd6' };
export function pTedIl(): string {
  const s = getS(), b = cur(), c = cityById(b.city), now = dayOf(s);
  return `${bchips()}<div class="cardx small muted">${hareketli('🚚')} <b>${esc(c.ad)}</b> tedarikçileriyle ilişkin. Düzenli sipariş ve ziyaretle sadakat artar; sadakat arttıkça <b>indirim</b> ve <b>güvenilir teslimat</b> kazanırsın. Geç/eksik teslimat ve uzun ara sadakati düşürür.</div><div class="cards2">${suppliersOf(c).map((x) => {
    const r = iliski(s, b.city, x.id), sv = tedSeviye(r.sad), nx = TED_SEVIYE.find((y) => y.min > r.sad), soz = r.soz && r.soz.bit > now ? r.soz : null, ind = tedIndirim(s, b.city, x.id);
    return `<div class="cardx"><div class="art"><div class="artbox">${kamyon(RENK[x.id] ?? '#888', 84)}</div><div style="flex:1"><div class="row"><b>${esc(x.ad)}</b><span class="pill">${sv.ad}</span></div><div class="tiny muted">${x.not}</div></div></div><div class="row small"><span>Sadakat</span><b>${Math.round(r.sad)}/100</b></div>${bar(r.sad, 'linear-gradient(90deg,var(--am),#ffd45c)')}<div class="tiny muted">${sv.ac}${nx ? ` Sonraki: ${nx.ad} (${nx.min}).` : ' En üst seviye.'}</div><div class="row small"><span>Şu anki indirim</span><b class="${ind > 0 ? 'good' : ''}">%${tr(ind * 100, 0)}${soz ? ' (sözleşme dahil)' : ''}</b></div><div class="row small"><span>Toplam alım</span><b>${fmt(r.harc)}</b></div>${soz ? `<div class="cardx" style="margin:6px 0 0;padding:8px"><div class="row small"><span>📜 Sözleşme · ${soz.bit - now} gün kaldı</span><b>${fmt(soz.harc)} / ${fmt(soz.hedef)}</b></div>${bar(soz.harc / soz.hedef * 100, soz.harc >= soz.hedef ? 'var(--ok)' : 'var(--am)')}</div>` : ''}<div class="chiprow" style="margin-top:6px"><button class="btn sm" data-a="tedZiyaret" data-id="${x.id}">Ziyaret et (2 B)</button><button class="btn sm pri" data-a="tedSoz" data-id="${x.id}" ${soz ? 'disabled' : ''}>${SOZ_GUN} gün sözleşme (+%${Math.round(SOZ_INDIRIM * 100)})</button></div></div>`;
  }).join('')}</div><div class="cardx small muted">Sözleşme: ${SOZ_GUN} günde ${fmt(sozlesmeHedef(s))} alım hedefi. Tutturursan sadakat +8; tutturamazsan farkın %25'i ceza ve sadakat −12. Sadakat en az 20 olunca sözleşme yapılabilir.</div>`;
}
const YILDIZ = (n: number): string => '★'.repeat(n) + '☆'.repeat(5 - n);
export function pYorumlar(): string {
  const s = getS(), b = cur(), l = b.yorumlar, dag = [5, 4, 3, 2, 1].map((y) => [y, l.filter((r) => r.yildiz === y).length] as const), max = Math.max(1, ...dag.map((x) => x[1]));
  const sayim: Record<string, { n: number; pozitif: number }> = {}; for (const r of l) if (r.neden) { const x = (sayim[r.neden] ??= { n: 0, pozitif: 0 }); x.n++; if (r.yildiz >= 4) x.pozitif++; }
  const neg = Object.entries(sayim).filter(([id, x]) => x.n > x.pozitif && !['orta', 'genel'].includes(id)).sort((a, z) => (z[1].n - z[1].pozitif) - (a[1].n - a[1].pozitif)).slice(0, 3), poz = Object.entries(sayim).filter(([, x]) => x.pozitif > 0).sort((a, z) => z[1].pozitif - a[1].pozitif).slice(0, 3);
  return `${bchips()}<div class="duo"><div class="duoL"><div class="cardx"><div class="art"><div style="flex:1"><div class="tiny muted">YORUM PUANI · son ${l.length} yorum</div><div class="para">${l.length ? tr(b.yorumPuan, 1) : '—'} <span style="font-size:18px;color:var(--am)">★</span></div></div></div>${dag.map(([y, n]) => `<div class="row small"><span style="color:var(--am)">${y} ★</span><span style="flex:1;margin:0 8px"><div class="bar" style="margin:0"><i style="width:${n / max * 100}%;background:${y >= 4 ? 'var(--ok)' : y === 3 ? 'var(--am)' : 'var(--bad)'}"></i></div></span><b>${n}</b></div>`).join('')}</div>
  <div class="cardx"><b>😠 Şikâyet nedenleri</b>${neg.length ? neg.map(([id, x]) => { const nd = NEDENLER[id]!; return `<div class="row small" style="margin-top:6px"><span>${hareketli(nd.ik)} <b>${nd.ad}</b> <span class="tiny muted">(${x.n - x.pozitif})</span></span>${nd.git ? `<button class="btn sm" data-a="git" data-t="${nd.git}">Düzelt ›</button>` : ''}</div><div class="tiny muted">${nd.oneri}</div>`; }).join('') : '<div class="small muted" style="margin-top:6px">Belirgin bir şikâyet nedeni yok. 👏</div>'}</div>
  <div class="cardx"><b>😍 Övgü nedenleri</b>${poz.length ? poz.map(([id, x]) => { const nd = NEDENLER[id]!; return `<div class="row small" style="margin-top:4px"><span>${hareketli(nd.ik)} ${nd.ad}</span><b>${x.pozitif}</b></div>`; }).join('') : '<div class="small muted" style="margin-top:6px">Henüz övgü yok.</div>'}</div></div>
  <div class="duoR"><div class="cardx"><b>💬 Son yorumlar</b>${l.slice(0, 12).map((r, i) => { const nd = r.neden ? NEDENLER[r.neden] : undefined; return `<div class="art" style="margin-top:8px;align-items:flex-start"><div style="width:40px;flex:0 0 40px">${muteri(r.kim + r.gun, r.yildiz >= 4 ? 80 : 40, 38)}</div><div style="flex:1"><div class="row small"><b>${esc(r.kim)}</b><span style="color:var(--am)">${YILDIZ(r.yildiz)}</span></div><div class="small">${esc(r.metin)}</div><div class="row"><span class="tiny muted">${nd ? `${nd.ik} ${nd.ad} · ` : ''}${dayOf(s) - r.gun} gün önce</span>${r.yanit ? '<span class="tiny good">✓ yanıtlandı</span>' : `<button class="btn sm" data-a="yorumYanit" data-i="${i}">Yanıtla</button>`}</div></div></div>`; }).join('') || '<div class="small muted" style="margin-top:6px">Henüz yorum yok.</div>'}</div></div></div>`;
}
export const DERIN2_PAGES: Record<string, () => string> = { tedil: pTedIl, yorumlar: pYorumlar };
export function handleDerin2(a: string, d: DOMStringMap, h: Helpers): boolean {
  const s = getS(), R = (r: Result | { ok: boolean; m: string }): boolean => { h.res(r as Result); h.refresh(); return true; };
  switch (a) {
    case 'tedZiyaret': return R(tedZiyaret(s, cur().city, d.id!)); case 'tedSoz': return R(tedSozlesme(s, cur().city, d.id!)); case 'yorumYanit': return R(yorumYanit(cur(), +d.i!));
    default: return false;
  }
}
void ctx;
