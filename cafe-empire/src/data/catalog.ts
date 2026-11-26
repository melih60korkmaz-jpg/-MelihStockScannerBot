import type { City } from './turkey';

/* ---------- Hammaddeler ---------- */
export type IngId = 'bean' | 'milk' | 'sugar' | 'cup' | 'lid' | 'napkin' | 'syrup' | 'choc' | 'flour' | 'raw' | 'pack';
export interface IngDef { id: IngId; ad: string; ikon: string; birim: string; paket: number; paketAd: string; fiyat: number; teslim: number }
/** paket: bir siparişteki temel birim sayısı; fiyat: bir paketin baz fiyatı (₺); teslim: gün. */
export const INGREDIENTS: IngDef[] = [
  { id: 'bean', ad: 'Kahve çekirdeği', ikon: '🫘', birim: 'g', paket: 1000, paketAd: '1 kg', fiyat: 900, teslim: 2 },
  { id: 'milk', ad: 'Süt', ikon: '🥛', birim: 'ml', paket: 1000, paketAd: '1 L', fiyat: 45, teslim: 1 },
  { id: 'sugar', ad: 'Şeker', ikon: '🍬', birim: 'g', paket: 1000, paketAd: '1 kg', fiyat: 60, teslim: 1 },
  { id: 'cup', ad: 'Bardak', ikon: '🥤', birim: 'adet', paket: 100, paketAd: '100 adet', fiyat: 220, teslim: 2 },
  { id: 'lid', ad: 'Kapak', ikon: '⚪', birim: 'adet', paket: 100, paketAd: '100 adet', fiyat: 120, teslim: 2 },
  { id: 'napkin', ad: 'Peçete', ikon: '🧻', birim: 'adet', paket: 1000, paketAd: '1000 adet', fiyat: 180, teslim: 2 },
  { id: 'syrup', ad: 'Şurup', ikon: '🍯', birim: 'ml', paket: 1000, paketAd: '1 L', fiyat: 320, teslim: 3 },
  { id: 'choc', ad: 'Çikolata', ikon: '🍫', birim: 'g', paket: 1000, paketAd: '1 kg', fiyat: 450, teslim: 3 },
  { id: 'flour', ad: 'Un', ikon: '🌾', birim: 'g', paket: 10000, paketAd: '10 kg', fiyat: 250, teslim: 2 },
  { id: 'raw', ad: 'Ham madde (yumurta, tereyağı, krema)', ikon: '🥚', birim: 'g', paket: 5000, paketAd: '5 kg', fiyat: 600, teslim: 2 },
  { id: 'pack', ad: 'Paketleme malzemesi', ikon: '📦', birim: 'adet', paket: 100, paketAd: '100 adet', fiyat: 350, teslim: 3 },
];
export const ING: Record<IngId, IngDef> = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i])) as Record<IngId, IngDef>;

