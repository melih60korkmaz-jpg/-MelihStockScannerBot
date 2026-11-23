// Olay motoru testi: node test_olay.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,kartSec,kartBul,kartMetni,kartCek,get KZ(){return KARTLAR_Z},BOLGE,GRUPLAR,BOLGE_OLAY,GRUP_OLAY,SOZ_TIP,KARTLAR,teskilatSayisi};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const seen=new Set(),rep={kart:0,soz:0,tuttu:0,bozuk:0,zincir:0,tekrar6:0,kat:{}};
for(const seed of [1,2,3,4,5,6,7,8]){
  const S=X.newGame({mod:seed%2?'yeni':'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'kolay',stil:'katilimci',seed});
  const last={};
  for(let m=0;m<78&&!S.bitti;m++){
    S.aksiyon.kalan=3; if(m%2==0)X.aksiyonYap(S,'teskilat','M');
    X.ayiBitir(S);
    const q=S.kuyruk.filter(x=>x.t==='kart');S.kuyruk=[];
    q.forEach(it=>{
      const k=X.kartBul(it.id);ok(!!k,'kart bulunamadı '+it.id);if(!k)return;
      ok(k.sec.length>=2,'en az 2 seçenek '+it.id);ok(typeof X.kartMetni(it)==='string'&&X.kartMetni(it).indexOf('{')<0,'metin yer tutucusuz '+it.id+': '+X.kartMetni(it));
      if(last[it.id]!==undefined&&m-last[it.id]<6&&!it.id.startsWith('soz'))rep.tekrar6++;last[it.id]=m;
      seen.add(it.id);rep.kart++;rep.kat[k.kat||'?']=(rep.kat[k.kat||'?']||0)+1;
      const i=(m+it.id.length)%k.sec.length;const r=X.kartSec(S,it,i);ok(r&&typeof r.s==='string','kartSec '+it.id);
      if(it.id==='sozkriz'||it.id==='sozkriz2'||it.id==='sizinti'||it.id==='ayrilan')rep.zincir++;
    });
    S.sd=[];
  }
  (S.sozler||[]).forEach(z=>{rep.soz++;if(z.durum==='tutuldu')rep.tuttu++;if(z.durum==='bozuldu')rep.bozuk++;});
  ['kasa','uye'].forEach(k=>ok(isFinite(S.stat[k]),'stat sonlu '+k));
}
// toplam olası kart sayısı
const bol=Object.keys(X.BOLGE).length, topl=X.KARTLAR.length+X.KZ.length+Object.keys(X.BOLGE_OLAY).length*bol+Object.keys(X.GRUP_OLAY).length*X.GRUPLAR.length+Object.keys(X.SOZ_TIP).length;
console.log(JSON.stringify(rep),'benzersiz görülen:',seen.size,'toplam olası senaryo:',topl);
ok(seen.size>=45,'yeterli çeşitlilik');ok(rep.tekrar6===0,'6 ay içinde tekrar yok');ok(rep.soz>0,'söz verildi');
console.log(bad?'OLAY TESTI BASARISIZ':'OLAY TESTI TAMAM');process.exitCode=bad?1:0;
