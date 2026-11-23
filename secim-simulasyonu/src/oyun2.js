/* ===== PREMIUM KATMAN: açılış, kartlar, sahneler, merkez, rozetler, grafikler ===== */
var LITE = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;
if (LITE) document.documentElement.classList.add('lite');
document.addEventListener('pointerdown', function (e) {
  var b = e.target.closest && e.target.closest('button.btn,button.aks,button.opt,button.fab,button.cx,button.tab');
  if (!b || b.disabled || RM) return;
  var r = document.createElement('span'), bb = b.getBoundingClientRect(); r.className = 'rip'; r.style.left = (e.clientX - bb.left) + 'px'; r.style.top = (e.clientY - bb.top) + 'px'; b.appendChild(r); setTimeout(function () { r.remove(); }, 650);
}, {passive: true});
/* ---- açılış ---- */
function parcacik(cv) {
  var x = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, n = LITE ? 24 : 60, P = [];
  for (var i = 0; i < n; i++) P.push({x: Math.random() * W, y: Math.random() * H, r: .6 + Math.random() * 2.2, v: .2 + Math.random() * .7, a: .15 + Math.random() * .5});
  (function f() { if (!document.body.contains(cv)) return; x.clearRect(0, 0, W, H); P.forEach(function (p) { p.y -= p.v; if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; } x.globalAlpha = p.a; x.fillStyle = p.r > 2 ? '#ff7a9c' : '#e63b6f'; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.283); x.fill(); }); requestAnimationFrame(f); })();
}
function ilkGiris() { try { return !localStorage.getItem('ss_gordu'); } catch (e) { return true; } }
function intro(fn) {
  var ilk = ilkGiris(), F = ilk ? 1 : 0.35, el = document.createElement('div'), k = 0, harf = 'SEÇİM SİMÜLASYONU'.split(' ').map(function (w) { return '<span class="w">' + w.split('').map(function (c) { return '<span style="animation-delay:' + Math.round((1500 + (k++) * 55) * F) + 'ms">' + c + '</span>'; }).join('') + '</span>'; }).join(' ');
  el.className = 'intro' + (ilk ? '' : ' kisa'); el.innerHTML = '<div class="in-map" aria-hidden="true">' + geoSvg(function () { return '#22252f'; }) + '</div><canvas class="ptc"></canvas><div class="orb o1"></div><div class="orb o2"></div><div class="in-c"><svg viewBox="0 0 100 100" class="in-l" aria-hidden="true"><defs><clipPath id="ipc"><rect x="0" y="0" width="100" height="49"/></clipPath></defs><g clip-path="url(#ipc)"><g class="pp"><rect x="36" y="2" width="28" height="38" rx="3"/><path d="M42 14h16M42 21h16M42 28h10"/></g></g><rect class="sb" x="14" y="48" width="72" height="44" rx="6" pathLength="1"/><rect class="ss" x="30" y="48" width="40" height="5" rx="2.5"/><path class="ck2" d="M34 72l11 11 21-24" pathLength="1"/></svg><h1 class="in-t">' + harf + '</h1><div class="in-s">Parti kur · Teşkilatı büyüt · Sandığı kazan</div></div><div class="in-h">Dokun ve başla</div><button class="in-skip" type="button">Geç ›</button>';
  document.body.appendChild(el); if (!RM) parcacik($('canvas', el));
  setTimeout(function () { ses('pusula'); }, Math.round(450 * F)); setTimeout(function () { ses('muhur'); }, Math.round(1500 * F));
  var done = false; function bit() { if (done) return; done = true; try { localStorage.setItem('ss_gordu', '1'); } catch (e) {} el.classList.add('out'); fn(); setTimeout(function () { el.remove(); }, 650); }
  el.onclick = bit; setTimeout(bit, RM ? 400 : ilk ? 5000 : 1800);
}
/* ---- sonuç sahneleri ---- */
var CKSAY = 0;
function checkSvg() { return '<svg class="ck' + (++CKSAY > 6 ? ' sade' : '') + '" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23" pathLength="1"/><path d="M15 27l8 8 15-17" pathLength="1"/></svg>'; }
function twBaslat(kok) {
  kok.querySelectorAll('.tw').forEach(function (el, i) {
    var a = +el.dataset.a, b = +el.dataset.b, t = el.dataset.t; if (RM || !isFinite(a) || !isFinite(b) || a === b) return;
    var f = function (v) { return kdFm({t: t}, v); }; el.textContent = f(a); el._v = a;
    setTimeout(function () { if (el.isConnected) { tw(el, b, f, 700); el.classList.add('twon'); } }, 250 + i * 70);
  });
}
function kdFm(x, v) { return x.t === 'para' ? para(v) : x.t === 'say' ? sayi(v) : x.t === 'ond2' ? v.toFixed(2).replace('.', ',') : f1(v); }
function kdSec(baslik, ic, acik) { return '<details class="kd"' + (acik ? ' open' : '') + '><summary>' + baslik + '</summary>' + ic + '</details>'; }
function kararHtml(b, op) {
  var h = '<div class="lab">' + esc(op.lab) + '</div><h2>' + esc(b.ad) + '</h2><p class="small">' + esc(b.arka) + '</p>';
  if (op.secim) h += '<div class="kr-sec">Seçtiğin yol: <b>' + esc(op.secim) + '</b></div>';
  h += '<div class="kr-neden"><b>Neden şimdi?</b> ' + b.neden.map(esc).join(' ') + '</div>';
  h += '<div class="kr-durum">' + b.durum.map(function (x) { return '<div><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div>';
  var mal = '';
  if (b.maliyet.kasa) mal += '<div class="row small"><span>Ekonomik maliyet</span><b class="badc">' + para(b.maliyet.kasa) + '</b></div>';
  if (op.aksiyon) mal += '<div class="row small"><span>Aksiyon hakkı</span><b>' + b.maliyet.hak + ' → ' + (b.maliyet.hak - 1) + '</b></div>';
  mal += '<div class="small muted" style="margin-top:4px">Teşkilat yükü: ' + esc(b.maliyet.tes) + '</div>';
  h += kdSec('Maliyet ve teşkilat yükü', mal, true);
  var et = b.rows.length ? b.rows.map(function (x) { var rg = x.max - x.min >= (x.t === 'para' ? 1e5 : x.t === 'ond2' ? 0.02 : 1) ? '<div class="tiny muted">aralık: ' + (x.min < 0 ? '−' : '+') + kdFm(x, Math.abs(x.min)) + ' ile ' + (x.max < 0 ? '−' : '+') + kdFm(x, Math.abs(x.max)) + '</div>' : ''; return '<div class="dr"><span>' + esc(x.k) + rg + '</span><span class="dv">' + kdFm(x, x.a) + ' → <b class="tw" data-a="' + x.a + '" data-b="' + x.b + '" data-t="' + x.t + '">' + kdFm(x, x.b) + '</b></span><span class="dd ' + (x.iyi ? 'good' : 'badc') + '">' + (x.ort > 0 ? '+' : '−') + kdFm(x, Math.abs(x.ort)) + '</span></div>'; }).join('') : '<div class="small muted">Belirgin bir değişim beklenmiyor.</div>';
  et += '<div class="small muted" style="margin-top:6px">Olumlu sonuç ihtimali %' + Math.round(b.olumlu * 100) + ' · olumsuz sonuç ihtimali %' + Math.round(b.olumsuz * 100) + '. Değerler ' + b.n + ' ayrı simülasyonun ortalamasıdır; gerçek sonuç farklı çıkabilir.</div>';
  h += kdSec('Kamuoyu ve istatistik etkileri (tahmin)', et, true);
  h += kdSec('Avantajlar ve riskler', '<div class="kd2"><div><b class="good">Avantajlar</b><ul>' + (b.av.length ? b.av.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') : '<li>Belirgin avantaj yok</li>') + '</ul></div><div><b class="badc">Riskler</b><ul>' + (b.rs.length ? b.rs.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') : '<li>Belirgin risk yok</li>') + '</ul></div></div>', true);
  var uz = '<div class="small"><b>Kısa vade:</b> ' + esc(b.kisa) + '</div><div class="small" style="margin-top:4px"><b>Uzun vade:</b> ' + esc(b.uzun) + '</div>';
  if (b.gec && b.gec.length) uz += '<div class="eyebrow" style="margin-top:8px">Gecikmeli etkiler</div>' + b.gec.map(function (g) { return '<div class="small">• ' + g.ay + ' ay sonra · ' + esc(g.ad) + ': ' + esc(g.metin) + ' <span class="muted">(%' + Math.round(g.p * 100) + ' ihtimalle)</span></div>'; }).join('');
  h += kdSec('Kısa ve uzun vadeli sonuçlar', uz, false);
  h += kdSec('Danışmanlar', b.danisman.map(function (d) { return '<div class="dn"><div class="dn-h"><b>' + esc(d.rol) + '</b><span class="dn-o ' + (d.oy === 'destek' ? 'good' : d.oy === 'karşı' ? 'badc' : 'muted') + '">' + esc(d.oy) + '</span></div><div class="small muted">' + esc(d.g) + '</div></div>'; }).join(''), true);
  if (b.alt && b.alt.length) h += kdSec('Alternatif seçenekler', b.alt.map(function (x) { return '<button class="opt kalt" data-alt="' + esc(String(x.id)) + '"><b>' + esc(x.ad) + '</b><span class="small muted">' + esc(x.not || '') + (x.maliyet ? ' · ' + para(x.maliyet) : '') + '</span></button>'; }).join(''), false);
  h += '<div class="kfoot"><button class="btn pri" id="kon">' + esc(op.onay) + '</button><button class="btn" id="kvz">' + esc(op.geri || 'Vazgeç') + '</button></div>';
  return h;
}
function kararOnay(id, hedef) {
  var a = aksiyonBul(id); if (!a) return;
  if (S.aksiyon.kalan <= 0) { toast('Bu ay aksiyon hakkın bitti. "Ayı Bitir" ile devam et.'); return; }
  var b = kararBilgi(S, id, hedef);
  if (b.ok === false) { if (String(b.msg).indexOf('ön bilgi') >= 0) { sonucGoster(aksiyonYap(S, id, hedef)); return; } toast(b.msg); return; }
  sheet(kararHtml(b, {lab: 'Karar ekranı', aksiyon: true, onay: 'Onayla' + (b.maliyet.kasa ? ' · ' + para(b.maliyet.kasa) : '')}), 'blue');
  $('#kon').onclick = function () { closeSheet(true); sonucGoster(aksiyonYap(S, id, hedef)); };
  $('#kvz').onclick = function () { closeSheet(true); };
  document.querySelectorAll('.kalt').forEach(function (x) { x.onclick = function () { closeSheet(true); kararOnay(x.dataset.alt); }; });
}
function kararGecmisiHtml() {
  var kr = S.kararlar || [], bk = S.gecik || [], h = '<div class="eyebrow">Karar geçmişi · ' + kr.length + '</div>';
  if (bk.length) h += '<div class="card" style="padding:11px 14px"><h3>Bekleyen etkiler<small>' + bk.length + '</small></h3>' + bk.slice().sort(function (x, y) { return x.ay - y.ay; }).slice(0, 8).map(function (g) { return '<div class="row small"><span>' + esc(g.ad) + '</span><b>' + Math.max(1, g.ay - S.ay) + ' ay · %' + Math.round(g.p * 100) + '</b></div>'; }).join('') + '</div>';
  if (!kr.length) return h + '<div class="card muted small">Henüz kayıtlı bir karar yok. Aksiyon ve karar kartlarının sonuçları burada saklanır.</div>';
  return h + kr.slice(0, 20).map(function (e) {
    var rows = (e.d || []).map(function (r) { var x = {t: r[4]}; return '<div class="dr"><span>' + esc(r[0]) + '</span><span class="dv">' + kdFm(x, r[1]) + ' → <b>' + kdFm(x, r[2]) + '</b></span><span class="dd ' + (r[5] ? 'good' : 'badc') + '">' + (r[3] > 0 ? '+' : '−') + kdFm(x, Math.abs(r[3])) + '</span></div>'; }).join('');
    var gc = (e.gec || []).map(function (g) { return '<div class="small">' + (g.ok ? '✅' : '❌') + ' ' + esc(g.ad) + (g.ok ? ' gerçekleşti' : ' gerçekleşmedi') + '</div>'; }).join('');
    return '<details class="card kg"><summary><b>' + (e.tip === 'kart' ? '🃏 ' : '⚡ ') + esc(e.ad) + '</b><small>' + esc(e.t) + '</small></summary>' + (e.secim ? '<div class="small muted">Seçim: ' + esc(e.secim) + '</div>' : '') + '<div class="small" style="margin:4px 0">' + esc(e.msg) + '</div>' + rows + gc + '</details>';
  }).join('');
}
function detayHtml(dt) {
  if (!dt || !dt.length) return '';
  var fm = kdFm;
  return '<div class="eyebrow" style="margin-top:12px">Neler değişti</div><div class="dty">' + dt.map(function (x, i) { return '<div class="dr" style="animation-delay:' + (i * 70 + 150) + 'ms"><span>' + esc(x.k) + '</span><span class="dv">' + fm(x, x.a) + ' → <b class="tw" data-a="' + x.a + '" data-b="' + x.b + '" data-t="' + x.t + '">' + fm(x, x.b) + '</b></span><span class="dd ' + (x.iyi ? 'good' : 'badc') + '">' + (x.d > 0 ? '+' : '−') + fm(x, Math.abs(x.d)) + '</span></div>'; }).join('') + '</div>';
}
function sonucGoster(r, atla) {
  if (!r.ok) { toast(r.msg); return; }
  if (!atla) ses('onay');
  kayit(); render(); if (TITRON && navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
  var e = r.ekstra; if (e && e.tip === 'miting') return mitingSahne(r); if (e && e.tip === 'tvtart') return tvSahne(r); if (!atla && e && e.tip === 'guven') return guvenSahne(r); if (!atla && e && e.tip === 'gensoru') return gensoruSahne(r);
  sheet(checkSvg() + '<div class="lab" style="text-align:center">Sonuç</div><h2 style="text-align:center">' + esc(r.msg) + '</h2>' + (r.ad ? '<div class="small muted" style="text-align:center">' + esc(r.ad) + (r.kalan !== undefined ? ' · kalan hak: ' + r.kalan : '') + '</div>' : '') + fxHtml(r.chips) + detayHtml(r.detay) + ((r.gecik && r.gecik.length) ? '<div class="eyebrow" style="margin-top:10px">Sonraki aylarda beklenenler</div>' + r.gecik.map(function (g) { return '<div class="small">• ' + g.ay + ' ay sonra · ' + esc(g.ad) + ': ' + esc(g.metin) + ' <span class="muted">(%' + Math.round(g.p * 100) + ' ihtimal)</span></div>'; }).join('') : '') + '<button class="btn pri" id="k" style="margin-top:14px">Tamam</button>', 'blue'); $('#k').onclick = function () { closeSheet(); };
}
function mitingSahne(r) {
  var e = r.ekstra, fill = Math.min(60, Math.round(e.katilim / 1500)), lv = e.katilim < 30000 ? 'Mütevazı kalabalık' : e.katilim < 80000 ? 'Meydan kalabalıktı' : e.katilim < 150000 ? 'Meydan doldu taştı' : 'Tarihi bir kalabalık', cr = '';
  for (var i = 0; i < 60; i++) cr += '<i class="' + (i < fill ? 'on' : '') + '" style="animation-delay:' + (RM ? 0 : i * 20) + 'ms">🧑</i>';
  sheet('<div class="lab">Miting · ' + e.bolge + '</div><h2 id="mk" style="font-size:34px">0</h2><div class="small muted">kişi katıldı · ' + lv + '</div><div class="crowd">' + cr + '</div><div class="eyebrow" style="margin-top:6px">Katılım göstergesi</div>' + bar(Math.min(100, fill / 60 * 100)) + fxHtml(r.chips) + '<button class="btn pri" id="k" style="margin-top:14px">Tamam</button>', 'blue');
  tw($('#mk'), e.katilim, sayi, 1100); $('#k').onclick = function () { closeSheet(); };
}
function tvSahne(r) {
  var e = r.ekstra, M = S.makro, ok = e.skor >= 50, rc = partiRengi(S, e.rid);
  var B = [['r', 'Ekonomiyi bu hale getirenler bize ders vermeye kalkmasın.'], ['p', 'Halk söz değil çözüm istiyor. Enflasyon %' + f1(M.enf) + ' iken susmak olmaz.'], ['r', 'Sizin ne tecrübeniz var ne de sahada gücünüz.'], ['p', 'Teşkilatımız ' + teskilatSayisi(S) + ' ilde sahada. Biz masa başında değiliz.'], ok ? ['r', 'Rakamlar bunu doğrulamıyor.'] : ['p', 'Verilerimiz ortada, tartışmayı bu zeminde yapalım.'], ok ? ['p', 'Sandık konuşacak. Seçmen kimin yanında olduğunu biliyor.'] : ['r', 'Seçmen cevabını sandıkta verecek. Süreniz doldu.']];
  var bb = B.map(function (b, i) { return '<div class="bb ' + b[0] + '" style="animation-delay:' + (RM ? 0 : 500 + i * 900) + 'ms"><span class="av" style="background:' + (b[0] === 'r' ? rc : S.parti.renk) + '">' + esc((b[0] === 'r' ? e.rakip : S.parti.ad).charAt(0)) + '</span><div>' + esc(b[1]) + '</div></div>'; }).join('');
  sheet('<div class="lab">Canlı yayın · ' + esc(e.rakip) + ' ile</div><h2>TV Tartışması</h2><div class="tv">' + bb + '</div><div id="tvr" style="opacity:0;transition:opacity .5s"><div class="eyebrow">İzleyici oylaması</div><div class="pr"><span class="dot" style="background:' + S.parti.renk + '"></span><div><div class="nm"><span>' + esc(S.parti.ad) + '</span></div><div class="pbar"><i style="width:' + e.skor + '%;background:' + S.parti.renk + '"></i></div></div><b class="num">%' + e.skor + '</b></div><div class="pr"><span class="dot" style="background:' + rc + '"></span><div><div class="nm"><span>' + esc(e.rakip) + '</span></div><div class="pbar"><i style="width:' + (100 - e.skor) + '%;background:' + rc + '"></i></div></div><b class="num">%' + (100 - e.skor) + '</b></div><div class="news"><b>' + (e.skor >= 60 ? 'Gecenin galibi ' + esc(S.parti.ad) : e.skor >= 45 ? 'Tartışma başa baş bitti' : esc(e.rakip) + ' tartışmayı kazandı') + '</b></div>' + fxHtml(r.chips) + '<button class="btn pri" id="k" style="margin-top:12px">Tamam</button></div>', 'blue', false);
  setTimeout(function () { var t = $('#tvr'); if (t) { t.style.opacity = 1; $('#k').onclick = function () { closeSheet(); }; } }, RM ? 100 : 500 + B.length * 900 + 300);
  var sh = $('.sh'); if (sh) sh.onclick = function () { var t = $('#tvr'); if (t && t.style.opacity === '0') { document.querySelectorAll('.bb').forEach(function (b) { b.style.animationDelay = '0s'; }); t.style.opacity = 1; $('#k').onclick = function () { closeSheet(); }; } };
}
/* ---- karar kartları ---- */
function kart(it) {
  var k = kartBul(it.id), kk = KAT[kartKat(it.id)] || KAT.siyaset, onem = kartOnemli(it.id);
  var o = sheet('<div class="kh"><span class="ki' + (onem ? ' ki-p' : '') + '">' + kk.ikon + '</span><div class="lab" style="color:' + kk.renk + '">' + kk.ad + (onem ? ' · ÖNEMLİ OLAY' : ' · KARAR KARTI') + '</div></div>' + (kartKat(it.id) === 'kriz' ? krizHero(it.id, k.baslik) : '') + '<h2>' + esc(k.baslik) + '</h2><p>' + esc(kartMetni(it)) + '</p>' + k.sec.map(function (x, i) { return '<button class="opt" data-i="' + i + '" style="animation-delay:' + (i * 90 + 100) + 'ms"><b>' + 'ABC'[i] + ') ' + esc(x.t) + '</b>' + fxHtml(chipler(onizleme(x.fx))) + '</button>'; }).join(''), 'kat' + (onem ? ' imp' : ''), false);
  ses(kartKat(it.id) === 'kriz' ? 'kriz' : 'kart'); var sh = $('.sh', o); sh.style.borderTopColor = kk.renk; sh.classList.add('kc-' + kartKat(it.id)); if (onem) { sh.classList.add('kc-onem'); o.classList.add('onem'); }
  document.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () { kartKarar(it, +b.dataset.i, kk, k); }; });
}
function kartUygula(it, i, kk, k) {
  var b = {dataset: {i: i}}; {
    var n0 = (S.yanki || []).length, r = kartSec(S, it, +b.dataset.i); kayit();
    var pos = r.chips.filter(function (c) { return c.iyi; }).length, neg = r.chips.length - pos, cls = pos > neg ? 'fxgood' : neg > pos ? 'fxbad' : '', sp = '';
    if (cls === 'fxgood' && !RM) for (var q = 0; q < 10; q++) sp += '<i class="spk" style="left:' + (8 + q * 9) + '%;animation-delay:' + (q * 90) + 'ms">✨</i>';
    sheet('<div class="rsl">' + sp + '</div>' + (cls === 'fxgood' ? checkSvg() : cls === 'fxbad' ? '<div class="wr">⚠️</div>' : '<div class="wr">📰</div>') + '<div class="lab" style="text-align:center;color:' + kk.renk + '">' + kk.ad + ' · Sonuç</div><h2 style="text-align:center">' + esc(r.s) + '</h2><div class="small muted" style="text-align:center">Seçimin: <b>' + 'ABC'[+b.dataset.i] + ') ' + esc(k.sec[+b.dataset.i].t) + '</b></div>' + fxHtml(r.chips) + detayHtml(r.detay) + ((S.yanki || []).length > n0 ? '<div class="small muted" style="margin-top:8px;text-align:center">Bu kararın yankısı önümüzdeki aylarda hissedilebilir.</div>' : '') + '<button class="btn pri" id="k" style="margin-top:14px">Tamam</button>', cls, false);
    $('#k').onclick = function () { closeSheet(); };
  }
}
function kartKarar(it, i, kk, k) {
  var b = kartKararBilgi(S, it, i);
  if (b.ok === false) { kartUygula(it, i, kk, k); return; }
  b.arka = kartMetni(it); b.ad = k.baslik;
  sheet(kararHtml(b, {lab: kk.ad + ' · Karar ekranı', secim: 'ABC'[i] + ') ' + k.sec[i].t, onay: 'Bu kararı onayla', geri: 'Geri dön'}), 'kat', false);
  $('#kon').onclick = function () { kartUygula(it, i, kk, k); };
  $('#kvz').onclick = function () { closeSheet(true); kart(it); };
  document.querySelectorAll('.kalt').forEach(function (x) { x.onclick = function () { kartKarar(it, +x.dataset.alt, kk, k); }; });
}
function kurultaySheet(k) {
  if (k.aday === true && k.tahmin !== undefined) return kurultayAdaySheet(k);
  if (k.sonuc) return kurultaySonucSheet(k);
  splash(k.kazandi ? {ikon: '🏆', ust: 'KURULTAY', baslik: 'Genel başkanlığı korudun', alt: '%' + f1(k.pay) + ' · ' + k.delege + ' delege', satirlar: [esc(k.rakip) + ' geride kaldı.', 'Parti birliği güçlendi.'], tema: 'k', konfeti: true, ticker: 'CJN · KURULTAY SONUCU · ' + esc(S.lider.ad).toUpperCase() + ' YENİDEN GENEL BAŞKAN · ' + esc(S.parti.ad).toUpperCase()} :
    {ikon: '📉', ust: 'KURULTAY', baslik: 'Genel başkanlığı kaybettin', alt: '%' + f1(k.pay) + ' · ' + k.delege + ' delege', alinti: [esc(k.rakip), ' yeni genel başkan seçildi. Sen partide kalıyorsun; yeniden aday olabilir, delegeleri kazanabilirsin.'], tema: 'k', ticker: 'CJN · KURULTAYDA LİDERLİK DEĞİŞTİ · ' + esc(S.parti.ad).toUpperCase()}, queue);
}
function kurultayAdaySheet(k) {
  var etiket = k.tahmin >= 55 ? 'Şansın yüksek' : k.tahmin >= 42 ? 'Başa baş' : 'Zor ama imkânsız değil';
  sheet('<div class="lab">KURULTAY</div><h2>Genel başkanlığa aday olacak mısın?</h2><p class="small muted">Mevcut genel başkan: ' + esc(k.yeni) + '. Delege desteğin %' + Math.round(k.delege) + '. Tahmini oy payın yaklaşık %' + k.tahmin + ' (' + etiket + '). Kaybedersen desteğin ve itibarın düşer; aday olmazsan desteğin biraz erir.</p><button class="btn pri" id="kadayo">Aday ol</button><button class="btn" id="kadayh">Aday olma</button>', 'k', false);
  $('#kadayo').onclick = function () { closeSheet(true); var r = kurultayAday(S, true); render(); kurultaySonucSheet(r); };
  $('#kadayh').onclick = function () { closeSheet(true); kurultayAday(S, false); toast('Kurultayda aday olmadın.'); render(); queue(); };
}
function kurultaySonucSheet(k) {
  splash(k.kazandi ? {ikon: '🏆', ust: 'KURULTAY', baslik: 'Genel başkanlığı geri aldın', alt: '%' + f1(k.pay) + ' · ' + k.delege + ' delege', satirlar: [esc(k.rakip) + ' yenildi.', 'Parti birliği zedelendi; toparlaman gerek.'], tema: 'k', konfeti: true, ticker: 'CJN · KURULTAY · ' + esc(S.lider.ad).toUpperCase() + ' GENEL BAŞKANLIĞA DÖNDÜ'} :
    {ikon: '📉', ust: 'KURULTAY', baslik: 'Bu kez olmadı', alt: '%' + f1(k.pay) + ' · ' + k.delege + ' delege', alinti: [esc(k.rakip), ' görevini sürdürüyor. Delegeleri yeniden ikna etmeye devam edebilirsin.'], tema: 'k', ticker: 'CJN · KURULTAY SONUCU · ' + esc(S.parti.ad).toUpperCase()}, queue);
}
/* ---- Meclis sekmesi ---- */
function meclisHtml() {
  var mc = mcInit(S), gov = govMu(S, S.pid), hk = 0, h = ''; S.gov.forEach(function (id) { hk += S.meclis[id] || 0; });
  h += '<div class="card" style="padding:10px 6px 4px"><h3 style="padding:0 8px">Meclis dağılımı<small>600 MV</small></h3>' + yarimDaire(S.meclis) + '<div class="pano-lg" style="justify-content:center;margin:2px 0 6px">' + siralama(S.meclis).filter(function (id) { return S.meclis[id] > 0; }).slice(0, 6).map(function (id) { return '<span class="lg"><i style="background:' + partiRengi(S, id) + '"></i>' + esc(partiAdi(S, id)) + ' <b>' + S.meclis[id] + '</b></span>'; }).join('') + '</div></div>';
  h += '<div class="card"><h3>' + (gov ? 'Yasama gücün' : 'Muhalefetteki gücün') + '<small>' + (gov ? hk + ' / 301' : (S.meclis[S.pid] || 0) + ' MV') + '</small></h3>' + (gov ? bar(Math.min(100, hk / 6), hk >= 301 ? 'var(--ok)' : 'var(--bad)') + '<div class="small muted" style="margin-top:6px">Genel Kurul ve komisyon geçme ihtimali sandalye, parti birliği, hizip sadakati ve ortakların yakınlığına bağlıdır. Genel ortalama %' + Math.round(yasaOlasilik(S) * 100) + '.</div>' : '<div class="small muted">Teklif vermek için Meclis\'te milletvekilin olmalı; gensoru için en az 20.</div>') + '</div>';
  var aktif = mc.teklif.filter(function (b) { return b.durum === 'komisyon' || b.durum === 'genel'; });
  h += '<div class="eyebrow">Meclis\'teki teklifler (' + aktif.length + '/2)</div>';
  if (aktif.length) aktif.forEach(function (b) { var y = YASA[b.id], m = yasaMetriks(S, b.id, b.opp); h += '<div class="card ycard" data-y="' + b.id + '" style="padding:11px 14px"><h3>' + esc(y.ad) + '<small>' + (b.durum === 'komisyon' ? KOMISYON[y.alan] + ' Komisyonu' : 'Genel Kurul') + (b.kapsam < 1 ? ' · değiştirildi' : '') + '</small></h3><div class="row small"><span>Aşama</span><b>' + (b.durum === 'komisyon' ? 'Komisyon · ' + Math.max(0, b.vade - S.ay) + ' ay' : 'Oylama gelecek ay') + '</b></div><div class="row small"><span>Komisyon başkanı</span><span>' + esc(partiAdi(S, m.baskan)) + '</span></div></div>'; });
  else h += '<div class="card"><div class="small muted">Şu an Meclis\'te teklifin yok. Aşağıdan bir konu seç.</div></div>';
  h += '<div class="eyebrow">Yeni yasa teklifi · 1 aksiyon</div><div class="card" style="padding:4px 14px">' + Object.keys(YASA).map(function (id) { var y = YASA[id], m = yasaMetriks(S, id, !gov), son = mc.gecmis.filter(function (g) { return g.id === id; })[0], bek = son && S.ay - son.ay < 6; return '<button class="row ycard" data-y="' + id + '" style="width:100%;text-align:left"><span>' + esc(y.ad) + ' <span class="tiny muted">' + KOMISYON[y.alan] + '</span></span><span class="small ' + (bek ? 'muted' : '') + '">' + (bek ? 'bekleme' : 'Komisyon %' + Math.round(m.komOlasilik * 100)) + '</span></button>'; }).join('') + '</div>';
  if (gov) h += '<div class="eyebrow">Hükümet eylemleri</div><button class="btn" id="gvo"' + (S.aksiyon.kalan <= 0 || S.ay - mc.guvenSon < 8 ? ' disabled' : '') + '>Güvenoyu iste<small>' + (S.ay - mc.guvenSon < 8 ? 'Son güvenoyundan ' + (S.ay - mc.guvenSon) + ' ay geçti, en az 8 gerekir' : 'Başarırsan birlik ve hizip sadakati artar; kaybedersen hükümet düşer · 1 aksiyon') + '</small></button>';
  else if (!muhalifMu(S)) h += '<div class="eyebrow">Muhalefet eylemleri</div><button class="btn" id="gso"' + (S.aksiyon.kalan <= 0 || (S.meclis[S.pid] || 0) < 20 ? ' disabled' : '') + '>Gensoru önergesi ver<small>' + ((S.meclis[S.pid] || 0) < 20 ? 'En az 20 milletvekili gerekir' : 'İktidar bakanlarından birini hedef al · 1 aksiyon') + '</small></button>';
  ebInit(S); var eu = erkenUygun(S);
  h += '<div class="eyebrow">Erken seçim</div><div class="card"><div class="row small"><span>Erken seçim baskısı</span><b>%' + Math.round(S.ebs) + '</b></div>' + bar(S.ebs, S.ebs > 60 ? 'var(--bad)' : 'var(--ac)') + '<div class="tiny muted" style="margin-top:6px">Baskı; çoğunluk kaybı, düşük itibar ve parti içi dağınıklıkla yükselir. ' + (eu.ok ? '' : esc(eu.msg)) + '</div>' +
    (muhalifMu(S) ? '' : gov ? '<button class="btn" id="ero" style="margin-top:8px"' + (S.aksiyon.kalan <= 0 || !eu.ok ? ' disabled' : '') + '>Erken seçim kararı al<small>Seçim 3 ay sonra · önde değilsen risk · 1 aksiyon</small></button>' : '<button class="btn" id="ebo" style="margin-top:8px"' + (S.aksiyon.kalan <= 0 || !eu.ok || (S.meclis[S.pid] || 0) < 10 ? ' disabled' : '') + '>Erken seçim kampanyası<small>İktidarı seçime zorla · 1 aksiyon</small></button>') + '</div>';
  if (gov && S.kpSoz && S.kpSoz.filter(function (z) { return !z.tamam; }).length) h += '<div class="eyebrow">Koalisyon taahhütleri</div><div class="card">' + S.kpSoz.filter(function (z) { return !z.tamam; }).map(function (z) { return '<div class="row small"><span>' + esc(partiAdi(S, z.id)) + ' · ' + esc(YASA[z.yasa].ad) + '</span><b class="' + (z.son - S.ay <= 3 ? 'badc' : '') + '">' + Math.max(0, z.son - S.ay) + ' ay</b></div>'; }).join('') + '</div>';
  h += '<div class="eyebrow">Komisyon başkanlıkları</div><div class="card">' + (function () { var kd = komisyonDagilim(S); return KOM_SIRA.map(function (k) { return '<div class="row small"><span>' + KOMISYON[k] + '</span><b class="' + (kd[k] === S.pid ? 'good' : govMu(S, kd[k]) ? '' : 'muted') + '">' + esc(partiAdi(S, kd[k])) + '</b></div>'; }).join(''); })() + '<div class="tiny muted" style="margin-top:6px">Başkanlık sandalye dağılımına göre paylaşılır; muhalefet başkanı teklifi zorlaştırır.</div></div>';
  h += '<div class="eyebrow">Hükümet</div><div class="card"><div class="chiprow">' + S.gov.map(function (id) { return '<span class="pill ac">' + esc(partiAdi(S, id)) + '</span>'; }).join('') + '</div></div><div class="eyebrow">Meclis dağılımı</div><div class="card">' + koltukSatir(S.meclis) + '</div>';
  if (mc.gecmis.length) h += '<div class="eyebrow">Yasama geçmişi</div><div class="card">' + mc.gecmis.slice(0, 8).map(function (g) { return '<div class="row small"><span>' + (g.sonuc === 'kabul' ? '📜' : '❌') + ' ' + esc(g.ad) + '<span class="tiny muted"> · ' + g.t + '</span></span><span class="' + (g.sonuc === 'kabul' ? 'good' : 'badc') + '">' + (g.sonuc === 'komisyon' ? 'komisyonda' : g.evet + '–' + g.hayir) + '</span></div>'; }).join('') + '</div>';
  return h;
}
function yasaSheet(id) {
  var y = YASA[id], mc = mcInit(S), gov = govMu(S, S.pid), m = yasaMetriks(S, id, !gov), ov = oylamaHesap(S, id, !gov, 1), halk = Math.round(m.halk * 100);
  var hz = S.hzb ? S.hzb.map(function (g) { var l = (y.hz && y.hz[g.id]) || 0; return '<div class="row small"><span>' + g.ad + '</span><span class="' + (l > 0.15 ? 'good' : l < -0.15 ? 'badc' : 'muted') + '">' + (l > 0.15 ? 'destekler' : l < -0.15 ? 'karşı' : 'kararsız') + ' · sadakat ' + Math.round(g.sad) + '</span></div>'; }).join('') : '';
  var grp = Object.keys(y.halk || {}).map(function (g) { return grupAdi(g) + ' ' + (y.halk[g] > 0 ? '▲' : '▼'); }).join(' · ');
  sheet('<div class="lab">YASA TEKLİFİ · ' + KOMISYON[y.alan].toUpperCase() + '</div><h2>' + esc(y.ad) + '</h2><p class="small muted">' + esc(y.metin) + '</p>' +
    '<div class="card" style="margin:0 0 10px"><div class="row small"><span>Komisyon başkanı</span><b>' + esc(partiAdi(S, m.baskan)) + '</b></div><div class="row small"><span>Komisyondan geçme</span><b>%' + Math.round(m.komOlasilik * 100) + '</b></div><div class="row small"><span>İlgili bakan performansı</span><b>' + Math.round(m.bakanPerf) + '</b></div><div class="row small"><span>Halk desteği</span><b>%' + halk + '</b></div><div class="row small"><span>Tahmini Genel Kurul oyu</span><b class="' + (ov.kabul ? 'good' : 'badc') + '">' + ov.evet + ' – ' + ov.hayir + '</b></div></div>' +
    '<div class="eyebrow">Hizip tutumları</div><div class="card" style="margin:0 0 10px">' + hz + '</div><div class="tiny muted">Etkilenen kesimler: ' + grp + '</div>' +
    (ov.defect.length ? '<div class="eyebrow">Muhtemel ayrılıklar</div><div class="card" style="margin:0 0 10px">' + ov.defect.map(function (d) { return '<div class="row small"><span>' + esc(d.ad) + '</span><span class="badc">~' + d.n + ' oy · ' + esc(d.neden) + '</span></div>'; }).join('') + '</div>' : '') +
    '<button class="btn pri" id="yh" style="margin-top:10px"' + (S.aksiyon.kalan <= 0 ? ' disabled' : '') + '>Teklifi Meclis\'e sun<small>' + para(aksiyonMaliyet(S, aksiyonBul('yasa'), null)) + ' · 1 aksiyon</small></button><button class="btn ghost" id="k" style="margin-top:8px">Kapat</button>');
  $('#k').onclick = function () { closeSheet(true); }; $('#yh').onclick = function () { closeSheet(true); sonucGoster(aksiyonYap(S, 'yasa', id)); };
}
function guvenSheet() {
  var pS = S.meclis[S.pid] || 0, hs = grupOrtSad(S), fp = clamp((55 - S.stat.birlik) / 100, 0, 0.4) + clamp((50 - hs) / 200, 0, 0.3), f = pS * (1 - fp);
  S.gov.forEach(function (id) { if (id !== S.pid) f += (S.meclis[id] || 0) * (1 - clamp((18 - (S.yk[id] || 0)) / 100, 0, 0.5)); });
  sheet('<div class="lab">GÜVENOYU</div><h2>Hükümet için güvenoyu istenecek mi?</h2><p class="small muted">Kendi grubunun ve ortaklarının oyuna güveniyorsan güçlü bir mesaj verirsin. Eşik: 301 oy. Şu anki tahmin: <b class="' + (f >= 301 ? 'good' : 'badc') + '">~' + Math.round(f) + '</b>. Başarısız olursan hükümet düşer, bakanlar yenilenir.</p><button class="btn pri" id="gvy">Güvenoyu iste<small>1 aksiyon</small></button><button class="btn ghost" id="k" style="margin-top:8px">Vazgeç</button>');
  $('#k').onclick = function () { closeSheet(true); }; $('#gvy').onclick = function () { closeSheet(true); sonucGoster(aksiyonYap(S, 'guvenoyu')); };
}
function gensoruSheet() {
  sheet('<div class="lab">GENSORU</div><h2>Hangi bakan hedef alınsın?</h2>' + BAKANLIK.map(function (b) { var bp = bakanPerf(S, b[1]), mc = mcInit(S), bek = mc.gensoru[b[1]] !== undefined && S.ay - mc.gensoru[b[1]] < 4; return '<button class="opt" data-b="' + b[1] + '"' + (bek ? ' disabled' : '') + '><b>' + b[0] + ' Bakanı</b><span class="small ' + (bp < 40 ? 'good' : 'muted') + '">Performans ' + bp + (bp < 40 ? ' · zayıf halka' : '') + (bek ? ' · yakın zamanda soruldu' : '') + '</span></button>'; }).join('') + '<button class="btn ghost" id="k" style="margin-top:8px">Vazgeç</button>');
  $('#k').onclick = function () { closeSheet(true); };
  document.querySelectorAll('.opt').forEach(function (o) { o.onclick = function () { closeSheet(true); sonucGoster(aksiyonYap(S, 'gensoru', o.dataset.b)); }; });
}
function oylamaSheet(it) {
  var o = it.ov, tot = o.evet + o.hayir + o.cekimser, pe = Math.round(o.evet / tot * 100), ph = Math.round(o.hayir / tot * 100);
  sheet('<div class="lab">GENEL KURUL OYLAMASI</div><h2>' + esc(it.ad) + '</h2><div class="card" style="margin:0 0 10px"><div style="display:flex;height:16px;border-radius:8px;overflow:hidden"><i style="width:' + pe + '%;background:var(--ok)"></i><i style="width:' + (100 - pe - ph) + '%;background:#888"></i><i style="width:' + ph + '%;background:var(--bad)"></i></div><div class="row small" style="margin-top:8px"><span>Evet</span><b class="good">' + o.evet + '</b></div><div class="row small"><span>Hayır</span><b class="badc">' + o.hayir + '</b></div><div class="row small"><span>Çekimser / katılmayan</span><b>' + o.cekimser + '</b></div></div><h2 style="font-size:20px;color:' + (o.kabul ? 'var(--ok)' : 'var(--bad)') + '">' + (o.kabul ? 'Teklif kabul edildi' : 'Teklif reddedildi') + '</h2>' +
    (o.defect.length ? '<div class="eyebrow">Ayrılanlar</div><div class="card" style="margin:0 0 10px">' + o.defect.map(function (d) { return '<div class="row small"><span>' + esc(d.ad) + '</span><span class="badc">~' + d.n + ' · ' + esc(d.neden) + '</span></div>'; }).join('') + '</div>' : '') + '<p class="small muted">' + esc(it.msg) + '</p><button class="btn pri" id="k">Devam</button>');
  $('#k').onclick = function () { closeSheet(true); queue(); };
}
/* ---- Karargâh sekmesi ---- */
function karRow(x) {
  var tr = x.trend > 0.05 ? '<span class="good">▲' + f1(x.trend) + '</span>' : x.trend < -0.05 ? '<span class="badc">▼' + f1(-x.trend) + '</span>' : '<span class="muted">–</span>';
  return '<button class="row" data-il="' + x.i + '" style="width:100%;text-align:left"><span>' + esc(x.ad) + ' <span class="tiny muted">' + x.mv + ' MV' + (x.ilm > 0.02 ? ' · 🎯' : '') + '</span></span><span class="small"><b>%' + f1(x.pay) + '</b> <span class="tiny muted">±' + f1(x.hata) + '</span> ' + tr + '</span></button>';
}
function tKarargah() {
  var K = karargah(S), h = '', yk = K.secim ? (K.secim.tip === 'genel' ? 'Genel seçime ' : 'Yerel seçime ') + K.secim.ay + ' ay' : '';
  h += '<div class="card"><h3>Seçim karargâhı<small>' + yk + '</small></h3>';
  if (!K.girer) h += '<div class="small badc">Seçime girme şartı sağlanmıyor: en az 41 ilde teşkilat gerekir (şimdi ' + teskilatSayisi(S) + ').</div>';
  h += '<div class="row small"><span>Bugün seçim olsa koltuk</span><b>' + K.koltuk + ' / ' + K.toplam + '</b></div>' + bar(K.koltuk / 6) +
    '<div class="row small"><span>Ulusal oy (blok dahil)</span><b class="' + (K.baraj ? 'good' : 'badc') + '">%' + f1(K.oy) + (K.baraj ? '' : ' · baraj altı') + '</b></div>' +
    '<div class="tiny muted" style="margin-top:6px">İl anketleri örneklem hatası taşır (±). Küçük illerde tahmin daha belirsizdir.</div></div>';
  h += '<div class="eyebrow">Hedef: kazanılabilir iller (' + K.firsat.length + ')</div><div class="card">' + (K.firsat.length ? K.firsat.slice(0, 6).map(karRow).join('') : '<div class="small muted">Kazanılabilir il yok.</div>') + '</div>';
  h += '<div class="eyebrow">Savunulacak iller (' + K.tehlike.length + ')</div><div class="card">' + (K.tehlike.length ? K.tehlike.slice(0, 6).map(karRow).join('') : '<div class="small muted">Dar farkla öndeki il yok.</div>') + '</div>';
  h += '<div class="eyebrow">Güvenli iller (' + K.guvenli.length + ')</div><div class="card">' + (K.guvenli.length ? K.guvenli.slice(0, 4).map(karRow).join('') : '<div class="small muted">Rahat önde olduğun il yok.</div>') + '</div>';
  h += '<div class="eyebrow">Zayıf iller</div><div class="card">' + K.kayip.slice(0, 4).map(karRow).join('') + '</div>';
  h += '<div class="tiny muted" style="margin:8px 0">İle dokun: ayrıntı ve il kampanyası. 🎯 = aktif kampanya yatırımı (zamanla söner).</div>';
  return h;
}
/* ---- Aşama 2 arayüzü: kurmaylar, il başkanları, Meclis grubu, hükümet ---- */
function asama2Html() {
  asama2Init(S); var h = '';
  if (govMu(S, S.pid)) { var hd = hukumetDurum(S); h += '<div class="eyebrow">Hükümet istikrarı</div><div class="card"><div class="row small"><span>Hükümet koltuğu</span><b class="' + (hd.cogunluk ? 'good' : 'badc') + '">' + hd.koltuk + ' / 301</b></div>' + bar(Math.min(100, hd.koltuk / 3.01), hd.cogunluk ? 'var(--ok)' : 'var(--bad)') + '<div class="small muted" style="margin-top:6px">' + (hd.cogunluk ? 'Meclis çoğunluğun var; yasalar daha kolay geçer.' : 'Çoğunluğun yok (' + S.azMaj + '/3 ay). Üç ay sürerse hükümet güvenoyu alamaz.') + (hd.ortak ? ' Koalisyon ortakların sadakati zayıflarsa çekilebilir.' : '') + '</div></div>'; }
  h += '<div class="eyebrow">Kurmaylar</div>' + Object.keys(KURMAY).map(function (t) { var k = S.kurmay[t]; return '<div class="card kmy" data-km="' + t + '" style="padding:11px 14px;cursor:pointer"><h3>' + (k ? esc(k.ad) : 'Boş kadro') + '<small>' + KURMAY[t][0] + '</small></h3>' + (k ? '<div class="row" style="border:0"><span class="k small">Performans</span><b class="num">' + k.perf + '</b></div>' + bar(k.perf) : '<div class="small muted">' + KURMAY[t][1] + '. Atamak için dokun.</div>') + '</div>'; }).join('');
  h += '<div class="eyebrow">Meclis grubu · hizipler</div><div class="card">' + S.hzb.map(function (g) { return '<div class="row small"><span>' + g.ad + ' · %' + Math.round(g.guc) + ' ağırlık</span><b class="' + (g.sad < 30 ? 'badc' : g.sad > 60 ? 'good' : '') + '">Sadakat ' + Math.round(g.sad) + '</b></div>' + bar(g.sad, g.sad < 30 ? 'var(--bad)' : 'var(--ok)'); }).join('') + '<div class="small muted" style="margin-top:6px">Sadakati 25 altına inen hizip grupta oy vermeyebilir; milletvekili kaybedebilirsin. Parti birliği ve itibar sadakati belirler.</div></div>';
  var zay = []; S.ilb.forEach(function (k, i) { if (S.org[i] > 0) zay.push({i: i, k: k}); }); zay.sort(function (a, b) { return a.k.sad - b.k.sad; });
  h += '<div class="eyebrow">İl başkanları · en riskliler</div><div class="card">' + zay.slice(0, 5).map(function (z) { return '<div class="row small"><span class="kpr">' + portre(z.k.ad, 24, {id: 'ilb' + z.i, mood: kisiMood(z.k)}) + ILLER[z.i].ad + ' · ' + esc(z.k.ad) + '</span><b class="' + (z.k.sad < 30 ? 'badc' : '') + '">' + Math.round(z.k.sad) + '</b></div>'; }).join('') + '<div class="small muted" style="margin-top:6px">Sadakati düşen il başkanı istifa edebilir; il teşkilatı zayıflar. Toplam ' + zay.length + ' ilde teşkilatın var.</div></div>';
  return h;
}
function kurmaySheet(t) {
  var k = S.kurmay[t], mal = 0.35e6 * (S.makro.fiyat / 100);
  sheet('<div class="lab">KURMAY</div><h2>' + KURMAY[t][0] + '</h2><p class="small muted">' + KURMAY[t][1] + '.</p>' + (k ? '<div class="card" style="margin:0 0 10px"><div class="row"><span class="k">' + esc(k.ad) + '</span><b class="num">' + k.perf + '</b></div>' + bar(k.perf) + '</div>' : '') + '<button class="btn pri" id="kmA"' + (S.aksiyon.kalan <= 0 ? ' disabled' : '') + '>' + (k ? 'Değiştir' : 'Ata') + '<small>' + para(mal) + ' · 1 aksiyon</small></button><button class="btn ghost" id="kmK" style="margin-top:8px">Kapat</button>');
  $('#kmK').onclick = function () { closeSheet(true); };
  $('#kmA').onclick = function () { var r = kurmayAta(S, t); closeSheet(true); toast(r.msg); kayit(); render(); };
}
/* ---- muhalefet paneli ---- */
function muhalifPanel() {
  var p = S.pd, b = S.yeniBaskan, ku = (S.kurultay || []).filter(function (k) { return k.y * 12 + k.m > S.tarih.y * 12 + S.tarih.m; })[0];
  var t = kurultayTahmin(S);
  return '<div class="card"><h3>Genel başkan değilsin<small>' + esc(pdTier(S)) + '</small></h3><div class="small muted" style="margin-bottom:8px">Parti ' + esc(b.ad) + ' liderliğinde. Parti kaynaklarını kullanamazsın; gücün delege desteğine, itibarına ve yeni başkanın zayıflığına bağlı.</div>' +
    '<div class="row small"><span>Delege desteği</span><b>%' + Math.round(p.destek) + '</b></div>' + bar(p.destek, 'var(--gold)') +
    '<div class="row small"><span>Hizip gücü</span><b>' + Math.round(p.hizip) + '</b></div>' + bar(p.hizip, 'var(--warn,#f0a030)') +
    '<div class="row small"><span>Kişisel itibar</span><b>' + Math.round(p.itibar) + '</b></div>' + bar(p.itibar, 'var(--ok)') +
    '<div class="row small"><span>' + esc(b.ad) + ' gücü</span><b>' + Math.round(b.guc) + '</b></div>' + bar(b.guc, 'var(--bad)') +
    '<div class="row small"><span>Tahmini kurultay payı</span><b>%' + Math.round(t) + '</b></div>' +
    '<div class="row small"><span>Sonraki kurultay</span><b>' + (ku ? AYLAR_UZUN[ku.m - 1] + ' ' + ku.y : 'yok') + '</b></div></div>';
}
/* ---- anket ---- */
function tAnket() {
  var s = siralama(S.anket), mx = S.anket[s[0]], prev = S.anketPrev, tum = S.anketTum || [], h = '';
  if (tum.length > 1) {
    var ids = Object.keys(tum[tum.length - 1].v), W = 300, H = 120, mn = 0, hi = 0;
    tum.forEach(function (t) { ids.forEach(function (id) { if (t.v[id] > hi) hi = t.v[id]; }); }); hi = Math.ceil(hi / 5) * 5 || 5;
    var lines = ids.map(function (id) { var pts = []; tum.forEach(function (t, i) { if (t.v[id] !== undefined) pts.push((i * W / (tum.length - 1)).toFixed(1) + ',' + (H - 6 - t.v[id] / hi * (H - 12)).toFixed(1)); }); return '<polyline class="cz" pathLength="1" points="' + pts.join(' ') + '" fill="none" stroke="' + partiRengi(S, id) + '" stroke-width="' + (id === S.pid ? 3 : 1.8) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }).join('');
    var grid = [0, 1, 2, 3].map(function (g) { var y = 6 + g * (H - 12) / 3; return '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,.07)"/><text x="2" y="' + (y - 2) + '" fill="#9aa1b4" font-size="7">%' + Math.round(hi * (1 - g / 3)) + '</text>'; }).join('');
    h += '<div class="card"><h3>Anket karşılaştırması<small>son ' + tum.length + ' ay</small></h3><svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto" role="img" aria-label="Parti anket grafiği">' + grid + '<g class="rvl">' + lines + '</g></svg><div class="legend" style="margin-top:6px">' + ids.map(function (id) { return '<span><i style="background:' + partiRengi(S, id) + '"></i>' + esc(partiAdi(S, id)) + '</span>'; }).join('') + '</div></div>';
  }
  h += '<div class="card"><h3>Popülerlik<small>Ulusal anket</small></h3>';
  s.slice(0, 12).forEach(function (id, i) {
    var me = id === S.pid, d = prev && prev[id] !== undefined ? S.anket[id] - prev[id] : 0;
    h += '<div class="pr' + (me ? ' me' : '') + '"' + (me ? '' : ' data-ld="' + id + '" style="cursor:pointer"') + '>' + rozet(id, 26) + '<div><div class="nm"><span>' + (i + 1) + '. ' + esc(partiAdi(S, id)) + (me ? ' <span class="pill go">Sen</span>' : '') + '</span></div><div class="pbar"><i style="width:' + (S.anket[id] / mx * 100) + '%;background:' + partiRengi(S, id) + '"></i></div></div><b class="num">%' + f1(S.anket[id]) + (Math.abs(d) >= 0.05 ? ' <span class="tiny ' + (d > 0 ? 'good' : 'badc') + '">' + (d > 0 ? '▲' : '▼') + f1(Math.abs(d)) + '</span>' : '') + '</b></div>';
  });
  return h + '<div class="tiny muted" style="margin-top:8px">Baraj %7. İttifak içindeki partiler toplamla barajı geçer. Rakip liderin profili için partiye dokun.</div></div>';
}
/* ---- lider profili ---- */
var HUY = ['Pragmatik', 'Hırslı', 'Tecrübeli', 'Sert üslup', 'Uzlaşmacı', 'Karizmatik'];
function liderSheet(id) {
  var p = partiBul(id); if (!p) return; var hs = 0; for (var i = 0; i < id.length; i++) hs += id.charCodeAt(i);
  var ib = ideoBul(p.ideo), gov = govMu(S, id), y = yakinlik(S, id);
  if (S.mod !== undefined && typeof rkInit === 'function') rkInit(S);
  sheet('<div class="lp">' + portre(liderAdi(id), 56, {renk: p.renk, id: 'L' + id, mood: 0}) + '<div><div class="lab">Parti lideri</div><h2 style="margin:2px 0">' + esc(liderAdi(id)) + '</h2><div class="small muted">' + esc(p.ad) + ' · ' + ib.ad + '</div></div></div>' +
    '<div class="grid2" style="margin:12px 0"><div class="card" style="margin:0;padding:10px"><div class="tiny muted">Anket</div><b>%' + f1(S.anket[id] || 0) + '</b></div><div class="card" style="margin:0;padding:10px"><div class="tiny muted">Milletvekili</div><b>' + (S.meclis[id] || 0) + '</b></div><div class="card" style="margin:0;padding:10px"><div class="tiny muted">Konum</div><b>' + (gov ? 'İktidar' : 'Muhalefet') + '</b></div><div class="card" style="margin:0;padding:10px"><div class="tiny muted">Sana yakınlık</div><b>' + y + '</b></div></div>' +
    (function () { var r = S.rk && S.rk[id]; if (!r) return ''; var g = Math.round(r.guc);
      return '<div class="card" style="margin:0 0 10px;padding:12px"><div class="row"><span class="k">Liderlik gücü</span><b class="num">' + g + '</b></div><div class="bar"><i style="width:' + g + '%;background:' + (g < 35 ? 'var(--bad)' : p.renk) + '"></i></div>' +
        '<div class="row" style="margin-top:8px"><span class="k">Karakter</span><span class="small">' + KARAKT[r.karakter] + ' · ' + EKOY[r.eko] + '</span></div><div class="row"><span class="k">Güncel hat</span><span class="small">' + STRAT[r.strateji] + '</span></div>' +
        '<div class="row"><span class="k">Güçlü bölgeler</span><span class="small">' + r.kale.map(function (b) { return BOLGE[b]; }).join(', ') + '</span></div>' + (r.kriz ? '<div class="pill" style="margin-top:6px;color:var(--bad)">Liderlik krizi yaşıyor</div>' : '') +
        (r.gecmis.length ? '<div class="tiny muted" style="margin-top:8px">' + r.gecmis.slice(0, 3).map(function (x) { return esc(x[0] + ': ' + x[1]); }).join('<br>') + '</div>' : '') + '</div>'; })() +
    '<div class="chiprow"><span class="pill ac">' + HUY[hs % 6] + '</span><span class="pill">' + (gov ? 'Mevcut düzeni savunur' : 'Değişim söylemi') + '</span></div><button class="btn ghost" id="k" style="margin-top:14px">Kapat</button>');
  $('#k').onclick = function () { closeSheet(true); };
}
function ekBagla() { document.querySelectorAll('[data-ld]').forEach(function (b) { b.onclick = function (e) { if (e.target.closest('button')) return; liderSheet(b.dataset.ld); }; }); }
/* ---- kariyer, merkez, rozetler ---- */
var KARIYER = [['🌱', 'Kurucu'], ['📍', 'Parti Lideri'], ['🏛️', 'Meclis Lideri'], ['⚔️', 'Ana Muhalefet'], ['🤝', 'İktidar Ortağı'], ['👑', 'Cumhurbaşkanı']];
function kariyerSeviye() {
  var l = S.mod === 'mevcut' ? 1 : 0, mv = S.meclis[S.pid] || 0;
  if (teskilatSayisi(S) >= 41) l = Math.max(l, 1); if (mv > 0 && S.arsiv && S.arsiv.some(function (a) { return a.tip === 'genel'; })) l = Math.max(l, 2);
  if (l >= 2 && (oyuncuSira(S) <= 2 || mv >= 100)) l = 3; if (l >= 2 && govMu(S, S.pid)) l = 4; if (S.cbOyuncu) l = 5; if (muhalifMu(S)) l = Math.min(l, S.pd.vekil ? 2 : 1); return l;
}
function kariyerHtml() {
  var l = kariyerSeviye();
  return '<div class="car">' + KARIYER.map(function (k, i) { return '<div class="cn' + (i <= l ? ' on' : '') + (i === l ? ' cur' : '') + '"><span>' + k[0] + '</span><small>' + k[1] + '</small></div>'; }).join('') + '</div>';
}
var ROZET = [
  ['ilk', '👣', 'İlk Adım', 'İlk aksiyonunu kullandın', function () { return !!(S.kararlar && S.kararlar.length >= 1); }],
  ['ay3', '📆', 'Üç Ay Sahada', '3 ay boyunca partiyi yönettin', function () { return S.ay >= 3; }],
  ['t41', '📍', 'Sahaya Yayıldı', '41 ilde teşkilat', function () { return teskilatSayisi(S) >= 41; }],
  ['t81', '🗺️', 'Her İlde Varız', '81 ilde teşkilat', function () { return teskilatSayisi(S) >= 81; }],
  ['b7', '📈', 'Baraj Aşıldı', 'Anket %7 ve üzeri', function () { return S.ms && S.ms.b7; }],
  ['s1', '🥇', 'Anket Lideri', 'Anketlerde birinci', function () { return S.ms && S.ms.s1; }],
  ['u100', '👥', '100 Bin Üye', 'Üye sayısı 100 bin', function () { return S.stat.uye >= 100000; }],
  ['mv', '🏛️', 'Meclis\'e Girdi', 'Genel seçimde sandalye', function () { return S.arsiv && S.arsiv.some(function (a) { return a.tip === 'genel' && a.ben[1] > 0; }); }],
  ['cb', '👑', 'Cumhurbaşkanı', 'Cumhurbaşkanlığı seçimini kazan', function () { return S.cbOyuncu; }],
  ['ku', '🏆', 'Kurultay Galibi', 'Kurultayı kazan', function () { return S.tarihce && S.tarihce.some(function (e) { return e.m.indexOf('genel başkanlığı %') >= 0; }); }],
  ['yr', '🏙️', 'Yerelde Güçlü', 'Yerel seçimde 20+ il', function () { return S.arsiv && S.arsiv.some(function (a) { return a.tip === 'yerel' && a.ben >= 20; }); }],
  ['ks', '💰', 'Dolu Kasa', '50 milyon ₺ kasa', function () { return S.stat.kasa >= 50e6; }],
  ['it', '🤝', 'İttifakçı', 'Bir ittifak kur', function () { var it = oyuncuIttifak(S); return it && it.uyeler.length > 1 && it.ad !== 'Cumhur İttifakı'; }],
  ['sz', '🤞', 'Sözünün Eri', '3 siyasi sözü tut', function () { return (S.sozler || []).filter(function (z) { return z.durum === 'tutuldu'; }).length >= 3; }],
  ['kv', '📰', 'Karar Verici', '15 karar kartı oyna', function () { return (S.kartGecmis || []).length >= 15; }],
  ['ir', '🏛️', 'Hükümet Kurdu', 'İktidara gel', function () { return govMu(S, S.pid); }],
  ['mv100', '🪑', 'Güçlü Grup', 'Meclis\'te 100 sandalye', function () { return (S.meclis[S.pid] || 0) >= 100; }],
  ['mv301', '⚖️', 'Salt Çoğunluk', 'Meclis\'te 301 sandalye', function () { return (S.meclis[S.pid] || 0) >= 301; }],
  ['u500', '👨‍👩‍👧‍👦', 'Yarım Milyon', '500 bin üye', function () { return S.stat.uye >= 500000; }],
  ['kz5', '🌪️', 'Krizde Soğukkanlı', '5 kriz kartını yönet', function () { return (S.kartGecmis || []).filter(function (k) { return kartKat(k.id) === 'kriz'; }).length >= 5; }],
  ['sz5', '📜', 'Söz Senedi', '5 siyasi sözü tut', function () { return (S.sozler || []).filter(function (z) { return z.durum === 'tutuldu'; }).length >= 5; }],
  ['yr40', '🏙️', 'Yerel Fatih', 'Yerel seçimde 40+ il', function () { return S.arsiv && S.arsiv.some(function (a) { return a.tip === 'yerel' && a.ben >= 40; }); }],
  ['ay36', '⏳', 'Üç Yıl Dayandı', '36 ay hayatta kal', function () { return S.ay >= 36; }],
  ['ay75', '🧭', 'Uzun Yürüyüş', '75 aya ulaş', function () { return S.ay >= 75; }],
  ['ks100', '🏦', 'Hazine', '100 milyon ₺ kasa', function () { return S.stat.kasa >= 100e6; }],
  ['bel10', '🏘️', 'Belediye Zinciri', '10 ilde belediye', function () { return bldOzet(S).n >= 10; }],
  ['a35', '🌟', 'Halkın Lideri', 'Anket %35 ve üzeri', function () { return S.anketOyuncu >= 35; }],
  ['ref3', '🛠️', 'Reformcu', '3 farklı hükümet reformu yap', function () { return Object.keys(S.reformSon || {}).length >= 3; }],
  ['gdn', '⚡', 'Geri Dönüş', 'Anket %10 altından %25 üstüne çık', function () { var g = S.anketGecmis || [], d = false; g.forEach(function (x) { if (x.p < 10) d = true; }); return d && S.anketOyuncu >= 25; }, 1]
];
function rozetKontrol() {
  if (!S || S.bitti) return; S.rozet = S.rozet || {}; var yeni = [];
  ROZET.forEach(function (r) { if (!S.rozet[r[0]] && r[4]()) { S.rozet[r[0]] = 1; yeni.push(r); profilRozet(r[0]); } });
  yeni.forEach(function (r, i) { setTimeout(function () { rozetKutla(r); }, 600 + i * 3100); }); if (yeni.length) kayit();
}
function hqSvg() {
  var n = teskilatSayisi(S), fl = 1 + Math.min(7, Math.floor(n / 12)), uy = Math.min(1, S.stat.uye / 200000) * 0.85 + 0.15, x0 = 105, fw = 90, fh = 17, gy = 172, o = '', f, c;
  for (f = 0; f < fl; f++) { var y = gy - (f + 1) * fh; o += '<rect x="' + x0 + '" y="' + y + '" width="' + fw + '" height="' + fh + '" fill="' + (f % 2 ? '#2a2433' : '#332b3d') + '"/>'; for (c = 0; c < 5; c++) { var on = ((f * 7 + c * 13) % 10) / 10 < uy; o += '<rect class="' + (on ? 'wl' : '') + '" x="' + (x0 + 8 + c * 16) + '" y="' + (y + 4) + '" width="9" height="9" rx="1.5" fill="' + (on ? '#ffd27a' : '#1b1722') + '"/>'; } }
  var top = gy - fl * fh;
  return '<svg viewBox="0 0 300 190" class="hq" role="img" aria-label="Parti genel merkezi"><defs><linearGradient id="hqs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1230"/><stop offset="1" stop-color="#4a1a38"/></linearGradient></defs><rect width="300" height="190" fill="url(#hqs)" rx="14"/>' + [[30, 22], [70, 40], [240, 28], [270, 55], [200, 14], [150, 30]].map(function (s, i) { return '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="1.2" fill="#fff" opacity=".6" class="tw" style="animation-delay:' + i * 300 + 'ms"/>'; }).join('') +
    o + '<rect x="' + (x0 - 6) + '" y="' + (top - 5) + '" width="' + (fw + 12) + '" height="5" fill="#463a55"/><line x1="150" x2="150" y1="' + (top - 5) + '" y2="' + (top - 34) + '" stroke="#bbb" stroke-width="1.5"/><path class="flg" d="M150 ' + (top - 34) + 'h26l-6 7 6 7h-26z" fill="' + S.parti.renk + '"/><rect x="138" y="' + (gy - 14) + '" width="24" height="14" rx="2" fill="#1b1722"/><rect x="0" y="' + gy + '" width="300" height="18" fill="#150f1d"/><circle cx="52" cy="' + (gy - 8) + '" r="11" fill="#1f4b3a"/><rect x="50" y="' + (gy - 2) + '" width="4" height="6" fill="#4b3320"/><circle cx="252" cy="' + (gy - 6) + '" r="8" fill="#1f4b3a"/></svg>';
}
function tMerkez() {
  var n = teskilatSayisi(S), fl = 1 + Math.min(7, Math.floor(n / 12)), kal = fl >= 8 ? 0 : 12 - (n % 12);
  var h = '<div class="card" style="padding:12px">' + hqSvg() + '<div class="row" style="margin-top:8px"><span class="k">Genel Merkez seviyesi</span><b>' + fl + '/8</b></div><div class="small muted">' + (kal ? 'Bir üst kat için ' + kal + ' ilde daha teşkilat gerekir.' : 'Genel merkez en üst seviyede.') + ' Yanan pencereler üye sayısını gösterir.</div></div>';
  h += '<div class="eyebrow">Siyasi kariyer</div><div class="card">' + kariyerHtml() + '</div><div class="eyebrow">Rozetler · ' + ROZET.filter(function (r) { return S.rozet && S.rozet[r[0]]; }).length + '/' + ROZET.length + '</div><div class="rz">' + ROZET.map(function (r) { var on = S.rozet && S.rozet[r[0]]; return '<div class="rb' + (on ? ' on' : '') + '"><span>' + (on ? r[1] : '🔒') + '</span><b>' + r[2] + '</b><small>' + r[3] + '</small></div>'; }).join('') + '</div>';
  return h;
}
function tLider() {
  var yas = S.tarih.y - S.lider.dogum;
  return '<div class="card"><div class="lp">' + portre(S.lider.ad, 64, {renk: S.parti.renk, mood: S.stat.itibar > 60 ? 1 : S.stat.itibar < 35 ? -1 : 0}) + '<div><div class="lab">Genel başkan</div><h2 style="margin:2px 0">' + esc(S.lider.ad) + '</h2><div class="small muted">' + esc(S.parti.ad) + ' · ' + yas + ' yaşında</div></div></div><div class="chiprow" style="margin-top:10px"><span class="pill ac">' + S.stil.ad + '</span><span class="pill go">' + KARIYER[kariyerSeviye()][1] + '</span></div><div class="small muted" style="margin-top:8px">' + S.stil.not + '</div></div>' +
    '<div class="card"><h3>Durum</h3>' + [['İtibar', S.stat.itibar], ['Sağlık', S.stat.saglik], ['Stres', S.stat.stres]].map(function (x) { return '<div style="margin-bottom:8px"><div class="row" style="border:0;padding:0"><span class="k">' + x[0] + '</span><b class="num">' + Math.round(x[1]) + '</b></div>' + bar(x[1], x[0] === 'Stres' ? 'var(--gold)' : '') + '</div>'; }).join('') + '</div><button class="btn" data-a="tatil"' + (S.aksiyon.kalan <= 0 ? ' disabled' : '') + '>Kısa Tatil<small>Stresi düşürür (1 aksiyon)</small></button>';
}
/* ---- tarihçe: kariyer çizelgesi, seçim arşivi, karar arşivi ---- */
function tTarihce() {
  var tr = S.tarihce || [], mx = Math.max.apply(null, S.anketGecmis.map(function (x) { return x.p; })), ar = S.arsiv || [], kg = S.kartGecmis || [];
  var h = '<div class="card"><h3>' + esc(S.lider.ad) + '<small>' + esc(S.parti.ad) + '</small></h3>' + kariyerHtml() + '<div class="row"><span class="k">En yüksek anket</span><b>%' + f1(mx) + '</b></div><div class="row"><span class="k">Oynanan ay</span><b>' + S.ay + '</b></div></div>';
  var sz = S.sozler || [];
  h += kararGecmisiHtml();
  h += '<div class="eyebrow">Siyasi sözler</div>' + (sz.length ? sz.slice().reverse().map(function (z) { var d = z.durum === 'acik' ? ['Açık · ' + Math.max(0, z.vade - S.ay) + ' ay kaldı', ''] : z.durum === 'tutuldu' ? ['Tutuldu', 'good'] : ['Bozuldu', 'badc']; return '<div class="card" style="padding:12px 14px"><div class="row" style="border:0"><span class="small">🗣️ ' + esc(z.metin) + '</span><span class="small ' + d[1] + '" style="white-space:nowrap;margin-left:8px"><b>' + d[0] + '</b></span></div><div class="tiny muted">' + esc(z.t) + '</div></div>'; }).join('') : '<div class="card muted small">Henüz siyasi söz verilmedi.</div>');
  h += '<div class="eyebrow">Seçim arşivi</div>' + (ar.length ? ar.map(function (a) {
    if (a.tip === 'yerel') return '<div class="card" style="padding:12px 14px"><h3>🏙️ Yerel seçim<small>' + a.t + '</small></h3><div class="small">' + esc(S.parti.ad) + ': <b>' + a.ben + ' il</b> · ' + Object.keys(a.iller).sort(function (x, y) { return a.iller[y] - a.iller[x]; }).slice(0, 3).map(function (id) { return esc(partiAdi(S, id)) + ' ' + a.iller[id]; }).join(' · ') + '</div></div>';
    return '<div class="card" style="padding:12px 14px"><h3>🗳️ Genel seçim<small>' + a.t + '</small></h3>' + Object.keys(a.top).map(function (id) { return '<div class="row small"><span><span class="dot" style="display:inline-block;background:' + partiRengi(S, id) + ';margin-right:8px"></span>' + esc(partiAdi(S, id)) + '</span><span class="num">%' + f1(a.top[id][0]) + ' · ' + a.top[id][1] + ' MV</span></div>'; }).join('') + '<div class="small muted" style="margin-top:6px">Cumhurbaşkanı: ' + esc(a.cb) + (a.kz ? ' (sen)' : '') + ' · ' + (a.tur === 2 ? '2. tur' : '1. tur') + '</div></div>';
  }).join('') : '<div class="card muted small">Henüz seçim yapılmadı.</div>');
  var gr = {}; kg.forEach(function (k) { var c = kartKat(k.id); if (!KAT[c]) c = 'siyaset'; (gr[c] = gr[c] || []).push(k); });
  h += '<div class="eyebrow">Karar arşivi</div>' + (kg.length ? Object.keys(gr).map(function (c) { return '<details class="dt"><summary><span>' + KAT[c].ikon + ' ' + KAT[c].ad + '</span><span class="pill">' + gr[c].length + '</span></summary>' + gr[c].map(function (k) { return '<div class="row small"><span>' + esc(kartBul(k.id).baslik) + '<div class="tiny muted">' + esc(k.sec) + '</div></span><span class="muted tiny">' + k.t + '</span></div>'; }).join('') + '</details>'; }).join('') : '<div class="card muted small">Henüz karar verilmedi.</div>');
  return h + '<div class="eyebrow">Siyasi kariyer zaman çizelgesi</div><div class="tl">' + tr.map(function (e) { return '<div class="te"><span class="ti2">' + e.i + '</span><div><div class="muted tiny">' + e.t + '</div>' + esc(e.m) + '</div></div>'; }).join('') + '</div>';
}

