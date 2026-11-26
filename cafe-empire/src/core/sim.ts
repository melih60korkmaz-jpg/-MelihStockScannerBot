import { CITIES, cityById, type City } from '../data/turkey';
import { AD, ADS, INGREDIENTS, ING, PRODUCTS, PRODUCT, SHOP, STAFF_TYPE, type IngId, type ProductId, type ProductDef } from '../data/catalog';
import { rand, randInt, pick } from './rng';
import { profilBranch, olgunluk } from './region';
import { qualMult, energyMult, maintenanceDaily, brandDaily } from './invest';
import { capacityAt, coverage, dailyHr, shiftHours, staffOf, eff } from './hr';
import { autoOrder, deliverAll, holdingCost, ingPrice, orderStock, spoilage, syncLots, usageOf } from './supply';
export { ingPrice, orderStock };
import type { Branch, DayAcc, DayReport, Employee, GameState, SimEvent, Review, Rival } from './types';

export { MIN_PER_DAY, START_MONTH, START_YEAR, dateOf, dayOf, hourOf, dateText, timeText } from './calendar';
import { dateOf, dayOf, hourOf } from './calendar';
export const isDay = (hour: number) => hour >= 6.5 && hour < 19.5;

/* ===================== Piyasa ve fiyatlar ===================== */
export const inflationIdx = (s: GameState) => s.market.fiyat;
export function modValue(s: GameState, key: string, now = dayOf(s)): number { const m = s.market.mod[key]; return m && m.bit > now ? m.v : 1; }
/** Pazardaki referans satış fiyatı (oyuncunun fiyat oranı bununla çarpılır). */
export function refPrice(s: GameState, p: ProductDef, c: City): number { return Math.round(p.fiyat * inflationIdx(s) * (0.82 + 0.28 * c.gelir) * (0.96 + 0.06 * c.kira / 3)); }
export function sellPrice(s: GameState, b: Branch, id: ProductId): number { const c = cityById(b.city); return Math.round(refPrice(s, PRODUCT[id], c) * (0.92 + 0.08 * profilBranch(b).gelir) * b.menu[id].fiyat); }
export function unitCost(s: GameState, id: ProductId, c: City): number {
  let t = 0; const r = PRODUCT[id].recete; for (const k of Object.keys(r) as IngId[]) t += ((r[k] ?? 0) / ING[k].paket) * ingPrice(s, k, c); return t;
}
const qualityMult = (k: number) => 1 + 0.12 * (k - 1);

/* ===================== Seviye ===================== */
export function levelOf(s: GameState): number {
  const n = s.subeler.length, m = s.marka_puani; let lv = 1;
  const rules: Array<[number, number, number]> = [[2, 1, 18], [3, 1, 35], [4, 1, 50], [5, 2, 55], [6, 6, 65], [7, 15, 78], [8, 30, 90]];
  for (const [l, sb, mk] of rules) if (n >= sb && m >= mk) lv = l; return lv;
}

/* ===================== Personel (hr.ts) ===================== */
export { makeEmployee, staffOf, eff as effOf } from './hr';
/* ===================== Hava ve mevsim ===================== */
export function weatherFor(s: GameState, c: City, gun: number): GameState['hava'][number] {
  const m = dateOf(gun).ay, soguk = (c.region === 'D' || c.region === 'I' || c.region === 'K') ? 1 : 0.5, kis = m === 11 || m <= 1;
  const r = rand(s.rng, 'misc'); const kar = kis ? 0.18 * soguk : (m === 2 || m === 10 ? 0.04 * soguk : 0), yag = (m >= 9 || m <= 3 ? 0.22 : 0.07) + (c.region === 'K' ? 0.12 : 0);
  if (r < kar) return 'kar'; if (r < kar + yag) return 'yagmur'; return r < 0.6 ? 'gunesli' : 'bulutlu';
}
export function seasonTourism(c: City, ay: number): number { // 0.4–1.7
  const yaz = [0.4, 0.4, 0.55, 0.8, 1.0, 1.4, 1.7, 1.7, 1.3, 0.9, 0.55, 0.5][ay] ?? 1; const dalga = c.kiyi ? 1 : 0.45;
  return 1 + (yaz - 1) * dalga;
}
const HOUR_CURVE = [0, 0, 0, 0, 0, 0, 0, 0, 0.6, 1.2, 1.4, 1.0, 1.2, 1.6, 1.2, 0.9, 1.0, 1.3, 1.5, 1.4, 1.1, 0.8, 0.5, 0.2];
const HOUR_SUM = HOUR_CURVE.reduce((a, b) => a + b, 0);

