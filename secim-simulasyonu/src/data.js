'use strict';
/* ===== VERİ: iller, partiler, seçmen grupları, ideolojiler, kartlar ===== */
var BOLGE = {M:'Marmara',E:'Ege',A:'Akdeniz',I:'İç Anadolu',K:'Karadeniz',D:'Doğu Anadolu',G:'Güneydoğu'};
// plaka, ad, nüfus (bin, yaklaşık), bölge, boylam, enlem
var IL_HAM = [
[1,'Adana',2270,'A',35.3,37.0],[2,'Adıyaman',635,'G',38.3,37.8],[3,'Afyonkarahisar',745,'E',30.5,38.7],[4,'Ağrı',510,'D',43.0,39.7],
[5,'Amasya',330,'K',35.8,40.65],[6,'Ankara',5780,'I',32.85,39.9],[7,'Antalya',2690,'A',30.7,36.9],[8,'Artvin',170,'K',41.8,41.2],
[9,'Aydın',1130,'E',27.8,37.85],[10,'Balıkesir',1260,'M',27.9,39.6],[11,'Bilecik',225,'M',30.0,40.1],[12,'Bingöl',285,'D',40.5,38.9],
[13,'Bitlis',350,'D',42.1,38.4],[14,'Bolu',320,'K',31.6,40.7],[15,'Burdur',275,'A',30.3,37.7],[16,'Bursa',3210,'M',29.1,40.2],
[17,'Çanakkale',570,'M',26.4,40.1],[18,'Çankırı',195,'I',33.6,40.6],[19,'Çorum',530,'K',35.0,40.55],[20,'Denizli',1060,'E',29.1,37.8],
[21,'Diyarbakır',1800,'G',40.2,37.9],[22,'Edirne',410,'M',26.6,41.7],[23,'Elazığ',590,'D',39.2,38.7],[24,'Erzincan',240,'D',39.5,39.75],
[25,'Erzurum',760,'D',41.3,39.9],[26,'Eskişehir',930,'I',30.5,39.8],[27,'Gaziantep',2200,'G',37.4,37.1],[28,'Giresun',450,'K',38.4,40.9],
[29,'Gümüşhane',145,'K',39.5,40.45],[30,'Hakkâri',290,'G',43.7,37.6],[31,'Hatay',1700,'A',36.2,36.4],[32,'Isparta',445,'A',30.3,37.8],
[33,'Mersin',1930,'A',34.6,36.8],[34,'İstanbul',15700,'M',29.0,41.0],[35,'İzmir',4480,'E',27.1,38.4],[36,'Kars',280,'D',43.1,40.6],
[37,'Kastamonu',380,'K',33.8,41.4],[38,'Kayseri',1450,'I',35.5,38.7],[39,'Kırklareli',370,'M',27.2,41.7],[40,'Kırşehir',245,'I',34.15,39.15],
[41,'Kocaeli',2100,'M',29.9,40.8],[42,'Konya',2300,'I',32.5,37.9],[43,'Kütahya',575,'E',29.9,39.4],[44,'Malatya',810,'D',38.3,38.35],
[45,'Manisa',1470,'E',27.4,38.6],[46,'Kahramanmaraş',1180,'A',36.9,37.6],[47,'Mardin',870,'G',40.7,37.3],[48,'Muğla',1060,'E',28.4,37.2],
[49,'Muş',400,'D',41.5,38.9],[50,'Nevşehir',310,'I',34.7,38.6],[51,'Niğde',365,'I',34.7,37.95],[52,'Ordu',760,'K',37.9,40.98],
[53,'Rize',350,'K',40.5,41.0],[54,'Sakarya',1100,'M',30.4,40.7],[55,'Samsun',1380,'K',36.3,41.3],[56,'Siirt',335,'G',41.9,37.9],
[57,'Sinop',220,'K',35.15,42.0],[58,'Sivas',640,'I',37.0,39.75],[59,'Tekirdağ',1190,'M',27.5,41.0],[60,'Tokat',600,'K',36.55,40.3],
[61,'Trabzon',830,'K',39.7,41.0],[62,'Tunceli',85,'D',39.5,39.1],[63,'Şanlıurfa',2230,'G',38.8,37.2],[64,'Uşak',375,'E',29.4,38.7],
[65,'Van',1110,'D',43.4,38.5],[66,'Yozgat',420,'I',34.8,39.8],[67,'Zonguldak',590,'K',31.8,41.45],[68,'Aksaray',430,'I',34.0,38.4],
[69,'Bayburt',82,'K',40.2,40.25],[70,'Karaman',255,'I',33.2,37.2],[71,'Kırıkkale',280,'I',33.5,39.85],[72,'Batman',660,'G',41.1,37.9],
[73,'Şırnak',570,'G',42.5,37.5],[74,'Bartın',200,'K',32.3,41.6],[75,'Ardahan',93,'D',42.7,41.1],[76,'Iğdır',205,'D',44.0,39.9],
[77,'Yalova',300,'M',29.3,40.65],[78,'Karabük',250,'K',32.6,41.2],[79,'Kilis',150,'G',37.1,36.7],[80,'Osmaniye',560,'A',36.2,37.1],
[81,'Düzce',410,'K',31.2,40.8]
];

