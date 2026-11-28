/** Dünya sıralaması ve yapay zekâ kulüplerarası transferleri. Kadro oyuncularının `ovr` değeri yoksa kulüp gücü ve hücum değerinden türetilir. */
import type { Game, Futbolcu } from './game';
import { genel, haberEkle, kisaAd, ulkeOf } from './game';
import { sirala } from './world';
import { ULKELER, ulkeGuc, milliyetOf } from './ekmac';
import { Rng, clamp } from './rng';
export const ovrTureT = (g: Game, f: Futbolcu): number => clamp(Math.round(28 + (g.kulupler[f.kulup]?.guc ?? 0.5) * 45 + (f.hucum - 1) * 6 + (f.yas > 29 ? -1 : 0)), 25, 92);
export const ovrOf = (g: Game, f: Futbolcu): number => f.ovr ?? ovrTureT(g, f);
export interface SiraSatiri { ad: string; kulup: string; ovr: number; yas: number; ben: boolean; gol: number; puan: number; sira: number; ulke: string }
export interface Puanlar { ovr: number; performans: number; golAsist: number; kupa: number; kulup: number; milli: number; itibar: number; toplam: number }
/** Ağırlıklar: toplam 1. Dünya puanı 0-100. */
export const AGIRLIK = { ovr: 0.42, performans: 0.14, golAsist: 0.12, kupa: 0.08, kulup: 0.09, milli: 0.07, itibar: 0.08 } as const;
const n01 = (v: number, a: number, b: number): number => clamp(((v - a) / (b - a)) * 100, 0, 100);
const toplamla = (p: Omit<Puanlar, 'toplam'>): Puanlar => ({ ...p, toplam: +(p.ovr * AGIRLIK.ovr + p.performans * AGIRLIK.performans + p.golAsist * AGIRLIK.golAsist + p.kupa * AGIRLIK.kupa + p.kulup * AGIRLIK.kulup + p.milli * AGIRLIK.milli + p.itibar * AGIRLIK.itibar).toFixed(2) });
/** Kulüp başarısı: güç (%60) + lig sırası (%40). */
function kulupSira(g: Game): Map<number, number> { const m = new Map<number, number>(); for (const l of g.ligler) sirala(l).forEach((r, i) => m.set(r.id, i)); return m; }
const kulupBasari = (g: Game, id: number, sira: Map<number, number>): number => clamp((g.kulupler[id]?.guc ?? 0.5) * 100 * 0.6 + (1 - (sira.get(id) ?? 6) / 11) * 40, 0, 100);
const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; };
/** Yapay zekâ oyuncusunun ülkesi: çoğunlukla oynadığı ülkeden, kalanı hash'e göre seçilir (kayıtta tutulmaz, hep aynıdır). */
export const ulkeAI = (g: Game, f: Futbolcu): string => { const h = hash(f.ad), yerel = ulkeOf(g, f.kulup); return h % 10 < 6 && ULKELER.some((u) => u[0] === yerel) ? yerel : ULKELER[h % ULKELER.length]![0]; };
/** Yapay zekâ oyuncusu puanları. Performans: maç başına gol/asist katkısı + takımın durumu. */
export function puanAI(g: Game, f: Futbolcu, sira: Map<number, number>): Puanlar {
  const ovr = ovrOf(g, f), mac = Math.max(1, f.mac), katki = (f.gol + f.asist * 0.6) / mac, kb = kulupBasari(g, f.kulup, sira), ulke = ulkeAI(g, f), cap = f.milliCap ?? 0;
  return toplamla({ ovr: n01(ovr, 30, 85), performans: clamp(n01(ovr, 30, 85) * 0.5 + n01(katki, 0, 0.9) * 0.3 + kb * 0.2, 0, 100), golAsist: n01(f.gol + f.asist * 0.6, 0, 22), kupa: n01(f.kupa ?? 0, 0, 6), kulup: kb, milli: clamp(ulkeGuc(ulke) * 60 + Math.min(40, cap * 1.5), 0, 100), itibar: clamp(kb * 0.5 + n01(ovr, 30, 85) * 0.5, 0, 100) });
}
/** Oyuncunun kendi puanları: tamamen oyun içi başarıya bağlıdır. */
export function puanBen(g: Game): Puanlar {
  const son = g.maclar.slice(0, 10).filter((m) => m.oynadi), ort = son.length ? son.reduce((t, m) => t + m.puan, 0) / son.length : 6, sira = kulupSira(g), kupa = g.stat.kupa + (g.milli.unvan ?? 0) + (g.kupa?.sampiyon === g.kulup ? 1 : 0);
  const gol = g.sezonStat.gol + (g.milli.gol ?? 0) * 0.2, asist = g.sezonStat.asist + (g.milli.asist ?? 0) * 0.2;
  return toplamla({ ovr: n01(genel(g), 30, 85), performans: n01(ort, 5, 8.5), golAsist: n01(gol + asist * 0.6, 0, 22), kupa: n01(kupa, 0, 6), kulup: kulupBasari(g, g.kulup, sira), milli: clamp(ulkeGuc(milliyetOf(g)) * 60 + Math.min(40, g.milli.cap * 1.5 + (g.milli.unvan ?? 0) * 15), 0, 100), itibar: clamp(g.itibar, 0, 100) });
}
/** Dünya sıralaması: puanlara göre sıralanmış en iyi oyuncular + oyuncunun sırası. */
export function dunyaSiralamasi(g: Game, n = 20): { liste: SiraSatiri[]; benimSiram: number; toplam: number; benim: Puanlar } {
  const sira = kulupSira(g), benim = puanBen(g);
  const hepsi: SiraSatiri[] = g.kadro.map((f) => ({ ad: f.ad, kulup: kisaAd(g, f.kulup), ovr: ovrOf(g, f), yas: f.yas, ben: false, gol: f.gol, puan: puanAI(g, f, sira).toplam, sira: 0, ulke: ulkeAI(g, f) }));
  hepsi.push({ ad: g.ad, kulup: kisaAd(g, g.kulup), ovr: genel(g), yas: g.oyuncu.yas, ben: true, gol: g.sezonStat.gol, puan: benim.toplam, sira: 0, ulke: milliyetOf(g) });
  hepsi.sort((a, b) => b.puan - a.puan || (a.ben ? -1 : 1)); hepsi.forEach((x, i) => { x.sira = i + 1; }); return { liste: hepsi.slice(0, n), benimSiram: hepsi.findIndex((x) => x.ben) + 1, toplam: hepsi.length, benim };
}
/** Haftalık güncelleme: sıra geçmişi (son 8 hafta) tutulur; sezon sonunda kalıcı kayıt eklenir. */
export function dunyaGuncelle(g: Game, sezonSonu = false): void {
  const d = dunyaSiralamasi(g, 1); g.dunyaSira = d.benimSiram; (g.dunyaIz ??= []).push(d.benimSiram); if (g.dunyaIz.length > 9) g.dunyaIz.shift();
  if (sezonSonu) (g.dunyaGecmis ??= []).push({ sezon: g.sezon, sira: d.benimSiram, puan: d.benim.toplam });
}
/** Son haftalara göre değişim: pozitif = yükseldi. */
export const dunyaDegisim = (g: Game): number => { const iz = g.dunyaIz ?? []; return iz.length >= 2 ? iz[0]! - iz[iz.length - 1]! : 0; };
/** Tüm liglerde gol krallığı (bu sezon). */
export function dunyaGolKrali(g: Game, n = 10): SiraSatiri[] {
  const hepsi: SiraSatiri[] = g.kadro.map((f) => ({ ad: f.ad, kulup: kisaAd(g, f.kulup), ovr: ovrOf(g, f), yas: f.yas, ben: false, gol: f.gol, puan: 0, sira: 0, ulke: '' }));
  hepsi.push({ ad: g.ad, kulup: kisaAd(g, g.kulup), ovr: genel(g), yas: g.oyuncu.yas, ben: true, gol: g.sezonStat.gol, puan: 0, sira: 0, ulke: '' }); return hepsi.sort((a, b) => b.gol - a.gol).slice(0, n);
}
/** Sezon sonu: oyuncular gelişir/yaşlanır, güçlü kulüpler küçük kulüplerin en iyilerini alır (takaslı). Haber döner. */
export function yzTransferleri(g: Game, rng: Rng): string[] {
  for (const f of g.kadro) { const o = ovrOf(g, f); f.ovr = clamp(o + (f.yas < 23 ? rng.int(0, 3) : f.yas < 29 ? rng.int(-1, 1) : -rng.int(0, 2)), 25, 92); }
  const haber: string[] = [], sirali = g.kulupler.slice().sort((a, b) => b.guc - a.guc);
  for (let i = 0; i < 40 && haber.length < 8; i++) {
    const alici = sirali[rng.int(0, 17)]!, verici = g.kulupler[rng.int(0, g.kulupler.length - 1)]!;
    if (alici.id === verici.id || verici.guc > alici.guc - 0.08 || alici.id === g.kulup || verici.id === g.kulup) continue;
    const vk = g.kadro.filter((f) => f.kulup === verici.id).sort((a, b) => ovrOf(g, b) - ovrOf(g, a)), ak = g.kadro.filter((f) => f.kulup === alici.id).sort((a, b) => ovrOf(g, a) - ovrOf(g, b));
    const yildiz = vk[0], takas = ak[0]; if (!yildiz || !takas || ovrOf(g, yildiz) < ovrOf(g, takas) - 2) continue;
    yildiz.kulup = alici.id; takas.kulup = verici.id; alici.guc = +clamp(alici.guc + 0.006, 0.2, 0.97).toFixed(3); verici.guc = +clamp(verici.guc - 0.006, 0.2, 0.97).toFixed(3);
    haber.push(`${yildiz.ad} (${ovrOf(g, yildiz)}) ${kisaAd(g, verici.id)} → ${kisaAd(g, alici.id)}`);
  }
  if (haber.length) haberEkle(g, `Transfer dünyası: ${haber.slice(0, 3).join('; ')}${haber.length > 3 ? ` ve ${haber.length - 3} transfer daha` : ''}.`, 'dunya');
  return haber;
}
