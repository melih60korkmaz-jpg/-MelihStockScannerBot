/* ===== DERİNLİK PAKETİ: kampanya mini oyunları, olay zincirleri, dış olaylar, aday + bütçe, yetenek ağacı, yeni senaryolar ===== */

/* ---------- yardımcılar ---------- */
function konfetiGoster() {
  if (RM) return; var cv = document.createElement('canvas'); cv.className = 'cf'; cv.style.cssText = 'position:fixed;inset:0;z-index:99997;pointer-events:none'; document.body.appendChild(cv);
  try { konfeti(cv); } catch (e) { /* yok say */ } setTimeout(function () { cv.remove(); }, 3600);
}
function krizFlas() { if (RM) return; var d = document.createElement('div'); d.className = 'kflas'; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 700); }
var _ses0 = ses; ses = function (a) { if (a === 'kriz') krizFlas(); return _ses0(a); };
function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003; return h; }
function ayKullandi(tip) { return S.kmp && S.kmp[tip] === S.ay; }
function ayIsaret(tip) { S.kmp = S.kmp || {}; S.kmp[tip] = S.ay; }

/* ---------- 1a) Canlı TV münazarası ---------- */
var MUN_SORU = [
  ['Enflasyon düşmüyor. Halkın cebindeki yangını nasıl söndüreceksiniz?', [['Somut bir 12 aylık program açıklarım; rakamlarla.', 3, 'veri'], ['Rakibimi sorumlu tutarım; asıl suçlu onlar.', 1, 'sert'], ['Herkesin fedakârlık yapması gerek.', 0, 'denge']]],
  ['Emekliler maaşlarının eridiğini söylüyor. Ne yapacaksınız?', [['Refah payı ve asgari emekli maaşı için bir formül sunarım.', 3, 'veri'], ['Önce ekonomiyi düzeltelim, sonra bakarız.', 0, 'denge'], ['Bu hükümet emeklileri yok sayıyor!', 2, 'sert']]],
  ['Gençlerin işsizliği çok yüksek. Hangi adımı atarsınız?', [['İlk iş garantisi ve staj desteği öneriyorum.', 3, 'veri'], ['Gençler ülkenin geleceği, çok önemli.', 0, 'denge'], ['Bu düzen gençleri yurt dışına kaçırıyor!', 2, 'sert']]],
  ['Başka partilerle ittifak yapacak mısınız?', [['Programı ortak olan herkesle masaya otururum.', 3, 'denge'], ['Hiç kimseyle; kendi başımıza kazanırız.', 1, 'sert'], ['Seçimden sonra bakarız.', 0, 'denge']]],
  ['Eğitim sistemi tartışılıyor. Önceliğiniz ne olacak?', [['Öğretmen atamaları ve yurt/burs paketi.', 3, 'veri'], ['Köklü bir reform şart, bunu hep söylüyorum.', 1, 'denge'], ['Mevcut sistem tamamen çökmüş!', 2, 'sert']]],
  ['Kent merkezlerinde konut krizi var. Çözümünüz nedir?', [['Kira artış sınırı ve sosyal konut üretimi.', 3, 'veri'], ['Piyasa kendi dengesini bulur.', 0, 'denge'], ['İnşaatçılar kazanıyor, vatandaş kaybediyor!', 2, 'sert']]],
  ['Yolsuzluk iddiaları gündemde. Şeffaflık için ne önerirsiniz?', [['Tüm kamu ihalelerini internetten yayınlarım.', 3, 'veri'], ['Bağımsız yargı yeter.', 1, 'denge'], ['Herkes biliyor kimlerin yaptığını.', 2, 'sert']]],
  ['Çiftçi girdi maliyetlerinden şikâyetçi. Ne vaat ediyorsunuz?', [['Gübre ve mazot desteği için net bir takvim.', 3, 'veri'], ['Çiftçimiz başımızın tacı.', 0, 'denge'], ['Üreticiyi bitirdiler!', 2, 'sert']]]
];
function munazara() {
  if (S.aksiyon.kalan <= 0 || ayKullandi('mun')) return; S.aksiyon.kalan--; ayIsaret('mun');
  var onde = siralama(S.anket).filter(function (x) { return x !== S.pid; })[0], rk = partiAdi(S, onde), lider = liderAdi(onde);
  var soru = MUN_SORU.slice(); var sec = []; for (var i = 0; i < 3; i++) { var k = Math.floor(rnd(S) * soru.length); sec.push(soru.splice(k, 1)[0]); }
  var st = S.stilId, bonus = {veri: st === 'teknokrat' ? 1 : 0, sert: (st === 'karizmatik' || st === 'otoriter') ? 1 : 0, denge: st === 'katilimci' ? 1 : 0}, tur = 0, top = 0, log = [];
  function ciz() {
    var q = sec[tur];
    sheet('<div class="lab">🎙️ Canlı münazara · ' + (tur + 1) + '/3</div><h2>' + esc(rk) + ' · ' + esc(lider) + ' karşında</h2><div class="card"><b>Soru:</b> ' + q[0] + '</div><div id="mn-c">' + q[1].map(function (a, i) { return '<button class="btn mn-a" data-i="' + i + '">' + a[0] + '</button>'; }).join('') + '</div><div class="tiny muted" style="margin-top:8px">Veriyle konuşmak çoğu zaman güven verir; sert çıkmak coşturur ama riskli olabilir.</div>', null, false);
    document.querySelectorAll('.mn-a').forEach(function (b) { b.onclick = function () { var a = q[1][+b.dataset.i], p = a[1] + (bonus[a[2]] || 0) + (rnd(S) < 0.25 ? 1 : 0) - (rnd(S) < 0.2 ? 1 : 0); p = clamp(p, 0, 4); top += p; log.push(p); ses(p >= 3 ? 'onay' : 'tik'); tur++; if (tur >= 3) bitir(); else ciz(); }; });
  }
  function bitir() {
    var sonuc = top >= 8 ? 2 : top >= 5 ? 1 : 0, fx = [{drift: -.1, itibar: -1.5, stres: 3}, {drift: .06, itibar: .5, stres: 2}, {drift: .16, itibar: 2, stres: 3, uye: 1200}][sonuc];
    fxUygula(S, fx, 'Münazara'); tarihceEkle(S, '🎙️', 'Canlı münazarada ' + rk + ' ile karşılaştın: ' + ['kaybettin', 'berabere kaldın', 'kazandın'][sonuc] + '.'); sonDakika(S, S.parti.ad + ' liderinin ' + liderAdi(onde) + ' ile münazarası ' + ['tepki topladı', 'bölünmüş bir izlenim bıraktı', 'büyük beğeni topladı'][sonuc] + '.');
    if (sonuc === 2) { konfetiGoster(); ses('zafer'); } else ses(sonuc ? 'sahne' : 'kayip');
    sheet('<div class="lab">Münazara bitti</div><h2>' + ['😬 Zor bir gece', '🤝 Başa baş', '🏆 Salonu kazandın!'][sonuc] + '</h2><p>Puanın: <b>' + top + '/12</b> · ' + log.map(function (x) { return x >= 3 ? '✅' : x >= 2 ? '🟡' : '❌'; }).join(' ') + '</p><p class="small muted">' + ['Rakibin cevapları daha etkili oldu; anketlerde küçük kayıp var.', 'İzleyiciler ikiye bölündü; küçük bir olumlu etki.', 'Cevapların konuşuldu; ivme ve itibar yükseldi.'][sonuc] + '</p><button class="btn pri" id="k">Tamam</button>'); $('#k').onclick = function () { closeSheet(); };
  }
  ciz();
}

