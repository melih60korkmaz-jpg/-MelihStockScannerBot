/* ===== YARDIM MERKEZİ: üstte "?" düğmesi, ilk girişte tanıtım turu, göstergelere dokununca açıklama ===== */
var TUR_KEY = 'secimsim_tur';
function turGorulmus() { try { return localStorage.getItem(TUR_KEY) === '1'; } catch (e) { return true; } }
function turIsaretle() { try { localStorage.setItem(TUR_KEY, '1'); } catch (e) { /* yok say */ } }

/* ---------- Tanıtım rehberi (Müteahhit'teki gibi): karakter kartı + hedef öğeyi vurgulayan halka, sekmeler sırayla açılır ---------- */
var TUT_EL = null, TUT_RING = null, TUT_CARD = null, TUT_I = 0, TUT_TAB0 = 'genel';
function tabSec(t) { return function () { return document.querySelector('.tab[data-t="' + t + '"]'); }; }
var TUT = [
  {b: 'Hoş geldin Genel Başkan!', m: 'Ben Danışman Selin. Oyunu birkaç adımda tanıtayım. İstediğin an "Atla" diyebilirsin; <b>?</b> düğmesinden turu yeniden izlersin. Oyun bu sırada akmaz.'},
  {b: 'Göstergeler', m: '<b>Anket</b> oy oranın, <b>Kasa</b> paran, <b>Üye</b> taban sayın, <b>Teşkilat</b> örgütlendiğin il, <b>Birlik</b> parti içi uyum. Birine dokunursan ne demek olduğunu görürsün.', tab: 'genel', hedef: function () { return document.querySelector('.stats'); }},
  {b: 'Aksiyonlar', m: 'Her ay <b>3 aksiyon</b> hakkın var: üye kampanyası, teşkilat, miting, TV programı... Birine dokun, etkisini oku ve onayla. Kullanılmayan hak sonraki aya aktarılmaz.', tab: 'genel', hedef: function () { var e = document.querySelector('.aks'); return e && e.parentElement ? e.parentElement : e; }},
  {b: 'Ayı Bitir', m: 'Hakların bitince <b>Ayı Bitir</b>\'e bas. Anketler, kasa ve haberler güncellenir; bazen bir <b>karar kartı</b> çıkar. Seçenekleri dikkatle oku, bazıları risklidir.', tab: 'genel', hedef: function () { return document.querySelector('#ay'); }},
  {b: 'Hedefler', m: 'Ne yapacağını bilmiyorsan buraya bak: danışman sıradaki en önemli işi önerir ve seni doğru aksiyona götürür.', tab: 'hedef', hedef: tabSec('hedef')},
  {b: 'Harita', m: 'Türkiye haritasında partilerin il il gücü. Bir ile dokunursan nüfus, oy dağılımı ve <b>il kampanyası</b> açılır. Üstteki seçeneklerle görünümü değiştirirsin.', tab: 'harita', hedef: tabSec('harita')},
  {b: 'Rakipler', m: 'Diğer partilerin liderleri, güçleri ve hamleleri. Kasası boşalan ya da lideri sarsılan rakip savunmasızdır.', tab: 'rakip', hedef: tabSec('rakip')},
  {b: 'İttifak', m: 'Yakın partilerle ittifak kur; barajı birlikte aşmak kolaylaşır. Ortakların talepleri gelir: kabul et ya da reddet, ikisinin de bedeli var.', tab: 'ittifak', hedef: tabSec('ittifak')},
  {b: 'Medya', m: 'TV programı, röportaj ve manşetler. "Anket şirketleri" aynı ay için farklı rakamlar verir; güvenilirliği yüksek olana bak.', tab: 'medya', hedef: tabSec('medya')},
  {b: 'Kampanya', m: 'Canlı <b>münazara</b>, <b>miting</b> mini oyunu, aylık kampanya bütçesi ve il adayları burada. Seçime yaklaşırken en çok kullanacağın sekme.', tab: 'kampanya', hedef: tabSec('kampanya')},
  {b: 'Görevler ve rozetler', m: 'Her ay 6 basit görev var; tamamlayınca itibar ve bonus kazanırsın. <b>Rozetler</b> uzun vadeli hedeflerin.', tab: 'gorev', hedef: tabSec('gorev')},
  {b: 'Takıldığında: ?', m: 'Ekranın üstündeki <b>?</b> düğmesi bulunduğun sekmeyi açıklar, ipuçları verir ve bu turu tekrar oynatır. Her sekmede çalışır.', tab: 'genel', hedef: function () { return document.querySelector('#yardim-b'); }},
  {b: 'Amacın: barajı geç', m: 'Genel seçimde Meclis\'e girmek için <b>%7 baraj</b> gerekir. Yeni parti için ayrıca <b>41 ilde teşkilat</b> şart. Önce Üye Kampanyası ve Teşkilat Mesaisi ile başla.', tab: 'genel', son: true}
];
function tutBitir(dur) {
  turIsaretle(); if (!TUT_EL) return; var r = TUT_EL; TUT_EL = null; r.classList.add('out'); window.removeEventListener('resize', tutYerlestir); setTimeout(function () { r.remove(); }, 220);
  TAB = TUT_TAB0 || 'genel'; if (S) { render(); if (typeof rehberGuncelle === 'function') setTimeout(rehberGuncelle, 320); }
}
function tutYerlestir() {
  if (!TUT_EL) return; var st = TUT[TUT_I], el = st.hedef ? st.hedef() : null;
  if (!el) { TUT_RING.style.display = 'none'; TUT_EL.classList.add('noring'); TUT_CARD.className = 'tutcard mid'; return; }
  TUT_EL.classList.remove('noring'); try { el.scrollIntoView({block: 'nearest', inline: 'center'}); } catch (e) { /* yok say */ }
  var r = el.getBoundingClientRect(); TUT_RING.style.cssText = 'display:block;left:' + (r.left - 6) + 'px;top:' + (r.top - 6) + 'px;width:' + (r.width + 12) + 'px;height:' + (r.height + 12) + 'px';
  TUT_CARD.className = 'tutcard ' + (r.top + r.height / 2 < innerHeight / 2 ? 'bot' : 'top');
}
function tutCiz() {
  var st = TUT[TUT_I], son = !!st.son;
  if (st.tab && TAB !== st.tab) { TAB = st.tab; render(); var sc = $('#sc'); if (sc) sc.scrollTop = 0; }
  TUT_CARD.innerHTML = '<div class="tutface">' + portreG('Danışman Selin', '#e8b04b', 64) + '</div><div class="tutbody"><small class="tutwho">Danışman Selin · Parti Danışmanı</small><b>' + st.b + '</b><p>' + st.m + '</p><div class="tutbar"><div class="tutdots">' + TUT.map(function (x, k) { return '<i class="' + (k === TUT_I ? 'on' : k < TUT_I ? 'done' : '') + '"></i>'; }).join('') + '</div><span class="sp"></span>' + (son ? '' : '<button class="btn" id="tut-at">Atla</button>') + (TUT_I > 0 && !son ? '<button class="btn" id="tut-g" aria-label="Geri">‹</button>' : '') + '<button class="btn pri" id="tut-i">' + (son ? 'Oyuna başla ▸' : 'İleri ▸') + '</button></div></div>';
  var at = $('#tut-at'); if (at) at.onclick = tutBitir; var g = $('#tut-g'); if (g) g.onclick = function () { TUT_I--; tutCiz(); };
  $('#tut-i').onclick = function () { if (son) tutBitir(); else { TUT_I++; tutCiz(); } };
  setTimeout(tutYerlestir, 80); setTimeout(tutYerlestir, 420); tutYerlestir();
}
function turAc() {
  if (TUT_EL || !S || S.bitti) return; closeSheet(true); TUT_I = 0; TUT_TAB0 = TAB;
  TUT_EL = document.createElement('div'); TUT_EL.className = 'tut'; TUT_EL.setAttribute('role', 'dialog'); TUT_EL.setAttribute('aria-label', 'Oyun rehberi');
  TUT_RING = document.createElement('div'); TUT_RING.className = 'tutring'; TUT_CARD = document.createElement('div'); TUT_CARD.className = 'tutcard mid';
  TUT_EL.appendChild(TUT_RING); TUT_EL.appendChild(TUT_CARD); document.body.appendChild(TUT_EL); window.addEventListener('resize', tutYerlestir); rhKaldir(); tutCiz();
}
function turOtomatik() {
  if (turGorulmus() || TUT_EL || !S || S.bitti || S.ay > 3 || sheetEl || document.querySelector('.splash,.mt,.rh')) return;
  if (navigator.webdriver && !/tur=1/.test(location.search)) return; turAc();
}

