// Genel başkanlık kaybı sonrası devam testi: node test_muhalif.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,kartSec,kartBul,kartMetni,kurultayAday,kurultayTahmin,ittifakaDavet,kadroDegis,politikaDegis};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
function oyna(seed,strateji){
  const S=X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
  const r={kayip:false,geri:false,kurultay:0,bitti:false,aksUyari:0};
  for(let m=0;m<80&&!S.bitti;m++){
    S.aksiyon.kalan=3;
    if(m===10){S.stat.birlik=2;S.stat.itibar=3;S.kadro.forEach(k=>k.sad=2);} // ilk kurultayda kayıp (Eyl 2027 = ay 12)
    if(S.rol==='muhalif'){
      if(strateji==='aktif'){X.aksiyonYap(S,'delege');X.aksiyonYap(S,'delege');if(S.pd.hizip<40)X.aksiyonYap(S,'hizip');else X.aksiyonYap(S,'elestir');}
      if(m===20){const t=X.aksiyonYap(S,'miting','M');ok(!t.ok,'muhalif miting yapamaz');const t2=X.ittifakaDavet(S,'DEM');ok(!t2.ok,'muhalif ittifak kuramaz');const t3=X.kadroDegis(S,'kadro',0);ok(!t3.ok,'muhalif atama yapamaz');}
    }else{const t=X.aksiyonYap(S,'delege');ok(!t.ok||m<1,'başkan delege ziyareti yapamaz');}
    X.ayiBitir(S);
    while(S.kuyruk.length){const q=S.kuyruk.shift();
      if(q.t==='kart'){const k=X.kartBul(q.id);ok(k,'kart '+q.id);if(k){ok(X.kartMetni(q).indexOf('{')<0,'yer tutucu '+q.id);X.kartSec(S,q,0);}}
      if(q.t==='kurultay'){r.kurultay++;if(q.aday){const t=X.kurultayAday(S,true);if(t.kazandi)r.geri=true;}else{ if(S.rol==='muhalif')r.kayip=true; }}
    }
    if(S.rol==='muhalif')r.kayip=true;
    ['destek','hizip','itibar'].forEach(k=>{if(S.pd)ok(isFinite(S.pd[k])&&S.pd[k]>=0&&S.pd[k]<=100,'pd '+k)});
    ok(isFinite(S.stat.kasa)&&isFinite(S.anketOyuncu),'sonlu');
    S.sd=[];
  }
  r.bitti=S.bitti;r.son=S.rol;r.ay=S.ay;r.destek=S.pd?Math.round(S.pd.destek):null;r.kayipFlag=S.kayip;return r;
}
for(const st of ['pasif','aktif']){
  let n=0,kayip=0,geri=0,devam=0,kay=0;
  for(let seed=1;seed<=30;seed++){const r=oyna(seed,st);n++;if(r.kayip)kayip++;if(r.geri)geri++;if(r.ay>=60)devam++;if(r.kayipFlag)kay++;}
  console.log(st,JSON.stringify({oyun:n,baskanlikKaybi:kayip,genelBaskanlagaDondu:geri,altmisAyOynadi:devam,eskiOyunBitisFlagi:kay}));
  ok(kay===0,'kurultay kaybı oyunu bitirmemeli');ok(devam>=n*0.9,'oyun devam etmeli');
  if(st==='pasif')global.pas=geri/n;else global.akt=geri/n;
}
ok(global.akt>global.pas+0.2,'aktif destek toplama anlamlı fark yaratmalı');
console.log(bad?'MUHALIF TESTI BASARISIZ':'MUHALIF TESTI TAMAM');process.exitCode=bad?1:0;
