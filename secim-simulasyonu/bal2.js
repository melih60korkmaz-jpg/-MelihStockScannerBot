// Çok senaryolu denge ölçümü: node bal2.js [tohum sayısı]
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,kartSec,kartBul,teskilatSayisi,SENARYOLAR};',ctx);
const X=ctx.X,N=+process.argv[2]||8,H=['K','I','M','E','A','D','G'];
const BOT={
 pasif:(S)=>{},
 dengeli:(S)=>{const st=S.stat;for(let k=0;k<3;k++){let r;const tk=X.teskilatSayisi(S);
  if(st.kasa<1e6)r=X.aksiyonYap(S,k==0?'bagis':'uye');
  else if(tk<45&&st.kasa>2e6&&((S._net||0)>.4e6||st.kasa>10e6))r=X.aksiyonYap(S,'teskilat',H[(S.ay+k)%7]);
  else if(st.kasa>1.5e6)r=X.aksiyonYap(S,k==0?'tv':k==1?'secmen':'uye',k==1?'esnaf':undefined);
  else r=X.aksiyonYap(S,k==0?'uye':'tatil');
  if(!r||!r.ok)X.aksiyonYap(S,'uye');if(st.stres>60)X.aksiyonYap(S,'tatil');}},
 miting:(S)=>{const st=S.stat;for(let k=0;k<3;k++){let r=st.kasa>2e6?X.aksiyonYap(S,k==2?'tv':'miting',H[(S.ay+k)%7]):X.aksiyonYap(S,k==0?'bagis':'uye');if(!r||!r.ok)X.aksiyonYap(S,'uye');if(st.stres>65)X.aksiyonYap(S,'tatil');}},
 hibrit:(S)=>{const st=S.stat;for(let k=0;k<3;k++){const tk=X.teskilatSayisi(S);let r;if(tk<45&&st.kasa>2e6)r=X.aksiyonYap(S,'teskilat',H[(S.ay+k)%7]);else if(st.kasa>2e6)r=X.aksiyonYap(S,k==2?'tv':k==1?'secmen':'miting',k==1?'esnaf':H[(S.ay+k)%7]);else r=X.aksiyonYap(S,k==0?'bagis':'uye');if(!r||!r.ok)X.aksiyonYap(S,'uye');if(st.stres>65)X.aksiyonYap(S,'tatil');}},
 teskilat:(S)=>{const st=S.stat;for(let k=0;k<3;k++){const tk=X.teskilatSayisi(S);let r;if(tk<45&&st.kasa>2e6)r=X.aksiyonYap(S,'teskilat',H[(S.ay+k)%7]);else r=X.aksiyonYap(S,k==0?'bagis':'uye');if(!r||!r.ok)X.aksiyonYap(S,'uye');if(st.stres>65)X.aksiyonYap(S,'tatil');}}
};
function oyna(botAd,sen,zor,seed){
  const S=X.newGame({mod:'yeni',partiId:'YP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:zor,stil:'katilimci',senaryo:sen,seed});
  const bot=BOT[botAd];let k0=S.stat.kasa,r={girer:0,sira:9,koltuk:0,kasa:0,anket:0,bitti:0};
  for(let m=0;m<45&&!S.bitti;m++){S.aksiyon.kalan=3;bot(S);const k1=S.stat.kasa;X.ayiBitir(S);S._net=S.stat.kasa-k1;
    while(S.kuyruk.length){const q=S.kuyruk.shift();if(q.t==="kart"){const c=X.kartBul(q.id);X.kartSec(S,q,Math.min(m%3,c.sec.length-1));}if(q.t==='kurultay'&&q.aday)ctx.kurultayAday(S,true);}S.sd=[];
    if(S.sonSecim&&S.sonSecim.tip==='genel'&&!r.done){r.done=1;r.girer=(S.meclis[S.pid]||0)>0?1:0;r.koltuk=S.meclis[S.pid]||0;}}
  r.anket=S.anketOyuncu;r.kasa=S.stat.kasa/1e6;r.borc=S.stat.kasa<-5e6?1:0;return r;
}
const sens=Object.keys(X.SENARYOLAR).filter(s=>s!=='rastgele');
const out={};
for(const bot of (process.env.BOTS||'pasif,dengeli,miting,teskilat,hibrit').split(','))for(const zor of ['kolay','orta','zor','acimasiz']){
  let n=0,gir=0,ks=0,an=0,kasa=0,borc=0;
  for(const sen of sens)for(let seed=1;seed<=N;seed++){const r=oyna(bot,sen,zor,seed*13+sens.indexOf(sen));n++;gir+=r.girer;ks+=r.koltuk;an+=r.anket;kasa+=r.kasa;borc+=r.borc;}
  out[bot+'/'+zor]={baraj:(gir/n).toFixed(2),koltuk:(ks/n).toFixed(0),anket:(an/n).toFixed(1),kasa:(kasa/n).toFixed(1),borc:(borc/n).toFixed(2)};
}
console.table(out);
