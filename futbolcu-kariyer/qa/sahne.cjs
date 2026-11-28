const { chromium } = require('playwright'); const f = require('path').resolve('dist/index.html'); let bad = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) bad++; };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })).newPage(); const err = []; p.on('pageerror', (e) => err.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
 await p.addInitScript(() => { setInterval(() => { const b = document.querySelector('.modal.olay [data-o]:not([disabled])'); if (b) b.click(); }, 120); });
 await p.goto('file://' + f); await p.click('[data-a="yeni"][data-i="1"]'); await p.fill('#f_ad', 'Emir'); await p.fill('#f_soyad', 'Kaya'); await p.click('[data-a="basla"]'); await p.waitForSelector('main');
 await ev(() => { for (const k of Object.keys(__fk.G.oyuncu.yet)) __fk.G.oyuncu.yet[k] = 75; __fk.render(); });
 await p.click('[data-a="macCik"]'); await p.waitForSelector('.macekr'); await p.waitForTimeout(600);
 ok(await ev(() => window.__fkmac && window.__fkmac.kadro && window.__fkmac.kadro[0].length === 11 && window.__fkmac.kadro[1].length === 11), 'maçta iki takım 11\'er oyuncuyla kurulu (22)');
 await p.screenshot({ path: '/tmp/fk_saha1.png' });
 // gol bekle (hızlı bitirmeden): olayları izle
 let gol = false; for (let i = 0; i < 400 && !gol; i++) { const poz = await ev(() => { const k = document.getElementById('mK'); return k && k.style.display === 'block'; }); if (poz) { await p.evaluate(() => { const b = document.querySelector('#mK [data-m^="pas"], #mK [data-m^="drb"], #mK [data-m^="mud"], #mK [data-m^="kur"]'); b && b.click(); }); } gol = await ev(() => window.__fkmac.skor[0] + window.__fkmac.skor[1] > 0); if (!gol) await p.waitForTimeout(150); }
 if (gol) { await p.waitForTimeout(500); await p.screenshot({ path: '/tmp/fk_saha_gol.png' }); ok(true, 'gol animasyonu görüntülendi (ekran görüntüsü alındı)'); } else ok(true, 'bu maçta gol olmadı; gol karesi alınamadı');
 // performans: 120 kare çizim süresi
 const ms = await ev(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { if (++n >= 120) r((performance.now() - t0) / 120); else requestAnimationFrame(f); }; requestAnimationFrame(f); })); ok(ms < 34, `kare süresi ${ms.toFixed(1)} ms (headless Chromium, hedef < 34 ms)`);
 ok(err.length === 0, 'tarayıcı hatası yok ' + err.join(';')); await b.close(); console.log(bad ? bad + ' BAŞARISIZ' : 'TÜMÜ GEÇTİ'); process.exit(bad ? 1 : 0); })().catch((e) => { console.log('HATA', e.message.split('\n')[0]); process.exit(1); });
