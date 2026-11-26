/* ===== Genişletme paketi: il profili, yeni olaylar, rakip hamleleri, görev ödülleri, ittifak pazarlığı, anket şirketleri, grafikler ===== */

/* ---------- 1) İl profili (il sheet içinde) ---------- */
var BOLGE_PROFIL = {
  M: ['Sanayi, ihracat ve yoğun göç. Seçmen kalabalık, gündem pahalılık ve kira.', 'Gençler ve işçiler', 'Fabrika kapısı mitingi ve kira gündemi işe yarar.'],
  E: ['Turizm, zeytin ve ihracat. Seçmen özgürlükçü, oy kararları oynak.', 'Esnaf ve gençler', 'Esnaf buluşması ve belediye çalışmaları öne çıkar.'],
  A: ['Turizm, seracılık ve tarım. Mevsimlik işçi ve kıyı nüfusu önemli.', 'Çiftçiler ve esnaf', 'Tarım destekleri ve turizm sezonu vaatleri dinlenir.'],
  I: ['Memur, sanayi ve geniş ova tarımı. İktidar–muhalefet dengesi burada belirlenir.', 'Memurlar ve çiftçiler', 'Memur maaşı ve çiftçi desteği konuşulur.'],
  K: ['Fındık, çay ve balıkçılık. Yerel bağlar güçlü, yerli lidere sadakat yüksek.', 'Çiftçiler ve muhafazakârlar', 'Çay–fındık fiyatı ve yerel isimlerle aday gücü.'],
  D: ['Hayvancılık, göç veren kırsal ve üniversite şehirleri. Kimlik ve geçim birlikte konuşulur.', 'Çiftçiler ve gençler', 'İstihdam ve yatırım vaatleri, güçlü saha çalışması.'],
  G: ['Genç nüfus, sınır ticareti ve tarım. Kimlik siyaseti ve geçim birlikte etkili.', 'Gençler ve çiftçiler', 'Sahada kalıcı olmak ve istihdam sözü şart.']
};
function ilProfil(i) {
  var il = ILLER[i], pr = BOLGE_PROFIL[il.bolge], o = paylar(S).il[i], sr = siralama(o), m = sr.length > 1 ? o[sr[0]] - o[sr[1]] : 99, org = S.org[i], n = [];
  n.push(m < 3 ? '⚔️ Çekişmeli il: ilk iki arası ' + f1(m).replace('.', ',') + ' puan.' : sr[0] === S.pid ? '👑 Bu ilde birinciyiz (fark ' + f1(m).replace('.', ',') + ').' : '📉 Önde olan ' + esc(partiAdi(S, sr[0])) + ' (fark ' + f1(m).replace('.', ',') + ').');
  n.push(org <= 0 ? '📍 Teşkilatın yok; önce bölgede teşkilat kur.' : org < 30 ? '📍 Teşkilat zayıf (' + Math.round(org) + '/100); saha çalışması fark yaratır.' : '📍 Teşkilat sağlam (' + Math.round(org) + '/100).');
  return '<div class="eyebrow">Bölge profili</div><div class="card" style="margin:0 0 6px"><div class="small">' + pr[0] + '</div><div class="row small" style="margin-top:6px"><span>Öne çıkan seçmen</span><b>' + pr[1] + '</b></div><div class="small muted" style="margin-top:6px">💡 ' + pr[2] + '</div><div class="small" style="margin-top:8px">' + n.join('<br>') + '</div></div>';
}

