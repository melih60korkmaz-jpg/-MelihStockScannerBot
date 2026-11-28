# Futbolcu Kariyeri – iPhone / Android paketi (Expo)

Oyun (`../futbolcu-kariyer`, Vite ile tek dosya HTML) bir WebView içinde **çevrimdışı** çalışır. Dikey ekran kilitlidir.

```
cd ../futbolcu-kariyer && npm run build     # oyunu derle
cd ../futbolcu-expo && npm run sync         # dist/index.html -> assets/game.html
npm run typecheck
npx expo start --ios                        # simülatör / Expo Go
```

## TestFlight'a yükleme (GitHub Actions)
Workflow: `.github/workflows/futbolcu-ios-testflight.yml`. Yalnızca **elle çalıştırınca** ya da commit mesajında **`[ios]`** varsa derler.

Sizin yapmanız gerekenler (Apple hesabı gerektiği için ben yapamam):
1. developer.apple.com → Identifiers: `app.futbolcukariyeri.turkiye` Bundle ID'sini oluşturun.
2. App Store Connect → Uygulamalar → Yeni uygulama: aynı Bundle ID ile kayıt açın.
3. Depo ayarlarında şu secret'lar (Cafe Empire için kullanılanlarla aynı): `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `APPLE_TEAM_ID`.
4. Actions → "Futbolcu Kariyeri iOS -> TestFlight" → Run workflow (workflow'un main dalında olması gerekir).

Not: Gerçek iPhone/Android cihazda performans ve dokunma testi bu ortamda yapılamadı; yalnızca masaüstü Chromium (390×780 mobil emülasyon) ile test edildi.
