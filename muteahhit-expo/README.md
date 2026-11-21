# Müteahhit — Expo uygulaması

Oyun (`../muteahhit`, Vite ile tek dosyaya derlenen HTML) bir WebView içinde çalışır. Expo tarafı yalnızca kabuktur:
yatay ekran kilidi, ekranın uyumaması, tam ekran, gerçek titreşim (oyundaki `navigator.vibrate` → `expo-haptics`) ve arka plana geçince oyuna haber verme.

## Telefonda denemek (Expo Go)
```bash
cd muteahhit-expo
npm install
npx expo start        # çıkan QR kodu iPhone kamerasıyla / Android'de Expo Go ile okut
```
Bilgisayar ve telefon aynı ağda olmalı (olmuyorsa `npx expo start --tunnel`).

## Oyunu güncellemek
```bash
cd ../muteahhit && npm run build      # dist/index.html üretir
cd ../muteahhit-expo && npm run sync  # assets/game.html'e kopyalar
```
`assets/game.html` depoda tutulur; böylece uygulama tek başına derlenebilir.

## Mağaza / dahili sürüm (EAS)
```bash
npm i -g eas-cli && eas login
eas build:configure
eas build --platform ios --profile preview      # TestFlight/dahili
eas build --platform android --profile preview  # APK
```
Paket kimliği: `app.muteahhit.game` (app.json'dan değiştirin). Apple Developer hesabı gerekir (iOS).

## Notlar
- Kayıtlar WebView'ın localStorage/IndexedDB deposunda tutulur; uygulama silinirse kayıtlar da silinir.
- Resimsiz hafif sürüm gerekirse `../muteahhit` içinde `npm run build:lite` ve çıktıyı `assets/game.html`'e kopyalayın.
- Expo SDK 58 / React Native 0.88. `react-native-webview` tipi bu TypeScript sürümünde `never`e çöktüğü için `App.tsx`'te gevşetildi.
