# App Store'a yayın rehberi

## Durum
- Uygulama kimliği `app.muteahhit.game`, yatay ekran, yalnızca iPhone. İlk sürüm **ücretsiz, reklamsız, satın almasız**.
- İlk iOS build'i alındı ve TestFlight'a yüklendi (App Store Connect › Müteahhit › TestFlight).
- Mağaza metni: `store/listing.tr.md` · Ekran görüntüleri: `store/screenshots/` (iPhone 6,5" ve 6,9") · Gizlilik/destek sayfaları: `docs/privacy.html`, `docs/support.html`.

## Mağazaya göndermeden önce (sırayla)
1. **Gizlilik ve destek sayfaları:** GitHub › Settings › Pages › `main` / `/docs`. Dosyalardaki `{{İLETİŞİM_E-POSTA}}` yerine e-postanı yaz.
2. **App Store Connect › Müteahhit › iOS App Version:** sürüm adını build ile aynı yap (1.2.0), metinleri `listing.tr.md`'den gir, ekran görüntülerini yükle, gizlilik URL'sini gir.
3. **Uygulama Gizliliği:** "Veri toplanmıyor". **Yaş derecelendirmesi:** 4+.
4. **Build seç:** TestFlight'taki son build'i sürüme bağla.
5. **İncelemeye gönder.** Apple genelde 1–2 gün içinde yanıt verir.

## Notlar
- Çin anakarası uyarıları (Security Assessment, AIGC) Türkiye'de yayın için gerekmez; Çin'i dağıtım ülkelerinden çıkar.
- AB için "trader status" gerekirse App Store Connect › Business bölümünde doldurulur.
- Oyun içi değişiklikleri `eas update` ile (aynı sürüm numarasıyla) yayınlayabilirsin; yeni native ayar için yeni build gerekir.
- Gelir (reklam/satın alma) eklemek istediğinde ayrı bir sürüm olarak ele alınır; vergi durumunu önce mali müşavirle netleştir.
