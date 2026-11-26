/* ===== KAFE ZİNCİRİ — arayüz v2 ===== */
var S = null, TAB = 'kafe', SEC = 0, KEY = 'kafe_kayit_v2', TUR_KEY = 'kafe_rehber_v1', SES_KEY = 'kafe_ses';
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
var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- ses efektleri (WebAudio, dosyasız) ---------- */
var SESON = (function () { try { return localStorage.getItem(SES_KEY) !== '0'; } catch (e) { return true; } })(), AC = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (AC.state === 'suspended') AC.resume(); return AC; }
function nota(f, t0, d, tip, v, f2) { var a = ac(); if (!a) return; var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0; o.type = tip || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02); }
function ses(n) {
  if (!SESON) return; try {
    if (n === 'tik') nota(1200, 0, 0.04, 'triangle', 0.03, 800);
    else if (n === 'coin') { nota(988, 0, 0.09, 'square', 0.035); nota(1319, 0.08, 0.18, 'square', 0.035); }
    else if (n === 'ok') { nota(660, 0, 0.1, 'sine', 0.06); nota(990, 0.09, 0.2, 'sine', 0.06); }
    else if (n === 'bad') { nota(220, 0, 0.25, 'sawtooth', 0.04, 150); }
    else if (n === 'bell') { nota(1568, 0, 0.5, 'sine', 0.05); nota(2093, 0, 0.4, 'sine', 0.03); }
    else if (n === 'zafer') { [523, 659, 784, 1047].forEach(function (f, i) { nota(f, i * 0.13, 0.4, 'triangle', 0.06); }); }
  } catch (e) { /* yok say */ }
}
function konfeti() {
  if (RM) return; var cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;inset:0;z-index:99997;pointer-events:none'; document.body.appendChild(cv); var x = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, c = ['#e0983c', '#f3b45a', '#fff', '#5fc08a', '#e8665f', '#4aa3e8'], P = [], i;
  for (i = 0; i < 110; i++) P.push({x: Math.random() * W, y: -Math.random() * H * .5, w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, vy: 2 + Math.random() * 3.5, vx: (Math.random() - .5) * 2, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: c[i % c.length]});
  var t0 = performance.now(); (function f(t) { var el = t - t0; x.clearRect(0, 0, W, H); P.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); }); if (el < 3200) requestAnimationFrame(f); else cv.remove(); })(t0);
}
function sayac(el, hedef, fmt, sure) { if (!el) return; if (RM) { el.textContent = fmt(hedef); return; } var t0 = performance.now(); sure = sure || 900; (function f(t) { var k = Math.min(1, (t - t0) / sure); el.textContent = fmt(hedef * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0); }

/* ---------- ana menü ve kurulum ---------- */
function menu() {
  S = null; var k = yukle(); closeSheet();
  root.innerHTML = '<div class="menu"><div class="logo"><span class="fincan">☕</span></div><h1>Kafe Zinciri</h1><p class="sub">Küçük bir kafeden ulusal bir markaya</p>' +
    (k ? '<button class="btn pri" id="devam">Devam et<small>' + esc(k.ad) + ' · ' + tarihYaz(k) + ' · ' + k.subeler.length + ' şube</small></button>' : '') +
    '<button class="btn ' + (k ? '' : 'pri') + '" id="yeni">Yeni oyun</button><button class="btn ghost" id="nasil">Nasıl oynanır?</button><button class="btn ghost" id="sesb">' + (SESON ? '🔊 Ses açık' : '🔇 Ses kapalı') + '</button><p class="tiny muted" style="text-align:center;margin-top:auto">Kurgusal bir işletme simülasyonudur.</p></div>';
  if (k) $('#devam').onclick = function () { S = k; SEC = S.subeler[0].id; TAB = 'kafe'; ses('bell'); render(); };
  $('#yeni').onclick = function () { ses('tik'); kurulum(); }; $('#nasil').onclick = function () { yardimSheet(true); };
  $('#sesb').onclick = function () { SESON = !SESON; try { localStorage.setItem(SES_KEY, SESON ? '1' : '0'); } catch (e) { /* yok say */ } if (SESON) ses('ok'); menu(); };
}
function kurulum() {
  var sec = 'eski', ad = 'Fincan Kahve', baslangic = ['eski', 'uni', 'site', 'pazar', 'park'];
  function ciz() {
    root.innerHTML = '<div class="menu"><h1 style="margin-top:20px">Kafeni Kur</h1><p class="sub">İlk şubenin adını ve mahallesini seç.</p><div class="card"><div class="small muted">Kafenin adı</div><input id="ad" maxlength="22" value="' + esc(ad) + '" style="width:100%;margin-top:6px;background:var(--p2);border:1px solid var(--line);border-radius:12px;padding:12px;font-size:17px"></div>' +
      baslangic.map(function (id) { var il = ilceBul(id); return '<button class="btn ' + (sec === id ? 'pri' : '') + '" data-m="' + id + '" style="text-align:left">' + il.ikon + ' ' + il.ad + '<small>' + il.not + ' · Kira ' + para(il.kira) + '/ay</small></button>'; }).join('') +
      '<button class="btn pri" id="basla" style="margin-top:6px">Kafeyi aç ☕<small>Başlangıç sermayesi 320 B ₺ (kurulum düşülür)</small></button><button class="btn ghost" id="geri">Geri</button></div>';
    root.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { ad = $('#ad').value || ad; sec = b.dataset.m; ses('tik'); ciz(); }; });
    $('#geri').onclick = menu; $('#basla').onclick = function () { ad = ($('#ad').value || 'Fincan Kahve').trim().slice(0, 22) || 'Fincan Kahve'; S = yeniOyun({ad: ad, ilce: sec, seed: (Date.now() % 100000) + 7}); SEC = S.subeler[0].id; TAB = 'kafe'; kaydet(); ses('bell'); render(); setTimeout(turOtomatik, 500); };
  }
  ciz();
}

