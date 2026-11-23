// Aşama 3: rakip kampanya hedeflemesi ve oyuncuya karşı blok. node test_rakip2.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,rakipStrateji2,siralama};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const yeni=seed=>X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
const maxRb=S=>{let m=1;Object.keys(S.rbm).forEach(id=>Object.keys(S.rbm[id]).forEach(b=>{if(id!==S.pid)m=Math.max(m,S.rbm[id][b])}));return m;};
let kampanyada=0,disarda=0,blok=0,n=0,sonlu=true;
for(let seed=1;seed<=20;seed++){
  const S=yeni(seed);let blokGordu=false;
  for(let m=0;m<46&&!S.bitti;m++){
    S.aksiyon.kalan=3;
    const yakin=S.takvim.some(t=>{const d=t.y*12+t.m-(S.tarih.y*12+S.tarih.m);return d>=0&&d<=9});
    const once=JSON.stringify(S.rbm);
    X.ayiBitir(S);S.kuyruk.length=0;S.sd=[];
    if(yakin&&JSON.stringify(S.rbm)!==once)kampanyada++;
    if(!isFinite(S.stat.drift)||!isFinite(maxRb(S)))sonlu=false;
    S.tarihce.forEach(e=>{});
  }
  n++;
}
// blok: oyuncu açık ara öndeyken rakipler sertleşmeli
let blokSay=0;
for(let seed=1;seed<=30;seed++){const S=yeni(seed);S.anket[S.pid]=46;const sira=X.siralama(S.anket);
  for(let k=0;k<60;k++){const h=X.rakipStrateji2(S);if(h.some(x=>x.indexOf('eş güdümlü')>=0)){blokSay++;break;}}}
// kampanya dışı dönemde rb hedeflemesi olmamalı (savunma hariç): erken ayda bolge hedefi mesajı yok
let erken=0;for(let seed=1;seed<=20;seed++){const S=yeni(seed);S.ay=1;S.tarih={y:2026,m:10};const h=X.rakipStrateji2(S);if(h.some(x=>x.indexOf('bölgelerine yöneldi')>=0))erken++;}
console.log(JSON.stringify({oyun:n,kampanyaAylariRbDegisti:kampanyada,blokTetiklendi30Denemede:blokSay,erkenKampanyaMesaji:erken,sonlu}));
ok(sonlu,'sonlu');ok(kampanyada>20,'kampanya sezonunda rakip yatırımı olmalı');ok(blokSay>5,'önde giden oyuncuya karşı blok tetiklenmeli');ok(erken===0,'kampanya dışında hedefleme mesajı olmamalı');
console.log(bad?'RAKIP2 TESTI BASARISIZ':'RAKIP2 TESTI TAMAM');process.exitCode=bad?1:0;