/* ---------- Ürünler ---------- */
export type ProductId = 'espresso' | 'americano' | 'latte' | 'cappuccino' | 'mocha' | 'filtre' | 'turk' | 'soguk' | 'frappe' | 'coldbrew' | 'kruvasan' | 'cheesecake' | 'brownie' | 'kurabiye' | 'sandvic' | 'tost' | 'pasta' | 'pogaca' | 'tatli';
export type Aff = [number, number, number, number, number]; // ogr, cal, tur, aile, emk
export interface ProductDef {
  id: ProductId; ad: string; ikon: string; kat: 'kahve' | 'yiyecek'; fiyat: number; recete: Partial<Record<IngId, number>>;
  sure: number;        // hazırlama süresi (sn)
  talep: number;       // baz popülerlik 0–1
  aff: Aff; sicak?: boolean; soguk?: boolean; seviye: number; kurulum: number;
}
const c = (bean: number, extra: Partial<Record<IngId, number>> = {}): Partial<Record<IngId, number>> => ({ bean, cup: 1, lid: 1, napkin: 1, ...extra });
export const PRODUCTS: ProductDef[] = [
  { id: 'espresso', ad: 'Espresso', ikon: '☕', kat: 'kahve', fiyat: 75, recete: c(18), sure: 25, talep: 0.55, aff: [1, 1.6, 1, .5, .6], seviye: 1, kurulum: 0 },
  { id: 'americano', ad: 'Americano', ikon: '🫗', kat: 'kahve', fiyat: 85, recete: c(18), sure: 30, talep: 0.6, aff: [1, 1.5, 1, .7, .7], seviye: 1, kurulum: 0 },
  { id: 'latte', ad: 'Latte', ikon: '🥛', kat: 'kahve', fiyat: 105, recete: c(18, { milk: 200, sugar: 4 }), sure: 45, talep: 0.9, aff: [1.3, 1.2, 1, 1, .7], seviye: 1, kurulum: 0 },
  { id: 'cappuccino', ad: 'Cappuccino', ikon: '☕', kat: 'kahve', fiyat: 105, recete: c(18, { milk: 150, sugar: 4 }), sure: 45, talep: 0.8, aff: [1.2, 1.2, 1, .9, .8], seviye: 1, kurulum: 0 },
  { id: 'mocha', ad: 'Mocha', ikon: '🍫', kat: 'kahve', fiyat: 120, recete: c(18, { milk: 180, choc: 25, syrup: 10 }), sure: 55, talep: 0.55, aff: [1.4, .9, 1, 1.2, .5], sicak: true, seviye: 2, kurulum: 15000 },
  { id: 'filtre', ad: 'Filtre kahve', ikon: '🫖', kat: 'kahve', fiyat: 70, recete: c(14), sure: 20, talep: 0.7, aff: [1, 1.3, .8, .9, .9], seviye: 1, kurulum: 0 },
  { id: 'turk', ad: 'Türk kahvesi', ikon: '☕', kat: 'kahve', fiyat: 65, recete: { bean: 10, sugar: 6, cup: 1, napkin: 1 }, sure: 60, talep: 0.5, aff: [.6, 1, 1.7, .8, 1.6], sicak: true, seviye: 1, kurulum: 0 },
  { id: 'soguk', ad: 'Soğuk kahve', ikon: '🧊', kat: 'kahve', fiyat: 115, recete: c(18, { milk: 120, syrup: 12 }), sure: 40, talep: 0.55, aff: [1.4, 1, 1.2, 1, .4], soguk: true, seviye: 2, kurulum: 20000 },
  { id: 'frappe', ad: 'Frappé', ikon: '🥤', kat: 'kahve', fiyat: 125, recete: c(18, { milk: 150, syrup: 25, choc: 10 }), sure: 50, talep: 0.5, aff: [1.6, .8, 1.3, 1.2, .3], soguk: true, seviye: 2, kurulum: 25000 },
  { id: 'coldbrew', ad: 'Cold brew', ikon: '🧋', kat: 'kahve', fiyat: 120, recete: c(24), sure: 20, talep: 0.4, aff: [1.2, 1.3, 1.1, .7, .4], soguk: true, seviye: 3, kurulum: 35000 },
  { id: 'kruvasan', ad: 'Kruvasan', ikon: '🥐', kat: 'yiyecek', fiyat: 85, recete: { flour: 70, raw: 40, napkin: 1, pack: 1 }, sure: 15, talep: 0.65, aff: [1, 1.3, 1.1, 1.1, 1], seviye: 1, kurulum: 12000 },
  { id: 'cheesecake', ad: 'Cheesecake', ikon: '🍰', kat: 'yiyecek', fiyat: 135, recete: { flour: 30, raw: 90, sugar: 20, napkin: 1, pack: 1 }, sure: 15, talep: 0.55, aff: [1.2, .8, 1.3, 1.5, .8], seviye: 1, kurulum: 18000 },
  { id: 'brownie', ad: 'Brownie', ikon: '🍪', kat: 'yiyecek', fiyat: 95, recete: { flour: 40, raw: 50, choc: 40, sugar: 20, napkin: 1, pack: 1 }, sure: 12, talep: 0.5, aff: [1.4, .9, 1.1, 1.3, .6], seviye: 2, kurulum: 12000 },
  { id: 'kurabiye', ad: 'Kurabiye', ikon: '🍪', kat: 'yiyecek', fiyat: 45, recete: { flour: 40, raw: 25, sugar: 15, pack: 1 }, sure: 10, talep: 0.45, aff: [1, 1, 1, 1.3, 1.2], seviye: 1, kurulum: 6000 },
  { id: 'sandvic', ad: 'Sandviç', ikon: '🥪', kat: 'yiyecek', fiyat: 115, recete: { flour: 80, raw: 90, napkin: 1, pack: 1 }, sure: 60, talep: 0.55, aff: [1.3, 1.4, .8, 1.2, .7], seviye: 1, kurulum: 14000 },
  { id: 'tost', ad: 'Tost', ikon: '🥪', kat: 'yiyecek', fiyat: 95, recete: { flour: 70, raw: 80, napkin: 1, pack: 1 }, sure: 75, talep: 0.6, aff: [1.4, 1.3, .9, 1.1, 1], seviye: 1, kurulum: 10000 },
  { id: 'pasta', ad: 'Pasta', ikon: '🎂', kat: 'yiyecek', fiyat: 125, recete: { flour: 40, raw: 80, sugar: 20, napkin: 1, pack: 1 }, sure: 15, talep: 0.45, aff: [1.1, .8, 1.2, 1.5, 1], seviye: 2, kurulum: 20000 },
  { id: 'pogaca', ad: 'Poğaça', ikon: '🥟', kat: 'yiyecek', fiyat: 50, recete: { flour: 80, raw: 30, napkin: 1, pack: 1 }, sure: 10, talep: 0.5, aff: [1.1, 1.1, .7, 1, 1.5], seviye: 1, kurulum: 6000 },
  { id: 'tatli', ad: 'Sütlü tatlı', ikon: '🍮', kat: 'yiyecek', fiyat: 90, recete: { milk: 200, sugar: 25, raw: 30, napkin: 1, pack: 1 }, sure: 10, talep: 0.4, aff: [.9, .8, 1.2, 1.4, 1.4], seviye: 2, kurulum: 12000 },
];
export const PRODUCT: Record<ProductId, ProductDef> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p])) as Record<ProductId, ProductDef>;

