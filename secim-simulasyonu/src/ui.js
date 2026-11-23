/* ===== ARAYÜZ ===== */
var S = null, TAB = 'genel', HF = 'birinci', KURULUM = {}, root = document.getElementById('app'), sheetEl = null;
var TABLAR = [['genel','Genel','🎯'],['merkez','Merkez','🏢'],['yonetim','Yönetim','👔'],['parti','Parti','🏳️'],['anket','Anket','📊'],['karargah','Karargâh','🎛️'],['belediye','Belediye','🏙️'],['harita','Harita','🗺️'],['iller','İller','📍'],['ittifak','İttifak','🤝'],['rakip','Rakipler','🥊'],['secim','Seçim','🗳️'],['meclis','Meclis','🏛️'],['ekonomi','Ekonomi','📉'],['medya','Medya','📺'],['lider','Lider','🧑‍💼'],['takvim','Takvim','📅'],['tarihce','Tarihçe','📜'],['kayit','Kayıt','💾'],['hakkinda','Hakkında','ℹ️']];
/* Sekmeler kademeli açılır: yeni oyuncu ilk dakikada 6 sekme görür, gerisi ay ilerledikçe belirir. */
var TAB_AC = {genel: 0, merkez: 0, parti: 0, anket: 0, kayit: 0, harita: 1, tarihce: 1, rakip: 2, iller: 2, takvim: 2, yonetim: 3, ekonomi: 3, lider: 3, medya: 4, ittifak: 4, secim: 5, meclis: 6, karargah: 6, belediye: 8};
var TAB_NOT = {harita: 'Harita: bölgelerdeki gücünü gör.', tarihce: 'Tarihçe: aldığın kararların kaydı.', rakip: 'Rakipler: diğer partilerin hamleleri.', iller: 'İller: il il anket ve teşkilat.', takvim: 'Takvim: seçimler ve önemli tarihler.', yonetim: 'Yönetim: kadro ve görev dağılımı.', ekonomi: 'Ekonomi: enflasyon ve makro tablo.', lider: 'Lider: kendi profilin ve itibarın.', medya: 'Medya: yayın organlarıyla ilişkiler.', ittifak: 'İttifak: seçim ittifakları.', secim: 'Seçim: yaklaşan seçimin hazırlığı.', meclis: 'Meclis: koltuk dağılımı ve yasalar.', karargah: 'Karargâh: gelişmiş kampanya kontrolleri.', belediye: 'Belediye: yerel yönetimler.'};
function tabAcik(id) { var ay = S && S.ay != null ? S.ay : 0; if (S && S.bitti) return true; var k = TAB_AC[id]; return k === undefined || ay >= k || (S && S.tabAcikHepsi); }
var YENI_TAB = [];
function acilanSekmeler() { if (!S) return; var ilk = !S.tabGor; S.tabGor = S.tabGor || {}; var yeni = []; TABLAR.forEach(function (t) { if (tabAcik(t[0])) { if (!S.tabGor[t[0]]) { S.tabGor[t[0]] = 1; if (!ilk && TAB_AC[t[0]] > 0 && S.ay > 0) yeni.push(t); } } }); YENI_TAB = yeni.map(function (t) { return t[0]; }); if (yeni.length) setTimeout(function () { toast('🔓 Yeni sekme: ' + yeni.map(function (t) { return t[1]; }).join(', ') + (yeni.length === 1 && TAB_NOT[yeni[0][0]] ? ' — ' + TAB_NOT[yeni[0][0]] : '')); }, 600); }
var PREV = {}, LASTTAB = null, SEEN = {}, BUSY = false;
var HINTS = {belediye:'Belediye: yönettiğin illeri izle, hizmet yatırımı yap, skandal riskini azalt.',merkez:'Merkez: genel merkezin, kariyer yolun ve rozetlerin burada.',takvim:'Takvim: seçimler ve kurultay tarihlerini buradan izle.',tarihce:'Tarihçe: siyasi kariyerin ve önemli dönüm noktaların burada.',genel:'Genel: aylık aksiyonların burada. Her ay 3 hakkın var.',anket:'Anket: oyunu ve rakiplerini izle. Baraj %7.',harita:'Harita: her kutu bir il. Dokun, ayrıntıyı gör.',iller:'İller: teşkilat kurmak için il il çalışma listesi burada.',ittifak:'İttifak: yakın partileri davet et, barajı birlikte aş.',secim:'Seçim: takvim, baraj ve sandalye tahmini burada.',meclis:'Meclis: sandalye dağılımı ve hükümet.',ekonomi:'Ekonomi: enflasyon seçmenin ruh halini belirler.',medya:'Medya: gündemi sen belirle, ama riske dikkat.',yonetim:'Yönetim: kadroyu memnun tut, parti dağılmasın.',parti:'Parti: seçmen gruplarının ruh hali burada.',lider:'Lider: stres ve sağlığına dikkat et.'};
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function f1(v) { return v.toFixed(1).replace('.', ','); }
function para(v) { var a = Math.abs(v), s = v < 0 ? '-' : ''; if (a >= 1e9) return s + (a / 1e9).toFixed(1).replace('.', ',') + ' Mr ₺'; if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace('.', ',') + ' M ₺'; return s + Math.round(a / 1e3) + ' B ₺'; }
function sayi(v) { return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function $(sel, el) { return (el || document).querySelector(sel); }
function toast(m) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); }
function kayit() { if (S) kaydet(S, 'auto'); }
function davetEt(o) { S = o; TAB = 'genel'; render(); queue(); if (KAYIT_NOT) toast(KAYIT_NOT); }
function slotAd(k) { return k.slot === 'auto' ? 'Otomatik kayıt' : 'Yuva ' + k.slot; }
function kayitlarSheet(kaydetModu) {
  var L = kayitlar().filter(function (k) { return kaydetModu ? k.slot !== 'auto' : true; });
  sheet('<h2>' + (kaydetModu ? 'Oyunu kaydet' : 'Kayıtlar') + '</h2>' + L.map(function (k) {
    return '<div class="card" style="margin-bottom:8px"><b>' + slotAd(k) + '</b><div class="small muted">' + (k.ok ? esc(k.ad) + ' · ' + tarihUzun(k.tarih) + (k.ts ? ' · ' + new Date(k.ts).toLocaleString('tr-TR') : '') : 'Boş') + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:8px">' + (kaydetModu ? '<button class="btn pri" data-sv="' + k.slot + '">' + (k.ok ? 'Üzerine yaz' : 'Buraya kaydet') + '</button>' : (k.ok ? '<button class="btn pri" data-ld="' + k.slot + '">Yükle</button>' : '')) +
      (k.ok ? '<button class="btn ghost" data-dl="' + k.slot + '">Sil</button>' : '') + '</div></div>';
  }).join('') + '<button class="btn ghost" id="k">Kapat</button>');
  $('#k').onclick = function () { closeSheet(true); };
  document.querySelectorAll('[data-sv]').forEach(function (b) { b.onclick = function () { var ok = kaydet(S, b.dataset.sv); closeSheet(true); toast(ok ? 'Kaydedildi' : 'Kaydedilemedi: depolama dolu veya kapalı'); }; });
  document.querySelectorAll('[data-ld]').forEach(function (b) { b.onclick = function () { var o = yukle(b.dataset.ld); closeSheet(true); if (o) davetEt(o); else toast('Kayıt okunamadı'); }; });
  document.querySelectorAll('[data-dl]').forEach(function (b) { b.onclick = function () { kayitSil(b.dataset.dl); closeSheet(true); kayitlarSheet(kaydetModu); }; });
}
window.addEventListener('pagehide', kayit);
document.addEventListener('visibilitychange', function () { if (document.hidden) kayit(); });
var EMO = {'Kasa':'💰','İtibar':'✨','Parti birliği':'🛡️','Stres':'😰','Sağlık':'❤️','Anket':'📊','Üye':'👥','Milletvekili':'🏛️','Teşkilat':'📍','İttifak yakınlığı':'🤝'};
function fxHtml(chips) { return '<div class="fxs">' + chips.map(function (c, i) { return '<span class="fx ' + (c.iyi ? 'iyi' : 'kotu') + '" style="animation-delay:' + (i * 80 + 120) + 'ms"><span class="e">' + (EMO[c.k] || '🎯') + '</span>' + (c.d > 0 ? '▲' : '▼') + ' ' + esc(c.k) + '</span>'; }).join('') + '</div>'; }
function bar(v, renk) { return '<div class="bar"><i style="width:' + Math.max(0, Math.min(100, v)) + '%;' + (renk ? 'background:' + renk : '') + '"></i></div>'; }

/* ---- sheet ---- */
function sheet(html, cls, kapat) {
  closeSheet(true);
  var ov = document.createElement('div'); ov.className = 'ov';
  ov.innerHTML = '<div class="sh ' + (cls || '') + '" role="dialog" aria-modal="true"><div class="hd"></div>' + html + '</div>';
  ov.addEventListener('click', function (e) { if (e.target === ov && kapat !== false) closeSheet(); });
  document.body.appendChild(ov); sheetEl = ov; if (typeof twBaslat === 'function') twBaslat(ov); return ov;
}
function closeSheet(sessiz) { if (sheetEl) { sheetEl.remove(); sheetEl = null; if (typeof mapVurgu === 'function') mapVurgu(null); if (!sessiz) { render(); queue(); } } }

