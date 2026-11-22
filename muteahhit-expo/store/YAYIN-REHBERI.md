# App Store'a yayın rehberi

## Hazır olanlar (yapıldı)
- Uygulama kimliği `app.muteahhit.game`, sürüm 1.2.0, yatay ekran, iPad kapalı (yalnızca iPhone).
- Mağaza metni: `store/listing.tr.md` · Ekran görüntüleri: `store/screenshots/` (iPhone 6,5" 2688×1242 ve 6,9" 2868×1320, 7'şer adet).
- Gizlilik politikası ve destek sayfası: depo kökünde `docs/privacy.html`, `docs/support.html`.
- Altın satın alma (RevenueCat) ve ödüllü reklam (AdMob) kodu: `payments.ts`. Anahtarlar boşken uygulama mağaza sürümünde satın alma/reklamı kapalı gösterir ("Yakında"); Expo Go'da test modundadır.

## Senin yapacakların (sırayla)
1. **Apple Developer Program** (yaklaşık 99 $/yıl): developer.apple.com/programs
2. **Gizlilik/destek sayfalarını yayınla:** GitHub › depo › Settings › Pages › Source: `main` / `/docs` (önce bu dalı `main`'e birleştir). Adresler: `https://<kullanıcı>.github.io/<depo>/privacy.html` ve `/support.html`. `docs/*.html` içindeki `{{İLETİŞİM_E-POSTA}}` yerine e-postanı yaz.
3. **App Store Connect › Uygulamalarım › +:** ad "Müteahhit: Temelden Zirveye", paket kimliği `app.muteahhit.game`, dil Türkçe. Metinleri `store/listing.tr.md`'den yapıştır, ekran görüntülerini yükle, gizlilik URL'sini gir, "Uygulama Gizliliği" ve yaş derecelendirmesini listedeki gibi doldur.
4. **Uygulama içi satın alma:** App Store Connect › Para Kazanma › 4 tüketilebilir ürünü `listing.tr.md` tablosundaki kimlik ve fiyatlarla oluştur; her birine ekran görüntüsü (Altın sekmesi) ve açıklama ekle.
5. **RevenueCat (ücretsiz):** revenuecat.com › proje › iOS uygulaması ekle › App Store Connect API anahtarını bağla › ürünleri içe aktar › Public SDK Key'i al. Android için aynısı (Google Play).
6. **AdMob (ücretsiz):** admob.google.com › uygulama ekle › "Ödüllü" reklam birimi oluştur. `app.json` içindeki Google test uygulama kimliklerini kendi uygulama kimliklerinle değiştir.
7. **Anahtarları ekle:** `app.json › expo.extra` → `revenueCatIosKey`, `revenueCatAndroidKey`, `admobRewardedIos`, `admobRewardedAndroid`. (Public SDK anahtarlarıdır, gizli değildir.)
8. **Build ve gönderim:**
   ```bash
   cd muteahhit-expo
   npx eas-cli@latest build -p ios --profile production      # Apple girişi sorulur
   npx eas-cli@latest submit -p ios --profile production     # TestFlight'a yükler
   ```
   TestFlight'ta dene (sandbox satın alma), sonra App Store Connect'ten "İncelemeye gönder".
9. Android için: Google Play Console (25 $) › uygulama oluştur › `eas build -p android --profile production` › `eas submit -p android`.

## Dikkat
- Gerçek anahtarlar girilmeden mağazaya gönderirsen Altın paketleri "Yakında" görünür; Apple uygulama içi satın almayı görmek isteyebilir, anahtarları ekleyip yeniden gönder.
- Her yeni native sürüm için `app.json › version` yükselt. Sadece oyun değişikliklerini `eas update` ile yayınlayabilirsin.
- Reklamlar kişiselleştirilmemiş istenir; ATT (izleme izni) gerekmez.
