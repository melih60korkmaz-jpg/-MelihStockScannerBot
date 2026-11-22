/**
 * Rehber içeriği: oyunun nasıl oynandığı, her ekranın ne işe yaradığı ve takılınca ne yapılacağı.
 * Sayılar oyun kodundaki gerçek değerlerdir (indirim oranları, kapasiteler, süreler). Değişirse burası da güncellenmeli.
 */
export type Block =
  | { h: string }
  | { p: string }
  | { ul: string[] }
  | { tip: string }
  | { warn: string }
  | { qa: [string, string][] };

export interface Topic { id: string; ico: string; title: string; blocks: Block[] }

export const TAB_TOPIC: Record<string, string> = { sirket: 'sirket', harita: 'harita', projeler: 'projeler', operasyon: 'ekip', ihale: 'ihale', holding: 'holding', finans: 'finans', piyasa: 'piyasa' };

export const GUIDE: Topic[] = [
  {
    id: 'basla', ico: '🎮', title: 'Oyuna başlarken', blocks: [
      { p: 'Bir inşaat şirketi kuruyorsun. Amaç: arsa alıp bina yapmak, daireleri satmak, kâr etmek ve şirketi küçük bir müteahhitlikten Holding\'e büyütmek.' },
      { h: 'Oyunun döngüsü' },
      { ul: ['1) Harita: arsa bul ve satın al.', '2) Projeler: arsaya bina tasarla, inşaatı başlat.', '3) Operasyon: ekip, malzeme ve makineyi hazır tut; şantiyeyi izle.', '4) Satış: bina bitince daireleri sat (ya da ön satışla erkenden başla).', '5) Finans: kasayı, borcu ve kârı takip et. Para biterse iş biter.'] },
      { tip: 'En kolay başlangıç: Harita sekmesindeki "Hızlı başlangıç" kartı. Sana uygun bir arsa + proje önerir ve tek dokunuşla inşaata başlar. Nakdinin en fazla %45\'ini kullanır, geri kalanı güvende kalır.' },
      { h: 'Ekranın yapısı' },
      { ul: ['Üst çubuk: şirket adı, kasa, tarih, zaman hızı, ? (bu rehber), ayarlar, ana menü.', 'Alt çubuk: 7 sekme (Şirket, Harita, Projeler, Operasyon, İhale, Finans, Piyasa). Pasif sekmede nabız atan turuncu nokta, sıradaki görevin yeri.', 'Her sekmenin başında "burada ne var" satırı ve ? düğmesi bulunur; ? bu rehberin ilgili bölümünü açar.'] },
    ],
  },
  {
    id: 'zaman', ico: '⏱️', title: 'Zaman, kasa ve hız', blocks: [
      { p: 'Oyun gerçek zamanlıdır: zaman sen durdurmadıkça akar. Bir oyun günü 1× hızda yaklaşık 2 saniyedir; 2× yaklaşık 0,8, 4× yaklaşık 0,3 saniye. ⏭30 düğmesi 30 günü hızlıca atlar.' },
      { h: 'Zaman ne zaman durur?' },
      { ul: ['⏸ ile sen durdurunca.', 'Herhangi bir pencere (satış merkezi, sipariş, kredi, genel merkez…) açıkken: değerler kaymasın diye zaman bekler.', 'Önemli bir gelişmede oyun kendiliğinden durur ve "⏸ Oyun duraklatıldı" bildirimi çıkar: karar gerektiren olay, seviye atlama, proje teslimi, ihale kazanma, iş kazası, kredi taksidi kaçırma, haciz, ekonomik kriz haberi, kasanın eksiye düşmesi, iflas.', 'Uygulamadan çıkınca / ekran kilitlenince oyun otomatik durur ve kaydeder.'] },
      { h: 'Kasa' },
      { p: 'Kasa, elindeki nakittir. Maaşlar, kira, malzeme ve makine giderleri her gün/ay kasadan çıkar. Kasa eksiye düşerse oyun durur; varlıklar zorla satılabilir. Ay sonunda hem kasa hem net varlık eksideyse şirket iflas eder.' },
      { tip: 'Kasanın üstündeki yeşil/kırmızı sayaç son değişimi gösterir. Sağdaki "Nakit yeterlilik" kasanın mevcut giderlerle kaç ay yeteceğini gösterir; 3 ayın altı tehlikelidir.' },
    ],
  },
  {
    id: 'sirket', ico: '🏢', title: 'Şirket ekranı ve görevler', blocks: [
      { p: 'Şirket sekmesi günün özetidir. Üstte şehir manzarası: gün saatine göre gökyüzü değişir; dokununca Genel Merkez açılır.' },
      { h: 'Bölümler' },
      { ul: ['Bugün ne yapmalıyım: görevler ve uyarılar. "Şimdi yap" düğmesi sıradaki görevin sekmesine götürür.', 'Projelerim: devam eden şantiyeler, ilerleme yüzdesi, projeye atanmış ekip sayısı ve "Şantiyeyi aç".', 'Para durumum: net varlık, nakit yeterlilik, son ay gelir/gider/net.', 'Şirket seviyesi: sıradaki seviyeye ne kadar kaldığı.', 'Piyasa: faiz, enflasyon, güven özeti.'] },
      { h: 'Net varlık nedir?' },
      { p: 'Kasa + arsaların piyasa değeri + biten/yapılmakta olan binalar + makineler − borçlar. Şirketin "gerçek" değeri budur; kasa yüksek ama borç da yüksekse net varlık düşüktür.' },
    ],
  },
  {
    id: 'harita', ico: '🗺️', title: 'Harita ve arsa', blocks: [
      { p: 'Türkiye\'nin 81 ili haritada. Başta yalnızca başlangıç şehrin açık; yeni bir ilde şube açarak oradaki arsalara ve ihalelere erişirsin.' },
      { h: 'Nasıl arsa alınır?' },
      { ul: ['Haritada bir ile dokun, sonra ilçeyi seç.', 'Üstteki ölçütlerle (Satış fiyatı, Gelir, Rekabet, Gelişim) renkleri değiştir; turuncu/parlak olan, o ölçütte yüksek demektir.', 'Listeden bir arsaya dokun: alan, imar durumu, TAKS/KAKS, en çok kat, zemin, yollar, fiyat.', 'Fiyat pazarlığı yapabilirsin: teklifin liste fiyatının %80–100\'ü arasında olur. Daha önce reddedilen ya da daha düşük bir teklif tekrar kabul edilmez; yüksek teklif denemelisin.'] },
      { h: 'Etüt (bilgi satın alma)' },
      { ul: ['Zemin etüdü: 5 gün sürer; ücreti 20.000 ₺ + m² başına 35 ₺. Zeminin kaya mı kil mi, yeraltı suyu var mı ortaya çıkar. Yaptırmazsan inşaatta sürpriz ek maliyet çıkabilir (hafriyatta "zemin ortaya çıktı: ek maliyet" bildirimi).', 'İmar/pazar araştırması: 3 gün; ücreti 12.000 ₺ + m² başına 10 ₺. Bölgenin gelişimi hakkında ipucu verir.'] },
      { h: 'Terimler' },
      { ul: ['TAKS: arsanın ne kadarına bina oturabilir (taban oranı).', 'KAKS (emsal): toplam inşaat alanı çarpanı. Alan × KAKS = yapılabilecek toplam alan.', 'En çok kat: imarın izin verdiği üst sınır. Kat sayısı bu sınırı geçemez.', 'İmar türü: konut, ticaret, karma, sanayi vb. Hangi bina tipinin yapılabileceğini belirler.'] },
      { h: 'Arsayı satmak' },
      { ul: ['Hızlı sat: piyasa değerinin %92\'si, hemen nakit.', 'Satışa koy: kendi fiyatını (liste çarpanı) belirlersin; alıcı gelince satılır. Satıştan çekebilirsin.'] },
      { tip: 'İlk arsada: küçük/orta alan, "konut" imarı, sağlam zemin, yola cepheli olanlar hem ucuzdur hem sorunsuzdur.' },
    ],
  },
  {
    id: 'projeler', ico: '🏗️', title: 'Projeler ve inşaat aşamaları', blocks: [
      { p: 'Arsa alınca "Proje başlat" ile arsaya bir bina planlarsın. Proje; bina tipi, kat sayısı ve kalite seçimiyle bütçelenir.' },
      { h: 'Bina tipleri' },
      { ul: ['Konut: müstakil ev, apartman, site, villa, rezidans, lüks konut.', 'Ticari/endüstriyel: ofis binası, iş merkezi, fabrika, depo.', 'Her tipin birim maliyeti, tipik süresi ve satış çarpanı vardır. Küçük tipler hızlı ve ucuzdur; kule ve site gibi büyükler uzun sürer ve büyük sermaye ister.'] },
      { h: 'Kalite' },
      { p: 'Ekonomik, Standart, Premium, Lüks. Yüksek kalite maliyeti artırır; daha yüksek satış fiyatı, itibar ve düşük şikâyet getirir. Ucuz malzeme kısa vadede tasarruf, uzun vadede şikâyet ve garanti riskidir.' },
      { h: '17 inşaat aşaması' },
      { p: 'Proje kartındaki şeritte her parça bir aşamadır: proje planlama, mimari, statik, elektrik-mekanik proje, ruhsat, hafriyat, temel, betonarme/kat yükselme, duvar, elektrik+tesisat, yalıtım, sıva/cephe, pencere-kapı, iç dekorasyon, peyzaj, kontrol/teslim. Dolu parça tamamlandı; yanıp sönen sürüyor.' },
      { h: 'Kartta ne görürsün' },
      { ul: ['Bina resmi: inşaat ilerledikçe gri/sönük halden renkli hale açılır.', 'Proje bütçesi, beklenen gelir ve beklenen kâr.', 'Tahmini bitiş, gerçekleşen harcama, kalan bütçe.', 'Düğmeler: İnşaatı başlat, Şantiyeyi aç, Satış merkezi, Arsa dosyası.'] },
      { h: 'İnşaat neden durur?' },
      { ul: ['Malzeme yok: stok bitti ve sipariş gelmedi (Operasyon › Malzeme).', 'Nakit yok: aşamanın maliyetini ödeyecek kasa yok.', 'Kaza: iş kazası sonrası birkaç gün durur.', 'Hava: yağmurda dış işler yaklaşık yarı hızda, karda çok daha yavaş ilerler (durmaz).'] },
      { tip: 'Ön satış: betonarme aşamasından sonra daireleri inşaat sürerken satabilirsin; nakit girer ama teslim gecikirse ceza doğar.' },
    ],
  },
  {
    id: 'santiye', ico: '🚧', title: '3B şantiye', blocks: [
      { p: 'Projeler sekmesinden "Şantiyeyi aç" ya da Şirket ekranındaki proje kartından girersin. Bina, vinç, işçiler ve çevre inşaatın gerçek durumuna göre çizilir.' },
      { ul: ['‹ (sol üst): şirket ekranına döner.', 'Üstteki noktalar: inşaat aşamaları; dolu olan bitti, halkalı olan sürüyor.', 'Sağ üst: kasa, tarih ve oyun hızı. Zaman şantiyede de akar.', 'Sağdaki kamera düğmeleri: Kuş, Yan, Ön, Yakın, Üst bakış. Parmakla döndürüp iki parmakla yakınlaştırabilirsin.', 'Alt panel (▲ ile açılır): Genel durum, Aşamalar, Kaynak (malzeme ve ekip) ve Maliyet sekmeleri.', 'Taslak projede büyük "İnşaatı başlat" düğmesi vardır.'] },
      { h: 'Neleri görürsün' },
      { ul: ['Hava: yağmur ve kar şantiyeye yansır; akşam ve gece ışıklar açılır.', 'Malzeme eksikse işçiler bekler ve uyarı çıkar.', 'Pompa, vinç, kamyonlar o aşamanın ihtiyacına göre çalışır.'] },
      { tip: 'Telefon yavaşsa Ayarlar › Grafik kalitesi: Düşük seç ya da Otomatik bırak; oyun kendisi ayarlar.' },
    ],
  },
  {
    id: 'ekip', ico: '👷', title: 'Ekip ve "Kim nerede?"', blocks: [
      { p: 'Operasyon › Ekip. Üstteki "Kim nerede?" panosu kimin nerede çalıştığını gösterir: Ofis, Ortak havuz ve her aktif proje için ayrı bir sütun. Yana kaydırarak hepsini görürsün.' },
      { h: 'İki tür çalışan' },
      { ul: ['Saha: işçi, usta, kalıpçı, demirci, elektrikçi, tesisatçı, şantiye şefi. İnşaatta çalışırlar.', 'Ofis: mimar, mühendis, proje yöneticisi, muhasebeci, satış danışmanı, satın alma sorumlusu. Ofiste çalışırlar; tasarım, ruhsat, satış ve alım gibi işleri hızlandırırlar.'] },
      { h: 'Atama' },
      { ul: ['Saha çalışanında açılır listeden bir proje seçersen yalnızca orada çalışır.', '"Ortak havuz": aktif projeler arasında bölünür. Tek projen varsa hepsi oraya gider.', 'Ofis çalışanları projeye atanmaz.'] },
      { h: 'Verim ve moral' },
      { ul: ['Verim: deneyim ve morale bağlıdır. Deneyimli çalışan pahalı ama hızlı ve güvenlidir.', 'Moral düşerse verim düşer; kaza, nakit sıkıntısı ve gecikmeler moralı düşürür, başarı yükseltir.', 'Şantiye şefi ekibin verimini ve güvenliğini artırır.'] },
      { h: 'Kişilik özellikleri' },
      { p: 'Her çalışanın bir kişiliği vardır; kartında rozet olarak görünür, üzerine dokununca etkisi yazar. Kişilik küçük ama gerçek etkiler yaratır ve hikâye olaylarını tetikler.' },
      { ul: ['💪 Çalışkan: verim %6 yüksek. 😴 Tembel: verim %8 düşük, uyarılabilir.', '🦺 Dikkatli: kaza riskini azaltır. ⚠️ Dikkatsiz: kaza riskini artırır.', '🤝 Sadık: başka firmaya geçmez, rastgele ayrılmaz. 🫶 Takım oyuncusu: ekip moralini yükseltir (en çok +6).', '😤 Huysuz: ekipte kavga çıkarabilir. 🚀 Hırslı: zam ve terfi ister; verilmezse ayrılabilir.'] },
      { tip: 'Aynı ekipte çok sayıda tembel ya da dikkatsiz olması yavaşlatır ve kaza getirir; çalışkan ve takım oyuncuları değerlidir. Bir çalışanın özelliği değişmez.' },
      { h: 'İşe alma ve kapasite' },
      { ul: ['Ofis kapasitesi sınırlıdır: Küçük ofis 6, Ofis katı 20, Plaza katı 60, Şirket binası 150 kişi. Dolunca daha büyük merkeze taşınmak gerekir (Şirket › Genel Merkez).', 'Her çalışanın aylık maaşı vardır; maaşlar yıl başında zamlanabilir.', 'İşten çıkarma onay ister ve geri alınamaz.'] },
    ],
  },
  {
    id: 'malzeme', ico: '🧱', title: 'Malzeme ve tedarik', blocks: [
      { p: 'Operasyon › Malzeme. 17 malzeme: demir, hazır beton, çimento, tuğla, gazbeton, kum, çakıl, cam, alüminyum, seramik, parke, boya, yalıtım, kablo, boru, kapı-pencere, çatı. Her aşama kendi malzemesini tüketir.' },
      { ul: ['Tabloda stok, yolda olan sipariş, birim fiyat ve fiyat trendi (▲ pahalandı, ▼ ucuzladı) görünür.', '"Sipariş" ile miktar ve tedarikçi seçersin; toplam tutar yazarken canlı güncellenir. Malzeme gecikmeyle gelir ("yolda").', 'Sağdaki "Otomatik satın alma" açıksa aktif aşamanın malzemesi tercih edilen tedarikçiden otomatik sipariş edilir.'] },
      { h: 'Tedarikçi seçimi' },
      { p: 'Yerel toptancı, ucuz tedarik, A.Ş. ve direkt tedarik gibi seçenekler fiyat, teslim süresi ve güvenilirlik açısından farklıdır. Ucuz olan geç ya da eksik getirebilir.' },
      { tip: 'Stok tutmak fiyat artışına karşı korur ama nakit bağlar. Malzeme zam haberi geldiyse biraz önceden almak mantıklı olabilir.' },
    ],
  },
  {
    id: 'makine', ico: '🚜', title: 'Makineler', blocks: [
      { p: 'Operasyon › Makine. Kule vinç, mobil vinç, ekskavatör, kepçe, dozer, beton pompası, beton mikseri, forklift, kamyon, jeneratör, iskele, kompresör.' },
      { ul: ['Satın alırsan sende kalır: aylık bakım ve yakıt gideri var, zamanla değer kaybeder, arızalanabilir.', 'Satın almazsan ilgili aşamada makine günlük kiralanır: sermaye ayırmazsın ama birim maliyet yüksektir.', 'Kartta durum: Beklemede, Kullanımda ya da Arızalı. Arızalı makine tamir bitene kadar çalışmaz; kartı gri olur ve kırmızı "!" çıkar.', 'Sat düğmesi değerinin %90\'ını geri öder.'] },
      { tip: 'Yeni oyunda geçmişine göre küçük bir ekipman hediye gelir (örneğin Eski Kalfa için kamyon ve iskele).' },
    ],
  },
  {
    id: 'guvenlik', ico: '🦺', title: 'İş güvenliği ve politikalar', blocks: [
      { p: 'Operasyon › Politika. İş güvenliği seviyesi ve tedarikçi tercihini seçersin.' },
      { ul: ['Güvenlik harcaması kısa vadede maliyeti artırır, kaza olasılığını düşürür. Kaza olursa inşaat durur, tazminat ödersin, moral ve itibar düşer.', 'Tedarikçi tercihi otomatik alımda kullanılır.'] },
    ],
  },
  {
    id: 'satis', ico: '🏷️', title: 'Satış merkezi', blocks: [
      { p: 'Projeler › Satış merkezi. Satış artık kendiliğinden kapanmaz: alıcılar ve kiracılar teklifle gelir, kararı sen verirsin.' },
      { h: 'Bina sekmesi' },
      { ul: ['Binanın kesiti: her pencere bir daire. Boş daireler ışıklı, satılanlar yeşil, kiradakiler mavi, rezerveler gri. Turuncu balon = o dairede teklif var.', 'Bir daireye dokun: özel fiyat ver (%80–130), "Satılık / Kiralık / Rezerve" seç. Rezerve daireye alıcı gelmez; en iyi daireyi sonraya saklayabilirsin.'] },
      { h: 'Teklifler' },
      { ul: ['Her teklifte alıcının adı, profili, bütçe ipucu (geniş / pazarlığa açık / sıkı), teklif oranı ve kalan süre var. Süre dolunca alıcı gider.', 'Kabul et, reddet ya da karşı teklif ver. Karşı teklif alıcının gizli tavanının altındaysa kabul edilir; üstündeyse alıcı vazgeçer.', 'Ödeme türü teklifle gelir: peşin %4 iskonto, taksit +%6 vade farkı (%25 peşin, 12 ay), ön satış %10 iskonto (%40 peşin).'] },
      { h: 'İlan sekmesi' },
      { ul: ['İlan hızı beş kademe: çok yavaş, yavaş, normal, hızlı, çok hızlı. Hızlandıkça daha çok alıcı gelir ama teklifler düşer ve hızlı kademelerde aylık reklam gideri çıkar. Yavaş kademeler daha az alıcı, daha yüksek teklif getirir.', 'Her dairenin yanındaki anahtar ilana koyar ya da kaldırır; ilanda olmayan daireye alıcı gelmez. ⭐ düğmesi dairenin ilanını 30 gün öne çıkarır (alıcı akışı 2 kat, bedel adil değerin binde biri).'] },
      { h: 'Kiralama' },
      { p: 'Daireyi "Kiralık" yaparsan kiracı teklifleri gelir. Kabul edince her ay kira geliri yatar (yıllık getiri yaklaşık %5,4). Kiracı ara sıra ayrılır; kirayı istediğin an sonlandırabilirsin. Kiradaki daire de satılabilir hâle gelir ama önce kira bitmelidir.' },
      { h: 'Politika' },
      { ul: ['Genel fiyat çubuğu (%80–125), emlakçı (+%30 alıcı akışı, %2,5 komisyon), taksit ve ön satış anahtarları.', 'Satış danışmanına yetki: belirli bir orandan yüksek satış tekliflerini danışmanın kendisi kabul eder. Kapalıysa tüm teklifler elle.', '"Kalanı toplu sat": satılmamış tüm daireleri adil değerin %92\'sine yatırımcıya satar; onay ister.'] },
      { h: 'Grafik' },
      { p: 'Birikimli satış geliri, aylık işlem sayısı, daire durumu dağılımı, ortalama fiyat ve kira getirisi.' },
      { h: 'Teslim sonrası' },
      { p: 'Müşteri memnuniyeti kaliteye, teslim süresine ve fiyat algısına bağlıdır. Şikâyetler ve 2 yıllık garanti talepleri çıkabilir; düşük kalite maliyetli olur.' },
    ],
  },
  {
    id: 'ihale', ico: '📜', title: 'İhaleler', blocks: [
      { p: 'Şubenin bulunduğu illerde her ay yeni ihaleler açılır (okul, hastane, belediye binası vb.). Açık ihaleye dokunup teklif fiyatını seçersin.' },
      { ul: ['Seviye 5\'ten itibaren altyapı ihaleleri de açılır (yol, köprü, tünel, baraj); onlar Holding › Altyapı\'da yürür.', 'Teklif aralığı yaklaşık maliyetin altından üstüne uzanır; sürüklerken beklenen kâr görünür.', 'Teminat gerekir; oranı ihale kartında yazar. ', 'Sadece en düşük teklif kazanmaz: itibar, yeterlilik ve kapasite de puanlanır. Çok düşük teklif kazandırır ama zarar ettirir.', 'Kazanırsan "Sözleşmeli işler"e düşer: teslim süresi, gecikme cezası ve aşama aşama ödeme (hakediş) vardır.', 'Hakediş gecikmeli gelir; nakit akışını planla.', 'İhale kazanınca ve teslimde zaman duraklar, özel sahne gösterilir.'] },
      { tip: 'İlk ihale için görev ödülü vardır. Şubesi olmayan ilde ihale görünmez: Harita\'dan şube aç.' },
    ],
  },
  {
    id: 'holding', ico: '🏛️', title: 'Holding: otel, AVM, enerji, altyapı', blocks: [
      { p: 'Seviye 4\'ten itibaren (Bölge Firması) alt barda "Holding" sekmesi açılır. Burada yalnızca inşaat satmakla kalmaz, gelir getiren iş kolları kurar ve şirketini bir holdinge dönüştürürsün. Alt sekmeler: Özet, Otel & AVM, Enerji, Altyapı, Borsa & Satın alma.' },
      { h: 'Özet' },
      { ul: ['Her bölümün son 3 aylık geliri, gideri ve kârı defterden hesaplanır: İnşaat ve satış, Gayrimenkul işletmeleri, Enerji, Altyapı işleri, Bağlı şirketler ve Merkez (ofis, maaş, faiz, vergi).', 'Seviye 6\'da her bölüm için strateji seçilir: Büyüme (gelir +%6, gider +%10), Dengeli, Temkinli (gelir −%4, gider −%10).', 'Seviye 6\'da bölümlere genel müdür atanabilir: gelir +%5, gider −%3, maaşı aylık yaklaşık 150.000 ₺ (enflasyonla artar).'] },
      { h: 'Otel ve AVM işletmeciliği (seviye 4)' },
      { ul: ['Projeler\'de Otel ya da AVM tipinde proje başlat. Otel yaklaşık 32.000 ₺/m², AVM 26.000 ₺/m²; yapımı 30–48 ay sürer, büyük arsa ister.', 'Bina bitince daireleri satmak yerine "İşletmeye al": birimler satışa çıkmaz, bina bir iş koluna dönüşür.', 'Aylık gelir; otelde doluluğa ve mevsime (sahilde yaz çok, kış az), AVM\'de kiracı doluluğuna bağlıdır. Ekonomik rejim, piyasa güveni ve itibar da etkiler. Giderler büyük ölçüde sabittir; gelir düşünce kâr hızla küçülür.', 'Yıllık net getiri yaklaşık %12–14\'tür. İşletmeyi satarsan değerinin %92\'sini alırsın; değer yılda yaklaşık %1,2 azalır (en az %70).'] },
      { h: 'Enerji yatırımları (seviye 5)' },
      { ul: ['Güneş santrali: 1, 3 ya da 8 MW (yaklaşık 9, 25, 62 milyon ₺; maliyet endeksiyle artar). Yaklaşık 2 ayda devreye girer. Yazın çok, kışın az üretir; Antalya, Adana, Konya güneşte, İzmir, İstanbul, Kocaeli rüzgârda öndedir.', 'Rüzgâr santrali: 2, 6 ya da 15 MW (yaklaşık 22, 60, 140 milyon ₺). Yaklaşık 4 ayda devreye girer. Kışın güçlüdür. Arıza ihtimali aylık yaklaşık %5 (güneşte %2); arızalı ay üretim olmaz ve onarım masrafı çıkar.', 'Yıllık net getiri yaklaşık %14–15\'tir; santral yalnızca bulunduğun açık illerde kurulur.'] },
      { h: 'Altyapı işleri (seviye 5)' },
      { ul: ['İhale sekmesinde yol, köprü, tünel, baraj ve kanalizasyon/su şebekesi ihaleleri açılır. Şartları sağlamak gerekir (itibar, kredi notu, tamamlanan proje, çalışan, makine).', 'Kazanınca iş Holding › Altyapı\'da başlar. İlerleme saha ekibine ve makine parkına bağlıdır; kapasite yetersizse iş ilerlemez, nakit yoksa durur. Kapasite aktif işler arasında bölünür.', 'Her %10 ilerleme bir hakediş doğurur (45 gün sonra tahsil). Bitişte kalan hakediş ve teminat gelir; gecikirse günde %0,1 ceza (en çok %10).'] },
      { tip: 'Altyapı işleri büyük sermaye ve çok makine ister. Önce makine parkını büyüt, ekibi güçlendir, sonra yola çık.' },
    ],
  },
  {
    id: 'yonetim', ico: '🧭', title: 'Yönetim: odak, emir, kurul', blocks: [
      { h: 'Yıllık odak' },
      { ul: ['Şirket sekmesindeki Yönetim kartından yılda bir odak seçersin: konut satışı, lüks segment, kamu ve altyapı ya da holding. Her biri küçük ama gerçek bir bonus verir.'] },
      { h: 'Emirler ve proje müdürü' },
      { ul: ['İnşaatı süren projede "🎛️ Yönet": hızlandır, kaliteye odaklan, maliyeti kıs ya da güvenliğe öncelik ver. Emir 45 gün sürer; her emrin bedeli açıkça yazılıdır.', 'Şef, mühendis, usta ya da proje yöneticisini proje müdürü yap: deneyimi ve kişiliği hızı, kaliteyi ve kaza riskini etkiler. Bir kişi aynı anda tek projeyi yönetir.'] },
      { h: 'Yönetim kurulu ve karar günlüğü' },
      { ul: ['Seviye 2\'den sonra her çeyrek (Ocak, Nisan, Temmuz, Ekim) kurul toplanır ve senden karar bekler.', 'Verdiğin tüm kararlar ve anlık etkileri Karar günlüğünde birikir.'] },
      { h: 'Ofis ve şantiye' },
      { ul: ['Genel Merkez ekranından ofis eşyaları alabilirsin (ihale puanı, moral, satış hızı).', 'Şantiyede tabela, kasklar ve kamyonlar marka renginde; sesler inşaat aşamasına göre değişir.'] },
    ],
  },
  {
    id: 'firsat', ico: '📢', title: 'Fırsat ilanları', blocks: [
      { p: 'Şirket › Yönetim › Fırsat ilanları ya da Projeler sekmesinin üstündeki düğme. Seviye 2\'den sonra her ay yeni ilanlar düşer; her ilan yaklaşık 75 gün açık kalır.' },
      { h: 'İlan türleri' },
      { ul: ['🏢 Bitmiş bina: rakip nakit sıkışınca (ya da iflas edince) indirimle satar. Devralırsan Satış merkezinde satar ya da kiraya verirsin.', '🏗️ Yarım kalmış inşaat (seviye 3): rakibin bıraktığı aşamadan devralırsın. Yapılmış işin kalitesi binanın kalitesine yansır; kalan işi sen bitirirsin.', '🏚️ Eski bina arsası: ucuz arsa, ama yıkım masrafı ve 21 günlük yıkım süresi vardır; yıkım bitmeden proje açılamaz.', '🤝 Kat karşılığı: arsa sahibi arsayı satmaz, yerine yeni binanın belli bir payını (%30–50) ister. Arsa bedeli ödemezsin, sadece yıkım masrafı sende. Bina bitince o paydaki daireler sahibine ait kalır ve gelire yazılmaz.'] },
      { h: 'İpuçları' },
      { ul: ['Tahmini kâr kabaca hesaplanır; yarım inşaatta ve kat karşılığında inşaat maliyeti ve zemin riski sende kalır.', 'Yarım inşaatı devralmadan önce ekibin ve makine parkın yeterli mi diye bak.', 'Eski bina arsası 180 gün satılamaz (hemen al-sat yapılamaz); kat karşılığı arsa hiç satılamaz, çünkü mülkiyet arsa sahibindedir.'] },
    ],
  },
  {
    id: 'rakipler', ico: '🤝', title: 'Rakiplerle ilişkiler', blocks: [
      { p: 'Piyasa › Sektör sıralaması\'nda bir rakibe dokun: sahibi, hikâyesi, gücü ve sana karşı ilişkisi (Müttefik, Dost, Tarafsız, Soğuk, Düşman) görünür.' },
      { h: 'İş birliği öner' },
      { ul: ['🤝 Ortak girişim: sermaye ve işi paylaşırsınız, birkaç ay sonra hesap kapanır (kâr ya da zarar).', '📑 Ortak ihale: iki firmanın referansıyla büyük ihaleye girersiniz.', '🚜 Makine kirala ve 📍 Arsa sat: rakibe makine kiralar ya da boş bir arsanı primle satmayı denersin (arsa en az 120 gündür elinde olmalı; pazarlıkta fazla zorlarsan vazgeçer).', 'Aynı firmayla 90 günde bir görüşebilirsin; ilişkisi düşman seviyesindeyse görüşmez.'] },
      { h: 'Rakipler de gelir' },
      { ul: ['Rakipler zaman zaman sana teklif getirir: ortak proje, arsana talip olma, makine kiralama, ihale anlaşması.', 'İhale anlaşması kâğıt üstünde kârlıdır ama rekabet kurumu soruşturması riski taşır; yakalanırsan ceza ve itibar kaybı olur.', 'Dost rakipler ihalede fiyatı yüksek tutar (senin lehine), düşman rakipler fiyat kırar. Düşmanlar adını kötüleyebilir.'] },
    ],
  },
  {
    id: 'borsa', ico: '📈', title: 'Borsa ve şirket satın alma', blocks: [
      { h: 'Halka arz (seviye 7)' },
      { ul: ['Şartlar: şirket seviyesi 7, net varlık en az 1 milyar ₺, itibar en az 55. Şirketin %10–25\'ini halka açarsın; fiyat adil değerin %92\'si, kaynağın %97\'si sana kalır.', 'Sahipliğin hiçbir zaman %60\'ın altına inemez (ortaklık ve yatırımcı satışları dahil).', 'Halka açık olunca her ay hisse fiyatı adil değere (net varlık × çarpan) yaklaşır; çarpan piyasa güveni, itibar ve büyümeyle artar. Fiyat halka arz fiyatının %30 üstündeyken itibar artar, %30 altındayken azalır.'] },
      { h: 'Hisse işlemleri' },
      { ul: ['İkincil satış (%3–15): nakit getirir, fiyatı biraz düşürür.', 'Geri alım (%1–10): nakit harcar, sahipliğini ve fiyatı artırır.'] },
      { h: 'Rakip şirket satın alma (seviye 6)' },
      { ul: ['Rakiplerin listesinde fiyat görünür; iflas etmiş olanlar çok ucuzdur. Satın alınan şirket "bağlı şirket" olur: aylık gelir getirir (yıllık yaklaşık %14, rakibin gücüne bağlı), rakip azalır, itibar artar.', 'Aynı şirket iki kez satın alınamaz.'] },
    ],
  },
  {
    id: 'finans', ico: '💰', title: 'Finans', blocks: [
      { p: 'Finans sekmesi şirketin parasıdır. Altı alt sekme:' },
      { ul: ['Gelir-Gider: üstte Kasa, Net varlık, Son ay net, Toplam borç kartları (önceki aya göre ▲/▼ değişimle); altında sağlık göstergeleri (borç/limit, kârlılık, nakit yeterlilik, özkaynak), grafikler ve aylık gelir tablosu.', 'Nakit akışı: ay sonu kasa ve aylık net nakit değişimi.', 'Gider dağılımı: son 12 ayın giderleri halka grafikte ve kalem kalem.', 'Bilanço: neye sahipsin, neyi borçlusun.', 'Krediler ve Ortaklar: bir sonraki bölümde.'] },
      { h: 'Vergi' },
      { p: 'Her çeyrek kârın %25\'i vergi olarak ödenir; zarar bir sonraki çeyreğe devreder ve vergiden düşer. Sermaye, kredi ve yatırım hareketleri gelir tablosuna girmez.' },
      { h: 'Göstergeler ne demek?' },
      { ul: ['Borç/limit: kredi limitinin ne kadarını kullandın. %50 üstü dikkat, %80 üstü riskli.', 'Kârlılık: son 6 ayda gelirin ne kadarı kâr. Eksi ise zarar ediyorsun.', 'Nakit yeterlilik: kasan mevcut giderlere kaç ay yeter. 6 ay sağlıklı, 3 ay altı riskli.'] },
      { h: 'Kasa eksiye düşerse' },
      { p: 'Oyun durur ve varlıklar zorla satılır. Ay sonunda kasa ve net varlık ikisi birden eksideyse iflas edersin; oyun biter ve ana menüye dönersin.' },
    ],
  },
  {
    id: 'banka', ico: '🏦', title: 'Krediler ve ortaklar', blocks: [
      { p: 'Finans › Krediler. 4 banka: Devlet Bankası, Özel Banka, Katılım Bankası, Hızlı Finansman. Her biri faiz, vade ve şartlarda farklıdır.' },
      { ul: ['Tutar ve vadeyi seçince taksit, faiz ve toplam geri ödeme anında görünür.', 'Faiz = politika faizi + banka marjı + kredi notuna bağlı fark. Yüksek kredi notu daha ucuz kredi demektir.', 'Taksit gününde kasa yetmezse: kredi notu düşer; üst üste 3 kaçırmada haciz gelir ve varlıkların satılır.', 'Erken geri ödeme yapabilirsin; faizden kazanırsın.', 'Kısa vadeli finansman pahalıdır: yalnızca nakit köprüsü için kullan.'] },
      { h: 'Ortaklar ve yatırımcılar' },
      { p: 'Finans › Ortaklar. Yatırımcı bir projeye para koyar, karşılığında kâr payı alır (pay oranını kaydırıcıyla seçersin). Para proje sonunda iade edilir. Kâr payını ve ödeme zamanını düşünerek kullan.' },
      { tip: 'Kredi, makine ve proje için ayrı ürünler sunar. İlk kredi görevi küçük bir tutarla alınıp hemen geri ödenebilir.' },
    ],
  },
  {
    id: 'piyasa', ico: '📈', title: 'Piyasa ve rakipler', blocks: [
      { p: 'Piyasa oyuncudan bağımsız evrilir. Üstteki kartta ekonomik rejim yazar: Dengeli, Genişleme, Aşırı ısınma, Daralma, Kriz, Toparlanma.' },
      { ul: ['Politika faizi: yükselirse kredi pahalanır ve konut talebi düşer.', 'Enflasyon: inşaat maliyetlerini ve maaşları artırır.', 'Piyasa güveni: yüksekse konut talebi artar.', 'Malzeme endeksi: malzeme fiyatlarının genel seviyesi. Kartlardaki ▲/▼ rozetleri önceki aya göre değişimi gösterir; kırmızı maliyet artışı, yeşil iyi gelişmedir.', 'Konut piyasası grafiği: açık illerde fiyat gidişi (başlangıç = 100).'] },
      { h: 'Kriz' },
      { p: 'Kriz nadirdir ve ipucuyla gelir: faiz yükselir, güven düşer, haberler kötüleşir. Kriz haberi gelince oyun durur. Hazırlıklı olmak için nakdini yüksek tut, borcunu azalt.' },
      { h: 'Rakipler' },
      { p: 'Rakip şirketler aynı kurallarla arsa alır, proje yapar, ihaleye girer. Bazıları büyür, bazıları iflas eder (arsaları piyasaya düşer; fırsat olabilir). Rakip yoğun bölgede satış yavaşlar.' },
    ],
  },
  {
    id: 'gelisim', ico: '🏆', title: 'Seviye, merkez ve başarımlar', blocks: [
      { h: 'Şirket seviyeleri (8)' },
      { ul: ['1 Şahıs Müteahhit, 2 Küçük Firma, 3 Yerel Firma, 4 Bölge Firması, 5 Şehir Markası, 6 Çok Şehirli Firma, 7 Ulusal Firma, 8 Holding.', 'Seviye için tamamlanan proje, net varlık, itibar ve açık il sayısı eşikleri birlikte aranır. İlerlemeyi Şirket ekranındaki seviye kartından izle.', 'Seviye atlayınca kredi notu +15 ve itibar +2 kazanırsın; yeni özellikler açılır.'] },
      { h: 'Genel merkez' },
      { ul: ['Şirket ekranında şehir resmine dokun. Kesit görünümü ofisini, Manzara görünümü yapay zekâ resmini gösterir.', 'Merkez seviyeleri: Küçük Ofis (6 kişi), Ofis Katı (20 kişi, seviye 2 + 300.000 ₺), Plaza Katı (60 kişi, seviye 4 + 1,5 M₺), Şirket Binası (150 kişi, seviye 6 + 6 M₺).', 'Daha büyük merkez yeni odalar açar (yönetici odası, toplantı salonu, başarı rafı, lüks kat). Çalışan sayısı, projeler ve başarımlar merkezde görünür.'] },
      { h: 'Görevler ve başarımlar' },
      { ul: ['14 görev sana sıradaki adımı söyler; ödülü nakit, itibar ya da kredi notudur.', 'Başarımlar (rozetler) istatistiklerinden otomatik açılır; önemli olanlarda kart çıkar. Şirket ekranındaki "Başarımlar" düğmesiyle hepsini ve açılma tarihlerini görürsün.', 'Her başarım yalnızca bir kez açılır.'] },
    ],
  },
  {
    id: 'olaylar', ico: '📰', title: 'Olaylar ve haberler', blocks: [
      { p: 'Hikâye olayları: bazı kararlar sonradan devam eder. Örneğin bir çalışana avans verirsin, üç ay sonra borcunu öder; bir arsa alırsın, tapuda sorun çıkar; bir gazeteciyle konuşursun, haber yayınlanır. Çalışanların kişilikleri de kendi olaylarını getirir (kavga, zam talebi, mangal gecesi, tehlike uyarısı…). Devam olayı çıkmadan o kişi şirketten ayrılırsa olay atlanır.' },
      { p: 'Oyun sırasında olaylar çıkar: malzeme zammı, tedarikçi gecikmesi, makine arızası, iş kazası, kötü hava, müşteri şikâyeti, rakip hamleleri ve daha fazlası.' },
      { ul: ['Karar gerektiren olaylarda pencere açılır ve oyun durur. Her seçeneğin maliyeti, riski ve süresi yazar.', 'Süre dolarsa otomatik bir seçim uygulanır.', 'Bildirimler köşede kısa süre görünür; önemli olanlar kart olarak çıkar (başarım, seviye atlama, büyük kâr, ani net varlık düşüşü).', 'Net varlık bir ayda %15\'ten fazla düşerse kırmızı uyarı çıkar ve Finans\'a yönlendirir.'] },
    ],
  },
  {
    id: 'ayarlar', ico: '⚙️', title: 'Ayarlar ve kayıt', blocks: [
      { h: 'Ayarlar' },
      { ul: ['Müzik ve ses efektleri: aç/kapat ve ses seviyesi.', 'Kaldığım yerden devam: açılışta son kayda otomatik girer.', 'Titreşim: yalnızca destekleyen cihazlarda (uygulama sürümünde iPhone dahil).', 'Animasyonlar: Tam veya Azaltılmış. Animasyon yoğunluğu: Canlı veya Sakin (konfeti ve büyük sahneler kapanır).', 'Grafik kalitesi: Otomatik, Düşük, Orta, Yüksek. Otomatik, yavaşlayınca kendisi düşürür.', 'Oyunu tanıt: açılış anlatıcısını yeniden başlatır.'] },
      { h: 'Kayıt' },
      { ul: ['Oyun kendiliğinden kaydeder: bir işlemden birkaç saniye sonra, her ay ve uygulamadan çıkarken.', 'Ana menü (☰) önce kaydeder. Kayıtlar ekranında 3 otomatik ve 5 manuel yuva bulunur; yükleyebilir ya da silebilirsin.', 'Kayıtlar bu cihazda saklanır; uygulamayı silersen gider.'] },
    ],
  },
  {
    id: 'takildim', ico: '🆘', title: 'Takıldım! Sık sorulanlar', blocks: [
      { qa: [
        ['İnşaat durdu, neden?', 'Şantiye ekranındaki uyarı bandı ve alt panel nedenini gösterir: malzeme yok (Operasyon › Malzeme\'den sipariş ver ya da otomatik alımı aç), nakit yok (kasayı doldur: kredi, ön satış, varlık sat) veya kaza (birkaç gün bekler).'],
        ['İnşaatı başlat düğmesi çalışmıyor.', 'Düğme onay penceresi açar; "Evet" demelisin. Nakit yetmiyorsa uyarı çıkar. Taslak projenin tasarım bedeli ve ilk aşama için kasada para olmalı.'],
        ['Oyun kendiliğinden durdu.', 'Önemli bir gelişme oldu (olay kararı, seviye, teslim, kaza, kriz, kasa eksi). "⏸" bildirimini okuyup hız düğmesine dokunarak devam et. Bir pencere açıksa zaman beklediğini unutma; kapat.'],
        ['Param bitti.', 'Önce Finans › Gelir-Gider\'de nakit yeterliliğe bak. Çözümler: ön satış aç, tamamlanmış daireleri sat ya da toplu sat, krediyi uygun faizle al, yatırımcı bul, gereksiz makine ve arsa sat, işten çıkarma son çaredir.'],
        ['Satış çok yavaş.', 'Satış merkezinde fiyat çubuğunu aşağı çek (talep ve satış hızı hemen güncellenir), emlakçıyı aç, peşin satışa ya da taksite izin ver. Faiz yüksekse ve piyasa daralıyorsa talep zaten düşüktür.'],
        ['Arsa teklifim kabul edilmiyor.', 'Reddedilen ya da daha düşük teklif tekrar kabul edilmez; biraz yüksek bir teklif dene. Liste fiyatının %100\'ünü verirsen alırsın.'],
        ['Hangi bina tipini yapmalıyım?', 'İlk işte müstakil ev ya da küçük apartman: hızlı, ucuz, düşük risk. Büyük bina tipleri sermaye ve uzun süre ister. Hızlı başlangıç kartı sana uygun olanı önerir.'],
        ['Ekibim yetmiyor / işler yavaş.', 'Operasyon › Ekip\'te işçi ve usta ekle; saha çalışanlarını projeye ata. Ofis doluysa daha büyük genel merkeze taşın. Düşük moral de yavaşlatır.'],
        ['Kredi taksidini kaçırdım.', 'Kredi notu düşer; üst üste 3 kaçırmada haciz gelir. Hemen kasayı doldurup Finans › Krediler\'den ödeme yap.'],
        ['Otel ya da AVM nasıl yapılır?', 'Seviye 4\'te Projeler\'den arsaya Otel/AVM projesi başlat (büyük ve ticari imarlı arsa gerekir). Bitince Holding › Otel & AVM\'den işletmeye al; her ay gelir getirir.'],
        ['Nasıl daha hızlı büyürüm?', 'Görevleri izle (ödülleri nakit), her projeyi kârlı bitirip itibarı artır, ihalelere gir, yeni ilde şube aç. Seviye atladıkça daha büyük bina tipleri ve merkezler açılır.'],
        ['Oyun açılmıyor / donuyor.', 'Ekranın üstünde kırmızı bir hata kutusu çıkıyorsa içindeki yazıyı bildir. Grafik kalitesini Düşük yap. Uygulamayı kapatıp açınca son kayıttan devam edersin.'],
      ] },
    ],
  },
];
