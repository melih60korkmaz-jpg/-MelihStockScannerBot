import { buyInvest } from './invest';
import { estimateUsage, autoOrder } from './supply';
import { emptyBolge, grantRegion, ilAcik, ilceAcik, ilceWeight } from './region';
import { ilceKey, ilceOf, ilcelerOf, profilOf } from '../data/regions';
import { cityById, type City } from '../data/turkey';
import { AD, INGREDIENTS, PRODUCTS, PRODUCT, SHOP, STAFF_TYPE, UPGRADE, UPGRADES, type AdId, type IngId, type ProductId, type ShopTypeId, type StaffTypeId, type UpgradeId } from '../data/catalog';
import { seedStreams } from './rng';
import { dailyDemand, dayOf, emptyAcc, initRivals, inflationIdx, levelOf, orderStock, outdoorSeats } from './sim';
import { makeEmployee, autoPlan, postJob, hireCandidate, fireEmp, staffOf } from './hr';
const openHours0 = (tip: ShopTypeId): [number, number] => tip === 'avm' ? [10, 22] : tip === 'sahil' ? [8, 24] : tip === 'luks' ? [9, 23] : [8, 23];
import type { Branch, Employee, Facade, GameState, MenuItem } from './types';

export interface Result { ok: boolean; m: string }
const ok = (m: string): Result => ({ ok: true, m }), no = (m: string): Result => ({ ok: false, m });
export const fmt = (v: number): string => { const a = Math.abs(v), s = a >= 1e6 ? (a / 1e6).toFixed(2).replace('.', ',') + ' M' : a >= 1e4 ? Math.round(a / 1000) + ' B' : Math.round(a).toLocaleString('tr-TR'); return (v < 0 ? '−' : '') + s + ' ₺'; };
const emptyFacade = (): Facade => ({ tabela: 0, cam: 0, led: 0, premium: 0, marka: 0, kapi: 0, oturma: 0, peyzaj: 0, vitrin: 0, tente: 0 });

export function newGame(o: { kasa?: number; ad: string; renk?: string; renk2?: string; logo?: number; seed?: number; sehir: number; tip: ShopTypeId; ilce?: string }): { s: GameState; r: Result } {
  const seed = o.seed ?? 20270301;
  const s: GameState = { v: 1, seed, rng: seedStreams(seed), marka: { ad: o.ad.trim().slice(0, 24) || 'Kafe', renk: o.renk ?? '#c4722a', renk2: o.renk2 ?? '#2d1f14', logo: o.logo ?? 0 }, dk: 7 * 60, hiz: 1, kasa: o.kasa ?? 1200000, borc: 0, marka_puani: 5, seviye: 1, subeler: [], rakipler: {}, market: { enf: 38, fiyat: 1, bean: 1, elektrik: 1, mod: {} }, hava: {}, rapor: [], bekleyen: [], sn: 1, en: 1, log: [], hedef: {}, oyunBitti: false, negatifGun: 0, ayKar: 0, ayGelir: 0, capexBugun: 0, bolge: emptyBolge() };
  const ik = grantRegion(s, o.sehir, o.ilce); const r = subeAc(s, o.sehir, o.tip, o.ad, ik); if (!r.ok) return { s, r }; return { s, r: ok('Kafen açıldı!') };
}
export const rentOf = (s: GameState, c: City, tip: ShopTypeId): number => Math.round(SHOP[tip].kira * c.kira * 0.75 * inflationIdx(s) / 500) * 500;
export const setupCost = (s: GameState, c: City, tip: ShopTypeId): number => Math.round((SHOP[tip].kurulum * (0.9 + 0.2 * c.maliyet) + 3 * rentOf(s, c, tip)) / 1000) * 1000;