/* ---------- Dükkân türleri ---------- */
export type ShopTypeId = 'mahalle' | 'cadde' | 'avm' | 'uni' | 'sahil' | 'luks' | 'konsept' | 'franchise';
export interface ShopType {
  id: ShopTypeId; ad: string; ikon: string; m2: number; kira: number; potansiyel: number; rekabet: number; kapasite: number; slot: number;
  kurulum: number; seviye: number; masa: number; stil: string; ac: string;
  uygun: (c: City) => string | null;     // null = uygun; aksi hâlde sebep
}
export const SHOP_TYPES: ShopType[] = [
  { id: 'mahalle', ad: 'Küçük mahalle kafesi', ikon: '🏘️', m2: 35, kira: 28000, potansiyel: 90, rekabet: 0.25, kapasite: 14, slot: 3, kurulum: 180000, seviye: 1, masa: 2, stil: 'mahalle', ac: 'Düşük kira, sadık mahalle müşterisi.', uygun: () => null },
  { id: 'cadde', ad: 'Cadde üzeri kafe', ikon: '🛣️', m2: 55, kira: 55000, potansiyel: 170, rekabet: 0.5, kapasite: 24, slot: 4, kurulum: 300000, seviye: 1, masa: 4, stil: 'cadde', ac: 'Yoğun yaya trafiği; rekabet sert.', uygun: (c) => (c.nufus < 150 ? 'Şehir çok küçük' : null) },
  { id: 'avm', ad: 'AVM kafesi', ikon: '🏬', m2: 45, kira: 90000, potansiyel: 230, rekabet: 0.55, kapasite: 22, slot: 3, kurulum: 420000, seviye: 2, masa: 0, stil: 'avm', ac: 'Çok müşteri, dış masa yok; yüksek kira.', uygun: (c) => (c.nufus < 500 ? 'AVM için nüfus ≥ 500 bin' : null) },
  { id: 'uni', ad: 'Üniversite yakını kafe', ikon: '🎓', m2: 60, kira: 40000, potansiyel: 200, rekabet: 0.45, kapasite: 30, slot: 4, kurulum: 280000, seviye: 1, masa: 5, stil: 'uni', ac: 'Öğrenci kalabalığı, fiyata duyarlı.', uygun: (c) => (c.ogrenci < 0.3 ? 'Öğrenci nüfusu yetersiz' : null) },
  { id: 'sahil', ad: 'Sahil kafesi', ikon: '🏖️', m2: 80, kira: 85000, potansiyel: 210, rekabet: 0.5, kapasite: 36, slot: 5, kurulum: 520000, seviye: 2, masa: 8, stil: 'sahil', ac: 'Yazın patlar, kışın durulur.', uygun: (c) => (c.kiyi ? null : 'Şehir kıyıda değil') },
  { id: 'luks', ad: 'Lüks şehir kafesi', ikon: '💎', m2: 90, kira: 140000, potansiyel: 180, rekabet: 0.6, kapasite: 34, slot: 5, kurulum: 950000, seviye: 4, masa: 6, stil: 'luks', ac: 'Yüksek sepet, premium müşteri.', uygun: (c) => (c.gelir < 1.0 ? 'Gelir seviyesi yetersiz' : null) },
  { id: 'konsept', ad: 'Büyük konsept kafe', ikon: '🎪', m2: 180, kira: 180000, potansiyel: 330, rekabet: 0.65, kapasite: 70, slot: 5, kurulum: 1600000, seviye: 5, masa: 12, stil: 'konsept', ac: 'Dev mekân; etkinlik ve kalabalık.', uygun: (c) => (c.nufus < 800 ? 'Konsept kafe için nüfus ≥ 800 bin' : null) },
  { id: 'franchise', ad: 'Franchise şubesi', ikon: '🤝', m2: 50, kira: 45000, potansiyel: 160, rekabet: 0.4, kapasite: 22, slot: 3, kurulum: 150000, seviye: 5, masa: 3, stil: 'franchise', ac: 'Markanı yatırımcı işletir; kullanım geliri.', uygun: () => 'Franchise sistemi henüz geliştirilmedi' },
];
export const SHOP: Record<ShopTypeId, ShopType> = Object.fromEntries(SHOP_TYPES.map((s) => [s.id, s])) as Record<ShopTypeId, ShopType>;