/* ---- menü ---- */
function menu() {
  PREV = {}; LASTTAB = null; SEEN = {}; TSAY = null; PBAR = null; MAPPREV = null; muzikMood('menu'); rhKaldir();
  var kayitli = yukle();
  root.innerHTML = '<div class="menu"><div class="hero"><svg viewBox="0 0 100 100" aria-hidden="true"><rect x="36" y="10" width="28" height="38" rx="3" fill="#eceef4"/><path d="M42 22h16M42 29h16M42 36h10" stroke="#9a9fb2" stroke-width="2" stroke-linecap="round"/><rect x="14" y="48" width="72" height="44" rx="6" fill="#15171e" stroke="#dcab4a" stroke-width="2.5"/><rect x="30" y="48" width="40" height="5" rx="2.5" fill="#dcab4a"/><path d="M34 72l11 11 21-24" fill="none" stroke="#e63b5f" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg><h1>Seçim Simülasyonu</h1><p>Parti kur, teşkilatı büyüt, sandığı kazan.</p></div>' +
    (kayitli ? '<button class="btn pri" id="devam">Devam et<small>' + esc(kayitli.parti.ad) + ' · ' + tarihUzun(kayitli.tarih) + '</small></button>' : '') +
    '<button class="btn ' + (kayitli ? '' : 'pri') + '" id="yeni">Yeni oyun</button><button class="btn ghost" id="nasil">Nasıl oynanır?</button><p class="tiny muted" style="text-align:center;margin-top:auto">Kurgusal bir simülasyondur: gerçek olayları, kişileri ve seçim sonuçlarını yansıtmaz. Lider isimleri uydurmadır; parti adları yalnızca oyun bağlamında kullanılır ve gerçek kurumlarla bağlantı ya da onay anlamına gelmez.</p></div>';
  if (kayitli) $('#devam').onclick = function () { davetEt(kayitli); };
  var pb = document.createElement('button'); pb.className = 'btn ghost'; pb.textContent = 'Profil'; pb.onclick = function () { profilSheet(); }; $('#nasil').parentNode.insertBefore(pb, $('#nasil'));
  var hb = document.createElement('button'); hb.className = 'btn ghost'; hb.textContent = 'ℹ️ Hakkında ve geri bildirim'; hb.onclick = function () { hakkindaSheet(); }; $('#nasil').parentNode.insertBefore(hb, $('#nasil'));
  if (kayitlar().some(function (k) { return k.ok; })) { var kb = document.createElement('button'); kb.className = 'btn ghost'; kb.textContent = 'Kayıtlar'; kb.onclick = function () { kayitlarSheet(false); }; $('#nasil').parentNode.insertBefore(kb, $('#nasil')); }
  $('#yeni').onclick = modSec; $('#nasil').onclick = yardim;
}
function yardim() {
  sheet('<div class="lab">Rehber</div><h2>Nasıl oynanır?</h2><p>Her ay <b>3 aksiyon</b> hakkın var (stres çok yükselirse 2). Aksiyonlarını kullan, sonra <b>Ayı Bitir</b>\'e bas. Ay sonunda anketler, kasa ve haberler güncellenir; bazen bir karar kartı çıkar.</p><p><b>Amaç:</b> Teşkilatı en az 41 ile yay (yeni partide seçime girmek için gerekir), %7 barajını geç ya da bir ittifakla gir, Mayıs 2028 ve Mayıs 2033 genel seçimlerinde Meclis\'te ve Cumhurbaşkanlığı\'nda güçlen. Mart 2029\'da yerel seçim var.</p><p>Etkiler ok ile gösterilir: ▲ iyi, ▼ kötü yönde. Tam sayıları görmezsin; sezgine güven.</p><button class="btn pri" id="k">Anladım</button>');
  $('#k').onclick = function () { closeSheet(true); };
}
function modSec() {
  root.innerHTML = '<div class="menu"><h2>Mod seç</h2>' +
    '<button class="modc" id="m1"><h3>Yeni Parti Kur</h3><p class="muted small" style="margin:6px 0 0">Sıfırdan bir parti. Baraj, teşkilat ve ittifak mücadelesi.</p></button>' +
    '<button class="modc" id="m2"><h3>Mevcut Partiyi Yönet</h3><p class="muted small" style="margin:6px 0 0">Oyundaki mevcut partilerden birinin genel başkanı ol (kurgusal).</p></button>' +
    '<button class="modc" id="m3"><h3>Rastgele Hikâye</h3><p class="muted small" style="margin:6px 0 0">Rastgele parti, ekonomi ve siyasi denge. Her seferinde farklı bir kariyer.</p></button>' +
    '<button class="modc" id="m4"><h3>🏆 Siyasi Kariyer <span class="kst" style="float:right">' + karToplam() + '/' + karMax() + ' ★</span></h3><p class="muted small" style="margin:6px 0 0">8 bölümlük kampanya: parti kur, Meclis\'e gir, belediyeleri kazan, Cumhurbaşkanı ol.</p></button>' +
    '<button class="modc" id="m5"><h3>📅 Günün Senaryosu <span class="pill go" style="float:right">' + (gunMenuHtml().oynandi ? 'Puan ' + gunMenuHtml().puan : (gunMenuHtml().seri ? '🔥 ' + gunMenuHtml().seri + ' gün' : 'Yeni')) + '</span></h3><p class="muted small" style="margin:6px 0 0">Her gün herkes için aynı başlangıç. İlk genel seçimde en yüksek puanı topla.</p></button>' +
    '<button class="btn ghost" id="geri" style="margin-top:6px">Geri</button></div>';
  $('#m1').onclick = function () { kurulumYeni(); }; $('#m2').onclick = kurulumMevcut; $('#m3').onclick = rastgeleHikaye; $('#m4').onclick = kariyerMenu; $('#m5').onclick = gunBaslat; $('#geri').onclick = menu;
}
function kurulumYeni(ch) {
  KURULUM = {mod: 'yeni', logo: 0, renk: RENKLER[0], ideo: 'sd', zorluk: 'orta', stil: 'katilimci', senaryo: 'klasik'};
  if (ch) { KURULUM.zorluk = ch.setup.zorluk; KURULUM.stil = ch.setup.stil; KURULUM.senaryo = ch.setup.senaryo; }
  var chips = function (obj, key) { return '<div class="chiprow" data-k="' + key + '">' + Object.keys(obj).map(function (k) { return '<button class="cx" data-v="' + k + '">' + (obj[k].ad) + '</button>'; }).join('') + '</div>'; };
  root.innerHTML = '<div class="menu"><h2>Partini kur</h2>' +
    '<div class="fld"><label for="pa">Parti adı</label><input class="in" id="pa" maxlength="28" placeholder="Örn. Umut Hareketi"></div>' +
    '<div class="fld"><label>Renk</label><div class="sw" id="sw">' + RENKLER.map(function (c) { return '<button aria-label="renk" data-c="' + c + '" style="background:' + c + '"></button>'; }).join('') + '</div></div>' +
    '<div class="fld"><label>Logo</label><div class="sw lg" id="lg"></div></div>' +
    '<div class="fld"><label>İdeoloji</label><div class="chiprow" data-k="ideo">' + IDEOLOJILER.map(function (i) { return '<button class="cx" data-v="' + i.id + '">' + i.ad + '</button>'; }).join('') + '</div></div>' +
    '<div class="fld"><label for="la">Lider adı</label><input class="in" id="la" maxlength="28" placeholder="Adın Soyadın"></div>' +
    '<div class="fld"><label for="dg">Doğum yılı</label><input class="in" id="dg" type="number" value="1978" min="1940" max="2000" inputmode="numeric"></div>' +
    (ch ? '' : '<div class="fld"><label>Zorluk</label>' + chips(ZORLUKLAR, 'zorluk') + '<span class="small muted" id="zn"></span></div>') +
    (ch ? '' : '<div class="fld"><label>Liderlik tarzı</label>' + chips(STILLER, 'stil') + '<span class="small muted" id="sn"></span></div>') +
    (ch ? '' : '<div class="fld"><label>Senaryo</label>' + chips(SENARYOLAR, 'senaryo') + '<span class="small muted" id="ssn"></span></div>') +
    '<button class="btn pri" id="basla" style="margin-top:16px">Başla</button><button class="btn ghost" id="geri">Geri</button></div>';
  function sync() {
    $('#lg').innerHTML = logoSecici(KURULUM); document.querySelectorAll('#lg button').forEach(function (b) { b.onclick = function () { KURULUM.logo = +b.dataset.lg; sync(); }; });
    document.querySelectorAll('.chiprow[data-k] .cx').forEach(function (b) { b.classList.toggle('on', KURULUM[b.parentNode.dataset.k] === b.dataset.v); });
    document.querySelectorAll('#sw button').forEach(function (b) { b.classList.toggle('on', b.dataset.c === KURULUM.renk); });
    if (!ch) { $('#zn').textContent = ZORLUKLAR[KURULUM.zorluk].not; $('#sn').textContent = STILLER[KURULUM.stil].not; $('#ssn').textContent = SENARYOLAR[KURULUM.senaryo].not; }
  }
  document.querySelectorAll('.chiprow[data-k] .cx').forEach(function (b) { b.onclick = function () { KURULUM[b.parentNode.dataset.k] = b.dataset.v; sync(); }; });
  document.querySelectorAll('#sw button').forEach(function (b) { b.onclick = function () { KURULUM.renk = b.dataset.c; sync(); }; });
  sync();
  $('#geri').onclick = ch ? function () { kariyerDetay(ch.id); } : modSec;
  $('#basla').onclick = function () {
    KURULUM.partiAd = $('#pa').value.trim() || 'Yeni Parti'; KURULUM.liderAd = $('#la').value.trim() || 'Genel Başkan'; KURULUM.dogum = +$('#dg').value || 1978; KURULUM.seed = Date.now() % 100000;
    S = newGame(KURULUM); if (ch) S.kariyer = {id: ch.id}; TAB = 'genel'; kayit(); render(); queue();
  };
}
function kurulumMevcut() {
  var secili = 'CHP', sen = 'klasik';
  var liste = PARTILER.filter(function (p) { return p.baz >= 1.5; });
  root.innerHTML = '<div class="menu"><h2>Hangi parti?</h2><div id="pl"></div><div class="fld"><label for="la">Lider adı</label><input class="in" id="la" maxlength="28" placeholder="Adın Soyadın"></div><div class="fld"><label>Senaryo</label><div class="chiprow" id="sncr">' + Object.keys(SENARYOLAR).map(function (k) { return '<button class="cx' + (k === 'klasik' ? ' on' : '') + '" data-v="' + k + '">' + SENARYOLAR[k].ad + '</button>'; }).join('') + '</div><span class="small muted" id="ssn">' + SENARYOLAR.klasik.not + '</span></div><button class="btn pri" id="basla" style="margin-top:14px">Başla</button><button class="btn ghost" id="geri">Geri</button></div>';
  function ciz() {
    $('#pl').innerHTML = liste.map(function (p) { return '<button class="modc" data-id="' + p.id + '" style="border-left-color:' + p.renk + ';margin-bottom:8px;' + (p.id === secili ? 'background:var(--p2)' : '') + '"><h3>' + esc(p.ad) + (p.id === secili ? ' <span class="pill go">Seçili</span>' : '') + '</h3><span class="small muted">Zorluk: ' + ZORLUKLAR[p.zor].ad + ' · Tahmini oy %' + f1(p.baz) + '</span></button>'; }).join('');
    document.querySelectorAll('#pl .modc').forEach(function (b) { b.onclick = function () { secili = b.dataset.id; ciz(); }; });
  }
  ciz(); $('#geri').onclick = modSec;
  document.querySelectorAll('#sncr .cx').forEach(function (b) { b.onclick = function () { sen = b.dataset.v; document.querySelectorAll('#sncr .cx').forEach(function (x) { x.classList.toggle('on', x === b); }); $('#ssn').textContent = SENARYOLAR[sen].not; }; });
  $('#basla').onclick = function () { S = newGame({mod: 'mevcut', partiId: secili, liderAd: $('#la').value.trim() || 'Genel Başkan', seed: Date.now() % 100000, zorluk: 'orta', senaryo: sen}); TAB = 'genel'; kayit(); render(); queue(); };
}

