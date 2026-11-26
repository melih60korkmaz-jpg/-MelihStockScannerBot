/* ===== KAFE ZİNCİRİ — simülasyon motoru (DOM'suz, test edilebilir) ===== */
var AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
var AYLAR_UZUN = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
/* Yeşilvadi şehrinin mahalleleri (kurgusal). yog: yoğunluk 1-10, zen: gelir düzeyi 1-5, kira: aylık baz TL */
var ILCELER = [
  {id: 'eski', ad: 'Eski Kent', ikon: '🏛️', yog: 5, zen: 2, ogr: 0.1, tur: 0.5, kira: 38000, not: 'Sakin, uygun kira. Turist ve emekli ağırlıklı.'},
  {id: 'uni', ad: 'Üniversite', ikon: '🎓', yog: 6, zen: 2, ogr: 1, tur: 0.1, kira: 42000, not: 'Öğrenci akını; fiyata duyarlı, kalabalık.'},
  {id: 'site', ad: 'Yeni Site', ikon: '🏘️', yog: 4, zen: 3, ogr: 0.1, tur: 0, kira: 36000, not: 'Aileler, hafta sonu yoğun.'},
  {id: 'pazar', ad: 'Pazar Yeri', ikon: '🛒', yog: 6, zen: 2, ogr: 0.2, tur: 0.2, kira: 40000, not: 'Hareketli çarşı; sabahları dolar.'},
  {id: 'park', ad: 'Park Çevresi', ikon: '🌳', yog: 5, zen: 3, ogr: 0.2, tur: 0.3, kira: 46000, not: 'Hafta sonu ve yaz aylarında canlı.'},
  {id: 'carsi', ad: 'Çarşı Merkezi', ikon: '🏬', yog: 9, zen: 3, ogr: 0.3, tur: 0.6, kira: 95000, not: 'Çok yoğun ama kira pahalı.'},
  {id: 'is', ad: 'İş Merkezi', ikon: '🏢', yog: 8, zen: 4, ogr: 0, tur: 0.1, kira: 88000, not: 'Ofis çalışanları; hızlı servis, yüksek sepet.'},
  {id: 'sahil', ad: 'Sahil', ikon: '🏖️', yog: 7, zen: 4, ogr: 0.2, tur: 1, kira: 82000, not: 'Yazın patlar, kışın durulur.'},
  {id: 'sanayi', ad: 'Sanayi Sitesi', ikon: '🏭', yog: 3, zen: 1, ogr: 0, tur: 0, kira: 24000, not: 'Ucuz kira, düşük bütçeli müşteri.'},
  {id: 'hava', ad: 'Havalimanı', ikon: '✈️', yog: 7, zen: 5, ogr: 0, tur: 1, kira: 120000, not: 'Yolcular; en yüksek fiyatı öder.'}
];
/* Menü: pay = sepet payı, mal = baz maliyet TL, fiyat = baz pazar fiyatı TL, mevsim: 'soguk'|'sicak'|null */
var URUNLER = [
  {id: 'turk', ad: 'Türk Kahvesi', ikon: '☕', fiyat: 55, mal: 12, pay: .15, mevsim: 'sicak', kal: 18000},
  {id: 'filtre', ad: 'Filtre Kahve', ikon: '🫖', fiyat: 65, mal: 14, pay: .20, mevsim: null, kal: 25000},
  {id: 'latte', ad: 'Latte', ikon: '🥛', fiyat: 95, mal: 22, pay: .22, mevsim: null, kal: 35000},
  {id: 'cay', ad: 'Çay', ikon: '🍵', fiyat: 30, mal: 5, pay: .18, mevsim: 'sicak', kal: 12000},
  {id: 'cheese', ad: 'Cheesecake', ikon: '🍰', fiyat: 120, mal: 38, pay: .10, mevsim: null, kal: 40000},
  {id: 'sandvic', ad: 'Sandviç', ikon: '🥪', fiyat: 110, mal: 40, pay: .08, mevsim: null, kal: 38000},
  {id: 'soguk', ad: 'Soğuk Kahve', ikon: '🧊', fiyat: 105, mal: 24, pay: .07, mevsim: 'soguk', kal: 30000}
];
var TEDARIK = {ucuz: {ad: 'Ucuz çekirdek', mal: 0.88, memn: -6, ac: 'Maliyet düşer ama lezzet düşer.'}, orta: {ad: 'Standart çekirdek', mal: 1, memn: 0, ac: 'Dengeli kalite ve fiyat.'}, premium: {ad: 'Premium çekirdek', mal: 1.22, memn: 6, ac: 'Pahalı ama müşteri farkı hisseder.'}};
var KAMPANYALAR = [
  {id: 'afis', ad: 'Afiş ve broşür', ikon: '📄', maliyet: 15000, sure: 1, trafik: .06, marka: .3, ac: 'Mahalleye duyur.'},
  {id: 'sosyal', ad: 'Sosyal medya reklamı', ikon: '📱', maliyet: 30000, sure: 2, trafik: .09, marka: .6, ac: 'Gençlere ulaş.'},
  {id: 'sadakat', ad: 'Sadakat kartı', ikon: '💳', maliyet: 60000, sure: 6, trafik: .05, marka: .15, memn: 2, ac: 'Müşteri geri gelsin.'},
  {id: 'influ', ad: 'Fenomen anlaşması', ikon: '🤳', maliyet: 90000, sure: 1, trafik: .20, marka: 1.5, risk: .22, ac: 'Büyük etki ama bazen tutmaz.'},
  {id: 'radyo', ad: 'Radyo ve TV', ikon: '📻', maliyet: 250000, sure: 2, trafik: .14, marka: 2, ac: 'Marka bilinirliği için.'}
];
var SEZON_TRAFIK = [.94, .94, 1, 1.02, 1.05, 1.05, 1.02, 1, 1.04, 1.05, 1.0, .96];
var BARISTA = {maas: 33000, kap: 900}, GARSON = {maas: 27000, kap: 600};
var MAAS_ADIM = [.9, 1, 1.15];

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rnd(S) { S.rs = (S.rs * 1664525 + 1013904223) >>> 0; return S.rs / 4294967296; }
function ilceBul(id) { for (var i = 0; i < ILCELER.length; i++) if (ILCELER[i].id === id) return ILCELER[i]; return null; }
function urunBul(id) { for (var i = 0; i < URUNLER.length; i++) if (URUNLER[i].id === id) return URUNLER[i]; return null; }
function enflasyonCarpan(S) { return Math.pow(1 + S.enf / 100, S.ay / 12); }
function ayAdi(S) { return AYLAR[(S.basAy + S.ay) % 12]; }
function yil(S) { return 2027 + Math.floor((S.basAy + S.ay) / 12); }
function tarihYaz(S) { return ayAdi(S) + ' ' + yil(S); }
function para(v) { var a = Math.abs(v), s = a >= 1e6 ? (a / 1e6).toFixed(2).replace('.', ',') + ' M' : a >= 1e4 ? Math.round(a / 1000) + ' B' : Math.round(a).toLocaleString('tr-TR'); return (v < 0 ? '−' : '') + s + ' ₺'; }

