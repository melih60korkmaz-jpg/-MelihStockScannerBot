/* App Store ekran görüntülerini üretir. Kullanım: node scripts/make-screenshots.cjs <kayit.json> (gerçek bir oyun kaydı) */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const KAYIT = process.argv[2], OUT = path.join(__dirname, '../store/screenshots'), URL = 'file://' + path.resolve(__dirname, '../../cafe-empire/dist/index.html');
const BOYUTLAR = [['iphone69', 956, 440], ['iphone65', 926, 428]];   // ×3 → 2868×1320 ve 2778×1284
const EKRANLAR = [['1-merkez', 'ana'], ['2-turkiye', 'harita'], ['3-acilis', 'kur'], ['4-atolye', 'tarif'], ['5-istatistik', 'grafik'], ['6-semt', 'takvim'], ['7-yatirim', 'yatirim']];
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader'] }); const kayit = fs.readFileSync(KAYIT, 'utf8');
  for (const [ad, w, h] of BOYUTLAR) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }); await ctx.addInitScript((k) => { try { if (!localStorage.getItem('cafe-empire.save.v1')) localStorage.setItem('cafe-empire.save.v1', k); } catch (e) {} }, kayit); const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(700); await p.click('#devam'); await p.waitForTimeout(900); await p.evaluate(() => { const S = window.__app.S; S.hiz = 0; S.ayar.ozet = 'kapali'; S.tur = -1; document.querySelectorAll('.tour,.modal').forEach((m) => m.remove()); });
    for (const [dosya, tab] of EKRANLAR) {
      if (tab === 'kur') { await p.evaluate(() => window.__app.openTab('harita')); await p.waitForTimeout(500); await p.evaluate(() => document.querySelector('path[data-il="34"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(900);
        await p.evaluate(() => { const ilce = [...document.querySelectorAll('path.ilce')].find((x) => !x.classList.contains('acik') && x.querySelector('title')); (ilce ?? document.querySelector('path.ilce')).dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await p.waitForTimeout(400); const var_ = await p.evaluate(() => !!document.querySelector('[data-a="kurAc"]'));
        if (var_) { await p.evaluate(() => document.querySelector('[data-a="kurAc"]').click()); await p.waitForTimeout(500); } }
      else { await p.evaluate((t) => window.__app.openTab(t), tab); await p.waitForTimeout(900); }
      await p.evaluate(() => { document.querySelectorAll('.toast,.confetti').forEach((m) => m.remove()); const tb = document.querySelector('#toast'); if (tb) tb.innerHTML = ''; });
      await p.screenshot({ path: path.join(OUT, `${ad}-${dosya}.png`) }); if (tab === 'kur') await p.evaluate(() => document.querySelector('[data-a="kur_kapat"]')?.click()); }
    await ctx.close(); }
  await b.close(); console.log('ekran görüntüleri hazır'); })();