/* ===================== Pazar ve talep ===================== */
export function rivalPressure(s: GameState, b: Branch): number {
  const rv = s.rakipler[b.city] ?? []; let p = 0;
  for (const r of rv) { const ucuz = (1 / Math.max(0.7, rivalFiyat(s, r))); p += 0.045 * (1 + 0.5 * r.reklam) * (0.7 + 0.15 * r.kalite) * Math.pow(r.sube, 0.4) * clampN(ucuz, 0.8, 1.3); }
  return p * (0.6 + SHOP[b.tip].rekabet);
}
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function facadeAppeal(b: Branch): number { const f = b.facade; return 1 + 0.03 * f.tabela + 0.025 * f.cam + 0.03 * f.led + 0.06 * f.premium + 0.02 * f.marka + 0.015 * f.kapi + 0.02 * f.oturma + 0.015 * f.peyzaj + 0.04 * f.vitrin + 0.02 * f.tente; }
export function outdoorSeats(b: Branch): number { return SHOP[b.tip].masa === 0 ? 0 : (SHOP[b.tip].masa + 2 * b.facade.oturma) * 4; }
export function adEffect(b: Branch, now: number): { trafik: number; marka: number; indirim: boolean; paket: boolean; ikinci: boolean } {
  let t = 0, m = 0, ind = false, pk = false, ik = false; for (const a of b.reklam) { if (a.bit <= now || !a.tuttu) continue; const d = AD[a.id]; t += d.trafik; m += d.marka / d.gun; if (a.id === 'indirim') ind = true; if (a.id === 'paket') pk = true; if (a.id === 'ikinci') ik = true; } return { trafik: t, marka: m, indirim: ind, paket: pk, ikinci: ik };
}
/** Menü fiyat düzeyi (talep ağırlıklı): fiyatların tümü birlikte artarsa gelen müşteri de azalır. */
export function priceLevel(s: GameState, b: Branch, ae?: { indirim: boolean }): number {
  const rv = avgRivalPrice(s, b.city), disc = ae?.indirim ? 0.9 : 1; let w = 0, t = 0;
  for (const p of PRODUCTS) { const m = b.menu[p.id]; if (!m?.aktif) continue; w += p.talep; t += p.talep * m.fiyat * disc * (rv > 0 ? Math.pow(1 / rv, 0.25) : 1); } return w ? t / w : 1;
}
export function priceFactor(s: GameState, b: Branch, ae?: { indirim: boolean }): number { const c = cityById(b.city); const eks = 1.5 - 0.25 * (c.gelir - 1) - (b.tip === 'luks' ? 0.5 : 0); return Math.exp(-0.7 * eks * (priceLevel(s, b, ae) - 1)); }
export function dailyDemand(s: GameState, b: Branch): number {
  const c0 = cityById(b.city), pf = profilBranch(b), st = SHOP[b.tip], now = dayOf(s), d = dateOf(now), ae = adEffect(b, now);
  const c = pf.turizm < 0 ? c0 : { ...c0, turizm: 0.5 * c0.turizm + 0.5 * pf.turizm, ogrenci: 0.5 * c0.ogrenci + 0.5 * pf.ogrenci };
  const talepIdx = clampN(0.5 + 0.28 * Math.log(1 + c.talep * 1.2), 0.5, 1.9);
  const marka = 0.4 + 0.012 * (0.6 * b.marka + 0.4 * s.marka_puani) + 0.12 * (b.yorumPuan - 3.5), hava = { gunesli: 1.05, bulutlu: 1, yagmur: 0.72, kar: 0.6 }[s.hava[b.city] ?? 'bulutlu'];
  const turizm = 1 + c.turizm * (seasonTourism(c, d.ay) - 1) * 0.9, hafta = d.haftaGun >= 5 ? 1.15 : 1;
  const ogr = SHOP[b.tip].id === 'uni' ? 1 + 0.5 * c.ogrenci : 1 + 0.2 * c.ogrenci, ogrTatil = (d.ay >= 5 && d.ay <= 7) ? 1 - 0.35 * c.ogrenci : 1;
  const rv = 1 - Math.min(0.5, rivalPressure(s, b)), mod = modValue(s, 'talep') * modValue(s, 'talep_' + b.city);
  return st.potansiyel * 1.75 * pf.talep * olgunluk(s, b) * talepIdx * marka * hava * turizm * hafta * ogr * ogrTatil * rv * mod * facadeAppeal(b) * (1 + ae.trafik) * priceFactor(s, b, ae) * (b.hijyen < 40 ? 0.85 : 1);
}

/* ===================== Müşteri ve sipariş ===================== */
function poisson(s: GameState, lam: number): number { if (lam <= 0) return 0; const L = Math.exp(-Math.min(lam, 30)); let k = 0, p = 1; do { k++; p *= rand(s.rng, 'customers'); } while (p > L && k < 60); return k - 1; }
export const SEG_KEYS = ['ogr', 'cal', 'tur', 'aile', 'emk'] as const;
export const SEG_ESNEKLIK = (seg: typeof SEG_KEYS[number]): number => ({ ogr: 2.2, cal: 1.2, tur: 1.0, aile: 1.6, emk: 1.8 } as const)[seg];
const ESEG = { ogr: 2.2, cal: 1.2, tur: 1.0, aile: 1.6, emk: 1.8 } as const;
export function segWeights(b: Branch, c: City): Record<typeof SEG_KEYS[number], number> {
  const w = { ...c.profil }; const t = b.tip; if (t === 'uni') w.ogr *= 2.4; if (t === 'sahil') { w.tur *= 1.8; w.aile *= 1.3; } if (t === 'avm') { w.aile *= 1.6; w.ogr *= 1.2; } if (t === 'luks') { w.cal *= 1.6; w.tur *= 1.4; w.ogr *= 0.5; } return w;
}
function pickSegment(s: GameState, b: Branch, c: City): typeof SEG_KEYS[number] {
  const w = segWeights(b, c);
  const tot = SEG_KEYS.reduce((a, k) => a + w[k], 0); let r = rand(s.rng, 'customers') * tot; for (const k of SEG_KEYS) { r -= w[k]; if (r <= 0) return k; } return 'cal';
}
const TIP_NAME = (seg: typeof SEG_KEYS[number], grup: number, b: Branch, r: number): string => {
  if (seg === 'ogr') return grup >= 3 ? 'arkadas' : 'ogrenci'; if (seg === 'cal') return b.tip === 'luks' && r < 0.4 ? 'is' : 'calisan'; if (seg === 'tur') return 'turist';
  if (seg === 'aile') return grup >= 3 ? 'cocuklu' : 'aile'; return 'emekli';
};
export function productAvailable(b: Branch, p: ProductDef, lv: number): boolean {
  if (!b.menu[p.id].aktif || lv < p.seviye) return false; const r = p.recete; for (const k of Object.keys(r) as IngId[]) if ((b.stok[k] ?? 0) < (r[k] ?? 0)) return false; return true;
}
/** Rakibin o günkü etkin fiyat oranı (kampanya varsa indirimli). */
export function rivalFiyat(s: GameState, r: Rival): number { return r.kampanya && r.kampanya.bit > dayOf(s) ? r.fiyat * (1 - r.kampanya.indirim) : r.fiyat; }
function avgRivalPrice(s: GameState, city: number): number { const rv = s.rakipler[city] ?? []; return rv.length ? rv.reduce((a, r) => a + rivalFiyat(s, r), 0) / rv.length : 1; }
/** Tahmini yerel pazar payı: aynı şehirdeki kafelerin çekicilik puanına göre (şehirdeki oyuncu şubeleri toplanır). */
export function marketShare(s: GameState, city: number): { sen: number; rakipler: Array<{ r: Rival; pay: number }> } {
  const rv = s.rakipler[city] ?? [], mine = s.subeler.filter((b) => b.city === city);
  const puan = (kal: number, fiyat: number, rek: number, sube: number) => Math.max(0.01, kal * (1 / Math.max(0.7, fiyat)) * (1 + 0.4 * rek) * Math.pow(sube, 0.5));
  const me = mine.reduce((a, b) => a + puan(0.6 + b.memnuniyet / 100 * 0.8 + b.marka / 250, b.menu.latte?.fiyat ?? 1, b.reklam.length ? 0.8 : 0.2, 1) * 1.1, 0);
  const rs = rv.map((r) => ({ r, p: puan(0.7 + 0.15 * r.kalite, rivalFiyat(s, r), r.reklam, r.sube) })), tot = me + rs.reduce((a, x) => a + x.p, 0);
  return { sen: tot ? me / tot : 0, rakipler: rs.map((x) => ({ r: x.r, pay: tot ? x.p / tot : 0 })) };
}