function yeniSube(S, ilceId, ad) {
  var il = ilceBul(ilceId); S.sn = (S.sn || 0) + 1;
  return {id: S.sn, ilce: ilceId, ad: ad || il.ad + ' Şubesi', koltuk: 20, dekor: 1, hijyen: 70, barista: 2, garson: 1, maas: 1, moral: 70, kira: il.kira, ac: S.ay, son: null, gecmis: []};
}
function yeniOyun(o) {
  var S = {v: 1, rs: ((o.seed || 20270101) | 0) >>> 0, ad: o.ad || 'Fincan Kahve', ay: 0, basAy: 0, kasa: 320000, marka: 22, borc: 0, enf: 38, tedarik: 'orta', kamp: [], trafikB: null, olayMemn: 0, gecmis: [], hedef: {}, log: [], bitti: false, ifasAy: 0, sn: 0, kuyruk: []};
  S.menu = {}; URUNLER.forEach(function (u) { S.menu[u.id] = {fiyat: 1, kalite: 1, aktif: true}; });
  var il = ilceBul(o.ilce || 'eski'); S.subeler = [yeniSube(S, il.id, S.ad)]; S.kasa -= 120000 + il.kira * 1.0;
  return S;
}
function sezonCarpan(u, m) { var yaz = m >= 5 && m <= 8, kis = m <= 1 || m === 11; if (u.mevsim === 'soguk') return yaz ? 1.9 : kis ? .35 : 1; if (u.mevsim === 'sicak') return yaz ? .85 : kis ? 1.2 : 1; return 1; }
function kampEtki(S) {
  var t = 0, m = 0, mm = 0; S.kamp.forEach(function (k) { var d = KAMPANYALAR.filter(function (x) { return x.id === k.id; })[0]; if (!d || k.bit <= S.ay || k.bos) return; t += d.trafik; m += d.marka; mm += d.memn || 0; });
  return {trafik: t, marka: m, memn: mm};
}
function subeHesapla(S, s) {
  var il = ilceBul(s.ilce), F = enflasyonCarpan(S), m = (S.basAy + S.ay) % 12, ke = kampEtki(S), tb = S.trafikB && S.trafikB.bit > S.ay ? S.trafikB.v : 0;
  var tur = il.tur * (m >= 5 && m <= 8 ? 1.5 : 1);
  var trafik = il.yog * 560 * (0.45 + S.marka / 90) * SEZON_TRAFIK[m] * (1 + 0.15 * tur) * (1 + 0.07 * (s.dekor - 1)) * (1 + ke.trafik + tb) * (1 - (S.rakipBaski || 0) * 0.2);
  var koltukKap = s.koltuk * 100, persKap = s.barista * BARISTA.kap + s.garson * GARSON.kap, kap = Math.min(koltukKap, persKap);
  var musteri = Math.round(Math.min(trafik, kap)), doluluk = trafik / Math.max(1, kap);
  var e = 1.7 - 0.22 * il.zen, sepet = 1.7 + 0.1 * (il.zen - 2), sum = 0, w = {};
  URUNLER.forEach(function (u) { var mu = S.menu[u.id]; if (!mu.aktif) return; w[u.id] = u.pay * sezonCarpan(u, m); sum += w[u.id]; });
  var gelir = 0, mal = 0, adet = 0, tedMal = TEDARIK[S.tedarik].mal, fiyatOrt = 0, fw = 0, kalOrt = 0;
  URUNLER.forEach(function (u) { var mu = S.menu[u.id]; if (!mu.aktif) return; var p = mu.fiyat, el = clamp(Math.exp(-e * (p - 1)), .3, 1.7), qb = 1 + 0.06 * (mu.kalite - 1), n = musteri * sepet * (w[u.id] / sum) * el * qb * (u.id === 'sandvic' && il.zen < 2 ? .8 : 1);
    adet += n; gelir += n * u.fiyat * F * p; mal += n * u.mal * F * tedMal * (1 + 0.12 * (mu.kalite - 1)); fiyatOrt += p * u.pay; fw += u.pay; kalOrt += mu.kalite * u.pay; });
  fiyatOrt /= fw; kalOrt /= fw;
  var maas = (s.barista * BARISTA.maas + s.garson * GARSON.maas) * MAAS_ADIM[s.maas] * F, kira = s.kira * F, fatura = (9000 + s.koltuk * 260 + (s.dekor - 1) * 3000) * F, temizlik = 3500 * F * (1 + (s.hijyen - 60) / 200);
  var memn = 62 + clamp(-26 * (fiyatOrt - 1), -9, 9) + TEDARIK[S.tedarik].memn + (kalOrt - 1) * 5 - clamp((doluluk - 1) * 22, 0, 26) + (s.hijyen - 60) * 0.15 + (s.dekor - 1) * 3 + (s.moral - 60) * 0.1 + ke.memn + S.olayMemn;
  memn = clamp(memn, 0, 100);
  return {gelir: gelir, mal: mal, maas: maas, kira: kira, fatura: fatura + temizlik, musteri: musteri, doluluk: doluluk, memn: memn, adet: adet, trafik: trafik, kap: kap};
}
function ayOzeti(S) { var r = {gelir: 0, gider: 0, musteri: 0, memn: 0, subeler: []}; S.subeler.forEach(function (s) { if (!s.acik && s.acik !== undefined) return; var h = subeHesapla(S, s); r.gelir += h.gelir; r.gider += h.mal + h.maas + h.kira + h.fatura; r.musteri += h.musteri; r.memn += h.memn; r.subeler.push(h); }); r.memn = r.subeler.length ? r.memn / r.subeler.length : 0; return r; }

/* ---------- Olay kartları ---------- */
function O(ad, fx, msg, risk) { return {ad: ad, fx: fx, msg: msg, risk: risk || null}; }
var OLAYLAR = [
  {id: 'mufettis', ikon: '🧑‍⚕️', baslik: 'Sağlık Müfettişi', metin: 'Belediye sağlık ekibi ani denetime geldi.', kosul: function (S) { return S.ay >= 2; }, sec: [O('Hızlı temizlik ekibi çağır (−12 B ₺)', {kasa: -12000, hijyen: 10}, 'Mutfak pırıl pırıl; denetçi memnun ayrıldı.'), O('Olduğu gibi göster', {}, 'Denetim sonuçlandı.', [{p: 0.55, fx: {kasa: -35000, marka: -2}, msg: 'Eksikler yüzünden ceza kesildi ve haber çıktı.'}])]},
  {id: 'zam', ikon: '📈', baslik: 'Kahve Fiyatları Fırladı', metin: 'Dünya piyasasında çekirdek fiyatı arttı. Tedarikçi yeni liste gönderdi.', kosul: function (S) { return S.ay >= 3 && S.tedarik !== 'ucuz'; }, sec: [O('Zammı kabul et', {kasa: -20000}, 'Maliyetin biraz arttı, kalite korundu.'), O('Ucuz tedarikçiye geç', {tedarik: 'ucuz', marka: -.5}, 'Maliyet düştü ama bazı müşteriler farkı fark etti.'), O('Müşteriye yansıt: fiyatları artır', {fiyat: .05}, 'Fiyatlar %5 arttı; tepki ılımlı.')]},
  {id: 'viral', ikon: '🎬', baslik: 'Viral Video', metin: 'Bir müşterinin çektiği kısa video sosyal medyada hızla yayılıyor.', kosul: function (S) { return S.ay >= 2 && S.marka > 15; }, sec: [O('Videoyu paylaş, ekibe teşekkür et', {trafik: .12, trafikSure: 2, marka: 1.5}, 'İki ay boyunca kuyruklar uzadı!'), O('Dokunma', {marka: .3}, 'Video kendi hâlinde yayıldı.')]},
  {id: 'kira', ikon: '🏠', baslik: 'Kira Zammı', metin: 'Ev sahibi bir şubenin kirasını %15 artırmak istiyor.', kosul: function (S) { return S.ay >= 6 && S.subeler.length >= 1; }, sec: [O('Kabul et', {kiraZam: .15}, 'Kira arttı, anlaşma sürüyor.'), O('Pazarlık et', {}, 'Pazarlık görüşmesi yapıldı.', [{p: 0.5, fx: {kiraZam: .15}, msg: 'Anlaşamadınız; zam aynen uygulandı.'}, {p: 0.5, fx: {kiraZam: .06}, msg: 'Zam %6 ile sınırlandı.'}])]},
  {id: 'rakip', ikon: '🥊', baslik: 'Rakip Zincir Açıldı', metin: 'Büyük bir kafe zinciri mahalleye yeni şube açtı. İndirim kampanyası yapıyor.', kosul: function (S) { return S.ay >= 5; }, sec: [O('Fiyatları %5 indir', {fiyat: -.05, rakip: .05}, 'Müşteri kaybı sınırlı kaldı.'), O('Kaliteyle farklılaş (−25 B ₺)', {kasa: -25000, memn: 3, marka: .5, rakip: .08}, 'Müşteriler kalitene sahip çıktı.'), O('İzle, bekle', {rakip: .15}, 'Trafiğin bir kısmı rakibe gitti.')]},
  {id: 'ariza', ikon: '🔧', baslik: 'Kahve Makinesi Bozuldu', metin: 'Espresso makinesi öğle yoğunluğunda arıza verdi.', kosul: function (S) { return S.ay >= 3; }, sec: [O('Acil tamir (−18 B ₺)', {kasa: -18000}, 'Makine bir saatte çalıştı.'), O('Gün sonuna kadar bekle', {memn: -4}, 'Müşteri bekledi; birkaç şikâyet geldi.')]},
  {id: 'istifa', ikon: '🙋', baslik: 'Barista Zam İstiyor', metin: 'Deneyimli baristan maaşının artmasını istiyor; yoksa ayrılacak.', kosul: function (S) { return S.ay >= 4; }, sec: [O('Zam ver (−8 B ₺ bu ay)', {kasa: -8000, moral: 8}, 'Ekip moral buldu.'), O('Reddet', {moral: -8}, 'Barista küstü; ekip huzursuz.', [{p: 0.3, fx: {memn: -5}, msg: 'Barista ayrıldı; servis aksadı.'}])]},
  {id: 'unlu', ikon: '⭐', baslik: 'Ünlü Bir Müşteri', metin: 'Tanınmış bir oyuncu kafene gelip fotoğraf çektirdi.', kosul: function (S) { return S.ay >= 3 && S.marka > 20; }, sec: [O('Fotoğrafı paylaşmasını rica et', {marka: 2.5, trafik: .06, trafikSure: 1}, 'Fotoğraf çok paylaşıldı!'), O('Rahat bırak', {marka: .8}, 'Sakin bir ziyaret oldu.')]},
  {id: 'sikayet', ikon: '😠', baslik: 'Sosyal Medya Şikâyeti', metin: 'Bir müşteri kötü bir deneyimini herkese açık yazdı.', kosul: function (S) { return S.ay >= 3; }, sec: [O('Özür dile, bir sonraki ziyareti ikram et (−2 B ₺)', {kasa: -2000, marka: .3}, 'Müşteri yorumunu güncelledi.'), O('Yok say', {marka: -1}, 'Yorum yayılmaya devam etti.')]},
  {id: 'festival', ikon: '🎪', baslik: 'Mahalle Festivali', metin: 'Belediye bir festival düzenliyor; stant açmak istersen kontenjan var.', kosul: function (S) { return S.ay >= 4; }, sec: [O('Stant aç (−20 B ₺)', {kasa: -20000, marka: 1.8, trafik: .1, trafikSure: 1}, 'Binlerce kişi tanıştı.'), O('Katılma', {}, 'Festivali izledin.')]},
  {id: 'elektrik', ikon: '💡', baslik: 'Elektrik Kesintisi', metin: 'Bölgede uzun bir kesinti yaşanıyor.', kosul: function (S) { return S.ay >= 3; }, sec: [O('Jeneratör kirala (−10 B ₺)', {kasa: -10000}, 'Servis aksamadan sürdü.'), O('Bekle', {memn: -5, kasa: -6000}, 'Birkaç saat kapalı kaldın.')]},
  {id: 'franchise', ikon: '🤝', baslik: 'Franchise Teklifi', metin: 'Başka bir şehirden bir girişimci markanı kullanmak istiyor.', kosul: function (S) { return S.ay >= 12 && S.marka > 40; }, sec: [O('Kabul et (+150 B ₺ hak ediş)', {kasa: 150000, marka: -1}, 'Marka yeni bir şehre taşındı; kontrolü azaldı.'), O('Reddet, tek başına büyü', {marka: .8}, 'Marka bütünlüğünü korudun.')]}
];
function olayBul(id) { for (var i = 0; i < OLAYLAR.length; i++) if (OLAYLAR[i].id === id) return OLAYLAR[i]; return null; }
function olayUygula(S, fx) {
  var F = enflasyonCarpan(S);
  if (fx.kasa) S.kasa += fx.kasa * F; if (fx.marka) S.marka = clamp(S.marka + fx.marka, 0, 100); if (fx.memn) S.olayMemn += fx.memn;
  if (fx.tedarik) S.tedarik = fx.tedarik; if (fx.trafik) S.trafikB = {v: fx.trafik, bit: S.ay + (fx.trafikSure || 1) + 1}; if (fx.rakip) S.rakipBaski = clamp((S.rakipBaski || 0) + fx.rakip, 0, 0.6);
  if (fx.fiyat) URUNLER.forEach(function (u) { S.menu[u.id].fiyat = clamp(S.menu[u.id].fiyat + fx.fiyat, 0.7, 1.6); });
  S.subeler.forEach(function (s) { if (fx.hijyen) s.hijyen = clamp(s.hijyen + fx.hijyen, 0, 100); if (fx.moral) s.moral = clamp(s.moral + fx.moral, 0, 100); if (fx.kiraZam && s === S.subeler[S.subeler.length - 1]) s.kira *= 1 + fx.kiraZam; });
}
function olaySec(S, id, i) {
  var o = olayBul(id), c = o.sec[i], msg = c.msg; olayUygula(S, c.fx);
  if (c.risk) { var r = rnd(S), acc = 0; for (var k = 0; k < c.risk.length; k++) { acc += c.risk[k].p; if (r < acc) { olayUygula(S, c.risk[k].fx); msg = c.risk[k].msg; break; } } }
  S.olayGecmis = S.olayGecmis || []; S.olayGecmis.unshift({ay: S.ay, ad: o.baslik, msg: msg}); S.olayGecmis = S.olayGecmis.slice(0, 20); return msg;
}