var ILLER = (function () {
  var toplam = 0, i;
  IL_HAM.forEach(function (r) { toplam += r[2]; });
  var q = 600 / toplam, mv = [], top = 0;
  IL_HAM.forEach(function (r) { var s = Math.max(1, Math.floor(r[2] * q)); mv.push(s); top += s; });
  var kalan = 600 - top, guard = 0;
  while (kalan !== 0 && guard++ < 2000) {
    var best = -1, bv = kalan > 0 ? -1e9 : 1e9;
    for (i = 0; i < 81; i++) {
      var f = IL_HAM[i][2] * q - mv[i];
      if (kalan > 0 && f > bv) { bv = f; best = i; }
      if (kalan < 0 && mv[i] > 1 && f < bv) { bv = f; best = i; }
    }
    mv[best] += kalan > 0 ? 1 : -1; kalan += kalan > 0 ? -1 : 1;
  }
  // kartogram yerleşimi (yaklaşık coğrafi karo harita)
  var taken = {}, pos = {};
  IL_HAM.slice().sort(function (a, b) { return b[2] - a[2]; }).forEach(function (r) {
    var c0 = Math.max(0, Math.min(19, Math.round(r[4] - 26))), r0 = Math.max(0, Math.min(9, Math.round((42.1 - r[5]) / 0.62)));
    var best2 = null;
    for (var d = 0; d < 8 && !best2; d++) {
      var cand = [];
      for (var dx = -d; dx <= d; dx++) for (var dy = -d; dy <= d; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
        var c = c0 + dx, rr = r0 + dy;
        if (c < 0 || c > 19 || rr < 0 || rr > 11 || taken[c + ',' + rr]) continue;
        cand.push([dx * dx + dy * dy * 1.6, c, rr]);
      }
      if (cand.length) { cand.sort(function (a, b) { return a[0] - b[0]; }); best2 = cand[0]; }
    }
    taken[best2[1] + ',' + best2[2]] = 1; pos[r[0]] = [best2[1], best2[2]];
  });
  return IL_HAM.map(function (r, k) {
    return {id: r[0], ad: r[1], nufus: r[2], bolge: r[3], mv: mv[k], c: pos[r[0]][0], r: pos[r[0]][1]};
  });
})();
var NUFUS_TOPLAM = ILLER.reduce(function (a, b) { return a + b.nufus; }, 0);

// x: sol(-1)–sağ(+1) ekseni. baz: ulusal başlangıç oyu (%)
var PARTILER = [
  {id:'AK',ad:'AK Parti',renk:'#f0a030',baz:33.0,x:.65,ideo:'muh',zor:'kolay'},
  {id:'CHP',ad:'CHP',renk:'#e0344c',baz:25.5,x:-.45,ideo:'sd',zor:'kolay'},
  {id:'MHP',ad:'MHP',renk:'#b3202a',baz:9.5,x:.75,ideo:'mil',zor:'orta'},
  {id:'DEM',ad:'DEM Parti',renk:'#8e4fd0',baz:8.8,x:-.7,ideo:'sol',zor:'orta'},
  {id:'IYI',ad:'İYİ Parti',renk:'#3b9ee0',baz:8.0,x:.35,ideo:'msag',zor:'orta'},
  {id:'YRP',ad:'Yeniden Refah',renk:'#2f9e5b',baz:3.0,x:.8,ideo:'muh',zor:'zor'},
  {id:'ZAFER',ad:'Zafer Partisi',renk:'#9b1b30',baz:2.4,x:.7,ideo:'mil',zor:'zor'},
  {id:'TIP',ad:'TİP',renk:'#d63b3b',baz:1.6,x:-.9,ideo:'sol',zor:'zor'},
  {id:'SAADET',ad:'Saadet',renk:'#cfb02a',baz:1.2,x:.6,ideo:'muh',zor:'zor'},
  {id:'DEVA',ad:'DEVA',renk:'#2b88d8',baz:1.0,x:.2,ideo:'lib',zor:'zor'},
  {id:'GP',ad:'Gelecek',renk:'#2aa8a8',baz:.6,x:.15,ideo:'msag',zor:'zor'},
  {id:'HUDA',ad:'HÜDA PAR',renk:'#3f9f4a',baz:.7,x:.85,ideo:'muh',zor:'zor'},
  {id:'BBP',ad:'BBP',renk:'#a02828',baz:.9,x:.8,ideo:'mil',zor:'zor'},
  {id:'DP',ad:'DP',renk:'#e5622e',baz:.3,x:.4,ideo:'msag',zor:'zor'},
  {id:'DSP',ad:'DSP',renk:'#e0457a',baz:.3,x:-.1,ideo:'sd',zor:'zor'},
  {id:'ANAHTAR',ad:'Anahtar',renk:'#7a8bd6',baz:.5,x:.3,ideo:'lib',zor:'zor'},
  {id:'VATAN',ad:'Vatan',renk:'#b04a4a',baz:.2,x:-.3,ideo:'mil',zor:'zor'},
  {id:'DIGER',ad:'Diğer',renk:'#6b7080',baz:1.0,x:0,ideo:'msag',zor:'zor'}
];
function partiBul(id) { for (var i = 0; i < PARTILER.length; i++) if (PARTILER[i].id === id) return PARTILER[i]; return null; }
function partiIdx(id) { for (var i = 0; i < PARTILER.length; i++) if (PARTILER[i].id === id) return i; return -1; }

