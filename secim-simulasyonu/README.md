# Seçim Simülasyonu

Tek dosyalık HTML Türk siyaset strateji oyunu. Kaynak: `src/`, derleme: `sh build.sh` → `dist/index.html`.

## Testler
`for t in test*.js; do node $t; done` (Node). Tarayıcı testleri: `python3 test_*.py` (Playwright).

## Expo Go ile açmak
Oyun, Expo Go içinde WebView ile çalışır.

```
npx create-expo-app@latest secim-expo --template blank
cd secim-expo
npx expo install react-native-webview
# bu depodaki expo/App.js ve expo/game-html.js dosyalarını yeni projeye kopyala (App.js'in üstüne yaz)
npx expo start
```
Telefonda Expo Go ile QR kodu okut.

Oyunu değiştirince: `sh build.sh && node expo/make.js`, sonra `game-html.js` dosyasını yeniden kopyala.

Not: Kayıtlar WebView'in localStorage'ında tutulur; Expo Go'da kalıcılığı gerçek cihazda henüz denenmedi.