/* ---------- 1b) Miting zamanlaması ---------- */
function mitingOyna() {
  if (S.aksiyon.kalan <= 0 || ayKullandi('mit') || S.stat.kasa < 6e5) return; S.aksiyon.kalan--; ayIsaret('mit'); S.stat.kasa -= 6e5;
  var tur = 0, puan = [], t0 = performance.now(), hiz = 1.5, timer = null;
  sheet('<div class="lab">🎤 Miting</div><h2>Kalabalığı coştur!</h2><p class="small muted">Çubuk yeşil bölgedeyken <b>ALKIŞ</b>\'a bas. 3 tur.</p><div class="mt-bar"><div class="mt-yz"></div><div class="mt-im" id="mt-im"></div></div><div id="mt-s" class="small" style="text-align:center;min-height:22px;margin:8px 0">Tur 1/3</div><button class="btn pri" id="mt-b">👏 ALKIŞ</button>', null, false);
  var im = $('#mt-im'); function konum() { var t = (performance.now() - t0) / 1000 * hiz; var f = Math.abs(((t % 2) + 2) % 2 - 1); return f; }
  timer = setInterval(function () { if (!sheetEl || !$('#mt-im')) { clearInterval(timer); return; } im.style.left = (konum() * 94 + 2) + '%'; }, 16);
  $('#mt-b').onclick = function () {
    var f = konum(), uz = Math.abs(f - 0.5), p = uz < 0.07 ? 3 : uz < 0.16 ? 2 : uz < 0.28 ? 1 : 0; puan.push(p); tur++; ses(p >= 2 ? 'onay' : 'tik'); $('#mt-s').textContent = ['Kaçırdın 😬', 'Fena değil 🙂', 'Güzel! 👏', 'MÜKEMMEL! 🔥'][p];
    if (tur >= 3) { clearInterval(timer); var top = puan.reduce(function (a, b) { return a + b; }, 0); fxUygula(S, {drift: .03 * top, uye: 400 * top, itibar: top >= 7 ? 1.5 : top >= 4 ? .5 : 0, stres: 2}, 'Miting'); tarihceEkle(S, '🎤', 'Miting: coşku puanı ' + top + '/9.'); if (top >= 7) { konfetiGoster(); ses('zafer'); }
      setTimeout(function () { sheet('<div class="lab">Miting bitti</div><h2>' + (top >= 7 ? '🔥 Meydan coştu!' : top >= 4 ? '👏 İyi bir miting' : '😐 Sönük kaldı') + '</h2><p>Coşku: <b>' + top + '/9</b></p><p class="small muted">' + (top >= 4 ? 'Üye ve ivme kazandın.' : 'Biraz üye geldi, ama beklentinin altında.') + '</p><button class="btn pri" id="k">Tamam</button>'); $('#k').onclick = function () { closeSheet(); }; }, 650);
    } else { hiz += 0.35; $('#mt-s').textContent += ' · Tur ' + (tur + 1) + '/3'; }
  };
}

