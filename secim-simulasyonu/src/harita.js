/* ===== GERÇEK SINIRLI HARİTA, İL PANELİ, TAKVİM, TARİHÇE ===== */
var VW = {k: 1, x: 0, y: 0}, HFM = [['anket', 'Anket'], ['secim', 'Son seçim'], ['org', 'Teşkilat'], ['oy', 'Oy payım'], ['bld', 'Belediye'], ['degisim', 'Aylık değişim'], ['rakip', 'Rakip kalesi']];
function hexRgb(h) { var n = parseInt(h.slice(1), 16); return (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }
function liderRenk(o, ek) { var b = null, bv = -1; Object.keys(o).forEach(function (id) { var v = o[id]; if (ek && id === S.pid && ek(id)) v = 0; if (v > bv) { bv = v; b = id; } }); return b; }
function mapRenk(i, P) {
  var pid = S.pid, o = P.il[i];
  if (HF === 'anket' || HF === 'birinci') return partiRengi(S, liderRenk(o, function () { return S.org[i] < 30; }));
  if (HF === 'secim') { var r = S.sonSecim; if (!r) return '#232632'; return partiRengi(S, r.tip === 'yerel' ? r.kazananlar[i] : liderRenk(r.il[i])); }
  if (HF === 'bld') { var bb = bldInit(S), pc = partiRengi(S, bb.sahip[i]); return 'rgba(' + hexRgb(pc) + ',' + (0.18 + 0.82 * Math.max(0, Math.min(1, (bb.perf[i] - 20) / 60))).toFixed(2) + ')'; }
  if (HF === 'degisim') { var dd = S.ilOnce ? o[pid] - S.ilOnce[i] : 0, tt = Math.min(1, Math.abs(dd) / 0.6); return Math.abs(dd) < 0.02 ? '#232632' : 'rgba(' + (dd >= 0 ? '63,191,127' : '229,72,77') + ',' + (0.2 + 0.8 * tt).toFixed(2) + ')'; }
  if (HF === 'rakip') { var rv = siralama(o).filter(function (id) { return id !== pid; })[0]; return 'rgba(' + hexRgb(partiRengi(S, rv)) + ',' + (0.25 + 0.75 * Math.min(1, o[rv] / 40)).toFixed(2) + ')'; }
  var t = HF === 'org' ? S.org[i] / 100 : Math.min(1, o[pid] / 40);
  return 'rgba(' + hexRgb(S.parti.renk) + ',' + (0.1 + 0.9 * t).toFixed(2) + ')';
}
function geoSvg(boya, ek) {
  return '<svg viewBox="0 0 ' + GEO_W + ' ' + GEO_H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Türkiye haritası"><g class="mg">' + GEO.map(function (d, i) { return '<path data-p="' + i + '" d="' + d + '" fill="' + boya(i) + '" ' + (ek || '') + '/>'; }).join('') + '</g></svg>';
}
function tHarita() {
  var P = paylar(S), hf = HF === 'birinci' ? 'anket' : HF; HF = hf;
  var top = siralama(S.anket).slice(0, 5);
  var h = '<div class="chiprow" id="hf">' + HFM.map(function (f) { return '<button class="cx' + (HF === f[0] ? ' on' : '') + '" data-f="' + f[0] + '"' + (f[0] === 'secim' && !S.sonSecim ? ' disabled style="opacity:.45"' : '') + '>' + f[1] + '</button>'; }).join('') + '</div>';
  h += '<div class="mapc" id="mapc">' + geoSvg(function (i) { return mapRenk(i, P); }, 'class="il' + '"') + '<div class="mz"><button id="zp" aria-label="Yakınlaştır">+</button><button id="zm" aria-label="Uzaklaştır">−</button><button id="zr" aria-label="Sıfırla">⟲</button></div></div>';
  h += (HF === 'anket' ? '<div class="legend">' + top.map(function (id) { return '<span><i style="background:' + partiRengi(S, id) + '"></i>' + esc(partiAdi(S, id)) + '</span>'; }).join('') + '</div>' :
    HF === 'secim' ? '<div class="legend"><span>' + (S.sonSecim ? 'Son seçimde il birincileri' : '') + '</span></div>' : HF === 'bld' ? '<div class="legend"><span>Renk: belediyeyi yöneten parti</span><span>Soluk: başarısız · Koyu: başarılı</span></div>' : '<div class="legend"><span>Soluk: zayıf · Koyu: güçlü</span></div>');
  h += HF === 'degisim' ? '<div class="legend"><span><i style="background:#3fbf7f"></i>Bu ay yükselen</span><span><i style="background:#e5484d"></i>Bu ay düşen</span></div>' : HF === 'rakip' ? '<div class="legend"><span>Renk: ilin en güçlü rakibi</span><span>Koyu: rakip payı yüksek</span></div>' : '';
  return h + '<div class="tiny muted" style="margin-top:8px">İki parmakla yakınlaştır, sürükleyerek kaydır, ile dokun.</div>';
}
function mapUygula() { var g = $('#mapc .mg'); if (g) g.setAttribute('transform', 'translate(' + VW.x + ' ' + VW.y + ') scale(' + VW.k + ')'); }
function mapBagla() {
  var c = $('#mapc'); if (!c) return;
  var svg = $('svg', c), ptr = {}, mv = 0, d0 = 0, k0 = 1;
  function pt(e) { var r = svg.getBoundingClientRect(), s = Math.min(r.width / GEO_W, r.height / GEO_H); return {x: (e.clientX - r.left - (r.width - GEO_W * s) / 2) / s, y: (e.clientY - r.top - (r.height - GEO_H * s) / 2) / s}; }
  function zoomTo(nk, cx, cy) { nk = Math.max(1, Math.min(10, nk)); VW.x = cx - (cx - VW.x) * nk / VW.k; VW.y = cy - (cy - VW.y) * nk / VW.k; VW.k = nk; sinir(); mapUygula(); }
  function sinir() { var m = GEO_W * (VW.k - 1); VW.x = Math.min(GEO_W * 0.1, Math.max(-m - GEO_W * 0.1, VW.x)); VW.y = Math.min(GEO_H * 0.1, Math.max(-GEO_H * (VW.k - 1) - GEO_H * 0.1, VW.y)); }
  c.addEventListener('pointerdown', function (e) { c.setPointerCapture(e.pointerId); ptr[e.pointerId] = {x: e.clientX, y: e.clientY}; mv = 0; var ks = Object.keys(ptr); if (ks.length === 2) { d0 = Math.hypot(ptr[ks[0]].x - ptr[ks[1]].x, ptr[ks[0]].y - ptr[ks[1]].y); k0 = VW.k; } });
  c.addEventListener('pointermove', function (e) {
    var p = ptr[e.pointerId]; if (!p) return; var ks = Object.keys(ptr), r = svg.getBoundingClientRect(), s = Math.min(r.width / GEO_W, r.height / GEO_H);
    if (ks.length === 2) { var a = ptr[ks[0]], b = ptr[ks[1]]; if (e.pointerId == ks[0]) a = {x: e.clientX, y: e.clientY}; else b = {x: e.clientX, y: e.clientY}; ptr[e.pointerId] = {x: e.clientX, y: e.clientY}; var d = Math.hypot(a.x - b.x, a.y - b.y), m = pt({clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2}); mv = 99; if (d0) zoomTo(k0 * d / d0, m.x, m.y); return; }
    var dx = e.clientX - p.x, dy = e.clientY - p.y; mv += Math.abs(dx) + Math.abs(dy); ptr[e.pointerId] = {x: e.clientX, y: e.clientY};
    if (mv > 6) { VW.x += dx / s; VW.y += dy / s; sinir(); mapUygula(); }
  });
  function bit(e) { var was = ptr[e.pointerId]; delete ptr[e.pointerId]; if (was && mv <= 6 && e.type === 'pointerup') { var el = document.elementFromPoint(e.clientX, e.clientY); var pa = el && el.closest && el.closest('[data-p]'); if (pa) ilSheet(+pa.dataset.p); } }
  c.addEventListener('pointerup', bit); c.addEventListener('pointercancel', bit);
  c.addEventListener('wheel', function (e) { e.preventDefault(); var m = pt(e); zoomTo(VW.k * (e.deltaY < 0 ? 1.2 : 0.83), m.x, m.y); }, {passive: false});
  $('#zp').onclick = function () { zoomTo(VW.k * 1.5, GEO_W / 2, GEO_H / 2); }; $('#zm').onclick = function () { zoomTo(VW.k / 1.5, GEO_W / 2, GEO_H / 2); };
  $('#zr').onclick = function () { VW = {k: 1, x: 0, y: 0}; mapUygula(); };
  mapUygula();
  var ps = [].slice.call(c.querySelectorAll('path[data-p]')), yeniF = ps.map(function (p) { return p.getAttribute('fill'); });
  if (MAPPREV && MAPPREV.hf === HF && MAPPREV.f.length === yeniF.length && !RM) {
    var chg = false;
    ps.forEach(function (p, i) { if (MAPPREV.f[i] !== yeniF[i]) { p.style.transition = 'none'; p.style.fill = MAPPREV.f[i]; chg = true; } });
    if (chg) { void c.offsetWidth; ps.forEach(function (p, i) { if (MAPPREV.f[i] !== yeniF[i]) { p.style.transition = 'fill .8s ease'; p.style.fill = yeniF[i]; } }); }
  }
  MAPPREV = {hf: HF, f: yeniF};
}
var MAPPREV = null;
function mapVurgu(i) {
  var c = $('#mapc'); if (!c) return;
  c.querySelectorAll('path.sel').forEach(function (p) { p.classList.remove('sel'); });
  if (i === null || i === undefined) return;
  var p = c.querySelector('path[data-p="' + i + '"]'); if (p) { p.classList.add('sel'); p.parentNode.appendChild(p); }
}
function ilSheet(i) {
  var P = paylar(S), o = P.il[i], il = ILLER[i], s = siralama(o).slice(0, 6), pid = S.pid, tr = S.ilOnce ? o[pid] - S.ilOnce[i] : 0;
  var son = S.sonSecim && S.sonSecim.il ? S.sonSecim.il[i] : null;
  var ed = siralama(o).filter(function (id) { return id !== pid; })[0];
  var h = '<div class="lab">' + BOLGE[il.bolge] + ' · Plaka ' + il.id + '</div><h2>' + il.ad + '</h2>' + (ed ? '<div class="ilr">' + portreG(liderAdi(ed), partiRengi(S, ed), 44) + '<div><div class="tiny muted">İlin en güçlü rakibi</div><b>' + esc(partiAdi(S, ed)) + '</b><span class="muted small"> · ' + esc(liderAdi(ed)) + ' · %' + f1(o[ed]) + '</span></div></div>' : '') +
    '<div class="grid2" style="margin-bottom:8px"><div class="card" style="margin:0;padding:10px"><div class="tiny muted">Nüfus</div><b>' + sayi(il.nufus * 1000) + '</b></div><div class="card" style="margin:0;padding:10px"><div class="tiny muted">Seçmen (tah.)</div><b>' + sayi(il.nufus * 740) + '</b></div><div class="card" style="margin:0;padding:10px"><div class="tiny muted">Milletvekili</div><b>' + il.mv + '</b></div><div class="card" style="margin:0;padding:10px"><div class="tiny muted">Teşkilatım</div><b>' + Math.round(S.org[i]) + '/100</b></div></div>' + bar(S.org[i]) +
    '<div class="eyebrow">Tahmini oy dağılımı</div>' + s.map(function (id) { var d = son && son[id] !== undefined ? o[id] - son[id] : null; return '<div class="pr' + (id === pid ? ' me' : '') + '"><span class="dot" style="background:' + partiRengi(S, id) + '"></span><div><div class="nm"><span>' + esc(partiAdi(S, id)) + '</span></div><div class="pbar"><i style="width:' + Math.min(100, o[id] * 1.6) + '%;background:' + partiRengi(S, id) + '"></i></div></div><b class="num">%' + f1(o[id]) + (d !== null ? ' <span class="tiny ' + (d >= 0 ? 'good' : 'badc') + '">' + (d >= 0 ? '▲' : '▼') + f1(Math.abs(d)) + '</span>' : '') + '</b></div>'; }).join('') +
    '<div class="eyebrow">Siyasi eğilim</div><div class="small">' + (tr > 0.05 ? '📈 ' + esc(S.parti.ad) + ' bu ay yükselişte (+' + f1(tr) + ').' : tr < -0.05 ? '📉 ' + esc(S.parti.ad) + ' bu ay geriledi (' + f1(tr) + ').' : '➖ Bu ay belirgin bir değişim yok.') + (ed ? ' Ana rakip: <b>' + esc(partiAdi(S, ed)) + '</b>.' : '') + '</div>' +
    '<button class="btn pri" id="ik" style="margin-top:12px"' + (S.aksiyon.kalan <= 0 || muhalifMu(S) ? ' disabled' : '') + '>İl kampanyası yürüt<small>' + il.ad + ' · ' + para(aksiyonMaliyet(S, aksiyonBul('ilodak'), null)) + ' · 1 aksiyon' + (S.ilm && S.ilm[i] > 0.02 ? ' · mevcut yatırım +%' + Math.round(S.ilm[i] * 100) : '') + '</small></button><button class="btn" id="ta" style="margin-top:8px"' + (S.aksiyon.kalan <= 0 ? ' disabled' : '') + '>Bölgede teşkilat çalışması<small>' + BOLGE[il.bolge] + ' · 1 aksiyon</small></button><button class="btn ghost" id="k" style="margin-top:8px">Kapat</button>';
  sheet(h); mapVurgu(i); $('#k').onclick = function () { closeSheet(true); };
  $('#ik').onclick = function () { closeSheet(true); kararOnay('ilodak', i); };
  $('#ta').onclick = function () { closeSheet(true); kararOnay('teskilat', il.bolge); };
}
function tTakvim() {
  var now = tarihNo(S.tarih), ev = [];
  S.takvim.forEach(function (t) { ev.push({no: t.y * 12 + t.m, y: t.y, m: t.m, i: t.tip === 'genel' ? '🗳️' : '🏙️', ad: t.tip === 'genel' ? (t.erken ? 'Erken genel seçim' : 'Genel seçim') : 'Yerel seçim', n: t.tip === 'genel' ? 'Meclis ve Cumhurbaşkanlığı' : 'İl belediyeleri'}); });
  (S.kurultay || []).forEach(function (t) { ev.push({no: t.y * 12 + t.m, y: t.y, m: t.m, i: '🏛️', ad: 'Olağan kurultay', n: 'Genel başkanlık oylaması'}); });
  ev = ev.filter(function (e) { return e.no >= now; }).sort(function (a, b) { return a.no - b.no; });
  return '<div class="eyebrow">Siyasi takvim</div>' + (ev.length ? ev.map(function (e) { var d = e.no - now; return '<div class="card" style="padding:12px 14px;display:flex;gap:12px;align-items:center"><div style="font-size:28px">' + e.i + '</div><div style="flex:1"><b>' + e.ad + '</b><div class="small muted">' + e.n + ' · ' + AYLAR_UZUN[e.m - 1] + ' ' + e.y + '</div></div><span class="pill ' + (d <= 3 ? 'ac' : 'go') + '">' + (d === 0 ? 'Bu ay' : d + ' ay') + '</span></div>'; }).join('') : '<div class="card muted small">Takvimde yaklaşan olay yok.</div>') + '<div class="tiny muted">Kurultayda genel başkanlığı kaybedersen muhalefet yoluna dönersin. Güvenoyu kaybı ya da koalisyon çöküşü erken seçimi tetikleyebilir.</div>';
}
