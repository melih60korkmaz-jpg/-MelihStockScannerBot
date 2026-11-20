# Müteahhit — Temelden Zirveye
### Oyun Tasarım Belgesi, Sistem Mimarisi ve Geliştirme Planı (v0.1 — çalışma adı)

> Durum: **Planlama aşaması. Henüz kod yok.** Bu belge onaylandıktan sonra Faz 1'den başlanır.
> Hedef platform: önce **tarayıcıda çalışan HTML (mobil öncelikli)**, sonra Capacitor ile iOS/Android paketi.

---

## 0. Vizyon

**Tek cümle:** Oyuncu, bir arsa ve biraz sermayeyle başladığı şirketi, gözünün önünde yükselen binalarla ve her ay değişen bir piyasada, ülke çapında bir inşaat markasına dönüştürür.

**Üç temel sütun**

| Sütun | Anlamı | Tasarım sınavı |
|---|---|---|
| **Görülebilir inşaat** | Her ekonomik karar şantiyede fiziksel olarak görünür (stok biterse vinç boşta bekler, kalite düşükse cephe kusurlu çıkar). | "Bu sayı sahnede nerede görünüyor?" |
| **Okunabilir derinlik** | Derin ama yorucu değil. Her ekranda tek bir ana soru: *Param yeter mi? Şantiye akıyor mu? Ne satıyorum?* | "Bu ekranı 5 sn'de anlar mıyım?" |
| **Adil risk** | Oyuncu kaybedebilir, ama her kayıp önceden görülebilir bir nedene bağlıdır ve toparlanma yolu vardır. | "Batarsa nedenini söyleyebiliyor mu?" |

**Dürüst görsel hedef.** Kodla üretilen 3D ile fotoğraf gerçekçiliği hedeflenmez. Hedef, *premium stilize* bir görünümdür: temiz low-poly formlar, yumuşak ışık/gölge, tutarlı renk paleti, zengin animasyon (referans hissi: Islanders / Mini Motorways / Townscaper kalitesinde cilalı diorama). Bu hem mobil performans hem de "içerikler birbirinin kopyası olmasın" hedefi için doğru yoldur: bina tasarımları **prosedürel** üretilir (Bölüm 9).

**Özgünlük.** Tüm görsel, ses, isim ve markalar özgündür; gerçek şirket/marka kullanılmaz. Şehir adları gerçek, mahalle ve şirket adları kurgusaldır.

---

## 1. Kapsam Kararları ve Teknoloji Seçimi

### 1.1 Teknoloji

| Konu | Karar | Neden |
|---|---|---|
| Dil/Yapı | Vanilla **ES modülleri + TypeScript** (derleme: **Vite**) | Bağımlılık az, hızlı, mobil dostu |
| 3D | **Three.js** (MIT), `InstancedMesh`, düz renkli low-poly, vertex-color AO | iPhone Safari'de kararlı; WebGL2 |
| UI | HTML/CSS + küçük reaktif katman (Preact + htm, ~4 KB) | Metin/liste/grafik için DOM, 3D için canvas |
| Grafikler | Elle yazılmış hafif SVG/Canvas grafik bileşenleri | Ağır kütüphane yok, tema ile uyumlu |
| Ses | **Web Audio** prosedürel (önceki tasarımdaki adaptif müzik motoru fikri) | Dosya yok, telif yok, küçük boyut |
| Kayıt | **IndexedDB** + sürümlü şema + sağlama toplamı | localStorage sınırlı ve kırılgan |
| Dağıtım | Tek `index.html` (singlefile build) + PWA manifest → sonra **Capacitor** | "HTML olarak göster, sonra iOS" hedefi |
| Sim testi | **Node'da başsız (headless) simülasyon** | Denge testi görselsiz koşabilmeli |

### 1.2 Altın kurallar

1. **Sim ile görüntü ayrı.** `sim/` klasörü DOM ve Three.js'i hiç bilmez. Render yalnızca durumun salt-okunur anlık görüntüsünü çizer.
2. **Tüm değişiklik komutla yapılır** (`BuyLand`, `HireStaff`, `PlaceBid`…). Her UI butonu bir komuta bağlı; komut kayıt tablosu otomatik testle taranır → **çalışmayan/sahte buton olamaz.**
3. **Para tamsayıdır** (kuruş cinsinden). Float yuvarlama hatası ekonomiyi bozmaz.
4. **Deterministik rastgelelik.** Her sistem kendi tohumlu RNG akışını kullanır (mulberry32). Aynı tohum + aynı komutlar = aynı oyun. Hata ayıklama ve denge testi için şart.
5. **Veri odaklı içerik.** Malzemeler, makineler, olaylar, görevler, bina tipleri JSON tanımıdır; kod değil.
6. **Kilitli özellik açıkça kilitli.** "Yakında" butonu yok; kilitli öğe hangi seviye/şartla açılacağını gösterir.

### 1.3 MVP sınırı (ilk oynanabilir sürüm = Faz 1–7 sonu)

Dahil: 1 şehir→3 şehir, apartman/site/müstakil/villa/ofis/rezidans, 18 aşamalı inşaat, malzeme, personel, makine, satış, kredi, olaylar, 2 rakip.
Sonraya: AVM, otel, fabrika, karma kullanım, kamu mega-ihaleleri, 8 şehir, şirket hissesi satışı (Faz 8–11).
Sınır, "her şeyi yarım yapmaktansa az şeyi bitmiş yapmak" ilkesiyle konmuştur.

---

## 2. Sistem Mimarisi

```
┌────────────────────────────── platform/ ──────────────────────────────┐
│ lifecycle (visibilitychange/pause) · haptics · storage · capacitor    │
└───────────────────────────────────────────────────────────────────────┘
        ▲                     ▲                       ▲
┌── ui/ ───────┐   ┌── render3d/ ──────┐   ┌── audio/ ─────────┐
│ ekranlar     │   │ sahne, kamera      │   │ müzik motoru      │
│ bileşenler   │   │ bina üretici       │   │ SFX, ambiyans     │
│ grafikler    │   │ şantiye varlıkları │   │ ses mixeri        │
└──────▲───────┘   └─────────▲──────────┘   └─────────▲─────────┘
       │ okur (snapshot)     │ okur                    │ olayları dinler
┌──────┴─────────────────────┴─────────────────────────┴───────────────┐
│                         core/  (Store · EventBus · Commands)          │
└──────▲───────────────────────────────────────────────────────────────┘
       │ komut gönderir / olay yayar
┌──────┴──────────────────────── sim/ (saf mantık) ────────────────────┐
│ clock · rng · macro · markets · land · projects · construction        │
│ materials · workforce · machines · sales · finance · tenders · rivals │
│ events · decisions · reputation · quests · achievements               │
└──────▲───────────────────────────────────────────────────────────────┘
       │ okur
┌──────┴────── data/ (JSON) ──────────────────────────────────────────┐
│ cities · districts · buildingTypes · materials · machines · staff    │
│ suppliers · events · quests · banks · rivalProfiles · loc/tr.json    │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.1 Zaman ve tick modeli

- **1 tick = 1 oyun günü.** Aylık işlemler ayın 1'inde, haftalık işlemler pazartesi, yıllık işlemler 1 Ocak'ta.
- Hızlar: ⏸ Duraklat · **1×** (1 gün / 2,0 sn) · **2×** (0,8 sn) · **4×** (0,3 sn) · **Atla** (olay çıkana/proje aşaması bitene kadar).
- Önemli olay (karar, kaza, ihale sonucu) gelince oyun **otomatik duraklar**.
- Uygulama arka plana alınınca **otomatik duraklar**, ses sustur (Bölüm 12).

### 2.2 Ana veri modeli (özet)

```
GameState {
  meta{ version, seed, createdAt, difficulty }
  clock{ day, speed }
  macro{ policyRate, inflation, regime, confidence, materialIndex, history[] }
  cities[ districts[ {landIndex, demand, income, density, infra, transit, competition} ] ]
  company{ name, level, reputation, creditScore, cash, debts[], offices[] }
  parcels[]   // arsalar (oyuncunun ve piyasadakiler)
  projects[]  // proje: parcel, type, quality, design seed, stages[18], budget, actuals, units[]
  staff[]  machines[]  suppliers[]  stock{materialId: qty, quality}
  loans[]  ledger[]   // ledger = çift taraflı değil ama her hareket etiketli kayıt
  rivals[]  tenders[]  eventsQueue[]  scheduledConsequences[]
  quests[]  achievements[]  stats{}
}
```

`ledger` her para hareketini (kategori, proje, gün, tutar) tutar; tüm finansal tablolar buradan **türetilir** — ikinci bir "doğru" sayı yoktur, tutarsızlık imkânsızdır.

### 2.3 Komut/olay akışı

`UI buton → Command.validate() → Command.apply(state) → EventBus.emit('LAND_BOUGHT')` → ui yeniden çizer, render3d sahneyi günceller, audio ses çalar. Komutlar geri alınmaz ama **kayıt/yeniden oynatma** ile test edilir.

---

## 3. Çekirdek Oyun Döngüsü

**Dakikalık döngü (30 sn–2 dk):** Haritaya bak → arsayı incele → fizibiliteyi çalıştır → karar ver.
**Seanslık döngü (10–20 dk):** Arsa al → proje seç/tasarla → ruhsat bekle → ekip + malzeme ata → şantiyeyi hızlandır/izle → olaylara karar ver → sat.
**Uzun döngü (saatler):** Seviye atla → yeni şehir/yeni bina tipi → ihale → rakiplerle rekabet → marka.

**Ana gerilim:** Nakit ≠ kâr. Proje kâr yazar ama nakit bitmişse şirket batar. Oyuncu sürekli *zaman–para–risk* takası yapar.

**İlk 15 dakika (öğretici, zorlamasız):** Şirket kur → hazır küçük arsa teklifi → fizibilite aç → satın al → 2 işçi + 1 usta ata → müstakil ev/dubleks başlat → ilk olay (küçük karar) → hızlandır → ilk satış. Görevler "yol gösterir"; hiçbir şey zorunlu değildir.

---

## 4. Sistem Tasarımları

### 4.1 Arsa ve Arazi

**Parsel özellikleri**

| Alan | Açıklama |
|---|---|
| Konum | Şehir › ilçe › mahalle (kurgusal) |
| Alan (m²) | 150–25.000 (seviyeye göre) |
| İmar | Konut / Ticaret / Karma / Sanayi / Turizm / Tarım(imarsız) |
| **TAKS** | Taban oturum oranı (0,20–0,60) |
| **KAKS (Emsal)** | Toplam inşaat alanı çarpanı (0,6–3,5) |
| Max kat | İmar izni (2–40) |
| Zemin | Sağlam kaya · Sıkışık kil · Dolgu · Yüksek yeraltı suyu · Eğimli |
| Cephe | Yol sayısı/yönü, köşe parsel, manzara |
| Altyapı | Elektrik/su/kanal/doğalgaz (%) — eksikse ek maliyet |
| Gelişim potansiyeli | Metro/yol/AVM/üniversite gibi yatırım yakınlığı (gizli + ipuçlu) |
| Çevre | Konut ve ticari yoğunluk (talep & rekabet göstergesi) |

**Hesaplar**
```
taban alanı        = parsel × TAKS
emsal alanı        = parsel × KAKS
kat sayısı         = min(maxKat, ceil(emsal / taban))
brüt inşaat alanı  = emsal × 1.30      (bodrum, otopark, ortak alan emsal dışı)
satılabilir alan   = emsal × 0.85
```

**Arsa fiyatı (₺/m²)**
```
fiyat = ilçeTabanı × konumÇarpanı × (1 + gelişimBeklentisi) × imarÇarpanı
        × zeminVeAltyapıDüzeltmesi × şehirArsaEndeksi(t) × (1 ± pazarlıkPayı)