export function subeAc(s: GameState, cityId: number, tip: ShopTypeId, ad?: string, ilceK?: string): Result {
  const c = cityById(cityId), t = SHOP[tip], lv = levelOf(s);
  if (!ilAcik(s, cityId)) return no(`${c.ad} pazarı kapalı; önce Türkiye Haritası'ndan aç.`);
  const dk = ilceOf(ilceK) ?? ilcelerOf(cityId).filter((x) => ilceAcik(s, x)).sort((a, z) => ilceWeight(z) - ilceWeight(a))[0]; if (!dk || !ilceAcik(s, dk) || dk.il !== cityId) return no('Şube için önce bir ilçe aç (Türkiye Haritası).');
  const pf = profilOf(dk);
  if (t.seviye > lv && s.subeler.length > 0) return no(`${t.ad} için kafe seviyesi ${t.seviye} gerekir.`);
  const why = t.uygun(c); if (why) return no(why);
  const cost = Math.round(setupCost(s, c, tip) * (0.85 + 0.15 * pf.kira) / 1000) * 1000; if (s.kasa < cost + 60000 && s.subeler.length > 0) return no(`Kasa yetersiz (${fmt(cost + 60000)} gerekir).`); if (s.kasa < cost) return no(`Kasa yetersiz (${fmt(cost)}).`);
  s.kasa -= cost; s.capexBugun += cost; initRivals(s, c);
  const menu = {} as Record<ProductId, MenuItem>; for (const p of PRODUCTS) menu[p.id] = { aktif: ['espresso', 'americano', 'latte', 'cappuccino', 'filtre', 'turk', 'cay', 'kruvasan', 'cheesecake', 'sandvic', 'tost', 'kurabiye', 'pogaca'].includes(p.id), fiyat: 1, kalite: 1 };
  const stok = {} as Record<IngId, number>; const kat = Math.max(1, t.m2 / 35) * (1 + t.potansiyel / 200); for (const i of INGREDIENTS) stok[i.id] = Math.round((i.id === 'bean' ? 3000 : i.paket * (i.id === 'flour' ? 0.6 : 1)) * kat);
  const id = s.sn++; const b: Branch = { id, ad: ad && s.subeler.length === 0 ? `${ad}` : `${s.marka.ad} ${dk.ad}${s.subeler.some((x) => x.ilce === ilceKey(dk)) ? ' ' + (s.subeler.filter((x) => x.ilce === ilceKey(dk)).length + 1) : ''}`, city: cityId, ilce: ilceKey(dk), tip, acilis: dayOf(s), kira: Math.round(rentOf(s, c, tip) * pf.kira / 500) * 500, m2: t.m2, staff: [], menu, stok, siparisler: [], otoSiparis: true, yat: {}, facade: emptyFacade(), hijyen: 75, memnuniyet: 65, marka: s.subeler.length ? 6 : 8, sadakat: 20, backlog: 0, kullanim: {}, partiler: {}, minStok: {}, tedarikci: {}, malKalite: 1, mus: { ortSiparis: 0, ortBekleme: 0, hizmet: 80, urunKal: 1, fiyatMemn: 80, tekrar: 20, sadik: 10, sikayet: 0 }, sonAdet: {}, acilan: {}, mesai: { aci: openHours0(tip)[0], kapa: openHours0(tip)[1] }, ilanlar: [], adaylar: [], sikayetler: [], reklam: [], yorumlar: [], yorumPuan: 3.8, bugun: emptyAcc(), gecmis: [], acik: true, kuruldu: true };
  const nb = t.m2 >= 150 ? 4 : t.m2 >= 75 ? 3 : t.m2 >= 45 ? 2 : 2, nk = t.m2 >= 75 ? 2 : 1; for (let i = 0; i < nb; i++) b.staff.push(makeEmployee(s, 'barista', 1, c.maliyet)); for (let i = 0; i < nk; i++) b.staff.push(makeEmployee(s, 'kasiyer', 1, c.maliyet)); if (t.m2 >= 75) b.staff.push(makeEmployee(s, 'servis', 0, c.maliyet)); if (t.m2 >= 150) b.staff.push(makeEmployee(s, 'sube_muduru', 3, c.maliyet)); autoPlan(b);
  s.subeler.push(b);
  { const aktif = PRODUCTS.filter((p) => b.menu[p.id].aktif), u = estimateUsage(b, dailyDemand(s, b), (id) => PRODUCT[id as ProductId].recete, aktif); for (const i of INGREDIENTS) { if (i.id === 'clean') continue; const gun = u[i.id] ?? 0; if (gun > 0) { b.kullanim[i.id] = gun; b.stok[i.id] = Math.max(b.stok[i.id] ?? 0, Math.ceil(gun * 3.2 / i.paket) * i.paket); } } autoOrder(s, b); }
  s.log.unshift(`${b.ad} açıldı.`); return ok(`${b.ad} açıldı! (−${fmt(cost)})`);
}
export const branchOf = (s: GameState, id: number): Branch => { const b = s.subeler.find((x) => x.id === id); if (!b) throw new Error('şube yok'); return b; };
export const staffLimit = (b: Branch): number => Math.round(SHOP[b.tip].m2 / 6) + 3;

