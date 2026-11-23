// Medya + skandal zinciri testi: node test_medya.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,mdInit,mdTick,mdMansetler,mdSkandalYanit,mdSkandalKoz,mdYakinlas,mdDostluk,mdGuc,kadroInit,asama2Init,uyumla,bakanPerf,BAKANLIK};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const PARTILER=ctx.PARTILER;
const yeni=(seed)=>X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
function iktidar(seed){const S=yeni(seed);S.gov=[S.pid];S.meclis={};PARTILER.forEach(p=>S.meclis[p.id]=0);S.meclis[S.pid]=310;S.meclis.AK=150;S.meclis.MHP=40;S.meclis.DEM=60;S.meclis.IYI=40;X.kadroInit(S);X.asama2Init(S);S.stat.kasa=5e8;S.stat.birlik=70;S.stat.itibar=60;X.mdInit(S);return S;}
function skandalli(seed,sid){const S=iktidar(seed);S.md.sk={bakan:'maliye',kisi:S.bakanlar.maliye.ad,siddet:2,evre:0,ay:S.ay,durum:'acik',taraf:'oyuncu'};return S;}
// 1) başlatma
let S=iktidar(1);ok(S.medya.every(m=>m.tur&&m.sahip&&m.gr),'yayın organları tür/sahip/grup almalı');ok(new Set(S.medya.map(m=>m.tur)).size>=4,'tv/gazete/ajans/dijital çeşitliliği');
// 2) iktidara bağlı yayınlar tarafını değiştirir
S=iktidar(2);const dev=S.medya.find(m=>m.sahip==='iktidar');for(let i=0;i<40;i++)X.mdTick(S);const yIkt=dev.yakin;
S=iktidar(2);S.gov=['AK'];const dev2=S.medya.find(m=>m.sahip==='iktidar');for(let i=0;i<40;i++)X.mdTick(S);ok(yIkt>dev2.yakin+40,'iktidar değişince hükümete yakın yayınlar taraf değiştirmeli: '+Math.round(yIkt)+' vs '+Math.round(dev2.yakin));
// 3) pasif etki: dost medya ivme, düşman medya düşüş
S=iktidar(3);S.medya.forEach(m=>m.yakin=70);let d0=S.stat.drift;X.mdTick(S);const up=S.stat.drift-d0;
S=iktidar(3);S.medya.forEach(m=>m.yakin=-70);d0=S.stat.drift;X.mdTick(S);const dn=S.stat.drift-d0;ok(up>0.015&&dn<-0.015&&Math.abs(up)<=0.07,'medya yakınlığı ivmeyi ±sınırlı etkilemeli ('+up.toFixed(3)+','+dn.toFixed(3)+')');
S=iktidar(3);S.medya.forEach(m=>m.yakin=70);const g0=S.grup.gencler;X.mdTick(S);ok(S.grup.gencler>g0-0.0001,'dijital yayın gençleri etkilemeli');
// 4) manşetler: ton farkı, skandal öncelikli
S=iktidar(4);S.medya.forEach((m,i)=>m.yakin=i%2?60:-60);const ms=X.mdMansetler(S);ok(ms.length===S.medya.length&&ms.every(x=>x.m&&x.m.length>10),'her yayın bir manşet üretmeli');ok(ms.some(x=>x.ton>0)&&ms.some(x=>x.ton<0),'dost/düşman ton farkı');
S=skandalli(4);S.medya.forEach(m=>m.yakin=-50);ok(X.mdMansetler(S).some(x=>x.m.includes('Maliye')),'skandal manşete çıkmalı');
// 5) skandal oluşumu: zayıf bakan daha sık, kuyruğa karar kartı
function say(perf){let n=0,q=0;for(let sd=1;sd<=60;sd++){const T=iktidar(100+sd);T.bakanlar&&Object.keys(T.bakanlar).forEach(k=>T.bakanlar[k].perf=perf);for(let m=0;m<12;m++){X.mdTick(T);if(T.md.sk&&T.md.sk.durum==='acik'&&T.md.sk.evre===0){}T.md.sk=T.md.sk&&T.md.sk.durum==='bitti'?null:T.md.sk;}n+=T.md.gecmis.length+(T.md.sk?1:0);q+=T.kuyruk.filter(k=>k.t==='skandal').length;}return [n,q];}
const lo=say(15),hi=say(85);console.log('skandal',lo,hi);ok(lo[1]>hi[1]*1.5,'düşük performanslı bakan daha çok skandal üretmeli');ok(lo[1]>3,'karar kartı kuyruğa girmeli');
// 6) yanıtlar
S=skandalli(5);const eski=S.bakanlar.maliye.ad;const r=X.mdSkandalYanit(S,'istifa');ok(r.ok&&S.md.sk.durum==='bitti'&&S.bakanlar.maliye.ad!==eski,'istifa bakanı değiştirmeli ve krizi bitirmeli');
S=skandalli(6);const r2=X.mdSkandalYanit(S,'sorus');ok(r2.ok&&S.md.sk.durum==='sorusturma','soruşturma durumu');for(let i=0;i<3;i++){S.ay++;X.mdTick(S);}ok(S.md.sk===null||S.md.sk.durum==='bitti','soruşturma sonuçlanmalı');
let clr=0,esc=0;for(let sd=1;sd<=80;sd++){const T=skandalli(200+sd);T.medya.forEach(m=>m.yakin=50);X.mdSkandalYanit(T,'savun');if(T.md.sk.durum==='bitti')clr++;else esc++;}ok(clr>8&&esc>8,'savunma ikisi de olabilmeli ('+clr+'/'+esc+')');
// savunma ihtimali dost medyayla artar
function savun(y){let c=0;for(let sd=1;sd<=120;sd++){const T=skandalli(300+sd);T.medya.forEach(m=>m.yakin=y);X.mdSkandalYanit(T,'savun');if(T.md.sk.durum==='bitti')c++;}return c;}
const sd1=savun(80),sd2=savun(-80);ok(sd1>sd2+10,'dost medya savunmayı güçlendirmeli ('+sd1+' vs '+sd2+')');
// 7) çözülmezse parti krizi
S=skandalli(7);S.stat.birlik=70;const b0=S.stat.birlik,e0=S.stat.itibar;const eski7=S.bakanlar.maliye.ad;for(let i=0;i<4;i++){S.ay++;X.mdTick(S);}ok(S.md.sk===null||S.md.sk.durum==='bitti','üç aylık süreç bitmeli');ok(S.stat.birlik<b0-4&&S.stat.itibar<e0-2,'çözülmeyen skandal birlik ve itibarı düşürmeli');ok(S.bakanlar.maliye.ad!==eski7,'bakan görevden alınmalı');ok((S.ebs||0)>=10,'erken seçim baskısı artmalı');
// 8) basın büyütme: düşman medya hasarı artırır
function hasar(y){const T=skandalli(8);T.medya.forEach(m=>m.yakin=y);const i0=T.stat.itibar;X.mdTick(T);return i0-T.stat.itibar;}ok(hasar(-80)>hasar(60),'düşman medya hasarı büyütmeli');
// 9) muhalefette skandal büyütme
S=iktidar(9);S.gov=['AK'];X.mdInit(S);ok(!X.mdSkandalKoz(S).ok,'skandal yokken büyütülemez');S.md.sk={bakan:null,kisi:'X Y',siddet:2,evre:0,ay:S.ay,durum:'acik',taraf:'rakip',baski:0};const e9=S.ebs||0;const kz=X.mdSkandalKoz(S);ok(kz.ok&&(S.ebs||0)>e9,'muhalefet skandalı büyütünce baskı artmalı');
S=iktidar(10);S.aksiyon.kalan=3;ok(!X.aksiyonYap(S,'skandalkoz').ok&&S.aksiyon.kalan===3,'iktidar skandal büyütemez, aksiyon korunur');
// 10) medya ilişkisi
S=iktidar(11);S.aksiyon.kalan=3;const m0=S.medya[3].yakin,gv0=S.medya[3].guven;const ar=X.aksiyonYap(S,'medyaili',3);ok(ar.ok&&S.medya[3].yakin>m0&&S.medya[3].guven<gv0&&S.aksiyon.kalan===2,'ilişki yakınlık artırıp güveni aşındırmalı');ok(!X.aksiyonYap(S,'medyaili',99).ok&&S.aksiyon.kalan===2,'geçersiz yayın reddedilmeli');
// 11) eski kayıt
S=yeni(12);delete S.md;const u=X.uyumla(JSON.parse(JSON.stringify(S)));X.mdTick(u);ok(u.md&&u.md.manset.length>0,'eski kayıtta medya lazily kurulmalı');
// 12) uzun simülasyon
const t={sk:0,kriz:0,mans:0};let sonlu=true;for(let sd=1;sd<=90;sd++){S=iktidar(400+sd);for(let m=0;m<80&&!S.bitti;m++){S.aksiyon.kalan=3;if(m%5===0)X.aksiyonYap(S,'medyaili',m%6);X.ayiBitir(S);S.kuyruk.forEach(q=>{if(q.t==='skandal'){t.sk++;if(sd%2)X.mdSkandalYanit(S,['istifa','savun','sorus'][sd%3]);}});S.kuyruk.length=0;S.sd=[];if(S.md&&S.md.manset.length)t.mans++;if(!isFinite(S.stat.itibar+S.stat.birlik+S.stat.drift+S.stat.kasa))sonlu=false;}t.kriz+=S.tarihce.filter(x=>x.m.includes('parti krizine')).length;}
console.log(JSON.stringify(t),sonlu);ok(sonlu,'sonlu');ok(t.sk>10&&t.mans>100,'skandal ve manşet akışı olmalı');
console.log(bad?('BAŞARISIZ '+bad):'MEDYA TESTI TAMAM');process.exit(bad?1:0);
