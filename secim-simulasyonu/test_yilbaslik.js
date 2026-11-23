// "Yılın galibi sensin" yalnızca oyuncunun artışı en büyükse çıkar. node test_yilbaslik.js
const fs=require('fs'),vm=require('vm');const ctx=vm.createContext({console,Math,Date,JSON});
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,kartSec,siralama};',ctx);
const X=ctx.X;let say={galip:0,guclu:0,zor:0,den:0},bad=0;
for(let seed=1;seed<=40;seed++){
 const S=X.newGame({mod:'mevcut',partiId:seed%2?'CHP':'DEM',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
 let onceki=null;
 for(let a=0;a<72&&!S.bitti;a++){
  if(S.ay>0&&S.ay%12===11&&S.yil0)onceki=JSON.parse(JSON.stringify(S.anket));
  X.ayiBitir(S);
  S.kuyruk.forEach(q=>{if(q.t==='olay'&&/YIL SONU/.test(q.ust)){
    const y0=S.yil0;
    if(/galibi/.test(q.baslik)){say.galip++;}
    if(/Güçlü/.test(q.baslik))say.guclu++; if(/Zor/.test(q.baslik))say.zor++; if(/Dengeli/.test(q.baslik))say.den++;
    if(/Dengeli/.test(q.baslik)&&/kazanç|kayıp/.test(q.alt)){bad++;console.log('TUTARSIZ alt',q.alt)}
  }; if(q.t==='kart'){try{X.kartSec(S,q,0)}catch(e){}}});
  S.kuyruk=[];S.kz=[];
 }
}
console.log(say,'tutarsız',bad);process.exit(bad?1:0);