function processCustomer(s: GameState, b: Branch, ev: SimEvent[], c: City): void {
  const seg = pickSegment(s, b, c), r0 = rand(s.rng, 'customers'), grup = r0 < 0.58 ? 1 : r0 < 0.84 ? 2 : r0 < 0.95 ? 3 : 4, lv = levelOf(s), ae = adEffect(b, dayOf(s));
  const hata = { sebep: 'stok' as const };
  void hata; const acc = b.bugun; const eks = ESEG[seg] - 0.25 * (c.gelir - 1) - (b.tip === 'luks' ? 0.5 : 0);
  const rivalAv = avgRivalPrice(s, b.city); let totalPrep = 0, totalGelir = 0, kahveG = 0, yiyG = 0, any = false, kaybettiFiyat = false;
  const items: Array<[ProductId, number]> = [];
  for (let k = 0; k < grup; k++) {
    const nItem = rand(s.rng, 'customers') < (ae.ikinci ? 0.62 : 0.4) ? 2 : 1, wantFood = rand(s.rng, 'customers') < 0.42;
    for (let q = 0; q < nItem; q++) {
      const food = q === 1 || (nItem === 1 && wantFood), cand: Array<[ProductDef, number]> = []; let tot = 0;
      for (const p of PRODUCTS) {
        if ((p.kat === 'yiyecek') !== food) continue; if (!productAvailable(b, p, lv)) continue; const mi = b.menu[p.id];
        const pr = mi.fiyat * (ae.indirim ? 0.9 : 1) * (rivalAv > 0 ? Math.pow(1 / rivalAv, 0.25) : 1), month = dateOf(dayOf(s)).ay, yaz = month >= 5 && month <= 8, kis = month <= 1 || month === 11;
        const sez = p.soguk ? (yaz ? 1.9 : kis ? 0.35 : 1) : p.sicak ? (yaz ? 0.85 : kis ? 1.2 : 1) : 1;
        const w = p.talep * p.aff[SEG_KEYS.indexOf(seg)]! * sez * Math.exp(-eks * (pr - 1)) * (0.85 + 0.15 * mi.kalite);
        cand.push([p, w]); tot += w;
      }
      if (!cand.length) continue;
      let r = rand(s.rng, 'customers') * tot * 1.12; let chosen: ProductDef | null = null; for (const [p, w] of cand) { r -= w; if (r <= 0) { chosen = p; break; } }
      if (!chosen) { kaybettiFiyat = true; continue; }
      items.push([chosen.id, 1]);
    }
  }
  if (!items.length) { acc.kayip++; ev.push({ t: 'kayip', branch: b.id, sebep: kaybettiFiyat ? 'fiyat' : 'stok' }); if (!kaybettiFiyat) acc.stokYok++; return; }
  // kapasite: iş birikmişse müşteri vazgeçebilir
  const hour = hourOf(s), hg = dateOf(dayOf(s)).haftaGun, cov = coverage(b, hour, hg, dayOf(s));
  if (cov.barista + cov.kasiyer <= 0) { acc.kayip++; acc.satSum += 15; acc.satN++; ev.push({ t: 'kayip', branch: b.id, sebep: 'personel' }); return; }
  const cap = Math.max(60, capacityAt(s, b, hour, hg, dayOf(s))), bekle = (b.backlog / cap) * 10;        // dakika
  const sabir = { ogr: 12, cal: 6, tur: 14, aile: 12, emk: 15 }[seg] + (cov.servis > 0 ? 2 : 0);
  if (bekle > sabir) { acc.kayip++; acc.satSum += 25; acc.satN++; ev.push({ t: 'kayip', branch: b.id, sebep: 'kuyruk' }); return; }
  const paket = rand(s.rng, 'customers') < (ae.paket ? 0.3 : 0.12); const gelirler: Array<[ProductId, number]> = [];
  for (const [idx, [id]] of items.entries()) {
    const p = PRODUCT[id], price = sellPrice(s, b, id) * (ae.indirim ? 0.9 : 1) * (ae.ikinci && idx > 0 ? 0.75 : 1); totalPrep += p.sure; totalGelir += price; any = true;
    for (const k of Object.keys(p.recete) as IngId[]) b.stok[k] = (b.stok[k] ?? 0) - (p.recete[k] ?? 0); if (paket) b.stok.pack = Math.max(0, (b.stok.pack ?? 0) - 1);
    acc.adet[id] = (acc.adet[id] ?? 0) + 1; acc.cogs += unitCost(s, id, c); acc.itemN++; acc.kalSum += b.menu[id].kalite * b.malKalite * qualMult(b); acc.fiyatSum += b.menu[id].fiyat * (ae.indirim ? 0.9 : 1); gelirler.push([id, price]);
  }
  if (!any) return; b.backlog += totalPrep;
  if (paket) acc.gelir.paket += totalGelir; else gelirler.forEach(([id, pr], i) => { if (ae.indirim || ae.ikinci) acc.gelir.kampanya += pr; else if (i > 0) acc.gelir.ek += pr; else if (PRODUCT[id].kat === 'kahve') acc.gelir.kahve += pr; else acc.gelir.yiyecek += pr; });
  void kahveG; void yiyG;
  acc.musteri++;
  // memnuniyet: bekleme, fiyat adaleti, kalite, hijyen, görünüm
  const kal = items.reduce((a, [id]) => a + b.menu[id].kalite, 0) / items.length, fiyatO = items.reduce((a, [id]) => a + b.menu[id].fiyat, 0) / items.length;
  let sat = 62 + 8 * (kal - 1) - 28 * (fiyatO - 1) - Math.min(30, bekle * 3) + 0.15 * (b.hijyen - 60) + 3 * (facadeAppeal(b) - 1) * 10 + (cov.servis > 0 ? 3 : 0) + (cov.iliski - 60) * 0.08 + (cov.disiplin - 60) * 0.03 + (cov.sorumlu ? 2 : 0);
  sat = clampN(sat + (b.malKalite * qualMult(b) - 1) * 30 + (rand(s.rng, 'customers') - 0.5) * 14, 0, 100); if (sat < 38) acc.sikayet++; if (rand(s.rng, 'customers') < 0.1 + b.sadakat * 0.006 + (sat - 60) * 0.004) acc.tekrar++; if (rand(s.rng, 'customers') < b.sadakat * 0.004) acc.sadik++; acc.satSum += sat; acc.satN++; acc.bekleme += bekle; acc.beklemeN++;
  const dis = outdoorSeats(b) > 0 && rand(s.rng, 'customers') < 0.45 && s.hava[b.city] !== 'yagmur' && s.hava[b.city] !== 'kar';
  ev.push({ t: 'musteri', branch: b.id, tip: TIP_NAME(seg, grup, b, rand(s.rng, 'customers')), grup, dis, sure: 12 + Math.floor(rand(s.rng, 'customers') * 35), paket, seed: Math.floor(rand(s.rng, 'customers') * 1e6) });
}

