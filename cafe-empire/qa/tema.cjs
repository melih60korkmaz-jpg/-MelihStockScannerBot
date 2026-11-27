/* Renk kimliği + animasyon sistemi: gerçek tarayıcıda doğrulama. Kullanım: npm run build && node qa/tema.cjs */
const { chromium } = require('playwright'); const path = require('path'); const URL = 'file://' + path.resolve(__dirname, '../dist/index.html');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const kur = async (p) => { const ev = (f, a) => p.evaluate(f, a); await p.goto(URL); await p.click('#yeni'); await p.waitForTimeout(300); await p.click('#basla'); await p.waitForTimeout(700); await ev(() => document.querySelector('[data-ogr="kapat"]')?.click());
  await ev(() => window.__app.openTab('harita')); await p.waitForTimeout(300); await ev(() => document.querySelector('path[data-il="34"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(1100);
  await ev(() => [...document.querySelectorAll('path.ilce')].find((x) => x.querySelector('title').textContent === 'Esenyurt').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(250);
  await ev(() => document.querySelector('[data-a="kurAc"]').click()); await p.waitForTimeout(250); await ev(() => document.querySelector('[data-a="kur_ac2"]').click()); await p.waitForTimeout(600); await ev(() => { window.__app.S.kasa = 8e6; window.__app.S.hiz = 0; }); };
const yeniSayfa = async (browser, opt = {}, onload) => { const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, ...opt }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); if (onload) await ctx.addInitScript(onload); return { p, errs, ctx }; };
(async () => { const b = await chromium.launch();
  /* ===== 1) normal mod ===== */
  console.log('Renkler ve bileşenler (tam mod)'); { const { p, errs } = await yeniSayfa(b); const ev = (f, a) => p.evaluate(f, a); await kur(p);
    const c = await ev(() => { const g = (s, k) => getComputedStyle(document.querySelector(s))[k]; return { body: g('body', 'backgroundColor'), top: g('.top', 'backgroundColor'), tx: g('body', 'color'), mod: document.documentElement.dataset.anim }; });
    ok(c.body === 'rgb(32, 33, 36)', 'ana arka plan #202124 → ' + c.body); ok(c.top === 'rgb(41, 42, 47)', 'üst çubuk yüzeyi #292A2F → ' + c.top); ok(c.tx === 'rgb(245, 241, 237)', 'ana metin #F5F1ED → ' + c.tx); ok(c.mod === 'tam', 'animasyon modu: tam');
    await ev(() => window.__app.openTab('finans')); await p.waitForTimeout(500);
    const k = await ev(() => { const cs = (e) => getComputedStyle(e); const card = document.querySelector('.pb .card, .pb .cardx'), sel = document.querySelector('.subtabs button.on'); return { kart: cs(card).backgroundColor, kenar: cs(card).borderTopColor, secBg: cs(sel).backgroundImage, secTx: cs(sel).color, pri: (() => { const e = document.querySelector('.btn.pri'); return e ? cs(e).backgroundImage : ''; })() }; });
    ok(k.kart === 'rgb(43, 44, 49)', 'kart yüzeyi #2B2C31 → ' + k.kart); ok(k.kenar === 'rgb(72, 70, 74)', 'kenarlık #48464A → ' + k.kenar); ok(/120, 61, 74/.test(k.secBg) && /70, 35, 45/.test(k.secBg), 'seçili sekme bordo gradyan (#783D4A → #46232D)'); ok(k.secTx === 'rgb(241, 231, 220)', 'seçili sekme metni açık şampanya');
    console.log('Kart girişi, basma ve geçişler');
    await ev(() => window.__app.openTab('personel')); await p.waitForTimeout(40);
    const g = await ev(() => { const k = document.querySelector('.pb.in > *'); const cs = getComputedStyle(k); const k3 = document.querySelectorAll('.pb.in > *')[2]; return { ad: cs.animationName, sure: cs.animationDuration, gec3: k3 ? getComputedStyle(k3).animationDelay : '' }; });
    ok(g.ad === 'ceKart' && g.sure === '0.32s', `yeni sayfada kartlar kademeli girer (${g.ad}, ${g.sure}, 3. kart gecikmesi ${g.gec3})`);
    await ev(() => window.__app.openTab('finans')); await p.waitForTimeout(250); const ilk = await ev(() => ({ in: !!document.querySelector('.pb.in'), n: document.querySelectorAll('.pb > *').length })); await p.waitForTimeout(1700); const tekrar = await ev(() => ({ in: !!document.querySelector('.pb.in'), ceKart: document.getAnimations().filter((a) => a.animationName === 'ceKart' && a.playState === 'running').length, tamam: document.querySelectorAll('.pb > *').length === 0 ? 0 : [...document.querySelectorAll('.pb > *')].every((e) => +getComputedStyle(e).opacity === 1) }));
    ok(ilk.in && !tekrar.in && tekrar.ceKart === 0 && tekrar.tamam, 'giriş animasyonu yenileme tarafından kesilmez ve tekrar oynamaz (canlı sayfa)');
    await ev(() => window.__app.openTab('personel')); await p.waitForTimeout(500); const bb = await (await p.$('.subtabs button:not(.on):not(.lock)')).boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(260);
    const bas = await ev(() => getComputedStyle(document.querySelector('.subtabs button:not(.on):not(.lock):active') || document.querySelector('.subtabs button:not(.on)')).transform); await p.mouse.up();
    ok(/matrix\(0\.96/.test(bas), 'butona basılınca küçülür (scale .96) → ' + bas);
    await p.mouse.move(5, 5); await p.waitForTimeout(300); ok((await ev(() => getComputedStyle(document.querySelector('.subtabs button:not(.on):not(.lock)')).transform)) === 'none', 'bırakınca eski boyuta döner');
    const sonsuz = await ev(() => { const hepsi = document.getAnimations().filter((a) => a.effect && a.effect.getComputedTiming().iterations === Infinity); return hepsi.map((a) => (a.effect.target && (a.effect.target.closest('.nav,.top,.subtabs,.card,.cardx') ? 'ARAYÜZ:' : 'çizim:') + a.animationName)); });
    ok(!sonsuz.some((x) => x.startsWith('ARAYÜZ')), `arayüzde (menü, üst çubuk, kart) sürekli animasyon yok (${sonsuz.length} süs çizim animasyonu: ${[...new Set(sonsuz)].join(',') || '—'})`);
    console.log('Finans animasyonu: kasa sayacı ve renk vurgusu');
    const artis = await ev(async () => { const S = window.__app.S, el = () => document.getElementById('tKasaV').textContent; const degerler = new Set([el()]); S.kasa += 3e6; S.hiz = 1; const sinif = []; for (let i = 0; i < 24; i++) { await new Promise((r) => setTimeout(r, 40)); degerler.add(el()); if (document.getElementById('tKasa').classList.contains('up')) sinif.push('up'); } S.hiz = 0; return { n: degerler.size, son: el(), up: sinif.length > 0 }; });
    ok(artis.n >= 3, `kasa artınca rakam akıcı yükselir (${artis.n} ara değer, son ${artis.son})`); ok(artis.up, 'artışta yeşil vurgu sınıfı (up) çalışır');
    const dusus = await ev(async () => { const S = window.__app.S; S.kasa -= 2e6; S.hiz = 1; let dn = false, n = new Set(); for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 40)); n.add(document.getElementById('tKasaV').textContent); if (document.getElementById('tKasa').classList.contains('dn')) dn = true; } S.hiz = 0; return { dn, n: n.size }; });
    ok(dusus.dn && dusus.n >= 3, `harcamada rakam akıcı düşer ve kırmızı vurgu (dn) çıkar (${dusus.n} ara değer)`);
    console.log('Bildirimler');
    await ev(() => window.__app.openTab('tedarik')); await p.waitForTimeout(300); await ev(() => { for (let i = 0; i < 6; i++) document.querySelector('.subtabs [data-lock]')?.click(); }); await p.waitForTimeout(120);
    const t = await ev(() => ({ n: document.querySelectorAll('#toasts .toast').length, ust: document.getElementById('toasts')?.getBoundingClientRect().top })); ok(t.n >= 1 && t.n <= 3, `bildirimler üstte yığılır, en çok 3 görünür (şu an ${t.n})`);
    await p.waitForTimeout(3300); ok((await ev(() => document.querySelectorAll('#toasts .toast').length)) === 0, 'bildirimler kendiliğinden kapanır');
    await ev(() => { window.__app.S.kasa = 0; }); await ev(() => window.__app.openTab('reklam')); await p.waitForTimeout(300);
    const hata = await ev(async () => { const e = document.querySelector('#page [data-a="ad"]'); if (!e) return 'yok'; e.click(); await new Promise((r) => setTimeout(r, 80)); const t = document.querySelector('#toasts .toast'); return t ? t.className + '|' + getComputedStyle(t).animationName : 'bildirim yok'; });
    ok(/bad/.test(hata) && /ceShake/.test(hata), 'hata bildirimi kırmızı kenarlıklı ve hafif titrer → ' + hata);
    console.log('Pencereler');
    await p.waitForTimeout(3200); await ev(() => document.getElementById('tHelp').click()); await p.waitForTimeout(60); const a1 = await ev(() => ({ yd: getComputedStyle(document.querySelector('.yd')).animationName, kutu: getComputedStyle(document.querySelector('.ydbox')).animationName }));
    ok(a1.yd === 'ceFadeIn' && a1.kutu === 'cePop', `pencere hafif büyüyerek ve yumuşakça açılır (${a1.yd}, ${a1.kutu})`);
    await ev(() => document.querySelector('[data-yd="kapat"]').click()); await p.waitForTimeout(40); const cikis = await ev(() => document.querySelector('.yd')?.classList.contains('cikis')); await p.waitForTimeout(400); const kalan = await ev(() => !!document.querySelector('.yd'));
    ok(cikis && !kalan, 'pencere kapanırken çıkış animasyonu oynar, sonra DOM\'dan kalkar');
    await ev(() => window.__app.openTab('tarif')); await p.waitForTimeout(400); const once = await ev(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).length);
    await ev(() => document.getElementById('tHelp').click()); await p.waitForTimeout(200); const sonra = await ev(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity && a.effect.target?.closest('#page')).length);
    ok(sonra === 0 || sonra < once, `pencere açıkken arkadaki süs animasyonları durur (önce ${once}, sonra ${sonra})`); await ev(() => document.querySelector('[data-yd="kapat"]').click());
    ok(errs.length === 0, 'tarayıcı hatası yok ' + (errs[0] || '')); await p.close(); }
  /* ===== 2) hareketi azalt ===== */
  console.log('Hareketi azalt (iOS erişilebilirlik ayarı)'); { const { p, errs } = await yeniSayfa(b, { reducedMotion: 'reduce' }); const ev = (f, a) => p.evaluate(f, a); await kur(p);
    ok((await ev(() => document.documentElement.dataset.anim)) === 'kapali', 'sistem "hareketi azalt" → animasyon modu kapalı'); await ev(() => window.__app.openTab('personel')); await p.waitForTimeout(30);
    const r = await ev(() => { const k = document.querySelector('.pb.in > *'); return { sure: getComputedStyle(k).animationDuration, gecis: getComputedStyle(document.querySelector('.btn') || document.body).transitionDuration }; });
    ok(parseFloat(r.sure) < 0.001, 'kart animasyonu fiilen kapalı → ' + r.sure); ok(parseFloat(r.gecis) < 0.001, 'geçişler fiilen kapalı → ' + r.gecis);
    const gor = await ev(() => { const S = window.__app.S, el = () => document.getElementById('tKasaV').textContent; S.kasa += 4e6; S.hiz = 1; const v = new Set(); return new Promise((res) => { let i = 0; const t = setInterval(() => { v.add(el()); if (++i > 45) { clearInterval(t); S.hiz = 0; res([...v]); } }, 20); }); });
    ok(gor.length <= 2 && /^1[12]/.test(gor[gor.length - 1]), 'kasa rakamı ara değer göstermeden doğrudan son değere geçer (sayaç animasyonu yok) → ' + gor.join(' → '));
    ok(errs.length === 0, 'tarayıcı hatası yok'); await p.close(); }
  /* ===== 3) hafif mod (Ayarlar) ===== */
  console.log('Hafif mod (Ayarlar → Animasyonlar)'); { const { p, errs } = await yeniSayfa(b); const ev = (f, a) => p.evaluate(f, a); await kur(p);
    await ev(() => window.__app.openTab('ayar')); await p.waitForTimeout(300); await ev(() => document.querySelector('[data-a="anim"][data-k="hafif"]').click()); await p.waitForTimeout(200);
    const h = await ev(() => ({ mod: document.documentElement.dataset.anim, d3: getComputedStyle(document.documentElement).getPropertyValue('--d3').trim(), sakli: localStorage.getItem('ce_anim'), on: document.querySelector('[data-a="anim"][data-k="hafif"]').classList.contains('on') }));
    ok(h.mod === 'hafif' && Math.abs(parseFloat(h.d3) * (/ms$/.test(h.d3) ? 1 : 1000) - 150) < 1 && h.sakli === 'hafif' && h.on, `Hafif seçilince süreler kısalır, tercih saklanır (${h.mod}, --d3=${h.d3})`);
    await ev(() => window.__app.openTab('personel')); await p.waitForTimeout(40); ok((await ev(() => getComputedStyle(document.querySelector('.pb.in > *')).animationName)) === 'none', 'hafif modda kart kademesi kapalı');
    await ev(() => window.__app.openTab('tarif')); await p.waitForTimeout(300); ok((await ev(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity && a.effect.target?.closest('#page')).length)) === 0, 'hafif modda sürekli süs animasyonları durur');
    await p.reload(); await p.waitForTimeout(500); ok((await ev(() => document.documentElement.dataset.anim)) === 'hafif', 'tercih yeniden açılışta korunur'); ok(errs.length === 0, 'tarayıcı hatası yok'); await p.close(); }
  await b.close(); console.log(fails.length ? `\n${fails.length} BAŞARISIZ` : '\nTÜMÜ GEÇTİ'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('ÇÖKTÜ', e.message); process.exit(1); });
