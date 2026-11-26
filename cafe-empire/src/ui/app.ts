import './style.css';
import { cityById, CITIES } from '../data/turkey';
import { ilDurum } from '../core/region';
import { LEVELS } from '../data/catalog';
import { newGame, fmt, type Result } from '../core/actions';
import { step, dateText, timeText, dayOf, levelOf, resolveEvent } from '../core/sim';
import { oyunDakikasi } from '../core/pace';
import { save, load, wipe } from '../core/save';
import { NAT_VB, type VB } from './map';
import type { GameState } from '../core/types';
import { startAudio, setAudio, sfx, stopAudio } from './audio';
import { BASARIM } from '../core/goals';
import { ctx, cur, esc as _esc, NAV, GRUPLAR, grupOf, PANELS, LIVE_TABS, handle, isBranchTab } from './panels';
import { handleDerin } from './derin';
import { handleDerin2 } from './derin2';
import { ZORLUK } from '../core/derin';
import { confetti } from './juice';
import { PAGES, handlePages, kurHtml, kisa, BOS_UYARI } from './pages';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector(sel) as T;
const esc = _esc;
const root = document.getElementById('app') as HTMLElement;
let S: GameState | null = null, TAB = 'ana';
let lastSumDay = -1, lastAch = new Set<string>();
let known = new Set<number>(), newOpp = false, oppT = 0;
let accMin = 0, uiT = 0, saveT = 0, modalOpen = false, rafId = 0;
const ALL: Record<string, () => string> = { ...PANELS, ...PAGES };
function toast(m: string): void { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; root.appendChild(t); setTimeout(() => t.remove(), 2600); }

/* ===================== Başlangıç ekranları ===================== */
function title(): void {
  const has = load(); root.innerHTML = `<div class="screen"><div class="title"><div style="font-size:64px">☕</div><h1>CAFE EMPIRE</h1><p>Türkiye · kafe işletme ve zincir simülasyonu</p>${has ? `<button class="btn pri" id="devam">Devam et<br><small>${esc(has.marka.ad)} · ${dateText(has)} · ${has.subeler.length} şube</small></button>` : ''}<button class="btn ${has ? '' : 'pri'}" id="yeni">Yeni oyun</button><p class="tiny muted" style="margin-top:14px">Telefonu yatay tutmanız önerilir. Kurgusal bir simülasyondur.</p></div></div>`;
  $('#yeni').onclick = setup; if (has) $('#devam').onclick = () => { S = has; enter(); };
}
function setup(): void {
  let zor: 'kolay' | 'normal' | 'zor' = 'normal', ad = 'Korkmaz Kahve', renk = '#e0983c', renk2 = '#2d1f14', logo = 0; const renkler: Array<[string, string]> = [['#e0983c', '#2d1f14'], ['#2e86c1', '#1b2a38'], ['#27ae60', '#1d3a2b'], ['#c0392b', '#3a1d1d'], ['#8e44ad', '#2d1d3a'], ['#d4a017', '#2a2415']];
  const draw = (): void => {
    const inp = document.getElementById('ad') as HTMLInputElement | null; if (inp) ad = inp.value || ad;
    root.innerHTML = `<div class="screen"><div class="kurulum"><div class="kk"><div class="tiny muted">YENİ OYUN</div><h1>Zincirini kur</h1><p class="muted small">İstanbul'dan başlıyorsun (başlangıç parası zorluğa göre değişir). Önce markanı seç; sonra haritadan ilk dükkânını bul ve kirala.</p></div><div class="cardx"><div class="small muted">Kafe / şirket adı</div><input id="ad" class="kin" maxlength="22" value="${esc(ad)}"><div class="small muted" style="margin-top:10px">Marka rengi</div><div class="colors">${renkler.map((r, i) => `<i data-r="${i}" class="${r[0] === renk ? 'on' : ''}" style="background:${r[0]}"></i>`).join('')}</div><div class="small muted">Zorluk</div><div class="zorl">${(Object.keys(ZORLUK) as Array<keyof typeof ZORLUK>).map((z) => `<button data-z="${z}" class="${zor === z ? 'on' : ''}">${ZORLUK[z].ad}<small>${ZORLUK[z].ac}</small></button>`).join('')}</div><div class="small muted">Logo</div><div class="chiprow">${['☕', '🥐', '🌿', '⭐', '🔥', '🫘'].map((l, i) => `<button class="cx ${i === logo ? 'on' : ''}" data-l="${i}">${l}</button>`).join('')}</div></div><div class="kfoot2"><button class="btn" id="geri">Geri</button><button class="ybtn" id="basla">Başla ›</button></div></div></div>`;
    root.querySelectorAll<HTMLElement>('[data-r]').forEach((e) => { e.onclick = () => { const r = renkler[+e.dataset.r!]!; renk = r[0]; renk2 = r[1]; draw(); }; });
    root.querySelectorAll<HTMLElement>('[data-z]').forEach((e) => { e.onclick = () => { zor = e.dataset.z as typeof zor; draw(); }; });
    root.querySelectorAll<HTMLElement>('[data-l]').forEach((e) => { e.onclick = () => { logo = +e.dataset.l!; draw(); }; });
    $('#geri').onclick = title; $('#basla').onclick = () => { ad = ($('#ad') as HTMLInputElement).value || ad; const g = newGame({ ad, renk, renk2, logo, sehir: 34, tip: 'cadde', bos: true, zorluk: zor }); S = g.s; wipe(); enter(); toast('Hoş geldin! Önce ilk dükkânını bul.'); };
  };
  draw();
}
let zoomRaf = 0;
function zoomTo(vb: VB, done?: () => void, ms = 650): void {
  cancelAnimationFrame(zoomRaf); const from = [...ctx.vb] as VB, t0 = performance.now(), ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const tick = (now: number): void => { const k = Math.min(1, (now - t0) / ms), e = ease(k); ctx.vb = from.map((v, i) => v + (vb[i]! - v) * e) as VB; document.getElementById('mapsvg')?.setAttribute('viewBox', ctx.vb.map((v) => v.toFixed(2)).join(' ')); if (k < 1) zoomRaf = requestAnimationFrame(tick); else { ctx.vb = vb; done?.(); } };
  zoomRaf = requestAnimationFrame(tick);
}