var BOLGE_FIT = {
  AK:{M:.9,E:.6,A:.85,I:1.2,K:1.4,D:1.2,G:1.0}, CHP:{M:1.1,E:1.7,A:1.3,I:.9,K:.8,D:.3,G:.2},
  DEM:{M:.5,E:.3,A:.8,I:.2,K:.05,D:2.4,G:3.5}, MHP:{M:.8,E:.9,A:1.2,I:1.3,K:1.1,D:.9,G:.5},
  IYI:{M:1.1,E:1.2,A:1.0,I:1.1,K:.9,D:.6,G:.2}, YRP:{M:.9,E:.7,A:1,I:1.1,K:1.1,D:1.2,G:1.6},
  ZAFER:{M:1.2,E:1,A:1.1,I:1,K:.9,D:.4,G:.2}, HUDA:{M:.2,E:.1,A:.2,I:.2,K:.1,D:2,G:3},
  TIP:{M:1.5,E:1.3,A:1,I:.6,K:.6,D:.6,G:.4}, SAADET:{M:.9,E:.7,A:.9,I:1.3,K:1.2,D:1,G:.8}
};
var IL_FIT = {62:{CHP:2.5,DEM:3},8:{CHP:1.6},22:{CHP:1.8},39:{CHP:1.8},59:{CHP:1.6},35:{CHP:1.2},63:{YRP:1.8},58:{MHP:1.3},47:{HUDA:1.5}};

var GRUPLAR = [
  {id:'gencler',ad:'Gençler',kaygi:'İşsizlik, özgürlük, gelecek kaygısı'},
  {id:'emekliler',ad:'Emekliler',kaygi:'Emekli maaşı, sağlık, enflasyon'},
  {id:'isciler',ad:'İşçiler',kaygi:'Asgari ücret, sendika, iş güvencesi'},
  {id:'ciftciler',ad:'Çiftçiler',kaygi:'Mazot, gübre, taban fiyat'},
  {id:'memurlar',ad:'Memurlar',kaygi:'Maaş zammı, kadro, özlük hakları'},
  {id:'ogrenciler',ad:'Öğrenciler',kaygi:'Yurt, burs, eğitim kalitesi'},
  {id:'esnaf',ad:'Esnaf',kaygi:'Vergi, kira, kredi faizi'},
  {id:'muhafazakarlar',ad:'Muhafazakârlar',kaygi:'Din, aile, değerler'},
  {id:'milliyetciler',ad:'Milliyetçiler',kaygi:'Güvenlik, terörle mücadele, bölge'}
];

var IDEOLOJILER = [
  {id:'sd',ad:'Sosyal demokrat',x:-.45,grup:[55,45,55,35,50,60,40,25,25],fit:{M:1.2,E:1.5,A:1.2,I:.8,K:.8,D:.8,G:.6}},
  {id:'sol',ad:'Sosyalist / sol',x:-.85,grup:[55,40,70,40,45,65,30,15,15],fit:{M:1.1,E:1.2,A:1.1,I:.6,K:.6,D:1.2,G:1.2}},
  {id:'lib',ad:'Liberal',x:.15,grup:[60,35,40,35,45,60,55,25,25],fit:{M:1.4,E:1.3,A:1.1,I:.8,K:.6,D:.5,G:.5}},
  {id:'msag',ad:'Merkez sağ',x:.4,grup:[40,50,45,50,45,40,55,50,40],fit:{M:1.1,E:.9,A:1.0,I:1.2,K:1.2,D:.9,G:.8}},
  {id:'muh',ad:'Muhafazakâr demokrat',x:.65,grup:[35,55,40,60,45,30,55,75,40],fit:{M:.9,E:.6,A:.9,I:1.3,K:1.4,D:1.1,G:1.0}},
  {id:'mil',ad:'Milliyetçi',x:.75,grup:[40,45,40,50,45,40,45,50,75],fit:{M:.9,E:.8,A:1.1,I:1.4,K:1.2,D:.9,G:.5}}
];
function ideoBul(id) { for (var i = 0; i < IDEOLOJILER.length; i++) if (IDEOLOJILER[i].id === id) return IDEOLOJILER[i]; return IDEOLOJILER[0]; }