/* ---------- Hedefler ---------- */
var HEDEFLER = [
  ['ilk', '☕', 'İlk Fincan', 'İlk ayı kârla kapat', function (S) { return S.gecmis.some(function (g) { return g.kar > 0; }); }],
  ['yildiz4', '⭐', '4 Yıldız', 'Memnuniyeti 80 üstüne çıkar', function (S) { return S.gecmis.length && S.gecmis[S.gecmis.length - 1].memn >= 80; }],
  ['sube3', '🏬', 'Üç Şube', '3 şubeye ulaş', function (S) { return S.subeler.length >= 3; }],
  ['marka50', '📣', 'Tanınan Marka', 'Marka puanını 50 yap', function (S) { return S.marka >= 50; }],
  ['kasa1m', '💰', 'Milyoner', 'Kasada 1 milyon ₺', function (S) { return S.kasa >= 1e6; }],
  ['sube6', '🌆', 'Şehir Zinciri', '6 şubeye ulaş', function (S) { return S.subeler.length >= 6; }],
  ['yil1', '📅', 'İlk Yıl', 'Bir yıl ayakta kal', function (S) { return S.ay >= 12; }],
  ['borcsuz', '🧾', 'Borçsuz', 'Kredi alıp tamamen öde', function (S) { return S.krediAldi && S.borc === 0; }],
  ['imp', '👑', 'Kafe İmparatoru', '10 şube ve marka 80', function (S) { return S.subeler.length >= 10 && S.marka >= 80; }]
];

/* ---------- Ay sonu ---------- */
function ayiBitir(S) {
  if (S.bitti) return null; S.kuyruk = []; var F = enflasyonCarpan(S), ke = kampEtki(S), r = ayOzeti(S), rapor = {ay: tarihYaz(S), gelir: r.gelir, gider: r.gider, musteri: r.musteri, memn: r.memn, notlar: []};
  var faiz = S.borc * 0.03; rapor.faiz = faiz; var kar = r.gelir - r.gider - faiz, kamp = 0;
  S.kasa += r.gelir - r.gider - faiz; rapor.kar = kar;
  S.subeler.forEach(function (s, i) { var h = r.subeler[i]; if (!h) return; s.son = h; s.gecmis.push({k: h.gelir - h.mal - h.maas - h.kira - h.fatura, m: h.musteri}); if (s.gecmis.length > 12) s.gecmis.shift(); s.moral = clamp(s.moral + (MAAS_ADIM[s.maas] - 1) * 20 - 1 + (h.doluluk > 1.2 ? -3 : 1), 0, 100); s.hijyen = clamp(s.hijyen - 2.5, 0, 100); });
  S.marka = clamp(S.marka + (r.memn - 60) * 0.03 + ke.marka - 0.25 - ((S.rakipBaski || 0) * 0.3), 0, 100);
  S.kamp.forEach(function (k) { var d = KAMPANYALAR.filter(function (x) { return x.id === k.id; })[0]; if (d && d.risk && !k.rk) { k.rk = 1; if (rnd(S) < d.risk) { k.bos = 1; rapor.notlar.push('Fenomen kampanyası beklenen ilgiyi görmedi.'); } } });
  S.kamp = S.kamp.filter(function (k) { return k.bit > S.ay + 1; }); S.olayMemn = 0; S.rakipBaski = Math.max(0, (S.rakipBaski || 0) - 0.02);
  S.gecmis.push({ay: tarihYaz(S), gelir: r.gelir, gider: r.gider + faiz, kar: kar, memn: r.memn, marka: S.marka, kasa: S.kasa, musteri: r.musteri}); if (S.gecmis.length > 36) S.gecmis.shift();
  S.ay++;
  if (S.kasa < -150000) S.ifasAy++; else S.ifasAy = 0;
  if (S.ifasAy >= 3) { S.bitti = 'iflas'; rapor.notlar.push('Üç aydır kasa eksi 150 B ₺ altında; kafe zinciri iflas etti.'); }
  S.hedef = S.hedef || {}; HEDEFLER.forEach(function (h) { if (!S.hedef[h[0]] && h[4](S)) { S.hedef[h[0]] = S.ay; rapor.notlar.push('🎖️ Hedef: ' + h[2]); } });
  if (S.hedef.imp) S.bitti = S.bitti || 'zafer';
  var uygun = OLAYLAR.filter(function (o) { return o.kosul(S) && (!S.olayGor || S.olayGor[o.id] === undefined || S.ay - S.olayGor[o.id] >= 8); });
  if (!S.bitti && uygun.length && rnd(S) < 0.5) { var o = uygun[Math.floor(rnd(S) * uygun.length)]; S.olayGor = S.olayGor || {}; S.olayGor[o.id] = S.ay; S.kuyruk.push(o.id); }
  return rapor;
}
/* ---------- Eylemler ---------- */
function subeAc(S, ilceId) {
  var il = ilceBul(ilceId), F = enflasyonCarpan(S), ucret = (160000 + il.kira * 1.5) * F;
  if (S.subeler.some(function (s) { return s.ilce === ilceId; })) return {ok: false, m: 'Bu mahallede zaten şuben var.'}; if (S.kasa < ucret + 50000) return {ok: false, m: 'Kasa yetersiz (' + para(ucret + 50000) + ' gerekir).'};
  S.kasa -= ucret; var s = yeniSube(S, ilceId); s.kira = il.kira * F; S.subeler.push(s); return {ok: true, m: il.ad + ' şubesi açıldı!'};
}
function subeUcret(S, ilceId) { var il = ilceBul(ilceId); return (160000 + il.kira * 1.5) * enflasyonCarpan(S); }
function yukselt(S, s, tip) {
  var F = enflasyonCarpan(S), maliyet, yapi = {};
  if (tip === 'koltuk') { maliyet = 40000 * F; if (s.koltuk >= 60) return {ok: false, m: 'Daha fazla koltuk sığmaz.'}; yapi = function () { s.koltuk += 10; }; }
  else if (tip === 'dekor') { maliyet = 70000 * s.dekor * F; if (s.dekor >= 4) return {ok: false, m: 'Dekor en üst seviyede.'}; yapi = function () { s.dekor++; }; }
  else if (tip === 'hijyen') { maliyet = 8000 * F; yapi = function () { s.hijyen = clamp(s.hijyen + 18, 0, 100); }; }
  else if (tip === 'egitim') { maliyet = 15000 * F; yapi = function () { s.moral = clamp(s.moral + 10, 0, 100); }; }
  if (S.kasa < maliyet) return {ok: false, m: 'Kasa yetersiz (' + para(maliyet) + ').'}; S.kasa -= maliyet; yapi(); return {ok: true, m: 'Tamam: −' + para(maliyet), maliyet: maliyet};
}
function personel(S, s, rol, d) {
  var F = enflasyonCarpan(S); if (d > 0) { if (s[rol] >= 8) return {ok: false, m: 'Daha fazla personel sığmaz.'}; var c = 6000 * F; if (S.kasa < c) return {ok: false, m: 'İşe alım masrafı için kasa yetersiz.'}; S.kasa -= c; s[rol]++; return {ok: true, m: 'İşe alındı (−' + para(c) + ').'}; }
  if (s[rol] <= 1) return {ok: false, m: 'En az 1 kişi kalmalı.'}; s[rol]--; s.moral = clamp(s.moral - 4, 0, 100); return {ok: true, m: 'İşten çıkarıldı; ekip morali düştü.'};
}
function kampanyaBaslat(S, id) {
  var d = KAMPANYALAR.filter(function (x) { return x.id === id; })[0], F = enflasyonCarpan(S), c = d.maliyet * F * (S.subeler.length > 2 ? 1 + 0.15 * (S.subeler.length - 2) : 1);
  if (S.kamp.some(function (k) { return k.id === id && k.bit > S.ay; })) return {ok: false, m: 'Bu kampanya zaten sürüyor.'}; if (S.kasa < c) return {ok: false, m: 'Kasa yetersiz (' + para(c) + ').'};
  S.kasa -= c; S.kamp.push({id: id, bit: S.ay + d.sure + 1}); return {ok: true, m: d.ad + ' başladı.'};
}
function krediAl(S, n) { if (S.borc + n > 1500000) return {ok: false, m: 'Kredi limiti 1,5 M ₺.'}; S.borc += n; S.kasa += n; S.krediAldi = 1; return {ok: true, m: para(n) + ' kredi alındı (aylık %3 faiz).'}; }
function krediOde(S, n) { n = Math.min(n, S.borc); if (S.kasa < n) return {ok: false, m: 'Kasa yetersiz.'}; S.borc -= n; S.kasa -= n; return {ok: true, m: para(n) + ' ödendi.'}; }