```
Altyapı ve gelişim projeleri (metro açıldı, üniversite kuruldu) ilçe endeksini zamanla yükseltir; olay sistemi ile bağlıdır.

**Etüt (bilgi mekaniği).** Zemin etüdü ve imar araştırması **ücretlidir**; yaptırmayan oyuncu satın alma sonrası "sürpriz" yaşayabilir (yüksek yeraltı suyu → hafriyat ve temel maliyeti ×1,4). Bilgi bir kaynaktır.

**Satın alma yolları:** Peşin · Kredi ile · **Kat karşılığı** (arsa sahibine %35–55 daire payı, nakit çıkışı yok, kâr payı düşük) · **Ortaklık** (yatırımcı/arsa sahibi ile %xx pay). Satma: piyasaya koy (süre + pazarlık) veya hızlı sat (iskontolu).

### 4.2 Proje ve Bina Tipleri

| Tip | Birim maliyet ₺/m² (standart) | Tipik süre | Notlar |
|---|---|---|---|
| Müstakil ev | 13.000 | 4–7 ay | MVP başlangıç |
| Apartman | 14.000 | 8–14 ay | Ana gelir kalemi |
| Site | 15.500 | 18–30 ay | Çoklu blok, ön satış |
| Villa | 30.000 | 7–12 ay | Düşük hacim, yüksek marj |
| Rezidans | 22.000 | 20–36 ay | Kule, ağır vinç |
| Lüks konut | 28.000 | 18–30 ay | Kalite/itibar şart |
| Ofis binası | 20.000 | 14–26 ay | Kiralama/satış |
| İş merkezi | 24.000 | 24–40 ay | Ticari talep |
| AVM | 26.000 | 30–48 ay | Faz 8+ |
| Otel | 32.000 | 30–48 ay | Faz 8+ |
| Fabrika | 9.000 | 10–20 ay | İhale/sanayi |
| Depo | 6.500 | 6–12 ay | Hızlı/düşük marj |
| Karma kullanım | Alt kata ticaret + üst konut | | Faz 8+ |

Kalite çarpanı: **Ekonomik ×0,85 · Standart ×1,00 · Premium ×1,25 · Lüks ×1,60.** Bu değerler *başlangıç* değeridir; Bölüm 13'teki denge simülatörü ile kalibre edilecektir.

**Proje bütçesi** = brüt alan × birim maliyet × kalite × bölgesel maliyet çarpanı × (1 + enflasyon etkisi) + yumuşak giderler (proje, ruhsat/harç ≈ %6,5).

### 4.3 İnşaat Aşamaları (18 adım)

İş yükü ve bütçe payı aşağıdaki gibidir (toplam %100). Her aşamanın **ön koşulu** (önceki aşama, malzeme, ekip uzmanlığı) vardır.

| # | Aşama | Bütçe payı | Gereken uzmanlık | Kritik malzeme/ekipman |
|---|---|---|---|---|
| 1 | Arsa seçimi | — (arsa bedeli ayrı) | — | — |
| 2 | Proje planlama | 0,5 | Proje yön. | — |
| 3 | Mimari tasarım | 2,0 | Mimar | — |
| 4 | Statik proje | 1,5 | İnşaat müh. | — |
| 5 | Elektrik/mekanik proje | 1,0 | Müh. | — |
| 6 | Ruhsat/izin | 1,5 | Proje yön./muhasebe | **Takvim gecikmesi riski** |
| 7 | Hafriyat | 3,0 | İşçi | Ekskavatör, kamyon |
| 8 | Temel/zemin | 10,0 | Demirci, kalıpçı | Beton, demir, pompa |
| 9–10 | Betonarme + kat yükselme (kat başına döngü) | 24,0 | Kalıpçı, demirci | Beton, demir, kule vinç |
| 11 | Duvar/bölme | 6,0 | Usta | Tuğla/gazbeton |
| 12 | Elektrik + su tesisatı | 9,0 | Elektrikçi, tesisatçı | Kablo, boru |
| 13 | Yalıtım | 4,0 | Usta | Yalıtım malz. |
| 14 | Sıva ve cephe | 9,0 | Usta, iskele | Çimento, kaplama |
| 15 | Pencere/kapı | 7,0 | Usta | Cam, alüminyum, kapı |
| 16 | İç dekorasyon | 17,0 | Usta | Seramik, parke, boya |
| 17 | Peyzaj/çevre | 2,5 | İşçi | — |
| 18 | Kontrol/teslim | 2,0 | Şantiye şefi | **Kalite denetimi** |

**İlerleme formülü (günlük):**
```
günlükİlerleme = Σ(atananEkipVerimi × deneyim × moral) × makineÇarpanı
                 × havaÇarpanı × malzemeUygunluğu(0/1) × güvenlikKesintisi
                 / aşamaİşYükü(adam-gün)
```
- **Malzeme yoksa** aşama durur (görsel: bekleyen işçiler, yanıp sönen uyarı).
- **Aşamalar üst üste binebilir** (kat 3 betonarme sürerken kat 1'de duvar) → gerçek inşaat ritmi, "kat başına lag" ile görselleşir.
- **Kalite**, her aşamada malzeme kalitesi × usta kalitesi × denetim ile birikir; son aşamada **Bina Kalite Puanı** olur ve satış fiyatı, şikâyet, garanti, itibarı etkiler.
- **Ruhsat** bir bekleme aşamasıdır: süre, belediye yoğunluğu + dosya kalitesi + rastgele gecikme olayına bağlıdır.

### 4.4 Malzeme ve Tedarik

17 malzeme (demir, beton, çimento, tuğla, gazbeton, kum, çakıl, cam, alüminyum, seramik, parke, boya, yalıtım, kablo, boru, kapı/pencere, çatı). Her biri için: birim, baz fiyat, **kalite kademesi (A/B/C)**, stok, depo kapasitesi.

**Tedarikçi** (her malzeme için 2–4 tane): fiyat çarpanı, kalite, **teslim süresi**, nakliye (mesafeye bağlı), **güvenilirlik** (%gecikme/eksik teslimat olasılığı), vade (peşin/30/60 gün), ilişki puanı (sadakat indirimi).

**Fiyat modeli:**
```
fiyat(t) = baz × malzemeEndeksi(t) × (1 + mevsim) × şok(t) × tedarikçiÇarpanı
malzemeEndeksi: enflasyon + ortalamaya dönen rastgele yürüyüş + arz şokları
```
- Ucuz malzeme: maliyet −%8…−15, **kalite puanı ↓, şikâyet/garanti riski ↑**.
- Stok tutmak nakit bağlar ve fiyat artışına karşı korur (stratejik karar); depo kapasitesi ve çalınma/bozulma küçük bir risktir.
- **Toplu alım** indirim sağlar; **sipariş verip bekleyen** malzeme "yolda" görünür (şantiyeye kamyon animasyonuyla gelir).

### 4.5 Personel

Kategoriler: İşçi, Usta, Kalıpçı, Demirci, Elektrikçi, Tesisatçı, Mimar, Mühendis, Şantiye Şefi, Proje Yöneticisi, Muhasebeci, Satış Danışmanı, Satın Alma Sorumlusu.

Her çalışan: `maaş, deneyim(0–100), verimlilik, uzmanlık, iş kalitesi, memnuniyet/moral, iş güvenliği bilinci`. 

- Deneyimli = pahalı ama hızlı + kaliteli + güvenli. Yetersiz kadro ilerlemeyi yavaşlatır.
- **Yönetici etkisi:** Şantiye şefi ekip verimini ve kaza riskini çarpar; proje yöneticisi aynı anda yönetilebilecek proje sayısını belirler; muhasebeci vergi/ceza hatasını azaltır; satın alma sorumlusu tedarikçi pazarlığı gücünü artırır; satış danışmanı satış hızını artırır.
- **Moral:** maaş adaleti, fazla mesai, kaza, şirket başarısı etkiler. Düşük moral → verim ↓, istifa riski ↑.
- **İş güvenliği:** Ekipman (baret, korkuluk, iskele denetimi) bütçesi + şef kalitesi + yorgunluk → günlük **kaza olasılığı**. Kaza = ilerleme durur, tazminat/ceza, moral ve itibar düşer. Güvenlik tasarrufu kısa vadede maliyet düşürür, uzun vadede tehlikelidir (açık takas).

### 4.6 Makine ve Ekipman

Kule vinç, mobil vinç, ekskavatör, kepçe, dozer, beton pompası, beton mikseri, forklift, kamyon, jeneratör, iskele, kompresör.

Her biri: satın alma bedeli, kiralama bedeli (günlük), yakıt, bakım, **kapasite**, **arıza olasılığı** (yaşla artar, bakımla azalır), değer kaybı.

- **Al vs. kirala:** Kiralama düşük risk, yüksek birim maliyet; alım sermaye ve bakım yükü getirir ama ihale yeterliliği (makine parkı) için gereklidir.
- Makine varlığı belirli aşamalarda **çarpan** sağlar (kule vinç yoksa 5+ kat betonarme yavaşlar).
- Arıza: onarım süresi boyunca makine çalışmaz; aşama yavaşlar veya durur.

### 4.7 Satış ve Müşteri

**Birim (daire/dükkân/ofis) özellikleri:** m², oda sayısı, kat, manzara, cephe yönü, kalite, konum, fiyat.

```
adilDeğer(m²) = bölgeBazFiyat × kaliteÇarpanı × katÇarpanı × manzara × cephe
günlükSatışOlasılığı = baz × bölgeTalebi × (fiyat/adilDeğer)^(−esneklik)
                       × markaGüveni × pazarlama × satışDanışmanı × faizEtkisi
```

**Satış yolları**
- **Peşin** (iskontolu, hemen nakit)
- **Taksitli** (daha yüksek fiyat, nakit zamana yayılır, **temerrüt riski**)
- **Kapora** (düşük, iptal edilebilir)
- **Ön satış** (inşaata başlamadan veya sırasında; finansman sağlar, **teslim gecikmesi cezası** doğurur)
- **Toplu satış** (yatırımcıya blok, iskonto)
- **Emlakçı** (%2–3 komisyon, satış hızı ↑, fiyat esnekliği ↓)

**Teslim sonrası:** müşteri memnuniyeti (kalite, teslim zamanı, fiyat-algı) → şikâyet olayları, **garanti** talepleri (kalite düşükse maliyetli), itibar ve tavsiye etkisi.

### 4.8 Banka, Kredi, Yatırım

| Ürün | Amaç | Not |
|---|---|---|
| Ticari kredi | Genel | Orta faiz |
| İnşaat kredisi | Proje | Proje aşamasına göre dilimli çekim |
| Makine kredisi | Ekipman | Makine teminatlı |
| Kısa vadeli finansman | Nakit köprüsü | **Pahalı**, tuzak olabilir |
| Ortak yatırım | Proje ortağı | Kâr payı verir |
| Yatırımcı bulma | Sermaye | İtibar şart |
| Hisse satışı | Büyük sermaye | Faz 8+, kontrol kaybı |

```
kredi faizi = politikaFaizi + bankaMarjı + (1000 − krediNotu)/k + risk primi(proje/teminat)
```
Taksit gününde nakit yoksa: gecikme faizi, **kredi notu ↓**, itibar ↓; üst üste geciken ödeme → icra/haciz (varlık satışı zorunlu) → toparlanma yolu: varlık sat, restrüktüre et (yüksek maliyetli), ortak al.

### 4.9 İhaleler

Kamu ve özel ihaleler (hastane, okul, belediye binası, yol/altyapı, köprü, fabrika, büyük konut).

**Değerlendirme puanı (örnek ağırlıklar):**
```
puan = fiyat(%40) + teknikYeterlilik(%25) + itibar(%15)
     + finansalYeterlilik(%10) + kapasite(personel+makine)(%10)
