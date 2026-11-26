/** Yorumlar gerçek nedenlerden doğar: bekleme, hijyen, fiyat, ürün kalitesi, stok, hizmet, imza içecek, müdavim… (saf fonksiyonlar, rastgele sayı tüketmez). */
import type { Branch } from './types';
export interface NedenDef { id: string; ad: string; ik: string; oneri: string; git?: string; metin: string[] }
export const NEDENLER: Record<string, NedenDef> = {
  bekleme: { id: 'bekleme', ad: 'Uzun bekleme', ik: '⏱️', oneri: 'Vardiyada barista/kasiyer ekle ya da hızlı ekipman al.', git: 'vardiya', metin: ['Siparişi çok geç aldık, kuyruk bitmiyordu.', 'Çok bekledik, ilgilenen yoktu.', 'Öğle saatinde servis yavaşladı.'] },
  hijyen: { id: 'hijyen', ad: 'Temizlik', ik: '🧽', oneri: 'Temizlik görevlisi ekle, temizlik malzemesi stokunu kontrol et.', git: 'personel', metin: ['Masalar temiz değildi.', 'Tezgâh ve masalar özensiz görünüyordu.', 'Temizliğe biraz daha dikkat edilmeli.'] },
  fiyat: { id: 'fiyat', ad: 'Pahalı fiyat', ik: '💸', oneri: 'Fiyat danışmanını çalıştır; pahalı ürünlerde fiyatı düşür.', git: 'menu', metin: ['Fiyatlar çok yüksek.', 'Kahve güzel ama fiyat biraz fazla.', 'Aynı kahveyi yan sokakta daha ucuza içtim.'] },
  kalite: { id: 'kalite', ad: 'Ürün kalitesi', ik: '☕', oneri: 'Çekirdek karışımını iyileştir, daha kaliteli tedarikçi seç.', git: 'cek', metin: ['Kahve soğuk ve yavan geldi.', 'Kahvenin tadı beklediğim gibi değildi.', 'Tatlı bayattı.'] },
  stok: { id: 'stok', ad: 'Ürün tükendi', ik: '📦', oneri: 'Otomatik siparişi aç, minimum stok seviyesini yükselt.', git: 'stok', metin: ['İstediğim ürün yoktu.', 'Menüde yazan şeylerin yarısı bitmişti.', 'Süt bitmişti, alternatif sunulmadı.'] },
  hizmet: { id: 'hizmet', ad: 'Hizmet', ik: '🤵', oneri: 'Personel eğitimi ve moral için prim/zam düşün.', git: 'personel', metin: ['Personel ilgisizdi.', 'Güler yüz göremedik.', 'Hesap kısmında karışıklık oldu.'] },
  imza: { id: 'imza', ad: 'İmza içecek', ik: '⭐', oneri: 'İmza içeceği güçlendir; fuarda yarıştır.', git: 'tarif', metin: ['İmza içeceklerine bayıldım, bir daha gelirim!', 'Menüdeki özel içecek harikaydı.', 'Başka yerde bulamayacağınız bir lezzet.'] },
  mudavim: { id: 'mudavim', ad: 'Müdavim sohbeti', ik: '💞', oneri: 'Müdavimlerin favori ürünlerini aktif tut.', git: 'mudavim', metin: ['Buranın müdavimiyim, herkes tanıyor.', 'Her sabah uğrarım, sıcak bir ortam.', 'Mahallenin vazgeçilmezi.'] },
  temiz: { id: 'temiz', ad: 'Temiz ortam', ik: '✨', oneri: 'Temizliği koru.', metin: ['Pırıl pırıl bir mekân.', 'Temizlik çok iyiydi.', 'Masalar tertemizdi.'] },
  hizli: { id: 'hizli', ad: 'Hızlı servis', ik: '⚡', oneri: 'Kadroyu koru.', metin: ['Kahve harika, servis hızlı!', 'Beklemeden aldık, çok memnun kaldık.', 'Yoğun saatte bile hızlıydılar.'] },
  lezzet: { id: 'lezzet', ad: 'Lezzet', ik: '😋', oneri: 'Kaliteyi koru.', metin: ['Kahve harika, tadı çok iyi.', 'Tatlılar taze ve lezzetli.', 'Kahvenin kalitesi fark ediliyor.'] },
  genel: { id: 'genel', ad: 'Genel', ik: '🙂', oneri: '', metin: ['Çok keyifli bir mekân, tekrar geleceğim.', 'Dışarıdaki masalar çok şirin.', 'Personel güler yüzlü.'] },
  orta: { id: 'orta', ad: 'Ortalama', ik: '😐', oneri: '', metin: ['Ortalama bir deneyim.', 'Fena değil ama öne çıkan bir şey yok.', 'İdare eder.'] },
};
const h = (...n: number[]): number => { let x = 0x811c9dc5; for (const v of n) { x ^= Math.floor(v) | 0; x = Math.imul(x, 0x01000193); x ^= x >>> 13; } return x >>> 0; };
/** Yorumun nedenini şubenin gerçek durumundan seçer. */
export function yorumNedeni(b: Branch, y: number, gun: number, i: number, imzaVar: boolean, mudSayi: number): string {
  const m = b.mus;
  if (y <= 2) return m.ortBekleme > 7 ? 'bekleme' : b.hijyen < 50 ? 'hijyen' : m.fiyatMemn < 45 ? 'fiyat' : m.urunKal < 55 ? 'kalite' : b.bugun.stokYok > 2 ? 'stok' : 'hizmet';
  if (y === 3) return m.fiyatMemn < 60 ? 'fiyat' : m.ortBekleme > 5 ? 'bekleme' : 'orta';
  const r = h(gun, b.id, i);
  if (imzaVar && r % 4 === 0) return 'imza'; if (mudSayi > 0 && r % 5 === 1) return 'mudavim'; if (b.hijyen >= 80 && r % 3 === 0) return 'temiz'; if (m.hizmet >= 75 && r % 3 === 1) return 'hizli'; if (m.urunKal >= 75) return 'lezzet'; return 'genel';
}
export const nedenMetinleri = (id: string): string[] => (NEDENLER[id] ?? NEDENLER.genel!).metin;
export interface YRes { ok: boolean; m: string }
/** Yoruma yanıt yaz: ücretsiz, her yoruma bir kez; olumsuz yoruma yanıt itibarı daha çok toparlar. */
export function yorumYanit(b: Branch, i: number): YRes {
  const r = b.yorumlar[i]; if (!r) return { ok: false, m: 'Yorum yok.' }; if (r.yanit) return { ok: false, m: 'Bu yoruma zaten yanıt verdin.' };
  r.yanit = true; const art = r.yildiz <= 2 ? 0.6 : r.yildiz === 3 ? 0.3 : 0.15; b.marka = Math.min(100, b.marka + art); b.sadakat = Math.min(100, b.sadakat + art * 0.5);
  return { ok: true, m: r.yildiz <= 2 ? `${r.kim}'e özür ve çözüm yazdın: itibar +${art.toFixed(1)}.` : `${r.kim}'e teşekkür ettin: itibar +${art.toFixed(2)}.` };
}
