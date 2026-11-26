# CAFE EMPIRE — Türkiye

Türkiye haritası üzerinde geçen, **dışarıdan görülen 3B kafe dükkânları** ve kapsamlı işletme yönetimi içeren mobil tycoon oyunu.
Kural: **iç mekân yoktur** — kamera daima dükkânı dışarıdan gösterir.

## Çalıştırma
`npm install` · `npm run dev` · `npm test` · `npm run typecheck` · `npm run build` (tek dosya: `dist/index.html`) · `npm run sim` (ekonomi özeti)

## Durum (dürüst liste)
| Alan | Durum |
|---|---|
| 81 il haritası (gerçek sınırlar), il verileri (nüfus, gelir, turizm, öğrenci, rekabet, kira, maliyet, müşteri profili) | ✅ |
| Kafe açma (marka adı, şehir, 8 dükkân türü, uygunluk kuralları) | ✅ (franchise türü kilitli) |
| Dışarıdan 3B dükkân: cephe, cam, kapı (animasyonlu), tabela, tente, dış masa/sandalye, şemsiye, saksı, ağaç, sokak lambası, menü panosu, çöp kutusu, bisiklet | ✅ |
| Dış cephe geliştirmeleri görünüme yansır (tabela, cam, LED, premium, marka, kapı, oturma, peyzaj, vitrin, tente) | ✅ |
| Gerçek zamanlı müşteri animasyonu (yürür, tabelaya bakar, kapıdan girer/çıkar, dış masada oturur, içer, telefon, sohbet, fotoğraf) — 8 müşteri tipi, çeşitli görünüm | ✅ |
| Gece/gündüz, yağmur, kar, trafik, rüzgârda ağaç/tente, kamera (açılar, yakınlaştırma) | ✅ |
| 15 menülü yönetim paneli (Genel Bakış, Personel, Vardiyalar, Menü ve Ürünler, Stok, Tedarikçiler, Finans, Müşteriler, Reklam, İşletme Geliştirme, Rakipler, Türkiye Haritası, Şubeler, Raporlar, Ayarlar) | ✅ tüm düğmeler gerçek simülasyona bağlı |
| Personel: yetenek/motivasyon/yorgunluk/devam, ilan-aday-pazarlıklı işe alım, zam/prim/eğitim/terfi/değerlendirme, şikâyet kararları, şubeler arası nakil | ✅ (testli) |
| Vardiyalar: sabah/öğle/akşam/tam, haftalık izin, mesai, çalışma saatleri, boşluk haritası; kapsama müşteri kaybını ve kapasiteyi gerçekten etkiler | ✅ (testli) |
| Menü (21 ürün), fiyat esnekliği, kalite, ürün bazlı satış; stok (14 kalem, raf ömrü/fire, min seviye, otomatik+manuel sipariş), 3 tedarikçi (fiyat/gecikme/eksik teslimat/kalite), şubeler arası stok transferi | ✅ (testli) |
| Finans: brüt/net kâr, nakit akışı, gider kalemleri, şube bazlı, kredi; tahakkuk-nakit tutarlılığı testle doğrulanır | ✅ |
| Müşteri metrikleri (sepet, bekleme, tekrar, sadakat, kayıp nedenleri), reklam (10 tür incl. ikinci/paket), işletme geliştirme (8 ekipman/operasyon yatırımı: kapasite, kalite, raf ömrü, enerji, marka) | ✅ |
| Rakipler: strateji, kampanya, tahmini pazar payı | ⚠️ pazar payı tahmini bir modeldir; rakipler tek tek şehre bağlı |
| Türkiye haritasında il ve ilçeleri parayla açma: yalnız İstanbul'dan başlanır; gerçek ilçe sınırları (973 ilçe), seviye + sınırdaş şartı, ilçe profili (talep/gelir/kira), pazarın zamanla olgunlaşması, zoom ve açılış animasyonları | ✅ (testli). İlçe profilleri tahmindir: yalnız İstanbul'un 39 ilçesi elle girildi, diğer illerde ilçe ağırlıkları türetilir |
| 28 ürün (7 yeni kahve çeşidi: flat white, macchiato, cortado, iced latte, V60, dibek, sahlep); ₺ bazlı fiyat ayarı; tüm fiyatları birlikte artırınca müşteri sayısı da azalır; fiyat danışmanı (beklenen kâra göre öneri), menü önerileri, menüyü tüm şubelere kopyalama | ✅ (testli; öneriler beklenen değerdir) |
| Eski kayıtlar yeni sürümde açılır (alan göçü) | ✅ (testli) |
| **Franchise sistemi** | ❌ henüz yok |
| Birden fazla şehirde şube aç ve haritadan yönet | ✅ (şube ağı), ✅ harita pinleri |
| Uluslararası seviye, ek dükkân görsel stilleri (AVM/sahil/lüks/konsept farkları) | ⚠️ kısmi: tüm tipler aynı model ailesinden |
| Ses/müzik, mağaza kaydı, ikon, iOS build | ❌ henüz yok |

## Veri kaynakları
İlçe sınırları: [Pinlyx/turkiye-il-ilce](https://github.com/Pinlyx/turkiye-il-ilce) verisinden (© OpenStreetMap contributors, Overture Maps Foundation, ODbL 1.0) `scripts/build-districts.py` ile basitleştirilip `src/data/districts.json` üretildi.