/* ---------- Sekme yardımları ---------- */
var YARDIM = {
  genel: ['Genel', 'Oyunun ana ekranı: bu ayın aksiyonları, gündem ve takvim burada.', ['Her ay 3 aksiyon hakkın var; birine dokun, bilgileri oku ve onayla.', '3 hakkı kullanınca sağ alttaki <b>Ayı Bitir</b>\'e bas.', 'Üstteki "İlk adımlar" kutusu yeni oyuncu için yapılacakları sıralar.'], 'İlk aylarda ucuz ve kalıcı etkili aksiyonlar seç: Üye Kampanyası ve Teşkilat Mesaisi.'],
  hedef: ['Hedefler', 'Danışmanın sıradaki en önemli işi önerir.', ['"Danışman önerisi" kartlarındaki <b>Aksiyona git</b> seni doğru aksiyona götürür.', '"İlerleme" bölümü teşkilat, anket, üye, itibar, birlik ve stresin hedefe ne kadar yakın olduğunu gösterir.', 'Takvim kutusu seçime kaç ay kaldığını söyler.'], 'Ne yapacağını bilmiyorsan önce buraya bak.'],
  merkez: ['Merkez', 'Kariyer ilerlemen ve rozet özeti.', ['Kariyer modunda hangi bölümde olduğunu ve yıldızlarını görürsün.', 'Rozet koleksiyonunun kaçta kaçını tamamladığını gösterir.'], 'Rozetlerin tamamı için <b>Rozetler</b> sekmesine bak.'],
  yonetim: ['Yönetim', 'Parti kadron: genel başkan yardımcıları, sözcü, sekreter ve diğerleri.', ['Her kadro üyesinin memnuniyeti ve hırsı vardır.', 'Memnuniyeti düşen kadro parti birliğini bozabilir.', 'Üyelere dokunup durumlarına bakabilirsin.'], 'Birlik düşüyorsa kadro memnuniyetine bak.'],
  parti: ['Parti', 'Seçmen gruplarının durumu ve partinin genel görünümü.', ['9 seçmen grubu var: gençler, emekliler, işçiler, çiftçiler, memurlar, öğrenciler, esnaf, muhafazakârlar ve milliyetçiler.', 'Her grubun kaygısı farklıdır; doğru aksiyon doğru gruba yarar.'], 'Düşük grupları bulup onlara uygun aksiyon seç.'],
  anket: ['Anket', 'Ulusal ankette tüm partilerin oy oranı ve sıralaması.', ['Senin payın ve sıran en üstte görünür.', 'Anket her ay ay sonunda güncellenir.', 'Kesikli çizgi %7 barajını gösterir.'], 'Medya sekmesinde farklı anket şirketlerinin rakamları da var.'],
  karargah: ['Karargâh', 'Seçim stratejisi paneli: iller kazanılabilir, savunulacak, güvenli ya da zayıf olarak ayrılır.', ['Hedef illere teşkilat ve kampanya yönlendirirsin.', 'Seçime yaklaşırken en çok burayı kullanırsın.'], 'Kazanılabilir illere odaklanmak en verimli yoldur.'],
  belediye: ['Belediye', 'Yönettiğin belediyeler ve yerel seçim durumun.', ['Yerel seçimde kazandığın illeri görürsün.', 'Belediyeler kaynak ve itibar getirir; kötü yönetim itibar kaybettirir.'], 'Yerel seçim öncesi teşkilatı güçlendir.'],
  harita: ['Harita', 'Türkiye haritasında partilerin il il gücü.', ['Üstteki seçeneklerle Anket, Son seçim, Teşkilat, Oy payım, Belediye, Aylık değişim ve Rakip kalesi görünümlerini değiştirirsin.', 'İki parmakla yakınlaştır, sürükle. Bir ile dokununca il kartı açılır.', 'İl kartında nüfus, oy dağılımı, bölge profili ve "İl kampanyası" aksiyonu vardır.'], 'Rengi soluk iller zayıf noktalarındır.'],
  iller: ['İller', 'Tüm illerin listesi: milletvekili sayısı, teşkilatın ve anketin.', ['Listedeki bir ile dokununca il kartı açılır.', 'En çok milletvekili çıkaran büyük illere öncelik vermek mantıklıdır.'], 'İstanbul, Ankara ve İzmir seçim sonucunu en çok etkiler.'],
  ittifak: ['İttifak', 'Diğer partilerle ittifak kurar, yönetirsin.', ['Partilerin yakınlığına bakıp davet edersin (1 aksiyon).', 'Ortaklar zaman zaman talepte bulunur: kontenjan, bakanlık, ortak miting. Kabul ya da reddet.', 'Reddetmek yakınlığı düşürür; yakınlık çok düşerse ortak ayrılabilir.'], 'İttifak barajı geçmeni kolaylaştırır ama pazarlık gerektirir.'],
  rakip: ['Rakipler', 'Diğer partilerin liderleri, güçleri ve hamleleri.', ['"Son hamleler" listesi rakiplerin yaptıklarını gösterir.', 'Kasası boşalan ya da lideri sarsılan rakip savunmasızdır.', 'Sana kini yüksek rakip sert saldırı yapabilir.'], 'Savunmasız rakibe karşı hamle fırsatı kollayın.'],
  secim: ['Seçim', 'Seçime kalan süre ve "bugün seçim olsa" tahmini.', ['Tahmini sandalye dağılımını görürsün.', 'Son genel seçimin sonuçları varsa altında listelenir.', 'Seçime girmek için 41 ilde teşkilat gerekir.'], 'Seçime 3 ay kala kampanya aksiyonları açılır.'],
  meclis: ['Meclis', 'Meclis dağılımı, hükümet ve yasa teklifleri.', ['600 milletvekilliği koltuk dağılımı görünür.', 'Yasa teklifi vermek için aksiyon kullanırsın.', 'Muhalefette isen eylem ve erken seçim baskısı yapabilirsin.'], 'Çoğunluk için 301 milletvekili gerekir.'],
  ekonomi: ['Ekonomi', 'Enflasyon, faiz, dolar ve ekonominin genel durumu.', ['Yüksek enflasyon iktidarı zorlar, muhalefete fırsat verir.', '"Parti finansı" kasanın gelir-gider dengesini gösterir.'], 'Kasa eksiye düşmesin; itibarı zedeler.'],
  medya: ['Medya', 'Medya aksiyonları, manşetler, yayın organları ve anket şirketleri.', ['TV programı, röportaj gibi aksiyonlar burada.', 'Yayın organlarının eğilimi ve etkisi farklıdır.', '"Anket şirketleri" aynı ay için farklı rakamlar verir; güvenilirliği yüksek olana bak.'], 'Asılsız haber çıkarsa yanıt vermeyi unutma.'],
  lider: ['Lider', 'Genel başkan olarak senin durumun: sağlık, stres, siyasi imza ve hafıza.', ['Stres 65\'i aşarsa verimin düşer; "Kısa Tatil" ile düşür.', 'Siyasi hafıza geçmiş kararlarının yankısını gösterir.'], 'Stresi yüksek tutma; hak sayını azaltır.'],
  takvim: ['Takvim', 'Yaklaşan seçimler ve kurultay tarihleri.', ['Kaç ay kaldığını görürsün.', 'Kurultay yaklaşırken birliği yüksek tut.'], 'Seçim öncesi ayları teşkilat ve kampanya için ayır.'],
  tarihce: ['Tarihçe', 'Aldığın kararların ve yaşanan olayların kaydı.', ['Karar geçmişi, siyasi sözler ve seçim arşivi burada.', 'Verdiğin sözlerin vadesi dolarsa tutulup tutulmadığı görünür.'], 'Tutamayacağın söz verme; itibar düşer.'],
  gorev: ['Görevler', 'Bu ay için 6 basit hedef.', ['Her görev tamamlanınca ay sonunda +0,25 itibar kazanırsın.', '5 ve üstü görev +1,5 M ₺ bonus, 4 ve üstü ise seri sayar.'], 'Düzenli seri rozet kazandırır.'],
  kampanya: ['Kampanya', 'Mini oyunlar ve kampanya planı.', ['<b>Canlı münazara:</b> 3 soru, her birinde bir cevap seç; veriyle konuşmak güven, sert çıkmak coşku verir ama risklidir.', '<b>Miting:</b> Çubuk yeşilde iken ALKIŞ\'a bas, 3 tur.', '<b>Aylık bütçe:</b> Her ay kasadan düşen bir plan seç.', '<b>Aday seçimi:</b> Teşkilatlı büyük illere aday göster; oy payı artar.'], 'Seçime yaklaşırken bütçe planını Medya ya da Saha ağırlıklı yap.'],
  yetenek: ['Yetenek', 'Oyunlar arası kalıcı bonuslar.', ['Oynadığın her ay +1 XP, her genel seçim +25 XP kazanırsın.', 'XP ile yetenek satın alırsın; yeni oyunlarda başlangıç bonusu olarak gelir.'], 'Bonuslar yalnızca bu telefonda saklanır.'],
  grafik: ['Grafik', 'Anket, kasa, üye ve teşkilat grafikleri; rakiplerle karşılaştırma.', ['Üstteki seçeneklerden grafik türünü seç.', '"Rakipler" sekmesi ilk 3 rakiple seni aynı grafikte gösterir.'], 'Gidişatı izleyerek ne zaman hızlanman gerektiğini anlarsın.'],
  notlar: ['Notlar', 'Kendi planlarını yazdığın defter.', ['Bir not yaz ve <b>Ekle</b>\'ye bas.', 'Kayıtla birlikte saklanır; çöp kutusuyla silinir.'], 'Mesela: "Mayıs\'ta İzmir\'e miting".'],
  rozet: ['Rozetler', 'Tüm rozet koleksiyonu.', ['Kazanılanlar renkli, kazanılmayanlar soluk görünür.', 'Rozet koşulunu okuyup hedef koyabilirsin.'], 'Rozetler oyuna uzun vadeli hedef katar.'],
  sozluk: ['Rehber', 'Terimler, aksiyonlar, ipuçları ve sık sorulan sorular.', ['"Kavramlar" bölümü Baraj, Teşkilat, İvme gibi terimleri açıklar.', 'Başlığa dokunarak aç/kapat.'], 'Bir terim anlaşılmazsa önce buraya bak.'],
  kayit: ['Kayıt', 'Oyunun kaydı ve kariyer profilin.', ['Oyun otomatik kaydedilir; buradan elle kayıt alabilir ve yükleyebilirsin.', 'Kariyer profilinde yıldızların ve rozetin görünür.'], 'Riskli bir karar öncesi elle kayıt almak iyi fikirdir.'],
  hakkinda: ['Hakkında', 'Uygulama bilgisi, geri bildirim ve arkadaş daveti.', ['Geri bildirimi oradan gönderebilirsin.', 'Gizlilik politikası ve destek sayfasına bağlantılar var.'], 'Hata görürsen geri bildirim gönder.']
};
var STAT_TERIM = {
  'Anket': ['Anket', 'Ulusal ankette partinin oy oranı ve sıran. Genel seçimde Meclis\'e girmek için %7 barajını geçmen gerekir. Anket her ay güncellenir.'],
  'Kasa': ['Kasa', 'Partinin parası. Üyelik ve itibardan gelir gelir; teşkilat ve seçim yaklaştıkça gider artar. Eksiye düşmek itibarı ve birliği zedeler.'],
  'Üye': ['Üye', 'Partiye kayıtlı üye sayısı. Üyeler aidat öder ve sahada çalışır. "Üye Kampanyası" ve itibar üye sayısını artırır.'],
  'Teşkilat': ['Teşkilat', 'Partinin örgütlendiği il sayısı. Yeni bir parti seçime girmek için en az 41 ilde teşkilat kurmalıdır. Teşkilat oy ve üye getirir.'],
  'Birlik': ['Birlik', 'Parti içi uyum (0–100). Düşük birlik kurultayda ve krizlerde seni zorlar. "Kadro Toplantısı" ve doğru kararlar birliği yükseltir.']
};