var ZORLUKLAR = {
  kolay:{ad:'Kolay',not:'Bol kasa, güçlü başlangıç. Hatalar affedilir.',kasa:7,tohum:3.8,il:12},
  orta:{ad:'Orta',not:'Dengeli. Baraj için ciddi çalışma ister.',kasa:5.5,tohum:3.0,il:10},
  zor:{ad:'Zor',not:'Dar bütçe, tanınmamış bir parti.',kasa:4.0,tohum:2.8,il:7},
  acimasiz:{ad:'Acımasız',not:'Merhamet yok. Her borç ve gaf pahalı.',kasa:2.8,tohum:2.5,il:5}
};
var STILLER = {
  katilimci:{ad:'Katılımcı',not:'Parti içi birlik güçlenir, kampanya etkisi biraz düşer.',drift:.95,itibar:1,birlik:1.4,kasa:1},
  karizmatik:{ad:'Karizmatik',not:'İtibar hızlı artar, stres de.',drift:1.05,itibar:1.35,birlik:.8,kasa:1},
  teknokrat:{ad:'Teknokrat',not:'Harcamalar verimli, popülerlik yavaş.',drift:1,itibar:.85,birlik:1,kasa:.8},
  otoriter:{ad:'Otoriter',not:'Hızlı sonuç, ama birlik kolay çatlar.',drift:1.15,itibar:1,birlik:.55,kasa:1}
};
var RENKLER = ['#e63b5f','#f0a030','#2f9e5b','#3b9ee0','#8e4fd0','#2aa8a8','#d9d14a','#e5622e'];

var BOLGE_SIRA = ['M','E','A','I','K','D','G'];

var AD_L = ['Ahmet','Mehmet','Mustafa','Ali','Hasan','Selim','Kemal','Cem','Emre','Burak','Murat','Okan','Serkan','Tolga','Ayşe','Fatma','Zeynep','Elif','Selin','Derya','Burcu','Gül','Nihan','Pınar','Seda','Esra','Leyla','Hande'];
var SOYAD_L = ['Aksoy','Yıldız','Demirci','Kaya','Çelik','Arslan','Doğan','Kurt','Özkan','Erdem','Tuncer','Sönmez','Aydın','Polat','Karaca','Güneş','Bozkurt','Taşkın','Ekinci','Uysal','Başaran','Coşkun','Vural','Akgül'];
var KADRO_ROL = ['Genel Başkan Yardımcısı','Genel Sekreter','Parti Sözcüsü','Mali İşler Sorumlusu','Teşkilat Başkanı','Grup Başkanvekili','Kadın Kolları Başkanı','Gençlik Kolları Başkanı'];

var MEDYA_HAM = [
  {ad:'Devlet Televizyonu',erisim:88,guven:42,yakin:-30},
  {ad:'Havuz Ana Haber',erisim:78,guven:29,yakin:-45},
  {ad:'Ulusal Haber Ajansı',erisim:70,guven:55,yakin:0},
  {ad:'Merkez TV',erisim:66,guven:58,yakin:10},
  {ad:'Halk Gazetesi',erisim:42,guven:61,yakin:25},
  {ad:'Bağımsız Dijital',erisim:38,guven:72,yakin:15}
];

var HABER_HAVUZU = [
  'Meclis yeni haftaya yoğun bir gündemle başladı.','Borsa haftayı dalgalı bir seyirle kapattı.','Belediyeler arası ulaşım protokolü imzalandı.',
  'Esnaf odaları kira artışlarına karşı ortak toplantı yaptı.','Üniversite öğrencileri yurt kontenjanı için imza kampanyası başlattı.',
  'Çiftçiler hasat öncesi destek açıklamasını bekliyor.','Sendikalar toplu görüşme takvimini kamuoyuna duyurdu.',
  'Büyükşehir belediyeleri ortak enerji tasarrufu planı hazırladı.','Anket kuruluşları seçmenin kararsız oranının yüksek olduğunu bildirdi.',
  'Sosyal medyada bir siyasi etiket gün boyu gündemde kaldı.'
];

