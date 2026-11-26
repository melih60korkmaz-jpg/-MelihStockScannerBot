/* Uçtan uca oyun testi (telefon, yatay). Gerekli: playwright. Kullanım: npm run build && node qa/e2e.cjs
   Menüleri açar, gerçek düğmelere basar, gün süresini ölçer, yatay/dikey davranışı ve hata sayısını doğrular. */
const { chromium } = require('playwright'); const path = require('path'); const URL = 'file://' + path.resolve(__dirname, '../dist/index.html');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })).newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|WebGL/.test(m.text())) errs.push(m.text().slice(0, 120)); });
  const ev = (f, a) => p.evaluate(f, a); const tab = async (id) => { await ev((i) => window.__app.openTab(i), id); await p.waitForTimeout(250); };
  console.log('Kurulum'); await p.goto(URL); await p.click('#yeni'); await p.waitForTimeout(1500);
  ok((await ev(() => document.querySelectorAll('path.ilce').length)) === 39, 'İstanbul 39 ilçe haritada'); await p.click('#basla'); await p.waitForTimeout(2200);
  console.log('Menü yapısı'); ok((await ev(() => document.querySelectorAll('.nav [data-g]').length)) === 6, 'solda 6 grup düğmesi');
  const tabs = ['genel', 'hedefler', 'rapor', 'menu', 'stok', 'tedarik', 'reklam', 'personel', 'vardiya', 'ekonomi', 'finans', 'musteri', 'harita', 'subeler', 'gelisim', 'iller', 'ayar'];
  await p.click('#tX'); await ev(() => { const S = window.__app.S; S.kasa = 8e6; S.marka_puani = 40; S.hiz = 4; }); await p.waitForTimeout(5000); await ev(() => { window.__app.S.hiz = 1; });
  for (const t of tabs) { await tab(t); const r = await ev(() => { const e = document.getElementById('panel'); return { txt: e.innerText.length, bad: (e.innerText.match(/NaN|undefined|\[object|Infinity/) || [''])[0], sub: document.querySelectorAll('.subtabs [data-n]').length, ow: document.documentElement.scrollWidth > innerWidth + 2 }; }); ok(r.txt > 100 && !r.bad && !r.ow, `sayfa ${t}: dolu, NaN yok, taşma yok${r.bad ? ' (' + r.bad + ')' : ''}`); }
  await tab('menu'); ok((await ev(() => document.querySelectorAll('.subtabs [data-n]').length)) === 4, 'Ürün grubunda 4 alt sekme');
  console.log('Gün süresi'); await ev(() => { window.__app.S.hiz = 1; window.__app.S.ayar.gunSn = 180; }); const d0 = await ev(() => window.__app.S.dk); await p.waitForTimeout(4000); const d1 = await ev(() => window.__app.S.dk); const dk = (d1 - d0) / 4;
  ok(dk > 5 && dk < 11, `1× hızda saniyede ${dk.toFixed(1)} oyun dakikası (gün ≈ ${(1440 / dk / 60).toFixed(1)} dk)`); await ev(() => { window.__app.S.hiz = 0; });
  console.log('Eylemler'); const r = await ev(() => { const A = window.__app, S = A.S, b = S.subeler[0], o = {}; const click = (s) => { const e = document.querySelector(s); if (!e) throw new Error('yok ' + s); e.click(); }; const open = (t) => A.openTab(t);
    open('menu'); const f0 = b.menu.latte.fiyat; click('[data-a="fiyatTl"][data-id="latte"][data-d="5"]'); o.fiyat = b.menu.latte.fiyat > f0; click('[data-a="oneritum"]'); open('stok'); const q = b.siparisler.length; click('[data-a="siparis"][data-n="1"]'); o.siparis = b.siparisler.length > q;
    open('personel'); click('[data-a="ilan"][data-k="1"]'); o.ilan = b.ilanlar.length > 0; open('vardiya'); click('[data-a="autoplan"]'); open('ekonomi'); click('[data-a="promo"][data-k="sabah"]'); o.promo = !!b.promo.sabah; click('[data-a="eper"][data-n="7"]');
    open('gelisim'); click('[data-a="invest"][data-id="espresso"]'); o.yat = b.yat.espresso === 1; open('finans'); click('[data-a="kredi"]'); o.kredi = S.borc > 0; open('ayar'); click('[data-a="gunsn"][data-k="300"]'); o.gunsn = S.ayar.gunSn === 300; click('[data-a="gunsn"][data-k="180"]'); return o; });
  for (const [k, v] of Object.entries(r)) ok(v, 'eylem: ' + k);
  console.log('Harita ve büyüme'); await tab('harita'); await ev(() => document.querySelector('path[data-il="34"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(1200); const hr = await ev(() => { const S = window.__app.S; const e = document.querySelector('path.ilce.buy'); e.dispatchEvent(new MouseEvent('click', { bubbles: true })); document.querySelector('[data-a="ilceac"]').click(); return Object.keys(S.bolge.ilce).length; }); ok(hr === 2, 'ilçe satın alındı');
  console.log('Yön ve hata'); await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500); ok((await ev(() => getComputedStyle(document.getElementById('rotate')).display)) === 'flex', 'dikeyde döndürme uyarısı'); ok((await ev(() => window.__app.S.hiz)) === 0, 'dikeyde oyun duraklı'); await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(500); ok((await ev(() => getComputedStyle(document.getElementById('rotate')).display)) === 'none', 'yatayda uyarı kapalı');
  ok(errs.length === 0, 'tarayıcı hatası yok ' + (errs[0] || '')); await b.close(); console.log(fails.length ? `\n${fails.length} BAŞARISIZ` : '\nTÜMÜ GEÇTİ'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('ÇÖKTÜ', e.message); process.exit(1); });
