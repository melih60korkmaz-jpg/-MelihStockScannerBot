// Kasa birikim erimesi: eşiğin altı etkilenmez, üstü her ay %2 erir, pasif oyuncu sınırsız biriktiremez. node test_birikim.js
const fs=require('fs'),vm=require('vm');const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,kadroInit,asama2Init,ilisInit,kasaEsik};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const yeni=(seed,zor)=>{const S=X.newGame({mod:'yeni',partiId:'YP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:zor||'orta',stil:'katilimci',senaryo:'klasik',seed});X.kadroInit(S);X.asama2Init(S);X.ilisInit(S);return S;};
const adim=S=>{S.aksiyon.kalan=3;S.kuyruk.length=0;X.ayiBitir(S);S.kuyruk.length=0;};
// 1) eşiğin altında erime yok
let S=yeni(1);S.stat.kasa=5e6;adim(S);ok(S.eritme===0,'eşik altında erime yok');
// 2) eşiğin üstünde %2 oranında erir (gelir-gider sonrası)
S=yeni(2);const es=X.kasaEsik(S);S.stat.kasa=es+100e6;adim(S);ok(Math.abs(S.eritme-2.0e6)<0.4e6,'100 M fazla için ≈2 M erir ('+Math.round(S.eritme)+')');
// 3) pasif oyuncu: kasa eşiğin çok üstüne çıkamaz (denge noktası)
let maxK=0;for(let sd=1;sd<=8;sd++){S=yeni(sd,'orta');for(let m=0;m<45&&!S.bitti;m++)adim(S);maxK=Math.max(maxK,S.stat.kasa/S.makro.fiyat*100);}
console.log('pasif en yüksek reel kasa (M):',(maxK/1e6).toFixed(0));ok(maxK<130e6,'pasif birikim sınırlı');
// 4) erime kasa kaybı yaratır ama borca yol açmaz
S=yeni(3);S.stat.kasa=X.kasaEsik(S)*3;adim(S);ok(S.stat.kasa>0,'erime kasayı eksiye düşürmez');
console.log(bad?'BAŞARISIZ '+bad:'BIRIKIM TESTI TAMAM');process.exit(bad?1:0);