```
- Yeterlilik şartları **eleme** niteliğindedir (ör. min. kredi notu, min. makine parkı, benzer iş tecrübesi).
- Rakipler kendi stratejileriyle teklif verir; **en düşük teklif her zaman kazanmaz**. Aşırı düşük teklif kazandırır ama zarar ettirir (*kazananın laneti*).
- Kazanma sahnesi + sözleşme: teslim süresi, gecikme cezası, avans. Ödemeler **hakediş** (aşama bazlı, 30–60 gün gecikmeli) ile gelir → nakit akışı riski.

### 4.10 Şirket Gelişimi ve İtibar

**Seviyeler:** 1 Şahıs Müteahhit › 2 Küçük Firma › 3 Yerel Firma › 4 Bölge Firması › 5 Şehir Markası › 6 Çok Şehirli Firma › 7 Ulusal Firma › 8 Holding. Seviye = *net varlık + tamamlanan proje + itibar* eşiklerinin birleşimi (yalnızca para değil).

**Ofis kademeleri:** Küçük ofis (6 kişi) › Ofis katı (20) › Plaza katı (60) › Şirket binası (150+) › Şubeler (şehir başına).

**İtibar (0–100):** + zamanında teslim, + kalite, + memnuniyet, + finansal güvenilirlik, + kamu işi; − gecikme, − kaza, − borç ödememe, − şikâyet. İtibar → ihale, yatırımcı, satış hızı, kredi faizi, personel çekme gücü.

### 4.11 Rakip Şirketler (AI)

6–10 rakip, her birinin **strateji profili**: *Lüks uzmanı · Ekonomik konut · Büyük ticari · Dengeli · Agresif kaldıraçlı · Temkinli*. Haftalık karar döngüsü, fayda temelli:

- Arsa alır (nakit/risk iştahına göre), proje başlatır, fiyat belirler, satar, ihaleye teklif verir, kredi çeker.
- **Piyasada yer kaplarlar:** iyi arsalar kapılır, rakip arz bölgeyi doyurur, fiyat savaşı çıkar.
- Büyür, durağanlaşır veya **iflas eder** (varlıkları piyasaya düşer → oyuncuya fırsat).
- Rakipler **hile yapmaz:** oyuncuyla aynı kurallar ve aynı piyasa verisiyle işler (adil rekabet).

### 4.12 Makro Ekonomi ve Piyasa

```
Rejimler: Normal → Genişleme → Aşırı ısınma → Daralma → Kriz → Toparlanma
politikaFaizi : rejime bağlı ortalamaya dönen yürüyüş
enflasyon     : yıllık %, malzeme ve işçilik endeksini sürükler
güven         : olaylar + rejim → konut talebine çarpan
bölgeTalebi   = f(gelir, nüfus, faiz↑ → talep↓, güven, yeni arz↑ → talep↓)
```
Piyasa oyuncudan bağımsız evrilir. Kriz rejimi nadirdir, **ipucuyla gelir** (faiz yükselişi, güven düşüşü, haber bandı) — oyuncu hazırlanabilir.

### 4.13 Olaylar ve Karar Mekaniği

Olay şablonu (JSON): `koşul, ağırlık, soğuma, seçenekler[]`. Her seçenek: **maliyet, risk (olasılık dağılımı), avantaj, zaman etkisi** ve **gecikmeli sonuç** (N gün sonra tetiklenen).

**Örnek — "Beton zammı"**

| Seçenek | Maliyet | Risk | Avantaj | Zaman |
|---|---|---|---|---|
| Mevcut tedarikçiyle pazarlık | Ücretsiz (satın alma sorumlusu varsa daha iyi) | %40 başarısız | Başarılırsa zam yarıya iner | Sonuç 3 gün sonra |
| Başka tedarikçi ara | Küçük araştırma gideri | Yeni tedarikçi güvenilmez olabilir | Daha iyi fiyat/kalite | Sonuç 7 gün sonra |
| Zammı kabul et | +%X beton maliyeti | Yok | Sorunsuz akış | Anında |
| Projeyi yavaşlat | Gecikme cezası riski | Piyasa fiyatı düşmeyebilir | Beklenen düşüş | 2–4 hafta |

Olay kataloğu (başlangıçta ~40, hedef 80+): malzeme şoku, tedarikçi gecikmesi, makine arızası, iş kazası, kötü hava, ruhsat gecikmesi, müşteri şikâyeti, maliyet aşımı, piyasa daralması, rakip fiyat düşürmesi, finansman sorunu, teslim gecikmesi, denetim, hırsızlık, komşu şikâyeti, tarihi eser buluntusu, vb. Aynı olay sık tekrar etmez (soğuma + bağlama göre koşullu metin).

### 4.14 Harita ve Şehirler

8 şehir (İstanbul, Ankara, İzmir, Bursa, Antalya, Kocaeli, Gaziantep, Trabzon — kademeli açılır). Her şehir 4–8 ilçeye bölünür. Her bölgenin: arsa fiyatı, konut talebi, nüfus yoğunluğu, gelir seviyesi, altyapı, ulaşım, ticari potansiyel, rekabet. Şehir açma: şube + belirli seviye + yerel ruhsat/tanınırlık (düşük başlar).

### 4.15 Görevler ve Başarımlar

**Yönlendirici görevler:** ilk arsa, ilk bina, ilk daire satışı, ilk 10 milyon ₺ net varlık, ilk ihale, 3/5 şehir, X konut teslimi, "büyük inşaat şirketi kur".
**Kurallar:** görevler *öneri*dir (serbest oyun kısıtlanmaz); ödül küçük (itibar/nakit/kozmetik); "başarım" sayacı gerçek istatistiklerden türetilir.

---

## 5. Ekonomi Modeli

### 5.1 Örnek proje (kalibrasyon başlangıç noktası)

**Apartman, 400 m² arsa, KAKS 1,6, standart kalite**

| Kalem | Hesap | Tutar |
|---|---|---|
| Emsal alanı | 400 × 1,6 | 640 m² |
| Satılabilir alan | 640 × 0,85 | 544 m² |
| Brüt inşaat | 640 × 1,30 | 832 m² |
| Arsa | 400 × 12.000 | 4,80 M₺ |
| İnşaat | 832 × 14.000 | 11,65 M₺ |
| Yumuşak gider (%6,5 inşaat) | | 0,76 M₺ |
| Komisyon/pazarlama (%2) | | 0,41 M₺ |
| Finansman (ort.) | | ~0,45 M₺ |
| **Toplam maliyet** | | **~18,1 M₺** |
| Satış geliri | 544 × 38.000 | 20,7 M₺ |
| **Brüt kâr / marj** | | **~2,6 M₺ / ~%14** |

**Kalibrasyon hedefleri**
- Standart projede **hedef marj %10–18**; riskli/lüks segmentte %18–35 ama zarar olasılığı yüksek.
- Arsa, satış gelirinin **%22–30'u**.
- Satış ₺/m² ≈ inşaat ₺/m² × **2,5–3,0** (orta segment).
- Başlangıç sermayesi: **~6 M₺** (bir küçük proje + işletme sermayesi); küçük proje (müstakil/dubleks) ilk 12 oyun ayında **net varlığı ~+%15–30** büyütür. Oyuncu "birkaç işlemle zengin olmaz": ilk 10 M₺ net varlık hedefi **12–18 oyun ayı** civarında olmalı.

### 5.2 Aylık gider/gelir kalemleri

Maaşlar · ofis kirası · kredi taksit+faiz · sigorta · makine bakım+yakıt · vergi karşılığı · satış komisyonları · garanti ayrılığı. Gelirler: satış, hakediş, kira, ortaklık payı.

### 5.3 Vergiler (basitleştirilmiş)

Kurumlar vergisi **%25** (yıllık kâr; çeyreklik geçici vergi), tapu/harç giderleri, KDV fiyatlara gömülü kabul edilir (oyuncuya karmaşıklık yüklemeden). Muhasebeci varlığı vergi hatası/ceza olasılığını düşürür.

### 5.4 Finansal tablolar (ledger'dan türetilir)

Nakit akış tablosu (aylık), gelir-gider, bilanço özeti (varlık = nakit + arsa + devam eden proje değeri + makine + stok + alacaklar), proje bazlı kâr/zarar, **nakit yeterlilik süresi (runway)**, borç/özkaynak, faiz karşılama oranı. Grafikler: net varlık eğrisi, nakit akışı çubukları, gelir/gider pastası, proje başına planlanan-gerçekleşen kâr.

### 5.5 İflas ve toparlanma

- **Erken uyarı:** runway < 3 ay, kredi notu düşüşü, gecikmiş taksit → kırmızı HUD ve danışman uyarısı.
- **Toparlanma araçları:** arsa/makine sat, ön satış, ortak al, kredi restrüktürasyonu (pahalı), projeyi durdur, personel azalt.
- **İflas** yalnızca nakit < 0 **ve** satılabilir varlık/kredi yolu tükendiğinde. İflasta "Yeniden başla (miras: küçük itibar bonusu)" ve "Son 3 ayı geri yükle (otomatik kayıttan)" seçenekleri.

---

## 6. Ekran Listesi

| # | Ekran | Amaç |
|---|---|---|
| 1 | Açılış (logo animasyonu) | Marka duygusu |
| 2 | Ana menü | Devam/Yeni/Kayıtlar/Ayarlar/Başarımlar |
| 3 | Yeni oyun sihirbazı | Ad, amblem, patron geçmişi, şehir, zorluk |
| 4 | Kayıt yükle/kaydet | Slotlar, otomatik kayıtlar |
| 5 | Ayarlar | Ses, grafik kalitesi, titreşim, animasyon, dil |
| 6 | **Şirket Genel Bakış** (ana HUB) | Nabız + yapılacaklar |
| 7 | Harita (Türkiye → şehir → ilçe) | Bölge karşılaştırma, arsa arama |
| 8 | **Arsa Dosyası** | İnceleme + fizibilite |
| 9 | Arsa alım/satım | Satın alma yolları |
| 10 | Proje sihirbazı | Tip, kalite, tasarım, ekip |
| 11 | Bina tasarım stüdyosu | Cephe stili, çatı, renk (3D önizleme) |
| 12 | **Aktif Şantiye** (3D) | Ana oyun sahnesi |
| 13 | Proje detayı | Aşamalar, maliyet, kalite, dosya |
| 14 | Malzeme & Tedarik | Stok, sipariş, tedarikçiler |
| 15 | Personel | İşe alma, atama, moral |
| 16 | Makine parkı | Al/kirala/bakım |
| 17 | Satış merkezi | Birim listesi, fiyat, satış yolları, müşteri |
| 18 | Finans | Tablolar + grafikler |
| 19 | Banka & Yatırım | Krediler, ödeme planı, yatırımcı |
| 20 | İhale merkezi | Liste, teklif, sonuç |
| 21 | Piyasa & Rakipler | Endeksler, rakip karşılaştırma |
| 22 | Olay/Karar penceresi | Seçenekli kararlar |
| 23 | Şirket gelişimi | Seviye, ofis, şube, marka |
| 24 | Görevler & Başarımlar | Hedefler |
| 25 | Proje tamamlanma raporu | Teslim sahnesi |
| 26 | Seviye atlama / ihale kazanma sahnesi | Ödül anı |
| 27 | İflas/oyun sonu | Toparlanma seçenekleri |
| 28 | Haber bandı & bildirim merkezi | Piyasa/olay akışı |

**Navigasyon (yalnızca YATAY, bkz. Revizyon v0.2):** Alt sekme çubuğu: **Şirket · Harita · Şantiye · Piyasa · Finans** (+ "Daha fazla": personel, makine, banka, ihale, görev…). Üstte kalıcı HUD: şirket adı, kasa, itibar, ayarlar, tarih + hız kontrolleri. Detaylar yan/alt panellerle açılır; böylece 3D sahne hiç terk edilmez. Dikey düzen yoktur.

---

## 7. Görsel Stil Rehberi

### 7.1 Kimlik: "Şantiye Altını & Gece Mavisi"

Tema: premium, sıcak, mühendislik hassasiyeti. Koyu zeminde **şantiye sarısı** vurgu; proje paftası hissi için krem kağıt yüzeyler.

| Rol | Renk | Kullanım |
|---|---|---|
| Zemin (gece) | `#0E1621` | Uygulama arka planı |
| Yüzey 1 | `#16212E` | Kartlar |
| Yüzey 2 | `#1F2D3D` | Yükseltilmiş kartlar, sheet |
| Çelik/beton | `#8A949E` | İkincil metin, çizgiler |
| **Şantiye sarısı** | `#F5B700` | Birincil vurgu, CTA |
| Emniyet turuncusu | `#FF7A1A` | Uyarı, vinç, dikkat |
| Kâr yeşili | `#2ECC8F` | Pozitif |
| Zarar kırmızısı | `#E5484D` | Negatif/kritik |
| Proje paftası (krem) | `#F4EFE6` | Arsa dosyası, sözleşme, rapor yüzeyi |
| Mavi baskı (blueprint) | `#3E7BFA` | İmar zarfı, hat çizimleri |

