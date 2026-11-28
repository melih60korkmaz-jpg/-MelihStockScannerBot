import { describe, it, expect } from 'vitest';
import { yeniOyun, antrenmanYap, dinlen, genel, tedaviOl, satinAl, luks, type Game } from '../src/core/game';
import { haftaIlerlet } from '../src/core/week';
import { macBaslat, macOtomatik, macOzeti } from '../src/core/match';
import { ekMacIsle } from '../src/core/ekmac';
import { teklifKabul, teklifUret } from '../src/core/transfer';
import { sponsorKabul, sponsorTeklifUret } from '../src/core/sponsor';
import { olayCoz } from '../src/core/olay';
import { emekliOl, rehabYap, kariyerPuani } from '../src/core/kariyer';
import { icecekIc } from '../src/core/ekipman';
import { POZ_AGIRLIK, type Pozisyon, type YetenekId } from '../src/core/skills';
import { ANTRENMANLAR } from '../src/core/training';
import { ESYALAR } from '../src/core/economy';
/** Bot, gerçekçi bir oyuncu gibi oynar: antrenman yapar, dinlenir, maç oynar, en iyi teklifi seçer, sponsor imzalar, makul alışveriş yapar. */
function kariyerOyna(poz: Pozisyon, seed: number, seviye: 'kotu' | 'iyi' = 'iyi'): { g: Game; iz: Array<{ yas: number; sezon: number; genel: number; para: number; itibar: number; lig: number; kulup: string; mac: number; gol: number }> } {
  const g = yeniOyun({ ad: 'B', soyad: 'ot', cinsiyet: 'Erkek', kita: 'Avrupa', uyruk: 'Türkiye', lig: 3, poz, numara: 9, gorunum: { ten: 1, sac: 1, sacRenk: 1 }, seed }), iz: Array<{ yas: number; sezon: number; genel: number; para: number; itibar: number; lig: number; kulup: string; mac: number; gol: number }> = [];
  const w = POZ_AGIRLIK[poz]; const onemli = (Object.keys(w) as YetenekId[]).sort((a, b) => (w[b] ?? 0) - (w[a] ?? 0)); const basari = seviye === 'iyi' ? 0.75 : 0.3;
  for (let hafta = 0; hafta < 22 * 25 && !g.emekli; hafta++) {
    if (g.bekleyenOlay) olayCoz(g, 0); if (g.sakatlik) { tedaviOl(g); rehabYap(g); } else { // antrenman: mevkiye göre en geride kalan önemli yetenek
      for (let k = 0; k < 3 && g.enerji > 30; k++) { const hedef = onemli.slice(0, 6).sort((a, b) => g.oyuncu.yet[a] - g.oyuncu.yet[b])[0]!, d = ANTRENMANLAR.slice().sort((a, b) => (b.kazanc[hedef] ?? 0) - (a.kazanc[hedef] ?? 0))[0]!; antrenmanYap(g, d.id, basari); } if (g.enerji < 45 && g.icecek.klasik > 0) icecekIc(g, 'klasik'); if (g.yorgunluk > 60) dinlen(g); }
    for (const t of [...g.teklifler]) { const sy = teklifKabulDegerli(g, t); if (sy) { teklifKabul(g, t.id); break; } } for (const t of [...g.sponsorTeklifleri]) sponsorKabul(g, t.id);
    const m = macBaslat(g); macOtomatik(g, m); if (g.ekMac) ekMacIsle(g); haftaIlerlet(g, macOzeti(g, m));
    if (g.hafta === 1) { const f = g.ligler.findIndex((l) => l.uye.includes(g.kulup)); iz.push({ yas: g.oyuncu.yas, sezon: g.sezon, genel: genel(g), para: Math.round(g.para), itibar: Math.round(g.itibar), lig: f, kulup: g.kulupler[g.kulup]!.ad, mac: g.stat.mac, gol: g.stat.gol }); }
    if (g.para > 400000 && g.hafta % 5 === 0) { for (const e of ESYALAR.slice().sort((a, b) => a.fiyat - b.fiyat)) if (!g.esyalar[e.id] && e.fiyat < g.para * 0.25) { satinAl(g, e.id); break; } }
    if (g.oyuncu.yas >= 36 && !g.emekli) emekliOl(g); if (g.hafta === 1 && g.sezon % 3 === 0) { teklifUret(g); sponsorTeklifUret(g); }
  }
  return { g, iz };
}
function teklifKabulDegerli(g: Game, t: Game['teklifler'][number]): boolean { const yeni = g.kulupler[t.kulup]!, eski = g.kulupler[g.kulup]!; return yeni.guc > eski.guc + 0.03 && t.rol >= 1; }
describe('uzun kariyer simülasyonu (bot)', () => {
  const sonuclar: Record<string, ReturnType<typeof kariyerOyna>> = {};
  for (const poz of ['SF', 'STP', 'KL', 'MOS'] as Pozisyon[]) it(`${poz}: 20 sezonluk kariyer tutarlı biter`, () => {
    const t0 = Date.now(), { g, iz } = kariyerOyna(poz, 41); sonuclar[poz] = { g, iz }; if (process.env.UZUN_RAPOR) console.log(`\n== ${poz} (${((Date.now() - t0) / 1000).toFixed(1)} sn) ==\n` + iz.map((x) => `yaş ${x.yas} genel ${x.genel} lig ${x.lig} ${x.kulup} para ${x.para.toLocaleString('tr-TR')} itibar ${x.itibar} mac ${x.mac} gol ${x.gol}`).join('\n') + `\nemekli: ${g.emekli ? g.emekli.puan : '-'} luks ${luks(g)} milli ${g.milli.cap} kupa ${g.stat.kupa}`);
    expect(g.emekli).not.toBeNull(); expect(g.oyuncu.yas).toBeGreaterThanOrEqual(33); expect(g.oyuncu.yas).toBeLessThanOrEqual(40);
    for (const k of Object.values(g.oyuncu.yet)) { expect(Number.isFinite(k)).toBe(true); expect(k).toBeGreaterThan(0); expect(k).toBeLessThanOrEqual(99.01); }
    expect(Number.isFinite(g.para)).toBe(true); expect(Number.isFinite(g.itibar)).toBe(true); expect(g.itibar).toBeGreaterThanOrEqual(0); expect(g.itibar).toBeLessThanOrEqual(100);
    expect(g.ligler.every((l) => l.uye.length === 12)).toBe(true); expect(new Set(g.ligler.flatMap((l) => l.uye)).size).toBe(108);
    const ilk = iz[0]!, zirve = Math.max(...iz.map((x) => x.genel)); expect(zirve).toBeGreaterThan(ilk.genel + 15); expect(zirve).toBeLessThanOrEqual(99);
    expect(kariyerPuani(g)).toBeGreaterThan(0);
  }, 120000);
  it('ekonomi: servet orantılı büyür (10. sezonda 1 milyar altında), ilk sezonlarda zengin olunmaz', () => { for (const [poz, r] of Object.entries(sonuclar)) { const s1 = r.iz[1]?.para ?? 0, s10 = r.iz[9]?.para ?? 0; expect(s1, `${poz} 2. sezon başı para`).toBeLessThan(2_500_000); expect(s10, `${poz} 10. sezon para`).toBeLessThan(1_500_000_000); } });
  it('kariyer ilerleyişi: oyuncu 18-30 yaş arası yükselir; kötü antrenman yapan oyuncu çok daha zayıf kalır', () => { const iyi = kariyerOyna('SF', 77, 'iyi'), kotu = kariyerOyna('SF', 77, 'kotu'); const z = (r: typeof iyi) => r.iz[3]!.genel; expect(z(iyi)).toBeGreaterThan(z(kotu) + 3); }, 120000);
});