/* ---------- 2) Yeni olay kartları ---------- */
KARTLAR_E.push(
 C('xg_tv', 'medya', 'Canlı TV Tartışması', 'Akşam haberlerinden sonra canlı bir tartışma programına çağrıldın. Rakip partilerden isimler de masada olacak.', function (S) { return S.ay >= 3 && !S.bitti; }, [
  ['Hazırlıklı git, veriyle konuş', {itibar: 2, drift: .1, stres: 3, grup: {memurlar: 2, ogrenciler: 2}}, 'Sakin ve bilgili duruşun izleyicide karşılık buldu.', [.25, {itibar: -1.5, stres: 2}, 'Bir rakip seni bir rakamda yakaladı; klip sosyal medyada dolaştı.']],
  ['Sert çık, rakibi köşeye sıkıştır', {drift: .14, itibar: -.5, stres: 4, grup: {milliyetciler: 3, gencler: 2}}, 'Parçalar viral oldu; destekçiler coştu, tarafsızlar mesafeli.', [.35, {itibar: -2, birlik: -1}, 'Üslubun parti içinde eleştirildi.']],
  ['Katılma, açıklamayla yetin', {stres: -1, itibar: -.5}, 'Boş sandalye tartışması yapıldı; etkisi sınırlı kaldı.']]),
 C('xg_deprem', 'kriz', 'Bölgede Deprem', 'Orta şiddette bir deprem birkaç ili vurdu. İnsanlar hızlı ve görünür bir yardım bekliyor.', function (S) { return S.ay >= 4 && !S.bitti; }, [
  ['Parti kaynaklarıyla yardım seferberliği', {kasa: -1.2, itibar: 3, uye: 1500, drift: .12, grup: {gencler: 2, muhafazakarlar: 2}}, 'Gönüllüler sahaya indi; yardımın görüntüleri yayıldı.'],
  ['Bağış çağrısı yap, koordinasyona destek ver', {kasa: -.3, itibar: 1.5, drift: .06}, 'Yardım kampanyan makul karşılık gördü.'],
  ['Siyaset yapma, sadece başsağlığı dile', {itibar: -.5, grup: {gencler: -2}}, 'Sessizliğin yetersiz bulundu.']]),
 C('xg_sel', 'kriz', 'Sel Baskını', 'Karadeniz ve Marmara kıyılarında sel baskınları yaşandı. Çiftçiler ve esnaf zarar gördü.', function (S) { return S.ay >= 3 && (S.tarih.m >= 9 || S.tarih.m <= 2); }, [
  ['Zarar tespitine ekip gönder', {kasa: -.5, itibar: 1.5, grup: {ciftciler: 4, esnaf: 3}, drift: .06}, 'Sahadaki varlığın fark edildi.'],
  ['İktidarı sorumluluğa çağır', {drift: .08, grup: {ciftciler: 2}, itibar: .5}, 'Eleştirin gündeme oturdu.', [.3, {itibar: -1}, 'Zamanlaması "fırsatçılık" diye eleştirildi.']],
  ['Beklemeyi seç', {grup: {ciftciler: -3, esnaf: -2}}, 'Bölge halkı seni yanında görmedi.']]),
 C('xg_fabrika', 'ekonomi', 'Fabrika Kapanıyor', 'Sanayi kentinde büyük bir fabrika kapanma kararı aldı; yüzlerce işçi işsiz kalma tehlikesinde.', function (S) { return S.ay >= 3 && S.makro.enf > 25; }, [
  ['İşçilerle kapıda nöbet tut', {itibar: 2, grup: {isciler: 6}, drift: .1, stres: 3, kasa: -.2}, 'İşçilerle yan yana durman büyük yankı yaptı.'],
  ['Teşvik ve istihdam paketi öner', {itibar: 1, grup: {isciler: 3, esnaf: 2}, drift: .06}, 'Somut öneri ciddiye alındı.'],
  ['Yorum yapma', {grup: {isciler: -4}}, 'İşçi kesimi seni yok saydı.']]),
 C('xg_cay', 'ekonomi', 'Çay ve Fındık Fiyatı', 'Üretici, açıklanan alım fiyatını düşük buluyor. Karadeniz\'de sesler yükseliyor.', function (S) { return S.ay >= 3 && S.tarih.m >= 5 && S.tarih.m <= 9; }, [
  ['Üretici mitingine katıl', {drift: .12, grup: {ciftciler: 6, muhafazakarlar: 1}, kasa: -.3, stres: 2}, 'Üretici seni sahada gördü.'],
  ['Taban fiyat önerini aç', {drift: .06, grup: {ciftciler: 3}, itibar: 1}, 'Öneri tartışılıyor.'],
  ['Bu konuya girme', {grup: {ciftciler: -3}}, 'Üretici kesim beklentisini karşılanmamış buldu.']]),
 C('xg_universite', 'secmen', 'Üniversite Öğrencileri Seninle Görüşmek İstiyor', 'Yurt ve burs sorunları nedeniyle öğrenci temsilcileri bir söyleşi talep ediyor.', function (S) { return S.ay >= 2 && S.tarih.m !== 7 && S.tarih.m !== 8; }, [
  ['Kampüs söyleşisine git', {grup: {ogrenciler: 6, gencler: 4}, drift: .1, stres: 2, kasa: -.1}, 'Salon doldu; sorulara açık yanıt verdin.', [.25, {itibar: -1}, 'Zor bir soru üzerine verdiğin cevap eleştirildi.']],
  ['Yurt-burs önerisi sun', {grup: {ogrenciler: 4, gencler: 2}, itibar: 1}, 'Öneriler genç basında yer aldı.'],
  ['Erteleme iste', {grup: {ogrenciler: -3}}, 'Öğrenciler randevunun ertelenmesini yadırgadı.']]),
 C('xg_emekli', 'ekonomi', 'Emekli Zam Tartışması', 'Emekli maaşı zammı açıklandı; derneklerin eleştirileri sürüyor.', function (S) { return S.ay >= 3 && (S.tarih.m === 1 || S.tarih.m === 7 || S.makro.enf > 40); }, [
  ['Refah payı için kampanya başlat', {drift: .12, grup: {emekliler: 6}, kasa: -.4, stres: 2}, 'Emekliler imza kampanyana destek verdi.'],
  ['Maliyetli bir plan sun', {grup: {emekliler: 3}, itibar: 1, drift: .05}, 'Plan basında yer buldu.'],
  ['Konuyu ele alma', {grup: {emekliler: -4}}, 'Emekliler sessizliğine tepki gösterdi.']]),
 C('xg_ic_kavga', 'parti', 'Parti İçinde Tartışma', 'İki il başkanı arasındaki anlaşmazlık basına sızdı.', function (S) { return S.ay >= 4 && teskilatSayisi(S) >= 10; }, [
  ['İkisini de toplantıya çağır', {birlik: 3, stres: 2, itibar: .5}, 'Sorun kapalı kapılar ardında çözüldü.', [.2, {birlik: -2}, 'Taraflardan biri küstü.']],
  ['Birini görevden al', {birlik: -2, itibar: .5, stres: 2}, 'Disiplin görüldü ama kırgınlık var.'],
  ['Kendi hâline bırak', {birlik: -3, itibar: -1}, 'Tartışma büyüdü ve basında yer aldı.']]),
 C('xg_gonullu', 'parti', 'Gönüllü Dalgası', 'Sosyal medyada başlayan bir hareket, binlerce genci partine gönüllü olmaya çağırıyor.', function (S) { return S.ay >= 2 && S.stat.itibar >= 45; }, [
  ['Gönüllü ağını resmî hâle getir', {uye: 4000, birlik: 1, kasa: -.2, drift: .1, grup: {gencler: 4}}, 'Binlerce genç hızla organize oldu.'],
  ['Çağrıyı destekle ama yönetime katma', {uye: 1500, grup: {gencler: 2}, drift: .04}, 'Hareket seni destekledi, mesafe korundu.'],
  ['Mesafeli dur', {grup: {gencler: -2}}, 'Gönüllüler boşlukta kaldı.']]),
 C('xg_bagis', 'ekonomi', 'Büyük Bağış Teklifi', 'Tanınmış bir iş insanı partine önemli bir bağış yapmak istiyor; karşılığında "ufak bir ilgi" bekliyor.', function (S) { return S.ay >= 4 && S.stat.kasa < 8e6; }, [
  ['Kabul et', {kasa: 3, itibar: -1.5, birlik: -1}, 'Kasa güçlendi ama "kimden para aldın" tartışması başladı.', [.35, {itibar: -3, drift: -.08}, 'Basın bağışın ayrıntılarını yazdı.']],
  ['Şeffaf biçimde bağış kaydı aç', {kasa: 1.2, itibar: 1}, 'Bağış şeffaf kayıtla alındı; şeffaflık takdir gördü.'],
  ['Reddet', {itibar: 1.5, grup: {memurlar: 2}, stres: 1}, 'İlkeli duruşun saygı gördü.']]),
 C('xg_baraj', 'siyaset', 'Baraj Tartışması', 'Meclis\'te seçim barajının düşürülmesi gündeme geldi.', function (S) { return S.ay >= 5 && S.anketOyuncu < 10; }, [
  ['Düşürülmesini savun', {itibar: 1, drift: .08, grup: {gencler: 2}}, 'Küçük partilerin desteğini aldın.'],
  ['Mevcut barajı koru', {birlik: 1, grup: {milliyetciler: 2}}, 'İstikrar mesajı verdin.'],
  ['Net bir tutum açıklama', {itibar: -1}, 'Kararsız görüldün.']]),
 C('xg_sosyalmedya', 'medya', 'Sosyal Medya Dalgası', 'Eski bir paylaşımın yeniden gündeme düştü; alıntılar hızla yayılıyor.', function (S) { return S.ay >= 3 && S.stat.itibar > 35; }, [
  ['Açık özür dile', {itibar: -.5, stres: 2, birlik: 1}, 'Özrün samimi bulundu, konu hızla söndü.'],
  ['Bağlamı anlat', {drift: -.03, stres: 2}, 'Bir kısım ikna oldu, bir kısım ikna olmadı.', [.3, {itibar: -2}, 'Açıklaman yeni bir tartışma başlattı.']],
  ['Yok say', {itibar: -1.5, drift: -.06}, 'Sessizlik konuyu büyüttü.']]),
 C('xg_ziyaret', 'secmen', 'Köy Ziyareti', 'Küçük bir köyün muhtarı seni çay içmeye çağırıyor; yol ve su sorunları var.', function (S) { return S.ay >= 2; }, [
  ['Git, sorunları dinle', {grup: {ciftciler: 4, muhafazakarlar: 2}, itibar: 1, drift: .06, stres: 1}, 'Yerel basında yer bulan sıcak bir ziyaret oldu.'],
  ['Bir yardımcını gönder', {grup: {ciftciler: 2}, itibar: .3}, 'Temsilcin iyi izlenim bıraktı.'],
  ['Programın sıkışık, geçiştir', {grup: {ciftciler: -2}}, 'Muhtar kırgın.']]),
 C('xg_kongre', 'parti', 'Yerel Kongre Mevsimi', 'İl kongreleri yaklaşıyor; adaylar parti içinde destek topluyor.', function (S) { return S.ay >= 6 && teskilatSayisi(S) >= 15; }, [
  ['Tarafsız kal, adil süreç iste', {birlik: 3, itibar: 1}, 'Süreç sakin ve güvenilir geçti.'],
  ['Kendi adaylarına destek ver', {birlik: -2, org: 2, drift: .05}, 'Teşkilatın güçlendi, rakip kanatlar küstü.'],
  ['Kongreleri ertele', {birlik: -2, stres: 1}, 'Erteleme eleştirildi.']])
);
KARTLAR_E.forEach(function (k) { if (k.id && k.id.indexOf('xg_') === 0 && !k.sec) k.sec = []; });

