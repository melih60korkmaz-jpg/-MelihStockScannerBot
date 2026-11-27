/* Tüm sayfalardaki tüm düğmelere basar: hata, boş/bozuk sayfa ve "hiçbir şey yapmayan" düğme arar; çift tetiklenmeyi dener.
   Kullanım: npm run build && node qa/butonlar.cjs [--hizli] */
const { chromium } = require('playwright'); const path = require('path'); const URL = 'file://' + path.resolve(__dirname, '../dist/index.html');
const HIZLI = process.argv.includes('--hizli'); const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const YASAK = new Set(['cikis', 'sil', 'wipe', 'exit', 'kapat', 'kredi_iptal']);   // oyunu/dükkânı yok eden eylemler
(async () => {
  const b = await chromium.launch(); const errs = []; const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })).newPage();
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 120)); });
  const ev = (f, a) => p.evaluate(f, a); const tab = async (id) => { await ev((i) => window.__app.openTab(i), id); await p.waitForTimeout(80); };
  await p.goto(URL); await p.click('#yeni'); await p.waitForTimeout(300); await p.click('#basla'); await p.waitForTimeout(600); await p.click('[data-ogr="kapat"]');
  await ev(() => window.__app.openTab('harita')); await p.waitForTimeout(300); await ev(() => document.querySelector('path[data-il="34"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(1100);
  await ev(() => [...document.querySelectorAll('path.ilce')].find((x) => x.querySelector('title').textContent === 'Esenyurt').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(250);
  await ev(() => document.querySelector('[data-a="kurAc"]').click()); await p.waitForTimeout(250); await ev(() => document.querySelector('[data-a="kur_ac2"]').click()); await p.waitForTimeout(500);
  await ev(() => { const S = window.__app.S; S.kasa = 8e7; S.marka_puani = 90; S.hiz = 0; });
  await ev(() => { window.__tc = 0; new MutationObserver((ms) => ms.forEach((r) => r.addedNodes.forEach((n) => { if (n.classList && n.classList.contains('toast')) window.__tc++; }))).observe(document.getElementById('app'), { childList: true }); });
  const tabs = await ev(() => window.__app.tabIds()); console.log('Sayfa sayısı:', tabs.length);
  const SEL = '#page [data-a], #page [data-n], #page [data-lock]'; const noop = []; const garip = []; let toplam = 0;
  const snap = () => ev(() => ({ s: (() => { const j = JSON.stringify(window.__app.S); let h = 0; for (let i = 0; i < j.length; i++) h = (h * 31 + j.charCodeAt(i)) | 0; return h; })(), h: (() => { const j = document.getElementById('page').innerHTML; let h = 0; for (let i = 0; i < j.length; i++) h = (h * 31 + j.charCodeAt(i)) | 0; return h; })(), t: window.__tc, tab: window.__app.TAB, ov: document.querySelectorAll('.yd,.modal,.ev').length }));
  const hedefler = [...tabs.map((t) => [t, null]), ['subeler', 'ozet'], ['subeler', 'menu'], ['subeler', 'personel'], ['subeler', 'vardiya'], ['subeler', 'gelisim']];
  for (const [t, sk] of hedefler) {
    const aç = async () => { await tab(t); if (sk) { await ev(() => { const e = document.querySelector('[data-a="subeAcik"]'); if (e) e.click(); }); await p.waitForTimeout(80); await ev((k) => { document.querySelector(`[data-a="subeSekme"][data-k="${k}"]`)?.click(); }, sk); await p.waitForTimeout(80); } };
    await aç(); const n = await ev((s) => document.querySelectorAll(s).length, SEL); const lim = HIZLI ? Math.min(n, 12) : Math.min(n, 70);
    for (let i = 0; i < lim; i++) {
      await aç(); const info = await ev(([s, i]) => { const e = document.querySelectorAll(s)[i]; if (!e) return null; return { a: e.dataset.a || (e.dataset.n ? 'n:' + e.dataset.n : 'lock:' + e.dataset.lock), txt: (e.innerText || '').trim().slice(0, 24) }; }, [SEL, i]);
      if (!info || YASAK.has(info.a) || info.a === 'n:' + t) continue; const once = await snap(); const e0 = errs.length;
      await ev(([s, i]) => document.querySelectorAll(s)[i]?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })), [SEL, i]); await p.waitForTimeout(60); toplam++;
      const sonra = await snap(); const r = await ev(() => { const e = document.getElementById('page'); const m = e.innerText.match(/NaN|undefined|\[object|Infinity/); return { bos: e.innerText.trim().length < 20, bad: m ? m[0] : '' }; });
      if (errs.length > e0) garip.push(`${t}${sk ? '/' + sk : ''} «${info.txt}» (${info.a}) hata: ${errs[errs.length - 1]}`);
      else if (r.bos || r.bad) garip.push(`${t}${sk ? '/' + sk : ''} «${info.txt}» (${info.a}) sayfa ${r.bos ? 'boş' : r.bad}`);
      else if (JSON.stringify(once) === JSON.stringify(sonra)) noop.push(`${t}${sk ? '/' + sk : ''} «${info.txt}» (${info.a})`);
      await ev(() => { document.querySelectorAll('.yd').forEach((e) => e.remove()); const ev = document.querySelector('.evbox,.modal'); if (ev) ev.remove(); if (window.__app.S) window.__app.S.hiz = 0; });
    }
  }
  console.log(`\nBasılan düğme: ${toplam}`);
  ok(garip.length === 0, 'hata/boş/bozuk sayfa veren düğme yok' + (garip.length ? '\n     ' + garip.slice(0, 15).join('\n     ') : ''));
  console.log(`  ℹ Hiçbir şey değiştirmeyen düğme: ${noop.length}`); noop.slice(0, 60).forEach((x) => console.log('     - ' + x));
  console.log('\nÇift tetiklenme'); await ev(() => { window.__app.S.kasa = 8e7; });
  for (let i = 0; i < 8; i++) await tab(i % 2 ? 'stok' : 'tedarik'); await tab('stok');
  const o0 = await ev(() => window.__app.S.subeler[0].siparisler.length); await ev(() => document.querySelector('#page [data-a="siparis"]').click()); await p.waitForTimeout(100); const o1 = await ev(() => window.__app.S.subeler[0].siparisler.length);
  ok(o1 - o0 === 1, 'sayfa 8 kez yenilendikten sonra "Sipariş" tek tıkta tek sipariş (' + (o1 - o0) + ')');
  await tab('subeler'); await ev(() => document.querySelector('[data-a="subeAcik"]')?.click()); await p.waitForTimeout(100); for (let i = 0; i < 6; i++) { await ev(() => document.querySelector('[data-a="subeSekme"][data-k="menu"]').click()); await ev(() => document.querySelector('[data-a="subeSekme"][data-k="ozet"]').click()); } await ev(() => document.querySelector('[data-a="subeSekme"][data-k="menu"]').click()); await p.waitForTimeout(100);
  const f = await ev(() => { const e = document.querySelector('[data-a="fiyatTl"][data-d="5"]'); const id = e.dataset.id; const b = window.__app.S.subeler[0]; const x0 = b.menu[id].fiyat; e.click(); return [x0, b.menu[id].fiyat, id]; });
  await p.waitForTimeout(100); const f2 = await ev((id) => window.__app.S.subeler[0].menu[id].fiyat, f[2]); const adim1 = f2 - f[0]; await ev(([id]) => { const e = document.querySelector(`[data-a="fiyatTl"][data-id="${id}"][data-d="5"]`); e.click(); }, [f[2]]); await p.waitForTimeout(100); const f3 = await ev((id) => window.__app.S.subeler[0].menu[id].fiyat, f[2]);
  ok(Math.abs((f3 - f2) - adim1) < 1e-9 && adim1 > 0, 'fiyat artırma her tıkta eşit adım (tek tetik): ' + adim1.toFixed(3) + ' / ' + (f3 - f2).toFixed(3));
  ok(errs.length === 0, 'tarayıcı hatası yok' + (errs.length ? ' → ' + errs[0] : '')); await b.close(); console.log(fails.length ? `\n${fails.length} BAŞARISIZ` : '\nTÜMÜ GEÇTİ'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('ÇÖKTÜ', e.message); process.exit(1); });