/* ---------- 3) Aday seçimi ve aylık bütçe planı ---------- */
var ADAY = [['pop', '🌟', 'Popüler isim', 'Yerel tanınırlık: oy payı artar', 0.05, {}], ['den', '🎓', 'Deneyimli isim', 'Güven veren kadro: biraz oy, itibar', 0.035, {itibar: .4}], ['sad', '🤝', 'Sadık isim', 'Parti içi uyum: biraz oy, birlik', 0.03, {birlik: .6}]];
var ADAY_MALIYET = 0.8e6;
function adayIller() { return ILLER.map(function (il, i) { return {i: i, il: il}; }).filter(function (x) { return S.org[x.i] > 15; }).sort(function (a, b) { return b.il.mv - a.il.mv; }).slice(0, 8); }
var PLANLAR = [
  ['tas', '🪙', 'Tasarruf', 'Gider yok, etki yok', 0, {}],
  ['den', '⚖️', 'Dengeli', 'Reklam + saha dengesi', 0.5e6, {drift: .02, uye: 120}],
  ['saha', '🚶', 'Saha ağırlıklı', 'Teşkilat ve üye odaklı', 0.8e6, {drift: .015, uye: 300, org: 0.15}],
  ['med', '📺', 'Medya ağırlıklı', 'Reklam ve ivme odaklı', 1.1e6, {drift: .045, itibar: .15}]
];
function butcePlan() { return S.butcePlan || 'tas'; }
function butceUygula(S) {
  var p = PLANLAR.filter(function (x) { return x[0] === butcePlan(); })[0]; if (!p || !p[4]) return [];
  if (S.stat.kasa < p[4] * 2) { S.butcePlan = 'tas'; return ['Kasa yetersiz olduğu için kampanya bütçesi "Tasarruf"a alındı.']; }
  S.stat.kasa -= p[4]; var fx = {}; for (var k in p[5]) if (k !== 'org') fx[k] = p[5][k]; fxUygula(S, fx, 'Bütçe planı');
  if (p[5].org && rnd(S) < p[5].org * 2) { var c = []; for (var i = 0; i < 81; i++) if (S.org[i] > 0 && S.org[i] < 70) c.push(i); if (c.length) { var q = c[Math.floor(rnd(S) * c.length)]; S.org[q] = Math.min(100, S.org[q] + 4); } }
  return [];
}

