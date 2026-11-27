/** Oyun rehberi içeriği. Her cümle koddaki gerçek mekaniğe dayanır; sayılar sabitlerden okunur.
 *  Henüz uygulanmamış şeyler `YOK_LISTESI`'nde ayrıca gösterilir. */
import { INGREDIENTS, LEVELS, PRODUCTS, STAFF_TYPES } from './catalog';
import { CITIES } from './turkey';

export interface Konu {
  id: string; ik: string; ad: string; ozet: string; maddeler: string[];
  /** "Git" düğmesi: sekme kimliği ve etiketi (sekme, oyunda kilitliyse düğme gösterilmez). */
  git?: [string, string];
}
const para = (n: number): string => n.toLocaleString('tr-TR');
const kahve = PRODUCTS.filter((p) => p.kat === 'kahve').length, yiyecek = PRODUCTS.length - kahve;
const sv = (i: number): string => { const l = LEVELS[i - 1]!; return `${i}. ${l.ad} (${l.sube} şube, marka puanı ${l.marka})`; };

export const YARDIM_KONULARI: Konu[] = [
  { id: 'amac', ik: '🎯', ad: 'Oyunun amacı', ozet: 'Küçük bir mahalle kafesinden Türkiye çapında bir kafe zinciri kurarsın.',
    maddeler: ['Nihai hedef "Kahve İmparatoru" olmak: 20 şube, 8 ilde dükkân, 85 marka puanı, 20 milyon ₺ kasa, kahve fuarında altın madalya ve 3 franchise bayi.',
      `Yol boyunca kafe seviyen yükselir: ${LEVELS.length} seviye var (ilki "${LEVELS[0]!.ad}", sonuncusu "${LEVELS[LEVELS.length - 1]!.ad}").`,
      'Kaybetmek: kasa 20 gün üst üste −50.000 ₺\'nin altında kalırsa iflas edersin ve oyun biter.',
      'Zaman akarken yönetirsin. Bir olay çıkınca zaman durur, kararını verirsin.'], git: ['hedefler', 'Hedefler'] },
  { id: 'baslangic', ik: '🚀', ad: 'Oyuna nasıl başlanır?', ozet: 'İstanbul\'da, dükkânsız ve sermayeyle başlarsın.',
    maddeler: ['Normal zorlukta başlangıç sermayen 2.000.000 ₺. Kolay modda sermaye daha fazla, krizler daha az, rakipler daha yavaştır; Zor modda sermaye az, krizler sık, rakipler saldırgandır.',
      'Türkiye sekmesinden bir İstanbul ilçesi seç, ilanlardan birini planla: mekân türünü, konseptini ve dekorunu seç, sonra "Kirala ve kur".',
      'Üstteki ⏸ ▶ ⏩ ⏭ düğmeleri zamanı durdurur, 1×, 2× ve 4× hızlandırır.',
      'Başlangıçta menü sadedir: Merkez, Türkiye, Dükkânlar, Ayarlar. İlk dükkânı açınca Depo, Tanıtım ve Kasa açılır; diğer bölümler oyun ilerledikçe kilidi açılır (kilitli sekmede nedeni yazar).'], git: ['harita', 'Haritayı aç'] },
  { id: 'yonetim', ik: '🏪', ad: 'Kafe nasıl yönetilir?', ozet: 'Dükkânı dışarıdan, sayılar ve kartlarla yönetirsin.',
    maddeler: ['Merkez: kasa, bugünkü ve 30 günlük ciro, memnuniyet, her dükkânın uyarıları, hedefin, kısayollar ve "Sıradaki adım" kartı. Takıldığında önce buraya bak.',
      'Dükkânlar: kafene dokun. İçinde Özet, Menü, Personel, Vardiya ve Ekipman sekmeleri var.',
      'Birden fazla dükkânın olunca üstteki şehir düğmeleriyle dükkân değiştirirsin.',
      'Dükkânda canlı animasyon yok: durumu yüzdeler, çubuklar ve haberlerle izlersin.'], git: ['subeler', 'Dükkânlar'] },
  { id: 'personel', ik: '👥', ad: 'Personel nasıl işe alınır?', ozet: 'Önce ilan verirsin, sonra gelen adaylardan birini seçersin.',
    maddeler: [`Çalışan türleri: ${STAFF_TYPES.map((t) => t.ad).join(', ')}. Üst düzey türler daha yüksek kafe seviyesi ister.`,
      'Personel sayfasında bir tür için ilan ver ve maaş teklifini seç. Adaylar geldikçe listede görünür; birini işe al.',
      'Her çalışanın beceri, hız, motivasyon ve yorgunluk gibi değerleri var. Zam, prim, eğitim, terfi ve nakil verebilir ya da işten çıkarabilirsin.',
      'Maaş piyasanın altında kalırsa istifa riski artar. Çözülmeyen çalışan şikâyetleri motivasyonu düşürür.'] },
  { id: 'vardiya', ik: '🗓️', ad: 'Vardiya sistemi nasıl çalışır?', ozet: 'Her çalışana vardiya ve izin günü verirsin.',
    maddeler: ['Vardiyalar: Sabah, Öğle, Akşam ve Tam gün. Haftalık bir izin günü de seçilir.',
      'Barista ya da kasiyer olmayan saatlerde müşteri kaybedersin. Vardiya sayfasındaki "Otomatik planla" boşlukları kendiliğinden doldurur.',
      'Gerekirse mesai verebilirsin; çalışanın yorgunluk değerini personel kartından izle.'] },
  { id: 'menu', ik: '📋', ad: 'Ürün ve menü yönetimi', ozet: 'Hangi ürünü, hangi fiyata satacağına sen karar verirsin.',
    maddeler: [`Oyunda ${PRODUCTS.length} ürün var: ${kahve} kahve çeşidi ve ${yiyecek} yiyecek. Bazıları daha yüksek kafe seviyesinde açılır.`,
      'Dükkân → Menü ve fiyat: bir ürünü aç/kapat, fiyatı artır ya da azalt.',
      'Fiyat danışmanı kârı artıracak fiyatları önerir ("öneriyi uygula"). Fiyat çok yüksekse talep düşer, çok düşükse kâr erir.',
      'Sezon ve menü sayfasında (14. günden sonra) mevsimine uygun ürünleri açarsın.'], git: ['subeler', 'Dükkânlar'] },
  { id: 'stok', ik: '📦', ad: 'Stok ve tedarik sistemi', ozet: 'Ürünler malzeme tüketir; malzeme biterse ürün satılamaz.',
    maddeler: [`${INGREDIENTS.length} malzeme var (kahve çekirdeği, süt, bardak, un vb.). Her ürün kendi tarifine göre malzeme harcar.`,
      'Depo → Stok: elle sipariş ver ya da "Otomatik sipariş"i aç; stok asgari seviyenin altına inince kendiliğinden sipariş verilir.',
      'Tedarikçiler sayfasında tedarikçilerin fiyat, teslim süresi, güvenilirlik ve kalite değerleri farklıdır.',
      'Bozulan ya da çöpe giden ürün "Fire" olarak gidere yazılır. Çok stok tutmak da maliyet yaratır.',
      'Zincirlerde Merkezi depo ve Merkezi mutfak yatırımları (3 şube ve kafe seviyesi 4 gerekir) toplu alım indirimi sağlar ama günlük işletme gideri getirir.'], git: ['stok', 'Stok'] },
  { id: 'finans', ik: '💰', ad: 'Gelir ve giderler', ozet: 'Kâr = gelir − gider. Kasayı her gün izle.',
    maddeler: ['Gelir kalemleri: kahve, yiyecek, ek satış, kampanyalı satış, paket servis, toplu sipariş, etkinlik, franchise.',
      'Gider kalemleri: satılan malın maliyeti, fire, maaş, prim, eğitim, işe alım, kira, elektrik, su, internet, vergi, bakım, sigorta, reklam, online komisyon.',
      'Kasa → Gelir-gider: kasan ve son 30 günün kâr/zararı. Raporlar dönem özetleri verir. Ekonomi: paranın nereye gittiği, fiyat–kâr eğrisi ve ürün başına kârlılık.',
      'Nakit yetmezse Bankalar sayfasından kredi alabilir ve geri ödeyebilirsin. Borcun varsa Merkez\'de kasa kartında görünür.',
      `Kasa 20 gün üst üste −${para(50000)} ₺ altında kalırsa iflas edersin.`], git: ['finans', 'Gelir-gider'] },
  { id: 'memnuniyet', ik: '😊', ad: 'Müşteri memnuniyeti', ozet: 'Memnun müşteri tekrar gelir, marka büyür.',
    maddeler: ['Merkez\'de Memnuniyet göstergesi ve dükkân kartlarındaki ☺ puanı durumu özetler (70 üstü iyi, 50 altı sorunlu).',
      'Müşteriler sayfası memnuniyetin nelere bağlı olduğunu (bekleme süresi, ürün kalitesi, fiyat algısı, hijyen, görünüm), bugünkü müşterini, yorumları ve süren kampanyaları gösterir.',
      'Hijyen düşükse temizlik görevlisi ve temizlik malzemesi gerekir. Sipariş kuyruğu uzarsa kapasiteyi artır ya da personel ekle.',
      'Yorumlar (7. günden sonra): olumsuz yoruma yanıt vermek itibarı toparlar.',
      'Semt ve ilçe bilgisi hangi müşteri gruplarının (öğrenci, çalışan, turist, aile, emekli) çevrende yoğun olduğunu söyler.'], git: ['musteri', 'Müşteriler'] },
  { id: 'pazarlama', ik: '📣', ad: 'Reklam ve pazarlama', ozet: 'Tanıtım müşteri sayını ve markanı artırır, ama maliyeti vardır.',
    maddeler: ['Sosyal medya: paylaşım yaparak takipçi ve marka puanı kazanırsın.',
      'Reklam ve Kampanyalar: Sabah paketi, Mutlu saat, Öğrenci indirimi, Sadakat kartı (kafe seviyesi 2).',
      'Teslimat: online platformlara katıl; paket sipariş gelir ama platform komisyonu gider yazılır.',
      'Kafe seviyesi 2\'den sonra Kurye, Sadakat uygulaması ve Basın açılır; iki şubede Anket ve A/B testleri de.'], git: ['sosyal', 'Tanıtım'] },
  { id: 'gelisim', ik: '🛠️', ad: 'İşletme geliştirme', ozet: 'Ekipman, itibar ve hedeflerle kafeni güçlendirirsin.',
    maddeler: ['Ekipman (Dükkânlar → Ekipman): espresso makinesi ve değirmen gibi yatırımlar kaliteyi ve kapasiteyi artırır.',
      'Gelişim → Hedefler: görevler nakit ödül verir, başarımlar kilometre taşıdır. İtibar sayfası marka puanını gösterir.',
      'Atölye (kafe seviyesi 2 ya da 10. gün): çekirdek karışımı, kendi tariflerini yazma, barista ustalığı ve kahve fuarı.',
      'İlk 90 gün Merkez\'de "İlk adımlar yol haritası" görünür; adımların çoğu nakit ödül verir.'], git: ['hedefler', 'Gelişim'] },
  { id: 'sube', ik: '🗺️', ad: 'Yeni şube açma', ozet: 'Büyümek için haritadan yeni bir yer seçersin.',
    maddeler: ['Türkiye → ilçe seç → ilanlardan birini planla → mekân, konsept ve dekoru seç → "Kirala ve kur".',
      `Kafe seviyesi şube sayına ve marka puanına bağlıdır. Örneğin ${sv(5)}; ${sv(6)}.`,
      'Başka bir ilde dükkân için önce o ilin pazarını bedelini ödeyerek açarsın.',
      'Kafe seviyesi 4\'ten sonra Franchise ile başkalarına bayilik verebilirsin.'], git: ['harita', 'Haritayı aç'] },
  { id: 'harita', ik: '🇹🇷', ad: 'Türkiye haritası', ozet: `${CITIES.length} il, İstanbul'da 39 ilçe.`,
    maddeler: [`Haritada ${CITIES.length} il var. Bir ile dokun, ilçeleri ve ilanlarını gör.`,
      'İl durumları: Açık (dükkân kurabilirsin), Satılık (pazarını bedel karşılığı açarsın), Kilitli (kafe seviyesi ya da komşu il şartı var).',
      'Haritanın üstündeki göstergelerle (Erişim, Bölge, Kafe talebi, Kira, Rekabet, Turizm, Öğrenci, Gelir) ilçeleri farklı ölçütlere göre renklendirirsin.',
      'İller sayfası (2 şubeden sonra) illerdeki durumunu özetler.'], git: ['harita', 'Haritayı aç'] },
  { id: 'rakip', ik: '🏢', ad: 'Rakip işletmeler', ozet: 'Rakip zincirler büyür ve senin şehirlerine girer.',
    maddeler: ['Rakip zincirler sayfası (40. günden sonra açılır) rakiplerini gösterir. Rakipler şubelerinin olduğu şehirlere girer. Gizli müşteri göndererek güçlerini öğrenebilirsin.',
      'Agresif rakipler baristanı kapmaya çalışabilir. Zorluk seviyesi rakiplerin hızını değiştirir.',
      'Gelişim → Liderlik: son 30 günlük ciroya göre zincirini diğer zincirlerle sıralar.'], git: ['siralama', 'Liderlik'] },
  { id: 'zaman', ik: '⏳', ad: 'Oyun içi zaman ve olaylar', ozet: 'Oyun kendiliğinden akar; olaylarda durur.',
    maddeler: ['Bir oyun günü varsayılan olarak 3 dakika sürer. Ayarlar\'dan Hızlı (1,5 dk), Normal (3 dk) ya da Yavaş (5 dk) seçebilirsin.',
      'Önemli bir olay çıkınca zaman durur; seçeneklerden birini seçince devam eder.',
      'Semt takvimi bayram, derbi ve festival gibi özel günleri gösterir; o günlere hazırlan. Mevsim, sezon ürünlerinin satışını etkiler.',
      'Oyun her 15 saniyede ve çıkışta otomatik kaydedilir (bu cihazda).'], git: ['ayar', 'Ayarlar'] },
];
/** Oyunda olmayan ya da bilerek bulunmayan şeyler (mevcut özelliklerle karışmasın diye ayrı gösterilir). */
export const YOK_LISTESI: string[] = [
  'Üç boyutlu dış mekân ya da animasyonlu dükkân sahnesi yok; dükkânlar dışarıdan, kartlar ve sayılarla yönetilir.',
  'Çok oyunculu mod yok; rakipler oyunun kendi zincirleridir.',
  'Bulut kaydı yok; ilerleme yalnızca bu cihazda saklanır.',
  'Uygulama içi satın alma yok.',
];