/* ===================== Zaman adımı ===================== */
export const emptyAcc = (): DayAcc => ({ gelir: { kahve: 0, yiyecek: 0, ek: 0, kampanya: 0, paket: 0, toplu: 0, etkinlik: 0, franchise: 0 }, gider: { kira: 0, elektrik: 0, su: 0, internet: 0, maas: 0, malzeme: 0, fire: 0, stok: 0, vergi: 0, bakim: 0, reklam: 0, sigorta: 0, prim: 0, egitim: 0, isealim: 0 }, musteri: 0, kayip: 0, stokYok: 0, adet: {}, satSum: 0, satN: 0, bekleme: 0, beklemeN: 0, cogs: 0, alim: 0, itemN: 0, kalSum: 0, fiyatSum: 0, tekrar: 0, sadik: 0, sikayet: 0, ort: 0 });
const sumObj = (o: object) => Object.values(o as Record<string, number>).reduce((a, b) => a + b, 0);

export function openHours(b: Branch): [number, number] { return b.tip === 'avm' ? [10, 22] : b.tip === 'sahil' ? [8, 24] : b.tip === 'luks' ? [9, 23] : [8, 23]; }
function stepTen(s: GameState, ev: SimEvent[]): void {
  const hour = hourOf(s);
  for (const b of s.subeler) {
    if (!b.acik || !b.kuruldu) continue; const c = cityById(b.city), o = b.mesai.aci, k = b.mesai.kapa;
    const cap = capacityAt(s, b, hour, dateOf(dayOf(s)).haftaGun, dayOf(s)); b.backlog = Math.max(0, b.backlog - cap);
    if (hour < o || hour >= k) continue;
    const idx = Math.floor(hour), w = HOUR_CURVE[idx] ?? 0, perTen = (dailyDemand(s, b) * (w / HOUR_SUM)) / 6;
    const n = poisson(s, perTen); for (let i = 0; i < n; i++) processCustomer(s, b, ev, c);
  }
}

