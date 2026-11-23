// Denetim turu testleri: belediye borç/başkan/AI, harita katmanı. node test_denetim.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,bldInit,bldYonet,bldTick,bldOzet,bldSayi,uyumla,kadroInit,asama2Init,ilisInit,ILLER,PARTILER,AKSIYONLAR};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const yeni=(seed,pid)=>X.newGame({mod:'mevcut',partiId:pid||'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
let S=yeni(1);const b=X.bldInit(S);ok(b.borc&&b.borc.length===81&&b.borc.every(x=>x>=0&&x<=100),'borç dizisi');
// eski kayıt (borç yok)
S=yeni(2);delete S.bld;X.bldInit(S);const eski=JSON.parse(JSON.stringify(S));delete eski.bld.borc;const u=X.uyumla(eski);const bb=X.bldInit(u);ok(bb.borc&&bb.borc.length===81,'eski kayıtta borç sonradan oluşur');
// yatırım borcu artırır, yapılandırma azaltır
S=yeni(3);let B=X.bldInit(S);B.sahip[5]=S.pid;B.borc[5]=40;let r=X.bldYonet(S,'yat',5);ok(r.ok&&B.borc[5]===47,'yatırım borcu artırır');r=X.bldYonet(S,'borc',5);ok(r.ok&&B.borc[5]===25,'yapılandırma borcu azaltır');B.borc[5]=10;ok(!X.bldYonet(S,'borc',5).ok,'düşük borçta yapılandırma reddedilir');
// başkan değişimi
B.perf[5]=70;B.sk[5]=-99;ok(!X.bldYonet(S,'baskan',5).ok,'iyi belediyede başkan değişmez');B.perf[5]=30;B.sk[5]=S.ay;const r2=X.bldYonet(S,'baskan',5);ok(r2.ok&&B.perf[5]>=48&&B.sk[5]===-99,'başkan değişince performans toparlanır ve skandal temizlenir');
ok(!X.bldYonet(S,'baskan',6).ok||B.sahip[6]===S.pid,'başkasının belediyesinde işlem yok');
// aksiyonlar kayıtlı
['bldborc','bldbaskan'].forEach(id=>ok(X.AKSIYONLAR.some(a=>a.id===id),id+' aksiyonu'));
S=yeni(4);B=X.bldInit(S);B.sahip[7]=S.pid;B.borc[7]=60;S.aksiyon.kalan=3;S.stat.kasa=5e8;const ar=X.aksiyonYap(S,'bldborc',7);ok(ar.ok!==false,'aksiyon yürür: '+(ar.msg||''));
// borç yüksek -> performans hedefi düşer
S=yeni(5);B=X.bldInit(S);B.sahip[8]=S.pid;B.borc[8]=40;S.bld=B;const t0=(function(){let a=0;for(let k=0;k<30;k++){B.perf[8]=50;B.borc[8]=40;X.bldTick(S);a+=B.perf[8]}return a/30})();const t1=(function(){let a=0;for(let k=0;k<30;k++){B.perf[8]=50;B.borc[8]=95;X.bldTick(S);a+=B.perf[8]}return a/30})();ok(t1<t0-1,'yüksek borç performansı düşürür ('+t0.toFixed(1)+' → '+t1.toFixed(1)+')');
// yapay zekâ belediyesi yatırım yapıyor ve skandal yaşıyor
let yat=0,skn=0,dbor=0;for(let sd=10;sd<30;sd++){S=yeni(sd);B=X.bldInit(S);const ai=B.sahip.findIndex(x=>x!==S.pid);const yb=B.yat.slice();const sk0=B.sk.slice();for(let m=0;m<60;m++){S.ay++;X.bldTick(S);}for(let i=0;i<81;i++){if(B.sahip[i]!==S.pid){if(B.sk[i]>=0)skn++;}}B.yat.forEach((y,i)=>{if(B.sahip[i]!==S.pid&&y>0.05)yat++});}
console.log('AI belediye: yatırım izi',yat,'skandal',skn);ok(skn>0,'AI belediyelerde skandal olur');ok(yat>0,'AI belediyeler yatırım yapar');
// borç sonlu ve sınırlı
S=yeni(40);B=X.bldInit(S);for(let m=0;m<200;m++){S.ay++;X.bldTick(S)}ok(B.borc.every(x=>isFinite(x)&&x>=0&&x<=100)&&B.perf.every(x=>isFinite(x)&&x>=0&&x<=100),'değerler sınırlı');
// ulusal etki: iyi belediyeler drift'i artırır
function drift(perf){let s=0;for(let sd=1;sd<=10;sd++){const T=yeni(50+sd);const Bz=X.bldInit(T);for(let i=0;i<81;i++){Bz.sahip[i]=T.pid;Bz.perf[i]=perf;Bz.borc[i]=20}T.stat.drift=0;for(let m=0;m<6;m++){X.bldTick(T)}s+=T.stat.drift}return s/10}
const di=drift(80),dk=drift(25);console.log('drift iyi',di.toFixed(3),'kötü',dk.toFixed(3));ok(di>dk+0.05,'belediye başarısı ulusal drift\'i etkiler');
console.log(bad?'BAŞARISIZ '+bad:'DENETIM TESTI TAMAM');process.exit(bad?1:0);