/* ---- Koalisyon pazarlığı ---- */
function guvenSahne(r) {
  var g = r.ekstra.gr, ok = !!g.kabul;
  splash({ses: ok ? 'hukumet' : 'istifa', ikon: ok ? '✅' : '⚠️', ust: 'GÜVENOYU', baslik: ok ? 'Hükümet güvenoyu aldı' : 'Hükümet düştü', alt: g.evet + ' evet oyu', tema: ok ? 'b' : '', satirlar: ok ? ['Hükümet görevine devam ediyor.'] : [g.erken ? 'Erken seçim kararı alındı.' : 'Yeni kabine kuruldu.'], konfeti: false}, function () { sonucGoster(r, true); });
}
function gensoruSahne(r) {
  var g = r.ekstra.sr, ok = !!g.kabul;
  splash({ses: ok ? 'hukumet' : 'sahne', ikon: ok ? '⚖️' : '📣', ust: 'GENSORU', baslik: ok ? 'Gensoru kabul edildi' : 'Gensoru reddedildi', alt: g.evet + ' evet oyu · eşik 301', tema: ok ? 'b' : '', satirlar: [ok ? 'Bakan düştü.' : 'Hükümet bakanını korudu.', g.bp < 40 ? 'Bakanın zayıf performansı tartışmayı iktidara yükledi.' : ''].filter(Boolean)}, function () { sonucGoster(r, true); });
}
function hukumetSahne(m) {
  var hd = hukumetDurum(S), ort = (S.gov || []).map(function (id) { return esc(partiAdi(S, id)); }).join(' · ');
  splash({ses: 'hukumet', ikon: hd.cogunluk ? '🤝' : '🏛️', ust: 'HÜKÜMET', baslik: hd.cogunluk ? (hd.ortak ? 'Koalisyon hükümeti kuruldu' : 'Hükümet kuruldu') : 'Azınlık hükümeti', alt: hd.koltuk + ' milletvekili', tema: hd.cogunluk ? 'b' : '', satirlar: [ort, esc(m || '')].filter(Boolean)}, function () { render(); queue(); });
}
function koalisyonSheet(msg, iyi) {
  if (!S.kp) { queue(); return; }
  muzikMood('koalisyon');
  var ad = kpAdaylar(S), hd = hukumetDurum(S);
  sheet('<div class="lab">KOALİSYON PAZARLIĞI</div><h2>' + (hd.cogunluk ? 'Ortaklık güçlendirilebilir' : 'Çoğunluk için ' + S.kp.eksik + ' sandalye eksik') + '</h2>' + (msg ? '<p class="small ' + (iyi ? 'good' : 'badc') + '"><b>' + esc(msg) + '</b></p>' : '') + '<p class="small muted">Hükümetin ' + hd.koltuk + ' / 301 sandalyede. Kalan pazarlık hakkı: ' + (S.kp.max - S.kp.tur) + '. Bakanlık ve yasa taahhüdü teklifi kabul ihtimalini artırır; taahhüdü tutmazsan ortak seni yıpratır.</p>' +
    ad.slice(0, 6).map(function (a) { return '<button class="opt" data-k="' + a.id + '"' + (S.kp.tur >= S.kp.max ? ' disabled' : '') + '><b>' + esc(a.ad) + ' <span class="tiny muted">' + a.koltuk + ' MV</span></b><span class="small">Yakınlık ' + Math.round(a.yk) + ' · kabul ~%' + Math.round(a.olasilik * 100) + '</span></button>'; }).join('') +
    '<button class="btn ghost" id="kpb" style="margin-top:8px">' + (hd.cogunluk ? 'Tamam' : 'Azınlık hükümetiyle devam et') + '</button>');
  $('#kpb').onclick = function () { var m = kpBitir(S); closeSheet(true); kayit(); render(); hukumetSahne(m || 'Koalisyon süreci tamamlandı.'); };
  document.querySelectorAll('.opt').forEach(function (o) { o.onclick = function () { kpTeklifSheet(o.dataset.k); }; });
}
function kpTeklifSheet(id) {
  var yl = Object.keys(YASA).map(function (k) { return '<option value="' + k + '">' + esc(YASA[k].ad) + '</option>'; }).join('');
  sheet('<div class="lab">PAZARLIK · ' + esc(partiAdi(S, id)).toUpperCase() + '</div><h2>Teklifini belirle</h2><div class="card" style="margin:0 0 10px"><div class="row small"><span>Bakanlık sayısı</span><select id="kb"><option>0</option><option selected>1</option><option>2</option><option>3</option></select></div><div class="row small"><span>Yasa taahhüdü</span><select id="ky"><option value="">Yok</option>' + yl + '</select></div></div><div class="tiny muted" id="kpo"></div><button class="btn pri" id="kpt">Teklif et</button><button class="btn ghost" id="k" style="margin-top:8px">Geri</button>');
  function oz() { var y = $('#ky').value; $('#kpo').textContent = 'Kabul ihtimali ~%' + Math.round(kpOlasilik(S, id, +$('#kb').value, y || null) * 100); } oz(); $('#kb').onchange = oz; $('#ky').onchange = oz;
  $('#k').onclick = function () { koalisyonSheet(); };
  $('#kpt').onclick = function () { var r = kpTeklif(S, id, +$('#kb').value, $('#ky').value || null); if (!r.ok) { koalisyonSheet(); return; } if (r.bitti) { closeSheet(true); render(); sonucGoster({ok: true, msg: r.msg, chips: []}); } else koalisyonSheet(r.msg, r.kabul); };
}
function erkenSheet() {
  var eu = erkenUygun(S), onde = oyuncuSira(S) === 1;
  sheet('<div class="lab">ERKEN SEÇİM</div><h2>Seçimi öne çekelim mi?</h2><p class="small muted">Genel seçim 3 ay sonra yapılır; sonraki dönem de buna göre başlar. ' + (onde ? 'Anketlerde öndesin: karar güçlü bir hamle sayılır.' : 'Anketlerde önde değilsin: karar kumar olarak görülür, itibarın ve parti birliğin zarar görür.') + '</p><button class="btn pri" id="eky">Erken seçim kararı al<small>1 aksiyon</small></button><button class="btn ghost" id="k" style="margin-top:8px">Vazgeç</button>');
  $('#k').onclick = function () { closeSheet(true); }; $('#eky').onclick = function () { closeSheet(true); sonucGoster(aksiyonYap(S, 'erken')); };
}

