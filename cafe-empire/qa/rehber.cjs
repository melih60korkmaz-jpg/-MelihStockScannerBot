/* ? rehberi + ilk adımlar çubuğu uçtan uca testi (telefon, yatay). Kullanım: npm run build && node qa/rehber.cjs */
const { chromium } = require('playwright'); const path = require('path'); const URL = 'file://' + path.resolve(__dirname, '../dist/index.html');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
(async () => {
  const b = await chromium.launch(); const errs = []; const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })).newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 100)); });
  const ev = (f, a) => p.evaluate(f, a); const adim = () => ev(() => document.querySelector('.ogrbox b')?.innerText ?? null); const grup = () => ev(() => document.querySelector('.nav .on')?.dataset.g);
  const tab = async (id) => { await ev((i) => window.__app.openTab(i), id); await p.waitForTimeout(250); };
  const click = async (sel) => { await ev((s) => { const e = document.querySelector(s); if (!e) throw new Error('yok ' + s); e.click(); }, sel); await p.waitForTimeout(250); };
  const tamam = (k) => ev((k) => window.__app.S.derin.ogr.adim[k] !== undefined, k);
  await p.goto(URL); await p.click('#nasil'); await p.waitForTimeout(150);
  console.log('Başlık ekranı: Nasıl oynanır?'); ok(await ev(() => document.querySelectorAll('#ydList button').length === 16), '15 konu + "Oyunda olmayanlar"'); await p.click('[data-yd="kapat"]');
  await p.click('#yeni'); await p.waitForTimeout(300); await p.click('#basla'); await p.waitForTimeout(700);
  console.log('? rehber ekranı');
  await p.click('#tHelp'); await p.waitForTimeout(200); const ks = await ev(() => [...document.querySelectorAll('#ydList button')].map((x) => x.dataset.yk)); ok(ks.length === 16, '16 başlık listede');
  let kot = []; for (const k of ks) { await p.click(`#ydList [data-yk="${k}"]`); await p.waitForTimeout(40); const r = await ev(() => { const c = document.getElementById('ydCont'); return { len: c.innerText.length, bad: /NaN|undefined|\[object|Infinity/.test(c.innerText), yatay: c.scrollWidth > c.clientWidth + 2, madde: c.querySelectorAll('li').length }; }); if (r.len < 80 || r.bad || r.yatay || r.madde < 2) kot.push(k); }
  ok(kot.length === 0, 'her başlığın içeriği dolu, taşma/NaN yok ' + kot.join());
  await p.click('#ydList [data-yk="harita"]'); const gitVar = await ev(() => !!document.querySelector('[data-yd="git"]')); ok(gitVar, 'konuda "Git" düğmesi var (kilitli değilse)');
  await p.click('[data-yd="git"]'); await p.waitForTimeout(250); ok(!(await ev(() => document.querySelector('.yd'))), '"Git" rehberi kapatıp sekmeyi açtı'); ok((await grup()) === 'harita', 'Türkiye grubu seçili');
  await p.click('#tHelp'); await p.waitForTimeout(150); await p.click('.yd'); ok(true, 'dışına dokunma hata vermedi'); await ev(() => document.querySelector('.yd') && document.querySelector('[data-yd="kapat"]').click());
  console.log('İlk adımlar akışı');
  ok((await adim()).includes('Kafeni kur'), 'ilk adım: Kafeni kur'); await click('[data-ogr="git"]'); ok((await grup()) === 'harita', '"Git ›" haritaya götürdü');
  await ev(() => document.querySelector('path[data-il="34"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(1100);
  await ev(() => [...document.querySelectorAll('path.ilce')].find((x) => x.querySelector('title').textContent === 'Esenyurt').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(250);
  await click('[data-a="kurAc"]'); await click('[data-a="kur_ac2"]'); await p.waitForTimeout(400);
  ok(await tamam('kur'), 'şube kurulunca "Kafeni kur" otomatik tamamlandı'); ok((await adim()).includes('Kafeni tanı'), 'sıradaki: Kafeni tanı');
  await tab('subeler'); await click('[data-a="subeAcik"]'); ok(await tamam('tani'), '"Kafeni tanı": dükkân açılınca tamamlandı');
  await ev(() => { window.__app.S.kasa = 8e6; });
  await click('[data-a="subeSekme"][data-k="personel"]'); await click('[data-a="ilan"]'); ok(await ev(() => window.__app.S.subeler[0].ilanlar.length > 0), 'personel ilanı verildi');
  await ev(() => { window.__app.S.ayar.gunSn = 90; }); let aday = false; for (let i = 0; i < 150 && !aday; i++) { await ev(() => { window.__app.S.hiz = 4; }); await p.waitForTimeout(1000); aday = await ev(() => window.__app.S.subeler[0].adaylar.length > 0); } await ev(() => { window.__app.S.hiz = 0; });
  ok(aday, 'aday geldi (' + (aday ? 'evet' : 'hayır') + ')'); await tab('subeler'); await ev(() => { document.querySelector('[data-a="subeAcik"]')?.click(); }); await p.waitForTimeout(150); await ev(() => document.querySelector('[data-a="subeSekme"][data-k="personel"]').click()); await p.waitForTimeout(250);
  if (aday) { const h = await ev(() => { const e = document.querySelector('[data-a="hire"]'); if (!e) return false; e.click(); return true; }); await p.waitForTimeout(250); ok(h && (await tamam('ise')), '"Yeni çalışan işe al": işe alınca tamamlandı'); }
  await ev(() => document.querySelector('[data-a="subeSekme"][data-k="menu"]').click()); await p.waitForTimeout(250);
  ok(await ev(() => { const e = [...document.querySelectorAll('[data-a="urun"]')].find((x) => !x.classList.contains('on')); if (!e) return false; e.click(); return true; }) && (await tamam('urun')), '"Menüye ürün ekle": ürün açılınca tamamlandı');
  ok(await ev(() => { const e = document.querySelector('[data-a="fiyatTl"]'); if (!e) return false; e.click(); return true; }) && (await tamam('fiyat')), '"Fiyatları belirle": fiyat değişince tamamlandı');
  await tab('stok'); ok(await ev(() => { const e = document.querySelector('[data-a="siparis"]'); if (!e) return false; e.click(); return true; }) && (await tamam('stok')), '"İlk stok siparişi": sipariş verilince tamamlandı');
  await tab('finans'); ok(await tamam('gelir'), '"Günlük gelir": Gelir-gider sayfası açılınca tamamlandı');
  await tab('musteri'); ok(await tamam('memn'), '"Memnuniyet": Müşteriler sayfası açılınca tamamlandı');
  ok(await ev(() => window.__app.S.derin.ogr.bitti === true) && !(await ev(() => document.querySelector('.ogr'))), 'tüm adımlar bitince çubuk kendiliğinden kalkar');
  console.log('Kayıt ve yeniden açma'); const once = await ev(() => JSON.stringify(window.__app.S.derin.ogr.adim)); await p.reload(); await p.waitForTimeout(600); await p.click('#devam'); await p.waitForTimeout(500);
  ok(once === (await ev(() => JSON.stringify(window.__app.S.derin.ogr.adim))), 'ilerleme kayıttan sonra korunur'); ok(!(await ev(() => document.querySelector('.ogr'))), 'biten rehber yeniden açılışta görünmez');
  await tab('ayar'); await click('[data-a="turyeni"]'); ok(!!(await ev(() => document.querySelector('.ogrbox'))) || (await ev(() => window.__app.S.derin.ogr.bitti)), 'Ayarlar → yeniden aç çalışır');
  await ev(() => document.querySelector('.ogrbox [data-ogr="kapat"]')?.click()); ok(!(await ev(() => document.querySelector('.ogr'))), '✕ rehberi kapatır'); await tab('ana'); ok(!(await ev(() => document.querySelector('.ogr'))), 'kapalı rehber sekme değişince geri gelmez');
  ok(errs.length === 0, 'tarayıcı hatası yok ' + (errs[0] || '')); await b.close(); console.log(fails.length ? `\n${fails.length} BAŞARISIZ` : '\nTÜMÜ GEÇTİ'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('ÇÖKTÜ', e.message); process.exit(1); });