/* ===================== Oyun ekranı ===================== */
function enter(): void {
  if (!S) return; cancelAnimationFrame(zoomRaf); ctx.S = S; ctx.bid = S.subeler[0]?.id ?? 0; TAB = 'ana'; ctx.zoomIl = null; ctx.selIlce = null; ctx.vb = NAT_VB; ctx.fx = []; ctx.mapsel = 34; ctx.mapm = 'erisim'; ctx.kur = null; ctx.subeAcik = null; known = new Set(); newOpp = false;
  root.innerHTML = `<div class="top"><div class="brandw"><i>☕</i><div><b id="tBrand"></b><small id="tSub"></small></div></div><span class="sp"></span><div class="chip tm" id="tTime"></div><button class="chip money" id="tKasa" title="Banka"></button><button class="chip star" id="tMarka" title="Prestij"></button><div class="spd" id="spd"></div><button class="ibtn" id="tHelp" title="Rehber">?</button><button class="ibtn" id="tSet" title="Ayarlar">⚙</button></div><div id="page" class="page"></div><div class="nav" id="nav"></div><div id="kur"></div>`;
  setAudio({ ses: S.ayar.ses, muzik: S.ayar.muzik, vol: S.ayar.ses_vol }); root.onpointerdown = () => startAudio(); lastSumDay = dayOf(S); lastAch = new Set(Object.keys(S.basarim)); $('#tHelp').onclick = () => { S!.tur = 0; tour(); }; $('#tSet').onclick = () => sekmeAc('ayar'); $('#tKasa').onclick = () => sekmeAc('banka'); $('#tMarka').onclick = () => sekmeAc('prestij');
  S.hiz = 1; nav(); spdBar(); hud(); page(false);
  cancelAnimationFrame(rafId); let son = performance.now(); const kare = (n: number): void => { rafId = requestAnimationFrame(kare); const dt = Math.min(0.1, (n - son) / 1000); son = n; loop(dt); }; rafId = requestAnimationFrame(kare); tour();
  document.addEventListener('visibilitychange', () => { if (document.hidden && S) { save(S); } });
}
const sonSekme: Record<string, string> = {};
function ipucu(): void {
  document.querySelectorAll('.hint').forEach((e) => e.classList.remove('hint')); if (!S || S.tur < 0) return; const st = TUR[S.tur]; if (!st?.n) return; const g = grupOf(st.n);
  document.querySelector(`.nav [data-g="${g.id}"]`)?.classList.add('hint'); if (grupOf(TAB).id === g.id) document.querySelector(`.subtabs [data-n="${st.n}"]`)?.classList.add('hint');
}
function sekmeAc(tab: string): void { TAB = tab; sonSekme[grupOf(tab).id] = tab; ctx.anim = true; sfx.tick(); if (tab === 'harita') newOpp = false; nav(); page(false); const pg = $('#page'); pg.classList.remove('gecis'); void pg.offsetWidth; pg.classList.add('gecis'); setTimeout(() => pg.classList.remove('gecis'), 350); tourEvent('tab', tab); }
function nav(): void {
  const gt = grupOf(TAB).id;
  $('#nav').innerHTML = GRUPLAR.map((g) => `<button data-g="${g.id}" class="${gt === g.id ? 'on' : ''}" style="--c:${g.renk}"><i>${g.ik}</i><span>${g.ad}</span>${g.id === 'harita' && newOpp && TAB !== 'harita' ? '<u class="dot"></u>' : ''}</button>`).join('');
  $('#nav').querySelectorAll<HTMLElement>('[data-g]').forEach((b) => { b.onclick = () => { const g = GRUPLAR.find((x) => x.id === b.dataset.g)!; sekmeAc(sonSekme[g.id] ?? g.tabs[0]!); }; });
  queueMicrotask(ipucu);
}
function spdBar(): void { const V: Array<[number, string]> = [[0, '⏸'], [1, '▶'], [2, '⏩'], [4, '⏭']]; $('#spd').innerHTML = V.map(([v, t]) => `<button data-s="${v}" class="${S!.hiz === v ? 'on' : ''}">${t}</button>`).join(''); $('#spd').querySelectorAll<HTMLElement>('button').forEach((b) => { b.onclick = () => { S!.hiz = +b.dataset.s!; spdBar(); }; }); }
function hud(): void {
  if (!S) return; const b = S.subeler.length ? cur() : null, hv = b ? S.hava[b.city] ?? 'gunesli' : 'gunesli', ikon = { gunesli: '☀️', bulutlu: '⛅', yagmur: '🌧️', kar: '❄️' }[hv], gece = Math.floor((S.dk % 1440) / 60) >= 19 || Math.floor((S.dk % 1440) / 60) < 6;
  $('#tBrand').textContent = S.marka.ad; $('#tSub').textContent = `Gün ${dayOf(S) + 1} · ${S.subeler.length} şube`; $('#tTime').innerHTML = `<span>${gece ? '🌙' : ikon}</span><div><b>${timeText(S)}</b><small>${dateText(S)}</small></div>`; $('#tKasa').innerHTML = `<i class="coin">₺</i><b>${kisa(S.kasa)}</b>`; $('#tMarka').innerHTML = `<i>★</i><b>${Math.round(S.marka_puani)}</b>`; $('#tKasa').title = `${fmt(S.kasa)} · ${LEVELS[levelOf(S) - 1]?.ad ?? ''}`;
}
function loop(dt: number): void {
  if (!S) return; const dk = oyunDakikasi(dt, S.hiz, S.ayar.gunSn); accMin += dk; let n = 0;
  while (accMin >= 10 && n < 8) { accMin -= 10; const ev = step(S, 10); if (ev.some((e) => e.t === 'musteri')) sfx.door(); if (ev.some((e) => e.t === 'olay')) sfx.warn(); n++; if (S.oyunBitti) break; }
  if (dayOf(S) !== lastSumDay) { lastSumDay = dayOf(S); gunOzeti(); if (TAB === 'ekonomi') page(true); } oppT += dt; if (oppT > 2) { oppT = 0; checkOpportunities(); } uiT += dt; saveT += dt; if (uiT > 0.5) { uiT = 0; hud(); if (LIVE_TABS.has(TAB) && !(TAB === 'subeler' && ctx.subeAcik !== null && ctx.subeSekme !== 'ozet')) page(true); if (S.bekleyen.length && !modalOpen) showEvent(); if (S.oyunBitti) gameOver(); }
  if (saveT > 15) { saveT = 0; save(S); }
}
/** Seviye/komşuluk şartı sağlanan yeni pazarları bildirir (zamanla gelişen harita). */
function checkOpportunities(): void {
  if (!S) return; const yeniB = Object.keys(S.basarim).filter((k) => !lastAch.has(k)); if (yeniB.length) { lastAch = new Set(Object.keys(S.basarim)); sfx.ach(); confetti(50); toast(`🏆 Başarım: ${yeniB.map((k) => BASARIM[k]?.ad ?? k).join(', ')}`); if (TAB === 'hedefler') page(true); } const lv = levelOf(S), now = new Set(CITIES.filter((c) => ilDurum(S!, c.id, lv).d === 'satilik').map((c) => c.id));
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
  document.querySelector('.gun')?.remove(); root.appendChild(box); sfx.gun(); const kill = (): void => box.remove(); $('#gunk').onclick = kill; $('#gund').onclick = () => { kill(); sekmeAc('ekonomi'); }; setTimeout(kill, 15000);
}

