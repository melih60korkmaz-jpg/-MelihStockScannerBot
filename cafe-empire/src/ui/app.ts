import './style.css';
import { CafeView, type CamPreset } from '../render3d/view';
import { CITIES, cityById, REGION_NAME } from '../data/turkey';
import { ADS, AD, INGREDIENTS, PRODUCTS, PRODUCT, SHOP, SHOP_TYPES, STAFF_TYPES, STAFF_TYPE, UPGRADES, LEVELS, type ShopTypeId, type StaffTypeId, type IngId, type ProductId, type AdId, type UpgradeId } from '../data/catalog';
import { newGame, subeAc, hire, fire, raise, candidates, setPrice, toggleProduct, upgrade, upgradeCost, startAd, adCost, orderIng, takeLoan, payLoan, closeBranch, fmt, setupCost, rentOf, staffLimit, type Result } from '../core/actions';
import { step, dateText, timeText, dayOf, hourOf, levelOf, dailyDemand, sellPrice, unitCost, refPrice, ingPrice, outdoorSeats, resolveEvent, openHours, MIN_PER_DAY } from '../core/sim';
import { save, load, wipe } from '../core/save';
import { mapSvg, METRICS, regionName, type Metric } from './map';
import type { Branch, Employee, GameState } from '../core/types';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector(sel) as T;
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c] ?? c);
const root = document.getElementById('app') as HTMLElement;
let S: GameState | null = null, view: CafeView | null = null, TAB = 'genel', BID = 0, PANEL_OPEN = false;
let MAPM: Metric = 'bolge', MAPSEL = 34, cand: Employee[] = [], candTip: StaffTypeId = 'barista', accMin = 0, uiT = 0, saveT = 0, modalOpen = false;

const NAV: Array<[string, string, string]> = [['genel', '🏠', 'Genel Bakış'], ['harita', '🗺️', 'Türkiye'], ['subeler', '🏬', 'Şubelerim'], ['personel', '👥', 'Personel'], ['menu', '📋', 'Ürünler'], ['satin', '🛒', 'Satın Alma'], ['stok', '📦', 'Stok'], ['finans', '💰', 'Finans'], ['reklam', '📣', 'Reklam'], ['rakip', '🥊', 'Rakipler'], ['gelis', '🏗️', 'Geliştirme'], ['franchise', '🤝', 'Franchise'], ['sirket', '⚙️', 'Şirket']];
const cur = (): Branch => { const b = S!.subeler.find((x) => x.id === BID) ?? S!.subeler[0]!; BID = b.id; return b; };
const bar = (v: number, col = 'var(--am)') => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, v))}%;background:${col}"></i></div>`;
function toast(m: string): void { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; root.appendChild(t); setTimeout(() => t.remove(), 2400); }
const res = (r: Result): void => { toast(r.m); if (S) save(S); panel(true); hud(); };

