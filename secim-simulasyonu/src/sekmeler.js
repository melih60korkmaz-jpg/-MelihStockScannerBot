/* ===== YENİ SEKMELER: Hedefler (danışman) · Rozetler · Rehber (sözlük) ===== */

/* ---------- Hedefler: danışman önerileri + ilerleme + takvim ---------- */
function danismanOner() {
  var st = S.stat, ts = teskilatSayisi(S), se = secimeAy(S), L = [], muh = muhalifMu(S);
  if (st.kasa < 1e6) L.push(['💰', 'Kasa tehlikede', 'Kasan 1 M ₺\'nin altında. "Bağış Gecesi" ile para topla, pahalı aksiyonlardan kaçın.', 'bagis']);
  if (st.stres >= 65) L.push(['😮‍💨', 'Stres yüksek', 'Stres ' + Math.round(st.stres) + ': çok yükselirse aksiyon hakkın 2\'ye düşer. "Kısa Tatil" stresi alır.', 'tatil']);
  if (st.birlik < 55) L.push(['🤝', 'Parti birliği zayıf', 'Birlik ' + Math.round(st.birlik) + '. "Kadro Toplantısı" ile partiyi toparla; aksi hâlde kurultayda zorlanırsın.', 'kadro']);
  if (!muh && ts < 41) L.push(['📍', 'Teşkilat eksik', 'Seçime girmek için en az 41 ilde teşkilat gerekir (şu an ' + ts + '). "Teşkilat Mesaisi" ile bölge bölge ilerle.', 'teskilat']);
  if (S.anketOyuncu < 7) L.push(['📊', 'Baraj altındasın', 'Anket %' + f1(S.anketOyuncu) + '; baraj %7. Miting, TV programı ve seçmen buluşmasıyla görünürlüğünü artır.', 'miting']);
  if (st.itibar < 40) L.push(['🌟', 'İtibar düşük', 'İtibar ' + Math.round(st.itibar) + '. "TV Programı" ve basın çalışmaları itibar kazandırır.', 'tv']);
  if (st.uye < 100000) L.push(['👥', 'Üye sayısı düşük', st.uye < 30000 ? '"Üye Kampanyası" ucuz ve etkilidir; her ay mutlaka kullan.' : 'Hedef 100 bin üye (rozet!). "Üye Kampanyası" ile devam et.', 'uye']);
  if (se.ay <= 3 && se.tip === 'genel' && !muh) L.unshift(['🗳️', 'Kampanya dönemi', 'Seçime ' + se.ay + ' ay kaldı: Genel sekmesindeki kampanya aksiyonları (tur, reklam, miting) açık.', null]);
  if (!L.length) L.push(['✅', 'Her şey yolunda', 'Kalan aksiyon haklarını kullanmadan ayı bitirme; sabit tempoyla ilerlemek en güvenlisi.', null]);
  return L.slice(0, 3);
}
function hdfSatir(ad, v, hedef, ters, not, birim) {
  var oran = ters ? Math.max(0, 100 - v) : Math.min(100, v / hedef * 100), ok = ters ? v < hedef : v >= hedef, rn = ok ? 'var(--good,#2ee6a6)' : '';
  return '<div class="hd-s"><div class="row small"><span>' + ad + '</span><b>' + (birim === 'para' ? para(v) : birim === 'yuzde' ? '%' + f1(v) : sayi(v)) + (ok ? ' ✅' : '') + '</b></div>' + bar(oran, rn) + (not ? '<div class="tiny muted">' + not + '</div>' : '') + '</div>';
}
function tHedef() {
  var st = S.stat, ts = teskilatSayisi(S), se = secimeAy(S), tip = se.tip === 'yerel' ? 'Yerel seçim' : 'Genel seçim', O = danismanOner();
  var h = '<div class="eyebrow">🧑‍💼 Danışman önerisi</div>' + O.map(function (o) {
    return '<div class="card hd-o"><div class="hd-i">' + o[0] + '</div><div style="flex:1"><b>' + o[1] + '</b><div class="small muted" style="margin-top:2px">' + o[2] + '</div>' + (o[3] ? '<button class="btn hd-git" data-a="' + o[3] + '" style="margin-top:8px;min-height:36px;padding:6px 12px;font-size:13px;width:auto;display:inline-block">Aksiyona git ▸</button>' : '') + '</div></div>';
  }).join('');
  h += '<div class="eyebrow">⏳ Takvim</div><div class="card"><div class="row small"><span>' + tip + '</span><b>' + (se.ay < 99 ? se.ay + ' ay kaldı' : '—') + '</b></div>' + (kampAcik(S) ? '<div class="small" style="color:var(--gold)">🗳️ Kampanya dönemi açık</div>' : '<div class="small muted">Kampanya aksiyonları seçime son 3 ayda açılır.</div>') + '</div>';
  h += '<div class="eyebrow">🎯 İlerleme</div><div class="card">' +
    hdfSatir('Teşkilatlı il', ts, 41, false, 'Seçime girmek için 41 il · tam teşkilat 81', 'sayi') +
    hdfSatir('Anket', S.anketOyuncu, 7, false, 'Baraj %7', 'yuzde') +
    hdfSatir('Üye', st.uye, 100000, false, '100 bin üye rozeti', 'sayi') +
    hdfSatir('İtibar', st.itibar, 70, false, '70 ve üzeri güçlü', 'sayi') +
    hdfSatir('Parti birliği', st.birlik, 70, false, '70 ve üzeri sağlıklı', 'sayi') +
    hdfSatir('Stres', st.stres, 60, true, '60\'ın altı güvenli', 'sayi') + '</div>';
  var kb = typeof kariyerBanner === 'function' ? kariyerBanner() : ''; if (kb) h += '<div class="eyebrow">🏆 Kariyer hedefi</div>' + kb;
  h += '<div class="eyebrow">Kısayollar</div><div class="grid2"><button class="btn hd-go" data-t="rozet">🎖️ Rozetler</button><button class="btn hd-go" data-t="sozluk">📘 Rehber</button></div>';
  return h;
}
function hedefBagla() {
  document.querySelectorAll('.hd-git').forEach(function (b) { b.onclick = function () { TAB = 'genel'; render(); var e = document.querySelector('.aks[data-a="' + b.dataset.a + '"]'); if (e) { try { e.scrollIntoView({block: 'center'}); } catch (x) { /* yok say */ } e.classList.add('rh-ring'); setTimeout(function () { e.classList.remove('rh-ring'); }, 2600); } }; });
  document.querySelectorAll('.hd-go').forEach(function (b) { b.onclick = function () { TAB = b.dataset.t; render(); var sc = $('#sc'); if (sc) sc.scrollTop = 0; }; });
}

