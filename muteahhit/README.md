# Müteahhit — Temelden Zirveye
Tasarım belgesi: `../docs/muteahhit-tasarim-belgesi.md`

    npm install
    npm test        # birim + kayıt testleri
    npm run sim     # başsız simülasyon (tohum, yıl)
    npm run sim:macro -- 300 20 gercekci   # makro denge raporu
    npm run sim:land -- 40                 # arsa/proje marj dengesi raporu
    npm run sim:build -- 300 orta          # inşaat dengesi (ekip: yok|kucuk|orta|buyuk)
    npm run sim:sales -- 12                # satış stratejileri raporu
    npm run sim:geo                        # 81 il ekonomik denge raporu
    npm run sim:bank                       # ihale kazanma/marj ve kredi faizi raporu
    npm run dev     # geliştirme sunucusu
    npm run build   # dist/index.html (tek dosya)

Durum: **Faz 1–11 + 81 il haritası** (çekirdek, açılış/menü/ayarlar/müzik, şirket ve makro ekonomi, finans, arsa pazarı, inşaat + 3D şantiye, malzeme/makine/personel temeli, daire satışı ve müşteri, banka/kredi/yatırımcı/ihale, rakipler, 48 olay, dinamik piyasa, ses/animasyon cilası, görev/başarım/seviye/ofis). Yalnızca yatay oyun. Sonraki: Faz 12 (kapsamlı test, denge, optimizasyon, hata düzeltme).

## Veri kaynakları ve atıf

- **İl ve ilçe sınırları:** [geoBoundaries](https://www.geoboundaries.org) gbOpen TUR ADM1/ADM2, lisans **CC BY 4.0** (Runfola ve ark., 2020). Oyun için sadeleştirilmiş çokgenler `src/data/geo/` altındadır; `tools/build-geo.py` ile yeniden üretilir:
  `python3 tools/build-geo.py adm1.geojson adm2.geojson`
- 81 il / 973 ilçe; ilçe ekonomik özellikleri (fiyat, gelir, yoğunluk…) **oyun için kurgusal/stilize** değerlerdir, gerçek istatistik değildir.
