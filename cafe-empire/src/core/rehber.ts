/** Oyuncuyu yönlendirme: "sıradaki adım" önerileri ve ilk 30 gün yol haritası (ödüllü). */
import { PRODUCTS } from '../data/catalog';
import { hooks, levelOf } from './sim';
import { dayOf } from './calendar';
import { uyarilarCekirdek } from './uyaricek';
import { D, yaz } from './derin';
import { tabAcik } from './kademe';
import { ruhsatKalan } from './mevzuat';
import { sezonOneri } from './sezon';
import { weekGaps } from './hr';
import type { GameState } from './types';

export interface Oneri { id: string; ik: string; baslik: string; ac: string; git?: string; eylem?: string; oncelik: number }
export function oneriler(s: GameState): Oneri[] {
  const L: Oneri[] = [], now = dayOf(s), d = D(s), lv = levelOf(s);
  if (!s.subeler.length) return [{ id: 'ilk', ik: '🏪', baslik: 'İlk şubeni aç', ac: 'Türkiye haritasında bir semt seç, ilanlardan birini planlayıp aç.', git: 'harita', oncelik: 100 }];
  const b = s.subeler[0]!;
  for (const x of uyarilarCekirdek(s)) L.push(x);
  if (s.stat.fiyatDeg === 0 && now >= 1) L.push({ id: 'fiyat', ik: '💡', baslik: 'Fiyat danışmanını dene', ac: 'Menü ve fiyat sayfasında "öneriyi uygula" ile fiyatlarını optimize et.', eylem: 'menuGit', oncelik: 70 });
  if (!s.subeler.some((x) => x.promo && (x.promo.sabah || x.promo.mutlu || x.promo.ogrenci || x.promo.kart))) L.push({ id: 'kamp', ik: '🏷️', baslik: 'İlk kampanyanı başlat', ac: 'Sabah paketi ya da mutlu saat müşteri sayını artırır.', git: 'kampanya', oncelik: 60 });
  if (!Object.keys(s.sosyal.son ?? {}).length) L.push({ id: 'sosyal', ik: '📸', baslik: 'Sosyal medyada paylaşım yap', ac: 'Takipçi kazan, markanı büyüt.', git: 'sosyal', oncelik: 55 });
  if (b.staff.length < 4 && s.kasa > 150000) L.push({ id: 'ekip', ik: '👥', baslik: 'Ekibini büyüt', ac: 'Yoğun saatlerde kuyruk uzamasın: işe alım ilanı ver.', eylem: 'persGit', oncelik: 58 });
  if (tabAcik(s, 'tarif') && !d.tarif.length) L.push({ id: 'tarif', ik: '🧪', baslik: 'İlk içeceğini yaz', ac: 'Tarif atölyesinde kendi içeceğini tasarla, imza yap.', git: 'tarif', oncelik: 50 });
  if (tabAcik(s, 'yorumlar') && b.yorumlar.some((r) => !r.yanit && r.yildiz <= 2)) L.push({ id: 'yorum', ik: '💬', baslik: 'Olumsuz yoruma yanıt ver', ac: 'Yanıtlamak itibarı toparlar.', git: 'yorumlar', oncelik: 62 });
  if (s.kasa > 900000 && s.subeler.length < 3) L.push({ id: 'sube2', ik: '🗺️', baslik: 'Yeni şube aç', ac: 'Kasada para birikti; büyümek için yeni bir semt aç.', git: 'harita', oncelik: 75 });
  if (s.kasa > 400000 && !Object.values(b.yat ?? {}).some((v) => v > 0)) L.push({ id: 'yat', ik: '🛠️', baslik: 'Ekipmana yatırım yap', ac: 'Espresso makinesi ve değirmen kaliteyi, kapasiteyi artırır.', eylem: 'gelGit', oncelik: 52 });
  if (tabAcik(s, 'sezon')) { const o = sezonOneri(s, b); if (o.ac.length) L.push({ id: 'sezon', ik: '🍂', baslik: 'Sezon menüsünü aç', ac: `${o.ac.map((p) => p.ad).slice(0, 2).join(', ')} şimdi çok satar.`, git: 'sezon', oncelik: 56 }); }
  if (tabAcik(s, 'mevzuat')) { const kritik = s.subeler.find((x) => ruhsatKalan(s, x) <= 45); if (kritik) L.push({ id: 'ruhsat', ik: '📜', baslik: 'Ruhsat yenile', ac: `${kritik.ad}: ruhsat süresi dolmak üzere.`, git: 'mevzuat', oncelik: 80 }); }
  if (s.subeler.some((x) => weekGaps(x, now) > 6)) L.push({ id: 'vardiya', ik: '🗓️', baslik: 'Vardiya boşluklarını kapat', ac: 'Boş saatlerde müşteri kaçar: otomatik planı çalıştır.', eylem: 'vardiyaGit', oncelik: 66 });
  if (lv >= 3 && !d.yat?.ortaklar?.length && tabAcik(s, 'yatirim') && s.kasa < 500000) L.push({ id: 'yatirimci', ik: '💼', baslik: 'Yatırımcı teklifine bak', ac: 'Büyümek için sermaye bulabilirsin.', git: 'yatirim', oncelik: 45 });
  return L.sort((a, z) => z.oncelik - a.oncelik);
}
/* ---------- İlk 30 gün yol haritası ---------- */
export interface YolAdim { id: string; ad: string; ac: string; odul: number; ok: (s: GameState) => boolean; git?: string; eylem?: string }
export const YOL: YolAdim[] = [
  { id: 'sube', ad: 'İlk şubeni aç', ac: 'Haritadan semt seç, ilanı planla ve aç.', odul: 0, ok: (s) => s.subeler.length >= 1, git: 'harita' },
  { id: 'fiyat', ad: 'Fiyat danışmanını dene', ac: 'Menü ve fiyat sayfasında öneriyi uygula.', odul: 5000, ok: (s) => s.stat.fiyatDeg >= 1, eylem: 'menuGit' },
  { id: 'urun', ad: 'Menüye yeni ürün ekle', ac: 'Menü sayfasından bir ürünü aktif et.', odul: 4000, ok: (s) => s.subeler.some((b) => PRODUCTS.filter((p) => b.menu[p.id]?.aktif).length > 13), eylem: 'menuGit' },
  { id: 'kamp', ad: 'Bir kampanya başlat', ac: 'Tanıtım → Kampanyalar.', odul: 6000, ok: (s) => s.subeler.some((b) => b.promo && (b.promo.sabah || b.promo.mutlu || b.promo.ogrenci || b.promo.kart)), git: 'kampanya' },
  { id: 'sosyal', ad: 'Sosyal medyada paylaş', ac: 'Tanıtım → Sosyal medya.', odul: 3000, ok: (s) => Object.keys(s.sosyal.son ?? {}).length > 0, git: 'sosyal' },
  { id: 'ekip', ad: 'Ekibini 4 kişiye çıkar', ac: 'Personel sayfasından ilan ver, işe al.', odul: 5000, ok: (s) => s.subeler.some((b) => b.staff.length >= 4), eylem: 'persGit' },
  { id: 'tarif', ad: 'İlk tarifini yaz', ac: 'Atölye → Tarif atölyesi (3. günden sonra).', odul: 6000, ok: (s) => (s.derin?.tarif.length ?? 0) >= 1, git: 'tarif' },
  { id: 'yanit', ad: 'Bir yoruma yanıt ver', ac: 'Dükkânlar → Yorumlar (7. günden sonra).', odul: 3000, ok: (s) => (s.derin?.say?.yanit ?? 0) >= 1, git: 'yorumlar' },
  { id: 'yat', ad: 'Ekipmanı geliştir', ac: 'Dükkânlar → Ekipman: bir ekipmanı 2. seviyeye çıkar.', odul: 8000, ok: (s) => s.subeler.some((b) => Object.values(b.yat ?? {}).some((v) => v >= 2)), eylem: 'gelGit' },
  { id: 'sube2', ad: 'İkinci şubeni aç', ac: 'Büyümenin ilk büyük adımı.', odul: 25000, ok: (s) => s.subeler.length >= 2, git: 'harita' },
];
export interface Yol { adim: Record<string, number>; bitti: boolean }
export function Yl(s: GameState): Yol { const d = D(s); return (d.yol ??= { adim: {}, bitti: false }); }
export function yolDurum(s: GameState): { yapilan: number; toplam: number; siradaki: YolAdim | null } { const y = Yl(s); return { yapilan: YOL.filter((a) => y.adim[a.id] !== undefined).length, toplam: YOL.length, siradaki: YOL.find((a) => y.adim[a.id] === undefined) ?? null }; }
/** Tamamlanan yeni adımları ödüllendirir; yeni tamamlananların adını döndürür (arayüz bildirimi için). */
export function yolKontrol(s: GameState): string[] {
  const y = Yl(s), now = dayOf(s), yeni: string[] = [];
  for (const a of YOL) if (y.adim[a.id] === undefined && a.ok(s)) { y.adim[a.id] = now; if (a.odul) s.kasa += a.odul * s.market.fiyat; yeni.push(a.ad); s.log.unshift(`🧭 Yol haritası: ${a.ad}${a.odul ? ` (+${Math.round(a.odul * s.market.fiyat)} ₺)` : ''}`); yaz(s, undefined, `Yol haritası: ${a.ad}`); }
  if (!y.bitti && YOL.every((a) => y.adim[a.id] !== undefined)) { y.bitti = true; s.kasa += 20000 * s.market.fiyat; s.log.unshift('🏁 Yol haritasını tamamladın! (+20.000 ₺)'); }
  return yeni;
}
hooks.gunOnce.push((s) => { if (s.subeler.length) yolKontrol(s); });