Renk **anlam taşır** (yeşil/kırmızı sadece kâr/zarar için kullanılır). Karanlık tema birincil; açık "paftalı" tema opsiyonel (Faz 10). Kontrast WCAG AA.

### 7.2 Tipografi

- **Başlıklar:** *Barlow Condensed* (kalın, mühendislik levhası hissi), büyük harf yok — Türkçe İ/ı doğru render için büyük-harf dönüşümü `toLocaleUpperCase('tr')` ile.
- **Gövde/sayılar:** *Inter*, **tabular-nums** (finansal tablolarda hizalı).
- Para formatı: `4,8 M₺`, `12.450 ₺`; büyük sayılar animasyonlu sayaç (count-up).
- Yazı tipleri alt kümelenip yerel gömülür (çevrimdışı, Türkçe glifler dahil).

### 7.3 Bileşenler ve ikonlar

- **İkonlar:** tek ağırlık (2 px çizgi), sivri köşeli "mühendislik" stili, tek SVG sprite. Aşama ikonları (18) ve malzeme ikonları (17) özel çizilir.
- **Kartlar:** 16 px yarıçap, ince üst parlama çizgisi, hafif iç gölge → "metal levha" hissi.
- **Proje kartı:** canlı 3D küçük görsel (render-to-texture), 18 segmentli aşama çubuğu, kalan gün, kâr tahmini şeridi (yeşil/kırmızı), uyarı rozetleri.
- **Butonlar:** CTA = sarı dolu; ikincil = çerçeve; tehlikeli = kırmızı çerçeve. Minimum dokunma alanı **44 px**.
- **Grafikler:** ince çizgi, yumuşak gradyan dolgu, belirsizlik bandı (tahminler için), dokunmayla değer okuma.

### 7.4 3D ışık ve görünüm

Tek yönlü güneş + yarım küre ortam ışığı, ACES tonlama, hafif sis, vertex-color AO. **Gün döngüsü:** sabah soğuk → öğle parlak → altın saat → gece (inşaat spotları, pencere ışıkları). Yüksek kalitede yumuşak gölge haritası; düşükte "blob" gölge.

---

## 8. Ekran Tarifleri

### 8.1 Ana Menü

**Sahne.** Altın saatte, hafif sisli bir şehir silüeti. Ön planda yarı bitmiş, çelik iskeletli bir kule; üzerinde dönen iki kule vinç, aşağıda küçük şantiye ışıkları. Kamera **çok yavaş bir yarım-yörünge** yapar (60 sn döngü) ve cihaz eğimine/parmağa hafif parallax verir. Toz zerrecikleri ışıkta süzülür, uzakta bir vinç kancası sallanır.

**Yerleşim (portre):**
- Üst: küçük sarı kask amblemi + oyun logosu (sarı levha harfler, hafif metalik parlama).
- Orta alt: dikey buton yığını — **Devam Et** (en büyük kart: şirket adı, oyun tarihi, net varlık, son projenin küçük 3D görseli), **Yeni Oyun**, **Kayıtlar**, **Başarımlar**, **Ayarlar**.
- Alt köşe: sürüm numarası, ses/titreşim kısayolu.

**Etkileşim.** Butona basınca kart hafifçe basılır (scale 0,97 + titreşim), sahne kamerası yavaşça ilgili yöne kayar, geçiş sırasında 250 ms çapraz çözülme. "Devam Et", sahneyi doğrudan kayıtlı şirketin şantiyesine zoomlar (menü → oyun kesintisiz geçiş).

**Açılış animasyonu (≈6 sn, dokunarak geçilebilir):** siyah → kule vinç kancası ekranın tepesinden iner → logo harfleri kutu bloklar olarak tek tek yerleşir (her biri hafif "çınlama" ile) → son blokta ışık süpürmesi → şehir panoraması şafakla açılır.

### 8.2 Şirket Yönetimi (Genel Bakış)

```
┌─────────────────────────────────────┐
│ 12 Mar 2027  ⏸ ▶ ▶▶ ▶▶▶   ₺ 5,4M ★62 │  ← kalıcı HUD
├─────────────────────────────────────┤
│  ŞİRKET NABZI                       │
│  Net varlık  12,8 M₺   ▲ %3,2       │
│  ┌──────── sparkline ─────────┐     │
│  Nakit yeterlilik: ▓▓▓▓▓░░ 5,1 ay  │  ← runway göstergesi
│  Bu ay: +1,2M gelir  −0,9M gider    │
├─────────────────────────────────────┤
│  BUGÜNÜN İŞLERİ   (3)               │
│  ⚠ Beton zammı — karar bekliyor     │
│  🏗 Kat 4 betonarme tamamlandı       │
│  📞 2 daire için teklif geldi       │
├─────────────────────────────────────┤
│  AKTİF PROJELER  ← yatay kaydırma → │
│ ┌────────┐ ┌────────┐ ┌────────┐    │
│ │ [3D]   │ │ [3D]   │ │ + Yeni │    │
│ │ ▓▓▓░░  │ │ ▓░░░░  │ │ proje  │    │
│ │ 62 gün │ │ 140 gün│ │        │    │
│ └────────┘ └────────┘ └────────┘    │
├─────────────────────────────────────┤
│ Şirket Harita Şantiye Piyasa Finans │  ← alt sekme
└─────────────────────────────────────┘
```

- Üstte dünyaya açılan **dekoratif diorama şeridi**: şirket ofisi seviyesine göre değişen küçük 3D ofis + park halindeki makineler (oyuncu ne aldıysa görünür).
- "Bugünün işleri" yalnızca **eylem gerektiren** şeyleri gösterir; her satır doğrudan ilgili karara/ekrana gider.
- Runway çubuğu rengi: >6 ay yeşil, 3–6 sarı, <3 kırmızı + nabız animasyonu.

### 8.3 Arsa Satın Alma

**Akış:** Harita (ilçe ısı haritası: fiyat/talep/rekabet katmanları) → parsele dokun → **Arsa Dosyası**.

**Arsa Dosyası ekranı:**
- **Üst yarı: 3D parsel diorama.** Parsel sınırı kesikli sarı çizgi, çevre yollar, komşu low-poly binalar, ağaçlar, trafo. Parselin üstünde **mavi şeffaf "yapılaşma zarfı"** (taban/kat/emsal sınırı) — oyuncu imar haklarını *görür*. Kat sayısı kaydırıcısı değiştikçe zarf içinde örnek hacim büyür/küçülür.
- **Alt yarı: sekmeli panel** (krem "paftası" yüzeyi):
  1. **Özet** — adres, m², fiyat, fiyat/m² ve bölge ortalamasına göre ▲/▼.
  2. **İmar** — TAKS, KAKS, max kat, emsal alanı, satılabilir alan (hesaplı).
  3. **Zemin & Altyapı** — çubuklar; "Zemin etüdü yaptır (45.000 ₺ · 5 gün)" butonu gizli bilgiyi açar.
  4. **Çevre** — yoğunluk, yakın yatırımlar, rekabet, ulaşım.
  5. **Fizibilite** — bina tipi + kalite seç → tahmini maliyet, süre, gelir **aralığı (belirsizlik bandı)**, **başa baş satış fiyatı**, nakit ihtiyacı, risk skoru.
- Alt sabit çubuk: **Satın Al ▾** (Peşin · Kredi ile · Kat karşılığı · Ortaklık) ve **Pazarlık**.

**Satın alma animasyonu (≈2,5 sn):** tapu belgesi ekrana kayar → mühür basılır (ses + titreşim) → kamera parsele iner, **çit ve şantiye tabelası** çıkar (tabelada şirket logosu) → kasadan düşen para animasyonu → "Arsa tapuya işlendi" bildirimi.

### 8.4 Aktif Şantiye

**Yerleşim:**
- **Tam ekran 3D** (üst ~60 %): izometrik-perspektif karışık kamera.
  - **Tek parmak:** kamera döndür · **iki parmak:** yakınlaştır/kaydır · **çift dokunuş:** seçilen noktaya odak · **Ön ayar butonları:** Kuş bakışı / Yan / Vinç kabini / Seyir.
- **Üst katman (overlay):** proje adı, 18 ikonlu aşama şeridi (tamamlananlar altın, mevcut yanıp sönen), "Kat 6/12".
- **Dünyada uyarı balonları:** malzeme bitti ikonu vinç üstünde; kaza kırmızı çember; hakediş/satış para balonu. Dokununca ilgili panel açılır.
- **Alt panel (sürüklenebilir):** sekmeler **Genel · Ekip · Malzeme · Makine · Kalite & Güvenlik · Satış**. En üst satır: *Bugünkü ilerleme, bütçe/gerçekleşen, tahmini bitiş, tahmini kâr*.

**Şantiye yaşıyor:**
- Beton mikserleri kapıdan girer, pompa hortumunu bağlar, **beton döküm** (damlayan, kürelenen parçacıklar + titreşim).
- Kule vinç **dönüp kancayı indirir**, kalıp/demir bağları taşır; yük taşırken kablo gerilir.
- Hafriyat kamyonları yükleyip çıkar; ekskavatör kolu hareket eder.
- İşçiler (ekibin gerçek sayısı kadar, LOD ile sınırlı) farklı animasyon durumlarında: taşır, kaynak/ark ışığı, kalıp çakar, bekler (malzeme yoksa), mola.
- Hava: yağmur → işçiler siperlenir, ilerleme çarpanı düşer (görsel ile sim birbirine bağlı).

**Zaman atlatma (time-lapse):** 4× hızda gün/gece döngüsü akar, gölgeler yürür; bina saniyeler içinde katlanır. Doyurucu bir "izleme" anıdır.

### 8.5 İnşaat Tamamlanma

1. **Son kontrol:** denetçi ikonu, kalite çubuğu dolar (puan = kalite).
2. **Sahne dönüşümü (≈8 sn):** iskeleler üstten alta çözülür, kule vinç parçalanıp kamyona yüklenir, çit kalkar, peyzaj ağaçları büyüyerek belirir, gün batarken **pencerelerde ışıklar tek tek yanar**. Kamera yavaş 360° yörünge.
3. **İskân belgesi:** krem kâğıt, mühür darbesi, tonlu "tamamlandı" sesi.
4. **Rapor kartı:** Bütçe vs gerçek · Plan vs gerçek süre · **Kalite puanı** · Kazanılan itibar · Şirket kâr/zarar (**count-up**) · 1–5 yıldız. Sorun varsa dürüstçe belirtilir ("Kalite düşük: garanti riski ↑").
5. **Sonraki adım butonları:** *Satışa aç · Kirala · Hemen sat · Portföye al*.
6. Seviye/görev tetiklendiyse ardışık kutlama kartı (aşırı değil: tek sinematik dokunuş).

