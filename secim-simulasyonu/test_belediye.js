// Belediye yönetimi testi: node test_belediye.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,bldInit,bldSayi,bldOzet,bldYonet,bldTick,bldSecim,paylar,secimYap,uyumla,kartBul,kartSec,KARTLAR_E,hedef,tarihNo};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const yeni=(seed,mod)=>X.newGame({mod:mod||'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
// 1) başlangıç dağılımı
let S=yeni(1);const b=X.bldInit(S);ok(b.sahip.length===81&&b.perf.every(p=>p>=30&&p<=70),'81 il ve makul performans');ok(X.bldSayi(S)>5,'mevcut parti bazı illeri yönetmeli ('+X.bldSayi(S)+')');
const Sy=yeni(2,'yeni');ok(X.bldSayi(Sy)===0,'yeni parti başta belediye yönetmez');
// 2) aksiyonlar
S=yeni(3);S.stat.kasa=5e8;S.aksiyon.kalan=3;const il=S.bld?0:0;X.bldInit(S);const my=S.bld.sahip.findIndex(x=>x===S.pid);ok(my>=0,'oyuncunun ili var');
const p0=S.bld.perf[my];const r=X.aksiyonYap(S,'belediye',my);ok(r.ok&&S.bld.perf[my]>p0&&S.aksiyon.kalan===2,'yatırım performansı artırmalı ve aksiyon harcamalı');
const other=S.bld.sahip.findIndex(x=>x!==S.pid);const k0=S.stat.kasa;const r2=X.aksiyonYap(S,'belediye',other);ok(!r2.ok&&S.aksiyon.kalan===2&&S.stat.kasa===k0,'başkasının belediyesine yatırım yapılamaz, kasa ve aksiyon korunur');
const r3=X.aksiyonYap(S,'bldden',my);ok(r3.ok&&S.bld.denet[my]>S.ay,'denetim süresi başlamalı');ok(!X.aksiyonYap(S,'belediye',999).ok,'geçersiz il reddedilmeli');
// 3) ekonomi/bağımlılık: kötü ekonomi hedef performansı düşürür
S=yeni(4);X.bldInit(S);const i1=S.bld.sahip.findIndex(x=>x===S.pid);S.makro.enf=20;S.makro.issiz=6;const h1=S.bld.perf[i1];for(let k=0;k<30;k++)X.bldTick(S);const iyi=S.bld.perf[i1];
S=yeni(4);X.bldInit(S);S.makro.enf=90;S.makro.issiz=16;for(let k=0;k<30;k++)X.bldTick(S);const kotu=S.bld.perf[i1];ok(iyi>kotu+10,'ekonomi belediye performansını etkilemeli: '+Math.round(iyi)+' vs '+Math.round(kotu));
// 4) skandal: düşük performans daha çok skandal; denetim azaltır
function skandalSay(perf,den){let t=0;for(let sd=1;sd<=30;sd++){const T=yeni(50+sd);X.bldInit(T);for(let i=0;i<81;i++){T.bld.perf[i]=perf;if(den)T.bld.denet[i]=999;}for(let m=0;m<12;m++){for(let i=0;i<81;i++){T.bld.perf[i]=perf;}X.bldTick(T);}t+=T.bld.sk.filter((x,i)=>x>-99&&T.bld.sahip[i]===T.pid).length;}return t;}
const sLo=skandalSay(25,false),sHi=skandalSay(70,false),sDen=skandalSay(25,true);console.log('skandal',sLo,sHi,sDen);ok(sLo>sHi*1.5,'düşük performans daha çok skandal üretmeli');ok(sDen<sLo*0.6,'denetim skandalı azaltmalı');
// 5) oy etkisi: il düzeyinde pay + ulusal ivme (drift)
S=yeni(5);X.bldInit(S);const mine=[];S.bld.sahip.forEach((x,i)=>{if(x===S.pid)mine.push(i)});S.bld.perf=S.bld.perf.map(()=>50);const pid=S.pid;const a=X.paylar(S);S.bld.perf=S.bld.perf.map((p,i)=>mine.includes(i)?90:p);const c=X.paylar(S);const ort=(P)=>mine.reduce((t,i)=>t+P.il[i][pid],0)/mine.length;ok(ort(c)>ort(a)+0.2,'belediye başarısı o illerde oyu artırmalı ('+ort(a).toFixed(2)+'→'+ort(c).toFixed(2)+')');
S=yeni(5);X.bldInit(S);S.bld.perf=S.bld.perf.map(()=>85);S.makro.enf=20;S.makro.issiz=6;const d0=S.stat.drift;for(let k=0;k<6;k++)X.bldTick(S);ok(S.stat.drift>d0,'başarılı belediyeler ulusal ivmeyi artırmalı');
S=yeni(5);X.bldInit(S);S.bld.perf=S.bld.perf.map(()=>15);const d1=S.stat.drift;for(let k=0;k<6;k++)X.bldTick(S);ok(S.stat.drift<d1,'başarısız belediyeler ulusal ivmeyi düşürmeli');
// 6) yerel seçimde görevdekinin performansı
let w1=0,w2=0;for(let sd=1;sd<=25;sd++){const T=yeni(70+sd);X.bldInit(T);const T2=JSON.parse(JSON.stringify(T));T.bld.perf=T.bld.perf.map(()=>85);T2.bld.perf=T2.bld.perf.map(()=>15);
  const mk=(U)=>{const it=U.takvim.find(t=>t.tip==='yerel');const r=X.secimYap(U,it);return r.kazananlar.filter((x,i)=>x===U.bld.sahip[i]).length};w1+=mk(T);w2+=mk(T2);}
