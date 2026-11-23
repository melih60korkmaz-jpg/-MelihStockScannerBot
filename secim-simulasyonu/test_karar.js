// Karar sistemi: tahmin, danışmanlar, gecikmeli etki, geçmiş. node test_karar.js
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Object,Array,Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8')+'\nthis.X={newGame,ayiBitir,aksiyonYap,kararBilgi,kartKararBilgi,kartSec,kartBul,kadroInit,asama2Init,ilisInit,mcInit,mdInit,KARTLAR_E,KARAR_META,AKSIYONLAR,gecikTick,gecikPlanla,uyumla,tahminYap,danismanlar,secimeAy};',ctx);
const X=ctx.X;let bad=0;const ok=(c,m)=>{if(!c){console.log('HATA:',m);bad++}};
const yeni=(seed,pid)=>{const S=X.newGame({mod:'mevcut',partiId:pid||'CHP',partiAd:'T',renk:'#fff',ideo:'sd',liderAd:'A',dogum:1980,zorluk:'orta',stil:'katilimci',seed});X.kadroInit(S);X.asama2Init(S);X.ilisInit(S);S.stat.kasa=3e7;S.aksiyon.kalan=3;return S;};
// 1) bilgi üretimi: tüm aksiyonlar için çökmez, S değişmez
let S=yeni(1);const once=JSON.stringify(S);let bil=0;
X.AKSIYONLAR.forEach(a=>{let h;if(a.hedef==='bolge')h='marmara';else if(a.hedef==='il')h=34;else if(a.hedef==='grup')h='gencler';else if(a.hedef==='medya')h=0;const b=X.kararBilgi(S,a.id,h);if(b.ok===false)return;bil++;
 ok(b.ad&&b.arka&&b.neden.length&&b.durum.length===7&&b.danisman.length===5&&Array.isArray(b.av)&&Array.isArray(b.rs)&&b.kisa&&b.uzun,a.id+' alanlar');
 ok(b.danisman.every(d=>d.rol&&['destek','karşı','çekimser'].includes(d.oy)&&d.g),a.id+' danışman');
 ok(b.rows.every(r=>isFinite(r.ort)&&isFinite(r.a)&&isFinite(r.b)),a.id+' satırlar sonlu');});