/* ---------- 3) Rakip hamleleri ---------- */
var RK_HAMLE = [
  ['sert', function (lider, p) { return lider + ', ' + p + ' hakkında sert bir kampanya başlattı.'; }, {itibar: -.8, stres: 1}],
  ['miting', function (lider) { return lider + ' büyük bir miting düzenledi; salon ve meydan doluydu.'; }, {itibar: -.3}],
  ['teklif', function (lider) { return lider + ', diğer muhalefet liderlerine "ortak masa" çağrısı yaptı.'; }, {}],
  ['reklam', function (lider) { return lider + ' liderliğindeki parti, ülke çapında bir reklam kampanyası başlattı.'; }, {itibar: -.3}],
  ['istifa', function (lider) { return lider + '\'in partisinde bir il başkanı istifa etti; parti içi kulis dikkat çekti.'; }, {}]
];
function rakipHamle(S) {
  var out = []; if (!S.rk || S.ay < 3 || rnd(S) > 0.38) return out;
  var ids = Object.keys(S.rk).filter(function (id) { return S.anket[id] >= 3; }); if (!ids.length) return out;
  var id = pick(S, ids), r = S.rk[id], h = pick(S, RK_HAMLE), kisi = typeof kisilik === 'function' ? kisilik(id)[0] : '', kin = (r.kin || 0) > 35, tip = h[0];
  if (kisi === 'saldirgan' && rnd(S) < 0.5) { h = RK_HAMLE[0]; tip = 'sert'; } else if (kisi === 'populist' && rnd(S) < 0.5) { h = RK_HAMLE[1]; tip = 'miting'; } else if (kisi === 'sakin' && rnd(S) < 0.5) { h = RK_HAMLE[2]; tip = 'teklif'; }
  if (tip === 'sert' && !kin && kisi !== 'saldirgan') h = RK_HAMLE[1];
  var m = h[1](esc_(r.lider), S.parti.ad), fx = h[2];
  if (fx.itibar) S.stat.itibar = clamp(S.stat.itibar + fx.itibar * (S.ay < 4 ? 0.3 : 1), 0, 100);
  if (fx.stres) S.stat.stres = clamp(S.stat.stres + fx.stres, 0, 100);
  S.rkLog = S.rkLog || []; S.rkLog.unshift({t: tarihYaz(S.tarih), id: id, m: m, e: tip === 'sert' ? 'sana yönelik' : 'genel'}); S.rkLog = S.rkLog.slice(0, 12);
  out.push(m); return out;
}
var _tRakip0 = tRakip;
tRakip = function () {
  var h = _tRakip0(), lg = (S.rkLog || []).slice(0, 5);
  var son = '<div class="eyebrow">Son hamleler</div>' + (lg.length ? lg.map(function (x) { return '<div class="card hd-o"><div class="hd-i">' + (x.e === 'sana yönelik' ? '🎯' : '📣') + '</div><div style="flex:1"><div class="tiny muted">' + esc(x.t) + ' · ' + esc(partiAdi(S, x.id)) + '</div><div class="small">' + esc(x.m) + '</div></div></div>'; }).join('') : '<div class="card small muted">Henüz dikkat çeken bir hamle yok. Birkaç ay sonra rakiplerin hareketleri burada listelenecek.</div>');
  return son + h;
};