---

## 9. 3D Bina ve Şantiye Üretimi

### 9.1 Prosedürel bina üreticisi

Her projenin bir **tasarım tohumu** vardır; aynı tohum aynı binayı verir (kayıtta sadece tohum+parametreler saklanır, geometri değil).

| Parametre | Seçenekler |
|---|---|
| Taban formu | Dikdörtgen, L, U, T, bloklu (site), kule + podyum |
| Kat sayısı/yükseklik | İmar + proje; zemin kat farklı yükseklik |
| Cephe stili | Şerit pencere, balkon ritmi, cam perde, tuğla, taş kaplama, ahşap detay |
| Çatı | Eğimli kiremit, teras, kule tacı, saçak |
| Renk paleti | Tohumdan seçilen uyumlu 6 palet |
| Ek detay | Balkon korkulukları, tabela, çatı ekipmanı, giriş sundurması |
| Tipe özgü | Villa: havuz+bahçe; Rezidans: podyum+kule; Fabrika: tonoz çatı+bacalar; AVM: geniş kutu+cam atrium |

### 9.2 İnşaat aşaması → görsel eşlemesi

| Aşama | 3D görünüm |
|---|---|
| Hafriyat | Zemin çukura dönüşür (derinlik animasyonu), kamyon rampası |
| Temel | Radye plak + filiz demirleri, beton döküm |
| Betonarme/kat | **Kat kat**: kolon-kiriş iskeleti, kalıp kutuları, plak; yeni kat "kalıp → beton" ile yükselir |
| Duvar | Tuğla/gazbeton aşağıdan yukarı dolar |
| Tesisat/yalıtım | Cephe iskelede açık kablo/boru, sonra yalıtım paneli |
| Sıva/cephe | Cephe rengi/kaplaması aşamalı belirir (ilk soluk, sonra son görünüm) |
| Pencere/kapı | Cam bölmeler tek tek oturur |
| İç dekor | Pencerelerden görünen ışık/iç renk |
| Peyzaj | Ağaç, çim, yürüyüş yolu, ışıklandırma |

Katlar **farklı aşamalarda olabilir**: görsel olarak alt katlar kaplanmışken üst katlar hâlâ iskelet (gerçek inşaat siluet).

### 9.3 Performans stratejisi

- `InstancedMesh` (pencere, kolon, tuğla parçaları, işçi, ağaç); **statik geometri birleştirme** (bina kabuğu).
- Render-to-texture proje küçük görselleri **yalnızca değişince** yenilenir.
- **Kalite kademeleri:** *Düşük* (gölge yok, 30 FPS sınırı, az işçi/parçacık, düşük çözünürlük ölçeği) · *Orta* · *Yüksek* (yumuşak gölge, 60 FPS, tam parçacık). **Otomatik tespit:** ilk 5 sn FPS ölçülür, düşükse öneri sunulur.
- Sahnede sadece **görünen proje** simüle edilir görsel olarak; diğer projeler sadece sayıdır (sim her zaman çalışır, görsel sadece açıkken).
- Bellek: geometri/texture havuzları, `dispose()` disiplini, ekran dışı sahneler uyutulur.

---

## 10. Animasyon Planı

İlke: **anlamlı, kısa, atlanabilir.** Tüm hareket `prefers-reduced-motion` ve Ayarlar > Animasyon ile azaltılabilir. Easing: giriş `cubic-out`, çıkış `cubic-in`, vurgu hafif `back-out`. Kural: UI animasyonu ≤ 300 ms, "ödül anı" ≤ 3 sn, sinematikler atlanabilir.

| Animasyon | Tetikleyici | Süre | Not |
|---|---|---|---|
| Açılış logosu | Uygulama açılışı | ~6 sn | Dokunarak geç |
| Ekran geçişleri | Sekme/ekran | 250 ms | Yatay kayma + bulanık geçiş; 3D sahne arka planda süreklidir |
| Bottom sheet | Detay açma | 280 ms | Yay (spring) fiziği |
| Arsa satın alma | `BuyLand` | ~2,5 sn | Tapu → mühür → çit/tabela |
| Kat yükselmesi | Aşama ilerlemesi | sürekli | Sim durumundan türetilir, "sahte" yok |
| Vinç/makine | Aktif aşama | sürekli | Basit IK/yay hareketi, yük bağlıyken kablo gerilimi |
| İşçi | Ekip ataması | sürekli | 5 durum: taşı/çalış/bekle/mola/kaza |
| Para efekti | Gelir/gider | 700 ms | Gelir: yeşil altın damlacık HUD'a uçar; gider: kırmızı kısılır |
| Proje açılışı | `StartProject` | ~2 sn | Plan kâğıdı açılır → zemin çizilir → tabela |
| Bina tamamlanma | Aşama 18 | ~8 sn | Bölüm 8.5 |
| Daire satış bildirimi | `UnitSold` | 1,5 sn | Üstte "anahtar teslim" toast + bina penceresinde ışık yanar |
| Seviye atlama | Seviye eşiği | ~3 sn | Şirket rozeti yükselir, ofis diorama büyür |
| İhale kazanma | `TenderWon` | ~4 sn | Sözleşme mührü + kamera şantiye alanına uçar |
| Başarısızlık | İflas riski, ihale kaybı | 1–2 sn | Soluk renk, sade; abartı yok |

---

## 11. Ses ve Müzik

Önceki müzik çalışmasının fikirleri korunur: **prosedürel (Web Audio), kayıpsız geçişli, tek arka plan müziği, ayrı kanallar.**

- **Müzik durumları (adaptif):** Ana menü (sinematik, güven verici) · Yönetim (sakin, profesyonel) · Şantiye (hafif ritmik, mekanik ilham) · İhale/pazarlık (gerilimli, diplomatik) · Kriz (karanlık, gergin) · Başarı/seviye (parlak) · Yenilgi/iflas (ağır, duygusal). Durumlar arası **çapraz geçiş (crossfade)**, yoğunluk katmanları (ritim katmanı oyun hızına ve olay baskısına göre açılır).
- **Ambiyans:** şantiye gürültüsü (uzaktan matkap, çekiç, kamyon), şehir uğultusu, yağmur/rüzgâr.
- **SFX:** UI tıklama, mühür, beton döküm, vinç hidrolik, makine marşı, kasa/para (gelir-gider ayrı tını), satış zili, uyarı/alarm, başarı fanfarı, kaza uyarısı.
- **Ayarlar:** Müzik aç/kapa + seviye · Efekt aç/kapa + seviye · Ambiyans seviyesi · Titreşim aç/kapa · Animasyon azaltma · Tercihler kalıcı.
- **Mobil/iOS:** AudioContext ilk kullanıcı dokunuşuyla açılır; arka plana alınınca askıya alınır; sessiz mod davranışı test edilir.
- **Özgünlük:** tüm sesler kodla üretilir, telif sorunu yoktur.

---

## 12. Teknik Altyapı

### 12.1 Kayıt sistemi

- **IndexedDB**: 3 dönen **otomatik kayıt** (her ay başı + önemli olay sonrası) + N manuel slot.
- **Sürümlü şema** (`meta.version`) ve **migrasyon** fonksiyonları; eski kayıt yeni sürümde açılabilir.
- **Sağlama toplamı (CRC32)** + yapı doğrulama (şema kontrolü). Bozuk kayıt: otomatik önceki kayda dönme önerisi, "yine de aç (kurtarma modu)".
- **Boyut kontrolü:** geçmiş seriler **kademeli sıkıştırılır** (günlük → haftalık → aylık), `ledger` eski kayıtları aylık toplamlara indirgenir (özet saklanır), gzip (`CompressionStream` varsa).
- Kayıt asenkron ve atomik (önce yeni kayıt yazılır, sonra eskisi silinir).

### 12.2 Mobil ve performans

- Dokunmatik öncelikli, **44 px** hedef boyut, güvenli alan (`env(safe-area-inset-*)`), 100dvh.
- Tek canvas, `requestAnimationFrame` yalnızca görünürken; **sim 3D'den bağımsız** sabit adım.
- Bellek bütçesi (hedef): < 250 MB iPhone Safari'de; ana thread tick süresi < 4 ms (günlük tick), ağır hesaplar (rakip AI) parçalara bölünür.
- Gerekirse sim, **Web Worker**'a alınır (arayüz yapısı buna uygun tasarlanır).
- Çevrimdışı çalışır (service worker); font ve varlıklar gömülü.

### 12.3 Yaşam döngüsü

`visibilitychange/pagehide` → oyun duraklat + otomatik kayıt + ses askıya al. Geri dönünce kullanıcıya "Devam" gösterilir (süre atlaması yok).

---

## 13. Test ve Denge Planı

### 13.1 Test katmanları

1. **Birim testler:** formüller (arsa, emsal, faiz, ilerleme), ledger tutarlılığı, kayıt/yükleme gidiş-dönüş.
2. **Komut kayıt testi:** her UI butonu bir komuta bağlı mı? Boşta komut/buton var mı?
3. **Özellik testleri:** her fazın çıkış kriteri (Bölüm 14).
4. **Başsız simülasyon (Node):** botlar 20 oyun yılı oynar (aynı tohumlarla yüzlerce koşu).
5. **Cihaz testi:** iPhone Safari (WebGL, ses, kayıt, güvenli alan), orta seviye Android.

### 13.2 Denge botları ve hedefler

| Strateji botu | Beklenti |
|---|---|
| **Temkinli** (az kredi, küçük proje) | İflas < %5; yıl 1 net varlık +%10–25; yavaş ama güvenli |
| **Dengeli** | İflas ~%10–15; yıl 3'te seviye 4 |
| **Agresif kaldıraçlı** | Daralma rejiminde iflas **%35–45**; iyi dönemlerde 2× hızlı büyüme |
| **Lüks uzman** | Kâr/risk yüksek; talep şokuna hassas |
| **İhale odaklı** | Başlangıçta eleme yüzünden yavaş; seviye 5+ sonrası kararlı |
| **Hiç çalışmayan** | Giderler yüzünden eriyip batmalı (pasif zenginleşme yok) |

Ölçülen metrikler: net varlık eğrisi, **iflas oranı**, toparlanma oranı (borç sonrası), ortalama proje marjı, ortalama proje süresi, **ilk 10 M₺ net varlık süresi (hedef 12–18 ay)**, rakip hayatta kalma/ iflas dağılımı, malzeme endeksi varyansı, nakit sıkışma sıklığı. Sapma → parametre revizyonu → yeniden koşu. **Tek stratejinin baskın olmaması** başarı kriteridir.

### 13.3 Dayanıklılık

"Hatalardan dönme" için: otomatik kayıt, erken uyarı, kurtarma araçları (Bölüm 5.5). Sürpriz felaket hiç "ipucusuz" gelmemelidir.

---

## 14. Geliştirme Yol Haritası

Her faz **çalışır halde** bitirilir, bir sonrakine geçmeden **çıkış kriteri** doğrulanır ve önceki özellikler regresyon testinden geçer.

