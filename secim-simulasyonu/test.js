// Motor testi: node test.js
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(__dirname + '/src/data.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/src/engine.js', 'utf8');
const ctx = {console, Math, JSON, Object, Array}; vm.createContext(ctx); vm.runInContext(code + '\nthis.__x={newGame,aksiyonYap,ayiBitir,kartSec,paylar,bugunSecimOlsa,teskilatSayisi,ILLER,PARTILER,BOLGE_SIRA,GRUPLAR,AKSIYONLAR,ittifakaDavet,yakinlik,tarihYaz,oyuncuSira,hedef,KARTLAR,kartMetni,siralama};', ctx);
const X = ctx.__x;
function assert(c, m) { if (!c) { console.log('HATA:', m); process.exitCode = 1; } }

// 1) veri bütünlüğü
assert(X.ILLER.length === 81, '81 il');
assert(X.ILLER.reduce((a, b) => a + b.mv, 0) === 600, 'MV toplam 600');
const cells = new Set(X.ILLER.map(i => i.c + ',' + i.r)); assert(cells.size === 81, 'kartogram hücreleri benzersiz');
console.log('Kartogram boyutu:', Math.max(...X.ILLER.map(i => i.c)) + 1, 'x', Math.max(...X.ILLER.map(i => i.r)) + 1, '| İstanbul MV', X.ILLER[33].mv, 'Ankara', X.ILLER[5].mv, 'Tunceli', X.ILLER[61].mv);

function bot(S, strateji) {
  const st = S.stat; let bolgeIdx = 0;
  const hedefler = ['K','I','M','E','A','D','G'];
  for (let k = 0; k < 3; k++) {
    let r;
    if (st.kasa < 1.2e6) { X.aksiyonYap(S, 'bagis'); }
    if (strateji === 'yeni') {
      const tk = X.teskilatSayisi(S);
      const sirali = hedefler;
      if (tk < 45) { const b = sirali[(S.ay + k) % 7]; r = X.aksiyonYap(S, 'teskilat', b); }
      else r = X.aksiyonYap(S, k === 0 ? 'miting' : k === 1 ? 'tv' : 'secmen', k === 0 ? 'M' : k === 2 ? 'esnaf' : undefined);
      if (!r.ok) { r = X.aksiyonYap(S, 'bagis'); }
    } else {
      r = X.aksiyonYap(S, k === 0 ? 'miting' : k === 1 ? 'tv' : 'kadro', k === 0 ? 'M' : undefined);
    }
    if (st.stres > 60) X.aksiyonYap(S, 'tatil');
  }
}
function oyna(opt, strateji, ay) {
  const S = X.newGame(opt);
  const out = [];
  let guard = 0;
  while (!S.bitti && S.ay < ay && guard++ < 200) {
    bot(S, strateji);
    X.ayiBitir(S);
    while (S.kuyruk.length) {
      const q = S.kuyruk.shift();
      if (q.t === 'kart') X.kartSec(S, q, 0);
      if (q.t === 'secim') {
        const r = q.sonuc;
        if (r.tip === 'genel') {
          const sirali = X.siralama(r.koltuk);
          out.push('  SEÇİM ' + r.y + ': ' + sirali.slice(0, 5).map(id => id + ':' + r.koltuk[id]).join(' ') + ' | oyuncu girer=' + r.girer + ' | CB tur ' + r.cb.tur + ' kazanan ' + r.cb.adaylar[r.cb.kazanan].ad);
          const tp = Object.values(r.koltuk).reduce((a, b) => a + b, 0); assert(tp === 600, 'seçim sonrası koltuk 600, bulundu ' + tp);
        } else out.push('  YEREL: ' + JSON.stringify(r.iller));
      }
    }
    if (S.ay % 6 === 0) out.push(X.tarihYaz(S.tarih) + ' anket %' + S.anketOyuncu.toFixed(1) + ' (' + X.oyuncuSira(S) + '.) kasa ' + (S.stat.kasa / 1e6).toFixed(1) + 'M üye ' + S.stat.uye + ' il ' + X.teskilatSayisi(S) + ' drift ' + S.stat.drift.toFixed(1) + ' itibar ' + Math.round(S.stat.itibar) + ' stres ' + Math.round(S.stat.stres));
    const P = X.paylar(S); const toplam = Object.values(P.ulusal).reduce((a, b) => a + b, 0);
    assert(Math.abs(toplam - 100) < 0.01, 'ulusal toplam 100, bulundu ' + toplam);
    assert(!Object.values(P.ulusal).some(isNaN), 'NaN pay');
    assert(isFinite(S.stat.kasa), 'kasa sonlu');
  }
  console.log('--- ' + JSON.stringify(opt).slice(0, 80) + ' | bot=' + strateji + ' ---'); console.log(out.join('\n'));
  return S;
}
oyna({mod: 'yeni', zorluk: 'orta', parti: {}, partiAd: 'Test Parti', renk: '#e63b5f', ideo: 'sd', liderAd: 'A B', dogum: 1980, stil: 'katilimci', seed: 7}, 'yeni', 80);
oyna({mod: 'yeni', zorluk: 'zor', partiAd: 'Test Parti', ideo: 'lib', liderAd: 'A B', seed: 11}, 'yeni', 40);
oyna({mod: 'mevcut', partiId: 'CHP', liderAd: 'A B', seed: 5}, 'mevcut', 80);
oyna({mod: 'mevcut', partiId: 'AK', liderAd: 'A B', seed: 9}, 'mevcut', 30);
oyna({mod: 'mevcut', partiId: 'YRP', liderAd: 'A B', seed: 3}, 'yeni', 80);
// ittifak denemesi
const S2 = X.newGame({mod: 'yeni', zorluk: 'orta', partiAd: 'T', ideo: 'sd', liderAd: 'A', seed: 2});
S2.aksiyon.kalan = 3; console.log('İttifak CHP yakınlık', X.yakinlik(S2, 'CHP'), X.ittifakaDavet(S2, 'CHP').msg);
// kart metinleri çözülüyor mu
X.KARTLAR.forEach(k => { assert(k.sec.length >= 2, k.id + ' seçenek'); });
console.log('Kart sayısı', X.KARTLAR.length);
console.log(process.exitCode ? 'TEST BAŞARISIZ' : 'TEST TAMAM');