export const staffLimit0 = (b: Branch): number => Math.round(SHOP[b.tip].m2 / 6) + 2;
export function ilanVer(s: GameState, b: Branch, tip: StaffTypeId, teklif: number): Result { return postJob(s, b, tip, teklif, cityById(b.city).maliyet); }
export function iseAl(s: GameState, b: Branch, id: number, maas: number): Result { return hireCandidate(s, b, id, maas, staffLimit(b)); }
export function isCikar(s: GameState, b: Branch, id: number): Result { return fireEmp(s, b, id); }
export function setPrice(b: Branch, id: ProductId, oran: number): void { b.menu[id].fiyat = Math.round(Math.max(0.6, Math.min(2, oran)) * 100) / 100; }
export function toggleProduct(s: GameState, b: Branch, id: ProductId): Result {
  const p = PRODUCT[id], m = b.menu[id];
  if (!m.aktif) { if (levelOf(s) < p.seviye) return no(`Kafe seviyesi ${p.seviye} gerekir.`); const ilk = p.kurulum && !b.acilan[id]; const fee = ilk ? p.kurulum * inflationIdx(s) : 0; if (fee) { if (s.kasa < fee) return no(`Ürün geliştirme için ${fmt(fee)} gerekir.`); s.kasa -= fee; s.capexBugun += fee; } b.acilan[id] = true; m.aktif = true; return ok(`${p.ad} menüye eklendi.`); }
  if (PRODUCTS.filter((q) => b.menu[q.id].aktif).length <= 3) return no('Menüde en az 3 ürün kalmalı.'); m.aktif = false; return ok(`${p.ad} menüden çıkarıldı.`);
}
export function upgradeCost(s: GameState, b: Branch, id: UpgradeId): number { const u = UPGRADE[id], c = cityById(b.city); return Math.round(u.maliyet * (b.facade[id] + 1) * (0.9 + 0.2 * c.maliyet) * inflationIdx(s) / 500) * 500; }
export function upgrade(s: GameState, b: Branch, id: UpgradeId): Result {
  const u = UPGRADE[id]; if (b.facade[id] >= u.max) return no('Zaten en üst seviye.'); if (levelOf(s) < u.seviye) return no(`Kafe seviyesi ${u.seviye} gerekir.`);
  if (id === 'oturma' && SHOP[b.tip].masa === 0) return no('Bu dükkânın dış alanı yok.'); if (b.facade[id] >= SHOP[b.tip].slot + 1 && id === 'oturma') return no('Dış alan dolu.');
  const cost = upgradeCost(s, b, id); if (s.kasa < cost) return no(`Kasa yetersiz (${fmt(cost)}).`); s.kasa -= cost; s.capexBugun += cost; b.facade[id]++; b.marka = Math.min(100, b.marka + 0.8); return ok(`${u.ad} yapıldı (−${fmt(cost)}).`);
}
export const adCost = (s: GameState, b: Branch, id: AdId): number => Math.round(AD[id].maliyet * inflationIdx(s) * (0.9 + 0.2 * cityById(b.city).maliyet) / 500) * 500;
export function startAd(s: GameState, b: Branch, id: AdId): Result {
  const a = AD[id]; if (levelOf(s) < a.seviye) return no(`Kafe seviyesi ${a.seviye} gerekir.`); const now = dayOf(s); if (b.reklam.some((x) => x.id === id && x.bit > now)) return no('Bu reklam zaten sürüyor.');
  if (id === 'uni' && cityById(b.city).ogrenci < 0.25) return no('Bu şehirde öğrenci nüfusu az.'); const cost = adCost(s, b, id); if (s.kasa < cost) return no(`Kasa yetersiz (${fmt(cost)}).`);
  s.kasa -= cost; b.bugun.gider.reklam += cost; const tuttu = (s.rng.econ = (s.rng.econ + 0x6d2b79f5) >>> 0, ((s.rng.econ ^ (s.rng.econ >>> 15)) >>> 0) / 4294967296) > a.risk; b.reklam.push({ id, bit: now + a.gun, tuttu });
  return ok(`${a.ad} başladı.${tuttu ? '' : ' (Etkisi beklenenden düşük olabilir)'}`);
}
export function orderIng(s: GameState, b: Branch, id: IngId, paket: number, sup?: string): Result { if (sup) b.tedarikci[id] = sup;
  if (!orderStock(s, b, id, paket)) return no('Kasa yetersiz.'); return ok('Sipariş verildi.'); }
