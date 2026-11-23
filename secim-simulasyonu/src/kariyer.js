/* ===== SİYASİ KARİYER · GÜNÜN SENARYOSU · PAYLAŞIM ===== */
/* Kariyer: 5 bölümlük kampanya. Her bölüm hazır bir senaryoyla başlar, bir seçim sonucuyla biter (1-3 yıldız).
   İlerleme cihazda (localStorage) saklanır. Günün Senaryosu: her gün herkes için aynı başlangıç (tarih tohumu), seri takibi. */
var KAR_KEY = 'secimsim_kariyer', GUN_KEY = 'secimsim_gunluk';
function kLoad(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
function kSave(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* yok say */ } }

/* r: seçim sonucu özeti {tip, koltuk, oy, girer, rank, cb, il} */
var BOLUMLER = [
  {id: 'k1', no: 1, ad: 'Kuruluş', ikon: '🌱', ozet: 'Sıfırdan bir parti kuruyorsun. Piyasa sakin, destek sınırlı. İlk genel seçimde Meclis\'e girmeyi başar.',
   setup: {mod: 'yeni', zorluk: 'kolay', senaryo: 'klasik', stil: 'katilimci'}, bitis: 'genel1', bitisAd: 'İlk genel seçim (Mayıs 2028)',
   hedef: [{t: 'Meclis\'e gir (en az 1 sandalye)', f: function (r) { return r.koltuk > 0; }}, {t: '30 sandalye kazan', f: function (r) { return r.koltuk >= 30; }}, {t: '55 sandalye kazan', f: function (r) { return r.koltuk >= 55; }}]},
  {id: 'k2', no: 2, ad: 'Kırılgan Denge', ikon: '⚖️', ozet: 'İktidar zayıf ama muhalefet dağınık. Her ittifak ve her oy belirleyici. İlk seçimde güçlü bir grup kur.',
   setup: {mod: 'yeni', zorluk: 'kolay', senaryo: 'kirilgan', stil: 'karizmatik'}, bitis: 'genel1', bitisAd: 'İlk genel seçim (Mayıs 2028)',
   hedef: [{t: 'Barajı geç ve Meclis\'e gir', f: function (r) { return r.koltuk > 0; }}, {t: '50 sandalye kazan', f: function (r) { return r.koltuk >= 50; }}, {t: '90 sandalye kazan', f: function (r) { return r.koltuk >= 90; }}]},
  {id: 'k3', no: 3, ad: 'Büyük Kriz', ikon: '🌪️', ozet: 'Ekonomik kriz iktidarı sarsıyor. Bir mevcut partinin (DEM) başındasın; krizi fırsata çevir ve Meclis\'te ağırlığını artır.',
   setup: {mod: 'mevcut', partiId: 'DEM', zorluk: 'orta', senaryo: 'kriz', stil: 'karizmatik'}, bitis: 'genel1', bitisAd: 'İlk genel seçim (Mayıs 2028)',
   hedef: [{t: '80 sandalye kazan', f: function (r) { return r.koltuk >= 80; }}, {t: '120 sandalye kazan', f: function (r) { return r.koltuk >= 120; }}, {t: 'Meclis\'te ilk üç partiden biri ol', f: function (r) { return r.rank > 0 && r.rank <= 3; }}]},
  {id: 'k4', no: 4, ad: 'Yerel Güç', ikon: '🏙️', ozet: 'MHP\'nin başındasın (kurgusal). Yerel seçimde Anadolu\'nun kalesi olan illeri koru ve yenilerini kazan: hedef çok sayıda belediye başkanlığı.',
   setup: {mod: 'mevcut', partiId: 'MHP', zorluk: 'orta', senaryo: 'klasik', stil: 'teknokrat'}, bitis: 'yerel', bitisAd: 'Yerel seçim (Mart 2029)',
   hedef: [{t: '5 ilde kazan', f: function (r) { return r.il >= 5; }}, {t: '10 ilde kazan', f: function (r) { return r.il >= 10; }}, {t: '16 ilde kazan', f: function (r) { return r.il >= 16; }}]},
  {id: 'k5', no: 5, ad: 'Cumhurbaşkanlığı', ikon: '👑', ozet: 'Son bölüm: refah dönemi iktidarı güçlü kılıyor. İYİ Parti\'nin başında (kurgusal) 2033 seçimine kadar yönet, Meclis\'te yükseliş yap ve Cumhurbaşkanlığını kazan.',
   setup: {mod: 'mevcut', partiId: 'IYI', zorluk: 'acimasiz', senaryo: 'refah', stil: 'karizmatik'}, bitis: 'genel2', bitisAd: 'İkinci genel seçim (Mayıs 2033)',
   hedef: [{t: '100 sandalye kazan', f: function (r) { return r.koltuk >= 100; }}, {t: 'Meclis\'te ilk iki partiden biri ol', f: function (r) { return r.rank > 0 && r.rank <= 2; }}, {t: 'Cumhurbaşkanı ol ve 185+ sandalye kazan', f: function (r) { return !!r.cb && r.koltuk >= 185; }}]}
];
function bolumBul(id) { for (var i = 0; i < BOLUMLER.length; i++) if (BOLUMLER[i].id === id) return BOLUMLER[i]; return null; }
function karIlerleme() { var d = kLoad(KAR_KEY, {b: {}}); d.b = d.b || {}; return d; }
function karYildiz(id) { var b = karIlerleme().b[id]; return b ? b.y || 0 : 0; }
function karToplam() { var t = 0; BOLUMLER.forEach(function (b) { t += karYildiz(b.id); }); return t; }
function karAcik(i) { return i === 0 || karYildiz(BOLUMLER[i - 1].id) >= 1; }
function karUnvan(t) { return t >= 15 ? 'Siyasetin Zirvesi' : t >= 12 ? 'Devlet Adamı' : t >= 9 ? 'Parti Lideri' : t >= 6 ? 'Kurmay' : t >= 3 ? 'Teşkilatçı' : 'Çırak'; }
function yildizYaz(n, max) { var o = ''; for (var i = 0; i < (max || 3); i++) o += i < n ? '★' : '☆'; return o; }