/* ---------- 2) Olay zincirleri ---------- */
function zk(id, baslik, metin, sec) { return C(id, 'siyaset', baslik, metin, function () { return false; }, sec); }
var ZINCIR = {
  xz_s1: [3, 'xz_s2_'], xz_e1: [3, 'xz_e2_'], xz_r1: [3, 'xz_r2_']
};
KARTLAR_E.push(
 C('xz_s1', 'parti', 'Skandal İddiası', 'Basın, partinin üst düzey bir yöneticisinin usulsüzlük yaptığını yazdı. Belgeler şüpheli görünüyor.', function (S) { return S.ay >= 6 && teskilatSayisi(S) >= 12; }, [
  ['Bağımsız soruşturma talep et', {itibar: 1, birlik: -1, stres: 2}, 'Şeffaflık mesajı verdin; yönetici tepki gösterdi.'],
  ['Sahip çık, iddiaları reddet', {birlik: 1.5, itibar: -1}, 'Kadro arkanda ama basın sıkıştırıyor.'],
  ['Görevden al ve özür dile', {itibar: .5, birlik: -2, stres: 2}, 'Sert ama net bir adım attın.']]),
 zk('xz_s2_0', 'Soruşturma Sonuçlandı', 'Bağımsız inceleme tamamlandı: iddialar kısmen doğru çıktı. Kamuoyu kararını bekliyor.', [['Sorumlulara yaptırım uygula', {itibar: 2, birlik: -1, drift: .06}, 'Kararlılığın takdir gördü.'], ['Raporu yumuşatarak açıkla', {itibar: -2, drift: -.05}, 'Saklama girişimi eleştirildi.']]),
 zk('xz_s2_1', 'Basın Üzerine Gidiyor', 'Sahip çıktığın yönetici hakkında yeni belgeler yayınlandı. Muhalefet fırsat kolluyor.', [['Hatayı kabul et', {itibar: -1, birlik: -1, stres: 3}, 'Geç kaldın ama dürüst göründün.'], ['Karşı saldırıya geç', {drift: -.08, itibar: -2.5}, 'Tartışma büyüdü; anketlerde kayıp yaşandı.', [.4, {birlik: -2}, 'Parti içinde tepkiler yükseldi.']]]),
 zk('xz_s2_2', 'Eski Yönetici Konuşuyor', 'Görevden aldığın yönetici basına açıklama yapıyor ve partiyi eleştiriyor.', [['Yanıt verme, sakin kal', {itibar: .5, stres: 1}, 'Soğukkanlılığın dikkat çekti.'], ['Açıkça yanıtla', {itibar: -.5, drift: .03, stres: 2}, 'Tartışma birkaç gün sürdü.']]),
 C('xz_e1', 'ekonomi', 'Banka Söylentisi', 'Sosyal medyada bir bankanın zor durumda olduğu söyleniyor. Piyasalar tedirgin.', function (S) { return S.ay >= 8 && S.makro.enf > 25; }, [
  ['Sakin kalmaya çağır, hükümetten açıklama iste', {itibar: .8, stres: 1}, 'Sorumlu bir duruş sergiledin.'],
  ['Hükümeti sert eleştir', {drift: .08, itibar: -.4}, 'Eleştirin geniş yankı buldu.'],
  ['Hiçbir şey söyleme', {stres: -1}, 'Konu seni doğrudan etkilemedi.']]),
 zk('xz_e2_0', 'Piyasalar Sakinleşti', 'Açıklamalar etkili oldu, endişe azaldı. Senin duruşun hatırlanıyor.', [['Olumlu havayı kullan', {itibar: 1.5, drift: .05}, 'Sorumlu muhalefet imajı güçlendi.'], ['Pekiştirme, yoluna bak', {}, 'Konu kapandı.']]),
 zk('xz_e2_1', 'Dalgalanma Büyüdü', 'Sert eleştirilerin ardından dolar yükseldi. Bazıları seni sorumlu tutuyor.', [['Sorumluluğu üstlen', {itibar: -.5, stres: 2, birlik: 1}, 'Çıkışın dürüst bulundu.'], ['Hükümeti suçla', {drift: .04, itibar: -1.5}, 'Tartışmalı bir çıkış oldu.']]),
 zk('xz_e2_2', 'Banka Gerçekten Sıkıştı', 'Söylenti doğru çıktı; dev bir banka devlet desteği istiyor. Sessiz kalman şaşırttı.', [['Şimdi konuş: denetim iste', {itibar: .5, drift: .05, stres: 2}, 'Geç de olsa net bir tavır aldın.'], ['Yine sessiz kal', {itibar: -1.5}, 'Boşluğu rakipler doldurdu.']]),
 C('xz_r1', 'siyaset', 'Yeni Bir Parti Doğuyor', 'Karizmatik bir isim yeni bir parti kuracağını açıkladı. Oy tabanın da hedefte olabilir.', function (S) { return S.ay >= 9; }, [
  ['Gençliğe yatırım yap, tabanı sağlamlaştır', {kasa: -.6, uye: 2000, grup: {gencler: 3}}, 'Tabanın bağlılığı arttı.'],
  ['Yeni partiyle görüş, ittifak ihtimalini konuş', {itibar: .5, stres: 1}, 'Kapıyı aralık bıraktın.'],
  ['Küçümse', {drift: -.03, itibar: -.4}, 'Yeni parti sana cevap verdi.']]),
 zk('xz_r2_0', 'Yeni Parti Büyüyor', 'Gençlik yatırımların işe yaradı; yeni parti tabanından çok az oy alabildi.', [['Gençlere yeni bir söz ver', {uye: 1500, grup: {gencler: 3, ogrenciler: 2}}, 'Gençler seni ciddiye aldı.'], ['Kazanımı koru', {birlik: 1}, 'Tabanın güvende.']]),
 zk('xz_r2_1', 'Ortak Masa Teklifi', 'Yeni parti liderinden görüşme talebi geldi. İttifak mı, yoksa rekabet mi?', [['Toplantıya git', {itibar: .8, stres: 2}, 'Görüşme olumlu geçti; ittifak sinyali verdi.'], ['Reddet, tek başına yürü', {birlik: 1, drift: .02}, 'Bağımsızlığın vurgulandı.']]),
 zk('xz_r2_2', 'Yeni Parti Anketlerde Yükseldi', 'Küçümsemene yanıt verdi; yeni parti oylar topluyor. Basın seni bu yüzden eleştiriyor.', [['Hatayı kabul et ve elini uzat', {itibar: .8, stres: 2}, 'Geç kalmış ama olumlu bir adım.'], ['Ayrıştırıcı bir dil kullan', {drift: .04, itibar: -1.5}, 'Tabanı coştu, tarafsızlar uzaklaştı.']]),
 C('xs_gizli', 'siyaset', 'Gizli Seçmen Tartışması', 'Anketlerde "kararsız" yüzdesi çok yüksek. Analistler büyük bir sürpriz sandık sonucu olabileceğini söylüyor.', function (S) { return bugunSecimYakin2(S, 3) && S.ay >= 8; }, [
  ['Son hafta saha seferberliği ilan et', {kasa: -1, drift: .14, stres: 4, uye: 1500}, 'Teşkilat sahaya indi; kararsızlara ulaşıldı.'],
  ['Medya turu yap', {kasa: -.5, drift: .08, itibar: .8}, 'Mesajların kararsızlara ulaştı.'],
  ['Ankete güven, alışılmış kampanyayı sürdür', {drift: .02}, 'Rotanı korudun.']])
);
function zincirKayit(S, item, i) {
  var id = item && item.id; if (!id) return; var c = ZINCIR[id]; if (!c) return; S.zBasla = S.zBasla || {}; S.zBasla[id] = 1;
  S.zBekle = S.zBekle || []; S.zBekle.push({ay: S.ay + 2 + Math.floor(rnd(S) * 2), id: c[1] + i});
}
var _kartSec0 = kartSec; kartSec = function (S, item, i) { var r = _kartSec0(S, item, i); try { zincirKayit(S, item, i); } catch (e) { /* oyunu durdurma */ } return r; };
var Z_BASLA = [['xz_s1', 7], ['xz_e1', 11], ['xz_r1', 14]];
function zincirTick(S) {
  var out = []; S.zBasla = S.zBasla || {};
  Z_BASLA.forEach(function (z) { var k = kartBul(z[0]); if (!S.zBasla[z[0]] && S.ay >= z[1] && rnd(S) < 0.3 && (!k.kosul || k.kosul(S))) { S.zBasla[z[0]] = 1; S.kuyruk.push({t: 'kart', id: z[0]}); } });
  if (!S.zBekle || !S.zBekle.length) return out; var kal = [];
  S.zBekle.forEach(function (z) { if (z.ay <= S.ay && kartBul(z.id)) { S.kuyruk.push({t: 'kart', id: z.id}); out.push('Haber: bir gelişme yaşanıyor.'); } else if (z.ay > S.ay) kal.push(z); });
  S.zBekle = kal; return out;
}