/* ---- Belediye sekmesi ---- */
function tBelediye() {
  var o = bldOzet(S), b = bldInit(S), sec = S.sonrakiSecim, yk = null;
  S.takvim.forEach(function (t) { var d = t.y * 12 + t.m - tarihNo(S.tarih); if (t.tip === 'yerel' && d >= 0 && yk === null) yk = d; });
  var h = '<div class="card"><h3>Belediyelerin<small>' + o.n + ' / 81 il</small></h3>';
  h += '<div class="row small"><span>Ağırlıklı performans</span><b class="' + (o.ort >= 55 ? 'good' : o.ort < 40 ? 'badc' : '') + '">' + Math.round(o.ort) + '</b></div>' + bar(o.ort, o.ort >= 55 ? 'var(--ok)' : o.ort < 40 ? 'var(--bad)' : 'var(--ac)');
  h += '<div class="row small" style="margin-top:6px"><span>İyi yönetilen (55+)</span><b>' + o.iyi + '</b></div><div class="row small"><span>Büyükşehir</span><b>' + o.buyuk + '</b></div><div class="row small"><span>Son 8 ayda skandal</span><b class="' + (o.skandal ? 'badc' : '') + '">' + o.skandal + '</b></div><div class="row small"><span>Aylık gelir</span><b>' + para(o.gelir * S.makro.fiyat / 100) + '</b></div>';
  h += '<div class="tiny muted" style="margin-top:6px">' + (yk !== null ? 'Yerel seçime ' + yk + ' ay var. ' : '') + 'Başarılı belediyeler teşkilatı büyütür, parti itibarını ve genel seçim oyunu yükseltir; skandal ve zayıf performans bunları aşındırır. Görevdeki belediyenin performansı yerel seçimde de belirleyicidir.</div></div>';
  var list = []; for (var i = 0; i < 81; i++) if (b.sahip[i] === S.pid) list.push(i);
  list.sort(function (a, c) { return ILLER[c].nufus - ILLER[a].nufus; });
  if (!list.length) return h + '<div class="card muted small">Şu an hiçbir il belediyesini yönetmiyorsun. Yerel seçimde teşkilatı güçlü illerde aday çıkar.</div>';
  h += '<div class="eyebrow">Yönettiğin iller</div>' + list.slice(0, 20).map(function (i) {
    var p = Math.round(b.perf[i]), sk = S.ay - b.sk[i] <= 8, dn = b.denet[i] > S.ay;
    return '<div class="card" style="padding:11px 14px"><h3>' + esc(ILLER[i].ad) + (bldBuyuk()[i] ? ' <span class="tiny muted">büyükşehir</span>' : '') + '<small class="' + (p >= 55 ? 'good' : p < 40 ? 'badc' : '') + '">' + p + '</small></h3>' + bar(p, p >= 55 ? 'var(--ok)' : p < 40 ? 'var(--bad)' : 'var(--ac)') + '<div class="tiny muted" style="margin:4px 0">' + (sk ? '⚠️ yakın zamanda skandal · ' : '') + (dn ? '🔍 denetim sürüyor · ' : '') + 'teşkilat ' + Math.round(S.org[i]) + ' · borç <b class="' + (b.borc[i] > 70 ? 'badc' : '') + '">' + Math.round(b.borc[i]) + '</b></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn bld" data-ac="belediye" data-bil="' + i + '"' + (S.aksiyon.kalan <= 0 ? ' disabled' : '') + ' style="flex:1">Yatırım<small>' + para(aksiyonMaliyet(S, aksiyonBul('belediye'), i)) + '</small></button><button class="btn bld" data-ac="bldden" data-bil="' + i + '"' + (S.aksiyon.kalan <= 0 || dn ? ' disabled' : '') + ' style="flex:1">Denetim<small>' + para(aksiyonMaliyet(S, aksiyonBul('bldden'), i)) + '</small></button><button class="btn bld" data-ac="bldborc" data-bil="' + i + '"' + (S.aksiyon.kalan <= 0 || b.borc[i] < 25 ? ' disabled' : '') + ' style="flex:1">Borç<small>' + para(aksiyonMaliyet(S, aksiyonBul('bldborc'), i)) + '</small></button>' + ((sk || p < 40) ? '<button class="btn bld" data-ac="bldbaskan" data-bil="' + i + '"' + (S.aksiyon.kalan <= 0 ? ' disabled' : '') + ' style="flex:1">Başkan<small>' + para(aksiyonMaliyet(S, aksiyonBul('bldbaskan'), i)) + '</small></button>' : '') + '</div></div>';
  }).join('') + (list.length > 20 ? '<div class="tiny muted">En büyük 20 ilin gösteriliyor.</div>' : '');
  return h;
}