/* ===== KAFE ZİNCİRİ — arayüz ===== */
var S = null, TAB = 'kafe', SEC = 0, KEY = 'kafe_kayit_v1', TUR_KEY = 'kafe_rehber_v1';
var $ = function (s) { return document.querySelector(s); }, root = document.getElementById('root'), sheetEl = null;
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
function toast(m) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2300); }
function sheet(html) { closeSheet(); var ov = document.createElement('div'); ov.className = 'ov'; ov.innerHTML = '<div class="sh" role="dialog" aria-modal="true"><div class="hd"></div>' + html + '</div>'; document.body.appendChild(ov); sheetEl = ov; return ov; }
function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }
function kaydet() { try { if (S) localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* yok say */ } }
function yukle() { try { var j = localStorage.getItem(KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; } }
function sil() { try { localStorage.removeItem(KEY); } catch (e) { /* yok say */ } }
function sube() { var s = S.subeler.filter(function (x) { return x.id === SEC; })[0]; if (!s) { s = S.subeler[0]; SEC = s.id; } return s; }
function F() { return enflasyonCarpan(S); }
function bar(v, renk) { return '<div class="bar"><i style="width:' + clamp(v, 0, 100) + '%;' + (renk ? 'background:' + renk : '') + '"></i></div>'; }
function yildiz(m) { var n = Math.round(clamp(m, 0, 100) / 20 * 2) / 2, s = ''; for (var i = 1; i <= 5; i++) s += i <= n ? '★' : (i - 0.5 === n ? '⯨' : '☆'); return s; }

/* ---------- ana menü ve kurulum ---------- */
function menu() {
  S = null; var k = yukle(); closeSheet();
  root.innerHTML = '<div class="menu"><div class="logo">☕</div><h1>Kafe Zinciri</h1><p class="sub">Küçük bir kafeden ulusal bir markaya</p>' +
    (k ? '<button class="btn pri" id="devam">Devam et<small>' + esc(k.ad) + ' · ' + tarihYaz(k) + ' · ' + k.subeler.length + ' şube</small></button>' : '') +
    '<button class="btn ' + (k ? '' : 'pri') + '" id="yeni">Yeni oyun</button><button class="btn ghost" id="nasil">Nasıl oynanır?</button><p class="tiny muted" style="text-align:center;margin-top:auto">Kurgusal bir işletme simülasyonudur.</p></div>';
  if (k) $('#devam').onclick = function () { S = k; SEC = S.subeler[0].id; TAB = 'kafe'; render(); };
  $('#yeni').onclick = kurulum; $('#nasil').onclick = function () { yardimSheet(true); };
}
function kurulum() {
  var sec = 'eski', ad = 'Fincan Kahve', baslangic = ['eski', 'uni', 'site', 'pazar', 'park'];
  function ciz() {
    root.innerHTML = '<div class="menu"><h1 style="margin-top:20px">Kafeni Kur</h1><p class="sub">İlk şubenin adını ve mahallesini seç.</p><div class="card"><div class="small muted">Kafenin adı</div><input id="ad" maxlength="22" value="' + esc(ad) + '" style="width:100%;margin-top:6px;background:var(--p2);border:1px solid var(--line);border-radius:12px;padding:12px;font-size:17px"></div>' +
      baslangic.map(function (id) { var il = ilceBul(id); return '<button class="btn ' + (sec === id ? 'pri' : '') + '" data-m="' + id + '" style="text-align:left">' + il.ikon + ' ' + il.ad + '<small>' + il.not + ' · Kira ' + para(il.kira) + '/ay</small></button>'; }).join('') +
      '<button class="btn pri" id="basla" style="margin-top:6px">Kafeyi aç ☕<small>Başlangıç sermayesi 320 B ₺ (kurulum düşülür)</small></button><button class="btn ghost" id="geri">Geri</button></div>';
    root.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { ad = $('#ad').value || ad; sec = b.dataset.m; ciz(); }; });
    $('#geri').onclick = menu; $('#basla').onclick = function () { ad = ($('#ad').value || 'Fincan Kahve').trim().slice(0, 22) || 'Fincan Kahve'; S = yeniOyun({ad: ad, ilce: sec, seed: (Date.now() % 100000) + 7}); SEC = S.subeler[0].id; TAB = 'kafe'; kaydet(); render(); setTimeout(turOtomatik, 400); };
  }
  ciz();
}