| Faz | Kapsam | Boyut | Çıkış kriteri |
|---|---|---|---|
| **1** | Mimari iskelet: çekirdek (store, komut, olay, RNG), zaman, kayıt altyapısı, veri yükleyici, başsız sim koşturucu, build | M | Komutla bir şirket oluşturulup 1 yıl simüle edilir, kaydedilip aynı sonuçla yüklenir |
| **2** | Ana menü + açılış + yeni oyun sihirbazı + ayarlar + tema/UI bileşen kütüphanesi | M | Menüden yeni oyun başlar; iPhone'da akıcı; tema tutarlı |
| **3** | Şirket + ekonomi: kasa, ledger, aylık giderler, makro rejimler, finans tabloları/grafikleri | M | Bilanço ledger ile tutarlı; makro rejimler döner; grafikler doğru |
| **4** | Arsa ve proje sistemi: harita, arsa dosyası, fizibilite, satın alma, proje sihirbazı | L | Arsa al → proje oluştur; hesaplar elle doğrulanan örnekle eşleşir |
| **5** | İnşaat simülasyonu + 3D: 18 aşama, prosedürel bina, kat kat yükselme, kamera | L | Tüm aşamalar sim'den çizilir; 5+ farklı bina görünümü; 30+ FPS orta cihaz |
| **6** | Personel, makine, malzeme/tedarik; vinç/işçi/kamyon animasyonları | L | Malzeme yoksa duran şantiye; ekip/makine ilerlemeyi etkiler |
| **7** | Satış + müşteri: birim üretimi, satış yolları, garanti, memnuniyet | M | İlk ilk daire satışı → nakit akışı; satış hızı fiyat/talep ile uyumlu |
| **8** | Banka, kredi, yatırımcı, ihaleler; hisse satışı; AVM/otel/karma tipler | L | Kredi ödeme planı doğru; geç ödeme not düşürür; ihale kazanılır/kaybedilir |
| **9** | Rakip AI + dinamik piyasa; olay/karar kataloğu genişler (40+) | L | Rakipler büyür/batar; oyuncu fırsat yakalar; olaylar tekrar etmiyor |
| **10** | Animasyon cilası, **ses/müzik**, atmosfer, ışık/hava, tamamlanma sahneleri | L | Bölüm 10 tablosundaki her animasyon çalışır; müzik durumları geçişli |
| **11** | Görevler, başarımlar, seviye sistemi, 8 şehir, ofis/şube | M | Uzun vadeli ilerleme yolu; serbest oyun kısıtlanmıyor |
| **12** | **Kapsamlı test, denge, optimizasyon, hata düzeltme**, kayıt dayanıklılığı, cihaz testi | L | Denge botu hedefleri tutar; 20 yıllık kayıt hızlı yüklenir; iPhone kabul listesi geçer |

*(Boyut: M ≈ orta, L ≈ büyük; takvim süreleri onay sonrası kapsama göre netleştirilir.)*

---

## 15. Riskler ve Açık Noktalar

| Risk | Önlem |
|---|---|
| Kapsam çok büyük | Faz disiplini, MVP sınırı, veri odaklı içerik |
| 3D'nin düşük cihazlarda yavaşlaması | Kademeli kalite, instancing, otomatik tespit |
| "Fotoğraf gerçekçiliği" beklentisi | Stilize premium yön baştan net; ileride varlık paketi eklenebilir |
| Ekonomi denge tuzağı (ya çok kolay ya imkânsız) | Başsız botlarla ölçülebilir hedefler |
| Karmaşıklık yorgunluğu | Her ekranda tek ana soru, varsayılan otomasyon (ör. otomatik sipariş kuralları, isteğe bağlı) |
| Safari ses/WebGL kısıtları | Erken cihaz testi (Faz 2), yaşam döngüsü yönetimi |
| Kayıt bozulması | Atomik yazma, sağlama toplamı, döner otomatik kayıt |

### Onayınızı beklediğim kararlar

1. **Çalışma adı:** "Müteahhit — Temelden Zirveye" uygun mu?
2. **Görsel yön:** Stilize premium low-poly (önerilen) uygun mu?
3. **Teknoloji:** TypeScript + Vite + Three.js + tek HTML çıktısı (sonra Capacitor) onaylı mı?
4. **Başlangıç sermayesi** (~6 M₺) ve para birimi ölçeği (gerçekçi TL büyüklükleri) uygun mu?
5. **MVP sınırı:** AVM/otel/hisse satışı/kamu mega-ihaleleri Faz 8'e ertelenmesi uygun mu?
6. **Repo:** Bu depo bir borsa botu; oyun için **ayrı yeni bir depo** açmanızı öneririm. Hangisini kullanalım?


---

## Revizyon v0.2 — Referans videodan çıkarımlar (Faz 2)

Kullanıcının daha önceki oyununun ekran kaydı incelendi. Çıkarımlar:

- **YALNIZCA yatay (landscape) oyun** (kullanıcı kararı). Arayüz ~390 px yüksekliğe sığacak şekilde tasarlanır. Dikey tutulursa "telefonu yatay çevirin" uyarısı çıkar ve oyun duraklar; yerel uygulamada yön kilitlenecek.
- **Görsel dil:** koyu petrol-lacivert zemin, altın sarısı birincil vurgu, yuvarlak köşeli kartlar, hap biçimli sekmeler, alt sekme çubuğu (ikon + etiket), üst HUD (kasa / ayar / tarih). Palet referansla uyumlu olacak şekilde petrol tonuna çekildi (`#07161d`, `#0e2430`, `#153242`); altın `#F5B700` korundu.
- **Ekran fikirleri (ileri fazlara not):** Türkiye haritası + şehir/ilçe kartları, proje kartları (illüstratif bina görseli + ilerleme çubuğu + durum rozeti), "Bugün" aksiyon kutuları, kâr/zarar grafiği kartı, borsa/ortaklık/yatırım sekmeleri, rakip ve piyasa panelleri. Bunlar Faz 3–9'da ilgili sistemle birlikte eklenecek (çalışmayan ekran bırakılmaz).
- Referanstaki oyundan **görsel varlık veya metin kopyalanmaz**; yalnızca düzen/bilgi mimarisi ilham olarak kullanılır.


---

## Uygulama notları — Faz 4 (arsa ve proje)

- **Arsa fiyatı artık değer yöntemiyle**: arsa, referans projede (apartman/ofis/fabrika, standart kalite) geliştiriciye bölgeye göre hedef kârı bırakacak seviyeye oturur (rekabet yüksekse daha dar). Böylece pahalı bölge otomatik kâr demek değildir; fırsat tip/kalite uyumundan, zeminden, gelişim potansiyelinden ve piyasa döngüsünden gelir. Ölçüm (`npm run sim:land`): en iyi seçenekte medyan marj ≈ %13, p10 ≈ %5, zarar eden ilan ≈ %8.
- **Bilgi mekaniği**: zemin gizlidir (etüt: ücretli, 5 gün); gelişim potansiyeli tahminidir (piyasa araştırması: 3 gün); değer aralığı araştırmadan sonra daralır. Plan, bilinmeyen zemini +%10 beklenti ve %0–%40 aralıkla gösterir.
- **Pazarlık**: satıcının gizli alt sınırı var (piyasa güveni yüksekken sertleşir); reddedilirse 3 gün kilit. İstenen fiyat her zaman kabul edilir. Tapu harcı %4.
- **Satış**: hızlı satış (%92) ve satışa koyma (haftalık alıcı şansı fiyata ve güvene bağlı, %2 komisyon).
- **Ertelenenler**: *kat karşılığı* ve *ortaklık* satış/yatırımcı sistemleri gerektirir → Faz 7–8. AVM/otel/karma tipler Faz 8. Şu an 3 şehir × 5 ilçe; Türkiye haritası ve 8 şehir Faz 11.
- **Harita** şematik ilçe haritasıdır (ısı katmanları: satış fiyatı, gelir, rekabet, gelişim).
- **Projeler** şimdilik "Taslak": tasarım bedeli ödenir; inşaat aşaması Faz 5.


## Uygulama notları — Faz 5 (inşaat simülasyonu ve 3D şantiye)