/* ---------- Personel ---------- */
export type StaffTypeId = 'barista' | 'kasiyer' | 'servis' | 'temizlik' | 'sube_muduru' | 'bolge_muduru' | 'pazarlama';
export interface StaffType { id: StaffTypeId; ad: string; ikon: string; maas: number; seviye: number; ac: string }
export const STAFF_TYPES: StaffType[] = [
  { id: 'barista', ad: 'Barista', ikon: '🧑‍🍳', maas: 36000, seviye: 1, ac: 'Kahve hazırlama hızı ve kalitesi.' },
  { id: 'kasiyer', ad: 'Kasiyer', ikon: '🧾', maas: 30000, seviye: 1, ac: 'Sipariş alma hızı, müşteri ilişkisi.' },
  { id: 'servis', ad: 'Servis personeli', ikon: '🧑‍💼', maas: 29000, seviye: 1, ac: 'Dış masa servisi, memnuniyet.' },
  { id: 'temizlik', ad: 'Temizlik görevlisi', ikon: '🧹', maas: 27000, seviye: 1, ac: 'Hijyen puanı.' },
  { id: 'sube_muduru', ad: 'Şube müdürü', ikon: '🧑‍💻', maas: 65000, seviye: 2, ac: 'Şubenin verimi ve ekip motivasyonu.' },
  { id: 'bolge_muduru', ad: 'Bölge müdürü', ikon: '🗺️', maas: 110000, seviye: 5, ac: 'Bölgedeki tüm şubelere verim bonusu.' },
  { id: 'pazarlama', ad: 'Pazarlama personeli', ikon: '📣', maas: 45000, seviye: 2, ac: 'Marka bilinirliği ve reklam etkisi.' },
];
export const STAFF_TYPE: Record<StaffTypeId, StaffType> = Object.fromEntries(STAFF_TYPES.map((s) => [s.id, s])) as Record<StaffTypeId, StaffType>;
export const FIRST_NAMES = ['Ayşe', 'Mehmet', 'Elif', 'Can', 'Zeynep', 'Burak', 'Selin', 'Emre', 'Derya', 'Kerem', 'Merve', 'Onur', 'Gül', 'Barış', 'İpek', 'Tolga', 'Yasemin', 'Cem', 'Nur', 'Deniz', 'Ece', 'Murat', 'Pelin', 'Serkan'];
export const LAST_NAMES = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Koç', 'Kurt', 'Polat', 'Aksoy', 'Erdem', 'Güneş'];

