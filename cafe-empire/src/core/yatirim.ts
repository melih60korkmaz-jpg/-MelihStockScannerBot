/** Yatırımcılar, şirket değerlemesi, temettü, halka arz ve rakip satın alma. Başlangıçta hiçbir etkisi yoktur (pay %0). */
import { cityById } from '../data/turkey';
import { hooks, levelOf, olayIsleyici } from './sim';
import { dateOf, dayOf } from './calendar';
import { rand } from './rng';
import { D, yaz, h32 } from './derin';
import type { GameState } from './types';

export interface Res { ok: boolean; m: string }
const ok = (m: string): Res => ({ ok: true, m }), no = (m: string): Res => ({ ok: false, m });
const cl = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export type YKisilik = 'buyume' | 'kar' | 'sabir' | 'agresif';
export const YATIRIMCILAR: Array<{ id: string; ad: string; kisilik: YKisilik; ik: string; renk: string }> = [
  { id: 'atlas', ad: 'Atlas Girişim Sermayesi', kisilik: 'buyume', ik: '🚀', renk: '#5fb3ff' },
  { id: 'kuzey', ad: 'Kuzey Aile Ofisi', kisilik: 'sabir', ik: '🏔️', renk: '#4fd6a8' },
  { id: 'merkez', ad: 'Merkez Yatırım Holding', kisilik: 'kar', ik: '🏦', renk: '#ffd45c' },
  { id: 'kartal', ad: 'Kartal Fonu', kisilik: 'agresif', ik: '🦅', renk: '#ef6b63' },
];
export const KIS_AC: Record<YKisilik, { ad: string; ist: string }> = {
  buyume: { ad: 'Büyüme odaklı', ist: 'Aylık ciro büyümesi ≥ %5 ister.' }, kar: { ad: 'Temettü odaklı', ist: 'Temettü oranı ≥ %30 ister.' },
  sabir: { ad: 'Sabırlı', ist: 'Şirketin kârda kalmasını ister.' }, agresif: { ad: 'Agresif', ist: 'Hem ≥ %8 büyüme hem ≥ %25 temettü ister.' },
};
export interface Ortak { id: string; ad: string; kisilik: YKisilik; pay: number; sermaye: number; giris: number; memnun: number }
export interface Teklif { yid: string; ad: string; kisilik: YKisilik; pay: number; sermaye: number; deger: number; bit: number; pazarlik: boolean; pid?: number }
export interface Halka { hisse: number; fiyat: number; ipoFiyat: number; pay: number; duygu: number; gecmis: number[]; dusukGun: number }
export interface Yat { ortaklar: Ortak[]; teklif: Teklif | null; temettu: number; halka: Halka | null; deger: Array<{ gun: number; v: number }>; sermaye: number; odenen: number; son: number; satin: string[] }
export function Y(s: GameState): Yat { const d = D(s); return (d.yat ??= { ortaklar: [], teklif: null, temettu: 0.2, halka: null, deger: [], sermaye: 0, odenen: 0, son: -99, satin: [] }); }
const F = (s: GameState): number => s.market.fiyat;
export const disPay = (s: GameState): number => { const y = Y(s); return y.ortaklar.reduce((a, o) => a + o.pay, 0) + (y.halka?.pay ?? 0); };
export const MAX_DIS = 0.49;
/** Şirket değeri (₺): kâr çarpanı + ciro + varlıklar. */
export function sirketDegeri(s: GameState): { deger: number; buyume: number; kar: number; ciro: number } {
  const r = s.rapor, son = r.slice(-90), n = Math.max(1, son.length), kar = son.reduce((a, x) => a + x.kar, 0) / n * 365, ciro = son.reduce((a, x) => a + x.toplamGelir, 0) / n * 365;
  const a = r.slice(-30), b = r.slice(-60, -30), ta = a.reduce((p, x) => p + x.toplamGelir, 0), tb = b.reduce((p, x) => p + x.toplamGelir, 0), buyume = b.length >= 20 && tb > 0 ? ta / tb - 1 : 0;
  const mult = cl(4 + 15 * buyume, 2.5, 8), v = Math.max(0, kar) * mult + ciro * 0.3 + s.marka_puani * 40000 * F(s) + s.franchise.length * 300000 * F(s) + s.subeler.length * 250000 * F(s) + Math.max(0, s.kasa) * 0.8 - s.borc;
  return { deger: Math.max(s.subeler.length * 250000 * F(s), v), buyume, kar, ciro };
}
/* ---------- Teklifler ---------- */
export function teklifUret(s: GameState): Teklif | null {
  const y = Y(s), now = dayOf(s), d = sirketDegeri(s).deger, kalan = YATIRIMCILAR.filter((x) => !y.ortaklar.some((o) => o.id === x.id)); if (!kalan.length) return null;
  const yt = kalan[h32(s.seed, now, Math.round(d / 1000)) % kalan.length]!, pr = { agresif: [0.2, 0.3, 0.8], buyume: [0.12, 0.2, 0.95], kar: [0.1, 0.18, 1], sabir: [0.08, 0.14, 1.05] }[yt.kisilik], pay = Math.round((pr[0]! + (pr[1]! - pr[0]!) * rand(s.rng, 'events')) * 100) / 100;
  if (disPay(s) + pay > MAX_DIS) return null; return { yid: yt.id, ad: yt.ad, kisilik: yt.kisilik, pay, sermaye: Math.round(d * pay * pr[2]! / 1000) * 1000, deger: Math.round(d), bit: now + 21, pazarlik: false };
}
export function teklifKabul(s: GameState): Res {
  const y = Y(s), t = y.teklif; if (!t) return no('Aktif teklif yok.'); if (disPay(s) + t.pay > MAX_DIS) return no('Dış pay sınırı (%49) aşılır; kontrolü kaybedemezsin.');
  s.kasa += t.sermaye; y.sermaye += t.sermaye; y.ortaklar.push({ id: t.yid, ad: t.ad, kisilik: t.kisilik, pay: t.pay, sermaye: t.sermaye, giris: dayOf(s), memnun: 70 }); s.bekleyen = s.bekleyen.filter((p) => p.id !== t.pid); y.teklif = null; y.son = dayOf(s);
  const m = `${t.ad} %${Math.round(t.pay * 100)} pay karşılığında ${Math.round(t.sermaye).toLocaleString('tr-TR')} ₺ sermaye koydu.`; s.log.unshift(`💼 ${m}`); yaz(s, undefined, m); return ok(m);
}
export function teklifPazarlik(s: GameState): Res {
  const y = Y(s), t = y.teklif; if (!t) return no('Aktif teklif yok.'); if (t.pazarlik) return no('Pazarlık yalnızca bir kez yapılır.'); t.pazarlik = true;
  if (rand(s.rng, 'events') < 0.55) { t.sermaye = Math.round(t.sermaye * 1.15 / 1000) * 1000; return ok(`Pazarlık tuttu: sermaye ${Math.round(t.sermaye).toLocaleString('tr-TR')} ₺'ye çıktı.`); } y.teklif = null; s.bekleyen = s.bekleyen.filter((p) => p.id !== t.pid); y.son = dayOf(s); return no(`${t.ad} pazarlıktan çekildi.`);
}
export function teklifRed(s: GameState): Res { const y = Y(s), t = y.teklif; if (!t) return no('Aktif teklif yok.'); s.bekleyen = s.bekleyen.filter((p) => p.id !== t.pid); y.teklif = null; y.son = dayOf(s); return ok('Teklif reddedildi.'); }
export function temettuAyarla(s: GameState, oran: number): Res { Y(s).temettu = cl(Math.round(oran * 100) / 100, 0, 0.6); return ok(`Temettü oranı %${Math.round(Y(s).temettu * 100)}.`); }
export function payGeriAl(s: GameState, id: string): Res {
  const y = Y(s), o = y.ortaklar.find((x) => x.id === id); if (!o) return no('Ortak yok.'); const bedel = Math.round(sirketDegeri(s).deger * o.pay * 1.2); if (s.kasa < bedel) return no(`Pay geri alımı için ${bedel.toLocaleString('tr-TR')} ₺ gerekir.`);
  s.kasa -= bedel; s.capexBugun += bedel; y.ortaklar = y.ortaklar.filter((x) => x !== o); const m = `${o.ad} payını (%${Math.round(o.pay * 100)}) geri aldın (−${bedel.toLocaleString('tr-TR')} ₺).`; yaz(s, undefined, m); return ok(m);
}
/* ---------- Halka arz ---------- */
export function halkaSart(s: GameState): Array<{ ad: string; v: number; h: number; ok: boolean; para?: boolean }> { const d = sirketDegeri(s).deger; return [
  { ad: 'Kafe seviyesi', v: levelOf(s), h: 5, ok: levelOf(s) >= 5 }, { ad: 'Şirket değeri', v: d, h: 300e6 * F(s), ok: d >= 300e6 * F(s), para: true }, { ad: 'Şube sayısı', v: s.subeler.length, h: 12, ok: s.subeler.length >= 12 }, { ad: 'Dış pay payı (≤ %29)', v: disPay(s) * 100, h: 29, ok: disPay(s) <= 0.29 }]; }
