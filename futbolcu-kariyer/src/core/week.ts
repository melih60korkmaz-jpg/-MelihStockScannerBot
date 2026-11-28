/** Hafta ilerletme: maçlar, ekonomi, enerji, sakatlık, ilişkiler, haberler, sezon sonu. */
import { rolEtkisi, kiralikDonus, sozlesmeRedSonu } from './senaryo';
import { yzTransferleri, dunyaGuncelle } from './dunya';
import { Rng, clamp } from './rng';
import { type Game, kisaAd, type Futbolcu, type MacOzet, clubOf, ligOf, ligim, genel, haberEkle, rngOf, rngKaydet, haftalikGelirGider, transferDegeri } from './game';
import { fikstur, sirala, sonucYaz, takimMaci, tabloBos, HAFTA_SAYISI, TR_LIG, type Kulup } from './world';
import { POZ_GRUP } from './skills';
import { teklifUret } from './transfer';
import { sponsorMacIsle, sponsorTeklifUret, sponsorSezonSonu, sponsorHaftalikGecen } from './sponsor';
import { olayCek, gecikmeliIsle } from './olay';
import { iliskiHaftalik } from './sosyal';
import { kramponAsin } from './ekipman';
import { ekMacIsle, ekMacHazirla, kupaTurIsle, kupaKur, turnuvaTurIsle, turnuvaKur } from './ekmac';
import { yilinFutbolcusu, emekliOl, EMEKLI_ZORUNLU } from './kariyer';
const AD = ['Ahmet', 'Mehmet', 'Emre', 'Burak', 'Can', 'Kerem', 'Arda', 'Yusuf', 'Berk', 'Onur', 'Serkan', 'Tolga', 'Barış', 'Kaan', 'Deniz', 'Umut', 'Furkan', 'Oğuz', 'Eren', 'Cem', 'Mert', 'Selim', 'Hakan', 'Volkan'];
const SOY = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Aydın', 'Arslan', 'Doğan', 'Kurt', 'Özkan', 'Aksoy', 'Polat', 'Erdem', 'Tuna', 'Koç', 'Güneş', 'Aslan', 'Bulut', 'Karaca', 'Yıldız', 'Tekin', 'Uysal', 'Sönmez', 'Işık'];
export function kadroKur(kulupler: Kulup[], rng: Rng): Futbolcu[] { const out: Futbolcu[] = []; for (const k of kulupler) for (let i = 0; i < 4; i++) out.push({ ad: `${rng.pick(AD)} ${rng.pick(SOY)}`, kulup: k.id, yas: rng.int(17, 34), hucum: +(rng.range(0.6, 1.4) * (i === 0 ? 1.5 : i === 1 ? 1.1 : 0.7)).toFixed(2), gol: 0, asist: 0, mac: 0, puan: 0 }); return out; }
/** Takımın gol sayısını kadro üyelerine dağıt. */
function golDagit(g: Game, rng: Rng, kulup: number, gol: number): void { const k = g.kadro.filter((f) => f.kulup === kulup); for (let i = 0; i < gol; i++) { const s = rng.weighted(k.map((f) => [f, f.hucum] as const)); s.gol++; if (rng.chance(0.7)) rng.weighted(k.map((f) => [f, f.hucum * (f === s ? 0 : 1) + 0.01] as const)).asist++; } for (const f of k) f.mac++; }
/** Oyuncunun kulüpteki rolü: 0 yedek, 1 ilk 11, 2 yıldız. */
export function rolOf(g: Game): 0 | 1 | 2 { const base = clubOf(g).guc * 85 + 5, fark = genel(g) - base + rolEtkisi(g); let r: 0 | 1 | 2 = fark > 8 ? 2 : fark > -7 ? 1 : 0; if (g.iliski.td < 25 && r > 0) r = (r - 1) as 0 | 1; return r; }
export const ROL_AD = ['Yedek', 'İlk 11', 'Yıldız'];
export function otomatikMac(g: Game, rng: Rng, evMi: boolean, gev: number, gdep: number): MacOzet {
  const o = g.oyuncu, rol = g.sakatlik ? -1 : rolOf(g), oynadi = rol >= 1 || (rol === 0 && rng.chance(0.45)), dak = !oynadi ? 0 : rol >= 1 ? (g.enerji < 25 ? 65 : 90) : rng.int(10, 35);
  const takimGol = evMi ? gev : gdep, rakipGol = evMi ? gdep : gev, grup = POZ_GRUP(o.poz), pay = o.poz === 'SF' ? 0.38 : grup === 'hucum' ? 0.2 : o.poz === 'ON' ? 0.2 : grup === 'orta' ? 0.08 : grup === 'defans' ? 0.03 : 0;
  const kal = genel(g) / 60, lam = takimGol * pay * (dak / 90) * clamp(kal, 0.4, 1.7); const gol = Math.min(takimGol, rng.poisson(lam)), asist = Math.min(Math.max(0, takimGol - gol), rng.poisson(takimGol * (pay * 0.8 + 0.05) * (dak / 90) * clamp(kal, 0.4, 1.7)));
  const sut = dak ? Math.max(gol, rng.poisson((pay * 12 + 0.7) * (dak / 90))) : 0, isabet = Math.min(sut, gol + rng.poisson(sut * 0.35)), pas = dak ? Math.round(dak / 90 * (grup === 'orta' ? 55 : 35) * rng.range(0.7, 1.2)) : 0, basariliPas = Math.round(pas * clamp(0.55 + g.oyuncu.yet.pas / 220 + rng.gauss() * 0.04, 0.4, 0.95));
  const mucadele = dak ? Math.round(dak / 90 * (grup === 'defans' ? 12 : 8) * rng.range(0.6, 1.3)) : 0, dripling = dak ? Math.round(dak / 90 * rng.range(2, 8)) : 0, topKaybi = dak ? Math.round(dak / 90 * rng.range(6, 16) * (1.1 - o.yet.topKontrol / 200)) : 0;
  const galip = takimGol > rakipGol ? 0.6 : takimGol < rakipGol ? -0.5 : 0, puan = !dak ? 0 : clamp(5.9 + gol * 0.95 + asist * 0.55 + galip + (genel(g) - clubOf(g).guc * 85) / 70 + (basariliPas / Math.max(1, pas) - 0.7) * 1.5 + rng.gauss() * 0.45 - (rakipGol === 0 && grup === 'defans' ? -0.5 : 0) - (g.uyum > 0 ? 0.4 : 0), 3, 10);
  return { sezon: g.sezon, hafta: g.hafta, ev: evMi ? g.kulup : -1, dep: -1, gev, gdep, dakika: dak, gol, asist, sut, isabet, pas, basariliPas, topKaybi, dripling, mucadele, puan: +puan.toFixed(1), oynadi: dak > 0 };
}
export function haftaFiksturum(g: Game): { ev: number; dep: number; evde: boolean; rakip: number } { const l = g.ligler[ligim(g)]!, f = fikstur(l.uye, g.hafta).find(([a, b]) => a === g.kulup || b === g.kulup)!; return { ev: f[0], dep: f[1], evde: f[0] === g.kulup, rakip: f[0] === g.kulup ? f[1] : f[0] }; }
export interface HaftaRaporu { satir: string[]; mac: MacOzet | null; sezonSonu: boolean }
/** Haftayı ilerletir. mac: oyuncunun kendi maçı için dışarıdan verilen sonuç (etkileşimli maç); yoksa otomatik simüle edilir. */
export function haftaIlerlet(g: Game, mac?: MacOzet): HaftaRaporu {
  if (g.emekli) return { satir: ['Kariyerin sona erdi.'], mac: null, sezonSonu: false };
  const satir: string[] = []; if (g.ekMac) { const s = ekMacIsle(g); if (s) satir.push(`${s.ad}: ${s.bizGol}-${s.rakipGol}${s.ozet.oynadi ? ` · ${s.ozet.gol} gol · puan ${s.ozet.puan.toFixed(1)}` : ''}${s.penaltilar ? ' (penaltılar)' : ''}`); }
  satir.push(...kupaTurIsle(g), ...turnuvaTurIsle(g)); g.ekSonuc = null;
  const rng = rngOf(g), fx = haftaFiksturum(g); let ozet: MacOzet | null = null;
  for (let l = 0; l < g.ligler.length; l++) { const lig = g.ligler[l]!; for (const [ev, dep] of fikstur(lig.uye, g.hafta)) { if (ev === g.kulup || dep === g.kulup) continue; const [a, b] = takimMaci(rng, g.kulupler[ev]!.guc, g.kulupler[dep]!.guc); sonucYaz(lig, ev, dep, a, b); golDagit(g, rng, ev, a); golDagit(g, rng, dep, b); } }
  // kendi maçımız
  const lig = g.ligler[ligim(g)]!; let gev: number, gdep: number;
  if (mac) { ozet = mac; gev = mac.gev; gdep = mac.gdep; } else { [gev, gdep] = takimMaci(rng, clubOf(g, fx.ev).guc + 0.0, clubOf(g, fx.dep).guc); ozet = otomatikMac(g, rng, fx.evde, gev, gdep); }
  const ek = (mac as unknown as { ek?: { sakat: boolean; sari: number; kirmizi: number } } | undefined)?.ek; if (ek) { g.stat.sari += ek.sari; g.stat.kirmizi += ek.kirmizi; if (ek.sakat && !g.sakatlik) { g.sakatlik = { tur: rng.pick(['Adale kasılması', 'Bilek burkulması', 'Diz zorlanması', 'Kas yırtığı']), hafta: rng.int(1, 5) }; haberEkle(g, `${g.ad} maçta sakatlandı: ${g.sakatlik.tur}.`, 'kariyer'); satir.push(`Maçta sakatlandın: ${g.sakatlik.tur} (${g.sakatlik.hafta} hafta).`); } if (ek.kirmizi) { satir.push('Kırmızı kart gördün!'); g.iliski.td = clamp(g.iliski.td - 6, 0, 100); g.iliski.taraftar = clamp(g.iliski.taraftar - 4, 0, 100); haberEkle(g, `${g.ad} kırmızı kart gördü.`, 'mac'); } }
  ozet.ev = fx.ev; ozet.dep = fx.dep; sonucYaz(lig, fx.ev, fx.dep, gev, gdep); golDagit(g, rng, fx.ev === g.kulup ? fx.dep : fx.ev, fx.evde ? gdep : gev); { const bizim = g.kadro.filter((f) => f.kulup === g.kulup); const bg = fx.evde ? gev : gdep; const tasi = Math.max(0, bg - ozet.gol), as = Math.max(0, bg - ozet.gol - ozet.asist); if (bizim.length) { for (let i = 0; i < tasi; i++) rng.weighted(bizim.map((f) => [f, f.hucum] as const)).gol++; for (let i = 0; i < Math.min(as, tasi); i++) rng.weighted(bizim.map((f) => [f, f.hucum] as const)).asist++; for (const f of bizim) f.mac++; } }
  const bizimGol = fx.evde ? gev : gdep, rakipGol = fx.evde ? gdep : gev, sonuc = bizimGol > rakipGol ? 'galibiyet' : bizimGol < rakipGol ? 'mağlubiyet' : 'beraberlik'; const rk = clubOf(g, fx.rakip);
  satir.push(`Maç: ${kisaAd(g, fx.ev)} ${gev}-${gdep} ${kisaAd(g, fx.dep)} (${sonuc})`);
  if (ozet.oynadi) { satir.push(`Performansın: ${ozet.dakika}' · ${ozet.gol} gol · ${ozet.asist} asist · puan ${ozet.puan.toFixed(1)}`); }
  else satir.push(g.sakatlik ? 'Sakat olduğun için kadroda yoktun.' : 'Kadroda olmana rağmen süre almadın.');
  // istatistik + ilişkiler + itibar
  if (ozet.oynadi) { g.stat.mac++; g.sezonStat.mac++; { const a = kramponAsin(g); if (a) satir.push(a); } g.stat.gol += ozet.gol; g.sezonStat.gol += ozet.gol; g.stat.asist += ozet.asist; g.sezonStat.asist += ozet.asist; g.maclar.unshift(ozet); if (g.maclar.length > 60) g.maclar.length = 60; const pk = ozet.puan - 6.2; g.iliski.td = clamp(g.iliski.td + pk * 2.2, 0, 100); g.iliski.takim = clamp(g.iliski.takim + pk * 1.4 + (sonuc === 'galibiyet' ? 1 : sonuc === 'mağlubiyet' ? -1 : 0), 0, 100); g.iliski.taraftar = clamp(g.iliski.taraftar + pk * 1.8 + ozet.gol * 1.5, 0, 100); g.itibar = clamp(g.itibar + pk * 0.6 + ozet.gol * 0.7 + ozet.asist * 0.3, 0, 100); if (ozet.puan >= 8) haberEkle(g, `${g.ad}, ${rk.ad} karşısındaki performansıyla göz doldurdu (${ozet.puan.toFixed(1)}).`, 'mac'); else if (ozet.puan <= 4.8) { haberEkle(g, `${g.ad} ${rk.ad} maçında hayal kırıklığı yarattı (${ozet.puan.toFixed(1)}).`, 'mac'); satir.push('Kötü performans: teknik direktörün güveni azaldı.'); } }
  else { g.iliski.td = clamp(g.iliski.td - 1.2, 0, 100); }
  const spGelir = sponsorMacIsle(g, ozet.oynadi, ozet.gol, ozet.puan); g.sonMacHafta = g.toplamHafta; if (spGelir) { g.para += spGelir; satir.push(`Sponsor geliri: +${spGelir.toLocaleString('tr-TR')} ₺`); }
  const prim = ozet.gol * g.sozlesme.golPrimi + ozet.asist * g.sozlesme.asistPrimi;
  if (prim) satir.push(`Gol/asist primi: +${prim.toLocaleString('tr-TR')} ₺`);
  // ekonomi
  const e = haftalikGelirGider(g); const net = e.net + prim; if (e.kira) satir.push(`Kira/işletme geliri: +${e.kira.toLocaleString('tr-TR')} ₺`); g.para += net; satir.push(`Haftalık gelir/gider: ${net >= 0 ? '+' : ''}${net.toLocaleString('tr-TR')} ₺ (maaş ${e.maas}, antrenör -${e.antrenor}, menajer -${e.menajer}, bakım -${e.bakim}, ekipman -${e.ekipman}, yaşam -${e.yasam})`);
  if (g.para < 0) { satir.push('Paran eksiye düştü! Giderlerini kıs.'); g.iliski.sponsor = clamp(g.iliski.sponsor - 3, 0, 100); }
  // enerji ve sağlık
  const maliyet = ozet.oynadi ? Math.round(ozet.dakika / 90 * 22) : 0; const dinlendi = g.haftaAntrenman > 3; const toparlanma = 38 + g.oyuncu.yet.dayaniklilik / 8 + (dinlendi ? 8 : 0);
  g.enerji = clamp(g.enerji - maliyet + toparlanma, 0, 100); g.yorgunluk = clamp(g.yorgunluk - 14 - (dinlendi ? 10 : 0) + (ozet.oynadi ? ozet.dakika / 9 : 0), 0, 100);
  if (g.sakatlik) { g.sakatlik.hafta--; if (g.sakatlik.hafta <= 0) { satir.push(`Sakatlığın (${g.sakatlik.tur}) iyileşti.${g.rehab >= 2 ? ' Rehabilitasyon tamamlandı: nüks riski düşük.' : ' Dikkat: yeterli rehabilitasyon yapılmadı, nüks riski yüksek (3 hafta).'}`); g.nuks = g.rehab >= 2 ? 0 : 3; g.rehab = 0; g.sakatlik = null; } else satir.push(`Sakatlık: ${g.sakatlik.tur}, ${g.sakatlik.hafta} hafta kaldı.`); }
  else if (ozet.oynadi && rng.chance((0.012 + g.yorgunluk / 100 * 0.035) * (g.nuks > 0 ? 2.2 : 1))) { g.sakatlik = { tur: rng.pick(['Adale kasılması', 'Bilek burkulması', 'Diz zorlanması', 'Kas yırtığı']), hafta: rng.int(1, 6) }; satir.push(`Maçta sakatlandın: ${g.sakatlik.tur} (${g.sakatlik.hafta} hafta).`); haberEkle(g, `${g.ad} sakatlandı: ${g.sakatlik.tur}.`, 'kariyer'); }
  if (g.uyum > 0) { g.uyum--; if (g.uyum === 0) satir.push('Yeni ülkeye alıştın: uyum süreci bitti.'); else satir.push(`Yeni ülkeye uyum: ${g.uyum} hafta kaldı (performans etkilenir).`); }
  for (const t of g.teklifler) t.kalan--; const bitenTeklif = g.teklifler.filter((t) => t.kalan <= 0); if (bitenTeklif.length) { satir.push(`${bitenTeklif.length} teklifin süresi doldu.`); g.teklifler = g.teklifler.filter((t) => t.kalan > 0); }
  if (g.nuks > 0) g.nuks--; satir.push(...iliskiHaftalik(g)); sponsorHaftalikGecen(g); g.haftaSosyal = 0; g.haftaIcecek = 0; g.toplamHafta++;
  g.gunlukRapor = satir; g.haftaAntrenman = 0; g.hafta++;
  satir.push(...gecikmeliIsle(g)); if ((g.hafta === 3 || g.hafta === 14) && sponsorTeklifUret(g)) satir.push('🤝 Yeni sponsor teklifi geldi! (Ev → Sponsorlar)'); { const oid = olayCek(g); if (oid) satir.push('📋 Karar bekleyen bir olay var!'); }
  if (g.hafta === 11 || g.hafta === 6) { for (const m of sponsorSezonSonu(g, g.sezonStat.mac)) haberEkle(g, m, 'kariyer'); sponsorTeklifUret(g); const n = teklifUret(g); if (n) satir.push(`📄 ${n} yeni transfer teklifi geldi! (Ev → Sözleşme)`); }
  rngKaydet(g, rng); let sezonSonu = false; if (g.hafta > HAFTA_SAYISI) { sezonSonuIsle(g); sezonSonu = true; }
  dunyaGuncelle(g); ekMacHazirla(g);
  return { satir, mac: ozet, sezonSonu };
}
export function sezonSonuIsle(g: Game): void {
  const kupaSamp = g.kupa?.sampiyon ?? null;
  kupaKur(g, g.sezon + 1); turnuvaKur(g, g.sezon + 1); { const r0 = rngOf(g); for (let l = 0; l < g.ligler.length; l++) { const sr = sirala(g.ligler[l]!); sr.forEach((row, i) => { const kl = g.kulupler[row.id]!, d = i === 0 ? 0.014 : i < 3 ? 0.006 : i >= sr.length - 2 ? -0.009 : 0; kl.guc = +clamp(kl.guc + d + r0.gauss() * 0.006, 0.15, 0.98).toFixed(3); }); } rngKaydet(g, r0); }
  const rng = rngOf(g), eski = ligim(g), s = sirala(g.ligler[eski]!), poz = s.findIndex((r) => r.id === g.kulup) + 1, ods: string[] = [];
  for (const l of g.ligler) { const ch = sirala(l)[0]?.id; for (const f of g.kadro) if (f.kulup === ch) f.kupa = (f.kupa ?? 0) + 1; } if (kupaSamp !== null) for (const f of g.kadro) if (f.kulup === kupaSamp) f.kupa = (f.kupa ?? 0) + 1; dunyaGuncelle(g, true);
  const sampiyon = clubOf(g, s[0]!.id).ad; ods.push(`🏆 ${g.ligler[eski]!.ad} şampiyonu: ${sampiyon}`);
  const lig = g.kadro.filter((f) => g.ligler[eski]!.uye.includes(f.kulup)); const gk = lig.slice().sort((a, b) => b.gol - a.gol)[0], ak = lig.slice().sort((a, b) => b.asist - a.asist)[0]; const bizGol = g.sezonStat.gol, bizAsist = g.sezonStat.asist;
  if (gk) ods.push(bizGol > gk.gol ? `⚽ Gol kralı: ${g.ad} (${bizGol})` : `⚽ Gol kralı: ${gk.ad} (${gk.gol}) · ${clubOf(g, gk.kulup).ad}`);
  if (ak) ods.push(bizAsist > ak.asist ? `🎯 Asist kralı: ${g.ad} (${bizAsist})` : `🎯 Asist kralı: ${ak.ad} (${ak.asist}) · ${clubOf(g, ak.kulup).ad}`);
  const ortPuan = g.maclar.filter((m) => m.sezon === g.sezon).reduce((a, m, _, arr) => a + m.puan / arr.length, 0); const oyuncuOdul = ortPuan >= 7.3 && g.sezonStat.mac >= 10; const gencOdul = oyuncuOdul || (g.oyuncu.yas <= 21 && ortPuan >= 6.8 && g.sezonStat.mac >= 10);
  const enIyi = lig.slice().sort((a, b) => b.gol * 2 + b.asist - (a.gol * 2 + a.asist))[0]; ods.push(oyuncuOdul ? `⭐ Sezonun oyuncusu: ${g.ad}` : `⭐ Sezonun oyuncusu: ${enIyi ? enIyi.ad : '-'}`); const genc = lig.filter((f) => f.yas <= 21).sort((a, b) => b.gol + b.asist - (a.gol + a.asist))[0]; ods.push(gencOdul ? `🌱 En iyi genç: ${g.ad}` : `🌱 En iyi genç: ${genc ? genc.ad : '-'}`);
  { const y = yilinFutbolcusu(g, ortPuan); ods.push(y.metin); if (y.biz) { g.kariyerOdulleri.push({ sezon: g.sezon, ad: 'Yılın Futbolcusu' }); g.itibar = clamp(g.itibar + 8, 0, 100); } }
  if (oyuncuOdul) g.itibar = clamp(g.itibar + 6, 0, 100); else if (gencOdul) g.itibar = clamp(g.itibar + 3, 0, 100);
  // yükselme / düşme: ilk 2 yukarı, son 2 aşağı
  const cik: string[] = [], dus: string[] = []; const yeniUye = g.ligler.map((l) => [...l.uye]); for (let l = 1; l < TR_LIG; l++) { const alt = sirala(g.ligler[l]!).map((r) => r.id), ust = sirala(g.ligler[l - 1]!).map((r) => r.id); const up = alt.slice(0, 2), down = ust.slice(-2); yeniUye[l - 1] = yeniUye[l - 1]!.filter((x) => !down.includes(x)).concat(up); yeniUye[l] = yeniUye[l]!.filter((x) => !up.includes(x)).concat(down); up.forEach((x) => cik.push(clubOf(g, x).ad)); down.forEach((x) => dus.push(clubOf(g, x).ad)); }
  if (cik.length) ods.push(`🔼 Üst lige çıkanlar: ${cik.join(', ')}`); if (dus.length) ods.push(`🔽 Küme düşenler: ${dus.join(', ')}`);
  g.gecmis.push({ sezon: g.sezon, kulup: g.kulup, lig: eski, poz, mac: g.sezonStat.mac, gol: g.sezonStat.gol, asist: g.sezonStat.asist }); if (poz === 1) g.stat.kupa++;
  g.ligler.forEach((l, i) => { l.uye = yeniUye[i]!; l.tablo = tabloBos(l.uye); }); g.kulupler.forEach((k) => { k.lig = ligOf(g, k.id); });
  yzTransferleri(g, rng); for (const f of g.kadro) { f.gol = 0; f.asist = 0; f.mac = 0; f.yas++; } for (const k of g.kulupler) k.guc = +clamp(k.guc + rng.gauss() * 0.012, 0.2, 0.97).toFixed(3);
  kiralikDonus(g); { const n = teklifUret(g); if (n) haberEkle(g, `Sezon sonu: ${n} kulüp ${g.ad} için teklif hazırladı.`, 'dunya'); } g.oyuncu.yas++; if (g.oyuncu.yas >= EMEKLI_ZORUNLU && !g.emekli) emekliOl(g); if (g.oyuncu.yas > 29) for (const k of ['surat', 'dayaniklilik'] as const) g.oyuncu.yet[k] = Math.max(10, g.oyuncu.yet[k] - (g.oyuncu.yas - 29) * 0.25); g.sozlesme.sure--; let sz = ''; if (g.sozlesme.sure <= 0) { g.sozlesme.sure = 1; sz = ' Sözleşmen bir sezon uzatıldı.'; } sozlesmeRedSonu(g);
  if (g.oyuncu.yas >= 39) haberEkle(g, `${g.ad} 39 yaşında: emeklilik zamanı gelip çattı.`, 'kariyer');
  g.sozlesme.bedel = transferDegeri(g); haberEkle(g, `Sezon ${g.sezon} bitti: ${g.ligler[ligOf(g, g.kulup)]!.ad}'de ${poz}. sıra.${sz}`, 'dunya'); g.oduller = ods; g.sezon++; g.hafta = 1; g.sezonStat = { mac: 0, gol: 0, asist: 0 }; rngKaydet(g, rng);
}
