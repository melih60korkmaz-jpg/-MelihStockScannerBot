// Aşama 4: genişletilmiş olay havuzu. node test_olay2.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,kartSec,kartBul,kartMetni,KARTLAR_E,KARTLAR_ZE,ZINCIR,KARTLAR,KARTLAR_Z};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const yeni=(seed,mod)=>X.newGame({mod,partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
const FX=['itibar','birlik','stres','kasa','drift','grup','org','uye','yakin','saglik','vekil'];
// 1) şema
const ids=new Set();
X.KARTLAR_E.concat(X.KARTLAR_ZE).forEach(c=>{
  ok(!ids.has(c.id),'yinelenen id '+c.id);ids.add(c.id);
  ok(c.baslik&&c.metin&&c.kat,'alan eksik '+c.id);
  ok(c.sec.length>=3,'en az 3 seçenek '+c.id);
  c.sec.forEach(o=>{ok(o.t&&o.s!==undefined,'seçenek '+c.id);Object.keys(o.fx).forEach(k=>ok(FX.indexOf(k)>=0,'bilinmeyen fx '+k+' @'+c.id));
    if(o.risk)ok(o.risk.p>0&&o.risk.p<1&&o.risk.s,'risk '+c.id);});
  ok(c.id.charAt(0)==='x','id öneki '+c.id);
});
Object.keys(X.ZINCIR).forEach(k=>X.ZINCIR[k].forEach(z=>ok(X.kartBul(z.id),'zincir hedefi yok '+z.id)));
// 2) her seçenek oynanabilir, sonlu
let oynanan=0;
X.KARTLAR_E.concat(X.KARTLAR_ZE).forEach(c=>{for(let i=0;i<c.sec.length;i++){const S=yeni(7+i,'mevcut');S.gov=[S.pid,'AK'];const q={t:'kart',id:c.id,k:'Ali'};
  try{ok(X.kartMetni(q).indexOf('{')<0||c.metin.indexOf('{k}')>=0,'yer tutucu '+c.id);X.kartSec(S,q,i);oynanan++;
   ok(isFinite(S.stat.kasa)&&isFinite(S.stat.itibar)&&isFinite(S.stat.birlik)&&isFinite(S.stat.drift),'sonlu '+c.id);
   ok(S.stat.itibar>=0&&S.stat.itibar<=100&&S.stat.birlik>=0&&S.stat.birlik<=100,'sınır '+c.id);}catch(e){ok(false,'çöktü '+c.id+' '+e.message)}}});
// 3) oyun içinde görülme
const gorulen=new Set(),zinc=new Set();
for(let seed=1;seed<=24;seed++){const S=yeni(seed,seed%2?'mevcut':'yeni');
  for(let m=0;m<70&&!S.bitti;m++){S.aksiyon.kalan=3;X.ayiBitir(S);
    while(S.kuyruk.length){const q=S.kuyruk.shift();if(q.t==='kart'){if(q.id.charAt(0)==='x'){gorulen.add(q.id);if(q.id.indexOf('xz_')===0)zinc.add(q.id);}X.kartSec(S,q,0);}}S.sd=[];}}
console.log(JSON.stringify({yeniKart:X.KARTLAR_E.length,zincirKart:X.KARTLAR_ZE.length,seceneklerOynandi:oynanan,oyundaGorulenYeni:gorulen.size,zincirGorulen:zinc.size}));
ok(gorulen.size>=45,'yeni kartların çoğu oyunda görülmeli');ok(zinc.size>=4,'zincir kartları tetiklenmeli');
console.log(bad?'OLAY2 TESTI BASARISIZ':'OLAY2 TESTI TAMAM');process.exitCode=bad?1:0;
