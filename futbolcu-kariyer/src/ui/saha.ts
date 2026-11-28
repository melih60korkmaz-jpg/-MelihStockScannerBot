/** Maç sahası çizimi (genel saha kamerası).
 *  - 22 oyuncu simülasyondaki ilk 11'lerle aynıdır; forma/şort/çorap, numara, ten ve saç farklılıkları, koşu/şut/pas/mücadele/sevinç/kaleci animasyonları vardır.
 *  - Top: simülasyonun verdiği gerçek koordinata (olay.top) uçuş animasyonuyla varır; pas/şut hızı, falso, sekme, direkten dönüş, kaleci kurtarışı, saha dışı vardır.
 *  - Kamera: genel görünüm ↔ pozisyona yaklaşma (animasyonlu zoom); oyuncu ve top konumu değişmez.
 *  Statik zemin (çim dokusu, çizgiler, tribün gövdesi) tek tamponda çizilir; her karede yalnızca oyuncu/top/seyirci çizilir. */
import type { Mac, Olay } from '../core/match';
import { KALE_YARI } from '../core/match';
import { SLOT_XY } from '../core/kadro11';
type Anim = { tip: 'sut' | 'pas' | 'mucadele' | 'sevinc' | 'dal' | 'uzgun' | 'kizma' | 'diz'; t: number; sure: number; yon: number };
interface Oy { x: number; y: number; hx: number; hy: number; slot: number; taraf: 0 | 1; ad: string; no: number; ben: boolean; kaleci: boolean; faz: number; hiz: number; vurgu: number; ten: string; sac: string; sacTip: number; boy: number; anim: Anim | null; yz: number }
interface Ucus { x0: number; y0: number; x1: number; y1: number; t: number; T: number; yay: number; egri: number; bitis?: () => void; tip: 'sut' | 'pas' | 'sekme' | 'top' }
export interface SahaGirdi { m: Mac; bizRenk: string; rkRenk: string }
const TENLER = ['#f3c9a0', '#e0a77a', '#c68b5e', '#9b6a45', '#6f4528'], SACLAR = ['#1b1209', '#3b2412', '#6b4423', '#c9a45c', '#222', '#8b2e16'];
const KALECI_RENK: [string, string] = ['#f5a623', '#2ecc71'];
const hex = (s: string): [number, number, number] => { const n = parseInt(s.replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const parlak = (s: string): number => { const [r, g, b] = hex(s); return (r * 299 + g * 587 + b * 114) / 1000; };
const koyu = (s: string, k: number): string => { const [r, g, b] = hex(s); return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`; };
const hsh = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; };
export class Saha {
  W = 0; H = 0; dpr = 1; kare = 0; oy: Oy[] = []; private tampon: HTMLCanvasElement | null = null; private bizT: 0 | 1;
  /** Topun anlık görsel konumu (normalize saha) ve yüksekliği (piksel birimi için 0-1). */
  top = { x: 0.5, y: 0.5, h: 0, sahip: -1 };
  /** Kamera: zoom ve odak noktası (normalize saha). */
  kamera = { z: 1, hz: 1, fx: 0.5, fy: 0.5, hfx: 0.5, hfy: 0.5 };
  private ucuslar: Ucus[] = []; private aktif: Ucus | null = null; private sonOlay: Olay | null = null; private sonSut: { ad: string; x: number; y: number; olay: Olay } | null = null;
  private golAnim: { baslangic: number; biz: boolean; kim: Oy | null; x: number; y: number } | null = null; private titre = 0; private flas = 0; private tribunZipla = [0, 0]; private tribunUzgun = [0, 0]; private bulge: Array<{ yarim: 0 | 1; x: number; t: number }> = []; private kameraFlas: Array<{ x: number; y: number; t: number }> = [];
  private bizRenk2: string; private rkRenk2: string; private desen: [number, number];
  constructor(private girdi: SahaGirdi) {
    const m = girdi.m; this.bizT = m.evde ? 0 : 1; this.bizRenk2 = parlak(girdi.bizRenk) > 150 ? '#1b1f2a' : '#f4f4f4'; this.rkRenk2 = parlak(girdi.rkRenk) > 150 ? '#1b1f2a' : '#f4f4f4'; this.desen = [hsh(girdi.bizRenk) % 4, hsh(girdi.rkRenk) % 4];
    for (const t of [0, 1] as const) m.kadro[t].forEach((o) => { const [sx, dy] = SLOT_XY[o.slot]!, biz = t === this.bizT; const hx = biz ? sx : 1 - sx, hy = biz ? 0.96 - dy * 0.46 : 0.04 + dy * 0.46, h = hsh(o.ad + o.no); this.oy.push({ x: hx, y: hy, hx, hy, slot: o.slot, taraf: t, ad: o.ad, no: o.no, ben: o.ben, kaleci: o.slot === 0, faz: (h % 628) / 100, hiz: 0, vurgu: 0, ten: TENLER[h % TENLER.length]!, sac: SACLAR[(h >> 3) % SACLAR.length]!, sacTip: (h >> 6) % 3, boy: 0.94 + ((h >> 9) % 14) / 100, anim: null, yz: 0 }); });
  }
  boyut(W: number, H: number, dpr: number): void { this.W = W; this.H = H; this.dpr = dpr; this.tampon = null; }
  private get g(): { pl: number; pt: number; pw: number; ph: number; band: number } { const band = this.H * 0.085, pl = this.W * 0.045, pt = band + this.H * 0.025, ph = this.H - 2 * pt, pw = this.W - 2 * pl; return { pl, pt, pw, ph, band }; }
  X = (px: number): number => this.g.pl + px * this.g.pw; Y = (py: number): number => this.g.pt + py * this.g.ph;
  /* ---------------- zemin ---------------- */
  private zeminCiz(): HTMLCanvasElement {
    const c = document.createElement('canvas'); c.width = this.W; c.height = this.H; const x = c.getContext('2d')!, { pl, pt, pw, ph, band } = this.g, W = this.W, H = this.H, d = this.dpr;
    x.fillStyle = '#0d1218'; x.fillRect(0, 0, W, H);
    // tribün: basamaklı beton + koltuk sıraları (perspektif için üstte koyu, altta açık)
    for (const ust of [true, false]) {
      const y0 = ust ? 0 : H - band; const gr = x.createLinearGradient(0, y0, 0, y0 + band); gr.addColorStop(ust ? 0 : 1, '#121823'); gr.addColorStop(ust ? 1 : 0, '#2b3547'); x.fillStyle = gr; x.fillRect(0, y0, W, band);
      for (let i = 0; i < 6; i++) { const yy = y0 + band * (i + 0.5) / 6; x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(0, yy - 1, W, 1.2 * d); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, yy + 1.2 * d, W, 1.2 * d); }
      for (let k = 0; k < 7; k++) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(W * (k + 1) / 8 - 1, y0, 2 * d, band); } // bölüm merdivenleri
      x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, ust ? band - 3 * d : y0, W, 3 * d);
    }
    // reklam panoları
    const ad = ['#c0392b', '#2471a3', '#1e8449', '#d4ac0d', '#7d3c98', '#e67e22']; for (const ust of [true, false]) { const y = ust ? band : H - band - H * 0.022; for (let i = 0; i < 12; i++) { x.fillStyle = ad[i % 6]!; x.fillRect(i * W / 12 + 1, y, W / 12 - 2, H * 0.022); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(i * W / 12 + 4, y + H * 0.008, W / 12 * 0.5, H * 0.005); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(i * W / 12 + 1, y + H * 0.016, W / 12 - 2, H * 0.006); } }
    // çim: şeritli taban, ince çim dokusu (rastgele kısa çizgiler), köşelerde karartma
    const t0 = pt - H * 0.015, t1 = pt + ph + H * 0.015; const gz = x.createLinearGradient(0, t0, 0, t1); gz.addColorStop(0, '#14582b'); gz.addColorStop(0.5, '#1b7336'); gz.addColorStop(1, '#14582b'); x.fillStyle = gz; x.fillRect(0, t0, W, t1 - t0);
    const sh = 14; for (let i = 0; i < sh; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.055)' : 'rgba(0,0,0,.05)'; x.fillRect(0, t0 + (t1 - t0) * i / sh, W, (t1 - t0) / sh); }
    let sd = 1234567; const rnd = (): number => { sd = (Math.imul(sd, 1103515245) + 12345) >>> 0; return sd / 4294967296; }; x.lineWidth = 1 * d;
    for (let i = 0; i < 2600; i++) { const px = rnd() * W, py = t0 + rnd() * (t1 - t0), l = (2 + rnd() * 5) * d; x.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,30,0,.10)'; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - 0.5) * 2 * d, py - l); x.stroke(); }
    const vg = x.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)'); x.fillStyle = vg; x.fillRect(0, t0, W, t1 - t0);
    // çizgiler (hafif parlama + sert çizgi)
    const cizgi = (f: () => void): void => { x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 4.5 * d; f(); x.strokeStyle = 'rgba(255,255,255,.88)'; x.lineWidth = 1.7 * d; f(); };
    cizgi(() => { x.strokeRect(pl, pt, pw, ph); x.beginPath(); x.moveTo(pl, pt + ph / 2); x.lineTo(pl + pw, pt + ph / 2); x.stroke(); x.beginPath(); x.arc(pl + pw / 2, pt + ph / 2, ph * 0.1, 0, 7); x.stroke(); });
    x.fillStyle = '#fff'; x.beginPath(); x.arc(pl + pw / 2, pt + ph / 2, 2.4 * d, 0, 7); x.fill();
    for (const ust of [true, false]) { const yo = ust ? pt : pt + ph, s = ust ? 1 : -1; cizgi(() => { x.strokeRect(pl + pw * 0.2, ust ? yo : yo - ph * 0.15, pw * 0.6, ph * 0.15); x.strokeRect(pl + pw * 0.34, ust ? yo : yo - ph * 0.06, pw * 0.32, ph * 0.06); x.beginPath(); x.arc(pl + pw / 2, yo + s * ph * 0.105, ph * 0.075, ust ? 0.25 * Math.PI : 1.25 * Math.PI, ust ? 0.75 * Math.PI : 1.75 * Math.PI); x.stroke(); for (const cx of [pl, pl + pw]) { x.beginPath(); x.arc(cx, yo, 7 * d, ust ? 0 : Math.PI, ust ? Math.PI / 2 : Math.PI * 1.5, false); x.stroke(); } }); x.fillStyle = '#fff'; x.beginPath(); x.arc(pl + pw / 2, yo + s * ph * 0.105, 2.2 * d, 0, 7); x.fill(); }
    // kale gövdesi (direkler): ağ dinamik çizilir
    return c;
  }
  private kaleCiz(cx: CanvasRenderingContext2D, ust: boolean): void {
    const { pl, pt, pw, ph } = this.g, d = this.dpr, gw = pw * KALE_YARI * 2, gx = pl + pw / 2 - gw / 2, gy = ust ? pt : pt + ph, dep = this.H * 0.026, yon = ust ? -1 : 1, yarim = ust ? 0 : 1;
    cx.save(); cx.fillStyle = 'rgba(0,0,0,.32)'; cx.fillRect(gx, ust ? gy - dep : gy, gw, dep);
    // ağ: yatay + dikey düğümler; gol anında topun girdiği noktada dalga/şişme
    const b = this.bulge.filter((v) => v.yarim === yarim); cx.lineWidth = 1 * d;
    const noktaY = (j: number, i: number): number => { let off = 0; for (const v of b) { const bx = pl + pw * v.x; const dist = Math.abs(gx + gw * i / 12 - bx) / gw; off += Math.max(0, 1 - dist * 3) * Math.sin(v.t / 3) * Math.max(0, 1 - v.t / 70) * 7 * d; } return gy + yon * dep * j / 5 + yon * off * (j / 5); };
    cx.strokeStyle = 'rgba(255,255,255,.55)'; for (let j = 1; j <= 5; j++) { cx.beginPath(); for (let i = 0; i <= 12; i++) { const px = gx + gw * i / 12; i ? cx.lineTo(px, noktaY(j, i)) : cx.moveTo(px, noktaY(j, i)); } cx.stroke(); }
    cx.strokeStyle = 'rgba(255,255,255,.45)'; for (let i = 0; i <= 12; i++) { cx.beginPath(); cx.moveTo(gx + gw * i / 12, gy); for (let j = 1; j <= 5; j++) cx.lineTo(gx + gw * i / 12, noktaY(j, i)); cx.stroke(); }
    cx.strokeStyle = '#f4f4f4'; cx.lineWidth = 3.2 * d; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(gx, gy + yon * dep); cx.lineTo(gx, gy); cx.lineTo(gx + gw, gy); cx.lineTo(gx + gw, gy + yon * dep); cx.stroke(); cx.restore();
  }
  /* ---------------- seyirci ---------------- */
  private seyirci(cx: CanvasRenderingContext2D): void {
    const { band } = this.g, W = this.W, H = this.H, d = this.dpr, n = 44, kare = this.kare;
    for (const ust of [true, false]) {
      const taraf = ust ? 1 : 0, bizMi = ust ? false : true, ana = bizMi ? this.girdi.bizRenk : this.girdi.rkRenk, ikinci = bizMi ? this.bizRenk2 : this.rkRenk2, zip = this.tribunZipla[taraf]!, uz = this.tribunUzgun[taraf]!;
      for (let sira = 0; sira < 4; sira++) for (let i = 0; i < n; i++) {
        const bx = (i + 0.5 + (sira % 2) * 0.5) * W / n, by0 = ust ? band * (0.16 + sira * 0.2) : H - band * (0.16 + sira * 0.2), h = hsh('s' + i + sira + taraf);
        const aktif = zip > 0 && (h % 5 !== 0), ziplama = aktif ? Math.abs(Math.sin(kare / 3 + (h % 7))) * 5 * d : (Math.sin(kare / 16 + (h % 11) + sira) > 0.9 ? 1.4 * d : 0), egil = uz > 0 ? 1.6 * d : 0;
        const forma = (h % 9 === 0) ? '#e8e8e8' : (h % 11 === 0 ? ikinci : ana), by = by0 - ziplama + egil * (ust ? -1 : 1);
        cx.fillStyle = forma; cx.fillRect(bx - W * 0.0075, by, W * 0.015, band * 0.13); cx.fillStyle = TENLER[h % 5]!; cx.beginPath(); cx.arc(bx, by - band * 0.03, W * 0.0052, 0, 7); cx.fill();
        if (aktif && (h % 3 === 0)) { cx.fillStyle = forma; cx.fillRect(bx - W * 0.012, by - band * 0.1 - ziplama * 0.3, W * 0.003, band * 0.09); cx.fillRect(bx + W * 0.009, by - band * 0.1 - ziplama * 0.3, W * 0.003, band * 0.09); } // kalkan kollar
      }
      // bayraklar / atkılar: gol anında dalgalanır
      for (let k = 0; k < 4; k++) { const fx = W * (0.12 + k * 0.25), fy = ust ? band * 0.3 : H - band * 0.3, dal = Math.sin(kare / 5 + k) * (zip > 0 ? 6 : 2) * d; cx.fillStyle = k % 2 ? ana : ikinci; cx.beginPath(); cx.moveTo(fx, fy); cx.lineTo(fx + W * 0.05, fy + dal * 0.5); cx.lineTo(fx + W * 0.045, fy + band * 0.14 + dal); cx.lineTo(fx, fy + band * 0.12); cx.fill(); cx.fillStyle = '#ddd'; cx.fillRect(fx - 1, fy - band * 0.02, 2 * d, band * 0.34); }
    }
    for (let k = 0; k < 2; k++) { this.tribunZipla[k] = Math.max(0, this.tribunZipla[k]! - 1); this.tribunUzgun[k] = Math.max(0, this.tribunUzgun[k]! - 1); }
    // flaş (fotoğraf makineleri)
    for (let i = this.kameraFlas.length - 1; i >= 0; i--) { const f = this.kameraFlas[i]!; f.t--; if (f.t <= 0) { this.kameraFlas.splice(i, 1); continue; } cx.fillStyle = `rgba(255,255,255,${f.t / 8})`; cx.beginPath(); cx.arc(f.x, f.y, 3 * d, 0, 7); cx.fill(); }
  }
  /* ---------------- olaylar ---------------- */
  private oyuncuBul(ad?: string): Oy | undefined { return ad ? this.oy.find((p) => p.ad === ad) : undefined; }
  private kaleciOf(biz: boolean): Oy { return this.oy.find((p) => p.kaleci && (biz ? p.taraf === this.bizT : p.taraf !== this.bizT))!; }
  private enYakin(x: number, y: number, taraf: 0 | 1 | -1, haric?: Oy): Oy | undefined { let b: Oy | undefined, bd = 9; for (const p of this.oy) { if (p === haric || p.kaleci || (taraf >= 0 && p.taraf !== taraf)) continue; const dd = Math.hypot(p.x - x, p.y - y); if (dd < bd) { bd = dd; b = p; } } return b; }
  /** Top uçuşu ekler. yay: yükseklik (0 = yerde); egri: falso (-1..1). */
  private ucus(x1: number, y1: number, T: number, yay: number, egri: number, tip: Ucus['tip'], bitis?: () => void): void { const son = this.ucuslar.length ? this.ucuslar[this.ucuslar.length - 1]! : this.aktif; this.ucuslar.push({ x0: son ? son.x1 : this.top.x, y0: son ? son.y1 : this.top.y, x1, y1, t: 0, T: Math.max(4, T), yay, egri, bitis, tip }); }
  private sekme(x: number, y: number, yon: number, genlik: number): void { for (let i = 0; i < 2; i++) { const k = i ? 0.5 : 1; this.ucus(x + yon * 0.012 * (i + 1), y + yon * 0.02 * (i + 1) * (this.top.y < 0.5 ? 1 : 1), 9, genlik * k, 0, 'sekme'); } }
  /** Her yeni maç olayında çağrılır. */
  olay(o: Olay): void {
    if (o === this.sonOlay) return; this.sonOlay = o; const aktor = this.oyuncuBul(o.kim), tpl = o.top, sutAim = this.sonSut && o.sonuc && o.tur !== 'sut' ? this.sonSut : null;
    if (aktor) aktor.vurgu = 90;
    switch (o.tur) {
      case 'sut': {
        if (o.sonuc && o.sonuc !== 'blok') { // direk / dışarı: topun gerçek varışı
          const dx = o.top!.x, dy = o.top!.y, bas = this.sonSut; const T = 16 + Math.round((1 - (bas?.olay.sut?.guc ?? 0.6)) * 14);
          if (o.sonuc === 'direk') { const yon = o.top!.y < 0.5 ? -1 : 1, px = 0.5 + (dx < 0.5 ? -1 : 1) * KALE_YARI; this.ucus(px, yon < 0 ? 0 : 1, T, 0.02, bas?.olay.sut?.falso ?? 0, 'sut', () => { this.flas = 10; this.titre = 8; cal(0.9); }); this.ucus(dx, dy, 14, 0.015, 0, 'top'); }
          else { const dis = o.top!.y < 0.5 ? -0.05 : 1.05; this.ucus(dx, dis, T, 0.018, bas?.olay.sut?.falso ?? 0, 'sut'); }
          break;
        }
        if (aktor) { aktor.anim = { tip: 'sut', t: 0, sure: 16, yon: aktor.taraf === this.bizT ? -1 : 1 }; const orijin = { x: Math.min(0.95, Math.max(0.05, aktor.x)), y: aktor.y }; const yakin = Math.hypot(this.top.x - orijin.x, this.top.y - orijin.y); this.ucus(orijin.x, tpl ? tpl.y : orijin.y, Math.round(8 + yakin * 40), 0.004, 0, 'pas'); this.sonSut = { ad: aktor.ad, x: tpl?.x ?? orijin.x, y: tpl?.y ?? orijin.y, olay: o }; }
        else if (tpl) { this.ucus(tpl.x, tpl.y, 14, 0.004, 0, 'pas'); this.sonSut = { ad: o.kim ?? '', x: tpl.x, y: tpl.y, olay: o }; }
        if (o.metin.includes('blok') || o.metin.includes('Blok')) { const sav = this.enYakin(this.top.x, this.top.y, this.oy.find((p) => p.ad === o.kim) ? (1 - (this.oy.find((p) => p.ad === o.kim)!.taraf)) as 0 | 1 : -1); if (sav) { sav.anim = { tip: 'mucadele', t: 0, sure: 14, yon: 0 }; this.ucus(sav.x, sav.y, 8, 0.01, 0, 'sut'); this.ucus(o.top!.x, o.top!.y, 12, 0.02, 0, 'top'); } }
        return;
      }
      case 'gol': {
        const biz = o.biz === true, bas = sutAim, T = 11 + Math.round((1 - (bas?.olay.sut?.guc ?? 0.65)) * 18), gx = o.top!.x, gy = biz ? 0 : 1, falso = bas?.olay.sut?.falso ?? 0;
        const yarim: 0 | 1 = biz ? 0 : 1, k = this.kaleciOf(biz === true ? false : true);
        if (k) { k.anim = { tip: 'dal', t: 0, sure: 30, yon: gx < 0.5 ? -1 : 1 }; k.vurgu = 70; }
        this.ucus(gx, gy, T, 0.012, falso, 'sut', () => { this.bulge.push({ yarim, x: gx, t: 0 }); this.titre = 26; this.flas = 14; });
        this.ucus(gx, biz ? -0.014 : 1.014, 8, 0, 0, 'top');
        const takim: 0 | 1 = biz ? this.bizT : ((1 - this.bizT) as 0 | 1), skor = aktor ?? this.oy.find((p) => p.taraf === takim && p.slot >= 9) ?? null;
        this.golAnim = { baslangic: this.kare + T, biz, kim: skor, x: gx, y: gy }; this.titre = 0;
        this.tribunZipla[biz ? 1 : 0] = 0; /* skor atan takımın taraftarı: bizim tribün (alt) = bizim gol */ this.tribunZipla[biz ? 0 : 1] = 170; this.tribunUzgun[biz ? 1 : 0] = 130;
        for (let i = 0; i < 6; i++) this.kameraFlas.push({ x: Math.random() * this.W, y: (biz ? this.H * 0.93 : this.H * 0.04) + Math.random() * this.H * 0.04, t: 8 + Math.round(Math.random() * 20) });
        if (skor) skor.vurgu = 170; break;
      }
      case 'kurtaris': {
        const biz = o.biz === true, k = this.kaleciOf(biz), bas = this.sonSut, aim = bas?.olay.sut, yon = aim ? (aim.x < 0 ? -1 : 1) : (k.x < 0.5 ? -1 : 1), T = 12 + Math.round((1 - (aim?.guc ?? 0.6)) * 14);
        const hx = Math.min(0.5 + KALE_YARI * 0.95, Math.max(0.5 - KALE_YARI * 0.95, 0.5 + (aim ? aim.x * KALE_YARI : 0)));
        this.ucus(hx, biz ? 0.985 : 0.015, T, 0.012, aim?.falso ?? 0, 'sut', () => { k.anim = { tip: 'dal', t: 0, sure: 26, yon }; k.vurgu = 80; this.titre = 6; });
        this.ucus(o.top!.x, o.top!.y, 10, 0.012, 0, 'top'); if (k) { k.anim = { tip: 'dal', t: 0, sure: 30, yon }; } break;
      }
      case 'korner': this.ucus(o.top!.x, o.top!.y, 22, 0.02, 0.3, 'pas'); break;
      case 'penalti': this.ucus(o.top!.x, o.top!.y, 18, 0, 0, 'pas'); break;
      case 'serbest': this.ucus(o.top!.x, o.top!.y, 18, 0, 0, 'pas'); break;
      case 'mudahale': { const sav = this.enYakin(o.top!.x, o.top!.y, o.biz === false ? this.bizT : ((1 - this.bizT) as 0 | 1)); if (sav) sav.anim = { tip: 'mucadele', t: 0, sure: 22, yon: sav.taraf === this.bizT ? -1 : 1 }; this.ucus(o.top!.x, o.top!.y, 10, 0.004, 0, 'pas'); break; }
      case 'faul': case 'kart': case 'ofsayt': { const sav = this.enYakin(this.top.x, this.top.y, -1); if (sav) sav.anim = { tip: 'kizma', t: 0, sure: 40, yon: 0 }; this.ucus(o.top!.x, o.top!.y, 20, 0, 0, 'pas'); break; }
      case 'pas': { const T = Math.round(8 + Math.hypot(o.top!.x - this.top.x, o.top!.y - this.top.y) * 50); const uzun = T > 28; if (aktor) aktor.anim = { tip: 'pas', t: 0, sure: 12, yon: aktor.taraf === this.bizT ? -1 : 1 }; this.ucus(o.top!.x, o.top!.y, T, uzun ? 0.04 : 0.006, 0.15, 'pas', uzun ? () => this.sekme(o.top!.x, o.top!.y, o.biz === false ? 1 : -1, 0.01) : undefined); break; }
      case 'atak': case 'dripling': { const T = Math.round(12 + Math.hypot(o.top!.x - this.top.x, o.top!.y - this.top.y) * 70); this.ucus(o.top!.x, o.top!.y, T, 0.002, 0, 'pas'); break; }
      default: if (o.top) { /* diğer olaylarda top sakin ilerler */ const dd = Math.hypot(o.top.x - this.top.x, o.top.y - this.top.y); if (dd > 0.01) this.ucus(o.top.x, o.top.y, Math.round(14 + dd * 50), 0.002, 0, 'pas'); }
    }
    void sutAim;
  }
  /** Kamerayı pozisyona yaklaştırır (z > 1) ya da genel görünüme döndürür (z = 1). Oyuncu ve top konumları değişmez. */
  yakinla(z: number, fx = 0.5, fy = 0.5): void { this.kamera.hz = z; this.kamera.hfx = fx; this.kamera.hfy = fy; }
  /** Pozisyon görünümü için gerçek yakın çevre: odak noktasına en yakın savunmacılar, kaleci ve takım arkadaşları (normalize koordinatlarla). */
  yakinCevre(odakBiz: boolean): { kaleci: { x: number; y: number; ad: string; no: number }; savunma: Array<{ x: number; y: number; ad: string; no: number }>; takim: Array<{ x: number; y: number; ad: string; no: number }> } {
    const hucum: 0 | 1 = odakBiz ? this.bizT : ((1 - this.bizT) as 0 | 1), sav: 0 | 1 = (1 - hucum) as 0 | 1, bx = this.top.x, by = this.top.y; const kal = this.kaleciOf(odakBiz) ?? this.oy[0]!;
    const sirala = (t: 0 | 1, haric?: Oy): Oy[] => this.oy.filter((p) => p.taraf === t && !p.kaleci && p !== haric).sort((a, b) => Math.hypot(a.x - bx, a.y - by) - Math.hypot(b.x - bx, b.y - by));
    const f = (p: Oy) => ({ x: p.x, y: p.y, ad: p.ad, no: p.no }); return { kaleci: f(kal), savunma: sirala(sav).slice(0, 4).map(f), takim: sirala(hucum).slice(1, 4).map(f) };
  }
  /** Pozisyon görünümlerinde aynı silüet stiliyle bir futbolcu çizer (ekran koordinatı). taraf: 'biz' (sırtı bize, forma numarası arkada) ya da 'rakip' (önden). */
  figur(cx: CanvasRenderingContext2D, x: number, y: number, r: number, o: { biz: boolean; kaleci?: boolean; no?: number; ad?: string; ben?: boolean; faz?: number; hiz?: number; ten?: string; sac?: string; etiket?: string }): void {
    const h = hsh((o.ad ?? 'x') + (o.no ?? 0)), p: Oy = { x: 0, y: 0, hx: 0, hy: 0, slot: 1, taraf: o.biz ? this.bizT : ((1 - this.bizT) as 0 | 1), ad: o.ad ?? '', no: o.no ?? 0, ben: !!o.ben, kaleci: !!o.kaleci, faz: o.faz ?? this.kare * 0.2, hiz: o.hiz ?? 0, vurgu: o.etiket ? 1 : 0, ten: o.ten ?? TENLER[h % 5]!, sac: o.sac ?? SACLAR[(h >> 3) % 6]!, sacTip: (h >> 6) % 3, boy: 1, anim: null, yz: 0 };
    this.oyuncuCiz(cx, p, r, x, y);
  }
  /** Topun anlık görsel konumuna yakın olan, şutu çekecek oyuncu (kendimiz ya da en yakın hücumcu). */
  private adim(p: Oy, tx: number, ty: number, k: number): void { const ox = p.x, oy = p.y; p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; p.hiz = Math.hypot(p.x - ox, p.y - oy) * 60; p.faz += 0.22 + Math.min(1.2, p.hiz * 5); }
  /* ---------------- çizim ---------------- */
  ciz(cx: CanvasRenderingContext2D, kare: number): void {
    this.kare = kare; if (!this.W) return; this.tampon ??= this.zeminCiz(); const K = this.kamera; K.z += (K.hz - K.z) * 0.12; K.fx += (K.hfx - K.fx) * 0.12; K.fy += (K.hfy - K.fy) * 0.12; cx.save();
    if (this.titre > 0) { cx.translate((Math.random() - 0.5) * this.titre * 0.18 * this.dpr, (Math.random() - 0.5) * this.titre * 0.18 * this.dpr); this.titre--; }
    if (K.z > 1.001) { const fxp = this.X(K.fx), fyp = this.Y(K.fy); const tx = Math.min(0, Math.max(this.W - this.W * K.z, this.W / 2 - fxp * K.z)), ty = Math.min(0, Math.max(this.H - this.H * K.z, this.H / 2 - fyp * K.z)); cx.translate(tx, ty); cx.scale(K.z, K.z); }
    cx.drawImage(this.tampon, 0, 0); this.seyirci(cx); this.kaleCiz(cx, true); this.kaleCiz(cx, false); for (const b of this.bulge) b.t++; this.bulge = this.bulge.filter((b) => b.t < 80);
    this.topuIlerlet(); const t = this.top; const ga = this.golAnim;
    for (const p of this.oy) {
      let tx = p.hx, ty: number; const biz = p.taraf === this.bizT;
      if (p.kaleci) { ty = p.hy + (t.y - 0.5) * 0.06; tx = p.hx + (t.x - 0.5) * 0.2; } else { const cek = p.slot >= 9 ? 0.42 : p.slot >= 5 ? 0.36 : 0.3; ty = p.hy + (t.y - 0.5) * cek; tx = p.hx + (t.x - 0.5) * 0.14; const dx = t.x - p.x, dy = t.y - p.y, uz = Math.hypot(dx, dy); if (uz < 0.16 && uz > 0.001) { tx = p.x + dx * 0.45; ty = p.y + dy * 0.45; } }
      if (p.anim?.tip === 'mucadele' && p.anim.t < p.anim.sure * 0.7) { tx = t.x; ty = t.y; }
      if (ga) { const dt = kare - ga.baslangic; if (dt > -2 && dt < 190) { if (dt >= 0) { if (p === ga.kim) { if (dt < 10) { /* top ağda: bekle */ tx = p.x; ty = p.y; } else { tx = ga.x < 0.5 ? 0.07 : 0.93; ty = ga.biz ? 0.12 : 0.88; if (!p.anim && dt > 70) p.anim = { tip: 'sevinc', t: 0, sure: 90, yon: 0 }; if (dt > 55 && !p.anim) p.anim = { tip: 'diz', t: 0, sure: 40, yon: ga.x < 0.5 ? -1 : 1 }; } } else if (!p.kaleci && ga.kim && p.taraf === ga.kim.taraf && dt > 14) { tx = ga.kim.x + (p.hx - 0.5) * 0.12; ty = ga.kim.y + (p.hy - 0.5) * 0.1; if (dt > 60 && !p.anim) p.anim = { tip: 'sevinc', t: 0, sure: 80, yon: 0 }; } else if (p.taraf !== ga.kim?.taraf && dt > 8 && !p.anim && (p.kaleci || p.slot < 5)) p.anim = { tip: 'uzgun', t: 0, sure: 100, yon: 0 }; } } else if (dt >= 190) this.golAnim = null; }
      this.adim(p, tx, ty, p.vurgu > 100 ? 0.12 : 0.07); void biz;
    }
    const r = Math.max(5 * this.dpr, this.W * 0.0215); const sirali = this.oy.slice().sort((a, b) => a.y - b.y); for (const p of sirali) this.oyuncuCiz(cx, p, r);
    // top: gölge + parabolik yükseklik + dönüş
    const bx = this.X(t.x), by = this.Y(t.y), br = this.W * 0.0125, yuk = t.h * this.H * 1.4; cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(bx, by + br * 0.4, br * (1 - Math.min(0.4, yuk / 80)), br * 0.42, 0, 0, 7); cx.fill();
    cx.save(); cx.translate(bx, by - yuk - br * 0.2); cx.rotate(this.kare * 0.35 * (this.aktif ? 1 : 0)); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(0, 0, br, 0, 7); cx.fill(); cx.strokeStyle = '#222'; cx.lineWidth = this.dpr; cx.stroke(); cx.fillStyle = '#222'; cx.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.2566; cx.lineTo(Math.cos(a) * br * 0.9, Math.sin(a) * br * 0.9); } cx.fill(); cx.beginPath(); cx.arc(0, 0, br * 0.4, 0, 7); cx.fill(); cx.restore();
    if (this.flas > 0) { cx.fillStyle = `rgba(255,255,255,${this.flas / 90})`; cx.fillRect(0, 0, this.W, this.H); this.flas--; }
    cx.restore();
  }
  /** Top fiziği: ucuş kuyruğunu adım adım ilerletir; her uçuş sonunda top tam hedef koordinatta durur. */
  private topuIlerlet(): void {
    const t = this.top; if (!this.aktif) { this.aktif = this.ucuslar.shift() ?? null; if (this.aktif) { this.aktif.x0 = t.x; this.aktif.y0 = t.y; } }
    // çok uzun kuyruk birikirse hızlandır (hızlı bitir / yüksek hız)
    const hizK = this.ucuslar.length > 4 ? 3 : this.ucuslar.length > 2 ? 2 : 1;
    for (let it = 0; it < hizK && this.aktif; it++) {
      const u = this.aktif; u.t++; let s = Math.min(1, u.t / u.T); const e = u.tip === 'sut' ? 1 - Math.pow(1 - s, 1.6) : u.tip === 'sekme' ? s : 1 - Math.pow(1 - s, 2.2); s = e;
      const dx = u.x1 - u.x0, dy = u.y1 - u.y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, egri = u.egri * Math.sin(Math.PI * e) * L * 0.22; t.x = u.x0 + dx * s + nx * egri; t.y = u.y0 + dy * s + ny * egri; t.h = u.yay * Math.sin(Math.PI * Math.min(1, u.t / u.T)) * (u.tip === 'sut' ? 1.6 : 1);
      if (u.t >= u.T) { t.x = u.x1; t.y = u.y1; t.h = 0; u.bitis?.(); this.aktif = this.ucuslar.shift() ?? null; if (this.aktif) { this.aktif.x0 = t.x; this.aktif.y0 = t.y; } }
    }
    if (!this.aktif) t.h = 0;
  }
  /** Genel kamerada görünen top sakin mi (tüm uçuşlar bitti)? */
  get topDurgun(): boolean { return !this.aktif && this.ucuslar.length === 0; }
  oyuncuCiz(cx: CanvasRenderingContext2D, p: Oy, r: number, sx?: number, sy?: number): void {
    const x = sx ?? this.X(p.x), y = sy ?? this.Y(p.y), d = this.dpr, biz = p.taraf === this.bizT, ana = p.kaleci ? KALECI_RENK[biz ? 0 : 1]! : biz ? this.girdi.bizRenk : this.girdi.rkRenk, ikinci = biz ? this.bizRenk2 : this.rkRenk2, desen = this.desen[biz ? 0 : 1]!;
    const a = p.anim; let ay = 0, aci = 0, kol = 0, bacak = 0, sut = 0, atlama = 0, egil = 0; if (a) { a.t++; const s = a.t / a.sure; if (a.t >= a.sure) p.anim = null; else switch (a.tip) {
      case 'sut': case 'pas': sut = Math.sin(Math.min(1, s * 1.4) * Math.PI) * (a.tip === 'sut' ? 1 : 0.6); egil = -sut * 0.12 * a.yon; break;
      case 'mucadele': aci = a.yon * Math.sin(s * Math.PI) * 0.9; ay = Math.sin(s * Math.PI) * r * 0.3; bacak = 1; break;
      case 'sevinc': kol = 1; atlama = Math.abs(Math.sin(s * Math.PI * 4)) * r * 0.9; break;
      case 'diz': aci = a.yon * Math.min(1, s * 3) * 1.2; ay = Math.min(1, s * 3) * r * 0.9; kol = 1; break;
      case 'dal': { const e = Math.sin(Math.min(1, s * 1.6) * Math.PI * 0.5); aci = a.yon * e * 1.25; ay = e * r * 0.7; atlama = Math.sin(Math.min(1, s * 2) * Math.PI) * r * 0.7; break; }
      case 'uzgun': egil = 0.25; ay = r * 0.15; break;
      case 'kizma': kol = 0.6; egil = Math.sin(a.t / 4) * 0.08; break;
    } }
    const kosu = Math.min(1, p.hiz * 5), yuz = biz ? -1 : 1; // ters: bizim takım yukarı bakar (sırtı bize), rakip aşağı bakar
    cx.save(); cx.translate(x, y - atlama); cx.fillStyle = 'rgba(0,0,0,.34)'; cx.beginPath(); cx.ellipse(0, r * 0.2 + atlama * 0.5, r * 0.85, r * 0.3, 0, 0, 7); cx.fill(); cx.translate(0, ay * 0.4); cx.rotate(aci + egil); const h = r * 3.1 * p.boy, u = h / 3.1;
    const adim = Math.sin(p.faz) * kosu;
    // bacaklar
    const bacakCiz = (ox: number, sw: number, vur: number): void => { const fx = ox + vur * u * 0.9 * yuz * -1 * 0, fy = -u * 0.05 + Math.max(0, -sw) * u * 0.35, kx = ox, ky = -u * 0.95; cx.lineCap = 'round'; cx.strokeStyle = p.kaleci ? ikinci : ana; cx.lineWidth = u * 0.38; cx.beginPath(); cx.moveTo(kx, -u * 1.25); cx.lineTo(kx + vur * u * 0.2, ky + u * 0.1); cx.stroke(); cx.strokeStyle = TENLER[0]!; cx.strokeStyle = p.kaleci ? ana : ana; cx.lineWidth = u * 0.3; cx.beginPath(); cx.moveTo(kx + vur * u * 0.2, ky + u * 0.1); cx.lineTo(fx + sw * u * 0.1 + vur * u * 0.4, fy - u * 0.2 + sw * u * 0.35); cx.stroke(); cx.fillStyle = '#151515'; cx.beginPath(); cx.ellipse(fx + sw * u * 0.1 + vur * u * 0.45, fy + sw * u * 0.35, u * 0.22, u * 0.13, 0, 0, 7); cx.fill(); };
    // çorap rengi: forma ana rengi; şort ikinci renk
    bacakCiz(-u * 0.26, bacak ? 0.3 : adim, a?.tip === 'sut' || a?.tip === 'pas' ? 0 : 0); bacakCiz(u * 0.26, bacak ? -0.2 : -adim, sut * yuz * -1);
    // şort
    cx.fillStyle = p.kaleci ? '#14171d' : ikinci; cx.beginPath(); cx.roundRect(-u * 0.55, -u * 1.55, u * 1.1, u * 0.7, u * 0.18); cx.fill();
    // gövde
    cx.save(); cx.beginPath(); cx.roundRect(-u * 0.62, -u * 2.5, u * 1.24, u * 1.12, u * 0.3); cx.clip(); cx.fillStyle = ana; cx.fillRect(-u, -u * 2.6, u * 2, u * 1.4);
    if (!p.kaleci) { cx.fillStyle = ikinci; cx.globalAlpha = 0.9; if (desen === 1) for (let i = -2; i <= 2; i += 2) cx.fillRect(-u * 0.62 + (i + 2) * u * 0.31, -u * 2.6, u * 0.31, u * 1.4); else if (desen === 2) for (let j = 0; j < 4; j += 2) cx.fillRect(-u, -u * 2.5 + j * u * 0.28, u * 2, u * 0.28); else if (desen === 3) { cx.fillRect(-u * 0.12, -u * 2.6, u * 0.24, u * 1.4); } cx.globalAlpha = 1; }
    cx.restore(); cx.strokeStyle = 'rgba(0,0,0,.45)'; cx.lineWidth = d; cx.beginPath(); cx.roundRect(-u * 0.62, -u * 2.5, u * 1.24, u * 1.12, u * 0.3); cx.stroke();
    // kollar
    const kolSw = Math.sin(p.faz + 3.14) * kosu * 0.5; for (const sg of [-1, 1] as const) { const ey = kol ? -u * 3.0 - Math.sin(this.kare / 3 + sg) * u * 0.15 : -u * 1.55 + sg * kolSw * u * 0.35, ex = sg * (u * (kol ? 0.75 : 0.88)); cx.strokeStyle = p.kaleci ? ana : ana; cx.lineWidth = u * 0.3; cx.beginPath(); cx.moveTo(sg * u * 0.58, -u * 2.35); cx.lineTo(ex, kol ? -u * 2.95 : ey - u * 0.2); cx.stroke(); cx.fillStyle = p.kaleci ? '#fff' : p.ten; cx.beginPath(); cx.arc(ex, kol ? -u * 3.0 : ey, u * (p.kaleci ? 0.22 : 0.16), 0, 7); cx.fill(); }
    // numara
    if (r >= 8 * d) { cx.fillStyle = p.kaleci ? ikinci : ikinci === '#f4f4f4' ? '#f4f4f4' : '#fff'; cx.font = `800 ${u * (biz ? 0.62 : 0.45)}px sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(String(p.no), 0, -u * (biz ? 1.95 : 2.1)); }
    // kafa + saç (bizimki arkadan: saç kaplar; rakip önden: yüz)
    cx.fillStyle = p.ten; cx.beginPath(); cx.arc(0, -u * 2.82, u * 0.42, 0, 7); cx.fill(); cx.fillStyle = p.sac; cx.beginPath(); if (biz) cx.arc(0, -u * 2.86, u * 0.43, Math.PI * 0.05, Math.PI * 0.95, true); else cx.arc(0, -u * 2.93, u * 0.43, Math.PI, Math.PI * 2); cx.fill(); if (p.sacTip === 1 && !biz) { cx.fillRect(-u * 0.43, -u * 2.93, u * 0.86, u * 0.14); }
    if (!biz) { cx.fillStyle = '#222'; cx.fillRect(-u * 0.2, -u * 2.82, u * 0.08, u * 0.08); cx.fillRect(u * 0.12, -u * 2.82, u * 0.08, u * 0.08); }
    cx.restore();
    if (p.ben) { const pr = r * (1.45 + Math.sin(this.kare / 10) * 0.07); cx.strokeStyle = '#ffd54a'; cx.lineWidth = 2.2 * d; cx.beginPath(); cx.ellipse(x, y + r * 0.2, pr, pr * 0.38, 0, 0, 7); cx.stroke(); cx.fillStyle = '#ffd54a'; cx.font = `900 ${r * 0.62}px sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic'; cx.fillText('SEN', x, y - h - r * 0.1); cx.beginPath(); cx.moveTo(x - r * 0.25, y - h + r * 0.05); cx.lineTo(x + r * 0.25, y - h + r * 0.05); cx.lineTo(x, y - h + r * 0.35); cx.fill(); }
    else if (p.vurgu > 0) { cx.fillStyle = 'rgba(255,255,255,.95)'; cx.font = `800 ${r * 0.55}px sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic'; cx.fillText(p.ad, x, y - h - r * 0.1); }
    if (p.vurgu > 0) p.vurgu--; cx.textBaseline = 'alphabetic';
  }
}
let cal = (_: number): void => { /* ses için kanca */ };
export function sahaSesKancasi(f: (v: number) => void): void { cal = f; }