/* ===================== Günlük kapanış ===================== */
const reviewText = {
  iyi: ['Kahve harika, servis hızlı!', 'Çok keyifli bir mekân, tekrar geleceğim.', 'Dışarıdaki masalar çok şirin.', 'Tatlılar taze ve lezzetli.', 'Personel güler yüzlü.'],
  orta: ['Fena değil ama biraz beklettiler.', 'Kahve güzel, fiyat biraz yüksek.', 'Ortalama bir deneyim.'],
  kotu: ['Çok bekledik, ilgilenen yoktu.', 'Fiyatlar çok yüksek.', 'Masalar temiz değildi.', 'İstediğim ürün yoktu.', 'Kahve soğuk geldi.'],
};
function dailyClose(s: GameState, ev: SimEvent[]): void {
  const gun = dayOf(s) - 1, F = inflationIdx(s), el = s.market.elektrik, now = dayOf(s);
  let toplam: DayReport = mkReport(gun, null);
  const rpts: DayReport[] = [];
  for (const b of s.subeler) {
    if (!b.kuruldu) continue; const c = cityById(b.city), st = SHOP[b.tip], acc = b.bugun, g = acc.gider;
    if (b.acik) {
      g.kira = b.kira / 30; g.elektrik = (st.m2 * 55 + 14000) / 30 * c.maliyet * el * F * (b.facade.led ? 1.12 : 1) * 0.8 * energyMult(b); g.su = (st.m2 * 14 + 3000) / 30 * c.maliyet * F;
      g.maas = b.staff.reduce((a, e) => a + e.maas * (e.mesai ? 1.12 : 1), 0) / 30; g.bakim = (st.m2 * 18 + 1200 * (b.facade.premium + b.facade.cam)) / 30 * F + maintenanceDaily(b) * F; g.sigorta = (st.m2 * 6 + 900) / 30 * F;
      g.vergi = sumObj(acc.gelir) * 0.08; g.internet = 1900 / 30 * F; g.stok = holdingCost(s, b);
    }
    g.fire = spoilage(s, b); g.malzeme = acc.cogs; for (const k of Object.keys(b.stok) as IngId[]) if ((b.stok[k] ?? 0) < 0) b.stok[k] = 0;
    for (const k of Object.keys(g) as Array<keyof typeof g>) s.kasa -= (k === 'malzeme' || k === 'fire' || k === 'reklam' || k === 'prim' || k === 'egitim' || k === 'isealim') ? 0 : g[k];   // bunlar işlem anında ödendi (malzeme: alımda)
    const rev = reportOf(gun, acc, b); rpts.push(rev); b.gecmis.push(rev); if (b.gecmis.length > 90) b.gecmis.shift();
    // hijyen, personel, memnuniyet, marka
    const tem = staffOf(b, 'temizlik').reduce((a, e) => a + (e.izin === dateOf(gun).haftaGun || e.hasta > 0 ? 0 : eff(e) * shiftHours(b, e) / 8), 0);
    b.hijyen = clampN(b.hijyen - 1.2 - acc.musteri * 0.012 + 0.45 * Math.min(4, b.staff.length) + tem * 3.0 + (staffOf(b, 'sube_muduru').length ? 0.8 : 0), 0, 100);
    const cleanUse = Math.max(0.5, st.m2 / 35 * 0.55) + acc.musteri * 0.004; const hadClean = (b.stok.clean ?? 0) >= cleanUse; b.stok.clean = Math.max(0, (b.stok.clean ?? 0) - cleanUse); b.kullanim.clean = (b.kullanim.clean ?? 0) * 0.7 + cleanUse * 0.3; if (!hadClean) b.hijyen = clampN(b.hijyen - 4, 0, 100);
    b.mus = { ortSiparis: acc.musteri ? acc.itemN / acc.musteri : 0, ortBekleme: acc.beklemeN ? acc.bekleme / acc.beklemeN : 0, hizmet: acc.satN ? Math.max(0, 100 - (acc.bekleme / Math.max(1, acc.beklemeN)) * 6) : b.mus.hizmet, urunKal: acc.itemN ? acc.kalSum / acc.itemN : b.mus.urunKal, fiyatMemn: acc.itemN ? clampN(100 - (acc.fiyatSum / acc.itemN - 1) * 120, 0, 100) : b.mus.fiyatMemn, tekrar: acc.musteri ? acc.tekrar / acc.musteri * 100 : b.mus.tekrar, sadik: acc.musteri ? acc.sadik / acc.musteri * 100 : b.mus.sadik, sikayet: acc.sikayet }; b.sonAdet = { ...acc.adet };
    const sat = acc.satN ? acc.satSum / acc.satN : b.memnuniyet; b.memnuniyet = Math.round((b.memnuniyet * 0.7 + sat * 0.3) * 10) / 10;
    const mkt = staffOf(b, 'pazarlama').length + s.subeler.reduce((a, x) => a + staffOf(x, 'pazarlama').length, 0) * 0.0, ae = adEffect(b, now);
    b.sadakat = clampN(b.sadakat + (sat - 60) * 0.01 + (b.reklam.some((a) => a.id === 'sadakat' && a.bit > now) ? 0.08 : 0), 0, 100);
    b.marka = clampN(b.marka + brandDaily(b) + (sat - 60) * 0.012 + ae.marka + 0.05 * mkt + (acc.musteri > 80 ? 0.05 : 0) - 0.05, 0, 100);
    dailyHr(s, b, { log: (m) => s.log.unshift(m) }); if (!b.staff.length && s.bekleyen.length < 3) s.bekleyen.push({ id: s.en++, tip: 'istifa', baslik: 'Şubede çalışan kalmadı', metin: `${b.ad} şubesinde personel kalmadı; yeni ilan ver.`, ikon: '🚪', secenek: [{ ad: 'Tamam', ac: 'İlan ver ve işe al.' }], branch: b.id });
    b.reklam = b.reklam.filter((a) => a.bit > now);
    makeReviews(s, b, sat, gun);
    const us = usageOf(b, (id) => PRODUCT[id as ProductId].recete); for (const ing of INGREDIENTS) if (ing.id !== 'clean') b.kullanim[ing.id] = (b.kullanim[ing.id] ?? 0) * 0.7 + (us[ing.id] ?? 0) * 0.3;
    b.bugun = emptyAcc();
    if (b.otoSiparis) autoOrder(s, b);   // alım ertesi günün nakit akışına yazılır
  }
  for (const r of rpts) { for (const k of Object.keys(r.gelir) as Array<keyof DayReport['gelir']>) toplam.gelir[k] += r.gelir[k]; for (const k of Object.keys(r.gider) as Array<keyof DayReport['gider']>) toplam.gider[k] += r.gider[k]; toplam.musteri += r.musteri; toplam.kayip += r.kayip; toplam.alim += r.alim; toplam.memnuniyet += r.memnuniyet / Math.max(1, rpts.length); }
  toplam.capex = s.capexBugun; s.capexBugun = 0;
  toplam = finalize(toplam); s.rapor.push(toplam); if (s.rapor.length > 800) s.rapor.shift(); s.ayKar += toplam.kar; s.ayGelir += toplam.toplamGelir;
  // ay sonu geliri vergisi
  const d = dateOf(dayOf(s)); if (d.ayGun === 1) { const vergi = Math.max(0, s.ayKar) * 0.10; s.kasa -= vergi; s.ayKar = 0; s.ayGelir = 0; s.log.unshift(`Ay sonu gelir vergisi ödendi: ${Math.round(vergi)} ₺`); s.log = s.log.slice(0, 40); }
  s.kasa += toplam.toplamGelir; s.borc *= 1 + 0.002;   // borç faizi (günlük ≈ yıllık %70 değil: aylık %6'dan düşük)
  marketDay(s); rivalsDay(s); deliverAll(s, (m) => { s.log.unshift(m); s.log = s.log.slice(0, 40); }); weatherDay(s); randomEvent(s, ev);
  s.marka_puani = clampN(s.marka_puani * 0.995 + 0.005 * (s.subeler.length ? s.subeler.reduce((a, b) => a + b.marka, 0) / s.subeler.length : 0), 0, 100);
  s.seviye = levelOf(s); if (s.kasa < -50000) s.negatifGun++; else s.negatifGun = 0; if (s.negatifGun >= 20) s.oyunBitti = 'iflas';
  ev.push({ t: 'gun', gun: dayOf(s) });
}
function mkReport(gun: number, b: Branch | null): DayReport { void b; const e = emptyAcc(); return { gun, gelir: e.gelir, gider: e.gider, toplamGelir: 0, toplamGider: 0, kar: 0, musteri: 0, kayip: 0, memnuniyet: 0, cogs: 0, brut: 0, alim: 0, capex: 0, nakit: 0 }; }
function finalize(r: DayReport): DayReport { r.toplamGelir = sumObj(r.gelir); r.toplamGider = sumObj(r.gider); r.kar = r.toplamGelir - r.toplamGider; r.cogs = r.gider.malzeme; r.brut = r.toplamGelir - r.cogs; r.nakit = r.toplamGelir - (r.toplamGider - r.gider.malzeme - r.gider.fire) - r.alim - r.capex; return r; }
function reportOf(gun: number, a: DayAcc, b: Branch): DayReport { const r = mkReport(gun, b); r.gelir = { ...a.gelir }; r.gider = { ...a.gider }; r.musteri = a.musteri; r.kayip = a.kayip; r.alim = a.alim; r.memnuniyet = a.satN ? a.satSum / a.satN : b.memnuniyet; return finalize(r); }
function makeReviews(s: GameState, b: Branch, sat: number, gun: number): void {
  const n = Math.min(3, Math.floor(b.bugun.musteri / 30) + (rand(s.rng, 'customers') < 0.4 ? 1 : 0)); const FN = ['Ayşe', 'Mehmet', 'Elif', 'Can', 'Zeynep', 'Burak', 'Selin', 'Emre'];
  for (let i = 0; i < n; i++) {
    const x = sat + (rand(s.rng, 'customers') - 0.5) * 30, y = x >= 80 ? 5 : x >= 68 ? 4 : x >= 55 ? 3 : x >= 40 ? 2 : 1, list = y >= 4 ? reviewText.iyi : y === 3 ? reviewText.orta : reviewText.kotu;
    const rv: Review = { gun, yildiz: y, metin: pick(s.rng, 'customers', list), kim: pick(s.rng, 'customers', FN) }; b.yorumlar.unshift(rv);
  }
  b.yorumlar = b.yorumlar.slice(0, 30); if (b.yorumlar.length) b.yorumPuan = Math.round((b.yorumlar.reduce((a, r) => a + r.yildiz, 0) / b.yorumlar.length) * 10) / 10;
}
function marketDay(s: GameState): void {
  const m = s.market; m.fiyat *= 1 + m.enf / 100 / 365 * (0.8 + 0.4 * rand(s.rng, 'market')); m.bean = clampN(m.bean * (1 + (rand(s.rng, 'market') - 0.5) * 0.012) + (1 - m.bean) * 0.01, 0.8, 1.8);
  m.elektrik = clampN(m.elektrik * (1 + (rand(s.rng, 'market') - 0.5) * 0.006) + (1 - m.elektrik) * 0.01, 0.9, 1.7); m.enf = clampN(m.enf + (rand(s.rng, 'market') - 0.5) * 0.4, 18, 85);
  for (const k of Object.keys(m.mod)) { const x = m.mod[k]; if (x && x.bit <= dayOf(s)) delete m.mod[k]; }
}
function rivalsDay(s: GameState): void {
  for (const key of Object.keys(s.rakipler)) { const rv = s.rakipler[+key]!; for (const r of rv) {
    if (!r.strateji) r.strateji = pick(s.rng, 'rivals', ['ucuz', 'kalite', 'agresif', 'dengeli'] as const);
    if (r.kampanya && r.kampanya.bit <= dayOf(s)) { r.kampanya = undefined; r.son = 'Kampanyası bitti.'; }
    if (!r.kampanya) { const pr = r.strateji === 'agresif' ? 0.05 : r.strateji === 'ucuz' ? 0.04 : 0.015; if (rand(s.rng, 'rivals') < pr) { r.kampanya = { bit: dayOf(s) + randInt(s.rng, 'rivals', 4, 8), indirim: 0.08 + rand(s.rng, 'rivals') * 0.1 }; r.son = `İndirim kampanyası (−%${Math.round(r.kampanya.indirim * 100)}).`; } }
    if (r.strateji === 'kalite' && rand(s.rng, 'rivals') < 0.02) { r.kalite = Math.min(3, r.kalite + 1); r.son = 'Ürün kalitesini artırdı.'; }
    const x = rand(s.rng, 'rivals'); if (x < 0.04) r.fiyat = clampN(r.fiyat + (rand(s.rng, 'rivals') < 0.5 ? -0.04 : 0.04), 0.75, 1.35); else if (x < 0.07) r.reklam = clampN(r.reklam + 0.4, 0, 1.6); else if (x < 0.08) r.sube = Math.min(8, r.sube + 1);
    else if (x < 0.095) r.cesit = Math.min(19, r.cesit + 1); else if (x < 0.105) r.calisan = Math.min(30, r.calisan + 1); else if (x < 0.115) r.kalite = Math.min(3, r.kalite + 1); r.reklam = Math.max(0, r.reklam - 0.02);
  } }
}
function weatherDay(s: GameState): void { const g = dayOf(s); for (const b of s.subeler) if (s.hava[b.city] === undefined || true) s.hava[b.city] = weatherFor(s, cityById(b.city), g); }