/* ---------- 4) Görevler: aylık ödül ve seri ---------- */
function gorevBaz() { if (!S.gorevBaz) S.gorevBaz = {ts: teskilatSayisi(S), a: S.anketOyuncu}; return S.gorevBaz; }
function gorevListe() {
  var st = S.stat, ts = teskilatSayisi(S), a = S.anketOyuncu, z = gorevBaz();
  return [
    ['⚡', 'Bu ayın 3 hakkını kullan', S.aksiyon.kalan === 0, 'Genel sekmesinden aksiyon seç.'],
    ['📊', 'Anketi bu ay yükselt', a > z.a + 0.05, 'Ay başı %' + z.a.toFixed(1).replace('.', ',') + ' · şimdi %' + a.toFixed(1).replace('.', ',') + '.'],
    ['📍', 'Bu ay 2 yeni ilde teşkilat kur', ts >= z.ts + 2, 'Ay başı ' + z.ts + ' il · şimdi ' + ts + '. "Teşkilat Mesaisi" işe yarar.'],
    ['💰', 'Kasayı eksiye düşürme', st.kasa > 0, 'Şu an ' + (st.kasa / 1e6).toFixed(1).replace('.', ',') + ' M ₺.'],
    ['🤝', 'Parti birliğini 60 üstünde tut', st.birlik >= 60, 'Şu an ' + Math.round(st.birlik) + '.'],
    ['😮‍💨', 'Stresi 60 altında tut', st.stres < 60, 'Şu an ' + Math.round(st.stres) + '.']
  ];
}
function gorevAy(S) {
  var L = gorevListe(), n = L.filter(function (x) { return x[2]; }).length, st = S.stat;
  S.gorevToplam = (S.gorevToplam || 0) + n; st.itibar = clamp(st.itibar + n * 0.25, 0, 100);
  var odul = n * 0.25 > 0 ? '+' + (n * 0.25).toFixed(1).replace('.', ',') + ' itibar' : '';
  if (n >= 5) { st.kasa += 1.5e6; odul += ' · +1,5 M ₺ bonus'; }
  if (n >= 4) { S.gorevSeri = (S.gorevSeri || 0) + 1; } else S.gorevSeri = 0;
  S.gorevEn = Math.max(S.gorevEn || 0, S.gorevSeri || 0);
  S.gorevSon = {t: tarihYaz(S.tarih), n: n, odul: odul}; S.gorevBaz = {ts: teskilatSayisi(S), a: S.anketOyuncu};
  return n >= 4 ? ['Aylık görevler: ' + n + '/6 tamam' + (odul ? ' (' + odul + ')' : '') + '.'] : [];
}
function tGorev() {
  var L = gorevListe(), n = L.filter(function (x) { return x[2]; }).length, sn = S.gorevSon;
  var h = '<div class="card"><b>✅ Bu ayın görevleri</b><div class="small muted" style="margin-top:4px">' + n + '/' + L.length + ' tamam · ay bitince yenilenir.</div><div class="small" style="margin-top:8px">Ödül: her tamam görev +0,25 itibar · 5 ve üstü +1,5 M ₺ · 4 ve üstü seriyi sürdürür.</div></div>';
  h += '<div class="grid2"><div class="card" style="margin:0"><div class="tiny muted">🔥 Seri</div><b>' + (S.gorevSeri || 0) + ' ay</b></div><div class="card" style="margin:0"><div class="tiny muted">En iyi seri</div><b>' + (S.gorevEn || 0) + ' ay</b></div></div>';
  if (sn) h += '<div class="card small" style="margin-top:8px">Geçen ay (' + esc(sn.t) + '): <b>' + sn.n + '/6</b>' + (sn.odul ? ' · ' + esc(sn.odul) : '') + '</div>';
  return h + '<div style="height:6px"></div>' + L.map(function (x) {
    return '<div class="card hd-o"><div class="hd-i">' + (x[2] ? '✅' : x[0]) + '</div><div style="flex:1"><b' + (x[2] ? ' style="opacity:.6;text-decoration:line-through"' : '') + '>' + x[1] + '</b><div class="small muted">' + x[3] + '</div></div></div>';
  }).join('');
}
ROZET.push(['gs3', '🔥', 'Düzenli Yönetici', '3 ay üst üste 4+ görev', function () { return (S.gorevEn || 0) >= 3; }], ['gs6', '🏅', 'Disiplin Abidesi', '6 ay üst üste 4+ görev', function () { return (S.gorevEn || 0) >= 6; }]);