/* Seçim sonucu → özet */
function kSonucOzet(S, sonuc) {
  var seats = sonuc.koltuk || {}, ids = Object.keys(seats).sort(function (a, b) { return seats[b] - seats[a]; }), rk = ids.indexOf(S.pid);
  return {tip: sonuc.tip, koltuk: seats[S.pid] || 0, oy: (sonuc.ulusal && sonuc.ulusal[S.pid]) || 0, girer: !!sonuc.girer, rank: rk >= 0 ? rk + 1 : 99, cb: !!S.cbOyuncu, il: sonuc.tip === 'yerel' ? ((sonuc.iller && sonuc.iller[S.pid]) || 0) : 0};
}
function kBitisMi(S, tip, sonuc) {
  var gen = (S.arsiv || []).filter(function (a) { return a.tip === 'genel'; }).length;
  if (tip === 'genel1') return sonuc.tip === 'genel' && gen === 1;
  if (tip === 'genel2') return sonuc.tip === 'genel' && gen === 2;
  if (tip === 'yerel') return sonuc.tip === 'yerel';
  return false;
}
/* Motor kancası: her seçimden sonra çağrılır (S.kariyer varsa). */
function kariyerKontrol(S0, sonuc) {
  var k = S0.kariyer; if (!k || S0.kariyerSonuc) return;
  var bit = k.id === 'gunluk' ? 'genel1' : (bolumBul(k.id) || {}).bitis;
  if (!bit || !kBitisMi(S0, bit, sonuc)) return;
  var r = kSonucOzet(S0, sonuc); S0.kariyerSonuc = r;
  S0.bitti = true; S0.kuyruk = (S0.kuyruk || []).filter(function (q) { return q.t !== 'bitis'; }); S0.kuyruk.push({t: 'kbitis'});
}

