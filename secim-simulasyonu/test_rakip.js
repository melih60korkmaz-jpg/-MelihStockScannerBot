// Rakip yapay zekâ testi: node test_rakip.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,teklifKabul,rakipler,liderAdi,get RK(){return RKS}};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const rep={leader:0,ittifak:0,ayrilik:0,kriz:0,teklif:0,strat:{}};const sonuc=[];
for(const seed of [1,2,3,4,5,6]){
  const S=X.newGame({mod:seed%2?'yeni':'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
  const l0=Object.keys(S.rk||{}).length; const ad0={}; 
  for(let m=0;m<75&&!S.bitti;m++){
    S.aksiyon.kalan=3;
    if(m%3==0)X.aksiyonYap(S,'miting','M');
    X.ayiBitir(S);
    S.kuyruk.forEach(q=>{if(q.t==='teklif'){rep.teklif++;X.teklifKabul(S,q.id)}});S.kuyruk=[];
    S.sd=[];
    S.tarihce.forEach(t=>{});
  }
  Object.keys(S.rk).forEach(id=>{const r=S.rk[id];rep.strat[r.strateji]=(rep.strat[r.strateji]||0)+1;
    ok(r.guc>=3&&r.guc<=100&&isFinite(r.guc),'guc aralığı '+id);ok(typeof r.lider==='string'&&r.lider.length>3,'lider adı');});
  S.mods.forEach((v,i)=>ok(isFinite(v)&&v>=0.6&&v<=1.5,'mods aralığı'));
  Object.values(S.anket).forEach(v=>ok(isFinite(v)&&v>0,'anket sonlu'));
  const tot=Object.values(S.anket).reduce((a,b)=>a+b,0);ok(Math.abs(tot-100)<0.5,'anket toplamı 100');
  rep.leader+=S.tarihce.filter(t=>/devrildi/.test(t.m)).length;rep.kriz+=S.tarihce.filter(t=>/aleyhine|tartışma/.test(t.m)).length;rep.ittifak+=S.tarihce.filter(t=>/birleşti|katıldı/.test(t.m)).length;rep.ayrilik+=S.tarihce.filter(t=>/ayrıldı|dağıl/.test(t.m)).length;
  sonuc.push(seed+': ay='+S.ay+' sıra#1='+Object.keys(S.anket).sort((a,b)=>S.anket[b]-S.anket[a])[0]+' ittifak='+S.ittifaklar.map(i=>i.ad+'('+i.uyeler.join('+')+')').join(' | '));
}
console.log(sonuc.join('\n'));console.log(JSON.stringify(rep));
ok(Object.keys(rep.strat).length>=3,'stratejiler çeşitli');
console.log(bad?'RAKIP TESTI BASARISIZ':'RAKIP TESTI TAMAM');process.exitCode=bad?1:0;