/* ===================== Başlangıç ekranları ===================== */
function title(): void {
  const has = load(); root.innerHTML = `<div class="screen"><div class="title"><div style="font-size:64px">☕</div><h1>CAFE EMPIRE</h1><p>Türkiye · kafe işletme ve zincir simülasyonu</p>${has ? `<button class="btn pri" id="devam">Devam et<br><small>${esc(has.marka.ad)} · ${dateText(has)} · ${has.subeler.length} şube</small></button>` : ''}<button class="btn ${has ? '' : 'pri'}" id="yeni">Yeni oyun</button><p class="tiny muted" style="margin-top:14px">Telefonu yatay tutmanız önerilir. Kurgusal bir simülasyondur.</p></div></div>`;
  $('#yeni').onclick = setup; if (has) $('#devam').onclick = () => { S = has; enter(); };
}
function setup(): void {
  let ad = 'Fincan Kahve', renk = '#c4722a', renk2 = '#2d1f14', logo = 0, sehir = 26, tip: ShopTypeId = 'mahalle'; const renkler: Array<[string, string]> = [['#c4722a', '#2d1f14'], ['#2e86c1', '#1b2a38'], ['#27ae60', '#1d3a2b'], ['#c0392b', '#3a1d1d'], ['#8e44ad', '#2d1d3a'], ['#d4a017', '#2a2415']];
  const draw = (): void => {
    const c = cityById(sehir), probs = SHOP_TYPES.map((t) => { const why = t.uygun(c); return { t, why, cost: setupCost({ market: { fiyat: 1 } } as GameState, c, t.id) }; });
    root.innerHTML = `<div class="screen"><div class="setup"><div><h2 style="font-family:var(--fd);margin:0 0 8px">1 · Markan</h2><div class="card"><div class="small muted">Kafe / şirket adı</div><input id="ad" maxlength="22" value="${esc(ad)}" style="width:100%;margin-top:5px;background:var(--p2);border:1px solid var(--line);border-radius:10px;padding:10px;font-size:16px"><div class="small muted" style="margin-top:8px">Marka renkleri</div><div class="colors">${renkler.map((r, i) => `<i data-r="${i}" class="${r[0] === renk ? 'on' : ''}" style="background:${r[0]}"></i>`).join('')}</div><div class="small muted">Logo</div><div class="chiprow">${['☕', '🥐', '🌿', '⭐', '🔥', '🫘'].map((l, i) => `<button class="cx ${i === logo ? 'on' : ''}" data-l="${i}">${l}</button>`).join('')}</div></div>
      <h2 style="font-family:var(--fd);margin:12px 0 8px">3 · Dükkân türü <span class="muted small">${esc(c.ad)}</span></h2>${probs.map((p) => `<button class="shopopt ${p.t.id === tip ? 'on' : ''} ${p.why || p.t.seviye > 1 ? 'dis' : ''}" data-t="${p.t.id}"><b>${p.t.ikon} ${p.t.ad}</b> <span class="small muted">· ${p.t.m2} m² · kira ${fmt(rentOf({ market: { fiyat: 1 } } as GameState, c, p.t.id))}/ay</span><div class="tiny muted">${p.why ? '🔒 ' + p.why : p.t.seviye > 1 ? '🔒 Kafe seviyesi ' + p.t.seviye + ' gerekir' : p.t.ac + ' · Kurulum ' + fmt(p.cost)}</div></button>`).join('')}<button class="btn pri" id="basla" style="width:100%;min-height:48px">Kafeyi aç ☕</button><button class="btn" id="geri" style="width:100%;margin-top:6px">Geri</button></div>
      <div><h2 style="font-family:var(--fd);margin:0 0 8px">2 · Şehir seç <span class="muted small">(haritaya dokun)</span></h2><div class="mapbox">${mapSvg(null, 'bolge', sehir)}</div><div class="card" style="margin-top:8px"><h3>${esc(c.ad)} <span class="muted small">${regionName(c)}</span></h3>${cityFacts(c)}</div></div></div></div>`;
    root.querySelectorAll<SVGElement>('[data-il]').forEach((p) => { p.onclick = () => { ad = ($('#ad') as HTMLInputElement).value || ad; sehir = +p.dataset.il!; draw(); }; });
    root.querySelectorAll<HTMLElement>('[data-r]').forEach((e) => { e.onclick = () => { ad = ($('#ad') as HTMLInputElement).value || ad; const r = renkler[+e.dataset.r!]!; renk = r[0]; renk2 = r[1]; draw(); }; });
    root.querySelectorAll<HTMLElement>('[data-l]').forEach((e) => { e.onclick = () => { ad = ($('#ad') as HTMLInputElement).value || ad; logo = +e.dataset.l!; draw(); }; });
    root.querySelectorAll<HTMLElement>('[data-t]').forEach((e) => { e.onclick = () => { ad = ($('#ad') as HTMLInputElement).value || ad; const t = SHOP[e.dataset.t as ShopTypeId]; if (!t.uygun(c) && t.seviye <= 1) tip = t.id; draw(); }; });
    $('#geri').onclick = title; $('#basla').onclick = () => { ad = ($('#ad') as HTMLInputElement).value || ad; const g = newGame({ ad, renk, renk2, logo, sehir, tip }); if (!g.r.ok) return toast(g.r.m); S = g.s; wipe(); enter(); toast('Kafen açıldı! İyi şanslar.'); };
  };
  draw();
}
function cityFacts(c: ReturnType<typeof cityById>): string {
  const lv = (v: number) => bar(v * 100); return `<div class="row small"><span>Nüfus</span><b>${(c.nufus / 1000).toFixed(2).replace('.', ',')} M</b></div><div class="row small"><span>Gelir seviyesi</span><b>${c.gelir.toFixed(2).replace('.', ',')}×</b></div><div class="row small"><span>Kira endeksi</span><b>${c.kira.toFixed(2).replace('.', ',')}×</b></div><div class="small muted">Turizm</div>${lv(c.turizm)}<div class="small muted">Öğrenci</div>${lv(c.ogrenci)}<div class="small muted">Rekabet</div>${lv(c.rekabet)}<div class="tiny muted">Müşteri profili: öğrenci %${Math.round(c.profil.ogr * 100)} · çalışan %${Math.round(c.profil.cal * 100)} · turist %${Math.round(c.profil.tur * 100)} · aile %${Math.round(c.profil.aile * 100)} · emekli %${Math.round(c.profil.emk * 100)}</div>`;
}