/* ===== KARTLAR ===== */
function O(t, fx, s, risk) { return {t: t, fx: fx || {}, s: s || '', risk: risk || null}; }
var KARTLAR = [
 {id:'esnaf',baslik:'Esnaf Odasının Çağrısı',metin:'Kira artışları çarşıyı bunaltmış durumda. Oda başkanı ortak bir açıklama yapmanı ve hafta sonu esnafla buluşmanı istiyor.',sec:[
  O('İmzayı at, buluşmaya git',{grup:{esnaf:7},drift:.18,stres:3,itibar:1},'Çarşı seni alkışladı; ama gündemin diğer işleri biraz aksadı.'),
  O('Açıklamaya katıl, buluşmayı ertele',{grup:{esnaf:3},drift:.07},'Ölçülü bir destek verdin. Kimse küsmedi, kimse coşmadı.'),
  O('Bu başlıkta taraf olma',{grup:{esnaf:-4},itibar:-1},'Oda başkanı kararını not aldı.')]},
 {id:'nakil',baslik:'Vekil Nakli Teklifi',kosul:function(S){return S.mod==='yeni'&&S.ay>=2;},metin:'Meclis\'te bağımsız çalışan bir milletvekili partine geçmek istiyor. Tecrübeli biri, ama geçmişi tartışmalı.',sec:[
  O('Rozeti kendin tak',{vekil:1,itibar:-2,drift:.25,birlik:-2},'Meclis\'te ilk sandalyen oldu. Basın geçmişini kazıyor.'),
  O('Danışman sıfatıyla yanında tut',{drift:.08},'İş birliği başladı, rozet takılmadı.'),
  O('Kapıyı kapat',{itibar:2,birlik:2},'İlkeli duruşun parti içinde olumlu karşılandı.')]},
 {id:'gaf',baslik:'Açık Mikrofon',metin:'Bir toplantıdan sonra mikrofon açık kalmış. Söylediğin esprili ama kırıcı bir cümle akşam haberlerinde dönüyor.',sec:[
  O('Doğrudan özür dile',{itibar:1,stres:3,drift:-.05},'Konu iki günde soğudu.'),
  O('Bağlamından koparıldığını söyle',{itibar:-3,drift:-.12,stres:2},'Tartışma bir hafta daha sürdü.'),
  O('Konuyu soğumaya bırak',{drift:-.2,stres:4},'Sessizlik, rakiplerin işine yaradı.')]},
 {id:'genclik',baslik:'Gençlik Kollarının Atağı',metin:'Gençlik kolları kampüs turu planlıyor, ama paylaşacakları metin senin çizginden sert.',sec:[
  O('Metni yumuşatarak destekle',{grup:{gencler:5,ogrenciler:5},drift:.15,birlik:-1},'Turlar iyi geçti. Metin ortalandı.'),
  O('Metne dokunma, serbest bırak',{grup:{gencler:8,ogrenciler:4},drift:.2,itibar:-2,birlik:-3},'Genç kitle coştu, kıdemliler homurdandı.'),
  O('Turu ertele',{birlik:2,grup:{gencler:-3}},'Kadro rahatladı, gençlik söylendi.')]},
 {id:'canli',baslik:'Sert Röportaj Daveti',metin:'Büyük bir kanal canlı ve uzun bir röportaj teklif ediyor. Soruların zor olacağı belli.',sec:[
  O('Kabul et',{itibar:3,drift:.3,stres:5},'Zorlandın ama izleyici netliğini beğendi.',{p:.3,fx:{itibar:-5,drift:-.3},s:'Beklemediğin bir soruda yakalandın.'}),
  O('Soru listesi şartıyla kabul et',{itibar:1,drift:.12,stres:2},'Güvenli bir yayın oldu.'),
  O('Reddet',{drift:-.05},'Kanal boş sandalyeyi gösterdi.')]},
 {id:'bagis',baslik:'Cömert Bağışçı',metin:'Bir iş insanı kampanyana büyük bağış yapmak istiyor. Karşılığında yalnızca zaman zaman görüşmek diyor.',sec:[
  O('Bağışı kabul et',{kasa:2.5,itibar:-1},'Kasa nefes aldı.',{p:.3,fx:{itibar:-6,drift:-.4},s:'Bağış zinciri basına sızdı.'}),
  O('Şeffaf bağış kampanyasına çevir',{kasa:.8,itibar:2,birlik:1},'Herkesin göreceği bir sayfada toplandı.'),
  O('Reddet',{itibar:3},'Temiz duruşun konuşuldu.')]},
 {id:'enf',baslik:'Çarşıda Fiyat Konuşuluyor',kosul:function(S){return S.makro.enf>35;},metin:'Pazar tezgâhından otobüs durağına herkes fiyatları konuşuyor. Ekonomi programını açıklaman bekleniyor.',sec:[
  O('Radikal bir program aç',{grup:{emekliler:5,isciler:5,esnaf:-4},drift:.25,stres:4},'Cesur bulundu; kaynak sorusu da geldi.'),
  O('Adım adım bir yol haritası sun',{grup:{esnaf:2,memurlar:2},drift:.12},'Mantıklı ama heyecansız.'),
  O('Hükümeti sert eleştir',{grup:{muhafazakarlar:-3},drift:.15,itibar:-1},'Taraftarın alkışladı, tarafsızlar çekildi.')]},
 {id:'sendika',baslik:'Sendika Masası',metin:'İşçi sendikaları asgari ücret için ortak kampanya yürütmeyi öneriyor. Maliyeti var, getirisi de.',sec:[
  O('Ortak kampanyaya katıl',{kasa:-.6,grup:{isciler:8},drift:.2},'Fabrika kapılarında sesin duyuldu.'),
  O('Destek mesajı ver',{grup:{isciler:3}},'Sendikalar mesajı yeterli buldu.'),
  O('Katılma',{grup:{isciler:-3}},'Sendika yöneticileri not aldı.')]},
 {id:'sel',baslik:'Sel Bölgesinde',metin:'Bir ilde sel baskını var. Yerinde olmak itibar kazandırır, ama lojistik masraf çıkaracak.',sec:[
  O('Hemen git, yerel örgütle yardım topla',{kasa:-.5,itibar:3,drift:.15,stres:4,org:1},'Yerel örgüt sahaya çıktı, ilçeler seni anıyor.'),
  O('Destek mesajı ve bağış çağrısı',{itibar:1,kasa:-.1},'Mesaj paylaşıldı.'),
  O('Gelişmeleri bekle',{itibar:-2},'Eleştiri geldi.')]},
 {id:'kadro',baslik:'Kadroda Huzursuzluk',kosul:function(S){return S.stat.birlik<62;},metin:'{k} liderliğini açıkça sorgulamaya başladı. Kulis toplantıları ve imza toplamaları dönüyor.',sec:[
  O('Baş başa görüş',{birlik:5,stres:3},'Gerginlik düştü.'),
  O('Görevden al',{birlik:-6,itibar:-1},'Ses kesildi ama yaralar kaldı.'),
  O('Görmezden gel',{birlik:-4,stres:2},'Kulis büyüdü.')]},
 {id:'troll',baslik:'Sosyal Medya Saldırısı',metin:'Hesabına koordineli bir saldırı başladı. Etiket yarım saatte gündem oldu.',sec:[
  O('Mizahla karşılık ver',{itibar:2,grup:{gencler:3},stres:2},'Cevap viral oldu.',{p:.25,fx:{itibar:-4,drift:-.15},s:'Espri yanlış anlaşıldı.'}),
  O('Sessiz kal',{stres:3,drift:-.05},'Saldırı iki günde söndü.'),
  O('Hukuki yola git',{kasa:-.2,itibar:1},'Resmi dilekçe verildi.')]},
 {id:'baraj',baslik:'Baraj Hesapları',kosul:function(S){return S.sonrakiSecim&&S.sonrakiSecim.ay<=14&&S.sonrakiSecim.tip==='genel'&&S.anketOyuncu<8;},metin:'Kulislerde herkes barajı konuşuyor. Küçük partilerle ittifak kurma ihtimali gündemde.',sec:[
  O('Açıkça ittifak çağrısı yap',{yakin:8,drift:.1,itibar:1},'Çağrı, kapıları aralamış gibi.'),
  O('Tek başına gireceğini söyle',{birlik:3,itibar:2,drift:-.05},'Kadroya güven verdin; kulis rahatsız oldu.'),
  O('Sessiz kal',{},'Kulis konuşmaya devam ediyor.')]},
 {id:'kampus',baslik:'Kampüs Söyleşisi',metin:'Bir üniversitede açık oturum var. Öğrenciler yurt ve burs sorularıyla gelecek.',sec:[
  O('Sorulara tek tek yanıt ver',{grup:{ogrenciler:7,gencler:3},stres:3,drift:.1},'Salon seni uzun süre dinledi.'),
  O('Sadece konuşma yap',{grup:{ogrenciler:2}},'Kısa ve güvenli bir ziyaretti.'),
  O('Katılma',{},'Boş sandalye gündem olmadı.')]},
 {id:'bina',baslik:'Genel Merkez Kirası',kosul:function(S){return S.mod==='yeni';},metin:'Genel merkez binasının sahibi kirayı artırmak istiyor.',sec:[
  O('Pazarlık yap',{kasa:-.3,stres:2},'Orta yolda anlaşıldı.'),
  O('Zammı kabul et',{kasa:-.7},'Zahmetsiz ama pahalı.'),
  O('Başka bir binaya taşın',{kasa:-.4,birlik:-2,stres:4},'Taşınma yorucu geçti ama kira düştü.')]},
 {id:'kulis',baslik:'Kulis Haberi',metin:'Rakip bir parti, kadronda çatlak olduğuna dair haber sızdırdı.',sec:[
  O('Sert yalanla',{itibar:1,stres:2},'Haber büyümedi.'),
  O('Kadroyla ortak fotoğraf çektir',{birlik:3,itibar:1,drift:.05},'Birlik mesajı verildi.'),
  O('Yanıt verme',{birlik:-2},'Haber birkaç gün dolaştı.')]},
 {id:'dis',baslik:'Sınır Ötesi Gerilim',metin:'Sınır ötesinde tırmanan bir gerilim var. Kamuoyu senden net bir duruş bekliyor.',sec:[
  O('Ulusal birlik çağrısı yap',{grup:{milliyetciler:6,muhafazakarlar:3,gencler:-3},drift:.1},'Çağrın geniş kesimde karşılık buldu.'),
  O('Diplomasi ve temkin vurgula',{grup:{memurlar:3,gencler:3},itibar:1},'Sakin ton takdir gördü.'),
  O('Hükümeti sorgula',{grup:{milliyetciler:-3,gencler:2},drift:.08},'Soruların gündemi değiştirdi.')]},
 {id:'mentor',baslik:'Mentor Teklifi',metin:'Siyasetin deneyimli bir ismi seni yetiştirmek istiyor. Ama onun da çok rakibi var.',sec:[
  O('Yanına al',{itibar:2,drift:.2,birlik:-3},'Tecrübesi işe yaradı; kırgın isimler çıktı.'),
  O('Saygı duy ama bağımsız kal',{itibar:1,birlik:1},'Hem saygı gördün hem bağımsızlığın korundu.'),
  O('Mesafeli dur',{},'Teklif sessizce kapandı.')]},
 {id:'saha',baslik:'Teşkilat Alarmı',metin:'Bir bölgede örgüt çözülmeye başladı. İl başkanı yardım istiyor.',sec:[
  O('Ekip gönder',{kasa:-.4,org:2,stres:3},'İl örgütü toparlandı.'),
  O('Telefonla yönlendir',{org:1},'Kısmi toparlanma oldu.'),
  O('Kendi çözsün',{birlik:-2},'İl başkanı kırıldı.')]},
 {id:'anketfirma',baslik:'Anket Şirketi',metin:'Bir anket şirketi sana özel ve gizli bir saha ölçümü satmak istiyor.',sec:[
  O('Satın al',{kasa:-.5,drift:.12},'Verilerle stratejin netleşti.'),
  O('Reddet',{},'Kasa korundu.')]},
 {id:'dinlen',baslik:'Doktorun Uyarısı',kosul:function(S){return S.stat.stres>55;},metin:'Doktorun tempoyu düşürmeni söylüyor. Gündemin ise yoğun.',sec:[
  O('Bir hafta dinlen',{stres:-18,saglik:4,drift:-.08},'Güçlenerek döndün.'),
  O('Programı sürdür',{stres:5,saglik:-4,drift:.15},'Sahada kaldın; vücudun hesap soracak.')]},
 {id:'imza',baslik:'Mahalle Dilekçesi',metin:'Bir mahalle, otobüs hattının geri getirilmesi için imza topluyor.',sec:[
  O('İlk imzayı at, belediyeye git',{drift:.1,grup:{esnaf:2,emekliler:3},stres:1},'Hat yeniden gündeme girdi.'),
  O('Destek mesajı gönder',{itibar:1},'Mahalle teşekkür etti.'),
  O('Yerel örgüte bırak',{birlik:1},'Örgüt işi sahiplendi.')]},
 {id:'kongre',baslik:'Olağan Kongre Takvimi',kosul:function(S){return S.ay%12===6;},metin:'Tüzüğe göre kongre süreci başlıyor. Delegelerle ilişkin sınanacak.',sec:[
  O('Delegeleri tek tek gez',{birlik:6,stres:5,kasa:-.3,itibar:2},'Kongreye güçlü girdin.'),
  O('Merkezden yönet',{birlik:-3},'Hızlı ama soğuk bir süreç oldu.'),
  O('Hazırlığı kadroya bırak',{birlik:1},'Süreç sorunsuz işledi.')]},
 {id:'diaspora',baslik:'Diaspora Daveti',metin:'Avrupa\'daki bir dernekler birliği seni konferansa çağırıyor.',sec:[
  O('Yerinde katıl',{kasa:-.4,itibar:2,drift:.1},'Yurt dışında tanınırlığın arttı.'),
  O('Çevrimiçi katıl',{itibar:1},'Kısa ve verimli oldu.')]},
 {id:'fenomen',baslik:'Fenomen Teklifi',metin:'Milyonlarca takipçisi olan bir içerik üreticisi seni videosuna konuk almak istiyor.',sec:[
  O('Kabul et',{grup:{gencler:6},drift:.2,itibar:-1},'Video genç kitlede yankı yaptı.',{p:.25,fx:{itibar:-4,s:0},s:'Sorular beklediğinden magazinsel çıktı.'}),
  O('Reddet',{},'Fırsat başkasına gitti.')]},
 {id:'isyan',baslik:'Parti İçi İsyan',kosul:function(S){return S.stat.birlik<50&&S.ay>=3;},metin:'{k} öncülüğünde bir grup, yönetim kurulundan çekilme tehdidi savuruyor. Kulisler hareketli.',sec:[
  O('Masaya otur, taviz ver',{birlik:8,kasa:-.3,stres:3},'Gerginlik düştü, ama bedeli ödendi.'),
  O('Sert çık, disiplin cezası ver',{birlik:-6,drift:.05,itibar:1},'Kadro sustu, küskünlük kaldı.',{p:.4,fx:{birlik:-8,drift:-.2},s:'İhraç haberi basına sızdı.'}),
  O('Olağanüstü toplantı çağır',{birlik:3,stres:6,itibar:-1},'Dengeler masaya yatırıldı.')]},
 {id:'istifa',baslik:'İstifa Mektubu',kosul:function(S){return Math.min.apply(null,S.kadro.map(function(k){return k.sad;}))<35;},metin:'{k} istifa mektubunu masana bıraktı. Gazeteciler kapıda bekliyor.',sec:[
  O('İkna etmeye çalış',{birlik:4,stres:3,kasa:-.2},'Yol arkadaşın kaldı, ama masada kalan bir şart var.'),
  O('İstifayı kabul et',{birlik:-4,itibar:-1,stres:-1},'Sayfa çevrildi, parti içi sessizlik başladı.',{p:.3,fx:{drift:-.15},s:'Eski yol arkadaşın basına sert konuştu.'}),
  O('Kamuoyuna açıklama yap',{itibar:1,drift:.05,stres:2},'Şeffaf davrandın. Tepkiler karışık.')]},
 {id:'itibarkrizi',baslik:'İtibar Krizi',kosul:function(S){return S.stat.itibar<35;},metin:'Anketlerde güven kaybı sürüyor. Danışmanların hepsi bir hamle bekliyor.',sec:[
  O('Özeleştiri yap',{itibar:5,drift:.05,stres:3},'Dürüstlüğün takdir gördü.'),
  O('Büyük bir proje duyur',{itibar:3,kasa:-.8,drift:.12},'Gündem değişti, bütçe eridi.'),
  O('Gündemi başka yere çek',{drift:.1,itibar:-2},'Gündem kaydı.',{p:.35,fx:{itibar:-6},s:'Taktik fark edildi.'})]},
 {id:'ekokriz',baslik:'Ekonomik Kriz Ateşi',kosul:function(S){return S.makro.enf>55;},metin:'Kur sıçradı, fiyatlar kontrolden çıktı. Seçmen kimin çözüm sunacağını izliyor.',sec:[
  O('Acil eylem planı açıkla',{grup:{esnaf:5,emekliler:4},drift:.12,stres:4},'Plan konuşuldu; bazıları ikna oldu.'),
  O('Hükümeti sert eleştir',{drift:.1,itibar:-1,birlik:2},'Muhalefet saflarında coşku yarattı.'),
  O('Sessiz kal',{itibar:-2},'Boşluğu başkaları doldurdu.')]}
];

