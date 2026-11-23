// Karakter, ilişki, özellik ve siyasi hafıza testi: node test_karakter.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,kadroInit,asama2Init,kadroDegis,kadroOdul,ilisInit,ilisEtki,ilisTick,ilisOzet,kisiler,kisiBul,hafInit,ozellikTick,ozVar,KAR_OZ,kpOlasilik,partiHafiza,kurultayYap,mdYeniBakan,mdInit,mdGuc,kovulanKaydet,uyumla,KARTLAR_E,kartSec,medyaCarpan,kpTick,mcInit,yasaMetriks,muhalifMu};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const PARTILER=ctx.PARTILER;
const yeni=(seed)=>X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
function iktidar(seed){const S=yeni(seed);S.gov=[S.pid,'MHP'];S.meclis={};PARTILER.forEach(p=>S.meclis[p.id]=0);S.meclis[S.pid]=270;S.meclis.MHP=50;S.meclis.AK=200;S.meclis.DEM=50;S.meclis.IYI=30;X.kadroInit(S);X.asama2Init(S);S.stat.kasa=5e8;S.stat.birlik=70;S.stat.itibar=60;X.ilisInit(S);return S;}
// 1) uid ve ilişki ağı
let S=iktidar(1);const L=X.kisiler(S);ok(L.length===8+7+7,'kadro+bakan+bölge = 22 kişi ('+L.length+')');ok(new Set(L.map(x=>x.k.uid)).size===L.length&&L.every(x=>x.k.uid),'benzersiz uid');
let dN=0,rN=0;for(let sd=1;sd<=20;sd++){const T=iktidar(sd);const LL=X.kisiler(T);dN+=LL.filter(x=>x.k.dost).length;rN+=LL.filter(x=>x.k.rakip).length;}ok(dN/20>8&&rN/20>7,'dost ve rakip bağları oluşmalı ('+dN/20+','+rN/20+')');ok(L.every(x=>x.k.dost!==x.k.uid&&x.k.rakip!==x.k.uid&&x.k.dost!==x.k.rakip||!x.k.dost),'kendine bağ yok');
// 2) ödül/görevden alma zinciri
S=iktidar(2);let A=X.kisiler(S).find(x=>X.kisiler(S).some(y=>y.k.dost===x.k.uid)&&X.kisiler(S).some(y=>y.k.rakip===x.k.uid));
if(!A){for(let sd=3;sd<30&&!A;sd++){S=iktidar(sd);A=X.kisiler(S).find(x=>X.kisiler(S).some(y=>y.k.dost===x.k.uid)&&X.kisiler(S).some(y=>y.k.rakip===x.k.uid));}}
ok(!!A,'dostu ve rakibi olan biri bulunmalı');
const dostu=X.kisiler(S).find(y=>y.k.dost===A.k.uid),rakibi=X.kisiler(S).find(y=>y.k.rakip===A.k.uid);const d0=dostu.k.sad,r0=rakibi.k.sad;X.ilisEtki(S,A.k,'odul');ok(dostu.k.sad>=d0+2&&rakibi.k.sad<=r0-5,'ödül: dost memnun, rakip içerler');
const d1=dostu.k.sad,r1=rakibi.k.sad;X.ilisEtki(S,A.k,'kov');ok(dostu.k.sad<=d1-6&&rakibi.k.sad>=r1+3,'görevden alma: dost kırılır, rakip sevinir');
// 3) aksiyon üzerinden: kadroDegis kovulanları kaydeder
S=iktidar(4);S.aksiyon.kalan=3;const ad=S.kadro[2].ad;const rr=X.kadroDegis(S,'kadro',2);ok(rr.ok&&S.haf.kovulan[0].ad===ad&&S.haf.kov===1,'görevden alınan hafızaya yazılmalı');
S.aksiyon.kalan=3;S.stat.kasa=5e8;const ro=X.kadroOdul(S,'kadro',3);ok(ro.ok&&S.haf.odul===1,'ödül sayacı');
// 4) kopan bağlar temizlenir, yeni kişiye yeni bağ
S=iktidar(5);const hedef=S.kadro[0];const bagli=X.kisiler(S).find(y=>y.k.dost===hedef.uid||y.k.rakip===hedef.uid);X.mdInit(S);S.kadro[0]=Object.assign({},S.kadro[0],{uid:undefined,ilis:undefined,ad:'Yeni Kişi',dost:null,rakip:null});X.ilisTick(S);ok(S.kadro[0].uid&&S.kadro[0].ilis,'yeni kişi uid ve ilişki alır');if(bagli)ok(!bagli.k.dost||X.kisiBul(S,bagli.k.dost),'eski kişiye bağ kalmamalı');
// 5) hırslı aday: kurultayda hasar
let adaySay=0;for(let sd=1;sd<=60;sd++){S=iktidar(100+sd);S.kadro.forEach(k=>{k.hirs=90;k.sad=20;});for(let m=0;m<6;m++){S.stat.birlik=70;S.kadro.forEach(k=>{k.sad=Math.min(k.sad,30)});X.ilisTick(S);}if(S.haf.aday)adaySay++;}ok(adaySay>20,'hırslı+isyankâr isimler aday olmalı ('+adaySay+')');
S=iktidar(6);S.stat.birlik=70;S.stat.itibar=60;S.kadro.forEach(k=>k.sad=60);let kz0=0,kz1=0;for(let sd=0;sd<80;sd++){const T=iktidar(200+sd);T.stat.birlik=52;T.stat.itibar=50;T.kadro.forEach(k=>k.sad=52);const U=JSON.parse(JSON.stringify(T));U.haf.aday={uid:1,ad:'X',rol:'r',guc:35};const a=X.kurultayYap(T),b=X.kurultayYap(U);kz0+=a.kazandi?1:0;kz1+=b.kazandi?1:0;}ok(kz0>kz1+8,'aday kurultay şansını düşürmeli ('+kz0+' vs '+kz1+')');
S=iktidar(7);S.haf.aday={uid:1,ad:'X',rol:'r',guc:35};X.kurultayYap(S);ok(S.haf.aday===null,'kurultaydan sonra aday sıfırlanır');
// 6) eski yönetici konuşur / savunur
let k1=0,k2=0;for(let sd=1;sd<=60;sd++){S=iktidar(300+sd);S.haf.kovulan=[{ad:'Kırgın',rol:'x',ay:S.ay-5,sad:20},{ad:'Dost',rol:'y',ay:S.ay-5,sad:80}];const i0=S.stat.itibar;for(let m=0;m<24;m++){S.ay++;X.ilisTick(S);}if(S.haf.kovulan.length<2)k1++;if(S.haf.kovulan.some(e=>e.ad==='Kırgın'))k2++;}ok(k1>20,'eski isimler zamanla konuşmalı');ok(k2<40,'kırgın isim sonunda konuşmalı');
// 7) özellikler: eşikler ve etkileri
S=iktidar(8);S.sozler=[{durum:'tutuldu'},{durum:'tutuldu'},{durum:'tutuldu'}];const i0=S.stat.itibar;X.ozellikTick(S);ok(X.ozVar(S,'sozlu')&&S.stat.itibar>i0,'sözünü tutan özelliği ve etkisi');ok(S.tarihce[0].m.includes('Sözünü tutan'),'özellik tarihçeye yazılmalı');
S.sozler.push({durum:'bozuldu'});X.ozellikTick(S);ok(!X.ozVar(S,'sozlu'),'söz bozulunca sözlü özelliği kalkar');
S=iktidar(9);S.haf.aks.miting=8;S.haf.aks.medyaili=4;S.haf.aks.koalisyon=2;S.haf.skAtlat=2;X.ozellikTick(S);ok(['saha','medya','koalisyoncu','kriz'].every(id=>X.ozVar(S,id)),'sayaçlardan özellikler kazanılmalı');
// özelliklerin sonuçları
S=iktidar(10);S.gov=[S.pid];const p0=X.kpOlasilik(S,'MHP',1,null);S.haf.ozellik={sozlu:1,koalisyoncu:1};const p1=X.kpOlasilik(S,'MHP',1,null);S.haf.ozellik={sozbozan:1};const p2=X.kpOlasilik(S,'MHP',1,null);ok(p1>p0+0.1&&p2<p0-0.05,'özellikler koalisyon ihtimalini etkilemeli');
S=iktidar(11);const m0=X.medyaCarpan(S);S.haf.ozellik={medya:1};ok(X.medyaCarpan(S)>m0,'medya dostu çarpanı artırmalı');
S=iktidar(12);X.mdInit(S);const g0=X.mdGuc(S);S.haf.ozellik={kriz:1};ok(X.mdGuc(S)<g0,'kriz yöneticisi skandal hasarını azaltmalı');
S=iktidar(13);S.aksiyon.kalan=3;const mit=(v)=>{const T=iktidar(13);T.aksiyon.kalan=3;T.stat.kasa=5e8;if(v)T.haf.ozellik={saha:1};const d=T.stat.drift;X.aksiyonYap(T,'miting','E');return T.stat.drift-d;};ok(mit(true)>mit(false),'saha adamı miting etkisini artırmalı');
S=iktidar(14);S.haf.ozellik={yasa:1};S.gov=['AK'];const y1=X.yasaMetriks(S,'konut',true).komOlasilik;S.haf.ozellik={};const y2=X.yasaMetriks(S,'konut',true).komOlasilik;ok(y1>y2,'yasa makinesi komisyon şansını artırmalı');
S=iktidar(15);S.haf.ozellik={sert:1};const dd=X.kisiler(S).find(y=>X.kisiler(S).some(z=>z.k.dost===y.k.uid));const frd=X.kisiler(S).find(z=>z.k.dost===dd.k.uid);const s0=frd.k.sad;X.ilisEtki(S,dd.k,'kov');ok(frd.k.sad<=s0-8,'sert yönetici dostları daha çok kırar');
// 8) parti hafızası: sözünü tutmayana ihtimal düşer
S=iktidar(16);S.gov=[S.pid];const q0=X.kpOlasilik(S,'MHP',1,null);X.partiHafiza(S,'MHP').ihanet=2;const q1=X.kpOlasilik(S,'MHP',1,null);X.partiHafiza(S,'MHP').ihanet=0;X.partiHafiza(S,'MHP').yardim=3;const q2=X.kpOlasilik(S,'MHP',1,null);ok(q1<q0-0.1&&q2>q0,'parti hafızası pazarlığı etkilemeli');
S=iktidar(17);S.kpSoz=[{id:'MHP',yasa:'konut',son:S.ay,tamam:false}];X.kpTick(S);ok(S.haf.parti.MHP.ihanet===1,'bozulan taahhüt hafızaya yazılmalı');
// 9) olay kartları
const kc=X.KARTLAR_E.filter(c=>c.id.startsWith('xk_')&&typeof c.kosul==='function'&&c.kat!=='kriz');ok(kc.length===4,'4 karakter kartı');S=iktidar(18);S.haf.kovulan=[{ad:'A',rol:'r',ay:1,sad:20}];S.haf.aday={uid:1,ad:'X',rol:'r',guc:10};S.sozler=[{durum:'acik'}];ok(kc.filter(c=>c.kosul(S)).length===4,'koşullar sağlanınca 4 kart da görünür');kc.forEach(c=>{try{X.kartSec(S,{id:c.id},0);}catch(e){ok(false,c.id+': '+e.message);}});
// 10) eski kayıt
S=yeni(19);delete S.haf;const u=X.uyumla(JSON.parse(JSON.stringify(S)));X.ilisTick(u);ok(u.haf&&u.haf.aks&&X.kisiler(u).every(x=>x.k.uid),'eski kayıt yüklenip ilişkiler kurulmalı');
// 11) uzun simülasyon
let sonlu=true,oz=0,aday=0,konus=0;let adayOyun=0;for(let sd=1;sd<=90;sd++){let gordu=false;S=iktidar(500+sd);for(let m=0;m<80&&!S.bitti;m++){S.aksiyon.kalan=3;if(m%4===0)X.kadroDegis(S,'kadro',m%8);if(m%5===0)X.kadroOdul(S,'kadro',(m+3)%8);X.ayiBitir(S);S.kuyruk.length=0;S.sd=[];if(!isFinite(S.stat.itibar+S.stat.birlik+S.stat.drift+S.stat.kasa))sonlu=false;if(S.haf&&S.haf.aday){aday++;gordu=true;}}if(gordu)adayOyun++;oz+=Object.keys(S.haf.ozellik).length;konus+=S.tarihce.filter(x=>x.m.includes('basına konuştu')).length;}
console.log({oz,aday,konus},sonlu);ok(sonlu,'sonlu');console.log({adayOyun});ok(adayOyun>=2&&adayOyun<=45&&konus>3,'aday ve eski yönetici olayları oluşmalı (90 oyun)');
console.log(bad?('BAŞARISIZ '+bad):'KARAKTER TESTI TAMAM');process.exit(bad?1:0);
