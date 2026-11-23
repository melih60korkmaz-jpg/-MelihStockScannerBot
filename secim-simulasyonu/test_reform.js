// Hükümet reformları: yalnızca iktidar, bekleme süresi, makro etkisi. node test_reform.js
const fs=require('fs'),vm=require('vm');let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const cx={console,Math,JSON,Object,Array,Date};vm.createContext(cx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,kadroInit,asama2Init,ilisInit,govMu,kararBilgi};',cx);const X=cx.X;
const yeni=(pid,sd)=>{const S=X.newGame({mod:'mevcut',partiId:pid,partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed:sd});X.kadroInit(S);X.asama2Init(S);X.ilisInit(S);S.stat.kasa=5e7;S.aksiyon.kalan=3;return S};
let S=yeni('CHP',2);ok(!X.govMu(S,S.pid),'CHP muhalefette');ok(!X.aksiyonYap(S,'reformalt').ok,'muhalefet reform yapamaz');
S=yeni('AK',2);ok(X.govMu(S,S.pid),'AK iktidarda');
let b0=S.makro.borc,y0=S.makro.yatirim,r=X.aksiyonYap(S,'reformalt');ok(r.ok,'altyapı çalışır: '+r.msg);ok(S.makro.borc>b0&&S.makro.yatirim>y0,'altyapı: borç ve yatırım artar');
r=X.aksiyonYap(S,'reformalt');ok(!r.ok,'6 ay bekleme');
b0=S.makro.borc;r=X.aksiyonYap(S,'reformtasarruf');ok(r.ok&&S.makro.borc<b0,'tasarruf borcu düşürür');
const m0=S.makro.memn;r=X.aksiyonYap(S,'reformsosyal');ok(r.ok&&S.makro.memn>m0,'sosyal yardım memnuniyeti artırır');
ok(S.kuyruk.filter(x=>x.t==='olay'&&x.ust==='HÜKÜMET REFORMU').length===3,'üç reform sahnesi');
for(let i=0;i<7;i++){S.aksiyon.kalan=0;S.kuyruk.length=0;X.ayiBitir(S)}S.aksiyon.kalan=3;ok(X.aksiyonYap(S,'reformalt').ok,'6 ay sonra yenilenebilir');
ok(X.kararBilgi(S,'reformsosyal')&&X.kararBilgi(S,'reformsosyal').ad,'karar ekranı bilgisi');
console.log(bad?'BAŞARISIZ '+bad:'REFORM TESTI TAMAM');process.exit(bad?1:0);