/* ---------- 2) Dış olaylar ---------- */
var DIS_OLAY = [
  ['💱', 'Küresel piyasalarda dalgalanma: dolar yükseldi.', function (S) { S.makro.usd = S.makro.usd * 1.05; S.makro.enf = Math.min(120, S.makro.enf + 1.5); S.grup.esnaf = clamp(S.grup.esnaf - 2, 0, 100); }],
  ['🌊', 'Ülkenin bir bölgesinde sel; devlet ve siyasi partiler yardıma koştu.', function (S) { S.grup.ciftciler = clamp(S.grup.ciftciler - 1.5, 0, 100); S.stat.itibar = clamp(S.stat.itibar + (govMu(S, S.pid) ? -1 : 0.4), 0, 100); }],
  ['⚽', 'Millî takım büyük bir başarı kazandı; ülkede bayram havası.', function (S) { S.stat.stres = clamp(S.stat.stres - 3, 0, 100); S.grup.gencler = clamp(S.grup.gencler + 1.5, 0, 100); }],
  ['🏖️', 'Turizm sezonu rekor kırdı; ekonomi nefes aldı.', function (S) { S.makro.buyume = S.makro.buyume + 0.3; S.makro.issiz = Math.max(3, S.makro.issiz - 0.2); }],
  ['🌡️', 'Kuraklık uyarıları: çiftçiler dertli, gıda fiyatları yükseliyor.', function (S) { S.grup.ciftciler = clamp(S.grup.ciftciler - 2.5, 0, 100); S.makro.enf = Math.min(120, S.makro.enf + 1); }],
  ['🌍', 'Sınır ötesinde bölgesel gerilim; güvenlik gündemi öne çıktı.', function (S) { S.grup.milliyetciler = clamp(S.grup.milliyetciler + 2, 0, 100); S.stat.stres = clamp(S.stat.stres + 1, 0, 100); }]
];
function disOlay(S) {
  if (S.ay < 6 || rnd(S) > 0.09) return []; var o = pick(S, DIS_OLAY); try { o[2](S); } catch (e) { return []; }
  tarihceEkle(S, o[0], o[1]); sonDakika(S, o[1]); return [o[1]];
}

