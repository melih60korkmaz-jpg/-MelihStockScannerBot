// Kadro, bakanlar kurulu, Meclis testi: node test_kadro.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,kartSec,kartBul,kartMetni,kadroDegis,kadroOdul,kadroInit,yasaOlasilik,meclisKoltuk,BAKANLIK};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const rep={yasa:0,kabul:0,gens:0,bakanDegis:0,kadroIstifa:0,bolgeAyril:0};
for(const seed of [1,2,3,4,5,6]){
  const S=X.newGame({mod:'mevcut',partiId:'AK',partiAd:'T',renk:'#fff',ideo:'muh',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
  X.kadroInit(S);ok(S.bakanlar&&Object.keys(S.bakanlar).length===7,'7 bakan');ok(Object.keys(S.bbs).length===7,'7 bölge başkanı');
  const ads0=S.kadro.map(k=>k.ad).join();
  for(let m=0;m<75&&!S.bitti;m++){
    S.aksiyon.kalan=3;if(m==10){const r=X.kadroDegis(S,'kadro',2);ok(r.ok,'kadro değiştirildi');const r2=X.kadroOdul(S,'bolge','M');ok(r2.ok,'ödül');}
    if(m==12){const r=X.kadroDegis(S,'bakan','maliye');ok(r.ok||/koalisyon|başkan olmadığın/.test(r.msg),'bakan değişimi: '+r.msg);}
    X.ayiBitir(S);
    S.kuyruk.filter(x=>x.t==='kart').forEach(it=>{const k=X.kartBul(it.id);ok(k,'kart '+it.id);if(!k)return;ok(X.kartMetni(it).indexOf('{')<0,'yer tutucu '+it.id);
      if(it.id.startsWith('y|')){rep.yasa++;if(it.id==='y|gens')rep.gens++;const r=X.kartSec(S,it,0);if(/kabul edildi/.test(r.s))rep.kabul++;}else X.kartSec(S,it,0);});
    S.kuyruk=[];S.sd=[];
    S.kadro.forEach(k=>ok(isFinite(k.perf)&&k.perf>=0&&k.perf<=100&&isFinite(k.sad),'kadro sayıları'));
    Object.values(S.bakanlar||{}).forEach(k=>ok(k.perf>=0&&k.perf<=100,'bakan perf'));
    ['butce','memn','cari'].forEach(k=>ok(isFinite(S.makro[k]),'makro '+k));
  }
  rep.kadroIstifa+=S.tarihce.filter(t=>/istifa etti/.test(t.m)).length;
  const p=X.yasaOlasilik(S);ok(p>=0.05&&p<=0.95,'olasılık aralığı');
}
console.log(JSON.stringify(rep));ok(rep.yasa>0,'yasa kartı çıktı');
// muhalefette bakanlar yok
const O=X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed:2});X.kadroInit(O);ok(!O.bakanlar,'muhalefette bakan yok');
console.log(bad?'KADRO TESTI BASARISIZ':'KADRO TESTI TAMAM');process.exitCode=bad?1:0;