- **18 aşama** veri dosyasında (`data/stages.json`): maliyet payı, süre payı, ofis rolü (mimar/mühendis…), ruhsat, dış/iç iş. Proje planlanan süreyi (`expected.months × 30`) aşama süre paylarına böler; günlük ilerleme = ekip × hava × (ruhsatta rastgele gecikme).
- **Ekip etkisi**: saha ekibi (işçi, usta, kalıpçı, demirci, elektrikçi, tesisatçı; şantiye şefi ×1,15) projenin gerektirdiği kapasiteyle kıyaslanır. Ekipsiz = taşeron yavaşlığı (×0,25), yeterli = ×1,0, fazla = azalan getiriyle en çok ×1,3. Aktif projeler ekibi paylaşır.
- **Çifte işçilik maliyeti çözümü**: kendi ekibiniz, taşeron işçilik bedelinin (stage maliyetinin %35'i) karşıladığı kısmı tasarruf ettirir; maaşlarınız ayrıca ödenir. Böylece ekip kurmak anlamlıdır, aşırı büyük ekip küçük projede zarar ettirir (`npm run sim:build`).
- **Nakit**: maliyet tahakkuk eder, haftalık ödenir; kasa yetmezse iş durur (kırmızı banner), nakit gelince devam eder.
- **Zemin sürprizi**: etüt yoksa gerçek zemin hafriyat aşamasında ortaya çıkar (maliyet +/−, olay). **Hava**: şehir/mevsime göre açık/yağmur/kar; dış aşamalar yavaşlar.
- **Teslim**: kalite puanı (aşama kalitelerinin maliyet ağırlıklı ortalaması), itibar etkisi, rapor kartı. Satış: şimdilik **toplu satış** (piyasa değerinin %92'si); daire daire satış Faz 7.
- **3D**: her proje tasarım tohumundan farklı cephe stili (şerit, balkon, cam perde, tuğla, taş, metal), çatı (teras, eğimli, taç, sanayi), renk paleti ve blok sayısı alır. Aşamalar fizikseldir: hologram → hafriyat çukuru → radye + filiz → kat kat taşıyıcı → duvar → yalıtım → iskele → cephe/balkon → pencere → çatı ekipmanı → peyzaj; vinç bina ile yükselir ve sökülür. Gün/gece, yağmur/kar, kamera (döndür, sıkıştır-yakınlaştır, kaydır, çift dokunuş, ön ayarlar).
- **Ölçüm**: tam yaşam döngüsü arayüz testi (başlat → teslim raporu → toplu satış), nakit durması, 8 bina tipi galerisi.


## Uygulama notları — Faz 6 (temel düzen: personel, makine, malzeme/tedarik)

Kullanıcı kararı: bu fazda **temel düzen** kurulur, ince ayar ve hatalar sonra ele alınır.

- **Malzeme**: 17 malzeme (veri), 4 genel tedarikçi (fiyat, tedarik süresi, güvenilirlik, kalite A/B/C). Aşama malzeme ihtiyacı, bütçedeki malzeme payının plan fiyatlarıyla miktara çevrilmesidir. Stok yoksa ilerleme stokla sınırlanır, hiç yoksa iş durur ("Malzeme yok"). **Otomatik satın alma** (varsayılan açık): aktif aşamanın kalan ihtiyacı ve sonraki aşamanın ilk günleri tercih edilen tedarikçiden sipariş edilir; iki aylık sabit gider nakitte bırakılır. Manuel sipariş modalı var. Malzeme fiyatı = temel × makro endeks × malzemeye özgü aylık yürüyüş × tedarikçi; ani sıçrama haberi çıkar. Kalite: stoğun ağırlıklı ortalama kalitesi aşama kalitesine (±6 puan) yansır.
- **Makine**: 12 tip. Aşamalar gereken makineleri listeler. Sahip olunan çalışır makine yalnızca **yakıt**, olmayan **günlük kira** öder (kiralama otomatik). Satın alma/satış (%90), yıllık %12 değer kaybı (min %25), aylık bakım, kullanıldıkça artan **arıza** ihtimali (onarım ücreti + birkaç gün devre dışı).
- **Personel**: atama (proje ya da ortak havuz), **moral** (güvenlik politikası, kaza, nakit sıkıntısıyla değişir; verimi ±%15 etkiler). **İş güvenliği** politikası (düşük/normal/yüksek): sigorta maliyeti ↔ kaza olasılığı ↔ moral. **Kaza**: şantiye 3–9 gün durur, tazminat, moral ve itibar düşer.
- **Arayüz**: Operasyon sekmesi (Ekip, Malzeme, Makine, Politika); şantiye panelinde "Kaynaklar" sekmesi; durum bandı (nakit/malzeme/kaza).
- **Bilinen eksikler (sonraya)**: tedarikçiler malzemeye göre ayrışmıyor; makine kapasitesi tek proje/gün; tedarikçi ilişki puanı, vade, toplu alım indirimi yok; kaza türleri tek; ekip UI'ı sıkışık; **ekipsiz inşaat çok pahalı** (kira süresi uzar) → ilk proje için kolaylaştırma gerekebilir; denge ayarı Faz 12.


## Uygulama notları — Faz 7 (satış ve müşteri)

- **Daireler**: inşaat başlayınca projeden üretilir (tohumdan deterministik; toplam alan = satılabilir alan): kat, oda (1+1…5+1), m², manzara, cephe, kat/manzara/cephe çarpanları (ortalama 1).
- **Fiyat**: adil değer (bölge fiyatı × tip × kalite × bölge uyumu × konut endeksi × bina kalite puanı) × daire çarpanı × **politika çarpanı** (%80–%125). Günlük satış olasılığı: baz × talep (güven, reel faiz) × fiyat esnekliği `exp(−6·(çarpan−1))` × marka (itibar+memnuniyet) × satış danışmanı × emlakçı (+%30) × bölge rekabeti × tip hızı.
- **Ödeme yolları**: peşin (%4 iskonto), taksit (+%6, %25 peşin, 12 aylık alacak; %97 tahsil, 3 kaçırmada temerrüt → daire stoğa döner), kapora (%5, 14 gün; %75 satışa döner, aksi halde yarısı iade), **ön satış** (betonarmeden sonra, %10 indirim, %40 peşin, bakiye tesliminde; gecikme tazminatı), emlakçı (%2,5), **toplu satış** (kalan daireler adil değerin %92'si).
- **Teslim**: müşteri memnuniyeti (kalite, gecikme, fiyat/değer) → şirket memnuniyeti ve itibar. **Garanti**: 24 ay boyunca düşük kalitede daha sık ve pahalı talepler. Satılmamış dairelerin aylık gideri.
- **Muhasebe**: alacaklar varlık, ön satış avansları yükümlülük (satıştan sahte kâr doğmaz); tüm daireler satılınca proje kapanır, kâr kesinleşir.
- **Ölçüm** (`npm run sim:sales`): fiyatı artırmak kârı artırır ama satışı yavaşlatır; emlakçı ve taksit satışı hızlandırır. **Not**: faiz/kredi (Faz 8) gelmeden yüksek fiyat stratejisi aşırı avantajlı kalıyor; ön satışın değeri nakit kısıtı geldikçe ortaya çıkacak.


## Uygulama notları — 81 il haritası ve 3D çevre

- **Harita**: gerçek il (81) ve ilçe (973) sınırları (geoBoundaries, CC BY 4.0), sadeleştirilip gömülü. Türkiye görünümünde il seçimi (dokun, sürükle, kıstır-yakınlaştır, arama + liste), il görünümünde gerçek sınırlı ilçeler; katmanlar: satış fiyatı, gelir, rekabet, gelişim. Başlangıç şehri ücretsiz; diğer illerde **şube açma** (kademeye göre 0,5–3,5 M₺ + aylık şube gideri) ilanları ve işlemi açar. Kilitli illerin istatistikleri görünür.
- **İl verisi**: her ile bölge (7), kademe (1–4), fiyat çıpası, maliyet çarpanı, şube maliyeti; ilçeler alan/konumdan türetilen yoğunluk, gelir, altyapı, ulaşım, ticaret, rekabet, büyüme ve imar dağılımı alır; 74 önemli ilçe (turistik, merkez) ve 15 eski el ayarlı ilçe korunur. Denge (`npm run sim:geo`): her kademede en iyi seçenek medyan marjı %5–9, kârlı ilan payı %68–87.
- **İklim**: il bölgesine göre yağış çarpanı ve kar olasılığı (Doğu Anadolu karlı, Karadeniz yağışlı, Akdeniz kar yok) inşaat hızını etkiler.
- **3D çevre**: parselin yanları artık boş değil: yola bakan konut/apartman/park/bahçe hücreleri, yol, kaldırım ve şeritler, hareket eden arabalar, sokak lambaları, bölgeye göre bitki örtüsü (çam, palmiye, bozkır), dağlar ve karlı zirveler, bulutlar; kalite kademesine göre yarıçap/ağaç/araba sayısı. Bina paletleri zenginleştirildi.


## Uygulama notları — Faz 8 (banka, yatırımcı, ihale)

- **Krediler** (`sim/loans.ts`, 4 banka `data/banks.json`): ticari (12–60 ay annüite), inşaat (projeye bağlı faiz-only hat, bütçenin %70'ine kadar; nakit bitince otomatik çekilir, satış/hakediş gelirleri önce hattı kapatır; vade sonunda ticariye devir), makine (%20 peşinat, 36 ay), kısa vadeli (3 ay tek ödeme, en çok 3 M₺). Faiz = politika faizi + banka marjı + not primi + ürün primi (sabit). Limit = özkaynak × not çarpanı + itibar × 30 B₺.
- **Ödeme kaçırma**: %2 gecikme, not −40, itibar −1; 3 kaçırmada **haciz** (boş arsa %80, makine %70 değerinden satılır, not −150). Nakit eksi ve net değer eksiyse **iflas**: oyun durur, modal açılır. Proje bitişi nota +10 ekler. Yeniden yapılandırma: vade ×2, faiz +4 puan, %3 masraf.
- **Yatırımcı**: taslak/inşaat projesine bütçenin %20–50'si; kâr payı ≈ oran × (1,3 − itibar/400), kapanışta anapara + pay (zararda yalnızca anapara); iptalde iade. **Şirket payı**: net değer × oran × (0,8 + itibar/250), en çok %40; satılan pay oranında proje kârından temettü.
- **İhale** (`sim/tenders.ts`): şubesi olan illerde aylık 5 tür (okul, belediye, hastane, sanayi, büyük konut); şartlar itibar/not/tamamlanan proje/personel/makine. Puan: fiyat 40 + teknik 25 + itibar 15 + mali 10 + kapasite 10; yaklaşık maliyetin %80'i altı elenir (kazananın laneti); kamuda yaklaşık maliyet üstü geçersiz. Kazanınca avans %10, aşama başı hakediş (45 gün vadeli), gecikme cezası günde %0,1 (en çok %10), teminat iadesi. İşveren arsası net değere girmez.
- **Net değer** artık: nakit + varlıklar − banka borcu − yatırımcı fonu + ihale (hakediş, teminat, kazanılmamış avans). Save v8 (migrasyon v7→v8).
- **Ölçüm** (`npm run sim:bank`): orta seviye şirket yaklaşık maliyetin %88–96'sında teklifle ihalelerin %6–13'ünü ve %5–13 marjı yakalar; çok düşük teklif zarar ettirir.


## Uygulama notları — Faz 9 (rakipler, olaylar, dinamik piyasa)

- **Rakip firmalar** (`sim/rivals.ts`): 5 kalıcı firma (agresif/dengeli/temkinli), ev şehri, nakit, itibar, teknik güç. Aylık: oyuncunun şehirlerinde en değerli ilanlardan birini kapar (haber çıkar), proje başlatır (bölge arzı artar → satış şansı %15'e kadar düşer, fazla arzda konut endeksi hafif aşağı), teslim eder, ihalelere girer ve kazanır. Kriz/daralmada temkinliler geri çekilir; nakdi biten firma **iflas eder** ve ev şehrinde %18 indirimli 2 arsa piyasaya çıkar. Yeni girişimciler gelir. İhale rakipleri bu kalıcı firmalardır.
- **Olay kataloğu** (`data/events.json`, 48 olay; `sim/events.ts`): mevzuat, piyasa, doğa, insan, hukuk, güvenlik, fırsat, rakip, finans. Ayda %55 olasılıkla koşullara uyan bir olay ağırlıklı seçilir (aynı olay 300 gün tekrarlanmaz). Oyun durur; 2–3 seçimli karar penceresi sabit etkileri ve riskli seçimin olasılığını gösterir; 20 gün cevap verilmezse varsayılan seçim uygulanır. Etkiler: kasa (firma büyüklüğüne ölçekli), itibar, kredi notu, moral, memnuniyet, konut/arsa/malzeme fiyatı, şantiye durması, personel ayrılması, faiz, makine, rakip.
- **Dinamik piyasa**: ara sıra bir ilde gerçek talep dalgası (haber + endeks etkisi); rakip arzı ve olaylar endeksleri kaydırır. Save v9.


## Uygulama notları — Faz 10 (animasyon, ses, atmosfer)

- **Müzik kipleri**: aynı üretken müzik üç kipte çalar: `menu` (tam sinematik), `game` (oyun içi: daha ince pad/bas, seyrek arpej, nadir melodi, vuruş yok) ve `tense` (kriz, nakit eksi veya kaçırılmış taksit: koyu pad + yarım ton sürtünme, her ikinci barda vuruş, yoğun arpej). Kipler arası geçişte döngü yeniden başlamaz, ton değişir. Hub ayda bir ve açılışta kipi seçer.
- **Efektler**: `coin` (daire satışı, hakediş), `bell` (karar olayı), `alarm` (haciz, iflas), `fanfare` (bina satışı, ihale kazanma, iş teslimi), `hammer`, `whoosh`. **Ortam sesi**: şantiyede düşük uğultu + rastgele çekiç/metal sesi (yalnızca çalışırken), yağmurda yağmur gürültüsü; şantiyeden çıkınca kapanır, SFX ayarına uyar.
- **Arayüz hareketi**: kasa göstergesi değişimde sayaç gibi akar ve yeşil/kırmızı vurgulanır; sekme geçişleri kısa kayma-solma; bina satışı/ihale/teslimde konfeti (hareket azaltma açıksa yalnızca hafif parıltı).
- **3D atmosfer**: çalışan şantiyede açık havada yükselen yumuşak toz bulutları (yuvarlak sprite, toplamsal karışım; düşük kalitede kapalı).
- **Test**: sahte AudioContext ile kip yoğunlukları (game < menu < tense) ve determinizm doğrulanır.


## Uygulama notları — Faz 11 (görevler, başarımlar, seviyeler, ofis)

- **Seviyeler** (`data/progress.json`, `sim/progress.ts`): 8 unvan (Şahıs Müteahhit → Holding). Seviye; tamamlanan proje, net varlık, itibar ve şube sayısı şartlarıyla **otomatik** atlanır; ödül kredi notu +15, itibar +2, oyun duraklar, konfeti. Şirketin 81 ilin hepsinde şube açabilmesi Faz 7'den beri mümkündür; şehir şartları (2/3/5/8/12) büyümeyi yönlendirir.
- **Ofis**: açık komut `UpgradeOffice` (4 kademe; seviye 2/4/6 ve 0,3/1,5/6 M₺ taşınma masrafı); kapasite ve kira artar. Önceden seviye kapasiteyi belirliyordu; artık oyuncu seçimi.
- **Görevler**: 14 görevlik zincir (arsa → ekip → proje → teslim → satış → kredi → makine → ikinci şehir → ihale → kriz atlatma); ilk 3 açık görev ve ilerleme çubuğu Şirket sekmesinde; ödül nakit/itibar/not, gün ilerleyince verilir (komutla değil).
- **Başarımlar**: 30 başarım (proje, satış, servet, şehir, ihale, kalite, itibar, kredi, ortaklık, olay, kriz, süre, seviye); ödülsüz, kalıcı, kilitli/açık listesi.
- **Altyapı**: sayaçlar olaylardan türetilir (`track`); ölçütler tek `metric()` fonksiyonundan okunur; günlük kontrol 6 günde bir (performans). Save v10: eski kayıtlar sessizce işlenir (ödül/bildirim yok).


## Uygulama notları — Faz 12 (test, denge, optimizasyon, hata düzeltme)

- **Test**: 193 birim testi (çekirdek, kayıt/migrasyon v1→v10, ekonomi, arsa, inşaat, operasyon, satış, coğrafya, ayarlar, 3D bina, banka, ihale, rakip/olay, ses, ilerleme, uzun koşu). Uzun koşu testi 8 başlangıç şehrinde 4 yıl oynatır; kayıt gidiş-dönüşü, defter tutarlılığı ve sonluluk denetlenir. Performans bütçesi: 1 yıl simülasyon < 1,5 sn.
- **Bot oyuncu** (`npm run sim:bot -- [tohum] [yıl] [tutucu|dengeli|agresif|usta]`): 30 tohum × 10–15 yıl, 4 strateji: **hiç çökme, NaN veya defter tutarsızlığı yok**. Bot çıkarımları:
  - Proje başına kâr sağlıklı (mustakil/apartman %25–100 maliyet üstü getiri); sorun nakit yönetimi: nakit eksiye düşünce otomatik malzeme alımı durur, şantiyeler donar ve tek başına çıkış zorlaşır ("ölüm sarmalı"). Bu yüzden şantiye nakitsiz durunca Şirket ekranında çıkış yollarını (toplu satış, kredi, yatırımcı, arsa satışı) sayan uyarı eklendi.
  - Basit bot stratejileriyle 8–10 yılda iflas oranı yüksek (usta stratejisi ~%80, bazı tohumlarda 58 M₺+ net varlık): oyun "gerçekçi" zorlukta bilinçli olarak affetmez; insan oyuncu pazarlık, ekip/nakit planı ve satış politikasıyla botu geçer. Rahat zorluk ve ilk 2 yıl korumalı başlangıç mevcut.
- **Denge değişiklikleri**: başlangıç sermayesi 5–6,5 M₺ → 10–14 M₺ (tipik arsa 6–8 M₺ olduğundan ilk proje mümkün değildi); arsa hedef marjı gelirin %10–17'si → %20–30'u; ekip yetersizken hız tabanı 0,25 → 0,55 (alt yüklenici işi yavaşlatmaz, maliyeti zaten öder); sınır sınırı: `CITIES` 3 → 8 başlangıç şehri (Bursa, Antalya, Kocaeli, Konya, Adana).
- **Hata düzeltmeleri**: bildirim yığılması (Faz 9–10); ilçe etiketlerinin çakışması (büyükten başlayarak yerleştirme, çakışanlar yakınlaşınca görünür); başka şehirde başlayınca pazar ilanlarının üretilmesi.
- **Bilinen sınırlar**: planlanan süre gerçekleşenden ~%30 kısa (hava, tedarik, ekip gecikmeleri; plan yalnızca öngörü); dağlar hâlâ piramit biçimli; menü sahnesi yeni yeşilliği içermiyor; tablolar çok dar ekranda sıkışık; sesin kulakla dengesi yapılmadı; gerçek iOS/Android denemesi (Capacitor) henüz yapılmadı.


## Revizyon v0.3 — Bordo–antrasit renk teması

Petrol mavisi/altın/turkuaz arayüz kimliği kaldırıldı. Renkler `src/ui/theme.css` `:root` içinde merkezidir: zemin `#101113`, kart `#1D1E22`, ikincil yüzey `#27282D`, açık yüzey `#303137`, kenarlık `#38383F`, bordo `#A83246`, aktif `#C64252`, hover/pressed `#8F293B`, metin `#F2F0F0`/`#A5A1A3`/`#737277`. Durum renkleri ayrıdır (başarı `#3FBF8A`, uyarı `#E0A13A`, hata/kritik `#FF4D5A`, bilgi `#8E919B`). Eski `--gold/--gold2` ve `.btn.gold` adları uyumluluk için kalır ama bordoyu gösterir. Bordo yalnızca seçili/aktif sekme, ana işlem butonu, seçili şehir-ilçe, ilerleme çubukları ve kimlik öğelerinde kullanılır. Harita ilçeleri değere göre antrasit gri kademeleriyle boyanır, seçili il/ilçe bordodur. Oyun mantığı, kayıtlar ve yerleşim değişmedi.


## Revizyon v0.4 — Görsel zenginleştirme

- **Harita**: koyu antrasit zemin üzerinde renkli sıcaklık paleti (çivit → mor → gül → turuncu → sarı; düşük → yüksek). Seçili il/ilçe renginde kalır, çevresine bordo, yumuşak nabız atan çerçeve çizilir. İlçe seçilince/il açılırken görünüm akıcı yakınlaşır (`animateTo`); ilçe etiketleri çakışmaz. İl ve ilçe kartlarında **bölge siluet çizimi** gerçek veriden üretilir (yoğunluk → bina sayısı/yüksekliği, gelir → cephe rengi, ulaşım → metro hattı, düşük yoğunlukta ağaç).
- **Şirket ana ekranı**: şehir manzarası şirket seviyesine (siluet yoğunluğu ve yüksekliği), aktif şantiye sayısına (vinçler) ve ilk projenin ilerlemesine (yapım halindeki bina) bağlıdır; gün evresi (şafak/gündüz/akşam/gece) cihazın yerel saatine göredir; bulutlar ve vinç salınımı yalnızca Şirket sekmesinde ve hareket azaltma kapalıyken çalışır.
- **Olay pencereleri**: 9 kategori + özel olaylar için 72×48 SVG illüstrasyon (deprem, hava, iş kazası, faiz/kur, tedarik, ihale, personel, hukuk, güvenlik, fırsat, rakip, finans); giriş/çıkış animasyonu.
- **Grafikler**: çizgi çizilerek, çubuklar büyüyerek gelir; yeni "Gelir ve gider" çift çubuk grafiği ve "Net varlık gelişimi" çizgisi (ikisi de defter/geçmiş verisi). İlerleme çubukları yumuşak dolar.
- **Mikro animasyonlar**: kasa ve net varlık sayacı, para hareketinde +/− süzülen etiket, yeni proje geri bildirimi (damga sesi + sekme halkası), bildirim giriş/çıkışı, düğme bırakma yayı.
- **3D şantiye**: beton pompası (beton aşamalarında bom binaya uzanır, uçtan beton akar), gece makine farları ve çalışma lambası, hologram taslak bordo. **Bellek**: şantiyeden her çıkışta eski sahne tamamen serbest bırakılır (dokular, malzemeler, dinleyiciler); önceden her giriş ~0,8 MB JS belleği sızdırıyordu, şimdi ~0,1 MB.


## Revizyon v0.5 — Harita → arsa → proje akışı

- **Pazarlık**: reddedilen tekliften sonra aynı/düşük teklif 3 gün kilitli, **daha yüksek teklif (en çok %100) hemen verilebilir**; istenen fiyat her zaman kabul edilir. Ret sonrası kaydırıcı otomatik +5 puan yükselir.
- **Satın alma ekranı**: nakit yetersizse düğme "Nakit yetersiz" olur ve gereken tutarı gösterir; kilit/nakit durumu kaydırıcıyla anlık güncellenir. Tapu sonrası **proje sihirbazı otomatik açılır**.
- **Harita (il görünümü)**: 5 adımlı yol haritası (ilçe → arsa → satın al → proje başlat → şantiye); kilitli ilde "Şube aç" kartı en üstte; arsa kartlarında "Alabilirsiniz / Nakit yetersiz" etiketi, "Alabileceklerim" filtresi, "Sizin için öneri" (yalnızca pozitif marjlı); sahip olunan arsa kartında doğrudan "Proje başlat" / "Şantiye". Dokunmatikte sürükleme eşiği 10 px (tıklama kaçmaz).
- **Proje sihirbazı**: özet adımında finansman kontrolü (bütçenin %30'u ilk aylar için); yetmiyorsa Kredi/Yatırımcı kısayolları; "Öde ve şantiyeye git".


## Revizyon v0.6 — Premium görsel dönüşüm

- **Varlık sistemi** (`ui/art.ts`, tek kaynak): 13 meslek için moral yüzlü personel portresi, 12 makine çizimi (durum: çalışıyor/beklemede/arızalı), tür-kat-kalite-ilerlemeye göre bina küçük resmi (proje, ihale, galeri, teslim sahnesi), 18 kategorili altıgen rozet, halka göstergeler; başlık emojileri `EMOJI` tablosundan.
- **Genel Merkez** (`ui/hq.ts`): ana ekran manzarasına dokunulunca kesit görünüm — ofis seviyesi kat sayısını ve odaları (lobi, açık ofis, toplantı, yönetici katı, 4. seviyede helipad), personel sayısı masadaki çalışanları, **gerçek net varlık geçmişi** monitörleri, cihaz saatine göre gökyüzü/ışıklar, hareketli araçlar; tamamlanan proje galerisi; yükseltmede bina büyüme animasyonu.
- **Yönetim ekranları**: personel (portre, verim ve moral göstergeleri, işe alım/çıkarma geri bildirimi), makine (çizim, durum yüzdesi, kullanım/yakıt/bakım), proje kartları (bina küçük resmi, tahmini bitiş, gerçekleşen/kalan bütçe), ihale kartları (kapak, rekabet, sonuç skor çubukları), piyasa (halkalar, konut endeksleri, **malzeme fiyat geçmişi** `matHist`, rakip karşılaştırması, haber kartları), finans (borç/limit, kârlılık, likidite, özkaynak halkaları), başarımlar (rozetler, seviye merdiveni, koleksiyon).
- **Sinematik sahneler** (`ui/cinema.ts`): proje teslimi, ihale kazanma, şantiye tanıtımı; ayrıca büyük kayıp (aylık net varlık >%15 düşüş) uyarısı ve "nakit yeniden pozitif" bildirimi.
- **3D**: beton pompası, makine farları, **şantiye projektörleri** (orta: 1, yüksek: 2), aşamaya göre işçi görevleri (kazıda çukurda, betonda pompa çevresinde, cephede bina dibinde/iskelede, peyzajda dış alanda), sabah sisi, rüzgârla eğilen yağmur ve savrulan kar, yağmurda ıslak (koyu ve yansımalı) zemin; zemin malzemesi artık her karede değil yalnızca hava değişince yeniden derlenir.
- **Kalite**: otomatik kalite politikası saf fonksiyon (`render3d/quality.ts`): 2 düşük FPS penceresi → düşer; 10 sn iyi FPS → tavana kadar yükselir; 2 başarısız yükselmeden sonra yükseltme bırakılır.


## Revizyon v0.7 — Kolay başlangıç

- **Haritanın en üstünde tek dokunuşluk kart** (`startFlow.ts`): proje yoksa gerçek plan hesabıyla en yüksek marjlı alınabilir arsa+yapı önerisi ve **"Satın al ve başlat"** (arsa → proje → inşaat → şantiye, onay özetiyle); boş arsa varsa "Proje başlat"; taslak proje varsa "İnşaatı başlat".
- **İnşaatı başlat her yerde görünür**: şantiye ekranında büyük nabız atan düğme, proje kartında, haritadaki arsa kartında. Nakit düşük/ekip az ise onay öncesi uyarılır.
