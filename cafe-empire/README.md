# CAFE EMPIRE — Türkiye

Türkiye haritası üzerinde geçen, kapsamlı **kafe zinciri yönetim simülasyonu** (yatay, mobil). Dükkânlar 3B/animasyonlu bina olarak değil, **şube panosu** ile dışarıdan yönetilir. (Eski 3B dış sahne git geçmişinde: `3da8e49`.)

## Test
`npm test` (vitest: çekirdek, ekonomi, **oyun testi** — bot 1–2 yıl oynar, fuzz testi, menü yapısı) · `npm run build && npm run qa` (telefon boyutunda uçtan uca tarayıcı testi; playwright gerekir).

## Çalıştırma
`npm install` · `npm run dev` · `npm test` · `npm run typecheck` · `npm run build` (tek dosya: `dist/index.html`) · `npm run sim` (ekonomi özeti)

## Durum (dürüst liste)
| Alan | Durum |
|---|---|
| Dükkân açma akışı: şubesiz başlangıç (2 M ₺, İstanbul) → Türkiye haritası → semt sınıfı (Seçkin/Canlı/Mahalle/Ekonomik) + şube/itibar şartları → 5 ilan → "Açılış planı" (Mekân ve tarz / Ekip ve donanım / Finansman), alt özet çubuğunda maliyet ve aylık tahmin |
| Yüzen dock'ta 8 sekme (Merkez, Türkiye, Dükkânlar, Depo, Tanıtım, Gelişim, Kasa, Ayarlar); Dükkân detayı: salon doluluğu, müşteri profili, menü/personel/vardiya/gelişim |
| **Atölye** (☕): çekirdek ve kavurma (5 çekirdek, harman uyumu, hasat mevsimi), tarif atölyesi (içecek tasarla, tattır, imza yap), barista ustalığı (seviye, yetenek, Ekim şampiyonası), Nisan kahve fuarı |
| **Semt** (🏘️): semt takvimi (bayram, sınav, derbi, festival… hazırlık kararı), müdavimler ve müşteri tipleri, komşu esnaf ve ortak kampanya, rakip zincirler (Koçak, Beanify, Dem & Demlik, Ay Çekirdek), dükkân kimliği ve günlüğü |
| Krizler ve personel hikâyeleri: gıda denetimi, yorum fırtınası, makine arızası, tedarik krizi, hırsızlık, sendikal baskı, zam talebi, rakip barista kapması, bayi kalite sorunu; franchise sözleşmeleri (Standart/Premium/Esnek) |
| Ekonomi dengesi: şirket genel yönetim gideri (şube arttıkça gelirin %0,9'u/şube, en çok %12), her 90 günde kira ve maaşın enflasyona endekslenmesi, marka etkisinin yüksek seviyede yumuşatılması, enflasyon olayının sınırlanması, şirket değeri çarpanlarının düşürülmesi |
| Online platformlar (4, komisyonlu), sosyal medya (takipçi, paylaşım, ajans), sıralama (zincirler ve şehirler), 4 banka (faiz/komisyon/limit) | ✅ (testli; sıralamadaki rakip zincirler simüle edilir) |
| 81 il haritası (gerçek sınırlar), il verileri (nüfus, gelir, turizm, öğrenci, rekabet, kira, maliyet, müşteri profili) | ✅ |
| Kafe açma (marka adı, şehir, 8 dükkân türü, uygunluk kuralları) | ✅ (franchise türü kilitli) |
| 15 menülü yönetim paneli (Genel Bakış, Personel, Vardiyalar, Menü ve Ürünler, Stok, Tedarikçiler, Finans, Müşteriler, Reklam, İşletme Geliştirme, Rakipler, Türkiye Haritası, Şubeler, Raporlar, Ayarlar) | ✅ tüm düğmeler gerçek simülasyona bağlı |
| Personel: yetenek/motivasyon/yorgunluk/devam, ilan-aday-pazarlıklı işe alım, zam/prim/eğitim/terfi/değerlendirme, şikâyet kararları, şubeler arası nakil | ✅ (testli) |
| Vardiyalar: sabah/öğle/akşam/tam, haftalık izin, mesai, çalışma saatleri, boşluk haritası; kapsama müşteri kaybını ve kapasiteyi gerçekten etkiler | ✅ (testli) |
| Menü (21 ürün), fiyat esnekliği, kalite, ürün bazlı satış; stok (14 kalem, raf ömrü/fire, min seviye, otomatik+manuel sipariş), 3 tedarikçi (fiyat/gecikme/eksik teslimat/kalite), şubeler arası stok transferi | ✅ (testli) |
| Finans: brüt/net kâr, nakit akışı, gider kalemleri, şube bazlı, kredi; tahakkuk-nakit tutarlılığı testle doğrulanır | ✅ |
| Müşteri metrikleri (sepet, bekleme, tekrar, sadakat, kayıp nedenleri), reklam (10 tür incl. ikinci/paket), işletme geliştirme (8 ekipman/operasyon yatırımı: kapasite, kalite, raf ömrü, enerji, marka) | ✅ |
| Rakipler: strateji, kampanya, tahmini pazar payı | ⚠️ pazar payı tahmini bir modeldir; rakipler tek tek şehre bağlı |
| Türkiye haritasında il ve ilçeleri parayla açma: yalnız İstanbul'dan başlanır; gerçek ilçe sınırları (973 ilçe), seviye + sınırdaş şartı, ilçe profili (talep/gelir/kira), pazarın zamanla olgunlaşması, zoom ve açılış animasyonları | ✅ (testli). İlçe profilleri tahmindir: yalnız İstanbul'un 39 ilçesi elle girildi, diğer illerde ilçe ağırlıkları türetilir |
| 28 ürün (7 yeni kahve çeşidi: flat white, macchiato, cortado, iced latte, V60, dibek, sahlep); ₺ bazlı fiyat ayarı; tüm fiyatları birlikte artırınca müşteri sayısı da azalır; fiyat danışmanı (beklenen kâra göre öneri), menü önerileri, menüyü tüm şubelere kopyalama | ✅ (testli; öneriler beklenen değerdir) |
| Ekonomi Merkezi: animasyonlu sayaçlar, para akışı çubuğu, gelir/gider halka grafikleri, günlük gelir-gider-net grafiği, birim ekonomisi (başabaş, nakit yeterlilik), şube sıralaması, fiyat–kâr eğrisi (dokunarak fiyat ayarı); kampanyalar (sabah paketi, mutlu saat, öğrenci indirimi, sadakat kartı, günün ürünü), müdür fiyat yetkisi, toplu fiyat | ✅ (testli) |
| Merkezi depo ve mutfak (toplu alım indirimi, nakliye, raf ömrü), hedefler (görevler) ve 30 başarım, 4 yeni ekonomik olay (rakip fiyat savaşı, rakip şube açılışı, kira zammı, enflasyon sıçraması) | ✅ (testli) |
| Geniş harita, günlük özet kartı, 8 adımlı eğitim turu (?), sentezlenmiş ses/müzik (açma/kapama, ses düzeyi) | ✅ ses cihazda kulakla denenmedi (kod ve tarayıcı hatası testi yapıldı) |
| Eski kayıtlar yeni sürümde açılır (alan göçü) | ✅ (testli) |
| Franchise: giriş ücreti, royalty+pazarlama payı, bayi kalitesi/memnuniyeti, destek ve denetim, bayi ayrılması ve marka zararı | ✅ (testli; seviye 5 şartı; bayi cirosu modelle tahmin edilir) |
| Birden fazla şehirde şube aç ve haritadan yönet | ✅ (şube ağı), ✅ harita pinleri |
| Uluslararası seviye, ek dükkân görsel stilleri (AVM/sahil/lüks/konsept farkları) | ⚠️ kısmi: tüm tipler aynı model ailesinden |
| Ses/müzik, mağaza kaydı, ikon, iOS build | ❌ henüz yok |

## Veri kaynakları
İlçe sınırları: [Pinlyx/turkiye-il-ilce](https://github.com/Pinlyx/turkiye-il-ilce) verisinden (© OpenStreetMap contributors, Overture Maps Foundation, ODbL 1.0) `scripts/build-districts.py` ile basitleştirilip `src/data/districts.json` üretildi.
