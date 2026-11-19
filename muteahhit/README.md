# Müteahhit — Temelden Zirveye
Tasarım belgesi: `../docs/muteahhit-tasarim-belgesi.md`

    npm install
    npm test        # birim + kayıt testleri
    npm run sim     # başsız simülasyon (tohum, yıl)
    npm run sim:macro -- 300 20 gercekci   # makro denge raporu
    npm run sim:land -- 40                 # arsa/proje marj dengesi raporu
    npm run sim:build -- 300 orta          # inşaat dengesi (ekip: yok|kucuk|orta|buyuk)
    npm run sim:sales -- 12                # satış stratejileri raporu
    npm run dev     # geliştirme sunucusu
    npm run build   # dist/index.html (tek dosya)

Durum: **Faz 1–7** (çekirdek, açılış/menü/ayarlar/müzik, şirket ve makro ekonomi, finans, arsa pazarı, inşaat + 3D şantiye, malzeme/makine/personel temeli, daire satışı ve müşteri). Yalnızca yatay oyun. Sonraki: Faz 8 (banka, kredi, ihaleler).
