# Cafe Empire — Expo uygulaması (iPhone)

Oyun (`../cafe-empire`, Vite ile tek dosyaya derlenen HTML) bir WebView içinde, tamamen çevrimdışı çalışır. Expo tarafı yalnızca kabuktur:
yatay ekran kilidi, ekranın uyumaması, tam ekran, gerçek titreşim (`navigator.vibrate` → `expo-haptics`) ve arka plana geçince oyuna haber verme. Ağ isteği yoktur; WebView dış adreslere gitmeye izin vermez.

## Telefonda denemek (Expo Go)
```bash
cd cafe-expo && npm install && npx expo start   # QR kodu iPhone kamerasıyla okut
```

## Oyunu güncellemek
```bash
cd ../cafe-empire && npm run build    # dist/index.html üretir
cd ../cafe-expo && npm run sync       # assets/game.html'e kopyalar
```

## Simge ve mağaza görselleri
- `npm run icons` → `assets/` içindeki simgeleri üretir (1024×1024, saydamlıksız `icon.png`).
- `node scripts/make-screenshots.cjs <kayit.json>` → `store/screenshots/` altında iPhone 6,9" (2868×1320) ve 6,5" (2778×1284) görüntüleri üretir.

## Mağaza
Ayrıntılı adımlar: `store/YAYIN-REHBERI.md` · Mağaza metni ve gizlilik yanıtları: `store/listing.tr.md`.
Paket kimliği: `app.cafeempire.turkiye` · Sürüm: 1.0.0.
