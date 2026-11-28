/** Maç sahası çizimi: iki kale, tribün + seyirci, 22 oyuncu (simülasyondaki ilk 11'lerle aynı), top, koşu ve gol animasyonları.
 *  Statik zemin tek seferde bir tampon tuvale çizilir; her karede yalnızca oyuncu/top/seyirci çizilir (mobilde hafif). */
import type { Mac, Olay } from '../core/match';
import { SLOT_XY } from '../core/kadro11';
interface Oy { x: number; y: number; hx: number; hy: number; slot: number; taraf: 0 | 1; ad: string; no: number; ben: boolean; kaleci: boolean; faz: number; hiz: number; vurgu: number }
export interface SahaGirdi { m: Mac; bizRenk: string; rkRenk: string }
const RENK_KALECI: [string, string] = ['#ffd54a', '#7cf29a'];
export class Saha {
  W = 0; H = 0; dpr = 1; kare = 0; private tampon: HTMLCanvasElement | null = null; oy: Oy[] = []; private bizT: 0 | 1; private golAnim: { baslangic: number; biz: boolean; kim: Oy | null; x: number; y: number } | null = null; private titre = 0; private kaleBulge = [0, 0]; private flas = 0;
  top = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, h: 0, hh: 0, iz: [] as Array<[number, number]> }; private sonOlay: Olay | null = null; private tribunZipla = [0, 0];
  constructor(private girdi: SahaGirdi) { const m = girdi.m; this.bizT = m.evde ? 0 : 1; for (const t of [0, 1] as const) m.kadro[t].forEach((o) => { const [sx, dy] = SLOT_XY[o.slot]!, biz = t === this.bizT; const hx = biz ? sx : 1 - sx, hy = biz ? 0.96 - dy * 0.46 : 0.04 + dy * 0.46; this.oy.push({ x: hx, y: hy, hx, hy, slot: o.slot, taraf: t, ad: o.ad, no: o.no, ben: o.ben, kaleci: o.slot === 0, faz: Math.random() * 6, hiz: 0, vurgu: 0 }); }); }
  /** Boyut değişince çağrılır: statik zemin yeniden çizilir. */
  boyut(W: number, H: number, dpr: number): void { this.W = W; this.H = H; this.dpr = dpr; this.tampon = null; }
  private get g(): { pl: number; pt: number; pw: number; ph: number; band: number } { const band = this.H * 0.085, pl = this.W * 0.045, pt = band + this.H * 0.025, ph = this.H - 2 * pt, pw = this.W - 2 * pl; return { pl, pt, pw, ph, band }; }
  private X = (px: number): number => this.g.pl + px * this.g.pw; private Y = (py: number): number => this.g.pt + py * this.g.ph;
  private zeminCiz(): HTMLCanvasElement {
    const c = document.createElement('canvas'); c.width = this.W; c.height = this.H; const x = c.getContext('2d')!, { pl, pt, pw, ph, band } = this.g, W = this.W, H = this.H, d = this.dpr;
    x.fillStyle = '#10161d'; x.fillRect(0, 0, W, H);
    // tribünler (üst/alt): koltuk satırları
    for (const ust of [true, false]) { const y0 = ust ? 0 : H - band; const gr = x.createLinearGradient(0, y0, 0, y0 + band); gr.addColorStop(ust ? 0 : 1, '#1a2230'); gr.addColorStop(ust ? 1 : 0, '#2a3446'); x.fillStyle = gr; x.fillRect(0, y0, W, band); x.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 1; i < 5; i++) x.fillRect(0, y0 + band * i / 5, W, 1 * d); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, ust ? band - 3 * d : y0, W, 3 * d); }
    // reklam panoları
    const ad = ['#c0392b', '#2980b9', '#27ae60', '#f1c40f', '#8e44ad']; for (const ust of [true, false]) { const y = ust ? band : H - band - this.H * 0.022; for (let i = 0; i < 10; i++) { x.fillStyle = ad[i % 5]!; x.fillRect(i * W / 10 + 1, y, W / 10 - 2, this.H * 0.022); } }
    // çim şeritleri
    const t0 = pt, t1 = pt + ph; const gz = x.createLinearGradient(0, t0, 0, t1); gz.addColorStop(0, '#15602f'); gz.addColorStop(1, '#1d7a3b'); x.fillStyle = gz; x.fillRect(0, t0 - this.H * 0.015, W, ph + this.H * 0.03); for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.04)'; x.fillRect(0, t0 + ph * i / 12, W, ph / 12); }
    // çizgiler
    x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 1.6 * d; x.strokeRect(pl, pt, pw, ph); x.beginPath(); x.moveTo(pl, pt + ph / 2); x.lineTo(pl + pw, pt + ph / 2); x.stroke(); x.beginPath(); x.arc(pl + pw / 2, pt + ph / 2, ph * 0.1, 0, 7); x.stroke(); x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.arc(pl + pw / 2, pt + ph / 2, 2.2 * d, 0, 7); x.fill();
    for (const ust of [true, false]) { const yo = ust ? pt : pt + ph, s = ust ? 1 : -1; x.strokeRect(pl + pw * 0.2, ust ? yo : yo - ph * 0.15, pw * 0.6, ph * 0.15); x.strokeRect(pl + pw * 0.34, ust ? yo : yo - ph * 0.06, pw * 0.32, ph * 0.06); x.beginPath(); x.arc(pl + pw / 2, yo + s * ph * 0.105, ph * 0.075, ust ? 0.25 * Math.PI : 1.25 * Math.PI, ust ? 0.75 * Math.PI : 1.75 * Math.PI); x.stroke(); x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.arc(pl + pw / 2, yo + s * ph * 0.105, 2 * d, 0, 7); x.fill(); for (const cx of [pl, pl + pw]) { x.beginPath(); x.arc(cx, yo, 7 * d, ust ? 0 : Math.PI, ust ? Math.PI / 2 : Math.PI * 1.5, false); x.stroke(); } }
    return c;
  }
  private kaleCiz(cx: CanvasRenderingContext2D, ust: boolean): void {
    const { pl, pt, pw, ph } = this.g, d = this.dpr, gw = pw * 0.2, gx = pl + pw / 2 - gw / 2, gy = ust ? pt : pt + ph, dep = this.H * 0.022, bul = this.kaleBulge[ust ? 0 : 1]!;
    cx.save(); cx.fillStyle = 'rgba(0,0,0,.25)'; cx.fillRect(gx, ust ? gy - dep : gy, gw, dep); cx.strokeStyle = 'rgba(255,255,255,.55)'; cx.lineWidth = 1 * d; for (let i = 0; i <= 8; i++) { const xx = gx + gw * i / 8 + Math.sin(this.kare / 3 + i) * bul * 2 * d; cx.beginPath(); cx.moveTo(xx, gy); cx.lineTo(xx, ust ? gy - dep - bul * 3 * d : gy + dep + bul * 3 * d); cx.stroke(); } for (let j = 1; j <= 3; j++) { const yy = ust ? gy - dep * j / 3 : gy + dep * j / 3; cx.beginPath(); cx.moveTo(gx, yy); cx.lineTo(gx + gw, yy); cx.stroke(); }
    cx.strokeStyle = '#fff'; cx.lineWidth = 3 * d; cx.beginPath(); cx.moveTo(gx, ust ? gy - dep : gy + dep); cx.lineTo(gx, gy); cx.lineTo(gx + gw, gy); cx.lineTo(gx + gw, ust ? gy - dep : gy + dep); cx.stroke(); cx.restore();
  }
  private seyirci(cx: CanvasRenderingContext2D): void {
    const { band } = this.g, W = this.W, H = this.H, n = 38, col = [this.girdi.bizRenk, this.girdi.rkRenk, '#e8e8e8', '#ffd54a', '#4fc3f7']; const bizZ = this.tribunZipla[0]! > 0 ? 1 : 0;
    for (let sira = 0; sira < 3; sira++) for (let i = 0; i < n; i++) for (const ust of [true, false]) { const bx = (i + 0.5 + (sira % 2) * 0.5) * W / n, by = ust ? band * (0.2 + sira * 0.24) : H - band * (0.2 + sira * 0.24); const zip = (ust ? this.tribunZipla[1]! : this.tribunZipla[0]!) > 0 ? Math.abs(Math.sin(this.kare / 3 + i)) * 4 * this.dpr : (Math.sin(this.kare / 14 + i * 1.7 + sira) > 0.88 ? 1.5 * this.dpr : 0); cx.fillStyle = col[(i * 3 + sira * 2 + (ust ? 1 : 0)) % (bizZ ? 5 : 5)]!; cx.fillRect(bx - W * 0.007, by - zip, W * 0.014, band * 0.13); cx.fillStyle = 'rgba(255,224,189,.9)'; cx.fillRect(bx - W * 0.004, by - zip - band * 0.07, W * 0.008, band * 0.07); }
    for (let k = 0; k < 2; k++) this.tribunZipla[k] = Math.max(0, this.tribunZipla[k]! - 1);
  }
  /** Her yeni maç olayında çağrılır: top ve oyuncular olaya göre hareket eder. */
  olay(o: Olay): void {
    if (o === this.sonOlay) return; this.sonOlay = o; const aktor = o.kim ? this.oy.find((p) => p.ad === o.kim) : undefined, bizYon = o.biz === true ? 0 : o.biz === false ? 1 : -1; // hücum edilen kale: biz → üst (py 0)
    const hedefKale = (biz: boolean): number => (biz ? 0.0 : 1.0), tx = (): number => 0.35 + Math.random() * 0.3, kaleciOf = (biz: boolean): Oy | undefined => this.oy.find((p) => p.kaleci && (biz ? p.taraf === this.bizT : p.taraf !== this.bizT));
    if (aktor) aktor.vurgu = 90;
    switch (o.tur) {
      case 'sut': if (aktor) { this.yolla(aktor.x, aktor.y); } else this.yolla(tx(), o.biz ? 0.22 : 0.78); if (o.metin.includes('direk')) { this.flas = 14; } break;
      case 'gol': { const biz = o.biz === true, x = tx(), y = hedefKale(biz); this.yolla(x, y, true); const k = aktor ?? this.oy.find((p) => p.taraf === (biz ? this.bizT : 1 - this.bizT) && p.slot >= 9) ?? null; this.golAnim = { baslangic: this.kare, biz, kim: k, x, y }; this.titre = 26; this.kaleBulge[biz ? 0 : 1] = 5; this.tribunZipla[biz ? 0 : 1] = 150; this.tribunZipla[biz ? 1 : 0] = 0; if (k) k.vurgu = 160; this.flas = 20; break; }
      case 'kurtaris': { const biz = o.biz === true; const k = kaleciOf(biz); if (k) { this.yolla(k.x, k.y); k.vurgu = 70; } break; }
      case 'korner': this.yolla(o.biz ? 0.04 : 0.96, o.biz ? 0.04 : 0.96); break;
      case 'faul': case 'kart': case 'ofsayt': this.yolla(0.3 + Math.random() * 0.4, 0.4 + Math.random() * 0.2); break;
      case 'penalti': this.yolla(0.5, o.biz ? 0.14 : 0.86); break; case 'serbest': this.yolla(0.5, o.biz ? 0.3 : 0.7); break;
      case 'atak': case 'pas': case 'dripling': case 'mudahale': this.yolla(tx(), bizYon === 0 ? 0.25 + Math.random() * 0.2 : bizYon === 1 ? 0.55 + Math.random() * 0.2 : 0.4 + Math.random() * 0.2); break;
      default: break;
    }
    void bizYon;
  }
  private yolla(x: number, y: number, gol = false): void { this.top.tx = x; this.top.ty = y; this.top.hh = gol ? 0.012 : 0.02; this.top.h = this.top.hh; }
  /** Bir kare çizer. */
  ciz(cx: CanvasRenderingContext2D, kare: number): void {
    this.kare = kare; if (!this.W) return; this.tampon ??= this.zeminCiz(); const ga = this.golAnim; cx.save();
    if (this.titre > 0) { cx.translate((Math.random() - 0.5) * this.titre * 0.18 * this.dpr, (Math.random() - 0.5) * this.titre * 0.18 * this.dpr); this.titre--; }
    cx.drawImage(this.tampon, 0, 0); this.seyirci(cx); this.kaleCiz(cx, true); this.kaleCiz(cx, false);
    const t = this.top; t.x += (t.tx - t.x) * 0.14; t.y += (t.ty - t.y) * 0.14; t.h = Math.max(0, t.h * 0.93);
    // oyuncular: topa doğru kayan hat, gol anında kutlama
    for (const p of this.oy) {
      let tx = p.hx, ty: number; const biz = p.taraf === this.bizT;
      if (p.kaleci) { ty = p.hy + (t.y - 0.5) * (biz ? 0.06 : 0.06); tx = p.hx + (t.x - 0.5) * 0.18; } else { const cek = p.slot >= 9 ? 0.42 : p.slot >= 5 ? 0.36 : 0.3; ty = p.hy + (t.y - 0.5) * cek; tx = p.hx + (t.x - 0.5) * 0.14; const dx = t.x - p.x, dy = t.y - p.y, uz = Math.hypot(dx, dy); if (uz < 0.16 && uz > 0.001) { tx = p.x + dx * 0.4; ty = p.y + dy * 0.4; } }
      if (ga) { const dt = kare - ga.baslangic; if (dt < 150) { if (p === ga.kim) { tx = ga.x < 0.5 ? 0.06 : 0.94; ty = ga.biz ? 0.14 : 0.86; if (dt < 12) { tx = p.x; ty = p.y; } } else if (!p.kaleci && ga.kim && p.taraf === ga.kim.taraf && dt > 20) { tx = ga.kim.x + (p.hx - 0.5) * 0.12; ty = ga.kim.y + (p.hy - 0.5) * 0.1; } } else this.golAnim = null; }
      const ox = p.x, oy = p.y, hizK = p.vurgu > 100 ? 0.12 : 0.07; p.x += (tx - p.x) * hizK; p.y += (ty - p.y) * hizK; p.hiz = Math.hypot(p.x - ox, p.y - oy) * 60; p.faz += 0.25 + p.hiz * 4;
    }
    // gölge + oyuncu çizimi (üstten alta sıralı: derinlik hissi)
    const r = Math.max(5 * this.dpr, this.W * 0.0235); const sirali = this.oy.slice().sort((a, b) => a.y - b.y);
    for (const p of sirali) this.oyuncuCiz(cx, p, r);
    // top
    const bx = this.X(t.x), by = this.Y(t.y), br = this.W * 0.013, yuk = Math.sin(Math.min(1, t.h * 40) * Math.PI) * 6 * this.dpr * (t.hh > 0.015 ? 1 : 0.6);
    cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(bx, by + br * 0.5, br, br * 0.45, 0, 0, 7); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(bx, by - yuk, br, 0, 7); cx.fill(); cx.strokeStyle = '#111'; cx.lineWidth = this.dpr; cx.stroke(); cx.fillStyle = '#111'; cx.beginPath(); cx.arc(bx, by - yuk, br * 0.38, 0, 7); cx.fill();
    if (this.flas > 0) { cx.fillStyle = `rgba(255,255,255,${this.flas / 70})`; cx.fillRect(0, 0, this.W, this.H); this.flas--; }
    cx.restore();
  }
  private oyuncuCiz(cx: CanvasRenderingContext2D, p: Oy, r: number): void {
    const x = this.X(p.x), y = this.Y(p.y), d = this.dpr, biz = p.taraf === this.bizT, renk = p.kaleci ? RENK_KALECI[biz ? 0 : 1]! : biz ? this.girdi.bizRenk : this.girdi.rkRenk;
    const adim = Math.sin(p.faz) * Math.min(1, p.hiz * 0.5) * r * 0.35; cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(x, y + r * 0.85, r * 0.85, r * 0.32, 0, 0, 7); cx.fill();
    cx.strokeStyle = '#1b1b1b'; cx.lineWidth = 2.2 * d; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(x - r * 0.3, y + r * 0.5); cx.lineTo(x - r * 0.3 - adim * 0.3, y + r * 0.95 + adim); cx.moveTo(x + r * 0.3, y + r * 0.5); cx.lineTo(x + r * 0.3 + adim * 0.3, y + r * 0.95 - adim); cx.stroke(); // bacaklar
    cx.fillStyle = renk; cx.beginPath(); cx.roundRect(x - r * 0.62, y - r * 0.45, r * 1.24, r * 1.1, r * 0.35); cx.fill(); cx.strokeStyle = 'rgba(0,0,0,.55)'; cx.lineWidth = d; cx.stroke(); // forma
    cx.fillStyle = '#f3c9a0'; cx.beginPath(); cx.arc(x, y - r * 0.72, r * 0.38, 0, 7); cx.fill(); cx.strokeStyle = 'rgba(0,0,0,.5)'; cx.stroke(); // kafa
    if (p.kaleci) { cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(x - r * 0.7, y, r * 0.2, 0, 7); cx.arc(x + r * 0.7, y, r * 0.2, 0, 7); cx.fill(); }
    if (r >= 8 * d) { cx.fillStyle = p.kaleci ? '#111' : '#fff'; cx.font = `800 ${r * 0.7}px sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(String(p.no), x, y + r * 0.1); }
    if (p.ben) { const pr = r * (1.25 + Math.sin(this.kare / 10) * 0.08); cx.strokeStyle = '#ffd54a'; cx.lineWidth = 2.4 * d; cx.beginPath(); cx.arc(x, y, pr, 0, 7); cx.stroke(); cx.fillStyle = '#ffd54a'; cx.font = `900 ${r * 0.62}px sans-serif`; cx.fillText('SEN', x, y - r * 1.65); }
    else if (p.vurgu > 0) { cx.fillStyle = 'rgba(255,255,255,.95)'; cx.font = `800 ${r * 0.6}px sans-serif`; cx.textAlign = 'center'; cx.fillText(p.ad, x, y - r * 1.5); }
    if (p.vurgu > 0) p.vurgu--; cx.textBaseline = 'alphabetic';
  }
}
