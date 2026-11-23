// Aşama 2: kurmay, il başkanları, hizipler, hükümet istikrarı. node test_asama2.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,kurmayAta,asama2Init,kurmayEtki,medyaCarpan,yasaOlasilik,meclisKoltuk,grupOrtSad,uyumla};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const yeni=seed=>X.newGame({mod:'mevcut',partiId:'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});
// 1) kurmay atama + maliyet + etki
let S=yeni(5);X.asama2Init(S);S.stat.kasa=1e9;S.aksiyon.kalan=3;
let k0=S.stat.kasa,r=X.kurmayAta(S,'medya');ok(r.ok&&S.kurmay.medya&&S.stat.kasa<k0&&S.aksiyon.kalan===2,'medya atama maliyet/aksiyon');
S.kurmay.medya.perf=100;const c1=X.medyaCarpan(S);S.kurmay.medya.perf=0;const c2=X.medyaCarpan(S);ok(c1>c2+0.2,'medya çarpanı kurmay performansına bağlı');
S.stat.kasa=0;S.aksiyon.kalan=3;ok(!X.kurmayAta(S,'kamp').ok,'kasa yetersiz engeli');
// 2) uzun simülasyon: il istifaları, hizip protestosu, koalisyon/hükümet olayları
const sayac={ilIstifa:0,hizipAyrilik:0,koalisyonAyrildi:0,hukumetDustu:0,sonlu:true,yasaSabit:0};
for(let seed=1;seed<=40;seed++){
  S=yeni(seed);X.asama2Init(S);
  S.gov=[S.pid,'AKP'];S.meclis[S.pid]=240;S.meclis['AKP']=40; // azınlık hükümeti zorla
  for(let m=0;m<70&&!S.bitti;m++){
    S.aksiyon.kalan=3;
    if(m===10){S.stat.birlik=15;S.hzb.forEach(g=>g.sad=15);S.ilb.forEach(k=>k.sad=10);}
    const sg=S.gov.length,mv=S.meclis[S.pid];
    X.ayiBitir(S);
    S.kuyruk.length=0;S.sd=[];
    if(S.gov.length<sg)sayac.koalisyonAyrildi++;
    if(S.meclis[S.pid]<mv-0&&S.tarih.m!==5&&S.tarih.m!==3)sayac.hizipAyrilik++;
    if(!isFinite(S.stat.kasa)||!isFinite(S.stat.birlik))sayac.sonlu=false;
  }
  S.tarihce.forEach(e=>{if(e.m.indexOf('güvenoyu')>=0)sayac.hukumetDustu++;if(e.m.indexOf('ayrıldı')>=0&&e.m.indexOf('milletvekili')>=0)sayac.hizipAyrilik+=0;});
}
console.log(JSON.stringify(sayac));
ok(sayac.sonlu,'sonlu değerler');ok(sayac.koalisyonAyrildi>0,'koalisyondan çekilme olmalı');ok(sayac.hukumetDustu>0,'hükümet düşmeli');
// 3) il başkanı istifası teşkilatı gerçekten düşürüyor
S=yeni(9);X.asama2Init(S);S.org.fill(40);S.ilb.forEach(k=>k.sad=3);S.stat.birlik=3;const top0=S.org.reduce((a,b)=>a+b,0);
let ist=0;for(let m=0;m<6;m++){S.aksiyon.kalan=3;S.stat.birlik=3;S.kadro.forEach(k=>k.sad=3);for(const b in S.bbs)S.bbs[b].sad=3;X.ayiBitir(S);S.kuyruk.length=0;S.sd=[];}console.log('org',top0,'->',S.org.reduce((a,b)=>a+b,0));
ok(S.org.reduce((a,b)=>a+b,0)<top0-40,'il başkanı istifaları teşkilatı düşürmeli');
// 4) hizip sadakati yasa olasılığına etki
S=yeni(11);X.asama2Init(S);S.gov=[S.pid];S.meclis[S.pid]=300;S.stat.birlik=60;S.hzb.forEach(g=>g.sad=90);const y1=X.yasaOlasilik(S);S.hzb.forEach(g=>g.sad=10);const y2=X.yasaOlasilik(S);ok(y1>y2+0.1,'hizip sadakati yasa olasılığına bağlı');
// 5) eski kayıt uyumu
S=yeni(3);delete S.hzb;delete S.ilb;delete S.kurmay;const u=S;S.aksiyon.kalan=3;X.ayiBitir(u);ok(u.hzb&&u.ilb&&u.kurmay,'eski kayıt alanları kurulmalı');
console.log(bad?'ASAMA2 TESTI BASARISIZ':'ASAMA2 TESTI TAMAM');process.exitCode=bad?1:0;
