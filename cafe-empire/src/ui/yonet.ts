/** Yönetim hissi: kademeli menü, sıradaki adım, yol haritası, karar defteri ve açılacak sistemler. */
import { NAV, GRUPLAR, ctx, cur, esc, bar, tr, S as getS, type Grup, type Helpers } from './panels';
import { GRUP_KURAL, TAB_KURAL, grupAcik, tabAcik, acikListe, kilitliListe, kilitNedeni } from '../core/kademe';
import { oneriler, YOL, Yl, yolDurum } from '../core/rehber';
import { Kd, KARAR_GUN } from '../core/karar';
import { D } from '../core/derin';
import { dayOf } from '../core/calendar';
import { fmt } from '../core/actions';
import { hareketli } from './art';
import type { GameState } from '../core/types';

/** Bu eylemler başarıyla bitince karar defterine yazılır. */
export const KARAR_ETIKET: Record<string, string> = {
  oneri: 'Fiyat önerisi uygulandı', oneritum: 'Tüm menü fiyatları önerildi', fiyat: 'Fiyat değişikliği', fiyatTl: 'Fiyat değişikliği', fiyatset: 'Fiyat değişikliği', tumfiyat: 'Toplu fiyat değişikliği', menukopya: 'Menü şubelere kopyalandı',
  promo: 'Kampanya değişikliği', gunun: 'Günün ürünü', hire: 'Yeni personel işe alındı', fire: 'Personel çıkarıldı', wage: 'Maaş değişikliği', bonus: 'Prim verildi', train: 'Eğitim verildi', autoplan: 'Vardiya planı yenilendi',
  urun: 'Menü ürünü değişti', kalite: 'Ürün kalitesi ayarı', invest: 'Ekipman yatırımı', gel: 'Dükkân geliştirmesi', sube: 'Yeni şube açıldı', kur_ac2: 'Yeni şube açıldı', frver: 'Franchise verildi', merkez: 'Merkezi depo yatırımı', oto: 'Otomatik sipariş ayarı', tedarikci: 'Tedarikçi değişikliği',
  platKatil: 'Online platforma katıldı', paylas: 'Sosyal medya paylaşımı', ajans: 'Ajans anlaşması', sezonAc: 'Sezon menüsü açıldı', sezonKapat: 'Sezon dışı ürünler kapatıldı', tarifImza: 'İmza içecek belirlendi', cekSet: 'Çekirdek/harman değişti',
  sadKur: 'Sadakat uygulaması yayınlandı', sadKamp: 'Sadakat kampanyası', sadPuan: 'Puan oranı değişti', bulten: 'Basın bülteni', infAnlas: 'Influencer anlaşması', kurFilo: 'Kurye filosu değişti', bulutKur: 'Bulut mutfak açıldı', mulkAl: 'Dükkân satın alındı', mulkSat: 'Dükkân satıldı',
  surd: 'Sürdürülebilirlik programı', esnafOrtak: 'Esnafla ortak kampanya', pilotBasla: 'Pilot ürün başladı', pilotYay: 'Ürün tüm şubelere yayıldı',
};
export const yeniGrup = new Set<string>();
export const gorunurGruplar = (s: GameState): Grup[] => GRUPLAR.filter((g) => grupAcik(s, g.id));
/** Grup içi sayfa çipleri: açık olanlar tıklanır, kilitli olanlar 🔒 ile gösterilir. */
export function altSekmeler(s: GameState, gr: Grup, aktif: string): string {
  if (gr.tabs.length <= 1) return '';
  const chip = (id: string, on: boolean): string => { const n = NAV.find((x) => x[0] === id)!; return tabAcik(s, id) ? `<button data-n="${id}" class="${on ? 'on' : ''}">${n[1]} ${n[2]}</button>` : `<button class="lock" data-lock="${id}">🔒 ${n[2]}</button>`; };
  if (gr.id !== 'subeler') return `<div class="subtabs">${gr.tabs.map((id) => chip(id, id === aktif)).join('')}</div>`;
  // Dükkânlar: Menü, Personel, Vardiya ve Ekipman tek dokunuşla (dükkân detayındaki sekmeye doğrudan gider).
  const detay = aktif === 'subeler' && ctx.subeAcik !== null, sk = detay ? ctx.subeSekme : 'ozet';
  const kisa: Array<[string, string, string, string]> = [['menuGit', 'menu', '📋', 'Menü ve fiyat'], ['persGit', 'personel', '👥', 'Personel'], ['vardiyaGit', 'vardiya', '🗓️', 'Vardiya'], ['gelGit', 'gelisim', '🛠️', 'Ekipman']];
  const [ilk, ...geri] = gr.tabs;
  const kisaHtml = s.subeler.length ? kisa.map(([a, k, ik, ad]) => `<button data-a="${a}" class="${sk === k ? 'on' : ''}">${ik} ${ad}</button>`).join('') : '';
  return `<div class="subtabs">${chip(ilk!, aktif === 'subeler' && (!detay || sk === 'ozet'))}${kisaHtml}${geri.map((id) => chip(id, id === aktif)).join('')}</div>`;
}
/** Yeni açılan sistemleri bulur; ilk çağrıda mevcut durumu kaydeder (eski kayıtlarda bildirim yağmaz). */
export function acilisKontrol(s: GameState): string[] {
  const d = D(s), simdi = acikListe(s); if (!d.acilan) { d.acilan = {}; for (const k of simdi) d.acilan[k] = dayOf(s); return []; }
  const yeni = simdi.filter((k) => d.acilan![k] === undefined), ad: string[] = [];
  for (const k of yeni) { d.acilan[k] = dayOf(s); ad.push((GRUP_KURAL[k] ?? TAB_KURAL[k])?.ad ?? k); if (GRUP_KURAL[k]) yeniGrup.add(k); }
  return ad;
}
const kisa = (v: number): string => (Math.abs(v) >= 1e6 ? `${tr(v / 1e6)} Mn` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)} B` : String(Math.round(v)));
const gitDugme = (o: { git?: string; eylem?: string }, ad = 'Git ›'): string => (o.eylem ? `<button class="btn sm pri" data-a="${o.eylem}">${ad}</button>` : o.git ? `<button class="btn sm pri" data-a="git" data-t="${o.git}">${ad}</button>` : '');
/** Merkez'in en üstünde duran tek satırlık yönlendirme. */
export function siradakiBanner(): string {
  const s = getS(), o = oneriler(s)[0]; if (!o) return '';
  return `<div class="oneb"><i>${hareketli(o.ik)}</i><span><small>👉 SIRADAKİ ADIM</small><b>${esc(o.baslik)}</b><em>${esc(o.ac)}</em></span>${gitDugme(o, 'Başla ›')}</div>`;
}
export function yonetimKartlari(): string {
  const s = getS(), l = oneriler(s), yol = yolDurum(s), y = Yl(s), d = D(s), now = dayOf(s), k = Kd(s), sonuc = k.liste.filter((x) => x.sonra).slice(0, 3), bekleyen = k.liste.filter((x) => !x.sonra).slice(0, 2), kil = kilitliListe(s).slice(0, 4);
  const soldaki = `<div class="cardx zafer"><div class="eyebrow2">👉 ÖNERİLER</div>${l.length ? l.slice(0, 4).map((o) => `<div class="oneb slim"><i>${hareketli(o.ik)}</i><span><b>${esc(o.baslik)}</b><em>${esc(o.ac)}</em></span>${gitDugme(o, '›')}</div>`).join('') : '<div class="small muted">Her şey yolunda. Büyümek için yeni bir semt ya da sistem keşfet.</div>'}</div>`;
  const yolKart = !y.bitti && now <= 90 ? `<div class="cardx"><div class="row"><b>🧭 İlk adımlar yol haritası</b><span class="pill">${yol.yapilan}/${yol.toplam}</span></div>${bar(yol.yapilan / yol.toplam * 100, 'linear-gradient(90deg,var(--am),#ffd45c)')}${YOL.slice(0, 10).map((a) => { const tamam = y.adim[a.id] !== undefined, sira = yol.siradaki?.id === a.id; return `<div class="row small" style="${tamam ? 'opacity:.55' : ''}"><span>${tamam ? '✅' : sira ? '👉' : '⬜'} ${esc(a.ad)}</span><b class="${tamam ? 'good' : ''}">${a.odul ? '+' + fmt(a.odul * s.market.fiyat) : ''}</b></div>${sira ? `<div class="tiny muted" style="margin:0 0 4px 22px">${esc(a.ac)} ${gitDugme(a, 'Git ›')}</div>` : ''}`; }).join('')}</div>` : '';
  const kararKart = `<div class="cardx"><b>📊 Kararlarının etkisi</b><div class="tiny muted">Önemli kararlarından ${KARAR_GUN} gün sonra ciro, kâr ve memnuniyet farkı. (Başka etkenler de karışır; yol gösterici olarak oku.)</div>${sonuc.map((x) => `<div class="row small" style="margin-top:6px"><span>${x.hukum === 'iyi' ? '✅' : x.hukum === 'kotu' ? '⚠️' : '➖'} ${esc(x.ad)}</span><b class="${(x.fark?.kar ?? 0) >= 0 ? 'good' : 'badc'}">kâr ${(x.fark?.kar ?? 0) >= 0 ? '+' : ''}${Math.round((x.fark?.kar ?? 0) * 100)}%</b></div><div class="tiny muted">ciro ${(x.fark?.ciro ?? 0) >= 0 ? '+' : ''}${Math.round((x.fark?.ciro ?? 0) * 100)}% · müşteri ${(x.fark?.musteri ?? 0) >= 0 ? '+' : ''}${Math.round((x.fark?.musteri ?? 0) * 100)}% · memnuniyet ${(x.fark?.memn ?? 0) >= 0 ? '+' : ''}${(x.fark?.memn ?? 0).toFixed(1)}</div>`).join('') || ''}${bekleyen.map((x) => `<div class="row small tiny muted" style="margin-top:4px"><span>⏳ ${esc(x.ad)}</span><span>${Math.max(0, x.bit - now)} gün sonra</span></div>`).join('')}${!sonuc.length && !bekleyen.length ? '<div class="small muted" style="margin-top:6px">Fiyat, kampanya, personel ya da yatırım kararı verince etkisi burada görünür.</div>' : ''}</div>`;
  const kilitKart = kil.length ? `<div class="cardx"><b>🔒 Yakında açılacak sistemler</b>${kil.map((x) => `<div class="row small"><span>${esc(x.ad)}</span><span class="tiny muted">${esc(x.neden)}</span></div>`).join('')}</div>` : '';
  void d; void kisa;
  return `<div class="duo" style="margin-top:8px"><div class="duoL">${soldaki}${yolKart}</div><div class="duoR">${kararKart}${kilitKart}</div></div>`;
}
export function handleYonet(a: string, d: DOMStringMap, h: Helpers): boolean {
  const s = getS(); const sub = (k: 'menu' | 'personel' | 'vardiya' | 'gelisim'): boolean => { if (!s.subeler.length) return true; const b = cur(); ctx.bid = b.id; ctx.subeAcik = b.id; ctx.subeSekme = k as typeof ctx.subeSekme; h.go('subeler'); return true; };
  switch (a) {
    case 'menuGit': return sub('menu'); case 'persGit': return sub('personel'); case 'vardiyaGit': return sub('vardiya'); case 'gelGit': return sub('gelisim');
    case 'kilit': h.toast(`🔒 ${kilitNedeni(s, d.id!)}`); return true;
    default: return false;
  }
}
