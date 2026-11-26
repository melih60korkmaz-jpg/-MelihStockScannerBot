/* ===== KAFE ZİNCİRİ — simülasyon motoru (DOM'suz, test edilebilir) ===== */
var AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
var AYLAR_UZUN = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
/* Yeşilvadi şehrinin mahalleleri (kurgusal). yog: yoğunluk 1-10, zen: gelir düzeyi 1-5, kira: aylık baz TL */
var ILCELER = [
  {id: 'eski', ad: 'Eski Kent', ikon: '🏛️', yog: 5, zen: 2, kira: 38000, x: 70, y: 70, seg: {ogr: .1, cal: .15, tur: .3, aile: .15, emk: .3}, not: 'Sakin, uygun kira. Turist ve emekli ağırlıklı.'},
  {id: 'uni', ad: 'Üniversite', ikon: '🎓', yog: 6, zen: 2, kira: 42000, x: 160, y: 40, seg: {ogr: .6, cal: .1, tur: .05, aile: .1, emk: .15}, not: 'Öğrenci akını; fiyata duyarlı, kalabalık.'},
  {id: 'site', ad: 'Yeni Site', ikon: '🏘️', yog: 4, zen: 3, kira: 36000, x: 285, y: 55, seg: {ogr: .05, cal: .2, tur: 0, aile: .55, emk: .2}, not: 'Aileler, hafta sonu yoğun.'},
  {id: 'pazar', ad: 'Pazar Yeri', ikon: '🛒', yog: 6, zen: 2, kira: 40000, x: 55, y: 150, seg: {ogr: .15, cal: .25, tur: .1, aile: .25, emk: .25}, not: 'Hareketli çarşı; sabahları dolar.'},
  {id: 'park', ad: 'Park Çevresi', ikon: '🌳', yog: 5, zen: 3, kira: 46000, x: 165, y: 120, seg: {ogr: .15, cal: .2, tur: .15, aile: .35, emk: .15}, not: 'Hafta sonu ve yaz aylarında canlı.'},
  {id: 'carsi', ad: 'Çarşı Merkezi', ikon: '🏬', yog: 9, zen: 3, kira: 95000, x: 250, y: 130, seg: {ogr: .15, cal: .3, tur: .3, aile: .15, emk: .1}, not: 'Çok yoğun ama kira pahalı.'},
  {id: 'is', ad: 'İş Merkezi', ikon: '🏢', yog: 8, zen: 4, kira: 88000, x: 320, y: 120, seg: {ogr: .02, cal: .8, tur: .1, aile: .03, emk: .05}, not: 'Ofis çalışanları; hızlı servis, yüksek sepet.'},
  {id: 'sahil', ad: 'Sahil', ikon: '🏖️', yog: 7, zen: 4, kira: 82000, x: 215, y: 195, seg: {ogr: .1, cal: .1, tur: .5, aile: .2, emk: .1}, not: 'Yazın patlar, kışın durulur.'},
  {id: 'sanayi', ad: 'Sanayi Sitesi', ikon: '🏭', yog: 3, zen: 1, kira: 24000, x: 100, y: 205, seg: {ogr: .05, cal: .7, tur: 0, aile: .1, emk: .15}, not: 'Ucuz kira, düşük bütçeli müşteri.'},
  {id: 'hava', ad: 'Havalimanı', ikon: '✈️', yog: 7, zen: 5, kira: 120000, x: 320, y: 200, seg: {ogr: .02, cal: .25, tur: .7, aile: .02, emk: .01}, not: 'Yolcular; en yüksek fiyatı öder.'}
];
var SEGMENTLER = [['ogr', 'Öğrenci', '🎓', '#4aa3e8'], ['cal', 'Çalışan', '💼', '#e0983c'], ['tur', 'Turist', '🧳', '#b57edc'], ['aile', 'Aile', '👨‍👩‍👧', '#5fc08a'], ['emk', 'Emekli', '👵', '#e86a9a']];
var ESEG = {ogr: 2.3, cal: 1.2, tur: 1.0, aile: 1.6, emk: 1.8};
/* Menü: pay = sepet payı, mal = baz maliyet TL, fiyat = baz pazar fiyatı TL, mevsim: 'soguk'|'sicak'|null */
var URUNLER = [
  {id: 'turk', ad: 'Türk Kahvesi', ikon: '☕', fiyat: 55, mal: 12, pay: .12, mevsim: 'sicak', kal: 18000, sev: 1, aff: [.6, 1, 1.6, .8, 1.5]},
  {id: 'espresso', ad: 'Espresso', ikon: '🫘', fiyat: 70, mal: 14, pay: .08, mevsim: null, kal: 20000, sev: 1, aff: [1, 1.6, 1, .5, .6]},
  {id: 'filtre', ad: 'Filtre Kahve', ikon: '🫖', fiyat: 65, mal: 14, pay: .14, mevsim: null, kal: 25000, sev: 1, aff: [1, 1.3, .8, .9, .9]},
  {id: 'latte', ad: 'Latte', ikon: '🥛', fiyat: 95, mal: 22, pay: .17, mevsim: null, kal: 35000, sev: 1, aff: [1.3, 1.2, 1, 1, .7]},
  {id: 'mocha', ad: 'Mocha', ikon: '🍫', fiyat: 110, mal: 28, pay: .06, mevsim: 'sicak', kal: 36000, sev: 2, aff: [1.4, .9, 1, 1.2, .5]},
  {id: 'cay', ad: 'Çay', ikon: '🍵', fiyat: 30, mal: 5, pay: .14, mevsim: 'sicak', kal: 12000, sev: 1, aff: [.8, .9, .9, 1, 1.8]},
  {id: 'sandvic', ad: 'Sandviç', ikon: '🥪', fiyat: 110, mal: 40, pay: .05, mevsim: null, kal: 38000, sev: 1, aff: [1.3, 1.4, .8, 1.2, .7]},
  {id: 'pogaca', ad: 'Poğaça', ikon: '🥟', fiyat: 45, mal: 11, pay: .05, mevsim: null, kal: 15000, sev: 1, gerek: 'firin', aff: [1.1, 1.1, .7, 1, 1.4]},
  {id: 'kruvasan', ad: 'Kruvasan', ikon: '🥐', fiyat: 75, mal: 20, pay: .05, mevsim: null, kal: 26000, sev: 2, gerek: 'firin', aff: [1, 1.3, 1.1, 1.1, 1]},
  {id: 'cheese', ad: 'Cheesecake', ikon: '🍰', fiyat: 120, mal: 38, pay: .05, mevsim: null, kal: 40000, sev: 1, gerek: 'dolap', aff: [1.2, .8, 1.3, 1.5, .8]},
  {id: 'soguk', ad: 'Soğuk Kahve', ikon: '🧊', fiyat: 105, mal: 24, pay: .06, mevsim: 'soguk', kal: 30000, sev: 1, gerek: 'dolap', aff: [1.4, 1, 1.2, 1, .4]},
  {id: 'limonata', ad: 'Limonata', ikon: '🍋', fiyat: 85, mal: 16, pay: .05, mevsim: 'soguk', kal: 22000, sev: 2, gerek: 'dolap', aff: [1.2, .8, 1.2, 1.5, .7]}
];
var EKIPMAN = [
  {id: 'espresso', ad: 'Espresso makinesi', ikon: '☕', max: 3, maliyet: 60000, ac: 'Daha iyi lezzet ve hızlı servis (her seviye).'},
  {id: 'degirmen', ad: 'Hassas değirmen', ikon: '⚙️', max: 2, maliyet: 40000, ac: 'Lezzet artar, fire azalır.'},
  {id: 'pos', ad: 'Hızlı kasa sistemi', ikon: '🧾', max: 2, maliyet: 30000, ac: 'Kuyruk kısalır, kapasite artar.'},
  {id: 'firin', ad: 'Fırın', ikon: '🔥', max: 1, maliyet: 90000, ac: 'Poğaça ve kruvasan satışı açılır.'},
  {id: 'dolap', ad: 'Soğutucu dolap', ikon: '🧊', max: 1, maliyet: 50000, ac: 'Cheesecake, soğuk kahve ve limonata açılır.'},
  {id: 'teras', ad: 'Açık hava terası', ikon: '⛱️', max: 1, maliyet: 85000, ac: '+10 koltuk, yazın ek müşteri.'},
  {id: 'wifi', ad: 'Hızlı Wi-Fi ve priz', ikon: '📶', max: 1, maliyet: 15000, ac: 'Öğrenci ve çalışanları çeker.'},
  {id: 'panel', ad: 'Güneş paneli', ikon: '☀️', max: 1, maliyet: 120000, ac: 'Fatura gideri %35 düşer.'}
];
var RAKIPLER0 = [
  {id: 'moka', ad: 'Moka Express', ikon: '🟤', fiyat: 1.10, kalite: 2, agr: .6, ilce: ['carsi', 'is']},
  {id: 'ristre', ad: 'Ristretto Plus', ikon: '🔵', fiyat: .90, kalite: 1, agr: .8, ilce: ['uni', 'pazar']},
  {id: 'firin', ad: 'Yeşilvadi Fırın Kafe', ikon: '🟠', fiyat: 1.00, kalite: 2, agr: .4, ilce: ['eski', 'site']}
];
var OZEL = {1: {ad: 'Sevgililer Günü', ikon: '💝', trafik: .04, urun: {cheese: 1.4, mocha: 1.5, kruvasan: 1.2}}, 4: {ad: 'Anneler Günü', ikon: '🌸', trafik: .03, urun: {cheese: 1.3, kruvasan: 1.3}}, 5: {ad: 'Yaz Tatili Başladı', ikon: '🏖️', trafik: .03, urun: {soguk: 1.2, limonata: 1.3}}, 8: {ad: 'Okullar Açıldı', ikon: '🎒', trafik: .05, urun: {espresso: 1.15, sandvic: 1.2}, seg: 'ogr'}, 9: {ad: 'Sonbahar Lezzetleri', ikon: '🍂', trafik: .01, urun: {mocha: 1.25, cay: 1.1}}, 11: {ad: 'Yılbaşı Telaşı', ikon: '🎄', trafik: .05, urun: {mocha: 1.4, cheese: 1.2}}};
var SEVIYE_AD = ['', 'Mahalle Kafesi', 'Yerel Marka', 'Şehir Zinciri', 'Bölgesel Marka', 'Ulusal Marka'];
function seviye(S) { var n = S.subeler.length, m = S.marka; return 1 + (n >= 2 ? 1 : 0) + (n >= 4 && m >= 35 ? 1 : 0) + (n >= 7 && m >= 55 ? 1 : 0) + (n >= 10 && m >= 75 ? 1 : 0); }
function urunAcik(S, s, u) { return seviye(S) >= u.sev && (!u.gerek || (s.ek && s.ek[u.gerek] > 0)); }
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
  return {id: S.sn, ilce: ilceId, ad: ad || il.ad + ' Şubesi', koltuk: 20, dekor: 1, hijyen: 70, barista: 2, garson: 1, maas: 1, moral: 70, kira: il.kira, ac: S.ay, son: null, gecmis: [], ek: {}, mudur: 0};
}
function yeniOyun(o) {
  var S = {v: 2, rs: ((o.seed || 20270101) | 0) >>> 0, ad: o.ad || 'Fincan Kahve', ay: 0, basAy: 0, kasa: 320000, marka: 22, borc: 0, enf: 38, tedarik: 'orta', kamp: [], trafikB: null, olayMemn: 0, gecmis: [], hedef: {}, log: [], bitti: false, ifasAy: 0, sn: 0, kuyruk: [], yorumlar: [], toplamKar: 0};
  S.menu = {}; URUNLER.forEach(function (u) { S.menu[u.id] = {fiyat: 1, kalite: 1, aktif: true}; });
  S.rakipler = RAKIPLER0.map(function (r) { return {id: r.id, ad: r.ad, ikon: r.ikon, fiyat: r.fiyat, kalite: r.kalite, agr: r.agr, ilce: r.ilce.slice()}; });
  var il = ilceBul(o.ilce || 'eski'); S.subeler = [yeniSube(S, il.id, S.ad)]; S.kasa -= 120000 + il.kira * 1.0;
  return S;
}
function sezonCarpan(u, m) { var yaz = m >= 5 && m <= 8, kis = m <= 1 || m === 11; if (u.mevsim === 'soguk') return yaz ? 1.9 : kis ? .35 : 1; if (u.mevsim === 'sicak') return yaz ? .85 : kis ? 1.2 : 1; return 1; }
function kampEtki(S) {
  var t = 0, m = 0, mm = 0; S.kamp.forEach(function (k) { var d = KAMPANYALAR.filter(function (x) { return x.id === k.id; })[0]; if (!d || k.bit <= S.ay || k.bos) return; t += d.trafik; m += d.marka; mm += d.memn || 0; });
  return {trafik: t, marka: m, memn: mm};
}
function segOrt(il) { return il.seg; }
function rakipBaskiIlce(S, ilceId, fiyatOrt, kalOrt) {
  var b = 0; (S.rakipler || []).forEach(function (r) { if (r.ilce.indexOf(ilceId) < 0) return; var q = 0.065 * (0.8 + r.agr); q *= clamp(fiyatOrt / r.fiyat, 0.85, 1.3); if (kalOrt > r.kalite) q *= 0.75; b += q; });
  return b + (S.rakipBaski || 0);
}
function subeHesapla(S, s) {
  var il = ilceBul(s.ilce), F = enflasyonCarpan(S), m = (S.basAy + S.ay) % 12, ke = kampEtki(S), tb = S.trafikB && S.trafikB.bit > S.ay ? S.trafikB.v : 0, ek = s.ek || {}, oz = OZEL[m], seg = il.seg, yaz = m >= 5 && m <= 8;
  var wifi = ek.wifi ? 0.06 * (seg.ogr + seg.cal) : 0, teras = ek.teras && yaz ? 0.04 : 0, ozT = oz ? oz.trafik * (oz.seg ? 1 + 3 * seg[oz.seg] : 1) : 0, tur = seg.tur * (yaz ? 1.5 : 1);
  var ekT = 1, esp = ek.espresso || 0, dgr = ek.degirmen || 0, pos = ek.pos || 0;
  /* fiyat ve kalite ortalaması */
  var acik = URUNLER.filter(function (u) { return S.menu[u.id].aktif && urunAcik(S, s, u); }), fiyatOrt = 0, kalOrt = 0, fw = 0;
  acik.forEach(function (u) { fiyatOrt += S.menu[u.id].fiyat * u.pay; kalOrt += S.menu[u.id].kalite * u.pay; fw += u.pay; }); fiyatOrt /= fw || 1; kalOrt /= fw || 1;
  var baski = rakipBaskiIlce(S, s.ilce, fiyatOrt, kalOrt);
  var trafik = il.yog * 640 * (0.45 + S.marka / 90) * SEZON_TRAFIK[m] * (1 + 0.15 * tur) * (1 + 0.07 * (s.dekor - 1)) * (1 + ke.trafik + tb + wifi + teras + ozT) * (1 - clamp(baski, 0, 0.55) * 0.5) * (1 + 0.03 * (s.mudur || 0));
  var koltukKap = (s.koltuk + (ek.teras ? 10 : 0)) * 100, persKap = (s.barista * BARISTA.kap + s.garson * GARSON.kap) * (1 + 0.06 * esp + 0.08 * pos), kap = Math.min(koltukKap, persKap);
  var musteri = Math.round(Math.min(trafik, kap)), doluluk = trafik / Math.max(1, kap);
  var e = -0.08 * (il.zen - 2); SEGMENTLER.forEach(function (g) { e += seg[g[0]] * ESEG[g[0]]; }); var sepet = 1.65 + 0.1 * (il.zen - 2) + 0.25 * seg.cal;
  var sum = 0, w = {}; acik.forEach(function (u) { var af = 0; SEGMENTLER.forEach(function (g, i) { af += seg[g[0]] * u.aff[i]; }); var oz2 = oz && oz.urun && oz.urun[u.id] ? oz.urun[u.id] : 1; w[u.id] = u.pay * sezonCarpan(u, m) * af * oz2; sum += w[u.id]; });
  var gelir = 0, mal = 0, adet = 0, tedMal = TEDARIK[S.tedarik].mal * (1 - 0.03 * dgr), satis = {};
  acik.forEach(function (u) { var mu = S.menu[u.id], p = mu.fiyat, el = clamp(Math.exp(-e * (p - 1)), .3, 1.7), qb = 1 + 0.06 * (mu.kalite - 1), n = musteri * sepet * (w[u.id] / sum) * el * qb; satis[u.id] = n; adet += n; gelir += n * u.fiyat * F * p; mal += n * u.mal * F * tedMal * (1 + 0.12 * (mu.kalite - 1)); });
  var maas = (s.barista * BARISTA.maas + s.garson * GARSON.maas) * MAAS_ADIM[s.maas] * F + (s.mudur ? 52000 * F : 0), kira = s.kira * F, fatura = (9000 + s.koltuk * 260 + (s.dekor - 1) * 3000 + (ek.firin ? 4000 : 0) + (ek.dolap ? 2500 : 0) + (ek.espresso ? 1500 * esp : 0)) * F * (ek.panel ? 0.65 : 1), temizlik = 3500 * F * (1 + (s.hijyen - 60) / 200);
  var memn = 62 + clamp(-26 * (fiyatOrt - 1), -9, 9) + TEDARIK[S.tedarik].memn + (kalOrt - 1) * 5 - clamp((doluluk - 1) * 22, 0, 26) + (s.hijyen - 60) * 0.15 + (s.dekor - 1) * 3 + (s.moral - 60) * 0.1 + ke.memn + S.olayMemn + 2.5 * esp + 2 * dgr + (ek.firin ? 1 : 0) + (s.mudur ? 4 : 0) - clamp(baski * 10, 0, 6);
  memn = clamp(memn, 0, 100);
  return {gelir: gelir, mal: mal, maas: maas, kira: kira, fatura: fatura + temizlik, musteri: musteri, doluluk: doluluk, memn: memn, adet: adet, trafik: trafik, kap: kap, koltukKap: koltukKap, persKap: persKap, baski: baski, satis: satis, fiyatOrt: fiyatOrt, kalOrt: kalOrt, ozel: oz || null};
}
function subeKar(h) { return h.gelir - h.mal - h.maas - h.kira - h.fatura; }
var YORUM_AD = ['Ayşe', 'Mehmet', 'Elif', 'Can', 'Zeynep', 'Burak', 'Selin', 'Emre', 'Derya', 'Kerem', 'Merve', 'Onur'];
function yorumlar(S, s, h) {
  var y = [], ad = function () { return YORUM_AD[Math.floor(rnd(S) * YORUM_AD.length)]; };
  if (h.memn >= 78) y.push({a: ad(), y: 5, t: 'Mekân harika, kahve efsane. Kesin tekrar geleceğim!'});
  if (h.memn >= 65) y.push({a: ad(), y: 4, t: 'Güzel bir yer, servis hızlı.'});
  if (h.doluluk > 1.15) y.push({a: ad(), y: 2, t: 'Çok bekledik, yer bulmak zor. Kadroyu büyütün.'});
  if (h.fiyatOrt > 1.15) y.push({a: ad(), y: 3, t: 'Lezzetli ama fiyatlar biraz yüksek.'}); if (h.fiyatOrt < .92) y.push({a: ad(), y: 5, t: 'Bu fiyata bu kalite süper!'});
  if (s.hijyen < 50) y.push({a: ad(), y: 2, t: 'Masalar temiz değildi.'}); if (s.moral < 45) y.push({a: ad(), y: 3, t: 'Çalışanlar yorgun görünüyordu.'});
  if ((s.ek || {}).wifi) y.push({a: ad(), y: 5, t: 'Wi-Fi çok hızlı, burada çalışılıyor.'}); if (TEDARIK[S.tedarik].memn < 0) y.push({a: ad(), y: 3, t: 'Kahve eskisi kadar güzel değil gibi.'});
  if (h.baski > .12) y.push({a: ad(), y: 3, t: 'Karşı sokaktaki yeni zincir de fena değil ama burası daha samimi.'});
  if ((s.ek || {}).teras) y.push({a: ad(), y: 5, t: 'Terasta kahve içmek bir başka.'});
  while (y.length < 3) y.push({a: ad(), y: 4, t: ['Çayı çok iyi.', 'Personel güler yüzlü.', 'Tatlılar taze ve lezzetli.', 'Sakin bir köşe, kitap okumak için ideal.'][Math.floor(rnd(S) * 4)]});
  return y.slice(0, 4);
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
  {id: 'ogrenci', ikon: '🎒', baslik: 'Öğrenci İndirimi Talebi', metin: 'Üniversite kulübü, öğrencilere sürekli indirim yapmanı istiyor.', kosul: function (S) { return S.ay >= 3 && S.subeler.some(function (s) { return s.ilce === 'uni'; }); }, sec: [O('Kabul et: öğrenciye %10 indirim', {marka: 1, trafik: .08, trafikSure: 3, kasa: -8000}, 'Öğrenciler dükkânı doldurdu; kâr marjı biraz düştü.'), O('Reddet', {marka: -.3}, 'Kulüp başka kafeye yöneldi.')]},
  {id: 'turist', ikon: '🧳', baslik: 'Turist Grubu', metin: 'Bir tur şirketi, grupları için sabah kahvaltı paketi anlaşması öneriyor.', kosul: function (S) { return S.ay >= 4 && S.subeler.some(function (s) { return ilceBul(s.ilce).seg.tur >= .3; }); }, sec: [O('Anlaşmayı yap (−10 B ₺ hazırlık)', {kasa: -10000, trafik: .12, trafikSure: 2, marka: .8}, 'Gruplar akın etti, sepet büyüdü.'), O('Geç', {}, 'Teklif başka bir kafeye gitti.')]},
  {id: 'gecikme', ikon: '🚚', baslik: 'Tedarik Gecikti', metin: 'Çekirdek ve süt sevkiyatı iki gün gecikti.', kosul: function (S) { return S.ay >= 3; }, sec: [O('Acil piyasadan al (−15 B ₺)', {kasa: -15000}, 'Servis aksamadı, maliyet arttı.'), O('Menüyü kısalt, beklenir', {memn: -4}, 'Bazı ürünler tükendi; şikâyetler geldi.')]},
  {id: 'hirsiz', ikon: '🕵️', baslik: 'Kasa Açığı', metin: 'Ay sonu sayımında kasada açık çıktı.', kosul: function (S) { return S.ay >= 5; }, sec: [O('Kamera ve kasa sistemi kur (−12 B ₺)', {kasa: -12000, moral: -2}, 'Sistem kuruldu; sorun çözüldü.'), O('Ekiple konuş', {moral: -4}, 'Ortam biraz gerildi.', [{p: 0.4, fx: {kasa: -9000}, msg: 'Açık kapanmadı, zarar edildi.'}])]},
  {id: 'fikir', ikon: '💡', baslik: 'Yeni Ürün Fikri', metin: 'Baristan, sezon menüsüne özel bir içecek önerdi.', kosul: function (S) { return S.ay >= 4; }, sec: [O('Dene (−10 B ₺)', {kasa: -10000, marka: 1, memn: 2}, 'İçecek çok sevildi; sosyal medyada konuşuldu.', [{p: 0.25, fx: {marka: -.4}, msg: 'Pek tutmadı ama zararı küçük kaldı.'}]), O('Geç', {}, 'Fikir rafa kalktı.')]},
  {id: 'kira2', ikon: '🏗️', baslik: 'Cadde Yenileme', metin: 'Belediye caddede yol çalışması başlatıyor; bir süre müşteri azalabilir.', kosul: function (S) { return S.ay >= 5; }, sec: [O('Terasa ve tabelaya yatır (−18 B ₺)', {kasa: -18000, trafik: -.04, trafikSure: 2, marka: .5}, 'Kısa süreli düşüş yaşandı ama görünürlük arttı.'), O('Sabırla bekle', {trafik: -.1, trafikSure: 2}, 'Yol çalışması müşteriyi azalttı.')]},
  {id: 'odul', ikon: '🏅', baslik: 'Yerel Kafe Ödülü', metin: 'Şehir gazetesi "En iyi mahalle kafesi" yarışması düzenliyor.', kosul: function (S) { return S.ay >= 8 && S.marka > 30; }, sec: [O('Katıl (−15 B ₺)', {kasa: -15000}, 'Başvuru yapıldı.', [{p: 0.5, fx: {marka: 3, trafik: .1, trafikSure: 2}, msg: '🏆 Ödülü kazandın! Marka büyüdü.'}, {p: 0.5, fx: {marka: .3}, msg: 'Kazanamadın ama görünür oldun.'}]), O('Katılma', {}, 'Başvuru yapılmadı.')]},
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
  ['ilk', '☕', 'İlk Fincan', 'İlk ayı kârla kapat', function (S) { return S.gecmis.some(function (g) { return g.kar > 0; }); }, 20000],
  ['yildiz4', '⭐', '4 Yıldız', 'Memnuniyeti 80 üstüne çıkar', function (S) { return S.gecmis.length && S.gecmis[S.gecmis.length - 1].memn >= 80; }, 30000],
  ['firin', '🔥', 'Fırın Kuruldu', 'Bir şubede fırın kur', function (S) { return S.subeler.some(function (s) { return s.ek && s.ek.firin; }); }, 0],
  ['sube2', '🏪', 'İkinci Şube', '2 şubeye ulaş', function (S) { return S.subeler.length >= 2; }, 30000],
  ['sube3', '🏬', 'Üç Şube', '3 şubeye ulaş', function (S) { return S.subeler.length >= 3; }, 50000],
  ['marka50', '📣', 'Tanınan Marka', 'Marka puanını 50 yap', function (S) { return S.marka >= 50; }, 60000],
  ['teras', '⛱️', 'Teraslı Kafe', 'Bir şubeye teras ekle', function (S) { return S.subeler.some(function (s) { return s.ek && s.ek.teras; }); }, 0],
  ['kasa1m', '💰', 'Milyoner', 'Kasada 1 milyon ₺', function (S) { return S.kasa >= 1e6; }, 0],
  ['sev3', '🌆', 'Şehir Zinciri', 'Şehir Zinciri seviyesine ulaş', function (S) { return seviye(S) >= 3; }, 80000],
  ['yil1', '📅', 'İlk Yıl', 'Bir yıl ayakta kal', function (S) { return S.ay >= 12; }, 40000],
  ['borcsuz', '🧾', 'Borçsuz', 'Kredi alıp tamamen öde', function (S) { return S.krediAldi && S.borc === 0; }, 0],
  ['mudur', '🧑‍💼', 'Yönetici Kadro', 'Bir şubeye müdür ata', function (S) { return S.subeler.some(function (s) { return s.mudur; }); }, 0],
  ['sev4', '🏙️', 'Bölgesel Marka', 'Bölgesel Marka seviyesine ulaş', function (S) { return seviye(S) >= 4; }, 150000],
  ['yil3', '🎂', 'Üç Yıl', 'Üç yıl ayakta kal', function (S) { return S.ay >= 36; }, 100000],
  ['imp', '👑', 'Kafe İmparatoru', '10 şube ve marka 80', function (S) { return S.subeler.length >= 10 && S.marka >= 80; }, 0]
];

