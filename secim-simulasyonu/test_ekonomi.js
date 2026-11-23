// Ekonomi testi: node test_ekonomi.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,politikaDegis,get PA(){return POL_AD}};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const rng={};['enf','issiz','buyume','butce','borc','vergi','yatirim','cari','memn'].forEach(k=>rng[k]=[1e9,-1e9]);
function run(S,pol){
  for(let m=0;m<75&&!S.bitti;m++){S.aksiyon.kalan=3;if(pol)pol(S,m);X.ayiBitir(S);S.kuyruk=[];S.sd=[];
    Object.keys(rng).forEach(k=>{const v=S.makro[k];ok(isFinite(v),k+' sonlu');rng[k][0]=Math.min(rng[k][0],v);rng[k][1]=Math.max(rng[k][1],v)});}
}
for(const seed of [1,2,3,4,5]){const S=X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});run(S);}
// oyuncu iktidarda: AK ile
const G=X.newGame({mod:'mevcut',partiId:'AK',partiAd:'T',renk:'#fff',ideo:'muh',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed:9});
ok(X.politikaDegis(G,'h',1).ok,'iktidar politika değiştirebilir');
const g0=G.makro.borc;run(G,(S,m)=>{if(m==5)X.politikaDegis(S,'f',1);});
const O=X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed:3});
ok(!X.politikaDegis(O,'h',1).ok,'muhalefet politika değiştiremez');
console.log(JSON.stringify(rng,(k,v)=>typeof v==='number'?Math.round(v*10)/10:v));
ok(rng.borc[1]<140&&rng.borc[0]>10,'borç makul');ok(rng.butce[0]>-15,'bütçe sınırlı');ok(rng.enf[1]<=90,'enflasyon sınır');
console.log(bad?'EKONOMI TESTI BASARISIZ':'EKONOMI TESTI TAMAM');process.exitCode=bad?1:0;