var KAT = {ekonomi:{ad:'Ekonomi',ikon:'💰',renk:'#dcab4a'},parti:{ad:'Parti içi',ikon:'🏛️',renk:'#a566e8'},medya:{ad:'Medya',ikon:'📺',renk:'#4aa3f0'},secmen:{ad:'Seçmen',ikon:'👥',renk:'#3fc27a'},kriz:{ad:'Kriz',ikon:'🚨',renk:'#ff5d6c'},siyaset:{ad:'Siyaset',ikon:'🗳️',renk:'#f0a030'}};
var KART_KAT = {esnaf:'secmen',nakil:'parti',gaf:'medya',genclik:'parti',canli:'medya',bagis:'ekonomi',enf:'ekonomi',sendika:'secmen',sel:'kriz',kadro:'parti',troll:'medya',baraj:'siyaset',kampus:'secmen',bina:'ekonomi',kulis:'medya',dis:'kriz',mentor:'parti',saha:'parti',anketfirma:'siyaset',dinlen:'kriz',imza:'secmen',kongre:'parti',diaspora:'siyaset',fenomen:'medya',isyan:'parti',istifa:'parti',itibarkrizi:'kriz',ekokriz:'kriz'};
var KART_ONEMLI = {isyan:1,istifa:1,itibarkrizi:1,ekokriz:1,sel:1,dis:1,baraj:1};