/* ---- oyun iskeleti ---- */
function render() {
  if (!S) return menu();
  muzikBelirle();
  if (!tabAcik(TAB)) TAB = 'genel'; acilanSekmeler();
  var st = S.stat, sira = oyuncuSira(S), enter = false; if (LASTTAB !== TAB) { enter = true; LASTTAB = TAB; }
  var top = '<div class="top"><div class="ttl"><span class="dot" style="background:' + S.parti.renk + '"></span><b>' + esc(S.parti.ad) + '</b><span class="date num">' + tarihYaz(S.tarih) + '</span><div class="ib"><button id="ayar" aria-label="Menü">⋯</button></div></div>' +
    '<div class="stats"><div class="st"><span>Anket</span><b><span data-n="anket">%' + f1(S.anketOyuncu) + '</span> · ' + sira + '.</b></div><div class="st"><span>Kasa</span><b data-n="kasa" class="' + (st.kasa < 0 ? 'badc' : '') + '">' + para(st.kasa) + '</b></div><div class="st"><span>Üye</span><b data-n="uye">' + sayi(st.uye) + '</b></div><div class="st"><span>Teşkilat</span><b>' + teskilatSayisi(S) + '/81</b></div><div class="st"><span>Birlik</span><b>' + Math.round(st.birlik) + '</b></div><div class="st"><span>Stres</span><b class="' + (st.stres > 70 ? 'badc' : '') + '">' + Math.round(st.stres) + '</b></div></div></div>';
  var tick = S.haberler.length ? '<div class="tick"><span class="tb">CJN</span><div class="tw"><div class="tk"><span>' + S.haberler.map(esc).join('  •  ') + '  •  </span><span>' + S.haberler.map(esc).join('  •  ') + '  •  </span></div></div></div>' : '';
  var body = tick + '<div class="scroll' + (enter ? ' anim' : '') + '" id="sc">' + (S.bitti ? bitisKart() : tabHtml()) + '</div>';
  var tabs = '<nav class="tabs" aria-label="Bölümler">' + TABLAR.filter(function (t) { return tabAcik(t[0]); }).map(function (t) { return '<button class="tab' + (YENI_TAB.indexOf(t[0]) >= 0 ? ' yeni' : '') + '" data-t="' + t[0] + '" aria-current="' + (TAB === t[0]) + '"><span class="ti">' + t[2] + '</span>' + t[1] + '</button>'; }).join('') + '</nav>';
  var fab = S.bitti ? '' : '<button class="fab" id="ay">Ayı Bitir ▸ <i>' + S.aksiyon.kalan + '</i></button>';
  var sc = $('#sc'), y = sc ? sc.scrollTop : 0;
  root.innerHTML = top + body + tabs + fab;
  document.querySelectorAll('.tab').forEach(function (b) { b.onclick = function () { TAB = b.dataset.t; if (TAB === 'anket') S.ogrAnket = 1; var oh = $('.hint'); if (oh) oh.remove(); render(); $('#sc').scrollTop = 0; }; });
  var ct = $('.tab[aria-current=true]'); if (ct) ct.scrollIntoView({inline: 'center', block: 'nearest'});
  if (sc && $('#sc') && !enter) $('#sc').scrollTop = y;
  var a = $('#ay'); if (a) a.onclick = ayBitirTikla;
  $('#ayar').onclick = ayarlar; bagla(); if (TAB === 'hakkinda') hakkindaBagla(); if (YENI_TAB.length) setTimeout(function () { YENI_TAB = []; }, 1300);
  if (S.sd && S.sd.length) sdGoster(S.sd.splice(0, 3));
  rozetKontrol(); kariyerBagla(); rehberGuncelle();
  var bars = [].slice.call(document.querySelectorAll('#sc .bar i,#sc .pbar i'));
  if (!enter && !RM && PBAR && PBAR.tab === TAB && PBAR.w.length === bars.length) {
    var yeniW = bars.map(function (b) { return b.style.width; }), ch = false;
    bars.forEach(function (b, i) { if (PBAR.w[i] !== yeniW[i]) { b.style.transition = 'none'; b.style.width = PBAR.w[i]; ch = true; } });
    if (ch) { void document.body.offsetWidth; bars.forEach(function (b, i) { if (PBAR.w[i] !== yeniW[i]) { b.style.transition = ''; b.style.width = yeniW[i]; } }); }
  }
  PBAR = {tab: TAB, w: bars.map(function (b) { return b.style.width; })};
  var tsNow = teskilatSayisi(S);
  if (TSAY !== null && tsNow > TSAY && !sheetEl && !document.querySelector('.gece,.splash,.intro')) { ses('onay'); toast('🏢 +' + (tsNow - TSAY) + ' il teşkilatı · toplam ' + tsNow + '/81'); var ch = document.querySelector('[data-n="uye"]'); if (ch && ch.parentNode) { ch.parentNode.classList.remove('tsp'); void ch.parentNode.offsetWidth; ch.parentNode.classList.add('tsp'); } }
  TSAY = tsNow;
  var vals = {anket: S.anketOyuncu, kasa: st.kasa, uye: st.uye};
  document.querySelectorAll('[data-n]').forEach(function (el) { var k = el.dataset.n; if (PREV[k] !== undefined && Math.abs(PREV[k] - vals[k]) > 1e-6) sayAnim(el, k, PREV[k], vals[k]); });
  PREV = vals;
  if (!SEEN[TAB] && !sheetEl && !S.kuyruk.length && !S.bitti && HINTS[TAB] && !document.querySelector('.mt,.splash,.gece')) { SEEN[TAB] = 1; var hn = document.createElement('div'); hn.className = 'hint'; hn.textContent = '💡 ' + HINTS[TAB]; $('#app').appendChild(hn); setTimeout(function () { hn.remove(); }, 4500); }
}
function bitisKart() {
  if (S.kariyer && S.kariyerSonuc) return kariyerBitisKart();
  var sb = sonBilgi(S), p = portre(S.lider.ad, 64, {renk: S.parti.renk, mood: sb.key.indexOf('cb') === 0 || sb.key === 'ortak' ? 'iyi' : sb.key === 'baraj' ? 'kotu' : 'normal'});
  return '<div class="card son son-' + sb.key + '"><div class="sonik">' + sb.ikon + '</div><div class="eyebrow">Oyun bitti</div><h3>' + esc(sb.baslik) + '</h3><div class="sonp">' + p + '</div><p>' + esc(sb.metin) + '</p>' +
    '<div class="sonst"><div><b>' + (sb.girer ? '%' + sb.oy.toFixed(1).replace('.', ',') : '—') + '</b><span>Son oy</span></div><div><b>' + sb.koltuk + '</b><span>Sandalye</span></div><div><b>' + sb.belediye + '</b><span>Belediye</span></div></div>' +
    (sb.cb ? '<p class="mut">Cumhurbaşkanı: <b>' + esc(sb.cb) + '</b></p>' : '') +
    (sb.ozellik.length ? '<div class="sonoz">' + sb.ozellik.map(function (o) { return '<span class="chip">' + esc(o) + '</span>'; }).join('') + '</div>' : '') +
    '<button class="btn pri" id="yenioyun">Yeni oyun</button></div>';
}
var ANIM = (function () { try { return localStorage.getItem('ss_anim') || 'tam'; } catch (e) { return 'tam'; } })();
var PBAR = null, TSAY = null;
/* ---- ses: Web Audio ile üretilen kısa, yumuşak efektler (dosya yok) ---- */
var SESON = (function () { try { return localStorage.getItem('ss_ses') !== '0'; } catch (e) { return true; } })(), AC = null, MG = null, SESSON = -1;
function sesAc() {
  if (!AC) { try { var C = window.AudioContext || window.webkitAudioContext; if (C) { AC = new C(); sesKur(); } } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
  return AC;
}
function sesN(f, t, d, tip, v, f2) {
  var o = AC.createOscillator(), g = AC.createGain(); o.type = tip; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(MG); o.start(t); o.stop(t + d + 0.03);
}
function ses(ad) {
  if (!SESON) return; var a = sesAc(); if (!a || a.state !== 'running') return; var t = a.currentTime + 0.005;
  if (ad === 'sandik') { if (t - SESSON < 0.07) return; SESSON = t; }
  switch (ad) {
    case 'tik': sesN(1300, t, 0.035, 'triangle', 0.035, 850); break;
    case 'sandik': sesN(700 + Math.random() * 250, t, 0.05, 'square', 0.014); break;
    case 'onay': sesN(660, t, 0.12, 'sine', 0.08); sesN(990, t + 0.09, 0.22, 'sine', 0.08); break;
    case 'kart': sesN(330, t, 0.2, 'triangle', 0.06, 440); break;
    case 'kriz': sesN(110, t, 0.38, 'sawtooth', 0.045, 70); sesN(165, t, 0.3, 'triangle', 0.05); break;
    case 'sahne': sesN(262, t, 0.45, 'sine', 0.07); sesN(392, t + 0.12, 0.5, 'sine', 0.06); break;
    case 'hukumet': sesN(392, t, 0.4, 'triangle', 0.06); sesN(494, t + 0.1, 0.4, 'triangle', 0.06); sesN(587, t + 0.2, 0.55, 'triangle', 0.06); break;
    case 'istifa': sesN(196, t, 0.42, 'triangle', 0.07); sesN(147, t + 0.25, 0.55, 'triangle', 0.07); break;
    case 'zafer': [523, 659, 784, 1047].forEach(function (f, i) { sesN(f, t + i * 0.13, 0.4, 'triangle', 0.07); }); break;
    case 'kayip': [392, 330, 262].forEach(function (f, i) { sesN(f, t + i * 0.2, 0.45, 'sine', 0.06); }); break;
    case 'pusula': sesN(900, t, 0.35, 'sine', 0.035, 300); break;
    case 'muhur': sesN(120, t, 0.2, 'sine', 0.1, 60); break;
    case 'ay': sesN(440, t, 0.12, 'sine', 0.05, 330); break;
  }
}

/* ---- müzik v2: tema tabanlı, tamamen özgün, prosedürel ve duruma göre değişen müzik (dosya yok) ---- */
function lsSay(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : +v; } catch (e) { return d; } }
var MZON = (function () { try { return localStorage.getItem('ss_muzik') !== '0'; } catch (e) { return true; } })();
var MVOL = lsSay('ss_mvol', 60), SVOL = lsSay('ss_svol', 80), TITRON = (function () { try { return localStorage.getItem('ss_titresim') !== '0'; } catch (e) { return true; } })();
var MB = null, REV = null, NOISE = null;
var MZ = {on: false, istenen: 'menu', cur: null, aktif: [], tema: {}, timer: null, sahne: null, sahneT: null};
var MTUR = {m: [0, 3, 7], M: [0, 4, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], dim: [0, 3, 6], sus: [0, 5, 7], b2: [0, 1, 7]};
var MT = {
  menu: {bpm: 62, olcu: 2, key: 50, olcek: [0, 3, 5, 7, 10], prog: [[50, 'm'], [46, 'M'], [53, 'M'], [48, 'M']], rev: 0.38,
    pad: {tip: 'sawtooth', vol: 0.035, cut: 520, at: 2.6}, ayr: {tip: 'sawtooth', vol: 0.03, cut: 900, at: 3.2}, bas: {vol: 0.085, pat: 'x...............', tip: 'sine'},
    tom: {vol: 0.1, pat: 'x...............', bar: 2}, mel: {vol: 0.05, pat: 'x.....x.....x...', tip: 'triangle', cut: 1800, dec: 1.8, oct: 12, p: 0.85}},
  oyun: {bpm: 82, olcu: 2, key: 55, olcek: [0, 2, 4, 7, 9], prog: [[55, 'M7'], [52, 'm7'], [48, 'M7'], [50, 'sus']], rev: 0.3,
    pad: {tip: 'triangle', vol: 0.04, cut: 1400, at: 1.2}, bas: {vol: 0.06, pat: 'x.......x.......', tip: 'sine'},
    arp: {vol: 0.032, pat: 'x.x.x.x.x.x.x.x.', tip: 'triangle', cut: 2600, dec: 0.5, oct: 12},
    mel: {vol: 0.04, pat: '..x.....x.......', tip: 'triangle', cut: 2200, dec: 1.4, oct: 24, p: 0.7}},
  gerilim: {bpm: 100, olcu: 1, key: 57, olcek: [0, 3, 5, 7, 10], prog: [[57, 'm'], [57, 'm'], [53, 'M'], [55, 'M']], rev: 0.22, yog: 0.3,
    pad: {tip: 'sawtooth', vol: 0.04, cut: 700, at: 0.8}, ayr: {tip: 'sawtooth', vol: 0.035, cut: 1000, at: 4},
    bas: {vol: 0.08, pat: 'x.x.x.x.x.x.x.x.', tip: 'sawtooth', cut: 420}, arp: {vol: 0.03, pat: 'x.xx.xx.x.xx.xx.', tip: 'square', cut: 1800, dec: 0.18, oct: 12, min: 0.2},
    kick: {vol: 0.11, pat: 'x...x...x...x...', min: 0.45}, hat: {vol: 0.03, pat: '..x...x...x...x.', min: 0.3}},
  gece: {bpm: 112, olcu: 1, key: 54, olcek: [0, 3, 5, 7, 10], prog: [[54, 'm'], [50, 'M'], [57, 'M'], [52, 'M']], rev: 0.25, yog: 0.2,
    pad: {tip: 'sawtooth', vol: 0.038, cut: 900, at: 0.6}, ayr: {tip: 'sawtooth', vol: 0.03, cut: 1100, at: 2}, bas: {vol: 0.075, pat: '..x...x...x...x.', tip: 'triangle'},
    arp: {vol: 0.026, pat: 'xxxxxxxxxxxxxxxx', tip: 'triangle', cut: 2400, dec: 0.12, oct: 12, min: 0.35},
    kick: {vol: 0.1, pat: 'x...x...x...x...'}, hat: {vol: 0.025, pat: 'x.x.x.x.x.x.x.x.', min: 0.5},
    tom: {vol: 0.09, pat: 'x...............', bar: 4}, mel: {vol: 0.04, pat: 'x...x.x...x.....', tip: 'square', cut: 1600, dec: 0.5, oct: 24, p: 0.9, min: 0.4}},
  koalisyon: {bpm: 72, olcu: 2, key: 48, olcek: [0, 2, 4, 5, 7, 9, 11], prog: [[48, 'M'], [45, 'm7'], [53, 'M7'], [43, 'sus']], rev: 0.22,
    pad: {tip: 'triangle', vol: 0.035, cut: 1100, at: 1.6}, bas: {vol: 0.06, pat: 'x.......x.......', tip: 'triangle'},
    arp: {vol: 0.03, pat: 'x..x..x.x..x..x.', tip: 'square', cut: 2200, dec: 0.35, oct: 12},
    mel: {vol: 0.032, pat: 'x.....x.....x...', tip: 'square', cut: 1500, dec: 0.9, oct: 24, p: 0.8, terz: 1}},
  kriz: {bpm: 76, olcu: 2, key: 49, olcek: [0, 1, 3, 5, 7, 8, 10], prog: [[49, 'm'], [50, 'b2'], [49, 'dim'], [47, 'm']], rev: 0.45,
    pad: {tip: 'sawtooth', vol: 0.045, cut: 380, at: 2}, ayr: {tip: 'sawtooth', vol: 0.03, cut: 650, at: 3, kume: 1}, bas: {vol: 0.09, pat: 'x...............', tip: 'sine'},
    kick: {vol: 0.12, pat: 'x..x............'}, tom: {vol: 0.1, pat: 'x...............', bar: 4},
    mel: {vol: 0.025, pat: 'x.......x.......', tip: 'square', cut: 3000, dec: 2.2, oct: 24, p: 0.55}},
  zafer: {bpm: 96, olcu: 1, key: 50, olcek: [0, 2, 4, 7, 9], prog: [[50, 'M'], [57, 'M'], [59, 'm'], [55, 'M']], rev: 0.4,
    pad: {tip: 'triangle', vol: 0.045, cut: 1800, at: 0.4}, ayr: {tip: 'sawtooth', vol: 0.045, cut: 1800, at: 0.2}, bas: {vol: 0.08, pat: 'x...x...x...x...', tip: 'triangle'},
    arp: {vol: 0.035, pat: 'xx.xx.x.xx.xx.x.', tip: 'sawtooth', cut: 3200, dec: 0.28, oct: 12},
    kick: {vol: 0.09, pat: 'x...x...x...x...'}, tom: {vol: 0.1, pat: 'x...............', bar: 1}, mel: {vol: 0.045, pat: 'x.......x...x...', tip: 'triangle', cut: 3000, dec: 0.9, oct: 24, p: 1}},
  yenilgi: {bpm: 54, olcu: 2, key: 47, olcek: [0, 2, 3, 5, 7, 8, 10], prog: [[47, 'm'], [43, 'M'], [40, 'm'], [42, 'M']], rev: 0.5, desc: 1,
    pad: {tip: 'triangle', vol: 0.04, cut: 600, at: 2.8}, ayr: {tip: 'sawtooth', vol: 0.045, cut: 700, at: 2.5}, bas: {vol: 0.06, pat: 'x...............', tip: 'sine'},
    tom: {vol: 0.07, pat: 'x...............', bar: 4}, mel: {vol: 0.05, pat: 'x.......x.......', tip: 'sine', cut: 1600, dec: 3, oct: 12, p: 1}}
};
var MSAHNE = {zafer: 30, yenilgi: 34};
function mf(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function sesKur() {
  MG = AC.createGain(); MG.gain.value = SVOL / 100 * 0.9; MG.connect(AC.destination);
  MB = AC.createGain(); MB.gain.value = MVOL / 100 * 0.9; MB.connect(AC.destination);
  var n = Math.floor(AC.sampleRate * 1.7), im = AC.createBuffer(2, n, AC.sampleRate), c, i;
  for (c = 0; c < 2; c++) { var d = im.getChannelData(c); for (i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
  REV = AC.createConvolver(); REV.buffer = im; REV.connect(MB);
  var nb = AC.createBuffer(1, AC.sampleRate, AC.sampleRate), nd = nb.getChannelData(0); for (i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; NOISE = nb;
}
function mzTema(ad) {
  var T = MZ.tema[ad]; if (!T) { var D = MT[ad]; T = MZ.tema[ad] = {ad: ad, D: D, adim: 0, next: 0, yog: D.yog || 0.5, motif: null, son: 0, bus: null, send: null, aktif: false}; }
  return T;
}
function mzBus(T) {
  T.bus = AC.createGain(); T.bus.gain.value = 0.0001; T.bus.connect(MB);
  T.send = AC.createGain(); T.send.gain.value = T.D.rev; T.bus.connect(T.send); T.send.connect(REV);
}
function mzNota(T, f, t, d, tip, v, cut, hiz) {
  var o = AC.createOscillator(), g = AC.createGain(), x = o; o.type = tip; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (hiz || 0.015)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  if (cut) { var fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(cut, t); fl.frequency.exponentialRampToValueAtTime(Math.max(150, cut * 0.4), t + d); o.connect(fl); fl.connect(g); } else o.connect(g);
  g.connect(T.bus); o.start(t); o.stop(t + d + 0.05);
}
function mzSes(T, t, d, v, tip, cut, at, f) {
  [-7, 7].forEach(function (de) {
    var o = AC.createOscillator(), g = AC.createGain(), fl = AC.createBiquadFilter(); o.type = tip; o.frequency.value = f; o.detune.value = de;
    fl.type = 'lowpass'; fl.frequency.value = cut; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(at, d * 0.6)); g.gain.setValueAtTime(v, t + d * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + d);
    o.connect(fl); fl.connect(g); g.connect(T.bus); o.start(t); o.stop(t + d + 0.05);
  });
}
function mzVurus(T, t, tur, v) {
  if (tur === 'kick') { var o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(135, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24); o.connect(g); g.connect(T.bus); o.start(t); o.stop(t + 0.3); }
  else if (tur === 'tom') { var o2 = AC.createOscillator(), g2 = AC.createGain(); o2.type = 'sine'; o2.frequency.setValueAtTime(170, t); o2.frequency.exponentialRampToValueAtTime(68, t + 0.45); g2.gain.setValueAtTime(v, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); o2.connect(g2); g2.connect(T.bus); o2.start(t); o2.stop(t + 1); }
  else { var s = AC.createBufferSource(), g3 = AC.createGain(), fl = AC.createBiquadFilter(); s.buffer = NOISE; fl.type = 'highpass'; fl.frequency.value = 7000; g3.gain.setValueAtTime(v, t); g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(fl); fl.connect(g3); g3.connect(T.bus); s.start(t); s.stop(t + 0.08); }
}
function mzYeniMotif(T) {
  var n = T.D.olcek.length, p = T.motif ? T.motif[3] : 2, m = [], i;
  if (T.D.desc) { var b = 4 + Math.floor(Math.random() * 2); return [b, b - 1, b - 2, 0]; }
  for (i = 0; i < 4; i++) { p = Math.max(0, Math.min(n * 2 - 1, p + Math.round((Math.random() - 0.5) * 4))); m.push(p); }
  if (Math.random() < 0.6) m[3] = Math.random() < 0.5 ? 0 : 2; return m;
}
function mzAdim(T, t) {
  var D = T.D, y = T.yog, s = T.adim % 16, bar = Math.floor(T.adim / 16), ch = Math.floor(bar / D.olcu) % D.prog.length, C = D.prog[ch], iv = MTUR[C[1]], sd = 60 / (D.bpm * (1 + 0.1 * y)) / 4, i, pat;
  function ac(p, min) { return p && p.charAt(s) === 'x' && (min === undefined || y >= min); }
  if (s === 0 && bar % D.olcu === 0) {
    var len = sd * 16 * D.olcu;
    if (D.pad) iv.forEach(function (k, j) { if (j < 4) mzSes(T, t, len, D.pad.vol, D.pad.tip, D.pad.cut * (0.8 + 0.5 * y), D.pad.at, mf(C[0] + 12 + k)); });
    if (D.ayr) { var f0 = mf(C[0] + 24); mzSes(T, t, len, D.ayr.vol, D.ayr.tip, D.ayr.cut * (0.7 + 0.7 * y), D.ayr.at, f0); mzSes(T, t, len, D.ayr.vol * 0.8, D.ayr.tip, D.ayr.cut * (0.7 + 0.7 * y), D.ayr.at, mf(C[0] + 24 + iv[2])); if (D.ayr.kume) mzSes(T, t, len, D.ayr.vol * 0.7, D.ayr.tip, D.ayr.cut, D.ayr.at, mf(C[0] + 25)); }
    if (ch === 0 && (!T.motif || Math.floor(bar / (D.olcu * D.prog.length)) !== T.son)) { T.motif = mzYeniMotif(T); T.son = Math.floor(bar / (D.olcu * D.prog.length)); }
  }
  if (D.bas && ac(D.bas.pat, D.bas.min)) mzNota(T, mf(C[0] - 12), t, sd * 3.5, D.bas.tip, D.bas.vol, D.bas.cut);
  if (D.kick && ac(D.kick.pat, D.kick.min)) mzVurus(T, t, 'kick', D.kick.vol);
  if (D.hat && ac(D.hat.pat, D.hat.min)) mzVurus(T, t, 'hat', D.hat.vol);
  if (D.tom && bar % (D.tom.bar || 1) === 0 && ac(D.tom.pat, D.tom.min)) mzVurus(T, t, 'tom', D.tom.vol);
  if (D.arp && ac(D.arp.pat, D.arp.min)) { var k = Math.floor(T.adim / 2) % iv.length, ok = (Math.floor(T.adim / 2) % 4 > 1) ? 12 : 0; mzNota(T, mf(C[0] + D.arp.oct + iv[k] + ok), t, D.arp.dec, D.arp.tip, D.arp.vol * (0.7 + 0.5 * y), D.arp.cut);}
  if (D.mel && T.motif && ac(D.mel.pat, D.mel.min) && Math.random() < D.mel.p) {
    var idx = 0; for (i = 0; i < s; i++) if (D.mel.pat.charAt(i) === 'x') idx++;
    var dg = T.motif[idx % 4], n = D.olcek.length, nt = D.key + D.olcek[dg % n] + 12 * Math.floor(dg / n) + D.mel.oct - 12;
    mzNota(T, mf(nt), t, D.mel.dec, D.mel.tip, D.mel.vol, D.mel.cut, 0.03);
    if (D.mel.terz) mzNota(T, mf(nt + 4), t + 0.02, D.mel.dec, D.mel.tip, D.mel.vol * 0.7, D.mel.cut, 0.03);
  }
}
function mzPlan(T, hedefT) {
  while (T.next < hedefT) { mzAdim(T, T.next); T.next += 60 / (T.D.bpm * (1 + 0.1 * T.yog)) / 4; T.adim++; }
}
function muzikTik() {
  var a = AC; if (!a || a.state !== 'running' || !MZ.on) return; var now = a.currentTime;
  MZ.aktif.forEach(function (T) { if (T.next < now - 0.5) T.next = now + 0.1; mzPlan(T, now + 0.7); });
}
function muzikGec(ad, bas) {
  if (!MZ.on || !AC || !MT[ad]) return; if (MZ.cur && MZ.cur.ad === ad && !bas) return;
  var a = AC, now = a.currentTime, eski = MZ.cur, T = mzTema(ad);
  if (bas) { T.adim = 0; T.motif = null; T.son = 0; }
  mzBus(T); T.bus.gain.setValueAtTime(0.0001, now); T.bus.gain.linearRampToValueAtTime(1, now + (bas ? 1.5 : 3)); T.next = now + 0.15; T.aktif = true;
  if (MZ.aktif.indexOf(T) < 0) MZ.aktif.push(T);
  if (eski && eski !== T) { try { eski.bus.gain.cancelScheduledValues(now); eski.bus.gain.setValueAtTime(eski.bus.gain.value, now); eski.bus.gain.linearRampToValueAtTime(0.0001, now + 2.6); } catch (e) {} setTimeout(function () { eski.aktif = false; MZ.aktif = MZ.aktif.filter(function (x) { return x !== eski || x === MZ.cur; }); }, 3000); }
  MZ.cur = T;
}
function muzikBaslat() {
  if (!MZON || MZ.on) return; var a = sesAc(); if (!a || a.state !== 'running') return; MZ.on = true; MZ.cur = null; MZ.aktif = [];
  muzikGec(MZ.sahne || MZ.istenen); MZ.timer = setInterval(muzikTik, 120);
}
function muzikDurdur() {
  if (!MZ.on) return; MZ.on = false; clearInterval(MZ.timer); var a = AC, now = a ? a.currentTime : 0;
  MZ.aktif.forEach(function (T) { try { T.bus.gain.cancelScheduledValues(now); T.bus.gain.setValueAtTime(T.bus.gain.value, now); T.bus.gain.linearRampToValueAtTime(0.0001, now + 0.5); } catch (e) {} T.aktif = false; });
  MZ.aktif = []; MZ.cur = null;
}
function muzikMood(m) { MZ.istenen = m; if (MZ.sahne) return; muzikGec(m); }
function muzikYogun(v) { if (MZ.cur) MZ.cur.yog = Math.max(0, Math.min(1, v)); }
function muzikSahne(ad) {
  if (!MT[ad]) return; clearTimeout(MZ.sahneT); MZ.sahne = ad; muzikGec(ad, true);
  MZ.sahneT = setTimeout(function () { MZ.sahne = null; muzikGec(MZ.istenen); }, (MSAHNE[ad] || 30) * 1000);
}
function krizMi() { var sk = S && S.md && S.md.sk; return !!((sk && sk.durum !== 'bitti') || S.stat.kasa < 0 || S.stat.stres > 85); }
function muzikBelirle() {
  var m = 'oyun'; if (!S) m = 'menu'; else if (S.kp) m = 'koalisyon'; else if (krizMi()) m = 'kriz'; else { var ay = secimeAy(S).ay; if (ay <= 3) { m = 'gerilim'; if (MZ.istenen !== 'gerilim' || !MZ.cur || MZ.cur.ad !== 'gerilim') mzTema('gerilim'); MZ.tema.gerilim.yog = (4 - ay) / 4; } }
  muzikMood(m);
}
function sesSeviye() { if (MB) MB.gain.setTargetAtTime(MVOL / 100 * 0.9, AC.currentTime, 0.05); if (MG) MG.gain.setTargetAtTime(SVOL / 100 * 0.9, AC.currentTime, 0.05); }
document.addEventListener('pointerdown', function (e) { var a = sesAc(); if (a && MZON && !MZ.on) { try { a.resume().then(muzikBaslat); } catch (x) { muzikBaslat(); } } var b = e.target && e.target.closest && e.target.closest('button,.opt,.tab'); if (a && b && !b.disabled) ses('tik'); }, true);
document.addEventListener('visibilitychange', function () { if (!AC) return; try { if (document.hidden) AC.suspend(); else AC.resume(); } catch (e) {} });
function animUygula() {
  var h = document.documentElement; h.classList.toggle('anim-az', ANIM === 'az'); h.classList.toggle('anim-kapali', ANIM === 'kapali');
  RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || ANIM === 'kapali';
}
function ayarlar() {
  sheet('<h2>Menü</h2><button class="btn" id="a1">Nasıl oynanır?</button><button class="btn" id="a5" style="margin-top:8px">Oyunu kaydet…</button><button class="btn" id="a2" style="margin-top:8px">Ana menü</button><button class="btn" id="a3" style="margin-top:8px;color:var(--bad)">Otomatik kaydı sil, yeni oyun</button><div class="lab" style="margin-top:14px">Animasyon yoğunluğu</div><div class="chiprow" id="an">' + [['tam', 'Tam'], ['az', 'Az'], ['kapali', 'Kapalı']].map(function (x) { return '<button class="cx' + (ANIM === x[0] ? ' on' : '') + '" data-a="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><p class="tiny muted">Cihazın "Hareketi azalt" ayarı da otomatik uygulanır.</p><div class="lab" style="margin-top:12px">Müzik</div><div class="chiprow" id="mz">' + [['1', 'Açık'], ['0', 'Kapalı']].map(function (x) { return '<button class="cx' + ((MZON ? '1' : '0') === x[0] ? ' on' : '') + '" data-m="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><label class="rg"><span>Müzik seviyesi</span><input type="range" min="0" max="100" value="' + MVOL + '" id="mv" aria-label="Müzik seviyesi"></label><div class="lab" style="margin-top:12px">Ses efektleri</div><div class="chiprow" id="sn">' + [['1', 'Açık'], ['0', 'Kapalı']].map(function (x) { return '<button class="cx' + ((SESON ? '1' : '0') === x[0] ? ' on' : '') + '" data-s="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><label class="rg"><span>Efekt seviyesi</span><input type="range" min="0" max="100" value="' + SVOL + '" id="sv" aria-label="Efekt seviyesi"></label><div class="lab" style="margin-top:12px">Titreşim</div>' + ('vibrate' in navigator ? '<div class="chiprow" id="tt">' + [['1', 'Açık'], ['0', 'Kapalı']].map(function (x) { return '<button class="cx' + ((TITRON ? '1' : '0') === x[0] ? ' on' : '') + '" data-t="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' : '<p class="tiny muted">Bu cihaz/tarayıcı titreşimi desteklemiyor (iPhone Safari web sayfalarına titreşim vermez).</p>') + '<p class="tiny muted">Tercihler bu cihazda saklanır.</p><button class="btn ghost" id="a4" style="margin-top:8px">Kapat</button>');
  document.querySelectorAll('#mz .cx').forEach(function (b) { b.onclick = function () { MZON = b.dataset.m === '1'; try { localStorage.setItem('ss_muzik', MZON ? '1' : '0'); } catch (e) {} document.querySelectorAll('#mz .cx').forEach(function (x) { x.classList.toggle('on', x === b); }); if (MZON) muzikBaslat(); else muzikDurdur(); }; });
  document.querySelectorAll('#sn .cx').forEach(function (b) { b.onclick = function () { SESON = b.dataset.s === '1'; try { localStorage.setItem('ss_ses', SESON ? '1' : '0'); } catch (e) {} document.querySelectorAll('#sn .cx').forEach(function (x) { x.classList.toggle('on', x === b); }); if (SESON) ses('onay'); }; });
  var mv = $('#mv'), sv = $('#sv');
  mv.oninput = function () { MVOL = +mv.value; try { localStorage.setItem('ss_mvol', MVOL); } catch (e) {} sesSeviye(); };
  sv.oninput = function () { SVOL = +sv.value; try { localStorage.setItem('ss_svol', SVOL); } catch (e) {} sesSeviye(); };
  sv.onchange = function () { ses('onay'); };
  document.querySelectorAll('#tt .cx').forEach(function (b) { b.onclick = function () { TITRON = b.dataset.t === '1'; try { localStorage.setItem('ss_titresim', TITRON ? '1' : '0'); } catch (e) {} document.querySelectorAll('#tt .cx').forEach(function (x) { x.classList.toggle('on', x === b); }); if (TITRON && navigator.vibrate) { try { navigator.vibrate(20); } catch (e) {} } }; });
  document.querySelectorAll('#an .cx').forEach(function (b) { b.onclick = function () { ANIM = b.dataset.a; try { localStorage.setItem('ss_anim', ANIM); } catch (e) {} animUygula(); document.querySelectorAll('#an .cx').forEach(function (x) { x.classList.toggle('on', x === b); }); toast('Animasyon: ' + b.textContent); }; });
  $('#a1').onclick = yardim; $('#a5').onclick = function () { kayitlarSheet(true); }; $('#a2').onclick = function () { closeSheet(true); S = null; menu(); };
  $('#a3').onclick = function () { kayitSil('auto'); closeSheet(true); S = null; modSec(); }; $('#a4').onclick = function () { closeSheet(true); };
}

/* ---- sekmeler ---- */
function tabHtml() { var f = {genel: tGenel, merkez: tMerkez, yonetim: tYonetim, parti: tParti, anket: tAnket, harita: tHarita, karargah: tKarargah, belediye: tBelediye, iller: tIller, ittifak: tIttifak, rakip: tRakip, secim: tSecim, meclis: tMeclis, ekonomi: tEkonomi, medya: tMedya, lider: function () { return tLider() + liderEk(); }, takvim: tTakvim, tarihce: tTarihce, kayit: tKayit, hakkinda: tHakkinda}[TAB]; return f(); }
function aksBtn(a) {
  var n = a.maliyet && !muhalifMu(S) ? ' · ' + ((a.id === 'teskilat' || a.id === 'kamptur') ? 'bölgeye göre' : para(aksiyonMaliyet(S, a, null))) : '';
  return '<button class="aks" data-a="' + a.id + '"' + (S.aksiyon.kalan <= 0 ? ' disabled' : '') + '><b>' + a.ad + '<span style="display:inline;color:var(--gold);font-weight:500;font-size:11.5px">' + n + '</span></b><span>' + a.not + '</span></button>';
}
function sbSatir() { var s = S.sonrakiSecim; if (!s) return ''; return '<div class="card" style="border-color:var(--gold)"><h3>' + (s.tip === 'genel' ? 'Genel seçim' : 'Yerel seçim') + '<small>' + (s.ay === 0 ? 'Bu ay!' : s.ay + ' ay kaldı') + '</small></h3><div class="small muted">' + AYLAR_UZUN[s.m - 1] + ' ' + s.y + (S.mod === 'yeni' ? (girerMi(S) ? ' · Seçime girmeye hazırsın.' : ' · Seçime girmek için 41 ilde teşkilat gerekir (şu an ' + teskilatSayisi(S) + ').') : '') + '</div></div>'; }
function tGenel() {
  var h = kariyerBanner() + ogrenHtml() + bugunHtml() + panoHtml() + sbSatir() + (muhalifMu(S) ? muhalifPanel() : '') + '<div class="eyebrow">Bu ayın aksiyonları · ' + S.aksiyon.kalan + ' hak kaldı</div><div class="grid2">' + AKSIYONLAR.filter(function (a) { return muhalifMu(S) ? MUHALIF_AKS.indexOf(a.id) >= 0 : a.tab === 'genel'; }).map(aksBtn).join('') + '</div>';
  if (kampAcik(S)) h += '<div class="eyebrow" style="color:var(--gold)">🗳️ Kampanya dönemi · seçime ' + secimeAy(S).ay + ' ay</div><div class="grid2">' + AKSIYONLAR.filter(function (a) { return a.tab === 'kampanya'; }).map(aksBtn).join('') + '</div>';
  h += '<div class="eyebrow">Gündem</div><div class="card">' + (S.haberler.length ? S.haberler.map(function (x) { return '<div class="row small gnd" style="align-items:flex-start"><span class="gi">' + haberIkon(x) + '</span><span>' + esc(x) + '</span></div>'; }).join('') : '<span class="muted small">Henüz haber yok. İlk ayı bitir.</span>') + '</div>';
  if (S.log.length) h += '<div class="eyebrow">Son hareketler</div><div class="card">' + S.log.slice(0, 5).map(function (l) { return '<div class="row small"><span>' + esc(l.m) + '</span><span class="muted tiny">' + l.t + '</span></div>'; }).join('') + '</div>';
  return h;
}
function kisiKart(k, rol, tip, ref) {
  var c = k.perf < 40 ? 'var(--bad)' : k.perf > 65 ? 'var(--ok)' : 'var(--warn,#f0a030)';
  return '<div class="card kk" data-kk="' + tip + ':' + ref + '" style="padding:11px 14px;cursor:pointer"><h3><span class="kpr">' + portre(k.ad, 30, {mood: kisiMood(k), id: k.uid}) + esc(k.ad) + '</span><small>' + esc(rol) + '</small></h3><div class="row" style="border:0;padding:2px 0"><span class="small muted">Performans</span><b class="num small">' + k.perf + '</b></div>' + bar(k.perf, c) + '<div class="chiprow" style="margin-top:6px"><span class="pill">' + OZEL[k.ozel][0] + '</span><span class="pill">Yetenek ' + k.yet + '</span><span class="pill ' + (k.sad < 35 ? 'badc' : '') + '">Sadakat ' + k.sad + '</span>' + (k.kaynak && k.kaynak !== 'parti' ? '<span class="pill ac">' + esc(partiAdi(S, k.kaynak)) + ' kontenjanı</span>' : '') + '</div></div>';
}
function tYonetim() {
  kadroInit(S);
  var h = '';
  if (govMu(S, S.pid) && S.bakanlar) h += '<div class="eyebrow">Bakanlar Kurulu</div>' + BAKANLIK.map(function (b) { return kisiKart(S.bakanlar[b[1]], b[0] + ' Bakanı', 'bakan', b[1]); }).join('');
  if (govMu(S, S.pid) && !muhalifMu(S)) h += '<div class="eyebrow">Hükümet reformları</div><div class="grid2">' + AKSIYONLAR.filter(function (a) { return a.tab === 'reform'; }).map(aksBtn).join('') + '</div>';
  h += '<div class="eyebrow">Parti kadrosu</div>' + S.kadro.map(function (k, i) { return kisiKart(k, k.rol, 'kadro', i); }).join('');
  h += '<div class="eyebrow">Bölge başkanları</div>' + Object.keys(BOLGE).map(function (b) { return kisiKart(S.bbs[b], BOLGE[b] + ' Bölge Başkanı', 'bolge', b); }).join('');
  if (!muhalifMu(S)) h += asama2Html();
  return h + '<div class="tiny muted" style="margin:8px 0">Karta dokunarak ayrıntı görebilir, ödüllendirebilir veya görevden alabilirsin.</div><button class="btn" data-a="kadro"' + (S.aksiyon.kalan <= 0 ? ' disabled' : '') + '>Kadro Toplantısı<small>Parti birliğini güçlendirir (1 aksiyon)</small></button>';
}
function kisiSheet(ref) {
  var q = ref.split(':'), tip = q[0], id = tip === 'kadro' ? +q[1] : q[1], k = tip === 'kadro' ? S.kadro[id] : tip === 'bolge' ? S.bbs[id] : S.bakanlar[id]; if (!k) return;
  var rol = tip === 'kadro' ? k.rol : tip === 'bolge' ? BOLGE[id] + ' Bölge Başkanı' : BAKANLIK.filter(function (b) { return b[1] === id; })[0][0] + ' Bakanı';
  var acik = tip === 'kadro' ? ROL_ACIK[ROL_ETKI[k.rol] || 'genel'] : tip === 'bolge' ? 'Bölgedeki teşkilatın büyümesini hızlandırır' : BAK_ACIK[id];
  sheet('<div class="lab">' + (tip === 'bakan' ? 'BAKAN' : 'KADRO') + '</div><h2>' + esc(k.ad) + '</h2><p class="muted small">' + esc(rol) + ' · ' + esc(acik) + '</p>' +
    '<div class="card" style="margin:0 0 10px"><div class="row"><span class="k">Performans</span><b class="num">' + k.perf + '</b></div>' + bar(k.perf) + '<div class="row"><span class="k">Yetenek</span><b class="num">' + k.yet + '</b></div><div class="row"><span class="k">Sadakat</span><b class="num ' + (k.sad < 35 ? 'badc' : '') + '">' + k.sad + '</b></div><div class="row"><span class="k">Hırs</span><b class="num">' + k.hirs + '</b></div><div class="small muted" style="margin-top:6px"><b>' + OZEL[k.ozel][0] + ':</b> ' + OZEL[k.ozel][1] + '</div></div>' +
    '<button class="btn pri" id="ko">Ödüllendir<small>Sadakat +14 · küçük bütçe · 1 aksiyon</small></button><button class="btn" id="kd" style="margin-top:8px;color:var(--bad)">Görevden al<small>Yerine yeni biri atanır · 1 aksiyon</small></button><button class="btn ghost" id="kk2" style="margin-top:8px">Kapat</button>');
  var h2e = document.querySelector('.sh h2'); if (h2e) h2e.insertAdjacentHTML('beforebegin', '<div style="text-align:center;margin-bottom:6px">' + portre(k.ad, 72, {mood: kisiMood(k), id: k.uid}) + '</div>'); var c1 = document.querySelector('.sh .card'); if (c1) c1.insertAdjacentHTML('afterend', kisiIliskiHtml(k));
  $('#kk2').onclick = function () { closeSheet(true); };
  $('#ko').onclick = function () { var r = kadroOdul(S, tip, id); closeSheet(true); toast(r.msg); kayit(); render(); };
  $('#kd').onclick = function () { var r = kadroDegis(S, tip, id); closeSheet(true); toast(r.msg); kayit(); render(); };
}
function tParti() {
  var st = S.stat;
  var h = '<div class="card"><h3>Durum</h3>' + [['İtibar', st.itibar], ['Parti birliği', st.birlik], ['Stres', st.stres], ['Sağlık', st.saglik]].map(function (x) { return '<div style="margin-bottom:8px"><div class="row" style="border:0;padding:0"><span class="k">' + x[0] + '</span><b class="num">' + Math.round(x[1]) + '</b></div>' + bar(x[1], x[0] === 'Stres' ? 'var(--gold)' : '') + '</div>'; }).join('') + '</div>';
  h += '<div class="eyebrow">Seçmen grupları</div>' + GRUPLAR.map(function (g) {
    var d = grupDurum(g.id, S.makro), v = S.grup[g.id];
    return '<div class="card" style="padding:11px 14px"><h3>' + g.ad + '<small class="' + (d[1] === 'bad' ? 'badc' : d[1] === 'ok' ? 'good' : 'warnc') + '">' + d[0] + '</small></h3>' + bar(v) + '<div class="tiny muted" style="margin-top:6px">' + g.kaygi + '</div></div>';
  }).join('');
  h += '<div class="eyebrow">Seçmen buluşması</div><button class="btn" data-a="secmen"' + (S.aksiyon.kalan <= 0 ? ' disabled' : '') + '>Bir grupla görüş<small>1 aksiyon</small></button>';
  return h;
}
function spark(arr, renk) {
  if (arr.length < 2) return ''; var mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr), r = Math.max(0.5, mx - mn), w = 300, hh = 60;
  var pts = arr.map(function (v, i) { return (i * w / (arr.length - 1)).toFixed(1) + ',' + (hh - 4 - (v - mn) / r * (hh - 8)).toFixed(1); }).join(' ');
  return '<svg viewBox="0 0 ' + w + ' ' + hh + '" style="width:100%;height:60px" role="img" aria-label="Anket geçmişi"><polyline class="cz" pathLength="1" points="' + pts + '" fill="none" stroke="' + renk + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>';
}
function tIller() {
  var P = paylar(S), idx = ILLER.map(function (x, i) { return i; }).sort(function (a, b) { return ILLER[b].nufus - ILLER[a].nufus; });
  return '<div class="card">' + idx.map(function (i) { return '<button class="row" data-il="' + i + '" style="width:100%;text-align:left"><span>' + ILLER[i].ad + ' <span class="tiny muted">' + ILLER[i].mv + ' MV</span></span><span class="small"><span class="muted">Teşk. ' + Math.round(S.org[i]) + '</span> · <b>%' + f1(P.il[i][S.pid]) + '</b></span></button>'; }).join('') + '</div>';
}
function tIttifak() {
  var it = oyuncuIttifak(S), h = '<div class="card"><h3>İttifakım</h3>';
  if (it) { h += '<div class="small">' + esc(it.ad) + '</div><div class="chiprow" style="margin-top:8px">' + it.uyeler.map(function (id) { return '<span class="pill ' + (id === S.pid ? 'go' : '') + '">' + esc(partiAdi(S, id)) + '</span>'; }).join('') + '</div>' + (it.ad !== 'Cumhur İttifakı' ? '<button class="btn" id="ayril" style="margin-top:10px">İttifaktan ayrıl</button>' : ''); }
  else h += '<div class="small muted">Henüz bir ittifakın yok. Barajı tek başına geçmek zor olabilir.</div>';
  h += '</div><div class="eyebrow">Parti yakınlığı · davet 1 aksiyon</div>';
  var ids = PARTILER.filter(function (p) { return p.id !== S.pid && p.baz >= 1.0; }).map(function (p) { return p.id; }).sort(function (a, b) { return yakinlik(S, b) - yakinlik(S, a); });
  ids.forEach(function (id) {
    var y = yakinlik(S, id), icerde = it && it.uyeler.indexOf(id) >= 0;
    h += '<div class="card" data-ld="' + id + '" style="padding:11px 14px;cursor:pointer"><h3><span><span class="dot" style="display:inline-block;background:' + partiRengi(S, id) + ';margin-right:8px"></span>' + esc(partiAdi(S, id)) + '</span><small>Yakınlık ' + y + '</small></h3>' + bar(y, y > 60 ? 'var(--ok)' : y > 40 ? 'var(--gold)' : 'var(--bad)') + (icerde ? '<span class="pill ok" style="margin-top:8px">İttifakta</span>' : '<button class="btn" data-dv="' + id + '" style="margin-top:8px;padding:8px"' + (S.aksiyon.kalan <= 0 ? ' disabled' : '') + '>İttifaka davet et</button>') + '</div>';
  });
  return h;
}
function koltukSatir(map, toplam) {
  var s = Object.keys(map).filter(function (id) { return map[id] > 0; }).sort(function (a, b) { return map[b] - map[a]; }), mx = map[s[0]] || 1;
  return s.map(function (id) { return '<div class="pr' + (id === S.pid ? ' me' : '') + '"><span class="dot" style="background:' + partiRengi(S, id) + '"></span><div><div class="nm"><span>' + esc(partiAdi(S, id)) + '</span></div><div class="pbar"><i style="width:' + (map[id] / mx * 100) + '%;background:' + partiRengi(S, id) + '"></i></div></div><b class="num">' + Math.round(map[id]) + '</b></div>'; }).join('');
}
function tSecim() {
  var h = sbSatir(), b = bugunSecimOlsa(S);
  h += '<div class="card"><h3>Bugün seçim olsa<small>Tahmini sandalye</small></h3>' + (b.girer ? '' : '<div class="small badc" style="margin-bottom:6px">Teşkilatın 41 ilden az: seçime giremezsin.</div>') + koltukSatir(b.seats) + '</div>';
  if (S.sonSecim && S.sonSecim.tip === 'genel') h += '<div class="card"><h3>Son genel seçim<small>' + AYLAR_UZUN[S.sonSecim.m - 1] + ' ' + S.sonSecim.y + '</small></h3>' + koltukSatir(S.sonSecim.koltuk) + '</div>';
  return h;
}
function tMeclis() { return meclisHtml(); }
function tEkonomi() {
  var M = S.makro, r = function (k, v, c) { return '<div class="row"><span class="k">' + k + '</span><b class="num ' + (c || '') + '">' + v + '</b></div>'; };
  return ekoPano() + '<div class="card"><h3>Makro göstergeler</h3>' + r('Enflasyon (yıllık)', '%' + f1(M.enf), M.enf > 50 ? 'badc' : '') + r('Faiz', '%' + f1(M.faiz)) + r('Dolar/TL', f1(M.usd) + (M.usdOnce ? ' <small class="muted">' + (M.usd >= M.usdOnce ? '▲' : '▼') + ' %' + f1(Math.abs(M.usd / M.usdOnce - 1) * 100) + ' aylık</small>' : '')) + r('İşsizlik', '%' + f1(M.issiz), M.issiz > 11 ? 'badc' : '') + r('Büyüme', '%' + f1(M.buyume), M.buyume < 0 ? 'badc' : '') + r('Asgari ücret', sayi(M.asgari) + ' ₺') + '</div>' +
    devletEkonomi() +
    '<div class="card"><h3>Parti finansı</h3>' + r('Kasa', para(S.stat.kasa), S.stat.kasa < 0 ? 'badc' : 'good') + r('Üye', sayi(S.stat.uye)) + '<div class="small muted" style="margin-top:6px">Gelir üyelikten ve itibardan gelir; gider teşkilat sayısı ve seçim yaklaştıkça artar. Fiyatlar enflasyonla büyür.</div></div><button class="btn" data-a="bagis"' + (S.aksiyon.kalan <= 0 ? ' disabled' : '') + '>Bağış Gecesi<small>Kasaya para; sızıntı riski (1 aksiyon)</small></button><button class="btn" data-a="uye" style="margin-top:8px"' + (S.aksiyon.kalan <= 0 ? ' disabled' : '') + '>Üye Kampanyası<small>1 aksiyon</small></button>';
}
function tMedya() { return medyaHtml(); }
/* ---- etkileşim ---- */
function bagla() {
  document.querySelectorAll('.kyb').forEach(function (b) { b.onclick = function () {
    var sl = b.dataset.s, ey = b.dataset.e;
    if (ey === 'sv') { if (b.dataset.dolu === '1' && !b.classList.contains('onay')) { b.classList.add('onay'); b.textContent = 'Emin misin? Üzerine yazılır'; return; } var ok = kaydet(S, sl); toast(ok ? 'Kaydedildi' : 'Kaydedilemedi: depolama dolu veya kapalı'); render(); }
    else if (ey === 'ld') { var o = yukle(sl); if (o) davetEt(o); else toast('Kayıt okunamadı'); }
    else if (ey === 'dl') { if (!b.classList.contains('onay')) { b.classList.add('onay'); b.textContent = 'Silinsin mi? Tekrar dokun'; return; } kayitSil(sl); toast('Kayıt silindi'); render(); }
  }; });
  var ok_ = $('#ogrk'); if (ok_) ok_.onclick = function () { S.ogrKapat = 1; kayit(); render(); };
  document.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { aksiyonTikla(b.dataset.a); }; });
  document.querySelectorAll('.kk').forEach(function (c) { c.onclick = function () { kisiSheet(c.dataset.kk); }; });
  document.querySelectorAll('.ycard').forEach(function (c) { c.onclick = function () { yasaSheet(c.dataset.y); }; });
  var gvB = $('#gvo'); if (gvB) gvB.onclick = guvenSheet; var gsB = $('#gso'); if (gsB) gsB.onclick = gensoruSheet; document.querySelectorAll('.bld').forEach(function (b) { b.onclick = function () { kararOnay(b.dataset.ac, +b.dataset.bil); }; }); var erB = $('#ero'); if (erB) erB.onclick = erkenSheet; var ebB = $('#ebo'); if (ebB) ebB.onclick = function () { sonucGoster(aksiyonYap(S, 'erkenbaski')); };
  document.querySelectorAll('.sky').forEach(function (b) { b.onclick = function () { var r = mdSkandalYanit(S, b.dataset.sy); kayit(); render(); toast(r.msg); }; });
  document.querySelectorAll('.kmy').forEach(function (c) { c.onclick = function () { kurmaySheet(c.dataset.km); }; });
  document.querySelectorAll('[data-pol]').forEach(function (b) { b.onclick = function () { var q = b.dataset.pol.split(':'), r = politikaDegis(S, q[0], +q[1]); toast(r.msg); kayit(); render(); }; });
  document.querySelectorAll('button[data-il]').forEach(function (b) { b.onclick = function () { ilSheet(+b.dataset.il); }; });
  document.querySelectorAll('[data-dv]').forEach(function (b) { b.onclick = function () { var r = ittifakaDavet(S, b.dataset.dv); toast(r.msg); kayit(); render(); }; });
  var ay = $('#ayril'); if (ay) ay.onclick = function () { ittifaktanAyril(S); kayit(); render(); };
  document.querySelectorAll('#hf .cx').forEach(function (b) { b.onclick = function () { HF = b.dataset.f; render(); }; });
  if (typeof mapBagla === 'function') mapBagla();
  ekBagla();
  var yo = $('#yenioyun'); if (yo) yo.onclick = function () { kayitSil('auto'); S = null; modSec(); };
}
function aksiyonTikla(id) {
  var a = aksiyonBul(id);
  if (S.aksiyon.kalan <= 0) { toast('Bu ay aksiyon hakkın bitti. "Ayı Bitir" ile devam et.'); return; }
  if (a.hedef === 'bolge') {
    sheet('<div class="lab">' + a.ad + '</div><h2>Hangi bölge?</h2>' + BOLGE_SIRA.map(function (b) { var m = aksiyonMaliyet(S, a, b); return '<button class="opt" data-b="' + b + '"><b>' + BOLGE[b] + '</b><span class="small muted">' + bolgeIller(b).length + ' il · ' + para(m) + '</span></button>'; }).join('') + '<button class="btn ghost" id="k" style="margin-top:10px">Vazgeç</button>');
    document.querySelectorAll('.opt').forEach(function (o) { o.onclick = function () { closeSheet(true); kararOnay(id, o.dataset.b); }; });
    $('#k').onclick = function () { closeSheet(true); };
  } else if (a.hedef === 'grup') {
    sheet('<div class="lab">' + a.ad + '</div><h2>Hangi grup?</h2>' + GRUPLAR.map(function (g) { return '<button class="opt" data-g="' + g.id + '"><b>' + g.ad + '</b><span class="small muted">' + g.kaygi + '</span></button>'; }).join('') + '<button class="btn ghost" id="k" style="margin-top:10px">Vazgeç</button>');
    document.querySelectorAll('.opt').forEach(function (o) { o.onclick = function () { closeSheet(true); kararOnay(id, o.dataset.g); }; });
    $('#k').onclick = function () { closeSheet(true); };
  } else if (a.hedef === 'medya') {
    mdInit(S); sheet('<div class="lab">' + a.ad + '</div><h2>Hangi yayın organı?</h2>' + S.medya.map(function (m, q) { return '<button class="opt" data-m="' + q + '"><b>' + (MEDYA_TUR[m.tur] || '') + ' ' + esc(m.ad) + '</b><span class="small muted">Erişim ' + m.erisim + ' · yakınlık ' + Math.round(m.yakin) + ' · güven ' + Math.round(m.guven) + '</span></button>'; }).join('') + '<button class="btn ghost" id="k" style="margin-top:10px">Vazgeç</button>');
    document.querySelectorAll('.opt').forEach(function (o) { o.onclick = function () { closeSheet(true); kararOnay(id, +o.dataset.m); }; });
    $('#k').onclick = function () { closeSheet(true); };
  } else kararOnay(id);
}
function ayBitirTikla() {
  if (BUSY) return; BUSY = true; ses('ay');
  var el = document.createElement('div'); el.className = 'mt';
  var sn = tarihNo(S.tarih) + 1, sy = Math.floor((sn - 1) / 12), sm = sn - sy * 12;
  el.innerHTML = '<div class="mt-in"><div class="mt-e">🗓️</div><div class="mt-a">' + AYLAR_UZUN[S.tarih.m - 1] + ' kapanıyor</div><div class="mt-s">' + AYLAR_UZUN[sm - 1] + ' ' + sy + ' için hazırlanılıyor…</div><div class="mt-b"><i></i></div></div>';
  document.body.appendChild(el);
  setTimeout(function () { var a0 = S.anketOyuncu, r0 = oyuncuSira(S); ayiBitir(S); var da = S.anketOyuncu - a0, r1 = oyuncuSira(S); if (Math.abs(da) >= 0.8) sonDakika(S, 'Anketlerde ' + (da > 0 ? 'sert yükseliş' : 'sert düşüş') + ': ' + S.parti.ad + ' %' + f1(S.anketOyuncu) + '.'); else if (r1 < r0) sonDakika(S, S.parti.ad + ' anketlerde ' + r1 + '. sıraya yükseldi.'); kayit(); render(); el.classList.add('out'); setTimeout(function () { el.remove(); BUSY = false; queue(); }, 320); }, 1100);
}
function deltaUc(el, k, d) {
  if (RM || !el || !el.closest) return; var h = el.closest('.st'); if (!h) return;
  var m = k === 'anket' ? (d > 0 ? '+' : '−') + f1(Math.abs(d)).replace('-', '') + ' puan' : k === 'kasa' ? (d > 0 ? '+' : '−') + para(Math.abs(d)) : (d > 0 ? '+' : '−') + sayi(Math.abs(d));
  var c = document.createElement('i'); var rc = h.getBoundingClientRect(); c.className = 'dlt ' + (d > 0 ? 'up' : 'dn'); c.textContent = m; c.style.left = (rc.left + rc.width / 2) + 'px'; c.style.top = (rc.bottom + 4) + 'px'; document.body.appendChild(c); setTimeout(function () { c.remove(); }, 1600);
}
function sayAnim(el, k, a, b) {
  deltaUc(el, k, b - a);
  var t0 = performance.now(), D = 800, up = b > a; el.classList.add(up ? 'fu' : 'fd');
  function fmt(v) { return k === 'anket' ? '%' + f1(v) : k === 'kasa' ? para(v) : sayi(v); }
  (function f(t) { var p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(a + (b - a) * e); if (p < 1) requestAnimationFrame(f); else setTimeout(function () { el.classList.remove('fu', 'fd'); }, 500); })(t0);
}
function konfeti(cv) {
  var x = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, c = ['#e63b5f', '#dcab4a', '#ffffff', '#5ea0ff', '#3fc27a'], P = [];
  for (var i = 0; i < 110; i++) P.push({x: Math.random() * W, y: -Math.random() * H, w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, vy: 1.6 + Math.random() * 3, vx: (Math.random() - .5) * 2, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: c[i % 5]});
  (function f() { if (!document.body.contains(cv)) return; x.clearRect(0, 0, W, H); P.forEach(function (q) { q.y += q.vy; q.x += q.vx; q.r += q.vr; if (q.y > H + 20) { q.y = -20; q.x = Math.random() * W; } x.save(); x.translate(q.x, q.y); x.rotate(q.r); x.fillStyle = q.c; x.globalAlpha = .85; x.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); x.restore(); }); requestAnimationFrame(f); })();
}
function splash(o, fn) {
  closeSheet(true); ses(o.ses || (o.ikon === '🏆' ? 'zafer' : 'sahne'));
  var el = document.createElement('div'); el.className = 'splash ' + (o.tema || '');
  el.innerHTML = (o.konfeti ? '<canvas class="cf"></canvas>' : '') + siluet() + '<button class="gec">Geç ›</button><div class="sp-c"><div class="sp-i">' + o.ikon + '</div><div class="sp-u">' + o.ust + '</div><h1>' + o.baslik + '</h1><div class="sp-a">' + (o.alt || '') + '</div>' + (o.satirlar || []).map(function (l, i) { return typeof l === 'object' && l ? '<div class="sp-kv ' + (l.c || '') + '" style="animation-delay:' + (0.7 + i * 0.08) + 's"><span>' + l.k + '</span><b>' + l.v + '</b></div>' : '<div class="sp-l">' + l + '</div>'; }).join('') + (o.alinti ? '<div class="sp-q"><b>' + o.alinti[0] + '</b>' + o.alinti[1] + '</div>' : '') + (o.gazete ? '<button class="btn sp-gz">📰 Gazeteyi aç</button>' : '') + '<button class="btn pri sp-d">Devam</button></div>' + (o.ticker ? '<div class="sp-t"><div class="sp-tk"><span>' + o.ticker + '  •  ' + o.ticker + '  •  </span><span>' + o.ticker + '  •  ' + o.ticker + '  •  </span></div></div>' : '');
  document.body.appendChild(el);
  if (o.konfeti) konfeti($('canvas', el));
  var done = false; function bit() { if (done) return; done = true; el.classList.add('out'); setTimeout(function () { el.remove(); if (fn) fn(); }, 300); }
  $('.gec', el).onclick = bit; $('.sp-d', el).onclick = bit; var gzb = $('.sp-gz', el); if (gzb) gzb.onclick = function () { gazeteAc(o.gazete); };
}

/* ---- kuyruk: özet, kart, seçim ---- */
function queue() {
  if (!S || sheetEl) return;
  var it = S.kuyruk.shift(); if (!it) { kayit(); return; }
  if (it.t === 'acilis') acilis(); else if (it.t === 'ozet') ozet(it); else if (it.t === 'kart') kart(it); else if (it.t === 'secim') secimGece(it.sonuc); else if (it.t === 'kurultay') kurultaySheet(it); else if (it.t === 'oylama') oylamaSheet(it); else if (it.t === 'koalisyon') koalisyonSheet(); else if (it.t === 'skandal') skandalSheet(it); else if (it.t === 'olay') splash({ses: it.ses || 'istifa', tema: it.erken ? 'b' : (it.tema || ''), ikon: it.ikon, ust: esc(it.ust), baslik: esc(it.baslik), alt: esc(it.alt || ''), satirlar: (it.satirlar || []).map(function (l) { return l && typeof l === 'object' ? {k: esc(l.k), v: esc(l.v), c: l.c} : esc(l); }), alinti: it.alinti ? [esc(it.alinti[0]), esc(it.alinti[1])] : undefined, gazete: it.gazete, konfeti: it.konfeti, ticker: it.ticker ? esc(it.ticker) : undefined}, function () { render(); queue(); }); else if (it.t === 'sd') { sdGoster([it]); render(); queue(); } else if (it.t === 'teklif') teklifSheet(it); else if (it.t === 'bitis') bitisSahne(); else if (it.t === 'kbitis') kariyerSon(it);
}
function acilis() {
  var yeni = S.mod === 'yeni';
  splash({ikon: oyuncuLogo(84), ust: yeni ? 'KURULUŞ' : 'GÖREV DEVRİ', baslik: yeni ? esc(S.parti.ad) + ' kuruldu' : esc(S.parti.ad) + ' genel başkanı', alt: esc(S.lider.ad) + ' · Eylül 2026', satirlar: [yeni ? 'Önce teşkilat, sonra sandık.' : 'Parti seni bekliyor.', S.senaryo && S.senaryo !== 'klasik' && SENARYOLAR[S.senaryo] ? 'Senaryo: ' + SENARYOLAR[S.senaryo].ad + '. ' + SENARYOLAR[S.senaryo].not : 'Her ay 3 aksiyonun var. Sonra Ayı Bitir.'], tema: 'k', ticker: 'CJN · ' + (yeni ? 'YENİ PARTİ SİYASET SAHNESİNDE' : 'GENEL BAŞKAN GÖREVE BAŞLADI') + ' · ' + esc(S.parti.ad).toUpperCase() + ' · Eylül 2026', konfeti: true}, queue);
}
function ozet(o) {
  var d = S.anketOyuncu - o.onceki.anket, dp = o.sira - o.onceki.sira;
  sheet('<div class="lab">Ay sonu özeti</div><h2>' + o.tarih + '</h2><div class="grid2"><div class="card" style="margin:0"><div class="tiny muted">Anket</div><b style="font-size:20px">%' + f1(o.anket) + '</b><div class="small ' + (d >= 0 ? 'good' : 'badc') + '">' + (d >= 0 ? '▲ ' : '▼ ') + f1(Math.abs(d)) + ' puan</div></div><div class="card" style="margin:0"><div class="tiny muted">Sıra</div><b style="font-size:20px">' + o.sira + '.</b><div class="small muted">' + (dp < 0 ? '▲ yükseldin' : dp > 0 ? '▼ düştün' : 'değişmedi') + '</div></div></div>' +
    '<div class="row" style="margin-top:8px"><span class="k">Gelir / gider</span><span class="num small"><span class="good">' + para(o.gelir) + '</span> / <span class="badc">' + para(o.gider) + '</span></span></div><div class="row"><span class="k">Kasa</span><b class="num">' + para(o.kasa) + '</b></div><div class="row"><span class="k">Teşkilat</span><b>' + o.org + ' il</b></div>' +
    '<div class="news"><b>' + esc(o.haberler[0] || '') + '</b></div>' + o.haberler.slice(1, 3).map(function (x) { return '<div class="small muted" style="margin-bottom:4px">• ' + esc(x) + '</div>'; }).join('') + '<button class="btn pri" id="k" style="margin-top:12px">Devam</button>', 'blue');
  $('#k').onclick = function () { closeSheet(); };
}
function sdGoster(list) {
  list = list.slice(0, 3);
  list.forEach(function (x, i) { setTimeout(function () {
    document.querySelectorAll('.sdb').forEach(function (e) { e.remove(); });
    var b = document.createElement('div'); b.className = 'sdb'; b.innerHTML = '<span class="sdt"><i></i>SON DAKİKA</span><span class="sdm">' + esc(x.m) + '</span>';
    b.onclick = function () { b.remove(); }; document.body.appendChild(b); setTimeout(function () { b.classList.add('out'); setTimeout(function () { b.remove(); }, 400); }, 4000);
  }, i * 4700 + 600); });
}

function teklifSheet(it) {
  var p = partiBul(it.id); if (!p) { queue(); return; }
  sheet('<div class="lab">İTTİFAK TEKLİFİ</div><h2>' + esc(p.ad) + '</h2><p>' + esc(liderAdi(it.id)) + ', seçim öncesi ortak hareket etmeyi önerdi. Yakınlık: <b>%' + yakinlik(S, it.id) + '</b>. Kabul edersen ortak liste ve baraj avantajı doğar; reddedersen ilişki zedelenir.</p>' +
    '<button class="btn pri" id="tk1">Kabul et</button><button class="btn ghost" id="tk2" style="margin-top:8px">Reddet</button>');
  $('#tk1').onclick = function () { var m = teklifKabul(S, it.id); closeSheet(true); kayit(); render(); toast(m); setTimeout(queue, 300); };
  $('#tk2').onclick = function () { teklifRed(S, it.id); closeSheet(true); kayit(); render(); setTimeout(queue, 300); };
}

function devletEkonomi() {
  var M = S.makro, g = S.makroGecmis || [], iktidar = govMu(S, S.pid), prev = g.length > 1 ? g[g.length - 2] : null;
  var ok = function (k, v, c, d) { return '<div class="row"><span class="k">' + k + '</span><b class="num ' + (c || '') + '">' + v + (d ? ' <small class="' + (d.g ? 'good' : 'badc') + '">' + (d.u ? '▲' : '▼') + '</small>' : '') + '</b></div>'; };
  var dl = function (a, b, ters) { if (!prev || Math.abs(a - b) < 0.05) return null; return {u: a > b, g: (a > b) !== !!ters}; };
  var h = '<div class="card"><h3>Devlet ekonomisi<small>' + (iktidar ? 'Hükümet sensin' : 'Hükümet politikası') + '</small></h3>' +
    ok('Bütçe dengesi', '%' + f1(M.butce) + ' GSYH', M.butce < -7 ? 'badc' : '', prev ? dl(M.butce, prev.butce === undefined ? M.butce : prev.butce, 0) : null) +
    ok('Kamu borcu', '%' + f1(M.borc) + ' GSYH', M.borc > 60 ? 'badc' : '', prev ? dl(M.borc, prev.borc, 1) : null) +
    ok('Vergi gelirleri', '%' + f1(M.vergi) + ' GSYH', '') + ok('Yatırımlar', f1(M.yatirim) + ' / 100', M.yatirim < 30 ? 'badc' : '') +
    ok('Dış ticaret (cari denge)', '%' + f1(M.cari) + ' GSYH', M.cari < -6 ? 'badc' : '') + ok('Ekonomik memnuniyet', Math.round(M.memn) + ' / 100', M.memn < 30 ? 'badc' : M.memn > 55 ? 'good' : '') +
    '<div class="bar" style="margin-top:8px"><i style="width:' + Math.round(M.memn) + '%;background:' + (M.memn < 30 ? 'var(--bad)' : 'var(--ac)') + '"></i></div></div>';
  h += '<div class="card"><h3>Ekonomi politikası<small>' + (iktidar ? 'Her değişiklik 1 aksiyon' : 'Yalnızca iktidar belirler') + '</small></h3>' + ['h', 'v', 'f'].map(function (t) {
    return '<div class="small muted" style="margin:8px 0 4px">' + POL_AD[t][0] + '</div><div class="chiprow">' + POL_AD[t][1].map(function (ad, i) { var a = S.politika[t] === i - 1; return '<button class="pill' + (a ? ' ac' : '') + '" ' + (iktidar && !a ? 'data-pol="' + t + ':' + (i - 1) + '"' : 'disabled') + '>' + ad + '</button>'; }).join('') + '</div>';
  }).join('') + '<div class="tiny muted" style="margin-top:8px">Harcama büyümeyi artırır ama bütçeyi ve enflasyonu zorlar. Vergi geliri artırır, memnuniyeti düşürür. Sıkı faiz enflasyonu düşürür, büyümeyi ve yatırımı yavaşlatır.</div></div>';
  if (g.length > 2) {
    var W = 300, H = 90, hi = 0; g.forEach(function (x) { hi = Math.max(hi, x.enf, x.issiz); }); hi = Math.ceil(hi / 10) * 10 || 10;
    var ln = function (key, col) { return '<polyline class="cz" pathLength="1" points="' + g.map(function (x, i) { return (i * W / (g.length - 1)).toFixed(1) + ',' + (H - 6 - Math.max(0, x[key]) / hi * (H - 12)).toFixed(1); }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round"/>'; };
    h += '<div class="card"><h3>Gösterge seyri<small>son ' + g.length + ' ay</small></h3><svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto" role="img" aria-label="Enflasyon, işsizlik, büyüme grafiği"><g class="rvl">' + ln('enf', '#e63b5f') + ln('issiz', '#f0a030') + ln('buyume', '#4cc38a') + '</g></svg><div class="chiprow"><span class="pill" style="color:#e63b5f">Enflasyon</span><span class="pill" style="color:#f0a030">İşsizlik</span><span class="pill" style="color:#4cc38a">Büyüme</span></div></div>';
  }
  return h;
}

function rastgeleHikaye() {
  var liste = PARTILER.filter(function (p) { return p.baz >= 1.5; }), yeni = Math.random() < 0.35, seed = Date.now() % 100000;
  var AD = ['Umut', 'Yarın', 'Köprü', 'Ortak Akıl', 'Yeni Çağ', 'Birlik'], ID = ['sd', 'muh', 'lib', 'mil', 'sol'];
  var o = yeni ? {mod: 'yeni', partiAd: AD[seed % AD.length] + ' Partisi', renk: RENKLER[seed % RENKLER.length], ideo: IDEOLOJILER[seed % IDEOLOJILER.length].id, zorluk: ['kolay', 'orta', 'zor'][seed % 3], stil: 'katilimci', logo: seed % 10} : {mod: 'mevcut', partiId: liste[seed % liste.length].id, zorluk: 'orta'};
  o.liderAd = 'Genel Başkan'; o.dogum = 1970 + seed % 20; o.seed = seed; o.senaryo = 'rastgele';
  S = newGame(o); TAB = 'genel'; kayit(); render(); queue();
}

/* ---- ilk adımlar rehberi ---- */
function ogrenAdim() {
  var hm = S.hamle || [], kg = S.kartGecmis || [];
  return [['İlk aksiyonunu kullan', hm.length > 0 || S.ay > 0], ['Bir bölgede teşkilat kur', hm.some(function (h) { return h.id === 'teskilat'; })], ['Ayı bitir ve haberleri oku', S.ay >= 1], ['Bir karar kartı oyna', kg.length > 0], ['Anket sekmesinden durumuna bak', !!S.ogrAnket]];
}
function ogrenHtml() {
  if (!S || S.ogrKapat || S.ay >= 8 || muhalifMu(S)) return '';
  var st = ogrenAdim(), n = st.filter(function (x) { return x[1]; }).length;
  if (n >= st.length) return '';
  return '<div class="card" id="ogr"><h3>İlk adımlar<small>' + n + ' / ' + st.length + '</small></h3>' + st.map(function (x) { return '<div class="row small"><span>' + (x[1] ? '✅' : '⬜') + ' ' + x[0] + '</span></div>'; }).join('') + '<button class="btn ghost" id="ogrk" style="margin-top:8px">Gizle</button></div>';
}

/* ---- Rakipler sekmesi: güç, strateji, kasa, teşkilat ve fırsatlar ---- */
function rozet(id, b) { if (id === S.pid && typeof oyuncuLogo === 'function') return '<span class="roz rozl" style="width:' + (b || 28) + 'px;height:' + (b || 28) + 'px">' + oyuncuLogo(b || 28) + '</span>'; var ad = partiAdi(S, id), k = ad.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '').slice(0, 3).toUpperCase(); return '<span class="roz" style="background:' + partiRengi(S, id) + ';width:' + (b || 28) + 'px;height:' + (b || 28) + 'px;font-size:' + Math.round((b || 28) * 0.36) + 'px">' + k + '</span>'; }
function tRakip() {
  rkInit(S); var sr = siralama(S.anket).filter(function (id) { return id !== S.pid && S.rk[id] && S.anket[id] >= 2; }).slice(0, 10), h = '';
  h += '<div class="eyebrow">Rakip partiler</div><div class="small muted" style="margin-bottom:8px">Kasası boşalan ya da lideri sarsılan rakip savunmasızdır; güçlü kasalı ve teşkilatlı rakip ise sahada baskı kurar.</div>';
  h += sr.map(function (id) {
    var r = S.rk[id], kas = r.kasa == null ? null : r.kasa, tk = r.tesk == null ? null : r.tesk, zayif = r.kriz || r.guc < 34 || (kas != null && kas < 15);
    return '<div class="card"><h3><span class="kpr">' + portreG(r.lider || id, partiRengi(S, id), 38) + ' ' + rozet(id, 22) + ' ' + esc(partiAdi(S, id)) + '</span><small>%' + f1(S.anket[id]) + '</small></h3>' +
      '<div class="row small"><span>Lider</span><b>' + esc(r.lider) + (r.kriz ? ' · kriz' : '') + '</b></div>' +
      '<div class="row small"><span>Hat</span><b>' + esc(STRAT[r.strateji] || '') + '</b></div>' +
      '<div class="row small"><span>Lider gücü</span><b>' + Math.round(r.guc) + '</b></div>' + bar(r.guc, r.guc < 34 ? 'var(--bad,#c44)' : 'var(--gold)') +
      '<div class="row small"><span>Sana karşı kin</span><b class="' + ((r.kin || 0) > 35 ? 'badc' : '') + '">' + ((r.kin || 0) > 60 ? 'yüksek' : (r.kin || 0) > 25 ? 'orta' : 'düşük') + '</b></div>' +
      (kas != null ? '<div class="row small"><span>Kasa</span><b class="' + (kas < 15 ? 'badc' : '') + '">' + Math.round(kas) + '</b></div>' + bar(Math.min(100, kas / 2), kas < 15 ? 'var(--bad,#c44)' : 'var(--ok)') +
      '<div class="row small"><span>Teşkilat</span><b>' + Math.round(tk) + '</b></div>' + bar(tk, 'var(--gold)') : '') +
      (zayif ? '<div class="tiny good" style="margin-top:4px">⚡ Savunmasız: bu dönemde ona karşı hamle fırsatı.</div>' : '') + '</div>';
  }).join('');
  return h;
}

/* ---- Görsel pano: anket halkası, seyir, parti dağılım şeridi, durum karoları ---- */
function panoHalka(v, renk, alt) {
  var R = 38, C = 2 * Math.PI * R, d = Math.max(0, Math.min(1, v / 50)) * C;
  return '<svg viewBox="0 0 100 100" class="pano-h" role="img" aria-label="Anket payı"><circle cx="50" cy="50" r="' + R + '" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="9"/>' +
    '<circle cx="50" cy="50" r="' + R + '" fill="none" stroke="' + renk + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + d.toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 50 50)"/>' +
    '<text x="50" y="52" text-anchor="middle" fill="#eceef4" font-size="21" font-weight="700" font-family="var(--fd)">%' + f1(v) + '</text>' +
    '<text x="50" y="68" text-anchor="middle" fill="#9aa1b4" font-size="9">' + alt + '</text></svg>';
}
function panoHtml() {
  if (!S.anket) return '';
  var sr = siralama(S.anket), sira = sr.indexOf(S.pid) + 1, ben = S.anketOyuncu, g = (S.anketGecmis || []).map(function (x) { return x.p; }).slice(-12);
  var d = g.length > 1 ? ben - g[g.length - 2] : 0, renk = partiRengi(S, S.pid), se = secimeAy(S);
  var top = sr.slice(0, 6), toplam = 0, sh = '', lg = '';
  top.forEach(function (id) { var v = S.anket[id]; toplam += v; sh += '<span style="flex:' + v.toFixed(2) + ';background:' + partiRengi(S, id) + '"' + (id === S.pid ? ' class="me"' : '') + '></span>'; });
  if (toplam < 100) sh += '<span style="flex:' + (100 - toplam).toFixed(2) + ';background:rgba(255,255,255,.14)"></span>';
  top.slice(0, 4).forEach(function (id) { lg += '<span class="lg"><i style="background:' + partiRengi(S, id) + '"></i>' + esc(partiAdi(S, id)) + ' <b>' + f1(S.anket[id]) + '</b></span>'; });
  var st = S.stat, tk = teskilatSayisi(S);
  function kr(ik, ad, v, yz, rn) { return '<div class="pk"><div class="pk-i">' + ik + '</div><div class="pk-v">' + v + '</div><div class="pk-a">' + ad + '</div><div class="pk-b"><span style="width:' + Math.max(3, Math.min(100, yz)) + '%;background:' + rn + '"></span></div></div>'; }
  return '<div class="card pano"><div class="pano-t"><div class="pano-r">' + panoHalka(ben, renk, sira + '. parti') + '</div><div class="pano-s">' +
    '<div class="pano-d ' + (d >= 0 ? 'good' : 'badc') + '">' + (d >= 0 ? '▲ ' : '▼ ') + f1(Math.abs(d)).replace('.', ',') + ' puan <span class="muted tiny">geçen aya göre</span></div>' + spark(g, renk) +
    '</div></div>' +
    '<div class="pano-sh">' + sh + '</div><div class="pano-lg">' + lg + '</div>' +
    '<div class="pano-k">' + kr('💰', 'Kasa', para(st.kasa), st.kasa / 4e7 * 100, st.kasa < 0 ? 'var(--bad)' : 'var(--gold)') + kr('👥', 'Üye', sayi(st.uye), st.uye / 1.5e6 * 100, 'var(--info)') + kr('📍', 'Teşkilat', tk + '/81', tk / 81 * 100, 'var(--ok)') + kr('✨', 'İtibar', Math.round(st.itibar), st.itibar, 'var(--ac2)') + '</div></div>';
}

/* ---- Ekonomi panosu: yay göstergeler (iyi/kötü renkli) + dolar seyri ---- */
function ekoYay(v, mx, kotu, ad, bir, tersMi, gost) {
  var f = Math.max(0, Math.min(1, v / mx)), kt = tersMi ? (v <= kotu) : (v >= kotu), uy = tersMi ? (v <= kotu * 1.8) : (v >= kotu * 0.7), rn = kt ? 'var(--bad)' : uy ? 'var(--warn,#f0a030)' : 'var(--ok)', L = Math.PI * 34, d = f * L;
  return '<div class="ey"><svg viewBox="0 0 100 62" role="img" aria-label="' + ad + '"><path d="M16 54 A34 34 0 0 1 84 54" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="9" stroke-linecap="round"/>' +
    '<path d="M16 54 A34 34 0 0 1 84 54" fill="none" stroke="' + rn + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + d.toFixed(1) + ' ' + L.toFixed(1) + '"/>' +
    '<text x="50" y="50" text-anchor="middle" fill="#eceef4" font-size="16" font-weight="700" font-family="var(--fd)">' + bir + f1(gost != null ? gost : v) + '</text></svg><div class="ey-a">' + ad + '</div></div>';
}
function ekoPano() {
  var M = S.makro, g = (S.makroGecmis || []).filter(function (x) { return x.usd; }).map(function (x) { return x.usd; }).slice(-24);
  return '<div class="card"><h3>Ekonomi nabzı</h3><div class="ey-g">' + ekoYay(M.enf, 100, 50, 'Enflasyon', '%') + ekoYay(M.faiz, 70, 60, 'Faiz', '%') + ekoYay(M.issiz, 20, 11, 'İşsizlik', '%') + ekoYay(Math.max(0, M.buyume + 3), 12, 3.2, 'Büyüme', '%', true, M.buyume) + '</div>' +
    (g.length > 2 ? '<div class="row small" style="margin-top:8px"><span>Dolar/TL seyri</span><b>' + f1(M.usd) + ' ₺</b></div>' + spark(g, 'var(--gold)') : '') + '</div>';
}

/* ---- Kayıt sekmesi: yuvalar, otomatik kayıt, kaydet / yükle / sil ---- */
function tKayit() {
  var L = kayitlar(), dolu = L.filter(function (k) { return k.ok; }).length;
  var h = profilHtml() + '<div class="card kyt-h"><div class="kyt-i">💾</div><div><h3 style="margin:0">Oyun kayıtları</h3><div class="small muted">' + dolu + ' / ' + L.length + ' yuva dolu · oyun her ay sonunda otomatik kaydedilir</div></div></div>';
  h += '<div class="card kyt-g"><div class="row small"><span>Şu an</span><b>' + esc(S.parti.ad) + ' · ' + tarihUzun(S.tarih) + '</b></div>' +
    '<div class="row small"><span>Anket / sıra</span><b>%' + f1(S.anketOyuncu) + ' · ' + (siralama(S.anket).indexOf(S.pid) + 1) + '.</b></div></div>';
  h += L.map(function (k) {
    var auto = k.slot === 'auto', rn = k.ok ? 'var(--ok)' : 'rgba(255,255,255,.18)';
    return '<div class="card kyt' + (k.ok ? '' : ' bos') + '"><div class="kyt-s" style="border-color:' + rn + '">' + (auto ? '⟳' : k.slot) + '</div><div class="kyt-b"><b>' + slotAd(k) + '</b>' +
      '<div class="small muted">' + (k.ok ? esc(k.ad) + ' · ' + tarihUzun(k.tarih) + (k.bitti ? ' · bitti' : '') : 'Boş') + '</div>' + (k.ok && k.ts ? '<div class="tiny muted">' + new Date(k.ts).toLocaleString('tr-TR') + '</div>' : '') + '</div>' +
      '<div class="kyt-d">' + (auto ? '' : '<button class="btn pri kyb" data-e="sv" data-s="' + k.slot + '" data-dolu="' + (k.ok ? 1 : 0) + '">' + (k.ok ? 'Üzerine yaz' : 'Kaydet') + '</button>') +
      (k.ok ? '<button class="btn kyb" data-e="ld" data-s="' + k.slot + '">Yükle</button>' + (auto ? '' : '<button class="btn ghost kyb" data-e="dl" data-s="' + k.slot + '">Sil</button>') : '') + '</div></div>';
  }).join('');
  return h + '<div class="tiny muted" style="margin:8px 0">Kayıtlar yalnızca bu cihazın tarayıcısında saklanır. Yüklediğinde mevcut oyunun yerine geçer.</div>';
}

/* ---- görsel yardımcılar: silüet ve haber ikonu ---- */
function siluet() {
  var d = 'M0 60 V46 h14 v-8 h10 v8 h8 V30 q8-12 16 0 v16 h10 V22 l3-10 l3 10 v24 h10 v-14 h12 v14 h8 V36 q10-16 20 0 v10 h12 V18 l3-12 l3 12 v28 h10 v-10 h14 v10 h10 V40 q9-14 18 0 v6 h12 V26 l3-10 l3 10 v20 h10 v-12 h12 v12 h14 V34 q8-12 16 0 v12 h10 V20 l3-12 l3 12 v26 h12 v-8 h14 v8 h10 V38 q9-14 18 0 v8 h12 v14 H400 V60 Z';
  return '<svg class="sp-sk" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '" fill="currentColor"/></svg>';
}
function haberIkon(x) {
  var k = [[/enflasyon|fiyat|zam|dolar|kur\b|faiz/i, '💸'], [/anket|oy |oy,|seçim|baraj/i, '🗳️'], [/istifa|skandal|yolsuzluk|iddia|soruşturma/i, '⚠️'], [/ittifak|koalisyon|görüş/i, '🤝'], [/belediye|başkan/i, '🏙️'], [/miting|kampanya|ziyaret/i, '📣'], [/medya|televizyon|gazete|yayın|haber/i, '📺'], [/meclis|yasa|kanun|bakan/i, '🏛️'], [/işsiz|asgari|maaş|emekli/i, '👷']];
  for (var i = 0; i < k.length; i++) if (k[i][0].test(x)) return k[i][1];
  return '📰';
}

/* ---- "Bugün ne yapmalı?" çubuğu: en acil tek uyarı ---- */
function bugunHtml() {
  if (!S) return '';
  var ik = '', m = '', se = secimeAy(S), acik = (S.sozler || []).filter(function (z) { return z.durum === 'acik' && z.vade - S.ay <= 2; });
  if (S.stat.kasa < 0) { ik = '💸'; m = 'Kasa eksiye düştü: gelir getirecek bir hamle yap.'; }
  else if (S.stat.stres > 80) { ik = '😰'; m = 'Stres çok yüksek: dinlenme ya da güçlü bir ekip kararı al.'; }
  else if (acik.length) { ik = '🤞'; m = '"' + acik[0].metin + '" sözünün vadesine ' + Math.max(0, acik[0].vade - S.ay) + ' ay kaldı.'; }
  else if (se.ay != null && se.ay <= 3) { ik = '🗳️'; m = (se.tip === 'genel' ? 'Genel' : 'Yerel') + ' seçime ' + se.ay + ' ay kaldı: kampanya hamlelerini kullan.'; }
  else if (S.aksiyon && S.aksiyon.kalan > 0) { ik = '🎯'; m = S.aksiyon.kalan + ' aksiyon hakkın var; kullanmadan ayı bitirme.'; }
  else { ik = '✅'; m = 'Bu ay yapacak aksiyonun kalmadı, ayı bitirebilirsin.'; }
  return '<div class="bgn"><span class="bgn-i">' + ik + '</span><span>' + esc(m) + '</span></div>';
}