/* ---- Medya sekmesi ---- */
function medyaHtml() {
  var md = mdInit(S), sk = md.sk, h = '', mans = md.manset.length ? md.manset : mdMansetler(S);
  h += '<div class="eyebrow">Medya aksiyonları · ' + S.aksiyon.kalan + ' hak</div><div class="grid2">' + AKSIYONLAR.filter(function (a) { return a.tab === 'medya' && (a.id !== 'skandalkoz' || !govMu(S, S.pid)) && (a.id !== 'haberduz' || !!(S.md && S.md.yanlis)); }).map(aksBtn).join('') + '</div>';
  if (S.md && S.md.yanlis) h += '<div class="card" style="border-color:var(--bad)"><h3>⚠️ Aleyhinde asılsız haber<small>' + esc(S.medya[S.md.yanlis.idx].ad) + '</small></h3><div class="small muted">Düzeltilmezse itibarını ve anketini aşındırır; kendiliğinden söner ama zarar bırakır.</div></div>';
  if (sk && sk.durum !== 'bitti') {
    var bad = '', amp = mdGuc(S);
    if (sk.taraf === 'rakip') h += '<div class="eyebrow">Gündemdeki skandal</div><div class="card"><h3>İktidarda skandal<small>şiddet ' + sk.siddet + '</small></h3><div class="small muted">' + esc(sk.kisi) + ' hakkındaki iddialar gündemde. Medyadaki güçlü yayınlar sana yakınsa iddia daha uzun yaşar. "Skandalı Büyüt" aksiyonu baskıyı artırır.</div></div>';
    else { BAKANLIK.forEach(function (b) { if (b[1] === sk.bakan) bad = b[0]; }); h += '<div class="eyebrow">Açık skandal</div><div class="card"><h3>' + esc(bad) + ' Bakanı ' + esc(sk.kisi) + '<small>' + (sk.durum === 'sorusturma' ? 'soruşturmada' : 'evre ' + sk.evre + ' / 3') + '</small></h3>' + bar(sk.durum === 'sorusturma' ? 30 : (sk.evre + 1) / 3 * 100, 'var(--bad)') + '<div class="small muted" style="margin:6px 0">Şiddet ' + sk.siddet + ' · basın büyütme çarpanı ×' + amp.toFixed(1).replace('.', ',') + '. Çözülmezse parti krizine dönüşür.</div>' + (sk.durum === 'sorusturma' ? '<div class="small">Soruşturma ' + Math.max(0, sk.son - S.ay) + ' ay içinde sonuçlanacak.</div>' : '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sky" data-sy="istifa" style="flex:1">İstifa ettir</button><button class="btn sky" data-sy="savun" style="flex:1">Savun</button><button class="btn sky" data-sy="sorus" style="flex:1">Soruşturma aç</button></div>') + '</div>'; }
  }
  h += '<div class="eyebrow">Günün manşetleri</div>' + mans.map(function (m) { return '<div class="card" style="padding:10px 14px"><div class="tiny muted">' + (MEDYA_TUR[m.tur] || '') + ' ' + esc(m.ad) + ' · ' + (m.ton > 0 ? '<span class="good">yanında</span>' : m.ton < 0 ? '<span class="badc">karşında</span>' : 'tarafsız') + '</div><div style="font-weight:600;margin-top:3px">' + esc(m.m) + '</div></div>'; }).join('');
  var dost = mdDostluk(S);
  h += '<div class="eyebrow">Yayın organları</div><div class="card"><div class="row small"><span>Medyadaki ağırlıklı yakınlık</span><b class="' + (dost > 8 ? 'good' : dost < -8 ? 'badc' : '') + '">' + Math.round(dost) + '</b></div>' + S.medya.map(function (m) { return '<div class="row small"><span>' + (MEDYA_TUR[m.tur] || '') + ' ' + esc(m.ad) + '<div class="tiny muted">Erişim ' + m.erisim + ' · güven ' + Math.round(m.guven) + '</div></span><span class="' + (m.yakin > 15 ? 'good' : m.yakin < -15 ? 'badc' : 'muted') + '">' + Math.round(m.yakin) + (m.yakin > 15 ? ' · yakın' : m.yakin < -15 ? ' · mesafeli' : ' · tarafsız') + '</span></div>'; }).join('') + '<div class="tiny muted" style="margin-top:6px">Yakınlık; erişim ve güvenle çarpılarak her ay ivmeni ve ilgili seçmen gruplarını etkiler. Hükümete yakın yayınlar iktidar değişince tarafını değiştirir.</div></div>';
  h += '<details class="kd"><summary>Haber akışı</summary><div class="card">' + S.log.slice(0, 12).map(function (l) { return '<div class="row small" style="align-items:flex-start"><span>' + esc(l.m) + '</span><span class="muted tiny">' + l.t + '</span></div>'; }).join('') + '</div></details><div class="small muted">Kendi gazeteni kurunca medya aksiyonların güçlenir. Sahip olduğun yayın: ' + S.yayin + '/3</div>';
  return h;
}
function skandalSheet(it) {
  var amp = mdGuc(S);
  var pk = S.bakanlar && S.bakanlar[it.bakan]; sheet((pk ? '<div style="text-align:center;margin-bottom:6px">' + portre(pk.ad, 64, {mood: -1, id: pk.uid}) + '</div>' : '') + '<div class="lab">SKANDAL</div><h2>' + esc(it.bad) + ' Bakanı ' + esc(it.ad) + ' hakkında iddialar</h2><p class="small muted">İddialar basına sızdı. Şiddet ' + it.siddet + '; medyadaki büyütme çarpanı ×' + amp.toFixed(1).replace('.', ',') + '. Üç ay içinde çözülmezse parti krizine dönüşür.</p>' +
    '<button class="opt" data-sy="istifa"><b>İstifa ettir</b><span class="small muted">Kriz büyümeden biter, küçük itibar kaybı</span></button><button class="opt" data-sy="savun"><b>Savun</b><span class="small muted">Başarı ihtimali ~%' + Math.round(clamp(0.28 + mdDostluk(S) / 220 - it.siddet * 0.1, 0.05, 0.7) * 100) + ' · ters tepebilir</span></button><button class="opt" data-sy="sorus"><b>Soruşturma aç</b><span class="small muted">2 ay beklenir; %45 temize çıkar</span></button><button class="btn ghost" id="k" style="margin-top:8px">Sonra karar ver</button>');
  $('#k').onclick = function () { closeSheet(true); queue(); };
  document.querySelectorAll('.opt').forEach(function (o) { o.onclick = function () { var r = mdSkandalYanit(S, o.dataset.sy); kayit(); closeSheet(true); render(); toast(r.msg); queue(); }; });
}