export const HALKA_PAY = 0.2, HISSE = 1_000_000;
export function halkaArz(s: GameState): Res {
  const y = Y(s); if (y.halka) return no('Şirket zaten halka açık.'); if (!halkaSart(s).every((x) => x.ok)) return no('Halka arz koşulları sağlanmadı.'); const d = sirketDegeri(s).deger, maliyet = Math.round(d * 0.03), sermaye = Math.round(d * HALKA_PAY * 0.92) - maliyet;
  s.kasa += sermaye; y.sermaye += sermaye; const ipo = d / HISSE; y.halka = { hisse: HISSE, fiyat: ipo * 0.95, ipoFiyat: ipo, pay: HALKA_PAY, duygu: 0.05, gecmis: [ipo * 0.95], dusukGun: 0 }; s.marka_puani = Math.min(100, s.marka_puani + 4);
  const m = `${s.marka.ad} borsada! Halka arzdan ${sermaye.toLocaleString('tr-TR')} ₺ sermaye geldi (arz maliyeti ${maliyet.toLocaleString('tr-TR')} ₺).`; s.log.unshift(`📈 ${m}`); yaz(s, undefined, m); return ok(m);
}
export function hisseGeriAlim(s: GameState): Res { const y = Y(s), h = y.halka; if (!h) return no('Halka açık değilsin.'); const bedel = Math.round(sirketDegeri(s).deger * 0.01); if (s.kasa < bedel) return no('Kasa yetersiz.'); s.kasa -= bedel; s.capexBugun += bedel; h.duygu = Math.min(0.5, h.duygu + 0.08); return ok(`Hisse geri alımı yapıldı (−${bedel.toLocaleString('tr-TR')} ₺): piyasa güveni arttı.`); }
/* ---------- Rakip satın alma ---------- */
export function satinAlBedel(s: GameState, id: string): number { const r = D(s).rakip.find((x) => x.id === id); return r ? Math.round(r.guc * 2.5e6 * F(s) * (1 + r.sehirler.length * 0.5) / 10000) * 10000 : 0; }
export function rakipSatinAl(s: GameState, id: string): Res {
  const d = D(s), r = d.rakip.find((x) => x.id === id), y = Y(s); if (!r) return no('Rakip yok.'); if (r.satin) return no('Bu zincir zaten satın alındı.'); if (levelOf(s) < 4) return no('Satın alma için kafe seviyesi 4 gerekir.'); if (!r.sehirler.length) return no('Bu zincirin henüz şubesi yok; satın alınacak bir şey yok.');
  if (sirketDegeri(s).deger < 60e6 * F(s)) return no('Satın alma için şirket değeri en az 60 M ₺ olmalı.'); const bedel = satinAlBedel(s, id); if (s.kasa < bedel) return no(`Satın alma bedeli ${bedel.toLocaleString('tr-TR')} ₺.`);
  s.kasa -= bedel; s.capexBugun += bedel; r.satin = dayOf(s); for (const c of r.sehirler) s.rakipler[c] = (s.rakipler[c] ?? []).filter((x) => !x.ad.startsWith(r.ad)); r.son = 'Satın alındı.'; s.marka_puani = Math.min(100, s.marka_puani + 3); y.satin.push(r.id);
  const m = `${r.ad} satın alındı (−${bedel.toLocaleString('tr-TR')} ₺): ${r.sehirler.length} şehirde rekabet kalktı, günlük gelir ortaklığı başladı.`; s.log.unshift(`🏁 ${m}`); yaz(s, undefined, m); return ok(m);
}
export const satinAlGelir = (s: GameState): number => D(s).rakip.filter((r) => r.satin).reduce((a, r) => a + 1200 * F(s) * r.sehirler.length * r.guc, 0);
/* ---------- Günlük ---------- */
hooks.gunOnce.push((s, toplam) => {
  const y = Y(s), d = D(s), now = dayOf(s), dt = dateOf(now); if (!s.subeler.length) return;
  const g = satinAlGelir(s); if (g) toplam.gelir.franchise += g;
  if (dt.ayGun === 1 || !y.deger.length) { const v = sirketDegeri(s).deger; if (!y.deger.length || y.deger[y.deger.length - 1]!.gun !== now) { y.deger.push({ gun: now, v }); if (y.deger.length > 60) y.deger.shift(); } }
  // halka açık hisse fiyatı
  const h = y.halka; if (h) { const v = sirketDegeri(s).deger, son = s.rapor[s.rapor.length - 1]; h.duygu = cl(h.duygu * 0.96 + (rand(s.rng, 'market') - 0.5) * 0.06 + (son ? (son.kar > 0 ? 0.004 : -0.01) : 0), -0.6, 0.6); const hedef = v / h.hisse * (1 + h.duygu); h.fiyat = Math.max(0.01, h.fiyat + (hedef - h.fiyat) * 0.18); h.gecmis.push(h.fiyat); if (h.gecmis.length > 90) h.gecmis.shift(); if (h.fiyat > h.ipoFiyat * 1.4) s.marka_puani = Math.min(100, s.marka_puani + 0.02); h.dusukGun = h.fiyat < h.ipoFiyat * 0.65 ? h.dusukGun + 1 : 0;
    if (h.dusukGun === 20 && s.bekleyen.length < 3) { s.bekleyen.push({ id: s.en++, tip: 'd_hisse', baslik: 'Hisse değer kaybı', metin: `${s.marka.ad} hisseleri halka arz fiyatının %35 altına indi. Yatırımcı güveni sarsılıyor.`, ikon: '📉', secenek: [{ ad: 'Hisse geri alımı yap', ac: 'Kasadan %1 değer kadar; güven artar.' }, { ad: 'Temettüyü %10 artır', ac: 'Hissedarı tatmin eder, nakit çıkar.' }, { ad: 'Bekle', ac: 'Piyasa kendini düzeltebilir.' }] }); } }
  // aylık temettü ve memnuniyet
  if (dt.ayGun === 1 && now > 20) {
    const son30 = s.rapor.slice(-30), kar = son30.reduce((a, r) => a + r.kar, 0), ciro = son30.reduce((a, r) => a + r.toplamGelir, 0), onc = s.rapor.slice(-60, -30).reduce((a, r) => a + r.toplamGelir, 0), buy = onc > 0 ? ciro / onc - 1 : 0, ext = disPay(s);
    if (ext > 0 && kar > 0) { const dag = Math.round(kar * y.temettu * ext); if (dag > 0 && s.kasa > dag) { s.kasa -= dag; s.capexBugun += dag; y.odenen += dag; s.log.unshift(`💸 Temettü dağıtıldı: ${dag.toLocaleString('tr-TR')} ₺ (oran %${Math.round(y.temettu * 100)}).`); } }
    for (const o of y.ortaklar) { const dm = o.kisilik === 'buyume' ? (buy >= 0.05 ? 6 : buy >= 0 ? 1 : -8) : o.kisilik === 'kar' ? (y.temettu >= 0.3 && kar > 0 ? 6 : y.temettu >= 0.15 ? 1 : -8) : o.kisilik === 'sabir' ? (kar >= 0 ? 3 : -6) : (buy >= 0.08 && y.temettu >= 0.25 ? 6 : -10); o.memnun = cl(o.memnun + dm, 0, 100);
      if (o.memnun < 30 && s.bekleyen.length < 3 && (d.son['yb' + o.id] ?? -99) < now - 60) { d.son['yb' + o.id] = now; s.bekleyen.push({ id: s.en++, tip: 'd_yatbaski', baslik: `${o.ad} baskı yapıyor`, metin: `${o.ad} (${KIS_AC[o.kisilik].ad}) memnun değil: ${KIS_AC[o.kisilik].ist} Yönetim kurulunda sert çıkışlar var.`, ikon: '💼', secenek: [{ ad: 'Temettüyü %10 artır', ac: 'Memnuniyet +10.' }, { ad: 'Payını geri satın al', ac: 'Piyasa değerinin %120\'si; ortaklık biter.' }, { ad: 'Yok say', ac: 'Memnuniyet −10, marka −2.' }], city: undefined }); (d.bag[s.en - 1] = { olay: o.id } as never); } }
  }
  // yeni teklif
  if (y.teklif && y.teklif.bit <= now) { s.bekleyen = s.bekleyen.filter((p) => p.id !== y.teklif!.pid); y.teklif = null; y.son = now; }
  if (!y.teklif && levelOf(s) >= 3 && now - y.son > 60 && sirketDegeri(s).deger >= 6e6 * F(s) && rand(s.rng, 'events') < 0.04) {
    const t = teklifUret(s); if (t) { y.teklif = t; if (s.bekleyen.length < 3) { const pid = s.en++; t.pid = pid; s.bekleyen.push({ id: pid, tip: 'd_yat', baslik: `${t.ad} yatırım teklifi`, metin: `Şirket değerin ${t.deger.toLocaleString('tr-TR')} ₺. ${t.ad} (${KIS_AC[t.kisilik].ad}) %${Math.round(t.pay * 100)} paya karşılık ${t.sermaye.toLocaleString('tr-TR')} ₺ koymak istiyor. ${KIS_AC[t.kisilik].ist} Teklif 21 gün geçerli.`, ikon: YATIRIMCILAR.find((x) => x.id === t.yid)?.ik ?? '💼', secenek: [{ ad: 'Kabul et', ac: `+${t.sermaye.toLocaleString('tr-TR')} ₺ sermaye, %${Math.round(t.pay * 100)} pay verirsin.` }, { ad: 'Pazarlık et', ac: '%55: %15 daha fazla sermaye; olmazsa teklif çekilir.' }, { ad: 'Reddet', ac: '60 gün yeni teklif gelmez.' }] }); } else s.log.unshift(`💼 ${t.ad} yatırım teklifi var (Kasa → Yatırımcılar).`); } }
});
olayIsleyici.push((s, p, secim) => {
  if (p.tip === 'd_yat') { const y = Y(s); y.teklif && (y.teklif.pid = undefined); const r = secim === 0 ? teklifKabul(s) : secim === 1 ? teklifPazarlik(s) : teklifRed(s); if (secim === 1 && y.teklif) { /* pazarlık sonrası teklif sürer: yeniden sor */ const pid = s.en++; y.teklif.pid = pid; s.bekleyen.push({ id: pid, tip: 'd_yat', baslik: 'Yeni şartlar', metin: `Pazarlık sonrası: ${y.teklif.ad} ${y.teklif.sermaye.toLocaleString('tr-TR')} ₺ koymaya hazır (%${Math.round(y.teklif.pay * 100)}).`, ikon: '💼', secenek: [{ ad: 'Kabul et', ac: 'Anlaşmayı bitir.' }, { ad: 'Pazarlık (yapıldı)', ac: 'Bir kez yapılabilir.' }, { ad: 'Reddet', ac: 'Teklifi kapat.' }] }); } return r.m; }
  if (p.tip === 'd_yatbaski') { const d = D(s), y = Y(s), c = d.bag[p.id] as { olay?: string } | undefined, o = y.ortaklar.find((x) => x.id === c?.olay); delete d.bag[p.id]; if (!o) return ''; if (secim === 0) { y.temettu = cl(y.temettu + 0.1, 0, 0.6); o.memnun = cl(o.memnun + 10, 0, 100); return `Temettü oranı %${Math.round(y.temettu * 100)}'e çıktı.`; } if (secim === 1) return payGeriAl(s, o.id).m; o.memnun = cl(o.memnun - 10, 0, 100); for (const b of s.subeler) b.marka = cl(b.marka - 2, 0, 100); return 'Baskı görmezden gelindi; kurul gerginleşti.'; }
  if (p.tip === 'd_hisse') { const y = Y(s); if (secim === 0) return hisseGeriAlim(s).m; if (secim === 1) { y.temettu = cl(y.temettu + 0.1, 0, 0.6); return `Temettü oranı %${Math.round(y.temettu * 100)}.`; } return 'Beklemeye karar verdin.'; }
  return null;
});
void cityById;
