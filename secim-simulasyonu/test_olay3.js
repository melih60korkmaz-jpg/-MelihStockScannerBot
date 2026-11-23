// Aşama 7: sistemlere bağlı olay ağı testi: node test_olay3.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,kartBul,kartSec,kartCek,kadroInit,asama2Init,ilisInit,fxSis,zincirEkle,mdInit,mdTick,mdSkandalBaslat,kabineDus,erkenSecimIlan,bldInit,bldSayi,kadroDegis,mcInit,hukumetDurum,KARTLAR,KARTLAR_E,KARTLAR_Z,ZINCIR,uyumla,muhalifMu,hafInit,kpBitir,kpBaslat};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const PARTILER=ctx.PARTILER;
const yeni=(seed)=>X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
function iktidar(seed,my){const S=yeni(seed);S.gov=[S.pid,'MHP'];S.meclis={};PARTILER.forEach(p=>S.meclis[p.id]=0);S.meclis[S.pid]=my||270;S.meclis.MHP=50;S.meclis.AK=200;S.meclis.DEM=50;S.meclis.IYI=30;X.kadroInit(S);X.asama2Init(S);S.stat.kasa=5e8;S.stat.birlik=70;S.stat.itibar=60;X.ilisInit(S);X.mdInit(S);X.mcInit(S);return S;}
// 1) yapı
const yeniKartlar=X.KARTLAR_E.filter(c=>c.id.startsWith('xn_')).concat(X.KARTLAR_Z.filter(c=>c.id.startsWith('xn_')));
console.log('yeni kart',yeniKartlar.length);ok(yeniKartlar.length>=35,'en az 35 yeni kart');
ok(new Set(yeniKartlar.map(c=>c.id)).size===yeniKartlar.length,'benzersiz id');ok(yeniKartlar.every(c=>!/^[bgpy]/.test(c.id)),'id b/g/p/y ile başlamamalı');
ok(yeniKartlar.every(c=>c.sec.length===3&&c.baslik&&c.metin&&c.kat),'her kart 3 seçenek ve başlık taşımalı');
ok(X.KARTLAR_Z.filter(c=>c.id.startsWith('xn_')).every(c=>c.z===1),'zincir kartları z:1');
// 2) her seçenek istisnasız çalışır, sistem etkileri uygulanır
let hata=0;yeniKartlar.forEach(c=>{for(let i=0;i<3;i++){const S=iktidar(10+i);S.md.sk=null;try{const r=X.kartSec(S,{id:c.id,k:'X',s:''},i);if(!r||typeof r.s!=='string')hata++;if(!isFinite(S.stat.itibar+S.stat.birlik+S.stat.drift))hata++;}catch(e){console.log('  ',c.id,i,e.message);hata++;}}});ok(hata===0,'tüm seçenekler çalışmalı');
// 3) fxSis tek tek
let S=iktidar(1);X.bldInit(S);const mine=[];S.bld.sahip.forEach((x,i)=>{if(x===S.pid)mine.push(i)});S.bld.sahip[3]=S.pid;const p0=S.bld.perf[3];X.fxSis(S,{bldPerf:5});ok(S.bld.perf[3]===Math.min(100,p0+5),'bldPerf');
S=iktidar(2);const tv=S.medya.find(m=>m.tur==='tv'),dj=S.medya.find(m=>m.tur==='dijital');const t0=tv.yakin,d0=dj.yakin;X.fxSis(S,{yakinMedya:{tur:'tv',v:10}});ok(tv.yakin>t0&&dj.yakin===d0,'yakinMedya tür filtreli');const g0=tv.guven;X.fxSis(S,{guven:-5});ok(tv.guven<g0,'guven');
S=iktidar(3);S.ebs=10;X.fxSis(S,{ebs:7});ok(S.ebs===17,'ebs');const t3=S.takvim.length;const mm=X.fxSis(S,{erken:1});ok(S.takvim.some(t=>t.erken)&&mm.includes('Erken seçim'),'erken seçim ilanı');const n0=JSON.stringify(S.takvim);X.fxSis(S,{erken:1});ok(JSON.stringify(S.takvim)===n0,'ikinci erken seçim engellenir');
S=iktidar(4);const h0=S.hzb[0].sad;X.fxSis(S,{hzbSad:-10});ok(S.hzb[0].sad===Math.max(0,h0-10),'hzbSad');const y0=S.yk.MHP;X.fxSis(S,{ortak:6});ok(S.yk.MHP===Math.min(50,y0+6),'ortak');
S=iktidar(5);const b0=S.bakanlar.maliye.perf;X.fxSis(S,{bakanPerf:-5});ok(S.bakanlar.maliye.perf===Math.max(0,b0-5),'bakanPerf');const k0=S.kadro[0].sad;X.fxSis(S,{kadroSad:5});ok(S.kadro[0].sad===Math.min(100,k0+5),'kadroSad');
S=iktidar(6);S.md.sk=null;const kq=S.kuyruk.length;ok(X.fxSis(S,{skandal:1}).includes('bakan')&&S.md.sk&&S.kuyruk.length===kq+1,'skandal başlatır');ok(X.fxSis(S,{skandal:1})==='','açık skandal varken ikincisi başlamaz');
S=iktidar(7);S.org[5]=40;S.org[6]=0;X.fxSis(S,{org:3});ok(S.org[5]===43&&S.org[6]===0,'org yalnızca teşkilat olan illere');
S=iktidar(8);S.gov=['AK'];ok(X.mdSkandalBaslat(S)===false,'muhalefette bakan skandalı başlamaz');
// 4) zincir kancaları
function zsay(f,id,n){let c=0;for(let sd=1;sd<=n;sd++){const T=iktidar(100+sd);T.zincir=[];f(T);if(T.zincir.some(z=>z.id===id))c++;}return c;}
ok(zsay(T=>X.erkenSecimIlan(T,'t'),'xn_erken_kampanya',10)===10,'erken seçim her zaman kampanya zinciri başlatır');
ok(zsay(T=>X.kabineDus(T,'t'),'xn_kabine_yeni',40)>20,'kabine düşünce zincir');
ok(zsay(T=>{T.md.sk=null;for(let i=0;i<400&&!T.md.sk;i++){T.bakanlar.maliye.perf=10;X.mdTick(T);}},'xn_skandal_basin',40)>15,'skandal zinciri basın kartı');
ok(zsay(T=>{T.kadro[1].dost=T.kadro[0].uid;T.aksiyon.kalan=3;X.kadroDegis(T,'kadro',0);},'xn_kar_dost',40)>10,'dost görevden alınınca zincir');
S=iktidar(9);S.zincir=[];X.zincirEkle(S,'xn_kabine_yeni',1,1,1);X.zincirEkle(S,'xn_kabine_yeni',1,1,1);ok(S.zincir.length===1,'aynı zincir ikinci kez eklenmez');
ok(X.ZINCIR.xk_hirsli&&X.ZINCIR.xn_ortak_ayril,'kart->kart zincirleri tanımlı');
// 5) kapılar
S=iktidar(11);S.gov=['AK'];const G=['xn_tikanma','xn_ortak_talep','xn_azinlik','xn_butce_muz'];G.forEach(id=>ok(!X.kartBul(id).kosul(S),id+' muhalefette görünmemeli'));
S=iktidar(12);S.gov=[S.pid];S.md.sk={taraf:'rakip',durum:'acik'};ok(!X.kartBul('xn_med_muh_sk').kosul(S),'muhalif-skandal kartı iktidarda görünmez');S.gov=['AK'];ok(X.kartBul('xn_med_muh_sk').kosul(S),'muhalefette görünür');
S=iktidar(13);S.rol='muhalif';const gor0=yeniKartlar.filter(c=>c.kosul&&c.kosul(S)&&c.z!==1).map(c=>c.id);ok(gor0.length===0,'muhalefet modunda yeni kartlar görünmez: '+gor0);
S=iktidar(14);S.stat.birlik=70;ok(!X.kartBul('xn_erken_spek').kosul(S)&&(S.ebs=50,X.kartBul('xn_erken_spek').kosul(S)),'erken seçim spekülasyonu baskıya bağlı');
// 6) eski kayıt
S=yeni(15);const u=X.uyumla(JSON.parse(JSON.stringify(S)));ok(u,'eski kayıt');
// 7) uzun simülasyon: çeşitlilik ve zincir tetiklenmesi
const gor={},zin={};let sonlu=true;
for(let sd=1;sd<=40;sd++){S=iktidar(600+sd);for(let m=0;m<100&&!S.bitti;m++){S.aksiyon.kalan=3;if(m%6===0)X.kadroDegis(S,'kadro',m%8);X.ayiBitir(S);S.kuyruk.forEach(q=>{if(q.t==='kart'){const c=X.kartBul(q.id);if(q.id.startsWith('xn_')||q.id.startsWith('xk_')){gor[q.id]=(gor[q.id]||0)+1;if(c.z)zin[q.id]=(zin[q.id]||0)+1;}X.kartSec(S,q,Math.min(m%3,c.sec.length-1));}});S.kuyruk.length=0;S.sd=[];if(!isFinite(S.stat.itibar+S.stat.birlik+S.stat.drift+S.stat.kasa))sonlu=false;}}
console.log('görülen',Object.keys(gor).length,'zincir',JSON.stringify(zin));ok(sonlu,'sonlu');ok(Object.keys(gor).length>=22,'yeni kartların çoğu oyunda görünmeli ('+Object.keys(gor).length+')');ok(Object.keys(zin).length>=3,'zincir kartları tetiklenmeli');
console.log(bad?('BAŞARISIZ '+bad):'OLAY3 TESTI TAMAM');process.exit(bad?1:0);