function yardimSheet(ilk) {
  var id = TAB, h = YARDIM[id], t = TABLAR.filter(function (x) { return x[0] === id; })[0], html = '<div class="lab">Yardım</div>';
  if (h) html += '<h2>' + (t ? t[2] + ' ' : '') + h[0] + '</h2><p>' + h[1] + '</p><div class="eyebrow">Nasıl kullanılır?</div><div class="card"><ul class="yd-ul">' + h[2].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div><div class="card" style="border-color:var(--gold)">💡 <b>İpucu:</b> ' + h[3] + '</div>';
  else html += '<h2>Yardım</h2><p>Bu ekranda yardım yok. Aşağıdaki konulara bakabilirsin.</p>';
  html += '<div class="eyebrow">Daha fazlası</div><button class="btn" id="yd-tur">🎬 Rehberi yeniden izle</button><button class="btn" id="yd-nasil">📖 Nasıl oynanır?</button><button class="btn" id="yd-soz">📘 Terimler ve sık sorulanlar</button><div class="eyebrow">Tüm sekmeler</div><div class="chiprow">' + TABLAR.filter(function (x) { return YARDIM[x[0]]; }).map(function (x) { return '<button class="cx" data-y="' + x[0] + '">' + x[2] + ' ' + x[1] + '</button>'; }).join('') + '</div><button class="btn ghost" id="k" style="margin-top:12px">Kapat</button>';
  sheet(html); $('#k').onclick = function () { closeSheet(true); };
  $('#yd-tur').onclick = function () { closeSheet(true); turAc(); };
  $('#yd-nasil').onclick = function () { closeSheet(true); yardim(); };
  $('#yd-soz').onclick = function () { closeSheet(true); TAB = 'sozluk'; render(); };
  document.querySelectorAll('[data-y]').forEach(function (b) { b.onclick = function () { var y = b.dataset.y; closeSheet(true); TAB = y; render(); yardimSheet(); }; });
}
function terimSheet(ad) {
  var d = STAT_TERIM[ad]; if (!d) return;
  sheet('<div class="lab">Gösterge</div><h2>' + d[0] + '</h2><p>' + d[1] + '</p><button class="btn ghost" id="k">Tamam</button>'); $('#k').onclick = function () { closeSheet(true); };
}
function yardimBagla() {
  if (!S) return;
  turOtomatik();
  var ib = document.querySelector('.ib'), ay = $('#ayar');
  if (ib && ay && !$('#yardim-b')) { var b = document.createElement('button'); b.id = 'yardim-b'; b.className = 'yd-b'; b.setAttribute('aria-label', 'Yardım'); b.textContent = '?'; b.onclick = function () { yardimSheet(); }; ib.insertBefore(b, ay); }
  document.querySelectorAll('.stats .st').forEach(function (e) { var l = e.querySelector('span'); if (!l) return; var ad = l.textContent.trim(); if (!STAT_TERIM[ad]) return; e.setAttribute('role', 'button'); e.style.cursor = 'pointer'; e.onclick = function () { terimSheet(ad); }; });
}
