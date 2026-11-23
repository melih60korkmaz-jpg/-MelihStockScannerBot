// Karargâh ve il bazlı anket testi: node test_karargah.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,ilAnket,karargah,paylar,bugunSecimOlsa,ilmInit,ILLER};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const yeni=(seed,mod)=>X.newGame({mod:mod||'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
let S=yeni(4);
// 1) il anketi: 81 il, hata payı, RNG tüketmez, deterministik
const rs0=S.rs;const a=X.ilAnket(S),b=X.ilAnket(S);
ok(a.length===81&&a.every(x=>x.hata>0&&isFinite(x.pay)&&x.sira>=1),'il anketi şekli');ok(S.rs===rs0,'il anketi RNG tüketmemeli');ok(JSON.stringify(a)===JSON.stringify(b),'deterministik');
const kucuk=a.slice().sort((x,y)=>x.nufus-y.nufus)[0],buyuk=a.slice().sort((x,y)=>y.nufus-x.nufus)[0];ok(kucuk.hata>buyuk.hata,'küçük ilde hata payı büyük olmalı');
// 2) sınıflandırma ve tahmin tutarlılığı
const K=X.karargah(S);ok(K.firsat.length+K.tehlike.length+K.guvenli.length+K.kayip.length===81,'il sınıflandırması 81 ile tamamlanmalı');
const r=X.bugunSecimOlsa(S);ok(K.koltuk===(r.seats[S.pid]||0),'tahmin = bugünkü seçim hesabı');
// 3) il kampanyası: hedef ilde oy artar, ulusal oy sabit (sıfır toplamlı), maliyet, ilk ay etkisi söner
S=yeni(4);S.stat.kasa=1e9;S.aksiyon.kalan=3;X.ilmInit(S);
const hedefIl=K.firsat.length?K.firsat[0].i:K.kayip[0].i;
const p0=X.paylar(S),pay0=p0.il[hedefIl][S.pid],ul0=p0.ulusal[S.pid],k0=S.stat.kasa;
const res=X.aksiyonYap(S,'ilodak',hedefIl);ok(res.ok,'ilodak çalışmalı');
const p1=X.paylar(S);ok(p1.il[hedefIl][S.pid]>pay0+0.2,'hedef ilde oy artmalı');ok(Math.abs(p1.ulusal[S.pid]-ul0)<0.35,'ulusal oy yaklaşık sabit kalmalı (il kaydırma)');
ok(S.stat.kasa<k0&&S.aksiyon.kalan===2,'maliyet ve aksiyon');
ok(!X.aksiyonYap(S,'ilodak',99).ok&&!X.aksiyonYap(S,'ilodak',-1).ok,'geçersiz il');
const a1=S.ilm[hedefIl];for(let m=0;m<6;m++){S.aksiyon.kalan=3;X.ayiBitir(S);S.kuyruk.length=0;S.sd=[];}ok(S.ilm[hedefIl]<a1*0.75,'yatırım zamanla sönmeli');
// 4) tekrar yorgunluğu + üst sınır
S=yeni(5);S.stat.kasa=1e9;X.ilmInit(S);for(let k=0;k<12;k++){S.aksiyon.kalan=3;X.aksiyonYap(S,'ilodak',10);}ok(S.ilm[10]<=0.35+1e-9,'yatırım üst sınırı');
// 5) miting bölgesel ilm
S=yeni(6);S.stat.kasa=1e9;S.aksiyon.kalan=3;X.ilmInit(S);const bolge=X.ILLER[0].bolge;X.aksiyonYap(S,'miting',bolge);
ok(X.ILLER.every((il,q)=>il.bolge!==bolge||S.ilm[q]>0),'miting bölge illerine yatırım yazmalı');
// 6) koltuk etkisi: büyük bir ilde tekrarlı kampanya koltuk sayısını artırabilir (30 tohum içinde en az bir kez)
let artti=0,denen=0;
for(let seed=1;seed<=30;seed++){const T=yeni(seed);T.stat.kasa=1e9;X.ilmInit(T);const Kt=X.karargah(T);const h=(Kt.firsat[0]||Kt.tehlike[0]);if(!h)continue;denen++;
  const s0=Kt.il[h.i];const before=X.bugunSecimOlsa(T).ilKoltuk[h.i][T.pid]||0;for(let k=0;k<3;k++){T.aksiyon.kalan=3;X.aksiyonYap(T,'ilodak',h.i);T.ilm[h.i]=Math.min(.35,T.ilm[h.i]);}
  const after=X.bugunSecimOlsa(T).ilKoltuk[h.i][T.pid]||0;if(after>before)artti++;ok(after>=before-1,'koltuk düşmemeli');}
console.log(JSON.stringify({denenen:denen,koltukArtanIl:artti}));ok(artti>=3,'il kampanyası bazı illerde koltuk getirmeli');
// 7) eski kayıt: ilm yok
S=yeni(8);delete S.ilm;ok(X.ilAnket(S).length===81&&S.ilm.length===81,'eski kayıt uyumu');
// 8) muhalif engeli
S=yeni(9);S.rol='muhalif';S.pd={destek:30,hizip:0,itibar:50,vekil:false};S.yeniBaskan={ad:'X',guc:50};S.stat.kasa=1e9;S.aksiyon.kalan=3;ok(!X.aksiyonYap(S,'ilodak',3).ok,'muhalif il kampanyası yapamaz');
console.log(bad?'KARARGAH TESTI BASARISIZ':'KARARGAH TESTI TAMAM');process.exitCode=bad?1:0;
