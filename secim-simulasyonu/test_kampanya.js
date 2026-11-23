// Kampanya modu + kabine/erken seçim sahneleri. node test_kampanya.js
const fs=require('fs'),vm=require('vm');let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const cx={console,Math,JSON,Object,Array,Date};vm.createContext(cx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,kadroInit,asama2Init,ilisInit,kampAcik,secimeAy,aksiyonBul,kararBilgi,erkenSecimIlan,kabineDus};',cx);const X=cx.X;
const yeni=sd=>{const S=X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed:sd});X.kadroInit(S);X.asama2Init(S);X.ilisInit(S);S.stat.kasa=5e7;return S};
let S=yeni(4);S.aksiyon.kalan=3;ok(!X.kampAcik(S),'başta kampanya kapalı');let r=X.aksiyonYap(S,'kampreklam');ok(!r.ok,'kapalıyken reddedilir: '+r.msg);
let n=0;while(X.secimeAy(S).ay>3&&n++<80){S.aksiyon.kalan=0;S.kuyruk.length=0;X.ayiBitir(S)}
ok(X.kampAcik(S),'son 3 ayda kampanya açılır (ay '+X.secimeAy(S).ay+')');
for(const [id,h] of [['kamptur',2],['kampreklam'],['kampmiting']]){S.aksiyon.kalan=3;const k0=S.stat.kasa,d0=S.stat.drift;r=X.aksiyonYap(S,id,h);ok(r.ok,id+' çalışır: '+(r.msg||''));ok(S.stat.kasa<k0,id+' kasadan düşer');ok(r.detay&&r.kid!==undefined,id+' karar kaydı')}
const bi=X.kararBilgi(S,'kamptur',2);ok(bi&&bi.ad,'karar ekranı bilgisi var');
// kampanya etkisi: anket artar (aynı tohum, kampanyalı vs kampanyasız)
function sim(kamp){const T=yeni(9);let q=0;while(X.secimeAy(T).ay>3&&q++<80){T.aksiyon.kalan=0;T.kuyruk.length=0;X.ayiBitir(T)}const a0=T.anket[T.pid];for(let i=0;i<3;i++){T.aksiyon.kalan=3;if(kamp){X.aksiyonYap(T,'kampreklam');X.aksiyonYap(T,'kampmiting');X.aksiyonYap(T,'kamptur',3)}T.kuyruk.length=0;X.ayiBitir(T)}return T.anket[T.pid]-a0}
const a=sim(true),b=sim(false);ok(a>b,'kampanya anketi yükseltir ('+a.toFixed(2)+' > '+b.toFixed(2)+')');
// sahneler
S=yeni(5);S.kuyruk.length=0;X.kabineDus(S,'deneme');ok(S.kuyruk.some(x=>x.t==='olay'&&x.ust==='HÜKÜMET DÜŞTÜ'),'kabine düşme sahnesi kuyruğa girer');
S=yeni(6);S.kuyruk.length=0;const m=X.erkenSecimIlan(S,'deneme');ok(S.kuyruk.some(x=>x.t==='olay'&&x.erken),'erken seçim sahnesi kuyruğa girer');
console.log(bad?'BAŞARISIZ '+bad:'KAMPANYA TESTI TAMAM');process.exit(bad?1:0);
