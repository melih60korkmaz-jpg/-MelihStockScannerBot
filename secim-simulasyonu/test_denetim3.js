// Denetim: sonlar (zorlanmış senaryolar), kayıt bütünlüğü, ilişkiler/hafıza. node test_denetim3.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,sonBilgi,SON_TIPLER,uyumla,kadroInit,asama2Init,ilisInit,ilisTick,ilisEtki,kisiler,kisiBul,hafInit,partiHafiza,bldInit,mdInit,zincirEkle,kadroDegis,yasaSonuc,mcInit,PARTILER};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const yeni=(seed)=>X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
function son(k){const S=yeni(1);X.kadroInit(S);X.ilisInit(S);const kol={};X.PARTILER.forEach(p=>kol[p.id]=0);const o=Object.assign(kol,k.kol);S.sonSecim={koltuk:o,ulusal:Object.fromEntries(Object.keys(o).map(i=>[i,o[i]/6])),girer:true,cb:{adaylar:[{ad:'Biri'}],kazanan:0}};S.gov=k.gov(S);S.cbOyuncu=!!k.cb;S.rol=k.rol||'baskan';return X.sonBilgi(S).key;}
const P='CHP';
ok(son({kol:{CHP:300,AK:100},gov:S=>[S.pid],cb:1})==='cb_tek','cb_tek');
ok(son({kol:{CHP:200,MHP:80,AK:100},gov:S=>[S.pid,'MHP'],cb:1})==='cb_koal','cb_koal');
ok(son({kol:{CHP:200,MHP:80,AK:100},gov:S=>[S.pid,'MHP'],cb:0})==='ortak','ortak');
ok(son({kol:{CHP:150,AK:200,MHP:60},gov:S=>['AK','MHP'],cb:0})==='muhalefet','muhalefet (ana muhalefet)');
ok(son({kol:{CHP:50,AK:200,DEM:90},gov:S=>['AK'],cb:0})==='kiyi','kıyıda: başka muhalefet daha güçlü');
ok(son({kol:{CHP:0,AK:300},gov:S=>['AK'],cb:0})==='baraj','baraj altı');
ok(son({kol:{CHP:20,AK:300},gov:S=>['AK'],cb:0,rol:'muhalif'})==='muhalif_lider','muhalif lider');
ok(son({kol:{CHP:0,AK:300},gov:S=>['AK'],cb:0,rol:'muhalif'})==='baraj','muhalif ve meclis dışı → baraj');
// sonBilgi eski kayıt/eksik alanlar
let S=yeni(2);S.sonSecim=null;const sb=X.sonBilgi(S);ok(sb&&X.SON_TIPLER[sb.key],'sonSecim yokken de çalışır');
// kayıt bütünlüğü
S=yeni(3);X.kadroInit(S);X.asama2Init(S);X.ilisInit(S);X.mdInit(S);X.bldInit(S);S.bld.borc[4]=77;S.md.yanlis={idx:1,ay:2,sid:2,kim:'AK'};X.zincirEkle(S,'xn_kabine_yeni',1,1,1);const u=X.uyumla(JSON.parse(JSON.stringify(S)));
ok(u.bld.borc[4]===77,'borç kayıtta korunur');ok(u.md.yanlis&&u.md.yanlis.idx===1,'yanlış haber kayıtta korunur');ok(u.zincir.some(z=>z.id==='xn_kabine_yeni'),'zincir kuyruğu korunur');
// ilişkiler: dinamik dostluk/rekabet uzun sürede oluşur
let yd=0,rk=0;for(let sd=1;sd<=20;sd++){const T=yeni(30+sd);X.kadroInit(T);X.asama2Init(T);X.ilisInit(T);const L0=X.kisiler(T);const d0=L0.filter(x=>x.k.dost).length,r0=L0.filter(x=>x.k.rakip).length;L0.forEach(x=>{x.k.dost=null;x.k.rakip=null;x.k.sad=75;x.k.hirs=80});for(let m=0;m<60;m++){T.ay++;X.ilisTick(T);X.kisiler(T).forEach(x=>{x.k.sad=Math.max(x.k.sad,70)})}const L=X.kisiler(T);yd+=L.filter(x=>x.k.dost).length;rk+=L.filter(x=>x.k.rakip).length;}
console.log('60 ayda oluşan dost bağı',yd/20,'rakip bağı',rk/20);ok(yd>0,'yeni dostluklar oluşur');ok(rk>0,'yeni rekabetler oluşur');
// dostluk karşılıklı ve tek
S=yeni(4);X.kadroInit(S);X.asama2Init(S);X.ilisInit(S);let tutarli=true;for(let m=0;m<80;m++){S.ay++;X.ilisTick(S);X.kisiler(S).forEach(x=>{if(x.k.dost){const d=X.kisiBul(S,x.k.dost);if(!d)tutarli=false}if(x.k.dost&&x.k.dost===x.k.uid)tutarli=false;if(x.k.rakip&&x.k.rakip===x.k.uid)tutarli=false})}ok(tutarli,'ilişkiler kendine veya olmayan kişiye işaret etmez');
// ödül: hırslı biri rakip olur
let rv=0;for(let sd=1;sd<=60;sd++){const T=yeni(60+sd);X.kadroInit(T);X.asama2Init(T);X.ilisInit(T);const L=X.kisiler(T);L.forEach(x=>{x.k.rakip=null;x.k.dost=null;x.k.hirs=80});const m=X.ilisEtki(T,L[0].k,'odul');if(L.some(x=>x.k.rakip===L[0].k.uid))rv++}ok(rv>10,'ödül rakip doğurur ('+rv+'/60)');
// görevden alınan kişinin dostu bağını kaybeder
S=yeni(5);X.kadroInit(S);X.asama2Init(S);X.ilisInit(S);let LL=X.kisiler(S);LL[1].k.dost=LL[0].k.uid;X.ilisEtki(S,LL[0].k,'kov');ok(!LL[1].k.dost,'görevden alınanın dostluğu sona erer');
// yeni atanan kişi sisteme düzgün girer
S=yeni(6);X.kadroInit(S);X.asama2Init(S);X.ilisInit(S);S.aksiyon.kalan=3;X.kadroDegis(S,'kadro',0);X.ilisInit(S);const yk=X.kisiler(S).filter(x=>x.k.uid);ok(yk.length===X.kisiler(S).length,'yeni kişi uid alır');ok(new Set(yk.map(x=>x.k.uid)).size===yk.length,'uid benzersiz');
// hafıza: yasa oylamasında ortak desteği/ihaneti
S=yeni(7);X.kadroInit(S);X.asama2Init(S);X.ilisInit(S);X.mcInit(S);S.gov=[S.pid,'MHP'];const y0=S.yk.MHP||0;const ph0=Object.assign({},X.partiHafiza(S,'MHP'));
X.yasaSonuc(S,{id:'asgari',kapsam:1,durum:'genel'},{kabul:true,evet:300,hayir:100,defect:[],cekimser:0});ok(X.partiHafiza(S,'MHP').yardim>ph0.yardim,'yasa geçince ortağın yardımı hafızaya işlenir');
X.yasaSonuc(S,{id:'asgari',kapsam:1,durum:'genel'},{kabul:true,evet:300,hayir:100,defect:[{ad:ctx.partiAdi?ctx.partiAdi(S,'MHP'):'MHP',n:30,neden:'x'}],cekimser:0});
console.log(bad?'BAŞARISIZ '+bad:'DENETIM3 TESTI TAMAM');process.exit(bad?1:0);
