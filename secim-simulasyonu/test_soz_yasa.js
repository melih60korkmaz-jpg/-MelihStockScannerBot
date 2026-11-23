// Yasa sözleri: seçime yakın dönemde söz kartı çıkar, yasa geçince söz tutulur, vade dolunca bozulur. node test_soz_yasa.js
const fs=require('fs'),vm=require('vm');const ctx=vm.createContext({console,Math,Date,JSON});
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,sozVer,SOZ_TIP,mcInit,olayMotoru,dinAdaylar,bugunSecimYakin2};',ctx);
const X=ctx.X;let ok=true;const T=(c,m)=>{if(!c){ok=false;console.log('BAŞARISIZ:',m)}};
// 1) seçime yakın bir oyunda hazirla() sonuç verir
let bulundu=false,S;
for(let seed=1;seed<=12&&!bulundu;seed++){S=X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
 for(let a=0;a<70&&!bulundu;a++){X.ayiBitir(S);S.kuyruk=[];if(X.bugunSecimYakin2(S,14)&&S.ay>=2){const d=X.SOZ_TIP.yasa_asgari.hazirla(S);if(d){bulundu=true}}}}
T(bulundu,'seçime yakın dönemde yasa sözü önerilmiyor');
// 2) söz ver, yasa geçti kaydı ekle -> tutuldu
const z=X.sozVer(S,{tip:'yasa_asgari',esik:0,metin:'test',vade:18});
T(z.durum==='acik','söz açık başlamalı');
X.olayMotoru(S);T(z.durum==='acik','yasa geçmeden söz sonuçlanmamalı');
const mc=X.mcInit(S);mc.gecmis.unshift({ay:S.ay,t:'x',id:'asgari',ad:'A',sonuc:'kabul',evet:1,hayir:0,kapsam:1,opp:false});
X.olayMotoru(S);S.ay=z.vade;X.olayMotoru(S);
T(z.durum==='tutuldu','yasa geçince söz tutulmalı, durum: '+z.durum);
// 3) yasa geçmezse vade sonunda bozulur
const z2=X.sozVer(S,{tip:'yasa_egitim',esik:0,metin:'test2',vade:2});
S.ay=z2.vade;X.olayMotoru(S);
T(z2.durum==='bozuldu','yasa geçmeyince söz bozulmalı, durum: '+z2.durum);
console.log(ok?'tamam':'hata');process.exit(ok?0:1);