/* ---------- Rozetler: tüm koleksiyon ---------- */
function tRozet() {
  var n = ROZET.filter(function (r) { return S.rozet && S.rozet[r[0]]; }).length, pct = Math.round(n / ROZET.length * 100);
  var h = '<div class="card"><div class="row"><b>Rozet koleksiyonu</b><b>' + n + ' / ' + ROZET.length + '</b></div>' + bar(pct) + '<div class="tiny muted">Rozetler oyun boyunca otomatik kazanılır; ilerlemek için aksiyon ve seçim hedeflerine odaklan.</div></div>';
  var acik = ROZET.filter(function (r) { return S.rozet && S.rozet[r[0]]; }), kilit = ROZET.filter(function (r) { return !(S.rozet && S.rozet[r[0]]); });
  var kart = function (r, ok) { return '<div class="rzk' + (ok ? ' on' : '') + '"><div class="rzi">' + (ok ? r[1] : '🔒') + '</div><div><b>' + r[2] + '</b><div class="tiny muted">' + r[3] + '</div></div></div>'; };
  if (acik.length) h += '<div class="eyebrow">Kazanılanlar</div><div class="rzg">' + acik.map(function (r) { return kart(r, true); }).join('') + '</div>';
  h += '<div class="eyebrow">Sırada</div><div class="rzg">' + (kilit.length ? kilit.map(function (r) { return kart(r, false); }).join('') : '<div class="card">Hepsini topladın! 🎉</div>') + '</div>';
  return h;
}

