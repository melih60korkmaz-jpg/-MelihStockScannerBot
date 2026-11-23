// Kayıt sistemi testi: node test_kayit.js
const fs=require('fs'),vm=require('vm');
const mem={};const ls={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]}};
const ctx={console,Math,JSON,Object,Array,Date,localStorage:ls};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,kaydet,yukle,kayitlar,kayitSil,get N(){return KAYIT_NOT}};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const S=X.newGame({mod:'yeni',partiAd:'Test',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'kolay',stil:'katilimci',seed:3});
ok(X.kaydet(S,'1'),'yuva1 kaydet');
S.aksiyon.kalan=3;X.ayiBitir(S);ok(X.kaydet(S,'1'),'yuva1 ikinci kayıt (yedek oluşur)');
ok(!!mem['secimsim_k_1_bak'],'yedek var');
const L=X.yukle('1');ok(L&&L.tarih.m===S.tarih.m&&L._slot==='1','yükleme tutarlı');
ok(X.kaydet(S,'2'),'yuva2');ok(X.kayitlar().filter(k=>k.ok).length===2,'2 dolu yuva');
// bozulma: ana kayıt yarım kesilmiş -> yedekten kurtar
mem['secimsim_k_1']=mem['secimsim_k_1'].slice(0,200);
const R=X.yukle('1');ok(R&&X.N.indexOf('yedek')>=0,'bozuk ana kayıt yedekten kurtarıldı');
// özet uyuşmazlığı
const z=JSON.parse(mem['secimsim_k_2']);z.d=z.d.replace('"Test"','"Hack"');mem['secimsim_k_2']=JSON.stringify(z);
ok(X.yukle('2')===null,'özet bozuk kayıt reddedildi (yedek yok)');
// eski format (zarfsız) ve eski anahtar göçü
const eski=JSON.parse(JSON.stringify(S));['sd','tarihce','ms','kartGecmis','arsiv','anketTum','rozet','yanki'].forEach(k=>delete eski[k]);
X.kayitSil();mem['secimsim_v1']=JSON.stringify(eski);
const M=X.yukle();ok(M&&Array.isArray(M.tarihce)&&Array.isArray(M.kartGecmis),'eski kayıt göç etti ve alanlar tamamlandı');
ok(!('secimsim_v1' in mem),'eski anahtar temizlendi');
// çöp veri
mem['secimsim_k_3']='{{{';ok(X.yukle('3')===null,'çöp veri null');
X.kayitSil('auto');X.kayitSil('1');X.kayitSil('2');X.kayitSil('3');ok(X.yukle()===null,'hepsi silinince null');
console.log(bad?'KAYIT TESTİ BAŞARISIZ':'KAYIT TESTİ TAMAM');process.exitCode=bad?1:0;