/* ---- Karakter portreleri (ad'a göre deterministik, özgün çizim) ---- */
function portreHash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function portre(ad, boy, o) {
  o = o || {}; var h = portreHash((ad || '?') + '|' + (o.id || '')), cilt = ['#f1d3b8', '#e6bc98', '#d09f78', '#b57d58', '#8d5a3b', '#6b4229'][h % 6], sac = ['#222', '#3a2a20', '#5a4030', '#8a6a48', '#b0b0b0', '#d8d8d8'][(h >> 3) % 6], stil = (h >> 6) % 4, gozluk = (h >> 8) % 3 === 0, bg = ['#2c3350', '#3a2f4a', '#2a4046', '#40342a', '#2f3a2d'][(h >> 10) % 5], ceket = o.renk || ['#1d2540', '#2b2b30', '#38263a', '#223f3a'][(h >> 12) % 4], yuz = 15 + (h >> 14) % 3;
  var mood = o.mood === undefined ? 0 : o.mood, agiz = mood > 0.25 ? 'M25 41 Q32 46 39 41' : mood < -0.25 ? 'M25 44 Q32 39 39 44' : 'M26 42 L38 42';
  var sc = '';
  if (stil === 0) sc = '<path d="M15 28 Q15 10 32 10 Q49 10 49 28 Q44 18 32 18 Q20 18 15 28Z" fill="' + sac + '"/>';
  else if (stil === 1) sc = '<path d="M14 30 Q12 8 32 8 Q52 8 50 30 Q48 20 32 16 Q16 20 14 30Z" fill="' + sac + '"/><path d="M14 30 L14 40 L18 36Z M50 30 L50 40 L46 36Z" fill="' + sac + '"/>';
  else if (stil === 2) sc = '<path d="M16 26 Q18 12 32 12 Q46 12 48 26 L44 22 Q32 16 20 22Z" fill="' + sac + '"/>';
  else sc = '<path d="M13 32 Q10 6 32 6 Q54 6 51 32 L47 24 Q46 14 32 14 Q18 14 17 24Z" fill="' + sac + '"/>';
  var g = gozluk ? '<g fill="none" stroke="#111" stroke-width="1.4"><circle cx="25.5" cy="30" r="4.6"/><circle cx="38.5" cy="30" r="4.6"/><path d="M30 30 L34 30"/></g>' : '';
  return '<svg class="pt" width="' + boy + '" height="' + boy + '" viewBox="0 0 64 64" role="img" aria-label="' + esc(ad) + '" style="border-radius:50%;flex:none"><rect width="64" height="64" fill="' + bg + '"/><path d="M6 64 Q8 48 32 46 Q56 48 58 64Z" fill="' + ceket + '"/><path d="M28 46 L32 54 L36 46Z" fill="#f5f5f5"/><path d="M31 49 L32 58 L33 49Z" fill="' + (o.kravat || '#b22' ) + '"/><rect x="27" y="38" width="10" height="10" rx="3" fill="' + cilt + '"/><ellipse cx="32" cy="30" rx="' + yuz + '" ry="17" fill="' + cilt + '"/>' + sc + '<circle cx="25.5" cy="30" r="1.6" fill="#1b1b1b"/><circle cx="38.5" cy="30" r="1.6" fill="#1b1b1b"/><path d="M22 25.5 L29 25 M35 25 L42 25.5" stroke="' + sac + '" stroke-width="1.6" stroke-linecap="round"/><path d="' + agiz + '" fill="none" stroke="#6a2a2a" stroke-width="1.6" stroke-linecap="round"/>' + g + '</svg>';
}
function kisiMood(k) { return k.sad >= 65 ? 1 : k.sad < 35 ? -1 : 0; }
function kisiIliskiHtml(k) {
  var d = kisiBul(S, k.dost), r = kisiBul(S, k.rakip), h = hafInit(S), a = h.aday && h.aday.uid === k.uid, fx = [];
  if (d) fx.push('<div class="row small"><span>🤝 Yakın dostu</span><b>' + esc(d.k.ad) + ' <span class="tiny muted">' + esc(d.rol) + '</span></b></div>');
  if (r) fx.push('<div class="row small"><span>⚔️ Rakibi</span><b>' + esc(r.k.ad) + ' <span class="tiny muted">' + esc(r.rol) + '</span></b></div>');
  if (a) fx.push('<div class="row small"><span>🗡️ Kulis</span><b class="badc">Genel başkanlığa göz dikmiş</b></div>');
  return '<div class="card" style="margin:0 0 10px"><div class="eyebrow" style="margin:0 0 4px">İlişkiler</div>' + (fx.length ? fx.join('') + '<div class="tiny muted" style="margin-top:6px">Dostu görevden alınırsa sadakati düşer; rakibi ödüllendirilirse de içerler.</div>' : '<div class="small muted">Belirgin bir ilişkisi yok.</div>') + '</div>';
}
function liderEk() {
  var h = hafInit(S), oz = Object.keys(KAR_OZ).filter(function (id) { return h.ozellik[id]; }), io = ilisOzet(S), sz = S.sozler || [], tut = sz.filter(function (z) { return z.durum === 'tutuldu'; }).length, boz = sz.filter(function (z) { return z.durum === 'bozuldu'; }).length;
  var o = '<div class="eyebrow">Siyasi imzan</div>' + (oz.length ? oz.map(function (id) { var t = KAR_OZ[id]; return '<div class="card" style="padding:11px 14px"><h3>' + t.ikon + ' ' + t.ad + '</h3><div class="small muted">' + t.acik + '</div></div>'; }).join('') : '<div class="card small muted">Henüz belirgin bir siyasi imzan yok. Sözlerini tutmak, miting yapmak, koalisyon kurmak ya da skandalları yönetmek kimliğini şekillendirir.</div>');
  o += '<div class="eyebrow">Siyasi hafıza</div><div class="card">' + [['Tutulan söz', tut], ['Bozulan söz', boz], ['Çıkan yasa', S.mc && S.mc.sayac ? S.mc.sayac.kabul : 0], ['Atlatılan skandal', h.skAtlat], ['Görevden alınan', h.kov], ['Ödüllendirilen', h.odul], ['Miting', h.aks.miting || 0], ['Koalisyon anlaşması', h.aks.koalisyon || 0]].map(function (x) { return '<div class="row small"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('') + '</div>';
  var pk = Object.keys(h.parti).filter(function (id) { return h.parti[id].yardim || h.parti[id].ihanet; });
  if (pk.length) o += '<div class="eyebrow">Kim ne hatırlıyor</div><div class="card">' + pk.map(function (id) { var p = h.parti[id]; return '<div class="row small"><span>' + esc(partiAdi(S, id)) + '</span><span class="' + (p.ihanet > p.yardim ? 'badc' : 'good') + '">' + (p.yardim ? p.yardim + ' tutulan taahhüt' : '') + (p.yardim && p.ihanet ? ' · ' : '') + (p.ihanet ? p.ihanet + ' bozulan taahhüt' : '') + '</span></div>'; }).join('') + '</div>';
  if (h.kovulan.length) o += '<div class="eyebrow">Görevden alınanlar</div><div class="card">' + h.kovulan.map(function (e) { return '<div class="row small"><span>' + esc(e.ad) + '<div class="tiny muted">' + esc(e.rol) + '</div></span><span class="' + (e.sad < 45 ? 'badc' : 'muted') + '">' + (e.sad < 45 ? 'kırgın' : 'dost kalmış') + '</span></div>'; }).join('') + '</div>';
  o += '<div class="eyebrow">Kadro ilişkileri</div><div class="card">' + (io.rakip.length || io.dost.length ? io.rakip.slice(0, 6).map(function (x) { return '<div class="row small"><span>⚔️ ' + esc(x[0]) + '</span><span class="muted">' + esc(x[1]) + '</span></div>'; }).join('') + io.dost.slice(0, 5).map(function (x) { return '<div class="row small"><span>🤝 ' + esc(x[0]) + '</span><span class="muted">' + esc(x[1]) + '</span></div>'; }).join('') : '<div class="small muted">Kadro ilişkileri bir ay sonra belirir.</div>') + '</div>' + (h.aday ? '<div class="card" style="border-color:var(--bad)"><div class="small badc"><b>🗡️ ' + esc(h.aday.ad) + '</b> kulis yapıyor; kurultayda sana karşı bir dalga olabilir. Ödüllendirerek yatıştır ya da görevden al.</div></div>' : '');
  return o;
}

/* ---- oyun sonu özeti ---- */
function bitisSahne() {
  profilKaydet();
  var l = kariyerSeviye(), ar = S.arsiv || [], gen = ar.filter(function (a) { return a.tip === 'genel'; }), yer = ar.filter(function (a) { return a.tip === 'yerel'; });
  var rz = ROZET.filter(function (r) { return S.rozet && S.rozet[r[0]]; }).length, en = 0;
  gen.forEach(function (a) { if (a.ben && a.ben[1] > en) en = a.ben[1]; });
  var s = ['Kariyer: ' + KARIYER[l][0] + ' ' + KARIYER[l][1], 'Rozet: ' + rz + ' / ' + ROZET.length, 'Genel seçim: ' + gen.length + ' · en çok ' + en + ' sandalye', 'Yerel seçim: ' + yer.length + ' · alınan karar: ' + (S.kararlar || []).length];
  splash({ses: S.cbOyuncu ? 'zafer' : 'sahne', konfeti: !!S.cbOyuncu, ikon: S.cbOyuncu ? '👑' : '🏁', ust: 'OYUN SONU', baslik: S.cbOyuncu ? 'Cumhurbaşkanı oldun' : esc(S.lider.ad) + ' · yolculuk bitti', alt: esc(S.parti.ad) + ' · ' + tarihUzun(S.tarih), satirlar: s.map(esc)}, function () { render(); queue(); });
}

/* ---- kalıcı profil: oyunlar arası istatistik ve rozet koleksiyonu (ayrı anahtar; oyun kayıtlarına dokunmaz) ---- */
var PROFIL_KEY = 'secimsim_profil';
function profilBos() { return {v: 1, oyun: 0, cb: 0, iktidar: 0, enAnket: 0, enKoltuk: 0, enKariyer: 0, enAy: 0, rozet: {}, son: []}; }
function profilOku() {
  try { var o = JSON.parse(localStorage.getItem(PROFIL_KEY) || 'null'); if (o && o.v === 1 && o.rozet) return o; } catch (e) {}
  return profilBos();
}
function profilYaz(p) { try { localStorage.setItem(PROFIL_KEY, JSON.stringify(p)); return true; } catch (e) { return false; } }
function profilRozet(id) { var p = profilOku(); if (!p.rozet[id]) { p.rozet[id] = Date.now(); profilYaz(p); } }
function profilKaydet() {
  if (!S || S.profilYazildi) return; S.profilYazildi = 1;
  var p = profilOku(), gen = (S.arsiv || []).filter(function (a) { return a.tip === 'genel'; }), en = 0, mx = 0;
  gen.forEach(function (a) { if (a.ben && a.ben[1] > en) en = a.ben[1]; });
  (S.anketGecmis || []).forEach(function (x) { if (x.p > mx) mx = x.p; });
  p.oyun++; if (S.cbOyuncu) p.cb++; if (govMu(S, S.pid)) p.iktidar++;
  p.enAnket = Math.max(p.enAnket, Math.round(mx * 10) / 10); p.enKoltuk = Math.max(p.enKoltuk, en); p.enKariyer = Math.max(p.enKariyer, kariyerSeviye()); p.enAy = Math.max(p.enAy, S.ay);
  ROZET.forEach(function (r) { if (S.rozet && S.rozet[r[0]] && !p.rozet[r[0]]) p.rozet[r[0]] = Date.now(); });
  p.son.unshift({ad: S.parti.ad, t: tarihYaz(S.tarih), k: KARIYER[kariyerSeviye()][1], a: Math.round(S.anketOyuncu * 10) / 10, cb: !!S.cbOyuncu}); p.son = p.son.slice(0, 6);
  profilYaz(p);
}
function profilHtml() {
  var p = profilOku(), n = Object.keys(p.rozet).length;
  var st = function (ik, v, ad) { return '<div class="pk"><div class="pk-i">' + ik + '</div><div class="pk-v">' + v + '</div><div class="pk-a">' + ad + '</div></div>'; };
  var h = '<div class="card"><h3>Kariyer profili<small>tüm oyunlar</small></h3><div class="pano-k" style="margin-top:6px">' +
    st('🎮', p.oyun, 'Biten oyun') + st('👑', p.cb, 'Cumhurbaşkanlığı') + st('🏛️', p.iktidar, 'İktidarda bitti') + st('📊', '%' + f1(p.enAnket), 'En yüksek anket') + '</div>' +
    '<div class="row small" style="margin-top:8px"><span>En çok sandalye</span><b>' + p.enKoltuk + '</b></div><div class="row small"><span>En ileri kariyer</span><b>' + KARIYER[p.enKariyer][0] + ' ' + KARIYER[p.enKariyer][1] + '</b></div><div class="row small"><span>En uzun oyun</span><b>' + p.enAy + ' ay</b></div></div>';
  h += '<div class="eyebrow">Rozet koleksiyonu · ' + n + '/' + ROZET.length + '</div><div class="rz">' + ROZET.map(function (r) {
    var on = !!p.rozet[r[0]], gz = r[5] && !on;
    return '<div class="rzi' + (on ? ' on' : '') + '"><span>' + (gz ? '❔' : r[1]) + '</span><b>' + (gz ? 'Gizli rozet' : esc(r[2])) + '</b><small>' + (gz ? 'Keşfetmek için oyna' : esc(r[3])) + '</small></div>'; }).join('') + '</div>';
  if (p.son.length) h += '<div class="eyebrow">Son oyunlar</div><div class="card">' + p.son.map(function (x) { return '<div class="row small"><span>' + (x.cb ? '👑 ' : '') + esc(x.ad) + ' · ' + esc(x.k) + '</span><b>%' + f1(x.a) + '</b></div>'; }).join('') + '</div>';
  return h;
}
function profilSheet() { sheet('<h2>Profil</h2>' + profilHtml() + '<button class="btn ghost" id="k">Kapat</button>'); $('#k').onclick = function () { closeSheet(true); }; }