/* ---------- Günün senaryosu ---------- */
function gunKodu(d) { d = d || new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function gunDun() { var d = new Date(); d.setDate(d.getDate() - 1); return gunKodu(d); }
function gunAyar() {
  var kod = gunKodu(), liste = PARTILER.filter(function (p) { return p.baz >= 1.5; }), sen = Object.keys(SENARYOLAR).filter(function (k) { return k !== 'rastgele'; });
  var h = (kod * 2654435761) >>> 0, yeni = h % 3 === 0;
  return {kod: kod, mod: yeni ? 'yeni' : 'mevcut', partiId: liste[(h >>> 3) % liste.length].id, senaryo: sen[(h >>> 7) % sen.length], zorluk: 'orta', stil: ['katilimci', 'karizmatik', 'teknokrat', 'otoriter'][(h >>> 11) % 4]};
}
function gunBaslat() {
  var a = gunAyar(), d = kLoad(GUN_KEY, {});
  var o = {mod: a.mod, partiId: a.partiId, partiAd: 'Günün Partisi', renk: RENKLER[a.kod % RENKLER.length], ideo: IDEOLOJILER[a.kod % IDEOLOJILER.length].id, liderAd: (d.ad || 'Genel Başkan'), dogum: 1978, zorluk: a.zorluk, stil: a.stil, senaryo: a.senaryo, seed: a.kod % 100000, logo: a.kod % 10};
  S = newGame(o); S.kariyer = {id: 'gunluk', kod: a.kod}; TAB = 'genel'; kayit(); render(); queue();
}
function gunMenuHtml() {
  var d = kLoad(GUN_KEY, {}), a = gunAyar(), oynandi = d.puan && d.puan[a.kod] !== undefined, seri = d.son === a.kod || d.son === gunDun() ? (d.seri || 0) : 0;
  return {oynandi: oynandi, seri: seri, puan: oynandi ? d.puan[a.kod] : null, a: a};
}

/* ---------- Kariyer menüsü ---------- */
function kariyerMenu() {
  var t = karToplam();
  root.innerHTML = '<div class="menu"><h2>Siyasi Kariyer</h2><p class="muted small" style="margin:0 0 10px">5 bölüm, 15 yıldız. Her bölüm bir seçimle biter; yıldızlar hedeflerine göre verilir. Bir bölümü açmak için öncekinden en az 1 yıldız gerekir.</p>' +
    '<div class="card" style="text-align:center"><div class="eyebrow" style="margin:0">Unvanın</div><h3 style="margin:2px 0">' + karUnvan(t) + '</h3><span class="kst">' + yildizYaz(Math.min(t, 15) / 5 | 0 || 0, 3) + '</span><div class="small muted">' + t + ' / 15 yıldız</div></div>' +
    BOLUMLER.map(function (b, i) { var ac = karAcik(i), y = karYildiz(b.id); return '<button class="modc" data-b="' + b.id + '"' + (ac ? '' : ' disabled style="opacity:.55"') + '><h3>' + b.ikon + ' ' + b.no + '. ' + esc(b.ad) + ' <span class="kst" style="float:right">' + yildizYaz(y) + '</span></h3><p class="muted small" style="margin:6px 0 0">' + (ac ? esc(b.bitisAd) : '🔒 Önceki bölümden 1 yıldız gerekir') + '</p></button>'; }).join('') +
    '<button class="btn ghost" id="geri" style="margin-top:6px">Geri</button></div>';
  document.querySelectorAll('[data-b]').forEach(function (e) { e.onclick = function () { kariyerDetay(e.dataset.b); }; });
  $('#geri').onclick = modSec;
}
function kariyerDetay(id) {
  var b = bolumBul(id), y = karYildiz(id), p = b.setup.mod === 'mevcut' ? partiBul(b.setup.partiId) : null;
  root.innerHTML = '<div class="menu"><div class="eyebrow">Bölüm ' + b.no + '</div><h2>' + b.ikon + ' ' + esc(b.ad) + '</h2><p>' + esc(b.ozet) + '</p>' +
    '<div class="card"><div class="row small"><span>Mod</span><b>' + (p ? esc(p.ad) + ' lideri' : 'Yeni parti') + '</b></div><div class="row small"><span>Zorluk</span><b>' + ZORLUKLAR[b.setup.zorluk].ad + '</b></div><div class="row small"><span>Senaryo</span><b>' + SENARYOLAR[b.setup.senaryo].ad + '</b></div><div class="row small"><span>Bölüm sonu</span><b>' + esc(b.bitisAd) + '</b></div></div>' +
    '<div class="eyebrow">Hedefler</div><div class="card">' + b.hedef.map(function (h, i) { return '<div class="row small"><span>' + (i < y ? '✅' : '⬜') + ' ' + yildizYaz(i + 1, i + 1) + ' ' + esc(h.t) + '</span></div>'; }).join('') + '</div>' +
    '<button class="btn pri" id="basla" style="margin-top:14px">' + (y ? 'Tekrar oyna' : 'Bölümü başlat') + '</button><button class="btn ghost" id="geri">Geri</button></div>';
  $('#geri').onclick = kariyerMenu; $('#basla').onclick = function () { kariyerBaslat(b); };
}
function kariyerBaslat(b) {
  if (b.setup.mod === 'yeni') { kurulumYeni(b); return; }
  var p = partiBul(b.setup.partiId), pf = kLoad(GUN_KEY, {});
  root.innerHTML = '<div class="menu"><h2>' + esc(p.ad) + ' · Genel Başkan</h2><div class="fld"><label for="la">Lider adı</label><input class="in" id="la" maxlength="28" placeholder="Adın Soyadın" value="' + esc(pf.ad || '') + '"></div><button class="btn pri" id="basla" style="margin-top:16px">Başla</button><button class="btn ghost" id="geri">Geri</button></div>';
  $('#geri').onclick = function () { kariyerDetay(b.id); };
  $('#basla').onclick = function () {
    var ad = $('#la').value.trim() || 'Genel Başkan'; pf.ad = ad; kSave(GUN_KEY, pf);
    S = newGame({mod: 'mevcut', partiId: b.setup.partiId, liderAd: ad, dogum: 1975, zorluk: b.setup.zorluk, stil: b.setup.stil, senaryo: b.setup.senaryo, seed: Date.now() % 100000});
    S.kariyer = {id: b.id}; TAB = 'genel'; kayit(); render(); queue();
  };
}

/* ---------- Oyun içi hedef kartı (Genel sekmesi) ---------- */
function kariyerBanner() {
  if (!S || !S.kariyer) return '';
  if (S.kariyer.id === 'gunluk') return '<div class="card"><div class="eyebrow" style="margin:0">📅 Günün Senaryosu</div><div class="small">İlk genel seçimde ne kadar çok sandalye kazanırsan puanın o kadar yüksek. Seçime ' + (typeof secimeAy === 'function' ? secimeAy(S).ay : '?') + ' ay kaldı.</div></div>';
  var b = bolumBul(S.kariyer.id); if (!b) return '';
  return '<div class="card"><div class="eyebrow" style="margin:0">' + b.ikon + ' Bölüm ' + b.no + ' · ' + esc(b.ad) + '</div>' + b.hedef.map(function (h, i) { return '<div class="row small"><span>' + yildizYaz(i + 1, i + 1) + ' ' + esc(h.t) + '</span></div>'; }).join('') + '<div class="small muted" style="margin-top:4px">Bölüm sonu: ' + esc(b.bitisAd) + '</div></div>';
}

/* ---------- Bölüm sonu ---------- */
function kariyerSon() {
  var r = S.kariyerSonuc, k = S.kariyer; if (!r || !k) { render(); queue(); return; }
  var yil = 0, puan = 0, ad, alt, satirlar = [];
  if (k.id === 'gunluk') {
    puan = r.koltuk + Math.round(r.oy * 3) + (r.girer ? 20 : 0) + (r.cb ? 150 : 0);
    var d = kLoad(GUN_KEY, {}); d.puan = d.puan || {};
    if (d.puan[k.kod] === undefined || puan > d.puan[k.kod]) d.puan[k.kod] = puan;
    if (d.son !== k.kod) { d.seri = d.son === gunDun() ? (d.seri || 0) + 1 : 1; d.son = k.kod; }
    kSave(GUN_KEY, d); S.kariyerSonuc.puan = puan; S.kariyerSonuc.seri = d.seri;
    ad = 'Günün Senaryosu'; alt = 'Puan: ' + puan + ' · Seri: ' + d.seri + ' gün';
    satirlar = [{k: 'Sandalye', v: String(r.koltuk)}, {k: 'Oy', v: '%' + f1(r.oy)}, {k: 'Puan', v: String(puan), c: 'good'}, {k: 'Seri', v: d.seri + ' gün'}];
  } else {
    var b = bolumBul(k.id); b.hedef.forEach(function (h) { if (h.f(r)) yil++; });
    var dd = karIlerleme(), eski = dd.b[b.id] || {y: 0, koltuk: 0}; var yeniAcil = karYildiz(b.id) < 1 && yil >= 1 && b.no < 5;
    dd.b[b.id] = {y: Math.max(eski.y || 0, yil), koltuk: Math.max(eski.koltuk || 0, r.koltuk), son: yil}; kSave(KAR_KEY, dd);
    S.kariyerSonuc.yildiz = yil; ad = b.ad; alt = yil ? yildizYaz(yil) + ' · ' + karUnvan(karToplam()) : 'Hedefe ulaşılamadı';
    satirlar = b.bitis === 'yerel' ? [{k: 'Kazanılan il', v: String(r.il)}] : [{k: 'Sandalye', v: String(r.koltuk)}, {k: 'Oy', v: '%' + f1(r.oy)}, {k: 'Sıra', v: r.rank < 99 ? r.rank + '.' : '—'}];
    b.hedef.forEach(function (h, i) { satirlar.push({k: yildizYaz(i + 1, i + 1), v: h.f(r) ? 'Başarıldı' : 'Olmadı', c: h.f(r) ? 'good' : 'badc'}); });
    if (yeniAcil) satirlar.push({k: 'Yeni bölüm', v: 'Açıldı: ' + BOLUMLER[b.no].ad, c: 'good'});
  }
  kayit();
  splash({ses: (yil >= 2 || puan >= 120) ? 'zafer' : 'sahne', konfeti: yil === 3, ikon: yil === 3 ? '🏆' : yil ? '⭐' : '🏁', ust: k.id === 'gunluk' ? 'GÜNÜN SENARYOSU' : 'KARİYER · BÖLÜM TAMAMLANDI', baslik: esc(ad), alt: esc(alt), satirlar: satirlar.map(function (l) { return {k: esc(l.k), v: esc(l.v), c: l.c}; })}, function () { render(); queue(); });
}
function kariyerBitisKart() {
  var r = S.kariyerSonuc, k = S.kariyer, gun = k.id === 'gunluk', b = gun ? null : bolumBul(k.id), y = r.yildiz || 0;
  return '<div class="card son"><div class="sonik">' + (gun ? '📅' : y === 3 ? '🏆' : y ? '⭐' : '🏁') + '</div><div class="eyebrow">' + (gun ? 'Günün senaryosu bitti' : 'Bölüm ' + b.no + ' tamamlandı') + '</div><h3>' + esc(gun ? 'Puan ' + r.puan : b.ad) + '</h3>' +
    (gun ? '<p>Seri: <b>' + r.seri + ' gün</b>. Yarın yeni bir senaryo seni bekliyor.</p>' : '<p class="kst" style="font-size:28px;margin:4px 0">' + yildizYaz(y) + '</p>') +
    '<div class="sonst"><div><b>' + r.koltuk + '</b><span>Sandalye</span></div><div><b>%' + f1(r.oy) + '</b><span>Oy</span></div><div><b>' + (r.rank < 99 ? r.rank + '.' : '—') + '</b><span>Sıra</span></div></div>' +
    '<button class="btn pri" id="paylas">📤 Sonucu paylaş</button>' + (gun ? '' : '<button class="btn" id="ktekrar">Bölümü tekrar oyna</button>') + '<button class="btn ghost" id="kmenu">' + (gun ? 'Ana menü' : 'Kariyer menüsü') + '</button></div>';
}
function kariyerBagla() {
  var p = $('#paylas'); if (!p || !S || !S.kariyerSonuc) return;
  var r = S.kariyerSonuc, k = S.kariyer, gun = k.id === 'gunluk', b = gun ? null : bolumBul(k.id);
  p.onclick = function () { paylasMetin(paylasYaz()); };
  var m = $('#kmenu'); if (m) m.onclick = function () { gun ? menu() : kariyerMenu(); };
  var t = $('#ktekrar'); if (t) t.onclick = function () { kariyerDetay(k.id); };
}
function paylasYaz() {
  var r = S.kariyerSonuc, k = S.kariyer, gun = k.id === 'gunluk', b = gun ? null : bolumBul(k.id);
  var ust = gun ? '📅 Seçim Simülasyonu · Günün Senaryosu (' + k.kod + ')' : '🗳️ Seçim Simülasyonu · ' + b.no + '. Bölüm: ' + b.ad;
  return ust + '\n' + S.parti.ad + ' · ' + r.koltuk + ' sandalye, %' + f1(r.oy) + ' oy' + (gun ? ' · Puan ' + r.puan + ' · Seri ' + r.seri : ' · ' + yildizYaz(r.yildiz || 0)) + '\nSen de dene!';
}
function paylasMetin(t) {
  try {
    if (window.ReactNativeWebView && window.__NATIVE_SHELL) { window.ReactNativeWebView.postMessage(JSON.stringify({t: 'share', text: t})); return; }
    if (navigator.share) { navigator.share({text: t}).catch(function () {}); return; }
    if (navigator.clipboard) { navigator.clipboard.writeText(t); toast('Kopyalandı; istediğin yere yapıştırabilirsin.'); return; }
  } catch (e) { /* aşağıya düş */ }
  toast(t);
}
