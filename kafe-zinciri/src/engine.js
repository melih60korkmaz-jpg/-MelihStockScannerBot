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
