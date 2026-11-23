const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,kadroInit,asama2Init,sonBilgi,SON_TIPLER,hafInit};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const bul={};let n=0;
for(let sd=1;sd<=60;sd++){const S=X.newGame({mod:'mevcut',partiId:['CHP','AK','MHP','DEM'][sd%4],partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:['kolay','orta','zor'][sd%3],stil:'katilimci',seed:sd});
 for(let m=0;m<400&&!S.bitti;m++){S.aksiyon.kalan=3;S.kuyruk.length=0;X.ayiBitir(S);}
 if(!S.bitti)continue;n++;const b=X.sonBilgi(S);ok(X.SON_TIPLER[b.key],'bilinen son '+b.key);ok(b.baslik&&isFinite(b.oy)&&isFinite(b.koltuk),'alanlar sonlu');ok(Array.isArray(b.ozellik),'özellik');bul[b.key]=(bul[b.key]||0)+1;}
console.log('biten',n,JSON.stringify(bul));ok(n>=40,'çoğu oyun bitmeli');ok(Object.keys(bul).length>=3,'en az 3 farklı son');
console.log(bad?'BAŞARISIZ':'SON TESTI TAMAM');process.exit(bad?1:0);