/* ---------- Reklam ---------- */
export type AdId = 'sosyal' | 'yerel' | 'acilis' | 'indirim' | 'sadakat' | 'influencer' | 'etkinlik' | 'uni';
export interface AdDef { id: AdId; ad: string; ikon: string; maliyet: number; gun: number; trafik: number; marka: number; risk: number; ac: string; sehir?: boolean; seviye: number }
export const ADS: AdDef[] = [
  { id: 'sosyal', ad: 'Sosyal medya reklamı', ikon: '📱', maliyet: 14000, gun: 14, trafik: 0.10, marka: 0.4, risk: 0.18, ac: 'Gençlere ulaşır; her zaman tutmaz.', seviye: 1 },
  { id: 'yerel', ad: 'Yerel reklam', ikon: '📰', maliyet: 9000, gun: 10, trafik: 0.07, marka: 0.25, risk: 0.1, ac: 'Mahalle gazetesi, afiş, broşür.', seviye: 1 },
  { id: 'acilis', ad: 'Açılış kampanyası', ikon: '🎉', maliyet: 22000, gun: 7, trafik: 0.28, marka: 0.8, risk: 0.12, ac: 'Yeni şube için güçlü etki.', seviye: 1 },
  { id: 'indirim', ad: 'İndirim kampanyası', ikon: '🏷️', maliyet: 6000, gun: 7, trafik: 0.16, marka: 0.1, risk: 0.05, ac: 'Trafik artar, kâr marjı düşer (fiyat %10 iner).', seviye: 1 },
  { id: 'sadakat', ad: 'Sadakat kartı', ikon: '💳', maliyet: 45000, gun: 60, trafik: 0.06, marka: 0.2, risk: 0.05, ac: 'Müşteri sadakati artar.', seviye: 2 },
  { id: 'influencer', ad: 'Influencer iş birliği', ikon: '🤳', maliyet: 70000, gun: 10, trafik: 0.30, marka: 1.6, risk: 0.35, ac: 'Büyük etki ama riskli.', seviye: 2 },
  { id: 'etkinlik', ad: 'Şehir etkinliği', ikon: '🎪', maliyet: 55000, gun: 5, trafik: 0.35, marka: 1.2, risk: 0.2, ac: 'Festival stantı, konser.', sehir: true, seviye: 3 },
  { id: 'uni', ad: 'Üniversite kampanyası', ikon: '🎓', maliyet: 18000, gun: 14, trafik: 0.18, marka: 0.5, risk: 0.1, ac: 'Öğrencilere özel; öğrenci kentlerinde etkili.', seviye: 1 },
];
export const AD: Record<AdId, AdDef> = Object.fromEntries(ADS.map((a) => [a.id, a])) as Record<AdId, AdDef>;

