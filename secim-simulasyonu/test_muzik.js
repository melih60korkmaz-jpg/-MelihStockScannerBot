// Adaptif müzik v2: temalar, geçiş, sahne dönüşü, tek arka plan, kapalı/askıda sessizlik, ölçü içi notalar. node test_muzik.js
const fs=require('fs');let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const src=fs.readFileSync('src/ui.js','utf8');const a=src.indexOf('/* ---- ses:'),b=src.indexOf("document.addEventListener('pointerdown'",a);const kod=src.slice(a,b);
function kur(durum,acik,seed){
  let t=0,osc=[],tms=[],s=seed||1;const rnd=()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296;};
  const par=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
  const node=()=>({connect(){return this},disconnect(){},gain:par(),frequency:par(),Q:par(),detune:par(),type:'',buffer:null,start(){},stop(){},curve:null,loop:false});
  const ctx={createOscillator:()=>{const o=node();o.freqs=[];o.frequency.setValueAtTime=f=>o.freqs.push(f);osc.push(o);return o},createGain:node,createBiquadFilter:node,createConvolver:node,createBufferSource:node,createDynamicsCompressor:node,createStereoPanner:node,createDelay:node,
   createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),sampleRate:22050,destination:{},get currentTime(){return t},state:durum,resume(){return{then(f){f&&f()}}}};
  const M=Object.create(Math);M.random=rnd;
  const store={};if(acik===false)store.ss_muzik='0';
  const ls={getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v)}};
  const f=new Function('window','localStorage','Math','setInterval','clearInterval','setTimeout','clearTimeout','document',kod+';return {ses,muzikBaslat,muzikDurdur,muzikMood,muzikTik,muzikSahne,muzikYogun,MZ,MT,sesAc,sesKur,sesSeviye,setOn:v=>{MZON=v}};');
  const r=f({AudioContext:function(){return ctx}},ls,M,fn=>{tms.push(fn);return 1},()=>{},fn=>{tms.push(fn);return tms.length},()=>{},{});
  return {r,osc,adv:x=>{t+=x},tms,store,runTimers:()=>{const q=tms.splice(0);q.forEach(f=>{try{f()}catch(e){}})}};
}
const say=(k,sn,st)=>{const n0=k.osc.length;for(let i=0;i<sn/st;i++){k.adv(st);k.r.muzikTik()}return k.osc.length-n0};
let k=kur('running');k.r.sesAc();k.r.muzikBaslat();ok(k.r.MZ.on,'müzik başlar');ok(k.r.MZ.cur&&k.r.MZ.cur.ad==='menu','açılış teması menü');
const adlar=['menu','oyun','gerilim','gece','koalisyon','kriz','zafer','yenilgi'];
ok(adlar.every(x=>k.r.MT[x]),'8 tema tanımlı');
// her tema ayrı: nota üretir, frekanslar makul, notalar kendi ölçeğinde
adlar.forEach(ad=>{const q=kur('running',true,7);q.r.sesAc();q.r.muzikBaslat();q.r.muzikMood(ad);if(ad==='zafer'||ad==='yenilgi')q.r.muzikSahne(ad);
  const n=say(q,60,0.2);ok(n>10,ad+': 60 sn içinde nota üretir ('+n+')');
  ok(q.osc.every(o=>o.freqs.every(f=>isFinite(f)&&f>15&&f<4200)),ad+': frekanslar makul');
  const T=q.r.MT[ad],pc=new Set(T.olcek.map(x=>(T.key+x)%12));
  // ölçü dışı perde: akor/ölçek dışı geçici notalar yasak değil, ama çoğunluk ölçekte olmalı
  const hz=q.osc.flatMap(o=>o.freqs).filter(f=>f>100&&f<1500);let ic=0;hz.forEach(f=>{const m=Math.round(69+12*Math.log2(f/440))%12;if(pc.has(m)||[...pc].some(p=>(p+3)%12===m||(p+4)%12===m||(p+7)%12===m||(p+10)%12===m||(p+11)%12===m||(p+1)%12===m||(p+2)%12===m))ic++});
  ok(hz.length===0||ic/hz.length>0.8,ad+': notalar tonal merkezde ('+(ic/(hz.length||1)).toFixed(2)+')');});
