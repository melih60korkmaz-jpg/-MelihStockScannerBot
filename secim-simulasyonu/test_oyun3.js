// Seçim analizi, miras zinciri, rakip kini: 12 oyun, kartlar ilk seçenekle oynanır. node test_oyun3.js
const fs=require('fs'),vm=require('vm');const ctx=vm.createContext({console,Math,Date,JSON});
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,kartSec,PARTILER};',ctx);
const X=ctx.X;let ok=true,say={kinMax:0,analiz:0,miras:0,kin:0,hata:0},mirasAy=[];
for(let seed=1;seed<=12;seed++){
 const S=X.newGame({mod:'mevcut',partiId:seed%2?'CHP':'DEM',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
 for(let a=0;a<78&&!S.bitti;a++){
  if(a%2===0&&S.rk){S.hamle=S.hamle||[];Object.keys(S.rk).forEach(id=>{const k=S.rk[id].kale;if(k&&k.length)S.hamle.push({id:'miting',h:k[0],ay:S.ay})})}
  try{X.ayiBitir(S)}catch(e){say.hata++;console.log('HATA',seed,a,e.message);break}
  S.kuyruk.forEach(q=>{ if(q.t==='olay'){ if((q.satirlar||[]).some(x=>typeof x!=='string'&&!(x&&x.k!=null&&typeof x.v==='string'))){say.hata++;console.log('SATIR NESNE',q.ust)}  if(/SEÇİM ANALİZİ/.test(q.ust))say.analiz++; if(/GEÇMİŞİN GÖLGESİ/.test(q.ust)){say.miras++;mirasAy.push(S.ay)} } else if(q.t==='kart'){ try{X.kartSec(S,q,0)}catch(e){} } });
  Object.keys(S.rk||{}).forEach(id=>{if((S.rk[id].kin||0)>say.kinMax)say.kinMax=S.rk[id].kin});
  S.kuyruk=[];S.kz=[];
 }
 Object.keys(S.rk||{}).forEach(id=>{if((S.rk[id].kin||0)>0)say.kin++});
}
console.log('seçim analizi sahnesi',say.analiz,'| miras sahnesi',say.miras,'| rakip kini tepe değeri',say.kinMax.toFixed(1),'| hata',say.hata);
if(say.analiz<12||say.miras<1||say.kinMax<=0||say.hata){ok=false;console.log('BEKLENEN: analiz>=12 (oyun başına >=1), miras>=1, hata=0')}
process.exit(ok?0:1);