/* ===================== Eğitim turu ===================== */
const TUR: Array<{ n?: string; t: string; ok?: [string, string] }> = [
  { t: '👋 Hoş geldin! 2.000.000 ₺ ile İstanbul\'dan başlıyorsun. Üstteki ⏸ ▶ ⏩ düğmeleriyle zamanı yönetirsin (süreyi Ayarlar\'dan değiştirebilirsin). Takıldığında ? ile bu rehberi açarsın.' },
  { n: 'harita', t: '🗺️ Türkiye sekmesinden bir semt seç, ilanlardan birini "Açılış planı" ile planla ve aç.', ok: ['tab', 'harita'] },
  { n: 'menu', t: '📋 Dükkân açılınca Dükkânlar → Menü ve fiyat: fiyatları ayarla; Fiyat danışmanı öneri verir.', ok: ['tab', 'subeler'] },
  { n: 'stok', t: '📦 Depo → Stok: stok bitince ürün satılamaz. Otomatik sipariş açık mı bak.', ok: ['tab', 'stok'] },
  { n: 'sosyal', t: '📣 Tanıtım: sosyal medya paylaşımı, reklam ve kampanyalarla müşteri çek.', ok: ['tab', 'sosyal'] },
  { n: 'tarif', t: '☕ Atölye: çekirdek karışımını seç, yeni içecek tasarla. Semt sekmesinde müdavimler, takvim, komşu esnaf ve rakipler var.', ok: ['tab', 'tarif'] },
  { n: 'takvim', t: '🏘️ Semt: takvimdeki bayram/derbi/festival günlerine hazırlan, müdavimlerini tanı, komşu esnafla ortak kampanya yap, rakip zincirleri izle.', ok: ['tab', 'takvim'] },
  { n: 'fuar', t: '🏆 Atölye → Kahve fuarı: Nisan\'da imza tarifinle yarış. Ekim\'de barista şampiyonası var. Hedefin: Kahve İmparatoru olmak (Merkez\'de yolun görünür).', ok: ['tab', 'fuar'] },
  { n: 'hedefler', t: '⭐ Gelişim → Hedefler: görevler nakit ödül, başarımlar kilometre taşı verir.', ok: ['tab', 'hedefler'] },
  { t: '🎉 Rehber bitti! Ekibi dengele, fiyatı ayarla, yeni semtler aç ve zincirini büyüt. İyi şanslar!' },
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
  const p = S!.bekleyen[0]; if (!p) return; modalOpen = true; S!.hiz = 0; spdBar();
  if (p.tip === 'd_hikaye_zafer') { sfx.zafer(); confetti(220); } else if (p.tip === 'd_hikaye_fuar') { if (/madalya/.test(p.metin)) { sfx.madalya(); confetti(130); } else sfx.olay(); } else if (p.tip.startsWith('d_')) { if (['denetim', 'yorum', 'ariza', 'tedarik', 'hirsizlik', 'sendika', 'kapma', 'bayi'].includes(p.tip.slice(2))) sfx.kriz(); else sfx.olay(); } const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="mbox"><div class="pill">Olay</div><h2>${p.ikon} ${esc(p.baslik)}</h2><p>${esc(p.metin)}</p>${p.secenek.map((c, i) => `<button class="btn" data-o="${i}" style="width:100%;margin-top:6px;justify-content:flex-start;text-align:left"><span><b>${esc(c.ad)}</b><br><small class="muted">${esc(c.ac)}</small></span></button>`).join('')}</div>`; root.appendChild(m);
  m.querySelectorAll<HTMLElement>('[data-o]').forEach((b) => { b.onclick = () => { resolveEvent(S!, p.id, +b.dataset.o!); m.remove(); modalOpen = false; S!.hiz = 1; spdBar(); save(S!); hud(); page(true); }; });
}
function gameOver(): void { if (modalOpen) return; modalOpen = true; S!.hiz = 0; const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="mbox"><h2>📉 İflas</h2><p>Kasa uzun süre eksi kaldı ve zincir kapandı. Bir dahaki sefere stok, ekip ve fiyat dengesini daha dikkatli kur.</p><div class="row"><span>Süre</span><b>${dayOf(S!)} gün</b></div><div class="row"><span>Şube</span><b>${S!.subeler.length}</b></div><button class="btn pri" id="y" style="width:100%;margin-top:8px">Ana menü</button></div>`; root.appendChild(m); $('#y').onclick = () => { wipe(); modalOpen = false; cancelAnimationFrame(rafId); stopAudio(); S = null; title(); }; }