/* ---------- 2) Rakip kişilikleri ---------- */
var KISILIK = [['saldirgan', '🔥', 'Saldırgan', 'Sert açıklamalar, sık saldırı'], ['mesafeli', '🧊', 'Mesafeli', 'Az konuşur, uzak durur'], ['populist', '📣', 'Popülist', 'Kalabalıkları coşturur'], ['teknokrat', '📊', 'Teknokrat', 'Rakam ve program konuşur'], ['sakin', '🌿', 'Sakin', 'Uzlaşmacı ve ölçülü']];
function kisilik(id) { return KISILIK[hash(id) % KISILIK.length]; }
var _tRakip1 = tRakip;
tRakip = function () {
  var ids = Object.keys(S.rk || {}).filter(function (id) { return S.anket[id] >= 2; }).sort(function (a, b) { return S.anket[b] - S.anket[a]; }).slice(0, 6);
  var k = '<div class="eyebrow">Lider kişilikleri</div><div class="card">' + ids.map(function (id) { var q = kisilik(id); return '<div class="row small"><span>' + q[1] + ' <b>' + esc(S.rk[id].lider) + '</b><span class="tiny muted"> · ' + esc(partiAdi(S, id)) + '</span></span><span><b>' + q[2] + '</b></span></div><div class="tiny muted" style="margin:-2px 0 6px">' + q[3] + '</div>'; }).join('') + '</div>';
  return k + _tRakip1();
};

