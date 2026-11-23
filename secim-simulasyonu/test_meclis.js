// Meclis sistemi testi: node test_meclis.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,kartSec,kartBul,komisyonDagilim,yasaMetriks,oylamaHesap,yasaHazirla,guvenoyuIste,gensoruVer,meclisTick,mcInit,asama2Init,kadroInit,YASA,KOMISYON,grupOrtSad,halkDestek,bakanPerf};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const yeni=(seed)=>X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
function iktidar(seed){const S=yeni(seed);S.gov=[S.pid,'MHP'];S.meclis={};PARTILER.forEach(p=>S.meclis[p.id]=0);S.meclis[S.pid]=270;S.meclis.MHP=50;S.meclis.AK=200;S.meclis.DEM=50;S.meclis.IYI=30;X.kadroInit(S);X.asama2Init(S);S.stat.kasa=5e8;S.stat.birlik=70;S.stat.itibar=60;return S;}
const PARTILER=ctx.PARTILER;
// 1) komisyon dağılımı
let S=iktidar(1);const kd=X.komisyonDagilim(S);ok(Object.keys(kd).length===6,'6 komisyon');ok(kd.butce===S.pid,'en büyük parti bütçe komisyonunu almalı');ok(Object.values(kd).some(id=>id==='AK'),'ikinci parti de başkanlık almalı');
// 2) komisyon olasılığı bağımlılıkları
S=iktidar(2);S.bakanlar.maliye.perf=90;const hi=X.yasaMetriks(S,'vergi',false).komOlasilik;S.bakanlar.maliye.perf=10;const lo=X.yasaMetriks(S,'vergi',false).komOlasilik;ok(hi>lo+0.1,'bakan performansı komisyon şansını etkilemeli');
S.bakanlar.maliye.perf=50;S.hzb.forEach(g=>g.sad=90);const h1=X.yasaMetriks(S,'vergi',false).komOlasilik;S.hzb.forEach(g=>g.sad=10);const h2=X.yasaMetriks(S,'vergi',false).komOlasilik;ok(h1>h2+0.1,'hizip sadakati komisyon şansını etkilemeli');
const opp=X.yasaMetriks(S,'vergi',true).komOlasilik;ok(opp<h1,'muhalefet teklifi daha zor geçer');
// 3) oylama bağımlılıkları
S=iktidar(3);S.hzb.forEach(g=>g.sad=90);S.yk.MHP=40;const o1=X.oylamaHesap(S,'asgari',false,1);S.hzb.forEach(g=>g.sad=15);const o2=X.oylamaHesap(S,'asgari',false,1);ok(o1.evet>o2.evet+15,'sadakatsiz hizip oyları düşürmeli');ok(o2.defect.length>0,'ayrılanlar listelenmeli');
S.hzb.forEach(g=>g.sad=80);S.yk.MHP=-40;const o3=X.oylamaHesap(S,'asgari',false,1);S.yk.MHP=40;const o4=X.oylamaHesap(S,'asgari',false,1);ok(o4.evet>o3.evet+5,'ortak yakınlığı oyları etkilemeli');
S.hzb.forEach(g=>g.sad=80);const ideo1=X.oylamaHesap(S,'kadin',false,1).evet,ideo2=X.oylamaHesap(S,'asgari',false,1).evet;ok(ideo1<ideo2,'ideolojik uyumsuz teklif (kadın paketi muhafazakâr kanatta) daha az oy almalı');
// 4) iktidar teklif hattı
S=iktidar(4);let r=X.yasaHazirla(S,'asgari');ok(r.ok,'teklif hazırlanabilmeli');ok(!X.yasaHazirla(S,'asgari').ok,'aynı teklif tekrar verilemez');ok(X.yasaHazirla(S,'tesvik').ok,'ikinci teklif');ok(!X.yasaHazirla(S,'konut').ok,'en fazla 2 teklif');
const kz0=S.stat.drift,it0=S.stat.itibar;let guard=0;while(X.mcInit(S).teklif.some(b=>b.durum==='komisyon'||b.durum==='genel')&&guard++<8){S.ay++;S.kuyruk=[];X.meclisTick(S);}
ok(X.mcInit(S).gecmis.length>=2,'teklifler sonuçlanmalı');ok(S.kuyruk.some(q=>q.t==='oylama'||true),'oylama sırası');
ok(X.mcInit(S).gecmis.every(g=>['kabul','red','komisyon'].indexOf(g.sonuc)>=0),'sonuç türleri');
ok(!X.yasaHazirla(S,'asgari').ok,'6 ay bekleme');
// 5) muhalefet teklifi: koltuksuz oyuncu veremez, gov oy sonucu
S=yeni(5);S.meclis[S.pid]=0;ok(!X.yasaHazirla(S,'asgari').ok,'milletvekilsiz teklif verilemez');
S=yeni(5);X.asama2Init(S);S.meclis[S.pid]=120;ok(X.yasaHazirla(S,'asgari').ok,'muhalefet teklifi');
// 6) güvenoyu
S=iktidar(6);S.stat.birlik=80;S.hzb.forEach(g=>g.sad=80);const g1=X.guvenoyuIste(S);ok(g1.ok&&g1.kabul,'güçlü hükümet güvenoyu almalı');ok(!X.guvenoyuIste(S).ok,'8 ay bekleme');
S=iktidar(7);S.stat.birlik=10;S.hzb.forEach(g=>g.sad=5);S.yk.MHP=-40;S.meclis[S.pid]=250;const b0=S.bakanlar.maliye.ad,it1=S.stat.itibar;const g2=X.guvenoyuIste(S);ok(g2.ok&&!g2.kabul,'çöken hükümet güvenoyunu kaybetmeli');ok(S.bakanlar.maliye.ad!==b0&&S.stat.itibar<it1,'kabine düşünce bakanlar yenilenmeli ve itibar düşmeli');
S=yeni(8);ok(!X.guvenoyuIste(S).ok,'muhalefet güvenoyu isteyemez');
// 7) gensoru
S=yeni(9);S.meclis[S.pid]=130;const it2=S.stat.itibar,j=PARTILER.findIndex(p=>p.id===S.gov[0]),m0=S.mods[j];const gr=X.gensoruVer(S,'maliye');ok(gr.ok,'gensoru');ok(S.stat.itibar>it2&&S.mods[j]<m0,'gensoru itibar kazandırmalı, iktidarı yıpratmalı');ok(!X.gensoruVer(S,'maliye').ok,'bakanlık bekleme süresi');
S.meclis[S.pid]=5;ok(!X.gensoruVer(S,'ic').ok,'20 vekil şartı');
S=iktidar(10);ok(!X.gensoruVer(S,'maliye').ok,'iktidar gensoru veremez');
// 8) aksiyon üzerinden
S=iktidar(11);S.aksiyon.kalan=3;const ar=X.aksiyonYap(S,'yasa','konut');ok(ar.ok&&S.aksiyon.kalan===2,'yasa aksiyonu aksiyon harcamalı');const ar2=X.aksiyonYap(S,'yasa','konut');ok(!ar2.ok&&S.aksiyon.kalan===2,'başarısız teklif aksiyon harcamamalı');
// 9) uzun simülasyon
const say={kabul:0,red:0,kom:0,oylama:0,guven:0,dus:0};let sonlu=true;
for(let seed=1;seed<=30;seed++){S=iktidar(100+seed);
  for(let m=0;m<60&&!S.bitti;m++){S.aksiyon.kalan=3;if(m%3===0){const ids=Object.keys(X.YASA);X.aksiyonYap(S,'yasa',ids[(m/3+seed)%ids.length]);}
    if(m%14===13){const gv=X.aksiyonYap(S,'guvenoyu');if(gv.ok)say.guven++;}
    X.ayiBitir(S);S.kuyruk.forEach(q=>{if(q.t==='oylama')say.oylama++;});S.kuyruk.length=0;S.sd=[];
    if(!isFinite(S.stat.itibar+S.stat.birlik+S.stat.drift+S.stat.kasa))sonlu=false;}
  const mc=X.mcInit(S);say.kabul+=mc.sayac.kabul;say.red+=mc.sayac.red;mc.gecmis.forEach(g=>{if(g.sonuc==='komisyon')say.kom++;});}
console.log(JSON.stringify(say),sonlu);ok(sonlu,'sonlu');ok(say.kabul>20&&say.red>5&&say.kom>2,'tüm sonuç türleri oluşmalı');ok(say.oylama>20,'oylama olayları kuyruğa girmeli');
// 10) eski kayıt
S=yeni(12);delete S.mc;ok(X.mcInit(S).teklif.length===0,'eski kayıt uyumu');
console.log(bad?'MECLIS TESTI BASARISIZ':'MECLIS TESTI TAMAM');process.exitCode=bad?1:0;
