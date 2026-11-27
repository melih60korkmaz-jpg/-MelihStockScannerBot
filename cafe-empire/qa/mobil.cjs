const { chromium } = require('playwright'); const f = process.argv[2] || require('path').resolve('dist/index.html');
(async () => { const b = await chromium.launch(); let bad = 0;
 for (const [w, h] of [[844, 390], [667, 375], [932, 430]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true })).newPage(); const ev = (a, c) => p.evaluate(a, c);
  await p.goto('file://' + f); await p.click('#yeni'); await p.waitForTimeout(300); await p.click('#basla'); await p.waitForTimeout(700); await ev(() => document.querySelector('[data-ogr="kapat"]')?.click());
  await ev(() => { window.__app.S.kasa = 5e6; });
  const ids = await ev(() => window.__app.tabIds()); let tasan = [], dusuk = [];
  for (const t of ids) { await ev((x) => window.__app.openTab(x), t); await p.waitForTimeout(450);
   const r = await ev(() => { const W = innerWidth, o = []; if (document.documentElement.scrollWidth > W + 1) o.push('sayfa yatay kayıyor');
     const pg = document.querySelector('#page'); if (pg && pg.scrollWidth > pg.clientWidth + 2) o.push('#page yatay ' + pg.scrollWidth + '>' + pg.clientWidth);
     const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const a = m[3] ?? 1; const l = m.slice(0, 3).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return [.2126 * l[0] + .7152 * l[1] + .0722 * l[2], a]; };
     const bgOf = (e) => { while (e) { const c = getComputedStyle(e).backgroundColor; const [L, a] = lum(c); if (a > .9) return L; e = e.parentElement; } return lum('rgb(32,33,36)')[0]; };
     const low = []; const wk = document.createTreeWalker(document.querySelector('#page'), NodeFilter.SHOW_TEXT);
     while (wk.nextNode()) { const n = wk.currentNode; if (!n.textContent.trim()) continue; const e = n.parentElement; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity < .5 || e.offsetWidth === 0) continue; const [fl, fa] = lum(cs.color); const bl = bgOf(e); const cr = (Math.max(fl, bl) + .05) / (Math.min(fl, bl) + .05); if (cr < 3 && fa > .5) low.push(n.textContent.trim().slice(0, 18) + ' ' + cr.toFixed(1)); }
     return { o, low: low.slice(0, 4), n: low.length }; });
   if (r.o.length) tasan.push(t + ': ' + r.o.join(',')); if (r.n) dusuk.push(t + '(' + r.n + '): ' + r.low.join(' | ')); }
  console.log(`${w}×${h}  sekme ${ids.length}  taşan: ${tasan.length}  düşük kontrast(<3): ${dusuk.length}`); tasan.slice(0, 6).forEach((x) => console.log('   TAŞMA ' + x)); dusuk.slice(0, 8).forEach((x) => console.log('   KONTRAST ' + x)); bad += tasan.length; }
 await b.close(); process.exit(bad ? 1 : 0); })();