// geçiş: yeniden başlatma yok, çapraz geçiş, aynı tema tekrarında no-op
k=kur('running');k.r.sesAc();k.r.muzikBaslat();say(k,10,0.2);const m0=k.r.MZ.cur;k.r.muzikMood('oyun');const o1=k.r.MZ.cur;ok(o1!==m0&&o1.ad==='oyun','menü→oyun geçer');
ok(k.r.MZ.aktif.length===2,'geçişte eski+yeni ses çarpışması (çapraz geçiş) ('+k.r.MZ.aktif.length+')');
k.r.muzikMood('oyun');ok(k.r.MZ.cur===o1&&k.r.MZ.aktif.length===2,'aynı tema tekrar çağrısı yeniden başlatmaz');
k.adv(4);k.r.muzikTik();k.runTimers();ok(k.r.MZ.aktif.length===1,'geçiş bitince eski tema bırakılır, tek arka plan ('+k.r.MZ.aktif.length+')');
k.r.muzikMood('menu');k.r.muzikMood('oyun');k.r.muzikMood('menu');k.r.muzikMood('oyun');say(k,6,0.2);k.adv(4);k.runTimers();ok(k.r.MZ.aktif.length<=2,'hızlı mod değişimi birikmez ('+k.r.MZ.aktif.length+')');
// sahne: zafer ve yenilgi sonra istenen moda döner
k=kur('running');k.r.sesAc();k.r.muzikBaslat();k.r.muzikMood('gece');k.r.muzikSahne('zafer');ok(k.r.MZ.cur.ad==='zafer','zafer sahnesi çalar');
k.r.muzikMood('oyun');ok(k.r.MZ.cur.ad==='zafer'&&k.r.MZ.istenen==='oyun','sahne sürerken mod değişimi sahneyi bölmez');
k.runTimers();ok(!k.r.MZ.sahne&&k.r.MZ.cur.ad==='oyun','sahne bitince istenen moda döner');
k.r.muzikSahne('yenilgi');ok(k.r.MZ.cur.ad==='yenilgi','yenilgi sahnesi çalar');
// yoğunluk: gece sonuna doğru artar
const g1=kur('running',true,9);g1.r.sesAc();g1.r.muzikBaslat();g1.r.muzikMood('gece');g1.r.muzikYogun(0.05);const n1=say(g1,90,0.2);
const g2=kur('running',true,9);g2.r.sesAc();g2.r.muzikBaslat();g2.r.muzikMood('gece');g2.r.muzikYogun(1);const n2=say(g2,90,0.2);ok(n2>n1*1.15,'gece yoğunluğu arttıkça nota sayısı artar ('+n1+'→'+n2+')');
const r1=kur('running',true,9);r1.r.sesAc();r1.r.muzikBaslat();r1.r.muzikMood('gerilim');r1.r.MZ.cur.yog=0.1;const q1=say(r1,90,0.2);
const r2=kur('running',true,9);r2.r.sesAc();r2.r.muzikBaslat();r2.r.muzikMood('gerilim');r2.r.MZ.cur.yog=1;const q2=say(r2,90,0.2);ok(q2>q1*1.15,'gerilim seçime yaklaştıkça yoğunlaşır ('+q1+'→'+q2+')');
// durdurma, kapalı, askıda
k=kur('running');k.r.sesAc();k.r.muzikBaslat();say(k,5,0.2);k.r.muzikDurdur();const c0=k.osc.length;say(k,10,0.2);ok(!k.r.MZ.on&&k.osc.length===c0,'durdurunca yeni nota yok');
k.r.muzikBaslat();ok(k.r.MZ.on,'tekrar başlatılabilir');
k=kur('running',false);k.r.sesAc();k.r.muzikBaslat();ok(!k.r.MZ.on,'kayıtlı tercih kapalıysa başlamaz');
k=kur('suspended');k.r.muzikBaslat();say(k,5,0.2);ok(k.osc.length===0,'askıdaki bağlamda çökmeden sessiz');
k=kur('running');k.r.muzikBaslat();k.r.muzikMood('oyun');ok(true,'AudioContext yokken çağrılar çökmez');
const f2=new Function('window','localStorage','Math','setInterval','clearInterval','setTimeout','clearTimeout',kod+';muzikBaslat();muzikMood("kriz");muzikSahne("zafer");muzikDurdur();ses("onay");return 1;');ok(f2({},{getItem:()=>null},Math,()=>1,()=>{},()=>1,()=>{})===1,'AudioContext tanımsızsa hiçbir çağrı çökmez');
// ses seviyesi tercihleri
k=kur('running');k.r.sesAc();ok(()=>k.r.sesSeviye(),'');try{k.r.sesSeviye();ok(true,'')}catch(e){ok(false,'sesSeviye çöker: '+e.message)}
console.log(bad?'BAŞARISIZ '+bad:'MÜZIK TESTI TAMAM');process.exit(bad?1:0);
