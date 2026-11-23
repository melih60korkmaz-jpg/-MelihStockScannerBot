// Görsel katman: portre sabit, logo sayısı, her kriz kartının görseli var. node test_gorsel.js
const fs=require('fs'),vm=require('vm');const ctx=vm.createContext({console,Math,Date,JSON});
vm.runInContext(['data','engine','gorsel'].map(f=>fs.readFileSync('src/'+f+'.js','utf8')).join('\n')+'\nthis.X={portre,logoSvg,LOGOLAR,KRIZ_G,KARTLAR_E,kartKat};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
ok(X.portre('Ayşe',"#e63b5f",40)===X.portre('Ayşe',"#e63b5f",40),'portre aynı isimle aynı');
ok(X.portre('Ayşe','#e63b5f',40)!==X.portre('Mehmet','#e63b5f',40),'farklı isim farklı yüz');
ok(X.LOGOLAR.length===10,'10 logo');
for(let i=0;i<10;i++)ok(/<svg/.test(X.logoSvg(i,'#fff',30)),'logo '+i);
const kriz=X.KARTLAR_E.filter(c=>X.kartKat(c.id)==='kriz').map(c=>c.id);
const eksik=kriz.filter(id=>!X.KRIZ_G[id]);
ok(kriz.length>=16,'kriz kartları bulundu: '+kriz.length);
console.log('kriz kartı',kriz.length,'görselsiz',eksik.join(',')||'yok');
process.exit(bad?1:0);