var SENARYOLAR = {
  klasik: {ad: 'Klasik', not: 'Dengeli başlangıç. Ekonomi sıkıntılı ama yönetilebilir.'},
  kriz: {ad: 'Ekonomik Kriz', not: 'Yüksek enflasyon ve işsizlik. İktidar sarsılıyor, muhalefet fırsat kolluyor.', makro: {enf: 72, faiz: 55, usd: 58, issiz: 12.5, buyume: -0.5, borc: 52, butce: -8, memn: 20, yatirim: 30}, gov: 0.78, opp: 1.07},
  refah: {ad: 'Refah Dönemi', not: 'Büyüme ve düşük enflasyon. İktidar güçlü; muhalefetin işi zor.', makro: {enf: 24, faiz: 22, usd: 36, issiz: 6.5, buyume: 5.5, borc: 28, butce: -2.5, memn: 62, yatirim: 70}, gov: 1.13, opp: 0.97},
  kirilgan: {ad: 'Kırılgan Denge', not: 'İktidar zayıf ama muhalefet dağınık. Her ittifak belirleyici.', makro: {enf: 38, issiz: 10, buyume: 1.5, memn: 33}, gov: 0.88, opp: 1.04, yk: 10},
  skandal: {ad: 'Yolsuzluk Dalgası', not: 'İktidarı vuran yolsuzluk iddiaları. Güven düşük, muhalefet fırsat kolluyor ama kamuoyu herkese şüpheli.', makro: {enf: 44, issiz: 9.5, buyume: 2.2, memn: 26}, gov: 0.84, opp: 1.03, yk: -4},
  dezenf: {ad: 'Dezenflasyon Programı', not: 'Sıkı para politikası. Enflasyon düşüyor ama işsizlik ve borç yükü ağır; esnaf kredi bulamıyor.', makro: {enf: 52, faiz: 48, usd: 44, issiz: 11, buyume: 1.0, memn: 35, yatirim: 40}, gov: 0.95, opp: 1.02},
  genclik: {ad: 'Genç Dalga', not: 'Gençlerin siyasete yöneldiği bir dönem. Yeni ve küçük partiler için alan açık, büyük bloklar yorgun.', makro: {enf: 36, issiz: 14, buyume: 3.0, memn: 40}, big: 0.96, small: 1.08, yk: 6},
  kutup: {ad: 'Kutuplaşma', not: 'İki büyük blok ortalığı kapladı. Küçük partiler ve yeni oyuncular için zor.', big: 1.06, small: 0.9, yk: -12}
};
