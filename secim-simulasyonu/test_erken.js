// Erken seçim + koalisyon pazarlığı testi: node test_erken.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,guvenoyuIste,hukumetDus,erkenUygun,erkenSecimIlan,erkenKarar,erkenBaski,erkenBaskiYap,kpAI,rakipErkenTepki,muhalifMu,meclisKoltuk,kpBaslat,kpAdaylar,kpOlasilik,kpTeklif,kpBitir,kpTick,hukumetDurum,mcInit,asama2Init,kadroInit,uyumla,YASA,tarihNo,secimGuncelle};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const PARTILER=ctx.PARTILER;
const yeni=(seed)=>X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
function iktidar(seed,my){const S=yeni(seed);S.gov=[S.pid,'MHP'];S.meclis={};PARTILER.forEach(p=>S.meclis[p.id]=0);S.meclis[S.pid]=my||270;S.meclis.MHP=50;S.meclis.AK=200;S.meclis.DEM=50;S.meclis.IYI=30;X.kadroInit(S);X.asama2Init(S);S.stat.kasa=5e8;S.stat.birlik=70;S.stat.itibar=60;return S;}
const gen=(S)=>S.takvim.filter(t=>t.tip==='genel');
// 1) erken seçim takvimi kaydırır, sıralı kalır, sonraki genel +60 ay
let S=iktidar(1);const ilk=gen(S)[0],son=gen(S)[1];const msg=X.erkenSecimIlan(S,'test');ok(!!msg,'ilan metni');
ok(gen(S)[0].erken===true,'erken bayrağı');ok(X.tarihNo(S.tarih)+3===gen(S)[0].y*12+gen(S)[0].m,'seçim 3 ay sonra');
ok(gen(S)[1].y*12+gen(S)[1].m===gen(S)[0].y*12+gen(S)[0].m+60,'sonraki dönem 5 yıl');
ok(S.takvim.every((t,i)=>i===0||t.y*12+t.m>=S.takvim[i-1].y*12+S.takvim[i-1].m),'takvim sıralı');ok(S.sonrakiSecim&&S.sonrakiSecim.ay===3,'sonrakiSecim güncel');
// 2) uygunluk kuralları
S=iktidar(2);ok(X.erkenUygun(S).ok,'başlangıçta uygun');X.erkenSecimIlan(S,'t');ok(!X.erkenUygun(S).ok,'ikinci karar engellenmeli');
S=iktidar(3);S.tarih={y:2028,m:2};ok(!X.erkenUygun(S).ok,'seçime 7 aydan az kala uygun olmamalı');
// 3) başkan kararı: yalnızca iktidar; aksiyon harcar; başarısız aksiyon harcamaz
S=iktidar(4);S.aksiyon.kalan=3;const r1=X.aksiyonYap(S,'erken');ok(r1.ok&&S.aksiyon.kalan===2,'erken karar aksiyon harcamalı');
S=iktidar(5);S.gov=['AK'];S.aksiyon.kalan=3;const r2=X.aksiyonYap(S,'erken');ok(!r2.ok&&S.aksiyon.kalan===3,'muhalefet erken karar alamaz');
// 4) önde / geride fark
S=iktidar(6);S.anket[S.pid]=60;S.aksiyon.kalan=3;const d0=S.stat.itibar;X.erkenKarar(S);const d1=S.stat.birlik;
let S2=iktidar(6);S2.anket[S2.pid]=3;const b0=S2.stat.birlik;X.erkenKarar(S2);ok(S2.stat.birlik<b0,'geride iken karar birliği düşürmeli');
// 5) güvenoyu kaybı -> yeni kabine veya erken seçim, ikisi de oluşur
let erk=0,kab=0;for(let sd=1;sd<=80;sd++){S=iktidar(200+sd,150);S.stat.birlik=30;S.tarih={y:2027,m:3};const gr=X.guvenoyuIste(S);if(!gr.kabul){if(gr.erken)erk++;else kab++;}}
console.log('güvenoyu kaybı: erken',erk,'kabine',kab);ok(erk>3&&kab>3,'iki sonuç da oluşmalı');
// 6) muhalefet baskısı
S=iktidar(7);S.gov=['AK'];S.aksiyon.kalan=3;const e0=S.ebs||0;const rb=X.aksiyonYap(S,'erkenbaski');ok(rb.ok&&S.ebs>e0,'baskı artmalı');
S=iktidar(8);const rb2=X.aksiyonYap(S,'erkenbaski');ok(!rb2.ok,'iktidar baskı kuramaz');
S=iktidar(9);S.gov=['AK'];S.ebs=95;let tetik=0;for(let i=0;i<60;i++){S=iktidar(300+i);S.gov=['AK'];S.ebs=95;X.erkenBaski(S);if(S.takvim.some(t=>t.erken))tetik++;}ok(tetik>0,'yüksek baskı bazen erken seçim getirmeli ('+tetik+')');
// 7) koalisyon pazarlığı
S=iktidar(10,230);S.gov=[S.pid];S.yk.MHP=40;const kb=X.kpBaslat(S);ok(kb&&kb.t==='koalisyon'&&S.kp&&S.kp.eksik===71,'çoğunluk yoksa pazarlık açılmalı');
ok(X.kpAdaylar(S).length>=2,'adaylar listelenmeli');
const pLo=X.kpOlasilik(S,'MHP',0,null),pHi=X.kpOlasilik(S,'MHP',3,'konut');ok(pHi>pLo+0.2,'bakanlık+yasa ihtimali artırmalı');
S.yk.MHP=-40;ok(X.kpOlasilik(S,'MHP',1,null)<pLo,'yakınlık düşünce ihtimal azalmalı');
S.yk.MHP=45;let kabul=false;for(let i=0;i<3&&S.kp;i++){const r=X.kpTeklif(S,'MHP',3,'konut');if(r.kabul){kabul=true;break;}}
ok(kabul?S.gov.includes('MHP')&&S.kpSoz.length===1:true,'kabul edince ortak eklenmeli ve söz kaydedilmeli');
S=iktidar(12,230);S.gov=[S.pid];X.kpBaslat(S);for(let i=0;i<3;i++)X.kpTeklif(S,'MHP',0,null);const rr=X.kpTeklif(S,'MHP',0,null);ok(!rr.ok,'hak bitince teklif reddedilmeli');
S=iktidar(13,150);S.gov=[S.pid];X.kpBaslat(S);X.kpBitir(S);ok(S.kp===null&&S.azMaj===1,'çoğunluk yoksa azınlık hükümeti, azMaj=1');
S=iktidar(14,320);ok(X.kpBaslat(S)===null,'çoğunluk varken tek partili hükümette pazarlık açılmaz');
// 8) taahhüt: tutulursa yakınlık artar, tutulmazsa düşer + itibar
S=iktidar(15,230);S.gov=[S.pid,'MHP'];S.kpSoz=[{id:'MHP',yasa:'konut',son:S.ay+12,tamam:false}];S.yk.MHP=10;const mc=X.mcInit(S);mc.gecmis.unshift({ay:S.ay,id:'konut',sonuc:'kabul'});X.kpTick(S);ok(S.yk.MHP>10,'tutulan söz yakınlığı artırmalı');
S=iktidar(16,230);S.kpSoz=[{id:'MHP',yasa:'konut',son:S.ay,tamam:false}];S.yk.MHP=10;const it0=S.stat.itibar;X.kpTick(S);ok(S.yk.MHP<0&&S.stat.itibar<it0,'tutulmayan söz yakınlık ve itibarı düşürmeli');
// 9) eski kayıt uyumu
S=iktidar(17);delete S.ebs;delete S.erkenSon;delete S.kpSoz;delete S.kp;const u=X.uyumla(JSON.parse(JSON.stringify(S)));ok(u&&u.ebs===0&&u.erkenSon===-99&&Array.isArray(u.kpSoz),'eski kayıt yeni alanlarla yüklenmeli');
// 9b) kalan sorunlar: kurultay kayması, rakip tepkisi, YZ koalisyonu, muhalefet modunda baskı
S=iktidar(20);S.tarih={y:2027,m:7};S.kurultay=[{y:2027,m:9}];const rb0=JSON.stringify(S.rbm||null);X.erkenSecimIlan(S,'t');const gn=gen(S)[0];ok(Math.abs((S.kurultay[0].y*12+S.kurultay[0].m)-(gn.y*12+gn.m))>=3,'kurultay seçimle çakışmamalı: '+JSON.stringify(S.kurultay));
S=iktidar(21);S.tarih={y:2027,m:7};const ks=S.kurultay.map(k=>k.y*12+k.m);X.erkenSecimIlan(S,'t');ok(S.kurultay.every((k,i)=>{const o=ks[i];const n=k.y*12+k.m;return n===o||Math.abs(o-(gen(S)[0].y*12+gen(S)[0].m))<=2;}),'yalnızca çakışan kurultaylar kayar');
S=iktidar(22);S.gov=[S.pid];S.meclis={};PARTILER.forEach(p=>S.meclis[p.id]=0);S.meclis[S.pid]=100;S.meclis.AK=280;S.meclis.MHP=60;S.meclis.DEM=60;S.meclis.IYI=40;S.gov=['AK'];X.kpBaslat(S);ok(X.meclisKoltuk(S)>=301||S.ebs>0,'YZ koalisyonu çoğunluk kurmalı ya da azınlık baskısı doğmalı');ok(S.gov.length>=2,'YZ ortak almalı');
S=iktidar(23);S.rol='muhalif';S.gov=['AK'];S.ebs=0;const eb0=S.ebs;for(let i=0;i<10;i++)X.erkenBaski(S);ok(S.ebs>=0,'muhalefet modunda baskı hesabı çalışmalı');
// 10) uzun simülasyon: genel seçimler, erken seçim, sonluluk
const say={erken:0,secim:0,kp:0,bitti:0};let sonlu=true;
for(let seed=1;seed<=40;seed++){S=iktidar(400+seed,200+(seed%5)*20);let k0=false;
  for(let m=0;m<130&&!S.bitti;m++){S.aksiyon.kalan=3;if(m===12&&seed%2)X.aksiyonYap(S,'erken');if(m%14===13)X.aksiyonYap(S,'guvenoyu');
    X.ayiBitir(S);S.kuyruk.forEach(q=>{if(q.t==='secim'&&q.sonuc.tip==='genel')say.secim++;if(q.t==='koalisyon'){say.kp++;if(S.kp){X.kpTeklif(S,'MHP',1,null);X.kpBitir(S);}}});S.kuyruk.length=0;S.sd=[];
    if(!isFinite(S.stat.itibar+S.stat.birlik+S.stat.drift+S.stat.kasa))sonlu=false;}
  if(S.takvim.some(t=>t.erken))say.erken++;if(S.bitti)say.bitti++;}
console.log(JSON.stringify(say),sonlu);ok(sonlu,'sonlu');ok(say.erken>5&&say.secim>20&&say.bitti>10,'erken seçim, seçim ve oyun sonu oluşmalı');
console.log(bad?('BAŞARISIZ '+bad):'TÜM TESTLER GEÇTİ');process.exit(bad?1:0);
