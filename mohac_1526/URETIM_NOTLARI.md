# Mohaç Meydan Muharebesi – 1526 · Üretim Notları

## Yöntem
Ücretli video servisi kullanılmadı. Video tamamen kodla üretiliyor:

| Katman | Araç |
|---|---|
| Harita dokuları (Avrupa 1526, Mohaç ovası) | Python + NumPy/SciPy + Pillow (prosedürel kâğıt dokusu, kabartma, kıyı dalgaları, taramalar) |
| Kıyı çizgileri | `world-atlas` (Natural Earth 50m, kamu malı) |
| Kamera, 2.5B perspektif, birlikler, oklar, duman, portreler, yazılar | skia-python (perspektif homografi ile yatırılmış harita) |
| Müzik ve efektler | NumPy ile sentez (telifsiz) |
| Seslendirme | Kullanıcı tarafından sağlanacak (audio/s1–s6.mp3) |
| Montaj | ffmpeg |

Yeniden üretmek için: `./build.sh` (çıktı `mohac_1526.mp4`, 1920x1080, 30 fps).

## Sahne planı (gerçek zamanlar)
| Sahne | Zaman | İçerik |
|---|---|---|
| 1 – Giriş | 0:00 – 0:20 | 1526 Avrupa haritası, Osmanlı ilerleyiş oku, Macaristan vurgusu, başlık "MOHAÇ 1526 – İKİ SAATTE ÇÖKEN KRALLIK" |
| 2 – Savaş öncesi | 0:20 – 0:44 | Sultan Süleyman portresi, İstanbul→Belgrad→Petervaradin→Ösek→Mohaç rotası; II. Lajos portresi, Buda→Tolna→Mohaç; Szapolyai ve Hırvat birlikleri yetişemiyor |
| 3 – Ordular karşı karşıya | 0:44 – 1:04 | Ayrıntılı Mohaç ovası; iki ordunun dizilişi, tahmini sayılar, bataklık ve teras sırtı vurgusu, lejant |
| 4 – Mohaç Savaşı | 1:04 – 1:37 | Macar ağır süvari hücumu, Rumeli kuvvetlerinin çekilmesi, kralın ilerleyişi, top hattı ve yeniçeri ateşi, Anadolu karşı saldırısı, Bali Bey ve Hüsrev Bey'in kuşatması |
| 5 – Krallığın çöküşü | 1:37 – 1:55 | Dağılma, bataklığa kaçış, kralın Csele Deresi'ne kaçışı; ölümün tartışmalı olduğu notu |
| 6 – Sonuç | 1:55 – 2:13 | Savaş alanından uzaklaşma, askerî/siyasi sonuçlar, 1541 sonrası üçe bölünme haritası, "29 AĞUSTOS 1526 – MOHAÇ MEYDAN MUHAREBESİ" |

Altyazılar `altyazi_tr.srt` dosyasında. Videoya da gömülü.

## Seslendirme
Metin `SESLENDIRME_METNI.md` dosyasında. MP3'ler `audio/s1.mp3` … `audio/s6.mp3` olarak eklenip `./build.sh` çalıştırıldığında
zamanlamalar, kamera hareketleri ve altyazılar sese göre kendiliğinden yeniden hesaplanır.

## Tarihî doğruluk notları
- **Tarih ve yer:** 29 Ağustos 1526, Mohaç'ın güneyindeki ova, Tuna'nın batı kıyısı.
- **Asker sayıları:** Kesin değil, videoda aralık olarak verildi. Macar ordusu yaklaşık 25–30 bin; Osmanlı ordusu için tahminler 50–100 bin arasında. Çağdaş kaynaklardaki daha yüksek rakamlar abartılı kabul edilir.
- **Savaşın süresi:** "Kaynaklara göre yaklaşık iki saat" olarak verildi.
- **II. Lajos'un ölümü:** Yaygın anlatı, Csele Deresi'ni geçerken boğulduğu yönünde. Videoda bu, "kaynakların çoğuna göre" diye sunuldu ve ayrıntıların tartışmalı olduğu ayrıca belirtildi.
- **Taktik ayrıntılar:** Birlik dizilişi, Rumeli kuvvetlerinin çekilmesinin kasıtlı olup olmadığı ve kuşatmanın yönü şematik bir yeniden kurgudur. Videodaki savaş alanı haritası da gerçek topografya değil, şematiktir.
- **1541 sonrası bölünme:** Haritadaki sınırlar yaklaşıktır.

### Bu çalışmada taranan kaynaklar
- Nagy L. István, "A magyar hadsereg a mohácsi csatában" – https://real.mtak.hu/246186/1/Nagy-L.Istvan-Amagyarhadseregamohacsicsataban.pdf
- Honvédelem.hu, "The Battle of Mohács" – https://honvedelem.hu/hirek/the-battle-of-mohacs-august-29-1526-1526.html
- Battle of Mohács (Wikipedia, kaynakçasıyla) – https://en.wikipedia.org/wiki/Battle_of_Moh%C3%A1cs

## Portreler
Portreler stilize siluet madalyonlardır; gerçek yüz benzerliği iddia etmez. Kamu malı portreler (örneğin Süleyman için
Tiziano atölyesi, Lajos için Hans Krell) bu oturumda indirilemedi. Bu portreler eklenmek istenirse `gfx.portrait()` içinde
görsel dosyası kullanılacak şekilde değiştirilebilir.

### Ayrıntılı doğrulama için önerilen akademik kaynaklar (bu oturumda okunmadı)
- Brodarics István, *De conflictu Hungarorum cum Solymano* – çağdaş bir tanıklık.
- Perjés Géza, *The Fall of the Medieval Kingdom of Hungary: Mohács 1526 – Buda 1541* (1989).
- Ágoston Gábor, *The Last Muslim Conquest* (2021).
- Feridun Emecen'in Kanuni dönemine dair çalışmaları ve Kemalpaşazade'nin *Mohaçnâme*'si – Osmanlı tarafının anlatısı.