/* ---------- 5) İttifak pazarlığı ---------- */
var IT_TALEP = [
  ['kontenjan', '🪑', 'milletvekili kontenjanı istiyor', 'Listelerde ek aday kontenjanı talep ediyor.', {itibar: -.5, birlik: -1}, 6],
  ['bakanlik', '🏛️', 'bakanlık payı istiyor', 'Kazanırsak yönetimde daha fazla yer talep ediyor.', {itibar: -.3}, 7],
  ['miting', '🎤', 'ortak miting istiyor', 'Bir ilde birlikte miting yapmayı öneriyor.', {kasa: -.6, stres: 1}, 9]
];
function ittifakTalepTick(S) {
  var it = oyuncuIttifak(S), out = [];
  if (S.itTalep) { if (S.ay - S.itTalep.ay >= 3) { S.yk[S.itTalep.id] -= 4; out.push(partiAdi(S, S.itTalep.id) + ' talebine yanıt alamadı ve sitem etti.'); S.itTalep = null; } return out; }
  if (!it || it.uyeler.length < 2 || S.ay < 4 || rnd(S) > 0.22) return out;
  var ids = it.uyeler.filter(function (id) { return id !== S.pid; }); if (!ids.length) return out;
  var t = pick(S, IT_TALEP); S.itTalep = {id: pick(S, ids), tip: t[0], ay: S.ay};
  out.push(partiAdi(S, S.itTalep.id) + ' ' + t[2] + '.'); return out;
}
function itTalepKart() {
  var q = S.itTalep; if (!q) return '';
  var t = IT_TALEP.filter(function (x) { return x[0] === q.tip; })[0];
  return '<div class="card" style="border-color:var(--gold)"><h3>🤝 Pazarlık masası<small>' + Math.max(0, 3 - (S.ay - q.ay)) + ' ay içinde yanıtla</small></h3><div class="small"><b>' + esc(partiAdi(S, q.id)) + '</b> ' + t[2] + '. ' + t[3] + '</div><div class="grid2" style="margin-top:10px"><button class="btn pri" id="it-k">Kabul et<small>yakınlık +' + t[5] + '</small></button><button class="btn" id="it-r">Reddet<small>yakınlık −8</small></button></div></div>';
}
function ittifakBagla() {
  var k = $('#it-k'), r = $('#it-r'); if (!k || !r) return;
  k.onclick = function () { var q = S.itTalep, t = IT_TALEP.filter(function (x) { return x[0] === q.tip; })[0]; fxUygula(S, t[4], 'İttifak'); S.yk[q.id] = clamp(S.yk[q.id] + t[5], -50, 50); tarihceEkle(S, '🤝', partiAdi(S, q.id) + ' talebi kabul edildi.'); S.itTalep = null; toast('Anlaşma sağlandı'); render(); };
  r.onclick = function () { var q = S.itTalep, it = oyuncuIttifak(S); S.yk[q.id] = clamp(S.yk[q.id] - 8, -50, 50); var kal = it && it.ad !== 'Cumhur İttifakı' && yakinlik(S, q.id) < 40 && rnd(S) < 0.35;
    if (kal) { it.uyeler = it.uyeler.filter(function (x) { return x !== q.id; }); tarihceEkle(S, '💔', partiAdi(S, q.id) + ' ittifaktan ayrıldı.'); toast(partiAdi(S, q.id) + ' ittifaktan ayrıldı'); } else toast('Talep reddedildi, yakınlık düştü');
    S.itTalep = null; render(); };
}
var _tIttifak0 = tIttifak; tIttifak = function () { return itTalepKart() + _tIttifak0(); };
var _ittAyril0 = ittifaktanAyril; ittifaktanAyril = function (S) {
  var it = oyuncuIttifak(S), ids = it ? it.uyeler.filter(function (x) { return x !== S.pid; }) : [], ok = _ittAyril0(S);
  if (ok) { ids.forEach(function (id) { S.yk[id] = clamp(S.yk[id] - 8, -50, 50); }); S.stat.birlik = clamp(S.stat.birlik - 2, 0, 100); S.stat.itibar = clamp(S.stat.itibar - 1, 0, 100); S.itTalep = null; }
  return ok;
};

