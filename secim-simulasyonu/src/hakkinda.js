/* ===== HAKKINDA: oyunu tanıtan sekme · görseller · arkadaşa öneri · geri bildirim formu ===== */
var HK_SURUM = '1.0.0', HK_MAIL = 'mlhkrkmz6061@gmail.com', HK_GIZLILIK = 'https://melih60korkmaz-jpg.github.io/-MelihStockScannerBot/secim-gizlilik.html', HK_DESTEK = 'https://melih60korkmaz-jpg.github.io/-MelihStockScannerBot/secim-destek.html';
var HK_TUR = [['hata', '🐞 Hata'], ['oneri', '💡 Öneri'], ['denge', '⚖️ Denge']], HK_SEC = 'hata';
/* Küçük düz çizimler (56x56) */
function hkIkon(id) {
  var a = '<svg viewBox="0 0 56 56" width="52" height="52" aria-hidden="true">', z = '</svg>';
  var d = {
    teskilat: '<circle cx="28" cy="30" r="19" fill="#2a1f3a"/><path d="M28 12c-6 0-10 4.4-10 9.6 0 7 10 17.4 10 17.4s10-10.400 10-17.400C38 16.400 34 12 28 12z" fill="#e0344c"/><circle cx="28" cy="21.600" r="4" fill="#fff"/><circle cx="12" cy="40" r="3.500" fill="#f0b429"/><circle cx="44" cy="38" r="3.500" fill="#3b9ee0"/><circle cx="38" cy="47" r="2.500" fill="#2ee6a6"/>',
    anket: '<rect x="6" y="8" width="44" height="40" rx="8" fill="#1d1a2e"/><rect x="13" y="30" width="7" height="12" rx="2" fill="#3b9ee0"/><rect x="25" y="20" width="7" height="22" rx="2" fill="#f0b429"/><rect x="37" y="14" width="7" height="28" rx="2" fill="#e0344c"/><path d="M12 24l12-8 11 5 9-9" stroke="#2ee6a6" stroke-width="2.500" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    secim: '<rect x="12" y="26" width="32" height="22" rx="4" fill="#f2f2f6"/><rect x="8" y="20" width="40" height="9" rx="4" fill="#f0b429"/><rect x="19" y="23" width="18" height="3" rx="1.500" fill="#2a0f1c"/><g transform="rotate(-8 28 14)"><rect x="19" y="3" width="18" height="22" rx="3" fill="#fff"/><path d="M23 14l4 4 7-9" stroke="#e0344c" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>',
    kariyer: '<path d="M16 8h24v14c0 8-5 13-12 13S16 30 16 22V8z" fill="#f0b429"/><path d="M16 12H8c0 8 3 12 9 13M40 12h8c0 8-3 12-9 13" stroke="#f0b429" stroke-width="3" fill="none"/><rect x="24" y="34" width="8" height="8" fill="#d9a441"/><rect x="17" y="42" width="22" height="6" rx="3" fill="#8e4fd0"/><path d="M28 14l2 4.200 4.600.6-3.400 3.200.9 4.600-4.100-2.300-4.100 2.300.9-4.600-3.400-3.200 4.600-.6z" fill="#fff" opacity=".9"/>',
    meclis: '<path d="M6 40a22 22 0 0 1 44 0z" fill="#1d1a2e"/><g fill="#e0344c"><circle cx="12" cy="36" r="2.800"/><circle cx="16" cy="28" r="2.800"/><circle cx="24" cy="22" r="2.800"/></g><g fill="#f0b429"><circle cx="32" cy="22" r="2.800"/><circle cx="40" cy="28" r="2.800"/><circle cx="44" cy="36" r="2.800"/></g><g fill="#3b9ee0"><circle cx="20" cy="36" r="2.800"/><circle cx="28" cy="30" r="2.800"/><circle cx="36" cy="36" r="2.800"/></g><rect x="6" y="42" width="44" height="5" rx="2.500" fill="#8e4fd0"/>',
    medya: '<rect x="8" y="10" width="34" height="38" rx="5" fill="#f2f2f6"/><rect x="14" y="16" width="22" height="7" rx="2" fill="#e0344c"/><rect x="14" y="27" width="22" height="3" rx="1.500" fill="#9a9aab"/><rect x="14" y="33" width="22" height="3" rx="1.500" fill="#9a9aab"/><rect x="14" y="39" width="14" height="3" rx="1.500" fill="#9a9aab"/><rect x="38" y="20" width="12" height="28" rx="5" fill="#3b9ee0"/><path d="M44 12v8" stroke="#3b9ee0" stroke-width="3" stroke-linecap="round"/>',
    belediye: '<path d="M6 48V24l22-14 22 14v24z" fill="#1d1a2e"/><path d="M6 24l22-14 22 14" stroke="#f0b429" stroke-width="3" fill="none" stroke-linejoin="round"/><g fill="#f0b429"><rect x="12" y="28" width="6" height="8" rx="1"/><rect x="25" y="28" width="6" height="8" rx="1"/><rect x="38" y="28" width="6" height="8" rx="1"/></g><rect x="23" y="38" width="10" height="10" rx="2" fill="#e0344c"/>',
    gunluk: '<rect x="7" y="11" width="42" height="38" rx="8" fill="#f2f2f6"/><rect x="7" y="11" width="42" height="13" rx="8" fill="#e0344c"/><rect x="16" y="6" width="4" height="10" rx="2" fill="#fff"/><rect x="36" y="6" width="4" height="10" rx="2" fill="#fff"/><path d="M28 28c5 5 8 8 5 13-1.500 2.500-4 3-5 3s-3.500-.5-5-3c-3-5 0-8 5-13z" fill="#f0b429"/><path d="M28 36c2 2 3 3 2 5-.5 1-1.500 1.200-2 1.200s-1.500-.2-2-1.200c-1-2 0-3 2-5z" fill="#e0344c"/>'
  };
  return a + (d[id] || '') + z;
}
function hkHero() {
  return '<svg viewBox="0 0 340 130" width="100%" role="img" aria-label="Seçim Simülasyonu" style="display:block;border-radius:18px"><defs><linearGradient id="hkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a1030"/><stop offset=".6" stop-color="#171028"/><stop offset="1" stop-color="#0b0a14"/></linearGradient><radialGradient id="hkr" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#f0b42955"/><stop offset="1" stop-color="#0000"/></radialGradient></defs>' +
    '<rect width="340" height="130" fill="url(#hkg)"/><rect width="340" height="130" fill="url(#hkr)"/>' +
    '<g opacity=".9"><circle cx="30" cy="30" r="3" fill="#e0344c"/><circle cx="300" cy="22" r="2.500" fill="#3b9ee0"/><circle cx="60" cy="100" r="2" fill="#f0b429"/><circle cx="286" cy="102" r="3.500" fill="#8e4fd0"/><circle cx="120" cy="16" r="2" fill="#2ee6a6"/><circle cx="226" cy="112" r="2" fill="#e0344c"/></g>' +
    '<g transform="translate(170 62) scale(1.300)"><rect x="-26" y="2" width="52" height="34" rx="6" fill="#f2f2f6"/><rect x="-32" y="-8" width="64" height="14" rx="6" fill="#f0b429"/><rect x="-16" y="-3" width="32" height="4" rx="2" fill="#2a0f1c"/><g transform="rotate(-9 0 -14)"><rect x="-14" y="-34" width="28" height="34" rx="4" fill="#fff"/><path d="M-8 -16l7 7 12-15" stroke="#e0344c" stroke-width="4.500" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>' +
    '<g fill="#f0b429"><path d="M70 60l2.500 5 5.500.8-4 3.900.9 5.500-4.900-2.600-4.900 2.600.9-5.500-4-3.900 5.500-.8z"/><path d="M270 50l2 4 4.400.6-3.200 3.100.8 4.400-4-2.100-4 2.100.8-4.400-3.200-3.100 4.400-.6z"/></g></svg>';
}
var HK_OZ = [['teskilat', 'Teşkilat kur', '81 ilde örgütlen, seçime hazırlan.'], ['anket', 'Anketleri yönet', 'Baraj, ivme ve rakipler tek ekranda.'], ['secim', 'Seçimi kazan', 'Genel ve yerel seçimlerde sandıkta yarış.'], ['kariyer', 'Kariyer modu', '8 bölüm, 24 yıldız, Cumhurbaşkanlığı.'], ['meclis', 'Meclis ve ittifak', 'Koltuk, koalisyon ve yasalar.'], ['medya', 'Medya savaşı', 'Haber, algı ve itibar yönetimi.'], ['belediye', 'Belediyeler', 'İl il yerel yönetim kur.'], ['gunluk', 'Günün senaryosu', 'Her gün yeni bir başlangıç, seri yap.']];
function hakkindaHtml() {
  var h = '<div class="hk">' + hkHero() +
    '<h2 class="hk-t">Seçim Simülasyonu</h2><p class="hk-s muted">Parti kur, teşkilatı büyüt, sandığı kazan. Tamamen kurgusal, çevrimdışı ve ücretsiz bir siyaset strateji oyunu.</p>' +
    '<div class="eyebrow">Neler var?</div><div class="hk-grid">' + HK_OZ.map(function (o, i) { return '<div class="hk-f" style="--i:' + i + '">' + hkIkon(o[0]) + '<b>' + o[1] + '</b><span>' + o[2] + '</span></div>'; }).join('') + '</div>' +
    '<div class="eyebrow">Arkadaşlarını davet et</div><div class="card"><p class="small muted" style="margin:0 0 8px">Beğendiysen bir arkadaşına öner; kim daha çok sandalye kazanacak?</p><button class="btn pri" id="hk-dv">📤 Oyunu öner</button></div>' +
    '<div class="eyebrow">Geri bildirim</div><div class="card"><p class="small muted" style="margin:0 0 8px">Bir hata mı buldun, bir fikrin mi var? Yaz; mail uygulaman hazır metinle açılır. Yalnızca sürüm ve oyun durumu eklenir, kişisel bilgi eklenmez.</p>' +
    '<div class="chiprow" id="hk-tur">' + HK_TUR.map(function (t) { return '<button class="cx' + (t[0] === HK_SEC ? ' on' : '') + '" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<textarea class="in" id="hk-m" rows="4" maxlength="800" placeholder="Ne oldu? Ne olsun isterdin?" aria-label="Geri bildirim metni" style="width:100%;margin-top:8px;resize:none"></textarea>' +
    '<div style="display:flex;gap:8px;margin-top:8px"><button class="btn" id="hk-kp" style="flex:1">Kopyala</button><button class="btn pri" id="hk-gn" style="flex:2">Gönder ▸</button></div></div>' +
    '<div class="eyebrow">Bilgi</div><div class="card"><div class="row small"><span>Sürüm</span><b>' + HK_SURUM + '</b></div><div class="row small"><span>Gizlilik politikası</span><button class="btn ghost" id="hk-gz" style="width:auto;padding:8px 18px;min-height:40px">Aç</button></div><div class="row small"><span>Destek</span><button class="btn ghost" id="hk-ds" style="width:auto;padding:8px 18px;min-height:40px">Aç</button></div><p class="tiny muted" style="margin:8px 0 0">Kurgusal bir simülasyondur: gerçek olayları, kişileri ve seçim sonuçlarını yansıtmaz; herhangi bir parti ya da adayı desteklemez veya kötülemez.</p></div></div>';
  return h;
}
function tHakkinda() { return hakkindaHtml(); }
function hkNative() { return !!(window.ReactNativeWebView && window.__NATIVE_SHELL); }
function hkAc(u) { try { if (hkNative()) window.ReactNativeWebView.postMessage(JSON.stringify({t: 'url', url: u})); else window.open(u, '_blank'); } catch (e) { toast(u); } }
function hkBaglam() { return 'Sürüm ' + HK_SURUM + (S && S.ay != null ? ' · Ay ' + S.ay + ' · ' + (S.parti ? S.parti.ad : '') + ' · Mod ' + S.mod : ' · ana menü'); }
function hakkindaBagla() {
  var t = $('#hk-tur'); if (!t) return;
  t.querySelectorAll('.cx').forEach(function (b) { b.onclick = function () { HK_SEC = b.dataset.v; t.querySelectorAll('.cx').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
  $('#hk-dv').onclick = function () { paylasMetin('🗳️ Seçim Simülasyonu: parti kur, teşkilatı büyüt, sandığı kazan! Kurgusal bir siyaset strateji oyunu; sen de dene.'); };
  $('#hk-gz').onclick = function () { hkAc(HK_GIZLILIK); }; $('#hk-ds').onclick = function () { hkAc(HK_DESTEK); };
  $('#hk-gn').onclick = function () {
    var m = $('#hk-m').value.trim(); if (m.length < 5) { toast('Lütfen en az birkaç kelime yaz.'); return; }
    var etiket = (HK_TUR.filter(function (x) { return x[0] === HK_SEC; })[0] || [0, 'Geri bildirim'])[1].replace(/^\S+\s/, '');
    var url = 'mailto:' + HK_MAIL + '?subject=' + encodeURIComponent('[Seçim Simülasyonu v' + HK_SURUM + '] ' + etiket) + '&body=' + encodeURIComponent(m + '\n\n— — —\n' + hkBaglam());
    try { if (hkNative()) window.ReactNativeWebView.postMessage(JSON.stringify({t: 'mail', url: url})); else window.location.href = url; } catch (e) { /* kopyala yedeği */ }
    toast('Mail uygulaması açılıyor; göndermeyi unutma. Açılmazsa "Kopyala"yı kullan.');
  };
  $('#hk-kp').onclick = function () { var m = $('#hk-m').value.trim(); var tx = m + '\n\n' + hkBaglam() + '\n(' + HK_MAIL + ')'; try { navigator.clipboard.writeText(tx); toast('Kopyalandı. Mail olarak gönderebilirsin.'); } catch (e) { toast('Adres: ' + HK_MAIL); } };
}
function hakkindaSheet() { sheet(hakkindaHtml() + '<button class="btn ghost" id="k" style="margin-top:12px">Kapat</button>'); $('#k').onclick = function () { closeSheet(true); }; hakkindaBagla(); }