ok(w1>w2+25,'iyi performans görevdekini yerel seçimde korumalı ('+w1+' vs '+w2+')');
// 7) seçim sonrası mülkiyet devri
S=yeni(6);X.bldInit(S);const kaz=S.bld.sahip.map(x=>x===S.pid?'AK':S.pid);const m=X.bldSecim(S,{kazananlar:kaz});ok(S.bld.sahip.every((x,i)=>x===kaz[i])&&S.bld.gecmis.length===1,'sahipler güncellenmeli');
// 8) gelir ve itibar etkisi
S=yeni(7);X.bldInit(S);S.bld.perf=S.bld.perf.map(()=>80);S.makro.enf=20;S.makro.issiz=6;const ks=S.stat.kasa,it=S.stat.itibar;X.bldTick(S);ok(S.stat.kasa>ks,'iyi belediyeler gelir getirmeli');
S=yeni(8);X.bldInit(S);S.bld.perf=S.bld.perf.map(()=>20);const it2=S.stat.itibar;for(let k=0;k<3;k++)X.bldTick(S);ok(S.stat.itibar<it2,'kötü belediyeler itibarı düşürmeli');
// 9) eski kayıt: bld yokken yüklenir ve tick çalışır
S=yeni(9);delete S.bld;const u=X.uyumla(JSON.parse(JSON.stringify(S)));ok(u&&!u.bld,'eski kayıt yüklenmeli');X.bldTick(u);ok(u.bld&&u.bld.perf.length===81,'tick bld yaratmalı');
// 10) kartlar
ok(X.KARTLAR_E.filter(c=>c.id.startsWith('xb_')).length===4,'4 belediye kartı');
S=yeni(10);X.bldInit(S);const kc=X.KARTLAR_E.filter(c=>c.id.startsWith('xb_'));ok(kc.some(c=>c.kosul(S)),'kartlardan biri koşulu sağlamalı');kc.forEach(c=>{try{X.kartSec(S,{id:c.id},0);}catch(e){ok(false,'kart '+c.id+' çalışmalı: '+e.message);}});
// 11) uzun simülasyon: yerel seçim sonrası ve sonluluk
let sonlu=true,yerel=0;for(let sd=1;sd<=30;sd++){S=yeni(100+sd);for(let mm=0;mm<60&&!S.bitti;mm++){S.aksiyon.kalan=3;S.stat.kasa=Math.max(S.stat.kasa,5e7);const my2=S.bld?S.bld.sahip.findIndex(x=>x===S.pid):-1;if(my2>=0&&mm%2===0)X.aksiyonYap(S,'belediye',my2);X.ayiBitir(S);S.kuyruk.forEach(q=>{if(q.t==='secim'&&q.sonuc.tip==='yerel')yerel++;});S.kuyruk.length=0;S.sd=[];if(!isFinite(S.stat.itibar+S.stat.birlik+S.stat.drift+S.stat.kasa))sonlu=false;}
  ok(S.bld.perf.every(p=>p>=0&&p<=100),'performans sınırda kalmalı');}
ok(sonlu,'sonlu');ok(yerel>=25,'yerel seçimler yapılmalı ('+yerel+')');
console.log(bad?('BAŞARISIZ '+bad):'BELEDIYE TESTI TAMAM');process.exit(bad?1:0);
