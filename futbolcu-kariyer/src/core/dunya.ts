/** Dünya sıralaması ve yapay zekâ kulüplerarası transferleri. Kadro oyuncularının `ovr` değeri yoksa kulüp gücü ve hücum değerinden türetilir. */
import type { Game, Futbolcu } from './game';
import { genel, haberEkle, kisaAd } from './game';
import { Rng, clamp } from './rng';
export const ovrTureT = (g: Game, f: Futbolcu): number => clamp(Math.round(28 + (g.kulupler[f.kulup]?.guc ?? 0.5) * 45 + (f.hucum - 1) * 6 + (f.yas > 29 ? -1 : 0)), 25, 92);
export const ovrOf = (g: Game, f: Futbolcu): number => f.ovr ?? ovrTureT(g, f);
export interface SiraSatiri { ad: string; kulup: string; ovr: number; yas: number; ben: boolean; gol: number }
/** En iyi oyuncular: yapay zekâ kadrosu + oyuncunun kendisi. */
export function dunyaSiralamasi(g: Game, n = 20): { liste: SiraSatiri[]; benimSiram: number; toplam: number } {
  const hepsi: SiraSatiri[] = g.kadro.map((f) => ({ ad: f.ad, kulup: kisaAd(g, f.kulup), ovr: ovrOf(g, f), yas: f.yas, ben: false, gol: f.gol }));
  hepsi.push({ ad: g.ad, kulup: kisaAd(g, g.kulup), ovr: genel(g), yas: g.oyuncu.yas, ben: true, gol: g.sezonStat.gol });
  hepsi.sort((a, b) => b.ovr - a.ovr || (a.ben ? -1 : 1)); return { liste: hepsi.slice(0, n), benimSiram: hepsi.findIndex((x) => x.ben) + 1, toplam: hepsi.length };
}
/** Tüm liglerde gol krallığı (bu sezon). */
export function dunyaGolKrali(g: Game, n = 10): SiraSatiri[] {
  const hepsi: SiraSatiri[] = g.kadro.map((f) => ({ ad: f.ad, kulup: kisaAd(g, f.kulup), ovr: ovrOf(g, f), yas: f.yas, ben: false, gol: f.gol }));
  hepsi.push({ ad: g.ad, kulup: kisaAd(g, g.kulup), ovr: genel(g), yas: g.oyuncu.yas, ben: true, gol: g.sezonStat.gol }); return hepsi.sort((a, b) => b.gol - a.gol).slice(0, n);
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
