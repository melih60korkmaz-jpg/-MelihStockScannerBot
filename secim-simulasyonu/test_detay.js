const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,aksiyonYap,kartSec,kartBul,kartCek,kadroInit,asama2Init,ilisInit,KARTLAR_E};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const S=X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed:3});X.kadroInit(S);X.asama2Init(S);X.ilisInit(S);S.stat.kasa=5e8;S.aksiyon.kalan=3;
const k0=S.stat.kasa;const r=X.aksiyonYap(S,'tatil');
ok(r.ok&&Array.isArray(r.detay)&&r.ad,'aksiyon detay ve ad');
const kasa=r.detay.find(d=>d.k==='Kasa');ok(kasa&&Math.abs(kasa.a-k0)<1&&Math.abs(kasa.b-S.stat.kasa)<1&&Math.abs(kasa.d-(S.stat.kasa-k0))<1,'kasa önce/sonra doğru');
const r2=X.aksiyonYap(S,'yok_boyle');ok(!r2.ok&&!r2.detay,'başarısız aksiyonda detay yok');
// kart
const c=X.KARTLAR_E.find(x=>x.id==='xn_med_dijital');const i0=S.stat.itibar,g0=S.grup.gencler;const kr=X.kartSec(S,{id:c.id,k:'',s:''},0);
ok(Array.isArray(kr.detay),'kart detay');const g=kr.detay.find(d=>d.k==='Gençler');ok(!g||Math.abs(g.b-S.grup.gencler)<1e-9,'grup farkı doğru');
ok(kr.detay.every(d=>isFinite(d.a)&&isFinite(d.b)&&Math.abs(d.d-(d.b-d.a))<1e-9),'farklar tutarlı');
console.log(JSON.stringify(r.detay.slice(0,4)));console.log(bad?'BAŞARISIZ':'DETAY TESTI TAMAM');process.exit(bad?1:0);
