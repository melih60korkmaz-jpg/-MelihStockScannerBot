/** Para birimi ₺. Ekonomi yavaş ilerler: alt ligde haftalık net gelir düşüktür. */
export const fmt = (v: number): string => { const a = Math.abs(v), s = a >= 1e6 ? (a / 1e6).toFixed(2).replace('.', ',') + ' Mn' : a >= 1e4 ? Math.round(a / 1000) + ' B' : Math.round(a).toLocaleString('tr-TR'); return (v < 0 ? '-' : '') + s + ' ₺'; };
export const YASAM_GIDERI = 1500; // haftalık temel yaşam gideri
export interface Esya { id: string; ad: string; ik: string; kat: 'esya' | 'arac' | 'gayri'; fiyat: number; luks: number; bakim: number; ac: string; kira?: number }
export const ESYALAR: Esya[] = [
  { id: 'telefon', ad: 'Telefon', ik: '📱', kat: 'esya', fiyat: 12000, luks: 1, bakim: 0, ac: 'Güncel model' },
  { id: 'tv', ad: 'Televizyon', ik: '📺', kat: 'esya', fiyat: 20000, luks: 1, bakim: 0, ac: '55 inç' },
  { id: 'bilgisayar', ad: 'Bilgisayar', ik: '💻', kat: 'esya', fiyat: 35000, luks: 2, bakim: 0, ac: 'Oyun bilgisayarı' },
  { id: 'konsol', ad: 'Oyun konsolu', ik: '🎮', kat: 'esya', fiyat: 18000, luks: 1, bakim: 0, ac: 'Boş zaman ve moral' },
  { id: 'saat', ad: 'Saat', ik: '⌚', kat: 'esya', fiyat: 60000, luks: 3, bakim: 0, ac: 'Lüks kol saati' },
  { id: 'taki', ad: 'Takı', ik: '💍', kat: 'esya', fiyat: 90000, luks: 4, bakim: 0, ac: 'Altın zincir ve yüzük' },
  { id: 'dekor', ad: 'Ev dekorasyonu', ik: '🖼️', kat: 'esya', fiyat: 45000, luks: 2, bakim: 0, ac: 'Tablo ve mobilya' },
  { id: 'bisiklet', ad: 'Bisiklet', ik: '🚲', kat: 'arac', fiyat: 9000, luks: 1, bakim: 20, ac: 'Şehir bisikleti' },
  { id: 'motor', ad: 'Motosiklet', ik: '🏍️', kat: 'arac', fiyat: 140000, luks: 3, bakim: 150, ac: 'Orta sınıf' },
  { id: 'otomobil', ad: 'Otomobil', ik: '🚗', kat: 'arac', fiyat: 600000, luks: 5, bakim: 400, ac: 'Konforlu sedan' },
  { id: 'spor', ad: 'Spor otomobil', ik: '🏎️', kat: 'arac', fiyat: 3500000, luks: 12, bakim: 2500, ac: 'Yüksek performans' },
  { id: 'tekne', ad: 'Tekne', ik: '🛥️', kat: 'arac', fiyat: 6000000, luks: 15, bakim: 4000, ac: 'Motoryat' },
  { id: 'jet', ad: 'Özel jet', ik: '✈️', kat: 'arac', fiyat: 60000000, luks: 40, bakim: 60000, ac: 'Yıldızlara özel' },
  { id: 'daire', ad: 'Daire', ik: '🏢', kat: 'gayri', fiyat: 1500000, luks: 6, bakim: 300, ac: '2+1 şehir dairesi (kiraya verilir)', kira: 2000 },
  { id: 'ev', ad: 'Ev', ik: '🏠', kat: 'gayri', fiyat: 3000000, luks: 9, bakim: 600, ac: 'Bahçeli müstakil ev' },
  { id: 'sehirevi', ad: 'Şehir evi', ik: '🏙️', kat: 'gayri', fiyat: 8000000, luks: 14, bakim: 1500, ac: 'Merkezde rezidans (kiraya verilir)', kira: 7000 },
  { id: 'villa', ad: 'Villa', ik: '🏡', kat: 'gayri', fiyat: 25000000, luks: 25, bakim: 6000, ac: 'Havuzlu villa' },
  { id: 'ciftlik', ad: 'Çiftlik', ik: '🌾', kat: 'gayri', fiyat: 40000000, luks: 30, bakim: 8000, ac: 'Geniş arazi (tarım geliri)', kira: 20000 },
  { id: 'otel', ad: 'Otel', ik: '🏨', kat: 'gayri', fiyat: 120000000, luks: 50, bakim: 25000, ac: 'Butik otel (gelir getirir)', kira: 150000 },
  { id: 'ada', ad: 'Özel ada', ik: '🏝️', kat: 'gayri', fiyat: 400000000, luks: 100, bakim: 90000, ac: 'Kariyerin zirvesi' }
];
export const esyaOf = (id: string): Esya => ESYALAR.find((e) => e.id === id)!;
export interface Antrenor { id: string; ad: string; seviye: number; uzmanlik: 'sut' | 'fizik' | 'teknik' | 'savunma' | 'genel'; maas: number; ac: string }
export const ANTRENORLER: Antrenor[] = [
  { id: 'a1', ad: 'Hasan Toprak', seviye: 1, uzmanlik: 'genel', maas: 1500, ac: 'Temel antrenör' },
  { id: 'a2', ad: 'Murat Kılıç', seviye: 2, uzmanlik: 'sut', maas: 3500, ac: 'Şut ve bitiricilik uzmanı' },
  { id: 'a3', ad: 'Emre Dalkıran', seviye: 2, uzmanlik: 'fizik', maas: 3500, ac: 'Kondisyon ve kuvvet uzmanı' },
  { id: 'a4', ad: 'Selim Yaman', seviye: 3, uzmanlik: 'teknik', maas: 9000, ac: 'Teknik ve top sürme uzmanı' },
  { id: 'a5', ad: 'Orhan Başaran', seviye: 3, uzmanlik: 'savunma', maas: 9000, ac: 'Savunma ve duran top uzmanı' },
  { id: 'a6', ad: 'Cem Aydoğan', seviye: 5, uzmanlik: 'genel', maas: 40000, ac: 'Üst düzey teknik direktör' }
];
