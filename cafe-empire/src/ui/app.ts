import './style.css';
import { CafeView, type CamPreset } from '../render3d/view';
import { cityById, CITIES } from '../data/turkey';
import { ilDurum } from '../core/region';
import { SHOP, SHOP_TYPES, LEVELS, type ShopTypeId } from '../data/catalog';
import { newGame, fmt, setupCost, rentOf, type Result } from '../core/actions';
import { step, dateText, timeText, dayOf, levelOf, resolveEvent } from '../core/sim';
import { oyunDakikasi } from '../core/pace';
import { save, load, wipe } from '../core/save';
import { regionMap, zoomVb, NAT_VB, type VB } from './map';
import { ILCELER, ilcelerOf, ilceKey, profilOf } from '../data/regions';
import type { GameState } from '../core/types';
import { startAudio, setAudio, sfx, stopAudio } from './audio';
import { BASARIM } from '../core/goals';
import { ctx, cur, esc as _esc, NAV, GRUPLAR, grupOf, PANELS, LIVE_TABS, handle } from './panels';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector(sel) as T;
const esc = _esc;
const root = document.getElementById('app') as HTMLElement;
let S: GameState | null = null, view: CafeView | null = null, TAB = 'genel', PANEL_OPEN = false;
let lastDay = -1, lastSumDay = -1, lastAch = new Set<string>();
let known = new Set<number>(), newOpp = false, oppT = 0;
let accMin = 0, uiT = 0, saveT = 0, modalOpen = false;
const bar = (v: number, col = 'var(--am)') => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, v))}%;background:${col}"></i></div>`;
function toast(m: string): void { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; root.appendChild(t); setTimeout(() => t.remove(), 2400); }

