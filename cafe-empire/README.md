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
| Personel (7 tür, işe alma/çıkarma, zam, motivasyon, performans), dışarıda görünen servis/temizlik | ✅ (bölge müdürü etkisi basit) |
| Menü (19 ürün, fiyat/kalite, ekle/çıkar), stok (11 hammadde), tedarik ve otomatik sipariş | ✅ |
| Finans (gelir/gider kalemleri, günlük-haftalık-aylık, grafik, kredi, vergi) | ✅ |
| Reklam (8 tür, riskli), yorumlar, memnuniyet/marka/hijyen/sadakat | ✅ |
| Ekonomik olaylar (11 tür, kararlı) ve rakipler (fiyat, reklam, şube, ürün, çalışan) | ✅ (rakipler basit modelli) |
| Kayıt/yükleme | ✅ |
| **Franchise sistemi** | ❌ henüz yok |
| Birden fazla şehirde şube aç ve haritadan yönet | ✅ (şube ağı), ✅ harita pinleri |
| Uluslararası seviye, ek dükkân görsel stilleri (AVM/sahil/lüks/konsept farkları) | ⚠️ kısmi: tüm tipler aynı model ailesinden |
| Ses/müzik, mağaza kaydı, ikon, iOS build | ❌ henüz yok |
