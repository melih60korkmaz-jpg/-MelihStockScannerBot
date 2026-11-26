// Motor testi: node test.js
var fs = require('fs'), vm = require('vm'), ctx = {console: console, Math: Math, Object: Object, Date: Date, Array: Array, JSON: JSON, Number: Number, parseFloat: parseFloat};
vm.createContext(ctx); vm.runInContext(fs.readFileSync('src/engine.js', 'utf8') + '\nthis.X={yeniOyun,ayiBitir,subeHesapla,ayOzeti,subeAc,yukselt,personel,kampanyaBaslat,krediAl,krediOde,olaySec,olayBul,ILCELER,URUNLER,HEDEFLER,OLAYLAR,subeUcret,enflasyonCarpan};', ctx);
var X = ctx.X, fail = 0; function ok(c, m) { if (!c) { fail++; console.log('HATA:', m); } }
// 1) ilk ay
var S = X.yeniOyun({ad: 'Test', ilce: 'eski', seed: 5}), h = X.subeHesapla(S, S.subeler[0]);
console.log('ilk ay: gelir', Math.round(h.gelir), 'gider', Math.round(h.mal + h.maas + h.kira + h.fatura), 'musteri', h.musteri, 'memn', Math.round(h.memn));
ok(h.gelir > 0 && isFinite(h.gelir), 'gelir sonlu'); ok(h.memn > 40, 'memnuniyet makul');
// 2) 6 mahalle ilk ay kâr/zarar
X.ILCELER.forEach(function (il) { var T = X.yeniOyun({ilce: il.id, seed: 3}), q = X.subeHesapla(T, T.subeler[0]); var k = q.gelir - q.mal - q.maas - q.kira - q.fatura; console.log(il.ad.padEnd(15), 'kâr', Math.round(k), 'müşteri', q.musteri, 'doluluk', q.doluluk.toFixed(2)); });
// 3) bot: dengeli oyun 60 ay x 8 tohum
var bitis = {iflas: 0, zafer: 0, devam: 0}, kasalar = [], subeler = [];
for (var seed = 1; seed <= 8; seed++) {
  var G = X.yeniOyun({ilce: ['eski', 'uni', 'pazar', 'park'][seed % 4], seed: seed});
  for (var m = 0; m < 72; m++) {
    var r = X.ayiBitir(G); if (!r) break; if (!isFinite(G.kasa) || !isFinite(G.marka)) { ok(false, 'NaN seed ' + seed + ' ay ' + m); break; }
    while (G.kuyruk.length) { var id = G.kuyruk.shift(), o = X.olayBul(id); X.olaySec(G, id, m % o.sec.length); }
    if (G.bitti) break;
    // strateji: yeterli kasa varsa kampanya, koltuk, şube
    if (G.kasa > 400000 && G.subeler.length < 10 && m % 3 === 0) { var bos = X.ILCELER.filter(function (il) { return !G.subeler.some(function (s) { return s.ilce === il.id; }); }).sort(function (a, b) { return a.kira - b.kira; })[0]; if (bos && G.kasa > X.subeUcret(G, bos.id) + 200000) X.subeAc(G, bos.id); }
    G.subeler.forEach(function (s) { var hh = X.subeHesapla(G, s), kk = s.koltuk * 100, pk = s.barista * 900 + s.garson * 600; if (hh.doluluk > 1.03) { if (kk <= pk) { if (s.koltuk < 60 && G.kasa > 100000) X.yukselt(G, s, 'koltuk'); } else if (s.barista < 7) X.personel(G, s, s.barista <= s.garson * 2 ? 'barista' : 'garson', 1); } if (s.hijyen < 55) X.yukselt(G, s, 'hijyen'); if (s.moral < 45) X.yukselt(G, s, 'egitim'); });
    if (G.kasa > 120000 && m % 4 === 0) X.kampanyaBaslat(G, 'sosyal');
    if (G.kasa < 30000 && G.borc < 300000) X.krediAl(G, 150000); else if (G.kasa > 700000 && G.borc > 0) X.krediOde(G, G.borc);
  }
  bitis[G.bitti || 'devam']++; kasalar.push(Math.round(G.kasa / 1000)); subeler.push(G.subeler.length);
  console.log('tohum', seed, 'ay', G.ay, 'son:', G.bitti || 'devam', 'kasa(B)', Math.round(G.kasa / 1000), 'şube', G.subeler.length, 'marka', Math.round(G.marka), 'hedef', Object.keys(G.hedef).length);
}
console.log(JSON.stringify(bitis));
ok(true, ''); console.log(fail ? 'TEST HATALI' : 'KAFE TESTI TAMAM');
