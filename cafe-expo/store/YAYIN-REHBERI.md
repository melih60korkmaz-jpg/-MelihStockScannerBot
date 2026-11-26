# Cafe Empire — App Store yayın rehberi

## Durum (26 Kasım 2026)
- **Hazır:** Expo kabuğu (`cafe-expo`, TypeScript temiz, iOS paketi `expo export` ile derleniyor), simgeler, mağaza metni, gizlilik/destek sayfaları (`docs/cafe-gizlilik.html`, `docs/cafe-destek.html`), 7'şer ekran görüntüsü (6,9" ve 6,5").
- **Henüz yapılmadı:** iOS build'i (EAS), TestFlight, App Store Connect kaydı ve incelemeye gönderme. Bunlar için Apple Developer hesabı ve Expo girişi gerekir; benim yapabileceğim işler değil.
- **Gerçek cihazda denenmedi.** Tüm denetim bilgisayardaki telefon boyutlu tarayıcıda yapıldı (5 yatay ekran boyutu, 46 sayfa). TestFlight'ta aşağıdaki listeyi mutlaka dene.

## Sırayla yapılacaklar
1. **Gizlilik ve destek sayfaları:** GitHub › Settings › Pages › `main` / `/docs` (Müteahhit için zaten açıldıysa ek iş yok). Şu adreslerin açıldığını doğrula:
   `…/cafe-gizlilik.html` ve `…/cafe-destek.html`. Sayfalardaki iletişim e-postası Müteahhit sayfalarındakiyle aynıdır; farklı istiyorsan değiştir.
2. **Expo:** `cd cafe-expo && npm install && npx eas-cli login && npx eas-cli init` (proje kimliğini `app.json`'a yazar).
   Ücretsiz plan build kotası dolduysa yenilenmesini bekle (Seçim Sim için kota 1 Aralık 2026'da yenileniyordu).
3. **Build:** `npx eas-cli build --platform ios --profile production` (Apple girişi ister; sertifika/profil EAS tarafından yönetilir).
4. **App Store Connect:** yeni uygulama › ad "Cafe Empire: Kafe Zinciri", paket kimliği `app.cafeempire.turkiye`, birincil dil Türkçe. Metinleri `store/listing.tr.md`'den gir; ekran görüntülerini `store/screenshots/iphone69-*` (6,9") ve `iphone65-*` (6,5") olarak yükle.
5. **Uygulama Gizliliği:** "Veri Toplanmıyor". **Yaş derecelendirmesi:** anket yanıtları listing dosyasında → 4+. **Dışa aktarım:** şifreleme kullanmıyor (`ITSAppUsesNonExemptEncryption=false` ayarlı).
6. **Build'i seç, incelemeci notunu yapıştır, incelemeye gönder.** `eas submit --platform ios` ile build'i TestFlight/App Store Connect'e yükleyebilirsin.

## TestFlight'ta mutlaka dene (benim doğrulayamadıklarım)
- [ ] Oyun açılıyor mu, beyaz/siyah ekran var mı? Yatay kilit çalışıyor mu?
- [ ] Çentik / Dynamic Island / alt çubuk kenarlarında içerik kesiliyor mu? (Dock, üst çubuk.)
- [ ] Dükkân adı yazarken klavye ekranı bozuyor mu?
- [ ] Uygulamayı kapatıp açınca kayıt duruyor mu? (Çift katmanlı kayıt: localStorage + IndexedDB.)
- [ ] Arka plana alınca oyun zamanı duruyor mu, ses kesiliyor mu?
- [ ] Eski bir iPhone'da (ör. iPhone 11/SE) 14 şubeli oyunda akıcılık: simülasyon gün başına ~100–200 ms (bilgisayarda ölçüldü, telefonda 3–5 kat yavaş olabilir).
- [ ] Ses: ilk dokunuştan sonra çalıyor mu? Titreşim geliyor mu?
- [ ] Parmakla kullanım: küçük düğmeler, kaydırılan sekme çipleri rahat mı?

## Bilinen riskler
- **Guideline 4.2 (minimum işlevsellik):** WebView tabanlı uygulamalar bazen "web sitesi gibi" bulunup reddedilebilir. Bu oyun çevrimdışı, tam özellikli bir oyun ve gerçek titreşim kullanıyor; yine de ret gelirse yanıtında bunu belirt. Müteahhit aynı yöntemle yayınlandıysa risk daha düşüktür.
- **Telif/veri:** İlçe sınırları OpenStreetMap/ODbL kaynaklıdır; atıf Ayarlar sayfasındadır.
- **Güvenlik:** Yayından sonra Expo erişim anahtarı ve App Store Connect API anahtarını iptal edip yenile.
- **Denge:** Yeni sistemlerin (yatırımcı, afet, vergi vb.) denge ayarı gerçek oyuncu testi görmedi; sürüm notlarında "ilk sürüm" olarak kalmalı, geri bildirimle ayarlanır.
