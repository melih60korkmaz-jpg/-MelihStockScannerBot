// Kriz yoğunluğu: oyun başına sayı, 12 ayda en çok kaç, ardışık kriz arası. node test_kriz.js
const fs=require('fs'),vm=require('vm');const ctx=vm.createContext({console,Math,Date,JSON});
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nvar LOG=[];var _kc=kartCek;kartCek=function(S){var r=_kc(S);if(r&&kartKat(r.id)==="kriz")LOG.push(S.ay);return r};this.X={newGame,ayiBitir,get LOG(){return LOG},reset(){LOG.length=0}};',ctx);
const X=ctx.X;let tot=[],maxY=0,minGap=99,ok=true;
for(let seed=1;seed<=25;seed++){X.reset();
 const S=X.newGame({mod:'mevcut',partiId:seed%2?'CHP':'DEM',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
 for(let a=0;a<78;a++){try{X.ayiBitir(S);S.kuyruk=[];S.kz=[]}catch(e){console.log('HATA seed',seed,e.message);ok=false;break}}
 const L=X.LOG.slice();tot.push(L.length);
 for(let i=0;i<L.length;i++){const w=L.filter(x=>x>=L[i]&&x<L[i]+12).length;if(w>maxY)maxY=w;if(i&&L[i]-L[i-1]<minGap)minGap=L[i]-L[i-1]}
}
const avg=tot.reduce((a,b)=>a+b,0)/tot.length;
console.log('oyun başına kriz ort',avg.toFixed(1),'min',Math.min(...tot),'maks',Math.max(...tot),'| 12 ayda en çok',maxY,'| en kısa ara',minGap,'ay');
if(maxY>3||minGap<4||avg<4||avg>14){ok=false;console.log('SINIR DIŞI')}
process.exit(ok?0:1);
