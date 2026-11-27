/** İlk adımlar rehberi: yeni oyuncuyu temel mekaniklerde adım adım yürütür.
 *  İlerleme kayıtlıdır (oyun kaydıyla birlikte), atlanabilir, kapatılabilir ve yeniden açılabilir.
 *  Ödül vermez; oyun dengesine dokunmaz. */
import { D } from './derin';
import type { GameState } from './types';

export interface OgrKayit { adim: Record<string, number>; atla: Record<string, boolean>; kapali: boolean; baz: Record<string, number>; bitti: boolean }
/** Arayüzün anlık durumu (hangi sayfa açık?). Çekirdek DOM'a dokunmaz. */
export interface OgrUi { tab: string; subeAcik: number | null; subeSekme: string }
export interface OgrAdim {
  id: string; ik: string; ad: string; ac: string;
  git?: string; eylem?: string;
  /** Bu eylemler başarılı olunca adım tamamlanır (arayüzden `ogrEylem` ile bildirilir). */
  eylemler?: string[];
  /** Duruma/arayüze bakarak tamamlanma. */
  ok?: (s: GameState, ui: OgrUi, o: OgrKayit) => boolean;
}
const topPersonel = (s: GameState): number => s.subeler.reduce((a, b) => a + b.staff.length, 0);
export const OGR: OgrAdim[] = [
  { id: 'kur', ik: '🏪', ad: 'Kafeni kur', ac: 'Türkiye haritasında bir semt seç, ilanlardan birini planla ve aç. Başlangıç sermayen kasada.', git: 'harita', ok: (s) => s.subeler.length >= 1 },
  { id: 'tani', ik: '🔎', ad: 'Kafeni tanı', ac: 'Dükkânlar sayfasında kafene dokun: bugünkü müşteri, gelir ve durum özeti burada.', git: 'subeler', ok: (_s, ui) => ui.tab === 'subeler' && ui.subeAcik !== null },
  { id: 'ise', ik: '👥', ad: 'Yeni bir çalışan işe al', ac: 'Dükkân küçük bir ekiple açılır. Personel sayfasında ilan ver; aday gelince işe al, yoğun saatlerde kuyruk uzamasın.', eylem: 'persGit', eylemler: ['hire'], ok: (s, _u, o) => o.baz.personel !== undefined && topPersonel(s) > o.baz.personel },
  { id: 'urun', ik: '📋', ad: 'Menüye ürün ekle', ac: 'Menü ve fiyat sayfasında bir ürünü aç. Her ürün farklı malzeme kullanır; açtığın ürünün stoğunu tutmalısın.', eylem: 'menuGit', eylemler: ['urun'] },
  { id: 'stok', ik: '📦', ad: 'İlk stok siparişini ver', ac: 'Depo → Stok: azalan malzemeden sipariş ver. Stok biterse o ürün satılamaz.', git: 'stok', eylemler: ['siparis'] },
  { id: 'fiyat', ik: '🏷️', ad: 'Satış fiyatlarını belirle', ac: 'Menü ve fiyat: fiyatı artır/azalt ya da fiyat danışmanının önerisini uygula.', eylem: 'menuGit', eylemler: ['fiyat', 'fiyatTl', 'oneri', 'oneritum', 'fiyatset', 'tumfiyat'] },
  { id: 'gelir', ik: '💰', ad: 'Günlük gelirini takip et', ac: 'Kasa → Gelir-gider: bugünkü gelirini ve giderlerini gör. Kâr, gelirden giderler çıkınca kalandır.', git: 'finans', ok: (_s, ui) => ['finans', 'rapor', 'ekonomi'].includes(ui.tab) },
  { id: 'memn', ik: '😊', ad: 'Müşteri memnuniyetini kontrol et', ac: 'Dükkânlar → Müşteriler: memnuniyet düşerse müşteri kaybedersin. Merkez\'deki durum kartı da özet verir.', git: 'musteri', ok: (_s, ui) => ['musteri', 'yorumlar'].includes(ui.tab) },
];
export function Og(s: GameState): OgrKayit { const d = D(s); return (d.ogr ??= { adim: {}, atla: {}, kapali: false, baz: {}, bitti: false }); }
export interface OgrDurum { yapilan: number; atlanan: number; toplam: number; siradaki: OgrAdim | null; sira: number }
export function ogrDurum(s: GameState): OgrDurum {
  const o = Og(s), yapilan = OGR.filter((a) => o.adim[a.id] !== undefined).length, atlanan = OGR.filter((a) => o.atla[a.id]).length;
  const sd = OGR.find((a) => o.adim[a.id] === undefined && !o.atla[a.id]) ?? null;
  return { yapilan, atlanan, toplam: OGR.length, siradaki: sd, sira: sd ? OGR.indexOf(sd) + 1 : OGR.length };
}
/** Sıradaki adım için gerekli başlangıç değerlerini (örn. personel sayısı) bir kez kaydeder. */
function bazAl(s: GameState, o: OgrKayit): void { if (o.baz.personel === undefined && s.subeler.length) o.baz.personel = topPersonel(s); }
/** Arayüz her çağrıda: tamamlanan adımı işaretler; yeni biten adımların adlarını döndürür (bildirim için). */
export function ogrKontrol(s: GameState, ui: OgrUi, gun: number): string[] {
  const o = Og(s), yeni: string[] = [];
  if (o.bitti) return yeni;
  bazAl(s, o);
  // Sıradaki adım ilerlemeden, yalnız ondan sonrakiler değil: tamamlanmış herhangi bir adım işaretlenir (oyuncu sırayı atlayabilir).
  for (const a of OGR) { if (o.adim[a.id] !== undefined || !a.ok) continue; if (a.ok(s, ui, o)) { o.adim[a.id] = gun; yeni.push(a.ad); } }
  if (OGR.every((a) => o.adim[a.id] !== undefined || o.atla[a.id])) o.bitti = true;
  return yeni;
}
/** Başarılı bir oyuncu eylemi (örn. 'hire', 'siparis'): ilgili adımı tamamlar. */
export function ogrEylem(s: GameState, eylem: string, gun: number): string[] {
  const o = Og(s), yeni: string[] = []; if (o.bitti) return yeni;
  for (const a of OGR) if (o.adim[a.id] === undefined && a.eylemler?.includes(eylem)) { o.adim[a.id] = gun; yeni.push(a.ad); }
  if (OGR.every((a) => o.adim[a.id] !== undefined || o.atla[a.id])) o.bitti = true;
  return yeni;
}
export function ogrAtla(s: GameState): void { const o = Og(s), sd = ogrDurum(s).siradaki; if (sd) o.atla[sd.id] = true; if (OGR.every((a) => o.adim[a.id] !== undefined || o.atla[a.id])) o.bitti = true; }
export function ogrKapat(s: GameState): void { Og(s).kapali = true; }
/** Rehberi baştan açar; tamamlanan adımları korur, atlananları geri getirir. */
export function ogrYenidenAc(s: GameState): void { const o = Og(s); o.kapali = false; o.atla = {}; o.bitti = OGR.every((a) => o.adim[a.id] !== undefined); }
export const ogrGorunur = (s: GameState): boolean => { const o = Og(s); return !o.kapali && !o.bitti; };