/* ---------- animasyonlu kafe sahnesi ---------- */
function sahneSvg(s, h) {
  var W = 360, H = 214, dl = clamp(h.musteri / Math.max(1, s.koltuk * 100), 0, 1), masa = clamp(Math.round(s.koltuk / 4), 4, 12), dolu = Math.round(masa * dl), duvar = ['#5b4030', '#664735', '#4a5560', '#3a4856'][s.dekor - 1];
  var m = (S.basAy + S.ay) % 12, yaz = m >= 5 && m <= 8, kis = m <= 1 || m === 11, gok = yaz ? '#8fd0ff' : kis ? '#a9b8c8' : '#a8cbe6';
  var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Kafe sahnesi"><defs><linearGradient id="dz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + duvar + '"/><stop offset="1" stop-color="#3a281c"/></linearGradient></defs>';
  o += '<rect width="360" height="214" fill="url(#dz)"/><rect y="140" width="360" height="74" fill="#6d4b32"/><rect y="140" width="360" height="4" fill="#4a3322"/>';
  o += '<rect x="212" y="26" width="100" height="70" rx="6" fill="' + gok + '" stroke="#2a1b12" stroke-width="5"/><line x1="262" y1="26" x2="262" y2="96" stroke="#2a1b12" stroke-width="3"/><circle cx="' + (yaz ? 290 : 238) + '" cy="44" r="' + (yaz ? 9 : 6) + '" fill="' + (yaz ? '#ffe27a' : '#fff') + '" opacity=".9"/>';
  o += '<rect x="18" y="14" width="150" height="26" rx="8" fill="#2a1b12" stroke="#e0983c" stroke-width="2"/><text x="93" y="32" text-anchor="middle" fill="#f3b45a" font-size="13" font-weight="800" font-family="Avenir Next,Trebuchet MS,sans-serif">' + esc(s.ad.length > 18 ? s.ad.slice(0, 17) + '…' : s.ad) + '</text>';
  if (s.dekor >= 2) o += '<rect x="318" y="100" width="22" height="40" rx="3" fill="#7a4a2a"/><circle cx="329" cy="92" r="14" fill="#3d9a5b"/><circle cx="321" cy="98" r="9" fill="#4bb06a"/>';
  if (s.dekor >= 3) [60, 120].forEach(function (x) { o += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="52" stroke="#2a1b12"/><path d="M' + (x - 11) + ' 62 Q' + x + ' 44 ' + (x + 11) + ' 62Z" fill="#f3b45a"/><circle cx="' + x + '" cy="64" r="3" fill="#fff3b0"/>'; });
  if (s.dekor >= 4) o += '<rect x="176" y="48" width="26" height="34" fill="#c8a165" stroke="#2a1b12" stroke-width="3"/><circle cx="189" cy="62" r="6" fill="#d9573e"/>';
  /* tezgâh + barista */
  o += '<rect x="10" y="96" width="132" height="50" rx="6" fill="#8a5a36"/><rect x="10" y="92" width="132" height="9" rx="4" fill="#d6a56a"/><rect x="28" y="70" width="34" height="24" rx="5" fill="#9aa3ab"/><rect x="34" y="78" width="22" height="8" rx="2" fill="#2a2f34"/>';
  [38, 46, 54].forEach(function (x, i) { o += '<path class="bg bg' + (i + 1) + '" d="M' + x + ' 66 q4 -8 0 -16" stroke="#fff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>'; });
  o += '<g class="zp"><circle cx="100" cy="62" r="10" fill="#f0c9a0"/><path d="M90 58 Q100 46 110 58 Z" fill="#3a2418"/><rect x="88" y="72" width="24" height="26" rx="8" fill="#e0983c"/><rect x="92" y="80" width="16" height="18" rx="3" fill="#fff3e0"/></g>';
  /* masalar */
  var pos = [], per = 6, dx = 48, x0 = 168, i;
  for (i = 0; i < masa; i++) pos.push({x: x0 + (i % per) * 0 + 0, y: 0});
  pos = []; var cols = masa <= 6 ? 3 : 4, rows = Math.ceil(masa / cols); for (i = 0; i < masa; i++) { var cx = 170 + (i % cols) * 50 + ((Math.floor(i / cols)) % 2) * 14, cy = 160 + Math.floor(i / cols) * 25; pos.push({x: cx > 340 ? 340 : cx, y: Math.min(cy, 196)}); }
  var renk = ['#d9573e', '#4aa3e8', '#5fc08a', '#b57edc', '#f3b45a', '#e86a9a'];
  pos.forEach(function (p, k) { var var1 = k < dolu; if (var1) o += '<g class="zp" style="animation-delay:' + (k * .17) + 's"><circle cx="' + p.x + '" cy="' + (p.y - 17) + '" r="6" fill="#f0c9a0"/><rect x="' + (p.x - 7) + '" y="' + (p.y - 11) + '" width="14" height="12" rx="5" fill="' + renk[k % renk.length] + '"/></g>'; o += '<ellipse cx="' + p.x + '" cy="' + p.y + '" rx="16" ry="6" fill="#d6a56a" stroke="#4a3322" stroke-width="1.5"/><rect x="' + (p.x - 1.5) + '" y="' + p.y + '" width="3" height="9" fill="#4a3322"/>' + (var1 ? '<circle cx="' + (p.x + 5) + '" cy="' + (p.y - 1) + '" r="2.5" fill="#fff"/>' : ''); });
  /* yürüyen müşteriler */
  var yur = clamp(Math.round(h.trafik / 450), 1, 7);
  for (i = 0; i < yur; i++) o += '<g class="yur" style="--dx:-' + (120 + (i % 3) * 50) + 'px;--t:' + (7 + (i % 4) * 1.6) + 's;--d:' + (-i * 1.3) + 's"><circle cx="352" cy="' + (150 + (i % 3) * 8) + '" r="5" fill="#f0c9a0"/><rect x="346" y="' + (155 + (i % 3) * 8) + '" width="12" height="14" rx="5" fill="' + renk[(i + 2) % renk.length] + '"/></g>';
  o += '</svg>'; return '<div class="sahne">' + o + '</div>';
}

/* ---------- sekmeler ---------- */
var TABLAR = [['kafe', 'Kafe', '☕'], ['menu', 'Menü', '📋'], ['ekip', 'Ekip', '👥'], ['sube', 'Şubeler', '🏬'], ['pazar', 'Pazarlama', '📣'], ['finans', 'Finans', '💰'], ['piyasa', 'Piyasa', '📈'], ['hedef', 'Hedefler', '🏆']];
function subeSecici() { if (S.subeler.length < 2) return ''; return '<div class="chiprow" style="margin-bottom:10px">' + S.subeler.map(function (s) { return '<button class="cx' + (s.id === SEC ? ' on' : '') + '" data-a="sec" data-v="' + s.id + '">' + esc(ilceBul(s.ilce).ikon + ' ' + ilceBul(s.ilce).ad) + '</button>'; }).join('') + '</div>'; }
function darbogaz(s, h) {
  var kk = s.koltuk * 100, pk = s.barista * BARISTA.kap + s.garson * GARSON.kap;
  if (h.doluluk <= 1) return '<div class="small good">✅ Kapasite yeterli; müşteri sığıyor.</div>';
  return '<div class="small badc">⚠️ ' + Math.round((h.doluluk - 1) * 100) + '% fazla talep sığmıyor. Darboğaz: <b>' + (kk <= pk ? 'koltuk sayısı' : 'personel') + '</b>. ' + (kk <= pk ? 'Şubeler sekmesinden koltuk ekle.' : 'Ekip sekmesinden personel al.') + '</div>';
}
function tKafe() {
  var s = sube(), h = subeHesapla(S, s), kar = h.gelir - h.mal - h.maas - h.kira - h.fatura, son = S.gecmis[S.gecmis.length - 1];
  var t = subeSecici() + sahneSvg(s, h) + '<div class="card"><h3>' + esc(ilceBul(s.ilce).ikon) + ' ' + esc(s.ad) + '</h3><div class="row small"><span>Bu ay tahmini müşteri</span><b>' + h.musteri.toLocaleString('tr-TR') + '</b></div><div class="row small"><span>Tahmini gelir</span><b>' + para(h.gelir) + '</b></div><div class="row small"><span>Tahmini gider</span><b>' + para(h.mal + h.maas + h.kira + h.fatura) + '</b></div><div class="row"><span>Tahmini kâr</span><b class="' + (kar >= 0 ? 'good' : 'badc') + '">' + para(kar) + '</b></div><div class="row small"><span>Memnuniyet</span><b>' + yildiz(h.memn) + ' ' + Math.round(h.memn) + '</b></div>' + bar(h.memn, h.memn >= 70 ? 'var(--ok)' : h.memn >= 50 ? 'var(--am)' : 'var(--bad)') + '<div style="margin-top:8px">' + darbogaz(s, h) + '</div></div>';
  if (son) t += '<div class="card"><h3>Geçen ay (' + esc(son.ay) + ')</h3><div class="row small"><span>Kâr</span><b class="' + (son.kar >= 0 ? 'good' : 'badc') + '">' + para(son.kar) + '</b></div><div class="row small"><span>Müşteri</span><b>' + son.musteri.toLocaleString('tr-TR') + '</b></div></div>';
  t += '<div class="card small muted">💡 Her ay 3 şey yap: fiyat ayarla, ekibi büyüt, pazarlama yap; sonra <b>Ay Sonu</b>\'na bas. İpucu: <b>?</b> düğmesi yardım verir.</div>';
  return t;
}
function tMenu() {
  var f = F();
  return '<div class="card"><h3>Menü ve fiyatlar</h3><div class="small muted" style="margin-bottom:6px">Fiyat artarsa kâr artar ama talep düşer. Pazar ortalaması 1,00×.</div>' + URUNLER.map(function (u) {
    var mu = S.menu[u.id], pr = u.fiyat * f * mu.fiyat, kc = u.kal * f * mu.kalite;
    return '<div class="mp"><div class="ik">' + u.ikon + '</div><div class="nm"><b>' + u.ad + (mu.aktif ? '' : ' <span class="tiny muted">(kapalı)</span>') + '</b><div class="tiny muted">Maliyet ' + Math.round(u.mal * f * TEDARIK[S.tedarik].mal * (1 + .12 * (mu.kalite - 1))) + ' ₺ · Kalite ' + '★'.repeat(mu.kalite) + '</div><div class="tiny">' + (mu.kalite < 3 ? '<button class="cx" data-a="kalite" data-v="' + u.id + '" style="margin-top:4px;min-height:34px">Kalite ↑ ' + para(kc) + '</button> ' : '') + '<button class="cx" data-a="aktif" data-v="' + u.id + '" style="margin-top:4px;min-height:34px">' + (mu.aktif ? 'Menüden çıkar' : 'Menüye ekle') + '</button></div></div><div class="stp"><button data-a="fiyat" data-v="' + u.id + '" data-d="-1">−</button><span>' + Math.round(pr) + ' ₺<div class="tiny muted">' + mu.fiyat.toFixed(2).replace('.', ',') + '×</div></span><button data-a="fiyat" data-v="' + u.id + '" data-d="1">+</button></div></div>';
  }).join('') + '</div>';
}
function tEkip() {
  var s = sube(), h = subeHesapla(S, s), kk = s.koltuk * 100, pk = s.barista * BARISTA.kap + s.garson * GARSON.kap;
  function adim(rol, ad, ik) { return '<div class="mp"><div class="ik">' + ik + '</div><div class="nm"><b>' + ad + '</b><div class="tiny muted">Maaş ' + para((rol === 'barista' ? BARISTA.maas : GARSON.maas) * MAAS_ADIM[s.maas] * F()) + '/ay</div></div><div class="stp"><button data-a="pers" data-v="' + rol + '" data-d="-1">−</button><span>' + s[rol] + '</span><button data-a="pers" data-v="' + rol + '" data-d="1">+</button></div></div>'; }
  return subeSecici() + '<div class="card"><h3>👥 Ekip · ' + esc(ilceBul(s.ilce).ad) + '</h3>' + adim('barista', 'Barista', '🧑‍🍳') + adim('garson', 'Garson', '🧑‍💼') + '<div class="eyebrow">Maaş politikası</div><div class="chiprow">' + ['Düşük', 'Normal', 'Yüksek'].map(function (n, i) { return '<button class="cx' + (s.maas === i ? ' on' : '') + '" data-a="maas" data-v="' + i + '">' + n + '</button>'; }).join('') + '</div><div class="tiny muted" style="margin-top:6px">Yüksek maaş moral ve memnuniyet getirir; maliyeti artırır.</div></div>' +
    '<div class="card"><h3>Kapasite</h3><div class="row small"><span>Koltuk kapasitesi</span><b>' + kk.toLocaleString('tr-TR') + '/ay</b></div>' + bar(kk / Math.max(kk, pk, h.trafik) * 100) + '<div class="row small"><span>Personel kapasitesi</span><b>' + pk.toLocaleString('tr-TR') + '/ay</b></div>' + bar(pk / Math.max(kk, pk, h.trafik) * 100, 'var(--ok)') + '<div class="row small"><span>Beklenen talep</span><b>' + Math.round(h.trafik).toLocaleString('tr-TR') + '/ay</b></div>' + bar(h.trafik / Math.max(kk, pk, h.trafik) * 100, '#4aa3e8') + '<div style="margin-top:8px">' + darbogaz(s, h) + '</div></div>' +
    '<div class="card"><h3>Moral ve hijyen</h3><div class="row small"><span>Moral</span><b>' + Math.round(s.moral) + '</b></div>' + bar(s.moral) + '<div class="row small"><span>Hijyen</span><b>' + Math.round(s.hijyen) + '</b></div>' + bar(s.hijyen, 'var(--ok)') + '<div class="chiprow" style="margin-top:10px"><button class="cx" data-a="yuk" data-v="egitim">Eğitim · ' + para(15000 * F()) + '</button><button class="cx" data-a="yuk" data-v="hijyen">Temizlik ekibi · ' + para(8000 * F()) + '</button></div></div>';
}
function tSube() {
  var s = sube(), f = F(), t = subeSecici() + '<div class="card"><h3>🏬 ' + esc(s.ad) + '</h3><div class="row small"><span>Koltuk</span><b>' + s.koltuk + '</b></div><div class="row small"><span>Dekor seviyesi</span><b>' + '★'.repeat(s.dekor) + '</b></div><div class="row small"><span>Kira</span><b>' + para(s.kira * f) + '/ay</b></div><div class="chiprow" style="margin-top:8px"><button class="cx" data-a="yuk" data-v="koltuk">Koltuk +10 · ' + para(40000 * f) + '</button>' + (s.dekor < 4 ? '<button class="cx" data-a="yuk" data-v="dekor">Dekoru yenile · ' + para(70000 * s.dekor * f) + '</button>' : '') + (S.subeler.length > 1 ? '<button class="cx" data-a="kapat" data-v="' + s.id + '">Şubeyi kapat</button>' : '') + '</div></div>';
  var bos = ILCELER.filter(function (il) { return !S.subeler.some(function (x) { return x.ilce === il.id; }); });
  t += '<div class="eyebrow">Yeni şube aç</div>' + (bos.length ? bos.map(function (il) { var u = subeUcret(S, il.id); var pot = Math.round(clamp(il.yog / 2, 1, 5)); return '<div class="card"><div class="row"><b>' + il.ikon + ' ' + il.ad + '</b><span class="small muted">Talep ' + '●'.repeat(pot) + '○'.repeat(5 - pot) + '</span></div><div class="small muted">' + il.not + '</div><div class="row small"><span>Kira ' + para(il.kira * f) + '/ay</span><span>Kurulum ' + para(u) + '</span></div><button class="btn sm pri" data-a="ac" data-v="' + il.id + '">Şube aç</button></div>'; }).join('') : '<div class="card small muted">Şehirdeki tüm mahallelerde şuben var!</div>');
  return t;
}
function tPazar() {
  var f = F(), c = S.subeler.length > 2 ? 1 + 0.15 * (S.subeler.length - 2) : 1;
  return '<div class="card"><h3>📣 Pazarlama</h3><div class="small muted">Kampanyalar tüm şubelere uygulanır. Şube sayısı arttıkça maliyet yükselir. Marka puanın: <b>' + Math.round(S.marka) + '/100</b></div></div>' + KAMPANYALAR.map(function (k) {
    var aktif = S.kamp.filter(function (x) { return x.id === k.id && x.bit > S.ay; })[0];
    return '<div class="card"><div class="row"><b>' + k.ikon + ' ' + k.ad + '</b><span class="small">' + para(k.maliyet * f * c) + '</span></div><div class="small muted">' + k.ac + ' Trafik +%' + Math.round(k.trafik * 100) + ' · ' + k.sure + ' ay' + (k.risk ? ' · riskli' : '') + '</div>' + (aktif ? '<div class="small good" style="margin-top:6px">▶ Sürüyor · ' + (aktif.bit - S.ay - 1) + ' ay kaldı' + (aktif.bos ? ' (tutmadı)' : '') + '</div>' : '<button class="btn sm pri" style="margin-top:8px" data-a="kamp" data-v="' + k.id + '">Başlat</button>') + '</div>';
  }).join('');
}
function tFinans() {
  var r = ayOzeti(S), g = S.gecmis.slice(-8), mx = Math.max(1, Math.max.apply(null, g.map(function (x) { return Math.abs(x.kar); })));
  var grafik = g.length ? '<svg viewBox="0 0 320 110" width="100%"><line x1="0" x2="320" y1="55" y2="55" stroke="rgba(255,255,255,.2)"/>' + g.map(function (x, i) { var hh = Math.abs(x.kar) / mx * 48, bx = 10 + i * 38; return '<rect x="' + bx + '" y="' + (x.kar >= 0 ? 55 - hh : 55) + '" width="26" height="' + Math.max(1, hh) + '" rx="3" fill="' + (x.kar >= 0 ? '#5fc08a' : '#e8665f') + '"/>'; }).join('') + '</svg>' : '<div class="small muted">İlk ayı bitirince grafik dolacak.</div>';
  var faiz = S.borc * 0.03;
  return '<div class="card"><h3>💰 Kasa: ' + para(S.kasa) + '</h3><div class="row small"><span>Bu ay tahmini gelir</span><b>' + para(r.gelir) + '</b></div><div class="row small"><span>Tahmini gider</span><b>' + para(r.gider + faiz) + '</b></div><div class="row"><span>Tahmini kâr</span><b class="' + (r.gelir - r.gider - faiz >= 0 ? 'good' : 'badc') + '">' + para(r.gelir - r.gider - faiz) + '</b></div>' + (S.kasa < 0 ? '<div class="small badc" style="margin-top:6px">Kasa eksi! 3 ay −150 B ₺ altında kalırsan iflas.</div>' : '') + '</div><div class="card"><h3>Aylık kâr (son 8 ay)</h3>' + grafik + '</div>' +
    '<div class="card"><h3>🏦 Kredi</h3><div class="row small"><span>Borç</span><b>' + para(S.borc) + '</b></div><div class="row small"><span>Aylık faiz (%3)</span><b>' + para(faiz) + '</b></div><div class="chiprow" style="margin-top:8px"><button class="cx" data-a="kredi" data-v="250000">+250 B ₺ al</button><button class="cx" data-a="kredi" data-v="1000000">+1 M ₺ al</button>' + (S.borc > 0 ? '<button class="cx" data-a="ode" data-v="250000">250 B öde</button><button class="cx" data-a="ode" data-v="' + Math.ceil(S.borc) + '">Hepsini öde</button>' : '') + '</div></div>';
}
function tPiyasa() {
  var f = F();
  return '<div class="card"><h3>📈 Piyasa</h3><div class="row small"><span>Yıllık enflasyon</span><b>%' + S.enf + '</b></div><div class="row small"><span>Fiyat endeksi</span><b>' + f.toFixed(2).replace('.', ',') + '×</b></div><div class="row small"><span>Rakip baskısı</span><b class="' + ((S.rakipBaski || 0) > .1 ? 'badc' : '') + '">' + ((S.rakipBaski || 0) > .1 ? 'yüksek' : 'düşük') + '</b></div><div class="tiny muted" style="margin-top:6px">Maliyetler ve pazar fiyatları enflasyonla birlikte artar; sen de fiyatları ona göre tutarsın (menüdeki ×).</div></div>' +
    '<div class="card"><h3>☕ Tedarikçi</h3><div class="chiprow">' + Object.keys(TEDARIK).map(function (k) { return '<button class="cx' + (S.tedarik === k ? ' on' : '') + '" data-a="ted" data-v="' + k + '">' + TEDARIK[k].ad + '</button>'; }).join('') + '</div><div class="small muted" style="margin-top:6px">' + TEDARIK[S.tedarik].ac + '</div></div>' +
    '<div class="eyebrow">Son olaylar</div>' + ((S.olayGecmis || []).length ? S.olayGecmis.slice(0, 6).map(function (o) { return '<div class="card small"><b>' + esc(o.ad) + '</b><div class="muted">' + esc(o.msg) + '</div></div>'; }).join('') : '<div class="card small muted">Henüz olay yok.</div>');
}
function tHedef() {
  var n = HEDEFLER.filter(function (h) { return S.hedef[h[0]]; }).length;
  return '<div class="card"><h3>🏆 Hedefler</h3><div class="small muted">' + n + '/' + HEDEFLER.length + ' tamamlandı. Son hedef: <b>10 şube ve marka 80</b> ile Kafe İmparatoru ol.</div>' + bar(n / HEDEFLER.length * 100) + '</div>' + HEDEFLER.map(function (h) { var ok = !!S.hedef[h[0]]; return '<div class="card" style="display:flex;gap:12px;align-items:center;' + (ok ? '' : 'opacity:.75') + '"><div style="font-size:28px">' + (ok ? '✅' : h[1]) + '</div><div><b>' + h[2] + '</b><div class="small muted">' + h[3] + '</div></div></div>'; }).join('');
}
var TABF = {kafe: tKafe, menu: tMenu, ekip: tEkip, sube: tSube, pazar: tPazar, finans: tFinans, piyasa: tPiyasa, hedef: tHedef};
function render() {
  if (!S) return menu();
  var r = ayOzeti(S), son = S.gecmis[S.gecmis.length - 1], kar = r.gelir - r.gider - S.borc * 0.03;
  root.innerHTML = '<div class="top"><div class="ttl"><b>' + esc(S.ad) + '</b><span class="date">' + tarihYaz(S) + '</span><div class="ib"><button class="yd" id="yardim-b" aria-label="Yardım">?</button><button id="ayar" aria-label="Menü">⋯</button></div></div><div class="stats"><div class="st"><span>Kasa</span><b class="' + (S.kasa < 0 ? 'badc' : '') + '">' + para(S.kasa) + '</b></div><div class="st"><span>Marka</span><b>' + Math.round(S.marka) + '</b></div><div class="st"><span>Memnuniyet</span><b>' + yildiz(r.memn) + '</b></div><div class="st"><span>Şube</span><b>' + S.subeler.length + '</b></div><div class="st"><span>Tahmini kâr</span><b class="' + (kar >= 0 ? 'good' : 'badc') + '">' + para(kar) + '</b></div></div></div><div class="scroll" id="sc">' + TABF[TAB]() + '</div><nav class="tabs">' + TABLAR.map(function (t) { return '<button class="tab" data-t="' + t[0] + '" aria-current="' + (TAB === t[0]) + '"><span class="ti">' + t[2] + '</span>' + t[1] + '</button>'; }).join('') + '</nav><button class="fab" id="ay">Ay Sonu ▸</button>';
  $('#ay').onclick = ayBitirUi; $('#yardim-b').onclick = function () { yardimSheet(); }; $('#ayar').onclick = ayarSheet;
  root.querySelectorAll('.tab').forEach(function (b) { b.onclick = function () { TAB = b.dataset.t; render(); $('#sc').scrollTop = 0; }; });
}
function ayarSheet() { sheet('<div class="lab">Menü</div><h2>' + esc(S.ad) + '</h2><button class="btn" id="a1">Rehberi yeniden izle</button><button class="btn" id="a2" style="margin-top:8px">Ana menü</button><button class="btn ghost" id="a3" style="margin-top:8px">Oyunu sil ve yeniden başla</button><button class="btn ghost" id="k" style="margin-top:8px">Kapat</button>'); $('#k').onclick = closeSheet; $('#a1').onclick = function () { closeSheet(); turAc(); }; $('#a2').onclick = function () { closeSheet(); kaydet(); menu(); }; $('#a3').onclick = function () { sil(); closeSheet(); menu(); }; }

/* ---------- eylemler (olay delegasyonu) ---------- */
var ACT = {
  sec: function (d) { SEC = +d.v; render(); },
  fiyat: function (d) { var mu = S.menu[d.v]; mu.fiyat = clamp(Math.round((mu.fiyat + 0.05 * (+d.d)) * 100) / 100, 0.7, 1.6); render(); },
  aktif: function (d) { var aktif = URUNLER.filter(function (u) { return S.menu[u.id].aktif; }).length, mu = S.menu[d.v]; if (mu.aktif && aktif <= 3) return toast('En az 3 ürün satmalısın.'); mu.aktif = !mu.aktif; render(); },
  kalite: function (d) { var u = urunBul(d.v), mu = S.menu[d.v], c = u.kal * F() * mu.kalite; if (S.kasa < c) return toast('Kasa yetersiz.'); S.kasa -= c; mu.kalite++; toast(u.ad + ' kalitesi arttı'); render(); },
  pers: function (d) { var r = personel(S, sube(), d.v, +d.d); toast(r.m); render(); },
  maas: function (d) { sube().maas = +d.v; render(); },
  yuk: function (d) { var r = yukselt(S, sube(), d.v); toast(r.m); render(); },
  kapat: function (d) { if (S.subeler.length < 2) return; sheet('<div class="lab">Dikkat</div><h2>Şubeyi kapat?</h2><p class="small muted">Kurulum yatırımı geri alınmaz; personel işten çıkarılır.</p><button class="btn pri" id="ev">Evet, kapat</button><button class="btn ghost" id="k">Vazgeç</button>'); $('#k').onclick = closeSheet; $('#ev').onclick = function () { S.subeler = S.subeler.filter(function (x) { return x.id !== +d.v; }); SEC = S.subeler[0].id; closeSheet(); render(); }; },
  ac: function (d) { var r = subeAc(S, d.v); toast(r.m); if (r.ok) { SEC = S.subeler[S.subeler.length - 1].id; kaydet(); } render(); },
  kamp: function (d) { var r = kampanyaBaslat(S, d.v); toast(r.m); render(); },
  kredi: function (d) { var r = krediAl(S, +d.v); toast(r.m); render(); },
  ode: function (d) { var r = krediOde(S, +d.v); toast(r.m); render(); },
  ted: function (d) { S.tedarik = d.v; render(); }
};
document.addEventListener('click', function (e) { var el = e.target.closest ? e.target.closest('[data-a]') : null; if (!el || !S || !ACT[el.dataset.a]) return; ACT[el.dataset.a](el.dataset); });

/* ---------- ay sonu ---------- */
function ayBitirUi() {
  var r = ayiBitir(S); if (!r) return; kaydet(); render();
  var h = '<div class="lab">' + esc(r.ay) + ' · Ay raporu</div><h2>' + (r.kar >= 0 ? '☀️ Kârlı ay' : '🌧️ Zararlı ay') + '</h2><div class="row"><span>Gelir</span><b>' + para(r.gelir) + '</b></div><div class="row"><span>Gider' + (r.faiz ? ' (faiz dahil)' : '') + '</span><b>' + para(r.gider + r.faiz) + '</b></div><div class="row"><span><b>Net kâr</b></span><b class="' + (r.kar >= 0 ? 'good' : 'badc') + '">' + para(r.kar) + '</b></div><div class="row small"><span>Müşteri</span><b>' + r.musteri.toLocaleString('tr-TR') + '</b></div><div class="row small"><span>Memnuniyet</span><b>' + yildiz(r.memn) + '</b></div>' + r.notlar.map(function (n) { return '<div class="card small" style="margin-top:8px">' + esc(n) + '</div>'; }).join('') + '<button class="btn pri" id="k" style="margin-top:10px">Devam</button>';
  sheet(h); $('#k').onclick = function () { closeSheet(); sonrasi(); };
}
function sonrasi() {
  if (S.bitti) return bitis();
  if (S.kuyruk && S.kuyruk.length) olayGoster(S.kuyruk.shift());
}
function olayGoster(id) {
  var o = olayBul(id); sheet('<div class="lab">Olay</div><h2>' + o.ikon + ' ' + o.baslik + '</h2><p>' + o.metin + '</p>' + o.sec.map(function (c, i) { return '<button class="btn" data-o="' + i + '" style="margin-top:8px;text-align:left">' + c.ad + '</button>'; }).join(''));
  sheetEl.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { var m = olaySec(S, id, +b.dataset.o); kaydet(); render(); sheet('<div class="lab">Sonuç</div><h2>' + o.ikon + ' ' + o.baslik + '</h2><p>' + esc(m) + '</p><button class="btn pri" id="k">Tamam</button>'); $('#k').onclick = function () { closeSheet(); sonrasi(); }; }; });
}
function bitis() {
  var z = S.bitti === 'zafer'; sheet('<div class="lab">' + (z ? 'Zafer' : 'Oyun bitti') + '</div><h2>' + (z ? '👑 Kafe İmparatorusun!' : '📉 İflas') + '</h2><p>' + (z ? S.ad + ', 10 şube ve güçlü bir markaya ulaştı. Tebrikler!' : 'Kasa uzun süre eksi kaldı ve zincir kapandı. Bir dahaki sefere fiyat, ekip ve kapasiteyi daha dengeli tut.') + '</p><div class="row small"><span>Süre</span><b>' + S.ay + ' ay</b></div><div class="row small"><span>Şube</span><b>' + S.subeler.length + '</b></div><button class="btn pri" id="y">Yeni oyun</button>'); $('#y').onclick = function () { sil(); closeSheet(); menu(); };
}