/* ---------- 6) Yetenek ağacı (oyunlar arası kalıcı) ---------- */
var YT_KEY = 'secimsim_yetenek';
function ytYukle() { try { var d = JSON.parse(localStorage.getItem(YT_KEY) || '{}'); return {xp: d.xp || 0, sp: d.sp || {}}; } catch (e) { return {xp: 0, sp: {}}; } }
function ytKaydet(d) { try { localStorage.setItem(YT_KEY, JSON.stringify(d)); } catch (e) { /* yok say */ } }
var YETENEK = [
  ['kasa', '💰', 'Güçlü Başlangıç', 'Oyuna +2 M ₺ kasayla başla (seviye başına)', 15],
  ['itibar', '🎖️', 'İyi Bir Ad', 'Oyuna +2 itibarla başla (seviye başına)', 20],
  ['uye', '👥', 'Gönüllü Ağı', 'Oyuna +3.000 üyeyle başla (seviye başına)', 15],
  ['sogukkan', '🧊', 'Soğukkanlılık', 'Başlangıç stresi −4 (seviye başına)', 20],
  ['ivme', '🚀', 'Hazır İvme', 'Başlangıç ivmesi +0,10 (seviye başına)', 25]
];
function ytFiyat(y, lv) { return y[4] * (lv + 1); }
function xpEkle(n) { var d = ytYukle(); d.xp += n; ytKaydet(d); }
function yetenekUygula(S) {
  var d = ytYukle(), s = d.sp, st = S.stat;
  if (s.kasa) st.kasa += 2e6 * s.kasa; if (s.itibar) st.itibar = clamp(st.itibar + 2 * s.itibar, 0, 100); if (s.uye) st.uye += 3000 * s.uye; if (s.sogukkan) st.stres = clamp(st.stres - 4 * s.sogukkan, 0, 100); if (s.ivme) st.drift += 0.1 * s.ivme;
}
var _newGame0 = newGame; newGame = function (o) { var S = _newGame0(o); try { yetenekUygula(S); } catch (e) { /* yok say */ } return S; };
function tYetenek() {
  var d = ytYukle();
  var h = '<div class="card"><b>🌟 Deneyim puanı: ' + d.xp + ' XP</b><div class="small muted" style="margin-top:4px">Her oynadığın ay +1 XP, her genel seçim +25 XP kazandırır. Yetenekler bütün yeni oyunlarda geçerli olur.</div></div>';
  h += YETENEK.map(function (y) { var lv = d.sp[y[0]] || 0, son = lv >= 3, f = ytFiyat(y, lv); return '<div class="card hd-o"><div class="hd-i">' + y[1] + '</div><div style="flex:1"><b>' + y[2] + '</b> <span class="pill go">Sv ' + lv + '/3</span><div class="small muted">' + y[3] + '</div></div><button class="btn yt-b" data-y="' + y[0] + '" style="width:auto;min-height:40px;padding:6px 12px"' + (son || d.xp < f ? ' disabled' : '') + '>' + (son ? 'Tam' : f + ' XP') + '</button></div>'; }).join('');
  return h + '<div class="tiny muted" style="margin-top:8px">Not: Yetenekler yalnızca bu cihazda saklanır.</div>';
}
function yetenekBagla() { document.querySelectorAll('.yt-b').forEach(function (b) { b.onclick = function () { var y = YETENEK.filter(function (x) { return x[0] === b.dataset.y; })[0], d = ytYukle(), lv = d.sp[y[0]] || 0, f = ytFiyat(y, lv); if (lv >= 3 || d.xp < f) return; d.xp -= f; d.sp[y[0]] = lv + 1; ytKaydet(d); ses('onay'); toast(y[2] + ' → Sv ' + (lv + 1)); render(); }; }); }

/* ---------- Yeni senaryolar ---------- */
SENARYOLAR.dalga = {ad: 'Gençlik Dalgası', not: 'Genç seçmenler sandığa akıyor; eski siyasi düzen sarsılıyor.', makro: {issiz: 14, memn: 28}, gov: 0.92, opp: 1.06, yk: 6};
SENARYOLAR.istikrar = {ad: 'İstikrar Arayışı', not: 'Seçmen yorgun ve istikrar istiyor. İktidar avantajlı ama sabırsızlık artıyor.', makro: {enf: 30, buyume: 3.5, memn: 48}, gov: 1.06, opp: 0.98};
SENARYOLAR.cekismeli = {ad: 'Çekişmeli Seçim', not: 'Anketler başa baş. Her oy, her il belirleyici.', makro: {enf: 42, issiz: 9, memn: 36}, gov: 0.95, opp: 1.03, yk: 4};