ok(JSON.stringify(S)===once,'tahmin gerçek durumu değiştirmez');console.log('karar bilgisi üretilen aksiyon',bil,'/',X.AKSIYONLAR.length);ok(bil>=20,'çoğu aksiyon için karar bilgisi');
// 2) beklenen maliyet gerçek maliyetle tutarlı
S=yeni(2);const b2=X.kararBilgi(S,'miting','marmara');const k0=S.stat.kasa;const r=X.aksiyonYap(S,'miting','marmara');const kd=b2.rows.find(x=>x.k==='Kasa');ok(kd&&Math.abs(kd.ort-(S.stat.kasa-k0))<Math.abs(S.stat.kasa-k0)*0.2+1e5,'tahmin kasa maliyeti gerçekle tutarlı ('+(kd&&Math.round(kd.ort))+' vs '+Math.round(S.stat.kasa-k0)+')');
// 3) danışmanlar farklı görüş bildirebilir
let farkli=0,toplam=0;for(let sd=1;sd<=25;sd++){const T=yeni(30+sd);const ids=['miting','tv','bagis','uye','teskilat','trol','tatil'];ids.forEach(id=>{const a=X.AKSIYONLAR.find(z=>z.id===id);const b=X.kararBilgi(T,id,a.hedef==='bolge'?'ege':undefined);if(b.ok===false)return;toplam++;if(new Set(b.danisman.map(d=>d.oy)).size>1)farkli++;});}
console.log('danışman görüş ayrılığı',farkli,'/',toplam);ok(farkli/toplam>0.4,'danışmanlar çoğu kararda aynı fikirde değil');
// 4) kasa yetmeyince ekonomi danışmanı karşı
S=yeni(3);S.stat.kasa=1e6;const bb=X.kararBilgi(S,'miting','marmara');ok(bb.ok===false||bb.danisman[0].oy==='karşı','kasa yetersizken ekonomi danışmanı karşı veya işlem reddedilir');
// 5) gecikmeli etki: planlanır, uygulanır, başarısız olabilir
S=yeni(4);const g0=(S.gecik||[]).length;X.aksiyonYap(S,'teskilat','ege');ok(S.gecik.length>g0,'gecikmeli etki planlandı');ok(S.kararlar.length===1&&S.kararlar[0].ad==='Teşkilat Mesaisi','karar geçmişine yazıldı');
let uyeOnce=S.stat.uye;let basari=0,basarisiz=0;for(let sd=1;sd<=60;sd++){const T=yeni(100+sd);X.aksiyonYap(T,'uye');const u0=T.stat.uye;T.ay+=2;const m=X.gecikTick(T);if(m.length){if(m[0].indexOf('ortaya çıktı')>0)basari++;else basarisiz++;}}
console.log('gecikmeli sonuç başarı/başarısız',basari,basarisiz);ok(basari>0&&basarisiz>0,'sonuçlar otomatik olumlu değil: hem başarı hem başarısızlık görülür');
// aynı eylemi yığma sınırı
S=yeni(5);for(let i=0;i<8;i++){S.aksiyon.kalan=3;X.aksiyonYap(S,'teskilat','ege')}ok(S.gecik.filter(g=>g.id==='teskilat').length<=4,'gecikmeli etkiler yığılmaz');
// 6) gecikme zamanı: erken uygulanmaz
S=yeni(6);X.aksiyonYap(S,'uye');const n0=S.gecik.length;X.gecikTick(S);ok(S.gecik.length===n0,'vadesi gelmeden uygulanmaz');
// 7) ayiBitir gecikmeyi işler
S=yeni(7);X.aksiyonYap(S,'uye');for(let m=0;m<4;m++){S.aksiyon.kalan=3;S.kuyruk.length=0;X.ayiBitir(S)}ok(S.gecik.length===0,'ay sonlarında gecikmeli etkiler boşalır');ok(S.kararlar[0].gec.length>0,'geçmiş kaydına gecikmeli sonuç işlenir');
// 8) kart karar bilgisi
S=yeni(8);const c=X.KARTLAR_E.find(x=>x.id==='xn_med_dijital');const kb=X.kartKararBilgi(S,{id:c.id,k:'',s:''},0);ok(kb.ok!==false&&kb.danisman.length===5&&kb.alt.length===2&&kb.rs.some(t=>t.indexOf('ihtimali')>0),'kart karar bilgisi ve risk');
const o1=JSON.stringify(S);X.kartKararBilgi(S,{id:c.id,k:'',s:''},1);ok(JSON.stringify(S)===o1,'kart tahmini durumu değiştirmez');
// 9) tüm kartların tüm seçenekleri için karar bilgisi çökmez
S=yeni(9);let kh=0;X.KARTLAR_E.slice(0,60).forEach(cc=>cc.sec.forEach((_,i)=>{try{const q=X.kartKararBilgi(S,{id:cc.id,k:'',s:''},i);if(q.ok===false)kh++}catch(e){console.log(cc.id,i,e.message);kh++}}));ok(kh===0,'kart karar bilgisi çökmez ('+kh+')');
// 10) kayıt: eski kayıtta alanlar sonradan oluşur
S=yeni(10);const e=JSON.parse(JSON.stringify(S));delete e.gecik;delete e.kararlar;const u=X.uyumla(e);ok(Array.isArray(u.gecik)&&Array.isArray(u.kararlar),'eski kayıt uyumlu');
// 11) gecikme + kayıt round-trip
S=yeni(11);X.aksiyonYap(S,'teskilat','ege');const u2=X.uyumla(JSON.parse(JSON.stringify(S)));ok(u2.gecik.length===S.gecik.length&&u2.kararlar.length===1,'gecikmeli etki ve geçmiş kayıtta korunur');
console.log(bad?'BAŞARISIZ '+bad:'KARAR TESTI TAMAM');process.exit(bad?1:0);