/* ---------- yardım (?) ve rehber ---------- */
var YARDIM = {
  kafe: ['Kafe', 'Seçili şubenin canlı sahnesi ve bu ayın tahmini sonucu.', ['Sahnedeki müşteri sayısı doluluğu gösterir.', 'Kırmızı "darboğaz" uyarısı koltuk mu personel mi yetmiyor onu söyler.', 'Her şey yolundaysa <b>Ay Sonu</b>\'na bas.'], 'Önce darboğazı gider; sığmayan müşteri gelir demektir.'],
  menu: ['Menü', 'Ürünlerin fiyatı, kalitesi ve menüde olup olmadığı.', ['− / + ile fiyatı %5 oynat; 1,00× pazar ortalaması.', 'Kaliteyi artırmak maliyeti biraz artırır, memnuniyeti yükseltir.', 'Mevsime göre ürünler değişir: yazın soğuk kahve, kışın sıcak içecekler.'], 'Zenginleri yüksek fiyat çekmez; öğrenciler fiyata çok duyarlıdır.'],
  ekip: ['Ekip', 'Barista ve garson sayısı, maaş politikası, moral ve hijyen.', ['Her kişi aylık kapasite ekler.', 'Yüksek maaş moral ve memnuniyet getirir.', 'Hijyen zamanla düşer; temizlik ekibi çağır.'], 'Koltuk darboğazıysa personel almak boşuna para harcar.'],
  sube: ['Şubeler', 'Mevcut şubeni geliştir, yeni mahallede şube aç.', ['Koltuk ve dekor talebi artırır.', 'Her mahallenin kirası ve potansiyeli farklı.', 'Yeni şubeye kasa dönüşümü için en az 50 B ₺ yedek lazım.'], 'Pahalı mahalleler çok müşteri getirir ama kira yer.'],
  pazar: ['Pazarlama', 'Kampanyalar marka ve trafik getirir.', ['Kampanya tüm şubelere uygulanır.', 'Fenomen anlaşması bazen tutmaz.', 'Marka puanı uzun vadeli trafiği belirler.'], 'Kasa dar iken pahalı kampanya yapma.'],
  finans: ['Finans', 'Kasa, kâr grafiği ve kredi.', ['Kredi hızlı sermaye verir ama aylık %3 faiz işler.', 'Kasa 3 ay üst üste −150 B ₺ altında kalırsa iflas.'], 'Borcu kâra geçince hemen öde.'],
  piyasa: ['Piyasa', 'Enflasyon, rakip baskısı ve tedarikçi seçimi.', ['Ucuz çekirdek maliyeti düşürür, lezzeti kötüleştirir.', 'Premium çekirdek tersi.'], 'Enflasyon yüksekken fiyatları geriden takip etme.'],
  hedef: ['Hedefler', 'Başarı listesi ve nihai hedef.', ['Nihai hedef: 10 şube ve marka 80.'], 'Hedefleri kilometre taşı olarak kullan.']
};
function yardimSheet(genel) {
  var h = YARDIM[TAB], html = '<div class="lab">Yardım</div>';
  if (h && !genel) html += '<h2>' + h[0] + '</h2><p>' + h[1] + '</p><div class="eyebrow">Nasıl kullanılır?</div><div class="card"><ul style="margin:0;padding-left:20px">' + h[2].map(function (x) { return '<li style="margin:6px 0">' + x + '</li>'; }).join('') + '</ul></div><div class="card" style="border-color:var(--am)">💡 <b>İpucu:</b> ' + h[3] + '</div>';
  else html += '<h2>Nasıl oynanır?</h2><p>Küçük bir kafeyle başla. Her ay <b>fiyat, ekip, kapasite ve pazarlama</b> kararlarını ver, sonra <b>Ay Sonu</b>\'na bas. Gelir giderden büyükse kârdasın. Şube aç, markanı büyüt, <b>10 şube ve 80 marka</b> ile Kafe İmparatoru ol.</p>';
  html += '<button class="btn" id="yt" style="margin-top:8px">🎬 Rehberi izle</button><button class="btn ghost" id="k">Kapat</button>'; sheet(html); $('#k').onclick = closeSheet; $('#yt').onclick = function () { closeSheet(); if (S) turAc(); else toast('Önce bir oyun başlat.'); };
}
var TUT = [
  {b: 'Hoş geldin patron!', m: 'Ben Usta Barista Mina. Kafeni birkaç adımda tanıtayım. İstediğin an "Atla" diyebilirsin; <b>?</b> düğmesinden turu tekrar izlersin.'},
  {b: 'Göstergeler', m: '<b>Kasa</b> paran, <b>Marka</b> tanınırlığın, <b>Memnuniyet</b> müşteri puanın, <b>Tahmini kâr</b> bu ayın beklentisi. Kâr eksiye düşmesin.', hedef: function () { return $('.stats'); }},
  {b: 'Canlı kafe', m: 'Şubenin sahnesi. Müşteriler gelir, masalar dolar. Altındaki kart bu ayın tahmini gelir, gider ve kârını gösterir; kırmızı uyarı darboğazı söyler.', tab: 'kafe', hedef: function () { return $('.sahne'); }},
  {b: 'Menü', m: 'Fiyatı ve kaliteyi buradan ayarlarsın. Fiyat artarsa kâr artar ama talep düşer. Denge sende.', tab: 'menu', hedef: function () { return $('.tab[data-t="menu"]'); }},
  {b: 'Ekip', m: 'Barista ve garson al, maaşı ve morali yönet. Ama önce koltuk mu personel mi yetmiyor ona bak.', tab: 'ekip', hedef: function () { return $('.tab[data-t="ekip"]'); }},
  {b: 'Şubeler', m: 'Şubeni geliştir ya da yeni mahallede şube aç. Her mahallenin kirası ve müşterisi farklı.', tab: 'sube', hedef: function () { return $('.tab[data-t="sube"]'); }},
  {b: 'Pazarlama ve finans', m: 'Kampanyalar marka getirir. Finans sekmesinde kâr grafiğin ve kredin var; kredi hızlı ama faizli.', tab: 'pazar', hedef: function () { return $('.tab[data-t="pazar"]'); }},
  {b: 'Ay Sonu', m: 'Kararlarını verince <b>Ay Sonu</b>\'na bas. Rapor çıkar, bazen bir olay seni karar vermeye çağırır.', tab: 'kafe', hedef: function () { return $('#ay'); }},
  {b: 'Takıldığında: ?', m: 'Üstteki <b>?</b> düğmesi bulunduğun sekmeyi açıklar ve ipucu verir. Her sekmede çalışır.', hedef: function () { return $('#yardim-b'); }},
  {b: 'İlk hedefin', m: 'İlk ayı <b>kârla</b> kapat. Sonra koltuk ve ekibi büyüt, yeni şube aç. Hedef: 10 şube ve güçlü bir marka. Başarılar patron!', son: true}
];
var TUT_EL = null, TUT_RING = null, TUT_CARD = null, TUT_I = 0;
function turGorulmus() { try { return localStorage.getItem(TUR_KEY) === '1'; } catch (e) { return true; } }
function turIsaret() { try { localStorage.setItem(TUR_KEY, '1'); } catch (e) { /* yok say */ } }
function turBitir() { turIsaret(); if (!TUT_EL) return; var r = TUT_EL; TUT_EL = null; window.removeEventListener('resize', turYer); r.remove(); TAB = 'kafe'; if (S) render(); }
function turYer() {
  if (!TUT_EL) return; var st = TUT[TUT_I], el = st.hedef ? st.hedef() : null;
  if (!el) { TUT_RING.style.display = 'none'; TUT_EL.classList.add('noring'); TUT_CARD.className = 'tutcard mid'; return; }
  TUT_EL.classList.remove('noring'); try { el.scrollIntoView({block: 'nearest', inline: 'center'}); } catch (e) { /* yok say */ }
  var r = el.getBoundingClientRect(); TUT_RING.style.cssText = 'display:block;left:' + (r.left - 6) + 'px;top:' + (r.top - 6) + 'px;width:' + (r.width + 12) + 'px;height:' + (r.height + 12) + 'px'; TUT_CARD.className = 'tutcard ' + (r.top + r.height / 2 < innerHeight / 2 ? 'bot' : 'top');
}
function turCiz() {
  var st = TUT[TUT_I], son = !!st.son; if (st.tab && TAB !== st.tab) { TAB = st.tab; render(); }
  TUT_CARD.innerHTML = '<div class="tutface">☕</div><div class="tutbody"><small class="tutwho">Usta Barista Mina</small><b>' + st.b + '</b><p>' + st.m + '</p><div class="tutbar"><div class="tutdots">' + TUT.map(function (x, k) { return '<i class="' + (k === TUT_I ? 'on' : k < TUT_I ? 'done' : '') + '"></i>'; }).join('') + '</div><span class="sp"></span>' + (son ? '' : '<button class="btn" id="t-at">Atla</button>') + (TUT_I > 0 && !son ? '<button class="btn" id="t-g">‹</button>' : '') + '<button class="btn pri" id="t-i">' + (son ? 'Başla ▸' : 'İleri ▸') + '</button></div></div>';
  var a = $('#t-at'); if (a) a.onclick = turBitir; var g = $('#t-g'); if (g) g.onclick = function () { TUT_I--; turCiz(); }; $('#t-i').onclick = function () { if (son) turBitir(); else { TUT_I++; turCiz(); } };
  setTimeout(turYer, 80); setTimeout(turYer, 380); turYer();
}
function turAc() {
  if (TUT_EL || !S) return; closeSheet(); TUT_I = 0; TUT_EL = document.createElement('div'); TUT_EL.className = 'tut'; TUT_RING = document.createElement('div'); TUT_RING.className = 'tutring'; TUT_CARD = document.createElement('div'); TUT_CARD.className = 'tutcard mid'; TUT_EL.appendChild(TUT_RING); TUT_EL.appendChild(TUT_CARD); document.body.appendChild(TUT_EL); window.addEventListener('resize', turYer); turCiz();
}
function turOtomatik() { if (!S || turGorulmus() || TUT_EL) return; if (navigator.webdriver && !/tur=1/.test(location.search)) return; turAc(); }
menu();
