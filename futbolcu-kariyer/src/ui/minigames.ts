/** Antrenman mini oyunları. Her biri 0-1 arası başarı döndürür. Oyuncunun yeteneği oyunu gerçekten kolaylaştırır. */
import type { AntrenmanDef } from '../core/training';
export interface MgCtx { def: AntrenmanDef; beceri: number; kok: HTMLElement }
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const kare = (c: HTMLCanvasElement) => { const r = c.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); return { w: c.width, h: c.height, d }; };
export function oynat(ctx: MgCtx): Promise<number> {
  return new Promise((bitti) => {
    const kok = document.createElement('div'); kok.className = 'mg'; kok.innerHTML = `<div class="top"><b>${ctx.def.ik} ${ctx.def.ad}</b><span style="flex:1"></span><span id="mgS" style="font-weight:800;color:var(--gold)">0</span><button class="btn sec sm" id="mgX">Vazgeç</button></div><canvas></canvas><div class="bot" id="mgH">${ctx.def.hedef}. ${ctx.def.ac}</div>`; ctx.kok.appendChild(kok);
    const cv = kok.querySelector('canvas')!, hint = kok.querySelector('#mgH') as HTMLElement, skor = kok.querySelector('#mgS') as HTMLElement; let raf = 0, bittiMi = false;
    const son = (v: number) => { if (bittiMi) return; bittiMi = true; cancelAnimationFrame(raf); setTimeout(() => { kok.remove(); bitti(v); }, 700); };
    (kok.querySelector('#mgX') as HTMLElement).onclick = () => { bittiMi = true; cancelAnimationFrame(raf); kok.remove(); bitti(-1); };
    setTimeout(() => { const f = MOTOR[ctx.def.motor]; f(cv, ctx, (t) => { hint.textContent = t; }, (s) => { skor.textContent = String(Math.round(s * 100)); }, son, () => bittiMi, (fn) => { const dongu = (): void => { if (bittiMi) return; fn(); raf = requestAnimationFrame(dongu); }; raf = requestAnimationFrame(dongu); }); }, 50);
  });
}
type Motor = (cv: HTMLCanvasElement, c: MgCtx, ip: (t: string) => void, sk: (s: number) => void, son: (v: number) => void, bitti: () => boolean, dongu: (fn: () => void) => void) => void;
/* ---- Hedef: kale görünümünde yön+güç ile atış ---- */
const hedef: Motor = (cv, c, ip, sk, son, bitti, dongu) => {
  const v = c.def.varyant, N = v === 'penalti' ? 5 : v === 'serbest' ? 5 : 6, { w, h, d } = kare(cv), ctx = cv.getContext('2d')!, b = c.beceri;
  const G = { x: w * 0.1, y: h * 0.12, w: w * 0.8, h: h * 0.3 }; const top0 = { x: w / 2, y: h * 0.86 };
  let atis = 0, puan = 0, aim: { x: number; y: number } | null = null, anim: { x0: number; y0: number; x1: number; y1: number; t: number; sonuc: number } | null = null, hedefler: Array<{ x: number; y: number; r: number; gate?: boolean }> = [], kaleci = { x: w / 2, dx: 0 }, dive = 0, mesaj = '';
  const yeniHedef = () => { hedefler = []; if (v === 'pas') { const g = [0.2, 0.5, 0.8][Math.floor(Math.random() * 3)]!; for (const gx of [0.2, 0.5, 0.8]) hedefler.push({ x: G.x + G.w * gx, y: G.y + G.h * 0.55, r: gx === g ? G.w * 0.075 : G.w * 0.055, gate: gx === g }); } else if (v === 'penalti') { /* kaleci kaçacak yeri seçer */ dive = [-1, 0, 1][Math.floor(Math.random() * 3)]!; kaleci.x = w / 2; } else { const cs = [[0.12, 0.2], [0.88, 0.2], [0.12, 0.82], [0.88, 0.82]]; const sel = cs.sort(() => Math.random() - 0.5).slice(0, 2); for (const [px, py] of sel) hedefler.push({ x: G.x + G.w * px!, y: G.y + G.h * py!, r: G.w * 0.075 }); } };
  yeniHedef(); ip(`${c.def.hedef}. ${N} atış. Parmağını sürükle: yön ve güç.`);
  const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * d, y: (e.clientY - r.top) * d }; };
  let basla: { x: number; y: number } | null = null;
  cv.onpointerdown = (e) => { if (anim || bitti()) return; basla = pos(e); aim = { x: top0.x, y: top0.y }; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = (e) => { if (!basla || anim) return; const p = pos(e); aim = { x: top0.x + (p.x - basla.x) * 1.6, y: top0.y + (p.y - basla.y) * 1.6 }; };
  cv.onpointerup = () => { if (!basla || !aim || anim) { basla = null; return; } const dx = aim.x - top0.x, dy = aim.y - top0.y, guc = Math.min(1, Math.hypot(dx, dy) / (h * 0.6)); basla = null; const hedefY = top0.y + dy * 1.0; if (dy > -h * 0.04) { aim = null; return; }
    const nz = (1 - b / 110) * G.w * 0.18 * (1 + Math.max(0, guc - 0.75) * 1.4) * (v === 'serbest' ? 1.15 : 1), tx = top0.x + dx * (G.w / (w * 0.5)) * 0.9 + (Math.random() - 0.5) * 2 * nz, ty = G.y + G.h - (-dy / (h * 0.55)) * G.h * 1.05 + (Math.random() - 0.5) * nz * 0.6; void hedefY;
    let s = 0, m = ''; const inG = tx > G.x && tx < G.x + G.w && ty > G.y && ty < G.y + G.h;
    if (v === 'pas') { const g = hedefler.find((x) => x.gate)!; const hit = Math.hypot(tx - g.x, ty - g.y) < g.r * 1.1; s = hit ? 1 : inG ? 0.25 : 0; m = hit ? 'Kapıdan geçti!' : 'Kapıyı ıskaladın'; }
    else if (v === 'penalti') { const sd = dive; const kx = w / 2 + sd * G.w * 0.28, savunur = inG && Math.abs(tx - kx) < G.w * 0.16 && guc < 0.93; s = !inG ? 0 : savunur ? 0.15 : 1; m = !inG ? 'Dışarı!' : savunur ? 'Kaleci kurtardı' : 'GOL!'; kaleci.x = kx; }
    else { const duvar = v === 'serbest' && tx > w * 0.34 && tx < w * 0.66 && ty > G.y + G.h * 0.38; const hit = hedefler.some((x) => Math.hypot(tx - x.x, ty - x.y) < x.r * 1.15); s = duvar ? 0 : hit ? 1 : inG ? 0.4 : 0; m = duvar ? 'Barajda kaldı' : hit ? 'Tam isabet!' : inG ? 'Kaleye gitti' : 'Dışarı'; }
    anim = { x0: top0.x, y0: top0.y, x1: tx, y1: ty, t: 0, sonuc: s }; mesaj = m; aim = null; };
  dongu(() => { ctx.clearRect(0, 0, w, h); const gz = ctx.createLinearGradient(0, 0, 0, h); gz.addColorStop(0, '#0e2a19'); gz.addColorStop(1, '#17542f'); ctx.fillStyle = gz; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'transparent'; ctx.fillRect(0, h * 0.42 + i * h * 0.07, w, h * 0.07); }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(G.x, G.y, G.w, G.h); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = d; for (let i = 0; i <= 14; i++) { const x = G.x + G.w * i / 14; ctx.beginPath(); ctx.moveTo(x, G.y); ctx.lineTo(x, G.y + G.h); ctx.stroke(); } for (let j = 0; j <= 5; j++) { const y = G.y + G.h * j / 5; ctx.beginPath(); ctx.moveTo(G.x, y); ctx.lineTo(G.x + G.w, y); ctx.stroke(); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5 * d; ctx.strokeRect(G.x, G.y, G.w, G.h);
    for (const t of hedefler) { ctx.strokeStyle = t.gate ? '#ffd54a' : '#2fd06b'; ctx.lineWidth = 3 * d; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.45, 0, 7); ctx.stroke(); }
    if (v === 'serbest') { ctx.fillStyle = '#3949ab'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(w * 0.36 + i * w * 0.07, G.y + G.h * 0.4, w * 0.055, G.h * 0.9, 8 * d); ctx.fill(); } }
    if (v === 'penalti' || v === 'serbest') { const kx = anim ? kaleci.x : w / 2; ctx.fillStyle = '#ffb300'; ctx.beginPath(); ctx.arc(v === 'penalti' ? (anim ? w / 2 + dive * G.w * 0.28 : kx) : w / 2, G.y + G.h * 0.75, w * 0.045, 0, 7); ctx.fill(); }
    if (aim && basla) { ctx.strokeStyle = '#fff'; ctx.setLineDash([8 * d, 8 * d]); ctx.lineWidth = 3 * d; ctx.beginPath(); ctx.moveTo(top0.x, top0.y); ctx.lineTo(aim.x, aim.y); ctx.stroke(); ctx.setLineDash([]); const gu = Math.min(1, Math.hypot(aim.x - top0.x, aim.y - top0.y) / (h * 0.6)); ctx.fillStyle = `hsl(${120 - 120 * gu},85%,55%)`; ctx.fillRect(w - 26 * d, h * 0.5 - gu * h * 0.3, 14 * d, gu * h * 0.3); }
    let bx = top0.x, by = top0.y, br = w * 0.05; if (anim) { anim.t += 0.045; const t = Math.min(1, anim.t), e = 1 - (1 - t) * (1 - t); bx = anim.x0 + (anim.x1 - anim.x0) * e; by = anim.y0 + (anim.y1 - anim.y0) * e; br = w * 0.05 * (1 - 0.65 * e); if (t >= 1 && anim.t < 1.5) { /* bekle */ } if (anim.t >= 1.5) { puan += anim.sonuc; atis++; sk(puan / N); ip(`${mesaj} · ${atis}/${N}`); anim = null; if (atis >= N) { son(puan / N); } else yeniHedef(); } }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(bx, anim ? by + br : top0.y + br, br, br * 0.35, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(bx, by, br * 0.32, 0, 7); ctx.fill();
    if (anim && anim.t > 0.8) { ctx.fillStyle = '#fff'; ctx.font = `900 ${h * 0.05}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(mesaj, w / 2, h * 0.58); } });
};
/* ---- Koni: 3 şeritte engellerden kaç ---- */
const koni: Motor = (cv, c, ip, sk, son, bitti, dongu) => {
  const { w, h, d } = kare(cv), ctx = cv.getContext('2d')!; let sn = 2, hedefSn = c.def.sure, t0 = performance.now(), engeller: Array<{ s: number; y: number; ok?: boolean }> = [], gecen = 0, toplam = 0, sonE = 0, hiz = h * (0.5 - c.beceri / 600);
  ip('Sağa-sola kaydır ya da ekranın yarılarına dokun'); const gecis = (dir: number) => { sn = Math.max(0, Math.min(4, sn + dir)); };
  let bx = 0; cv.onpointerdown = (e) => { bx = e.clientX; const r = cv.getBoundingClientRect(); if (e.clientX < r.left + r.width / 2) gecis(-1); else gecis(1); }; void bx;
  const seritler = 5, X = (s: number) => w * (0.12 + 0.19 * s); let oyuncuX = X(sn);
  dongu(() => { const gec = (performance.now() - t0) / 1000; ctx.clearRect(0, 0, w, h); const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0e2a19'); g.addColorStop(1, '#1a5a33'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 1; i < seritler; i++) { ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.setLineDash([10 * d, 14 * d]); ctx.beginPath(); ctx.moveTo(w * (0.02 + 0.19 * i), 0); ctx.lineTo(w * (0.02 + 0.19 * i), h); ctx.stroke(); } ctx.setLineDash([]);
    if (gec > sonE + 0.75 - c.beceri / 400 && gec < hedefSn - 2) { sonE = gec; const s = Math.floor(Math.random() * seritler), e2 = Math.floor(Math.random() * seritler); engeller.push({ s, y: -40 * d }); if (gec > 10 && s !== e2) engeller.push({ s: e2, y: -40 * d }); toplam++; }
    const hz = hiz * (1 + gec / 40); oyuncuX += (X(sn) - oyuncuX) * 0.3; const oy = h * 0.82;
    for (const e of engeller) { e.y += hz / 60; ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(X(e.s) - w * 0.045, e.y + w * 0.06); ctx.lineTo(X(e.s) + w * 0.045, e.y + w * 0.06); ctx.lineTo(X(e.s), e.y - w * 0.06); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(X(e.s) - w * 0.02, e.y, w * 0.04, w * 0.015); if (!e.ok && e.y > oy - w * 0.06 && e.y < oy + w * 0.06 && Math.abs(X(e.s) - oyuncuX) < w * 0.07) { e.ok = false; gecen -= 0; (e as any).carp = true; } if (!(e as any).carp && !e.ok && e.y > oy + w * 0.07) { e.ok = true; gecen++; sk(gecen / Math.max(1, toplam)); } }
    engeller = engeller.filter((e) => e.y < h + 60); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(oyuncuX, oy + w * 0.06, w * 0.06, w * 0.02, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(oyuncuX, oy, w * 0.055, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(oyuncuX + w * 0.055, oy - w * 0.04, w * 0.022, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `800 ${h * 0.035}px sans-serif`; ctx.textAlign = 'left'; ctx.fillText(`${Math.max(0, Math.ceil(hedefSn - gec))} sn`, 12 * d, h * 0.05);
    if (gec >= hedefSn && !bitti()) { const carpan = engeller.length; void carpan; const sonuc = toplam ? Math.max(0, gecen / toplam) : 0; son(sonuc); } });
  // çarpışma sayımı doğruluğu için toplam, çarpanlar hariç: temiz geçiş / toplam
};
/* ---- Zamanlama: hareketli çubuk, yeşil bölge ---- */
const zaman: Motor = (cv, c, ip, sk, son, bitti, dongu) => {
  const { w, h, d } = kare(cv), ctx = cv.getContext('2d')!, N = 8; let t = 0, tur = 0, puan = 0, deg = 0.014 + (c.def.varyant === 'surat' ? 0.004 : 0.002), zone = 0.1 + c.beceri / 450, zc = 0.5, son_msg = '', flash = 0, flashUntil = 0;
  ip('Çubuk yeşil bölgedeyken dokun. 8 deneme.'); const sabit = c.def.varyant === 'kuvvet';
  cv.onpointerdown = () => { if (bitti() || performance.now() < flashUntil) return; const x = (Math.sin(t) + 1) / 2, mes = Math.abs(x - zc); const s = mes < zone / 2 ? 1 : mes < zone ? 0.5 : 0; puan += s; tur++; sk(puan / N); son_msg = s === 1 ? 'Mükemmel!' : s ? 'İyi' : 'Iska'; flashUntil = performance.now() + 450; zc = 0.2 + Math.random() * 0.6; if (tur >= N) son(puan / N); };
  dongu(() => { t += deg * (1 + tur * 0.08); void sabit; void flash; ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#0c1d13'; ctx.fillRect(0, 0, w, h); const bw = w * 0.84, bx = w * 0.08, by = h * 0.45, bh = h * 0.1; ctx.fillStyle = '#1b2e24'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12 * d); ctx.fill(); ctx.fillStyle = 'rgba(47,208,107,.55)'; ctx.fillRect(bx + (zc - zone) * bw, by, zone * 2 * bw, bh); ctx.fillStyle = '#2fd06b'; ctx.fillRect(bx + (zc - zone / 2) * bw, by, zone * bw, bh); const x = (Math.sin(t) + 1) / 2; ctx.fillStyle = '#fff'; ctx.fillRect(bx + x * bw - 4 * d, by - 12 * d, 8 * d, bh + 24 * d); ctx.font = `900 ${h * 0.05}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd54a'; ctx.fillText(son_msg, w / 2, h * 0.32); ctx.fillStyle = '#9bb3a4'; ctx.font = `700 ${h * 0.03}px sans-serif`; ctx.fillText(`${tur}/${N}`, w / 2, h * 0.68); });
};
/* ---- Tutma: göstergeyi bantta tut ---- */
const tutma: Motor = (cv, c, ip, sk, son, bitti, dongu) => {
  const { w, h, d } = kare(cv), ctx = cv.getContext('2d')!; let v = 0.5, vel = 0, basili = false, t0 = performance.now(), iyi = 0, kare_ = 0, bant = 0.5, bt = 0; ip('Basılı tut: gösterge yükselir. Bırak: düşer. Yeşil bantta tut.');
  cv.onpointerdown = () => { basili = true; }; cv.onpointerup = cv.onpointercancel = () => { basili = false; };
  dongu(() => { const g = (performance.now() - t0) / 1000; bt += 0.012; bant = 0.5 + Math.sin(bt) * 0.22 + Math.sin(bt * 2.3) * 0.08; vel += (basili ? 0.0021 : -0.0017) * (1.2 - c.beceri / 250); vel *= 0.94; v = Math.max(0, Math.min(1, v + vel)); const genis = 0.1 + c.beceri / 600; if (Math.abs(v - bant) < genis) iyi++; kare_++; sk(iyi / kare_);
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#0c1d13'; ctx.fillRect(0, 0, w, h); const bx = w * 0.4, bw = w * 0.2, by = h * 0.12, bh = h * 0.7; ctx.fillStyle = '#1b2e24'; ctx.fillRect(bx, by, bw, bh); ctx.fillStyle = 'rgba(47,208,107,.7)'; ctx.fillRect(bx, by + bh * (1 - bant - genis), bw, bh * genis * 2); ctx.fillStyle = Math.abs(v - bant) < genis ? '#ffd54a' : '#ff6b5e'; ctx.fillRect(bx - 12 * d, by + bh * (1 - v) - 6 * d, bw + 24 * d, 12 * d); ctx.fillStyle = '#fff'; ctx.font = `800 ${h * 0.035}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(`${Math.max(0, Math.ceil(c.def.sure - g))} sn · ${Math.round(iyi / kare_ * 100)}%`, w / 2, h * 0.92); if (g >= c.def.sure && !bitti()) son(iyi / kare_); });
};
/* ---- Sıra: diziyi tekrarla ---- */
const sira: Motor = (cv, c, ip, sk, son, bitti, dongu) => {
  const { w, h, d } = kare(cv), ctx = cv.getContext('2d')!, renk = ['#e53935', '#1e88e5', '#43a047', '#fdd835'], R = 5; let tur = 0, dizi: number[] = [], gos = 0, gosT = 0, faz: 'goster' | 'gir' | 'bekle' = 'bekle', girdi = 0, dogru = 0, yan = -1, yanT = 0, bt = 60; const baslaTur = () => { const len = 2 + tur + (c.beceri > 55 ? 1 : 0); dizi = Array.from({ length: len }, () => Math.floor(Math.random() * 4)); gos = 0; gosT = 0; faz = 'goster'; girdi = 0; ip(`Tur ${tur + 1}/${R}: diziyi izle`); }; baslaTur();
  const pads = () => [0, 1, 2, 3].map((i) => ({ x: w * (0.1 + (i % 2) * 0.42), y: h * (0.2 + Math.floor(i / 2) * 0.3), w: w * 0.38, h: h * 0.26 }));
  cv.onpointerdown = (e) => { if (faz !== 'gir') return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * d, y = (e.clientY - r.top) * d, i = pads().findIndex((p) => x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h); if (i < 0) return; yan = i; yanT = 12; if (i === dizi[girdi]) { girdi++; if (girdi >= dizi.length) { dogru++; sk(dogru / R); tur++; faz = 'bekle'; bt = 40; if (tur >= R) son(dogru / R); } } else { tur++; faz = 'bekle'; bt = 40; ip('Yanlış!'); sk(dogru / R); if (tur >= R) son(dogru / R); } };
  dongu(() => { if (faz === 'goster') { gosT++; if (gosT % 36 === 1) { yan = dizi[gos]!; yanT = 24; gos++; } if (gos >= dizi.length && gosT % 36 > 28) { faz = 'gir'; ip('Şimdi tekrarla'); } } else if (faz === 'bekle') { bt--; if (bt <= 0 && tur < R) baslaTur(); } if (yanT > 0) yanT--; else yan = -1;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#0c1d13'; ctx.fillRect(0, 0, w, h); pads().forEach((p, i) => { ctx.fillStyle = renk[i]!; ctx.globalAlpha = i === yan ? 1 : 0.35; ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 16 * d); ctx.fill(); }); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = `800 ${h * 0.035}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(`Doğru: ${dogru}/${R}`, w / 2, h * 0.9); });
};
const MOTOR: Record<string, Motor> = { hedef, koni, zaman, tutma, sira };