/* ===================== Rastgele olaylar ===================== */
export function randomEvent(s: GameState, ev: SimEvent[]): void {
  if (s.bekleyen.length > 2 || !s.subeler.length || rand(s.rng, 'events') > 0.06) return; const b = pick(s.rng, 'events', s.subeler), c = cityById(b.city), now = dayOf(s);
  const types = ['kahve', 'elektrik', 'rakip', 'unlu', 'viral', 'gecikme', 'belediye', 'turizm', 'kriz', 'sikayet', 'istifa'] as const; const t = pick(s.rng, 'events', types);
  const base = { id: s.en++, branch: b.id, city: b.city };
  const push = (p: Omit<typeof base & { tip: string; baslik: string; metin: string; ikon: string; secenek: Array<{ ad: string; ac: string }> }, never>) => { s.bekleyen.push(p as never); ev.push({ t: 'olay', id: base.id }); };
  if (t === 'kahve') { s.market.mod['bean_olay'] = { v: 1, bit: now + 20 }; s.market.bean = clampN(s.market.bean * 1.18, 0.8, 1.8); push({ ...base, tip: t, baslik: 'Kahve fiyatları yükseldi', metin: 'Dünya piyasasında kahve çekirdeği fiyatı arttı. Tedarikçiler yeni liste yolladı.', ikon: '📈', secenek: [{ ad: 'Fiyatları %3 artır', ac: 'Marjı koru, talep biraz düşer.' }, { ad: 'Fiyatları değiştirme', ac: 'Marj daralır.' }] }); }
  else if (t === 'elektrik') { s.market.elektrik = clampN(s.market.elektrik * 1.22, 0.9, 1.7); push({ ...base, tip: t, baslik: 'Elektrik zammı', metin: 'Elektrik faturaları yükseldi.', ikon: '💡', secenek: [{ ad: 'Tasarruf programı (−8 B ₺)', ac: 'Elektrik giderini kısar.' }, { ad: 'Kabul et', ac: 'Giderler artar.' }] }); }
  else if (t === 'rakip') { const rv = s.rakipler[b.city] ?? (s.rakipler[b.city] = []); rv.push(newRival(s, c)); push({ ...base, tip: t, baslik: 'Yeni rakip kafe açıldı', metin: `${c.ad} şehrinde yeni bir kafe açıldı ve indirim yapıyor.`, ikon: '🥊', secenek: [{ ad: 'Fiyatı %5 indir', ac: 'Müşteri kaybı azalır.' }, { ad: 'Kaliteyle ayrış (−15 B ₺)', ac: 'Memnuniyet artar.' }, { ad: 'İzle', ac: 'Hiçbir şey yapma.' }] }); }
  else if (t === 'unlu') push({ ...base, tip: t, baslik: 'Ünlü bir kişi kafeni ziyaret etti', metin: 'Tanınmış bir isim dükkânın önünde fotoğraf çektirdi.', ikon: '⭐', secenek: [{ ad: 'Paylaşmasını rica et', ac: 'Marka büyür, bir hafta yoğunluk.' }, { ad: 'Rahat bırak', ac: 'Küçük marka artışı.' }] });
  else if (t === 'viral') push({ ...base, tip: t, baslik: 'Sosyal medyada viral oldun', metin: 'Bir müşterinin videosu hızla yayılıyor.', ikon: '🎬', secenek: [{ ad: 'Fırsatı değerlendir (−10 B ₺)', ac: 'İki hafta yoğun müşteri.' }, { ad: 'Dokunma', ac: 'Kısa bir artış.' }] });
  else if (t === 'gecikme') { s.market.mod['gecikme'] = { v: 2, bit: now + 6 }; push({ ...base, tip: t, baslik: 'Tedarikçi siparişi geciktirdi', metin: 'Yeni siparişler birkaç gün geç gelecek.', ikon: '🚚', secenek: [{ ad: 'Acil alternatif tedarik (−6 B ₺)', ac: 'Stok yenilenir.' }, { ad: 'Bekle', ac: 'Stok tükenebilir.' }] }); }
  else if (t === 'belediye') push({ ...base, tip: t, baslik: 'Belediye etkinliği', metin: `${c.ad} belediyesi bir sokak festivali düzenliyor; stant açabilirsin.`, ikon: '🎪', secenek: [{ ad: 'Stant aç (−18 B ₺)', ac: 'Marka ve trafik artar.' }, { ad: 'Katılma', ac: 'Hiçbir şey olmaz.' }] });
  else if (t === 'turizm') { s.market.mod['talep_' + b.city] = { v: 1.25, bit: now + 40 }; push({ ...base, tip: t, baslik: 'Turizm sezonu başladı', metin: `${c.ad} şehrinde turist sayısı arttı.`, ikon: '🧳', secenek: [{ ad: 'Tamam', ac: 'Talep bir süre artar.' }] }); }
  else if (t === 'kriz') { s.market.mod['talep'] = { v: 0.85, bit: now + 30 }; push({ ...base, tip: t, baslik: 'Ekonomik kriz', metin: 'Tüketici harcamaları düşüyor.', ikon: '📉', secenek: [{ ad: 'İndirim kampanyası yap (−6 B ₺)', ac: 'Müşteriyi tut.' }, { ad: 'Dayan', ac: 'Talep düşük kalır.' }] }); }
  else if (t === 'sikayet') push({ ...base, tip: t, baslik: 'Müşteri şikâyeti', metin: `${b.ad} şubesi için sosyal medyada kötü bir yorum yazıldı.`, ikon: '😠', secenek: [{ ad: 'Özür dile, ikram et (−1 B ₺)', ac: 'İtibar korunur.' }, { ad: 'Yok say', ac: 'Marka biraz zarar görür.' }] });
  else { const e = b.staff.filter((x) => x.tip !== 'sube_muduru')[0]; if (!e) return; push({ ...base, tip: t, baslik: 'Çalışan işten ayrılmak istiyor', metin: `${e.ad}, daha yüksek maaşa başka yerde iş buldu.`, ikon: '🙋', secenek: [{ ad: 'Zam ver (%15)', ac: 'Kalır, maaş artar.' }, { ad: 'Gitmesine izin ver', ac: 'Pozisyon boşalır.' }] }); }
}
export function resolveEvent(s: GameState, id: number, secim: number): string {
  const i = s.bekleyen.findIndex((p) => p.id === id); if (i < 0) return ''; const p = s.bekleyen[i]!; s.bekleyen.splice(i, 1); const b = s.subeler.find((x) => x.id === p.branch) ?? s.subeler[0]; if (!b) return ''; const now = dayOf(s); const F = inflationIdx(s);
  switch (p.tip) {
    case 'kahve': if (secim === 0) for (const k of Object.keys(b.menu) as ProductId[]) b.menu[k].fiyat = clampN(b.menu[k].fiyat * 1.03, 0.7, 1.7); return 'Karar uygulandı.';
    case 'elektrik': if (secim === 0) { s.kasa -= 8000 * F; s.market.elektrik = clampN(s.market.elektrik * 0.92, 0.9, 1.7); } return 'Karar uygulandı.';
    case 'rakip': if (secim === 0) for (const k of Object.keys(b.menu) as ProductId[]) b.menu[k].fiyat = clampN(b.menu[k].fiyat * 0.95, 0.7, 1.7); else if (secim === 1) { s.kasa -= 15000 * F; b.memnuniyet = clampN(b.memnuniyet + 3, 0, 100); } return 'Karar uygulandı.';
    case 'unlu': if (secim === 0) { b.marka = clampN(b.marka + 4, 0, 100); s.market.mod['talep_' + b.city] = { v: 1.2, bit: now + 7 }; } else b.marka = clampN(b.marka + 1.2, 0, 100); return 'Karar uygulandı.';
    case 'viral': if (secim === 0) { s.kasa -= 10000 * F; s.market.mod['talep_' + b.city] = { v: 1.35, bit: now + 14 }; b.marka = clampN(b.marka + 3, 0, 100); } else s.market.mod['talep_' + b.city] = { v: 1.1, bit: now + 4 }; return 'Karar uygulandı.';
    case 'gecikme': if (secim === 0) { s.kasa -= 6000 * F; delete s.market.mod['gecikme']; } return 'Karar uygulandı.';
    case 'belediye': if (secim === 0) { s.kasa -= 18000 * F; b.marka = clampN(b.marka + 3, 0, 100); s.market.mod['talep_' + b.city] = { v: 1.25, bit: now + 3 }; } return 'Karar uygulandı.';
    case 'kriz': if (secim === 0) { s.kasa -= 6000 * F; s.market.mod['talep'] = { v: 0.92, bit: now + 30 }; } return 'Karar uygulandı.';
    case 'sikayet': if (secim === 0) { s.kasa -= 1000 * F; } else b.marka = clampN(b.marka - 1, 0, 100); return 'Karar uygulandı.';
    case 'istifa': { const e = b.staff.find((x) => x.tip !== 'sube_muduru'); if (e) { if (secim === 0) { e.maas = Math.round(e.maas * 1.15 / 500) * 500; e.motivasyon = clampN(e.motivasyon + 25, 0, 100); } else b.staff = b.staff.filter((x) => x !== e); } return 'Karar uygulandı.'; }
    default: return '';
  }
}
export function newRival(s: GameState, c: City): Rival { const nm = ['Moka', 'Bean', 'Aroma', 'Fincan', 'Latte', 'Çekirdek', 'Demlik', 'Kahveci'], sf = ['Kafe', 'Coffee', 'House', 'Lab', 'Cafe', 'Roasters']; return { id: s.en++, ad: `${pick(s.rng, 'rivals', nm)} ${pick(s.rng, 'rivals', sf)}`, strateji: pick(s.rng, 'rivals', ['ucuz', 'kalite', 'agresif', 'dengeli'] as const), fiyat: 0.9 + rand(s.rng, 'rivals') * 0.25, kalite: randInt(s.rng, 'rivals', 1, 2), reklam: rand(s.rng, 'rivals') * 0.6, sube: randInt(s.rng, 'rivals', 1, 2), cesit: randInt(s.rng, 'rivals', 5, 12), calisan: randInt(s.rng, 'rivals', 3, 9) } ; void c; }
export function initRivals(s: GameState, c: City): void { if (s.rakipler[c.id]) return; const n = Math.max(1, Math.round(1 + c.rekabet * 4)); s.rakipler[c.id] = Array.from({ length: n }, () => newRival(s, c)); }

/* ===================== Dış API ===================== */
/** Oyun zamanını `dakika` kadar ilerletir; görsel katmanın tüketeceği olayları döndürür. */
export function step(s: GameState, dakika: number): SimEvent[] {
  const ev: SimEvent[] = []; if (s.oyunBitti) return ev; let kalan = dakika;
  while (kalan > 0) {
    const dt = Math.min(10, kalan), dayBefore = dayOf(s); s.dk += dt; kalan -= dt; if (s.dk % 10 === 0 || dt === 10) stepTen(s, ev);
    if (dayOf(s) !== dayBefore) { dailyClose(s, ev); if (s.oyunBitti) break; }
  }
  return ev;
}
export { CITIES, ADS };
