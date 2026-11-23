/* ===== GÖRSEL KATMAN: portreler, parti logosu, kriz görselleri, gazete, rozet kutlaması ===== */
/* Tamamı kurgusaldır; gerçek kişi ya da gerçek parti simgesi çizilmez. */

function hashS(s) { s = String(s); var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

/* ---- Lider portresi: isimden üretilen, her zaman aynı çıkan SVG yüz ---- */
function portreG(seed, renk, boy) {
  var h = hashS(seed), P = function (n, k) { return (h >>> (k * 3)) % n; };
  var skin = ['#f1c9a5', '#e3b088', '#c98f66', '#a86d48', '#7a4b32'][P(5, 0)];
  var hair = ['#1b1b1f', '#3a2a20', '#6b4a2f', '#9a9aa2', '#c9a24a', '#2b1d14'][P(6, 1)];
  var st = P(5, 2), gl = P(3, 3) === 0, br = P(3, 4), bg = renk || '#667';
  var back = '', front = '';
  if (st === 3) back = '<path d="M17 32 C12 8 52 8 47 32 L49 50 L15 50Z" fill="' + hair + '"/>';
  if (st === 0) front = '<path d="M20 27 C19 12 45 12 44 27 C40 19 24 19 20 27Z" fill="' + hair + '"/>';
  else if (st === 1) front = '<path d="M20 29 C17 11 47 9 44 27 C38 17 28 18 20 29Z" fill="' + hair + '"/>';
  else if (st === 2) front = '<path d="M21 24 C24 16 40 16 43 24 C40 20 24 20 21 24Z" fill="' + hair + '"/>';
  else if (st === 3) front = '<path d="M20 28 C20 13 44 13 44 28 C38 19 26 19 20 28Z" fill="' + hair + '"/>';
  else front = '<circle cx="24" cy="18" r="6" fill="' + hair + '"/><circle cx="32" cy="15" r="6.5" fill="' + hair + '"/><circle cx="40" cy="18" r="6" fill="' + hair + '"/>';
  var brow = '<path d="M24 24.5 Q27 ' + (br === 0 ? 23 : 24) + ' 30 24.5 M34 24.5 Q37 ' + (br === 0 ? 23 : 24) + ' 40 24.5" stroke="' + hair + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
  var gls = gl ? '<g fill="none" stroke="#222" stroke-width="1.2"><rect x="23.5" y="25.5" width="8" height="6" rx="2.5"/><rect x="33.5" y="25.5" width="8" height="6" rx="2.5"/><path d="M31.5 28 H33.5"/></g>' : '';
  var mouth = P(2, 5) ? 'M28 36 Q32.5 39.5 37 36' : 'M28.5 37 Q32.5 38.5 36.5 37';
  var yaka = P(2, 6) ? '<path d="M26 47 L32.5 56 L39 47Z" fill="#f4f4f7"/><path d="M32.5 50 L30.5 64 L34.5 64Z" fill="#222" opacity=".55"/>' : '<path d="M25 47 L32.5 54 L40 47Z" fill="#f4f4f7"/>';
  return '<svg class="por" viewBox="0 0 65 64" width="' + (boy || 40) + '" height="' + (boy || 40) + '" role="img" aria-label="Lider portresi">' +
    '<defs><clipPath id="pc' + h + '"><circle cx="32.5" cy="32" r="31"/></clipPath></defs><g clip-path="url(#pc' + h + ')">' +
    '<rect width="65" height="64" fill="' + bg + '" opacity=".28"/>' + back +
    '<path d="M6 66 C6 52 19 47 32.5 47 C46 47 59 52 59 66Z" fill="' + bg + '"/>' + yaka +
    '<rect x="28" y="38" width="9" height="11" rx="3" fill="' + skin + '"/>' +
    '<ellipse cx="32.5" cy="29" rx="11.5" ry="13.5" fill="' + skin + '"/>' + front + brow +
    '<circle cx="27.5" cy="28.5" r="1.5" fill="#222"/><circle cx="37.5" cy="28.5" r="1.5" fill="#222"/>' + gls +
    '<path d="' + mouth + '" stroke="#5a2d2d" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>' +
    '<circle cx="32.5" cy="32" r="30.5" fill="none" stroke="' + bg + '" stroke-width="2"/></svg>';
}

/* ---- Parti logosu: 10 kurgusal amblem ---- */
var LOGOLAR = [
  ['Yıldız', '<polygon points="20,7 23.5,16 33,16.5 25.5,22.5 28,32 20,26.5 12,32 14.5,22.5 7,16.5 16.5,16"/>'],
  ['Güneş', '<circle cx="20" cy="20" r="6"/><g stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M20 7V11M20 29V33M7 20H11M29 20H33M10.8 10.8L13.6 13.6M26.4 26.4L29.2 29.2M29.2 10.8L26.4 13.6M13.6 26.4L10.8 29.2"/></g>'],
  ['Ağaç', '<polygon points="20,8 28,19 23,19 30,27 10,27 17,19 12,19"/><rect x="18" y="27" width="4" height="6"/>'],
  ['Ok', '<polygon points="20,8 30,20 24,20 24,32 16,32 16,20 10,20"/>'],
  ['Yaprak', '<path d="M11 29 C11 15 23 10 31 10 C31 23 27 31 11 29Z"/>'],
  ['Dağ', '<polygon points="7,30 16,14 21,22 25,16 33,30"/>'],
  ['Kule', '<path d="M17 32 V17 L20 8 L23 17 V32Z"/><rect x="12" y="30" width="16" height="3"/>'],
  ['Dalga', '<g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M8 15 Q14 9 20 15 T32 15"/><path d="M8 21 Q14 15 20 21 T32 21"/><path d="M8 27 Q14 21 20 27 T32 27"/></g>'],
  ['Elmas', '<polygon points="20,8 31,20 20,32 9,20"/>'],
  ['Kalkan', '<path d="M20 8 L31 12 V21 C31 27 26 31 20 33 C14 31 9 27 9 21 V12Z"/>']
];
function logoId(id) { return typeof id === 'number' ? id % LOGOLAR.length : hashS(id) % LOGOLAR.length; }
function logoSvg(li, renk, boy) {
  var L = LOGOLAR[logoId(li)];
  return '<svg class="lgo" viewBox="0 0 40 40" width="' + (boy || 32) + '" height="' + (boy || 32) + '" role="img" aria-label="Parti logosu: ' + L[0] + '"><circle cx="20" cy="20" r="19" fill="' + (renk || '#e63b5f') + '"/><circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/><g fill="#fff">' + L[1] + '</g></svg>';
}
function oyuncuLogo(boy) { var p = S.parti || {}; return logoSvg(p.logo != null ? p.logo : S.pid || 'x', p.renk, boy); }
function logoSecici(k) {
  return LOGOLAR.map(function (L, i) { return '<button type="button" data-lg="' + i + '" class="' + ((k.logo || 0) === i ? 'on' : '') + '" aria-label="' + L[0] + '">' + logoSvg(i, k.renk, 34) + '</button>'; }).join('');
}

/* ---- Kriz sahneleri: her tür için kendi hava durumu ---- */
var KRIZ_G = {
  xk_sel: ['🌊', 'yagmur', '#3b9ee0', 'Sel felaketi: yardım çağrıları artıyor'],
  xk_kur: ['💱', 'titrek', '#e5622e', 'Kur şoku: piyasalarda sert dalgalanma'],
  xk_sizinti: ['🕵️', 'glitch', '#8e4fd0', 'Gizli belgeler sızdı'],
  xk_yerel: ['🏙️', 'nabiz', '#e63b5f', 'Yerel yönetimde skandal'],
  xk_gida: ['🛒', 'nabiz', '#f0a030', 'Gıda fiyatlarında alarm'],
  xk_enerji: ['⚡', 'alev', '#d9d14a', 'Enerji krizi: kesintiler başladı'],
  xk_dis: ['🌍', 'radar', '#2aa8a8', 'Dış politikada gerilim tırmanıyor'],
  xk_siber: ['💻', 'glitch', '#2f9e5b', 'Siber saldırı: sistemler çöktü'],
  xk_grev: ['✊', 'nabiz', '#e63b5f', 'Grev dalgası büyüyor'],
  xk_saglik: ['🏥', 'sis', '#2aa8a8', 'Sağlık sisteminde alarm'],
  xk_ulasim: ['🚇', 'nabiz', '#f0a030', 'Ulaşımda büyük aksama'],
  xk_kampus: ['🎓', 'nabiz', '#8e4fd0', 'Kampüslerde gerilim'],
  xk_bakan: ['🚪', 'nabiz', '#e63b5f', 'Bakan krizi kabineyi sarstı'],
  xk_butce: ['📉', 'titrek', '#e5622e', 'Bütçe açığı büyüyor'],
  xk_sahte: ['🧾', 'glitch', '#8e4fd0', 'Sahte haber kampanyası yayılıyor'],
  xk_secimguv: ['🗳️', 'radar', '#3b9ee0', 'Seçim güvenliği tartışması'],
  xp_afet: ['🚨', 'nabiz', '#e5622e', 'Afet bölgesinde acil durum'],
  xp_deprem: ['🏚️', 'titrek', '#e5622e', 'Deprem: yıkım ve kayıplar var'],
  xg_afet: ['🚨', 'nabiz', '#e5622e', 'Afet: hükümete yardım baskısı'],
  xg_darbe: ['🛡️', 'radar', '#e63b5f', 'Gece yarısı olağanüstü gelişme'],
  xg_yolsuz: ['🧾', 'glitch', '#8e4fd0', 'Yolsuzluk iddiaları gündemi sarstı'],
  xb_ihale: ['🏗️', 'nabiz', '#f0a030', 'İhale usulsüzlüğü iddiası']
};
function krizHero(id, baslik) {
  var g = KRIZ_G[id] || ['🚨', 'nabiz', '#e63b5f', baslik || 'Beklenmedik gelişme'];
  return '<div class="kz-hero kz-e-' + g[1] + '" style="--kc:' + g[2] + '"><div class="kz-fx"></div><span class="kz-i">' + g[0] + '</span><div class="kz-tx"><div class="kz-t"><i></i>SON DAKİKA · KRİZ</div><div class="kz-m">' + g[3] + '</div></div></div>';
}

/* ---- Gazete ön sayfası ---- */
function gazeteHtml(g) {
  var top = siralama(S.anket).slice(0, 5), mx = Math.max.apply(null, top.map(function (id) { return S.anket[id] || 0; })) || 1;
  var bars = top.map(function (id, i) { var v = S.anket[id] || 0; return '<div class="gz-b"><span>' + esc(partiAdi(S, id)) + '</span><div><i style="width:' + Math.round(v / mx * 100) + '%;background:' + partiRengi(S, id) + '"></i></div><b>%' + f1(v) + '</b></div>'; }).join('');
  var br = (S.haberler || []).slice(0, 4).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') || '<p>Gündem sakin geçti.</p>';
  var ld = S.lider ? S.lider.ad : 'Genel Başkan';
  return '<div class="gz"><div class="gz-mh"><span>GÜNLÜK HABER</span><small>' + tarihYaz(S.tarih) + ' · ' + esc(g.ust || 'ÖZEL SAYI') + '</small></div>' +
    '<h1 class="gz-h">' + esc(g.manset) + '</h1><div class="gz-s">' + esc(g.alt || '') + '</div>' +
    '<div class="gz-row"><div class="gz-pt">' + portreG(ld, S.parti.renk, 74) + '<small>' + esc(ld) + '<br>' + esc(S.parti.ad) + '</small></div><div class="gz-ch"><div class="gz-lab">ANKET DURUMU</div>' + bars + '</div></div>' +
    '<div class="gz-col">' + br + '</div><div class="gz-ft">Kurgusal bir simülasyondur. Kişi ve kurumlar uydurmadır.</div></div>';
}
function gazeteAc(g) {
  sheet(gazeteHtml(g) + '<button class="btn pri" id="k" style="margin-top:12px">Kapat</button>');
  var b = $('#k'); if (b) b.onclick = function () { closeSheet(true); };
}

/* ---- Rozet kutlaması ---- */
function rozetKutla(r) {
  var el = document.createElement('div'); el.className = 'rzk';
  el.innerHTML = '<div class="rzk-i">' + (r[1] || '🏅') + '</div><div><div class="rzk-u">ROZET KAZANDIN</div><b>' + esc(r[2]) + '</b></div>';
  document.body.appendChild(el); try { ses('onay'); } catch (e) {}
  setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 400); }, 2600);
}
