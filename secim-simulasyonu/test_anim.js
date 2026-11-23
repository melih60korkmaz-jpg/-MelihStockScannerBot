// tw() sayaç animasyonu: hedefe ulaşır, ara değer üretir, hareket azaltmada anında biter. node test_anim.js
const fs=require('fs');let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const src=fs.readFileSync('src/gece.js','utf8');const m=src.match(/function tw\([\s\S]*?\n\}\n/)[0];
let now=0,q=[];const mk=(RMv)=>new Function('RM','performance','requestAnimationFrame',m+';return tw;')(RMv,{now:()=>now},f=>q.push(f));
function el(){return{textContent:'',isConnected:true}}
let tw=mk(false),e=el();e._v=10;tw(e,50,v=>String(Math.round(v)),700);
let ara=[];for(let i=0;i<20;i++){now+=50;const f=q.shift();if(f)f(now);ara.push(+e.textContent);}
ok(ara.some(v=>v>10&&v<50),'ara değerler üretilir ('+ara.slice(0,6)+')');ok(e.textContent==='50','hedef değere ulaşır ('+e.textContent+')');
ok(ara.every((v,i)=>i===0||v>=ara[i-1]),'monoton artar');
tw=mk(true);e=el();e._v=10;tw(e,50,v=>String(Math.round(v)),700);ok(e.textContent==='50'&&q.length===0,'hareket azaltmada anında biter');
q=[];tw=mk(false);e=el();e._v=50;tw(e,10,v=>String(Math.round(v)),300);now=1000;q.shift()(now+400);ok(e.textContent==='10','azalış da hedefe ulaşır');
// animasyon ayarı oyun mekaniğini etkilemez: motor dosyası arayüz/animasyon sembollerine bağlı değil ve aynı tohum aynı sonucu verir
const eng=fs.readFileSync('src/engine.js','utf8');ok(!/\b(ANIM|RM|animUygula|requestAnimationFrame|localStorage\.getItem\('ss_anim')/.test(eng.replace(/localStorage[^;]*ss_son[^;]*;/g,'')),'motor animasyon ayarına bağlı değil');
const vm=require('vm');const run=()=>{const cx={console,Math,JSON,Object,Array,Date};vm.createContext(cx);vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+eng+'\nthis.X={newGame,ayiBitir,aksiyonYap,kadroInit,asama2Init,ilisInit};',cx);const X=cx.X;const S=X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed:7});X.kadroInit(S);X.asama2Init(S);X.ilisInit(S);for(let i=0;i<6;i++){S.aksiyon.kalan=3;X.aksiyonYap(S,'uye');S.kuyruk.length=0;X.ayiBitir(S)}return JSON.stringify([S.stat.kasa,S.stat.uye,S.anketOyuncu])};
ok(run()===run(),'aynı tohum aynı sonucu verir (animasyondan bağımsız)');
console.log(bad?'BAŞARISIZ':'ANIM TESTI TAMAM');process.exit(bad?1:0);