/* ===================== Başlangıç ekranları ===================== */
function title(): void {
  const has = load(); root.innerHTML = `<div class="screen"><div class="title"><div style="font-size:64px">☕</div><h1>CAFE EMPIRE</h1><p>Türkiye · kafe işletme ve zincir simülasyonu</p>${has ? `<button class="btn pri" id="devam">Devam et<br><small>${esc(has.marka.ad)} · ${dateText(has)} · ${has.subeler.length} şube</small></button>` : ''}<button class="btn ${has ? '' : 'pri'}" id="yeni">Yeni oyun</button><p class="tiny muted" style="margin-top:14px">Telefonu yatay tutmanız önerilir. Kurgusal bir simülasyondur.</p></div></div>`;
  $('#yeni').onclick = setup; if (has) $('#devam').onclick = () => { S = has; enter(); };
}
function setup(): void {
  let ad = 'Fincan Kahve', renk = '#c4722a', renk2 = '#2d1f14', logo = 0, ilceId = ilcelerOf(34).find((d) => d.ad === 'Kadıköy')!.id, tip: ShopTypeId = 'mahalle', first = true; const renkler: Array<[string, string]> = [['#c4722a', '#2d1f14'], ['#2e86c1', '#1b2a38'], ['#27ae60', '#1d3a2b'], ['#c0392b', '#3a1d1d'], ['#8e44ad', '#2d1d3a'], ['#d4a017', '#2a2415']];
  const fake = { bolge: { il: { 34: 0 }, ilce: {} }, market: { fiyat: 1 }, subeler: [], rakipler: {} } as unknown as GameState; ctx.vb = NAT_VB; ctx.fx = [];
  const draw = (): void => {
    const inp = document.getElementById('ad') as HTMLInputElement | null; if (inp) ad = inp.value || ad;
    const c = cityById(34), d = ILCELER[ilceId]!, pf = profilOf(d), probs = SHOP_TYPES.map((t) => { const why = t.uygun(c); return { t, why, cost: Math.round(setupCost(fake, c, t.id) * (0.85 + 0.15 * pf.kira) / 1000) * 1000 }; });
    root.innerHTML = `<div class="screen"><div class="setup"><div><h2 style="font-family:var(--fd);margin:0 0 8px">1 · Markan</h2><div class="card"><div class="small muted">Kafe / şirket adı</div><input id="ad" maxlength="22" value="${esc(ad)}" style="width:100%;margin-top:5px;background:var(--p2);border:1px solid var(--line);border-radius:10px;padding:10px;font-size:16px"><div class="small muted" style="margin-top:8px">Marka renkleri</div><div class="colors">${renkler.map((r, i) => `<i data-r="${i}" class="${r[0] === renk ? 'on' : ''}" style="background:${r[0]}"></i>`).join('')}</div><div class="small muted">Logo</div><div class="chiprow">${['☕', '🥐', '🌿', '⭐', '🔥', '🫘'].map((l, i) => `<button class="cx ${i === logo ? 'on' : ''}" data-l="${i}">${l}</button>`).join('')}</div></div>
      <h2 style="font-family:var(--fd);margin:12px 0 8px">3 · Dükkân türü <span class="muted small">${esc(d.ad)}</span></h2>${probs.map((p) => `<button class="shopopt ${p.t.id === tip ? 'on' : ''} ${p.why || p.t.seviye > 1 ? 'dis' : ''}" data-t="${p.t.id}"><b>${p.t.ikon} ${p.t.ad}</b> <span class="small muted">· ${p.t.m2} m² · kira ${fmt(Math.round(rentOf(fake, c, p.t.id) * pf.kira / 500) * 500)}/ay</span><div class="tiny muted">${p.why ? '🔒 ' + p.why : p.t.seviye > 1 ? '🔒 Kafe seviyesi ' + p.t.seviye + ' gerekir' : p.t.ac + ' · Kurulum ' + fmt(p.cost)}</div></button>`).join('')}<button class="btn pri" id="basla" style="width:100%;min-height:48px">Kafeyi aç ☕</button><button class="btn" id="geri" style="width:100%;margin-top:6px">Geri</button></div>
      <div><h2 style="font-family:var(--fd);margin:0 0 8px">2 · Başlangıç ilçesi <span class="muted small">(İstanbul)</span></h2><div class="card small muted">Türkiye'ye <b>İstanbul'dan</b> başlıyorsun. Diğer il ve ilçeleri oyun içinde parayla ve zamanla açacaksın. Haritada bir ilçeye dokun.</div><div class="mapbox zoomed">${regionMap(fake, { metric: 'talep', sel: 34, zoomIl: 34, selIlce: ilceId, vb: ctx.vb, fx: [], now: 0, lv: 1, start: true })}</div><div class="card" style="margin-top:8px"><h3>${esc(d.ad)}</h3>${pf.etiket ? `<div class="tiny muted">${esc(pf.etiket)}</div>` : ''}<div class="small muted">Kafe talebi ${pf.talep.toFixed(2).replace('.', ',')}×</div>${bar(Math.min(100, pf.talep / 2 * 100))}<div class="small muted">Gelir düzeyi ${pf.gelir.toFixed(2).replace('.', ',')}×</div>${bar(Math.min(100, pf.gelir / 1.5 * 100), 'var(--ok)')}<div class="small muted">Kira ${pf.kira.toFixed(2).replace('.', ',')}×</div>${bar(Math.min(100, pf.kira / 1.6 * 100), 'var(--bad)')}<div class="tiny muted">Yoğun ve zengin ilçe daha çok müşteri getirir ama kira ve rekabet de yüksektir. Sakin ilçede daha ucuza başlarsın.</div></div></div></div></div>`;
    root.querySelectorAll<SVGElement>('path[data-ilce]').forEach((p) => { p.onclick = () => { ilceId = +p.dataset.ilce!; draw(); }; });
    root.querySelectorAll<HTMLElement>('[data-r]').forEach((e) => { e.onclick = () => { const r = renkler[+e.dataset.r!]!; renk = r[0]; renk2 = r[1]; draw(); }; });
    root.querySelectorAll<HTMLElement>('[data-l]').forEach((e) => { e.onclick = () => { logo = +e.dataset.l!; draw(); }; });
    root.querySelectorAll<HTMLElement>('[data-t]').forEach((e) => { e.onclick = () => { const t = SHOP[e.dataset.t as ShopTypeId]; if (!t.uygun(c) && t.seviye <= 1) tip = t.id; draw(); }; });
    $('#geri').onclick = title; $('#basla').onclick = () => { ad = ($('#ad') as HTMLInputElement).value || ad; const g = newGame({ ad, renk, renk2, logo, sehir: 34, tip, ilce: ilceKey(d) }); if (!g.r.ok) return toast(g.r.m); S = g.s; wipe(); enter(); toast('Kafen açıldı! İyi şanslar.'); };
    if (first) { first = false; zoomTo(zoomVb(34), () => { if (document.getElementById('basla')) draw(); }, 900); }
  };
  draw();
}
let zoomRaf = 0;
function zoomTo(vb: VB, done?: () => void, ms = 650): void {
  cancelAnimationFrame(zoomRaf); const from = [...ctx.vb] as VB, t0 = performance.now(), ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const tick = (now: number): void => { const k = Math.min(1, (now - t0) / ms), e = ease(k); ctx.vb = from.map((v, i) => v + (vb[i]! - v) * e) as VB; document.getElementById('mapsvg')?.setAttribute('viewBox', ctx.vb.map((v) => v.toFixed(2)).join(' ')); if (k < 1) zoomRaf = requestAnimationFrame(tick); else { ctx.vb = vb; done?.(); } };
  zoomRaf = requestAnimationFrame(tick);
}
function cityFacts(c: ReturnType<typeof cityById>): string {
  const lv = (v: number) => bar(v * 100); return `<div class="row small"><span>Nüfus</span><b>${(c.nufus / 1000).toFixed(2).replace('.', ',')} M</b></div><div class="row small"><span>Gelir seviyesi</span><b>${c.gelir.toFixed(2).replace('.', ',')}×</b></div><div class="row small"><span>Kira endeksi</span><b>${c.kira.toFixed(2).replace('.', ',')}×</b></div><div class="small muted">Turizm</div>${lv(c.turizm)}<div class="small muted">Öğrenci</div>${lv(c.ogrenci)}<div class="small muted">Rekabet</div>${lv(c.rekabet)}<div class="tiny muted">Müşteri profili: öğrenci %${Math.round(c.profil.ogr * 100)} · çalışan %${Math.round(c.profil.cal * 100)} · turist %${Math.round(c.profil.tur * 100)} · aile %${Math.round(c.profil.aile * 100)} · emekli %${Math.round(c.profil.emk * 100)}</div>`;
}