/* ---------- Rehber: sözlük, aksiyonlar, ipuçları, SSS ---------- */
var SOZLUK = [
  ['Baraj', 'Genel seçimde Meclis\'e girmek için ülke çapında geçilmesi gereken oy oranı: %7. Barajı geçemeyen parti sandalye alamaz (ittifakla girmek ayrı bir yol).'],
  ['Teşkilat', 'Partinin ildeki örgütü. Yeni bir parti seçime girmek için en az 41 ilde teşkilat kurmalıdır. Teşkilat oy, üye ve ivme getirir.'],
  ['İvme', 'Partinin anketlerdeki hareket yönü. Pozitif ivme oyunu her ay biraz yükseltir; negatif ivme düşürür. Aksiyonlar ve olaylar ivmeyi değiştirir.'],
  ['Birlik', 'Parti içi uyum. Düşük birlik kurultayda ve krizlerde seni zorlar; "Kadro Toplantısı" ve doğru kararlar birliği korur.'],
  ['İtibar', 'Liderin ve partinin kamuoyundaki saygınlığı. Yüksek itibar bağış, oy ve medya etkisini artırır.'],
  ['Stres', 'Liderin yorgunluğu. Çok yüksekse aylık aksiyon hakkın 3\'ten 2\'ye düşer. "Kısa Tatil" düşürür.'],
  ['Kasa', 'Partinin parası. Eksiye düşmek itibarı zedeler. Bağış gecesi ve düzenli üyelik kasayı doldurur.'],
  ['İttifak', 'Partilerin seçimde birlikte yarışması. Barajı aşmanın ve Meclis\'te güçlü olmanın bir yoludur.'],
  ['Kurultay', 'Genel başkanlık için parti içi seçim. Birlik ve itibar yüksekse korursun; düşükse rakip kazanabilir.'],
  ['Koalisyon', 'Hiçbir parti çoğunluğa ulaşamazsa kurulan ortaklık hükümeti. Pazarlık gücün koltuk sayına bağlıdır.']
];
var IPUCU = [
  'İlk aylarda ucuz ve kalıcı etkili aksiyonlara odaklan: "Üye Kampanyası" ve "Teşkilat Mesaisi".',
  'Her ay 3 hakkını da kullan; kullanılmayan hak birikmez.',
  'Karar kartlarında "tahmin" bölümü aksiyonun beklenen etkisini ve riskini gösterir; riskli seçeneklerde kasanı gözet.',
  'Stres 65\'i aşmadan "Kısa Tatil" kullan; yoksa verimin düşer.',
  'Seçime 3 ay kala kampanya aksiyonları açılır: bölge turu, reklam ve büyük miting.',
  'Günün Senaryosu\'nu her gün oyna: seri yaparsan puan tablon güçlenir.'
];
var SSS = [
  ['Oyun nasıl biter?', 'Takvimdeki son genel seçimde (Mayıs 2033) oyun sona erer. Kariyer modunda her bölüm kendi seçiminde biter.'],
  ['Kayıt nereye yapılır?', 'Oyun her ay ve her önemli işlemde cihazına otomatik kaydeder. "Kayıt" sekmesinden elle de kaydedebilirsin.'],
  ['Gerçek bir partiyi mi temsil ediyor?', 'Hayır. Oyun tamamen kurgusaldır; gerçek olayları, kişileri ve sonuçları yansıtmaz. Lider isimleri uydurmadır.'],
  ['Neden bir sekme yok?', 'Tüm sekmeler baştan açıktır. Aşağıdaki "Rehber" ve "Hedefler" sekmeleri yeni başlayanlar içindir.']
];
function tSozluk() {
  var h = '<div class="card"><b>📘 Rehber</b><div class="small muted" style="margin-top:4px">Terimleri, aksiyonları ve ipuçlarını burada bulabilirsin. Başlığa dokunarak aç/kapat.</div></div>';
  h += '<div class="eyebrow">Kavramlar</div>' + SOZLUK.map(function (x) { return '<details class="card dt"><summary><b>' + x[0] + '</b></summary><p class="small">' + x[1] + '</p></details>'; }).join('');
  h += '<div class="eyebrow">Aksiyonlar</div><details class="card dt" open><summary><b>Ne işe yarar?</b></summary>' + AKSIYONLAR.filter(function (a) { return a.tab !== 'kampanya' && a.tab !== 'reform'; }).slice(0, 14).map(function (a) { return '<div class="row small" style="align-items:flex-start;gap:8px"><b style="min-width:110px">' + a.ad + '</b><span class="muted">' + a.not + '</span></div>'; }).join('') + '</details>';
  h += '<div class="eyebrow">İpuçları</div><div class="card">' + IPUCU.map(function (t) { return '<div class="row small" style="align-items:flex-start;gap:8px"><span>💡</span><span>' + t + '</span></div>'; }).join('') + '</div>';
  h += '<div class="eyebrow">Sık sorulanlar</div>' + SSS.map(function (x) { return '<details class="card dt"><summary><b>' + x[0] + '</b></summary><p class="small">' + x[1] + '</p></details>'; }).join('');
  return h;
}