export function takeLoan(s: GameState, n: number): Result { if (s.borc + n > 3000000) return no('Kredi limiti 3 M ₺.'); s.borc += n; s.kasa += n; return ok(`${fmt(n)} kredi alındı.`); }
export function payLoan(s: GameState, n: number): Result { n = Math.min(n, s.borc); if (s.kasa < n) return no('Kasa yetersiz.'); s.borc -= n; s.kasa -= n; return ok(`${fmt(n)} ödendi.`); }
export function closeBranch(s: GameState, id: number): Result { if (s.subeler.length <= 1) return no('Son şube kapatılamaz.'); const b = branchOf(s, id); s.subeler = s.subeler.filter((x) => x !== b); s.kasa -= b.kira * 2; return ok(`${b.ad} kapatıldı (cayma bedeli ${fmt(b.kira * 2)}).`); }
export const outdoorCount = outdoorSeats;
export { UPGRADES };
export type { City };
export function invest(s: GameState, b: Branch, id: string): Result { const r = buyInvest(s, b, id, levelOf(s)); return r.ok ? ok(r.m) : no(r.m); }
export { ilAc, ilceAc } from './region';
export function setPromo(s: GameState, b: Branch, key: 'sabah' | 'ogrenci' | 'mutlu' | 'kart' | 'yetkiFiyat'): Result {
  b.promo ??= {}; if (key === 'yetkiFiyat' && !b.promo[key] && !b.staff.some((e) => e.tip === 'sube_muduru')) return no('Fiyat yetkisi için şubede bir şube müdürü olmalı.');
  if (key === 'kart' && !b.promo[key] && levelOf(s) < 2) return no('Sadakat kartı için kafe seviyesi 2 gerekir.'); b.promo[key] = !b.promo[key]; return ok(`${{ sabah: 'Sabah paketi', ogrenci: 'Öğrenci indirimi', mutlu: 'Mutlu saat', kart: 'Sadakat kartı', yetkiFiyat: 'Müdür fiyat yetkisi' }[key]} ${b.promo[key] ? 'açıldı' : 'kapatıldı'}.`);
}
export function setGununUrunu(s: GameState, b: Branch, id: ProductId): Result {
  const m = b.menu[id]; if (!m.aktif) return no('Ürün menüde değil.'); b.promo ??= {}; b.promo.gunun = id; b.promo.gununGun = dayOf(s); return ok(`Bugünün ürünü: ${PRODUCT[id].ad} (−%15 ve öne çıkarıldı, bugün geçerli).`);
}