/* ===================== Sayfa ===================== */
const FIT = new Set(['harita']);
function page(keep: boolean): void {
  if (!S) return; const el = $('#page'); const sc = keep ? el.querySelector<HTMLElement>('.pb')?.scrollTop ?? 0 : 0, nm = NAV.find((n) => n[0] === TAB)!; ctx.S = S;
  const body = isBranchTab(TAB) && !S.subeler.length ? BOS_UYARI(TAB) : (ALL[TAB] ?? ALL.ana!)(); const wasAnim = ctx.anim; ctx.anim = false;
  const gr = grupOf(TAB), alt = gr.tabs.length > 1 ? `<div class="subtabs">${gr.tabs.map((id) => { const n = NAV.find((x) => x[0] === id)!; return `<button data-n="${id}" class="${id === TAB ? 'on' : ''}">${n[1]} ${n[2]}</button>`; }).join('')}</div>` : '';
  el.innerHTML = `${alt}<div class="pb ${FIT.has(TAB) ? 'fit' : 'cols'}" data-tab="${TAB}">${body}</div>`; el.querySelectorAll<HTMLElement>('.subtabs [data-n]').forEach((b) => { b.onclick = () => sekmeAc(b.dataset.n!); }); queueMicrotask(ipucu); const pb = el.querySelector<HTMLElement>('.pb')!; pb.scrollTop = sc; bind(pb); if (wasAnim) animateCounters(pb); void nm;
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
function kurYenile(): void {
  const k = $('#kur'); if (!ctx.kur) { k.innerHTML = ''; return; } ctx.S = S; k.innerHTML = kurHtml();
  k.querySelectorAll<HTMLElement>('[data-a]').forEach((e) => { e.onclick = () => act(e.dataset.a!, e.dataset); }); const inp = k.querySelector<HTMLInputElement>('[data-kuradi]'); if (inp) inp.oninput = () => { if (ctx.kur?.sc) ctx.kur.sc.ad = inp.value; };
}
function act(a: string, d: DOMStringMap): void {
  if (!S) return; ctx.S = S;
  const h = {
    zoom: (vb: VB, done?: () => void) => zoomTo(vb, () => { done?.(); page(true); }),
    res: (r: Result) => { toast(r.m); if (r.ok) { if (['ilac', 'ilceac', 'sube', 'frver', 'merkez', 'invest', 'gel', 'kur_ac2', 'platKatil'].includes(a)) sfx.unlock(); else if (['kredi', 'siparis', 'ad', 'bonus', 'banka', 'paylas'].includes(a)) sfx.coin(); else sfx.tick(); } else sfx.err(); save(S!); page(true); hud(); tourEvent('act', a); },
    toast, refresh: () => page(true), show: () => { hud(); }, go: (t: string) => { sekmeAc(t); tour(); },
    save: () => save(S!), exit: () => { save(S!); stopAudio(); cancelAnimationFrame(rafId); S = null; ctx.S = null; title(); }, wipe: () => { wipe(); stopAudio(); cancelAnimationFrame(rafId); S = null; ctx.S = null; title(); }, kurYenile,
  };
  if (handlePages(a, d, h) || handleDerin(a, d, h) || handleDerin2(a, d, h)) { return; }
  handle(a, d, h);
  if (a === 'bsel') { hud(); page(true); }
}
/** Dikey tutulunca oyunu duraklat, yatay olunca eski hıza dön; destekleyen tarayıcılarda yatay kilidi dene. */
let hizEski = 1, dikeyde = false;
function yonKontrol(): void {
  const dikey = innerHeight > innerWidth && innerWidth <= 900; if (dikey === dikeyde || !S) { dikeyde = dikey; return; } dikeyde = dikey;
  if (dikey) { hizEski = S.hiz || 1; S.hiz = 0; } else { S.hiz = hizEski; spdBar(); }
}
function yatayKilit(): void { try { void (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape')?.catch(() => 0); } catch { /* desteklenmiyor */ } }
export function boot(): void { window.addEventListener('resize', yonKontrol); window.addEventListener('orientationchange', yonKontrol); document.addEventListener('pointerdown', yatayKilit, { once: true }); title(); (window as unknown as Record<string, unknown>).__app = { get S() { return S; }, openTab: (t: string) => sekmeAc(t) }; }
