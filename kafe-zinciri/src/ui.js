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
