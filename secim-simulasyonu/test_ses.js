// Ses modülü: çalışır durumda ses üretir, kapalıyken susar, askıdaysa çökmez, sandık sesi kısılır. node test_ses.js
const fs=require('fs');let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const src=fs.readFileSync('src/ui.js','utf8');const a=src.indexOf('/* ---- ses:'),b=src.indexOf("document.addEventListener('pointerdown'",a);const kod=src.slice(a,b);
function kur(durum,acik){let osc=0,t=0;const par=()=>({value:1,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
 const node=()=>({connect(){return this},disconnect(){},gain:par(),frequency:par(),Q:par(),detune:par(),type:'',buffer:null,start(){},stop(){}});
 const ctx={createOscillator:()=>{osc++;return node()},createGain:node,createBiquadFilter:node,createConvolver:node,createBufferSource:node,createDynamicsCompressor:node,createStereoPanner:node,createDelay:node,createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),sampleRate:22050,destination:{},get currentTime(){return t},state:durum,resume(){return{then(f){f&&f()}}}};
 const f=new Function('window','localStorage','Math','setInterval','clearInterval','setTimeout','clearTimeout',kod+';return {ses,setOn:v=>{SESON=v},getAC:()=>AC,sesAc};');
 const r=f({AudioContext:function(){return ctx}},{getItem:()=>acik===false?'0':null},Math,()=>1,()=>{},()=>1,()=>{});return {r,say:()=>osc,adv:x=>{t+=x}};}
let k=kur('running');k.r.sesAc();k.r.ses('onay');ok(k.say()===2,'onay iki nota üretir ('+k.say()+')');
k=kur('running');k.r.sesAc();['tik','kart','kriz','sahne','hukumet','istifa','zafer','kayip','pusula','muhur','ay'].forEach(n=>k.r.ses(n));ok(k.say()>=17,'tüm sesler üretilir ('+k.say()+')');
k=kur('running');k.r.sesAc();k.r.setOn(false);k.r.ses('onay');ok(k.say()===0,'kapalıyken ses yok');
k=kur('running',false);k.r.sesAc();k.r.ses('onay');ok(k.say()===0,'kayıtlı tercih kapalıysa ses yok');
k=kur('suspended');k.r.ses('onay');ok(k.say()===0,'askıdaki bağlamda ses üretilmez, çökmez');
k=kur('running');k.r.sesAc();k.r.ses('sandik');k.r.ses('sandik');ok(k.say()===1,'sandık sesi kısılır');k.adv(0.2);k.r.ses('sandik');ok(k.say()===2,'süre geçince tekrar çalar');
const f2=new Function('window','localStorage','Math','setInterval','clearInterval','setTimeout','clearTimeout',kod+';return ses;');const F2=()=>f2({},{getItem:()=>null},Math,()=>1,()=>{},()=>1,()=>{});ok(typeof F2()==='function'&&(F2()('onay')===undefined),'AudioContext yoksa sessizce geçer');
console.log(bad?'BAŞARISIZ '+bad:'SES TESTI TAMAM');process.exit(bad?1:0);
