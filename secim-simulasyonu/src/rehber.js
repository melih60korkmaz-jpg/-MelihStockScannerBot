/* ===== OYUN REHBERİ: konuşma balonlu, atlanabilir; cihazda bir kez gösterilir ===== */
var RH_KEY = 'secimsim_rehber', RH_EL = null, RH_SON = -1;
function rhBitmis() { try { return localStorage.getItem(RH_KEY) === '1'; } catch (e) { return false; } }
function rhKaldir() { RH_SON = -1; if (RH_EL) { RH_EL.remove(); RH_EL = null; } var r = document.querySelectorAll('.rh-ring'); for (var i = 0; i < r.length; i++) r[i].classList.remove('rh-ring'); }
function rhBitir() { try { localStorage.setItem(RH_KEY, '1'); } catch (e) { /* yok say */ } if (S) S.rhBitti = 1; rhKaldir(); }
/* Adım, oyun durumundan hesaplanır (kaydedilen oyunda da tutarlı): */
function rhAdim() {
  if (!S || S.bitti || S.rhBitti || rhBitmis()) return -1;
  if (S.ay >= 3) { rhBitir(); return -1; }
  var n = S.kararSay || 0;
  if (n < 1) return 0; if (n < 2) return 1; if (S.ay < 1) return 2; if (!S.ogrAnket) return 3; return 4;
}
var RH_METIN = [
  ['Merhaba Genel Başkan! 👋 Her ay <b>3 aksiyon</b> hakkın var. İlk aksiyonun: <b>Üye Kampanyası</b>. Dokun, bilgileri oku ve onayla.', '.aks[data-a="uye"]'],
  ['Güzel başlangıç! Şimdi <b>Teşkilat</b> kur: seçime girmek için çok ilde örgütlenmen gerekir. Bir bölge seç ve onayla.', '.aks[data-a="teskilat"]'],
  ['Bu ay için yeterli. <b>Ayı Bitir</b>\'e bas: anketler, kasa ve haberler güncellenir.', '#ay'],
  ['Şimdi <b>Anket</b> sekmesine bak: partilerin durumu burada. Hedefin <b>%7 barajı</b> geçmek.', '.tab[data-t="anket"]'],
  ['Hepsi bu! Ara sıra <b>karar kartları</b> çıkar; seçenekleri dikkatli oku. Teşkilat kur, kasayı koru, seçime hazırlan. Başarılar! 🗳️', null]
];
function rehberGuncelle() {
  var a = rhAdim();
  if (a < 0 || sheetEl || document.querySelector('.splash,.mt,.tut') || (typeof turGorulmus === 'function' && !turGorulmus() && !(navigator.webdriver && !/tur=1/.test(location.search)))) { rhKaldir(); return; }
  var m = RH_METIN[a], hedef = m[1] ? document.querySelector(m[1]) : null;
  if (m[1] && !hedef && a < 3) hedef = document.querySelector('.aks'); /* sekme/başka ekranda: genel hedefe düş */
  if (m[1] && !hedef) { rhKaldir(); return; }
  var r = document.querySelectorAll('.rh-ring'); for (var i = 0; i < r.length; i++) r[i].classList.remove('rh-ring');
  if (hedef) hedef.classList.add('rh-ring');
  if (hedef && RH_SON !== a) { RH_SON = a; var q = hedef.getBoundingClientRect(); if (q.top > innerHeight - 190 || q.top < 130) { try { hedef.scrollIntoView({block: 'center'}); } catch (e) { /* yok say */ } } }
  var alt = true; if (hedef) { var rc = hedef.getBoundingClientRect(); alt = rc.top < innerHeight * 0.5; }
  if (!RH_EL) { RH_EL = document.createElement('div'); RH_EL.className = 'rh'; document.body.appendChild(RH_EL); }
  RH_EL.className = 'rh ' + (alt ? 'rh-alt' : 'rh-ust');
  RH_EL.innerHTML = '<div class="rh-b"><div class="rh-av">🧑‍💼</div><div class="rh-t">' + m[0] + '</div><div class="rh-bt"><button class="btn ghost rh-atla">' + (a === 4 ? '' : 'Atla') + '</button>' + (a === 4 ? '<button class="btn pri rh-tm">Tamam</button>' : '<span class="rh-n">' + (a + 1) + ' / 5</span>') + '</div></div>';
  var at = RH_EL.querySelector('.rh-atla'); if (at) at.onclick = rhBitir; var tm = RH_EL.querySelector('.rh-tm'); if (tm) tm.onclick = rhBitir;
}