/* ---------- Kampanya sekmesi ---------- */
function tKampanya() {
  var kal = S.aksiyon.kalan, h = '<div class="card"><b>🎤 Kampanya merkezi</b><div class="small muted" style="margin-top:4px">Mini oyunlar ve kampanya planı. Münazara ve miting ayda birer kez, 1 aksiyon hakkı harcar. Bu ay kalan hakkın: <b>' + kal + '</b></div></div>';
  var munDis = kal <= 0 || ayKullandi('mun'), mitDis = kal <= 0 || ayKullandi('mit') || S.stat.kasa < 6e5;
  h += '<div class="grid2"><button class="btn pri" id="kp-mun"' + (munDis ? ' disabled' : '') + '>🎙️ Canlı münazara<small>' + (ayKullandi('mun') ? 'bu ay yapıldı' : '1 aksiyon') + '</small></button><button class="btn pri" id="kp-mit"' + (mitDis ? ' disabled' : '') + '>🎤 Miting<small>' + (ayKullandi('mit') ? 'bu ay yapıldı' : S.stat.kasa < 6e5 ? 'kasa yetersiz' : '1 aksiyon · 0,6 M ₺') + '</small></button></div>';
  h += '<div class="card" style="margin-top:8px"><div class="small">🗳️ <b>Seçim gecesi</b> canlı sayım, seçim günü otomatik açılır: iller tek tek açıklanır, sandalyeler canlı değişir.</div></div>';
  h += '<div class="eyebrow">Aylık kampanya bütçesi</div><div class="card"><div class="small muted" style="margin-bottom:6px">Her ay ay sonunda uygulanır. Kasa yetmezse otomatik "Tasarruf"a döner.</div>' + PLANLAR.map(function (p) { var on = butcePlan() === p[0]; return '<div class="row small bt-r' + (on ? ' bt-on' : '') + '" data-p="' + p[0] + '" role="button" style="padding:10px 6px;cursor:pointer"><span>' + p[1] + ' <b>' + p[2] + '</b><span class="tiny muted"> · ' + p[3] + '</span></span><b>' + (p[4] ? (p[4] / 1e6).toFixed(1).replace('.', ',') + ' M ₺' : '—') + '</b></div>'; }).join('') + '</div>';
  var il = adayIller();
  h += '<div class="eyebrow">Aday seçimi · il başına 0,8 M ₺</div>' + (il.length ? il.map(function (x) {
    var sec = S.aday && S.aday[x.i]; return '<div class="card"><div class="row"><b>' + x.il.ad + '</b><span class="small muted">' + x.il.mv + ' MV' + (sec ? ' · ' + ADAY.filter(function (a) { return a[0] === sec; })[0][2] : '') + '</span></div>' + (sec ? '' : '<div class="grid2" style="margin-top:8px">' + ADAY.map(function (a) { return '<button class="btn ad-b" data-i="' + x.i + '" data-a="' + a[0] + '" style="min-height:44px;font-size:13px"' + (S.stat.kasa < ADAY_MALIYET ? ' disabled' : '') + '>' + a[1] + ' ' + a[2] + '</button>'; }).join('') + '</div>') + '</div>';
  }).join('') : '<div class="card small muted">Önce birkaç ilde teşkilat kur; aday seçimi teşkilatlı illerde açılır.</div>');
  return h;
}
function kampanyaBagla() {
  var m = $('#kp-mun'), t = $('#kp-mit'); if (m) m.onclick = munazara; if (t) t.onclick = mitingOyna;
  document.querySelectorAll('.bt-r').forEach(function (r) { r.onclick = function () { S.butcePlan = r.dataset.p; ses('tik'); render(); }; });
  document.querySelectorAll('.ad-b').forEach(function (b) { b.onclick = function () { var i = +b.dataset.i, a = ADAY.filter(function (x) { return x[0] === b.dataset.a; })[0]; if (S.stat.kasa < ADAY_MALIYET) return; S.stat.kasa -= ADAY_MALIYET; ilmInit(S); S.ilm[i] = Math.min(0.35, S.ilm[i] + a[4]); S.aday = S.aday || {}; S.aday[i] = a[0]; fxUygula(S, a[5], 'Aday'); ses('onay'); toast(ILLER[i].ad + ': ' + a[2] + ' aday gösterildi'); render(); }; });
}

/* ---------- Aylık kanca (genisleTick'e eklenir) ---------- */
function derinTick(S) {
  var out = []; try { out = out.concat(butceUygula(S)); out = out.concat(zincirTick(S)); out = out.concat(disOlay(S));
    xpEkle(1); var y = S.sonSecim && S.sonSecim.tip === 'genel' ? S.sonSecim.y + '-' + S.sonSecim.m : null; if (y && S.xpSec !== y) { S.xpSec = y; xpEkle(25); } } catch (e) { /* oyunu durdurma */ }
  return out;
}

/* ---------- 5) Arkadaşa meydan okuma (günün senaryosu paylaşımı) ---------- */
var _paylasYaz0 = paylasYaz; paylasYaz = function () { var t = _paylasYaz0(), k = S.kariyer; if (k && k.id === 'gunluk') t += '\nBugünün senaryosu herkes için aynı: beni geçebilir misin? 😉'; return t; };