/* ===================== Oyun ekranı ===================== */
function enter(): void {
  if (!S) return; BID = S.subeler[0]!.id; TAB = 'genel';
  root.innerHTML = `<div id="v3d" style="position:absolute;inset:0"></div><div class="top"><b class="brand" id="tBrand"></b><span class="chip" id="tDate"></span><span class="chip">💰 <b id="tKasa"></b></span><span class="chip">⭐ <b id="tMarka"></b></span><span class="chip">🏅 <b id="tSev"></b></span><span class="sp"></span><span class="chip" id="tHava"></span><div class="spd" id="spd"></div></div><div class="nav" id="nav"></div><div class="cam" id="cam"></div><div class="hud" id="hud"></div><div class="bsel" id="bsel"></div><div class="panel hid" id="panel"></div><div class="fps" id="fps"></div>`;
  view?.destroy(); view = new CafeView($('#v3d')); view.show(S, cur()); S.hiz = 1; nav(); camBar(); spdBar(); hud(); panel(false); window.addEventListener('resize', layout);
  view.frameHook = (dt) => loop(dt);
  document.addEventListener('visibilitychange', () => { if (document.hidden && S) { save(S); } });
}
function layout(): void {
  const el = document.getElementById('v3d'); if (!el || !view) return; const land = innerWidth >= innerHeight, navW = 62 + 0, pw = PANEL_OPEN ? Math.min(innerWidth * 0.48, 440) : 0;
  if (land) { el.style.left = navW + 'px'; el.style.right = pw + 'px'; el.style.top = '0'; el.style.bottom = '0'; } else { el.style.left = '0'; el.style.right = '0'; el.style.top = '0'; el.style.bottom = (PANEL_OPEN ? '58%' : '58px'); }
  view.resize(); const p = document.getElementById('panel'); if (p) p.style.width = land ? (pw ? pw + 'px' : '') : '';
}
function nav(): void {
  $('#nav').innerHTML = NAV.map(([id, ic, nm]) => `<button data-n="${id}" class="${TAB === id ? 'on' : ''}"><i>${ic}</i>${nm}</button>`).join(''); $('#nav').querySelectorAll<HTMLElement>('[data-n]').forEach((b) => { b.onclick = () => { if (TAB === b.dataset.n && PANEL_OPEN && TAB !== 'genel') PANEL_OPEN = false; else { TAB = b.dataset.n!; PANEL_OPEN = true; } nav(); panel(false); }; });
}
function camBar(): void { const P: Array<[CamPreset, string]> = [['cephe', 'Cephe'], ['sol', 'Sol açı'], ['sag', 'Sağ açı'], ['sokak', 'Sokak'], ['sehir', 'Şehir']]; $('#cam').innerHTML = P.map(([k, n]) => `<button data-c="${k}">${n}</button>`).join('') + '<button data-z="1">＋</button><button data-z="-1">－</button>'; $('#cam').querySelectorAll<HTMLElement>('button').forEach((b) => { b.onclick = () => { if (b.dataset.c) view?.setPreset(b.dataset.c as CamPreset); else view?.zoom(+b.dataset.z! > 0 ? 0.8 : 1.25); }; }); }
function spdBar(): void { const V: Array<[number, string]> = [[0, '⏸'], [1, '▶'], [2, '⏩'], [4, '⏭']]; $('#spd').innerHTML = V.map(([v, t]) => `<button data-s="${v}" class="${S!.hiz === v ? 'on' : ''}">${t}</button>`).join(''); $('#spd').querySelectorAll<HTMLElement>('button').forEach((b) => { b.onclick = () => { S!.hiz = +b.dataset.s!; spdBar(); }; }); }
function hud(): void {
  if (!S) return; const b = cur(), c = cityById(b.city), t = S.rapor[S.rapor.length - 1];
  $('#tBrand').textContent = S.marka.ad; $('#tDate').textContent = `${dateText(S)} · ${timeText(S)}`; $('#tKasa').textContent = fmt(S.kasa); $('#tMarka').textContent = String(Math.round(S.marka_puani)); $('#tSev').textContent = `${levelOf(S)} · ${LEVELS[levelOf(S) - 1]?.ad ?? ''}`;
  const hv = S.hava[b.city] ?? 'gunesli'; $('#tHava').textContent = `${{ gunesli: '☀️', bulutlu: '⛅', yagmur: '🌧️', kar: '❄️' }[hv]} ${c.ad}`;
  $('#hud').innerHTML = `<span class="chip">Memnuniyet <b>${Math.round(b.memnuniyet)}</b></span><span class="chip">Bugün <b>${b.bugun.musteri}</b> müşteri</span><span class="chip">Bugün <b>${fmt(Object.values(b.bugun.gelir).reduce((a, x) => a + x, 0))}</b></span><span class="chip">Kayıp <b>${b.bugun.kayip}</b></span>`;
  $('#bsel').innerHTML = S.subeler.length > 1 ? S.subeler.map((x) => `<button data-b="${x.id}" class="${x.id === BID ? 'on' : ''}">${esc(x.ad.length > 18 ? x.ad.slice(0, 17) + '…' : x.ad)}</button>`).join('') : ''; $('#bsel').querySelectorAll<HTMLElement>('[data-b]').forEach((e) => { e.onclick = () => { BID = +e.dataset.b!; view!.show(S!, cur()); hud(); panel(true); }; });
  const f = $('#fps'); if (f && view) f.textContent = `${view.fps} fps`; void t;
}
function loop(dt: number): void {
  if (!S || !view) return; const dk = S.hiz * (MIN_PER_DAY / 60) * dt; accMin += dk; let n = 0;
  while (accMin >= 10 && n < 8) { accMin -= 10; const ev = step(S, 10); view.handleEvents(ev); n++; if (S.oyunBitti) break; }
  view.tick(dt, S); uiT += dt; saveT += dt; if (uiT > 0.5) { uiT = 0; hud(); if (['genel', 'stok', 'finans', 'subeler'].includes(TAB) && PANEL_OPEN) panel(true); if (S.bekleyen.length && !modalOpen) showEvent(); if (S.oyunBitti) gameOver(); }
  if (saveT > 15) { saveT = 0; save(S); }
}
function showEvent(): void {
  const p = S!.bekleyen[0]; if (!p) return; modalOpen = true; S!.hiz = 0; spdBar(); const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="mbox"><div class="pill">Olay</div><h2>${p.ikon} ${esc(p.baslik)}</h2><p>${esc(p.metin)}</p>${p.secenek.map((c, i) => `<button class="btn" data-o="${i}" style="width:100%;margin-top:6px;justify-content:flex-start;text-align:left"><span><b>${esc(c.ad)}</b><br><small class="muted">${esc(c.ac)}</small></span></button>`).join('')}</div>`; root.appendChild(m);
  m.querySelectorAll<HTMLElement>('[data-o]').forEach((b) => { b.onclick = () => { resolveEvent(S!, p.id, +b.dataset.o!); m.remove(); modalOpen = false; S!.hiz = 1; spdBar(); save(S!); hud(); panel(true); }; });
}
function gameOver(): void { if (modalOpen) return; modalOpen = true; S!.hiz = 0; const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="mbox"><h2>📉 İflas</h2><p>Kasa uzun süre eksi kaldı ve zincir kapandı. Bir dahaki sefere stok, ekip ve fiyat dengesini daha dikkatli kur.</p><div class="row"><span>Süre</span><b>${dayOf(S!)} gün</b></div><div class="row"><span>Şube</span><b>${S!.subeler.length}</b></div><button class="btn pri" id="y" style="width:100%;margin-top:8px">Ana menü</button></div>`; root.appendChild(m); $('#y').onclick = () => { wipe(); modalOpen = false; view?.destroy(); view = null; S = null; title(); }; }

