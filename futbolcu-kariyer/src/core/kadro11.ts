/** Maçtaki 22 oyuncu: her takımın ilk 11'i (4-4-2). Görsel saha ve maç simülasyonu bu aynı kadroları kullanır. */
import { Rng } from './rng';
import type { Pozisyon } from './skills';
import type { Game } from './game';
export interface Oyuncu11 { ad: string; poz: Pozisyon; no: number; ben: boolean; slot: number }
/** Slot sırası: kaleci, sol bek, stoper x2, sağ bek, sol kanat, orta x2, sağ kanat, forvet x2. */
export const DIZILIS: Pozisyon[] = ['KL', 'SLB', 'STP', 'STP', 'SGB', 'SLK', 'MOS', 'MOS', 'SGK', 'SF', 'SF'];
/** Kendi yarı sahadaki yerleşim: [x 0..1 soldan sağa, derinlik 0 = kendi kale çizgisi .. 1 = orta saha]. */
export const SLOT_XY: Array<[number, number]> = [[0.5, 0.04], [0.12, 0.3], [0.38, 0.22], [0.62, 0.22], [0.88, 0.3], [0.1, 0.62], [0.38, 0.55], [0.62, 0.55], [0.9, 0.62], [0.36, 0.86], [0.64, 0.86]];
const AD = ['Arda', 'Berk', 'Can', 'Deniz', 'Emre', 'Furkan', 'Hakan', 'Kaan', 'Mert', 'Onur', 'Serkan', 'Tolga', 'Umut', 'Yusuf', 'Barış', 'Cem', 'Eren', 'Selim', 'Oğuz', 'Kerem', 'Volkan', 'Burak', 'Ahmet', 'Mehmet'];
const SOY = ['Y.', 'K.', 'D.', 'A.', 'Ş.', 'T.', 'Ç.', 'G.', 'B.', 'U.', 'E.', 'S.'];
export const benimSlot = (poz: Pozisyon): number => { const m: Record<Pozisyon, number> = { KL: 0, SLB: 1, STP: 2, SGB: 4, SLK: 5, OL: 6, MOS: 7, ON: 7, SGK: 8, SF: 10 }; return m[poz]; };
function tohum(g: Game, anahtar: string, sezon: number): number { let h = (g.seed ^ (sezon * 2654435761)) >>> 0; for (let i = 0; i < anahtar.length; i++) h = Math.imul(h ^ anahtar.charCodeAt(i), 16777619) >>> 0; return h; }
/** Kulüp/ülke anahtarına göre sezon boyu sabit kadro. `ben` verilirse oyuncunun kendisi kendi mevkisinde yer alır. */
export function ilk11(g: Game, anahtar: string, ben: boolean): Oyuncu11[] {
  const rng = new Rng(tohum(g, anahtar, g.sezon)), kullan = new Set<string>(), numaralar = rng.int(0, 1) ? [1, 3, 4, 5, 2, 11, 6, 8, 7, 9, 10] : [1, 2, 4, 5, 3, 7, 6, 8, 11, 9, 10], bs = benimSlot(g.oyuncu.poz);
  return DIZILIS.map((poz, slot) => {
    if (ben && slot === bs) return { ad: g.ad, poz: g.oyuncu.poz, no: g.oyuncu.numara, ben: true, slot };
    let ad = ''; do { ad = `${rng.pick(AD)} ${rng.pick(SOY)}`; } while (kullan.has(ad)); kullan.add(ad); let no = numaralar[slot]!; if (ben && no === g.oyuncu.numara) no = 12 + slot; return { ad, poz, no, ben: false, slot };
  });
}
/** Gol/şut için oyuncu seçimi: forvet ve ortasaha daha sık, kaleci hiç. `haric` benim oyuncum olabilir. */
export function sutcuSec(kadro: Oyuncu11[], rng: Rng, haricBen = true): Oyuncu11 { const adaylar = kadro.filter((o) => o.slot !== 0 && !(haricBen && o.ben)); return rng.weighted(adaylar.map((o) => [o, o.slot >= 9 ? 3.2 : o.slot >= 5 ? 1.8 : 0.7] as [Oyuncu11, number])); }