/* ===================== Oyun ekranı ===================== */
function enter(): void {
  if (!S) return; cancelAnimationFrame(zoomRaf); ctx.S = S; ctx.bid = S.subeler[0]!.id; TAB = 'genel'; ctx.zoomIl = null; ctx.selIlce = null; ctx.vb = NAT_VB; ctx.fx = []; ctx.mapsel = 34; ctx.mapm = 'erisim'; known = new Set(); newOpp = false;
  root.innerHTML = `<div id="v3d" style="position:absolute;inset:0"></div><div class="top"><b class="brand" id="tBrand"></b><span class="chip" id="tDate"></span><span class="chip">💰 <b id="tKasa"></b></span><span class="chip">⭐ <b id="tMarka"></b></span><span class="chip">🏅 <b id="tSev"></b></span><span class="sp"></span><button class="btn sm" id="tHelp" title="Rehber">?</button><span class="chip" id="tHava"></span><div class="spd" id="spd"></div></div><div class="nav" id="nav"></div><div class="cam" id="cam"></div><div class="hud" id="hud"></div><div class="bsel" id="bsel"></div><div class="panel hid" id="panel"></div><div class="fps" id="fps"></div>`;
  setAudio({ ses: S.ayar.ses, muzik: S.ayar.muzik, vol: S.ayar.ses_vol }); root.onpointerdown = () => startAudio(); lastSumDay = dayOf(S); lastAch = new Set(Object.keys(S.basarim)); $('#tHelp').onclick = () => { S!.tur = 0; tour(); };
  view?.destroy(); view = new CafeView($('#v3d')); view.show(S, cur()); S.hiz = 1; nav(); camBar(); spdBar(); hud(); panel(false); window.addEventListener('resize', layout);
  view.frameHook = (dt) => loop(dt); tour();
  document.addEventListener('visibilitychange', () => { if (document.hidden && S) { save(S); } });
}
function layout(): void {
  const el = document.getElementById('v3d'); if (!el || !view) return; const land = innerWidth >= innerHeight, navW = 62 + 0, wide = PANEL_OPEN && TAB === 'harita' && ctx.mapWide, pw = PANEL_OPEN ? (wide ? innerWidth - 62 - 40 : Math.min(innerWidth * 0.48, 440)) : 0;
  if (land) { el.style.left = navW + 'px'; el.style.right = pw + 'px'; el.style.top = '0'; el.style.bottom = '0'; } else { el.style.left = '0'; el.style.right = '0'; el.style.top = '0'; el.style.bottom = (PANEL_OPEN ? '58%' : '58px'); }
  view.resize(); const p = document.getElementById('panel'); if (p) p.style.width = land ? (pw ? pw + 'px' : '') : '';
}
const sonSekme: Record<string, string> = {};
function ipucu(): void {
  document.querySelectorAll('.hint').forEach((e) => e.classList.remove('hint')); if (!S || S.tur < 0) return; const st = TUR[S.tur]; if (!st?.n) return; const g = grupOf(st.n);
  document.querySelector(`.nav [data-g="${g.id}"]`)?.classList.add('hint'); if (grupOf(TAB).id === g.id) document.querySelector(`.subtabs [data-n="${st.n}"]`)?.classList.add('hint');
}
function sekmeAc(tab: string, ac = true): void { TAB = tab; sonSekme[grupOf(tab).id] = tab; if (ac) PANEL_OPEN = true; ctx.anim = true; sfx.tick(); if (tab === 'harita') newOpp = false; nav(); panel(false); tourEvent('tab', tab); }
function nav(): void {
  const gt = grupOf(TAB).id;
  $('#nav').innerHTML = GRUPLAR.map((g) => `<button data-g="${g.id}" class="${gt === g.id && PANEL_OPEN ? 'on' : ''}"><i>${g.ik}</i>${g.ad}${g.id === 'buyume' && newOpp && TAB !== 'harita' ? '<span class="dot"></span>' : ''}</button>`).join('');
  $('#nav').querySelectorAll<HTMLElement>('[data-g]').forEach((b) => { b.onclick = () => { const g = GRUPLAR.find((x) => x.id === b.dataset.g)!; if (gt === g.id && PANEL_OPEN && g.id !== 'ana') { PANEL_OPEN = false; nav(); panel(false); return; } sekmeAc(sonSekme[g.id] ?? g.tabs[0]!); }; });
  queueMicrotask(ipucu);
}
function camBar(): void { const P: Array<[CamPreset, string]> = [['cephe', 'Cephe'], ['sol', 'Sol açı'], ['sag', 'Sağ açı'], ['sokak', 'Sokak'], ['sehir', 'Şehir']]; $('#cam').innerHTML = P.map(([k, n]) => `<button data-c="${k}">${n}</button>`).join('') + '<button data-z="1">＋</button><button data-z="-1">－</button>'; $('#cam').querySelectorAll<HTMLElement>('button').forEach((b) => { b.onclick = () => { if (b.dataset.c) view?.setPreset(b.dataset.c as CamPreset); else view?.zoom(+b.dataset.z! > 0 ? 0.8 : 1.25); }; }); }
function spdBar(): void { const V: Array<[number, string]> = [[0, '⏸'], [1, '▶'], [2, '⏩'], [4, '⏭']]; $('#spd').innerHTML = V.map(([v, t]) => `<button data-s="${v}" class="${S!.hiz === v ? 'on' : ''}">${t}</button>`).join(''); $('#spd').querySelectorAll<HTMLElement>('button').forEach((b) => { b.onclick = () => { S!.hiz = +b.dataset.s!; spdBar(); }; }); }
function hud(): void {
  if (!S) return; const b = cur(), c = cityById(b.city), t = S.rapor[S.rapor.length - 1];
  $('#tBrand').textContent = S.marka.ad; $('#tDate').textContent = `${dateText(S)} · ${timeText(S)}`; $('#tKasa').textContent = fmt(S.kasa); $('#tMarka').textContent = String(Math.round(S.marka_puani)); $('#tSev').textContent = `${levelOf(S)} · ${LEVELS[levelOf(S) - 1]?.ad ?? ''}`;
  const hv = S.hava[b.city] ?? 'gunesli'; $('#tHava').textContent = `${{ gunesli: '☀️', bulutlu: '⛅', yagmur: '🌧️', kar: '❄️' }[hv]} ${c.ad}`;
  $('#hud').innerHTML = `<span class="chip">Memnuniyet <b>${Math.round(b.memnuniyet)}</b></span><span class="chip">Bugün <b>${b.bugun.musteri}</b> müşteri</span><span class="chip">Bugün <b>${fmt(Object.values(b.bugun.gelir).reduce((a, x) => a + x, 0))}</b></span><span class="chip">Kayıp <b>${b.bugun.kayip}</b></span>`;
  $('#bsel').innerHTML = S.subeler.length > 1 ? S.subeler.map((x) => `<button data-b="${x.id}" class="${x.id === ctx.bid ? 'on' : ''}">${esc(x.ad.length > 18 ? x.ad.slice(0, 17) + '…' : x.ad)}</button>`).join('') : ''; $('#bsel').querySelectorAll<HTMLElement>('[data-b]').forEach((e) => { e.onclick = () => { ctx.bid = +e.dataset.b!; view!.show(S!, cur()); hud(); panel(true); }; });
  const f = $('#fps'); if (f && view) f.textContent = ctx.fps ? `${view.fps} fps` : ""; void t;
}
function loop(dt: number): void {
  if (!S || !view) return; const dk = oyunDakikasi(dt, S.hiz, S.ayar.gunSn); accMin += dk; let n = 0;
  while (accMin >= 10 && n < 8) { accMin -= 10; const ev = step(S, 10); view.handleEvents(ev); if (ev.some((e) => e.t === 'musteri')) sfx.door(); if (ev.some((e) => e.t === 'olay')) sfx.warn(); n++; if (S.oyunBitti) break; }
  view.tick(dt, S); if (dayOf(S) !== lastSumDay) { lastSumDay = dayOf(S); gunOzeti(); } if (TAB === 'ekonomi' && PANEL_OPEN && dayOf(S) !== lastDay) { lastDay = dayOf(S); panel(true); } oppT += dt; if (oppT > 2) { oppT = 0; checkOpportunities(); } uiT += dt; saveT += dt; if (uiT > 0.5) { uiT = 0; hud(); if (LIVE_TABS.has(TAB) && PANEL_OPEN) panel(true); if (S.bekleyen.length && !modalOpen) showEvent(); if (S.oyunBitti) gameOver(); }
  if (saveT > 15) { saveT = 0; save(S); }
}
/** Seviye/komşuluk şartı sağlanan yeni pazarları bildirir (zamanla gelişen harita). */
function checkOpportunities(): void {
  if (!S) return; const yeniB = Object.keys(S.basarim).filter((k) => !lastAch.has(k)); if (yeniB.length) { lastAch = new Set(Object.keys(S.basarim)); sfx.ach(); toast(`🏆 Başarım: ${yeniB.map((k) => BASARIM[k]?.ad ?? k).join(', ')}`); if (TAB === 'hedefler' && PANEL_OPEN) panel(true); } const lv = levelOf(S), now = new Set(CITIES.filter((c) => ilDurum(S!, c.id, lv).d === 'satilik').map((c) => c.id));
  if (known.size === 0 && S.subeler.length && dayOf(S) < 2) { known = now; return; }
  const yeni = [...now].filter((id) => !known.has(id)); known = now;
  if (yeni.length) { newOpp = true; nav(); toast(yeni.length > 8 ? `🇹🇷 Ulusal zincir oldun: ${yeni.length} ilin pazarı artık açılabilir!` : `🗺️ Yeni pazar fırsatı: ${yeni.slice(0, 3).map((id) => cityById(id).ad).join(', ')}${yeni.length > 3 ? ' +' + (yeni.length - 3) : ''}`); }
}
/* ===================== Günlük özet ===================== */
function gunOzeti(): void {
  if (!S || S.ayar.ozet === 'kapali' || !S.rapor.length || modalOpen) return; const d = dayOf(S); if (S.ayar.ozet === 'hafta' && d % 7 !== 0) return; if (S.ayar.ozet === 'her' && S.hiz >= 4) return;
  const r = S.rapor[S.rapor.length - 1]!, p = S.rapor[S.rapor.length - 2], b = cur(), top = Object.entries(b.sonAdet).sort((a, z) => (z[1] ?? 0) - (a[1] ?? 0))[0], dg = p ? r.kar - p.kar : 0;
  const tips: string[] = []; if (r.kar < 0) tips.push('Zarar ettin: Ekonomi Merkezi\'nde gider dağılımına ve fiyat eğrisine bak.'); if (r.musteri && r.kayip / (r.musteri + r.kayip) > 0.3) tips.push(`Müşterilerin %${Math.round(r.kayip / (r.musteri + r.kayip) * 100)}'ini kaybettin: stok, vardiya boşluğu ya da kuyruk olabilir.`);
  if (S.kasa < 150000) tips.push('Nakit azaldı: harcamaları ve siparişleri gözden geçir.'); if (!tips.length) tips.push(r.kar > 0 ? 'Gidiş iyi. Kasada birikeni yeni ilçe/şubeye ya da ekipmana yatırmayı düşün.' : 'Kampanyaları ve fiyatları yeniden dene.');
  const box = document.createElement('div'); box.className = 'gun'; box.innerHTML = `<div class="row"><b>📅 Gün ${d} özeti</b><button class="btn sm" id="gunk">✕</button></div><div class="grid2 small"><div>Müşteri <b>${r.musteri}</b> · kayıp ${r.kayip}</div><div>Net kâr <b class="${r.kar >= 0 ? 'good' : 'badc'}">${fmt(r.kar)}</b> ${p ? (dg >= 0 ? '<span class="good">▲</span>' : '<span class="badc">▼</span>') : ''}</div><div>Gelir <b>${fmt(r.toplamGelir)}</b></div><div>${top ? 'En çok satan: <b>' + esc(top[0]) + '</b> (' + top[1] + ')' : ''}</div></div><div class="small muted" style="margin-top:4px">💡 ${tips[0]}</div><button class="btn sm" id="gund" style="margin-top:6px">Ekonomi Merkezi</button>`;
  document.querySelector('.gun')?.remove(); root.appendChild(box); sfx.gun(); const kill = (): void => box.remove(); $('#gunk').onclick = kill; $('#gund').onclick = () => { kill(); TAB = 'ekonomi'; PANEL_OPEN = true; ctx.anim = true; nav(); panel(false); }; setTimeout(kill, 15000);
}
/* ===================== Eğitim turu ===================== */
const TUR: Array<{ n?: string; t: string; ok?: [string, string] }> = [
  { t: '👋 Hoş geldin! Dükkân dışarıdan görünür; asıl iş soldaki menülerde. Üstteki ⏸ ▶ ⏩ düğmeleriyle zamanı yönetirsin (1 gün birkaç dakika sürer; süreyi Ayarlar menüsünden değiştirebilirsin). Takıldığında üstteki ? ile bu turu yeniden açabilirsin.' },
  { n: 'menu', t: '📋 Önce menüye bak: fiyatları ₺ olarak ayarla, Fiyat danışmanı hangi ürünün fiyatını değiştirmeni öneriyor? Menü ve Ürünler\'e gir.', ok: ['tab', 'menu'] },
  { n: 'vardiya', t: '🗓️ Vardiyalar: kırmızı saatlerde barista yoktur ve o saatte müşteri kaybedersin. Vardiyalar menüsüne gir.', ok: ['tab', 'vardiya'] },
  { n: 'stok', t: '📦 Stok bitince ürün satılamaz. Stok menüsünde otomatik sipariş açık mı ve minimum seviye yeterli mi bak.', ok: ['tab', 'stok'] },
  { n: 'ekonomi', t: '📈 Ekonomi Merkezi: gelir-gider grafikleri, fiyat–kâr eğrisi ve kampanyalar burada. İncelemek için gir.', ok: ['tab', 'ekonomi'] },
  { n: 'harita', t: '🗺️ Büyümek için Türkiye Haritası: İstanbul\'dan başlıyorsun; yeni ilçe ve il pazarlarını parayla açarsın. Haritaya gir.', ok: ['tab', 'harita'] },
  { n: 'hedefler', t: '🏆 Hedefler: görevleri tamamlayınca nakit ödül, başarımlar ise kalıcı kilometre taşları. Son durak: Hedefler.', ok: ['tab', 'hedefler'] },
  { t: '🎉 Tur bitti! Şimdi kendi stratejini kur: ekibi dengele, fiyatı ayarla, kampanya aç ve pazarını büyüt. İyi şanslar!' },
];
function tourEvent(kind: string, id: string): void { if (!S || S.tur < 0 || S.tur >= TUR.length) return; const st = TUR[S.tur]!; if (st.ok && st.ok[0] === kind && st.ok[1] === id) { S.tur++; tour(); } }
function tour(): void {
  document.querySelector('.tour')?.remove(); if (!S || S.tur < 0) return; if (S.tur >= TUR.length) { S.tur = -1; return; }
  const st = TUR[S.tur]!, box = document.createElement('div'); box.className = 'tour'; const last = S.tur === TUR.length - 1;
  box.innerHTML = `<div class="tourbox"><div class="tiny muted">Rehber ${S.tur + 1}/${TUR.length}</div><div class="small" style="margin:4px 0 8px">${st.t}</div><div class="chiprow"><button class="btn sm pri" id="tN">${last ? 'Bitir' : st.ok ? 'Geç' : 'Devam'}</button><button class="btn sm" id="tX">Turu kapat</button></div></div>`; root.appendChild(box);
  ipucu();
  $('#tN').onclick = () => { S!.tur = last ? -1 : S!.tur + 1; sfx.tick(); tour(); }; $('#tX').onclick = () => { S!.tur = -1; tour(); };
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
  el.classList.remove('hid'); el.classList.toggle('wide', TAB === 'harita' && ctx.mapWide); ctx.S = S; const body = (PANELS[TAB] ?? PANELS.genel!)(); const wasAnim = ctx.anim; ctx.anim = false;
  const gr = grupOf(TAB), alt = gr.tabs.length > 1 ? `<div class="subtabs">${gr.tabs.map((id) => { const n = NAV.find((x) => x[0] === id)!; return `<button data-n="${id}" class="${id === TAB ? 'on' : ''}">${n[1]} ${n[2]}</button>`; }).join('')}</div>` : '';
  el.innerHTML = `<div class="ph"><h2>${nm[1]} ${nm[2]}</h2><button class="btn sm" id="pclose">Kapat ✕</button></div>${alt}<div class="pb">${body}</div>`; $('#pclose').onclick = () => { PANEL_OPEN = false; nav(); panel(false); }; el.querySelectorAll<HTMLElement>('.subtabs [data-n]').forEach((b) => { b.onclick = () => sekmeAc(b.dataset.n!); }); queueMicrotask(ipucu); const pb = el.querySelector<HTMLElement>('.pb')!; pb.scrollTop = sc; bind(pb); layout(); if (wasAnim) animateCounters(pb);
}
function animateCounters(pb: HTMLElement): void {
  const els = [...pb.querySelectorAll<HTMLElement>('.cnt')]; if (!els.length) return; const t0 = performance.now(), ease = (t: number): number => 1 - Math.pow(1 - t, 3);
  const tick = (now: number): void => { const k = Math.min(1, (now - t0) / 1100); for (const e of els) e.textContent = fmt(+e.dataset.v! * ease(k)); if (k < 1) requestAnimationFrame(tick); else for (const e of els) e.textContent = fmt(+e.dataset.v!); };
  requestAnimationFrame(tick);
}
function bind(pb: HTMLElement): void {
  pb.querySelectorAll<HTMLElement>('[data-a]').forEach((e) => { e.onclick = () => act(e.dataset.a!, e.dataset); });
  pb.querySelectorAll<SVGElement>('path[data-il]').forEach((p) => { p.onclick = () => act('ilsec', p.dataset); });
  pb.querySelectorAll<SVGElement>('path[data-ilce]').forEach((p) => { p.onclick = () => act('ilcesec', { id: p.dataset.ilce }); });
}
function showBranch(): void { if (S && view) { view.show(S, cur()); hud(); } }
function act(a: string, d: DOMStringMap): void {
  if (!S) return; ctx.S = S;
  handle(a, d, {
    zoom: (vb, done) => zoomTo(vb, () => { done?.(); panel(true); }),
    res: (r: Result) => { toast(r.m); if (r.ok) { if (['ilac', 'ilceac', 'sube', 'frver', 'merkez', 'invest', 'gel'].includes(a)) sfx.unlock(); else if (['kredi', 'siparis', 'ad', 'bonus'].includes(a)) sfx.coin(); else sfx.tick(); } else sfx.err(); save(S!); panel(true); hud(); tourEvent('act', a); },
    toast, refresh: () => panel(true), show: () => { showBranch(); }, go: (t) => { sekmeAc(t); tour(); },
    save: () => save(S!), exit: () => { save(S!); stopAudio(); view?.destroy(); view = null; S = null; ctx.S = null; title(); }, wipe: () => { wipe(); stopAudio(); view?.destroy(); view = null; S = null; ctx.S = null; title(); },
  });
  if (a === 'bsel') { hud(); panel(true); }
}
/** Dikey tutulunca oyunu duraklat, yatay olunca eski hıza dön; destekleyen tarayıcılarda yatay kilidi dene. */
let hizEski = 1, dikeyde = false;
function yonKontrol(): void {
  const dikey = innerHeight > innerWidth && innerWidth <= 900; if (dikey === dikeyde || !S) { dikeyde = dikey; return; } dikeyde = dikey;
  if (dikey) { hizEski = S.hiz || 1; S.hiz = 0; } else { S.hiz = hizEski; spdBar(); layout(); }
}
function yatayKilit(): void { try { void (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape')?.catch(() => 0); } catch { /* desteklenmiyor */ } }
export function boot(): void { window.addEventListener('resize', yonKontrol); window.addEventListener('orientationchange', yonKontrol); document.addEventListener('pointerdown', yatayKilit, { once: true }); title(); (window as unknown as Record<string, unknown>).__app = { get S() { return S; }, get view() { return view; }, openTab: (t: string) => sekmeAc(t) }; }