/* ---------- 6) Anket şirketleri ---------- */
var ANKET_SIRKET = [
  ['Bulgu Araştırma', 88, 0, 'Yerinde ve dengeli'],
  ['Kamu-Ar', 74, 1.6, 'İktidara yakın okunuyor'],
  ['Pusula Analiz', 70, -1.4, 'Muhalefete yakın okunuyor'],
  ['Hızlı Anket', 52, 0.8, 'Telefonla, hızlı ama gürültülü']
];
function sirketOku(i, ay) {
  var h = 0, s = ANKET_SIRKET[i][0] + ay + (S.tohum || 0); for (var k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) % 9973;
  var g = (h / 9973 - 0.5) * 2, sap = (100 - ANKET_SIRKET[i][1]) / 100 * 2.2;
  var ben = S.anketOyuncu, yanli = ANKET_SIRKET[i][2] * (govMu(S, S.pid) ? 1 : -1) * 0.35;
  return Math.max(0, ben + g * sap + yanli);
}
function sirketHtml() {
  var rows = ANKET_SIRKET.map(function (a, i) { var v = sirketOku(i, S.ay); return '<div class="row small"><span><b>' + a[0] + '</b><span class="tiny muted"> · ' + a[3] + '</span></span><b>%' + f1(v).replace('.', ',') + '</b></div><div class="tiny muted" style="margin:-2px 0 6px">Güvenilirlik ' + a[1] + '/100</div>'; }).join('');
  return '<div class="eyebrow">Anket şirketleri</div><div class="card"><div class="small muted" style="margin-bottom:8px">Farklı şirketler aynı ay için farklı rakamlar verir. Güvenilirliği yüksek olana daha çok bak. Gerçek durum: <b>%' + f1(S.anketOyuncu).replace('.', ',') + '</b>.</div>' + rows + '</div>';
}
var _medyaHtml0 = medyaHtml; medyaHtml = function () { return _medyaHtml0() + sirketHtml(); };

