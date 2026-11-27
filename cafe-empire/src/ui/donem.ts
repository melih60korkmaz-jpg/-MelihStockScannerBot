/** Meydan okumalar ve kariyer özeti sayfaları. */
import { dayOf } from '../core/calendar';
import { DD, ilerleme, kariyerOzeti } from '../core/donem';
import { BASARIMLAR } from '../core/goals';
import { D } from '../core/derin';
import { fmt } from '../core/actions';
import { esc, bar, tr, S as getS, type Helpers } from './panels';
import { hareketli, madalya } from './art';
import { zaferHtml } from './derin';

const kisa = (v: number): string => (Math.abs(v) >= 1e6 ? `${tr(v / 1e6)} Mn` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)} B` : String(Math.round(v)));
export function pDonem(): string {
  const s = getS(), k = DD(s), now = dayOf(s), kart = (x: (typeof k.liste)[number]): string => { const p = ilerleme(s, x), sure = Math.max(0, x.bit - now); return `<div class="cardx ${x.tamam ? 'zafer' : ''}"><div class="row"><b>${x.tamam ? hareketli('✅') : hareketli(x.tur === 'hafta' ? '🎯' : '🏅')} ${esc(x.ad)}</b><span class="pill">${x.tamam ? 'Tamam' : sure + ' gün kaldı'}</span></div><div class="small muted">${esc(x.ac)}</div>${bar(p * 100, x.tamam ? 'var(--ok)' : 'linear-gradient(90deg,var(--am),#C6A477)')}<div class="row small"><span>%${Math.round(p * 100)}</span><b class="good">+${fmt(x.odul)}</b></div></div>`; };
  const haf = k.liste.filter((x) => x.tur === 'hafta'), ay = k.liste.filter((x) => x.tur === 'ay'), ok = haf.filter((x) => x.tamam).length;
  return `<div class="cardx zafer"><div class="row"><b>${hareketli('🔥')} Haftalık seri: ${k.seri}</b><span class="pill">${k.toplam} meydan okuma tamamlandı</span></div><div class="tiny muted">3 haftalık meydan okumanın hepsini süre bitmeden tamamlarsan seri artar ve bonus (${fmt(15000 * (k.seri + 1) * s.market.fiyat)}) kazanırsın. Birini kaçırırsan seri sıfırlanır.</div>${bar(haf.length ? ok / haf.length * 100 : 0, 'linear-gradient(90deg,#C6A477,#A9875E)')}<div class="tiny muted">Bu hafta: ${ok}/${haf.length}</div></div>
  <div class="eyebrow">Haftalık</div><div class="cards2">${haf.map(kart).join('') || '<div class="cardx small muted">Şube açınca meydan okumalar başlar.</div>'}</div><div class="eyebrow" style="margin-top:8px">Aylık</div><div class="cards2">${ay.map(kart).join('')}</div>`;
}
export function pKariyer(): string {
  const s = getS(), o = kariyerOzeti(s), d = D(s), tm = (n: string, v: string): string => `<div><small>${n}</small><b>${v}</b></div>`;
  return `<div class="duo"><div class="duoL"><div class="cardx zafer parlak"><div class="art"><div class="artbox" style="width:84px">${madalya(d.fuar.kupa ? 1 : d.sam.some((x) => x.derece <= 3) ? 2 : 4, 56)}</div><div style="flex:1"><div class="tiny muted">KARİYER ÖZETİ</div><h3>${esc(s.marka.ad)}</h3><div class="pill">${o.unvan}</div></div></div><div class="pm" style="grid-template-columns:repeat(3,1fr)">${tm('GÜN', String(o.gun))}${tm('ŞUBE', String(o.sube))}${tm('İL / İLÇE', `${o.il} / ${o.ilce}`)}${tm('MÜŞTERİ', kisa(o.musteri))}${tm('NET KÂR', kisa(o.netKar) + ' ₺')}${tm('EN İYİ GÜN', kisa(o.enIyiGun) + ' ₺')}${tm('BAŞARIM', `${o.basarim}/${o.basarimToplam}`)}${tm('ALTIN FİNCAN', String(o.kupa))}${tm('MADALYA', o.madalya.length > 14 ? '…' : o.madalya)}</div><button class="btn sm" data-a="kariyerKopyala" style="margin-top:8px">📋 Özeti kopyala</button></div>${zaferHtml()}</div>
  <div class="duoR"><div class="cardx"><b>🏆 Başarım vitrini</b><div class="vitr">${BASARIMLAR.map((b) => `<div class="vit ${s.basarim[b.id] !== undefined ? 'on' : ''}" title="${esc(b.ad)} — ${esc(b.ac)}"><i>${b.ikon}</i><small>${esc(b.ad)}</small></div>`).join('')}</div><div class="tiny muted">Renkli olanlar kazanıldı. Kazanılmayanların ne işe yaradığını Hedefler sayfasında görürsün.</div></div></div></div>`;
}
export const DONEM_PAGES: Record<string, () => string> = { donem: pDonem, kariyer: pKariyer };
export function handleDonem(a: string, _d: DOMStringMap, h: Helpers): boolean {
  if (a !== 'kariyerKopyala') return false; const t = kariyerOzeti(getS()).metin; void kopyala(t).then((tamam) => h.toast(tamam ? 'Kariyer özeti kopyalandı.' : t)); return true;
}

/** Panoya yazar. İzin yoksa eski yöntemi dener; başarılıysa true döner (iOS WebView'da pano izni olmayabilir). */
export async function kopyala(t: string): Promise<boolean> {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(t); return true; } } catch { /* yedek yönteme geç */ }
  try { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'; document.body.appendChild(a); a.select(); a.setSelectionRange(0, t.length); const ok = document.execCommand('copy'); a.remove(); return ok; } catch { return false; }
}
