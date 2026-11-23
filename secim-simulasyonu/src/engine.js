'use strict';
/* ===== MOTOR: durum, anket/oy hesabı, D'Hondt, seçimler, aksiyonlar, ay sonu ===== */
var AYLAR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
var AYLAR_UZUN = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
var GOV0 = ['AK','MHP','BBP','HUDA'];
var LIDER_AI = {AK:'Selçuk Aydemir',CHP:'Nermin Karaoğlu',MHP:'Ferhat Bozdemir',DEM:'Leyla Çağlayan',IYI:'Alper Gökçe',YRP:'Yeniden Refah Genel Başkanı',ZAFER:'Zafer Genel Başkanı'};
var MECLIS0 = {AK:285,CHP:135,DEM:56,MHP:50,IYI:32,YRP:5,TIP:4,HUDA:4,SAADET:4,DEVA:4,GP:3,BBP:2,DSP:1,DP:1};

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rnd(S) {
  S.rs = (S.rs + 0x6D2B79F5) | 0;
  var t = S.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rn(S, a, b) { return a + (b - a) * rnd(S); }
function norm(S) { return (rnd(S) + rnd(S) + rnd(S) - 1.5) / 0.5; }
function pick(S, arr) { return arr[Math.floor(rnd(S) * arr.length)]; }
function tarihNo(t) { return t.y * 12 + t.m; }
function tarihYaz(t) { return AYLAR[t.m - 1] + ' ' + t.y; }
function tarihUzun(t) { return AYLAR_UZUN[t.m - 1] + ' ' + t.y; }
function govMu(S, id) { return S.gov.indexOf(id) >= 0; }
function oyuncuAdi(S) { return S.parti.ad; }
function partiAdi(S, id) { return id === S.pid ? S.parti.ad : (partiBul(id) || {ad: id}).ad; }
function partiRengi(S, id) { return id === S.pid ? S.parti.renk : (partiBul(id) || {renk: '#6b7080'}).renk; }
function gaf() { return 1 + Math.random() * 0; }

/* ---------- yeni oyun ---------- */
function senaryoUygula(S, id) {
  if (id === 'rastgele') id = pick(S, Object.keys(SENARYOLAR));
  var sn = SENARYOLAR[id] || SENARYOLAR.klasik; S.senaryo = id;
  PARTILER.forEach(function (p, j) { S.mods[j] = clamp(S.mods[j] + rn(S, -0.04, 0.04), 0.6, 1.5); });
  if (sn.makro) Object.keys(sn.makro).forEach(function (k) { S.makro[k] = sn.makro[k]; });
  PARTILER.forEach(function (p, j) {
    if (p.id === S.pid) return;
    var mu = 1; if (sn.gov && govMu(S, p.id)) mu = sn.gov; else if (sn.opp) mu = sn.opp;
    if (sn.big) mu *= p.baz > 20 ? sn.big : sn.small;
    S.sbias = S.sbias || {}; S.sbias[p.id] = mu; S.mods[j] *= mu;
    if (sn.yk) S.yk[p.id] = clamp(S.yk[p.id] + sn.yk, -50, 50);
  });
  if (sn.makro && sn.makro.enf) S.makro.asgari = Math.round(28075 * (1 + (sn.makro.enf - 46) / 200));
  if (id !== 'klasik') S.tarihce.unshift({t: 'Eyl 2026', i: '🎲', m: 'Senaryo: ' + sn.ad + '. ' + sn.not});
}
function newGame(o) {
  var S = {v: 1, rs: (o.seed || 20260919) | 0, mod: o.mod, zorluk: o.zorluk || 'orta'};
  S.stilId = o.stil || 'katilimci'; S.stil = STILLER[S.stilId];
  S.tarih = {y: 2026, m: 9}; S.ay = 0;
  var yeni = o.mod === 'yeni';
  S.pid = yeni ? 'YENI' : o.partiId;
  var pb = partiBul(S.pid);
  S.parti = yeni ? {ad: o.partiAd || 'Yeni Parti', renk: o.renk || '#e63b5f', ideo: o.ideo || 'sd', logo: o.logo} : {ad: pb.ad, renk: pb.renk, ideo: pb.ideo};
  S.lider = {ad: o.liderAd || 'Genel Başkan', dogum: o.dogum || 1980};
  S.makro = {enf: 46, faiz: 40, usd: 41.2, issiz: 8.6, buyume: 3.1, asgari: 28075, fiyat: 100};
  S.politika = {h: 0, v: 0, f: 0}; S.makroGecmis = [];
  makroEkle(S.makro);
  S.gov = GOV0.slice();
  S.ittifaklar = [{ad: 'Cumhur İttifakı', uyeler: GOV0.slice()}];
  S.yk = {}; PARTILER.forEach(function (p) { S.yk[p.id] = Math.round(rn(S, -10, 10)); });
  S.mods = PARTILER.map(function () { return 1; });
  S.pn = ILLER.map(function () { return Math.exp(0.15 * norm(S)); });
  S.baz = kalibre(S);
  var zor = ZORLUKLAR[S.zorluk], idx = partiIdx(S.pid);
  var ib = ideoBul(S.parti.ideo);
  S.grupB = ib.grup.slice(); S.grup = {}; GRUPLAR.forEach(function (g, i) { S.grup[g.id] = ib.grup[i]; });
  S.org = ILLER.map(function () { return 0; });
  if (yeni) {
    S.tohum = zor.tohum;
    var sirali = ILLER.map(function (il, i) { return [il.nufus * (0.6 + rnd(S)), i]; }).sort(function (a, b) { return b[0] - a[0]; });
    for (var k = 0; k < zor.il; k++) S.org[sirali[k][1]] = 35;
    S.stat = {itibar: 40, birlik: 72, stres: 15, saglik: 90, kasa: zor.kasa * 1e6, uye: Math.round(zor.tohum * 24000), drift: 0, mom: 0};
  } else {
    S.tohum = pb.baz * 100 / PARTILER.reduce(function (a, p) { return a + p.baz; }, 0);
    var sayi = clamp(Math.round(30 + pb.baz * 2.5), 30, 81);
    var sr = ILLER.map(function (il, i) { return [S.baz[i][idx], i]; }).sort(function (a, b) { return b[0] - a[0]; });
    for (var k2 = 0; k2 < sayi; k2++) S.org[sr[k2][1]] = 70;
    S.stat = {itibar: 55, birlik: 70, stres: 15, saglik: 90, kasa: (4 + pb.baz * 1.4) * 1e6, uye: Math.round(S.tohum * 24000), drift: 0, mom: 0};
  }
  S.meclis = {}; var top = 0;
  Object.keys(MECLIS0).forEach(function (id) { S.meclis[id] = MECLIS0[id]; top += MECLIS0[id]; });
  S.meclis.DIGER = 600 - top; if (yeni) S.meclis.YENI = 0;
  S.kadro = []; for (var q = 0; q < 8; q++) S.kadro.push({ad: pick(S, AD_L) + ' ' + pick(S, SOYAD_L), rol: KADRO_ROL[q], sad: Math.round(rn(S, 55, 85)), hirs: Math.round(rn(S, 20, 80))});
  S.medya = MEDYA_HAM.map(function (m) { return {ad: m.ad, erisim: m.erisim, guven: m.guven, yakin: m.yakin}; });
  S.yayin = 0;
  S.takvim = [{tip: 'genel', y: 2028, m: 5}, {tip: 'yerel', y: 2029, m: 3}, {tip: 'genel', y: 2033, m: 5}];
  S.tarihce = [{t: 'Eyl 2026', i: yeni ? '🏁' : '🎖️', m: yeni ? S.parti.ad + ' kuruldu.' : S.lider.ad + ', ' + S.parti.ad + ' genel başkanı oldu.'}]; S.sd = []; S.ms = {}; S.kurultay = [{y: 2027, m: 9}, {y: 2029, m: 9}, {y: 2031, m: 9}];
  S.gorulen = {}; S.log = []; S.kuyruk = []; S.ayEtki = []; S.haberler = []; S.anketGecmis = [];
  S.aksiyon = {kalan: 3, hak: 3};
  S.bitti = false; S.cbOyuncu = false; S.sonSecim = null; S.rol = 'baskan'; S.pd = null; S.yeniBaskan = null; S.ebs = 0; S.erkenSon = -99; S.kpSoz = []; S.kp = null;
  senaryoUygula(S, o.senaryo || 'klasik');
  anketGuncelle(S); S.anketGecmis.push({ay: 0, p: S.anketOyuncu});
  secimGuncelle(S);
  S.kuyruk.push({t: 'acilis'});
  return S;
}

function kalibre(S) {
  var n = PARTILER.length, B = [], i, j, top = 0;
  PARTILER.forEach(function (p) { top += p.baz; });
  for (i = 0; i < 81; i++) {
    var row = [];
    for (j = 0; j < n; j++) {
      var p = PARTILER[j], f = (BOLGE_FIT[p.id] ? BOLGE_FIT[p.id][ILLER[i].bolge] : 1) * ((IL_FIT[ILLER[i].id] && IL_FIT[ILLER[i].id][p.id]) || 1);
      row.push(p.baz * f * Math.exp(0.18 * norm(S)));
    }
    B.push(row);
  }
  for (var it = 0; it < 10; it++) {
    for (i = 0; i < 81; i++) { var s = 0; for (j = 0; j < n; j++) s += B[i][j]; for (j = 0; j < n; j++) B[i][j] *= 100 / s; }
    var nat = []; for (j = 0; j < n; j++) { var a = 0; for (i = 0; i < 81; i++) a += ILLER[i].nufus * B[i][j]; nat.push(a / NUFUS_TOPLAM); }
    for (j = 0; j < n; j++) { var fct = (PARTILER[j].baz * 100 / top) / nat[j]; for (i = 0; i < 81; i++) B[i][j] *= fct; }
  }
  for (i = 0; i < 81; i++) { var s2 = 0; for (j = 0; j < n; j++) s2 += B[i][j]; for (j = 0; j < n; j++) B[i][j] = B[i][j] * 100 / s2; }
  return B;
}

/* ---------- teşkilat ve oyuncu hedef oyu ---------- */
function teskilatSayisi(S) { var c = 0; for (var i = 0; i < 81; i++) if (S.org[i] >= 30) c++; return c; }
function kapsama(S) { var a = 0; for (var i = 0; i < 81; i++) a += ILLER[i].nufus * Math.min(1, S.org[i] / 70); return a / NUFUS_TOPLAM; }
function girerMi(S) { return teskilatSayisi(S) >= 41; }
function hedef(S) {
  var yeni = S.mod === 'yeni', cov = kapsama(S);
  var t = (S.tohum + S.stat.drift) * (yeni ? (0.3 + 0.7 * cov) : (0.78 + 0.22 * cov));
  if (govMu(S, S.pid)) t *= 1 - 0.2 * clamp((S.makro.enf - 30) / 40, 0, 1.2);
  if (!muhalifMu(S) && S.bld) { var bo = bldOzet(S); if (bo.n) t += (bo.ort - 50) / 50 * Math.min(1, bo.n / 12) * 1.2; }
  return clamp(t, 0.1, 62);
}
function paylar(S) {
  var T = hedef(S), pid = S.pid, yeni = S.mod === 'yeni', pidx = partiIdx(pid), n = PARTILER.length;
  var ib = ideoBul(S.parti.ideo), raw = [], ps = [], i, j, k = 1;
  for (i = 0; i < 81; i++) {
    var shape = yeni ? ib.fit[ILLER[i].bolge] * S.pn[i] : S.baz[i][pidx];
    raw.push(shape * (yeni ? (0.25 + 0.75 * Math.min(1, S.org[i] / 70)) : (0.6 + 0.4 * Math.min(1, S.org[i] / 70))) * (1 + (S.ilm ? S.ilm[i] || 0 : 0)) * (1 + (S.bld && S.bld.sahip[i] === pid ? (S.bld.perf[i] - 50) / 500 : 0)));
  }
  for (var it = 0; it < 6; it++) {
    var m = 0; for (i = 0; i < 81; i++) m += ILLER[i].nufus * Math.min(70, raw[i] * k); m /= NUFUS_TOPLAM;
    k *= T / m;
  }
  for (i = 0; i < 81; i++) ps.push(Math.min(70, raw[i] * k));
  var il = [], ul = {};
  for (i = 0; i < 81; i++) {
    var o = {}, sum = 0, w = [];
    for (j = 0; j < n; j++) { if (j === pidx) { w.push(0); continue; } var v = S.baz[i][j] * S.mods[j], rb = S.rbm && S.rbm[PARTILER[j].id]; if (rb) v *= rb[ILLER[i].bolge] || 1; w.push(v); sum += v; }
    for (j = 0; j < n; j++) { if (j !== pidx) o[PARTILER[j].id] = w[j] / sum * (100 - ps[i]); }
    o[pid] = ps[i]; il.push(o);
  }
  Object.keys(il[0]).forEach(function (id) { var a = 0; for (var q = 0; q < 81; q++) a += ILLER[q].nufus * il[q][id]; ul[id] = a / NUFUS_TOPLAM; });
  return {il: il, ulusal: ul, T: T};
}
function anketGuncelle(S) {
  var P = paylar(S), a = {}, tot = 0;
  Object.keys(P.ulusal).forEach(function (id) { var v = Math.max(0.05, P.ulusal[id] + norm(S) * 0.35 * Math.sqrt(P.ulusal[id] / 10 + 0.1)); a[id] = v; tot += v; });
  Object.keys(a).forEach(function (id) { a[id] = a[id] * 100 / tot; });
  S.anket = a; S.anketOyuncu = a[S.pid];
}
function siralama(map) { return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; }); }
function oyuncuSira(S) { return siralama(S.anket).indexOf(S.pid) + 1; }

/* ---------- koltuk dağılımı ---------- */
function dhondt(votes, n) {
  var won = votes.map(function () { return 0; });
  for (var s = 0; s < n; s++) {
    var b = 0, bv = -1;
    for (var i = 0; i < votes.length; i++) { var v = votes[i] / (won[i] + 1); if (v > bv) { bv = v; b = i; } }
    won[b]++;
  }
  return won;
}
function birimler(S) {
  var kullanilan = {}, out = [];
  S.ittifaklar.forEach(function (it) { it.uyeler.forEach(function (id) { kullanilan[id] = 1; }); out.push({ad: it.ad, uyeler: it.uyeler.slice(), ittifak: true}); });
  PARTILER.forEach(function (p) { if (!kullanilan[p.id] && p.id !== S.pid) out.push({ad: p.ad, uyeler: [p.id]}); });
  if (!kullanilan[S.pid]) out.push({ad: S.parti.ad, uyeler: [S.pid]});
  return out;
}
function oyuncuyuCikar(S, il) {
  return il.map(function (o) {
    var c = {}, s = 0; Object.keys(o).forEach(function (id) { if (id !== S.pid) s += o[id]; });
    Object.keys(o).forEach(function (id) { c[id] = id === S.pid ? 0 : o[id] * 100 / s; });
    return c;
  });
}
function koltuklar(S, il, ulusal) {
  var u = birimler(S), gecen = [], bilgi = [];
  u.forEach(function (b) {
    var t = 0; b.uyeler.forEach(function (id) { t += ulusal[id] || 0; });
    b.pay = t; b.gecti = t >= 7; bilgi.push({ad: b.ad, pay: t, gecti: b.gecti, uyeler: b.uyeler, ittifak: !!b.ittifak});
    if (b.gecti) gecen.push(b);
  });
  var seats = {}, ilk = []; PARTILER.forEach(function (p) { seats[p.id] = 0; }); seats[S.pid] = seats[S.pid] || 0;
  for (var i = 0; i < 81; i++) {
    var sm = {};
    var votes = gecen.map(function (b) { var t = 0; b.uyeler.forEach(function (id) { t += il[i][id] || 0; }); return t; });
    var won = dhondt(votes, ILLER[i].mv);
    gecen.forEach(function (b, k) {
      if (!won[k]) return;
      var w2 = dhondt(b.uyeler.map(function (id) { return il[i][id] || 0; }), won[k]);
      b.uyeler.forEach(function (id, j) { seats[id] = (seats[id] || 0) + w2[j]; if (w2[j]) sm[id] = w2[j]; });
    });
    ilk.push(sm);
  }
  return {seats: seats, birimler: bilgi, ilKoltuk: ilk};
}
function bugunSecimOlsa(S) {
  var P = paylar(S), il = P.il, ul = P.ulusal, girer = girerMi(S);
  if (!girer) { il = oyuncuyuCikar(S, il); ul = {}; Object.keys(il[0]).forEach(function (id) { var a = 0; for (var q = 0; q < 81; q++) a += ILLER[q].nufus * il[q][id]; ul[id] = a / NUFUS_TOPLAM; }); }
  var r = koltuklar(S, il, ul); r.girer = girer; r.ulusal = ul; return r;
}

/* ---------- cumhurbaşkanlığı ---------- */
function bloklar(S, ulusal) {
  var u = birimler(S), out = [];
  u.forEach(function (b) {
    var t = 0, xs = 0; b.uyeler.forEach(function (id) { var v = ulusal[id] || 0; t += v; var p = partiBul(id); xs += v * (id === S.pid ? ideoBul(S.parti.ideo).x : (p ? p.x : 0)); });
    var buyuk = b.uyeler.slice().sort(function (a, c) { return (ulusal[c] || 0) - (ulusal[a] || 0); })[0];
    out.push({ad: b.ad, uyeler: b.uyeler, pay: t, x: t ? xs / t : 0, lider: buyuk === S.pid ? baskanAd(S) : (LIDER_AI[buyuk] || (partiBul(buyuk) || {ad: buyuk}).ad + ' Genel Başkanı'), liderOyuncu: buyuk === S.pid});
  });
  return out.sort(function (a, b) { return b.pay - a.pay; }).filter(function (b) { return b.pay >= 1; });
}
function cumhurbaskani(S, ulusal) {
  var b = bloklar(S, ulusal).slice(0, 3);
  var sum = b.reduce(function (a, x) { return a + x.pay; }, 0), left = 100 - sum;
  var p1 = b.map(function (x) { return Math.max(0.1, x.pay + left * x.pay / sum + norm(S) * 1.2); });
  var t1 = p1.reduce(function (a, x) { return a + x; }, 0); p1 = p1.map(function (x) { return x * 100 / t1; });
  var adaylar = b.map(function (x, i) { return {ad: x.lider, blok: x.ad, uyeler: x.uyeler, oyuncu: x.liderOyuncu, p1: p1[i], p2: null}; });
  var order = adaylar.map(function (a, i) { return i; }).sort(function (a, c) { return p1[c] - p1[a]; });
  if (p1[order[0]] > 50) return {tur: 1, adaylar: adaylar, kazanan: order[0]};
  var f1 = order[0], f2 = order[1], t3 = order[2];
  var a = p1[f1], c = p1[f2];
  if (t3 !== undefined) {
    var d1 = Math.abs(b[t3].x - b[f1].x), d2 = Math.abs(b[t3].x - b[f2].x), tr = p1[t3] * 0.7;
    if (d1 < d2) a += tr; else c += tr;
  }
  a += norm(S) * 1.5;
  var tt = a + c; adaylar[f1].p2 = a * 100 / tt; adaylar[f2].p2 = c * 100 / tt;
  return {tur: 2, adaylar: adaylar, kazanan: a >= c ? f1 : f2};
}

/* ---------- seçim sonuçları ---------- */
function gurultuluIl(S, il) {
  return il.map(function (o) {
    var c = {}, s = 0; Object.keys(o).forEach(function (id) { c[id] = o[id] * Math.exp(0.05 * norm(S)); s += c[id]; });
    Object.keys(c).forEach(function (id) { c[id] = c[id] * 100 / s; }); return c;
  });
}
function yuvarla(il) { return il.map(function (o) { var c = {}; Object.keys(o).forEach(function (id) { if (o[id] >= 0.05) c[id] = Math.round(o[id] * 100) / 100; }); return c; }); }
function secimYap(S, tur) {
  var P = paylar(S), il = gurultuluIl(S, P.il), girer = girerMi(S);
  if (tur.tip === 'genel') {
    if (!girer) il = oyuncuyuCikar(S, il);
    var ul = {}; Object.keys(il[0]).forEach(function (id) { var a = 0; for (var q = 0; q < 81; q++) a += ILLER[q].nufus * il[q][id]; ul[id] = a / NUFUS_TOPLAM; });
    var k = koltuklar(S, il, ul), cb = cumhurbaskani(S, ul);
    var sonuc = {tip: 'genel', y: tur.y, m: tur.m, ulusal: ul, koltuk: k.seats, birimler: k.birimler, girer: girer, cb: cb, il: yuvarla(il), ilKoltuk: k.ilKoltuk};
    sonuc.oncekiOy = S.sonGenel ? S.sonGenel.ulusal : null; sonuc.oncekiKoltuk = S.sonGenel ? S.sonGenel.koltuk : S.meclis;
    S.sonGenel = {ulusal: ul, koltuk: k.seats};
    S.meclis = {}; Object.keys(k.seats).forEach(function (id) { S.meclis[id] = k.seats[id]; });
    var kz = cb.adaylar[cb.kazanan]; S.gov = kz.uyeler.slice(); S.cbOyuncu = !!kz.oyuncu && !muhalifMu(S);
    S.ittifaklar = S.ittifaklar.filter(function (it) { return it.ad === 'Cumhur İttifakı' ? true : true; });
    S.mods = PARTILER.map(function () { return 1; });
    return sonuc;
  }
  var win = {}, kazanan = [];
  for (var i = 0; i < 81; i++) {
    var o = il[i], pid = S.pid; var bb = bldInit(S), sh = bb.sahip[i]; if (o[sh] !== undefined) o[sh] = o[sh] * (1 + (bb.perf[i] - 50) / 250);
    var kos = S.org[i] >= 30;
    var best = null, bv = -1;
    Object.keys(o).forEach(function (id) { var v = (id === pid && !kos) ? 0 : o[id]; if (v > bv) { bv = v; best = id; } });
    win[best] = (win[best] || 0) + 1; kazanan.push(best);
  }
  return {tip: 'yerel', y: tur.y, m: tur.m, iller: win, kazananlar: kazanan, il: yuvarla(il)};
}
function secimGuncelle(S) {
  var now = tarihNo(S.tarih), s = null;
  for (var i = 0; i < S.takvim.length; i++) { var no = S.takvim[i].y * 12 + S.takvim[i].m; if (no >= now) { s = {tip: S.takvim[i].tip, y: S.takvim[i].y, m: S.takvim[i].m, ay: no - now}; break; } }
  S.sonrakiSecim = s;
}

/* ---------- etkiler ---------- */
function gain(S) { return S.stil.drift * (0.65 + 0.7 * S.stat.itibar / 100) * (S.stat.stres > 70 ? 0.8 : 1); }
function dim(S) { return Math.max(0.15, 1 - Math.max(0, S.stat.drift) / 22); }
function medyaCarpan(S) { return 1 + 0.15 * S.yayin + 0.12 * kurmayEtki(S, 'medya') + (ozVar(S, 'medya') ? 0.06 : 0); }
var ETKI_AD = {kasa:'Kasa',itibar:'İtibar',birlik:'Parti birliği',stres:'Stres',saglik:'Sağlık',drift:'Anket',uye:'Üye',vekil:'Milletvekili',org:'Teşkilat',yakin:'İttifak yakınlığı'};
function fxUygula(S, fx, etiket) {
  var d = {}, st = S.stat, G = gain(S), v;
  if (fx.kasa) { v = fx.kasa * 1e6 * (S.makro.fiyat / 100) * (fx.kasa < 0 ? S.stil.kasa : 1); st.kasa += v; d.kasa = v > 0 ? 1 : -1; }
  if (fx.itibar) { v = fx.itibar > 0 ? fx.itibar * S.stil.itibar : fx.itibar; st.itibar = clamp(st.itibar + v, 0, 100); d.itibar = v > 0 ? 1 : -1; }
  if (fx.birlik) { v = fx.birlik > 0 ? fx.birlik * S.stil.birlik : fx.birlik; st.birlik = clamp(st.birlik + v, 0, 100); d.birlik = v > 0 ? 1 : -1; }
  if (fx.stres) { st.stres = clamp(st.stres + fx.stres, 0, 100); d.stres = fx.stres > 0 ? 1 : -1; }
  if (fx.saglik) { st.saglik = clamp(st.saglik + fx.saglik, 0, 100); d.saglik = fx.saglik > 0 ? 1 : -1; }
  if (fx.drift) { v = fx.drift > 0 ? fx.drift * G * dim(S) : fx.drift; st.drift += v; d.drift = v > 0 ? 1 : -1; S.ayEtki.push({ad: etiket || 'Olay', v: v}); }
  if (fx.uye) { st.uye = Math.max(0, st.uye + fx.uye); d.uye = fx.uye > 0 ? 1 : -1; }
  if (fx.grup) { d.grup = {}; Object.keys(fx.grup).forEach(function (g) { S.grup[g] = clamp(S.grup[g] + fx.grup[g], 0, 100); d.grup[g] = fx.grup[g] > 0 ? 1 : -1; }); }
  if (fx.vekil) { S.meclis[S.pid] = (S.meclis[S.pid] || 0) + fx.vekil; d.vekil = 1; }
  if (fx.org) {
    for (var q = 0; q < fx.org; q++) {
      var adaylar = []; for (var i = 0; i < 81; i++) if (S.org[i] > 0 && S.org[i] < 60) adaylar.push(i);
      if (!adaylar.length) for (var j = 0; j < 81; j++) adaylar.push(j);
      var t = pick(S, adaylar); S.org[t] = Math.min(100, S.org[t] + 12);
    }
    d.org = 1;
  }
  if (fx.orgBolge) { for (var z = 0; z < 81; z++) if (ILLER[z].bolge === fx.orgBolge.b) S.org[z] = Math.min(100, S.org[z] + fx.orgBolge.v); d.org = 1; }
  if (fx.yakin) { Object.keys(S.yk).forEach(function (id) { S.yk[id] += fx.yakin; }); d.yakin = 1; }
  return d;
}
function onizleme(fx) {
  var d = {};
  ['kasa','itibar','birlik','stres','saglik','drift','uye','vekil','org','yakin'].forEach(function (k) { if (fx[k]) d[k] = fx[k] > 0 ? 1 : -1; });
  if (fx.grup) { d.grup = {}; Object.keys(fx.grup).forEach(function (g) { d.grup[g] = fx.grup[g] > 0 ? 1 : -1; }); }
  return d;
}
function chipler(d) {
  var out = [];
  Object.keys(d).forEach(function (k) {
    if (k === 'grup') { Object.keys(d.grup).forEach(function (g) { var ad = GRUPLAR.filter(function (x) { return x.id === g; })[0].ad; out.push({k: ad, d: d.grup[g], iyi: d.grup[g] > 0}); }); return; }
    out.push({k: ETKI_AD[k], d: d[k], iyi: k === 'stres' ? d[k] < 0 : d[k] > 0});
  });
  return out;
}

/* ---------- aksiyonlar ---------- */
var AKSIYONLAR = [
  {id:'kamptur',ad:'Kampanya Turu',not:'Seçime son 3 ay: bir bölgeyi karış karış gez. İllerde güçlü, kalıcı destek.',maliyet:.9,hedef:'bolge',tab:'kampanya'},
  {id:'kampreklam',ad:'Seçim Reklam Kampanyası',not:'Seçime son 3 ay: ülke çapında afiş, TV ve sosyal medya.',maliyet:1.2,tab:'kampanya'},
  {id:'kampmiting',ad:'Büyük Seçim Mitingi',not:'Seçime son 3 ay: tüm bölgelerde yankı yapan dev miting. Yorucu.',maliyet:1.5,tab:'kampanya'},
  {id:'reformalt',ad:'Altyapı Yatırım Paketi',not:'İktidar: yol, enerji ve liman yatırımı. Büyüme ve yatırım artar, borç yükselir.',maliyet:0,tab:'reform'},
  {id:'reformsosyal',ad:'Sosyal Yardım Paketi',not:'İktidar: emekli, işçi ve yoksul hanelere destek. Memnuniyet artar, bütçe zorlanır.',maliyet:0,tab:'reform'},
  {id:'reformtasarruf',ad:'Kamu Tasarruf Reformu',not:'İktidar: harcama kesintisi. Borç ve enflasyon düşer, memurlar ve gençler tepki gösterir.',maliyet:0,tab:'reform'},
  {id:'miting',ad:'Miting',not:'Bir bölgede büyük kalabalık. Kasa ve stres harcar.',maliyet:.7,hedef:'bolge',tab:'genel'},
  {id:'teskilat',ad:'Teşkilat Mesaisi',not:'Seçtiğin bölgenin illerinde örgüt kurar.',maliyet:.02,hedef:'bolge',tab:'genel'},
  {id:'secmen',ad:'Seçmen Buluşması',not:'Bir seçmen grubuyla yüz yüze görüşme.',maliyet:.15,hedef:'grup',tab:'genel'},
  {id:'uye',ad:'Üye Kampanyası',not:'Parti üyeliği için kapı kapı çalışma.',maliyet:.25,tab:'genel'},
  {id:'kadro',ad:'Kadro Toplantısı',not:'Parti içi birliği güçlendirir.',maliyet:0,tab:'genel'},
  {id:'bagis',ad:'Bağış Gecesi',not:'Kasaya para girer, bağış sızıntısı riski vardır.',maliyet:0,tab:'genel'},
  {id:'tv',ad:'TV Programı',not:'İtibar ve görünürlük kazandırır.',maliyet:0,tab:'genel'},
  {id:'tatil',ad:'Kısa Tatil',not:'Stresi düşürür, sağlığı toparlar.',maliyet:.12,tab:'genel'},
  {id:'viral',ad:'Viral İçerik Üret',not:'Gençlerde hızlı yayılır, küçük gaf riski.',maliyet:.1,tab:'medya'},
  {id:'canli',ad:'Canlı Yayın Yap',not:'Doğrudan buluşma. Samimiyet, ama gaf riski.',maliyet:0,tab:'medya'},
  {id:'influencer',ad:'Influencer Anlaşması',not:'Fenomenlerle iş birliği: gençlere ulaş.',maliyet:.4,tab:'medya'},
  {id:'trol',ad:'Troll Ordusu Kur',not:'Rakipleri yıpratır. Deşifre olursa itibar çöker.',maliyet:.5,tab:'medya'},
  {id:'algi',ad:'Algı Operasyonu',not:'Gündemi manipüle eder. Yakalanma riski yüksek.',maliyet:.8,tab:'medya'},
  {id:'tvtart',ad:'TV Tartışması',not:'Rakiple canlı yayında karşı karşıya gel. Büyük kazanç, büyük risk.',maliyet:0,tab:'medya'},
  {id:'yasa',ad:'Yasa Teklifi',not:'Meclis\'e bir yasa teklifi sun: komisyon, ardından Genel Kurul.',maliyet:.2,hedef:'yasa',tab:'meclis'},
  {id:'medyaili',ad:'Medya İlişkisi',not:'Bir yayın organıyla ilişkiyi güçlendir. Yakınlık artar, güven biraz aşınır.',maliyet:.4,hedef:'medya',tab:'medya'},
  {id:'haberlek',ad:'Gizli Haber Sızdır',not:'Rakip hakkında doğru ama gizli bir bilgiyi bir yayına sızdır. Yakın yayında başarı şansı artar; ortaya çıkarsa itibar kaybedersin.',maliyet:.3,hedef:'medya',tab:'medya'},
  {id:'haberyalan',ad:'Asılsız Haber',not:'Rakibe karşı asılsız haber çıkar. Etkisi büyük ama yalan ortaya çıkarsa hem itibarın hem yayının güveni çöker.',maliyet:.25,hedef:'medya',tab:'medya'},
  {id:'haberduz',ad:'Yanlış Haberi Düzelt',not:'Aleyhine dolaşan asılsız haberi düzelttir. Haber söner, yayının güveni düşer, genel haber güveni artar.',maliyet:.15,hedef:'medya',tab:'medya'},
  {id:'haberortaya',ad:'Rakip Skandalını Çıkar',not:'Rakip bir partinin belediyesindeki açık skandalı belgeleriyle ortaya çıkar.',maliyet:.2,hedef:'medya',tab:'medya'},
  {id:'skandalkoz',ad:'Skandalı Büyüt',not:'İktidardaki açık bir skandalı gündemde tut. Baskıyı ve erken seçim ihtimalini artırır.',maliyet:.1,tab:'medya'},
  {id:'belediye',ad:'Belediye Yatırımı',not:'Yönettiğin bir ile hizmet yatırımı yap. Performansı ve yerel teşkilatı güçlendirir.',maliyet:.5,hedef:'il',tab:'belediye'},
  {id:'bldden',ad:'Belediye Denetimi',not:'İç denetimle skandal riskini 6 ay düşür.',maliyet:.15,hedef:'il',tab:'belediye'},
  {id:'bldborc',ad:'Borç Yapılandırma',not:'Belediyenin borcunu yapılandırır; borç yükü düşer.',maliyet:.4,hedef:'il',tab:'belediye'},
  {id:'bldbaskan',ad:'Başkanı Değiştir',not:'Skandallı veya başarısız belediye başkanını değiştirir.',maliyet:.2,hedef:'il',tab:'belediye'},
  {id:'erken',ad:'Erken Seçim Kararı',not:'Genel seçimi 3 ay sonraya çek. Önde değilsen risklidir.',maliyet:.1,tab:'meclis'},
  {id:'erkenbaski',ad:'Erken Seçim Kampanyası',not:'İktidarı erken seçime zorla. Baskı yükselirse iktidar seçim kararı alabilir.',maliyet:.1,tab:'meclis'},
  {id:'guvenoyu',ad:'Güvenoyu İste',not:'Hükümet olarak Meclis\'ten güvenoyu iste. Başarısızlık hükümeti düşürür.',maliyet:0,tab:'meclis'},
  {id:'gensoru',ad:'Gensoru Önergesi',not:'Bir bakan hakkında gensoru ver. Hükümete baskı yapar.',maliyet:.05,hedef:'bakan',tab:'meclis'},
  {id:'ilodak',ad:'İl Kampanyası',not:'Seçtiğin ile saha ekibi gönder. Oy o ile kayar; etki zamanla söner.',maliyet:.5,hedef:'il',tab:'karargah'},
  {id:'delege',ad:'Delege Ziyareti',not:'Kurultay delegeleriyle yüz yüze görüş. Destek toplar; stres yükler.',maliyet:0,tab:'muhalif'},
  {id:'hizip',ad:'Hizip Kur',not:'Seni destekleyen bir grubu örgütle. Parti birliğini sarsar.',maliyet:0,tab:'muhalif'},
  {id:'elestir',ad:'Yönetimi Eleştir',not:'Yeni başkanı sert eleştir. Destek kazandırabilir, ters de tepebilir.',maliyet:0,tab:'muhalif'},
  {id:'basin',ad:'Basın Toplantısı',not:'Gündemi sen belirle. Düşük riskli, düzenli itibar.',maliyet:.05,tab:'medya'},
  {id:'gazete',ad:'Gazete Kur',not:'Kendi yayın organın: medya etkisi kalıcı artar.',maliyet:4,tab:'medya'}
];
function kampAcik(S) { if (muhalifMu(S)) return false; var s = secimeAy(S); return s.tip === 'genel' && s.ay <= 3; }
function aksiyonBul(id) { for (var i = 0; i < AKSIYONLAR.length; i++) if (AKSIYONLAR[i].id === id) return AKSIYONLAR[i]; return null; }
function bolgeIller(b) { return ILLER.filter(function (il) { return il.bolge === b; }); }
function bolgeNufusPay(b) { return bolgeIller(b).reduce(function (a, il) { return a + il.nufus; }, 0) / NUFUS_TOPLAM; }
function aksiyonMaliyet(S, a, hedef) {
  var m = a.maliyet;
  if (a.id === 'teskilat') m = a.maliyet * bolgeIller(hedef).length;
  return m * 1e6 * (S.makro.fiyat / 100) * S.stil.kasa;
}
function aksiyonYap(S, id, hedef) {
  var sn = snapAl(S), r = aksiyonYap0(S, id, hedef);
  if (r && r.ok) { r.detay = snapFark(S, sn); var ab = aksiyonBul(id); if (ab) r.ad = ab.ad; var kid = kararKayit(S, 'aksiyon', ab ? ab.ad : id, null, r.msg, r.detay); gecikPlanla(S, id, kid); r.gecik = gecikOzet(id); r.kid = kid; }
  return r;
}
function aksiyonYap0(S, id, hedef) {
  var a = aksiyonBul(id);
  if (!a) return {ok: false, msg: 'Bilinmeyen aksiyon.'};
  if (S.aksiyon.kalan <= 0) return {ok: false, msg: 'Bu ay aksiyon hakkın bitti. "Ayı Bitir" ile devam et.'};
  if (id === 'gazete' && S.yayin >= 3) return {ok: false, msg: 'En fazla 3 yayın organın olabilir.'};
  if (muhalifMu(S) && MUHALIF_AKS.indexOf(id) < 0) return {ok: false, msg: 'Genel başkan olmadığın için parti kaynaklarını kullanamazsın.'};
  if (!muhalifMu(S) && a.tab === 'muhalif') return {ok: false, msg: 'Bu eylem yalnızca genel başkanlığı kaybettikten sonra yapılabilir.'};
  if ((id === 'ilodak' || id === 'belediye' || id === 'bldden' || id === 'bldborc' || id === 'bldbaskan') && !(hedef >= 0 && hedef < 81)) return {ok: false, msg: 'Geçersiz il.'};
  if (a.tab === 'reform') { if (muhalifMu(S) || !govMu(S, S.pid)) return {ok: false, msg: 'Hükümet reformlarını yalnızca iktidar yapabilir.'}; S.reformSon = S.reformSon || {}; if (S.reformSon[id] !== undefined && S.ay - S.reformSon[id] < 6) return {ok: false, msg: 'Bu reform paketi yakın zamanda uygulandı; ' + (6 - (S.ay - S.reformSon[id])) + ' ay sonra yenilenebilir.'}; }
  if (a.tab === 'kampanya' && !kampAcik(S)) return {ok: false, msg: 'Kampanya eylemleri yalnızca genel seçime son 3 ayda açılır.'};
  var maliyet = muhalifMu(S) ? 0 : aksiyonMaliyet(S, a, hedef);
  if (maliyet > 0 && S.stat.kasa < maliyet) return {ok: false, msg: 'Kasa yetersiz.'};
  S.hamle = S.hamle || []; S.hamle.push({id: id, h: hedef, ay: S.ay}); if (S.hamle.length > 12) S.hamle.shift();
  var G = gain(S), M = medyaCarpan(S), fx = {}, ad = a.ad, ek = '', risk = null, ekstra = null, rk = null;
  if (maliyet > 0) S.stat.kasa -= maliyet;
  switch (id) {
    case 'miting': ilmInit(S); ILLER.forEach(function (il, q) { if (il.bolge === hedef) S.ilm[q] = Math.min(0.35, S.ilm[q] + 0.03); }); fx = {drift: (0.10 + 0.9 * bolgeNufusPay(hedef)) , stres: 4, itibar: .5, orgBolge: {b: hedef, v: 5}}; ad = 'Miting · ' + BOLGE[hedef]; break;
    case 'reformalt': S.reformSon[id] = S.ay; S.makro.borc = clamp(S.makro.borc + 2.5, 10, 150); S.makro.yatirim = clamp(S.makro.yatirim + 6, 5, 95); S.makro.buyume = clamp(S.makro.buyume + 0.5, -5, 6.5); fx = {drift: .10, itibar: 1, stres: 3}; ek = 'Altyapı paketi açıklandı: yatırım ve büyüme güçlendi, kamu borcu arttı.'; olayEkle(S, {ikon: '🏗️', ust: 'HÜKÜMET REFORMU', baslik: 'Altyapı paketi', alt: 'Yatırım ve büyüme artıyor', ses: 'hukumet', satirlar: ['Büyüme +0,5 puan · yatırım güçlendi', 'Kamu borcu +2,5 puan']}); break;
    case 'reformsosyal': S.reformSon[id] = S.ay; S.makro.borc = clamp(S.makro.borc + 1.5, 10, 150); S.makro.memn = clamp(S.makro.memn + 4, 0, 100); fx = {drift: .14, itibar: 1, stres: 2, grup: {emekliler: 7, isciler: 5, ciftciler: 3}}; ek = 'Sosyal yardım paketi emekli, işçi ve çiftçide karşılık buldu; bütçe zorlandı.'; olayEkle(S, {ikon: '🤝', ust: 'HÜKÜMET REFORMU', baslik: 'Sosyal yardım paketi', alt: 'Emekli ve işçilere destek', ses: 'hukumet', satirlar: ['Emekliler, işçiler ve çiftçiler memnun', 'Kamu borcu +1,5 puan']}); break;
    case 'reformtasarruf': S.reformSon[id] = S.ay; S.makro.borc = clamp(S.makro.borc - 2.5, 10, 150); S.makro.enf = clamp(S.makro.enf - 1.2, 8, 90); S.makro.buyume = clamp(S.makro.buyume - 0.3, -5, 6.5); fx = {drift: -.03, itibar: -1, stres: 3, grup: {memurlar: -6, gencler: -3}}; ek = 'Kamu tasarruf paketi borcu ve enflasyonu azalttı; memurlar ve gençler tepkili.'; olayEkle(S, {ikon: '✂️', ust: 'HÜKÜMET REFORMU', baslik: 'Tasarruf reformu', alt: 'Harcamalar kısıldı', ses: 'sahne', satirlar: ['Borç −2,5 · enflasyon −1,2 puan', 'Memurlar ve gençler tepkili']}); break;
    case 'kamptur': ilmInit(S); ILLER.forEach(function (il, q) { if (il.bolge === hedef) S.ilm[q] = Math.min(0.35, S.ilm[q] + 0.06); }); fx = {drift: 0.15 + 0.9 * bolgeNufusPay(hedef), stres: 6, itibar: .8, orgBolge: {b: hedef, v: 6}}; ad = 'Kampanya Turu · ' + BOLGE[hedef]; ek = BOLGE[hedef] + ' bölgesinde il il saha çalışması yapıldı.'; break;
    case 'kampreklam': fx = {drift: .32 * M, itibar: 1, stres: 2}; risk = {p: .12, fx: {itibar: -3, drift: -.1}, s: 'Reklam filmi tepki çekti, sosyal medyada alay konusu oldu.'}; ek = 'Reklam kampanyası ülke çapında yayına girdi.'; break;
    case 'kampmiting': ilmInit(S); ILLER.forEach(function (il, q) { S.ilm[q] = Math.min(0.35, S.ilm[q] + 0.015); }); fx = {drift: .28, stres: 7, itibar: 1, birlik: 1}; ek = 'Kalabalık meydanı doldurdu; seçim havası ülkeye yayıldı.'; break;
    case 'teskilat': fx = {orgBolge: {b: hedef, v: 12}, birlik: 1, stres: 3, drift: .03}; ad = 'Teşkilat · ' + BOLGE[hedef]; break;
    case 'secmen': fx = {grup: {}, drift: .07, stres: 2, itibar: .3}; fx.grup[hedef] = 8; ad = 'Buluşma · ' + GRUPLAR.filter(function (g) { return g.id === hedef; })[0].ad; break;
    case 'uye': fx = {uye: Math.round(S.stat.uye * .04 + 800), drift: .04, stres: 2}; break;
    case 'kadro': fx = {birlik: 6, stres: -1}; S.kadro.forEach(function (k) { k.sad = clamp(k.sad + 5, 0, 100); }); break;
    case 'bagis': fx = {kasa: 1.0 * (0.4 + S.stat.itibar / 100) / S.stil.kasa, stres: 2}; risk = {p: .2, fx: {itibar: -5, drift: -.2}, s: 'Bağış listesi basına sızdı.'}; break;
    case 'tv': fx = {itibar: 2, drift: .12 * M, stres: 3}; var o = pick(S, S.medya); o.yakin = clamp(o.yakin + 5, -100, 100); break;
    case 'tatil': fx = {stres: -15, saglik: 4}; break;
    case 'viral': fx = {drift: .10 * M, grup: {gencler: 3}}; risk = {p: .12, fx: {itibar: -3}, s: 'İçerik yanlış anlaşıldı.'}; break;
    case 'canli': fx = {itibar: 2, drift: .14 * M, stres: 4}; risk = {p: .2, fx: {itibar: -4, drift: -.15}, s: 'Canlı yayında ağzından kaçan bir cümle gündem oldu.'}; break;
    case 'influencer': fx = {grup: {gencler: 5}, drift: .12 * M}; risk = {p: .1, fx: {itibar: -3}, s: 'Fenomenin eski paylaşımları gündeme geldi.'}; break;
    case 'trol': fx = {drift: .22 * M, itibar: -1}; risk = {p: .35, fx: {itibar: -8, drift: -.4}, s: 'Operasyon deşifre oldu.'}; break;
    case 'algi': fx = {drift: .3 * M, itibar: -1, stres: 2}; risk = {p: .4, fx: {itibar: -10, drift: -.6}, s: 'Algı operasyonu ifşa edildi.'}; break;
    case 'tvtart': rk = pick(S, rakipler(S)); fx = {itibar: 2, drift: .2 * M, stres: 5}; risk = {p: .3, fx: {itibar: -6, drift: -.3}, s: rk.ad + ' temsilcisi seni canlı yayında köşeye sıkıştırdı.'}; ad = 'TV Tartışması · ' + rk.ad; sonDakika(S, 'Canlı yayında sert tartışma: ' + S.parti.ad + ' ve ' + rk.ad + ' karşı karşıya geldi.'); break;
    case 'basin': if (muhalifMu(S)) { S.pd.itibar = clamp(S.pd.itibar + 1.5, 0, 100); fx = {stres: 1}; ek = 'Açıklaman parti içinde not edildi.'; break; } fx = {itibar: 1.5, drift: .08 * M, stres: 2, birlik: 1}; risk = {p: .12, fx: {itibar: -2}, s: 'Zor bir soru üzerine verdiğin cevap tartışıldı.'}; break;
    case 'gazete': fx = {itibar: 1}; S.yayin++; break;
    case 'yasa': var yr = yasaHazirla(S, hedef); if (!yr.ok) { S.stat.kasa += maliyet; return yr; } fx = {stres: 2}; ad = 'Yasa Teklifi · ' + YASA[hedef].ad; ek = 'Teklif komisyona sevk edildi. Komisyon geçme ihtimali yaklaşık %' + Math.round(yr.metrik.komOlasilik * 100) + '.'; ekstra = {tip: 'yasa'}; break;
    case 'medyaili': var mr = mdYakinlas(S, hedef); if (!mr.ok) { S.stat.kasa += maliyet; return mr; } fx = mr.fx; ad = 'Medya İlişkisi · ' + S.medya[+hedef].ad; ek = mr.msg; break;
    case 'haberlek': case 'haberyalan': case 'haberduz': case 'haberortaya': var hr = mdHaber(S, id, hedef); if (!hr.ok) { S.stat.kasa += maliyet; return hr; } fx = hr.fx; ad = aksiyonBul(id).ad + ' · ' + S.medya[+hedef].ad; ek = hr.msg; break;
    case 'skandalkoz': var kr = mdSkandalKoz(S); if (!kr.ok) { S.stat.kasa += maliyet; return kr; } fx = kr.fx; ad = 'Skandalı Büyüt'; ek = kr.msg; break;
    case 'belediye': case 'bldden': case 'bldborc': case 'bldbaskan': var br = bldYonet(S, id === 'belediye' ? 'yat' : id === 'bldborc' ? 'borc' : id === 'bldbaskan' ? 'baskan' : 'den', hedef); if (!br.ok) { S.stat.kasa += maliyet; return br; } fx = br.fx; ad = (id === 'belediye' ? 'Belediye Yatırımı · ' : id === 'bldborc' ? 'Belediye Borcu · ' : id === 'bldbaskan' ? 'Belediye Başkanı · ' : 'Belediye Denetimi · ') + ILLER[+hedef].ad; ek = br.msg; break;
    case 'erken': var er = erkenKarar(S); if (!er.ok) { S.stat.kasa += maliyet; return er; } fx = er.fx; ad = 'Erken Seçim Kararı'; ek = er.msg; break;
    case 'erkenbaski': var eb = erkenBaskiYap(S); if (!eb.ok) { S.stat.kasa += maliyet; return eb; } fx = eb.fx; ad = 'Erken Seçim Kampanyası'; ek = eb.msg; break;
    case 'guvenoyu': var gr = guvenoyuIste(S); if (!gr.ok) { return gr; } fx = {stres: 4}; ad = 'Güvenoyu'; ek = gr.kabul ? 'Hükümet güvenoyu aldı (' + gr.evet + ' oy).' : 'Güvenoyu alınamadı (' + gr.evet + ' oy); hükümet düştü. ' + (gr.erken ? 'Erken seçim kararı alındı.' : 'Yeni kabine kuruldu.'); ekstra = {tip: 'guven', gr: gr}; break;
    case 'gensoru': var sr = gensoruVer(S, hedef); if (!sr.ok) { S.stat.kasa += maliyet; return sr; } fx = {}; ad = 'Gensoru'; ek = sr.msg; ekstra = {tip: 'gensoru', sr: sr}; break;
    case 'ilodak': ilmInit(S); var ix = +hedef, g0 = 0.1 * (0.5 + 0.5 * Math.min(1, S.org[ix] / 50)); S.ilm[ix] = Math.min(0.35, S.ilm[ix] + g0); fx = {stres: 2, itibar: .2, drift: .06}; ad = 'İl Kampanyası · ' + ILLER[ix].ad; break;
    case 'delege': var pdd = S.pd; var gk = 3.0 * (1 - pdd.destek / 72) * (0.7 + pdd.itibar / 100) * (pdd.vekil ? 1.2 : 1); pdd.destek = clamp(pdd.destek + gk, 0, 95); fx = {stres: 2}; ek = 'Delege desteğin %' + Math.round(pdd.destek) + ' düzeyine ulaştı.'; break;
    case 'hizip': S.pd.hizip = clamp(S.pd.hizip + 7, 0, 100); S.pd.destek = clamp(S.pd.destek + 1.2, 0, 95); S.yeniBaskan.guc = clamp(S.yeniBaskan.guc - 1, 5, 95); fx = {stres: 3, birlik: -1}; ek = 'Hizbin büyüyor; parti içi gerilim arttı.'; if (S.pd.hizip > 60 && rnd(S) < 0.25) { S.pd.itibar = clamp(S.pd.itibar - 3, 0, 100); ek += ' Yönetim seni disipline sevk etmekle tehdit etti.'; sonDakika(S, ek); } break;
    case 'elestir': if (rnd(S) < 0.55) { S.pd.destek = clamp(S.pd.destek + 3, 0, 95); S.pd.itibar = clamp(S.pd.itibar + 1, 0, 100); S.yeniBaskan.guc = clamp(S.yeniBaskan.guc - 3, 5, 95); ek = 'Eleştirilerin parti içinde yankı buldu.'; } else { S.pd.destek = clamp(S.pd.destek - 2, 0, 95); S.pd.itibar = clamp(S.pd.itibar - 2, 0, 100); ek = 'Eleştirin ters tepti; seni bölücülükle suçladılar.'; } fx = {stres: 2, birlik: -1}; break;
  }
  S.aksiyon.kalan--; var hh = hafInit(S); hh.aks[id] = (hh.aks[id] || 0) + 1;
  var tek = (S.hamle || []).filter(function (h) { return h.id === id && h.ay >= S.ay - 2; }).length, yor = Math.max(0.55, 1 - 0.12 * Math.max(0, tek - 3));
  if (yor < 1 && id !== 'tatil') {
    ['drift', 'uye'].forEach(function (k) { if (fx[k] > 0) fx[k] *= yor; }); if (fx.itibar > 0) fx.itibar *= yor;
    if (fx.grup) Object.keys(fx.grup).forEach(function (g) { if (fx.grup[g] > 0) fx.grup[g] *= yor; });
    if (fx.orgBolge) fx.orgBolge = {b: fx.orgBolge.b, v: fx.orgBolge.v * yor};
    ek = ek || ''; if (!muhalifMu(S)) ek = (ek ? ek + ' ' : '') + 'Aynı eylemi üst üste tekrarlamak etkisini azalttı.';
  }
  if (id === 'miting' && ozVar(S, 'saha') && fx.drift > 0) fx.drift *= 1.12;
  var d = fxUygula(S, fx, ad);
  if (risk && rnd(S) < riskP(S, risk.p)) { var d2 = fxUygula(S, risk.fx, ad + ' (riskli sonuç)'); Object.keys(d2).forEach(function (k) { if (k !== 'grup') d[k] = d2[k]; }); ek = risk.s; sonDakika(S, ek); }
  if (id === 'miting') ekstra = {tip: 'miting', bolge: BOLGE[hedef], katilim: Math.round(bolgeNufusPay(hedef) * NUFUS_TOPLAM * 1000 * 0.0025 * (0.6 + S.stat.itibar / 80) * (0.8 + rnd(S) * 0.4)), nufus: bolgeNufusPay(hedef) * NUFUS_TOPLAM * 1000};
  if (id === 'tvtart') ekstra = {tip: 'tvtart', rakip: rk.ad, rid: rk.id, risk: !!ek, skor: clamp(Math.round(50 + (S.stat.itibar - 50) * 0.35 + norm(S) * 7 + (ek ? -16 : 9)), 8, 94)};
  var kisa = {medyaili:'Yayın organıyla görüşme yapıldı.',haberlek:'Haber sızdırıldı.',haberyalan:'Haber yayınlandı.',haberduz:'Düzeltme yayınlandı.',haberortaya:'Skandal belgeleri yayında.',skandalkoz:'Skandal gündemde tutuldu.',belediye:'Belediyede çalışmalar başladı.',bldden:'Denetim tamamlandı.',bldborc:'Borç yapılandırıldı.',bldbaskan:'Belediye başkanı değişti.',yasa:'Teklif Meclis yolunda.',guvenoyu:'Güvenoyu oylaması yapıldı.',gensoru:'Önerge Meclis gündeminde.',ilodak:'Saha ekibi ilde çalışmaya başladı.',delege:'Delegelerle görüşmeler yapıldı.',hizip:'Hizip çalışması yürütüldü.',elestir:'Açıklaman gündem oldu.',miting:'Kalabalık toplandı.',teskilat:'Yeni teşkilat çalışmaları başladı.',secmen:'Görüşme verimli geçti.',uye:'Yeni üye kayıtları geldi.',kadro:'Kadro toparlandı.',bagis:'Bağışlar kasaya girdi.',tv:'Programdan sonra mesajların yayıldı.',tatil:'Dinlendin, tazelendin.',viral:'İçerik hızla yayıldı.',canli:'Canlı yayın sona erdi.',influencer:'Anlaşma yapıldı.',trol:'Hesaplar devrede.',algi:'Operasyon yürürlükte.',gazete:'Gazete yayına başladı.',tvtart:'Tartışma sona erdi.',basin:'Basın toplantısı yapıldı.'};
  var msg = a.ad + ': ' + (kisa[id] || 'Uygulandı.') + (ek ? ' ' + ek : '');
  S.log.unshift({t: tarihYaz(S.tarih), m: msg}); S.log = S.log.slice(0, 40);
  return {ok: true, msg: msg, chips: chipler(d), kalan: S.aksiyon.kalan, ekstra: ekstra};
}

/* ---------- kartlar ---------- */
/* ---------- olay motoru: dinamik kartlar, söz sistemi, hikâye zincirleri ---------- */
var KARTLAR_Z = [
 {id:'sozkriz',z:1,kat:'siyaset',onem:1,baslik:'Verilen Söz Gündemde',metin:'"{s}" sözünü hatırlatan haberler yayılıyor. Rakipler ve gazeteciler hesap soruyor.',sec:[
  O('Hatayı kabul et, özür dile',{itibar:-1,birlik:2,stres:3},'Dürüst davrandın; sayfa yavaşça kapanıyor.'),
  O('Koşulları değiştiğini savun',{itibar:-2,stres:2},'Savunman kimseyi ikna etmedi, konu yeniden açılabilir.',{p:.35,fx:{drift:-.1},s:'Muhalefet konuyu manşete taşıdı.'}),
  O('Suçu rakiplere at',{drift:-.05,itibar:-1,birlik:1},'Saldırı havayı sertleştirdi.')]},
 {id:'sozkriz2',z:1,kat:'siyaset',onem:1,baslik:'Eski Söz Yeniden Gündemde',metin:'Daha önce savunduğun tutum, yeni belgelerle yeniden tartışılıyor: "{s}". Basın hesap sormayı bırakmıyor.',sec:[
  O('Kamuoyundan açıkça özür dile',{itibar:-2,drift:-.04,stres:4,birlik:3},'Zor ama gerekli bir adımdı.'),
  O('Sessizliği koru',{drift:-.15,itibar:-3},'Sessizlik krizi büyüttü.'),
  O('Konuyu parti kurulunda görüş',{birlik:2,kasa:-.1},'Sorumluluk dağıldı, gündem kapandı.')]},
 {id:'sizinti',z:1,kat:'medya',onem:1,baslik:'Bağış Listesi Sızdı',metin:'Parti bağışçılarının listesi basına sızdı. Bazı isimler tartışma yaratıyor.',sec:[
  O('Tamamen inkar et',{itibar:1,stres:3},'Şimdilik savunabildin; belgeler ortaya çıkarsa zor olacak.'),
  O('Açıklama yap, listeyi kamuoyuyla paylaş',{itibar:2,drift:.05,stres:3,kasa:-.1},'Şeffaflık sana puan kazandırdı.'),
  O('İç soruşturma başlat',{birlik:3,stres:4,kasa:-.2},'Parti içinde güven tazelendi.')]},
 {id:'sizinti2',z:1,kat:'medya',onem:1,baslik:'Belgeler Yayımlandı',metin:'İnkar ettiğin bağış listesinin belgeleri bir televizyon kanalında yayımlandı.',sec:[
  O('Sorumluyu görevden al',{birlik:-3,itibar:-1,stres:3},'Bir isim feda edildi; kriz yatışıyor.'),
  O('İnkara devam et',{itibar:-5,drift:-.2,stres:5},'İnandırıcılığın ağır yara aldı.'),
  O('Özür dile ve yasal süreç başlat',{itibar:-1,drift:-.05,kasa:-.3},'Kayıp sınırlı kaldı.')]},
 {id:'ayrilan',z:1,kat:'parti',onem:1,baslik:'Ayrılanlar Yeni Hareket Kuruyor',metin:'Daha önce disipline sevk ettiğin grup, yeni bir siyasi hareket kuracağını duyurdu.',sec:[
  O('Sakin kal, kapıyı açık bırak',{birlik:3,stres:2},'Gerilim yumuşadı.'),
  O('Sert tepki göster',{birlik:-4,itibar:-1,drift:-.05},'İki taraf birbirine daha çok düştü.'),
  O('Arabulucu gönder',{birlik:2,kasa:-.2,stres:1},'Bazı isimler geri döndü.')]},
 {id:'eskidost',z:1,kat:'medya',baslik:'Eski Yol Arkadaşı Konuşuyor',metin:'İstifasını kabul ettiğin eski yol arkadaşın, televizyonda partindeki iç işleyişi eleştirdi.',sec:[
  O('Yanıt ver, kayıtları göster',{itibar:1,stres:3},'Tartışma seninle sınırlı kaldı.'),
  O('Görmezden gel',{itibar:-1,drift:-.05},'Eleştiriler sosyal medyada büyüdü.'),
  O('Özel görüşme teklif et',{birlik:2,stres:2},'Gerilim yumuşadı.')]},
 {id:'nakil2',z:1,kat:'parti',baslik:'Geri Dönüş Başvurusu',metin:'Önceden partine geçen bir ismin çevresi, geri dönmek istediklerini söylüyor.',sec:[
  O('Kapıyı aç',{birlik:-2,uye:500,drift:.04},'Yeni katılımlar oldu, eski kadrolar mırıldandı.'),
  O('Kapat',{birlik:3,itibar:1},'İlkeli duruşun saygı gördü.'),
  O('Şartlı kabul et',{birlik:1,stres:2,uye:200},'Denge korundu.')]}
];
var ZINCIR = {
  bagis: [{id: 'sizinti', p: .4, min: 4, max: 8}],
  isyan: [{id: 'ayrilan', p: .5, min: 3, max: 6, sec: [1]}],
  istifa: [{id: 'eskidost', p: .5, min: 3, max: 5, sec: [1]}],
  nakil: [{id: 'nakil2', p: .35, min: 4, max: 7}],
  sizinti: [{id: 'sizinti2', p: .6, min: 2, max: 4, sec: [0]}],
  sozkriz: [{id: 'sozkriz2', p: .7, min: 3, max: 5, sec: [1]}]
};
var BOLGE_OLAY = {
  fabrika: {kat: 'ekonomi', baslik: '{B}\'de Fabrika Kapanıyor', metin: '{B} bölgesinde büyük bir fabrika kapanma kararı aldı. İşçiler ve aileleri senden destek bekliyor.', org: 1, sec: [
    O('İşçilerle buluş, kampanya yürüt', {kasa: -.4, stres: 3, grup: {isciler: 5}, orgBolge: {b: '{b}', v: 4}}, 'İşçilerin yanında durdun, yerel örgüt güçlendi.'),
    O('Hükümete çağrı yap', {itibar: 1, grup: {isciler: 2}}, 'Açıklaman gündem oldu.'),
    O('Sessiz kal', {grup: {isciler: -4}, drift: -.03}, 'İşçiler yalnız bırakıldığını düşündü.')]},
  kurak: {kat: 'kriz', baslik: '{B}\'de Kuraklık', metin: '{B} bölgesinde kuraklık ürünü vurdu. Çiftçiler destek paketi bekliyor.', sec: [
    O('Bölgeye yardım kampanyası başlat', {kasa: -.5, grup: {ciftciler: 5}, itibar: 1}, 'Çiftçiler yalnız olmadığını gördü.'),
    O('Çiftçi birlikleriyle toplantı yap', {grup: {ciftciler: 3}, stres: 1}, 'Sorunlar masaya yatırıldı.'),
    O('Geç kal', {grup: {ciftciler: -4}, itibar: -1}, 'Tepkiler geldi.')]},
  festival: {kat: 'secmen', baslik: '{B}\'de Yerel Festival', metin: '{B} bölgesindeki geleneksel festivalde sana konuşma yapma daveti geldi.', org: 1, sec: [
    O('Katıl ve halkla kaynaş', {kasa: -.2, itibar: 2, stres: 1, orgBolge: {b: '{b}', v: 3}}, 'Yerel basında olumlu yer aldın.'),
    O('Temsilci gönder', {itibar: 0, birlik: 1}, 'Tören sorunsuz geçti.'),
    O('Davet geri çevir', {itibar: -1, stres: -1}, 'Zaman kazandın, yerel tepki geldi.')]},
  belediye: {kat: 'siyaset', baslik: '{B}\'de Belediye Başkanı Kapını Çalıyor', metin: '{B} bölgesinde bir belediye başkanı, partine geçmek için görüşme istiyor.', org: 1, sec: [
    O('Katılımı kabul et', {uye: 600, drift: .06, birlik: -2, orgBolge: {b: '{b}', v: 6}}, 'Bölgede örgütün güçlendi, eski kadrolar tedirgin.'),
    O('Şartlı kabul et', {uye: 250, orgBolge: {b: '{b}', v: 3}, stres: 1}, 'Dengeli bir çözüm bulundu.'),
    O('Reddet', {birlik: 2, itibar: 1}, 'İlkeli duruşun saygı gördü.')]},
  goc: {kat: 'siyaset', baslik: '{B}\'de Göç Gerilimi', metin: '{B} bölgesinde göç tartışması sertleşiyor. Her iki taraf da net bir tutum bekliyor.', sec: [
    O('Sakinleştirici açıklama yap', {itibar: 1, stres: 2}, 'Dengeli çağrın olumlu karşılandı.'),
    O('Sert söylem benimse', {drift: .08, itibar: -1, stres: 2}, 'Bazı seçmenler yanında yer aldı, tepkiler de büyüdü.'),
    O('Konuyu ele alma', {stres: -1, drift: -.03}, 'Kaçamak tutum eleştirildi.')]},
  maden: {kat: 'kriz', onem: 1, baslik: '{B}\'de İş Kazası', metin: '{B} bölgesinde bir işyerinde yaşanan kazada can kayıpları var. Ülke yasta.', sec: [
    O('Bölgeye git, aileleri ziyaret et', {kasa: -.2, itibar: 2, stres: 3, grup: {isciler: 3}}, 'Taziyen saygı gördü.'),
    O('Yasal düzenleme önerisi ver', {itibar: 1, grup: {isciler: 3}, stres: 2}, 'Önerin kamuoyunda tartışıldı.'),
    O('Kısa bir mesaj yayımla', {itibar: 0}, 'Fazla ilgi görmedi.')]}
};
var GRUP_OLAY = {
  protesto: {kat: 'secmen', baslik: '{G} Eylem Hazırlığında', metin: '{G} kesimi memnuniyetsizliğini sokağa taşımaya hazırlanıyor. Sana destek çağrısı geldi.', kosul: function (S, g) { return S.grup[g] < 45; }, sec: [
    O('Eyleme destek ver', {itibar: 1, stres: 3, grup: '+6'}, 'Grubun sana yaklaştı, hükümet yakından izliyor.'),
    O('Temsilcilerle görüş', {grup: '+3', stres: 1}, 'Talepler dinlendi.'),
    O('Mesafeli dur', {grup: '-4', drift: -.03}, 'Destek çağrısı karşılıksız kaldı.')]},
  destek: {kat: 'secmen', baslik: '{G} Seni Ziyaret Etti', metin: '{G} temsilcileri partini ziyaret etti. Beklentilerini açıkça paylaştılar.', kosul: function (S, g) { return S.grup[g] >= 55; }, sec: [
    O('Somut bir plan sun', {kasa: -.3, grup: '+5', drift: .05, stres: 2}, 'Planın destek buldu.'),
    O('Genel bir mesaj ver', {grup: '+2'}, 'Kısa ama olumlu bir görüşme oldu.'),
    O('Ziyareti ertele', {grup: '-3'}, 'Hayal kırıklığı yarattın.')]}
};
var SOZ_TIP = {
  teskilat: {ad: 'Teşkilat sözü', vade: 10, hazirla: function (S) { var c = teskilatSayisi(S); if (c >= 76) return null; var n = Math.min(81, Math.ceil((c + 14) / 5) * 5); return {esik: n, metin: 'Seçime kadar ' + n + ' ilde teşkilat kuracağım.'}; }, kontrol: function (S, z) { return teskilatSayisi(S) >= z.esik; }},
  anket: {ad: 'Anket sözü', vade: 8, hazirla: function (S) { var e = Math.ceil(S.anketOyuncu + 1.5); if (e > 45) return null; return {esik: e, metin: 'Anketlerde %' + e + '\'e çıkacağız.'}; }, kontrol: function (S, z) { return S.anketOyuncu >= z.esik; }},
  uye: {ad: 'Üye sözü', vade: 9, hazirla: function (S) { var n = Math.round(S.stat.uye * 1.4 / 1000) * 1000; if (S.stat.uye > 1.5e6) return null; return {esik: n, metin: 'Üye sayımızı ' + n.toLocaleString('tr-TR') + '\'e çıkaracağız.'}; }, kontrol: function (S, z) { return S.stat.uye >= z.esik; }},
  kasa: {ad: 'Mali söz', vade: 12, surekli: 1, hazirla: function (S) { return S.stat.kasa > 0 ? {esik: 0, metin: 'Parti kasasını asla eksiye düşürmeyeceğiz.'} : null; }, kontrol: function (S, z) { return S.stat.kasa >= 0; }},
  ittifaksiz: {ad: 'İttifak sözü', vade: 20, surekli: 1, hazirla: function (S) { return oyuncuIttifak(S) && oyuncuIttifak(S).uyeler.length > 1 ? null : {esik: 0, metin: 'Hiçbir ittifaka girmeyeceğiz, tek başımıza yürüyeceğiz.'}; }, kontrol: function (S, z) { var it = oyuncuIttifak(S); return !(it && it.uyeler.length > 1); }}
};
/* seçim bildirgesi sözleri: seçime yakın dönemde, bir yasayı Meclis'ten geçirme taahhüdü (mevcut söz sistemine eklenir) */
function yasaSozTip(id, ad, metin) {
  return {ad: ad, vade: 18, hazirla: function (S) {
    if (!bugunSecimYakin2(S, 14)) return null; var mc = mcInit(S);
    if (mc.gecmis.some(function (g) { return g.id === id && g.sonuc === 'kabul' && S.ay - g.ay < 12; })) return null;
    return {esik: 0, metin: metin};
  }, kontrol: function (S, z) { return mcInit(S).gecmis.some(function (g) { return g.id === id && g.sonuc === 'kabul' && g.ay >= z.ay0; }); }};
}
SOZ_TIP.yasa_asgari = yasaSozTip('asgari', 'Asgari ücret sözü', 'Asgari ücreti ve emekli aylıklarını artıran düzenlemeyi Meclis\'ten geçireceğiz.');
SOZ_TIP.yasa_egitim = yasaSozTip('egitim', 'Eğitim sözü', 'Eğitim sisteminde kapsamlı bir reformu Meclis\'ten geçireceğiz.');
SOZ_TIP.yasa_tesvik = yasaSozTip('tesvik', 'Yatırım sözü', 'Yatırımı ve istihdamı artıran teşvik yasasını Meclis\'ten geçireceğiz.');
var YASA = {
  asgari: {ad: 'Asgari Ücret Düzenlemesi', metin: 'Hükümet olarak asgari ücret ve emekli aylıklarını artıran bir teklifi Meclis\'e getirebilirsin.', gecer: {grup: {isciler: 6, emekliler: 3}, itibar: 2, drift: .08, stres: 2}, red: {grup: {isciler: -3}, itibar: -1, stres: 3}, eko: {butce: -0.4}},
  egitim: {ad: 'Eğitim Reformu', metin: 'Eğitim sisteminde kapsamlı bir değişiklik içeren teklifi Meclis\'e sunma zamanı.', gecer: {grup: {ogrenciler: 5, gencler: 4}, drift: .05, stres: 2}, red: {grup: {ogrenciler: -3}, birlik: -2}},
  vergi: {ad: 'Vergi Paketi', metin: 'Bütçe açığını kapatmak için vergi gelirlerini artıran bir paket hazırlandı.', gecer: {itibar: -1, birlik: -1, stres: 2, grup: {esnaf: -3}}, red: {itibar: -1, stres: 3}, pol: {v: 1}},
  kemer: {ad: 'Tasarruf Paketi', metin: 'Harcamaları kısan, borcu düşürmeyi hedefleyen bir paket hazırlandı. Kısa vadede tepki çekebilir.', gecer: {itibar: -2, birlik: -2, grup: {memurlar: -4, emekliler: -3}, stres: 3}, red: {itibar: -1, stres: 2}, pol: {h: -1, v: 1}},
  tesvik: {ad: 'Yatırım Teşvik Yasası', metin: 'Yatırımları ve istihdamı artırmayı hedefleyen bir teşvik paketini Meclis\'e getirebilirsin.', gecer: {drift: .05, itibar: 1, kasa: 0, stres: 2}, red: {itibar: -1, stres: 2}, eko: {yatirim: 8}}
};
function yasaKart(id, S) {
  var q = id.split('|'), p = S ? Math.round(yasaOlasilik(S) * 100) : 50;
  if (q[1] === 'gens') return {id: id, dyn: 1, kat: 'siyaset', onem: 1, baslik: 'Gensoru Önergesi', metin: 'Muhalefet, {s} hakkında gensoru önergesi verdi. Oylama için iktidar sandalyeleri ve parti disiplini belirleyici olacak.', sec: [
    {t: 'Bakanı savun (kabul ihtimali ~%' + p + ')', fx: {itibar: 1, birlik: 1}, s: 'Oylamaya gidiliyor.', risk: null, yasa: {gecer: {itibar: 1, birlik: 1, stres: 2}, red: {itibar: -3, stres: 3}, bakanDus: 1}},
    O('Bakanı görevden al', {itibar: -1, birlik: -1, stres: 2}, 'Bakan görevden alındı, kriz yatıştı.'),
    O('Meclis\'te açıklama yap', {stres: 2}, 'Açıklaman tartışmayı sınırladı.')]};
  var Y = YASA[q[1]]; if (!Y) return null;
  return {id: id, dyn: 1, kat: 'siyaset', baslik: Y.ad, metin: Y.metin + ' Mevcut hesaba göre kabul ihtimali yaklaşık %{s}.', sec: [
    {t: 'Meclis\'e sun (kabul ihtimali ~%' + p + ')', fx: Y.gecer, s: 'Teklif oylamaya gidiyor.', risk: null, yasa: Y},
    O('Muhalefetle müzakere et', {stres: 3, birlik: 1, itibar: 0}, 'Teklif yumuşatıldı; etkisi sınırlı kaldı.'),
    O('Ertele', {stres: -1}, 'Teklif şimdilik rafa kalktı.')]};
}
function OP(t, pd, s) { var o = O(t, {}, s); o.pd = pd; return o; }
var KARTLAR_M = [
 {id:'m_teklif',kat:'parti',onem:1,baslik:'Yeni Başkandan Görev Teklifi',metin:'{k}, yeni genel başkanın seni yönetim kuruluna çağırmak istediğini iletti. Kabul edersen birlik görüntüsü verirsin, ama muhalif kimliğin zedelenir.',sec:[
  OP('Görevi kabul et (destek ↓, itibar ↑)',{destek:-5,itibar:3,hizip:-10},'Parti içi barış sağlandı; hizbin dağılmaya başladı.'),
  OP('Reddet (destek ↑)',{destek:3,itibar:1,hizip:6},'Muhalif duruşun delegelerde karşılık buldu.'),
  OP('Şartlı kabul et',{destek:0,itibar:1},'Pazarlık sürüyor; kimse net bir kazanım elde edemedi.')]},
 {id:'m_hata',kat:'parti',baslik:'Yeni Başkan Hata Yaptı',metin:'Yeni genel başkanın bir açıklaması parti içinde tepki çekti. {k} fırsat kolladığını söylüyor.',kosul:function(S){return true;},sec:[
  OP('Fırsatı sonuna kadar kullan (destek ↑, itibar ↓)',{destek:4,itibar:-1,baskanGuc:-6},'Yönetim zor durumda, ama sert tavrın eleştirildi.'),
  OP('Yapıcı eleştir (destek ↑, itibar ↑)',{destek:2,itibar:2,baskanGuc:-2},'Olgun bir muhalefet olarak anıldın.'),
  OP('Sessiz kal',{destek:-1},'Fırsat başkasına geçti.')]},
 {id:'m_roportaj',kat:'medya',baslik:'Televizyon Röportajı Teklifi',metin:'Bir kanal, eski genel başkan olarak seninle parti içi durumu konuşmak istiyor.',sec:[
  OP('Kabul et ve açık konuş (itibar ↑, risk)',{itibar:3,destek:1},'Röportajın geniş yankı buldu.'),
  OP('Dengeli konuş',{itibar:1},'Mesajın ölçülüydü.'),
  OP('Reddet',{destek:-1},'Kamuoyu seni sessiz bir isim olarak görmeye başladı.')]},
 {id:'m_disiplin',kat:'parti',onem:1,baslik:'Disiplin Kurulu Çağrısı',metin:'Hizip çalışmaların parti yönetimini rahatsız etti. Seni disiplin kuruluna sevk etme tehdidi var.',kosul:function(S){return S.pd.hizip>35;},sec:[
  OP('Savunma yap, geri adım at (hizip ↓)',{hizip:-15,itibar:-1,destek:-2},'Gerginlik yatıştı ama taraftarın hayal kırıklığına uğradı.'),
  OP('Meydan oku (destek ↑, risk ↑)',{destek:3,itibar:-3,hizip:6,baskanGuc:-2},'Delegeler arasında konuşuldun; yönetim iyice sertleşti.'),
  OP('Arabulucu iste',{itibar:1,destek:0,hizip:-5},'Kıdemli isimler araya girdi.')]},
 {id:'m_il',kat:'parti',baslik:'İl Başkanı Seni Ziyaret Etti',metin:'Bir il başkanı, kurultayda sana destek vermeyi düşündüğünü fısıldadı. Karşılığında teşkilatta söz hakkı istiyor.',sec:[
  OP('Söz ver (destek ↑)',{destek:4,itibar:-1,hizip:5},'Bir ilin delegeleri senden yana döndü; bu söz hatırlanacak.'),
  OP('Söz verme, ilkeni anlat',{destek:1,itibar:2},'Dürüstlüğün takdir edildi.'),
  OP('Görüşmeyi kısa kes',{destek:-1},'Fırsat kaçtı.')]},
 {id:'m_kriz',kat:'kriz',baslik:'Partide Ekonomik Tartışma',metin:'Parti kasasındaki durum yüzünden yönetim ile yerel başkanlar karşı karşıya geldi. {k} senden görüş bekliyor.',sec:[
  OP('Yönetimi destekle (itibar ↑)',{itibar:2,destek:-2},'Sorumlu görünmen not edildi.'),
  OP('Yerel başkanların yanında dur (destek ↑)',{destek:3,itibar:-1,hizip:4},'Yerel teşkilat sana yakınlaştı.'),
  OP('Taraf tutma',{destek:0},'Kimse seni net bir tarafta konumlandıramadı.')]}
];
function kartKat(id) { var k = kartBul(id); return (k && k.kat) || (typeof KART_KAT !== 'undefined' && KART_KAT[id]) || 'siyaset'; }
function kartOnemli(id) { var k = kartBul(id); return !!(k && k.onem) || (typeof KART_ONEMLI !== 'undefined' && !!KART_ONEMLI[id]); }
function grupAdi(g) { for (var i = 0; i < GRUPLAR.length; i++) if (GRUPLAR[i].id === g) return GRUPLAR[i].ad; return g; }
function fxBagla(fx, b, g) {
  var o = {}; Object.keys(fx).forEach(function (k) {
    if (k === 'orgBolge') o.orgBolge = {b: b, v: fx.orgBolge.v};
    else if (k === 'grup' && typeof fx.grup === 'string') { var x = {}; x[g] = parseFloat(fx.grup); o.grup = x; }
    else o[k] = fx[k];
  }); return o;
}
function kartBul(id) {
  var i, q = String(id).split('|');
  for (i = 0; i < KARTLAR.length; i++) if (KARTLAR[i].id === id) return KARTLAR[i];
  for (i = 0; i < KARTLAR_Z.length; i++) if (KARTLAR_Z[i].id === id) return KARTLAR_Z[i];
  for (i = 0; i < KARTLAR_M.length; i++) if (KARTLAR_M[i].id === id) return KARTLAR_M[i];
  for (i = 0; i < KARTLAR_E.length; i++) if (KARTLAR_E[i].id === id) return KARTLAR_E[i];
  var sablon, ad;
  if (q[0] === 'b' && BOLGE_OLAY[q[1]] && BOLGE[q[2]]) {
    sablon = BOLGE_OLAY[q[1]]; ad = BOLGE[q[2]];
    return {id: id, dyn: 1, kat: sablon.kat, onem: sablon.onem, baslik: sablon.baslik.replace('{B}', ad), metin: sablon.metin.replace('{B}', ad), sec: sablon.sec.map(function (o) { return O(o.t, fxBagla(o.fx, q[2]), o.s, o.risk); })};
  }
  if (q[0] === 'g' && GRUP_OLAY[q[1]]) {
    sablon = GRUP_OLAY[q[1]]; ad = grupAdi(q[2]);
    return {id: id, dyn: 1, kat: sablon.kat, baslik: sablon.baslik.replace('{G}', ad), metin: sablon.metin.replace('{G}', ad), sec: sablon.sec.map(function (o) { return O(o.t, fxBagla(o.fx, null, q[2]), o.s, o.risk); })};
  }
  if (q[0] === 'y') return yasaKart(id, RKS);
  if (q[0] === 'p' && SOZ_TIP[q[1]]) {
    return {id: id, dyn: 1, kat: 'siyaset', onem: 1, baslik: 'Basından Soru: Taahhüt', metin: 'Basın toplantısında gazeteciler net bir taahhüt bekliyor: "{s}" Verdiğin söz kayda geçecek.', sec: [
      O('Söz ver', {itibar: 2, drift: .08, stres: 2}, 'Taahhüdün kayda geçti; tutmazsan hesabı sorulacak.'),
      O('Temkinli cevap ver', {stres: 1}, 'Net bir taahhütten kaçındın.'),
      O('Söz vermeyi reddet', {itibar: -1, stres: -1}, 'Gazeteciler kaçamak cevap aldı.')]};
  }
  return null;
}
function gecmisVar(S, id, sec) { return (S.kartGecmis || []).some(function (k) { return k.id === id && (sec === undefined || k.i === sec); }); }
function dinAdaylar(S) {
  var out = [];
  Object.keys(BOLGE_OLAY).forEach(function (tip) { var sb = BOLGE_OLAY[tip]; Object.keys(BOLGE).forEach(function (b) {
    if (sb.org) { var n = 0; ILLER.forEach(function (il, i) { if (il.bolge === b && S.org[i] > 0) n++; }); if (!n) return; }
    out.push({id: 'b|' + tip + '|' + b, tip: 'b' + tip});
  }); });
  GRUPLAR.forEach(function (g) { Object.keys(GRUP_OLAY).forEach(function (tip) { if (GRUP_OLAY[tip].kosul(S, g.id)) out.push({id: 'g|' + tip + '|' + g.id, tip: 'g' + tip + g.id}); }); });
  if (govMu(S, S.pid) && !muhalifMu(S) && S.ay >= 3) {
    kadroInit(S); Object.keys(YASA).forEach(function (y) { out.push({id: 'y|' + y, tip: 'y' + y}); });
    if (BAKANLIK.some(function (b) { return S.bakanlar[b[1]].perf < 55; })) out.push({id: 'y|gens', tip: 'ygens'});
  }
  Object.keys(SOZ_TIP).forEach(function (t) {
    if (S.ay < 2 || (S.sozler || []).some(function (z) { return z.tip === t && z.durum === 'acik'; })) return;
    if (t === 'ittifaksiz' && !bugunSecimYakin2(S, 30)) return;
    if (t.indexOf('yasa_') === 0 && (S.sozler || []).filter(function (z) { return z.durum === 'acik'; }).length >= 3) return;
    if (SOZ_TIP[t].hazirla(S)) out.push({id: 'p|' + t, tip: 'p' + t});
  });
  return out;
}
function bugunSecimYakin2(S, n) { for (var i = 0; i < S.takvim.length; i++) { var d = (S.takvim[i].y * 12 + S.takvim[i].m) - tarihNo(S.tarih); if (d >= 0 && d <= n) return true; } return false; }
function kartCek(S) {
  if (muhalifMu(S)) {
    if (rnd(S) > 0.7) return null; S.gorulen = S.gorulen || {};
    var mu = KARTLAR_M.filter(function (k) { return (!k.kosul || k.kosul(S)) && (S.gorulen[k.id] === undefined || S.ay - S.gorulen[k.id] >= 7); }); if (!mu.length) return null;
    var mk = pick(S, mu); S.gorulen[mk.id] = S.ay; return {t: 'kart', id: mk.id, k: S.kadro[Math.floor(rnd(S) * S.kadro.length)].ad};
  }
  if (S.ay > 0 && rnd(S) > 0.9) return null;
  S.gorulen = S.gorulen || {}; S.gorulenTip = S.gorulenTip || {};
  var son = (S.kartGecmis || [])[0], sonKat = son ? kartKat(son.id) : null;
  var havuz = [];
  KARTLAR.concat(KARTLAR_E).forEach(function (k) { if ((!k.kosul || k.kosul(S)) && (S.gorulen[k.id] === undefined || S.ay - S.gorulen[k.id] >= 9)) havuz.push({id: k.id, w: 1, kat: kartKat(k.id)}); });
  dinAdaylar(S).forEach(function (d) {
    if (S.gorulen[d.id] !== undefined && S.ay - S.gorulen[d.id] < 12) return;
    if (S.gorulenTip[d.tip] !== undefined && S.ay - S.gorulenTip[d.tip] < 8) return;
    var k = kartBul(d.id); havuz.push({id: d.id, tip: d.tip, w: d.id.charAt(0) === 'p' ? 1.4 : 0.5, kat: k.kat});
  });
  if (!havuz.length) return null;
  // kriz yoğunluğu: son kriz ile arası >= 4 ay, 12 ayda en fazla 3 kriz; krizler biraz seyrek çekilir
  S.krizAy = S.krizAy || [];
  var krizSon12 = S.krizAy.filter(function (x) { return S.ay - x < 12; }).length, krizSon = S.krizAy.length ? S.krizAy[S.krizAy.length - 1] : -99;
  var krizKapali = (S.ay - krizSon < 4) || krizSon12 >= 3;
  if (krizKapali) { var yk = havuz.filter(function (h) { return h.kat !== 'kriz'; }); if (yk.length >= 4) havuz = yk; }
  else havuz.forEach(function (h) { if (h.kat === 'kriz') h.w = 0.7; });
  var alt = havuz.filter(function (h) { return h.kat !== sonKat; }); if (alt.length >= 4) havuz = alt;
  var tw = 0; havuz.forEach(function (h) { tw += h.w; }); var r = rnd(S) * tw, sec = havuz[0];
  for (var i = 0; i < havuz.length; i++) { r -= havuz[i].w; if (r <= 0) { sec = havuz[i]; break; } }
  S.gorulen[sec.id] = S.ay; if (sec.tip) S.gorulenTip[sec.tip] = S.ay; if (sec.kat === 'kriz') S.krizAy.push(S.ay);
  var en = S.kadro.slice().sort(function (a, b) { return a.sad - b.sad; })[0], it = {t: 'kart', id: sec.id, k: en.ad};
  if (sec.id === 'y|gens') { var kb = BAKANLIK.filter(function (b) { return S.bakanlar[b[1]].perf < 55; }); var bb = kb.sort(function (a, b) { return S.bakanlar[a[1]].perf - S.bakanlar[b[1]].perf; })[0]; it.bk = bb[1]; it.s = bb[0] + ' Bakanı ' + S.bakanlar[bb[1]].ad; }
  else if (sec.id.indexOf('y|') === 0) { RKS = S; it.s = String(Math.round(yasaOlasilik(S) * 100)); }
  if (sec.id.charAt(0) === 'p') { var t = sec.id.split('|')[1], h = SOZ_TIP[t].hazirla(S); it.s = h.metin; it.soz = {tip: t, esik: h.esik, metin: h.metin, vade: SOZ_TIP[t].vade}; }
  return it;
}
function kartMetni(item) { var k = kartBul(item.id); return k.metin.replace('{k}', item.k).replace('{s}', item.s || ''); }
/* söz sistemi */
function sozVer(S, d) {
  S.sozler = S.sozler || []; var z = {id: S.sozler.length + 1, tip: d.tip, esik: d.esik, metin: d.metin, ay0: S.ay, vade: S.ay + d.vade, t: tarihYaz(S.tarih), durum: 'acik'};
  S.sozler.push(z); tarihceEkle(S, '🗣️', 'Söz verildi: ' + d.metin); return z;
}
function sozKir(S, z, haber) {
  z.durum = 'bozuldu'; z.tBitis = tarihYaz(S.tarih);
  var st = S.stat; st.itibar = clamp(st.itibar - 6, 0, 100); st.drift -= 0.15; st.birlik = clamp(st.birlik - 3, 0, 100);
  var m = 'Verilen söz tutulamadı: ' + z.metin; tarihceEkle(S, '⚠️', m); sonDakika(S, m); haber.push(m);
  (S.kz = S.kz || []).push({t: 'kart', id: 'sozkriz', k: S.kadro[0] ? S.kadro[0].ad : '', s: z.metin});
  var rv = rakipler(S).filter(function (r) { return S.rk && S.rk[r.id] && S.rk[r.id].agresif > 0.35; }); if (rv.length) { var r = pick(S, rv); haber.push(liderAdi(r.id) + ', ' + S.parti.ad + '\'in verdiği sözü hatırlatarak hesap sordu.'); S.yk[r.id] = clamp(S.yk[r.id] - 2, -50, 50); }
}
function sozTuttu(S, z, haber) {
  z.durum = 'tutuldu'; z.tBitis = tarihYaz(S.tarih); var st = S.stat; st.itibar = clamp(st.itibar + 4, 0, 100); st.drift += 0.06;
  var m = 'Söz tutuldu: ' + z.metin; tarihceEkle(S, '✅', m); haber.push(m);
}
function olayMotoru(S) {
  var haber = [], i;
  (S.sozler || []).forEach(function (z) {
    if (z.durum !== 'acik') return; var tp = SOZ_TIP[z.tip];
    if (tp.surekli && !tp.kontrol(S, z)) { sozKir(S, z, haber); return; }
    if (S.ay >= z.vade) { if (tp.kontrol(S, z)) sozTuttu(S, z, haber); else sozKir(S, z, haber); }
  });
  S.zincir = S.zincir || [];
  var kalan = [];
  S.zincir.forEach(function (c) { if (c.ay <= S.ay) { S.gorulen = S.gorulen || {}; if (S.gorulen[c.id] !== undefined && S.ay - S.gorulen[c.id] < 6) return; S.gorulen[c.id] = S.ay; (S.kz = S.kz || []).push({t: 'kart', id: c.id, k: c.k || '', s: c.s || ''}); } else kalan.push(c); });
  S.zincir = kalan;
  return haber;
}
function kartSec(S, item, i) {
  var sn = snapAl(S), r = kartSec0(S, item, i);
  if (r) { r.detay = snapFark(S, sn); var kc = kartBul(item.id); r.kid = kararKayit(S, 'kart', kc ? kc.baslik : item.id, kc && kc.sec[i] ? kc.sec[i].t : '', r.s, r.detay); }
  return r;
}
function kartSec0(S, item, i) {
  var k = kartBul(item.id), o = k.sec[i];
  var fxx = o.fx, yok = null, Yy = o.yasa;
  if (Yy) { yok = rnd(S) < yasaOlasilik(S); fxx = yok ? Yy.gecer : Yy.red; }
  var d = fxUygula(S, fxx, k.baslik), s = o.s;
  if (o.pd && S.pd) { var q = o.pd; if (q.destek) S.pd.destek = clamp(S.pd.destek + q.destek, 0, 95); if (q.itibar) S.pd.itibar = clamp(S.pd.itibar + q.itibar, 0, 100); if (q.hizip) S.pd.hizip = clamp(S.pd.hizip + q.hizip, 0, 100); if (q.baskanGuc && S.yeniBaskan) S.yeniBaskan.guc = clamp(S.yeniBaskan.guc + q.baskanGuc, 5, 95); }
  if (Yy) {
    s += yok ? ' Teklif Meclis\'te kabul edildi.' : ' Teklif Meclis\'te reddedildi.';
    if (yok && Yy.pol) Object.keys(Yy.pol).forEach(function (pk) { S.politika[pk] = Yy.pol[pk]; });
    if (yok && Yy.eko) Object.keys(Yy.eko).forEach(function (ek) { S.makro[ek] += Yy.eko[ek]; });
    if (!yok && Yy.bakanDus && item.bk && S.bakanlar) { var ny = yeniKisi(S, [30, 70]); ny.kaynak = S.bakanlar[item.bk].kaynak; S.bakanlar[item.bk] = ny; s += ' Bakan düştü; yeni bakan ' + ny.ad + '.'; }
    tarihceEkle(S, yok ? '📜' : '🗳️', (k.baslik || 'Teklif') + (yok ? ': kabul edildi' : ': reddedildi'));
  }
  if (o.sx) { var sxm = fxSis(S, o.sx); if (sxm) s += ' ' + sxm; }
  if (o.risk && rnd(S) < riskP(S, o.risk.p)) { var d2 = fxUygula(S, o.risk.fx, k.baslik + ' (riskli sonuç)'); Object.keys(d2).forEach(function (kk) { if (kk !== 'grup') d[kk] = d2[kk]; }); s += ' ' + o.risk.s; }
  S.log.unshift({t: tarihYaz(S.tarih), m: k.baslik + ': ' + o.t}); S.log = S.log.slice(0, 40);
  tarihceEkle(S, '📰', k.baslik + ': ' + o.t);
  S.kartGecmis = S.kartGecmis || []; S.kartGecmis.unshift({id: item.id, i: i, ay: S.ay, t: tarihYaz(S.tarih), sec: o.t}); if (S.kartGecmis.length > 40) S.kartGecmis.pop();
  if ((o.fx.drift || o.fx.itibar) && rnd(S) < 0.5) { S.yanki = S.yanki || []; S.yanki.push({ay: S.ay + 2 + Math.floor(rnd(S) * 3), fx: {drift: (o.fx.drift || 0) * 0.5, itibar: (o.fx.itibar || 0) * 0.5}, b: k.baslik, iyi: ((o.fx.drift || 0) + (o.fx.itibar || 0)) > 0}); }
  var soz = null;
  if (i === 0 && item.soz) { soz = sozVer(S, item.soz); s += ' (Söz: ' + item.soz.metin + ')'; }
  var zz = ZINCIR[item.id]; if (zz) zz.forEach(function (c) { if ((!c.sec || c.sec.indexOf(i) >= 0) && rnd(S) < c.p) { S.zincir = S.zincir || []; S.zincir.push({ay: S.ay + c.min + Math.floor(rnd(S) * (c.max - c.min + 1)), id: c.id, k: item.k, s: item.s || ''}); } });
  return {s: s, chips: chipler(d), soz: !!soz};
}

/* ---------- ittifak ---------- */
function yakinlik(S, id) {
  var p = partiBul(id), px = ideoBul(S.parti.ideo).x;
  if (S.mod === 'mevcut') px = partiBul(S.pid).x;
  var v = 100 - 90 * Math.abs(p.x - px) + S.yk[id] - (govMu(S, id) && !govMu(S, S.pid) ? 45 : 0);
  return clamp(Math.round(v), 0, 100);
}
function oyuncuIttifak(S) { for (var i = 0; i < S.ittifaklar.length; i++) if (S.ittifaklar[i].uyeler.indexOf(S.pid) >= 0) return S.ittifaklar[i]; return null; }
function ittifakaDavet(S, id) {
  if (muhalifMu(S)) return {ok: false, msg: 'Genel başkan olmadığın için ittifak kuramazsın.'};
  if (S.aksiyon.kalan <= 0) return {ok: false, msg: 'Bu ay aksiyon hakkın bitti.'};
  var it = oyuncuIttifak(S);
  for (var i = 0; i < S.ittifaklar.length; i++) if (S.ittifaklar[i].uyeler.indexOf(id) >= 0 && S.ittifaklar[i] !== it) return {ok: false, msg: partiAdi(S, id) + ' zaten başka bir ittifakta.'};
  if (it && it.uyeler.indexOf(id) >= 0) return {ok: false, msg: 'Zaten ittifaktasınız.'};
  S.aksiyon.kalan--;
  var y = yakinlik(S, id), oyOran = (S.anket[id] || 1) / Math.max(0.5, S.anketOyuncu);
  var esik = oyOran > 2 ? 65 : 52;
  if (y + rn(S, -8, 8) >= esik) {
    if (!it) { it = {ad: S.parti.ad + ' İttifakı', uyeler: [S.pid]}; S.ittifaklar.push(it); }
    it.uyeler.push(id); S.log.unshift({t: tarihYaz(S.tarih), m: partiAdi(S, id) + ' ittifaka katıldı.'});
    return {ok: true, kabul: true, msg: partiAdi(S, id) + ' ittifak teklifini kabul etti.'};
  }
  S.yk[id] -= 6;
  return {ok: true, kabul: false, msg: partiAdi(S, id) + ' teklifi şimdilik reddetti. Yakınlık düştü.'};
}
function ittifaktanAyril(S) {
  var it = oyuncuIttifak(S); if (!it || it.ad === 'Cumhur İttifakı') return false;
  S.ittifaklar = S.ittifaklar.filter(function (x) { return x !== it; }); return true;
}

/* ---------- haber, tarihçe, olaylar ---------- */
function tarihceEkle(S, i, m) { S.tarihce = S.tarihce || []; S.tarihce.unshift({t: tarihYaz(S.tarih), i: i, m: m}); if (S.tarihce.length > 60) S.tarihce.pop(); }
/* Acemi desteği: ilk 4 ayda riskli sonuç ihtimali %70 azalır (yeni oyuncu hemen cezalanmasın). */
function riskP(S, p) { return S && S.ay < 4 ? p * 0.3 : p; }
function olayEkle(S, o) { o.t = 'olay'; S.kuyruk.push(o); }
function sonDakika(S, m) { S.sd = S.sd || []; S.sd.push({m: m}); if (S.sd.length > 12) S.sd.shift(); }
function rakipler(S) { return PARTILER.filter(function (p) { return p.id !== S.pid && p.baz >= 3; }); }
var RKS = null;
function liderAdi(id) { if (RKS && RKS.rk && RKS.rk[id]) return RKS.rk[id].lider; return LIDER_AI[id] || (partiBul(id) ? partiBul(id).ad + ' Genel Başkanı' : id); }
function rakipAciklama(S) {
  if (rnd(S) > 0.55) return null;
  var r = pick(S, rakipler(S)), M = S.makro, t = [
    liderAdi(r.id) + ': "Enflasyon rakamları halkın cebindeki gerçeği yansıtmıyor."',
    liderAdi(r.id) + ', ' + S.parti.ad + ' için "ciddiye alınması gereken yeni bir oyuncu" dedi.',
    r.ad + ' kulisleri: Seçim stratejisi için kapalı toplantı yapıldı.',
    liderAdi(r.id) + ': "Önümüzdeki seçimde ' + (govMu(S, r.id) ? 'mandayı yenileyeceğiz' : 'iktidarı değiştireceğiz') + '."',
    r.ad + ' yönetimi, ' + (M.issiz > 9 ? 'işsizlik' : 'ekonomi') + ' gündemiyle miting takvimini açıkladı.'
  ];
  var m = pick(S, t); S.log.unshift({t: tarihYaz(S.tarih), m: m}); return m;
}
function olayUret(S) {
  if (rnd(S) > 0.22) return null;
  var r = pick(S, rakipler(S)), j = partiIdx(r.id), k = Math.floor(rnd(S) * 4), m;
  if (k === 0) { S.mods[j] = clamp(S.mods[j] * 0.95, 0.6, 1.5); m = r.ad + '\'de istifa depremi: üç milletvekili partisinden ayrıldı.'; }
  else if (k === 1) { S.mods[j] = clamp(S.mods[j] * 0.93, 0.6, 1.5); m = r.ad + ' yönetimi bir iç tartışma yüzünden gündemde: parti içinde görev dağılımı tartışılıyor.'; }
  else if (k === 2) { S.mods[j] = clamp(S.mods[j] * 1.04, 0.6, 1.5); m = r.ad + ' büyük bir kongre toplantısıyla kamuoyunun dikkatini çekti.'; }
  else { S.stat.drift += 0.04; m = 'Meclis\'te gergin saatler: ' + r.ad + ' ile iktidar arasında tartışma çıktı.'; }
  sonDakika(S, m); S.log.unshift({t: tarihYaz(S.tarih), m: m}); return m;
}
function kurultayYap(S) {
  var st = S.stat, ort = 0; S.kadro.forEach(function (k) { ort += k.sad; }); ort /= S.kadro.length;
  var hf0 = hafInit(S), ad0 = hf0.aday ? hf0.aday.guc : 0, guc = 0.45 * st.birlik + 0.3 * st.itibar + 0.25 * ort + norm(S) * 5 - ad0 * 0.35; if (ad0) hf0.aday = null;
  var pay = clamp(50 + (guc - 52) * 1.1, 18, 92), kz = pay >= 50, rakip = pick(S, AD_L) + ' ' + pick(S, SOYAD_L);
  if (kz) { st.birlik = clamp(st.birlik + 8, 0, 100); st.itibar = clamp(st.itibar + 3, 0, 100); st.stres = clamp(st.stres - 8, 0, 100); }
  else baskanlikKaybet(S, pay, rakip);
  pay = Math.round(pay * 10) / 10;
  tarihceEkle(S, kz ? '🏆' : '📉', 'Kurultay: ' + (kz ? 'genel başkanlığı %' + pay + ' ile korudu.' : rakip + ' karşısında genel başkanlığı kaybetti.'));
  return {t: 'kurultay', pay: pay, kazandi: kz, rakip: rakip, delege: 1300 + Math.floor(rnd(S) * 400)};
}
/* ---------- genel başkanlık sonrası siyasi hayat ---------- */
var MUHALIF_AKS = ['delege', 'hizip', 'elestir', 'basin', 'tatil'];
function muhalifMu(S) { return S.rol === 'muhalif'; }
function baskanAd(S) { return muhalifMu(S) && S.yeniBaskan ? S.yeniBaskan.ad : S.lider.ad; }
function baskanlikKaybet(S, pay, rakipAd) {
  S.rol = 'muhalif'; var st = S.stat;
  var gec = S.pd && S.pd.kayip ? S.pd.kayip : 0;
  S.pd = {destek: clamp(Math.round(pay), 10, 49), hizip: Math.round(pay * 0.4), itibar: clamp(Math.round(st.itibar - 6), 10, 90), vekil: false, kayip: gec + 1, ay0: S.ay, son: null};
  S.yeniBaskan = {ad: rakipAd, guc: 60, since: S.ay};
  st.itibar = clamp(st.itibar - 3, 0, 100); st.stres = clamp(st.stres - 10, 0, 100); st.birlik = clamp(st.birlik - 4, 0, 100);
  (S.sozler || []).forEach(function (z) { if (z.durum === 'acik') { z.durum = 'devir'; z.tBitis = tarihYaz(S.tarih); } });
  tarihceEkle(S, '🔁', 'Yeni genel başkan: ' + rakipAd + '. ' + S.lider.ad + ' partide kalıyor.');
}
function pdTier(S) { var d = S.pd.destek; return S.pd.vekil ? 'Milletvekili' : d >= 30 ? 'Parti yöneticisi' : d >= 18 ? 'Parti üyesi' : 'Etkisiz üye'; }
function kurultayTahmin(S) {
  var p = S.pd, b = S.yeniBaskan;
  return clamp(18 + 0.5 * p.destek + 0.2 * (p.itibar - 50) + 0.25 * (60 - b.guc) + (p.vekil ? 3 : 0) + 0.05 * p.hizip, 8, 90);
}
function muhalifTick(S) {
  var p = S.pd, b = S.yeniBaskan, st = S.stat, haber = [];
  var dA = S.anketPrev && S.anketPrev[S.pid] != null ? S.anketOyuncu - S.anketPrev[S.pid] : 0;
  b.guc = clamp(b.guc + dA * 8 + (50 - b.guc) * 0.02 + rn(S, -2.5, 2.5), 5, 95);
  st.drift += (b.guc - 50) / 100 * 0.03;
  p.destek = clamp(p.destek + (20 - p.destek) * 0.015 + p.hizip * 0.008 - (b.guc > 70 ? 0.3 : 0), 0, 95);
  p.hizip = p.hizip * 0.97; p.itibar = clamp(p.itibar + (50 - p.itibar) * 0.02, 0, 100);
  st.birlik = clamp(st.birlik - p.hizip / 100 * 0.35, 0, 100);
  if (b.guc < 28 && rnd(S) < 0.08) haber.push(b.ad + '\'ın genel başkanlığı sarsılıyor; parti içinde değişim sesleri yükseliyor.');
  if (b.guc > 78 && rnd(S) < 0.06) haber.push(b.ad + ' parti içinde gücünü pekiştirdi; muhalifler zor durumda.');
  return haber;
}
function kurultayAday(S, aday) {
  var p = S.pd, b = S.yeniBaskan, st = S.stat, tahmin = kurultayTahmin(S), delege = 1300 + Math.floor(rnd(S) * 400);
  if (!aday) { p.destek = clamp(p.destek - 2, 0, 95); tarihceEkle(S, '🗳️', 'Kurultayda aday olmadı.'); return {t: 'kurultay', sonuc: 1, aday: false, kazandi: false}; }
  var pay = clamp(tahmin + norm(S) * 7, 8, 92), kz = pay >= 50;
  pay = Math.round(pay * 10) / 10;
  if (kz) {
    var eski = b.ad; S.rol = 'baskan'; S.yeniBaskan = null; p.son = S.ay; p.ay1 = S.ay;
    st.birlik = clamp(st.birlik - 4, 0, 100); st.itibar = clamp(st.itibar + 3, 0, 100); st.stres = clamp(st.stres + 4, 0, 100);
    tarihceEkle(S, '🏆', 'Kurultay: ' + eski + ' karşısında %' + pay + ' ile genel başkanlığı geri aldı.');
    (S.kurultay || []).forEach(function (k) { });
  } else {
    p.destek = clamp(p.destek - 8, 5, 95); p.itibar = clamp(p.itibar - 3, 0, 100);
    tarihceEkle(S, '📉', 'Kurultay: ' + b.ad + ' karşısında %' + pay + ' ile yenildi.');
  }
  return {t: 'kurultay', sonuc: 1, aday: true, kazandi: kz, pay: pay, rakip: b.ad, delege: delege};
}

function milestones(S) {
  var ms = S.ms = S.ms || {}, n = teskilatSayisi(S);
  function once(k, i, m) { if (!ms[k]) { ms[k] = 1; tarihceEkle(S, i, m); } }
  if (S.mod === 'yeni' && n >= 41) once('t41', '📍', 'Teşkilat 41 ile ulaştı: seçime girme şartı sağlandı.');
  if (n >= 81) once('t81', '🗺️', 'Türkiye\'nin 81 ilinde teşkilat kuruldu.');
  if (S.anketOyuncu >= 7) once('b7', '📈', 'Anketlerde %7 barajı aşıldı.');
  if (oyuncuSira(S) === 1) once('s1', '🥇', 'Anketlerde birinci parti oldu.');
  if (S.stat.uye >= 100000) once('u100', '👥', 'Üye sayısı 100 bini aştı.');
  if (S.stat.kasa < 0) once('borc', '⚠️', 'Parti kasası eksiye düştü.');
}
/* ---------- ay sonu ---------- */
function makroEkle(M) {
  if (M.butce === undefined) { M.butce = -4.5; M.borc = 32; M.vergi = 17; M.yatirim = 50; M.cari = -3; M.memn = 40; }
}
var POL_AD = {h: ['Harcama', ['Kıs', 'Dengeli', 'Genişlet']], v: ['Vergi', ['İndir', 'Sabit', 'Artır']], f: ['Faiz tutumu', ['Gevşek', 'Orta', 'Sıkı']]};
function aiPolitika(S) {
  var M = S.makro, P = S.politika, d = {h: 0, v: 0, f: 0};
  d.h = (M.borc > 60 || M.butce < -7) ? -1 : (M.issiz > 11 || M.buyume < 0.5) ? 1 : 0;
  d.v = M.butce < -6 ? 1 : M.butce > -2 ? -1 : 0;
  d.f = M.enf > 50 ? 1 : M.enf < 30 ? -1 : 0;
  var degisti = d.h !== P.h || d.v !== P.v || d.f !== P.f; S.politika = d;
  return degisti ? 'Hükümet yeni ekonomi programını açıkladı: harcama ' + POL_AD.h[1][d.h + 1].toLowerCase() + ', vergi ' + POL_AD.v[1][d.v + 1].toLowerCase() + ', faiz ' + POL_AD.f[1][d.f + 1].toLowerCase() + '.' : null;
}
function politikaDegis(S, tip, v) {
  if (muhalifMu(S)) return {ok: false, msg: 'Genel başkan olmadığın için hükümet politikasını belirleyemezsin.'};
  if (!govMu(S, S.pid)) return {ok: false, msg: 'Ekonomi politikasını yalnızca iktidar belirler.'};
  if (S.aksiyon.kalan <= 0) return {ok: false, msg: 'Bu ay aksiyon hakkın bitti.'};
  if (S.politika[tip] === v) return {ok: false, msg: 'Bu politika zaten uygulanıyor.'};
  S.aksiyon.kalan--; S.politika[tip] = v; S.stat.stres = clamp(S.stat.stres + 1, 0, 100);
  var m = 'Hükümet kararı: ' + POL_AD[tip][0].toLowerCase() + ' politikası "' + POL_AD[tip][1][v + 1] + '" olarak belirlendi.'; S.log.unshift({t: tarihYaz(S.tarih), m: m}); tarihceEkle(S, '🏦', m);
  return {ok: true, msg: m};
}
function derinEkonomi(S) {
  var M = S.makro, P = S.politika || (S.politika = {h: 0, v: 0, f: 0}), haber = null; makroEkle(M);
  if (!govMu(S, S.pid) && (S.ay % 3 === 0)) haber = aiPolitika(S);
  M.enf = clamp(M.enf + 0.06 * P.h - 0.12 * P.f, 8, 90);
  M.buyume = clamp(M.buyume + 0.06 * P.h - 0.04 * P.v - 0.05 * P.f + (M.yatirim - 50) / 1000, -5, 7);
  M.yatirim = clamp(M.yatirim - 0.4 * P.f - 0.3 * P.v + (M.buyume - 2) * 0.3 - Math.max(0, M.borc - 70) * 0.05 + (50 - M.yatirim) * 0.05, 5, 95);
  M.vergi = clamp(M.vergi + (17 + 1.2 * P.v + (M.buyume - 3) * 0.25 - (M.enf > 60 ? 0.5 : 0) - M.vergi) * 0.3, 10, 28);
  var faizGider = M.borc * Math.max(0, M.faiz - M.enf * 0.6) / 100 * 0.4;
  M.butce = clamp(M.vergi - (20.5 + 3 * P.h) - faizGider, -15, 5);
  M.borc = clamp(M.borc + (-M.butce) / 12 - M.borc * (M.buyume + M.enf * 0.5) / 100 / 12 * 0.5, 10, 150);
  if (M.borc > 70) M.faiz = clamp(M.faiz + 0.1, 5, 80);
  M.cari = clamp(-3 - 0.4 * (M.buyume - 3) - 0.04 * (M.enf - 40), -10, 4);
  var hedefMemn = 62 - 0.55 * M.enf - 1.6 * Math.max(0, M.issiz - 6) + 2.2 * M.buyume;
  M.memn = clamp(M.memn + (hedefMemn - M.memn) * 0.15, 0, 100);
  S.makroGecmis = S.makroGecmis || []; S.makroGecmis.push({ay: S.ay, usd: M.usd, enf: M.enf, issiz: M.issiz, buyume: M.buyume, borc: M.borc, butce: M.butce}); if (S.makroGecmis.length > 60) S.makroGecmis.shift();
  if (govMu(S, S.pid)) S.stat.drift += (M.memn - 40) / 100 * 0.03;
  return haber;
}
function makroTick(S) {
  var M = S.makro, ene = M.enf;
  M.enf = clamp(M.enf + rn(S, -1, 1) * 0.9 - 0.25, 8, 90);
  M.faiz = clamp(M.faiz + 0.25 * (M.enf * 0.85 - M.faiz) + rn(S, -0.5, 0.5), 5, 80);
  /* kur: enflasyonun bir bölümünü yansıtır; reel faiz yüksekse ve cari açık küçükse yavaşlar, çalkantılıdır */
  M.usdOnce = M.usd; var pol = S.politika || {f: 0}, pt = clamp(0.8 - 0.02 * (M.faiz - M.enf) - 0.03 * (-M.cari - 3.5) - 0.1 * pol.f, 0.35, 1.1);
  /* adil değer enflasyonla yavaş yükselir; piyasa kuru onun etrafında gezinir (aylık sapma, ortalamaya dönüş) */
  M.usdAdil = (M.usdAdil || M.usd) * Math.pow(1 + M.enf / 100 * pt, 1 / 12);
  M.usdSapma = (M.usdSapma || 0) * 0.6 + rn(S, -0.05, 0.05);
  M.usd = Math.max(1, M.usdAdil * (1 + M.usdSapma));
  M.issiz = clamp(M.issiz + rn(S, -0.2, 0.2) + (M.buyume < 1 ? 0.1 : -0.03), 5, 22);
  M.buyume = clamp(M.buyume + rn(S, -0.4, 0.4) + (M.faiz > M.enf ? -0.1 : 0.05) + (3.5 - M.buyume) * 0.08, -5, 6.5);
  M.fiyat *= Math.pow(1 + M.enf / 100, 1 / 12);
  if (S.tarih.m === 1) M.asgari = Math.round(M.asgari * (1 + M.enf / 100 * 0.85));
  var polHaber = derinEkonomi(S);
  var haber = polHaber;
  if (rnd(S) < 0.03 && M.enf > 45) { M.usdAdil *= 1.12; M.usdSapma += 0.04; M.usd = M.usdAdil * (1 + M.usdSapma); M.enf += 3; haber = 'Kur şoku: dolar bir günde sert yükseldi, piyasalar gerildi.'; }
  return {haber: haber, fark: M.enf - ene};
}
function krizSeviyesi(S) {
  var M = S.makro, v = 0.5 * M.enf + 1.5 * Math.max(0, M.issiz - 8) + Math.max(0, -M.buyume) * 6;
  return v;
}
function grupDurum(g, M) {
  var e = M.enf, i = M.issiz, ton, t;
  var tab = {
    emekliler: e > 50 ? ['Maaş eriyor, öfkeli', 'bad'] : e > 30 ? ['Zam bekliyor', 'warn'] : ['Memnun', 'ok'],
    memurlar: e > 45 ? ['Zam pazarlığında', 'warn'] : ['Sakin', 'ok'],
    isciler: e > 40 ? ['Asgari ücret gündemde', 'bad'] : ['Sakin', 'ok'],
    ciftciler: e > 40 ? ['Girdi maliyeti şikâyeti', 'warn'] : ['Sakin', 'ok'],
    ogrenciler: ['Barınma sorunu', 'warn'],
    esnaf: e > 45 ? ['Kira ve vergi baskısı', 'bad'] : ['Temkinli', 'warn'],
    gencler: i > 10 ? ['İş bulamıyor', 'bad'] : ['Kararsız', 'warn'],
    muhafazakarlar: ['Değerler gündemde', 'ok'],
    milliyetciler: ['Güvenlik gündeminde', 'warn']
  };
  return tab[g];
}
/* ---------- yaşayan rakipler: strateji, lider gücü, ittifak, tepki ---------- */
var AD1 = ['Kemal','Ayhan','Selim','Derya','Burak','Seda','Murat','Emre','Gülay','Taner','Orhan','Nihal','Cem','Hakan','Pınar','Volkan','Sibel','Tuncay'];
var AD2 = ['Yalçın','Arslan','Tekin','Doğan','Kaplan','Özbek','Erdem','Sezer','Korkmaz','Aksoy','Bayram','Çetin','Uysal','Yıldız','Tuna','Önder','Işık','Sönmez'];
var STRAT = {ekonomi: 'Ekonomi eleştirisi', kimlik: 'Kitle seferberliği', merkez: 'Merkeze açılım', saldiri: 'Sert muhalefet', ittifak: 'İttifak arayışı', ic: 'Parti içi toparlanma', savunma: 'İcraat savunusu'};
var EKOY = {liberal: 'Piyasa odaklı', devletci: 'Devletçi', populist: 'Popülist'};
var KARAKT = {pragmatik: 'Pragmatik', ideolojik: 'İdeolojik', karizmatik: 'Karizmatik', teknokrat: 'Teknokrat', savasci: 'Savaşçı'};
function isimUret(S) { return pick(S, AD1) + ' ' + pick(S, AD2); }
function rkBolgeler() { var u = {}; ILLER.forEach(function (i) { u[i.bolge] = 1; }); return Object.keys(u); }
function rkInit(S) {
  if (S.rk) { RKS = S; return; }
  S.rk = {}; S.rbm = {};
  PARTILER.forEach(function (p, j) {
    if (p.id === S.pid) return;
    var bs = {}, bn = {}; ILLER.forEach(function (il, i) { bs[il.bolge] = (bs[il.bolge] || 0) + S.baz[i][j]; bn[il.bolge] = (bn[il.bolge] || 0) + 1; });
    var br = rkBolgeler().sort(function (a, b) { return bs[b] / bn[b] - bs[a] / bn[a]; });
    var eko = p.x > 0.55 ? pick(S, ['liberal', 'devletci', 'populist']) : p.x < -0.3 ? pick(S, ['devletci', 'populist', 'devletci']) : pick(S, ['liberal', 'populist', 'devletci']);
    S.rk[p.id] = {lider: LIDER_AI[p.id] || (p.ad + ' Genel Başkanı'), guc: Math.round(50 + rn(S, -10, 15)), strateji: p.baz > 20 ? 'ekonomi' : 'kimlik', since: S.ay,
      karakter: pick(S, ['pragmatik', 'ideolojik', 'karizmatik', 'teknokrat', 'savasci']), hirs: Math.round(rnd(S) * 100) / 100, agresif: Math.round(rnd(S) * 100) / 100, eko: eko,
      kale: br.slice(0, 2), zayif: br.slice(-2), kriz: null, gecmis: []};
    S.rbm[p.id] = {};
  });
  RKS = S;
}
function rkGecmis(S, id, m) { var r = S.rk[id]; r.gecmis.unshift([tarihYaz(S.tarih), m]); if (r.gecmis.length > 8) r.gecmis.pop(); }
function rkStratSec(S, id, r) {
  var p = partiBul(id), gov = govMu(S, id), enfK = clamp((S.makro.enf - 30) / 40, -0.5, 1.2), rank = siralama(S.anket).indexOf(id), x = r.agresif, sc = {};
  var oy = S.anket[id] || 0, tehdit = S.anketPrev && S.anketPrev[S.pid] ? S.anketOyuncu - S.anketPrev[S.pid] : 0;
  sc.ekonomi = gov ? 0 : 32 + 40 * Math.max(0, enfK) + (r.eko === 'populist' ? 10 : 0);
  sc.savunma = gov ? 35 + 15 * (1 - Math.max(0, enfK)) : -50;
  sc.kimlik = 20 + (r.karakter === 'ideolojik' ? 18 : 0) + (r.karakter === 'karizmatik' ? 8 : 0);
  sc.merkez = (rank > 2 ? 22 : 8) + (r.karakter === 'pragmatik' || r.karakter === 'teknokrat' ? 14 : 0) - (p.x > 0.7 || p.x < -0.7 ? 10 : 0);
  sc.saldiri = 15 + 35 * x + (tehdit > 0.8 && Math.abs(p.x - ideoBul(S.parti.ideo).x) < 0.6 ? 30 : 0) + (r.karakter === 'savasci' ? 15 : 0);
  sc.ittifak = (oy < 12 ? 32 : 6) + (r.karakter === 'pragmatik' ? 12 : 0) + (bugunSecimYakin(S) ? 14 : 0);
  sc.ic = r.guc < 38 ? 60 : -40;
  var best = 'ekonomi', bv = -1e9; Object.keys(sc).forEach(function (k) { var v = sc[k] + rn(S, -14, 14); if (v > bv) { bv = v; best = k; } });
  return best;
}
function bugunSecimYakin(S) { for (var i = 0; i < S.takvim.length; i++) { var d = (S.takvim[i].y * 12 + S.takvim[i].m) - tarihNo(S.tarih); if (d >= 0 && d <= 14) return true; } return false; }
function rakipTick(S) {
  rkInit(S); var haber = [], enfK = clamp((S.makro.enf - 30) / 40, -0.5, 1.2), hm = (S.hamle || []).filter(function (h) { return h.ay === S.ay; });
  PARTILER.forEach(function (p, j) {
    var r = S.rk[p.id]; if (!r) return;
    var rb = S.rbm[p.id]; Object.keys(rb).forEach(function (b) { rb[b] = 1 + (rb[b] - 1) * 0.94; });
    // lider gücü: anket seyri, iktidar yorgunluğu, doğal geri dönüş
    var dA = S.anketPrev && S.anketPrev[p.id] != null ? (S.anket[p.id] - S.anketPrev[p.id]) : 0;
    r.guc = clamp(r.guc + dA * 10 + (50 - r.guc) * 0.01 - (govMu(S, p.id) ? 0.9 * Math.max(0, enfK) : 0) + rn(S, -4, 3.6), 3, 100);
    if (rnd(S) < 0.018) { r.guc = clamp(r.guc - rn(S, 10, 20), 3, 100); var sk = pick(S, [liderAdi(p.id) + ' için parti içinde yönetim değişikliği tartışması çıktı.', liderAdi(p.id) + '\'in aday listesi parti içinde tepki çekti.', liderAdi(p.id) + ' televizyonda yaptığı açıklamayla özür dilemek zorunda kaldı.']); haber.push(sk); rkGecmis(S, p.id, 'İtibar kaybı yaşadı.'); }
    var gc = r.guc / 100;
    // strateji (3 ayda bir yenilenir)
    if ((S.ay - r.since) >= 3 || r.strateji === 'ic' && r.guc > 55) {
      var ns = rkStratSec(S, p.id, r);
      if (ns !== r.strateji) { r.strateji = ns; r.since = S.ay; if (rnd(S) < 0.35) haber.push(liderAdi(p.id) + ' yeni hat belirledi: ' + STRAT[ns].toLowerCase() + '.'); }
      else r.since = S.ay;
    }
    var st = r.strateji, m = S.mods[j];
    if (st === 'ekonomi') m += 0.004 * gc * (0.4 + Math.max(0, enfK));
    else if (st === 'savunma') m += 0.003 * gc;
    else if (st === 'kimlik') { r.kale.forEach(function (b) { rb[b] = Math.min(1.12, (rb[b] || 1) + 0.012 * gc); }); m -= 0.001; }
    else if (st === 'merkez') { r.zayif.forEach(function (b) { rb[b] = Math.min(1.08, (rb[b] || 1) + 0.01 * gc); }); }
    else if (st === 'saldiri') { m += 0.002 * gc; var hedef = S.anketOyuncu > (S.anketPrev ? S.anketPrev[S.pid] : 0) + 0.6 ? S.pid : siralama(S.anket)[0]; if (hedef === S.pid) { S.stat.drift -= 0.02 * gc * (0.5 + r.agresif); S.yk[p.id] = clamp(S.yk[p.id] - 1, -50, 50); } else if (hedef !== p.id) { var hj = partiIdx(hedef); if (hj >= 0) S.mods[hj] = clamp(S.mods[hj] - 0.002 * gc, 0.6, 1.5); } }
    else if (st === 'ic') { r.guc = Math.min(100, r.guc + 2.5); }
    // rakip ekonomisi: kasa (gelir-gider) ve ülke geneli teşkilat; kasa bitince tempo düşer
    if (r.kasa == null) { r.kasa = Math.round(40 + (p.baz || 10) * 2); r.tesk = Math.round(clamp(35 + (p.baz || 10) * 1.2, 20, 90)); }
    var pa = S.anket[p.id] || 5, gel = 1 + pa * 0.3 + (govMu(S, p.id) ? 3 : 0) + r.tesk * 0.02;
    var gid = 0.7 + pa * 0.24 + (st === 'kimlik' || st === 'saldiri' ? 0.8 : 0) + (S.makro.enf > 40 ? 0.5 : 0) + Math.max(0, r.kasa - 60) * 0.06;
    r.kasa = clamp(r.kasa + gel - gid, -5, 400);
    if (r.kasa > 75) r.tesk = clamp(r.tesk + 0.4, 15, 95); else r.tesk = clamp(r.tesk - 0.7, 15, 95);
    m += (r.tesk - 50) / 50 * 0.0015 * gc;
    if (r.kasa < 0) { r.kasa = 0; m -= 0.003; r.tesk = clamp(r.tesk - 1.5, 15, 95); if (rnd(S) < 0.25) haber.push(p.ad + ' mali sıkıntıda: kampanya harcamaları kısıldı.'); }
    S.mods[j] = clamp(m, 0.6, 1.5);
    // rakibin medya hamlesi: bir yayın organıyla yakınlaşır; oyuncunun o yayındaki yakınlığı aşınır
    if (S.medya && S.medya.length && r.agresif > 0.35 && rnd(S) < 0.07 * (0.5 + gc) && (siralama(S.anket).slice(0, 4).indexOf(p.id) >= 0)) {
      var mo = pick(S, S.medya); mo.yakin = clamp(mo.yakin - 4, -100, 100); S.mods[j] = clamp(S.mods[j] + 0.003 * gc, 0.6, 1.5);
      haber.push(liderAdi(p.id) + ', ' + mo.ad + ' ile yakın ilişki kurdu; yayında ' + p.ad + ' ağırlığı arttı.'); rkGecmis(S, p.id, mo.ad + ' ile yakınlaştı.');
    }
    // oyuncunun hamlesine tepki
    hm.forEach(function (h) {
      if (h.id === 'miting' && h.h && r.kale.indexOf(h.h) >= 0 && r.agresif > 0.45 && rnd(S) < 0.4 && rb) { rb[h.h] = Math.min(1.12, (rb[h.h] || 1) + 0.03); haber.push(p.ad + ', ' + S.parti.ad + ' mitingine karşı aynı bölgede gövde gösterisi yaptı.'); }
    });
    var tehdit = S.anketPrev && S.anketPrev[S.pid] != null ? S.anketOyuncu - S.anketPrev[S.pid] : 0;
    if (tehdit > 0.7 && Math.abs(p.x - (S.mod === 'mevcut' ? partiBul(S.pid).x : ideoBul(S.parti.ideo).x)) < 0.55 && r.agresif > 0.5 && rnd(S) < 0.3) { haber.push(liderAdi(p.id) + ', yükselişteki ' + S.parti.ad + '\'i doğrudan hedef aldı.'); S.stat.itibar = clamp(S.stat.itibar - 1, 0, 100); }
    // rakibin kini: oyuncunun yükselişi ve kendi alanındaki mitingleri hatırlanır; zamanla söner
    r.kin = (r.kin || 0) * 0.96;
    if (tehdit > 0.7 && r.agresif > 0.4 && siralama(S.anket).slice(0, 3).indexOf(p.id) >= 0) r.kin = Math.min(100, r.kin + 6);
    hm.forEach(function (h) { if (h.id === 'miting' && h.h && r.kale.indexOf(h.h) >= 0) r.kin = Math.min(100, r.kin + 10); });
    if (r.kin > 35 && rnd(S) < 0.3 * (r.kin / 100) && !muhalifMu(S)) {
      S.stat.itibar = clamp(S.stat.itibar - 1, 0, 100); S.stat.drift -= 0.02; r.kin -= 12;
      haber.push(liderAdi(p.id) + ', ' + S.parti.ad + '\'in geçmişteki hamlelerini hatırlatarak misilleme yaptı.'); rkGecmis(S, p.id, 'Seninle hesaplaştı.');
    }
    // lider krizi
    if (r.kriz) {
      S.mods[j] = clamp(S.mods[j] - 0.008, 0.6, 1.5);
      if (S.ay >= r.kriz.bitis) {
        var degis = r.guc < 25 ? rnd(S) < 0.65 : rnd(S) < 0.3, eski = r.lider; r.kriz = null;
        if (degis) {
          r.lider = isimUret(S); r.guc = Math.round(52 + rn(S, 0, 14)); r.hirs = Math.round(rnd(S) * 100) / 100; r.agresif = Math.round(rnd(S) * 100) / 100; r.karakter = pick(S, Object.keys(KARAKT)); r.strateji = 'ic'; r.since = S.ay;
          S.mods[j] = clamp(S.mods[j] + rn(S, -0.03, 0.07), 0.6, 1.5);
          var mh = p.ad + ' kurultayında ' + eski + ' devrildi, yeni lider ' + r.lider + '.'; sonDakika(S, mh); tarihceEkle(S, '🔁', mh); rkGecmis(S, p.id, eski + ' görevden ayrıldı.');
        } else { r.guc = Math.min(100, r.guc + 15); var mh2 = eski + ' koltuğunu korudu; ' + p.ad + ' yönetimi toparlandı.'; haber.push(mh2); rkGecmis(S, p.id, 'Liderlik krizini atlattı.'); }
      }
    } else if (r.guc < 34 && rnd(S) < 0.3 && !(p.id === 'AK' && r.guc > 22)) {
      r.kriz = {bitis: S.ay + 3}; var kh = p.ad + '\'de ' + liderAdi(p.id) + ' aleyhine ayrışma: istifa çağrıları yükseliyor.'; haber.unshift(kh); rkGecmis(S, p.id, 'Liderlik krizi yaşadı.');
    }
  });
  haber = haber.concat(rakipStrateji2(S));
  haber = haber.concat(rkIttifak(S));
  return haber.slice(0, 3);
}


/* ---------- seçim analizi: sonucun arkasındaki 3 etken ve bir sonraki seçim için not ---------- */
function secimAnaliz(S, sonuc) {
  if (muhalifMu(S)) return;
  var n = teskilatSayisi(S), M = S.makro, gov = govMu(S, S.pid), satir = [], zay = [];
  satir.push({k: 'Teşkilat', v: n + '/81 il · ' + (n >= 60 ? 'saha gücün oya yansıdı' : n >= 41 ? 'yeterli ama boşluklar var' : 'sahada zayıf kaldın'), c: n >= 60 ? 'good' : n < 41 ? 'badc' : ''}); if (n < 60) zay.push(0);
  var enfKotu = M.enf > 40;
  satir.push({k: 'Ekonomi', v: 'enflasyon %' + Math.round(M.enf) + ' · ' + (gov ? (enfKotu ? 'iktidar payını aşağı çekti' : 'seni zorlamadı') : (enfKotu ? 'hoşnutsuzluk sana alan açtı' : 'muhalefete az alan bıraktı')), c: gov ? (enfKotu ? 'badc' : 'good') : (enfKotu ? 'good' : '')}); if (gov && enfKotu) zay.push(1);
  var dr = S.stat.drift; satir.push({k: 'Eğilim', v: dr > 0.1 ? 'yükselen ivme' : dr < -0.1 ? 'düşen ivme' : 'yatay seyir', c: dr > 0.1 ? 'good' : dr < -0.1 ? 'badc' : ''}); if (dr < -0.1) zay.push(2);
  if (sonuc.tip === 'genel' && sonuc.il) {
    var by = -1, bk = -1, bv = -1, kv = 999; for (var i = 0; i < 81; i++) { var v = sonuc.il[i] ? sonuc.il[i][S.pid] : null; if (v == null) continue; if (v > bv) { bv = v; by = i; } if (v < kv) { kv = v; bk = i; } }
    if (by >= 0) satir.push({k: 'En güçlü il', v: ILLER[by].ad + ' · %' + bv.toFixed(1).replace('.', ',')});
    if (bk >= 0) satir.push({k: 'En zayıf il', v: ILLER[bk].ad + ' · %' + kv.toFixed(1).replace('.', ','), c: 'badc'});
    if (sonuc.oncekiOy) { var best = null, bd = 0; Object.keys(sonuc.ulusal).forEach(function (id) { if (id === S.pid) return; var d = sonuc.ulusal[id] - (sonuc.oncekiOy[id] || 0); if (d > bd) { bd = d; best = id; } }); if (best && bd > 0.5) satir.push({k: 'Yükselen rakip', v: partiAdi(S, best) + ' · +' + bd.toFixed(1).replace('.', ',') + ' puan'}); }
  }
  var not = zay.length ? ['Bir sonraki seçim için: teşkilatı genişlet.', 'Bir sonraki seçim için: ekonomik yükü hafifleterek itibarı koru.', 'Bir sonraki seçim için: ivmeyi toparlamak için kampanya takvimini erkene çek.'][zay[0]] : 'Şimdilik güçlü bir zeminin var; rakip hamlelerini izlemeye devam et.';
  olayEkle(S, {ikon: '🔎', ust: 'SEÇİM ANALİZİ', baslik: 'Sonucun arkasında ne var?', alt: not, satirlar: satir.slice(0, 6), ses: 'sahne', gazete: {ust: 'SEÇİM ÖZEL', manset: sonuc.tip === 'genel' ? 'Sandık konuştu' : 'Yerel seçim sonuçlandı', alt: not}});
}
/* ---------- miras zinciri: önemli eski kararlar 12-60 ay sonra geri döner (seyrek, küçük etkili) ---------- */
function mirasTick(S) {
  if (muhalifMu(S) || !S.kararlar || !S.kararlar.length) return;
  if (S.kuyruk.filter(function (q) { return q.t === 'olay'; }).length >= 1) return;
  if (S.ay - (S.mirasSon === undefined ? -99 : S.mirasSon) < 8 || rnd(S) > 0.22) return;
  var adaylar = S.kararlar.filter(function (k) {
    var yas = S.ay - k.ay; if (k.miras || yas < 12 || yas > 60 || !k.d || !k.d.length) return false;
    var sk = 0; k.d.forEach(function (x) { sk += x[5] ? 1 : -1; }); k._sk = sk; return Math.abs(sk) >= 2;
  });
  if (!adaylar.length) return;
  var k = pick(S, adaylar), iyi = k._sk > 0, yil = Math.max(1, Math.round((S.ay - k.ay) / 12)); k.miras = 1; S.mirasSon = S.ay;
  var st = S.stat;
  if (iyi) { st.itibar = clamp(st.itibar + 2, 0, 100); st.drift += 0.03; } else { st.itibar = clamp(st.itibar - 2, 0, 100); st.drift -= 0.03; st.stres = clamp(st.stres + 2, 0, 100); }
  var m = yil + ' yıl önceki \'' + k.ad + '\' kararın ' + (iyi ? 'olumlu anılıyor.' : 'bedeli şimdi tartışılıyor.');
  tarihceEkle(S, iyi ? '🕰️' : '⏳', m); sonDakika(S, m);
  olayEkle(S, {ikon: iyi ? '🕰️' : '⏳', ust: 'GEÇMİŞİN GÖLGESİ', baslik: iyi ? 'Eski kararın meyvesi' : 'Eski kararın bedeli', alt: esc_(k.ad) + ' · seçtiğin yol: ' + esc_(k.secim || ''), satirlar: [{k: 'Süre', v: yil + ' yıl önce'}, {k: 'Etki', v: iyi ? 'itibar ve ivme arttı' : 'itibar ve ivme düştü', c: iyi ? 'good' : 'badc'}], ses: iyi ? 'onay' : 'kriz'});
}
function esc_(x) { return String(x).replace(/[<>&]/g, ''); }
/* ---------- yıl sonu raporu: her 12 ayda bir kısa özet sahnesi ---------- */
function yilRapor(S) {
  var M = S.makro;
  if (!S.yil0) { S.yil0 = {anket: JSON.parse(JSON.stringify(S.anket || {})), enf: M.enf, usd: M.usd, issiz: M.issiz, buyume: M.buyume, kasa: S.stat.kasa}; return; }
  if (S.ay <= 0 || S.ay % 12 !== 0) return;
  var y0 = S.yil0, yil = Math.round(S.ay / 12), sr = siralama(S.anket), ben = S.anket[S.pid] || 0, d = ben - (y0.anket[S.pid] || 0);
  var fark = function (b, a) { return (b >= a ? '▲ ' : '▼ ') + Math.abs(b - a).toFixed(1).replace('.', ','); };
  var enb = sr.filter(function (id) { return id !== S.pid; }).map(function (id) { return {id: id, d: S.anket[id] - (y0.anket[id] || 0)}; }).sort(function (a, b) { return b.d - a.d; })[0];
  var satir = [
    {k: 'Anket payın', v: '%' + ben.toFixed(1).replace('.', ',') + ' (' + fark(ben, y0.anket[S.pid] || 0) + ')', c: d >= 0 ? 'good' : 'badc'},
    {k: 'Sıran', v: (sr.indexOf(S.pid) + 1) + '. parti'},
    {k: 'Yılın yükselen rakibi', v: enb && enb.d > 0.3 ? partiAdi(S, enb.id) + ' (' + fark(S.anket[enb.id], y0.anket[enb.id] || 0) + ')' : 'belirgin biri yok'},
    {k: 'Enflasyon', v: '%' + Math.round(M.enf) + ' (' + (M.enf <= y0.enf ? 'düştü' : 'yükseldi') + ')'},
    {k: 'Dolar', v: M.usd.toFixed(1).replace('.', ',') + ' ₺'},
    {k: 'İşsizlik / büyüme', v: '%' + M.issiz.toFixed(1).replace('.', ',') + ' / %' + M.buyume.toFixed(1).replace('.', ',')},
    {k: 'Kasa değişimi', v: ((S.stat.kasa - y0.kasa) >= 0 ? '+' : '−') + Math.abs(Math.round((S.stat.kasa - y0.kasa) / 1e5) / 10).toFixed(1).replace('.', ',') + ' mn ₺'}
  ];
  var man = d > 1.2 ? (!enb || d >= enb.d ? 'Yılın galibi sensin' : 'Güçlü bir yıl geçirdin') : d < -1.2 ? 'Zor bir yıl geride kaldı' : 'Dengeli bir yıl';
  var ad = S.parti.ad, ld = S.lider.ad, durum = d > 1.2 ? (!enb || d >= enb.d ? 'galip' : 'guclu') : d < -1.2 ? 'zor' : 'denge';
  var alinti = {
    galip: ['Manşet', '"' + ad + ', yılı zirvede kapattı; ' + ld + ' için tablo parlak."'],
    guclu: ['Yorum', '"' + ad + ' ivme kazandı ama rakipler de boş durmadı."'],
    denge: ['Analiz', '"Sahada büyük bir değişim yok; asıl mücadele önümüzdeki yılda."'],
    zor: ['Muhalefet', '"' + ad + ' yılı kayıpla kapattı; ' + ld + ' hesap vermeli."']
  }[durum];
  if (durum === 'galip') satir.unshift({k: 'Yılın başarısı', v: 'en çok yükselen parti sensin', c: 'good'});
  var vr = {galip: {ikon: '🏆', tema: 'g', konfeti: true, ses: 'zafer'}, guclu: {ikon: '🚀', tema: 'g', ses: 'onay'}, denge: {ikon: '📰', tema: '', ses: 'istifa'}, zor: {ikon: '📉', tema: 'r', ses: 'kriz'}}[durum];
  var obj = {ikon: vr.ikon, ust: yil + '. YIL SONU RAPORU', baslik: man, alt: (d > 1.2 ? 'Anketlerde belirgin bir yükseliş yaşadın.' : d < -1.2 ? 'Anketlerde belirgin bir kayıp yaşadın.' : 'Anketlerde yıl genelde yatay geçti.') + ' Rakipler ve ekonomi tablosu aşağıda.', satirlar: satir, alinti: alinti, tema: vr.tema, ses: vr.ses, gazete: {ust: yil + '. YIL SONU', manset: man, alt: ad + ' ' + yil + '. yılı geride bıraktı: anket payı %' + ben.toFixed(1).replace('.', ',') + '.'}};
  if (vr.konfeti) { obj.konfeti = true; obj.ticker = 'YIL SONU RAPORU · ' + ad.toUpperCase() + ' YILIN GALİBİ'; }
  olayEkle(S, obj);
  tarihceEkle(S, '📰', yil + '. yıl sonu: anket %' + ben.toFixed(1).replace('.', ',') + ' (' + fark(ben, y0.anket[S.pid] || 0) + ').');
  S.yil0 = {anket: JSON.parse(JSON.stringify(S.anket)), enf: M.enf, usd: M.usd, issiz: M.issiz, buyume: M.buyume, kasa: S.stat.kasa};
}
/* ---------- Aşama 3: rakiplerin kampanya hedeflemesi ve oyuncuya karşı blok davranışı ---------- */
function bolgeGucu(S, j, b) {
  var t = 0, w = 0, rb = S.rbm && S.rbm[PARTILER[j].id];
  for (var i = 0; i < 81; i++) { if (ILLER[i].bolge !== b) continue; t += ILLER[i].nufus * S.baz[i][j] * S.mods[j] * (rb ? (rb[b] || 1) : 1); w += ILLER[i].nufus; }
  return w ? t / w : 0;
}
function bolgeOyuncuGucu(S, b) { var t = 0, c = 0; for (var i = 0; i < 81; i++) if (ILLER[i].bolge === b) { t += S.org[i]; c++; } return c ? t / c : 0; }
function rakipStrateji2(S) {
  rkInit(S);
  var haber = [], yakin = false;
  for (var q = 0; q < S.takvim.length; q++) { var d = (S.takvim[q].y * 12 + S.takvim[q].m) - tarihNo(S.tarih); if (d >= 0 && d <= 9) yakin = true; }
  var sira = siralama(S.anket), pr = sira.indexOf(S.pid), lider = sira[0] === S.pid;
  var marj = lider && sira.length > 1 ? S.anket[S.pid] - S.anket[sira[1]] : 0;
  var zorK = {kolay: 0.8, orta: 1, zor: 1.15, acimasiz: 1.3}[S.zorluk] || 1;
  PARTILER.forEach(function (p, j) {
    var r = S.rk[p.id]; if (!r || p.id === S.pid || p.baz < 3) return; var gc = r.guc / 100, rb = S.rbm[p.id], n = 0;
    if (yakin && gc > 0.3 && !r.kriz) {
      // kampanya sezonu: rekabetin yakın olduğu bölgelere yatırım
      var adaylar = [];
      Object.keys(BOLGE).forEach(function (b) {
        var kendi = bolgeGucu(S, j, b), en = 0; PARTILER.forEach(function (o, jj) { if (jj !== j && o.baz >= 3) en = Math.max(en, bolgeGucu(S, jj, b)); });
        var oran = en > 0 ? kendi / en : 0;
        if (oran > 0.7 && oran < 1.12) adaylar.push({b: b, sk: -Math.abs(1 - oran) + (b === r.kale[0] ? 0.05 : 0)});
      });
      adaylar.sort(function (a, c) { return c.sk - a.sk; });
      adaylar.slice(0, 2).forEach(function (a) { rb[a.b] = Math.min(1.1, (rb[a.b] || 1) + 0.014 * gc * zorK * (0.6 + r.agresif)); n++; });
      if (n && rnd(S) < 0.12) haber.push(liderAdi(p.id) + ', seçim öncesi ' + adaylar.slice(0, 2).map(function (a) { return BOLGE[a.b]; }).join(' ve ') + ' bölgelerine yöneldi.');
    }
    // oyuncunun güçlü bölgesini savun / zayıf itibarını kullan
    if (!muhalifMu(S) && r.agresif > 0.4 && gc > 0.35) {
      var hot = Object.keys(BOLGE).filter(function (b) { return bolgeOyuncuGucu(S, b) > 45; });
      if (hot.length && S.anketOyuncu > 14 && rnd(S) < 0.25) { var hb = pick(S, hot); rb[hb] = Math.min(1.1, (rb[hb] || 1) + 0.01 * gc * zorK); }
      if (S.stat.itibar < 35 && rnd(S) < 0.3 * r.agresif) { S.stat.drift -= 0.03 * gc * zorK; if (rnd(S) < 0.25) haber.push(liderAdi(p.id) + ', ' + S.parti.ad + '\'in itibar sorunlarını gündeme taşıdı.'); }
    }
    // liderlik yarışı: lider olan oyuncuya karşı rakipler yakınlaşır
    if (lider && marj > 5 && rnd(S) < 0.05 * zorK) { var kz = sira.filter(function (id) { return id !== S.pid; })[0]; if (S.rk[kz]) S.yk[p.id] = clamp((S.yk[p.id] || 0) - 1, -50, 50); }
  });
  if (lider && marj > 7 && rnd(S) < 0.1 * zorK) {
    var ikinci = sira[1], ucuncu = sira[2];
    if (ikinci && ucuncu && S.rk[ikinci] && S.rk[ucuncu]) {
      S.rk[ikinci].strateji = 'saldiri'; S.rk[ikinci].since = S.ay; S.rk[ucuncu].strateji = 'saldiri'; S.rk[ucuncu].since = S.ay;
      haber.push('Rakipler ' + S.parti.ad + '\'in yükselişine karşı sertleşti: ' + partiAdi(S, ikinci) + ' ve ' + partiAdi(S, ucuncu) + ' eş güdümlü saldırıya geçti.');
    }
  }
  return haber;
}

var IT_AD = ['Millet İttifakı', 'Emek ve Özgürlük İttifakı', 'Değişim İttifakı', 'Ortak Gelecek İttifakı', 'Halk İttifakı', 'Yeni Yol İttifakı'];
function rkIttifak(S) {
  var out = [], enYakin = bugunSecimYakin(S), ids = PARTILER.filter(function (p) { return p.id !== S.pid && p.baz >= 3 && S.rk[p.id]; }).map(function (p) { return p.id; });
  function ittifaktaMi(id) { return S.ittifaklar.filter(function (it) { return it.uyeler.indexOf(id) >= 0; })[0]; }
  // yeni ittifak / katılım
  if (rnd(S) < (enYakin ? 0.12 : 0.04)) {
    var serbest = ids.filter(function (id) { return !ittifaktaMi(id) && S.rk[id].strateji === 'ittifak' || !ittifaktaMi(id) && S.anket[id] < 10; });
    if (serbest.length) {
      var a = pick(S, serbest), px = partiBul(a).x, adaylar = ids.filter(function (b) { return b !== a && Math.abs(partiBul(b).x - px) < 0.5 && !govMu(S, a) === !govMu(S, b); });
      if (adaylar.length) {
        var b2 = pick(S, adaylar), ia = ittifaktaMi(a), ib2 = ittifaktaMi(b2);
        if (!ia && !ib2 && !oyuncuIttifak(S)) { var ad = IT_AD.filter(function (n) { return !S.ittifaklar.some(function (it) { return it.ad === n; }); })[0]; if (ad) { S.ittifaklar.push({ad: ad, uyeler: [a, b2], ai: true}); var h = partiAdi(S, a) + ' ve ' + partiAdi(S, b2) + ' "' + ad + '" çatısı altında birleşti.'; out.push(h); tarihceEkle(S, '🤝', h); rkGecmis(S, a, ad + ' kuruldu.'); rkGecmis(S, b2, ad + ' kuruldu.'); } }
        else if (ib2 && ib2.ai && !ia && ib2.uyeler.length < 4 && S.anket[a] < 12) { ib2.uyeler.push(a); var h2 = partiAdi(S, a) + ', ' + ib2.ad + '\'na katıldı.'; out.push(h2); tarihceEkle(S, '🤝', h2); rkGecmis(S, a, ib2.ad + '\'na katıldı.'); }
      }
    }
  }
  // ayrılık
  S.ittifaklar.slice().forEach(function (it) {
    if (!it.ai || it.uyeler.indexOf(S.pid) >= 0) return;
    if (rnd(S) < 0.025 + (S.rk[it.uyeler[0]] && S.rk[it.uyeler[0]].kriz ? 0.05 : 0)) {
      var ayr = pick(S, it.uyeler); it.uyeler = it.uyeler.filter(function (u) { return u !== ayr; });
      var h3 = partiAdi(S, ayr) + ', ' + it.ad + '\'ndan ayrıldı.'; out.push(h3); tarihceEkle(S, '💥', h3); rkGecmis(S, ayr, it.ad + '\'ndan ayrıldı.');
      if (it.uyeler.length < 2) { S.ittifaklar = S.ittifaklar.filter(function (x) { return x !== it; }); out.push(it.ad + ' dağıldı.'); }
    }
  });
  // oyuncuya teklif
  if (!muhalifMu(S) && !oyuncuIttifak(S) && enYakin && rnd(S) < 0.08) {
    var tk = ids.filter(function (id) { return !ittifaktaMi(id) && yakinlik(S, id) >= 62 && S.rk[id].strateji === 'ittifak'; });
    if (tk.length && !S.kuyruk.some(function (q) { return q.t === 'teklif'; })) S.kuyruk.push({t: 'teklif', id: pick(S, tk)});
  }
  return out;
}
function teklifKabul(S, id) {
  var it = oyuncuIttifak(S); if (!it) { it = {ad: S.parti.ad + ' İttifakı', uyeler: [S.pid]}; S.ittifaklar.push(it); }
  if (it.uyeler.indexOf(id) < 0) it.uyeler.push(id); S.yk[id] = clamp(S.yk[id] + 5, -50, 50);
  var m = partiAdi(S, id) + ' ile ittifak kuruldu.'; S.log.unshift({t: tarihYaz(S.tarih), m: m}); tarihceEkle(S, '🤝', m); return m;
}
function teklifRed(S, id) { S.yk[id] = clamp(S.yk[id] - 4, -50, 50); S.log.unshift({t: tarihYaz(S.tarih), m: partiAdi(S, id) + ' ittifak teklifi geri çevrildi.'}); }
function rakipSecimSonrasi(S, sonuc) {
  rkInit(S); var oncekiO = sonuc.oncekiOy;
  PARTILER.forEach(function (p, j) {
    var r = S.rk[p.id]; if (!r || !oncekiO) return;
    var d = (sonuc.ulusal[p.id] || 0) - (oncekiO[p.id] || 0);
    if (d <= -3) { r.guc = clamp(r.guc - 18, 3, 100); rkGecmis(S, p.id, 'Seçimde ' + Math.abs(d).toFixed(1).replace('.', ',') + ' puan oy kaybetti.'); if (!r.kriz && rnd(S) < 0.5) { r.kriz = {bitis: S.ay + 3}; sonDakika(S, p.ad + '\'de seçim yenilgisi sonrası liderlik tartışması başladı.'); } }
    else if (d >= 3) { r.guc = clamp(r.guc + 14, 3, 100); rkGecmis(S, p.id, 'Seçimde ' + d.toFixed(1).replace('.', ',') + ' puan oy kazandı.'); }
  });
}

/* ---------- kadro, bölge başkanları, bakanlar kurulu, Meclis ---------- */
var OZEL = {sadik: ['Sadık', 'Sadakati yüksek, performansı ortalama'], hirsli: ['Hırslı', 'Güçlü ama sadakati oynak'], durust: ['Dürüst', 'Skandal riski düşük'], populist: ['Popülist', 'İtibar kazandırır, kasayı zorlar'], teknokrat: ['Teknokrat', 'Yetkin, sahada zayıf']};
var ROL_ETKI = {'Genel Başkan Yardımcısı': 'genel', 'Genel Sekreter': 'birlik', 'Parti Sözcüsü': 'itibar', 'Mali İşler Sorumlusu': 'gelir', 'Teşkilat Başkanı': 'org', 'Grup Başkanvekili': 'vekil', 'Kadın Kolları Başkanı': 'uye', 'Gençlik Kolları Başkanı': 'genc'};
var ROL_ACIK = {genel: 'Genel yönetim: parti eğilimine küçük katkı', birlik: 'Parti birliğini korur', itibar: 'Kamuoyunda itibar kazandırır', gelir: 'Kasaya gelir getirir', org: 'Teşkilat büyümesini hızlandırır', vekil: 'Meclis disiplini; yasa oylamalarında etkili', uye: 'Üye kazandırır', genc: 'Gençlerde destek ve üye'};
var BAKANLIK = [['Maliye', 'maliye'], ['İçişleri', 'ic'], ['Dışişleri', 'dis'], ['Sağlık', 'saglik'], ['Milli Eğitim', 'egitim'], ['Tarım', 'tarim'], ['Çalışma', 'calisma']];
var BAK_ACIK = {maliye: 'Bütçe dengesini etkiler', ic: 'Düzen ve parti eğilimi', dis: 'Dış ticaret ve cari denge', saglik: 'Ekonomik memnuniyet', egitim: 'Gençler ve öğrenciler', tarim: 'Çiftçiler', calisma: 'İşçiler ve işsizlik'};
function yeniKisi(S, yetAr) {
  var o = pick(S, Object.keys(OZEL)), y = Math.round(rn(S, yetAr ? yetAr[0] : 30, yetAr ? yetAr[1] : 85));
  if (o === 'teknokrat') y = Math.min(95, y + 10); var sd = Math.round(rn(S, 45, 80)) + (o === 'sadik' ? 12 : o === 'hirsli' ? -12 : 0);
  return {ad: pick(S, AD_L) + ' ' + pick(S, SOYAD_L), yet: y, ozel: o, sad: clamp(sd, 5, 100), hirs: clamp(Math.round(rn(S, 20, 80)) + (o === 'hirsli' ? 25 : 0), 0, 100), perf: y};
}
function kadroInit(S) {
  S.kadro.forEach(function (k) { if (k.yet === undefined) { var y = Math.round(rn(S, 35, 85)), o = pick(S, Object.keys(OZEL)); k.yet = y; k.ozel = o; k.perf = y; } });
  if (!S.bbs) { S.bbs = {}; Object.keys(BOLGE).forEach(function (b) { var k = yeniKisi(S, [30, 80]); S.bbs[b] = k; }); }
  if (govMu(S, S.pid) && !S.bakanlar) { S.bakanlar = {}; BAKANLIK.forEach(function (bk, i) { var ortak = S.gov.length > 1 && i % 3 === 2; var k = yeniKisi(S, [35, 85]); k.kaynak = ortak ? S.gov.filter(function (g) { return g !== S.pid; })[0] : 'parti'; S.bakanlar[bk[1]] = k; }); }
}
function kadroEtki(S, k, tip) {
  var e = (k.perf - 50) / 50, st = S.stat, i, t;
  switch (tip) {
    case 'genel': st.drift += 0.004 * e; break;
    case 'birlik': st.birlik = clamp(st.birlik + 0.2 * e, 0, 100); break;
    case 'itibar': st.itibar = clamp(st.itibar + 0.2 * e, 0, 100); break;
    case 'gelir': st.kasa += e * 0.05e6 * (S.makro.fiyat / 100); break;
    case 'org': for (i = 0; i < 3; i++) { t = Math.floor(rnd(S) * 81); if (S.org[t] > 0) S.org[t] = clamp(S.org[t] + 0.5 * e, 0, 100); } break;
    case 'uye': st.uye = Math.max(0, st.uye + Math.round(e * 90)); break;
    case 'genc': S.grup.gencler = clamp(S.grup.gencler + 0.12 * e, 0, 100); st.uye = Math.max(0, st.uye + Math.round(e * 40)); break;
  }
}
function kisiTick(S, k, kriz) {
  var hedefP = k.yet + (k.ozel === 'populist' ? 4 : 0) - (k.sad < 35 ? 10 : 0);
  k.perf = clamp(Math.round(k.perf + (hedefP - k.perf) * 0.15 + rn(S, -6, 6)), 0, 100);
}
function kadroTick(S) {
  kadroInit(S); var haber = [];
  S.kadro.forEach(function (k, i) {
    kisiTick(S, k); kadroEtki(S, k, ROL_ETKI[k.rol] || 'genel');
    if (k.ozel === 'populist') S.stat.kasa -= 0.02e6 * (S.makro.fiyat / 100);
    if (k.sad < 28 && rnd(S) < 0.06) {
      var eski = k.ad, yeni = yeniKisi(S, [25, 65]); yeni.rol = k.rol; S.kadro[i] = yeni; S.stat.birlik = clamp(S.stat.birlik - 2, 0, 100);
      var m = eski + ' (' + k.rol + ') görevinden istifa etti; yerine ' + yeni.ad + ' atandı.'; haber.push(m); tarihceEkle(S, '🚪', m); olayEkle(S, {ikon: '🚪', ust: 'PARTİ YÖNETİMİ', baslik: k.rol + ' istifa etti', alt: eski + ' görevden ayrıldı.', satirlar: ['Yerine ' + yeni.ad + ' atandı.', 'Parti birliği −2']});
    }
  });
  Object.keys(S.bbs).forEach(function (b) {
    var k = S.bbs[b]; kisiTick(S, k); k.sad = clamp(Math.round(k.sad + (S.stat.birlik - k.sad) * 0.08 + rn(S, -2, 2)), 0, 100);
    var e = (k.perf - 50) / 50; ILLER.forEach(function (il, i) { if (il.bolge === b && S.org[i] > 0) S.org[i] = clamp(S.org[i] + 0.3 * e, 0, 100); });
    if (k.sad < 25 && rnd(S) < 0.05) { var eski = k.ad, y = yeniKisi(S, [25, 65]); S.bbs[b] = y; ILLER.forEach(function (il, i) { if (il.bolge === b && S.org[i] > 5) S.org[i] -= 4; }); var m = BOLGE[b] + ' bölge başkanı ' + eski + ' ayrıldı; örgüt sarsıldı.'; haber.push(m); tarihceEkle(S, '🚪', m); }
  });
  if (govMu(S, S.pid)) {
    kadroInit(S); var M = S.makro;
    BAKANLIK.forEach(function (bk) {
      var k = S.bakanlar[bk[1]]; kisiTick(S, k); var e = (k.perf - 50) / 50;
      switch (bk[1]) {
        case 'maliye': M.butce = clamp(M.butce + 0.05 * e, -15, 5); break;
        case 'ic': S.stat.drift += 0.004 * e; break;
        case 'dis': M.cari = clamp(M.cari + 0.05 * e, -10, 4); break;
        case 'saglik': M.memn = clamp(M.memn + 0.2 * e, 0, 100); break;
        case 'egitim': S.grup.ogrenciler = clamp(S.grup.ogrenciler + 0.12 * e, 0, 100); S.grup.gencler = clamp(S.grup.gencler + 0.06 * e, 0, 100); break;
        case 'tarim': S.grup.ciftciler = clamp(S.grup.ciftciler + 0.14 * e, 0, 100); break;
        case 'calisma': S.grup.isciler = clamp(S.grup.isciler + 0.12 * e, 0, 100); M.issiz = clamp(M.issiz - 0.03 * e, 5, 22); break;
      }
      if (k.perf < 33 && rnd(S) < 0.05) { var eski = k.ad, y = yeniKisi(S, [30, 70]); y.kaynak = k.kaynak; S.bakanlar[bk[1]] = y; S.stat.itibar = clamp(S.stat.itibar - 2, 0, 100); var m = bk[0] + ' Bakanı ' + eski + ' istifa etti; yeni bakan ' + y.ad + '.'; haber.push(m); tarihceEkle(S, '🏛️', m); sonDakika(S, m); olayEkle(S, {ikon: '🏛️', ust: 'KABİNE', baslik: bk[0] + ' Bakanı istifa etti', alt: eski + ' görevi bıraktı.', satirlar: ['Yeni bakan: ' + y.ad], tema: 'b'}); }
    });
  }
  return haber;
}
function kadroDegis(S, tip, ref) {
  if (muhalifMu(S)) return {ok: false, msg: 'Genel başkan olmadığın için atama yapamazsın.'};
  kadroInit(S);
  if (S.aksiyon.kalan <= 0) return {ok: false, msg: 'Bu ay aksiyon hakkın bitti.'};
  var k, m;
  if (tip === 'kadro') { k = S.kadro[ref]; if (!k) return {ok: false, msg: 'Geçersiz.'}; }
  else if (tip === 'bolge') { k = S.bbs[ref]; if (!k) return {ok: false, msg: 'Geçersiz.'}; }
  else if (tip === 'bakan') { k = S.bakanlar && S.bakanlar[ref]; if (!k) return {ok: false, msg: 'Geçersiz.'}; if (k.kaynak && k.kaynak !== 'parti') { S.yk[k.kaynak] = clamp(S.yk[k.kaynak] - 6, -50, 50); return {ok: false, msg: partiAdi(S, k.kaynak) + ' kontenjanındaki bakanı değiştirmek koalisyon ortağını rahatsız eder (yakınlık düştü).'}; } }
  S.aksiyon.kalan--; var y = yeniKisi(S, [30, 85]); var rolAd = tip === 'kadro' ? k.rol : tip === 'bolge' ? BOLGE[ref] + ' Bölge Başkanı' : BAKANLIK.filter(function (b) { return b[1] === ref; })[0][0] + ' Bakanı'; var kmsg = ilisEtki(S, k, 'kov'); kovulanKaydet(S, k, rolAd); if (kmsg.length) zincirEkle(S, 'xn_kar_dost', 2, 4, 0.6);
  if (tip === 'kadro') { y.rol = k.rol; S.kadro[ref] = y; S.kadro.forEach(function (x, j) { if (j !== ref) x.sad = clamp(x.sad - 3, 0, 100); }); if (k.hirs > 60 && rnd(S) < 0.4) { S.stat.drift -= 0.04; S.log.unshift({t: tarihYaz(S.tarih), m: k.ad + ' görevden alınmanın ardından partiyi eleştirdi.'}); } m = k.ad + ' görevden alındı; yeni ' + k.rol + ': ' + y.ad + '.'; }
  else if (tip === 'bolge') { S.bbs[ref] = y; m = BOLGE[ref] + ' bölge başkanlığına ' + y.ad + ' atandı.'; }
  else { y.kaynak = 'parti'; S.bakanlar[ref] = y; S.stat.itibar = clamp(S.stat.itibar - 1, 0, 100); m = 'Bakanlar Kurulu değişikliği: yeni ' + (BAKANLIK.filter(function (b) { return b[1] === ref; })[0][0]) + ' Bakanı ' + y.ad + '.'; }
  S.stat.birlik = clamp(S.stat.birlik - 1, 0, 100); S.stat.stres = clamp(S.stat.stres + 1, 0, 100); S.log.unshift({t: tarihYaz(S.tarih), m: m}); tarihceEkle(S, '🔁', m);
  return {ok: true, msg: m + (kmsg.length ? ' ' + kmsg[0] : '')};
}
function kadroOdul(S, tip, ref) {
  if (muhalifMu(S)) return {ok: false, msg: 'Genel başkan olmadığın için bu işlemi yapamazsın.'};
  if (S.aksiyon.kalan <= 0) return {ok: false, msg: 'Bu ay aksiyon hakkın bitti.'};
  var k = tip === 'kadro' ? S.kadro[ref] : tip === 'bolge' ? S.bbs[ref] : S.bakanlar[ref]; if (!k) return {ok: false, msg: 'Geçersiz.'};
  var maliyet = 0.2e6 * (S.makro.fiyat / 100); if (S.stat.kasa < maliyet) return {ok: false, msg: 'Kasa yetersiz.'};
  S.aksiyon.kalan--; S.stat.kasa -= maliyet; k.sad = clamp(k.sad + 14, 0, 100); k.hirs = clamp(k.hirs + 3, 0, 100);
  hafInit(S).odul++; var im = ilisEtki(S, k, 'odul'); return {ok: true, msg: k.ad + ' ödüllendirildi; sadakati arttı.' + (im.length ? ' ' + im[0] : '')};
}
/* ---------- Aşama 2: kurmaylar, il başkanları, Meclis grubu, hükümet istikrarı ---------- */
var KURMAY = {kamp: ['Kampanya Yöneticisi', 'Seçime 6 ay kala parti ivmesini artırır'], eko: ['Ekonomi Danışmanı', 'Hükümetteyken büyümeye ve mali disipline katkı verir'], medya: ['Medya Danışmanı', 'Medya aksiyonlarının etkisini çoğaltır']};
var HIZIPLER = [['Muhafazakâr kanat', 'muh'], ['Reformcu kanat', 'ref'], ['Sol-sosyal kanat', 'sol']];
function asama2Init(S) {
  if (!S.kurmay) S.kurmay = {kamp: null, eko: null, medya: null};
  if (!S.hzb) S.hzb = HIZIPLER.map(function (h) { return {ad: h[0], id: h[1], guc: 33, sad: 62 + Math.round(rn(S, -6, 6))}; });
  if (!S.ilb) { S.ilb = []; for (var i = 0; i < ILLER.length; i++) S.ilb.push({ad: pick(S, AD_L) + ' ' + pick(S, SOYAD_L), sad: 55 + Math.round(rn(S, -12, 12)), yet: 40 + Math.round(rn(S, 0, 45))}); }
  if (S.azMaj === undefined) S.azMaj = 0;
}
function kurmayEtki(S, tip) { var k = S.kurmay && S.kurmay[tip]; return k ? (k.perf - 50) / 50 : 0; }
function kurmayAta(S, tip) {
  asama2Init(S);
  if (muhalifMu(S)) return {ok: false, msg: 'Genel başkan olmadığın için kurmay atayamazsın.'};
  if (!KURMAY[tip]) return {ok: false, msg: 'Geçersiz.'};
  var mal = 0.35e6 * (S.makro.fiyat / 100);
  if (S.stat.kasa < mal) return {ok: false, msg: 'Kasa yetersiz.'};
  if (S.aksiyon.kalan <= 0) return {ok: false, msg: 'Bu ay aksiyon hakkın bitti.'};
  S.stat.kasa -= mal; S.aksiyon.kalan--;
  var y = yeniKisi(S, [35, 90]); y.since = S.ay; S.kurmay[tip] = y;
  var m = KURMAY[tip][0] + ' atandı: ' + y.ad + '.'; S.log.unshift({t: tarihYaz(S.tarih), m: m}); S.log = S.log.slice(0, 40);
  return {ok: true, msg: m};
}
function grupOrtSad(S) { asama2Init(S); var t = 0, w = 0; S.hzb.forEach(function (g) { t += g.sad * g.guc; w += g.guc; }); return t / w; }
function hukumetDurum(S) {
  var kt = meclisKoltuk(S); return {koltuk: kt, cogunluk: kt >= 301, ortak: S.gov.length > 1};
}
function asama2Tick(S) {
  asama2Init(S); var st = S.stat, haber = [];
  // kurmaylar
  var secimAy = (S.takvim || []).some(function (e) { var d = (e.y * 12 + e.m) - (S.tarih.y * 12 + S.tarih.m); return d >= 0 && d <= 6; });
  var kamp = S.kurmay.kamp; if (kamp) { kisiTick(S, kamp); if (secimAy) st.drift += 0.04 * kurmayEtki(S, 'kamp'); }
  var eko = S.kurmay.eko; if (eko) { kisiTick(S, eko); if (govMu(S, S.pid)) S.makro.buyume = clamp(S.makro.buyume + 0.02 * kurmayEtki(S, 'eko'), -15, 15); }
  var md = S.kurmay.medya; if (md) kisiTick(S, md);
  // il başkanları
  var ort = 0; for (var b in S.bbs) ort += S.bbs[b].sad; ort /= Object.keys(S.bbs).length;
  var istifa = [];
  S.ilb.forEach(function (k, i) {
    k.sad = clamp(k.sad + (0.4 * (st.birlik - k.sad) + 0.3 * (ort - k.sad)) * 0.15 + rn(S, -3, 3), 0, 100);
    if (k.sad < 20 && S.org[i] > 0 && rnd(S) < 0.12) { istifa.push(i); }
  });
  istifa.slice(0, 2).forEach(function (i) { var eski = S.ilb[i].ad; S.ilb[i] = {ad: pick(S, AD_L) + ' ' + pick(S, SOYAD_L), sad: 50, yet: 40 + Math.round(rn(S, 0, 45))}; S.org[i] = Math.max(0, S.org[i] - 15); st.birlik = clamp(st.birlik - 0.8, 0, 100); haber.push(ILLER[i].ad + ' il başkanı ' + eski + ' istifa etti; il teşkilatı sarsıldı.'); });
  // Meclis grubu: hizipler
  S.hzb.forEach(function (g) {
    g.sad = clamp(g.sad + (st.birlik - g.sad) * 0.06 + (st.itibar - 50) * 0.01 + rn(S, -2.5, 2.5), 0, 100);
    g.guc = clamp(g.guc + (g.sad < 35 ? 0.6 : -0.15) + rn(S, -0.4, 0.4), 15, 55);
  });
  var vekil = S.meclis[S.pid] || 0;
  var asi = S.hzb.filter(function (g) { return g.sad < 25; })[0];
  if (asi && vekil > 20 && rnd(S) < 0.2) {
    var kay = Math.max(1, Math.round(vekil * asi.guc / 100 * 0.12)); S.meclis[S.pid] -= kay; st.birlik = clamp(st.birlik - 3, 0, 100); st.itibar = clamp(st.itibar - 2, 0, 100);
    asi.sad = clamp(asi.sad + 12, 0, 100); var msj = asi.ad + ' protesto olarak grupta oy vermedi; ' + kay + ' milletvekili partiden ayrıldı.'; haber.push(msj); tarihceEkle(S, '💥', msj);
  }
  // hükümet istikrarı
  if (govMu(S, S.pid)) {
    var hd = hukumetDurum(S);
    if (!hd.cogunluk) S.azMaj++; else S.azMaj = 0;
    if (hd.ortak && rnd(S) < 0.015 + (S.stat.birlik < 35 ? 0.03 : 0)) {
      var ort2 = S.gov.filter(function (id) { return id !== S.pid; }); var ayr = ort2[Math.floor(rnd(S) * ort2.length)];
      S.gov = S.gov.filter(function (id) { return id !== ayr; }); S.yk[ayr] = clamp(S.yk[ayr] - 20, -50, 50); st.itibar = clamp(st.itibar - 3, 0, 100);
      if (S.bakanlar) BAKANLIK.forEach(function (bk) { if (S.bakanlar[bk[1]].kaynak === ayr) { var ny = yeniKisi(S, [30, 70]); ny.kaynak = 'parti'; S.bakanlar[bk[1]] = ny; } });
      var m2 = partiAdi(S, ayr) + ' koalisyondan çekildi. Bakanlıklar yeniden dağıtıldı.'; haber.push(m2); tarihceEkle(S, '🏛️', m2); hd = hukumetDurum(S); S.azMaj = hd.cogunluk ? 0 : 1;
    }
    if (S.azMaj >= 3) haber.push(hukumetDus(S, 'Meclis çoğunluğu üç aydır yok, güvenoyu alınamadı').m);
  }
  return haber;
}

/* ---------- Karargâh: il bazlı anket, il odağı, seçim tahmini ---------- */
function ilmInit(S) { if (!S.ilm || S.ilm.length !== 81) { S.ilm = []; for (var i = 0; i < 81; i++) S.ilm.push(0); } }
function sahte(n) { var x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
function ilAnket(S) {
  ilmInit(S); var P = paylar(S), pid = S.pid, out = [];
  for (var i = 0; i < 81; i++) {
    var o = P.il[i], rel = ILLER[i].nufus / NUFUS_TOPLAM * 81, pay = o[pid];
    var sd = 1.2 * Math.sqrt(Math.max(pay, 3) / 10) / Math.sqrt(Math.max(0.2, rel)), z = (sahte(S.ay * 131 + i * 17 + S.rs % 97) + sahte(S.ay * 71 + i * 29) + sahte(S.ay * 53 + i * 7) - 1.5) * 2;
    var sira = siralama(o), rakip = sira.filter(function (id) { return id !== pid; })[0];
    out.push({i: i, ad: ILLER[i].ad, bolge: ILLER[i].bolge, mv: ILLER[i].mv, nufus: ILLER[i].nufus, gercek: pay, pay: Math.max(0, pay + z * sd * 0.6), hata: sd, sira: sira.indexOf(pid) + 1, lider: sira[0], rakip: rakip, fark: pay - o[rakip], trend: S.ilOnce ? pay - S.ilOnce[i] : 0, org: S.org[i], ilm: S.ilm[i], ilb: S.ilb ? S.ilb[i].sad : null});
  }
  return out;
}
function karargah(S) {
  var il = ilAnket(S), r = bugunSecimOlsa(S), pid = S.pid, mv = r.seats[pid] || 0;
  var firsat = il.filter(function (x) { return x.sira === 2 && x.fark > -8; }).sort(function (a, b) { return b.mv * (b.fark + 9) - a.mv * (a.fark + 9); });
  var tehlike = il.filter(function (x) { return x.sira === 1 && x.fark < 6; }).sort(function (a, b) { return b.mv - a.mv; });
  var guvenli = il.filter(function (x) { return x.sira === 1 && x.fark >= 6; }).sort(function (a, b) { return b.mv - a.mv; });
  var kayip = il.filter(function (x) { return x.sira > 2 || (x.sira === 2 && x.fark <= -8); }).sort(function (a, b) { return b.mv - a.mv; });
  var bi = r.birimler.filter(function (b) { return b.uyeler.indexOf(pid) >= 0; })[0];
  var oy = bi ? bi.pay : 0, baraj = bi ? bi.gecti : false;
  var yak = null; for (var q = 0; q < S.takvim.length; q++) { var d = S.takvim[q].y * 12 + S.takvim[q].m - tarihNo(S.tarih); if (d >= 0) { yak = {tip: S.takvim[q].tip, ay: d}; break; } }
  return {koltuk: mv, toplam: 600, girer: r.girer, oy: oy, baraj: baraj, firsat: firsat, tehlike: tehlike, guvenli: guvenli, kayip: kayip, il: il, secim: yak, ilKoltuk: r.ilKoltuk};
}

function meclisKoltuk(S) { var n = 0; S.gov.forEach(function (id) { n += S.meclis[id] || 0; }); return n; }
function yasaOlasilik(S) {
  var vk = S.kadro.filter(function (k) { return k.rol === 'Grup Başkanvekili'; })[0], vp = vk && vk.perf != null ? (vk.perf - 50) / 500 : 0;
  return clamp(0.5 + (meclisKoltuk(S) - 301) / 150 + (S.stat.birlik - 60) / 150 + vp + (grupOrtSad(S) - 55) / 250, 0.05, 0.95);
}

function ayiBitir(S) {
  S.ilOnce = paylar(S).il.map(function (o) { return o[S.pid]; });
  if (S.ilm) S.ilm = S.ilm.map(function (x) { return x * 0.93; });
  S.anketPrev = JSON.parse(JSON.stringify(S.anket));
  var onceki = {anket: S.anketOyuncu, kasa: S.stat.kasa, uye: S.stat.uye, org: teskilatSayisi(S), sira: oyuncuSira(S)};
  var etkiler = S.ayEtki.slice(); S.ayEtki = [];
  var mk = makroTick(S), st = S.stat, i;
  // finans
  var T0 = hedef(S), n = onceki.org;
  var gelir = (st.uye * 35 + 0.4e6 * (st.itibar / 50) * (1 + T0 / 4.4)) * S.makro.fiyat / 100;
  var gider = (0.5e6 + 0.03e6 * n) * (1 + T0 / 4.4) * S.makro.fiyat / 100;
  st.kasa += gelir - gider;
  var kEsik = kasaEsik(S), kFazla = st.kasa - kEsik;
  if (kFazla > 0) { var kEr = kFazla * 0.02; st.kasa -= kEr; S.eritme = kEr; if (kEr >= 0.8e6) S.log.unshift({t: tarihYaz(S.tarih), m: 'Kasada biriken fazla para enflasyon ve genel giderlerle eridi: ' + (kEr / 1e6).toFixed(1).replace('.', ',') + ' M ₺.'}); } else S.eritme = 0;
  if (st.kasa < 0) { st.drift -= 0.05; st.birlik = clamp(st.birlik - 1, 0, 100); st.stres = clamp(st.stres + 2, 0, 100); }
  // yapay zeka partiler
  var enfK = clamp((S.makro.enf - 30) / 40, -0.5, 1.2);
  PARTILER.forEach(function (p, j) {
    var hedefMod = govMu(S, p.id) ? 1 - 0.12 * enfK : 1 + 0.04 * enfK;
    if (S.sbias && S.sbias[p.id]) { hedefMod *= S.sbias[p.id]; S.sbias[p.id] = 1 + (S.sbias[p.id] - 1) * 0.985; }
    S.mods[j] = clamp(S.mods[j] + (hedefMod - S.mods[j]) * 0.1 + (rnd(S) - 0.5) * 0.02, 0.6, 1.5);
  });
  var rkh = rakipTick(S); rkh = rkh.concat(typeof genisleTick === 'function' ? genisleTick(S) : []);
  if (muhalifMu(S)) { rkh = rkh.concat(muhalifTick(S)); rkh = rkh.concat(erkenBaski(S)); } else { rkh = rkh.concat(kadroTick(S)); rkh = rkh.concat(asama2Tick(S)); rkh = rkh.concat(meclisTick(S)); rkh = rkh.concat(kpTick(S)); }
  rkh = rkh.concat(bldTick(S)); rkh = rkh.concat(mdTick(S)); rkh = rkh.concat(ilisTick(S));
  yilRapor(S); mirasTick(S);
  // kadro
  S.kadro.forEach(function (k) { k.sad = clamp(Math.round(k.sad + (st.birlik - k.sad) * 0.1 + rn(S, -2, 2) - k.hirs / 100), 0, 100); });
  // stres, sağlık
  st.stres = clamp(st.stres - 3, 0, 100); st.itibar = clamp(st.itibar + (50 - st.itibar) * 0.08, 0, 100);
  if (st.stres > 70) st.saglik = clamp(st.saglik - 2, 0, 100); else if (st.stres < 40) st.saglik = clamp(st.saglik + 1, 0, 100);
  // pasif etki
  var avg = 0; GRUPLAR.forEach(function (g) { avg += S.grup[g.id]; }); avg /= 9;
  var pasif = (0.05 * (st.itibar - 50) / 10 + 0.03 * (avg - 45) / 10 + 0.02 * (st.birlik - 50) / 10 - (st.stres > 75 ? 0.05 : 0)) * S.stil.drift;
  if (govMu(S, S.pid)) pasif -= 0.03 * (S.makro.enf - 30) / 10;
  st.drift = st.drift * 0.985 + pasif;
  // örgüt
  for (i = 0; i < 81; i++) {
    if (S.org[i] > 0) { S.org[i] = Math.min(100, S.org[i] + 0.3); if (st.kasa < 0) S.org[i] -= 0.5; if (st.birlik < 40) S.org[i] -= 0.5; S.org[i] = Math.max(0, S.org[i]); }
  }
  // seçmen grupları
  var gov = govMu(S, S.pid);
  GRUPLAR.forEach(function (g, gi) {
    var dlt = gov ? -0.15 * (S.makro.enf / 40) : (['emekliler','isciler','memurlar','esnaf','gencler'].indexOf(g.id) >= 0 ? 0.1 * (S.makro.enf / 40) : 0);
    S.grup[g.id] = clamp(S.grup[g.id] + dlt + (S.grupB[gi] - S.grup[g.id]) * 0.03, 0, 100);
  });
  // üye
  var T1 = hedef(S);
  st.uye = Math.max(0, Math.round(st.uye + (T1 * 24000 * (0.8 + 0.4 * st.itibar / 100) - st.uye) * 0.25));
  // tarih
  S.ay++; S.tarih.m++; if (S.tarih.m > 12) { S.tarih.m = 1; S.tarih.y++; }
  S.aksiyon.hak = st.stres > 85 ? 2 : 3; S.aksiyon.kalan = S.aksiyon.hak;
  anketGuncelle(S);
  st.mom = 0.5 * st.mom + 0.5 * (S.anketOyuncu - onceki.anket);
  S.anketGecmis.push({ay: S.ay, p: S.anketOyuncu});
  S.anketTum = S.anketTum || []; var tv = {}; siralama(S.anket).slice(0, 5).concat([S.pid]).forEach(function (id) { tv[id] = Math.round(S.anket[id] * 10) / 10; }); S.anketTum.push({ay: S.ay, v: tv}); if (S.anketTum.length > 40) S.anketTum.shift(); if (S.anketGecmis.length > 80) S.anketGecmis.shift();
  // haberler
  var top = siralama(S.anket), hb = [];
  if (mk.haber) hb.push(mk.haber);
  if (Math.abs(mk.fark) > 0.5 || S.ay % 3 === 0) hb.push('Yıllık enflasyon %' + S.makro.enf.toFixed(1).replace('.', ',') + (mk.fark > 0.5 ? '; beklentilerin üzerinde geldi.' : mk.fark < -0.5 ? '; beklentilerin altında geldi.' : '; piyasada sakin seyir.'));
  hb.push(['Anket özeti: ', 'Son ankette öne çıkan: ', 'Kamuoyu tablosu: '][S.ay % 3] + partiAdi(S, top[0]) + ' %' + S.anket[top[0]].toFixed(1).replace('.', ',') + ', ' + partiAdi(S, top[1]) + ' %' + S.anket[top[1]].toFixed(1).replace('.', ',') + '.');
  hb.push(pick(S, HABER_HAVUZU));
  var ra = rakipAciklama(S); if (ra) hb.push(ra);
  rkh.forEach(function (h) { hb.unshift(h); });
  var ol = olayUret(S); if (ol) hb.unshift(ol);
  olayMotoru(S).forEach(function (h) { hb.unshift(h); });
  S.yanki = (S.yanki || []).filter(function (y) { if (y.ay <= S.ay + 1) { fxUygula(S, y.fx, y.b + ' (yankı)'); hb.unshift(y.b + ' kararının ' + (y.iyi ? 'olumlu' : 'olumsuz') + ' yankısı sürüyor.'); return false; } return true; });
  gecikTick(S).forEach(function (m) { hb.unshift(m); });
  (S.kurultay || []).forEach(function (k) { var d = (k.y * 12 + k.m) - tarihNo(S.tarih); if (d === 3 || d === 1) hb.unshift('Kurultaya ' + d + ' ay kaldı: parti içi dengeler netleşiyor. Birliği güçlendir.'); });
  S.haberler = hb.slice(0, 4);
  hb.forEach(function (h) { S.log.unshift({t: tarihYaz(S.tarih), m: h}); }); S.log = S.log.slice(0, 40);
  secimGuncelle(S);
  // kuyruk
  var oz = {t: 'ozet', tarih: tarihUzun(S.tarih), onceki: onceki, anket: S.anketOyuncu, sira: oyuncuSira(S), kasa: st.kasa, uye: st.uye, org: teskilatSayisi(S), etkiler: etkiler.sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); }).slice(0, 5), haberler: S.haberler.slice(), gelir: gelir, gider: gider};
  S.kuyruk.push(oz);
  var olv = S.kuyruk.filter(function (q) { return q.t === 'olay'; });
  if (olv.length) { S.kuyruk = S.kuyruk.filter(function (q) { return q.t !== 'olay'; }); S.kuyruk.splice(S.kuyruk.indexOf(oz) + 1, 0, olv[0]); if (olv.length > 1) S.kuyruk.push(olv[1]); }
  if (S.kz && S.kz.length) { S.kuyruk = S.kuyruk.concat(S.kz); S.kz = []; }
  for (var ti = 0; ti < S.takvim.length; ti++) {
    var tk = S.takvim[ti];
    if (tk.y === S.tarih.y && tk.m === S.tarih.m) {
      var sonuc = secimYap(S, tk); S.sonSecim = sonuc;
      if (sonuc.tip === 'yerel') { var bm = bldSecim(S, sonuc); sonDakika(S, bm); var w = sonuc.iller[S.pid] || 0; st.drift += (w - 10) * 0.01; st.itibar = clamp(st.itibar + (w > 15 ? 3 : -1), 0, 100); }
      tarihceEkle(S, sonuc.tip === 'genel' ? '🗳️' : '🏙️', sonuc.tip === 'genel' ? 'Genel seçim: ' + (sonuc.girer ? S.parti.ad + ' %' + sonuc.ulusal[S.pid].toFixed(1).replace('.', ',') + ' oy, ' + (sonuc.koltuk[S.pid] || 0) + ' sandalye aldı.' : 'seçime girilemedi.') : 'Yerel seçim: ' + S.parti.ad + ' ' + (sonuc.iller[S.pid] || 0) + ' ilde birinci oldu.');
      S.arsiv = S.arsiv || [];
      if (sonuc.tip === 'genel') { var ka = sonuc.cb.adaylar[sonuc.cb.kazanan], tp = {}; Object.keys(sonuc.ulusal).sort(function (a, b) { return sonuc.ulusal[b] - sonuc.ulusal[a]; }).slice(0, 6).forEach(function (id) { tp[id] = [Math.round(sonuc.ulusal[id] * 10) / 10, sonuc.koltuk[id] || 0]; }); S.arsiv.unshift({tip: 'genel', t: tarihYaz(S.tarih), top: tp, cb: ka.ad, cbBlok: ka.blok, tur: sonuc.cb.tur, ben: [Math.round((sonuc.ulusal[S.pid] || 0) * 10) / 10, sonuc.koltuk[S.pid] || 0], kz: !!ka.oyuncu}); }
      else S.arsiv.unshift({tip: 'yerel', t: tarihYaz(S.tarih), iller: sonuc.iller, ben: sonuc.iller[S.pid] || 0});
      S.kuyruk.push({t: 'secim', sonuc: sonuc});
      secimAnaliz(S, sonuc);
      if (ti === S.takvim.length - 1) { S.bitti = true; S.kuyruk.push({t: 'bitis'}); }
      if (S.kariyer && typeof kariyerKontrol === 'function') kariyerKontrol(S, sonuc);
      if (sonuc.tip === 'genel') rakipSecimSonrasi(S, sonuc);
      if (sonuc.tip === 'genel' && !S.bitti) { ebInit(S); S.kpSoz = []; var kb = kpBaslat(S); if (kb) S.kuyruk.push(kb); }
      if (sonuc.tip === 'genel' && muhalifMu(S)) { var vk = (sonuc.koltuk[S.pid] || 0) > 0 && S.pd.destek >= 25; if (vk !== S.pd.vekil) { S.pd.vekil = vk; tarihceEkle(S, vk ? '🏛️' : '📉', vk ? S.lider.ad + ' milletvekili seçildi.' : S.lider.ad + ' Meclis dışında kaldı.'); } }
      S.anketOyuncu = S.anketOyuncu; anketGuncelle(S); secimGuncelle(S);
    }
  }
  milestones(S);
  (S.kurultay || []).forEach(function (k) { if (!S.bitti && k.y === S.tarih.y && k.m === S.tarih.m) { if (muhalifMu(S)) S.kuyruk.push({t: 'kurultay', aday: true, tahmin: Math.round(kurultayTahmin(S)), delege: S.pd.destek, yeni: S.yeniBaskan.ad}); else S.kuyruk.push(kurultayYap(S)); } });
  if (!S.bitti) { var kt = kartCek(S); if (kt) S.kuyruk.push(kt); }
  return oz;
}

/* ---------- kayıt ---------- */
var KAYIT = 'secimsim_v1', KP = 'secimsim_k_', KAYIT_NOT = '';
var SLOTLAR = ['auto', '1', '2', '3'];
function ozet32(str) { var h = 5381, i; for (i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + str.length; }
// eski kayıtları yeni sürüme uyarla; yeni alanlar için varsayılan ekle
function uyumla(o) {
  if (!o || typeof o !== 'object') return null;
  if (o.v !== 1 || !o.parti || typeof o.parti.ad !== 'string' || !o.tarih || typeof o.tarih.y !== 'number' || typeof o.tarih.m !== 'number') return null;
  if (!o.org || !o.stat || !o.anket || typeof o.pid === 'undefined') return null;
  o.sd = o.sd || []; o.tarihce = o.tarihce || []; o.ms = o.ms || {}; o.kuyruk = o.kuyruk || [];
  o.kurultay = o.kurultay || [{y: 2027, m: 9}, {y: 2029, m: 9}, {y: 2031, m: 9}];
  RKS = o; o.hamle = o.hamle || [];
  if (o.makro) { makroEkle(o.makro); o.politika = o.politika || {h: 0, v: 0, f: 0}; o.makroGecmis = o.makroGecmis || []; }
  o.sbias = o.sbias || null; o.rol = o.rol || 'baskan'; o.mc = o.mc || null; o.azMaj = o.azMaj || 0; o.ebs = o.ebs || 0; o.erkenSon = (o.erkenSon === undefined ? -99 : o.erkenSon); o.kpSoz = o.kpSoz || []; o.kp = o.kp || null; o.sozler = o.sozler || []; o.bbs = o.bbs || null; o.zincir = o.zincir || []; o.kz = o.kz || []; o.gorulenTip = o.gorulenTip || {};
  o.gecik = o.gecik || []; o.kararlar = o.kararlar || []; o.kartGecmis = o.kartGecmis || []; o.arsiv = o.arsiv || []; o.anketTum = Array.isArray(o.anketTum) ? o.anketTum : []; o.rozet = o.rozet || {}; o.yanki = o.yanki || [];
  return o;
}
function zarfAc(raw) {
  if (!raw) return null;
  try {
    var z = JSON.parse(raw);
    if (z && z.zarf === 2) { if (typeof z.d !== 'string' || ozet32(z.d) !== z.h) return null; return {ts: z.ts, o: uyumla(JSON.parse(z.d))}; }
    return {ts: 0, o: uyumla(z)}; // eski (zarfsız) kayıt
  } catch (e) { return null; }
}
function slotOku(slot) {
  var ls; try { ls = localStorage; } catch (e) { return null; }
  var k = KP + slot, r = null, i, key;
  for (i = 0; i < 2; i++) {
    key = i ? k + '_bak' : k;
    try { r = zarfAc(ls.getItem(key)); } catch (e) { r = null; }
    if (r && r.o) { if (i) KAYIT_NOT = 'Kayıt bozuktu, önceki yedekten kurtarıldı.'; return r; }
  }
  return null;
}
function kaydet(S, slot) {
  slot = slot || S._slot || 'auto';
  try {
    var d = JSON.stringify(S), k = KP + slot, ls = localStorage, onceki = ls.getItem(k);
    var z = JSON.stringify({zarf: 2, ts: Date.now(), h: ozet32(d), d: d});
    if (onceki && zarfAc(onceki)) { try { ls.setItem(k + '_bak', onceki); } catch (e) {} }
    ls.setItem(k, z);
    if (ls.getItem(k) !== z) return false;
    if (slot !== 'auto') S._slot = slot;
    return true;
  } catch (e) { return false; }
}
// slot verilmezse en yeni kayıt döner
function yukle(slot) {
  KAYIT_NOT = '';
  if (slot) { var r = slotOku(slot); if (r) r.o._slot = slot; return r ? r.o : null; }
  var en = null, ts = -1;
  SLOTLAR.forEach(function (sl) { var r = slotOku(sl); if (r && r.ts >= ts) { ts = r.ts; en = r.o; en._slot = sl; } });
  if (!en) { try { var eski = localStorage.getItem(KAYIT); var e0 = zarfAc(eski); if (e0 && e0.o) { e0.o._slot = 'auto'; kaydet(e0.o, 'auto'); localStorage.removeItem(KAYIT); return e0.o; } } catch (e) {} }
  return en;
}
function kayitlar() {
  return SLOTLAR.map(function (sl) { var r = slotOku(sl); return {slot: sl, ok: !!r, ts: r ? r.ts : 0, ad: r ? r.o.parti.ad : '', tarih: r ? r.o.tarih : null, bitti: r ? !!r.o.bitti : false}; });
}
function kayitSil(slot) { try { if (!slot) { SLOTLAR.forEach(kayitSil); localStorage.removeItem(KAYIT); return; } localStorage.removeItem(KP + slot); localStorage.removeItem(KP + slot + '_bak'); } catch (e) {} }

/* ---------- Aşama 4: genişletilmiş olay havuzu ve hikâye zincirleri ---------- */
function C(id, kat, baslik, metin, kosul, sec, ek) {
  var c = {id: id, kat: kat, baslik: baslik, metin: metin, sec: sec.map(function (x) { var q = O(x[0], x[1], x[2] || 'Konu kısa sürede gündemden düştü.', x[3] ? {p: x[3][0], fx: x[3][1], s: x[3][2]} : null); if (x[4]) q.sx = x[4]; return q; })};
  if (kosul) c.kosul = kosul; if (ek) for (var k in ek) c[k] = ek[k]; return c;
}
var gv = function (S) { return govMu(S, S.pid); }, mu = function (S) { return !govMu(S, S.pid); };
var KARTLAR_E = [
 C('xe_kira', 'ekonomi', 'Kira Krizi Büyüyor', 'Büyük şehirlerde kiralar maaşları geride bıraktı. Gençler ve memurlar sosyal medyada sana ulaşıyor.', function (S) { return S.makro.enf > 30; }, [
  ['Kira tavanı önerisi sun', {grup: {gencler: 6, memurlar: 4}, drift: .12, itibar: 1, stres: 2}, 'Öneri tartışma yarattı; kiracılar memnun, ev sahipleri sert.', [.25, {grup: {esnaf: -3}}, 'Esnaf kanadı tepki gösterdi.']],
  ['Konut üretimine vurgu yap', {grup: {gencler: 3}, drift: .05, itibar: 1}, 'Orta vadeli bir plan sundun; anlık çözüm beklenti yarattı.'],
  ['Piyasaya bırak', {grup: {gencler: -5}, drift: -.05}, 'Gençler ilgisizlikle suçladı.']]),
 C('xe_asgari', 'ekonomi', 'Asgari Ücret Masası', 'Sendikalar asgari ücret görüşmeleri öncesi parti görüşünü soruyor.', function (S) { return S.tarih.m === 12 || S.tarih.m === 1 || S.tarih.m === 6; }, [
  ['Yüksek artış talep et', {grup: {isciler: 7}, drift: .12, itibar: 1, stres: 2}, 'İşçi kesimi seni sahiplendi; işverenler rahatsız.', [.3, {grup: {esnaf: -4}}, 'Esnaf yüksek artışın maliyetinden şikâyetçi.']],
  ['Dengeli formül öner', {grup: {isciler: 3, esnaf: 2}, drift: .05}, 'Her iki taraf da yarı memnun.'],
  ['Hükümetin kararını bekle', {grup: {isciler: -3}, itibar: -1}, 'Çekimser kalman eleştirildi.']]),
 C('xe_dolar', 'ekonomi', 'Dolar Hareketli', 'Kur bir haftada keskin yükseldi. Çarşı ve pazar tedirgin; gazeteciler senden açıklama bekliyor.', function (S) { return S.makro.usd > 40; }, [
  ['Ekonomi programını açıkla', {drift: .12, itibar: 2, stres: 3}, 'Açıklaman ciddiye alındı.'],
  ['Hükümeti suçla', {drift: .08, itibar: -1, birlik: 1}, 'Kendi tabanın coştu, kararsızlar ilgilenmedi.'],
  ['Sessiz kal', {drift: -.1, itibar: -1}, 'Kriz anında sessizlik eleştirildi.']]),
 C('xe_faiz', 'ekonomi', 'Faiz Kararı', 'Merkez Bankası faiz kararını açıkladı. Esnaf kredi maliyetinden, tasarrufçular getiriden söz ediyor.', null, [
  ['Esnafa kredi desteği iste', {grup: {esnaf: 5}, drift: .06, itibar: 1}, 'Esnaf seni duydu.'],
  ['Tasarrufçuları koru', {grup: {emekliler: 4}, drift: .04}, 'Emekliler olumlu karşıladı.'],
  ['Teknik bir açıklama yap', {itibar: 1}, 'Uzmanlar notunu verdi, sokak ilgilenmedi.']]),
 C('xe_vergi', 'ekonomi', 'Vergi Düzenlemesi Tartışması', 'Yeni vergi paketi gündemde. Esnaf ve orta sınıf birbirine girdi.', null, [
  ['Orta sınıfın yanında dur', {grup: {memurlar: 4, esnaf: 3}, drift: .09, stres: 2}, 'Orta sınıf sahip çıktığını gördü.'],
  ['Adil vergi sloganı kullan', {drift: .06, itibar: 1}, 'Slogan tuttu ama ayrıntı sorulmaya başlandı.'],
  ['Konuya girme', {drift: -.04, itibar: -1}, 'Gündem seni geçti.']]),
 C('xe_borsa', 'ekonomi', 'Borsa Düştü', 'Borsa bir günde sert geriledi. Küçük yatırımcılar kaybetti.', function (S) { return S.makro.buyume < 2; }, [
  ['Küçük yatırımcıyı koru çağrısı yap', {grup: {esnaf: 3}, drift: .06, itibar: 1}, 'Çağrın haber oldu.'],
  ['Hükümeti sorumlu tut', {drift: .07, birlik: 1}, 'Muhalefet cephesinde yankı buldu.'],
  ['Panik yaratma', {itibar: 1}, 'Sakin duruşun beğenildi.']]),
 C('xe_isten', 'ekonomi', 'Toplu İşten Çıkarma', 'Bölgenin büyük fabrikası yüzlerce çalışanını işten çıkarıyor. İşçiler seni arıyor.', function (S) { return S.makro.issiz > 9; }, [
  ['Fabriğa git, işçilerle buluş', {grup: {isciler: 7}, drift: .14, stres: 4, kasa: -.08}, 'İşçiler seni yalnız bırakmadı.'],
  ['Yasal destek sağla', {grup: {isciler: 4}, kasa: -.15, itibar: 1}, 'Hukuki destek memnuniyet yarattı.'],
  ['Açıklama yap, git', {grup: {isciler: 1}}, 'Mesaj verildi, etki sınırlı.']]),
 C('xe_ciftci', 'ekonomi', 'Çiftçi Eylemi', 'Çiftçiler gübre ve mazot fiyatları için traktörlerle kente yürüyor.', null, [
  ['Eyleme destek ver', {grup: {ciftciler: 8}, drift: .1, stres: 3}, 'Çiftçiler seni unutmayacak.', [.2, {itibar: -2}, 'Trafik yüzünden tepki aldın.']],
  ['Meclis\'te soru önergesi ver', {grup: {ciftciler: 3}, itibar: 1}, 'Mesaj ulaştı.'],
  ['Mesafeli dur', {grup: {ciftciler: -5}, itibar: -1}, 'Çiftçiler seni ilgisiz buldu.']]),
 C('xe_emekli', 'ekonomi', 'Emekli Bayram İkramiyesi', 'Emekliler bayram ikramiyesinin artırılmasını bekliyor.', function (S) { return S.makro.enf > 25; }, [
  ['Eşit ikramiye öner', {grup: {emekliler: 7}, drift: .1, itibar: 1}, 'Emekli kesimi duyarlılığını gördü.'],
  ['Mali disiplini hatırlat', {grup: {emekliler: -2}, itibar: 1}, 'Tutarlı bulundu ama sevilmedi.'],
  ['Hükümete çağrı yap', {grup: {emekliler: 3}}, 'Çağrın not edildi.']]),
 C('xe_ihale', 'ekonomi', 'Şüpheli İhale İddiası', 'Bir belediye ihalesinde yakınlarına kayırma iddiası çıktı.', null, [
  ['Soruşturma talep et', {itibar: 2, drift: .06, stres: 2}, 'Şeffaflık çizgin güçlendi.'],
  ['Konuyu görmezden gel', {itibar: -2, drift: -.05}, 'Sessizliğin yorumlandı.'],
  ['Kendi belediyelerini denetle', {itibar: 2, birlik: -1, kasa: -.1}, 'Kendi saflarına da bakman dikkat çekti.']]),
 C('xe_uretim', 'ekonomi', 'Sanayi Odası Ziyareti', 'Organize sanayi bölgesindeki girişimciler yeni teşvik paketi bekliyor.', null, [
  ['Üretim teşviki öner', {grup: {esnaf: 4, isciler: 2}, drift: .06, itibar: 1}, 'Sanayiciler ilgiyle dinledi.'],
  ['İstihdam şartı koy', {grup: {isciler: 4}, drift: .04}, 'İşçiler sevindi, sanayiciler çekimser.'],
  ['Ziyareti kısa tut', {stres: -1}, 'Kimseyi etkilemeyen bir ziyaret oldu.']]),
 C('xe_turizm', 'ekonomi', 'Turizm Sezonu Sancısı', 'Turizm bölgelerinde fiyatlar yükseldi, yerel halk geçinmekte zorlanıyor.', function (S) { return S.tarih.m >= 5 && S.tarih.m <= 9; }, [
  ['Yerel halka destek öner', {grup: {esnaf: 4}, drift: .07, itibar: 1}, 'Yerel esnaf ve halk memnun.'],
  ['Turizm stratejisi açıkla', {itibar: 2}, 'Planın ciddi bulundu.'],
  ['Konuyu geç', {drift: -.03}, 'Bölgede ilgisizlik izlenimi oluştu.']]),
 C('xe_enerji', 'ekonomi', 'Elektrik ve Doğalgaz Zammı', 'Fatura zammı hane bütçesini sarstı. Mahallelerde tepki büyüyor.', function (S) { return S.makro.enf > 28; }, [
  ['Zamma karşı kampanya başlat', {drift: .14, grup: {emekliler: 3, isciler: 3}, stres: 3, kasa: -.15}, 'Kampanya mahallelerde karşılık buldu.'],
  ['Alternatif enerji planı sun', {itibar: 2, drift: .05}, 'Uzun vadeli bir vizyon çizdin.'],
  ['Sembolik açıklama yap', {drift: .02}, 'Konu sönümlendi.']]),
 C('xe_kredi', 'ekonomi', 'Öğrenci Kredisi Borcu', 'Öğrencilerin ve yeni mezunların borçları gündemde.', null, [
  ['Borç yapılandırma öner', {grup: {ogrenciler: 6, gencler: 4}, drift: .1, itibar: 1}, 'Gençler seni sahiplendi.'],
  ['Burs sistemini yeniden tasarla', {grup: {ogrenciler: 4}, itibar: 2}, 'Kapsamlı öneri ilgi gördü.'],
  ['Konuya girme', {grup: {ogrenciler: -4}}, 'Öğrenci örgütleri seni eleştirdi.']]),
 C('xe_dis', 'ekonomi', 'Dış Ticaret Açığı', 'Cari açık yeniden büyüyor. Ekonomistler uyarı yapıyor.', function (S) { return S.makro.cari < -3; }, [
  ['İhracat planı sun', {itibar: 2, drift: .05}, 'Planın uzmanlarca olumlu karşılandı.'],
  ['Hükümete yüklen', {drift: .08, birlik: 1}, 'Muhalif cephede destek buldun.'],
  ['Açıklama yapma', {itibar: -1}, 'Ekonomi konusunda ağır kaldığın söylendi.']]),
 C('xe_kayit', 'ekonomi', 'Kayıt Dışı Ekonomi Raporu', 'Yeni bir rapor kayıt dışı ekonominin büyüdüğünü gösterdi.', null, [
  ['Kayıt dışıyla mücadele öner', {itibar: 2, drift: .05, grup: {esnaf: -2}}, 'Tutarlı ama esnaf tedirgin.'],
  ['Vergi affı karşı çık', {itibar: 1, drift: .03}, 'İlkeli bir çizgi izledin.'],
  ['Raporu görmezden gel', {itibar: -1}, 'Gündemin gerisinde kaldın.']]),
 C('xp_yurt', 'secmen', 'Yurt Sorunu', 'Üniversite öğrencileri yurt kapasitesinin yetersizliğini protesto ediyor.', null, [
  ['Öğrencilerle buluş', {grup: {ogrenciler: 7, gencler: 3}, drift: .1, stres: 3}, 'Öğrenciler seninle fotoğraf çektirdi.'],
  ['Yurt yasası öner', {grup: {ogrenciler: 4}, itibar: 2}, 'Somut öneri ilgiyle karşılandı.'],
  ['Hükümeti uyar', {grup: {ogrenciler: 2}, drift: .03}, 'Sesin duyuldu, çözüm yok.']]),
 C('xp_saglik', 'secmen', 'Hastane Randevu Krizi', 'Randevu bekleme süreleri aylara çıktı. Vatandaş şikâyetçi.', null, [
  ['Hastane ziyareti yap', {drift: .1, itibar: 1, stres: 3, grup: {emekliler: 4}}, 'Hastalarla yan yana görüldün.'],
  ['Sağlık reformu öner', {itibar: 2, drift: .04}, 'Kapsamlı çerçeve ilgi gördü.'],
  ['Sağlık Bakanı\'nı eleştir', {drift: .06, birlik: 1}, 'Tartışma büyüdü ama çözüm üretmedin.']]),
 C('xp_egitim', 'secmen', 'Eğitimde Sınav Tartışması', 'Sınav sistemi yine tartışmalı. Veliler ve öğretmenler karışık.', null, [
  ['Veliler için toplantı yap', {grup: {memurlar: 3, muhafazakarlar: 2}, drift: .06}, 'Veliler dinlendiklerini hissetti.'],
  ['Öğretmen sendikasıyla görüş', {grup: {memurlar: 5}, itibar: 1}, 'Öğretmenler memnun.'],
  ['Konuya girme', {drift: -.03}]]),
 C('xp_mahalle', 'secmen', 'Mahalle Muhtarları Buluşması', 'Muhtarlar kentsel dönüşümden şikâyetçi.', null, [
  ['Muhtarlarla toplantı yap', {drift: .08, stres: 2, itibar: 1}, 'Mahalle düzeyinde güven arttı.'],
  ['Dönüşüm yasası eleştir', {drift: .05, grup: {esnaf: 2}}, 'Mahalle sakinleri destek verdi.'],
  ['Toplantıya katılma', {drift: -.04}, 'Muhtarlar alındı.']]),
 C('xp_kadin', 'secmen', 'Kadın Platformu Çağrısı', 'Kadın örgütleri parti içi kota ve şiddetle mücadele için açıklama bekliyor.', null, [
  ['Kota taahhüdü ver', {drift: .1, birlik: -1, itibar: 2}, 'Kadın örgütleri seni takdir etti.', [.2, {birlik: -2}, 'Parti içinde tartışma çıktı.']],
  ['Eylem planı hazırla', {itibar: 2, kasa: -.1}, 'Plan uzmanlarca olumlu bulundu.'],
  ['Genel açıklama yap', {drift: .02}]]),
 C('xp_engelli', 'secmen', 'Engelli Hakları Çağrısı', 'Engelli dernekleri erişilebilirlik konusunda çağrı yaptı.', null, [
  ['Derneği ziyaret et', {itibar: 2, drift: .05, stres: 1}, 'İçten bir ziyaret oldu.'],
  ['Somut taahhüt ver', {itibar: 1, drift: .04, kasa: -.08}, 'Taahhüt kayda alındı.'],
  ['Mesaj göndermekle yetin', {itibar: 0}]]),
 C('xp_afet', 'kriz', 'Orman Yangını', 'Orman yangını yerleşimlere yaklaştı. Köylüler yardım bekliyor.', function (S) { return S.tarih.m >= 6 && S.tarih.m <= 9; }, [
  ['Bölgeye git, yardım topla', {drift: .12, itibar: 2, stres: 4, kasa: -.2}, 'Yardım çağrın karşılık buldu.', [.2, {itibar: -2}, 'Ziyaretin "gösteri" olarak eleştirildi.']],
  ['Hükümetten önlem iste', {drift: .04, itibar: 1}, 'Sesin duyuldu.'],
  ['Hazır bulunma', {itibar: -2, drift: -.06}, 'Yangın sırasında yokluğun yorumlandı.']]),
 C('xp_deprem', 'kriz', 'Orta Şiddette Deprem', 'Orta şiddette bir deprem birkaç ilde hasar yarattı.', null, [
  ['Afet bölgesine git', {drift: .12, itibar: 2, stres: 5, kasa: -.25}, 'Yardım organizasyonu takdir gördü.'],
  ['Bağış kampanyası başlat', {itibar: 3, kasa: -.15, drift: .08}, 'Kampanya geniş katılım gördü.'],
  ['Açıklama yap', {itibar: 0, drift: .01}, 'Sıradan bir açıklama olarak kaldı.']]),
 C('xp_gocmen', 'siyaset', 'Göç Tartışması', 'Göç politikaları yeniden gündemde. Her kesim farklı bir şey söylüyor.', null, [
  ['Dengeli politika sun', {itibar: 1, drift: .03, grup: {milliyetciler: -1}}, 'Çizgin ölçülü bulundu.'],
  ['Sert tutum benimse', {grup: {milliyetciler: 6}, itibar: -1, drift: .06}, 'Tabanın bir kesimi coştu, bir kesimi tedirgin.'],
  ['İnsani çerçeveyi vurgula', {grup: {gencler: 3}, itibar: 1, drift: .03}, 'Kutuplaşma karşısında yumuşak bir mesaj verdin.']]),
 C('xp_guvenlik', 'siyaset', 'Güvenlik Tartışması', 'Bir olay sonrası güvenlik politikaları tartışılıyor.', null, [
  ['Güvenlik reformu öner', {grup: {milliyetciler: 5}, itibar: 1}, 'Milliyetçi kesim ilgiyle dinledi.'],
  ['Özgürlük dengesini vurgula', {grup: {gencler: 3}, itibar: 1}, 'Özgürlükçü kesim memnun.'],
  ['Yorum yapma', {itibar: -1}]]),
 C('xp_din', 'secmen', 'Dinî Bayram Mesajı', 'Bayram öncesi mesaj verip vermeyeceğin soruluyor.', function (S) { return S.tarih.m === 4 || S.tarih.m === 6 || S.tarih.m === 7; }, [
  ['Birleştirici mesaj ver', {grup: {muhafazakarlar: 4}, itibar: 1, drift: .04}, 'Mesajın beğenildi.'],
  ['Bayramı ailenle geçir', {stres: -4, saglik: 2}, 'Dinlenme zamanı.'],
  ['Politik mesaj yay', {drift: .03, itibar: -1}, 'Bazıları fırsatçılık gördü.']]),
 C('xp_spor', 'medya', 'Maç Sonrası Gerginlik', 'Derbi sonrası taraftar gerginliği siyasete taşındı.', null, [
  ['Sakinleştirici açıklama yap', {itibar: 1, grup: {gencler: 2}}, 'Mesajın olgun bulundu.'],
  ['Konuyu sosyal medyada işle', {drift: .06, grup: {gencler: 3}}, 'Gençler ilgi gösterdi.', [.2, {itibar: -2}, 'Paylaşımın kutuplaştırıcı bulundu.']],
  ['Spora karışma', {itibar: 0}]]),
 C('xp_ceza', 'siyaset', 'Af Tartışması', 'Af yasası gündeme geldi. Toplum ikiye bölünmüş durumda.', null, [
  ['Karşı çık', {itibar: 1, drift: .02, grup: {milliyetciler: 3}}, 'Sert çizgin tutarlı görüldü.'],
  ['Koşullu af öner', {itibar: 0, drift: .01}, 'Ortada durman tartışıldı.'],
  ['Konuşmaktan kaçın', {itibar: -2}]]),
 C('xp_belediye', 'siyaset', 'Belediye Başkanı Transferi', 'Bir belediye başkanı partine geçmek istiyor.', function (S) { return S.stat.birlik > 40; }, [
  ['Rozetini kendi elinle tak', {drift: .12, birlik: -2, itibar: 1, org: 4}, 'Transfer gündemi sarstı; yerelde güç kazandın.', [.3, {itibar: -3}, 'Geçmişi gündeme geldi.']],
  ['Şartlı kabul et', {drift: .05, birlik: 0}, 'Ölçülü bir geçiş oldu.'],
  ['Reddet', {birlik: 2, itibar: 1}, 'Parti içi güven arttı.']]),
 C('xp_koalisyon', 'siyaset', 'Küçük Parti Seninle Görüşmek İstiyor', 'Küçük bir parti seçim öncesi iş birliği önerdi.', function (S) { return !oyuncuIttifak(S) && bugunSecimYakin(S); }, [
  ['Görüşmeyi kabul et', {drift: .06, yakin: 2, stres: 2}, 'Görüşmeler olumlu geçti.'],
  ['Şartlarını sun', {yakin: 1, itibar: 1}, 'Sert pazarlık başladı.'],
  ['Reddet', {itibar: 1, birlik: 1}, 'Bağımsızlığını vurguladın.']]),
 C('xp_seviye', 'siyaset', 'Anket Şirketi Sorusu', 'Bir anket şirketi sonuçları sana özel olarak sundu: hata payı konuşuluyor.', function (S) { return S.ay > 5; }, [
  ['Sonuçları paylaş', {itibar: 1, drift: .04}, 'Şeffaf davranışın beğenildi.'],
  ['Sonuçları kendine sakla', {itibar: 0}, 'Özel bilgi senin elinde kaldı.'],
  ['Şirketi eleştir', {itibar: -1, drift: -.03}, 'Anketlere saldırman gündem oldu.']]),
 C('xi_genclik', 'parti', 'Gençlik Kolları Toplantısı', 'Gençlik kolları yönetimi seninle genç adaylar konusunda konuşmak istiyor.', null, [
  ['Genç adaylara öncelik ver', {birlik: -1, drift: .06, grup: {gencler: 5}}, 'Gençler heyecanlı, kıdemliler tedirgin.'],
  ['Kontenjan öner', {birlik: 1, grup: {gencler: 2}}, 'Orta yol bulundu.'],
  ['Kadro kıdemini koru', {birlik: 2, grup: {gencler: -4}}, 'Gençler kendini dışlanmış hissetti.']]),
 C('xi_kadin', 'parti', 'Kadın Kolları Başkanı Çağrısı', 'Kadın kolları başkanı seçim listelerinde yer talep ediyor.', null, [
  ['Üst sıralar sözü ver', {birlik: -1, drift: .05, itibar: 1}, 'Kadın kolları desteği sürdü.'],
  ['Standart süreç uygula', {birlik: 1}, 'Süreç adil görüldü.'],
  ['Konuyu ertele', {birlik: -2}, 'Kadın kolları alındı.']]),
 C('xi_mali', 'parti', 'Mali İşler Uyarısı', '{k}: "Gelir-gider dengesi bozuluyor. Harcamaları kısmamız gerekiyor."', function (S) { return S.stat.kasa < 3e6; }, [
  ['Harcamaları kıs', {kasa: .3, birlik: -1, drift: -.03}, 'Kasa toparlandı; sahada hızın düştü.'],
  ['Bağış kampanyası başlat', {kasa: .5, itibar: 1, stres: 2}, 'Destekçiler katkıda bulundu.'],
  ['Uyarıyı dikkate alma', {kasa: -.2, stres: 3}, 'Sorunu ertelemiş oldun.']]),
 C('xi_il', 'parti', 'İl Başkanı Şikâyeti', 'Bir il başkanı merkezden yeterince destek alamadığını söylüyor.', null, [
  ['İl başkanını ziyaret et', {birlik: 2, drift: .05, stres: 3}, 'İl teşkilatı moral buldu.'],
  ['Kaynak ayır', {kasa: -.2, birlik: 3, org: 5}, 'Teşkilat güçlendi.'],
  ['Telefonla ilgilen', {birlik: 0}, 'Sorun küçüldü ama bitmedi.']]),
 C('xi_aday', 'parti', 'Aday Listesi Gerginliği', 'Aday listeleri hazırlanırken parti içi rekabet kızıştı.', function (S) { return bugunSecimYakin(S); }, [
  ['Şeffaf ön seçim yap', {birlik: 3, itibar: 2, kasa: -.2}, 'Süreç adil görüldü.'],
  ['Listeyi genel merkez belirlesin', {birlik: -3, drift: .02}, 'Merkeziyetçilik eleştirildi.'],
  ['Karma sistem uygula', {birlik: 1, itibar: 1}, 'Orta yol bulundu.']]),
 C('xi_kurultay', 'parti', 'Kurultay Hazırlığı', 'Kurultay yaklaşırken delegeler seninle görüşmek istiyor.', function (S) { return (S.kurultay || []).some(function (k) { var d = k.y * 12 + k.m - (S.tarih.y * 12 + S.tarih.m); return d > 0 && d <= 5; }); }, [
  ['Delegelerle turlar at', {birlik: 4, stres: 4, itibar: 1}, 'Delegelerle ilişkin güçlendi.'],
  ['Konuşma yap', {birlik: 2, itibar: 1}, 'Konuşman iyi karşılandı.'],
  ['Süreci bırak', {birlik: -3}, 'Muhalifler fırsat buldu.']]),
 C('xi_danisman', 'parti', 'Danışman Önerisi', 'Seçim danışmanı, kampanyanı gözden geçirmeyi öneriyor.', function (S) { return S.ay >= 6; }, [
  ['Önerileri uygula', {drift: .08, kasa: -.15, stres: 2}, 'Mesaj çizgin netleşti.'],
  ['Kısmen uygula', {drift: .03}, 'Küçük bir iyileşme oldu.'],
  ['Reddet', {birlik: 0}, 'Kendi çizgini sürdürdün.']]),
 C('xi_sadakat', 'parti', 'Sadakat Yemini Teklifi', 'Bazı kadrolar sana sadakat bildirisi sunmak istiyor.', null, [
  ['Kabul et', {birlik: 3, itibar: -1}, 'Bildiri güç gösterisi oldu ama eleştirildi.'],
  ['Teşekkür et, geç', {birlik: 1}, 'Ölçülü yaklaşım.'],
  ['Reddet, tartışmaya aç', {birlik: -1, itibar: 2}, 'Demokratik tavrın beğenildi.']]),
 C('xi_sendika', 'parti', 'Sendika Delegasyonu', 'Sendika yönetimi partinle ortak çalışma önerdi.', null, [
  ['Ortak çalışma kur', {grup: {isciler: 6}, drift: .06, birlik: -1}, 'İşçi desteği güçlendi.'],
  ['Mesafeli işbirliği öner', {grup: {isciler: 3}}, 'İlişki zayıf ama sürüyor.'],
  ['Reddet', {grup: {isciler: -4}, itibar: 1}, 'Bağımsız görünmeyi tercih ettin.']]),
 C('xm_trol', 'medya', 'Sahte Hesap Operasyonu', 'Adına çalışan sahte hesaplar olduğu iddia ediliyor.', function (S) { return S.hamle && S.hamle.some(function (h) { return h.id === 'trol'; }); }, [
  ['İnkâr et', {itibar: -1, stres: 3}, 'İnkârın ikna etmedi.', [.4, {itibar: -4}, 'Kanıtlar sızdırıldı.']],
  ['İç soruşturma aç', {itibar: 1, stres: 3, birlik: -1}, 'Şeffaflık çabası takdir gördü.'],
  ['Konuyu geçiştir', {itibar: -2}]]),
 C('xm_sizinti', 'medya', 'Özel Konuşma Kaydı', 'Kapalı toplantıda yaptığın bir konuşmanın kaydı basına düştü.', null, [
  ['Bağlam dışı kalındığını söyle', {itibar: -1, stres: 3}, 'Savunman kısmen karşılık buldu.'],
  ['Özür dile', {itibar: -1, birlik: 1, stres: 2}, 'Özrün gündemi kapattı.'],
  ['Sızdıranı bul', {itibar: -2, birlik: -2, stres: 4}, 'Cadı avı bir kriz yarattı.']]),
 C('xm_belgesel', 'medya', 'Belgesel Teklifi', 'Bir platform hakkında belgesel çekmek istiyor.', function (S) { return S.stat.itibar > 45; }, [
  ['Kabul et', {itibar: 3, drift: .08, stres: 3}, 'Belgesel geniş kitleye ulaştı.', [.2, {itibar: -3}, 'Bazı sahneler tartışıldı.']],
  ['Şartlı kabul', {itibar: 1}, 'Denetim şartı belgeselin tonunu değiştirdi.'],
  ['Reddet', {itibar: 0}]]),
 C('xm_podcast', 'medya', 'Podcast Konuğu', 'Popüler bir podcast sana konuk olma teklifi yaptı.', null, [
  ['Kabul et ve samimi ol', {grup: {gencler: 4}, itibar: 2, drift: .08, stres: 2}, 'Genç dinleyici seni yakından tanıdı.', [.15, {itibar: -3}, 'Bir cevabın ters anlaşıldı.']],
  ['Hazırlıklı git', {grup: {gencler: 2}, itibar: 1}, 'Güvenli bir konuşma oldu.'],
  ['Reddet', {grup: {gencler: -2}}]]),
 C('xm_gazeteci', 'medya', 'Gazeteci Baskı Altında', 'Eleştirel bir gazeteci hakkında soruşturma açıldı.', null, [
  ['Açıkça destek ver', {itibar: 2, drift: .05}, 'Basın özgürlüğü vurgun takdir edildi.'],
  ['Dolaylı tepki göster', {itibar: 1}, 'Ölçülü bir mesaj verdin.'],
  ['Yorum yapma', {itibar: -1}]]),
 C('xm_haberkanali', 'medya', 'Haber Kanalı Tartışma Programı', 'Bir kanal seni canlı tartışma programına davet etti.', null, [
  ['Katıl, hazırlıklı ol', {itibar: 2, drift: .09, stres: 4}, 'Performansın dikkat çekti.', [.25, {itibar: -4, drift: -.1}, 'Canlı yayında zorlandın.']],
  ['Temsilci gönder', {birlik: 1}, 'Güvenli bir seçenek oldu.'],
  ['Katılma', {itibar: -1}]]),
 C('xm_fotograf', 'medya', 'Fotoğraf Tartışması', 'Eski bir fotoğrafın gündeme geldi.', null, [
  ['Mizahla karşıla', {itibar: 1, drift: .05}, 'Gündem hızla kapandı.'],
  ['Açıklama yap', {itibar: 0, stres: 2}],
  ['Tepki göster', {itibar: -2, stres: 3}, 'Konuyu büyüttün.']]),
 C('xm_yapayzeka', 'medya', 'Sahte Video Tehlikesi', 'Sahte bir video seni zor durumda bırakacak şekilde dolaşıma girdi.', function (S) { return S.ay >= 10; }, [
  ['Hemen yalanla ve kanıtla', {itibar: 2, stres: 3, kasa: -.1}, 'Kanıtların işe yaradı.'],
  ['Hukuki yola git', {itibar: 1, kasa: -.15}, 'Süreç uzayacak ama mesaj verdin.'],
  ['Tepkisiz kal', {itibar: -3, drift: -.1}, 'Video yayıldı.']]),
 C('xs_vekil', 'siyaset', 'Vekil Ayrılığı Söylentisi', 'Bir milletvekilinin partiden ayrılacağı konuşuluyor.', function (S) { return (S.meclis[S.pid] || 0) > 5; }, [
  ['Birebir görüş', {birlik: 2, stres: 3}, 'Sorun büyümeden çözüldü.', [.2, {birlik: -3, itibar: -1}, 'Vekil yine de ayrıldı.']],
  ['Kamuoyu önünde sahip çık', {birlik: 1, itibar: 1}, 'Destek görüntüsü verildi.'],
  ['Yorum yapma', {birlik: -2}]]),
 C('xs_ucuncu', 'siyaset', 'Üçüncü Yol Çağrısı', 'Bir grup entelektüel iki kutup dışında yeni bir yol çağrısı yaptı.', null, [
  ['Çağrıyı destekle', {itibar: 2, drift: .04}, 'Merkez seçmen ilgi gösterdi.'],
  ['Mesafe koy', {itibar: 0}, 'Kendi çizgini sürdürdün.'],
  ['Eleştir', {itibar: -1}]]),
 C('xs_referandum', 'siyaset', 'Referandum Önerisi', 'Bir parti, tartışmalı bir konuda referandum önerisi yaptı.', null, [
  ['Referandumu destekle', {drift: .04, itibar: 1}, 'Doğrudan demokrasi vurgusu ses getirdi.'],
  ['Meclis yetkisini savun', {itibar: 1, birlik: 1}, 'Kurumsal çizgin güçlendi.'],
  ['Net yanıt verme', {itibar: -1}]]),
 C('xs_anayasa', 'siyaset', 'Anayasa Değişikliği Tartışması', 'Meclis\'te anayasa değişikliği önerisi gündeme geldi.', null, [
  ['Kararlı muhalefet et', {itibar: 1, drift: .05, birlik: 2}, 'Muhalif cephede liderlik gösterdin.'],
  ['Müzakereye açık ol', {itibar: 1, drift: .03}, 'Uzlaşmacı tavrın beğenildi.'],
  ['Taraf olma', {itibar: -2}]]),
 C('xs_yerel', 'siyaset', 'Yerel Seçim Öncesi Aday Tartışması', 'Yerel seçim için büyükşehir adayı konusunda kamuoyu beklenti içinde.', function (S) { return S.takvim.some(function (t) { var d = t.y * 12 + t.m - (S.tarih.y * 12 + S.tarih.m); return t.tip === 'yerel' && d > 0 && d < 10; }); }, [
  ['Güçlü bir isim açıkla', {drift: .1, birlik: -1, kasa: -.1}, 'Ad büyük ilgi gördü.', [.2, {birlik: -2}, 'Parti içinde tartışma çıktı.']],
  ['Anketle belirle', {itibar: 2, birlik: 1}, 'Şeffaf süreç beğenildi.'],
  ['Bekle', {drift: -.03}]]),
 C('xg_darbe', 'kriz', 'Yargı Kararı Tartışması', 'Yüksek yargıdan çıkan bir karar siyasi gerilim yarattı.', gv, [
  ['Kararı uygula', {itibar: 1, birlik: 1}, 'Hukuk devleti vurgusu yaptın.'],
  ['Yargıya itiraz et', {itibar: -2, drift: .04, birlik: 2}, 'Taraftarlar memnun, kurumlar tedirgin.'],
  ['Sessiz kal', {itibar: -1}]], {}),
 C('xg_butce', 'ekonomi', 'Bütçe Görüşmeleri', 'Hükümet bütçe görüşmeleri yaklaşıyor. Bakanlıklar ek kaynak istiyor.', gv, [
  ['Sıkı bütçe uygula', {kasa: .2, birlik: -2, itibar: 1}, 'Mali disiplin güven verdi.'],
  ['Kaynakları dengeli dağıt', {birlik: 1}, 'Bakanlıklar idare etti.'],
  ['Popüler harcamalara yönel', {drift: .09, kasa: -.4, itibar: -1}, 'Kısa vadeli memnuniyet yaratıldı.']]),
 C('xg_yolsuz', 'kriz', 'Bakan Hakkında İddia', 'Hükümet üyelerinden biri hakkında kurgusal bir iddia gündeme geldi.', gv, [
  ['Bakanı görevden al', {itibar: 3, birlik: -2}, 'Hızlı karar güven verdi.'],
  ['Soruşturmayı bekle', {itibar: -1, stres: 3}, 'Bekleyiş eleştirildi.'],
  ['Bakanı savun', {itibar: -3, birlik: 2}, 'Basın seni hedef aldı.']]),
 C('xg_kabine', 'parti', 'Kabine Toplantısı Çatışması', 'İki bakan arasındaki görüş ayrılığı kabine toplantısını gerdi.', gv, [
  ['Arabuluculuk yap', {birlik: 3, stres: 3}, 'Çatışma sönümlendi.'],
  ['Bir tarafı tut', {birlik: -2, itibar: 1}, 'Taraf tutmak seni hedef yaptı.'],
  ['Görmezden gel', {birlik: -3}]]),
 C('xg_halk', 'secmen', 'Halk Günü', 'Hükümet olarak halk günü düzenleme fırsatın var.', gv, [
  ['Vatandaşla birebir ilgilen', {drift: .12, itibar: 2, stres: 4}, 'Dinlendiğini hisseden vatandaş memnun.'],
  ['Kısa tut', {drift: .04}, 'Sembolik bir etkinlik oldu.'],
  ['Başkasını gönder', {drift: -.03}]]),
 C('xg_diplomasi', 'siyaset', 'Dış Politika Sınavı', 'Komşu ülkeyle gerginlik tırmandı. Dışişleri senden net bir çizgi istiyor.', gv, [
  ['Sert mesaj ver', {grup: {milliyetciler: 5}, itibar: -1, drift: .06}, 'Milliyetçiler memnun, diplomatlar tedirgin.'],
  ['Diplomatik yol seç', {itibar: 2, birlik: 1}, 'Olgun bir çizgi izledin.'],
  ['Müdahale etme', {itibar: -1}]]),
 C('xg_reform', 'siyaset', 'Reform Paketi', 'Danışmanların bir reform paketi öneriyor. Kaçınılmaz olarak bir kesim kızacak.', gv, [
  ['Paketi uygula', {itibar: 2, drift: .04, birlik: -2, stres: 4}, 'Cesur bir adım oldu.'],
  ['Parçala, aşamalandır', {itibar: 1, birlik: 1}, 'Daha az tepki çekti.'],
  ['Ertele', {drift: -.04}]]),
 C('xg_afet', 'kriz', 'Hükümet Olarak Afet Yönetimi', 'Büyük bir afet sonrası krizi yönetmen gerekiyor.', gv, [
  ['Tam seferberlik ilan et', {itibar: 3, kasa: -.5, stres: 5, drift: .1}, 'Hızlı müdahale güven verdi.'],
  ['Yerel yönetimlerle koordine ol', {itibar: 1, kasa: -.25}, 'Ölçülü bir müdahale yaptın.'],
  ['Yavaş davran', {itibar: -4, drift: -.15}, 'Gecikme tepki çekti.']]),
 C('xm_oy', 'siyaset', 'Muhalefet Liderleri Buluşması', 'Muhalefet liderleri ortak bir toplantı önerdi.', mu, [
  ['Toplantıya katıl', {yakin: 3, drift: .05, itibar: 1}, 'Muhalefet cephesinde bir adım ilerledin.'],
  ['Temsilci gönder', {yakin: 1}, 'Temsili katılım yapıldı.'],
  ['Katılma', {yakin: -2, itibar: 0}, 'Kendi yolundan gideceğini gösterdin.']]),
 C('xm_gensoru', 'siyaset', 'Gensoru Fırsatı', 'Hükümet bir bakanını koruyamadı. Gensoru önergesi hazırlanabilir.', mu, [
  ['Gensoru önergesi ver', {itibar: 2, drift: .08, stres: 3, birlik: 1}, 'Hükümet baskı altına girdi.'],
  ['Soru önergesiyle yetin', {itibar: 1}, 'Daha az görünür bir adım oldu.'],
  ['Fırsatı kaçır', {itibar: -1}]])
];
var KARTLAR_ZE = [
 C('xz_isten2', 'ekonomi', 'Fabrika İşçileri Yeniden Seni Arıyor', 'Fabrikadaki işçiler kararın ardından ücretlerini alamadıklarını söylüyor. Önceki ziyaretin hatırlanıyor.', null, [
  ['Hukuki destek sağla', {grup: {isciler: 5}, kasa: -.2, itibar: 2}, 'İşçilerin hakları takip ediliyor.'],
  ['Basın toplantısı yap', {grup: {isciler: 3}, drift: .06, stres: 2}, 'Konu ülke gündemine taşındı.'],
  ['İlgilenme', {grup: {isciler: -6}, itibar: -2}, 'Söz verip arkanı döndüğün söylendi.']], {z: 1}),
 C('xz_ciftci2', 'ekonomi', 'Çiftçiler Sonuç Bekliyor', 'Eylem sonrası çiftçiler verilen sözlerin tutulmasını bekliyor.', null, [
  ['Soruyu Meclis gündemine taşı', {grup: {ciftciler: 5}, itibar: 2}, 'Çiftçiler seni takip ediyor.'],
  ['Yeni bir buluşma yap', {grup: {ciftciler: 3}, stres: 3, drift: .05}, 'Moral tazelendi.'],
  ['Konuyu kapat', {grup: {ciftciler: -5}, itibar: -1}, 'Hayal kırıklığı yaşandı.']], {z: 1}),
 C('xz_afet2', 'kriz', 'Afet Bölgesinde Yeniden Yapılanma', 'Depremden aylar sonra bölgedeki yeniden yapılanma yavaş ilerliyor.', null, [
  ['Bölgeyi tekrar ziyaret et', {drift: .1, itibar: 2, stres: 3}, 'Bölge halkı unutulmadığını gördü.'],
  ['Takip komisyonu kur', {itibar: 2, kasa: -.1}, 'Hesap verebilirlik vurgusu yaptın.'],
  ['Gündemden çıkar', {itibar: -2, drift: -.05}, 'Bölge halkı tepki gösterdi.']], {z: 1}),
 C('xz_belediye2', 'siyaset', 'Yeni Belediye Başkanından İlk Sorun', 'Partine geçen belediye başkanı ilk ay içinde yerelde bir tartışmaya karıştı.', null, [
  ['Savun', {birlik: 1, itibar: -1}, 'Sahip çıktığın görüldü.'],
  ['Uyar, işe devam et', {birlik: 2, itibar: 1}, 'Dengeli davrandın.'],
  ['Mesafeni koy', {birlik: -2, itibar: 1}, 'Transferi eleştirenler haklı çıktı.']], {z: 1}),
 C('xz_sizinti2', 'medya', 'Sızıntının İkinci Dalgası', 'Daha önce sızan kayıtların devamı olduğu iddia edilen yeni görüntüler dolaşıma girdi.', null, [
  ['Tüm kayıtları yayımla', {itibar: 1, stres: 4}, 'Şeffaflık hamlesi tartışmayı bitirdi.'],
  ['Hukuki işlem başlat', {itibar: 0, kasa: -.1}, 'Süreç uzayacak.'],
  ['Cevap verme', {itibar: -3}, 'Sessizlik suçlama olarak okundu.']], {z: 1}),
 C('xz_vekil2', 'parti', 'Ayrılan Vekil Konuşuyor', 'Partiden ayrılan milletvekili basına parti içi tartışmaları anlattı.', null, [
  ['Cevap ver', {itibar: 0, stres: 3}, 'Tartışma büyüdü.'],
  ['Parti sözcüsü yanıtlasın', {birlik: 1}, 'Gündem hızla kapandı.'],
  ['Sessiz kal', {birlik: -1, itibar: -1}]], {z: 1}),
 C('xz_ihale2', 'ekonomi', 'İhale Soruşturması Ortaya Çıktı', 'Savcılık ihaleyle ilgili soruşturma başlattı.', null, [
  ['Her türlü işbirliğini sun', {itibar: 2}, 'Dürüst tutumun puan getirdi.'],
  ['Siyasi operasyon de', {itibar: -2, birlik: 2}, 'Tabanın coştu, kamuoyu ikna olmadı.'],
  ['Yorum yapma', {itibar: -1}]], {z: 1}),
 C('xz_anayasa2', 'siyaset', 'Anayasa Teklifi Meclis\'te', 'Tartıştığınız anayasa değişikliği resmî teklif olarak sunuldu.', null, [
  ['Oylamada karşı oy ver', {itibar: 1, birlik: 2}, 'Net bir tavır koydun.'],
  ['Değişiklik önergesi ver', {itibar: 2}, 'Yapıcı bir tutum sergiledin.'],
  ['Oylamaya katılma', {itibar: -2, birlik: -1}]], {z: 1}),
 C('xz_yerel2', 'siyaset', 'Aday Adayı Küstü', 'Büyükşehir adaylığı için ismin açıklanmasının ardından rakip aday adayı tepki gösterdi.', null, [
  ['Bire bir görüş', {birlik: 3, stres: 3}, 'Kırgınlık giderildi.'],
  ['Ona üst bir görev ver', {birlik: 2, kasa: -.05}, 'Çözüm bulundu.'],
  ['Görmezden gel', {birlik: -3}, 'Kırgınlık büyüdü.']], {z: 1}),
 C('xz_butce2', 'ekonomi', 'Bütçe Sonrası Hesap', 'Bütçe kararlarının sonuçları sahada görülmeye başladı.', gv, [
  ['Sonuçları açıkla', {itibar: 1, drift: .03}, 'Şeffaf davrandın.'],
  ['Eleştirilere cevap ver', {itibar: 0}, 'Tartışma sürdü.'],
  ['Gündemden kaç', {itibar: -2}]], {z: 1})
];
KARTLAR_ZE.forEach(function (c) { KARTLAR_Z.push(c); });
ZINCIR.xe_isten = [{id: 'xz_isten2', p: .55, min: 3, max: 6, sec: [0, 1]}];
ZINCIR.xe_ciftci = [{id: 'xz_ciftci2', p: .5, min: 4, max: 7, sec: [0]}];
ZINCIR.xp_deprem = [{id: 'xz_afet2', p: .6, min: 6, max: 10}];

/* ---------- Kriz havuzu genişlemesi: seyrek, dengeli, her birinde bedelli seçenekler ---------- */
KARTLAR_E = KARTLAR_E.concat([
 C('xk_sel', 'kriz', 'Sel Felaketi', 'Şiddetli yağış birkaç ilde sele yol açtı. Yardım bekleyen aileler var.', function (S) { return S.tarih.m >= 10 || S.tarih.m <= 3; }, [
  ['Bölgeye git, koordinasyona katıl', {drift: .1, itibar: 2, stres: 4, kasa: -.2}, 'Sahadaki varlığın karşılık buldu.', [.25, {itibar: -2}, 'Ziyaretin "gösteri" diye eleştirildi.']],
  ['Teşkilatı yardıma yönlendir', {itibar: 2, birlik: 2, kasa: -.15, stres: 2}, 'Teşkilatın hızlı organize olması takdir gördü.'],
  ['Resmi açıklamayla yetin', {itibar: -1, drift: -.03}, 'Mesafeli kaldığın söylendi.']]),
 C('xk_kur', 'kriz', 'Ani Kur Dalgalanması', 'Dolar bir günde sert yükseldi. Piyasalar tedirgin, esnaf fiyat etiketi değiştiriyor.', function (S) { return S.makro.enf > 30; }, [
  ['Ekonomi masası kur ve açıkla', {itibar: 1, stres: 3, drift: .03}, 'Açıklaman sakinleştirici bulundu.'],
  ['Hükümete sert yüklen', {drift: .06, itibar: 1, stres: 2, birlik: -1}, 'Tepkin gündemi belirledi.', [.3, {itibar: -2}, 'Sert dilin "fırsatçılık" diye yorumlandı.']],
  ['Sessiz kal', {drift: -.05, itibar: -1}, 'Sessizliğin boşluk olarak okundu.']]),
 C('xk_sizinti', 'kriz', 'Sızdırılan İç Yazışma', 'Parti yönetiminin iç yazışmasından bir bölüm basına sızdı.', function (S) { return S.stat.birlik < 78; }, [
  ['Soruşturma aç, açıkla', {birlik: 2, stres: 3, itibar: 1}, 'Şeffaf davranman parti içinde saygı gördü.'],
  ['Konuyu küçült', {stres: 1, itibar: -1}, 'Haber hızla gündemden düştü.', [.3, {birlik: -3, itibar: -2}, 'Yeni sızıntılar küçültmeni boşa çıkardı.']],
  ['Karşı saldırıya geç', {drift: .04, birlik: -2, stres: 3}, 'Gündem değişti ama parti içi gerildi.']]),
 C('xk_yerel', 'kriz', 'Yerel Başkanlardan Toplu Tepki', 'Birkaç il başkanı ortak bir açıklamayla merkez yönetimini eleştirdi.', function (S) { return S.stat.birlik < 70; }, [
  ['Toplantıya çağır, dinle', {birlik: 4, stres: 3, kasa: -.1}, 'Yüz yüze toplantı gerilimi azalttı.'],
  ['Taleplerinden birini kabul et', {birlik: 3, itibar: -1, drift: -.02}, 'Tavizin tepkiyi yatıştırdı.'],
  ['Disiplin sürecini hatırlat', {birlik: -3, stres: 2, itibar: 1}, 'Sert tavır tepkileri büyüttü.']]),
 C('xk_gida', 'kriz', 'Gıda Fiyatları Gündemde', 'Temel gıda fiyatlarındaki artış mutfakları vurdu. Pazar yerleri sessiz.', function (S) { return S.makro.enf > 35; }, [
  ['Pazar turu yap, öneri sun', {drift: .08, itibar: 2, stres: 3, kasa: -.1}, 'Sahadaki duruşun karşılık buldu.', [.25, {itibar: -2}, 'Turun planlı bir gösteri olarak yorumlandı.']],
  ['Ekonomi paketi açıkla', {drift: .05, itibar: 1, stres: 2}, 'Önerilerin tartışıldı.'],
  ['Konuyu hükümete bırak', {drift: -.03, itibar: -1}, 'İlgisiz görüldüğün yorumları geldi.']]),
 C('xk_enerji', 'kriz', 'Elektrik Kesintileri', 'Sıcak hava dalgasında bazı illerde saatlerce elektrik kesildi.', function (S) { return S.tarih.m >= 6 && S.tarih.m <= 9; }, [
  ['Bölge ziyareti ve açıklama', {drift: .07, itibar: 1, stres: 3}, 'Yurttaşların sesi olarak görüldün.'],
  ['Meclis\'e soru önergesi ver', {itibar: 1, drift: .03}, 'Önerge gündeme taşındı.'],
  ['Hiçbir adım atma', {drift: -.04, itibar: -1}, 'Gündemi rakiplere bıraktın.']]),
 C('xk_dis', 'kriz', 'Sınır Ötesi Gerilim', 'Sınır bölgesindeki gelişmeler yurt içinde gerilim yarattı. Herkes bir tutum bekliyor.', null, [
  ['Ulusal birlik çağrısı yap', {itibar: 2, stres: 2, drift: .03}, 'Ölçülü çağrın ortak zeminde karşılık buldu.'],
  ['Hükümetten bilgi iste', {itibar: 1, stres: 2}, 'Sorumlu tutumun not edildi.'],
  ['Sert açıklama yap', {drift: .05, itibar: -1, stres: 3, birlik: -1}, 'Açıklaman ikiye bölünmüş tepki aldı.']]),
 C('xk_siber', 'kriz', 'Veri Sızıntısı İddiası', 'Parti üyelik veritabanının bir bölümünün ele geçirildiği iddia ediliyor.', function (S) { return S.stat.uye > 80000; }, [
  ['Üyelere açık bilgilendirme yap', {itibar: 1, stres: 4, kasa: -.15, birlik: 1}, 'Açık davranman güven verdi.'],
  ['Teknik ekibi sorumlu tut, sessiz kal', {stres: 2, itibar: -1}, 'Gelişmeler takip edildi.', [.3, {itibar: -3, birlik: -2}, 'Konu genişleyince sessizliğin eleştirildi.']],
  ['İddiayı yalanla', {drift: .01, itibar: -1, stres: 2}, 'Yalanlama kısmen inandırıcı bulundu.', [.35, {itibar: -3}, 'Yalanlama sonradan çürütüldü.']]]),
 C('xk_grev', 'kriz', 'Grev Çağrısı', 'Bir işçi sendikası sektör genelinde grev çağrısı yaptı. Gözler sana çevrildi.', function (S) { return S.makro.enf > 38; }, [
  ['Çağrıya destek ver', {drift: .06, itibar: 1, birlik: -2, stres: 3}, 'İşçi kesiminde olumlu karşılandın.'],
  ['Arabuluculuk teklif et', {itibar: 2, stres: 3, drift: .03}, 'Uzlaşmacı tutum takdir gördü.'],
  ['Mesafeli dur', {itibar: -1, drift: -.03}, 'Taraf olmaman eleştirildi.']]),
 C('xk_saglik', 'kriz', 'Hastanelerde Yoğunluk', 'Hastanelerde randevu bekleme süreleri uzadı, vatandaşlar şikâyetçi.', null, [
  ['Sağlık çalışanlarıyla buluş', {itibar: 2, stres: 3, drift: .05}, 'Dinleme turun olumlu karşılandı.'],
  ['Kapsamlı sağlık önerisi sun', {itibar: 1, kasa: -.1, drift: .04}, 'Önerin tartışma yarattı.'],
  ['Görmezden gel', {drift: -.03}, 'Gündemi rakiplere bıraktın.']]),
 C('xk_ulasim', 'kriz', 'Büyük Ulaşım Kazası', 'Yoğun bir yolda meydana gelen kazada yaralılar var. Kamuoyu üzgün.', null, [
  ['Başsağlığı ve ziyaret', {itibar: 1, stres: 3}, 'Duyarlı davranışın not edildi.'],
  ['Yol güvenliği önerisi sun', {itibar: 1, drift: .03, stres: 2}, 'Öneri konuşuldu.'],
  ['Hemen siyasi eleştiriye geç', {drift: .02, itibar: -2, stres: 2}, 'Zamanlaman tepki çekti.']]),
 C('xk_kampus', 'kriz', 'Kampüslerde Gerginlik', 'Bir üniversitede öğrenci eylemleri gerginleşti.', function (S) { return S.tarih.m >= 10 || S.tarih.m <= 5; }, [
  ['Öğrenci temsilcileriyle görüş', {itibar: 2, drift: .05, stres: 3}, 'Gençler arasında karşılık buldu.'],
  ['Her iki tarafa itidal çağrısı', {itibar: 1, stres: 2}, 'Dengeli bir tutum olarak yorumlandı.'],
  ['Sert dille yaklaş', {drift: .03, itibar: -2, stres: 3, birlik: -1}, 'Tutumun gençler arasında tepki gördü.']]),
 C('xk_bakan', 'kriz', 'Bakan İstifa Krizi', 'Kabinede bir bakan istifa etti, gerekçeler tartışılıyor.', mu, [
  ['Hükümete eleştiriyle yüklen', {drift: .07, itibar: 1, stres: 3}, 'Eleştirilerin gündem oluşturdu.'],
  ['Sorumlu ve ölçülü kal', {itibar: 2, stres: 2}, 'Ölçülü tutum saygı gördü.'],
  ['Erken seçim çağrısı yap', {drift: .05, stres: 3, birlik: 1}, 'Çağrın gündemi değiştirdi.', [.3, {itibar: -2}, 'Çağrın "fırsatçılık" diye karşılandı.']]]),
 C('xk_butce', 'kriz', 'Bütçe Açığı Alarmı', 'Rakamlar bütçe açığının beklentiden büyük olduğunu gösteriyor.', gv, [
  ['Tasarruf tedbirleri açıkla', {itibar: -1, stres: 3, drift: -.03, kasa: .1}, 'Kararlı duruş piyasaları rahatlattı.'],
  ['Gelir artırıcı paketi sun', {itibar: -2, stres: 3, drift: -.04}, 'Paketin tepki çekti, ama açık kapanıyor.'],
  ['Konuyu geçiştir', {stres: 1, itibar: -2}, 'Sorun erteleniyor gibi göründü.', [.4, {drift: -.05}, 'Ertelenen sorun büyüdü.']]]),
 C('xk_sahte', 'kriz', 'Sahte Haber Kampanyası', 'Sosyal medyada seni hedef alan uydurma bir haber hızla yayılıyor.', null, [
  ['Belgelerle yalanla', {itibar: 2, stres: 3, kasa: -.05}, 'Yalanlama haberi yatıştırdı.'],
  ['Yasal yola başvur', {itibar: 1, stres: 3, kasa: -.1}, 'Hukuki adım caydırıcı oldu.'],
  ['Cevap verme', {itibar: -2, stres: 1}, 'Sessizlik haberin yayılmasına izin verdi.', [.3, {itibar: -2}, 'Haber ana akım yayına girdi.']]]),
 C('xk_secimguv', 'kriz', 'Sandık Güvenliği Tartışması', 'Seçim öncesi sandık güvenliği konusunda iddialar gündeme geldi.', function (S) { return bugunSecimYakin2(S, 8); }, [
  ['Teşkilatla gözlemci ağı kur', {itibar: 1, kasa: -.2, birlik: 2, stres: 3}, 'Gözlemci ağı güven verdi.'],
  ['Kurumlara resmi başvuru yap', {itibar: 1, stres: 2}, 'Resmi yol itibarını korudu.'],
  ['Konuyu büyütme', {stres: -1, itibar: -1}, 'Temkinli tutumun sessizlik sayıldı.']])
]);
ZINCIR.xp_belediye = [{id: 'xz_belediye2', p: .55, min: 2, max: 5, sec: [0, 1]}];
ZINCIR.xm_sizinti = [{id: 'xz_sizinti2', p: .4, min: 3, max: 6, sec: [0, 1]}];
ZINCIR.xs_vekil = [{id: 'xz_vekil2', p: .5, min: 2, max: 4, sec: [2]}];
ZINCIR.xe_ihale = [{id: 'xz_ihale2', p: .4, min: 3, max: 6, sec: [1, 2]}];
ZINCIR.xs_anayasa = [{id: 'xz_anayasa2', p: .45, min: 4, max: 8}];
ZINCIR.xs_yerel = [{id: 'xz_yerel2', p: .5, min: 2, max: 4, sec: [0]}];
ZINCIR.xg_butce = [{id: 'xz_butce2', p: .5, min: 4, max: 7}];

/* ---------- Aşama M: Meclis — komisyonlar, yasa teklifleri, oylama, güvenoyu, gensoru ---------- */
YASA.konut = {ad: 'Kira ve Konut Yasası', metin: 'Kira artışlarını sınırlayan ve konut üretimini destekleyen bir teklif hazırlanabilir.', gecer: {grup: {gencler: 5, memurlar: 3}, drift: .06, itibar: 1, stres: 2}, red: {grup: {gencler: -2}, stres: 2}};
YASA.saglik = {ad: 'Sağlık Reformu', metin: 'Randevu sürelerini kısaltan ve hastane kapasitesini artıran bir reform teklifi.', gecer: {grup: {emekliler: 4, memurlar: 2}, itibar: 2, drift: .05, stres: 2, kasa: -.2}, red: {itibar: -1, stres: 2}};
YASA.medya = {ad: 'Medya Düzenlemesi', metin: 'Dijital yayınları ve yayın izinlerini düzenleyen tartışmalı bir teklif.', gecer: {itibar: -2, drift: .03, stres: 2}, red: {itibar: 1}};
YASA.yerel = {ad: 'Yerel Yönetimler Reformu', metin: 'Belediyelerin yetkilerini ve kaynaklarını yeniden düzenleyen teklif.', gecer: {drift: .04, itibar: 1, birlik: 1}, red: {birlik: -1}};
YASA.kadin = {ad: 'Kadın Hakları Paketi', metin: 'Şiddetle mücadele ve eşit temsil için kapsamlı bir paket.', gecer: {grup: {gencler: 3, ogrenciler: 3, muhafazakarlar: -2}, itibar: 2, drift: .04}, red: {itibar: -1}};
YASA.enerji = {ad: 'Enerji Yatırım Yasası', metin: 'Yenilenebilir enerji yatırımlarını teşvik eden bir teklif.', gecer: {drift: .04, kasa: .2}, red: {itibar: -1}, eko: {yatirim: 5}};
YASA.af = {ad: 'Ceza İndirimi Yasası', metin: 'Belirli suçlarda cezaları azaltan, toplumda bölünme yaratan bir teklif.', gecer: {grup: {milliyetciler: -3, muhafazakarlar: -2}, itibar: -2, drift: .02}, red: {itibar: 1}};
YASA.guvenlik = {ad: 'Güvenlik Paketi', metin: 'Kolluk yetkilerini genişleten bir güvenlik paketi.', gecer: {grup: {milliyetciler: 5, muhafazakarlar: 2, gencler: -3}, drift: .04}, red: {itibar: -1}};
var YASA_EK = {
  asgari: {alan: 'ekonomi', hz: {muh: 0, ref: .3, sol: .7}, halk: {isciler: 8, emekliler: 6, esnaf: -3}, sure: 1},
  egitim: {alan: 'egitim', hz: {muh: -.2, ref: .5, sol: .2}, halk: {ogrenciler: 5, gencler: 4, memurlar: 2}, sure: 2},
  vergi: {alan: 'butce', hz: {muh: -.1, ref: .2, sol: .2}, halk: {esnaf: -6, memurlar: -3, isciler: -2}, sure: 1},
  kemer: {alan: 'butce', hz: {muh: .3, ref: .4, sol: -.6}, halk: {memurlar: -6, emekliler: -5, isciler: -3}, sure: 1},
  tesvik: {alan: 'ekonomi', hz: {muh: .3, ref: .5, sol: -.2}, halk: {esnaf: 5, isciler: 2}, sure: 1},
  konut: {alan: 'ekonomi', hz: {muh: 0, ref: -.2, sol: .5}, halk: {gencler: 7, memurlar: 4, esnaf: -2}, sure: 2},
  saglik: {alan: 'saglik', hz: {muh: .1, ref: .3, sol: .3}, halk: {emekliler: 6, memurlar: 3, gencler: 2}, sure: 2},
  medya: {alan: 'adalet', hz: {muh: .4, ref: -.6, sol: -.4}, halk: {gencler: -5, ogrenciler: -4}, sure: 2},
  yerel: {alan: 'ic', hz: {muh: 0, ref: .4, sol: .1}, halk: {esnaf: 2}, sure: 2},
  kadin: {alan: 'adalet', hz: {muh: -.5, ref: .6, sol: .6}, halk: {gencler: 4, ogrenciler: 4, muhafazakarlar: -3}, sure: 2},
  enerji: {alan: 'ekonomi', hz: {muh: .2, ref: .4, sol: -.2}, halk: {esnaf: 3, isciler: 2}, sure: 1},
  af: {alan: 'adalet', hz: {muh: -.2, ref: .1, sol: .3}, halk: {milliyetciler: -6, muhafazakarlar: -4, gencler: 1}, sure: 2},
  guvenlik: {alan: 'ic', hz: {muh: .5, ref: -.2, sol: -.5}, halk: {milliyetciler: 6, muhafazakarlar: 3, gencler: -4}, sure: 1}
};
Object.keys(YASA_EK).forEach(function (k) { for (var q in YASA_EK[k]) YASA[k][q] = YASA_EK[k][q]; });
var KOMISYON = {butce: 'Plan ve Bütçe', adalet: 'Adalet', ic: 'İçişleri', ekonomi: 'Sanayi, Ticaret ve Enerji', saglik: 'Sağlık, Aile ve Çalışma', egitim: 'Milli Eğitim'};
var KOM_SIRA = ['butce', 'adalet', 'ic', 'ekonomi', 'saglik', 'egitim'];
var KOM_BAKAN = {butce: 'maliye', adalet: 'ic', ic: 'ic', ekonomi: 'maliye', saglik: 'saglik', egitim: 'egitim'};
function mcInit(S) { if (!S.mc) S.mc = {teklif: [], gecmis: [], guvenSon: -99, gensoru: {}, sayac: {kabul: 0, red: 0}}; return S.mc; }
function oppTemsilVar(S) { return !govMu(S, S.pid) && (S.meclis[S.pid] || 0) > 0; }
function komisyonDagilim(S) {
  var ids = PARTILER.filter(function (p) { return (S.meclis[p.id] || 0) > 0; }).map(function (p) { return p.id; }); if (ids.indexOf(S.pid) < 0 && (S.meclis[S.pid] || 0) > 0) ids.push(S.pid);
  ids.sort(function (a, b) { return (S.meclis[b] || 0) - (S.meclis[a] || 0); });
  var won = dhondt(ids.map(function (id) { return S.meclis[id] || 0; }), KOM_SIRA.length), out = {}, k = 0;
  ids.forEach(function (id, i) { for (var c = 0; c < won[i]; c++) if (k < KOM_SIRA.length) out[KOM_SIRA[k++]] = id; });
  KOM_SIRA.forEach(function (kk) { if (!out[kk]) out[kk] = ids[0] || S.gov[0]; });
  return out;
}
function bakanPerf(S, key) {
  if (S.bakanlar && govMu(S, S.pid) && S.bakanlar[key]) return S.bakanlar[key].perf;
  var M = S.makro, v = {maliye: 72 - M.enf * 0.7, ic: 52 + (M.memn - 40) * 0.2, dis: 55, saglik: 52 + (M.memn - 40) * 0.4, egitim: 52 + (M.memn - 40) * 0.2, tarim: 50 + M.buyume * 2, calisma: 75 - M.issiz * 2.5}[key];
  return clamp(Math.round(v), 10, 90);
}
function halkDestek(S, y) {
  var t = 0, n = 0; Object.keys(y.halk || {}).forEach(function (g) { t += y.halk[g]; n++; });
  var h = 0.5 + (n ? t / (n * 16) : 0);
  if (y.alan === 'butce' && S.makro.enf > 40) h -= 0.05;
  h += (S.yayin * 0.015 + kurmayEtki(S, 'medya') * 0.03) * (govMu(S, S.pid) ? 1 : 0.5);
  return clamp(h, 0.05, 0.95);
}
function yasaMetriks(S, id, muh) {
  var y = YASA[id], kom = komisyonDagilim(S), chair = kom[y.alan], gov = govMu(S, S.pid), h = halkDestek(S, y);
  var chairGov = govMu(S, chair), rk = S.rk && S.rk[chair], bp = bakanPerf(S, KOM_BAKAN[y.alan]);
  var p = (muh ? 0.1 : 0.66) + (chairGov ? 0.14 : -0.12 * (rk ? 0.5 + rk.agresif : 1)) + (gov ? (bp - 50) / 300 : 0) + (gov ? (grupOrtSad(S) - 55) / 300 : 0) + (h - 0.5) * 0.3 + (chair === S.pid ? 0.08 : 0) + (ozVar(S, 'yasa') ? 0.04 : 0);
  return {kom: y.alan, baskan: chair, baskanGov: chairGov, bakanPerf: bp, halk: h, komOlasilik: clamp(p, 0.05, 0.95)};
}
function oylamaHesap(S, id, muh, kapsam) {
  asama2Init(S); var y = YASA[id], h = halkDestek(S, y), gov = govMu(S, S.pid), T = 600, sad = [], hiz = [];
  var govSeats = 0, forV = 0, defect = [], oppSeats = 0;
  S.gov.forEach(function (pid) { govSeats += S.meclis[pid] || 0; });
  PARTILER.forEach(function (p) { if (!govMu(S, p.id)) oppSeats += S.meclis[p.id] || 0; }); if (!govMu(S, S.pid) && !PARTILER.some(function (p) { return p.id === S.pid; })) oppSeats += S.meclis[S.pid] || 0;
  if (!gov) {
    // muhalefet teklifi: iktidar bloğu çoğunlukla karşı oy verir
    var cross = Math.max(0, h - 0.55) * 0.35, op = (S.meclis[S.pid] || 0), digOpp = Math.max(0, oppSeats - op);
    forV = op * 0.97 + digOpp * 0.8 + govSeats * cross; if (cross > 0.01) defect.push({ad: 'İktidar bloğu', n: Math.round(govSeats * cross), neden: 'Halk desteği yüksek olduğu için çapraz oy'});
  } else {
    var pSeats = S.meclis[S.pid] || 0, tot = 0; S.hzb.forEach(function (g) { tot += g.guc; });
    S.hzb.forEach(function (g) {
      var lean = (y.hz && y.hz[g.id]) || 0, f = clamp((50 - g.sad) / 100 * 0.8 + Math.max(0, -lean) * 0.35 * (1 - g.sad / 130), 0, 0.6), n = Math.round(pSeats * g.guc / tot * f);
      if (n > 0) defect.push({ad: g.ad, n: n, neden: lean < 0 ? 'Teklife ideolojik itiraz' : 'Sadakat düşük'}); forV += pSeats * g.guc / tot * (1 - f);
    });
    S.gov.forEach(function (id2) {
      if (id2 === S.pid) return; var s2 = S.meclis[id2] || 0, yk = S.yk[id2] || 0, f2 = clamp((20 - yk) / 120, 0, 0.45) + (h < 0.35 ? 0.1 : 0);
      if (f2 * s2 >= 1) defect.push({ad: partiAdi(S, id2), n: Math.round(s2 * f2), neden: 'Ortak: yakınlık ' + Math.round(yk)}); forV += s2 * (1 - f2);
    });
    forV += oppSeats * Math.max(0, h - 0.6) * 0.4;
  }
  forV = forV * (1 + norm(S) * 0.015); forV = Math.round(forV);
  var against = Math.round((T - forV) * 0.9), abst = T - forV - against;
  return {kabul: forV > against, evet: forV, hayir: against, cekimser: abst, defect: defect, halk: h, kapsam: kapsam || 1};
}
function fxOlcekle(fx, k) { var o = {}; Object.keys(fx).forEach(function (a) { if (a === 'grup') { o.grup = {}; Object.keys(fx.grup).forEach(function (g) { o.grup[g] = fx.grup[g] * k; }); } else if (typeof fx[a] === 'number') o[a] = fx[a] * k; else o[a] = fx[a]; }); return o; }
function yasaSonuc(S, b, ov) {
  var y = YASA[b.id], gov = govMu(S, S.pid), mc = mcInit(S), msg;
  S.hzb.forEach(function (g) { var lean = (y.hz && y.hz[g.id]) || 0; if (ov.kabul) g.sad = clamp(g.sad + (lean > 0 ? 3 : lean < -0.15 ? -4 : 0), 0, 100); else g.sad = clamp(g.sad - 1.5, 0, 100); });
  if (ov.defect.length && ov.defect.reduce(function (a, d) { return a + d.n; }, 0) > 25) { S.stat.birlik = clamp(S.stat.birlik - 2, 0, 100); }
  if (gov && S.gov && S.gov.length > 1) S.gov.forEach(function (id) { if (id === S.pid) return; var dd = ov.defect.filter(function (x) { return x.ad === partiAdi(S, id) && x.n >= 10; })[0], ph = partiHafiza(S, id); if (dd) { ph.ihanet += 1; S.yk[id] = clamp((S.yk[id] || 0) - 2, -50, 50); } else if (ov.kabul) { ph.yardim += 0.5; S.yk[id] = clamp((S.yk[id] || 0) + 0.5, -50, 50); } });
  if (gov) {
    if (ov.kabul) {
      fxUygula(S, fxOlcekle(y.gecer, b.kapsam), y.ad); if (y.pol) Object.keys(y.pol).forEach(function (pk) { S.politika[pk] = y.pol[pk]; }); if (y.eko) Object.keys(y.eko).forEach(function (ek) { S.makro[ek] += y.eko[ek] * b.kapsam; });
      msg = y.ad + ' Genel Kurul\'da kabul edildi (' + ov.evet + ' – ' + ov.hayir + ').';
    } else { fxUygula(S, y.red, y.ad); msg = y.ad + ' Genel Kurul\'da reddedildi (' + ov.evet + ' – ' + ov.hayir + ').'; }
  } else {
    var lead = S.gov[0], j = partiIdx(lead);
    if (ov.kabul) { fxUygula(S, {itibar: 4, drift: 0.1, stres: 1}, y.ad); if (y.eko) Object.keys(y.eko).forEach(function (ek) { S.makro[ek] += y.eko[ek] * 0.5; }); msg = 'Muhalefet teklifin ' + y.ad + ' Meclis\'te kabul edildi (' + ov.evet + ' – ' + ov.hayir + ')!'; }
    else {
      var bonus = ov.halk > 0.6 ? 1 : 0.3; fxUygula(S, {itibar: 1.5 * bonus, drift: 0.06 * bonus}, y.ad); if (ov.halk > 0.6 && j >= 0) S.mods[j] = clamp(S.mods[j] - 0.004, 0.6, 1.5);
      msg = y.ad + ' teklifin iktidar çoğunluğuyla reddedildi' + (ov.halk > 0.6 ? '; halk desteği yüksek olduğu için iktidar bundan zarar gördü' : '') + '.';
    }
  }
  b.durum = ov.kabul ? 'kabul' : 'red'; b.oy = {e: ov.evet, h: ov.hayir}; mc.sayac[ov.kabul ? 'kabul' : 'red']++;
  mc.gecmis.unshift({ay: S.ay, t: tarihYaz(S.tarih), id: b.id, ad: y.ad, sonuc: b.durum, evet: ov.evet, hayir: ov.hayir, kapsam: b.kapsam, opp: !!b.opp}); mc.gecmis = mc.gecmis.slice(0, 20);
  tarihceEkle(S, ov.kabul ? '📜' : '❌', msg); sonDakika(S, msg);
  return msg;
}
function yasaHazirla(S, id) {
  var mc = mcInit(S), y = YASA[id]; if (!y) return {ok: false, msg: 'Geçersiz teklif.'};
  var aktif = mc.teklif.filter(function (b) { return b.durum === 'komisyon' || b.durum === 'genel'; });
  if (aktif.length >= 2) return {ok: false, msg: 'En fazla 2 teklif aynı anda Meclis\'te olabilir.'};
  if (aktif.some(function (b) { return b.id === id; })) return {ok: false, msg: 'Bu teklif zaten Meclis\'te.'};
  var son = mc.gecmis.filter(function (g) { return g.id === id; })[0]; if (son && S.ay - son.ay < 6) return {ok: false, msg: 'Bu konuda yakın zamanda oylama yapıldı; en az 6 ay beklemelisin.'};
  if (!govMu(S, S.pid) && (S.meclis[S.pid] || 0) < 1) return {ok: false, msg: 'Teklif vermek için Meclis\'te milletvekilin olmalı.'};
  var m = yasaMetriks(S, id, !govMu(S, S.pid));
  mc.teklif.push({id: id, durum: 'komisyon', ay0: S.ay, vade: S.ay + (y.sure || 1), kapsam: 1, opp: !govMu(S, S.pid)});
  return {ok: true, metrik: m};
}
function guvenoyuIste(S) {
  var mc = mcInit(S); asama2Init(S);
  if (!govMu(S, S.pid)) return {ok: false, msg: 'Güvenoyu yalnızca hükümetteyken istenebilir.'};
  if (S.ay - mc.guvenSon < 8) return {ok: false, msg: 'Son güvenoyundan sonra en az 8 ay geçmeli.'};
  var pSeats = S.meclis[S.pid] || 0, hs = grupOrtSad(S), fp = clamp((55 - S.stat.birlik) / 100, 0, 0.4) + clamp((50 - hs) / 200, 0, 0.3), forV = pSeats * (1 - fp), def = [];
  if (fp * pSeats >= 1) def.push({ad: 'Parti grubu', n: Math.round(pSeats * fp), neden: 'Birlik ' + Math.round(S.stat.birlik) + ', hizip sadakati ' + Math.round(hs)});
  S.gov.forEach(function (id) { if (id === S.pid) return; var s2 = S.meclis[id] || 0, f2 = clamp((18 - (S.yk[id] || 0)) / 100, 0, 0.5); if (f2 * s2 >= 1) def.push({ad: partiAdi(S, id), n: Math.round(s2 * f2), neden: 'Ortak: yakınlık ' + Math.round(S.yk[id] || 0)}); forV += s2 * (1 - f2); });
  forV = Math.round(forV * (1 + norm(S) * 0.012)); var kabul = forV >= 301;
  mc.guvenSon = S.ay;
  if (kabul) { S.stat.birlik = clamp(S.stat.birlik + 6, 0, 100); S.stat.itibar = clamp(S.stat.itibar + 2, 0, 100); S.hzb.forEach(function (g) { g.sad = clamp(g.sad + 4, 0, 100); }); S.azMaj = 0; tarihceEkle(S, '🤝', 'Hükümet güvenoyu aldı (' + forV + ' oy).'); }
  else { var dr = hukumetDus(S, 'Güvenoyu alınamadı (' + forV + ' oy)'); return {ok: true, kabul: false, evet: forV, defect: def, erken: dr.erken, msg: dr.m}; }
  return {ok: true, kabul: kabul, evet: forV, defect: def};
}
function kabineDus(S, neden) {
  S.stat.itibar = clamp(S.stat.itibar - 4, 0, 100); S.stat.birlik = clamp(S.stat.birlik - 4, 0, 100); S.azMaj = 0;
  var m = 'Hükümet düştü: ' + neden + '. Kabine istifa etti, bakanlar yeniden belirlendi.'; olayEkle(S, {ikon: '🏛️', ust: 'HÜKÜMET DÜŞTÜ', baslik: 'Kabine istifa etti', alt: neden, ses: 'kriz', satirlar: ['Bakanlar yeniden belirlendi', 'Parti itibarı −4 · birlik −4'], kabine: 1}); tarihceEkle(S, '🏛️', m); sonDakika(S, m); zincirEkle(S, 'xn_kabine_yeni', 1, 2, 0.8);
  if (S.bakanlar) BAKANLIK.forEach(function (bk) { var ny = yeniKisi(S, [30, 75]); ny.kaynak = S.bakanlar[bk[1]].kaynak; S.bakanlar[bk[1]] = ny; });
  return m;
}
function gensoruVer(S, key) {
  var mc = mcInit(S); if (govMu(S, S.pid)) return {ok: false, msg: 'Gensoru önergesini muhalefet verir.'};
  if (muhalifMu(S)) return {ok: false, msg: 'Genel başkan olmadığın için önerge veremezsin.'};
  if ((S.meclis[S.pid] || 0) < 20) return {ok: false, msg: 'Gensoru için en az 20 milletvekili gerekir.'};
  if (S.ay - (mc.gensoru[key] === undefined ? -99 : mc.gensoru[key]) < 4) return {ok: false, msg: 'Bu bakanlık için yakın zamanda önerge verildi.'};
  mc.gensoru[key] = S.ay; var bp = bakanPerf(S, key), govSeats = 0, oppSeats = 0; S.gov.forEach(function (id) { govSeats += S.meclis[id] || 0; }); oppSeats = 600 - govSeats;
  var dsf = clamp((45 - bp) / 250, 0, 0.2), evet = Math.round(oppSeats * 0.97 + govSeats * dsf), kabul = evet > 300; var j = partiIdx(S.gov[0]);
  S.hzb && 0; var zayif = (50 - bp) / 50;
  fxUygula(S, {itibar: 1.2 + Math.max(0, zayif) * 1.5, drift: 0.04 + Math.max(0, zayif) * 0.05, stres: 2}, 'Gensoru');
  if (j >= 0) S.mods[j] = clamp(S.mods[j] - (kabul ? 0.012 : 0.002 + Math.max(0, zayif) * 0.004), 0.6, 1.5);
  var m = BAKANLIK.filter(function (b) { return b[1] === key; })[0][0] + ' Bakanı hakkında gensoru ' + (kabul ? 'kabul edildi: bakan düştü.' : 'reddedildi (' + evet + ' evet).') + (!kabul && bp < 40 ? ' Bakanın zayıf performansı tartışmayı iktidara yükledi.' : '');
  tarihceEkle(S, kabul ? '⚖️' : '📣', m); sonDakika(S, m); return {ok: true, kabul: kabul, evet: evet, bp: bp, msg: m};
}
function meclisTick(S) {
  var mc = mcInit(S), haber = [];
  mc.teklif.forEach(function (b) {
    var y = YASA[b.id]; if (!y) return;
    if (b.durum === 'komisyon' && S.ay >= b.vade) {
      var m = yasaMetriks(S, b.id, b.opp), r = rnd(S), ch = partiAdi(S, m.baskan);
      if (r < m.komOlasilik * 0.75) { b.durum = 'genel'; b.vade = S.ay + 1; haber.push(KOMISYON[y.alan] + ' Komisyonu ' + y.ad + ' teklifini kabul etti; Genel Kurul\'a geliyor.'); }
      else if (r < m.komOlasilik) { b.durum = 'genel'; b.vade = S.ay + 1; b.kapsam = 0.65; haber.push(KOMISYON[y.alan] + ' Komisyonu (' + ch + ') ' + y.ad + ' teklifini değiştirerek kabul etti; etkisi daraldı.'); }
      else { b.durum = 'red'; b.oy = null; mc.sayac.red++; mc.gecmis.unshift({ay: S.ay, t: tarihYaz(S.tarih), id: b.id, ad: y.ad, sonuc: 'komisyon', kapsam: 0, opp: !!b.opp}); var mm = y.ad + ' teklifi ' + KOMISYON[y.alan] + ' Komisyonu\'nda ' + ch + ' başkanlığında reddedildi.'; haber.push(mm); tarihceEkle(S, '❌', mm); if (!b.opp) S.stat.itibar = clamp(S.stat.itibar - 1, 0, 100); }
    } else if (b.durum === 'genel' && S.ay >= b.vade) {
      var ov = oylamaHesap(S, b.id, b.opp, b.kapsam), msg = yasaSonuc(S, b, ov); S.kuyruk.push({t: 'oylama', id: b.id, ad: y.ad, ov: ov, msg: msg, opp: !!b.opp}); 
    }
  });
  mc.teklif = mc.teklif.filter(function (b) { return b.durum === 'komisyon' || b.durum === 'genel' || S.ay - b.vade < 3; });
  return haber;
}

/* ---------- Aşama 3: erken seçim ve koalisyon pazarlığı ---------- */
var AY_U3 = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
function ebInit(S) { if (S.ebs === undefined) S.ebs = 0; if (S.erkenSon === undefined) S.erkenSon = -99; if (!S.kpSoz) S.kpSoz = []; if (!S.kp) S.kp = null; }
function sonrakiGenelIdx(S) { var now = tarihNo(S.tarih); for (var i = 0; i < S.takvim.length; i++) if (S.takvim[i].tip === 'genel' && S.takvim[i].y * 12 + S.takvim[i].m >= now) return i; return -1; }
function erkenUygun(S) {
  ebInit(S); var gi = sonrakiGenelIdx(S); if (gi < 0) return {ok: false, msg: 'Yaklaşan genel seçim yok.'};
  var T = S.takvim[gi], ay = T.y * 12 + T.m - tarihNo(S.tarih);
  if (ay < 7) return {ok: false, msg: 'Seçime 7 aydan az kaldı; erken seçim anlamsız.'};
  if (S.ay - S.erkenSon < 12) return {ok: false, msg: 'Yakın zamanda erken seçim kararı alındı.'};
  return {ok: true, ay: ay};
}
function erkenSecimIlan(S, neden) {
  ebInit(S); var gi = sonrakiGenelIdx(S); if (gi < 0) return null;
  var now = tarihNo(S.tarih), no2 = now + 3, y = Math.floor((no2 - 1) / 12), m = no2 - y * 12, T = S.takvim[gi];
  T.y = y; T.m = m; T.erken = true;
  for (var i = gi + 1; i < S.takvim.length; i++) if (S.takvim[i].tip === 'genel') { var n3 = no2 + 60, y3 = Math.floor((n3 - 1) / 12); S.takvim[i].y = y3; S.takvim[i].m = n3 - y3 * 12; }
  S.takvim.sort(function (a, b) { return (a.y * 12 + a.m) - (b.y * 12 + b.m); });
  S.erkenSon = S.ay; S.ebs = 0; secimGuncelle(S);
  var kay = 0; (S.kurultay || []).forEach(function (k) { var kn = k.y * 12 + k.m; if (kn >= now && Math.abs(kn - no2) <= 2) { var n4 = no2 + 4, y4 = Math.floor((n4 - 1) / 12); k.y = y4; k.m = n4 - y4 * 12; kay++; } });
  rakipErkenTepki(S);
  var msg = 'Erken seçim kararı: genel seçim ' + AY_U3[m - 1] + ' ' + y + ' tarihine çekildi (' + neden + ').';
  olayEkle(S, {ikon: '🗳️', ust: 'ERKEN SEÇİM', baslik: 'Sandığa gidiyoruz', alt: AY_U3[m - 1] + ' ' + y + ' · ' + neden, ses: 'sahne', satirlar: ['Genel seçim 3 ay sonraya çekildi', 'Kampanya dönemi başlıyor'], erken: 1});
  tarihceEkle(S, '🗳️', msg); sonDakika(S, msg); zincirEkle(S, 'xn_erken_kampanya', 1, 1, 1); return msg;
}
function rakipErkenTepki(S) {
  if (!S.rk || !S.rbm) return; var say = 0;
  PARTILER.forEach(function (p, j) {
    var r = S.rk[p.id]; if (!r || p.id === S.pid || p.baz < 3 || r.guc < 30) return; var rb = S.rbm[p.id], b = r.kale && r.kale[0];
    if (b && rb) { rb[b] = Math.min(1.1, (rb[b] || 1) + 0.03 * (r.guc / 100) * (0.6 + r.agresif)); say++; }
  });
  if (say) sonDakika(S, 'Partiler seçim hazırlığına geçti; rakipler kalelerinde sahaya indi.');
}
function hukumetDus(S, neden) {
  ebInit(S); var hd = hukumetDurum(S), p = clamp(0.4 + (hd.cogunluk ? 0.2 : 0) + (S.stat.birlik - 50) / 200 + (S.stat.itibar - 50) / 300, 0.1, 0.85), eu = erkenUygun(S);
  var m = kabineDus(S, neden);
  if (!eu.ok || rnd(S) < p) return {m: m + ' Yeni kabine kuruldu.', erken: false};
  var e = erkenSecimIlan(S, 'yeni hükümet kurulamadı'); return {m: m + ' ' + e, erken: true};
}
function erkenKarar(S) {
  ebInit(S); if (!govMu(S, S.pid) || muhalifMu(S)) return {ok: false, msg: 'Erken seçim kararını yalnızca iktidar alır.'};
  var eu = erkenUygun(S); if (!eu.ok) return eu;
  var sira = oyuncuSira(S), onde = sira === 1, fx = onde ? {drift: 0.35, itibar: 1} : {drift: -0.3, itibar: -3};
  S.stat.birlik = clamp(S.stat.birlik + (onde ? 2 : -3), 0, 100);
  var msg = erkenSecimIlan(S, 'Başkan kararı'); return {ok: true, fx: fx, msg: msg + (onde ? ' Anketteki öndelik moral verdi.' : ' Anketlerde önde olmaman eleştiri çekti.')};
}
function erkenBaski(S) {
  ebInit(S); var haber = [];
  var art = 0;
  if (govMu(S, S.pid)) { if (S.azMaj > 0) art += 2; if (S.stat.itibar < 30) art += 1.5; if (S.stat.birlik < 35) art += 1.5; if (S.anketOyuncu < 18) art += 1; }
  else art += (S.makro && S.makro.issiz > 12 ? 1.5 : 0.3);
  S.ebs = clamp(S.ebs + art - 1.2, 0, 100);
  if (govMu(S, S.pid) && S.ebs >= 60 && rnd(S) < 0.12 && erkenUygun(S).ok) { var e = erkenSecimIlan(S, 'siyasi baskı yükseldi'); haber.push(e); }
  else if (!govMu(S, S.pid) && S.ebs >= 70 && rnd(S) < 0.08 && erkenUygun(S).ok) { var e2 = erkenSecimIlan(S, 'iktidar baskıya dayanamadı'); haber.push(e2); }
  return haber;
}
function erkenBaskiYap(S) {
  ebInit(S); if (govMu(S, S.pid) || muhalifMu(S)) return {ok: false, msg: 'Erken seçim baskısını muhalefet kurar.'};
  if ((S.meclis[S.pid] || 0) < 10) return {ok: false, msg: 'Kampanya için Meclis\'te en az 10 milletvekili gerekir.'};
  var g = 7 + S.stat.itibar / 15 + (S.anketOyuncu > 25 ? 3 : 0); S.ebs = clamp(S.ebs + g, 0, 100);
  return {ok: true, msg: 'Erken seçim baskısı %' + Math.round(S.ebs) + ' düzeyine çıktı.', fx: {itibar: S.anketOyuncu > 20 ? 1 : -1, stres: 3}};
}
/* ---- koalisyon pazarlığı ---- */
function kpAdaylar(S) {
  var out = [], px = ideoBul(S.parti.ideo).x;
  Object.keys(S.meclis).forEach(function (id) {
    if (id === S.pid || id === 'DIGER' || id === 'YENI' || S.gov.indexOf(id) >= 0) return; var s = S.meclis[id] || 0; if (s < 15) return;
    var p = partiBul(id), dx = Math.abs(((p && p.x) || 0) - px), yk = S.yk[id] || 0;
    out.push({id: id, ad: partiAdi(S, id), koltuk: s, yk: yk, uzak: dx, olasilik: kpOlasilik(S, id, 1, null)});
  });
  return out.sort(function (a, b) { return b.olasilik - a.olasilik; });
}
function kpOlasilik(S, id, bak, yasa) {
  var p = partiBul(id), px = ideoBul(S.parti.ideo).x, dx = Math.abs(((p && p.x) || 0) - px), yk = S.yk[id] || 0, s = S.meclis[id] || 0;
  var ph = S.haf && S.haf.parti && S.haf.parti[id] || {yardim: 0, ihanet: 0};
  var v = 0.25 + yk / 160 - dx / 12 + bak * 0.12 + (yasa ? 0.12 : 0) + (S.stat.itibar - 50) / 300 - s / 1500 + (ozVar(S, 'sozlu') ? 0.06 : 0) - (ozVar(S, 'sozbozan') ? 0.08 : 0) + (ozVar(S, 'koalisyoncu') ? 0.06 : 0) + Math.min(0.1, ph.yardim * 0.04) - Math.min(0.2, ph.ihanet * 0.07);
  return clamp(v, 0.03, 0.92);
}
function kpBaslat(S) {
  ebInit(S); if (!govMu(S, S.pid) || muhalifMu(S)) { kpAI(S); return null; }
  var hd = hukumetDurum(S), ad = kpAdaylar(S);
  if (hd.cogunluk) return null;
  S.kp = {tur: 0, max: 3, eksik: Math.max(0, 301 - hd.koltuk), baslangic: S.ay};
  return {t: 'koalisyon'};
}
function kpAI(S) {
  var kt = meclisKoltuk(S), n = 0;
  while (kt < 301 && n < 2) {
    var best = null, gx = 0, gp = partiBul(S.gov[0]); gx = gp ? gp.x : 0;
    Object.keys(S.meclis).forEach(function (id) { if (S.gov.indexOf(id) >= 0 || id === 'DIGER' || id === 'YENI' || id === S.pid || (S.meclis[id] || 0) < 15) return; var p = partiBul(id), sc = -Math.abs(((p && p.x) || 0) - gx) + (S.meclis[id] || 0) / 120 + rnd(S) * 0.8; if (!best || sc > best.sc) best = {id: id, sc: sc}; });
    if (!best || best.sc < -4) break; S.gov.push(best.id); kt = meclisKoltuk(S); n++;
    var m = 'Seçim sonrası ' + partiAdi(S, best.id) + ' hükümet koalisyonuna katıldı.'; tarihceEkle(S, '🤝', m); sonDakika(S, m);
  }
  if (kt < 301) { var m2 = 'Hükümet çoğunluk sağlayamadı; azınlık hükümeti kuruldu.'; tarihceEkle(S, '🏛️', m2); S.ebs = clamp((S.ebs || 0) + 25, 0, 100); }
}
function kpTeklif(S, id, bak, yasa) {
  ebInit(S); if (!S.kp) return {ok: false, msg: 'Pazarlık süreci aktif değil.'};
  if (S.kp.tur >= S.kp.max) return {ok: false, msg: 'Pazarlık hakkın bitti.'};
  bak = Math.max(0, Math.min(3, bak | 0)); if (yasa && !YASA[yasa]) yasa = null;
  var p = kpOlasilik(S, id, bak, yasa), kabul = rnd(S) < p; S.kp.tur++;
  if (kabul) {
    S.gov.push(id); S.yk[id] = clamp((S.yk[id] || 0) + 8, -50, 50); S.stat.itibar = clamp(S.stat.itibar - bak * 0.4, 0, 100);
    if (S.bakanlar) { var ks = BAKANLIK.filter(function (bk) { return S.bakanlar[bk[1]].kaynak === 'parti'; }).slice(0, bak); ks.forEach(function (bk) { S.bakanlar[bk[1]].kaynak = id; }); }
    if (yasa) S.kpSoz.push({id: id, yasa: yasa, son: S.ay + 12, tamam: false});
    var hf = hafInit(S); hf.aks.koalisyon = (hf.aks.koalisyon || 0) + 1; tarihceEkle(S, '🤝', partiAdi(S, id) + ' ile koalisyon anlaşması imzalandı.');
    var hd = hukumetDurum(S); S.kp.eksik = Math.max(0, 301 - hd.koltuk); if (hd.cogunluk) { S.kp = null; return {ok: true, kabul: true, bitti: true, msg: partiAdi(S, id) + ' ile anlaştınız; hükümet çoğunluğa kavuştu.'}; }
    return {ok: true, kabul: true, msg: partiAdi(S, id) + ' ile anlaştınız; hâlâ ' + S.kp.eksik + ' sandalye eksik.'};
  }
  S.yk[id] = clamp((S.yk[id] || 0) - 3, -50, 50);
  return {ok: true, kabul: false, msg: partiAdi(S, id) + ' teklifini reddetti.'};
}
function kpBitir(S) {
  if (!S.kp) return null; var hd = hukumetDurum(S), m;
  if (hd.cogunluk) m = 'Koalisyon pazarlığı tamamlandı.';
  else { m = 'Çoğunluk sağlanamadı; azınlık hükümeti ile devam ediliyor.'; S.stat.itibar = clamp(S.stat.itibar - 2, 0, 100); S.azMaj = 1; }
  tarihceEkle(S, '🏛️', m); S.kp = null; return m;
}
function kpTick(S) {
  ebInit(S); var haber = [], mc = mcInit(S);
  if (S.kp && S.ay - S.kp.baslangic >= 2) { var kbm = kpBitir(S); if (kbm) haber.push(kbm); }
  S.kpSoz.forEach(function (z) {
    if (z.tamam) return; var yap = mc.gecmis.some(function (g) { return g.id === z.yasa && g.sonuc === 'kabul' && g.ay >= z.son - 12; });
    if (yap) { z.tamam = true; partiHafiza(S, z.id).yardim++; S.yk[z.id] = clamp((S.yk[z.id] || 0) + 10, -50, 50); haber.push(partiAdi(S, z.id) + ' koalisyon taahhüdünün yerine getirilmesinden memnun.'); }
    else if (S.ay >= z.son) { z.tamam = true; partiHafiza(S, z.id).ihanet++; S.yk[z.id] = clamp((S.yk[z.id] || 0) - 15, -50, 50); S.stat.itibar = clamp(S.stat.itibar - 2, 0, 100); var m = partiAdi(S, z.id) + ' koalisyon protokolündeki ' + YASA[z.yasa].ad + ' sözünün tutulmadığını açıkladı.'; haber.push(m); tarihceEkle(S, '⚠️', m); }
  });
  S.kpSoz = S.kpSoz.filter(function (z) { return !z.tamam || S.ay - z.son < 6; });
  return haber.concat(erkenBaski(S));
}

/* ---------- Aşama 4: belediye yönetimi ---------- */
var BLD_BUYUK = null;
function bldBuyuk() { if (!BLD_BUYUK) { BLD_BUYUK = {}; ILLER.map(function (il, i) { return {i: i, n: il.nufus}; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 12).forEach(function (x) { BLD_BUYUK[x.i] = 1; }); } return BLD_BUYUK; }
function bldInit(S) {
  if (S.bld) { if (!S.bld.borc) { S.bld.borc = []; for (var q = 0; q < 81; q++) S.bld.borc.push(Math.round(rn(S, 15, 38))); } return S.bld; }
  var b = {sahip: [], perf: [], yat: [], denet: [], sk: [], gecmis: []};
  for (var i = 0; i < 81; i++) {
    var best = 'AK', bv = -1; if (S.baz && S.baz[i]) PARTILER.forEach(function (p, j) { if (S.baz[i][j] > bv) { bv = S.baz[i][j]; best = p.id; } });
    b.sahip.push(best); b.perf.push(Math.round(rn(S, 42, 60))); b.borc = b.borc || []; b.borc.push(Math.round(rn(S, 15, 38))); b.yat.push(0); b.denet.push(-1); b.sk.push(-99);
  }
  S.bld = b; return b;
}
function bldSayi(S) { var b = bldInit(S), n = 0; for (var i = 0; i < 81; i++) if (b.sahip[i] === S.pid) n++; return n; }
function bldOzet(S) {
  var b = bldInit(S), n = 0, tp = 0, tn = 0, iyi = 0, sk = 0, buy = 0;
  for (var i = 0; i < 81; i++) if (b.sahip[i] === S.pid) { n++; tp += b.perf[i] * ILLER[i].nufus; tn += ILLER[i].nufus; if (b.perf[i] >= 55) iyi++; if (S.ay - b.sk[i] <= 8) sk++; if (bldBuyuk()[i]) buy++; }
  var bt = 0, bc = 0; for (var z = 0; z < 81; z++) if (b.sahip[z] === S.pid) { bt += b.borc[z]; bc += b.borc[z] > 70 ? 1 : 0; }
  return {n: n, borc: n ? bt / n : 0, agirBorc: bc, ort: tn ? tp / tn : 0, iyi: iyi, skandal: sk, buyuk: buy, gelir: Math.min(1.0e6, iyi * 0.02e6)};
}
function bldPerfHedef(S, i) {
  var b = S.bld, sad = 60; if (S.kadro && S.kadro.length) { sad = 0; S.kadro.forEach(function (k) { sad += k.sad; }); sad /= S.kadro.length; }
  var h = 50 + (S.stat.birlik - 50) * 0.08 + (sad - 60) * 0.08 - (S.makro.enf - 30) * 0.12 - (S.makro.issiz - 9) * 0.7 + Math.min(2, b.yat[i]) * 22 - Math.max(0, (b.borc ? b.borc[i] : 0) - 60) * 0.35;
  return clamp(h, 15, 90);
}
function bldYonet(S, tip, il) {
  var b = bldInit(S); il = +il; if (!(il >= 0 && il < 81)) return {ok: false, msg: 'Geçersiz il.'};
  if (b.sahip[il] !== S.pid) return {ok: false, msg: ILLER[il].ad + ' belediyesi sende değil.'};
  if (tip === 'borc') { if (b.borc[il] < 25) return {ok: false, msg: ILLER[il].ad + ' belediyesinin borcu zaten düşük.'}; b.borc[il] = clamp(b.borc[il] - 22, 0, 100); b.perf[il] = clamp(b.perf[il] + 2, 0, 100); return {ok: true, msg: ILLER[il].ad + ' belediyesinin borcu yapılandırıldı (borç ' + Math.round(b.borc[il]) + ').', fx: {stres: 1}}; }
  if (tip === 'baskan') { var skY = S.ay - b.sk[il] <= 8, bz = b.perf[il] < 40; if (!skY && !bz) return {ok: false, msg: 'Başkanı değiştirmek için performans düşük veya yakın zamanda skandal olmalı.'}; b.perf[il] = clamp(Math.max(b.perf[il], 40) + 8, 0, 100); b.sk[il] = -99; b.denet[il] = -1; b.yat[il] = 0; var bb = S.kadro && S.kadro.length ? S.kadro : []; return {ok: true, msg: ILLER[il].ad + ' belediye başkanı değiştirildi; yeni başkan göreve başladı.', fx: {birlik: skY ? 0.5 : -2, itibar: skY ? 1 : -0.5, stres: 2}}; }
  if (tip === 'yat') { var eski = b.perf[il]; b.borc[il] = clamp(b.borc[il] + 7, 0, 100); b.perf[il] = clamp(b.perf[il] + 8, 0, 100); b.yat[il] = Math.min(2, b.yat[il] + 1); S.org[il] = Math.min(100, S.org[il] + 3); ilmInit(S); S.ilm[il] = Math.min(0.35, S.ilm[il] + 0.02); return {ok: true, msg: ILLER[il].ad + ' belediyesine hizmet yatırımı yapıldı. Performans ' + Math.round(eski) + ' → ' + Math.round(b.perf[il]) + '.', fx: {stres: 2, itibar: 0.2}}; }
  b.perf[il] = clamp(b.perf[il] + 2, 0, 100); b.denet[il] = S.ay + 6; return {ok: true, msg: ILLER[il].ad + ' belediyesinde iç denetim yapıldı; 6 ay boyunca skandal riski düştü.', fx: {stres: 1, itibar: 0.3}};
}
function bldTick(S) {
  var b = bldInit(S), haber = [], mine = !muhalifMu(S);
  for (var i = 0; i < 81; i++) {
    var p = b.perf[i], h = bldPerfHedef(S, i); if (b.sahip[i] !== S.pid) h = clamp(50 - (S.makro.enf - 30) * 0.08 - Math.max(0, b.borc[i] - 60) * 0.35 + Math.min(2, b.yat[i]) * 15, 20, 75);
    b.perf[i] = clamp(p + (h - p) * 0.12 + norm(S) * 1.6, 0, 100); b.yat[i] = b.yat[i] * 0.96;
    b.borc[i] = clamp(b.borc[i] + (S.makro.enf > 35 ? 0.7 : 0.15) + (b.perf[i] < 40 ? 0.5 : b.perf[i] >= 55 ? -0.6 : 0), 0, 100);
    if (b.borc[i] > 78 && rnd(S) < 0.04) { b.perf[i] = clamp(b.perf[i] - 10, 0, 100); b.borc[i] -= 6; if (b.sahip[i] === S.pid) { var mk = 'Yönetimindeki bir belediyede maaş ödemeleri aksadı; borç yükü ağırlaştı.'; haber.push(mk); tarihceEkle(S, '🏙️', mk); if (mine) S.stat.itibar = clamp(S.stat.itibar - 0.8, 0, 100); } }
    if (b.sahip[i] !== S.pid) {
      if (b.perf[i] < 48 && b.borc[i] < 60 && rnd(S) < 0.04) { b.perf[i] = clamp(b.perf[i] + 8, 0, 100); b.yat[i] = Math.min(2, b.yat[i] + 1); b.borc[i] = clamp(b.borc[i] + 7, 0, 100); }
      else if (b.borc[i] > 70 && rnd(S) < 0.04) b.borc[i] = clamp(b.borc[i] - 18, 0, 100);
      if (rnd(S) < 0.003 + (b.perf[i] < 40 ? 0.008 : 0)) { b.perf[i] = clamp(b.perf[i] - 15, 0, 100); b.sk[i] = S.ay; var rm = (b.sahip[i] === S.pid ? 'Yönetimindeki bir belediyede ' : 'Bir belediyede ') + pick(S, ['ihale usulsüzlüğü', 'imar tartışması', 'bağış denetimi']) + ' iddiası gündemde.'; haber.push(rm); sonDakika(S, rm); if (rnd(S) < 0.5) { b.perf[i] = Math.max(b.perf[i], 45); b.sk[i] = S.ay; } }
    }
    if (b.sahip[i] === S.pid) {
      var pr = (0.003 + (b.perf[i] < 40 ? 0.010 : 0)) * (b.denet[i] > S.ay ? 0.3 : 1);
      if (rnd(S) < pr) {
        b.perf[i] = clamp(b.perf[i] - 15, 0, 100); b.sk[i] = S.ay; var big = bldBuyuk()[i] ? 2 : 1;
        if (mine) { S.stat.itibar = clamp(S.stat.itibar - 1.5 * big, 0, 100); }
        var m = 'Yönetimindeki bir belediyede ' + pick(S, ['ihale usulsüzlüğü', 'kadro düzenlemesi', 'imar tartışması', 'bağış denetimi']) + ' iddiası gündemde.'; zincirEkle(S, 'xn_bld_sorus', 1, 3, 0.5); haber.push(m); tarihceEkle(S, '🏙️', m); sonDakika(S, m);
      }
      if (b.perf[i] >= 60) S.org[i] = Math.min(100, S.org[i] + 0.4); else if (b.perf[i] < 35) S.org[i] = Math.max(0, S.org[i] - 0.6);
    }
  }
  var o = bldOzet(S);
  if (o.n && mine) {
    var bn = (o.ort - 50) / 50 * Math.min(1, o.n / 12);
    S.stat.drift += bn * 0.03; S.stat.itibar = clamp(S.stat.itibar + bn * 0.15, 0, 100); S.stat.kasa += o.gelir * (S.makro.fiyat / 100);
    if (o.skandal >= 2 && rnd(S) < 0.25) { S.stat.birlik = clamp(S.stat.birlik - 2, 0, 100); var m2 = 'Belediye skandalları parti içinde sorgulanmaya başladı.'; haber.push(m2); tarihceEkle(S, '⚠️', m2); }
  }
  return haber;
}
function bldSecim(S, sonuc) {
  var b = bldInit(S), kaz = 0, kay = 0;
  for (var i = 0; i < 81; i++) { var yeni = sonuc.kazananlar[i], eski = b.sahip[i]; if (yeni !== eski) { if (yeni === S.pid) kaz++; if (eski === S.pid) kay++; b.sahip[i] = yeni; b.perf[i] = Math.round(rn(S, 46, 58)); b.yat[i] = 0; b.denet[i] = -1; b.borc[i] = Math.round(b.borc[i] * 0.85); } }
  var m = 'Yerel seçim sonrası ' + S.parti.ad + ' ' + bldSayi(S) + ' il belediyesini yönetiyor (' + kaz + ' kazandı, ' + kay + ' kaybetti).'; tarihceEkle(S, '🏙️', m); b.gecmis.unshift({t: tarihYaz(S.tarih), n: bldSayi(S), kaz: kaz, kay: kay}); b.gecmis = b.gecmis.slice(0, 5);
  if (!muhalifMu(S)) { S.stat.birlik = clamp(S.stat.birlik + (kaz - kay) * 0.1, 0, 100); }
  return m;
}
KARTLAR_E.push(
 C('xb_cop', 'siyaset', 'Belediyede Çöp Krizi', 'Yönettiğin belediyelerden birinde çöp toplama aksadı; sokaklar sosyal medyada gündem.', function (S) { return bldSayi(S) >= 3 && !muhalifMu(S); }, [
  ['Acil kaynak ayır', {kasa: -.4, itibar: 1.5, stres: 2}, 'Sorun birkaç günde çözüldü; yönetim hızlı görüldü.'],
  ['Belediye başkanını kamuoyu önünde uyar', {itibar: .5, birlik: -2}, 'Çözüm geldi ama başkanlar rahatsız.', [.3, {itibar: -2}, 'Tepki parti içinde yankılandı.']],
  ['Beklet', {itibar: -3, drift: -.1}, 'Eleştiriler büyüdü.']]),
 C('xb_proje', 'siyaset', 'Belediyede Büyük Proje', 'Yönettiğin bir büyükşehir tramvay hattı projesini sundu. Takvim sıkışık ama kamuoyu heyecanlı.', function (S) { return bldOzet(S).buyuk >= 1 && !muhalifMu(S); }, [
  ['Açılışa katıl', {itibar: 2, drift: .12, stres: 2}, 'Açılış görüntüleri geniş yankı buldu.', [.2, {itibar: -2}, 'Hat ilk gün arızalandı.']],
  ['Maliyet denetimi iste', {birlik: 1, itibar: 1}, 'Denetim sürece güven kattı.'],
  ['İlgilenme', {}]]),
 C('xb_rakip', 'siyaset', 'Başkan Parti İçinde Alternatif Oluyor', 'Güçlü bir belediye başkanı genel başkanlığa mesafeli çıkışlar yapıyor.', function (S) { return bldOzet(S).n >= 5 && bldOzet(S).ort > 58 && !muhalifMu(S); }, [
  ['Ortak platform kur', {birlik: 3, kasa: -.2, drift: .05}, 'Başkan kadrona dahil edildi; gerilim düştü.'],
  ['Sert tavır al', {birlik: -4, itibar: 1}, 'Gerilim arttı, otorite mesajı verildi.', [.35, {itibar: -3, drift: -.1}, 'Başkan basına konuştu.']],
  ['Görmezden gel', {birlik: -2}]]),
 C('xb_ihale', 'kriz', 'Belediye İhale Soruşturması', 'Yönetimindeki bir belediyeyle ilgili ihale soruşturması basına sızdı.', function (S) { return bldOzet(S).n >= 4 && !muhalifMu(S); }, [
  ['Soruşturmaya tam destek ver', {itibar: 2, birlik: -1, drift: .04}, 'Şeffaflık mesajı olumlu karşılandı.'],
  ['Başkanı kalkanla', {itibar: -4, birlik: 1, drift: -.12}, 'Savunma tepki çekti.', [.3, {itibar: -3}, 'Yeni belgeler ortaya çıktı.']],
  ['Konuşma', {itibar: -1.5}]])
);

/* ---------- Aşama 5: medya yeniden yapılanması ve skandal zinciri ---------- */
var MEDYA_EK = {
  'Devlet Televizyonu': {tur: 'tv', sahip: 'iktidar', gr: ['emekliler', 'muhafazakarlar', 'memurlar']},
  'Havuz Ana Haber': {tur: 'tv', sahip: 'iktidar', gr: ['emekliler', 'esnaf', 'milliyetciler']},
  'Ulusal Haber Ajansı': {tur: 'ajans', sahip: 'tarafsiz', gr: ['memurlar', 'isciler']},
  'Merkez TV': {tur: 'tv', sahip: 'tarafsiz', gr: ['esnaf', 'isciler', 'ciftciler']},
  'Halk Gazetesi': {tur: 'gazete', sahip: 'muhalif', gr: ['isciler', 'emekliler', 'ogrenciler']},
  'Bağımsız Dijital': {tur: 'dijital', sahip: 'bagimsiz', gr: ['gencler', 'ogrenciler']}
};
var MEDYA_TUR = {tv: '📺', gazete: '📰', ajans: '📡', dijital: '📱'};
function mdInit(S) {
  if (!S.md) S.md = {manset: [], sk: null, gecmis: [], bkz: {}};
  S.medya.forEach(function (m) { var e = MEDYA_EK[m.ad] || {tur: 'gazete', sahip: 'tarafsiz', gr: []}; if (!m.tur) { m.tur = e.tur; m.sahip = e.sahip; m.gr = e.gr; m.taban = m.yakin; } });
  return S.md;
}
function mdTaraf(S, m) { // outlet'in oyuncuya doğal yakınlığı
  var gov = govMu(S, S.pid) && !muhalifMu(S);
  if (m.sahip === 'iktidar') return gov ? 45 : -40;
  if (m.sahip === 'muhalif') return gov ? -15 : 35;
  if (m.sahip === 'bagimsiz') return m.taban;
  return m.taban * 0.5;
}
function mdDostluk(S) { var t = 0, w = 0; S.medya.forEach(function (m) { t += m.erisim * m.yakin; w += m.erisim; }); return w ? t / w : 0; }
function mdGuc(S) { // iddiaları büyütme gücü: düşman yayınların erişimi
  var t = 0, w = 0; S.medya.forEach(function (m) { t += m.erisim * Math.max(0, -m.yakin); w += m.erisim; }); return clamp(0.7 + (w ? t / w / 45 : 0), 0.7, 1.7) * (ozVar(S, 'kriz') ? 0.85 : 1);
}
function mdMansetler(S) {
  var md = mdInit(S), K = [], mc = S.mc, sk = md.sk, bkAd = {}; BAKANLIK.forEach(function (b) { bkAd[b[1]] = b[0]; });
  var gov = govMu(S, S.pid) && !muhalifMu(S), pa = S.parti.ad, ay = S.ay;
  var G = mc && mc.gecmis && mc.gecmis[0] && ay - mc.gecmis[0].ay <= 1 ? mc.gecmis[0] : null, b = S.bld, bsk = 0;
  if (b) for (var i = 0; i < 81; i++) if (b.sahip[i] === S.pid && ay - b.sk[i] <= 2) bsk++;
  function T(n, z, p) { return [n, z, p]; }
  if (sk && sk.durum !== 'bitti') { var bn = sk.taraf === 'rakip' ? 'Hükümet' : (bkAd[sk.bakan] || '') + ' Bakanı ' + sk.kisi; K.push(sk.taraf === 'rakip' ? T('Hükümette skandal büyüyor: ' + sk.kisi + ' hakkında iddialar', sk.kisi + ' hakkındaki iddialar inceleniyor', 'İktidar karalama kampanyası yürüttüğünü savundu') : T(bn + ' için istifa çağrıları', bn + ' hakkındaki iddialar araştırılıyor', bn + ' hakkındaki iddialar için "karalama" açıklaması')); }
  if (bsk) K.push(T('Bir belediyede iddia gündemde', 'Belediyedeki iddialar inceleniyor', 'Belediyede iç denetim başlatıldı'));
  if (S.makro.enf > 48) K.push(T('Enflasyon rakamları tedirgin ediyor: ' + Math.round(S.makro.enf) + '%', 'Enflasyon ' + Math.round(S.makro.enf) + ' seviyesinde', 'Ekonomi yönetimi dezenflasyon programına odaklandı')); else if (S.makro.enf < 30) K.push(T('Enflasyon düştü ama hayat pahalılığı sürüyor', 'Enflasyon ' + Math.round(S.makro.enf) + ' seviyesine geriledi', 'Enflasyonda düşüş sürüyor'));
  if (S.makro.issiz > 11) K.push(T('İşsizlik ' + S.makro.issiz.toFixed(1).replace('.', ',') + '%: gençler iş bulamıyor', 'İşsizlik oranı açıklandı', 'İstihdam paketi gündemde'));
  K.push(S.anketOyuncu >= 22 ? T(pa + ' anketlerde ilk sıralarda', pa + ' %' + Math.round(S.anketOyuncu) + ' oy oranıyla izleniyor', pa + ' anketlerde yükseliyor') : T(pa + ' anketlerde geriledi', pa + ' %' + Math.round(S.anketOyuncu) + ' oy oranında', pa + ' anket sonuçlarını sahaya hazırlık için değerlendirdi'));
  if (G) K.push(G.sonuc === 'kabul' ? T('Meclis\'te ' + G.ad + ' kabul edildi: tepkiler sürüyor', G.ad + ' Meclis\'ten geçti', G.ad + ' Meclis\'ten geçti, uygulama başlıyor') : T('Meclis\'te ' + G.ad + ' teklifi reddedildi', G.ad + ' teklifi Meclis\'te sonuçlandı', G.ad + ' reddi sonrası yeni arayışlar'));
  var sc = S.sonrakiSecim; if (sc && sc.ay <= 6) K.push(T((sc.tip === 'genel' ? 'Genel' : 'Yerel') + ' seçime ' + sc.ay + ' ay: sahada gerginlik', 'Seçim takvimi hızlandı: ' + sc.ay + ' ay kaldı', 'Seçim yaklaşırken partiler sahaya iniyor'));
  K.push(T('Siyasette gündem yoğun: kamuoyu kararsız', 'Siyasi gündem değerlendirildi', 'Hafta sonu siyasi temaslar sürdü'));
  var out = [];
  S.medya.forEach(function (m, j) {
    var ton = m.yakin > 15 ? 2 : m.yakin < -15 ? 0 : 1, k = K[(j + ay) % K.length];
    if (sk && sk.durum !== 'bitti' && (m.yakin < -10 || j % 2 === 0)) k = K[0]; out.push({ad: m.ad, tur: m.tur, ton: ton - 1, m: k[ton]});
  });
  return out;
}
function mdSkandalSec(S) {
  var keys = []; BAKANLIK.forEach(function (b) { if (S.bakanlar && S.bakanlar[b[1]]) keys.push(b[1]); }); if (!keys.length) return null;
  var best = null, bs = -1; keys.forEach(function (k) { var x = S.bakanlar[k], sc = (100 - x.perf) * 0.5 + x.hirs * 0.4 + (x.ozel === 'hirsli' ? 15 : 0) + rnd(S) * 30 - ((S.md && S.md.gecmis || []).some(function (g) { return g.bakan === k && S.ay - g.ay < 12; }) ? 45 : 0); if (sc > bs) { bs = sc; best = k; } }); return best;
}
function mdYeniBakan(S, key) { var eski = S.bakanlar[key], ny = yeniKisi(S, [35, 75]); ny.kaynak = eski.kaynak; S.bakanlar[key] = ny; return ny; }
function mdSkandalYanit(S, tip) {
  var md = mdInit(S), sk = md.sk; if (!sk || sk.durum === 'bitti' || sk.taraf === 'rakip') return {ok: false, msg: 'Yanıtlanacak bir skandal yok.'};
  var st = S.stat, ad = sk.kisi, bk = sk.bakan, mesaj;
  if (tip === 'istifa') {
    mdYeniBakan(S, bk); st.itibar = clamp(st.itibar - 1, 0, 100); st.birlik = clamp(st.birlik + 1, 0, 100); sk.durum = 'bitti'; hafInit(S).skAtlat++; mesaj = ad + ' istifa etti; yerine yeni bakan atandı. Kriz büyümeden kapandı.';
  } else if (tip === 'savun') {
    var p = clamp(0.28 + mdDostluk(S) / 220 - sk.siddet * 0.1, 0.05, 0.7);
    if (rnd(S) < p) { hafInit(S).skAtlat++; st.itibar = clamp(st.itibar + 1, 0, 100); sk.durum = 'bitti'; S.bakanlar[bk].perf = clamp(S.bakanlar[bk].perf + 4, 0, 100); mesaj = 'Savunman iş gördü; iddialar yeterince desteklenmedi ve gündemden düştü.'; }
    else { sk.siddet = Math.min(3, sk.siddet + 1); sk.evre += 1; st.itibar = clamp(st.itibar - 2, 0, 100); mesaj = 'Savunma ters tepti; yeni belgeler çıktı, skandal büyüdü.'; }
  } else {
    sk.durum = 'sorusturma'; sk.son = S.ay + 2; mesaj = 'Bağımsız soruşturma açıldı; iki ay içinde sonuç bekleniyor. O zamana kadar baskı hafifler.';
  }
  tarihceEkle(S, '🗞️', mesaj); return {ok: true, msg: mesaj};
}
function mdSkandalKoz(S) {
  var md = mdInit(S); if (govMu(S, S.pid)) return {ok: false, msg: 'Skandalı muhalefet büyütür.'};
  var sk = md.sk; if (!sk || sk.taraf !== 'rakip' || sk.durum === 'bitti') return {ok: false, msg: 'İktidarın gündemde açık bir skandalı yok.'};
  var amp = mdGuc(S); sk.baski = (sk.baski || 0) + 1; S.ebs = clamp((S.ebs || 0) + 4, 0, 100); var g = S.gov[0], r = S.rk && S.rk[g]; if (r) r.guc = clamp(r.guc - 2 * amp, 0, 100);
  return {ok: true, msg: 'Skandalı gündemde tuttun; iktidarın itibarı sarsıldı. Baskı %' + Math.round(S.ebs) + '.', fx: muhalifMu(S) ? {stres: 1, itibar: -0.2} : {drift: 0.08 * amp, stres: 2, itibar: -0.5}};
}
function mdRakip(S) { rkInit(S); var r = rakipler(S).filter(function (x) { return S.rk && S.rk[x.id]; }); r.sort(function (a, b) { return (S.anket[b.id] || 0) - (S.anket[a.id] || 0); }); return r[0] ? r[0].id : null; }
function mdRakipZarar(S, rid, guc, carp) { var r = S.rk[rid], rb = S.rbm && S.rbm[rid]; if (r) r.guc = clamp(r.guc - guc, 0, 100); if (rb) Object.keys(BOLGE).forEach(function (b) { rb[b] = (rb[b] || 1) * carp; }); }
function mdHaber(S, tip, idx) {
  var md = mdInit(S), m = S.medya[+idx]; if (!m) return {ok: false, msg: 'Geçersiz yayın organı.'};
  var gov = govMu(S, S.pid) && !muhalifMu(S), rid = mdRakip(S), hh = hafInit(S);
  if (tip === 'haberduz') {
    if (!md.yanlis) return {ok: false, msg: 'Düzeltilecek asılsız bir haber yok.'};
    var y = md.yanlis, yo = S.medya[y.idx]; md.yanlis = null; if (yo) yo.guven = clamp(yo.guven - 6, 0, 100); S.medya.forEach(function (x) { x.guven = clamp(x.guven + 1, 0, 100); });
    return {ok: true, msg: 'Düzeltme yayınlandı; asılsız haber söndü. ' + (yo ? yo.ad + ' güven kaybetti.' : ''), fx: {itibar: 1 * (m.guven / 60), stres: 1}};
  }
  if (!rid) return {ok: false, msg: 'Hedef alınacak rakip bulunamadı.'};
  var rad = liderAdi(rid), ek = gov ? -0.08 : 0.08, p, sonuc;
  if (tip === 'haberortaya') {
    var b = bldInit(S), il = -1; for (var i = 0; i < 81; i++) if (b.sahip[i] !== S.pid && S.ay - b.sk[i] <= 8 && b.sk[i] >= 0 && (il < 0 || b.sk[i] > b.sk[il])) il = i;
    if (il < 0) return {ok: false, msg: 'Rakip belediyelerde ortaya çıkarılabilecek açık bir skandal yok.'};
    p = clamp(0.4 + m.guven / 250 + Math.max(0, m.yakin) / 300 + ek, 0.2, 0.85);
    if (rnd(S) < p) { var amp = mdGuc(S); mdRakipZarar(S, b.sahip[il], 4 * amp, 0.965); b.perf[il] = clamp(b.perf[il] - 6, 0, 100); m.guven = clamp(m.guven + 2, 0, 100); return {ok: true, msg: 'Rakip bir belediyedeki iddialar belgeleriyle yayınlandı; rakip parti zor durumda.', fx: {itibar: 0.8, drift: muhalifMu(S) ? 0 : 0.05 * amp, stres: 1}}; }
    return {ok: true, msg: m.ad + ' belgeleri yeterli bulmadı; haber yayınlanmadı.', fx: {stres: 1}};
  }
  if (tip === 'haberlek') {
    p = clamp(0.38 + m.yakin / 220 + (m.guven - 50) / 300 + ek, 0.15, 0.8);
    if (rnd(S) < p) { mdRakipZarar(S, rid, 3, 0.975); m.guven = clamp(m.guven + 1, 0, 100); md.sizSay = (md.sizSay || 0) + 1; sonuc = {ok: true, msg: m.ad + ', ' + rad + ' hakkındaki bilgiyi yayınladı.', fx: {drift: muhalifMu(S) ? 0 : 0.04, stres: 1}}; }
    else if (rnd(S) < 0.3) { m.guven = clamp(m.guven - 3, 0, 100); sonuc = {ok: true, msg: 'Sızdırma ortaya çıktı; kaynağın sen olduğun yazıldı.', fx: {itibar: -2, stres: 2}}; }
    else sonuc = {ok: true, msg: m.ad + ' bilgiyi kullanmadı.', fx: {stres: 1}};
    return sonuc;
  }
  /* asılsız haber */
  var pe = clamp(0.22 + (100 - m.guven) / 500 + (gov ? 0.06 : 0), 0.15, 0.5); md.yalanSay = (md.yalanSay || 0) + 1;
  if (rnd(S) < pe) { m.guven = clamp(m.guven - 12, 0, 100); S.medya.forEach(function (x) { x.guven = clamp(x.guven - 2, 0, 100); }); return {ok: true, msg: 'Haberin asılsız olduğu ortaya çıktı; ' + m.ad + ' güven kaybetti ve sen de itibar yitirdin.', fx: {itibar: -5, birlik: -1, stres: 3}}; }
  mdRakipZarar(S, rid, 6, 0.95); m.guven = clamp(m.guven - 3, 0, 100);
  return {ok: true, msg: m.ad + ' haberi yayınladı; ' + rad + ' savunmaya geçti. Haberin yalanlanma riski sürüyor.', fx: {drift: muhalifMu(S) ? 0 : 0.07, stres: 2}};
}
function mdYakinlas(S, idx) {
  var md = mdInit(S), m = S.medya[+idx]; if (!m) return {ok: false, msg: 'Geçersiz yayın organı.'};
  var art = m.sahip === 'iktidar' && !(govMu(S, S.pid) && !muhalifMu(S)) ? 5 : 11; m.yakin = clamp(m.yakin + art, -100, 100); m.guven = clamp(m.guven - 2, 0, 100);
  var yan = m.yakin > 55 && rnd(S) < 0.3; if (yan) { m.guven = clamp(m.guven - 6, 0, 100); S.stat.itibar = clamp(S.stat.itibar - 1, 0, 100); }
  return {ok: true, msg: m.ad + ' ile ilişkiler ' + (art < 8 ? 'sınırlı ' : '') + 'ısındı (yakınlık ' + Math.round(m.yakin) + ').' + (yan ? ' Yayın "yandaş" olarak eleştirildi; güveni düştü.' : ''), fx: {stres: 1, itibar: 0.2}};
}
function mdTick(S) {
  var md = mdInit(S), haber = [], gov = govMu(S, S.pid) && !muhalifMu(S), st = S.stat;
  // yakınlık doğal tarafa yürür
  S.medya.forEach(function (m) { var h = mdTaraf(S, m); m.yakin = clamp(m.yakin + (h - m.yakin) * 0.05 + norm(S) * 0.6, -100, 100); });
  // pasif etki: yayın gücü x yakınlık x güven
  var dr = 0; S.medya.forEach(function (m) {
    var e = m.erisim / 100 * m.yakin / 100 * clamp(m.guven / 60, 0.4, 1.3); dr += e * 0.02;
    if (m.gr && m.gr.length) m.gr.forEach(function (g) { if (S.grup[g] !== undefined) S.grup[g] = clamp(S.grup[g] + e * 0.5, 0, 100); });
  });
  if (!muhalifMu(S)) st.drift += clamp(dr, -0.06, 0.06);
  rkInit(S); // yanlış haber yaşam döngüsü ve rakip yapay zekânın medya hamleleri
  var ym = md.yanlis;
  if (ym) {
    var ymo = S.medya[ym.idx], ya = S.ay - ym.ay;
    if (!muhalifMu(S)) { st.itibar = clamp(st.itibar - 0.35 * ym.sid, 0, 100); st.drift -= 0.015 * ym.sid * mdGuc(S); }
    if (ya >= 5) { if (ymo) ymo.guven = clamp(ymo.guven - 4, 0, 100); md.yanlis = null; var ym1 = 'Aleyhindeki asılsız haber kendiliğinden söndü; haberi yapan yayının güveni sarsıldı.'; haber.push(ym1); tarihceEkle(S, '📰', ym1); }
  } else if (!muhalifMu(S) && S.ay > 6) {
    var rvl = rakipler(S).filter(function (r) { return S.rk && S.rk[r.id] && S.rk[r.id].agresif > 0.45 && S.rk[r.id].guc > 35; });
    if (rvl.length && rnd(S) < 0.014) {
      var rr = pick(S, rvl), hi = 0, hv = 1e9; S.medya.forEach(function (m, j) { if (m.yakin < hv) { hv = m.yakin; hi = j; } });
      md.yanlis = {idx: hi, ay: S.ay, sid: 1 + (rnd(S) < 0.35 ? 1 : 0), kim: rr.id}; var ym2 = S.medya[hi].ad + ' ' + liderAdi(rr.id) + ' kaynaklı, ' + S.parti.ad + ' aleyhine bir haber yayınladı; iddialar doğrulanmış değil.'; haber.push(ym2); tarihceEkle(S, '📰', ym2); sonDakika(S, ym2); zincirEkle(S, 'xn_med_yalan', 1, 2, 0.5);
    }
  }
  md.manset = mdMansetler(S);
  // skandal zinciri
  var sk = md.sk;
  if (sk && sk.durum === 'bitti' && S.ay - sk.ay > 3) { md.gecmis.unshift({ad: sk.kisi, bakan: sk.bakan, taraf: sk.taraf, ay: sk.ay}); md.gecmis = md.gecmis.slice(0, 6); md.sk = sk = null; }
  if (!sk) {
    if (gov && S.bakanlar) {
      var key = mdSkandalSec(S), x = key && S.bakanlar[key], p = x ? 0.014 + (x.perf < 40 ? 0.022 : 0) + (x.ozel === 'hirsli' ? 0.01 : 0) : 0;
      if (key && rnd(S) < p) { var sd = 1 + (x.perf < 35 ? 1 : 0) + (rnd(S) < 0.25 ? 1 : 0); md.sk = {bakan: key, kisi: x.ad, siddet: Math.min(3, sd), evre: 0, ay: S.ay, durum: 'acik', taraf: 'oyuncu', kanit: Math.round(rn(S, 25, 90))}; x.perf = clamp(x.perf - 8, 0, 100); var bad = BAKANLIK.filter(function (b) { return b[1] === key; })[0][0]; var m = bad + ' Bakanı ' + x.ad + ' hakkında ağır iddialar basına yansıdı.'; haber.push(m); tarihceEkle(S, '🗞️', m); sonDakika(S, m); S.kuyruk.push({t: 'skandal', bakan: key, ad: x.ad, bad: bad, siddet: md.sk.siddet}); zincirEkle(S, 'xn_skandal_basin', 1, 2, 0.7); }
    } else if (!gov && rnd(S) < 0.012) {
      var lg = S.gov[0], kis = pick(S, AD_L) + ' ' + pick(S, SOYAD_L); md.sk = {bakan: null, kisi: kis, siddet: 1 + (rnd(S) < 0.4 ? 1 : 0), evre: 0, ay: S.ay, durum: 'acik', taraf: 'rakip', baski: 0}; var m3 = partiAdi(S, lg) + ' hükümetinde bir bakan hakkında skandal iddiaları gündemde.'; haber.push(m3); tarihceEkle(S, '🗞️', m3); sonDakika(S, m3);
    }
  } else if (sk.durum !== 'bitti') {
    var amp = mdGuc(S);
    if (sk.taraf === 'rakip') {
      sk.evre++; var lg2 = S.gov[0], r2 = S.rk && S.rk[lg2]; if (r2) r2.guc = clamp(r2.guc - 0.6 * sk.siddet * amp, 0, 100);
      if (sk.evre >= 3 + (sk.baski || 0)) { sk.durum = 'bitti'; haber.push('İktidardaki skandal gündemden düştü.'); }
    } else if (sk.durum === 'sorusturma') {
      st.itibar = clamp(st.itibar - 0.4 * sk.siddet * amp, 0, 100);
      if (S.ay >= sk.son) {
        if (rnd(S) < clamp(0.85 - (sk.kanit === undefined ? 55 : sk.kanit) / 100, 0.1, 0.7)) { sk.durum = 'bitti'; hafInit(S).skAtlat++; st.itibar = clamp(st.itibar + 1.5, 0, 100); if (S.bakanlar[sk.bakan]) S.bakanlar[sk.bakan].perf = clamp(S.bakanlar[sk.bakan].perf + 6, 0, 100); var mm = 'Soruşturma ' + sk.kisi + '\'nin temize çıktığını açıkladı.'; haber.push(mm); tarihceEkle(S, '🗞️', mm); }
        else { sk.durum = 'bitti'; mdYeniBakan(S, sk.bakan); st.itibar = clamp(st.itibar - 1, 0, 100); var mg = 'Soruşturma ' + sk.kisi + ' hakkında usulsüzlükleri doğruladı; bakan görevden alındı.'; haber.push(mg); tarihceEkle(S, '🗞️', mg); sonDakika(S, mg); }
      }
    } else {
      sk.evre++; st.itibar = clamp(st.itibar - 1.0 * sk.siddet * amp, 0, 100); if (sk.evre >= 2) st.birlik = clamp(st.birlik - 0.7 * amp, 0, 100);
      if (sk.evre >= 3) {
        sk.durum = 'bitti'; st.birlik = clamp(st.birlik - 5, 0, 100); S.ebs = clamp((S.ebs || 0) + 10, 0, 100); if (S.hzb) S.hzb.forEach(function (g) { g.sad = clamp(g.sad - 8, 0, 100); }); mdYeniBakan(S, sk.bakan);
        var kc = sk.kisi + ' skandalı parti krizine dönüştü; bakan baskıyla görevden alındı, hizip sadakati sarsıldı.'; haber.push(kc); tarihceEkle(S, '💥', kc); sonDakika(S, kc);
      }
    }
  }
  return haber;
}

/* ---------- Aşama 6: karakterler, ilişkiler, lider özellikleri, siyasi hafıza ---------- */
var UID_SAY = 1;
function hafInit(S) { if (!S.haf) S.haf = {aks: {}, parti: {}, kovulan: [], aday: null, skAtlat: 0, kov: 0, odul: 0, ozellik: {}}; return S.haf; }
function kisiler(S) {
  kadroInit(S); var out = [];
  S.kadro.forEach(function (k, i) { out.push({k: k, tip: 'kadro', ref: i, rol: k.rol}); });
  if (govMu(S, S.pid) && S.bakanlar) BAKANLIK.forEach(function (b) { if (S.bakanlar[b[1]]) out.push({k: S.bakanlar[b[1]], tip: 'bakan', ref: b[1], rol: b[0] + ' Bakanı'}); });
  Object.keys(S.bbs || {}).forEach(function (b) { out.push({k: S.bbs[b], tip: 'bolge', ref: b, rol: BOLGE[b] + ' Bölge Başkanı'}); });
  return out;
}
function kisiBul(S, uid) { if (!uid) return null; var L = kisiler(S); for (var i = 0; i < L.length; i++) if (L[i].k.uid === uid) return L[i]; return null; }
function ilisInit(S) {
  hafInit(S); var L = kisiler(S);
  L.forEach(function (x) { if (!x.k.uid) x.k.uid = (S.ay + 1) * 1000 + (UID_SAY++) + Math.floor(rnd(S) * 100) * 100000; });
  L.forEach(function (x) {
    var k = x.k; if (k.dost && !kisiBul(S, k.dost)) k.dost = null; if (k.rakip && !kisiBul(S, k.rakip)) k.rakip = null;
    if (!k.ilis) {
      k.ilis = 1; var diger = L.filter(function (y) { return y.k !== k && y.k.uid; });
      if (diger.length && rnd(S) < 0.55) { k.dost = diger[Math.floor(rnd(S) * diger.length)].k.uid; }
      if (diger.length && rnd(S) < (k.hirs > 60 ? 0.7 : 0.4)) { var r = diger[Math.floor(rnd(S) * diger.length)].k; if (r.uid !== k.dost) k.rakip = r.uid; }
    }
  });
  return L;
}
function ilisEtki(S, k, tip) {
  var L = kisiler(S), mesaj = [];
  L.forEach(function (x) {
    var p = x.k; if (p === k || !k.uid) return;
    if (p.dost === k.uid) { var d = tip === 'odul' ? 3 : (ozVar(S, 'sert') ? -9 : -7); p.sad = clamp(p.sad + d, 0, 100); if (d < -5) mesaj.push(p.ad + ' dostunun görevden alınmasına tepkili.'); }
    if (p.rakip === k.uid) { var d2 = tip === 'odul' ? -6 : 4; p.sad = clamp(p.sad + d2, 0, 100); if (d2 < -5) mesaj.push(p.ad + ' rakibinin ödüllendirilmesine içerledi.'); }
  });
  if (tip === 'odul' && k.uid) { var hr = L.filter(function (x) { return x.k !== k && x.k.hirs >= 65 && !x.k.rakip && x.k.dost !== k.uid; }); if (hr.length && rnd(S) < 0.4) { var rv = hr[Math.floor(rnd(S) * hr.length)].k; rv.rakip = k.uid; mesaj.push(rv.ad + ' ödüllendirilen ' + k.ad + '\'i rakip olarak görmeye başladı.'); } }
  if (tip === 'kov' && k.uid) L.forEach(function (x) { if (x.k.dost === k.uid) { x.k.dost = null; if (x.k.sad < 40 && rnd(S) < 0.5) x.k.rakip = null; } });
  return mesaj;
}
function kovulanKaydet(S, k, rol) { var h = hafInit(S); h.kov++; h.kovulan.unshift({ad: k.ad, rol: rol, ay: S.ay, sad: Math.max(5, k.sad - 12)}); h.kovulan = h.kovulan.slice(0, 8); }
var KAR_OZ = {
  sozlu: {ad: 'Sözünü tutan', ikon: '🤝', acik: 'Ortaklar ve seçmen güvenir: koalisyon pazarlığı kolaylaşır, itibar yavaşça yükselir.', kosul: function (S, h) { var z = S.sozler || []; return z.filter(function (x) { return x.durum === 'tutuldu'; }).length >= 3 && z.filter(function (x) { return x.durum === 'bozuldu'; }).length === 0; }},
  sozbozan: {ad: 'Sözünü bozan', ikon: '🥀', acik: 'Ortaklar temkinli: koalisyon pazarlığı zorlaşır, itibar yavaşça aşınır.', kosul: function (S, h) { return (S.sozler || []).filter(function (x) { return x.durum === 'bozuldu'; }).length >= 2; }},
  koalisyoncu: {ad: 'Koalisyoncu', ikon: '🕊️', acik: 'Koalisyon kurma becerisi: pazarlıkta ek avantaj.', kosul: function (S, h) { return (h.aks.koalisyon || 0) >= 2; }},
  kriz: {ad: 'Kriz yöneticisi', ikon: '🛡️', acik: 'Skandallar daha az hasar verir.', kosul: function (S, h) { return h.skAtlat >= 2; }},
  saha: {ad: 'Saha adamı', ikon: '🎤', acik: 'Mitinglerin etkisi %12 daha yüksek.', kosul: function (S, h) { return (h.aks.miting || 0) >= 8; }},
  medya: {ad: 'Medya dostu', ikon: '📰', acik: 'Medya aksiyonların daha etkili.', kosul: function (S, h) { return (h.aks.medyaili || 0) >= 4; }},
  yasa: {ad: 'Yasa makinesi', ikon: '📜', acik: 'Teklifler Meclis\'te daha kolay geçer.', kosul: function (S, h) { return S.mc && S.mc.sayac && S.mc.sayac.kabul >= 5; }},
  sert: {ad: 'Sert yönetici', ikon: '🔨', acik: 'Kadrodan çok isim gönderdin: sadakat korkuyla sağlanıyor ama dostlar tepkili.', kosul: function (S, h) { return h.kov >= 4; }}
};
function ozVar(S, id) { return !!(S.haf && S.haf.ozellik && S.haf.ozellik[id]); }
function ozellikTick(S) {
  var h = hafInit(S), haber = [];
  Object.keys(KAR_OZ).forEach(function (id) {
    var var1 = KAR_OZ[id].kosul(S, h);
    if (var1 && !h.ozellik[id]) { h.ozellik[id] = S.ay + 1; var m = 'Siyasi imzan: "' + KAR_OZ[id].ad + '" olarak anılmaya başlandın.'; haber.push(m); tarihceEkle(S, KAR_OZ[id].ikon, m); sonDakika(S, m); }
    else if (!var1 && h.ozellik[id] && (id === 'sozlu' || id === 'sozbozan')) delete h.ozellik[id];
  });
  if (ozVar(S, 'sozlu')) S.stat.itibar = clamp(S.stat.itibar + 0.08, 0, 100); if (ozVar(S, 'sozbozan')) S.stat.itibar = clamp(S.stat.itibar - 0.06, 0, 100);
  return haber;
}
function ilisTick(S) {
  var h = hafInit(S), L = ilisInit(S), haber = [], mine = !muhalifMu(S);
  if (mine) {
    if (ozVar(S, 'sert')) L.forEach(function (x) { x.k.sad = clamp(x.k.sad + 0.3, 0, 100); });
    // yaşayan ilişkiler: yeni dostluklar, rekabetler, boşalan bağların yenilenmesi
    var bos = L.filter(function (x) { return !x.k.dost && x.k.sad > 62; });
    if (bos.length >= 2 && rnd(S) < 0.035) { var ia = Math.floor(rnd(S) * bos.length), ib = Math.floor(rnd(S) * bos.length); if (ia !== ib && bos[ia].k.rakip !== bos[ib].k.uid && bos[ib].k.rakip !== bos[ia].k.uid) { bos[ia].k.dost = bos[ib].k.uid; bos[ib].k.dost = bos[ia].k.uid; var md1 = bos[ia].k.ad + ' ile ' + bos[ib].k.ad + ' yakınlaştı.'; haber.push(md1); tarihceEkle(S, '🤝', md1); } }
    var hrs = L.filter(function (x) { return !x.k.rakip && x.k.hirs >= 65; });
    if (hrs.length >= 2 && rnd(S) < 0.03) { var ja = Math.floor(rnd(S) * hrs.length), jb = Math.floor(rnd(S) * hrs.length); if (ja !== jb && hrs[ja].k.dost !== hrs[jb].k.uid && hrs[jb].k.dost !== hrs[ja].k.uid) { hrs[ja].k.rakip = hrs[jb].k.uid; hrs[jb].k.rakip = hrs[ja].k.uid; var md2 = hrs[ja].k.ad + ' ile ' + hrs[jb].k.ad + ' arasında rekabet büyüyor.'; haber.push(md2); tarihceEkle(S, '⚔️', md2); } }
    L.forEach(function (x) { var k = x.k, r = kisiBul(S, k.rakip); if (r && r.k.sad > 75 && k.sad < 35 && rnd(S) < 0.01) { S.stat.birlik = clamp(S.stat.birlik - 0.5, 0, 100); } });
    L.forEach(function (x) { var k = x.k, d = kisiBul(S, k.dost); if (d && d.k.sad < 30 && k.sad > 20) k.sad = clamp(k.sad - 0.5, 0, 100); });
    // hırslı aday
    if (h.aday) { var a = kisiBul(S, h.aday.uid); if (!a || a.k.sad >= 55 || a.k.hirs < 60) { h.aday = null; } else { S.stat.birlik = clamp(S.stat.birlik - 0.3, 0, 100); h.aday.guc = Math.min(40, h.aday.guc + 0.8); } }
    else {
      var cand = L.filter(function (x) { return x.k.hirs >= 75 && x.k.sad < 40; });
      if (cand.length && rnd(S) < 0.03 * cand.length) { var c = cand[Math.floor(rnd(S) * cand.length)]; h.aday = {uid: c.k.uid, ad: c.k.ad, rol: c.rol, guc: 10}; var m = c.k.ad + ' (' + c.rol + ') genel başkanlığa göz dikti; kulislerde destek topluyor.'; haber.push(m); tarihceEkle(S, '🗡️', m); sonDakika(S, m); }
    }
    // eski isimlerin sözleri
    var kv = h.kovulan, amp = mdGuc(S);
    for (var i = kv.length - 1; i >= 0; i--) {
      var e = kv[i], r = rnd(S);
      if (S.ay - e.ay >= 2 && e.sad < 45 && r < 0.03) { S.stat.itibar = clamp(S.stat.itibar - 1.2 * amp * (ozVar(S, 'kriz') ? 0.85 : 1), 0, 100); S.stat.birlik = clamp(S.stat.birlik - 1, 0, 100); var m2 = 'Görevden alınan ' + e.ad + ' (' + e.rol + ') basına konuştu: yönetimi sert eleştirdi.'; haber.push(m2); tarihceEkle(S, '🎙️', m2); sonDakika(S, m2); kv.splice(i, 1); }
      else if (S.ay - e.ay >= 2 && e.sad >= 55 && r < 0.02) { S.stat.itibar = clamp(S.stat.itibar + 1, 0, 100); var m3 = e.ad + ' görevden alınmasına rağmen seni kamuoyu önünde savundu.'; haber.push(m3); tarihceEkle(S, '🎙️', m3); kv.splice(i, 1); }
      else if (S.ay - e.ay > 24) kv.splice(i, 1);
    }
  }
  return haber.concat(ozellikTick(S));
}
function ilisOzet(S) {
  var L = ilisInit(S), dost = [], rak = [];
  L.forEach(function (x) { var d = kisiBul(S, x.k.dost), r = kisiBul(S, x.k.rakip); if (d) dost.push([x.k.ad, d.k.ad]); if (r) rak.push([x.k.ad, r.k.ad]); });
  return {dost: dost, rakip: rak};
}
function partiHafiza(S, id) { var h = hafInit(S); return h.parti[id] || (h.parti[id] = {yardim: 0, ihanet: 0}); }
KARTLAR_E.push(
 C('xk_hirsli', 'siyaset', 'Hırslı İsim Kulis Yapıyor', 'Kadrodan hırslı bir isim, genel başkanlık için delegelerle gizli görüşmeler yapıyor.', function (S) { return !muhalifMu(S) && S.haf && S.haf.aday; }, [
  ['Üst görev vererek yanına çek', {birlik: 2, kasa: -.1, stres: 1}, 'Gerilim düştü ama diğerleri de talep etmeye başladı.', [.3, {birlik: -2}, 'Diğer isimler adaletsizlikten şikâyet etti.']],
  ['Açıkça uyar', {birlik: -2, itibar: .5, stres: 2}, 'Mesajın alındı; kulis seslendirmesi azaldı.', [.35, {itibar: -2}, 'Uyarı basına yansıdı.']],
  ['Görmezden gel', {birlik: -3, drift: -.05}, 'Kulis çalışması büyüdü.']]),
 C('xk_eski', 'siyaset', 'Eski Yönetici Konuşuyor', 'Görevden aldığın bir isim yeni bir röportaj verdi.', function (S) { return !muhalifMu(S) && S.haf && S.haf.kovulan && S.haf.kovulan.length > 0; }, [
  ['Kısa yanıt ver', {itibar: -.5, drift: .03}, 'Yanıtın konuyu kapattı.'],
  ['Sessiz kal', {itibar: -1.5}, 'Sessizlik eleştiri çekti.'],
  ['Barış jesti yap', {birlik: 1, kasa: -.1, itibar: .5}, 'Kapı aralandı; kamuoyu olumlu karşıladı.']]),
 C('xk_klik', 'siyaset', 'Kadroda İki Klik Çatıştı', 'Parti kadrosunda rakip iki isim kamuoyu önünde birbirini eleştirdi.', function (S) { return !muhalifMu(S) && S.kadro && S.kadro.some(function (k) { return k.rakip; }); }, [
  ['Arabulucu ol', {birlik: 2, stres: 2}, 'Taraflar uzlaştı, tansiyon düştü.'],
  ['Yetkili olanı destekle', {birlik: -1, itibar: .5}, 'Karar net; kaybeden taraf içerledi.', [.3, {birlik: -2}, 'Yenilen taraf kulis çalışmasına başladı.']],
  ['Karışma', {birlik: -2}, 'Tartışma birkaç gün sürdü.']]),
 C('xk_soz', 'siyaset', 'Eski Söz Hatırlatıldı', 'Muhalefet geçmişteki bir vaadini kamuoyuna hatırlattı.', function (S) { return !muhalifMu(S) && (S.sozler || []).some(function (z) { return z.durum === 'acik'; }); }, [
  ['Takvim açıkla', {itibar: 1, drift: .04, stres: 2}, 'Net takvim güven verdi.', [.25, {itibar: -2}, 'Takvim gerçekçi bulunmadı.']],
  ['Geçiştir', {itibar: -1.5}, 'Cevap vermemen eleştirildi.'],
  ['Karşı atağa geç', {drift: .06, itibar: -.5, birlik: 1}, 'Gündem değişti ama tartışma sürdü.', [.3, {itibar: -2}, 'Tepki çekti.']]])
);

/* ---------- Aşama 7: sistemlere bağlı olay ağı ---------- */
function zincirEkle(S, id, min, max, p) { S.zincirSon = S.zincirSon || {}; if (S.zincirSon[id] !== undefined && S.ay - S.zincirSon[id] < 8) return; if (rnd(S) >= p) return; S.zincir = S.zincir || []; if (S.zincir.some(function (z) { return z.id === id; })) return; S.zincirSon[id] = S.ay; S.zincir.push({ay: S.ay + min + Math.floor(rnd(S) * (max - min + 1)), id: id, k: S.kadro && S.kadro.length ? S.kadro[0].ad : '', s: ''}); }
function mdSkandalBaslat(S) {
  var md = mdInit(S); if (md.sk || !(govMu(S, S.pid) && !muhalifMu(S)) || !S.bakanlar) return false;
  var key = mdSkandalSec(S), x = key && S.bakanlar[key]; if (!x) return false;
  md.sk = {bakan: key, kisi: x.ad, siddet: 1 + (rnd(S) < 0.4 ? 1 : 0), evre: 0, ay: S.ay, durum: 'acik', taraf: 'oyuncu', kanit: Math.round(rn(S, 25, 90))}; x.perf = clamp(x.perf - 8, 0, 100);
  var bad = BAKANLIK.filter(function (b) { return b[1] === key; })[0][0]; var m = bad + ' Bakanı ' + x.ad + ' hakkında ağır iddialar basına yansıdı.'; tarihceEkle(S, '🗞️', m); sonDakika(S, m); S.kuyruk.push({t: 'skandal', bakan: key, ad: x.ad, bad: bad, siddet: md.sk.siddet}); return true;
}
function fxSis(S, sx) {
  var m = [], gov = govMu(S, S.pid) && !muhalifMu(S);
  if (sx.bldPerf) { var b = bldInit(S), c = 0; for (var i = 0; i < 81; i++) if (b.sahip[i] === S.pid) { b.perf[i] = clamp(b.perf[i] + sx.bldPerf, 0, 100); c++; } if (c) m.push('Belediyelerin performansı ' + (sx.bldPerf > 0 ? 'yükseldi.' : 'düştü.')); }
  if (sx.yakinMedya) { var q = sx.yakinMedya; mdInit(S); S.medya.forEach(function (y) { if (!q.tur || y.tur === q.tur) y.yakin = clamp(y.yakin + q.v, -100, 100); }); m.push((q.tur ? 'İlgili yayınlarla' : 'Medyayla') + ' ilişkiler ' + (q.v > 0 ? 'ısındı.' : 'soğudu.')); }
  if (sx.guven) { mdInit(S); S.medya.forEach(function (y) { y.guven = clamp(y.guven + sx.guven, 0, 100); }); }
  if (sx.ebs) { S.ebs = clamp((S.ebs || 0) + sx.ebs, 0, 100); m.push('Erken seçim baskısı ' + (sx.ebs > 0 ? 'arttı.' : 'azaldı.')); }
  if (sx.erken && erkenUygun(S).ok) m.push(erkenSecimIlan(S, 'olayların ardından'));
  if (sx.hzbSad && S.hzb) { S.hzb.forEach(function (g) { g.sad = clamp(g.sad + sx.hzbSad, 0, 100); }); m.push('Hizip sadakati ' + (sx.hzbSad > 0 ? 'güçlendi.' : 'sarsıldı.')); }
  if (sx.ortak) { var oc = 0; S.gov.forEach(function (id) { if (id !== S.pid) { S.yk[id] = clamp((S.yk[id] || 0) + sx.ortak, -50, 50); oc++; } }); if (oc) m.push('Koalisyon ortaklarıyla ilişkiler ' + (sx.ortak > 0 ? 'iyileşti.' : 'kötüleşti.')); }
  if (sx.bakanPerf && S.bakanlar) { BAKANLIK.forEach(function (bk) { var x = S.bakanlar[bk[1]]; if (x) x.perf = clamp(x.perf + sx.bakanPerf, 0, 100); }); m.push('Bakanların performansı ' + (sx.bakanPerf > 0 ? 'arttı.' : 'düştü.')); }
  if (sx.kadroSad) { S.kadro.forEach(function (k) { k.sad = clamp(k.sad + sx.kadroSad, 0, 100); }); m.push('Kadro sadakati ' + (sx.kadroSad > 0 ? 'arttı.' : 'düştü.')); }
  if (sx.skandal && mdSkandalBaslat(S)) m.push('Bir bakan hakkında iddialar basına sızdı.');
  if (sx.org) { for (var j = 0; j < 81; j++) if (S.org[j] > 0) S.org[j] = clamp(S.org[j] + sx.org, 0, 100); m.push('Teşkilat ' + (sx.org > 0 ? 'güçlendi.' : 'zayıfladı.')); }
  return m.join(' ');
}
function G7(S) { return govMu(S, S.pid) && !muhalifMu(S); }
function O7(S) { return !govMu(S, S.pid) && !muhalifMu(S); }
KARTLAR_E.push(
 // ---- Meclis ----
 C('xn_tikanma', 'siyaset', 'Muhalefet Meclis\'i Tıkıyor', 'Muhalefet, Meclis\'teki teklifler için önergelerle takvimi yavaşlatıyor.', function (S) { return G7(S) && mcInit(S).teklif.some(function (b) { return b.durum === 'komisyon' || b.durum === 'genel'; }); }, [
  ['Gece oturumu iste', {stres: 3, birlik: 1, itibar: -.5}, 'Teklifler hız kazandı ama grup yoruldu.', null, {hzbSad: 2}],
  ['Uzlaşı masası kur', {itibar: 1, stres: 1}, 'Masa gerilimi azalttı.', null, {ortak: 2}],
  ['Önergeyi çek', {itibar: -1.5}, 'Geri adım eleştirildi.']]),
 C('xn_komisyon', 'siyaset', 'Komisyon Başkanı Direniyor', 'Muhalefete ait bir komisyonun başkanı teklifleri gündemden düşürmekle tehdit ediyor.', function (S) { if (!G7(S)) return false; var kd = komisyonDagilim(S); return Object.keys(kd).some(function (k) { return !govMu(S, kd[k]); }); }, [
  ['Başkanla görüş', {itibar: .5, stres: 1}, 'Görüşme gerilimi yumuşattı.', [.3, {itibar: -1}, 'Görüşme basına sızdı.']],
  ['Teklifleri yeniden yaz', {drift: .02, stres: 2}, 'Metinler uzlaşıya uygun hâle geldi.'],
  ['Kamuoyuna taşı', {drift: .06, birlik: 1, itibar: -.5}, 'Gündem sende ama komisyon sertleşti.']]),
 C('xn_grup_sarsinti', 'parti', 'Grupta Disiplin Sorunu', 'Birkaç milletvekili grup kararına uymayacağını açıkladı.', function (S) { return G7(S) && S.hzb && grupOrtSad(S) < 55; }, [
  ['Grup toplantısı yap', {birlik: 2, stres: 2}, 'Toplantı sorunu kısmen çözdü.', null, {hzbSad: 4}],
  ['Disipline sevk et', {birlik: -2, itibar: .5}, 'Mesaj verildi, gerilim arttı.', null, {hzbSad: -3}],
  ['Kendi hâline bırak', {birlik: -1}, 'Konu büyümeden söndü.', [.3, {birlik: -2, itibar: -1}, 'Haber ana akıma taşındı.']]]),
 C('xn_gensoru_hazirlik', 'siyaset', 'Muhalefet Gensoru Hazırlıyor', 'Muhalefet performansı düşük bir bakan hakkında gensoru önergesi hazırlıyor.', function (S) { return G7(S) && S.bakanlar && BAKANLIK.some(function (b) { return S.bakanlar[b[1]].perf < 45; }); }, [
  ['Bakana çalışma planı ver', {kasa: -.2, itibar: .5}, 'Bakan hızla bir plan sundu.', null, {bakanPerf: 4}],
  ['Karşı açıklama yap', {drift: .03, itibar: .5, stres: 1}, 'Muhalefetin iddiaları zayıfladı.'],
  ['Sessiz kal', {itibar: -1.5}, 'Sessizlik zayıflık olarak görüldü.', [.3, {itibar: -1}, 'Önerge gündeme geldi.']]]),
 C('xn_arbede', 'siyaset', 'Genel Kurulda Arbede', 'Oturumda tartışma yumruklaşmaya döndü; görüntüler hızla yayıldı.', function (S) { return S.ay > 4 && !muhalifMu(S); }, [
  ['Soğukkanlılık çağrısı yap', {itibar: 1.5, stres: 1}, 'Çağrın kamuoyunda olumlu karşılandı.', null, {yakinMedya: {v: 2}}],
  ['Karşı tarafı suçla', {drift: .05, itibar: -1, birlik: 1}, 'Taraftarlar memnun, taraflar sertleşti.'],
  ['Konuyu geç', {}]]),
 C('xn_yasa_halk', 'siyaset', 'Yasa Sokakta Tartışılıyor', 'Yakın zamanda geçen bir yasa sokakta tartışma yarattı.', function (S) { var g = S.mc && S.mc.gecmis && S.mc.gecmis[0]; return !muhalifMu(S) && g && g.sonuc === 'kabul' && S.ay - g.ay <= 3; }, [
  ['Kamuoyunda savun', {itibar: 1, stres: 2, drift: .04}, 'Gerekçeler kamuoyunda duyuldu.', [.25, {itibar: -1.5}, 'Tepkiler dinmedi.']],
  ['Düzenleme sözü ver', {itibar: 1.5, birlik: -1}, 'Esneklik ılımlı karşılandı.'],
  ['Cevap verme', {itibar: -1}]]),
 C('xn_butce_muz', 'ekonomi', 'Bütçe Müzakeresi Kızıştı', 'Bütçe görüşmelerinde ortaklar ve muhalefet farklı kalemler istiyor.', function (S) { return G7(S) && S.makro.enf > 35; }, [
  ['Ortaklara taviz ver', {kasa: -.3, birlik: 1}, 'Uzlaşı sağlandı ama bütçe esnedi.', null, {ortak: 4}],
  ['Tasarruf programı sun', {itibar: 1, birlik: -1, drift: .03}, 'Program ciddiyet mesajı verdi.', null, {ortak: -2}],
  ['Erteleme iste', {itibar: -1.5, stres: 2}, 'Erteleme eleştirildi.', null, {ebs: 3}]]),
 // ---- Koalisyon ve erken seçim ----
 C('xn_ortak_talep', 'siyaset', 'Ortak Yeni Bakanlık İstiyor', 'Koalisyon ortağı, hükümetteki payını artırmak için ek bakanlık talep ediyor.', function (S) { return G7(S) && S.gov.length > 1; }, [
  ['Bir bakanlık ver', {birlik: -1, itibar: -.5}, 'Ortak memnun; kadroda homurtu var.', null, {ortak: 8}],
  ['Programı hatırlat', {itibar: .5}, 'Ortak sert ama uzlaşmacı çıktı.', null, {ortak: -2}],
  ['Reddet', {itibar: .5, birlik: 1}, 'Net duruş parti içinde beğenildi.', null, {ortak: -7}]]),
 C('xn_ortak_ayril', 'siyaset', 'Ortaktan Ayrılık Sinyali', 'Koalisyon ortağının liderinden hükümet politikalarına açık eleştiri geldi.', function (S) { if (!G7(S) || S.gov.length < 2) return false; var o = S.gov.filter(function (id) { return id !== S.pid; }); return o.some(function (id) { return (S.yk[id] || 0) < 10; }); }, [
  ['Zirve toplantısı iste', {kasa: -.1, stres: 2}, 'Zirve ilişkileri onardı.', null, {ortak: 7}],
  ['Çıkmasına izin ver', {itibar: -1, birlik: -1}, 'Ortak ayrılma yolunu seçti.', null, {ebs: 5}],
  ['Erken seçim kozunu kullan', {stres: 3, itibar: -1}, 'Seçim kararı ortağa mesaj verdi.', null, {erken: 1}]]),
 C('xn_erken_spek', 'siyaset', 'Erken Seçim Spekülasyonu', 'Kulislerde erken seçim tartışılıyor; haberler her gün farklı tarihler veriyor.', function (S) { return !muhalifMu(S) && (S.ebs || 0) > 35; }, [
  ['Kesin yalanla', {itibar: 1, stres: 1}, 'Net açıklama spekülasyonu azalttı.', null, {ebs: -12}],
  ['Belirsizliği koru', {drift: .03, stres: 2}, 'Rakipler hazırlıksız yakalanma riskine girdi.', null, {ebs: 6}],
  ['Teşkilatı hazırla', {kasa: -.3, stres: 2}, 'Saha hazırlığı hız kazandı.', null, {org: 1.5}]]),
 C('xn_azinlik', 'siyaset', 'Azınlık Hükümeti Zorlanıyor', 'Meclis çoğunluğu olmayan hükümet her oylamada pazarlıkla ilerliyor.', function (S) { return G7(S) && !hukumetDurum(S).cogunluk; }, [
  ['Ortak ara', {kasa: -.2, stres: 2}, 'Görüşmeler olumlu başladı.', null, {ortak: 4}],
  ['Bağımsızları ikna et', {kasa: -.3, itibar: -.5}, 'Birkaç destek sağlandı.', null, {hzbSad: 2}],
  ['Güvenoyu riskini al', {stres: 3, itibar: .5}, 'Cesaret mesajı verdin ama risk büyüdü.', null, {ebs: 6}]]),
 // ---- Belediye ----
 C('xn_bld_su', 'siyaset', 'Belediyede Su Baskını', 'Yönettiğin bir ilde sağanak yağış su baskınlarına yol açtı.', function (S) { return !muhalifMu(S) && bldSayi(S) >= 3; }, [
  ['Acil yardım gönder', {kasa: -.3, itibar: 1.5}, 'Ekipler bölgeye hızla ulaştı.', null, {bldPerf: 3}],
  ['Başkanı bölgeye yolla', {itibar: .5, stres: 1}, 'Ziyaret moral verdi.'],
  ['Beklet', {itibar: -2}, 'Tepkiler arttı.', null, {bldPerf: -3}]]),
 C('xn_bld_maas', 'ekonomi', 'Belediyelerde Maaş Krizi', 'Enflasyon belediye bütçelerini zorluyor; işçiler maaşlarını bekliyor.', function (S) { return !muhalifMu(S) && bldSayi(S) >= 3 && S.makro.enf > 35; }, [
  ['Merkezî destek sağla', {kasa: -.4, itibar: 1}, 'Kaynak kısa vadeli rahatlık sağladı.', null, {bldPerf: 4}],
  ['Tasarruf iste', {birlik: 1, itibar: -.5}, 'Başkanlar zorlandı.', null, {bldPerf: -3}],
  ['Kendi çözümlerini bulsunlar', {birlik: -2}, 'Başkanlar yalnız bırakıldığını düşünüyor.', null, {bldPerf: -5}]]),
 C('xn_bld_sosyal', 'siyaset', 'Sosyal Belediyecilik Atağı', 'Başarılı belediyelerin kreş ve ucuz ekmek uygulamaları dikkat çekti.', function (S) { return !muhalifMu(S) && bldOzet(S).iyi >= 2; }, [
  ['Uygulamayı yaygınlaştır', {kasa: -.3, itibar: 1.5, drift: .06}, 'Model diğer illere taşındı.', null, {bldPerf: 3}],
  ['Başkanları ödüllendir', {birlik: 1, kasa: -.1}, 'Moral yükseldi.'],
  ['Kayda geçir', {itibar: .5}]]),
 C('xn_bld_rakip', 'siyaset', 'Rakip Belediyede Skandal', 'Rakip bir partinin belediyesinde usulsüzlük iddiaları gündemde.', function (S) { return !muhalifMu(S) && S.ay > 6; }, [
  ['Konuyu büyüt', {drift: .06, itibar: -.5, stres: 1}, 'Gündem senin lehine kaydı.', [.3, {itibar: -1.5}, 'Karşı kampanya başladı.'], {yakinMedya: {tur: 'gazete', v: 3}}],
  ['Yorum yapma', {itibar: .5}, 'Ölçülü tavır olumlu görüldü.'],
  ['Denetim çağrısı yap', {itibar: 1, drift: .03}, 'Şeffaflık çağrısı destek buldu.']]),
 C('xn_bld_yerel', 'siyaset', 'Yerel Seçim Hazırlığı: Başarılı Belediyeler', 'Yerel seçime yaklaşılırken belediye başarıları kampanya malzemesi olabilir.', function (S) { return !muhalifMu(S) && bldSayi(S) >= 3 && S.takvim.some(function (t) { var d = t.y * 12 + t.m - tarihNo(S.tarih); return t.tip === 'yerel' && d > 0 && d < 9; }); }, [
  ['Başarıları öne çıkar', {drift: .07, kasa: -.2}, 'Kampanya olumlu karşılandı.', null, {bldPerf: 2}],
  ['Aday havuzunu genişlet', {birlik: 1, stres: 1}, 'Yeni isimler gündeme geldi.'],
  ['Sessiz kal', {}]]),
 // ---- Medya ----
 C('xn_med_patron', 'medya', 'Medya Patronu Randevu İstiyor', 'Büyük bir televizyon grubunun sahibi seninle yüz yüze görüşmek istiyor.', function (S) { return S.ay > 3 && !muhalifMu(S); }, [
  ['Görüş', {itibar: -.5, stres: 1}, 'Görüşme olumlu geçti; gazeteciler kuşkulu.', null, {yakinMedya: {tur: 'tv', v: 8}}],
  ['Reddet', {itibar: .5}, 'Mesafe korundu.', null, {yakinMedya: {tur: 'tv', v: -6}}],
  ['Heyetini gönder', {itibar: 0}, 'Orta yol temkinli karşılandı.', null, {yakinMedya: {tur: 'tv', v: 2}}]]),
 C('xn_med_gazeteci', 'medya', 'Gazeteciye Soruşturma', 'Eleştirel bir gazeteci hakkında soruşturma açıldı.', function (S) { return S.ay > 3 && !muhalifMu(S); }, [
  ['Açıkça eleştir', {itibar: 1, stres: 1}, 'Duruşun basın özgürlüğü çevrelerinde yankı buldu.', null, {yakinMedya: {tur: 'gazete', v: 6}}],
  ['Yorum yapma', {itibar: -.5}, 'Sessizlik tartışıldı.'],
  ['Yargıya güven mesajı ver', {itibar: -1, birlik: 1}, 'Mesaj iki kesimi de memnun etmedi.', null, {yakinMedya: {tur: 'gazete', v: -4}}]]),
 C('xn_med_dijital', 'medya', 'Dijital Platform Kampanyası', 'Gençlerin takip ettiği dijital yayınlar seninle ortak bir kampanya yapmak istiyor.', function (S) { return S.ay > 2 && !muhalifMu(S); }, [
  ['Kabul et', {grup: {gencler: 4}, kasa: -.2, drift: .05}, 'Kampanya gençlerde karşılık buldu.', [.2, {itibar: -1}, 'Eski paylaşımların gündeme geldi.'], {yakinMedya: {tur: 'dijital', v: 6}}],
  ['Reddet', {itibar: 0}, 'Fırsat kaçtı.'],
  ['Sınırlı iş birliği', {grup: {gencler: 2}, itibar: .5}, 'Temkinli adım memnuniyet yarattı.', null, {yakinMedya: {tur: 'dijital', v: 3}}]]),
 C('xn_med_yalan', 'medya', 'Yalan Haber Dolaşımda', 'Parti hakkında yalan bir haber sosyal medyada hızla yayılıyor.', function (S) { return !muhalifMu(S) && S.ay > 3; }, [
  ['Düzeltme yayınla', {itibar: 1, stres: 1}, 'Düzeltme kısa sürede yankı buldu.', null, {guven: 2}],
  ['Hukuki yola git', {kasa: -.2, itibar: .5}, 'Süreç başladı.'],
  ['Görmezden gel', {itibar: -2}, 'Haber yerleşti.', null, {guven: -2}]]),
 C('xn_med_canli', 'medya', 'Ana Haber Canlı Yayın Daveti', 'Ana haber bülteni seni canlı yayına davet etti; muhalif sunucu zor sorular hazırladı.', function (S) { return !muhalifMu(S) && S.ay > 3; }, [
  ['Katıl', {itibar: 1, drift: .08, stres: 3}, 'Performansın kamuoyunda iz bıraktı.', [.35, {itibar: -4, drift: -.15}, 'Zor bir soruda tökezledin.']],
  ['Yazılı yanıt gönder', {itibar: 0, stres: 1}, 'Yanıt kısaydı, sessiz geçti.'],
  ['Reddet', {itibar: -1}, 'Kaçış olarak yorumlandı.']]),
 C('xn_med_anket', 'medya', 'Anket Şirketi Tartışması', 'Bir anket şirketinin sonuçlarının yönlendirildiği iddia ediliyor.', function (S) { return !muhalifMu(S) && S.ay > 3; }, [
  ['Kendi anketini yayınla', {kasa: -.2, drift: .05}, 'Yayın tartışmayı dengeledi.'],
  ['Metodoloji iste', {itibar: 1}, 'Şeffaflık çağrısı destek buldu.', null, {guven: 1}],
  ['Tepki göster', {itibar: -1, birlik: 1}, 'Tepkin tartışmayı büyüttü.']]),
 C('xn_med_muh_sk', 'medya', 'İktidar Skandalı Basında', 'Hükümetle ilgili bir skandal haberi gündemin üst sırasına yerleşti.', function (S) { return O7(S) && S.md && S.md.sk && S.md.sk.taraf === 'rakip' && S.md.sk.durum !== 'bitti'; }, [
  ['Büyüt', {drift: .08, itibar: -.5, stres: 2}, 'Gündemi sen belirledin.', [.25, {itibar: -2}, 'Aşırı tutum eleştirildi.'], {ebs: 4}],
  ['Soru önergesi ver', {itibar: 1, drift: .03}, 'Önerge ciddi karşılandı.'],
  ['Susmayı seç', {itibar: -.5}]]),
 // ---- Karakter ----
 C('xn_kar_hirs_bakan', 'parti', 'Hırslı Bakan Gövde Gösterisi Yapıyor', 'Bakanlardan biri basında sürekli kendi adına açıklama yapıyor; hükümetten bağımsız davranıyor.', function (S) { return G7(S) && S.bakanlar && BAKANLIK.some(function (b) { return S.bakanlar[b[1]].hirs >= 70; }); }, [
  ['Özel olarak uyar', {birlik: 1, stres: 1}, 'Bakan geri çekildi.', [.3, {birlik: -2}, 'Uyarı sızdırıldı.']],
  ['Açıkça yetki sınırı çiz', {itibar: .5, birlik: -2}, 'Otorite mesajı verdin.', null, {bakanPerf: -2}],
  ['Daha fazla yetki ver', {birlik: 2, kasa: -.1}, 'Bakan şimdilik yatıştı.', null, {bakanPerf: 2}]]),
 C('xn_kar_genc', 'parti', 'Genç Kadro Yükseliyor', 'Kadrodaki genç bir isim yetkinliğiyle öne çıkıyor.', function (S) { return !muhalifMu(S) && S.kadro && S.kadro.some(function (k) { return k.yet > 70 && k.hirs < 55; }); }, [
  ['Terfi ver', {birlik: 2, kasa: -.1}, 'Genç kadro motive oldu.', null, {kadroSad: 3}],
  ['Mentorluk programı kur', {birlik: 1, stres: 1}, 'Program olumlu karşılandı.'],
  ['Beklet', {birlik: -1}]]),
 C('xn_kar_sadakat', 'parti', 'Kadroda Güven Sorunu', 'Kadronun bir bölümü kararlara katılımın azaldığını söylüyor.', function (S) { if (muhalifMu(S) || !S.kadro) return false; var t = 0; S.kadro.forEach(function (k) { t += k.sad; }); return t / S.kadro.length < 45; }, [
  ['Başkanlık toplantısı yap', {birlik: 2, stres: 2}, 'Toplantı havayı yumuşattı.', null, {kadroSad: 6}],
  ['Bireysel görüşmeler yap', {birlik: 1, stres: 3}, 'Teker teker görüşmeler yararlı oldu.', null, {kadroSad: 4}],
  ['Otoriteni koru', {birlik: -2, itibar: .5}, 'Kadro suskunlaştı.', null, {kadroSad: -3}]]),
 C('xn_kar_portre', 'medya', 'Portre Röportajı Teklifi', 'Saygın bir dergi, liderliğini anlatan bir portre röportajı yapmak istiyor.', function (S) { return !muhalifMu(S) && S.ay > 6; }, [
  ['Kişisel hikâyeni anlat', {itibar: 1.5, stres: 1}, 'Röportaj insani bir portre çizdi.', [.25, {itibar: -2}, 'Bir cümlen bağlamından koparıldı.']],
  ['Programına odaklan', {itibar: .5, drift: .04}, 'Röportaj programını öne çıkardı.'],
  ['Reddet', {itibar: -.5}]]),
 // ---- Karargâh, il ve hizip ----
 C('xn_il_kriz', 'parti', 'İl Başkanları Arasında Çatışma', 'İki komşu ilin başkanları aday listesinde birbirine karşı çıkıyor.', function (S) { return !muhalifMu(S) && S.ay > 4; }, [
  ['Arabulucu ol', {birlik: 2, stres: 2}, 'Taraflar uzlaştı.', null, {org: .5}],
  ['Taraf tut', {birlik: -2, itibar: .5}, 'Kazanan taraf güçlendi, kaybeden küstü.', null, {org: -.5}],
  ['Bölge başkanına devret', {birlik: 0}, 'Süreç bölge düzeyinde çözüldü.']]),
 C('xn_il_miting', 'secmen', 'Büyük Miting Talebi', 'Teşkilatın güçlü olduğu bir il büyük bir miting yapmak istiyor.', function (S) { return !muhalifMu(S) && teskilatSayisi(S) >= 12; }, [
  ['Kabul et', {kasa: -.5, drift: .1, stres: 3}, 'Miting güçlü bir görüntü verdi.', [.25, {itibar: -1.5}, 'Katılım beklentinin altında kaldı.'], {org: 1}],
  ['Küçük etkinlik öner', {kasa: -.1, drift: .03}, 'Teşkilat ılımlı karşıladı.'],
  ['Ertele', {birlik: -1}]]),
 C('xn_hizip_sol', 'parti', 'Sol Kanat Bildirisi', 'Partinin sol kanadı ekonomik programın sertleştirilmesi için bildiri yayınladı.', function (S) { return !muhalifMu(S) && S.hzb; }, [
  ['Bildiriyi kabul et', {birlik: 1, itibar: -.5, grup: {isciler: 3}}, 'Sol kanat memnun, diğerleri tedirgin.', null, {hzbSad: 2}],
  ['Uzlaşı metni yaz', {birlik: 2, stres: 2}, 'Ortak metin kanatları yaklaştırdı.'],
  ['Reddet', {birlik: -2}, 'Kanat içerledi.', null, {hzbSad: -3}]]),
 C('xn_hizip_muh', 'parti', 'Muhafazakâr Kanat Direniyor', 'Partinin muhafazakâr kanadı yakın dönemdeki söylemden rahatsız olduğunu duyurdu.', function (S) { return !muhalifMu(S) && S.hzb; }, [
  ['Kanat temsilcileriyle görüş', {birlik: 1.5, stres: 1}, 'Karşılıklı anlayış sağlandı.', null, {hzbSad: 3}],
  ['Söylemi yumuşat', {itibar: -.5, birlik: 1}, 'Söylem değişimi fark edildi.', null, {hzbSad: 2}],
  ['Aynı çizgide ilerle', {birlik: -2, drift: .02}, 'Direniş sürdü.', null, {hzbSad: -3}]])
);
[
 C('xn_skandal_basin', 'medya', 'Skandal Manşetlerde', 'Bakan hakkındaki iddialar bu kez daha ayrıntılı belgelerle birkaç gazetenin manşetinde.', function () { return true; }, [
  ['Ayrıntılı açıklama yap', {itibar: 1, stres: 2}, 'Açıklama sorulara yanıt verdi.', null, {guven: -1}],
  ['Basın yasağı iste', {itibar: -3}, 'Talep tepki çekti.', null, {yakinMedya: {v: -6}}],
  ['Sessiz kal', {itibar: -1.5}, 'Sessizlik büyüttü.']], {z: 1}),
 C('xn_kabine_yeni', 'siyaset', 'Yeni Kabine İlk Sınavda', 'Yeni kurulan kabine ilk günlerinde kamuoyuyla buluşuyor.', function () { return true; }, [
  ['Programı açıkla', {itibar: 1, drift: .04}, 'Program net bir mesaj verdi.', null, {bakanPerf: 3}],
  ['Bakanları sahaya çıkar', {stres: 2, drift: .03}, 'Bakanlar sahada izlendi.', null, {bakanPerf: 2}],
  ['Sessiz kal', {itibar: -.5}]], {z: 1}),
 C('xn_erken_kampanya', 'secmen', 'Erken Seçim Kampanyası Başladı', 'Seçim tarihi öne çekildi; partiler kampanyaya geçti.', function () { return true; }, [
  ['Sahaya in', {drift: .1, stres: 3, kasa: -.4}, 'Sahada yoğun hafta başladı.', null, {org: 1.5}],
  ['Medya ağırlıklı yürüt', {drift: .06, kasa: -.2}, 'Kampanya ekranlarda ağırlık kazandı.', null, {yakinMedya: {v: 3}}],
  ['Koalisyon mesajı ver', {itibar: 1, drift: .03}, 'Güven veren bir mesaj oldu.', null, {ortak: 3}]], {z: 1}),
 C('xn_bld_sorus', 'siyaset', 'Belediye Soruşturması Genişledi', 'Belediyedeki iddialar için savcılık yeni belgeleri inceliyor.', function () { return true; }, [
  ['Başkanı askıya al', {birlik: -1, itibar: 1}, 'Karar şeffaflık mesajı verdi.', null, {bldPerf: 2}],
  ['Başkanı savun', {itibar: -2, birlik: 1}, 'Savunma tartışma yarattı.', [.3, {itibar: -2}, 'Yeni belgeler çıktı.'], {bldPerf: -2}],
  ['Denetim komisyonu kur', {itibar: 1, kasa: -.1}, 'Komisyon süreç güvenini artırdı.']], {z: 1}),
 C('xn_kar_dost', 'parti', 'Görevden Alınanın Dostları Tepkili', 'Görevden aldığın kişinin yakın çevresi kamuoyuna kırgınlık mesajları veriyor.', function () { return true; }, [
  ['Yakın çevreyle görüş', {birlik: 1, stres: 2}, 'Görüşmeler gerilimi azalttı.', null, {kadroSad: 3}],
  ['Önemsemeden devam et', {birlik: -1}, 'Homurtular sürdü.', null, {kadroSad: -2}],
  ['Kamuoyu önünde gerekçe anlat', {itibar: .5, stres: 1}, 'Gerekçe anlatıldı.']], {z: 1}),
 C('xn_aday_son', 'parti', 'Kulis Sonuç Verdi mi?', 'Hırslı isim delegelerle görüşmelerini sürdürüyor; kurultay yaklaşırken tablo netleşiyor.', function () { return true; }, [
  ['Barış masası kur', {birlik: 2, stres: 2}, 'Bir uzlaşı çerçevesi çıktı.', null, {kadroSad: 4}],
  ['Delegeleri tek tek ara', {birlik: 1, stres: 3, kasa: -.1}, 'Delegelerle bağ kuruldu.'],
  ['Meydan oku', {birlik: -2, itibar: 1}, 'Sert tutum bir kesimi toparladı.']], {z: 1})
].forEach(function (c) { KARTLAR_Z.push(c); });
ZINCIR.xk_hirsli = [{id: 'xn_aday_son', p: .5, min: 2, max: 4}];
ZINCIR.xn_ortak_ayril = [{id: 'xn_azinlik', p: .35, min: 2, max: 5, sec: [1]}];
ZINCIR.xn_med_gazeteci = [{id: 'xn_med_yalan', p: .3, min: 2, max: 5, sec: [2]}];
ZINCIR.xn_arbede = [{id: 'xn_yasa_halk', p: .3, min: 2, max: 4}];

/* ---------- Aşama 8: çoklu sonlar ---------- */
var SON_TIPLER = {
  cb_tek: ['👑', 'Tek Başına Zafer', 'Çankaya\'ya tek başına çıktın; ülke tek parti hükümetiyle yönetiliyor.'],
  cb_koal: ['🤝', 'Koalisyon Mimarı', 'Cumhurbaşkanı oldun ve geniş bir ittifakla yönetiyorsun.'],
  ortak: ['🏛️', 'Hükümet Ortağı', 'Çankaya senden başkasına gitti; ama hükümette sözün geçiyor.'],
  muhalefet: ['🛡️', 'Güçlü Muhalefet', 'Meclis\'in ikinci gücüsün; bir sonraki seçim için zemin hazır.'],
  kiyi: ['🌫️', 'Siyasetin Kıyısında', 'Mecliste sesin zayıf kaldı; parti yeniden yapılanmak zorunda.'],
  baraj: ['📉', 'Barajın Altında', 'Meclis\'e giremedin; siyasi geleceğin belirsiz.'],
  muhalif_lider: ['🧭', 'Muhalefetin Yeni Yüzü', 'Parti lideri olamadın ama siyasetin içinde kaldın.']
};
var STIL_ADLARI = {saha: 'Sahacı', medya: 'Medya Ustası', kurmay: 'Kadro Kurucu', meclis: 'Meclis Stratejisti'};
function sonBilgi(S) {
  var son = S.sonSecim || {}, ben = son.koltuk && son.koltuk[S.pid] || 0, oy = son.ulusal && son.ulusal[S.pid] || 0, girer = son.girer !== false;
  var gov = govMu(S, S.pid), key;
  if (S.cbOyuncu) key = S.gov.length > 1 ? 'cb_koal' : 'cb_tek';
  else if (muhalifMu(S)) key = ben > 0 ? 'muhalif_lider' : 'baraj';
  else if (gov) key = 'ortak';
  else if (!ben) key = 'baraj';
  else {
    var sira = Object.keys(son.koltuk || {}).sort(function (a, b) { return son.koltuk[b] - son.koltuk[a]; });
    var hn = hukumetDurum(S), ilk = sira.filter(function (id) { return !S.gov.includes(id); })[0];
    key = ilk === S.pid ? 'muhalefet' : 'kiyi';
  }
  var haf = hafInit(S), g = {saha: 0, medya: 0, kurmay: 0, meclis: 0};
  var map = {miting: 'saha', ilodak: 'saha', saha: 'saha', medyaili: 'medya', haberlek: 'medya', haberyalan: 'medya', haberduz: 'medya', haberortaya: 'medya', tv: 'medya', reklam: 'medya', kadro: 'kurmay', kurmay: 'kurmay', belediye: 'kurmay', bldden: 'kurmay', bldborc: 'kurmay', bldbaskan: 'kurmay', yasa: 'meclis', komisyon: 'meclis', erkenbaski: 'meclis'};
  Object.keys(haf.aks || {}).forEach(function (a) { if (map[a]) g[map[a]] += haf.aks[a]; });
  var st = Object.keys(g).sort(function (a, b) { return g[b] - g[a]; })[0]; if (!g[st]) st = null;
  var t = SON_TIPLER[key], bld = bldSayi(S), ozellik = [];
  if (st) ozellik.push(STIL_ADLARI[st]);
  if (haf.skAtlat >= 2) ozellik.push('Kriz Yöneticisi');
  if (bld >= 8) ozellik.push('Yerel Güç');
  if ((haf.kovulan || []).length >= 4) ozellik.push('Sert Disiplin');
  if (S.gov && S.gov.length > 2) ozellik.push('Geniş İttifak');
  return {key: key, ikon: t[0], baslik: t[1], metin: t[2], oy: oy, koltuk: ben, girer: girer, belediye: bld, stil: st ? STIL_ADLARI[st] : null, ozellik: ozellik.slice(0, 4), cb: son.cb ? son.cb.adaylar[son.cb.kazanan].ad : null};
}

/* ---- sonuç ekranı için önce/sonra farkı ---- */
function snapAl(S) {
  var st = S.stat, g = {}; Object.keys(S.grup || {}).forEach(function (k) { g[k] = S.grup[k]; });
  var bo = {}, bn = {}; for (var z = 0; z < 81; z++) { var bb = ILLER[z].bolge; bo[bb] = (bo[bb] || 0) + S.org[z]; bn[bb] = (bn[bb] || 0) + 1; } Object.keys(bo).forEach(function (k) { bo[k] /= bn[k]; });
  var my = 0, mg = 0; if (S.medya && S.medya.length) { S.medya.forEach(function (m) { my += m.yakin; mg += m.guven; }); my /= S.medya.length; mg /= S.medya.length; }
  return {kasa: st.kasa, itibar: st.itibar, birlik: st.birlik, stres: st.stres, saglik: st.saglik, uye: st.uye, drift: st.drift, anket: S.anketOyuncu || 0, medyaY: my, medyaG: mg, org: teskilatSayisi(S), vekil: (S.meclis && S.meclis[S.pid]) || 0, bld: S.bld ? bldSayi(S) : 0, grup: g, bolge: bo};
}
function snapFark(S, a) {
  var b = snapAl(S), out = [];
  [['kasa', 'Kasa', 'para', 1e4, 0], ['itibar', 'İtibar', 'ond', 0.05, 0], ['birlik', 'Parti birliği', 'ond', 0.05, 0], ['stres', 'Stres', 'ond', 0.05, 1], ['saglik', 'Sağlık', 'ond', 0.05, 0], ['uye', 'Üye', 'say', 1, 0], ['org', 'Teşkilatlı il', 'say', 1, 0], ['vekil', 'Milletvekili', 'say', 1, 0], ['bld', 'Belediye', 'say', 1, 0], ['anket', 'Anket', 'ond', 0.05, 0], ['drift', 'Anket ivmesi', 'ond2', 0.005, 0], ['medyaY', 'Medya yakınlığı', 'ond', 0.3, 0], ['medyaG', 'Medya güveni', 'ond', 0.3, 0]].forEach(function (r) {
    var d = b[r[0]] - a[r[0]]; if (Math.abs(d) >= r[3]) out.push({k: r[1], a: a[r[0]], b: b[r[0]], d: d, t: r[2], iyi: r[4] ? d < 0 : d > 0});
  });
  var gr = []; Object.keys(b.grup).forEach(function (k) { var d = b.grup[k] - (a.grup[k] || 0); if (Math.abs(d) >= 0.5) { var gg = GRUPLAR.filter(function (x) { return x.id === k; })[0]; gr.push({k: gg ? gg.ad : k, a: a.grup[k] || 0, b: b.grup[k], d: d, t: 'ond', iyi: d > 0}); } });
  gr.sort(function (x, y) { return Math.abs(y.d) - Math.abs(x.d); });
  var br = []; Object.keys(b.bolge).forEach(function (k) { var d = b.bolge[k] - (a.bolge[k] || 0); if (Math.abs(d) >= 0.3) br.push({k: 'Teşkilat · ' + (BOLGE[k] || k), a: a.bolge[k] || 0, b: b.bolge[k], d: d, t: 'ond', iyi: d > 0}); });
  br.sort(function (x, y) { return Math.abs(y.d) - Math.abs(x.d); });
  return out.concat(gr.slice(0, 3), br.slice(0, 2));
}

/* ---------- Aşama 9: karar sistemi (tahmin, danışmanlar, gecikmeli etki, geçmiş) ---------- */
var KARAR_META = {
  reformalt: {arka: 'Yol, enerji ve liman gibi büyük yatırım kalemleri.', tes: 'Bakanlıklar ve kamu kurumları yürütür.', av: ['Büyüme ve yatırım artar'], rs: ['Kamu borcu yükselir'], kisa: 'Yatırım ortamı iyileşir.', uzun: 'Borç yükü sonraki aylara taşınır.', alt: ['reformsosyal'], gec: []},
  reformsosyal: {arka: 'Emekli, işçi ve yoksul hanelere doğrudan destek.', tes: 'Aile ve çalışma bakanlıkları yürütür.', av: ['Geniş kesimde memnuniyet'], rs: ['Bütçe zorlanır'], kisa: 'Destek artar.', uzun: 'Bütçe açığı büyür.', alt: ['reformalt'], gec: []},
  reformtasarruf: {arka: 'Kamu harcamalarında kesinti ve verimlilik.', tes: 'Maliye Bakanlığı yürütür.', av: ['Borç ve enflasyon düşer'], rs: ['Memur ve gençlerde tepki'], kisa: 'Popülerlik düşer.', uzun: 'Ekonomi sağlamlaşır.', alt: ['reformalt'], gec: []},
  kamptur: {arka: 'Seçime son aylarda bir bölgeyi il il gezersin.', tes: 'İl başkanlıkları programı yürütür.', av: ['Bölge illerinde kalıcı destek', 'Örgüt güçlenir'], rs: ['Çok yorucu', 'Diğer bölgeler ihmal edilir'], kisa: 'İllerde destek hemen artar.', uzun: 'Seçime kadar etkisi sürer.', alt: ['kampmiting', 'kampreklam'], gec: []},
  kampreklam: {arka: 'Ülke çapında reklam ve görünürlük kampanyası.', tes: 'Merkez karargah yönetir.', av: ['Ülke geneli destek', 'Düşük stres'], rs: ['Pahalı', 'Ters tepme riski'], kisa: 'Ulusal destek artar.', uzun: 'Seçime yakın etkisi yüksektir.', alt: ['kamptur'], gec: []},
  kampmiting: {arka: 'Tüm ülkenin konuştuğu dev bir miting.', tes: 'Tüm teşkilat seferber olur.', av: ['Tüm illerde küçük artış', 'Moral'], rs: ['Çok yüksek stres', 'Pahalı'], kisa: 'Her bölgede destek artar.', uzun: 'Seçim havası kalıcı olur.', alt: ['kamptur'], gec: []},
  miting: {arka: 'Meydanda büyük bir kalabalıkla görünürlük kazanırsın; ancak maliyetli ve yorucu bir organizasyondur.', tes: 'Bölge teşkilatı sahayı, güvenliği ve ulaşımı organize eder.', av: ['Bölgede görünürlük ve anket ivmesi', 'Teşkilat morali yükselir'], rs: ['Yüksek maliyet', 'Katılım beklentinin altında kalırsa itibar zedelenir', 'Arka arkaya mitingler etkisini azaltır'], kisa: 'Kasa ve stres hemen etkilenir; anket ivmesi artar.', uzun: 'Etki iki ay içinde söner; teşkilatsız bölgede verim düşüktür.', alt: ['secmen', 'tv'], gec: [{ay: 1, fx: {drift: 0.05}, p: 0.6, ad: 'Miting yankısı', fail: {itibar: -0.4}}]},
  teskilat: {arka: 'Seçilen bölgede il il teşkilat kurma çalışması.', tes: 'Bölge başkanlarının ve gönüllülerin bir ayını alır.', av: ['Teşkilatlı il sayısı artar', 'Genel seçimde aday çıkarma eşiğine yaklaşırsın', 'Üye kazanımına zemin hazırlar'], rs: ['Etki yavaş görünür', 'Sonuç garanti değil'], kisa: 'Teşkilat değeri artar, kasa düşer.', uzun: '2–4 ay içinde üye ve saha gücü olarak geri dönebilir.', alt: ['uye', 'kadro'], gec: [{ay: 2, fx: {uye: 1200}, p: 0.8, ad: 'Teşkilat üye kazanımı'}, {ay: 4, fx: {drift: 0.04, org: 1}, p: 0.65, ad: 'Teşkilat saha gücü'}]},
  secmen: {arka: 'Bir seçmen grubuyla yüz yüze görüşerek beklentilerini dinlersin.', tes: 'Düşük; ilçe yöneticileri organize eder.', av: ['Seçilen grupta destek artar', 'Düşük maliyet'], rs: ['Etki sınırlı ve yereldir'], kisa: 'Grup desteği hemen artar.', uzun: 'Sürekli ilgi gösterilmezse etki zayıflar.', alt: ['miting', 'uye'], gec: [{ay: 1, fx: {drift: 0.03}, p: 0.7, ad: 'Seçmen buluşması yankısı'}]},
  uye: {arka: 'Parti üyeliğini büyütmek için kapı kapı çalışma.', tes: 'Gönüllüler ve il başkanlıkları yoğun çalışır.', av: ['Üye sayısı artar', 'Teşkilat gücü büyür'], rs: ['Sonuç garanti değil', 'Üye artışı hemen oya dönüşmez'], kisa: 'Üye sayısı artar.', uzun: 'Üye tabanı aylık gelir ve saha gücü olarak döner.', alt: ['teskilat', 'secmen'], gec: [{ay: 2, fx: {uye: 700, birlik: 0.5}, p: 0.75, ad: 'Üye kampanyası kalıcı etkisi'}]},
  kadro: {arka: 'Parti içi birliği güçlendirmek için kadro toplantısı.', tes: 'Yönetim kurulu ve kurmaylar toplanır.', av: ['Parti birliği artar', 'Sadakat yükselir'], rs: ['Zaman alır; saha çalışması aksar'], kisa: 'Parti birliği artar.', uzun: 'Kurultay ve güvenoyu öncesi korunma sağlar.', alt: ['teskilat', 'delege'], gec: [{ay: 2, fx: {birlik: 1}, p: 0.8, ad: 'Kadro toplantısı uzlaşısı'}]},
  bagis: {arka: 'Kasaya hızlı gelir sağlayan bağış gecesi.', tes: 'Düşük.', av: ['Kasaya para girer'], rs: ['Bağış sızıntısı itibarı zedeleyebilir'], kisa: 'Kasa artar.', uzun: 'Sızıntı olursa haftalar sonra gündeme gelebilir.', alt: ['tatil', 'uye'], gec: [{ay: 3, fx: {itibar: -1.5}, p: 0.15, ad: 'Bağış gecesi iddiaları'}]},
  tv: {arka: 'Haber kanalında canlı yayın programı.', tes: 'Düşük; iletişim ekibi hazırlık yapar.', av: ['İtibar ve görünürlük artar'], rs: ['Zor soru karşısında tökezleme riski'], kisa: 'İtibar artar.', uzun: 'Performans izleyicinin hafızasında kalır.', alt: ['canli', 'basin'], gec: [{ay: 1, fx: {itibar: 0.5, drift: 0.03}, p: 0.6, ad: 'TV programı etkisi', fail: {itibar: -1}}]},
  tatil: {arka: 'Stresini düşürüp sağlığını toparlamak için kısa mola.', tes: 'Yok.', av: ['Stres düşer', 'Sağlık toparlanır'], rs: ['Bir aksiyon hakkı harcanır'], kisa: 'Stres düşer.', uzun: 'Yüksek stresin neden olduğu verim kaybını önler.', alt: ['kadro', 'basin'], gec: []},
  viral: {arka: 'Gençlere yönelik hızlı yayılan sosyal medya içeriği.', tes: 'Düşük.', av: ['Gençlerde hızlı yayılım'], rs: ['Küçük gaf riski'], kisa: 'Genç seçmen desteği artar.', uzun: 'Etki hızlı söner.', alt: ['influencer', 'tv'], gec: [{ay: 1, fx: {drift: 0.03}, p: 0.55, ad: 'Viral içerik yankısı'}]},
  influencer: {arka: 'Fenomenlerle iş birliği yapılır.', tes: 'Düşük.', av: ['Gençlere ulaşım'], rs: ['Maliyet, geçmiş paylaşımlar gündeme gelebilir'], kisa: 'Genç seçmen desteği artar.', uzun: 'İş birliği sürdüğü sürece etki devam eder.', alt: ['viral', 'tv'], gec: [{ay: 2, fx: {drift: 0.03}, p: 0.6, ad: 'Influencer kampanyası'}]},
  trol: {arka: 'Rakipleri yıpratmak için örgütlü hesap ağı.', tes: 'Düşük.', av: ['Rakip yıpranır'], rs: ['Deşifre olursa itibar çöker', 'Medya güveni düşer'], kisa: 'Rakibe karşı kısa vadeli üstünlük.', uzun: 'Ortaya çıkarsa ağır itibar kaybı.', alt: ['haberlek', 'basin'], gec: [{ay: 2, fx: {itibar: -3}, p: 0.2, ad: 'Troll ordusu deşifre oldu'}]},
  algi: {arka: 'Gündemi manipüle etmeye yönelik operasyon.', tes: 'Düşük.', av: ['Gündem değişir'], rs: ['Yakalanma riski yüksek', 'Güven kaybı'], kisa: 'Anket ivmesi artabilir.', uzun: 'Yakalanırsan itibar ve medya güveni zarar görür.', alt: ['basin', 'tv'], gec: [{ay: 2, fx: {itibar: -3}, p: 0.25, ad: 'Algı operasyonu ortaya çıktı'}]},
  medyaili: {arka: 'Bir yayın organıyla ilişkini güçlendirirsin.', tes: 'Düşük.', av: ['Yayın yakınlığı artar'], rs: ['Yandaş algısı yayının güvenini aşındırır'], kisa: 'Yayın yakınlığı artar.', uzun: 'Yakınlık zamanla doğal tarafa geri döner.', alt: ['basin', 'tv'], gec: []},
  belediye: {arka: 'Yönettiğin bir ile hizmet yatırımı.', tes: 'Yerel teşkilat sahaya iner.', av: ['Belediye performansı artar', 'Yerel teşkilat güçlenir'], rs: ['Borç artar'], kisa: 'Performans artar, borç yükselir.', uzun: 'Başarılı belediye genel seçimde bölgesel oya katkı sağlar.', alt: ['bldden', 'bldborc'], gec: [{ay: 2, fx: {itibar: 0.3, drift: 0.02}, p: 0.7, ad: 'Belediye hizmet yatırımı'}]},
  ilodak: {arka: 'Rekabetin yakın olduğu ilde yoğun kampanya.', tes: 'İl başkanlığı sahayı yönetir.', av: ['İlde oy payı artar'], rs: ['Etki zamanla söner'], kisa: 'İlde destek artar.', uzun: 'Kampanya yatırımı zamanla söner.', alt: ['miting', 'secmen'], gec: []},
  haberyalan: {arka: 'Rakibe karşı asılsız haber çıkarma.', tes: 'Yok.', av: ['Rakip savunmaya geçer'], rs: ['Yalan ortaya çıkarsa itibarın çöker'], kisa: 'Rakip zarar görür.', uzun: 'Ortaya çıkma riski sürer.', alt: ['haberlek', 'haberortaya'], gec: []},
  erken: {arka: 'Seçimi öne çekme kararı.', tes: 'Tüm teşkilat seçim moduna geçer.', av: ['Fırsat penceresi'], rs: ['Hazırlıksızsan sandıkta zarar görürsün'], kisa: 'Seçim tarihi öne çekilir.', uzun: 'Yeni genel seçim takvimi başlar.', alt: ['erkenbaski', 'kadro'], gec: []}
};
/* Kalan aksiyonlar için karar bilgisi (Aşama 9 tamamlama) */
(function () {
  var M = {
    canli: {arka: 'Seçmenle doğrudan, filtresiz bir canlı yayın buluşması.', tes: 'Düşük; iletişim ekibi yayını hazırlar.', av: ['Samimiyet ve itibar kazanımı'], rs: ['Doğaçlama gaf riski', 'Klip olarak yayılabilir'], kisa: 'İtibar ve görünürlük değişir.', uzun: 'Bir gaf haftalarca gündemde kalabilir.', alt: ['tv', 'basin'], gec: [{ay: 1, fx: {itibar: -1}, p: 0.2, ad: 'Canlı yayındaki sözler tartışıldı'}]},
    tvtart: {arka: 'Rakip lider ile canlı yayında karşı karşıya gelirsin.', tes: 'Düşük; hazırlık ekibi çalışır.', av: ['Büyük itibar ve anket kazancı'], rs: ['Kaybedersen büyük itibar ve anket kaybı'], kisa: 'Sonuç tartışma performansına bağlı olarak hemen görünür.', uzun: 'Tartışmanın klipleri seçime kadar dolaşabilir.', alt: ['tv', 'basin'], gec: [{ay: 1, fx: {drift: 0.04}, p: 0.5, ad: 'Tartışma sonrası kamuoyu eğilimi'}]},
    haberlek: {arka: 'Rakip hakkında doğru ama gizli bir bilgiyi bir yayına sızdırırsın.', tes: 'Yok.', av: ['Rakip yıpranır', 'Yakın yayında başarı şansı yüksek'], rs: ['Kaynağın ortaya çıkarsa itibar kaybı'], kisa: 'Rakip zarar görebilir.', uzun: 'Sızıntının kaynağı ortaya çıkabilir.', alt: ['haberortaya', 'basin'], gec: [{ay: 2, fx: {itibar: -2}, p: 0.2, ad: 'Sızıntının kaynağı belli oldu'}]},
    haberduz: {arka: 'Aleyhine dolaşan asılsız haberin düzeltilmesini sağlarsın.', tes: 'Yok.', av: ['Yalan haber söner', 'Genel haber güveni artar'], rs: ['Haberi yapan yayının güveni düşer'], kisa: 'Haber etkisi azalır.', uzun: 'Yayınla ilişki zayıflar.', alt: ['basin', 'tv'], gec: []},
    haberortaya: {arka: 'Rakip bir partinin belediyesindeki skandalı belgeleriyle ortaya çıkarırsın.', tes: 'Yok.', av: ['Rakip büyük itibar kaybeder'], rs: ['Belgeler yetersizse sana geri dönebilir'], kisa: 'Rakibin itibarı düşer.', uzun: 'Skandal soruşturmaya dönüşebilir.', alt: ['haberlek', 'basin'], gec: []},
    skandalkoz: {arka: 'İktidardaki açık bir skandalı gündemde tutarsın.', tes: 'Düşük.', av: ['İktidara baskı artar', 'Erken seçim ihtimali yükselir'], rs: ['Fazla ısrar fırsatçılık algısı yaratır'], kisa: 'Baskı artar.', uzun: 'Gündem değişirse etkisi söner.', alt: ['gensoru', 'basin'], gec: []},
    bldden: {arka: 'Belediyede iç denetim başlatırsın.', tes: 'Belediye ekibi yük alır.', av: ['6 ay boyunca skandal riski düşer'], rs: ['Maliyet'], kisa: 'Denetim başlar.', uzun: 'Süre dolunca koruma biter.', alt: ['bldborc', 'belediye'], gec: []},
    bldborc: {arka: 'Belediyenin borcunu yapılandırırsın.', tes: 'Belediye ekibi yük alır.', av: ['Borç yükü düşer'], rs: ['Kasadan ödeme yapılır'], kisa: 'Borç azalır, kasa düşer.', uzun: 'Belediye performansı rahatlar.', alt: ['bldden', 'belediye'], gec: []},
    bldbaskan: {arka: 'Skandallı veya başarısız belediye başkanını değiştirirsin.', tes: 'Yerel teşkilat yeniden düzenlenir.', av: ['Yeni başkan, taze performans'], rs: ['Yerel teşkilatta kırgınlık'], kisa: 'Başkan değişir.', uzun: 'Yeni başkanın başarısı belirsiz.', alt: ['bldden', 'bldborc'], gec: []},
    erkenbaski: {arka: 'İktidarı erken seçime zorlarsın.', tes: 'Teşkilat seçim moduna hazırlanır.', av: ['Erken seçim ihtimali yükselir'], rs: ['Hazırlıksızsan sana zarar verir'], kisa: 'Baskı artar.', uzun: 'İktidar seçim kararı alabilir.', alt: ['skandalkoz', 'kadro'], gec: []},
    delege: {arka: 'Kurultay delegeleriyle yüz yüze görüşürsün.', tes: 'Düşük.', av: ['Delege desteği artar'], rs: ['Stres yükselir'], kisa: 'Delege desteği artar.', uzun: 'Kurultayda oy olarak dönebilir.', alt: ['kadro', 'tatil'], gec: []},
    hizip: {arka: 'Seni destekleyen bir grubu örgütlersin.', tes: 'Parti içi yük artar.', av: ['Destek tabanı güçlenir'], rs: ['Parti birliği sarsılır'], kisa: 'Birlik düşer, destek artar.', uzun: 'Yönetimle çatışma büyüyebilir.', alt: ['delege', 'kadro'], gec: []},
    elestir: {arka: 'Yeni başkanı sert eleştirirsin.', tes: 'Parti içi yük artar.', av: ['Destek kazanabilirsin'], rs: ['Ters tepebilir'], kisa: 'Sonuç eleştirinin karşılık bulmasına bağlı.', uzun: 'Parti içi ilişkiler bozulabilir.', alt: ['delege', 'kadro'], gec: []},
    basin: {arka: 'Basın toplantısıyla gündemi kendin belirlersin.', tes: 'Düşük.', av: ['Düşük riskli, düzenli itibar'], rs: ['Büyük bir kazanç beklenmez'], kisa: 'İtibar hafifçe artar.', uzun: 'Düzenli iletişim güveni artırır.', alt: ['tv', 'canli'], gec: []},
    gazete: {arka: 'Kendi yayın organını kurarsın.', tes: 'Düşük.', av: ['Kalıcı medya etkisi'], rs: ['Yüksek kuruluş maliyeti', 'Yandaşlık algısı'], kisa: 'Kasa düşer, medya etkisi artar.', uzun: 'Etki kalıcıdır, yayın güveni zamanla değişir.', alt: ['tv', 'basin'], gec: []}
  };
  Object.keys(M).forEach(function (k) { if (!KARAR_META[k]) KARAR_META[k] = M[k]; });
})();
/* Birikim erimesi: eşiğin üstündeki kasa her ay %2 değer kaybeder (enflasyona endeksli eşik) */
function kasaEsik(S) { return 25e6 * (S.makro ? S.makro.fiyat / 100 : 1); }
function secimeAy(S) { var m = 99, tip = null; S.takvim.forEach(function (t) { var d = t.y * 12 + t.m - tarihNo(S.tarih); if (d >= 0 && d < m) { m = d; tip = t.tip; } }); return {ay: m, tip: tip}; }
function fnum9(v, d) { return v.toFixed(d === undefined ? 1 : d).replace('.', ','); }
function kp9(v) { var a = Math.abs(v), s = v < 0 ? '−' : ''; return a >= 1e6 ? s + fnum9(a / 1e6, 1) + ' M ₺' : s + Math.round(a / 1e3) + ' B ₺'; }
function fxMetin9(fx) { var o = []; Object.keys(fx).forEach(function (k) { if (k === 'grup') return; var v = fx[k]; o.push((ETKI_AD[k] || k) + ' ' + (v > 0 ? '+' : '−') + fnum9(Math.abs(v), Math.abs(v) < 0.1 ? 2 : 1)); }); return o.join(', '); }
function kararKayit(S, tip, ad, secim, msg, detay) {
  S.kararlar = S.kararlar || []; S.kararSay = (S.kararSay || 0) + 1;
  var e = {id: S.kararSay, ay: S.ay, t: tarihYaz(S.tarih), tip: tip, ad: ad, secim: secim || '', msg: msg || '', d: (detay || []).slice(0, 8).map(function (x) { return [x.k, x.a, x.b, x.d, x.t, x.iyi ? 1 : 0]; }), gec: []};
  S.kararlar.unshift(e); if (S.kararlar.length > 40) S.kararlar.length = 40; return e.id;
}
function gecikPlanla(S, id, kid) {
  var m = KARAR_META[id]; if (!m || !m.gec || !m.gec.length) return; S.gecik = S.gecik || [];
  var bek = S.gecik.filter(function (g) { return g.id === id; }).length; if (bek >= m.gec.length * 2) return;
  m.gec.forEach(function (g) { S.gecik.push({id: id, kid: kid, ay: S.ay + g.ay, fx: g.fx, p: g.p, ad: g.ad, fail: g.fail || null}); });
}
function gecikOzet(id) { var m = KARAR_META[id]; return m && m.gec ? m.gec.map(function (g) { return {ay: g.ay, p: g.p, ad: g.ad, metin: fxMetin9(g.fx)}; }) : []; }
function gecikTick(S) {
  var out = [], kal = []; (S.gecik || []).forEach(function (g) {
    if (g.ay > S.ay) { kal.push(g); return; }
    var ok = rnd(S) < g.p;
    if (ok) { fxUygula(S, g.fx, g.ad); out.push(g.ad + ': beklenen etki ortaya çıktı (' + fxMetin9(g.fx) + ').'); }
    else { if (g.fail) fxUygula(S, g.fail, g.ad + ' (ters tepti)'); out.push(g.ad + ': beklenen etki gerçekleşmedi' + (g.fail ? ', ters tepti.' : '.')); }
    var kr = (S.kararlar || []).filter(function (x) { return x.id === g.kid; })[0]; if (kr) kr.gec.push({ay: S.ay, ad: g.ad, ok: ok ? 1 : 0});
  });
  S.gecik = kal; return out;
}
function tahminYap(S, calistir, n) {
  n = n || 16; var temel = JSON.stringify(S), sat = {}, say = 0, hata = null, olum = 0, olu = 0;
  for (var i = 0; i < n; i++) {
    var T = JSON.parse(temel); T.rs = (S.rs + (i + 1) * 7919) | 0;
    var r; try { r = calistir(T); } catch (e) { r = {ok: false, msg: 'Bu işlem için ön bilgi üretilemedi.'}; }
    if (!r || r.ok === false) { hata = (r && r.msg) || 'Yapılamaz.'; break; }
    say++; var neg = false, pos = false;
    (r.detay || []).forEach(function (x) {
      var q = sat[x.k] = sat[x.k] || {k: x.k, t: x.t, a: x.a, topl: 0, min: 1e18, max: -1e18, n: 0}; q.topl += x.d; q.min = Math.min(q.min, x.d); q.max = Math.max(q.max, x.d); q.n++;
      if ((x.k === 'İtibar' || x.k === 'Parti birliği') && x.d < -0.5) neg = true; if (x.k === 'Anket ivmesi' && x.d < 0) neg = true; if ((x.k === 'Anket ivmesi' || x.k === 'İtibar') && x.d > 0) pos = true;
    });
    if (neg) olum++; if (pos) olu++;
  }
  if (S.rk) rkInit(S);
  if (hata) return {ok: false, msg: hata};
  var rows = Object.keys(sat).map(function (k) { var q = sat[k]; q.ort = q.topl / say; if (q.n < say) { q.min = Math.min(q.min, 0); q.max = Math.max(q.max, 0); } q.iyi = k === 'Stres' ? q.ort < 0 : q.ort > 0; q.b = q.a + q.ort; return q; });
  rows.sort(function (x, y) { return Math.abs(y.ort) / (Math.abs(y.a) + 1) - Math.abs(x.ort) / (Math.abs(x.a) + 1); });
  return {ok: true, rows: rows, n: say, olumsuz: olum / say, olumlu: olu / say};
}
function danismanlar(S, tah) {
  function E(k) { var r = tah.rows.filter(function (x) { return x.k === k; })[0]; return r ? r.ort : 0; }
  var kasaD = E('Kasa'), it = E('İtibar'), bi = E('Parti birliği'), st = E('Stres'), dr = E('Anket ivmesi'), uy = E('Üye'), or = E('Teşkilatlı il'), me = E('Medya yakınlığı') + E('Medya güveni');
  var orB = 0; tah.rows.forEach(function (x) { if (x.k.indexOf('Teşkilat ·') === 0) orB += x.ort; });
  var kOran = kasaD < 0 ? -kasaD / Math.max(1e6, S.stat.kasa) : 0, sa = secimeAy(S), enf = S.makro ? S.makro.enf : 30, out = [];
  function oy(sk) { return sk > 0.6 ? 'destek' : sk < -0.6 ? 'karşı' : 'çekimser'; }
  // ekonomi
  var eo = S.stat.kasa + kasaD < 0 ? 'karşı' : kOran > 0.3 ? 'karşı' : kasaD >= 0 ? 'destek' : kOran > 0.12 ? 'çekimser' : 'destek';
  out.push({rol: 'Ekonomi danışmanı', oy: eo, tutum: 'temkinli', g: eo === 'karşı' ? (S.stat.kasa + kasaD < 0 ? 'Bu işlem kasayı eksiye düşürür; şu an mümkün değil.' : 'Kasanın %' + Math.round(kOran * 100) + '\'i gidiyor; enflasyon %' + Math.round(enf) + ' iken tamponumuz zayıflar.') : eo === 'destek' ? (kasaD >= 0 ? (kasaD < 1e4 ? 'Kasayı etkilemiyor; ek maliyet yok.' : 'Kasaya ' + kp9(kasaD) + ' katkı sağlıyor.') : 'Maliyet düşük (kasanın %' + Math.round(kOran * 100) + '\'i); bütçeyi sarsmaz.') : 'Maliyet makul ama kasa %' + Math.round(kOran * 100) + ' azalacak; seçim bütçesini düşün.'});
  // strateji
  var ss = dr * 45 + it * 1.0 + bi * 0.6 - Math.max(0, st) * 0.12 - tah.olumsuz * 2;
  out.push({rol: 'Siyasi strateji danışmanı', oy: oy(ss), tutum: 'cesur', g: (sa.ay < 99 ? (sa.tip === 'genel' ? 'Genel seçime ' : 'Yerel seçime ') + sa.ay + ' ay var. ' : '') + (ss > 0.6 ? 'Anket ivmesi ve itibar yönü stratejiyle uyumlu.' : ss < -0.6 ? 'Getirisi riskinden zayıf; alternatiflere bak.' : 'Net bir stratejik fayda görmüyorum; zamanlaması önemli.')});
  // kampanya
  var ks = dr * 60 + uy / 1500 + or * 1.5 + orB * 1.2 + (sa.ay <= 9 ? dr * 30 : 0) + me * 0.05;
  out.push({rol: 'Kampanya müdürü', oy: oy(ks), tutum: 'cesur', g: ks > 0.6 ? 'Sahaya doğrudan katkı: ' + (uy > 0 ? '+' + Math.round(uy) + ' üye, ' : '') + 'seçmen teması artıyor.' : ks < -0.6 ? 'Sahada karşılığı görünmüyor.' : 'Sahaya katkısı sınırlı; seçime yaklaştıkça değer kazanır.'});
  // teşkilat
  var ts = bi * 1.4 + or * 2 + orB * 1.5 - Math.max(0, st) * 0.35 + uy / 2500;
  out.push({rol: 'Teşkilat başkanı', oy: oy(ts), tutum: 'dengeli', g: ts > 0.6 ? 'Teşkilat için olumlu: birlik ve saha gücüne katkı yapar.' : ts < -0.6 ? 'Teşkilatı yoracak; yük ' + (st > 0 ? 'stresi +' + fnum9(st, 1) + ' artırıyor.' : 'fazla.') : 'Teşkilat üzerinde belirgin bir etkisi yok; mevcut yükü artırmaz.'});
  // medya
  var ms = it * 2 + me * 0.3 - tah.olumsuz * 4;
  out.push({rol: 'İletişim ve medya danışmanı', oy: oy(ms), tutum: 'temkinli', g: tah.olumsuz >= 0.25 ? 'Kamuoyunda olumsuz algı ihtimali %' + Math.round(tah.olumsuz * 100) + '; mesajı çok iyi kurmalıyız.' : ms > 0.6 ? 'Medyada olumlu karşılanır; itibar ' + (it >= 0 ? '+' : '') + fnum9(it, 1) + '.' : 'Medyada büyük bir yankı beklemiyorum.'});
  return out;
}
function kararBilgi(S, id, hedef) {
  var a = aksiyonBul(id); if (!a) return {ok: false, msg: 'Bilinmeyen aksiyon.'};
  var tah = tahminYap(S, function (T) { return aksiyonYap(T, id, hedef); }, 16); if (!tah.ok) return tah;
  return kararOzet(S, a, KARAR_META[id] || {}, tah, hedef);
}
function kararOzet(S, a, m, tah, hedef) {
  var sa = secimeAy(S), st = S.stat, nd = [];
  if (sa.ay <= 6 && sa.tip === 'genel') nd.push('Genel seçime ' + sa.ay + ' ay kaldı; her ayın değeri artıyor.'); else if (sa.ay <= 6) nd.push('Yerel seçime ' + sa.ay + ' ay kaldı.');
  if (S.anketOyuncu < 7) nd.push('Anket %' + fnum9(S.anketOyuncu) + ': baraj sınırının altındasın.'); else if (S.anketOyuncu < 10) nd.push('Anket %' + fnum9(S.anketOyuncu) + ': baraja yakınsın.');
  if (st.stres > 60) nd.push('Stresin yüksek (' + Math.round(st.stres) + ').'); if (st.kasa < 5e6) nd.push('Kasa sınırlı: ' + kp9(st.kasa) + '.');
  if (S.makro && S.makro.enf > 40) nd.push('Enflasyon %' + Math.round(S.makro.enf) + ' ile fiyatlar ve maliyetler yükseliyor.');
  if (!nd.length) nd.push('Bu ayki ' + S.aksiyon.kalan + ' aksiyon hakkından birini değerlendiriyorsun.');
  var av = (m.av || []).slice(), rs = (m.rs || []).slice();
  tah.rows.forEach(function (r) { if (Math.abs(r.ort) >= 0.05 && r.t !== 'para') { var t = r.k + ' ' + (r.ort > 0 ? '+' : '−') + fnum9(Math.abs(r.ort), r.t === 'say' ? 0 : r.t === 'ond2' ? 2 : 1); (r.iyi ? av : rs).push('Beklenen: ' + t); } });
  var kasaR = tah.rows.filter(function (r) { return r.k === 'Kasa'; })[0]; if (kasaR && kasaR.ort < 0) rs.push('Beklenen maliyet: ' + kp9(-kasaR.ort)); else if (kasaR && kasaR.ort > 0) av.push('Beklenen gelir: ' + kp9(kasaR.ort));
  if (tah.olumsuz >= 0.05) rs.push('Olumsuz sonuç ihtimali: %' + Math.round(tah.olumsuz * 100));
  tah.rows.forEach(function (r) { if (r.max - r.min > 0.5 * (Math.abs(r.ort) + 0.5) && r.t !== 'para' && r.max - r.min >= 1) rs.push(r.k + ' sonucu değişken: ' + fnum9(r.min, 1) + ' ile ' + fnum9(r.max, 1) + ' arası'); });
  var alt = (m.alt || []).map(function (i) { var q = aksiyonBul(i); return q && !q.hedef ? {id: i, ad: q.ad, not: q.not, maliyet: aksiyonMaliyet(S, q, null)} : null; }).filter(Boolean);
  return {ok: true, id: a.id, ad: a.ad, arka: m.arka || a.not, neden: nd, durum: [['Anket', '%' + fnum9(S.anketOyuncu)], ['Kasa', kp9(st.kasa)], ['Teşkilatlı il', teskilatSayisi(S) + '/81'], ['İtibar', '' + Math.round(st.itibar)], ['Parti birliği', '' + Math.round(st.birlik)], ['Stres', '' + Math.round(st.stres)], ['Seçime', sa.ay < 99 ? sa.ay + ' ay' : '—']],
    maliyet: {kasa: a.maliyet ? aksiyonMaliyet(S, a, hedef) : 0, hak: S.aksiyon.kalan, tes: m.tes || 'Belirgin bir teşkilat yükü yok.'}, rows: tah.rows, olumlu: tah.olumlu, olumsuz: tah.olumsuz, av: av, rs: rs, kisa: m.kisa || 'Etkiler anında uygulanır.', uzun: m.uzun || 'Belirgin uzun vadeli etki beklenmiyor.', gec: gecikOzet(a.id), danisman: danismanlar(S, tah), alt: alt, n: tah.n};
}
function kartKararBilgi(S, item, i) {
  var k = kartBul(item.id), o = k && k.sec[i]; if (!o) return {ok: false, msg: 'Geçersiz seçenek.'};
  var tah = tahminYap(S, function (T) { return kartSec(T, JSON.parse(JSON.stringify(item)), i); }, 24); if (!tah.ok) return tah;
  var b = kararOzet(S, {id: item.id, ad: k.baslik, not: o.t, maliyet: 0}, {arka: o.t, tes: 'Karar kartı: teşkilat yükü doğrudan değişmez.', kisa: 'Etkiler seçim anında uygulanır.', uzun: (o.fx && (o.fx.drift || o.fx.itibar)) ? 'Kararın yankısı 2–4 ay içinde ek etki yaratabilir.' : 'Belirgin gecikmeli etki beklenmiyor.'}, tah, undefined);
  if (o.risk) b.rs.unshift('Beklenmedik ters sonuç ihtimali: %' + Math.round(riskP(S, o.risk.p) * 100));
  if (typeof ZINCIR !== 'undefined' && ZINCIR[item.id]) b.uzun += ' Bu olay ileride yeni gelişmeleri tetikleyebilir.';
  b.alt = k.sec.map(function (x, j) { return j === i ? null : {id: j, ad: x.t, not: fxMetin9(x.fx || {}), maliyet: 0}; }).filter(Boolean); return b;
}
