// Senaryo ve tekrar oynanabilirlik testi: node test_senaryo.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,kartSec,SENARYOLAR,siralama};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const rows={};const sigs=new Set();
['klasik','kriz','refah','kirilgan','kutup','rastgele'].forEach(sn=>{
  const r={enf0:0,enf36:0,akPay2028:0,lider2028:{},n:0,hikaye:new Set()};
  for(let seed=1;seed<=8;seed++){
    const S=X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed,senaryo:sn});
    ok(!!X.SENARYOLAR[S.senaryo],'senaryo atandı');r.enf0+=S.makro.enf;r.hikaye.add(S.senaryo);
    let ak=null;
    for(let m=0;m<60&&!S.bitti;m++){S.aksiyon.kalan=3;X.aksiyonYap(S,'miting','M');X.ayiBitir(S);
      S.kuyruk.forEach(q=>{if(q.t==='kart')X.kartSec(S,q,0);if(q.t==='secim'&&q.sonuc.tip==='genel'&&ak===null){ak=q.sonuc.ulusal.AK||0;const l=X.siralama(q.sonuc.ulusal)[0];r.lider2028[l]=(r.lider2028[l]||0)+1;}});S.kuyruk=[];S.sd=[];
      ['enf','issiz','buyume','borc','memn'].forEach(k=>ok(isFinite(S.makro[k]),k));}
    r.enf36+=S.makro.enf;r.akPay2028+=ak||0;r.n++;sigs.add(sn+':'+(ak||0).toFixed(1));
  }
  rows[sn]={enf0:(r.enf0/r.n).toFixed(0),enf60:(r.enf36/r.n).toFixed(0),AK2028:(r.akPay2028/r.n).toFixed(1),birinci:JSON.stringify(r.lider2028),cesit:r.hikaye.size};
});
console.table(rows);
ok(rows.kriz.enf0>60&&rows.refah.enf0<30,'senaryo makro başlangıcı');
ok(+rows.kriz.AK2028<+rows.refah.AK2028,'kriz iktidarı zayıflatır, refah güçlendirir');
ok(sigs.size>=30,'farklı sonuç çeşitliliği');
console.log(bad?'SENARYO TESTI BASARISIZ':'SENARYO TESTI TAMAM');process.exitCode=bad?1:0;
