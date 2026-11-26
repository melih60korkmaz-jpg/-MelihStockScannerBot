/* Uygulama simgelerini üretir (Playwright ile SVG → PNG). Kullanım: node scripts/make-icons.cjs */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const svg = (buyuk, saydam) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b3a44"/><stop offset="1" stop-color="#081418"/></linearGradient>
<linearGradient id="bak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6b27a"/><stop offset="1" stop-color="#d4713a"/></linearGradient>
<radialGradient id="isik" cx="50%" cy="38%" r="60%"><stop offset="0" stop-color="rgba(255,200,140,.35)"/><stop offset="1" stop-color="rgba(255,200,140,0)"/></radialGradient></defs>
${saydam ? '' : '<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#isik)"/>'}
<g transform="translate(512 540) scale(${buyuk})">
<g fill="none" stroke="#ffe3c4" stroke-width="22" stroke-linecap="round" opacity=".9"><path d="M-110 -250 q-50 -60 0 -120 t0 -110"/><path d="M0 -270 q-50 -60 0 -120 t0 -110"/><path d="M110 -250 q-50 -60 0 -120 t0 -110"/></g>
<path d="M-300 -150 H300 V60 q0 260 -300 260 q-300 0 -300 -260z" fill="url(#bak)"/>
<path d="M300 -80 q150 0 150 110 q0 120 -170 120" fill="none" stroke="url(#bak)" stroke-width="46" stroke-linecap="round"/>
<ellipse cx="0" cy="-150" rx="300" ry="46" fill="#3b2314"/><ellipse cx="0" cy="-150" rx="260" ry="30" fill="#6b4a2f"/>
<path d="M-380 330 H380" stroke="#ffe3c4" stroke-width="30" stroke-linecap="round" opacity=".85"/>
<text x="0" y="150" text-anchor="middle" font-family="Georgia,serif" font-size="230" font-weight="900" fill="#1b0f07" opacity=".78">CE</text></g></svg>`;
(async () => { const b = await chromium.launch(); const sayfa = async (html, w, h, dosya, saydam) => { const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); await p.setContent(`<body style="margin:0;background:${saydam ? 'transparent' : '#000'}">${html}</body>`); await p.screenshot({ path: dosya, omitBackground: !!saydam }); await p.close(); };
  const A = path.join(__dirname, '../assets'); await sayfa(svg(0.95, false), 1024, 1024, path.join(A, 'icon.png'), false);
  await sayfa(svg(0.8, true), 1024, 1024, path.join(A, 'splash-icon.png'), true); await sayfa(svg(0.6, true), 1024, 1024, path.join(A, 'android-icon-foreground.png'), true);
  await sayfa('<div style="width:1024px;height:1024px;background:#081418"></div>', 1024, 1024, path.join(A, 'android-icon-background.png'), false);
  await sayfa(svg(0.6, true).replace(/url\(#bak\)/g, '#ffffff').replace(/#3b2314|#6b4a2f|#ffe3c4/g, '#ffffff').replace(/#1b0f07/g, '#000000'), 1024, 1024, path.join(A, 'android-icon-monochrome.png'), true);
  const p = await b.newPage({ viewport: { width: 48, height: 48 } }); await p.setContent(`<body style="margin:0">${svg(0.95, false).replace('width="1024" height="1024"', 'width="48" height="48"')}</body>`); await p.screenshot({ path: path.join(A, 'favicon.png') });
  await b.close(); console.log('simgeler üretildi'); })();
