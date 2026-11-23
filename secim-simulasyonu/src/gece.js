/* ===== SEÇİM GECESİ ===== */
var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function tw(el, to, fmt, dur) {
  var a = el._v || 0, t0 = performance.now(); el._v = to; dur = RM ? 0 : (dur || 350);
  if (!dur) { el.textContent = fmt(to); return; }
  (function f(t) { var p = Math.min(1, (t - t0) / dur); el.textContent = fmt(a + (to - a) * (1 - Math.pow(1 - p, 3))); if (p < 1 && el.isConnected) requestAnimationFrame(f); })(t0);
}
function ideoX(id) { if (id === S.pid) return S.mod === 'yeni' ? ideoBul(S.parti.ideo).x : partiBul(S.pid).x; var p = partiBul(id); return p ? p.x : 0.9; }
function yarimDaire(koltuk) {
  var ids = Object.keys(koltuk).filter(function (id) { return koltuk[id] > 0; }).sort(function (a, b) { return ideoX(a) - ideoX(b); }), n = 0, rows = 8, i, j;
  ids.forEach(function (id) { n += koltuk[id]; });
  var rad = [], sum = 0; for (i = 0; i < rows; i++) { rad.push(0.42 + 0.58 * i / (rows - 1)); sum += rad[i]; }
  var cnt = rad.map(function (r) { return Math.round(n * r / sum); }), tot = cnt.reduce(function (a, b) { return a + b; }, 0); cnt[rows - 1] += n - tot;
  var pts = []; for (i = 0; i < rows; i++) for (j = 0; j < cnt[i]; j++) pts.push({a: cnt[i] > 1 ? j / (cnt[i] - 1) : .5, r: rad[i]});
  pts.sort(function (p, q) { return p.a - q.a || p.r - q.r; });
  var out = '', k = 0;
  ids.forEach(function (id) { for (var z = 0; z < koltuk[id]; z++, k++) { var p = pts[k]; if (!p) return; out += '<circle cx="' + (150 - p.r * 138 * Math.cos(p.a * Math.PI)).toFixed(1) + '" cy="' + (150 - p.r * 138 * Math.sin(p.a * Math.PI)).toFixed(1) + '" r="2.7" fill="' + partiRengi(S, id) + '" style="animation-delay:' + (RM ? 0 : Math.round(k * 2.6)) + 'ms"/>'; } });
  return '<svg class="hemi" viewBox="0 0 300 160" role="img" aria-label="Meclis sandalye dağılımı">' + out + '<text x="150" y="132" text-anchor="middle" fill="#eceef4" font-size="30" font-weight="700" font-family="var(--fd)">600</text><text x="150" y="148" text-anchor="middle" fill="#9aa1b4" font-size="9">çoğunluk 301</text></svg>';
}
function secimGece(r) {
  var gen = r.tip === 'genel', tar = AYLAR_UZUN[r.m - 1] + ' ' + r.y, el = document.createElement('div'), timer = null, hiz = 1, rev = 0, pop = 0, vote = {}, seat = {}, wins = {}, bitti = false;
  el.className = 'gece'; document.body.appendChild(el); muzikMood('gece');
  var order = ILLER.map(function (x, i) { return i; }).sort(function (a, b) { return ILLER[a].nufus - ILLER[b].nufus; });
  var ids = gen ? Object.keys(r.ulusal).filter(function (id) { return r.ulusal[id] >= 0.8 || (r.koltuk[id] || 0) > 0; }).sort(function (a, b) { return r.ulusal[b] - r.ulusal[a]; }).slice(0, 7) : Object.keys(r.iller).sort(function (a, b) { return r.iller[b] - r.iller[a]; }).slice(0, 6);
  function kapat() { clearTimeout(timer); el.classList.add('out'); setTimeout(function () { el.remove(); render(); queue(); }, 300); }
  function sayfa(html, btn, fn) { var b = $('.g-body', el); b.innerHTML = html; b.classList.remove('in'); void b.offsetWidth; b.classList.add('in'); var f = $('.g-foot', el); f.innerHTML = '<button class="btn pri" id="gn">' + btn + '</button>'; $('#gn').onclick = fn; }
  /* 1. sayım */
  el.innerHTML = '<div class="g-top"><div><div class="lab">SEÇİM GECESİ · ' + tar + '</div><b>' + (gen ? 'Genel seçim sayımı' : 'Yerel seçim sayımı') + '</b></div><div class="g-pc"><b id="gp">0</b>%<span>sandık açıldı</span></div></div>' +
    '<div class="g-body in"><div class="g-map">' + geoSvg(function () { return '#232632'; }) + '</div><div class="g-ic" id="gic"><span class="muted small">Sandıklar açılıyor…</span></div><div class="g-bd" id="gb">' + ids.map(function (id) { return '<div class="gr" data-id="' + id + '"><span class="dot" style="background:' + partiRengi(S, id) + '"></span><span class="gn">' + esc(partiAdi(S, id)) + (id === S.pid ? ' ⭐' : '') + '</span><div class="gbar"><i style="background:' + partiRengi(S, id) + '"></i></div><b class="gv">' + (gen ? '%0,0' : '0') + '</b>' + (gen ? '<b class="gs">0</b>' : '') + '</div>'; }).join('') + (gen ? '<div class="tiny muted" style="text-align:right">Oy oranı · milletvekili</div>' : '<div class="tiny muted" style="text-align:right">Kazanılan il sayısı</div>') + '</div></div>' +
    '<div class="g-foot"><div style="display:flex;gap:8px"><button class="btn" id="gh">⏩ Hız ×1</button><button class="btn" id="gs2">Atla ›</button></div></div><div class="sp-t"><div class="sp-tk"><span>' + 'CJN · SEÇİM GECESİ · ' + tar + '  •  '.repeat(1) + 'CJN · SEÇİM GECESİ · ' + tar + '  •  </span><span>CJN · SEÇİM GECESİ · ' + tar + '  •  CJN · SEÇİM GECESİ · ' + tar + '  •  </span></div></div>';
  var paths = el.querySelectorAll('path[data-p]');
  function tabloyaz(son) {
    ids.forEach(function (id) {
      var row = $('.gr[data-id="' + id + '"]', el), gv = $('.gv', row), bi = $('i', row);
      if (gen) { var v = son ? r.ulusal[id] : (pop ? (vote[id] || 0) / pop : 0); tw(gv, v, function (x) { return '%' + f1(x); }); bi.style.width = Math.min(100, v * 2.3) + '%'; var s = son ? (r.koltuk[id] || 0) : (seat[id] || 0); tw($('.gs', row), s, function (x) { return Math.round(x); }); }
      else { var w = wins[id] || 0; tw(gv, w, function (x) { return Math.round(x); }); bi.style.width = Math.min(100, w / 81 * 220) + '%'; }
    });
  }
  var lead = null;
  function canli(m) { var b = $('.g-body', el), g = $('.g-live', el); if (!g) { g = document.createElement('div'); g.className = 'g-live'; b.insertBefore(g, b.firstChild); } g.textContent = m; g.classList.remove('flash'); void g.offsetWidth; g.classList.add('flash'); }
  function adim() {
    if (rev >= 81) return sonuc();
    ses('sandik'); muzikYogun(rev / order.length); var i = order[rev++], o = r.il[i], il = ILLER[i], w = gen ? liderRenk(o) : r.kazananlar[i];
    paths[i].style.fill = partiRengi(S, w); paths[i].classList.add('flash'); pop += il.nufus; wins[w] = (wins[w] || 0) + 1;
    Object.keys(o).forEach(function (id) { vote[id] = (vote[id] || 0) + il.nufus * o[id]; });
    if (gen) Object.keys(r.ilKoltuk[i]).forEach(function (id) { seat[id] = (seat[id] || 0) + r.ilKoltuk[i][id]; });
    if (gen && rev > 6) { var ld0 = Object.keys(vote).sort(function (a, b) { return vote[b] - vote[a]; })[0]; if (ld0 && ld0 !== lead) { if (lead) canli('📢 ' + partiAdi(S, ld0) + ' ülke genelinde öne geçti'); lead = ld0; } else if (w === S.pid && rev % 3 === 0) canli('✅ ' + il.ad + ' ' + S.parti.ad + '\'e geçti'); else if (rev === 27 || rev === 54) canli('📊 Sandıkların %' + Math.round(rev / 81 * 100) + '\'i açıldı'); }
    tabloyaz(false); tw($('#gp', el), Math.round(rev / 81 * 100), function (x) { return Math.round(x); });
    var top = siralama(o).slice(0, 3);
    $('#gic', el).innerHTML = '<div class="gc"><div class="gh"><span class="dot" style="background:' + partiRengi(S, w) + '"></span><b>' + il.ad + '</b><span class="muted small">' + il.mv + ' MV · açıldı</span></div><div class="gl">' + top.map(function (id) { return '<span><i style="background:' + partiRengi(S, id) + '"></i>' + esc(partiAdi(S, id)) + ' %' + f1(o[id]) + '</span>'; }).join('') + '</div></div>';
    timer = setTimeout(adim, (RM ? 20 : 240) / hiz);
  }
  function sonuc() {
    if (bitti) return; bitti = true; clearTimeout(timer);
    paths.forEach(function (p, i) { p.style.fill = partiRengi(S, gen ? liderRenk(r.il[i]) : r.kazananlar[i]); });
    tabloyaz(true); tw($('#gp', el), 100, function (x) { return Math.round(x); }); $('#gic', el).innerHTML = '<div class="gc"><b>Sayım tamamlandı</b></div>';
    var f = $('.g-foot', el); f.innerHTML = '<button class="btn pri" id="gn">' + (gen ? 'Meclis dağılımı ›' : 'Sonuç özeti ›') + '</button>'; $('#gn').onclick = gen ? meclis : ozet;
  }
  $('#gh').onclick = function () { hiz = hiz === 1 ? 3 : 1; this.textContent = '⏩ Hız ×' + hiz; };
  $('#gs2').onclick = function () { rev = 81; sonuc(); };
  /* 2. meclis */
  function meclis() {
    var ks = r.koltuk, ids2 = Object.keys(ks).filter(function (id) { return ks[id] > 0; }).sort(function (a, b) { return ks[b] - ks[a]; }), ok = r.oncekiKoltuk || {};
    var gov = 0; S.gov.forEach(function (id) { gov += ks[id] || 0; });
    sayfa('<div class="lab">TBMM</div><h2>Yeni Meclis</h2>' + yarimDaire(ks) + '<div class="g-bd">' + ids2.slice(0, 8).map(function (id) { var d = (ks[id] || 0) - (ok[id] || 0); return '<div class="gr"><span class="dot" style="background:' + partiRengi(S, id) + '"></span><span class="gn">' + esc(partiAdi(S, id)) + (id === S.pid ? ' ⭐' : '') + '</span><span></span><b class="gv">' + ks[id] + '</b><b class="gs ' + (d >= 0 ? 'good' : 'badc') + '">' + (d >= 0 ? '▲' : '▼') + Math.abs(d) + '</b></div>'; }).join('') + '</div><div class="small muted" style="margin-top:8px">Cumhur bloku yeni dönemde ' + gov + ' sandalyeyle Meclis\'te. Ok işareti önceki Meclis\'e göre değişimi gösterir.</div>', 'Liderler ›', liderler);
  }
  /* 3. cumhurbaşkanlığı */
  function cb() {
    var c = r.cb, kz = c.adaylar[c.kazanan], ad = c.adaylar.slice().sort(function (a, b) { return b.p1 - a.p1; });
    function bars(list, key) { return list.map(function (a) { var w = a[key]; return '<div class="gr"><span class="dot" style="background:' + partiRengi(S, a.uyeler[0]) + '"></span><span class="gn">' + esc(a.ad) + (a.oyuncu ? ' ⭐' : '') + '<small>' + esc(a.blok) + '</small></span><div class="gbar"><i data-w="' + w + '" style="background:' + partiRengi(S, a.uyeler[0]) + '"></i></div><b class="gv">%' + f1(w) + '</b></div>'; }).join(''); }
    var srt = c.adaylar.slice().sort(function (a, b) { return c.tur === 2 ? (b.p2 || 0) - (a.p2 || 0) : b.p1 - a.p1; }), yakin = c.tur === 2 ? Math.abs((srt[0].p2 || 0) - (srt[1].p2 || 0)) < 4 : Math.abs(srt[0].p1 - srt[1].p1) < 4;
    var h = '<div class="lab">CUMHURBAŞKANLIĞI</div><h2>' + (c.tur === 1 ? 'İlk turda sonuçlandı' : 'İkinci tura kalındı') + '</h2><div class="g-bd">' + bars(ad, 'p1') + '</div>';
    if (c.tur === 2) h += '<div class="eyebrow">İkinci tur</div><div class="g-bd">' + bars(ad.filter(function (a) { return a.p2 !== null && a.p2 !== undefined; }).sort(function (a, b) { return b.p2 - a.p2; }), 'p2') + '</div>';
    h += '<div class="news" style="margin-top:12px"><b>Cumhurbaşkanı: ' + esc(kz.ad) + '</b><span style="font-size:13px">' + esc(kz.blok) + ' · ' + (c.tur === 2 ? 'ikinci turda seçildi' : 'ilk turda seçildi') + '</span></div>';
    sayfa(h, kz.oyuncu ? 'Zafer ›' : yakin ? 'Gecenin sonu ›' : 'Sonuç özeti ›', kz.oyuncu ? zafer : yakin ? bashaba : ozet);
    setTimeout(function () { el.querySelectorAll('.gbar i[data-w]').forEach(function (i) { i.style.width = Math.min(100, i.dataset.w * 1.8) + '%'; }); }, 80);
  }
  function zafer() {
    var c = document.createElement('canvas'); c.className = 'cf'; el.appendChild(c); if (!RM) konfeti(c);
    sayfa('<div class="zf"><div class="sp-i">👑</div><div class="sp-u">TARİHİ ZAFER</div><h1>' + esc(baskanAd(S)) + ' Cumhurbaşkanı seçildi</h1><div class="sp-a">' + esc(S.parti.ad) + ' iktidara geliyor</div></div>', 'Zafer konuşması ›', konusma);
  }
  /* 4. özet / geçmişle karşılaştırma */
  function ozet() {
    var pid = S.pid, h = '', ic = '', bas = '';
    if (!gen) {
      var n = r.iller[pid] || 0, s2 = Object.keys(r.iller).sort(function (a, b) { return r.iller[b] - r.iller[a]; });
      bas = n >= 20 ? ['🏙️', 'Yerel yönetimlerde güç kazandın', n + ' ilde belediyeyi aldın. Sahada karşılığını buldun.'] : n > 0 ? ['📊', 'Yerelde sınırlı başarı', n + ' ilde birinci oldun. Teşkilat gücünü artırmak sonraki seçimi belirler.'] : ['📉', 'Yerelde elin boş', 'Hiçbir ilde belediyeyi alamadın. Teşkilatın ve sahadaki varlığın yetersiz kaldı.'];
      ic = '<div class="g-bd">' + s2.map(function (id) { return '<div class="gr"><span class="dot" style="background:' + partiRengi(S, id) + '"></span><span class="gn">' + esc(partiAdi(S, id)) + '</span><span></span><b class="gv">' + r.iller[id] + ' il</b></div>'; }).join('') + '</div>';
    } else {
      var pv = r.ulusal[pid] || 0, ms = r.koltuk[pid] || 0, kz = r.cb.adaylar[r.cb.kazanan], on = r.oncekiOy ? r.oncekiOy[pid] : null;
      if (!r.girer) bas = ['🚫', 'Sandığa giremedin', 'Teşkilatın en az 41 ilde örgütlü olmadığı için seçime katılamadın. Bir sonraki seçime hazırlanmak için teşkilat çalışmasına odaklan.'];
      else if (kz.oyuncu) bas = ['👑', 'Cumhurbaşkanı seçildin', 'Yeni dönem başlıyor. Hem Meclis\'te hem Çankaya\'da sorumluluk sende.'];
      else if (ms === 0) bas = ['📉', 'Baraj altında kaldın', '%' + f1(pv) + ' oy ile Meclis\'in dışında kaldın. İttifak ya da daha güçlü bir kampanya gerekebilirdi.'];
      else if (S.gov.indexOf(pid) >= 0) bas = ['🤝', 'İktidar bloğunun parçasısın', ms + ' milletvekiliyle hükümet ortağı oldun.'];
      else bas = [pv >= (on === null ? 7 : on) ? '📈' : '📊', ms + ' milletvekiliyle muhalefettesin', on === null ? '%' + f1(pv) + ' oyla Meclis\'e girdin. Bir sonraki hedef daha güçlü olmak.' : (pv >= on ? 'Oyunu geçen seçime göre artırdın.' : 'Oyun geçen seçime göre geriledi. Nedenini sahada ara.')];
      var ids3 = Object.keys(r.ulusal).sort(function (a, b) { return r.ulusal[b] - r.ulusal[a]; }).slice(0, 7), ok = r.oncekiKoltuk || {}, oo = r.oncekiOy;
      ic = '<div class="g-bd"><div class="gr tiny muted"><span></span><span class="gn">Parti</span><span></span><b class="gv">Oy</b><b class="gs">MV</b></div>' + ids3.map(function (id) { var d = (r.koltuk[id] || 0) - (ok[id] || 0), dv = oo && oo[id] !== undefined ? r.ulusal[id] - oo[id] : null; return '<div class="gr"><span class="dot" style="background:' + partiRengi(S, id) + '"></span><span class="gn">' + esc(partiAdi(S, id)) + (id === pid ? ' ⭐' : '') + '</span><span></span><b class="gv">%' + f1(r.ulusal[id]) + (dv !== null ? '<small class="' + (dv >= 0 ? 'good' : 'badc') + '"> ' + (dv >= 0 ? '▲' : '▼') + f1(Math.abs(dv)) + '</small>' : '') + '</b><b class="gs">' + (r.koltuk[id] || 0) + '<small class="' + (d >= 0 ? 'good' : 'badc') + '"> ' + (d >= 0 ? '▲' : '▼') + Math.abs(d) + '</small></b></div>'; }).join('') + '</div><div class="tiny muted" style="margin-top:6px">' + (oo ? 'Önceki genel seçime göre değişim.' : 'Değişim, seçim öncesi Meclis dağılımına göre.') + '</div>';
    }
    if (gen) { el.classList.toggle('kayip', bas[0] === '📉' || bas[0] === '🚫'); ses(bas[0] === '👑' ? 'zafer' : (bas[0] === '📉' || bas[0] === '🚫') ? 'kayip' : 'sahne'); if (bas[0] === '👑') muzikSahne('zafer'); else if (bas[0] === '📉' || bas[0] === '🚫') muzikSahne('yenilgi'); ic += '<div class="sp-q" style="animation:none;margin-top:10px"><b>Gece konuşması · ' + esc(baskanAd(S)) + '</b>' + (bas[0] === '👑' ? '“Sorumluluğun ağırlığının farkındayız.”' : bas[0] === '📉' || bas[0] === '🚫' ? '“Sonuçlara saygı duyuyoruz. Bu yenilgiden ders çıkaracağız.”' : bas[0] === '🤝' ? '“Hükümet ortağı olarak sorumluluk alacağız.”' : '“Yolumuza kararlılıkla devam edeceğiz.”') + '</div>'; }
    sayfa('<div class="sp-i" style="font-size:54px;text-align:center">' + bas[0] + '</div><h2 style="text-align:center">' + bas[1] + '</h2><p class="muted small" style="text-align:center">' + bas[2] + '</p>' + ic, 'Devam', kapat);
  }
  function giris() {
    var g = document.createElement('div'); g.className = 'g-intro'; g.innerHTML = '<div class="gi-i">🗳️</div><div class="gi-u">SANDIKLAR KAPANDI</div><div class="gi-n" id="gin">3</div><div class="small muted">' + tar + ' · Sayım başlıyor</div><div class="tiny muted" style="margin-top:14px">Dokunarak geç</div>';
    el.appendChild(g); var c = 3, go = false;
    function basla() { if (go) return; go = true; g.classList.add('out'); setTimeout(function () { g.remove(); }, 400); timer = setTimeout(adim, RM ? 20 : 300); }
    g.onclick = basla;
    (function tick() { if (go) return; var n = $('#gin', g); if (!n) return; if (c <= 0) { basla(); return; } n.textContent = c; n.classList.remove('pulse'); void n.offsetWidth; n.classList.add('pulse'); c--; setTimeout(tick, RM ? 120 : 850); })();
  }
  function liderler() {
    var ks = r.koltuk, ids2 = Object.keys(r.ulusal).sort(function (a, b) { return r.ulusal[b] - r.ulusal[a]; }).slice(0, 4);
    sayfa('<div class="lab">LİDERLER</div><h2>Gecenin liderleri</h2><div class="ld">' + ids2.map(function (id, i) { var nm = id === S.pid ? baskanAd(S) : liderAdi(id); return '<div class="lc" style="animation-delay:' + (RM ? 0 : i * 140) + 'ms;border-color:' + partiRengi(S, id) + '">' + portre(nm, partiRengi(S, id), 64) + '<b>' + esc(nm) + '</b><small>' + esc(partiAdi(S, id)) + '</small><div class="lv">%' + f1(r.ulusal[id]) + '</div><small>' + (ks[id] || 0) + ' milletvekili</small></div>'; }).join('') + '</div>', 'Cumhurbaşkanlığı ›', cb);
  }
  function bashaba() {
    var kz = r.cb.adaylar[r.cb.kazanan]; el.classList.add('bas');
    sayfa('<div class="sp-i" style="font-size:54px;text-align:center">📸</div><div class="lab" style="text-align:center">FOTOĞRAF FİNİŞİ</div><h2 style="text-align:center">Başa baş bir gece</h2><p class="muted small" style="text-align:center">Fark yüzde 4\'ün altında kaldı. Kazanan: ' + esc(kz.ad) + '. Sonuç uzun süre tartışılacak.</p>', 'Sonuç özeti ›', ozet);
  }
  function konusma() {
    var w = 0; for (var i = 0; i < 81; i++) if (liderRenk(r.il[i]) === S.pid) w++;
    var L = ['“Aziz milletim, bu zafer hepinizin.”', '“' + esc(S.parti.ad) + ', ' + w + ' ilde birinci oldu; Meclis\'te ' + (r.koltuk[S.pid] || 0) + ' sandalyeyle sözünü söyledi.”', '“Bu ülkeyi birlikte yöneteceğiz.”'];
    sayfa('<div class="lab">ZAFER KONUŞMASI</div><h2>' + esc(baskanAd(S)) + '</h2>' + L.map(function (l, i) { return '<p class="spch" style="animation-delay:' + (RM ? 0 : i * 1400) + 'ms">' + l + '</p>'; }).join(''), 'Gece özeti ›', ozet);
  }
  giris();
}