/* ---------- animasyonlu kafe sahnesi v2 ---------- */
function kisi(x, y, i, sev) { var sac = ['#3a2418', '#1e1410', '#a8642a', '#d8b25a', '#7a3a22', '#2c2c34'][i % 6], gom = ['#d9573e', '#4aa3e8', '#5fc08a', '#b57edc', '#f3b45a', '#e86a9a', '#3d6f9a'][(i * 3 + 1) % 7], ten = ['#f0c9a0', '#e0ae82', '#c98d62', '#f5d5b4'][i % 4]; return '<circle cx="' + x + '" cy="' + (y - 16) + '" r="6.2" fill="' + ten + '"/><path d="M' + (x - 6.4) + ' ' + (y - 17) + ' Q' + x + ' ' + (y - 27) + ' ' + (x + 6.4) + ' ' + (y - 17) + ' Z" fill="' + sac + '"/>' + (i % 5 === 2 ? '<rect x="' + (x - 8) + '" y="' + (y - 21.5) + '" width="16" height="3" rx="1.5" fill="' + gom + '"/>' : '') + '<rect x="' + (x - 7) + '" y="' + (y - 10) + '" width="14" height="' + (sev ? 11 : 15) + '" rx="5" fill="' + gom + '"/>'; }
function sahneSvg(s, h) {
  var il = ilceBul(s.ilce), ek = s.ek || {}, dl = clamp(h.musteri / Math.max(1, h.koltukKap), 0, 1), masa = clamp(Math.round((s.koltuk + (ek.teras ? 10 : 0)) / 4), 4, 12), dolu = Math.round(masa * dl), m = (S.basAy + S.ay) % 12, yaz = m >= 5 && m <= 8, kis = m <= 1 || m === 11, yagmur = m === 2 || m === 3 || m === 10;
  var duvar = ['#5b4030', '#6a4a37', '#46545f', '#35465a'][s.dekor - 1], gok = yaz ? '#8fd0ff' : kis ? '#b9c6d4' : yagmur ? '#8e9eb0' : '#a8cbe6', o = '<svg viewBox="0 0 360 224" role="img" aria-label="Kafe sahnesi">';
  o += '<defs><linearGradient id="dz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + duvar + '"/><stop offset="1" stop-color="#34241a"/></linearGradient><radialGradient id="ik"><stop offset="0" stop-color="#ffd98a" stop-opacity=".85"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient><linearGradient id="isik" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6d0" stop-opacity=".30"/><stop offset="1" stop-color="#fff6d0" stop-opacity="0"/></linearGradient></defs>';
  o += '<rect width="360" height="224" fill="url(#dz)"/><rect y="104" width="360" height="30" fill="rgba(0,0,0,.14)"/><rect y="146" width="360" height="78" fill="#74502f"/>';
  for (var pl = 0; pl < 8; pl++) o += '<rect y="' + (146 + pl * 10) + '" width="360" height="1.2" fill="rgba(0,0,0,.18)"/>';
  o += '<rect y="143" width="360" height="5" fill="#4a3322"/>';
  if (s.dekor >= 3) o += '<ellipse cx="240" cy="192" rx="86" ry="22" fill="#8c3a3a" opacity=".55"/>';
  /* pencere + arka plan */
  o += '<clipPath id="pc"><rect x="214" y="24" width="102" height="74" rx="5"/></clipPath><rect x="214" y="24" width="102" height="74" rx="5" fill="' + gok + '"/><g clip-path="url(#pc)">';
  if (il.id === 'sahil') o += '<rect x="214" y="68" width="102" height="30" fill="#2f86c9"/><path class="dalga" d="M214 70 q8 -5 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" stroke="#bfe6ff" stroke-width="2" fill="none"/>';
  else if (il.id === 'is' || il.id === 'carsi') [0, 1, 2, 3, 4].forEach(function (k) { o += '<rect x="' + (218 + k * 20) + '" y="' + (50 - (k % 3) * 9) + '" width="16" height="' + (48 + (k % 3) * 9) + '" fill="' + (k % 2 ? '#56667a' : '#44546a') + '"/>'; });
  else if (il.id === 'park' || il.id === 'site') [0, 1, 2].forEach(function (k) { o += '<circle cx="' + (232 + k * 32) + '" cy="68" r="15" fill="#3d9a5b"/><rect x="' + (230 + k * 32) + '" y="78" width="4" height="20" fill="#6b4226"/>'; });
  else if (il.id === 'hava') o += '<g class="ucak"><path d="M0 0 l16 -3 l-3 3 l3 3z" fill="#fff"/></g><rect x="214" y="84" width="102" height="14" fill="#6c7a86"/>';
  else if (il.id === 'uni') o += '<rect x="240" y="48" width="36" height="50" fill="#a67c52"/><polygon points="240,48 258,34 276,48" fill="#7a3a22"/><circle cx="258" cy="60" r="6" fill="#fff"/>';
  else [0, 1, 2, 3].forEach(function (k) { o += '<rect x="' + (216 + k * 26) + '" y="' + (62 + (k % 2) * 8) + '" width="22" height="36" fill="' + (k % 2 ? '#b9805a' : '#c99a6d') + '"/><polygon points="' + (216 + k * 26) + ',' + (62 + (k % 2) * 8) + ' ' + (227 + k * 26) + ',' + (52 + (k % 2) * 8) + ' ' + (238 + k * 26) + ',' + (62 + (k % 2) * 8) + '" fill="#8a4a32"/>'; });
  if (yaz) o += '<circle class="gunes" cx="296" cy="42" r="10" fill="#ffe27a"/>'; else if (!kis && !yagmur) o += '<circle cx="232" cy="40" r="6" fill="#fff" opacity=".9"/>';
  if (kis) for (var k1 = 0; k1 < 9; k1++) o += '<circle class="kar" cx="' + (220 + k1 * 11) + '" cy="28" r="1.8" fill="#fff" style="animation-delay:' + (-k1 * .5) + 's"/>';
  if (yagmur) for (var k2 = 0; k2 < 10; k2++) o += '<line class="yagmur" x1="' + (220 + k2 * 10) + '" y1="26" x2="' + (217 + k2 * 10) + '" y2="34" stroke="#d6e6f5" stroke-width="1.4" style="animation-delay:' + (-k2 * .13) + 's"/>';
  o += '</g><rect x="214" y="24" width="102" height="74" rx="5" fill="none" stroke="#2a1b12" stroke-width="5"/><line x1="265" y1="24" x2="265" y2="98" stroke="#2a1b12" stroke-width="3"/><polygon points="220,26 250,26 292,98 262,98" fill="url(#isik)"/>';
  /* tabela, menü tahtası */
  o += '<rect x="18" y="12" width="146" height="26" rx="8" fill="#2a1b12" stroke="#e0983c" stroke-width="2"/><text x="91" y="30" text-anchor="middle" fill="#f3b45a" font-size="13" font-weight="800" font-family="Avenir Next,Trebuchet MS,sans-serif">' + esc(s.ad.length > 17 ? s.ad.slice(0, 16) + '…' : s.ad) + '</text>';
  var ac = URUNLER.filter(function (u) { return S.menu[u.id].aktif && urunAcik(S, s, u); }).slice(0, 3);
  o += '<rect x="168" y="46" width="38" height="46" rx="3" fill="#1f2a26" stroke="#8a6a44" stroke-width="2.5"/>' + ac.map(function (u, i) { return '<text x="172" y="' + (60 + i * 13) + '" fill="#e9e4d4" font-size="7" font-family="sans-serif">' + u.ikon + ' ' + Math.round(u.fiyat * F() * S.menu[u.id].fiyat) + '</text>'; }).join('');
  if (s.dekor >= 2) o += '<rect x="322" y="94" width="22" height="50" rx="3" fill="#7a4a2a"/><circle cx="333" cy="86" r="15" fill="#3d9a5b"/><circle cx="324" cy="93" r="9" fill="#4bb06a"/>';
  if (s.dekor >= 3) [52, 118, 190].forEach(function (x, i) { o += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="58" stroke="#2a1b12"/><path d="M' + (x - 11) + ' 70 Q' + x + ' 50 ' + (x + 11) + ' 70Z" fill="#f3b45a"/><circle class="lamba" cx="' + x + '" cy="76" r="22" fill="url(#ik)" style="animation-delay:' + (-i * .8) + 's"/>'; });
  if (s.dekor >= 4) o += '<rect x="130" y="46" width="30" height="38" fill="#c8a165" stroke="#2a1b12" stroke-width="3"/><circle cx="145" cy="62" r="7" fill="#d9573e"/><rect x="138" y="74" width="14" height="5" fill="#2f6b4a"/>';
  /* tezgâh */
  o += '<rect x="8" y="98" width="140" height="52" rx="6" fill="#8a5a36"/><rect x="8" y="93" width="140" height="9" rx="4" fill="#d6a56a"/>';
  if (ek.firin || ek.dolap) { o += '<rect x="86" y="74" width="54" height="22" rx="4" fill="rgba(210,235,255,.28)" stroke="#cfe7f5" stroke-width="1.5"/><text x="92" y="90" font-size="11">' + (ek.firin ? '🥐🥟' : '') + (ek.dolap ? '🍰' : '') + '</text>'; }
  o += '<rect x="24" y="68" width="40" height="26" rx="5" fill="#9aa3ab"/><rect x="30" y="76" width="26" height="9" rx="2" fill="#2a2f34"/><circle cx="60" cy="72" r="2.4" fill="' + (ek.espresso ? '#5fe08a' : '#888') + '"/>' + (ek.degirmen ? '<rect x="68" y="76" width="9" height="18" rx="2" fill="#5b3a22"/>' : '') + (ek.pos ? '<rect x="124" y="82" width="18" height="12" rx="2" fill="#2d343b"/><rect x="126" y="84" width="14" height="6" fill="#5fe08a" opacity=".7"/>' : '<rect x="124" y="84" width="16" height="10" rx="2" fill="#555"/>');
  [32, 41, 50].forEach(function (x, i) { o += '<path class="bg bg' + (i + 1) + '" d="M' + x + ' 64 q4 -8 0 -16" stroke="#fff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>'; });
  /* sipariş fişleri, para ve saat (karakter yok) */
  [0, 1, 2].forEach(function (k) { o += '<text class="coin" x="' + (126 + k * 6) + '" y="80" font-size="9" fill="#ffd45c" font-weight="800" style="animation-delay:' + (-k * .9) + 's">+₺</text>'; });
  var fis = clamp(Math.round(dl * 4 + (h.doluluk > 1 ? 2 : 0)), 1, 6); o += '<rect x="70" y="52" width="56" height="3" rx="1.5" fill="#cbb89c"/>'; for (var q = 0; q < fis; q++) o += '<g class="fis" style="animation-delay:' + (-q * .55) + 's"><rect x="' + (74 + q * 8) + '" y="55" width="6" height="12" rx="1" fill="#fff3d6"/><line x1="' + (75.5 + q * 8) + '" y1="59" x2="' + (78.5 + q * 8) + '" y2="59" stroke="#b9a37a" stroke-width=".8"/><line x1="' + (75.5 + q * 8) + '" y1="62" x2="' + (78.5 + q * 8) + '" y2="62" stroke="#b9a37a" stroke-width=".8"/></g>';
  o += '<circle cx="190" cy="20" r="9" fill="#f4eadc" stroke="#2a1b12" stroke-width="2"/><line class="sa1" x1="190" y1="20" x2="190" y2="14" stroke="#2a1b12" stroke-width="1.6"/><line class="sa2" x1="190" y1="20" x2="194" y2="20" stroke="#2a1b12" stroke-width="1.4"/>';
  o += '<rect x="322" y="52" width="30" height="16" rx="8" fill="#241a14" stroke="#5fe08a" stroke-width="1.5" class="neon"/><text x="337" y="63.5" text-anchor="middle" font-size="8" font-weight="800" fill="#5fe08a" font-family="sans-serif" class="neon">AÇIK</text>';
  if (s.dekor >= 2) o += '<g transform="translate(265 11)"><circle class="fan" r="1.5" fill="#2a1b12"/><g class="pervane"><rect x="-14" y="-1" width="28" height="2" rx="1" fill="#6b4a30"/><rect x="-1" y="-14" width="2" height="28" rx="1" fill="#6b4a30"/></g></g>';
  /* masalar + oturan müşteriler */
  var pos = [], cols = masa <= 6 ? 3 : 4, i; for (i = 0; i < masa; i++) pos.push({x: Math.min(338, 176 + (i % cols) * 50 + (Math.floor(i / cols) % 2) * 14), y: Math.min(204, 168 + Math.floor(i / cols) * 24)});
  pos.forEach(function (p, k) { var var1 = k < dolu; o += '<ellipse cx="' + p.x + '" cy="' + p.y + '" rx="17" ry="6.5" fill="' + (var1 ? '#e2b27a' : '#d6a56a') + '" stroke="#4a3322" stroke-width="1.5"/><rect x="' + (p.x - 1.5) + '" y="' + p.y + '" width="3" height="9" fill="#4a3322"/><ellipse cx="' + (p.x - 12) + '" cy="' + (p.y + 4) + '" rx="5" ry="2.4" fill="' + (var1 ? '#8a5a36' : '#5a4430') + '"/><ellipse cx="' + (p.x + 12) + '" cy="' + (p.y + 4) + '" rx="5" ry="2.4" fill="' + (var1 ? '#8a5a36' : '#5a4430') + '"/>'; if (var1) { o += '<ellipse cx="' + p.x + '" cy="' + (p.y - 1) + '" rx="9" ry="3.3" fill="#fff" opacity=".92"/><path d="M' + (p.x - 4) + ' ' + (p.y - 4) + ' h8 v-6 a4 4 0 0 1 -8 0z" fill="#fff"/><ellipse cx="' + p.x + '" cy="' + (p.y - 9) + '" rx="3.5" ry="1.2" fill="#6b3f1f"/><path class="bg bg' + (k % 3 + 1) + '" d="M' + p.x + ' ' + (p.y - 12) + ' q3 -5 0 -10" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7" stroke-linecap="round"/>' + (ek.wifi && k % 2 === 0 ? '<rect x="' + (p.x + 8) + '" y="' + (p.y - 6) + '" width="10" height="6" rx="1" fill="#2d343b"/>' : ''); } });
  if (ek.teras) o += '<path d="M' + (pos[pos.length - 1].x - 26) + ' ' + (pos[pos.length - 1].y - 26) + ' Q' + pos[pos.length - 1].x + ' ' + (pos[pos.length - 1].y - 46) + ' ' + (pos[pos.length - 1].x + 26) + ' ' + (pos[pos.length - 1].y - 26) + 'Z" fill="#e0983c" opacity=".92"/>';
  if (s.hijyen < 50) for (var d = 0; d < 7; d++) o += '<circle cx="' + (30 + d * 47) + '" cy="' + (200 + (d % 3) * 6) + '" r="2" fill="rgba(0,0,0,.35)"/>';
  /* kapı */
  o += '<rect x="338" y="104" width="18" height="46" rx="2" fill="#5b3a22" stroke="#2a1b12" stroke-width="2"/><circle cx="351" cy="128" r="1.5" fill="#f3b45a"/><rect class="giris" x="341" y="108" width="12" height="38" fill="#ffe9b0" opacity=".0"/>';
  if (S.marka > 40) o += '<text class="yildiz" x="24" y="56" font-size="11">⭐</text>';
  o += '</svg>'; return '<div class="sahne">' + o + '</div>';
}
function kisiBarista(x, y, k) { return '<g class="zp" style="animation-delay:' + (-k * .4) + 's"><circle cx="' + x + '" cy="' + (y - 38) + '" r="9.5" fill="#f0c9a0"/><path d="M' + (x - 10) + ' ' + (y - 40) + ' Q' + x + ' ' + (y - 56) + ' ' + (x + 10) + ' ' + (y - 40) + ' Z" fill="' + (k ? '#7a3a22' : '#3a2418') + '"/><rect x="' + (x - 12) + '" y="' + (y - 28) + '" width="24" height="28" rx="8" fill="#e0983c"/><rect x="' + (x - 8) + '" y="' + (y - 19) + '" width="16" height="19" rx="3" fill="#fff3e0"/><g class="kol"><rect x="' + (x + 8) + '" y="' + (y - 26) + '" width="4" height="15" rx="2" fill="#f0c9a0"/></g></g>'; }

/* ---------- müşteri profili halkası ---------- */
function donut(seg, kal) { var r = 30, C = 2 * Math.PI * r, off = 0, o = '<svg viewBox="0 0 80 80" width="92" height="92"><circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="12"/>'; SEGMENTLER.forEach(function (g) { var d = seg[g[0]] * C; o += '<circle cx="40" cy="40" r="30" fill="none" stroke="' + g[3] + '" stroke-width="12" stroke-dasharray="' + d.toFixed(1) + ' ' + (C - d).toFixed(1) + '" stroke-dashoffset="' + (-off).toFixed(1) + '" transform="rotate(-90 40 40)"/>'; off += d; }); return o + '<text x="40" y="45" text-anchor="middle" font-size="16" fill="#f4eadc">☕</text></svg>'; }

/* ---------- sekmeler ---------- */
var TABLAR = [['kafe', 'Kafe', '☕'], ['menu', 'Menü', '📋'], ['ekip', 'Ekip', '👥'], ['sube', 'Şubeler', '🏬'], ['pazar', 'Pazarlama', '📣'], ['finans', 'Finans', '💰'], ['piyasa', 'Piyasa', '📈'], ['hedef', 'Hedefler', '🏆']];
function subeSecici() { if (S.subeler.length < 2) return ''; return '<div class="chiprow" style="margin-bottom:10px">' + S.subeler.map(function (s) { var il = ilceBul(s.ilce); return '<button class="cx' + (s.id === SEC ? ' on' : '') + '" data-a="sec" data-v="' + s.id + '">' + esc(il.ikon + ' ' + il.ad) + '</button>'; }).join('') + '</div>'; }
function darbogaz(s, h) {
  if (h.doluluk <= 1) return '<div class="small good">✅ Kapasite yeterli; müşteri sığıyor.</div>';
  return '<div class="small badc">⚠️ %' + Math.round((h.doluluk - 1) * 100) + ' fazla talep sığmıyor. Darboğaz: <b>' + (h.koltukKap <= h.persKap ? 'koltuk sayısı' : 'personel') + '</b>. ' + (h.koltukKap <= h.persKap ? 'Şubeler sekmesinden koltuk ya da teras ekle.' : 'Ekip sekmesinden personel al ya da hızlı kasa kur.') + '</div>';
}
function seviyeKart() {
  var sv = seviye(S), nx = ['', 'Yerel Marka için 2 şube aç.', 'Şehir Zinciri için 4 şube ve marka 35.', 'Bölgesel Marka için 7 şube ve marka 55.', 'Ulusal Marka için 10 şube ve marka 75.', 'En üst seviyedesin!'][sv];
  return '<div class="card"><div class="row"><b>🏅 ' + SEVIYE_AD[sv] + '</b><span class="small muted">Seviye ' + sv + '/5</span></div>' + bar(sv * 20, 'linear-gradient(90deg,#c97b24,#f3b45a)') + '<div class="tiny muted" style="margin-top:6px">' + nx + '</div></div>';
}
function tKafe() {
  var s = sube(), h = subeHesapla(S, s), kar = subeKar(h), son = S.gecmis[S.gecmis.length - 1], il = ilceBul(s.ilce), oz = h.ozel;
  var t = subeSecici() + sahneSvg(s, h);
  if (oz) t += '<div class="card ozel">' + oz.ikon + ' <b>Bu ay: ' + oz.ad + '</b><div class="small muted">Talep +%' + Math.round(oz.trafik * 100) + (oz.urun ? ' · öne çıkan: ' + Object.keys(oz.urun).map(function (k) { var u = urunBul(k); return u.ikon; }).join(' ') : '') + '</div></div>';
  t += '<div class="card"><h3>' + esc(il.ikon) + ' ' + esc(s.ad) + '</h3><div class="row small"><span>Bu ay tahmini müşteri</span><b>' + h.musteri.toLocaleString('tr-TR') + '</b></div><div class="row small"><span>Tahmini gelir</span><b>' + para(h.gelir) + '</b></div><div class="row small"><span>Tahmini gider</span><b>' + para(h.mal + h.maas + h.kira + h.fatura) + '</b></div><div class="row"><span>Tahmini kâr</span><b class="' + (kar >= 0 ? 'good' : 'badc') + '">' + para(kar) + '</b></div><div class="row small"><span>Memnuniyet</span><b>' + yildiz(h.memn) + ' ' + Math.round(h.memn) + '</b></div>' + bar(h.memn, h.memn >= 70 ? 'var(--ok)' : h.memn >= 50 ? 'var(--am)' : 'var(--bad)') + '<div style="margin-top:8px">' + darbogaz(s, h) + '</div></div>';
  t += seviyeKart();
  t += '<div class="card"><h3>Müşteri profili</h3><div style="display:flex;gap:14px;align-items:center">' + donut(il.seg) + '<div style="flex:1">' + SEGMENTLER.map(function (g) { return '<div class="row tiny"><span><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + g[3] + ';margin-right:6px"></i>' + g[1] + '</span><b>%' + Math.round(il.seg[g[0]] * 100) + '</b></div>'; }).join('') + '</div></div><div class="tiny muted" style="margin-top:6px">' + il.not + '</div></div>';
  var top = Object.keys(h.satis || {}).sort(function (a, b) { return h.satis[b] - h.satis[a]; }).slice(0, 3);
  t += '<div class="card"><h3>En çok satanlar</h3>' + top.map(function (id, i) { var u = urunBul(id); return '<div class="row small"><span>' + ['🥇', '🥈', '🥉'][i] + ' ' + u.ikon + ' ' + u.ad + '</span><b>' + Math.round(h.satis[id]).toLocaleString('tr-TR') + ' adet</b></div>'; }).join('') + '</div>';
  if (S.yorumlar && S.yorumlar.length) t += '<div class="card"><h3>💬 Müşteri yorumları</h3>' + S.yorumlar.map(function (y) { return '<div class="yorum"><div class="small"><b>' + esc(y.a) + '</b> <span class="muted">' + '★'.repeat(y.y) + '☆'.repeat(5 - y.y) + '</span></div><div class="small muted">' + esc(y.t) + '</div></div>'; }).join('') + '</div>';
  if (son) t += '<div class="card"><h3>Geçen ay (' + esc(son.ay) + ')</h3><div class="row small"><span>Kâr</span><b class="' + (son.kar >= 0 ? 'good' : 'badc') + '">' + para(son.kar) + '</b></div><div class="row small"><span>Müşteri</span><b>' + son.musteri.toLocaleString('tr-TR') + '</b></div></div>';
  return t;
}
function kilit(u, s) { if (seviye(S) < u.sev) return '🔒 Seviye ' + u.sev + ': ' + SEVIYE_AD[u.sev]; if (u.gerek && !(s.ek && s.ek[u.gerek])) return '🔒 ' + EKIPMAN.filter(function (x) { return x.id === u.gerek; })[0].ad + ' gerekli'; return ''; }
function tMenu() {
  var f = F(), s = sube();
  return subeSecici() + '<div class="card"><h3>Menü ve fiyatlar</h3><div class="small muted" style="margin-bottom:6px">Fiyat artarsa kâr artar ama talep düşer. 1,00× = pazar ortalaması. Kilitli ürünler ekipman ya da seviye ister.</div>' + URUNLER.map(function (u) {
    var mu = S.menu[u.id], pr = u.fiyat * f * mu.fiyat, kc = u.kal * f * mu.kalite, kl = kilit(u, s), h = subeHesapla(S, s), n = h.satis ? Math.round(h.satis[u.id] || 0) : 0;
    if (kl) return '<div class="mp" style="opacity:.55"><div class="ik">' + u.ikon + '</div><div class="nm"><b>' + u.ad + '</b><div class="tiny muted">' + kl + '</div></div></div>';
    return '<div class="mp"><div class="ik">' + u.ikon + '</div><div class="nm"><b>' + u.ad + (mu.aktif ? '' : ' <span class="tiny muted">(kapalı)</span>') + '</b><div class="tiny muted">Maliyet ' + Math.round(u.mal * f * TEDARIK[S.tedarik].mal * (1 + .12 * (mu.kalite - 1))) + ' ₺ · ' + '★'.repeat(mu.kalite) + (n ? ' · ' + n + ' adet/ay' : '') + '</div><div class="tiny">' + (mu.kalite < 3 ? '<button class="cx" data-a="kalite" data-v="' + u.id + '" style="min-height:34px">Kalite ↑ ' + para(kc) + '</button>' : '') + '<button class="cx" data-a="aktif" data-v="' + u.id + '" style="min-height:34px">' + (mu.aktif ? 'Çıkar' : 'Ekle') + '</button></div></div><div class="stp"><button data-a="fiyat" data-v="' + u.id + '" data-d="-1">−</button><span>' + Math.round(pr) + ' ₺<div class="tiny muted">' + mu.fiyat.toFixed(2).replace('.', ',') + '×</div></span><button data-a="fiyat" data-v="' + u.id + '" data-d="1">+</button></div></div>';
  }).join('') + '</div>';
}
function tEkip() {
  var s = sube(), h = subeHesapla(S, s), kk = h.koltukKap, pk = h.persKap, mx = Math.max(kk, pk, h.trafik);
  function adim(rol, ad, ik) { return '<div class="mp"><div class="ik">' + ik + '</div><div class="nm"><b>' + ad + '</b><div class="tiny muted">Maaş ' + para((rol === 'barista' ? BARISTA.maas : GARSON.maas) * MAAS_ADIM[s.maas] * F()) + '/ay</div></div><div class="stp"><button data-a="pers" data-v="' + rol + '" data-d="-1">−</button><span>' + s[rol] + '</span><button data-a="pers" data-v="' + rol + '" data-d="1">+</button></div></div>'; }
  return subeSecici() + '<div class="card"><h3>👥 Ekip · ' + esc(ilceBul(s.ilce).ad) + '</h3>' + adim('barista', 'Barista', '🧑‍🍳') + adim('garson', 'Garson', '🧑‍💼') + '<div class="mp"><div class="ik">🧑‍💼</div><div class="nm"><b>Şube müdürü</b><div class="tiny muted">' + (s.mudur ? 'Atandı · memnuniyet +4, trafik +%3' : 'Aylık ' + para(52000 * F()) + ' · memnuniyet +4, trafik +%3') + '</div></div>' + (s.mudur ? '<span class="pill">✓</span>' : '<button class="cx" data-a="mudur" data-v="1">Ata · ' + para(25000 * F()) + '</button>') + '</div><div class="eyebrow">Maaş politikası</div><div class="chiprow">' + ['Düşük', 'Normal', 'Yüksek'].map(function (n, i) { return '<button class="cx' + (s.maas === i ? ' on' : '') + '" data-a="maas" data-v="' + i + '">' + n + '</button>'; }).join('') + '</div><div class="tiny muted" style="margin-top:6px">Yüksek maaş moral ve memnuniyet getirir; maliyeti artırır.</div></div>' +
    '<div class="card"><h3>Kapasite</h3><div class="row small"><span>Koltuk kapasitesi</span><b>' + Math.round(kk).toLocaleString('tr-TR') + '/ay</b></div>' + bar(kk / mx * 100) + '<div class="row small"><span>Personel kapasitesi</span><b>' + Math.round(pk).toLocaleString('tr-TR') + '/ay</b></div>' + bar(pk / mx * 100, 'var(--ok)') + '<div class="row small"><span>Beklenen talep</span><b>' + Math.round(h.trafik).toLocaleString('tr-TR') + '/ay</b></div>' + bar(h.trafik / mx * 100, '#4aa3e8') + '<div style="margin-top:8px">' + darbogaz(s, h) + '</div></div>' +
    '<div class="card"><h3>Moral ve hijyen</h3><div class="row small"><span>Moral</span><b>' + Math.round(s.moral) + '</b></div>' + bar(s.moral) + '<div class="row small"><span>Hijyen</span><b>' + Math.round(s.hijyen) + '</b></div>' + bar(s.hijyen, 'var(--ok)') + '<div class="chiprow" style="margin-top:10px"><button class="cx" data-a="yuk" data-v="egitim">Eğitim · ' + para(15000 * F()) + '</button><button class="cx" data-a="yuk" data-v="hijyen">Temizlik ekibi · ' + para(8000 * F()) + '</button></div></div>';
}
function haritaSvg() {
  var o = '<svg viewBox="0 0 360 254" role="img" aria-label="Şehir haritası"><rect width="360" height="254" rx="14" fill="#2a2a22"/><path d="M0 150 Q80 120 150 160 T290 150 T360 170 L360 240 L0 240Z" fill="#1d3b4d" opacity=".75"/><path class="dalga" d="M20 172 q10 -6 20 0 t20 0 t20 0 t20 0" stroke="#7fc3e8" stroke-width="2" fill="none" opacity=".6"/><path d="M20 30 L340 220 M180 10 L190 230 M10 100 L350 80" stroke="rgba(255,255,255,.08)" stroke-width="10" fill="none"/>';
  ILCELER.forEach(function (il) {
    var benim = S.subeler.some(function (x) { return x.ilce === il.id; }), rk = (S.rakipler || []).filter(function (r) { return r.ilce.indexOf(il.id) >= 0; }), sec = benim && sube().ilce === il.id;
    o += '<g data-a="harita" data-v="' + il.id + '" style="cursor:pointer"><circle cx="' + il.x + '" cy="' + il.y + '" r="23" fill="' + (benim ? 'rgba(95,192,138,.25)' : 'rgba(255,255,255,.07)') + '" stroke="' + (sec ? '#f3b45a' : benim ? '#5fc08a' : 'rgba(255,255,255,.2)') + '" stroke-width="' + (sec ? 3 : 2) + '"' + (benim ? ' class="nabiz"' : '') + '/><text x="' + il.x + '" y="' + (il.y + 5) + '" text-anchor="middle" font-size="18">' + il.ikon + '</text><text x="' + il.x + '" y="' + (il.y + 36) + '" text-anchor="middle" font-size="8.5" fill="#d8cbb9" font-family="sans-serif">' + il.ad + '</text>' + (benim ? '<text x="' + (il.x + 17) + '" y="' + (il.y - 14) + '" font-size="12">☕</text>' : '') + rk.map(function (r, i) { return '<circle cx="' + (il.x - 18 + i * 9) + '" cy="' + (il.y - 20) + '" r="4" fill="' + (r.id === 'moka' ? '#8a5a36' : r.id === 'ristre' ? '#4aa3e8' : '#e0983c') + '" stroke="#000" stroke-width=".8"/>'; }).join('') + '</g>';
  });
  return o + '</svg>';
}
function tSube() {
  var s = sube(), f = F(), il = ilceBul(s.ilce), t = '<div class="sahne" style="background:#2a2a22;padding:4px">' + haritaSvg() + '</div><div class="tiny muted" style="margin:-4px 2px 10px">☕ = şuben · renkli noktalar = rakip zincirler · dokun: ayrıntı</div>' + subeSecici();
  t += '<div class="card"><h3>🏬 ' + esc(s.ad) + '</h3><div class="row small"><span>Koltuk</span><b>' + s.koltuk + (s.ek.teras ? ' + 10 teras' : '') + '</b></div><div class="row small"><span>Dekor seviyesi</span><b>' + '★'.repeat(s.dekor) + '</b></div><div class="row small"><span>Kira</span><b>' + para(s.kira * f) + '/ay</b></div><div class="chiprow" style="margin-top:8px"><button class="cx" data-a="yuk" data-v="koltuk">Koltuk +10 · ' + para(40000 * f) + '</button>' + (s.dekor < 4 ? '<button class="cx" data-a="yuk" data-v="dekor">Dekoru yenile · ' + para(70000 * s.dekor * f) + '</button>' : '') + (S.subeler.length > 1 ? '<button class="cx" data-a="kapat" data-v="' + s.id + '">Şubeyi kapat</button>' : '') + '</div></div>';
  t += '<div class="eyebrow">Ekipman ve yatırım</div>' + EKIPMAN.map(function (d) { var lv = s.ek[d.id] || 0, son = lv >= d.max, c = d.maliyet * (lv + 1) * f; return '<div class="card" style="display:flex;gap:12px;align-items:center"><div style="font-size:28px">' + d.ikon + '</div><div style="flex:1;min-width:0"><b>' + d.ad + '</b> <span class="tiny muted">' + '●'.repeat(lv) + '○'.repeat(d.max - lv) + '</span><div class="tiny muted">' + d.ac + '</div></div>' + (son ? '<span class="pill">✓</span>' : '<button class="cx" data-a="ekip" data-v="' + d.id + '">' + para(c) + '</button>') + '</div>'; }).join('');
  var bos = ILCELER.filter(function (x) { return !S.subeler.some(function (y) { return y.ilce === x.id; }); });
  t += '<div class="eyebrow">Yeni şube aç</div>' + (bos.length ? bos.map(function (x) { var u = subeUcret(S, x.id), pot = Math.round(clamp(x.yog / 2, 1, 5)), rk = (S.rakipler || []).filter(function (r) { return r.ilce.indexOf(x.id) >= 0; }).length; return '<div class="card"><div class="row"><b>' + x.ikon + ' ' + x.ad + '</b><span class="small muted">Talep ' + '●'.repeat(pot) + '○'.repeat(5 - pot) + '</span></div><div class="small muted">' + x.not + '</div><div class="row small"><span>Kira ' + para(x.kira * f) + '/ay</span><span>Kurulum ' + para(u) + '</span></div><div class="tiny muted">Rakip: ' + (rk ? rk + ' zincir var' : 'yok') + '</div><button class="btn sm pri" style="margin-top:6px" data-a="ac" data-v="' + x.id + '">Şube aç</button></div>'; }).join('') : '<div class="card small muted">Şehirdeki tüm mahallelerde şuben var!</div>');
  return t;
}
function tPazar() {
  var f = F(), c = S.subeler.length > 2 ? 1 + 0.15 * (S.subeler.length - 2) : 1;
  return '<div class="card"><h3>📣 Pazarlama</h3><div class="small muted">Kampanyalar tüm şubelere uygulanır. Şube sayısı arttıkça maliyet yükselir. Marka puanın: <b>' + Math.round(S.marka) + '/100</b></div>' + bar(S.marka, 'linear-gradient(90deg,#c97b24,#f3b45a)') + '</div>' + KAMPANYALAR.map(function (k) {
    var aktif = S.kamp.filter(function (x) { return x.id === k.id && x.bit > S.ay; })[0];
    return '<div class="card" style="display:flex;gap:12px;align-items:center"><div style="font-size:30px">' + k.ikon + '</div><div style="flex:1;min-width:0"><div class="row" style="padding:0"><b>' + k.ad + '</b><span class="small">' + para(k.maliyet * f * c) + '</span></div><div class="small muted">' + k.ac + ' Trafik +%' + Math.round(k.trafik * 100) + ' · ' + k.sure + ' ay' + (k.risk ? ' · riskli' : '') + '</div>' + (aktif ? '<div class="small good" style="margin-top:4px">▶ Sürüyor · ' + (aktif.bit - S.ay - 1) + ' ay kaldı' + (aktif.bos ? ' (tutmadı)' : '') + '</div>' : '<button class="btn sm pri" style="margin-top:6px" data-a="kamp" data-v="' + k.id + '">Başlat</button>') + '</div></div>';
  }).join('');
}
function tFinans() {
  var r = ayOzeti(S), g = S.gecmis.slice(-8), mx = Math.max(1, Math.max.apply(null, g.map(function (x) { return Math.abs(x.kar); }))), faiz = S.borc * 0.03;
  var grafik = g.length ? '<svg viewBox="0 0 320 120" width="100%"><line x1="0" x2="320" y1="60" y2="60" stroke="rgba(255,255,255,.2)"/>' + g.map(function (x, i) { var hh = Math.abs(x.kar) / mx * 50, bx = 10 + i * 38; return '<rect class="col" x="' + bx + '" y="' + (x.kar >= 0 ? 60 - hh : 60) + '" width="26" height="' + Math.max(1, hh) + '" rx="3" fill="' + (x.kar >= 0 ? '#5fc08a' : '#e8665f') + '" style="animation-delay:' + (i * .06) + 's"/><text x="' + (bx + 13) + '" y="116" text-anchor="middle" font-size="8" fill="#a99a88">' + esc(x.ay.slice(0, 3)) + '</text>'; }).join('') + '</svg>' : '<div class="small muted">İlk ayı bitirince grafik dolacak.</div>';
  var son = S.gecmis.slice(-1)[0];
  return '<div class="card"><h3>💰 Kasa: ' + para(S.kasa) + '</h3><div class="row small"><span>Bu ay tahmini gelir</span><b>' + para(r.gelir) + '</b></div><div class="row small"><span>Tahmini gider</span><b>' + para(r.gider + faiz) + '</b></div><div class="row"><span>Tahmini kâr</span><b class="' + (r.gelir - r.gider - faiz >= 0 ? 'good' : 'badc') + '">' + para(r.gelir - r.gider - faiz) + '</b></div><div class="row small"><span>Toplam kâr (başlangıçtan)</span><b>' + para(S.toplamKar) + '</b></div>' + (S.kasa < 0 ? '<div class="small badc" style="margin-top:6px">Kasa eksi! 3 ay −150 B ₺ altında kalırsan iflas.</div>' : '') + '</div><div class="card"><h3>Aylık kâr (son 8 ay)</h3>' + grafik + '</div>' +
    '<div class="card"><h3>🏦 Kredi</h3><div class="row small"><span>Borç</span><b>' + para(S.borc) + '</b></div><div class="row small"><span>Aylık faiz (%3)</span><b>' + para(faiz) + '</b></div><div class="chiprow" style="margin-top:8px"><button class="cx" data-a="kredi" data-v="250000">+250 B ₺ al</button><button class="cx" data-a="kredi" data-v="1000000">+1 M ₺ al</button>' + (S.borc > 0 ? '<button class="cx" data-a="ode" data-v="250000">250 B öde</button><button class="cx" data-a="ode" data-v="' + Math.ceil(S.borc) + '">Hepsini öde</button>' : '') + '</div></div>';
}
function tPiyasa() {
  var f = F(), s = sube(), h = subeHesapla(S, s), pay = Math.round(pazarPayi(S) * 100);
  var t = '<div class="card"><h3>📈 Piyasa</h3><div class="row small"><span>Yıllık enflasyon</span><b>%' + S.enf + '</b></div><div class="row small"><span>Fiyat endeksi</span><b>' + f.toFixed(2).replace('.', ',') + '×</b></div><div class="row small"><span>Pazar payın (mağaza yoğunluğu)</span><b>%' + pay + '</b></div>' + bar(pay * 2, '#4aa3e8') + '<div class="tiny muted" style="margin-top:6px">Maliyetler ve pazar fiyatları enflasyonla artar; menüdeki × oranı pazara göre fiyatını gösterir.</div></div>';
  t += '<div class="eyebrow">Rakip zincirler</div>' + (S.rakipler || []).map(function (r) { return '<div class="card"><div class="row"><b>' + r.ikon + ' ' + r.ad + '</b><span class="small muted">' + '★'.repeat(r.kalite) + '</span></div><div class="row small"><span>Fiyat seviyesi</span><b>' + r.fiyat.toFixed(2).replace('.', ',') + '× (sen ' + h.fiyatOrt.toFixed(2).replace('.', ',') + '×)</b></div>' + bar(r.agr * 100, '#e8665f') + '<div class="tiny muted">Agresiflik · ' + r.ilce.map(function (id) { return ilceBul(id).ad; }).join(', ') + '</div></div>'; }).join('');
  t += '<div class="card"><h3>☕ Tedarikçi</h3><div class="chiprow">' + Object.keys(TEDARIK).map(function (k) { return '<button class="cx' + (S.tedarik === k ? ' on' : '') + '" data-a="ted" data-v="' + k + '">' + TEDARIK[k].ad + '</button>'; }).join('') + '</div><div class="small muted" style="margin-top:6px">' + TEDARIK[S.tedarik].ac + '</div></div>';
  var tk = []; for (var i = 0; i < 6; i++) { var m = (S.basAy + S.ay + i) % 12; if (OZEL[m]) tk.push('<div class="row small"><span>' + OZEL[m].ikon + ' ' + OZEL[m].ad + '</span><b>' + AYLAR_UZUN[m] + '</b></div>'); }
  t += '<div class="card"><h3>📅 Özel günler</h3>' + (tk.length ? tk.join('') : '<div class="small muted">Önümüzdeki 6 ayda özel gün yok.</div>') + '</div>';
  t += '<div class="eyebrow">Son olaylar</div>' + ((S.olayGecmis || []).length ? S.olayGecmis.slice(0, 6).map(function (o) { return '<div class="card small"><b>' + esc(o.ad) + '</b><div class="muted">' + esc(o.msg) + '</div></div>'; }).join('') : '<div class="card small muted">Henüz olay yok.</div>');
  return t;
}
function tHedef() {
  var n = HEDEFLER.filter(function (h) { return S.hedef[h[0]]; }).length;
  return '<div class="card"><h3>🏆 Hedefler</h3><div class="small muted">' + n + '/' + HEDEFLER.length + ' tamamlandı. Nihai hedef: <b>10 şube ve marka 80</b> ile Kafe İmparatoru ol.</div>' + bar(n / HEDEFLER.length * 100) + '</div>' + HEDEFLER.map(function (h) { var ok = !!S.hedef[h[0]]; return '<div class="card" style="display:flex;gap:12px;align-items:center;' + (ok ? '' : 'opacity:.75') + '"><div style="font-size:28px">' + (ok ? '✅' : h[1]) + '</div><div style="flex:1"><b>' + h[2] + '</b><div class="small muted">' + h[3] + '</div></div>' + (h[5] ? '<span class="pill">+' + para(h[5]) + '</span>' : '') + '</div>'; }).join('');
}
var TABF = {kafe: tKafe, menu: tMenu, ekip: tEkip, sube: tSube, pazar: tPazar, finans: tFinans, piyasa: tPiyasa, hedef: tHedef};
function render() {
  if (!S) return menu();
  var r = ayOzeti(S), kar = r.gelir - r.gider - S.borc * 0.03, sv = seviye(S);
  root.innerHTML = '<div class="top"><div class="ttl"><b>' + esc(S.ad) + '</b><span class="date">' + tarihYaz(S) + '</span><div class="ib"><button class="yd" id="yardim-b" aria-label="Yardım">?</button><button id="ayar" aria-label="Menü">⋯</button></div></div><div class="stats"><div class="st"><span>Kasa</span><b class="' + (S.kasa < 0 ? 'badc' : '') + '">' + para(S.kasa) + '</b></div><div class="st"><span>Marka</span><b>' + Math.round(S.marka) + '</b></div><div class="st"><span>Memnuniyet</span><b>' + yildiz(r.memn) + '</b></div><div class="st"><span>Şube</span><b>' + S.subeler.length + '</b></div><div class="st"><span>Seviye</span><b>' + sv + '</b></div><div class="st"><span>Tahmini kâr</span><b class="' + (kar >= 0 ? 'good' : 'badc') + '">' + para(kar) + '</b></div></div></div><div class="scroll" id="sc">' + TABF[TAB]() + '</div><nav class="tabs">' + TABLAR.map(function (t) { return '<button class="tab" data-t="' + t[0] + '" aria-current="' + (TAB === t[0]) + '"><span class="ti">' + t[2] + '</span>' + t[1] + '</button>'; }).join('') + '</nav><button class="fab" id="ay">Ay Sonu ▸</button>';
  $('#ay').onclick = ayBitirUi; $('#yardim-b').onclick = function () { ses('tik'); yardimSheet(); }; $('#ayar').onclick = ayarSheet;
  root.querySelectorAll('.tab').forEach(function (b) { b.onclick = function () { if (TAB !== b.dataset.t) ses('tik'); TAB = b.dataset.t; render(); $('#sc').scrollTop = 0; }; });
}
function ayarSheet() { sheet('<div class="lab">Menü</div><h2>' + esc(S.ad) + '</h2><button class="btn" id="a1">Rehberi yeniden izle</button><button class="btn" id="a4" style="margin-top:8px">' + (SESON ? '🔊 Sesi kapat' : '🔇 Sesi aç') + '</button><button class="btn" id="a2" style="margin-top:8px">Ana menü</button><button class="btn ghost" id="a3" style="margin-top:8px">Oyunu sil ve yeniden başla</button><button class="btn ghost" id="k" style="margin-top:8px">Kapat</button>'); $('#k').onclick = closeSheet; $('#a1').onclick = function () { closeSheet(); turAc(); }; $('#a4').onclick = function () { SESON = !SESON; try { localStorage.setItem(SES_KEY, SESON ? '1' : '0'); } catch (e) { /* yok say */ } closeSheet(); toast(SESON ? 'Ses açık' : 'Ses kapalı'); }; $('#a2').onclick = function () { closeSheet(); kaydet(); menu(); }; $('#a3').onclick = function () { sil(); closeSheet(); menu(); }; }

/* ---------- eylemler (olay delegasyonu) ---------- */
function ilceSheet(id) {
  var il = ilceBul(id), benim = S.subeler.filter(function (x) { return x.ilce === id; })[0], rk = (S.rakipler || []).filter(function (r) { return r.ilce.indexOf(id) >= 0; }), f = F();
  sheet('<div class="lab">Mahalle</div><h2>' + il.ikon + ' ' + il.ad + '</h2><p class="small muted">' + il.not + '</p><div style="display:flex;gap:14px;align-items:center">' + donut(il.seg) + '<div style="flex:1">' + SEGMENTLER.map(function (g) { return '<div class="row tiny"><span>' + g[2] + ' ' + g[1] + '</span><b>%' + Math.round(il.seg[g[0]] * 100) + '</b></div>'; }).join('') + '</div></div><div class="row small"><span>Yoğunluk</span><b>' + il.yog + '/10</b></div><div class="row small"><span>Gelir düzeyi</span><b>' + '₺'.repeat(il.zen) + '</b></div><div class="row small"><span>Kira</span><b>' + para(il.kira * f) + '/ay</b></div><div class="row small"><span>Rakipler</span><b>' + (rk.length ? rk.map(function (r) { return r.ikon; }).join(' ') + ' ' + rk.length : 'yok') + '</b></div>' + (benim ? '<button class="btn pri" id="ilc">Bu şubeyi seç</button>' : '<button class="btn pri" id="ilc">Şube aç · ' + para(subeUcret(S, id)) + '</button>') + '<button class="btn ghost" id="k">Kapat</button>');
  $('#k').onclick = closeSheet; $('#ilc').onclick = function () { closeSheet(); if (benim) { SEC = benim.id; TAB = 'kafe'; render(); } else ACT.ac({v: id}); };
}
var ACT = {
  sec: function (d) { SEC = +d.v; ses('tik'); render(); },
  harita: function (d) { ses('tik'); ilceSheet(d.v); },
  fiyat: function (d) { var mu = S.menu[d.v]; mu.fiyat = clamp(Math.round((mu.fiyat + 0.05 * (+d.d)) * 100) / 100, 0.7, 1.6); ses('tik'); render(); },
  aktif: function (d) { var s = sube(), n = URUNLER.filter(function (u) { return S.menu[u.id].aktif && urunAcik(S, s, u); }).length, mu = S.menu[d.v]; if (mu.aktif && n <= 3) return toast('En az 3 ürün satmalısın.'); mu.aktif = !mu.aktif; ses('tik'); render(); },
  kalite: function (d) { var u = urunBul(d.v), mu = S.menu[d.v], c = u.kal * F() * mu.kalite; if (S.kasa < c) { ses('bad'); return toast('Kasa yetersiz.'); } S.kasa -= c; mu.kalite++; ses('ok'); toast(u.ad + ' kalitesi arttı'); render(); },
  pers: function (d) { var r = personel(S, sube(), d.v, +d.d); ses(r.ok ? 'tik' : 'bad'); toast(r.m); render(); },
  maas: function (d) { sube().maas = +d.v; ses('tik'); render(); },
  mudur: function () { var r = mudurAta(S, sube()); ses(r.ok ? 'ok' : 'bad'); toast(r.m); render(); },
  yuk: function (d) { var r = yukselt(S, sube(), d.v); ses(r.ok ? 'ok' : 'bad'); toast(r.m); render(); },
  ekip: function (d) { var r = ekipAl(S, sube(), d.v); ses(r.ok ? 'ok' : 'bad'); toast(r.m); if (r.ok) kaydet(); render(); },
  kapat: function (d) { if (S.subeler.length < 2) return; sheet('<div class="lab">Dikkat</div><h2>Şubeyi kapat?</h2><p class="small muted">Kurulum yatırımı geri alınmaz; personel işten çıkarılır.</p><button class="btn pri" id="ev">Evet, kapat</button><button class="btn ghost" id="k">Vazgeç</button>'); $('#k').onclick = closeSheet; $('#ev').onclick = function () { S.subeler = S.subeler.filter(function (x) { return x.id !== +d.v; }); SEC = S.subeler[0].id; closeSheet(); render(); }; },
  ac: function (d) { var r = subeAc(S, d.v); ses(r.ok ? 'bell' : 'bad'); toast(r.m); if (r.ok) { SEC = S.subeler[S.subeler.length - 1].id; kaydet(); konfeti(); } render(); },
  kamp: function (d) { var r = kampanyaBaslat(S, d.v); ses(r.ok ? 'ok' : 'bad'); toast(r.m); render(); },
  kredi: function (d) { var r = krediAl(S, +d.v); ses(r.ok ? 'coin' : 'bad'); toast(r.m); render(); },
  ode: function (d) { var r = krediOde(S, +d.v); ses(r.ok ? 'ok' : 'bad'); toast(r.m); render(); },
  ted: function (d) { S.tedarik = d.v; ses('tik'); render(); }
};
document.addEventListener('click', function (e) { var el = e.target.closest ? e.target.closest('[data-a]') : null; if (!el || !S || !ACT[el.dataset.a]) return; ACT[el.dataset.a](el.dataset); });

/* ---------- ay sonu: zaman akışı animasyonu + rapor ---------- */
function ayBitirUi() {
  if (!S || S.bitti || document.querySelector('.zaman')) return; var s = sube(), on = ayOzeti(S), sahneOn = sahneSvg(s, subeHesapla(S, s)), ayAd = tarihYaz(S);
  var top = {}; on.subeler.forEach(function (hh) { for (var k in hh.satis) top[k] = (top[k] || 0) + hh.satis[k]; }); var best = Object.keys(top).sort(function (a, b) { return top[b] - top[a]; })[0];
  var r = ayiBitir(S); if (!r) return; r.enCok = best ? {u: urunBul(best), n: Math.round(top[best])} : null; kaydet();
  var ov = document.createElement('div'); ov.className = 'zaman'; ov.innerHTML = '<div class="zk"><div class="zay">' + esc(ayAd) + '</div>' + sahneOn.replace('class="sahne"', 'class="sahne hizli"') + '<div class="zst"><div><span>Müşteri</span><b id="zm">0</b></div><div><span>Gelir</span><b id="zg">0</b></div></div><div class="zpr"><i></i></div><div class="tiny muted" style="text-align:center">Dokun: atla</div></div>'; document.body.appendChild(ov);
  var bitti = false, tm; function git() { if (bitti) return; bitti = true; clearInterval(tm); ov.remove(); rapor(r); }
  ov.addEventListener('click', git); sayac($('#zm'), r.musteri, function (v) { return Math.round(v).toLocaleString('tr-TR'); }, 2100); sayac($('#zg'), r.gelir, para, 2100); var n = 0; tm = setInterval(function () { n++; ses('coin'); if (n > 6) clearInterval(tm); }, 300); if (!RM) { $('.zpr i').style.animation = 'zpr 2.2s linear forwards'; setTimeout(git, 2300); } else git();
}
function rapor(r) {
  render(); var h = '<div class="lab">' + esc(r.ay) + ' · Ay raporu</div><h2>' + (r.kar >= 0 ? '☀️ Kârlı ay' : '🌧️ Zararlı ay') + '</h2><div class="row"><span>Gelir</span><b id="r1">0</b></div><div class="row"><span>Gider' + (r.faiz ? ' (faiz dahil)' : '') + '</span><b id="r2">0</b></div><div class="row"><span><b>Net kâr</b></span><b id="r3" class="' + (r.kar >= 0 ? 'good' : 'badc') + '">0</b></div><div class="row small"><span>Müşteri</span><b>' + r.musteri.toLocaleString('tr-TR') + '</b></div><div class="row small"><span>Memnuniyet</span><b>' + yildiz(r.memn) + '</b></div>' + (r.enCok ? '<div class="row small"><span>Ayın ürünü</span><b>' + r.enCok.u.ikon + ' ' + r.enCok.u.ad + ' · ' + r.enCok.n.toLocaleString('tr-TR') + '</b></div>' : '') + r.notlar.map(function (n) { return '<div class="card small" style="margin-top:8px">' + esc(n) + '</div>'; }).join('') + '<button class="btn pri" id="k" style="margin-top:10px">Devam</button>';
  sheet(h); sayac($('#r1'), r.gelir, para); sayac($('#r2'), r.gider + r.faiz, para); sayac($('#r3'), r.kar, para); ses(r.kar >= 0 ? 'ok' : 'bad'); if (r.hedefler && r.hedefler.length) { konfeti(); ses('zafer'); } $('#k').onclick = function () { closeSheet(); sonrasi(); };
}
function sonrasi() { if (S.bitti) return bitis(); if (S.kuyruk && S.kuyruk.length) olayGoster(S.kuyruk.shift()); }
function olayGoster(id) {
  var o = olayBul(id); ses('bell'); sheet('<div class="lab">Olay</div><h2><span class="olayik">' + o.ikon + '</span> ' + o.baslik + '</h2><p>' + o.metin + '</p>' + o.sec.map(function (c, i) { return '<button class="btn" data-o="' + i + '" style="margin-top:8px;text-align:left">' + c.ad + '</button>'; }).join(''));
  sheetEl.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { var m = olaySec(S, id, +b.dataset.o); kaydet(); render(); ses('ok'); sheet('<div class="lab">Sonuç</div><h2>' + o.ikon + ' ' + o.baslik + '</h2><p>' + esc(m) + '</p><button class="btn pri" id="k">Tamam</button>'); $('#k').onclick = function () { closeSheet(); sonrasi(); }; }; });
}
function bitis() {
  var z = S.bitti === 'zafer'; if (z) { konfeti(); ses('zafer'); } else ses('bad'); sheet('<div class="lab">' + (z ? 'Zafer' : 'Oyun bitti') + '</div><h2>' + (z ? '👑 Kafe İmparatorusun!' : '📉 İflas') + '</h2><p>' + (z ? S.ad + ', 10 şube ve güçlü bir markaya ulaştı. Tebrikler!' : 'Kasa uzun süre eksi kaldı ve zincir kapandı. Bir dahaki sefere fiyat, ekip ve kapasiteyi daha dengeli tut.') + '</p><div class="row small"><span>Süre</span><b>' + S.ay + ' ay</b></div><div class="row small"><span>Şube</span><b>' + S.subeler.length + '</b></div><div class="row small"><span>Toplam kâr</span><b>' + para(S.toplamKar) + '</b></div><button class="btn pri" id="y">Yeni oyun</button>'); $('#y').onclick = function () { sil(); closeSheet(); menu(); };
}

/* ---------- yardım (?) ve rehber ---------- */
var YARDIM = {
  kafe: ['Kafe', 'Seçili şubenin canlı sahnesi, bu ayın tahmini sonucu, müşteri profili ve yorumlar.', ['Sahnedeki doluluk ve kuyruk talebi gösterir.', 'Kırmızı "darboğaz" uyarısı koltuk mu personel mi yetmiyor söyler.', '"Müşteri profili" mahalleye göre kimin geldiğini gösterir.', 'Hazırsan <b>Ay Sonu</b>\'na bas.'], 'Yorumlar sorunları ipucu olarak söyler: bekleme, fiyat, temizlik.'],
  menu: ['Menü', 'Ürün fiyatı, kalitesi ve menüde olup olmadığı.', ['− / + ile fiyatı %5 oynat; 1,00× pazar ortalaması.', 'Kaliteyi artırmak maliyeti biraz yükseltir, memnuniyeti artırır.', 'Kilitli ürünler için fırın ya da soğutucu dolap kur; bazıları seviye ister.', 'Mevsim önemli: yazın soğuk, kışın sıcak içecek.'], 'Öğrenciler fiyata çok duyarlıdır, turistler ve iş çevresi duyarsızdır.'],
  ekip: ['Ekip', 'Barista, garson, müdür, maaş politikası, moral ve hijyen.', ['Her kişi aylık kapasite ekler.', 'Şube müdürü memnuniyet ve trafiği artırır.', 'Yüksek maaş moral getirir; hijyen zamanla düşer.'], 'Koltuk darboğazıysa personel almak boşuna para harcar.'],
  sube: ['Şubeler', 'Şehir haritası, mevcut şubenin geliştirilmesi, ekipman ve yeni şube.', ['Haritada bir mahalleye dokun: profili ve rakipleri görürsün.', 'Ekipman yeni ürünler açar ve kalite/kapasite getirir.', 'Yeni şubede ilk aylar zor olabilir; kasa yedeği tut.'], 'Fırın ve soğutucu dolap menüyü büyütür; en iyi ilk yatırım.'],
  pazar: ['Pazarlama', 'Kampanyalar marka ve trafik getirir.', ['Kampanya tüm şubelere uygulanır.', 'Fenomen anlaşması bazen tutmaz.', 'Marka uzun vadeli trafiği belirler.'], 'Kasa dar iken pahalı kampanya yapma.'],
  finans: ['Finans', 'Kasa, kâr grafiği ve kredi.', ['Kredi hızlı sermaye verir; aylık %3 faiz işler.', 'Kasa 3 ay üst üste −150 B ₺ altında kalırsa iflas.'], 'Borcu kâra geçince hemen öde.'],
  piyasa: ['Piyasa', 'Enflasyon, rakip zincirler, tedarikçi, özel günler.', ['Rakip, şubenin olduğu mahallede şube açarsa trafik düşer.', 'Özel günler belirli ürünlerin satışını artırır.', 'Ucuz çekirdek maliyeti düşürür, lezzeti kötüleştirir.'], 'Rakibin fiyatı düşükse kaliteyle ayrış.'],
  hedef: ['Hedefler', 'Başarılar ve ödüller.', ['Her hedef nakit ödül verir.', 'Nihai hedef: 10 şube ve marka 80.'], 'Hedefleri kilometre taşı olarak kullan.']
};
function yardimSheet(genel) {
  var h = YARDIM[TAB], html = '<div class="lab">Yardım</div>';
  if (h && !genel && S) html += '<h2>' + h[0] + '</h2><p>' + h[1] + '</p><div class="eyebrow">Nasıl kullanılır?</div><div class="card"><ul style="margin:0;padding-left:20px">' + h[2].map(function (x) { return '<li style="margin:6px 0">' + x + '</li>'; }).join('') + '</ul></div><div class="card" style="border-color:var(--am)">💡 <b>İpucu:</b> ' + h[3] + '</div>';
  else html += '<h2>Nasıl oynanır?</h2><p>Küçük bir kafeyle başla. Her ay <b>fiyat, ekip, kapasite, ekipman ve pazarlama</b> kararlarını ver, sonra <b>Ay Sonu</b>\'na bas. Gelir giderden büyükse kârdasın. Şube aç, ekipman yatır, markanı büyüt; <b>10 şube ve 80 marka</b> ile Kafe İmparatoru ol.</p>';
  html += '<button class="btn" id="yt" style="margin-top:8px">🎬 Rehberi izle</button><button class="btn ghost" id="k">Kapat</button>'; sheet(html); $('#k').onclick = closeSheet; $('#yt').onclick = function () { closeSheet(); if (S) turAc(); else toast('Önce bir oyun başlat.'); };
}
var TUT = [
  {b: 'Hoş geldin patron!', m: 'Kafeni birkaç adımda tanıtayım. İstediğin an "Atla" diyebilirsin; <b>?</b> düğmesinden turu tekrar izlersin.'},
  {b: 'Göstergeler', m: '<b>Kasa</b> paran, <b>Marka</b> tanınırlığın, <b>Memnuniyet</b> müşteri puanın, <b>Seviye</b> zincirinin büyüklüğü, <b>Tahmini kâr</b> bu ayın beklentisi.', hedef: function () { return $('.stats'); }},
  {b: 'Canlı kafe', m: 'Şubenin sahnesi: müşteriler gelir, kuyruk oluşur, masalar dolar. Mevsim, pencere ve dekor da değişir. Altındaki kart tahmini kârı ve darboğazı gösterir.', tab: 'kafe', hedef: function () { return $('.sahne'); }},
  {b: 'Menü', m: 'Fiyat ve kaliteyi buradan ayarlarsın. Fiyat artarsa kâr artar ama talep düşer. Kilitli ürünler için ekipman gerekir.', tab: 'menu', hedef: function () { return $('.tab[data-t="menu"]'); }},
  {b: 'Ekip', m: 'Barista, garson ve şube müdürü; maaş ve morali yönet. Önce koltuk mu personel mi yetmiyor ona bak.', tab: 'ekip', hedef: function () { return $('.tab[data-t="ekip"]'); }},
  {b: 'Şubeler ve harita', m: 'Şehir haritasından mahalleleri incele. Ekipman kur (fırın, soğutucu, teras…), yeni şube aç. Rakipleri haritada renkli noktalar gösterir.', tab: 'sube', hedef: function () { return $('.tab[data-t="sube"]'); }},
  {b: 'Pazarlama ve piyasa', m: 'Kampanyalar marka getirir. Piyasa sekmesinde rakip zincirler, özel günler ve tedarikçi seçimi var.', tab: 'pazar', hedef: function () { return $('.tab[data-t="pazar"]'); }},
  {b: 'Ay Sonu', m: 'Kararlarını verince <b>Ay Sonu</b>\'na bas. Bir ayın zaman akışı oynar, rapor çıkar; bazen bir olay seni karar vermeye çağırır.', tab: 'kafe', hedef: function () { return $('#ay'); }},
  {b: 'Takıldığında: ?', m: 'Üstteki <b>?</b> düğmesi bulunduğun sekmeyi açıklar ve ipucu verir. Her sekmede çalışır.', hedef: function () { return $('#yardim-b'); }},
  {b: 'İlk hedefin', m: 'İlk ayı <b>kârla</b> kapat. Sonra fırın kur, ekibi büyüt, yeni şube aç. Hedef: 10 şube ve güçlü bir marka. Başarılar patron!', son: true}
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
  TUT_CARD.innerHTML = '<div class="tutface">☕</div><div class="tutbody"><small class="tutwho">Kafe Rehberi</small><b>' + st.b + '</b><p>' + st.m + '</p><div class="tutbar"><div class="tutdots">' + TUT.map(function (x, k) { return '<i class="' + (k === TUT_I ? 'on' : k < TUT_I ? 'done' : '') + '"></i>'; }).join('') + '</div><span class="sp"></span>' + (son ? '' : '<button class="btn" id="t-at">Atla</button>') + (TUT_I > 0 && !son ? '<button class="btn" id="t-g">‹</button>' : '') + '<button class="btn pri" id="t-i">' + (son ? 'Başla ▸' : 'İleri ▸') + '</button></div></div>';
  var a = $('#t-at'); if (a) a.onclick = turBitir; var g = $('#t-g'); if (g) g.onclick = function () { TUT_I--; turCiz(); }; $('#t-i').onclick = function () { ses('tik'); if (son) turBitir(); else { TUT_I++; turCiz(); } };
  setTimeout(turYer, 80); setTimeout(turYer, 380); turYer();
}
function turAc() {
  if (TUT_EL || !S) return; closeSheet(); TUT_I = 0; TUT_EL = document.createElement('div'); TUT_EL.className = 'tut'; TUT_RING = document.createElement('div'); TUT_RING.className = 'tutring'; TUT_CARD = document.createElement('div'); TUT_CARD.className = 'tutcard mid'; TUT_EL.appendChild(TUT_RING); TUT_EL.appendChild(TUT_CARD); document.body.appendChild(TUT_EL); window.addEventListener('resize', turYer); turCiz();
}
function turOtomatik() { if (!S || turGorulmus() || TUT_EL) return; if (navigator.webdriver && !/tur=1/.test(location.search)) return; turAc(); }
menu();