/* ---------- Ay sonu ---------- */
function ayiBitir(S) {
  if (S.bitti) return null; S.kuyruk = []; var F = enflasyonCarpan(S), ke = kampEtki(S), r = ayOzeti(S), rapor = {ay: tarihYaz(S), gelir: r.gelir, gider: r.gider, musteri: r.musteri, memn: r.memn, notlar: []};
  var faiz = S.borc * 0.03; rapor.faiz = faiz; var kar = r.gelir - r.gider - faiz, kamp = 0;
  S.kasa += r.gelir - r.gider - faiz; rapor.kar = kar;
  S.subeler.forEach(function (s, i) { var h = r.subeler[i]; if (!h) return; s.son = h; s.gecmis.push({k: subeKar(h), m: h.musteri}); if (s.gecmis.length > 12) s.gecmis.shift(); s.moral = clamp(s.moral + (MAAS_ADIM[s.maas] - 1) * 20 - 1 + (h.doluluk > 1.2 ? -3 : 1), 0, 100); s.hijyen = clamp(s.hijyen - 2.5, 0, 100); });
  S.marka = clamp(S.marka + (r.memn - 60) * 0.03 + ke.marka - 0.25 - ((S.rakipBaski || 0) * 0.3), 0, 100);
  S.kamp.forEach(function (k) { var d = KAMPANYALAR.filter(function (x) { return x.id === k.id; })[0]; if (d && d.risk && !k.rk) { k.rk = 1; if (rnd(S) < d.risk) { k.bos = 1; rapor.notlar.push('Fenomen kampanyası beklenen ilgiyi görmedi.'); } } });
  S.kamp = S.kamp.filter(function (k) { return k.bit > S.ay + 1; }); S.olayMemn = 0; S.rakipBaski = Math.max(0, (S.rakipBaski || 0) - 0.02);
  S.toplamKar += kar; S.yorumlar = yorumlar(S, S.subeler[0], r.subeler[0] || subeHesapla(S, S.subeler[0])); S.gecmis.push({ay: tarihYaz(S), gelir: r.gelir, gider: r.gider + faiz, kar: kar, memn: r.memn, marka: S.marka, kasa: S.kasa, musteri: r.musteri}); if (S.gecmis.length > 36) S.gecmis.shift();
  S.ay++;
  if (S.kasa < -150000) S.ifasAy++; else S.ifasAy = 0;
  if (S.ifasAy >= 3) { S.bitti = 'iflas'; rapor.notlar.push('Üç aydır kasa eksi 150 B ₺ altında; kafe zinciri iflas etti.'); }
  S.hedef = S.hedef || {}; rapor.hedefler = []; HEDEFLER.forEach(function (h) { if (!S.hedef[h[0]] && h[4](S)) { S.hedef[h[0]] = S.ay; if (h[5]) S.kasa += h[5]; rapor.hedefler.push(h[2]); rapor.notlar.push('🎖️ Hedef: ' + h[2] + (h[5] ? ' (+' + para(h[5]) + ' ödül)' : '')); } });
  rakipTick(S, rapor);
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

function ekipAl(S, s, id) {
  var d = EKIPMAN.filter(function (x) { return x.id === id; })[0], lv = (s.ek[id] || 0), F = enflasyonCarpan(S), c = d.maliyet * (lv + 1) * F;
  if (lv >= d.max) return {ok: false, m: 'Zaten en üst seviye.'}; if (S.kasa < c) return {ok: false, m: 'Kasa yetersiz (' + para(c) + ').'};
  S.kasa -= c; s.ek[id] = lv + 1; return {ok: true, m: d.ad + ' kuruldu (−' + para(c) + ').'};
}
function mudurAta(S, s) { var F = enflasyonCarpan(S), c = 25000 * F; if (s.mudur) return {ok: false, m: 'Şubede zaten müdür var.'}; if (S.kasa < c) return {ok: false, m: 'Kasa yetersiz.'}; S.kasa -= c; s.mudur = 1; return {ok: true, m: 'Şube müdürü atandı (aylık maaş eklenir).'}; }
function pazarPayi(S) { var t = 0, benim = 0; S.subeler.forEach(function (s) { var il = ilceBul(s.ilce); t += il.yog; benim += il.yog; }); (S.rakipler || []).forEach(function (r) { r.ilce.forEach(function (id) { t += ilceBul(id).yog * 0.9; }); }); return benim / Math.max(1, t); }

function rakipTick(S, rapor) {
  (S.rakipler || []).forEach(function (r) {
    if (rnd(S) < 0.05 + (S.ay > 12 ? 0.02 : 0)) { var hed = S.subeler.map(function (s) { return s.ilce; }).filter(function (id) { return r.ilce.indexOf(id) < 0; }); if (hed.length && rnd(S) < 0.7) { var id = hed[Math.floor(rnd(S) * hed.length)]; r.ilce.push(id); rapor.notlar.push('🥊 ' + r.ad + ', ' + ilceBul(id).ad + ' mahallesinde şube açtı.'); } }
    if (rnd(S) < 0.03) { r.fiyat = clamp(r.fiyat - 0.04, 0.8, 1.2); rapor.notlar.push('🏷️ ' + r.ad + ' fiyat indirdi.'); }
    if (rnd(S) < 0.025) { r.kalite = Math.min(3, r.kalite + 1); }
  });
}