/* ---------- 8) Grafik ---------- */
var GRF = 'anket';
function grafikKayit(S) {
  S.gGec = S.gGec || []; var a = {}; siralama(S.anket).slice(0, 6).forEach(function (id) { a[id] = S.anket[id]; }); a[S.pid] = S.anketOyuncu;
  S.gGec.push({ay: S.ay, kasa: S.stat.kasa / 1e6, uye: S.stat.uye, tes: teskilatSayisi(S), a: a}); if (S.gGec.length > 72) S.gGec.shift();
}
function cizgiSvg(seriler, esik, bicim) {
  var W = 320, H = 140, n = Math.max.apply(null, seriler.map(function (s) { return s.v.length; })); if (n < 2) return '<div class="small muted">Birkaç ay oynayınca grafik dolacak.</div>';
  var all = [].concat.apply([], seriler.map(function (s) { return s.v; })); if (esik != null) all.push(esik);
  var mn = Math.min.apply(null, all), mx = Math.max.apply(null, all); if (mx - mn < 1e-6) { mx = mn + 1; } var pad = (mx - mn) * 0.1; mn -= pad; mx += pad; if (mn < 0 && Math.min.apply(null, all) >= 0) mn = 0;
  var px = function (i, L) { return 8 + i * (W - 16) / Math.max(1, L - 1); }, py = function (v) { return H - 10 - (H - 20) * (v - mn) / (mx - mn); };
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Grafik">';
  if (mn < 0) s += '<line x1="8" x2="' + (W - 8) + '" y1="' + py(0).toFixed(1) + '" y2="' + py(0).toFixed(1) + '" stroke="rgba(255,255,255,.2)"/>';
  if (esik != null) s += '<line x1="8" x2="' + (W - 8) + '" y1="' + py(esik).toFixed(1) + '" y2="' + py(esik).toFixed(1) + '" stroke="#e8b04b" stroke-dasharray="4 4" opacity=".7"/>';
  seriler.forEach(function (se) { s += '<polyline fill="none" stroke="' + se.renk + '" stroke-width="' + (se.k ? 3.2 : 2) + '" stroke-linejoin="round" opacity="' + (se.k ? 1 : .8) + '" points="' + se.v.map(function (v, i) { return px(i, se.v.length).toFixed(1) + ',' + py(v).toFixed(1); }).join(' ') + '"/>'; if (se.k) s += '<circle cx="' + px(se.v.length - 1, se.v.length).toFixed(1) + '" cy="' + py(se.v[se.v.length - 1]).toFixed(1) + '" r="4.5" fill="' + se.renk + '"/>'; });
  return s + '</svg><div class="row tiny muted"><span>' + bicim(mn < 0 ? mn : Math.max(0, mn)) + '</span><span>' + bicim(mx) + '</span></div>';
}
function tGrafik() {
  var G = (S.gGec || []).slice(-36), st = S.stat, tab = [['anket', 'Anket'], ['kasa', 'Kasa'], ['uye', 'Üye'], ['tes', 'Teşkilat'], ['rakip', 'Rakipler']];
  var h = '<div class="chiprow" style="margin-bottom:10px">' + tab.map(function (t) { return '<button class="cx grf-t' + (GRF === t[0] ? ' on' : '') + '" data-g="' + t[0] + '" style="min-height:40px;padding:6px 14px">' + t[1] + '</button>'; }).join('') + '</div><div class="card">';
  var son, ad;
  if (GRF === 'anket') { var A = (S.anketGecmis || []).slice(-36).map(function (x) { return x.p; }); ad = '📈 Anket seyri'; h += '<b>' + ad + '</b><div class="small muted" style="margin:4px 0 8px">Son ' + A.length + ' ay · kesikli çizgi %7 barajı</div>' + cizgiSvg([{v: A, renk: S.parti.renk, k: 1}], 7, function (v) { return '%' + Math.round(v); }); if (A.length > 1) h += '<div class="row small" style="margin-top:6px"><span>En yüksek</span><b>%' + f1(Math.max.apply(null, A)).replace('.', ',') + '</b></div><div class="row small"><span>Dönem değişimi</span><b class="' + (A[A.length - 1] >= A[0] ? 'good' : 'badc') + '">' + (A[A.length - 1] >= A[0] ? '+' : '') + f1(A[A.length - 1] - A[0]).replace('.', ',') + ' puan</b></div>'; }
  else if (GRF === 'kasa') h += '<b>💰 Kasa (milyon ₺)</b><div class="small muted" style="margin:4px 0 8px">Gelir ve gider dengen</div>' + cizgiSvg([{v: G.map(function (x) { return x.kasa; }), renk: '#e8b04b', k: 1}], null, function (v) { return Math.round(v) + ' M'; });
  else if (GRF === 'uye') h += '<b>👥 Üye sayısı</b><div class="small muted" style="margin:4px 0 8px">Parti tabanın</div>' + cizgiSvg([{v: G.map(function (x) { return x.uye; }), renk: '#4aa3e8', k: 1}], null, function (v) { return v >= 1000 ? Math.round(v / 1000) + ' bin' : Math.round(v); });
  else if (GRF === 'tes') h += '<b>📍 Teşkilatlı il</b><div class="small muted" style="margin:4px 0 8px">Seçime girmek için 41 il · kesikli çizgi</div>' + cizgiSvg([{v: G.map(function (x) { return x.tes; }), renk: '#4cc38a', k: 1}], 41, function (v) { return Math.round(v); });
  else {
    var ids = siralama(S.anket).filter(function (id) { return id !== S.pid; }).slice(0, 3), se = ids.map(function (id) { return {v: G.map(function (x) { return x.a[id] != null ? x.a[id] : 0; }), renk: partiRengi(S, id)}; });
    se.push({v: G.map(function (x) { return x.a[S.pid] != null ? x.a[S.pid] : 0; }), renk: S.parti.renk, k: 1});
    h += '<b>🥊 Rakiplerle karşılaştırma</b><div class="small muted" style="margin:4px 0 8px">Anket payı · kalın çizgi sensin</div>' + cizgiSvg(se, 7, function (v) { return '%' + Math.round(v); }) + '<div class="chiprow" style="margin-top:8px">' + ids.concat([S.pid]).map(function (id) { return '<span class="pill"><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + partiRengi(S, id) + ';margin-right:5px"></i>' + esc(partiAdi(S, id)) + ' %' + f1(S.anket[id]).replace('.', ',') + '</span>'; }).join('') + '</div>';
  }
  h += '</div><div class="card"><b>📋 Şu an</b><div class="row small" style="margin-top:8px"><span>Anket</span><b>%' + f1(S.anketOyuncu).replace('.', ',') + '</b></div><div class="row small"><span>Kasa</span><b>' + para(st.kasa) + '</b></div><div class="row small"><span>Üye</span><b>' + sayi(st.uye) + '</b></div><div class="row small"><span>Teşkilatlı il</span><b>' + teskilatSayisi(S) + '/81</b></div><div class="row small"><span>İtibar · Birlik · Stres</span><b>' + Math.round(st.itibar) + ' · ' + Math.round(st.birlik) + ' · ' + Math.round(st.stres) + '</b></div></div>';
  return h;
}
function grafikBagla() { document.querySelectorAll('.grf-t').forEach(function (b) { b.onclick = function () { GRF = b.dataset.g; render(); }; }); }

/* ---------- Aylık kanca ---------- */
function genisleTick(S) {
  var out = []; try { grafikKayit(S); out = out.concat(gorevAy(S)); out = out.concat(rakipHamle(S)); out = out.concat(ittifakTalepTick(S)); if (typeof derinTick === 'function') out = out.concat(derinTick(S)); } catch (e) { /* oyunu durdurma */ }
  return out;
}

/* ---------- 12) Paylaşım kartı: Türkiye haritası ---------- */
function kartHarita(c) {
  if (typeof GEO === 'undefined' || typeof Path2D === 'undefined') return;
  var sn = S.sonSecim && S.sonSecim.il ? S.sonSecim.il : null, P = sn ? null : paylar(S).il;
  c.save(); var sc = 960 / GEO_W; c.translate(60, 500); c.scale(sc, sc); c.globalAlpha = 0.42;
  for (var i = 0; i < GEO.length; i++) { var o = sn ? sn[i] : P[i], w = siralama(o)[0]; try { c.fillStyle = partiRengi(S, w); c.fill(new Path2D(GEO[i])); c.strokeStyle = 'rgba(8,6,12,.9)'; c.lineWidth = 1.2 / sc; c.stroke(new Path2D(GEO[i])); } catch (e) { /* atla */ } }
  c.restore();
}

/* ---------- 7) Kariyer: bölüm hikâyeleri ve sonuç manşeti ---------- */
var HIKAYE = {
  k1: 'Bir kış akşamı küçük bir salonda on beş kişi toplandı. Herkesin cebinde bir hayal, kasada ise neredeyse hiç para yoktu. Adınızı bile henüz kimse bilmiyor.',
  k2: 'İlk seçimden sonra kimse tam kazanamadı. Meclis dengede, ekonomi kırılgan. Her hamle ya sizi büyütecek ya da hepsini bozacak.',
  k3: 'Fiyatlar uçuyor, sokaklar gergin. İnsanlar yeni bir sese ihtiyaç duyuyor. Fırtınada dümeni tutabilecek misiniz?',
  k4: 'Büyük şehirlerde herkes kendi derdinde; asıl bağ mahallede kuruluyor. Yerel seçimde kazanan, bir sonraki genel seçimin yolunu açar.',
  k5: 'İlk kez oy kullanacak milyonlarca genç, eski siyaset dilini terk etmiş durumda. Onların dilini konuşabilirseniz sandık yeniden şekillenir.',
  k6: 'Ülke ikiye bölünmüş gibi. Her sözünüz bir tarafı coşturuyor, diğerini öfkelendiriyor. Köprü mü kuracaksınız, yoksa bir kanadın sesi mi olacaksınız?',
  k7: 'Büyükşehirler sandığın kalbi. Üç büyük kentte kazanan, ülkenin ruh hâlini belirler. Kampanya kısa, rekabet sert.',
  k8: 'Son sınav: Cumhurbaşkanlığı yarışı. Tek bir turda kazanmak neredeyse imkânsız. Bütün deneyiminizi sahaya sürmenin zamanı geldi.'
};
var _kd0 = kariyerDetay;
kariyerDetay = function (id) { _kd0(id); var m = document.querySelector('.menu h2'); if (m && HIKAYE[id]) { var p = document.createElement('p'); p.className = 'small muted'; p.style.cssText = 'font-style:italic;border-left:3px solid var(--gold,#e8b04b);padding-left:10px;margin:6px 0 10px'; p.textContent = HIKAYE[id]; m.parentNode.insertBefore(p, m.nextSibling); } };
function kariyerManset() {
  var r = S.kariyerSonuc, k = S.kariyer; if (!r || !k || k.id === 'gunluk') return '';
  var ad = esc(S.parti.ad), y = r.yildiz || 0, b = bolumBul(k.id), yerel = b && b.bitis === 'yerel';
  var m = y >= 3 ? ad + ' tarihi bir başarıya imza attı' : y === 2 ? ad + ' güçlü bir sonuçla sahneye çıktı' : y === 1 ? ad + ' kendini kabul ettirdi' : ad + ' bu kez hayal kırıklığı yaşadı';
  var alt = yerel ? r.il + ' ilde zafer, sahada güçlü bir yerel iz.' : r.koltuk + ' sandalye, oy oranı %' + f1(r.oy).replace('.', ',') + (r.rank < 99 ? ', ' + r.rank + '. sıra.' : '.');
  return '<div class="card" style="border-left:4px solid ' + S.parti.renk + '"><div class="tiny muted">SON DAKİKA · ' + esc(tarihYaz(S.tarih)) + '</div><div style="font-family:var(--fd);font-weight:700;font-size:18px;margin:4px 0">' + m + '</div><div class="small muted">' + alt + '</div></div>';
}
var _kbk0 = kariyerBitisKart; kariyerBitisKart = function () { var h = _kbk0(), mn = ''; try { mn = kariyerManset(); } catch (e) { /* manşetsiz devam */ } return mn + h; };