/* ===================== Paneller ===================== */
function panel(keep: boolean): void {
  if (!S) return; const el = $('#panel'); if (!PANEL_OPEN) { el.classList.add('hid'); layout(); return; }
  const sc = keep ? el.querySelector<HTMLElement>('.pb')?.scrollTop ?? 0 : 0, nm = NAV.find((n) => n[0] === TAB)!;
  el.classList.remove('hid'); const body = ((): string => { switch (TAB) { case 'genel': return pGenel(); case 'harita': return pHarita(); case 'subeler': return pSubeler(); case 'personel': return pPersonel(); case 'menu': return pMenu(); case 'satin': return pSatin(); case 'stok': return pStok(); case 'finans': return pFinans(); case 'reklam': return pReklam(); case 'rakip': return pRakip(); case 'gelis': return pGelis(); case 'franchise': return pFranchise(); default: return pSirket(); } })();
  el.innerHTML = `<div class="ph"><h2>${nm[1]} ${nm[2]}</h2><button class="btn sm" id="pclose">Kapat ✕</button></div><div class="pb">${body}</div>`; $('#pclose').onclick = () => { PANEL_OPEN = false; panel(false); }; const pb = el.querySelector<HTMLElement>('.pb')!; pb.scrollTop = sc; bind(pb); layout();
}
function bind(pb: HTMLElement): void {
  pb.querySelectorAll<HTMLElement>('[data-a]').forEach((e) => { e.onclick = () => act(e.dataset.a!, e.dataset); });
  pb.querySelectorAll<SVGElement>('[data-il]').forEach((p) => { p.onclick = () => { MAPSEL = +p.dataset.il!; panel(true); }; });
}
function act(a: string, d: DOMStringMap): void {
  if (!S) return; const b = cur();
  switch (a) {
    case 'sube': return res(subeAc(S, +d.city!, d.tip as ShopTypeId)) as void;
    case 'bsel': BID = +d.id!; view!.show(S, cur()); hud(); return panel(true);
    case 'metric': MAPM = d.m as Metric; return panel(true);
    case 'cand': candTip = d.tip as StaffTypeId; cand = candidates(S, candTip); return panel(true);
    case 'hire': { const e = cand[+d.i!]; if (!e) return; const r = hire(S, b, e); if (r.ok) { cand = []; view!.show(S, b); } return res(r); }
    case 'fire': { const r = fire(S, b, +d.id!); if (r.ok) view!.show(S, b); return res(r); }
    case 'raise': return res(raise(b, +d.id!, 0.1));
    case 'fiyat': { const id = d.id as ProductId; setPrice(b, id, b.menu[id].fiyat + 0.05 * +d.d!); return panel(true); }
    case 'urun': return res(toggleProduct(S, b, d.id as ProductId));
    case 'kalite': { const m = b.menu[d.id as ProductId]; const c = 8000 * m.kalite * (S.market.fiyat); if (m.kalite >= 3) return; if (S.kasa < c) return toast('Kasa yetersiz.'); S.kasa -= c; m.kalite++; return res({ ok: true, m: 'Ürün kalitesi arttı (−' + fmt(c) + ')' }); }
    case 'siparis': return res(orderIng(S, b, d.id as IngId, +d.n!));
    case 'oto': b.otoSiparis = !b.otoSiparis; return panel(true);
    case 'ad': return res(startAd(S, b, d.id as AdId));
    case 'gel': { const r = upgrade(S, b, d.id as UpgradeId); if (r.ok) view!.show(S, b); return res(r); }
    case 'kredi': return res(takeLoan(S, +d.n!));
    case 'ode': return res(payLoan(S, +d.n!));
    case 'kapat': return res(closeBranch(S, +d.id!));
    case 'acik': b.acik = !b.acik; return panel(true);
    case 'git': TAB = 'subeler'; BID = +d.id!; view!.show(S, cur()); nav(); return panel(false);
    case 'kaydet': save(S); return toast('Oyun kaydedildi.');
    case 'cikis': save(S); view?.destroy(); view = null; S = null; return title();
    case 'sil': wipe(); view?.destroy(); view = null; S = null; return title();
  }
}
const sum = (o: object) => Object.values(o as Record<string, number>).reduce((a, x) => a + x, 0);
function pGenel(): string {
  const b = cur(), t = S!.rapor.slice(-7), kar7 = t.reduce((a, x) => a + x.kar, 0), st = INGREDIENTS.filter((i) => (b.stok[i.id] ?? 0) < i.paket * 0.15);
  return `<div class="card"><h3>${esc(b.ad)}</h3><div class="row"><span>Müşteri memnuniyeti</span><b>${Math.round(b.memnuniyet)}/100</b></div>${bar(b.memnuniyet, b.memnuniyet >= 65 ? 'var(--ok)' : 'var(--am)')}<div class="row"><span>Marka bilinirliği</span><b>${Math.round(b.marka)}</b></div>${bar(b.marka, 'var(--bl)')}<div class="row"><span>Hijyen</span><b>${Math.round(b.hijyen)}</b></div>${bar(b.hijyen, 'var(--ok)')}<div class="row"><span>Yorum puanı</span><b>${b.yorumPuan.toFixed(1).replace('.', ',')} ★</b></div></div>
  <div class="card"><h3>Son 7 gün</h3><div class="row"><span>Kâr</span><b class="${kar7 >= 0 ? 'good' : 'badc'}">${fmt(kar7)}</b></div><div class="row small"><span>Günlük beklenen talep</span><b>${Math.round(dailyDemand(S!, b))} müşteri</b></div><div class="row small"><span>Dış masa kapasitesi</span><b>${outdoorSeats(b)} kişi</b></div></div>${st.length ? `<div class="card" style="border-color:var(--bad)"><h3>⚠️ Stok uyarısı</h3><div class="small">${st.map((i) => i.ikon + ' ' + i.ad).join(', ')} azalıyor.</div></div>` : ''}
  <div class="card"><h3>💬 Yorumlar</h3>${b.yorumlar.slice(0, 5).map((r) => `<div class="small"><b>${esc(r.kim)}</b> ${'★'.repeat(r.yildiz)}${'☆'.repeat(5 - r.yildiz)}<div class="muted">${esc(r.metin)}</div></div>`).join('') || '<div class="small muted">Henüz yorum yok.</div>'}</div><div class="card"><h3>Haberler</h3>${S!.log.slice(0, 5).map((l) => `<div class="small muted">• ${esc(l)}</div>`).join('') || '<div class="small muted">—</div>'}</div>`;
}
function pHarita(): string {
  const c = cityById(MAPSEL), mine = S!.subeler.filter((x) => x.city === c.id), rv = S!.rakipler[c.id] ?? [], lv = levelOf(S!);
  return `<div class="chiprow" style="margin-bottom:6px">${METRICS.map(([m, n]) => `<button class="cx ${MAPM === m ? 'on' : ''}" data-a="metric" data-m="${m}">${n}</button>`).join('')}</div><div class="mapbox">${mapSvg(S, MAPM, MAPSEL)}</div><div class="tiny muted" style="margin:3px 2px 8px">☕ = şubelerin · ${S!.subeler.length} şube, ${new Set(S!.subeler.map((x) => x.city)).size} şehir</div>
  <div class="card"><h3>${esc(c.ad)} <span class="muted small">${REGION_NAME[c.region]}</span></h3>${cityFacts(c)}<div class="row small"><span>Açık şubelerin</span><b>${mine.length}</b></div><div class="row small"><span>Rakip kafe</span><b>${rv.length ? rv.length + ' (' + rv.map((r) => r.ad).join(', ') + ')' : 'bilinmiyor'}</b></div></div>
  <div class="eyebrow">Yeni dükkân fırsatları</div>${SHOP_TYPES.map((t) => { const why = t.uygun(c), cost = setupCost(S!, c, t.id), seviye = t.seviye > lv; return `<div class="card"><div class="row"><b>${t.ikon} ${t.ad}</b><span class="small">${fmt(cost)}</span></div><div class="tiny muted">${t.m2} m² · kira ${fmt(rentOf(S!, c, t.id))}/ay · günlük ~${Math.round(t.potansiyel * 1.75)} potansiyel · rekabet %${Math.round(t.rekabet * 100)}</div>${why || seviye ? `<div class="tiny badc">🔒 ${why ?? 'Kafe seviyesi ' + t.seviye + ' gerekir'}</div>` : `<button class="btn sm pri" data-a="sube" data-city="${c.id}" data-tip="${t.id}">Şube aç</button>`}</div>`; }).join('')}`;
}
function pSubeler(): string {
  const b = cur(), c = cityById(b.city), [o, k] = openHours(b), h = b.gecmis.slice(-14);
  const chart = h.length ? `<svg viewBox="0 0 280 70" width="100%"><line x1="0" x2="280" y1="35" y2="35" stroke="rgba(255,255,255,.2)"/>${(() => { const mx = Math.max(1, ...h.map((x) => Math.abs(x.kar))); return h.map((x, i) => `<rect x="${6 + i * 19}" y="${x.kar >= 0 ? 35 - Math.abs(x.kar) / mx * 32 : 35}" width="14" height="${Math.max(1, Math.abs(x.kar) / mx * 32)}" rx="2" fill="${x.kar >= 0 ? '#5fc08a' : '#e8665f'}"/>`).join(''); })()}</svg>` : '<div class="small muted">Henüz veri yok.</div>';
  return `<div class="chiprow" style="margin-bottom:8px">${S!.subeler.map((x) => `<button class="cx ${x.id === b.id ? 'on' : ''}" data-a="bsel" data-id="${x.id}">${esc(cityById(x.city).ad)}${S!.subeler.filter((y) => y.city === x.city).length > 1 ? ' ' + x.id : ''}</button>`).join('')}</div>
  <div class="card"><h3>${SHOP[b.tip].ikon} ${esc(b.ad)}</h3><div class="row small"><span>Şehir</span><b>${esc(c.ad)}</b></div><div class="row small"><span>Tür · alan</span><b>${SHOP[b.tip].ad} · ${b.m2} m²</b></div><div class="row small"><span>Çalışma saatleri</span><b>${o}:00–${k === 24 ? '00' : k}:00</b></div><div class="row small"><span>Kira</span><b>${fmt(b.kira)}/ay</b></div><div class="row small"><span>Açılış</span><b>${b.acilis} . gün</b></div><div class="row small"><span>Personel</span><b>${b.staff.length}/${staffLimit(b)}</b></div>
  <div class="grid2" style="margin-top:6px"><div class="card" style="margin:0"><div class="tiny muted">Bugün müşteri</div><b>${b.bugun.musteri}</b></div><div class="card" style="margin:0"><div class="tiny muted">Bugün gelir</div><b>${fmt(sum(b.bugun.gelir))}</b></div></div></div>
  <div class="card"><h3>Hizmet kalitesi</h3><div class="row small"><span>Memnuniyet</span><b>${Math.round(b.memnuniyet)}</b></div>${bar(b.memnuniyet, 'var(--ok)')}<div class="row small"><span>Sadakat</span><b>${Math.round(b.sadakat)}</b></div>${bar(b.sadakat, 'var(--bl)')}<div class="row small"><span>İş birikimi (kuyruk)</span><b>${Math.round(b.backlog)} sn</b></div>${bar(Math.min(100, b.backlog / 6))}<div class="row small"><span>Hijyen</span><b>${Math.round(b.hijyen)}</b></div>${bar(b.hijyen, 'var(--ok)')}</div>
  <div class="card"><h3>Günlük kâr (14 gün)</h3>${chart}</div><div class="chiprow"><button class="btn sm ${b.acik ? '' : 'bad'}" data-a="acik">${b.acik ? '⏸ Şubeyi geçici kapat' : '▶ Şubeyi aç'}</button>${S!.subeler.length > 1 ? `<button class="btn sm bad" data-a="kapat" data-id="${b.id}">Şubeyi kalıcı kapat</button>` : ''}</div>`;
}
function statBar(l: string, v: number): string { return `<div class="small muted">${l} <b style="color:var(--tx)">${Math.round(v)}</b></div>${bar(v)}`; }
function pPersonel(): string {
  const b = cur(), lv = levelOf(S!);
  const list = b.staff.map((e) => `<div class="card"><div class="row"><b>${STAFF_TYPE[e.tip].ikon} ${esc(e.ad)}</b><span class="pill">${STAFF_TYPE[e.tip].ad}</span></div><div class="row small"><span>Maaş</span><b>${fmt(e.maas)}/ay</b></div><div class="row small"><span>Tecrübe</span><b>${e.tecrube} yıl</b></div><div class="grid2"><div>${statBar('Hız', e.hiz / 1.6 * 100)}</div><div>${statBar('Müşteri ilişkisi', e.iliski)}</div><div>${statBar('Motivasyon', e.motivasyon)}</div><div>${statBar('Performans', e.performans)}</div></div><div class="chiprow"><button class="btn sm" data-a="raise" data-id="${e.id}">Zam %10</button><button class="btn sm bad" data-a="fire" data-id="${e.id}">İşten çıkar</button></div></div>`).join('');
  return `<div class="card"><h3>👥 ${esc(b.ad)} · ${b.staff.length}/${staffLimit(b)}</h3><div class="small muted">Personel maaşı günlük giderlere eklenir. Motivasyonu çok düşen çalışan işi bırakır.</div></div>${list}<div class="eyebrow">Yeni personel al</div><div class="chiprow">${STAFF_TYPES.map((t) => `<button class="cx ${t.seviye > lv ? '' : ''}" data-a="cand" data-tip="${t.id}">${t.ikon} ${t.ad}${t.seviye > lv ? ' 🔒' : ''}</button>`).join('')}</div>${cand.length ? `<div class="tiny muted" style="margin:6px 0">${STAFF_TYPE[candTip].ac}</div>` + cand.map((e, i) => `<div class="card"><div class="row"><b>${esc(e.ad)}</b><b>${fmt(e.maas)}/ay</b></div><div class="tiny muted">Tecrübe ${e.tecrube} yıl · hız ${e.hiz.toFixed(2).replace('.', ',')} · ilişki ${e.iliski}</div><button class="btn sm pri" data-a="hire" data-i="${i}">İşe al (işe alım bedeli ${fmt(e.maas * 0.3)})</button></div>`).join('') : '<div class="small muted" style="margin-top:6px">Bir pozisyon seç; 3 aday çıkar.</div>'}`;
}
function pMenu(): string {
  const b = cur(), c = cityById(b.city), lv = levelOf(S!);
  return `<div class="card small muted">Fiyatı artırırsan kâr artar ama müşteri talebi düşer. 1,00× pazar fiyatıdır. Stoku biten ürün otomatik satıştan kalkar.</div>` + ['kahve', 'yiyecek'].map((k) => `<div class="eyebrow">${k === 'kahve' ? 'Kahveler' : 'Yiyecekler'}</div><div class="card">${PRODUCTS.filter((p) => p.kat === k).map((p) => {
    const m = b.menu[p.id], pr = sellPrice(S!, b, p.id), cost = unitCost(S!, p.id, c), mar = (pr - cost) / pr * 100, kilit = lv < p.seviye;
    return `<div class="item" style="${kilit ? 'opacity:.5' : ''}"><div class="ik">${p.ikon}</div><div class="nm"><b>${p.ad}${m.aktif ? '' : ' <span class="tiny muted">(kapalı)</span>'}</b><div class="tiny muted">Maliyet ${Math.round(cost)} ₺ · marj %${Math.round(mar)} · hazırlama ${p.sure} sn · ${'★'.repeat(m.kalite)}</div><div class="tiny">${kilit ? '🔒 Kafe seviyesi ' + p.seviye : `<button class="cx" data-a="urun" data-id="${p.id}" style="padding:3px 9px">${m.aktif ? 'Menüden çıkar' : 'Menüye ekle' + (p.kurulum ? ' · ' + fmt(p.kurulum) : '')}</button> ${m.kalite < 3 ? `<button class="cx" data-a="kalite" data-id="${p.id}" style="padding:3px 9px">Kalite ↑</button>` : ''}`}</div></div>${kilit ? '' : `<div class="stp"><button data-a="fiyat" data-id="${p.id}" data-d="-1">−</button><span>${pr} ₺<div class="tiny muted">${m.fiyat.toFixed(2).replace('.', ',')}×</div></span><button data-a="fiyat" data-id="${p.id}" data-d="1">+</button></div>`}</div>`;
  }).join('')}</div>`).join('');
}
function pSatin(): string {
  const b = cur(), c = cityById(b.city);
  return `<div class="card small muted">Tedarik fiyatları ekonomiye göre değişir (kahve çekirdeği şu an ${S!.market.bean.toFixed(2).replace('.', ',')}×). Sipariş teslimat süresiyle gelir.</div><div class="card">${INGREDIENTS.map((i) => { const pr = ingPrice(S!, i.id, c), gel = b.siparisler.filter((o) => o.ing === i.id); return `<div class="item"><div class="ik">${i.ikon}</div><div class="nm"><b>${i.ad}</b><div class="tiny muted">${i.paketAd} · ${fmt(pr)} · teslimat ${i.teslim} gün${gel.length ? ' · yolda: ' + gel.reduce((a, o) => a + o.paket, 0) + ' paket' : ''}</div></div><div class="chiprow"><button class="cx" data-a="siparis" data-id="${i.id}" data-n="1">+1</button><button class="cx" data-a="siparis" data-id="${i.id}" data-n="5">+5</button></div></div>`; }).join('')}</div>`;
}
function pStok(): string {
  const b = cur();
  return `<div class="card"><div class="row"><span>Otomatik sipariş</span><button class="btn sm ${b.otoSiparis ? 'on' : ''}" data-a="oto">${b.otoSiparis ? 'Açık' : 'Kapalı'}</button></div><div class="tiny muted">Tüketime göre stok azalınca sipariş verir.</div></div><div class="card">${INGREDIENTS.map((i) => { const v = b.stok[i.id] ?? 0, kul = b.kullanim[i.id] ?? 0, gun = kul > 0 ? v / kul : 99, pc = Math.min(100, gun / 6 * 100); return `<div class="item"><div class="ik">${i.ikon}</div><div class="nm"><b>${i.ad}</b><div class="tiny muted">${Math.round(v).toLocaleString('tr-TR')} ${i.birim} · ${gun >= 99 ? '—' : gun.toFixed(1).replace('.', ',') + ' gün yeter'}</div>${bar(pc, gun < 1.5 ? 'var(--bad)' : gun < 3 ? 'var(--am)' : 'var(--ok)')}</div></div>`; }).join('')}</div>`;
}
function pFinans(): string {
  const r = S!.rapor, g = r[r.length - 1], hf = r.slice(-7), ay = r.slice(-30), top = (a: typeof r) => ({ gelir: a.reduce((x, y) => x + y.toplamGelir, 0), gider: a.reduce((x, y) => x + y.toplamGider, 0) });
  const w = top(hf), mo = top(ay), ch = r.slice(-14);
  const chart = ch.length ? `<svg viewBox="0 0 300 90" width="100%"><line x1="0" x2="300" y1="45" y2="45" stroke="rgba(255,255,255,.2)"/>${(() => { const mx = Math.max(1, ...ch.map((x) => Math.abs(x.kar))); return ch.map((x, i) => `<rect x="${8 + i * 20.5}" y="${x.kar >= 0 ? 45 - Math.abs(x.kar) / mx * 40 : 45}" width="15" height="${Math.max(1, Math.abs(x.kar) / mx * 40)}" rx="2" fill="${x.kar >= 0 ? '#5fc08a' : '#e8665f'}"/>`).join(''); })()}</svg>` : '<div class="small muted">Birkaç gün sonra grafik dolacak.</div>';
  const kal = (name: string, o: Record<string, number>, tr: Record<string, string>) => Object.keys(tr).filter((k) => (o[k] ?? 0) > 0.5).map((k) => `<div class="row small"><span>${tr[k]}</span><b>${fmt(o[k] ?? 0)}</b></div>`).join('') || `<div class="small muted">${name}: —</div>`;
  const sumRep = (a: typeof r, key: 'gelir' | 'gider') => { const o: Record<string, number> = {}; for (const x of a) for (const k of Object.keys(x[key])) o[k] = (o[k] ?? 0) + (x[key] as unknown as Record<string, number>)[k]!; return o; };
  return `<div class="card"><h3>💰 Kasa ${fmt(S!.kasa)}</h3><div class="grid2"><div><div class="tiny muted">Dün</div><b class="${(g?.kar ?? 0) >= 0 ? 'good' : 'badc'}">${fmt(g?.kar ?? 0)}</b></div><div><div class="tiny muted">Son 7 gün</div><b class="${w.gelir - w.gider >= 0 ? 'good' : 'badc'}">${fmt(w.gelir - w.gider)}</b></div><div><div class="tiny muted">Son 30 gün</div><b class="${mo.gelir - mo.gider >= 0 ? 'good' : 'badc'}">${fmt(mo.gelir - mo.gider)}</b></div><div><div class="tiny muted">Borç</div><b>${fmt(S!.borc)}</b></div></div></div><div class="card"><h3>Günlük kâr (14 gün)</h3>${chart}</div>
  <div class="card"><h3>Gelirler (30 gün)</h3>${kal('Gelir', sumRep(ay, 'gelir'), { kahve: 'Kahve satışları', yiyecek: 'Yiyecek satışları', paket: 'Paket servis', toplu: 'Toplu sipariş', etkinlik: 'Etkinlik', franchise: 'Franchise' })}</div><div class="card"><h3>Giderler (30 gün)</h3>${kal('Gider', sumRep(ay, 'gider'), { kira: 'Kira', elektrik: 'Elektrik', su: 'Su', maas: 'Personel maaşları', malzeme: 'Malzeme', vergi: 'Vergiler', bakim: 'Bakım', reklam: 'Reklam', sigorta: 'Sigorta' })}</div>
  <div class="card"><h3>🏦 Kredi</h3><div class="row small"><span>Borç</span><b>${fmt(S!.borc)}</b></div><div class="chiprow"><button class="cx" data-a="kredi" data-n="250000">+250 B ₺</button><button class="cx" data-a="kredi" data-n="1000000">+1 M ₺</button>${S!.borc > 0 ? `<button class="cx" data-a="ode" data-n="250000">250 B öde</button><button class="cx" data-a="ode" data-n="${Math.ceil(S!.borc)}">Hepsini öde</button>` : ''}</div></div>`;
}
function pReklam(): string {
  const b = cur(), now = dayOf(S!), lv = levelOf(S!);
  return `<div class="card small muted">Reklamlar tüm müşteri trafiğini etkiler ama başarı garantisi yoktur; bazı kampanyalar beklenen ilgiyi görmez.</div>${ADS.map((a) => { const act = b.reklam.find((x) => x.id === a.id && x.bit > now); return `<div class="card"><div class="row"><b>${a.ikon} ${a.ad}</b><span class="small">${fmt(adCost(S!, b, a.id))}</span></div><div class="tiny muted">${a.ac} · +%${Math.round(a.trafik * 100)} trafik · ${a.gun} gün · risk %${Math.round(a.risk * 100)}</div>${a.seviye > lv ? `<div class="tiny badc">🔒 Kafe seviyesi ${a.seviye}</div>` : act ? `<div class="small good">▶ Sürüyor · ${act.bit - now} gün kaldı${act.tuttu ? '' : ' (tutmadı)'}</div>` : `<button class="btn sm pri" data-a="ad" data-id="${a.id}">Başlat</button>`}</div>`; }).join('')}`;
}
function pRakip(): string {
  const b = cur(), c = cityById(b.city), rv = S!.rakipler[c.id] ?? [], my = (Object.values(b.menu).reduce((a, m) => a + m.fiyat, 0) / PRODUCTS.length);
  return `<div class="card"><h3>🥊 ${esc(c.ad)} kafe pazarı</h3><div class="row small"><span>Rekabet seviyesi</span><b>%${Math.round(c.rekabet * 100)}</b></div>${bar(c.rekabet * 100, 'var(--bad)')}<div class="row small"><span>Senin fiyat seviyen</span><b>${my.toFixed(2).replace('.', ',')}×</b></div></div>${rv.map((r) => `<div class="card"><div class="row"><b>☕ ${esc(r.ad)}</b><span class="pill">${r.sube} şube</span></div><div class="row small"><span>Fiyat seviyesi</span><b class="${r.fiyat < my ? 'badc' : 'good'}">${r.fiyat.toFixed(2).replace('.', ',')}×</b></div><div class="row small"><span>Ürün çeşidi · çalışan</span><b>${r.cesit} · ${r.calisan}</b></div><div class="row small"><span>Kalite</span><b>${'★'.repeat(r.kalite)}</b></div><div class="small muted">Reklam yoğunluğu</div>${bar(Math.min(100, r.reklam * 80), 'var(--bl)')}</div>`).join('') || '<div class="card small muted">Bu şehirde henüz bir şubenin yok; rakipleri tanımak için şube aç.</div>'}`;
}
function pGelis(): string {
  const b = cur(), lv = levelOf(S!), pips = (n: number, m: number) => '●'.repeat(n) + '○'.repeat(m - n);
  return `<div class="card small muted">Her geliştirme dükkânın dış görünüşüne gerçekten yansır; sol taraftaki 3B görünümde izleyebilirsin.</div>${UPGRADES.map((u) => { const l = b.facade[u.id], son = l >= u.max, c = upgradeCost(S!, b, u.id); return `<div class="card" style="display:flex;gap:10px;align-items:center"><div style="font-size:26px">${u.ikon}</div><div style="flex:1;min-width:0"><b>${u.ad}</b> <span class="tiny muted">${pips(l, u.max)}</span><div class="tiny muted">${u.ac}</div></div>${son ? '<span class="pill">✓</span>' : u.seviye > lv ? `<span class="tiny badc">🔒 Sv ${u.seviye}</span>` : `<button class="btn sm pri" data-a="gel" data-id="${u.id}">${fmt(c)}</button>`}</div>`; }).join('')}`;
}
function pFranchise(): string { return `<div class="card"><h3>🤝 Franchise</h3><div class="small">Bu özellik <b>henüz geliştirilmedi</b>. Planlanan: başka yatırımcıların markanla şube açması, giriş bedeli ve düzenli marka kullanım geliri. Kafe seviyesi 5'te açılacak.</div></div>`; }
function pSirket(): string {
  const lv = levelOf(S!), L = LEVELS[lv - 1]!, nx = LEVELS[lv];
  return `<div class="card"><h3>🏢 ${esc(S!.marka.ad)}</h3><div class="row small"><span>Seviye</span><b>${lv} · ${L.ad}</b></div>${nx ? `<div class="tiny muted">Sonraki: ${nx.ad} — ${nx.sube} şube ve marka ${nx.marka} gerekir. ${nx.ac}</div>` : ''}<div class="row small"><span>Marka puanı</span><b>${Math.round(S!.marka_puani)}</b></div>${bar(S!.marka_puani, 'var(--bl)')}<div class="row small"><span>Şube</span><b>${S!.subeler.length}</b></div><div class="row small"><span>Şehir</span><b>${new Set(S!.subeler.map((x) => x.city)).size}</b></div><div class="row small"><span>Oyun süresi</span><b>${dayOf(S!)} gün</b></div></div>
  <div class="card"><h3>Seviyeler</h3>${LEVELS.map((l) => `<div class="row small" style="${l.n <= lv ? '' : 'opacity:.5'}"><span>${l.n <= lv ? '✅' : '🔒'} ${l.n}. ${l.ad}</span><span class="tiny muted">${l.sube}+ şube · marka ${l.marka}</span></div>`).join('')}</div><div class="chiprow"><button class="btn" data-a="kaydet">💾 Kaydet</button><button class="btn" data-a="cikis">Ana menü</button><button class="btn bad" data-a="sil">Oyunu sil</button></div>`;
}
export function boot(): void { void hourOf; void refPrice; void PRODUCT; void AD; void CITIES; title(); (window as unknown as Record<string, unknown>).__app = { get S() { return S; }, get view() { return view; } }; }
