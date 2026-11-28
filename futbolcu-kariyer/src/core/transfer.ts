/** Transfer ve sözleşme sistemi: menajer, teklifler, pazarlık, yenileme, yurt dışı uyumu. */
import { clamp } from './rng';
import { type Game, type Teklif, clubOf, ligOf, genel, haberEkle, rngOf, rngKaydet, transferDegeri, yurtdisi, ulkeOf, kisaAd } from './game';
import { LIG_META } from './world';
export const MENAJER_UCRETI = 40000, MENAJER_ITIBAR = 12, TEKLIF_OMRU = 4;
/** Kulübün oyuncuya verebileceği rol (oynama süresi) tahmini. */
export function rolTahmin(g: Game, kulup: number): 0 | 1 | 2 { const fark = genel(g) - (clubOf(g, kulup).guc * 85 + 5); return fark > 8 ? 2 : fark > -7 ? 1 : 0; }
export const kaliteOf = (g: Game, kulup: number): number => clubOf(g, kulup).guc * 85 + 5;
export function maasAraligi(g: Game, kulup: number): number { return LIG_META[ligOf(g, kulup)]!.maas * 3500 * (0.9 + genel(g) / 60); }
export function menajerTut(g: Game): { ok: boolean; m: string } { if (g.menajer) return { ok: false, m: 'Zaten bir menajerin var.' }; if (g.itibar < MENAJER_ITIBAR) return { ok: false, m: `Menajer için itibarın en az ${MENAJER_ITIBAR} olmalı.` }; if (g.para < MENAJER_UCRETI) return { ok: false, m: `Menajer ücreti ${MENAJER_UCRETI} ₺.` }; g.para -= MENAJER_UCRETI; g.menajer = true; haberEkle(g, `${g.ad} bir menajerle anlaştı.`, 'kariyer'); return { ok: true, m: 'Menajer işe alındı: daha çok teklif ve daha iyi pazarlık. Maaşından %5 komisyon alır.' }; }
export function menajerKov(g: Game): void { g.menajer = false; }
/** Yeni teklifler üretir. Oyuncunun kalitesi/itibarı kulübün seviyesine yetiyorsa o kulüp ilgilenir. */
export function teklifUret(g: Game): number {
  const rng = rngOf(g), q0 = kaliteOf(g, g.kulup), o = genel(g), guc = o + 5 + g.itibar / 8; let sayi = rng.int(1, 2) + (g.menajer ? 1 : 0); const aday = g.kulupler.filter((k) => k.id !== g.kulup && !g.teklifler.some((t) => t.kulup === k.id) && kaliteOf(g, k.id) <= guc && kaliteOf(g, k.id) >= q0 - 4 && g.oyuncu.yas >= 16);
  let yeni = 0; while (sayi-- > 0 && aday.length) { // üst seviyeyi tercih et
    const k = rng.weighted(aday.map((c) => [c, 0.3 + Math.max(0, kaliteOf(g, c.id) - q0) / 12] as const)); aday.splice(aday.indexOf(k), 1);
    const rol = rolTahmin(g, k.id), carp = LIG_META[ligOf(g, k.id)]!.maas, maas = Math.round(carp * 3500 * (0.9 + o / 60) * rng.range(0.85, 1.2) / 50) * 50, dis = ulkeOf(g, k.id) !== ulkeOf(g, g.kulup);
    const t: Teklif = { id: Math.floor(rng.next() * 1e9), kulup: k.id, maas, golPrimi: Math.round(maas * 0.12 / 50) * 50, asistPrimi: Math.round(maas * 0.06 / 50) * 50, sure: rng.int(1, 4), rol, imza: Math.round(maas * (dis ? 8 : 4) / 100) * 100, bedel: maas * 20, kalan: TEKLIF_OMRU, pazarlik: 0 };
    g.teklifler.push(t); yeni++; haberEkle(g, `${kisaAd(g, k.id)}, ${g.ad} için teklif hazırladı.`, 'dunya');
  }
  rngKaydet(g, rng); return yeni;
}
export function teklifBul(g: Game, id: number): Teklif | undefined { return g.teklifler.find((t) => t.id === id); }
export function teklifRed(g: Game, id: number): void { g.teklifler = g.teklifler.filter((t) => t.id !== id); }
/** Pazarlık: maaş artışı ve süre. Her teklifte bir kez. */
export function pazarlikBasari(g: Game, t: Teklif, artis: number): number { return clamp(0.78 - artis * 1.7 + (g.menajer ? 0.15 : 0) + Math.min(0.15, g.itibar / 600) + (t.rol === 2 ? 0.1 : t.rol === 0 ? -0.1 : 0), 0.08, 0.92); }
export function pazarlik(g: Game, id: number, artis: number, sure?: number): { ok: boolean; m: string } {
  const t = teklifBul(g, id); if (!t) return { ok: false, m: 'Teklif bulunamadı.' }; if (t.pazarlik >= 1) return { ok: false, m: 'Bu teklifte zaten pazarlık yaptın.' };
  const rng = rngOf(g), p = pazarlikBasari(g, t, artis); t.pazarlik = 1; const bas = rng.chance(p); let m: string;
  if (bas) { t.maas = Math.round(t.maas * (1 + artis) / 50) * 50; t.golPrimi = Math.round(t.golPrimi * (1 + artis) / 50) * 50; t.asistPrimi = Math.round(t.asistPrimi * (1 + artis) / 50) * 50; t.imza = Math.round(t.imza * (1 + artis) / 100) * 100; if (sure) t.sure = clamp(sure, 1, 5); m = `Kulüp kabul etti: maaş +%${Math.round(artis * 100)}.`; }
  else if (rng.chance(0.4)) { g.teklifler = g.teklifler.filter((x) => x.id !== id); m = 'Pazarlık sinirleri bozdu: kulüp teklifini geri çekti!'; } else m = 'Kulüp pazarlığı reddetti ama teklif geçerli.';
  if (!bas && sure && teklifBul(g, id)) teklifBul(g, id)!.sure = clamp(sure, 1, 5); rngKaydet(g, rng); return { ok: bas, m };
}
export function teklifKabul(g: Game, id: number): { ok: boolean; m: string } {
  const t = teklifBul(g, id); if (!t) return { ok: false, m: 'Teklif bulunamadı.' }; if (g.sakatlik && g.sakatlik.hafta > 4) return { ok: false, m: 'Uzun süreli sakatlıkla transfer yapılamaz.' };
  const eski = g.kulup, dis = ulkeOf(g, t.kulup) !== ulkeOf(g, eski), yeni = clubOf(g, t.kulup);
  g.transferler.push({ sezon: g.sezon, hafta: g.hafta, kimden: eski, kime: t.kulup, imza: t.imza }); g.kulup = t.kulup; g.sozlesme = { kulup: t.kulup, maas: t.maas, golPrimi: t.golPrimi, asistPrimi: t.asistPrimi, sure: t.sure, bedel: t.bedel };
  g.para += t.imza; g.iliski.td = 50; g.iliski.takim = 45; g.iliski.taraftar = clamp(g.iliski.taraftar * 0.6 + 20, 0, 100); if (dis) g.uyum = 4; g.teklifler = [];
  haberEkle(g, `${g.ad} ${yeni.ad} ile anlaştı (${ulkeOf(g, t.kulup)}). İmza parası: ${t.imza.toLocaleString('tr-TR')} ₺.`, 'kariyer'); return { ok: true, m: `${yeni.ad} ile anlaştın!${dis ? ' Yeni ülkeye uyum süreci başlıyor (4 hafta).' : ''}` };
}
/** Mevcut kulüple sözleşme yenileme. Yalnızca kalan süre ≤ 2 iken. */
export function yenilemeSansi(g: Game, artis: number): number { return clamp(0.62 + g.iliski.td / 250 + g.iliski.takim / 400 - artis * 1.6 + (g.menajer ? 0.12 : 0), 0.08, 0.92); }
export function sozlesmeYenile(g: Game, artis: number, sure: number): { ok: boolean; m: string } {
  if (g.sozlesme.sure > 2) return { ok: false, m: 'Yenileme için sözleşmenin 2 sezon ya da daha az kalmış olması gerekir.' }; const rng = rngOf(g), bas = rng.chance(yenilemeSansi(g, artis));
  if (bas) { g.sozlesme.maas = Math.round(g.sozlesme.maas * (1 + artis) / 50) * 50; g.sozlesme.golPrimi = Math.round(g.sozlesme.golPrimi * (1 + artis) / 50) * 50; g.sozlesme.asistPrimi = Math.round(g.sozlesme.asistPrimi * (1 + artis) / 50) * 50; g.sozlesme.sure += clamp(sure, 1, 4); g.sozlesme.bedel = transferDegeri(g); haberEkle(g, `${g.ad} sözleşmesini yeniledi.`, 'kariyer'); rngKaydet(g, rng); return { ok: true, m: `Yenilendi: +${sure} sezon, maaş +%${Math.round(artis * 100)}.` }; }
  g.iliski.td = clamp(g.iliski.td - 4, 0, 100); rngKaydet(g, rng); return { ok: false, m: 'Kulüp isteklerini kabul etmedi. Teknik direktör memnuniyetsiz.' };
}
export const yurtdisiMi = yurtdisi;

/** Olay kartından gelen özel teklif: kulübün ilgisi doğrulanmadan teklif oluşturur (Teklif listesine eklenir). */
export function ozelTeklif(g: Game, kulup: number): void { const rng = rngOf(g), carp = LIG_META[ligOf(g, kulup)]!.maas, maas = Math.round(carp * 3500 * (0.9 + genel(g) / 60) * rng.range(1, 1.25) / 50) * 50; g.teklifler.push({ id: Math.floor(rng.next() * 1e9), kulup, maas, golPrimi: Math.round(maas * 0.12 / 50) * 50, asistPrimi: Math.round(maas * 0.06 / 50) * 50, sure: rng.int(2, 4), rol: rolTahmin(g, kulup), imza: maas * 6, bedel: maas * 20, kalan: TEKLIF_OMRU, pazarlik: 0 }); rngKaydet(g, rng); }
