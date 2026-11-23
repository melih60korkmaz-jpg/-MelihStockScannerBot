// Olay sahneleri (istifa/kabine): kuyrukta özetten sonra, alanları dolu, ayda en çok 2. node test_olay4.js
const fs=require('fs'),vm=require('vm');const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,kadroInit,asama2Init,ilisInit,kartBul,kartSec};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
let toplam=0,bakan=0,yon=0,siraHata=0,alanHata=0,fazla=0,aylar=0;
for(let sd=1;sd<=60;sd++){const S=X.newGame({mod:'mevcut',partiId:sd%2?'CHP':'AK',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',senaryo:'klasik',seed:sd});X.kadroInit(S);X.asama2Init(S);X.ilisInit(S);
 for(let m=0;m<48&&!S.bitti;m++){S.aksiyon.kalan=3;
  // düşük performans/ sadakat zorla ki olaylar görülsün
  (S.kadro||[]).forEach(k=>{k.sad=Math.min(k.sad,20)});if(S.bakanlar)Object.keys(S.bakanlar).forEach(k=>{S.bakanlar[k].perf=20});
  S.kuyruk.length=0;X.ayiBitir(S);aylar++;
  const q=S.kuyruk,oi=q.findIndex(x=>x.t==='ozet'),ol=q.filter(x=>x.t==='olay');
  if(ol.filter(o=>o.ust!=='SEÇİM ANALİZİ').length>2)fazla++;ol.forEach(o=>{toplam++;if(o.ust.indexOf('KABİNE')>=0)bakan++;if(o.ust.indexOf('PARTİ YÖNETİMİ')>=0)yon++;if(!(o.ikon&&o.ust&&o.baslik&&o.alt))alanHata++;if(oi>=0&&q.indexOf(o)<oi)siraHata++;});
  S.kuyruk.length=0;}}
console.log('olay sayısı',toplam,'bakan',bakan,'yönetim',yon,'ay',aylar);
ok(toplam>0,'olay üretilir');ok(bakan>0,'bakan istifası sahnesi görülür');ok(yon>0,'yönetim istifası sahnesi görülür');ok(alanHata===0,'tüm olaylarda ikon/üst/başlık/alt dolu');ok(siraHata===0,'olaylar özetten sonra gelir');ok(fazla===0,'ayda en fazla 2 olay');
console.log(bad?'BAŞARISIZ '+bad:'OLAY4 TESTI TAMAM');process.exit(bad?1:0);
