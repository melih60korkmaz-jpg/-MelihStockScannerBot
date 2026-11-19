# Müteahhit — Temelden Zirveye
Tasarım belgesi: `../docs/muteahhit-tasarim-belgesi.md`

    npm install
    npm test        # birim + kayıt testleri
    npm run sim     # başsız simülasyon (tohum, yıl)
    npm run sim:macro -- 300 20 gercekci   # makro denge raporu
    npm run sim:land -- 40                 # arsa/proje marj dengesi raporu
    npm run sim:build -- 300 orta          # inşaat dengesi (ekip: yok|kucuk|orta|buyuk)
    npm run dev     # geliştirme sunucusu
    npm run build   # dist/index.html (tek dosya)

Durum: **Faz 1–5 tamam** (çekirdek, açılış/menü/ayarlar/müzik, şirket ve makro ekonomi, finans, arsa pazarı, inşaat simülasyonu ve 3D şantiye). Yalnızca yatay oyun. Sonraki: Faz 6 (personel, makine, malzeme/tedarik).