/* ---------- Dış cephe geliştirmeleri ---------- */
export type UpgradeId = 'tabela' | 'cam' | 'led' | 'premium' | 'kapi' | 'oturma' | 'peyzaj' | 'vitrin' | 'tente' | 'marka';
export interface UpgradeDef { id: UpgradeId; ad: string; ikon: string; max: number; maliyet: number; seviye: number; ac: string }
export const UPGRADES: UpgradeDef[] = [
  { id: 'tabela', ad: 'Yeni tabela', ikon: '🪧', max: 3, maliyet: 30000, seviye: 1, ac: 'Daha büyük ve parlak tabela.' },
  { id: 'cam', ad: 'Cam cephe yenileme', ikon: '🪟', max: 3, maliyet: 60000, seviye: 1, ac: 'Daha geniş, çerçeveli cam cephe.' },
  { id: 'led', ad: 'LED aydınlatma', ikon: '💡', max: 1, maliyet: 40000, seviye: 2, ac: 'Gece cephe aydınlatması ve neon.' },
  { id: 'premium', ad: 'Premium dış cephe', ikon: '🏛️', max: 1, maliyet: 180000, seviye: 4, ac: 'Taş kaplama ve metal detaylar.' },
  { id: 'marka', ad: 'Marka tasarımı', ikon: '🎨', max: 1, maliyet: 50000, seviye: 2, ac: 'Marka renkleri tüm cepheye uygulanır.' },
  { id: 'kapi', ad: 'Yeni giriş kapısı', ikon: '🚪', max: 2, maliyet: 35000, seviye: 1, ac: 'Cam kapı, sıcak aydınlatma.' },
  { id: 'oturma', ad: 'Dış oturma alanı', ikon: '🪑', max: 3, maliyet: 45000, seviye: 1, ac: 'Daha çok dış masa ve sandalye.' },
  { id: 'peyzaj', ad: 'Peyzaj', ikon: '🌿', max: 3, maliyet: 25000, seviye: 1, ac: 'Saksı, bitki ve ağaç.' },
  { id: 'vitrin', ad: 'Büyük vitrin', ikon: '🥐', max: 1, maliyet: 70000, seviye: 3, ac: 'Pasta ve ürün vitrini.' },
  { id: 'tente', ad: 'Özel tasarım tente', ikon: '⛱️', max: 3, maliyet: 38000, seviye: 1, ac: 'Marka renkli tente ve şemsiyeler.' },
];
export const UPGRADE: Record<UpgradeId, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<UpgradeId, UpgradeDef>;

/* ---------- Kafe seviyeleri ---------- */
export interface LevelDef { n: number; ad: string; sube: number; marka: number; ac: string }
export const LEVELS: LevelDef[] = [
  { n: 1, ad: 'Küçük mahalle kafesi', sube: 1, marka: 0, ac: 'Başlangıç.' },
  { n: 2, ad: 'Tanınan yerel kafe', sube: 1, marka: 18, ac: 'Reklam, müdür ve yeni ürünler açılır.' },
  { n: 3, ad: 'Popüler şehir kafesi', sube: 1, marka: 35, ac: 'Şehir etkinlikleri ve büyük vitrin açılır.' },
  { n: 4, ad: 'Premium kafe', sube: 1, marka: 50, ac: 'Lüks kafe ve premium cephe açılır.' },
  { n: 5, ad: 'Birden fazla şubesi olan marka', sube: 2, marka: 55, ac: 'Konsept kafe, bölge müdürü ve franchise açılır.' },
  { n: 6, ad: 'Bölgesel kafe zinciri', sube: 6, marka: 65, ac: 'Birden çok şehirde büyüme.' },
  { n: 7, ad: 'Ulusal kafe zinciri', sube: 15, marka: 78, ac: 'Türkiye geneline yayılım.' },
  { n: 8, ad: 'Uluslararası marka', sube: 30, marka: 90, ac: 'Zirve.' },
];
