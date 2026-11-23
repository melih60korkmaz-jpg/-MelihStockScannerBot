// Denetim: medya haber operasyonları. node test_denetim2.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,mdInit,mdTick,mdHaber,mdSkandalKoz,bldInit,kadroInit,asama2Init,ilisInit,mcInit,mdRakip,AKSIYONLAR,uyumla,muhalifMu};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const yeni=(seed,pid)=>X.newGame({mod:'mevcut',partiId:pid||'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
['haberlek','haberyalan','haberduz','haberortaya'].forEach(id=>ok(X.AKSIYONLAR.some(a=>a.id===id&&a.hedef==='medya'),id+' tanımlı'));
function ort(f,n){let t=0;for(let sd=1;sd<=n;sd++)t+=f(sd);return t/n}
// sızdırma: rakip gücü düşer, yakın yayında şans artar
const rg=(tip,yakin)=>ort(sd=>{const S=yeni(sd);X.mdInit(S);const rid=X.mdRakip(S);const g0=S.rk[rid].guc;S.medya[0].yakin=yakin;S.medya[0].guven=60;X.mdHaber(S,tip,0);return g0-S.rk[rid].guc},200);
const z1=rg('haberlek',60),z2=rg('haberlek',-60);console.log('sızdırma ort. rakip kaybı yakın',z1.toFixed(2),'uzak',z2.toFixed(2));ok(z1>z2,'yakın yayında sızdırma daha etkili');ok(z1>0.3,'sızdırma rakibi zayıflatır');
// asılsız haber: ortalamada zarar verir ama yalanlanınca itibar/güven düşer
let yal=0,gdus=0,it=0,N=300;for(let sd=1;sd<=N;sd++){const S=yeni(sd);X.mdInit(S);S.medya[0].guven=60;const i0=S.stat.itibar,g0=S.medya[0].guven;const r=X.mdHaber(S,'haberyalan',0);if(S.medya[0].guven<g0-8){yal++;it+=i0-S.stat.itibar}if(r.fx&&r.fx.itibar<0)gdus++;}
console.log('yalan ortaya çıkma oranı',(yal/N).toFixed(2));ok(yal/N>0.1&&yal/N<0.5,'yalan makul oranda ortaya çıkar');
// düzeltme: yalnızca aktif yanlış haber varken
let S=yeni(5);X.mdInit(S);ok(!X.mdHaber(S,'haberduz',0).ok,'yanlış haber yokken düzeltme reddedilir');
S.md.yanlis={idx:1,ay:S.ay,sid:2,kim:'AK'};const gv=S.medya[1].guven;const gd=S.medya[0].guven;const rd=X.mdHaber(S,'haberduz',0);ok(rd.ok&&!S.md.yanlis,'düzeltme haberi söndürür');ok(S.medya[1].guven<gv-3,'yanlış haberi yapan yayının güveni düşer');ok(S.medya[0].guven>=gd+0.9,'genel haber güveni artar');
// yanlış haber itibarı aşındırır ve kendi kendine söner
S=yeni(6);X.mdInit(S);S.md.yanlis={idx:1,ay:S.ay,sid:2,kim:'AK'};const it0=S.stat.itibar;const gg=S.medya[1].guven;for(let m=0;m<7;m++){S.ay++;X.mdTick(S)}ok(S.stat.itibar<it0-1,'yanlış haber itibarı aşındırır');ok(!S.md.yanlis,'5 ay sonra söner');ok(S.medya[1].guven<gg,'sönen haber yayının güvenini düşürür');
// rakip yapay zekâ asılsız haber çıkarır (sıklık makul)
let ai=0;for(let sd=1;sd<=30;sd++){S=yeni(100+sd);X.mdInit(S);S.ay=10;let ilk=-1;for(let m=0;m<60;m++){S.ay++;S.md.yanlis=S.md.yanlis&&null;const a=S.md.yanlis;X.mdTick(S);if(S.md.yanlis){ai++;}}}
console.log('AI yanlış haber (30 oyun x 60 ay)',ai,'ort/oyun',(ai/30).toFixed(1));ok(ai>0,'AI yanlış haber üretir');ok(ai/30<12,'AI yanlış haber aşırı sık değil');
// rakip skandalı ortaya çıkarma
S=yeni(8);const B=X.bldInit(S);ok(!X.mdHaber(S,'haberortaya',0).ok,'skandal yokken reddedilir');const ai1=B.sahip.findIndex(x=>x!==S.pid);B.sk[ai1]=S.ay;B.sahip[ai1]='AK';let basari=0;for(let k=0;k<80;k++){const T=yeni(200+k);const Bt=X.bldInit(T);const j=Bt.sahip.findIndex(x=>x!==T.pid);Bt.sk[j]=T.ay;T.medya[0].guven=70;X.mdInit(T);X.mdRakip(T);const rid=Bt.sahip[j];const g0=T.rk[rid]?T.rk[rid].guc:0;const r=X.mdHaber(T,'haberortaya',0);if(r.ok&&T.rk[rid]&&T.rk[rid].guc<g0)basari++}ok(basari>20,'skandal çıkarma rakibi zayıflatır ('+basari+'/80)');
// muhalif modunda skandalı büyütme açık
S=yeni(9);S.rol='muhalif';X.mdInit(S);S.md.sk={taraf:'rakip',durum:'acik',evre:0,siddet:1,ay:S.ay,kisi:'X',bakan:'maliye'};S.gov=['AK'];ok(X.mdSkandalKoz(S).ok,'muhalif modunda skandal büyütme açık');
// iktidarda yasak
S=yeni(10);S.gov=[S.pid];X.mdInit(S);ok(!X.mdSkandalKoz(S).ok,'iktidar skandalı büyütemez');
// eski kayıt: md.yanlis yok
S=yeni(11);const e=JSON.parse(JSON.stringify(S));delete e.md;const u=X.uyumla(e);X.mdInit(u);for(let m=0;m<3;m++){u.ay++;X.mdTick(u)}ok(true,'eski kayıt');
// uzun simülasyon: sonlu
S=yeni(12);for(let m=0;m<80&&!S.bitti;m++){S.aksiyon.kalan=3;S.kuyruk.length=0;if(m%5===0)X.mdHaber(S,'haberyalan',m%3);X.ayiBitir(S);}ok(S.medya.every(x=>isFinite(x.guven)&&x.guven>=0&&x.guven<=100&&isFinite(x.yakin)),'medya değerleri sınırlı');
console.log(bad?'BAŞARISIZ '+bad:'DENETIM2 TESTI TAMAM');process.exit(bad?1:0);
