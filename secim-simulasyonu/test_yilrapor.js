const fs=require('fs'),vm=require('vm');const ctx=vm.createContext({console,Math,Date,JSON});
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir};',ctx);
const X=ctx.X;let ok=true;
const S=X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed:3});
let n=0;for(let a=0;a<30;a++){X.ayiBitir(S);n+=S.kuyruk.filter(o=>o.t==='olay'&&/YIL SONU/.test(o.ust||'')).length;S.kuyruk=[];}
const ek=S.kuyruk;console.log('yıl raporu sayısı (30 ay):',n);
if(n<2||n>3){ok=false;console.log('BEKLENEN 2-3')}
process.exit(ok?0:1);
