/** Kariyer sonu: emeklilik, kariyer puanı, yılın futbolcusu ve rehabilitasyon. */
import { clamp } from './rng';
import { type Game, type Emekli, clubOf, ligim, genel, haberEkle, rngOf, rngKaydet, kisaAd, luks } from './game';
import { LIG_META, sirala } from './world';
export const REHAB_UCRETI = 4000, EMEKLI_MIN_YAS = 33, EMEKLI_ZORUNLU = 39;
/** Rehabilitasyon: sakatken her seans iyileşmeyi hızlandırır ve nüks riskini düşürür. */
export function rehabYap(g: Game): { ok: boolean; m: string } {
  if (!g.sakatlik) return { ok: false, m: 'Sakat değilsin.' }; if (g.haftaAntrenman >= 4) return { ok: false, m: 'Bu hafta zaten dinlendin/çalıştın.' }; if (g.para < REHAB_UCRETI) return { ok: false, m: `Rehabilitasyon ${REHAB_UCRETI} ₺.` }; if (g.enerji < 8) return { ok: false, m: 'Enerjin yetersiz.' };
  g.para -= REHAB_UCRETI; g.enerji -= 8; g.rehab++; g.haftaAntrenman = 4; if (g.rehab >= 2) g.sakatlik.hafta = Math.max(0, g.sakatlik.hafta - 1); if (g.sakatlik.hafta <= 0) { g.sakatlik = null; g.nuks = 0; g.rehab = 0; return { ok: true, m: 'Rehabilitasyon tamamlandı: tamamen iyileştin.' }; } return { ok: true, m: `Rehabilitasyon seansı ${g.rehab}. ${g.rehab >= 2 ? 'İyileşme hızlanıyor, nüks riski düşük.' : 'Bir seans daha yaparsan iyileşme hızlanır ve nüks riski düşer.'}` };
}
/** Kariyer puanı: tüm başarıların ağırlıklı toplamı */
export function kariyerPuani(g: Game): number { const lg = Math.max(0, ...g.gecmis.map((x) => 3 - Math.min(3, x.lig))), s = g.stat; return Math.round(s.gol * 2 + s.asist * 1.2 + s.mac * 0.3 + s.kupa * 40 + g.milli.cap * 1.2 + g.milli.gol * 3 + g.kupaStat.gol * 2 + g.itibar * 3 + luks(g) * 0.4 + g.kariyerOdulleri.length * 25 + lg * 30 + (g.kupa?.sampiyon === g.kulup ? 60 : 0)); }
export const emekliOlabilir = (g: Game): boolean => g.oyuncu.yas >= EMEKLI_MIN_YAS && !g.emekli;
export function emekliOl(g: Game): { ok: boolean; m: string } {
  if (g.emekli) return { ok: false, m: 'Zaten emekli oldun.' }; if (g.oyuncu.yas < EMEKLI_MIN_YAS) return { ok: false, m: `Emeklilik için en az ${EMEKLI_MIN_YAS} yaşında olmalısın.` };
  const p = kariyerPuani(g), ozet: string[] = [`${g.stat.mac} maç · ${g.stat.gol} gol · ${g.stat.asist} asist`, `${g.gecmis.length} sezon · ${g.transferler.length} transfer`, `Milli takım: ${g.milli.cap} maç · ${g.milli.gol} gol`, `Kazanılan kupa: ${g.stat.kupa} · Ödül: ${g.kariyerOdulleri.length}`, `Son kulüp: ${clubOf(g).ad}`, `Servet: ${Math.round(g.para).toLocaleString('tr-TR')} ₺ · Lüks ${luks(g)}`];
  g.emekli = { sezon: g.sezon, yas: g.oyuncu.yas, puan: p, ozet }; haberEkle(g, `${g.ad} futbolu bıraktı. Kariyer puanı: ${p}.`, 'kariyer'); return { ok: true, m: `Emekli oldun. Kariyer puanı: ${p}` };
}
export const kariyerUnvani = (p: number): string => (p >= 2500 ? 'Efsane' : p >= 1500 ? 'Süperstar' : p >= 800 ? 'Yıldız' : p >= 400 ? 'Usta oyuncu' : p >= 150 ? 'Profesyonel' : 'Amatör ruhlu');
/** Yılın futbolcusu: lig seviyesi, performans, başarı ve gol/asist katkısıyla puanlanır. Rakipler büyük liglerin skorerleridir. */
export function yilinFutbolcusu(g: Game, ortPuan: number): { biz: boolean; metin: string } {
  const lk = LIG_META[ligim(g)]!.taban, benim = (g.sezonStat.gol * 2 + g.sezonStat.asist * 1.2) * (0.4 + lk) + (ortPuan - 6) * 14 + (sirala(g.ligler[ligim(g)]!)[0]!.id === g.kulup ? 18 : 0) + (g.kupa?.sampiyon === g.kulup ? 25 : 0) + g.itibar * 0.2;
  let enIyi = { ad: '-', puan: 0 }; for (let l = 0; l < g.ligler.length; l++) { const ls = g.kadro.filter((f) => g.ligler[l]!.uye.includes(f.kulup)); for (const f of ls) { const p = (f.gol * 2 + f.asist * 1.2) * (0.4 + LIG_META[l]!.taban) + (l >= 4 ? 8 : l === 0 ? 3 : 0); if (p > enIyi.puan) enIyi = { ad: f.ad + ' (' + kisaAd(g, f.kulup) + ')', puan: p }; } }
  const biz = benim >= enIyi.puan && g.sezonStat.mac >= 10 && benim > 20; return { biz, metin: biz ? `🌟 Yılın Futbolcusu: ${g.ad}` : `🌟 Yılın Futbolcusu: ${enIyi.ad}` };
}
void clamp; void genel; void rngOf; void rngKaydet;
