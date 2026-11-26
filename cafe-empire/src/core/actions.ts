import { cityById, type City } from '../data/turkey';
import { AD, INGREDIENTS, PRODUCTS, PRODUCT, SHOP, STAFF_TYPE, UPGRADE, UPGRADES, type AdId, type IngId, type ProductId, type ShopTypeId, type StaffTypeId, type UpgradeId } from '../data/catalog';
import { seedStreams } from './rng';
import { dayOf, emptyAcc, initRivals, inflationIdx, levelOf, makeEmployee, orderStock, outdoorSeats, staffOf } from './sim';
import type { Branch, Employee, Facade, GameState, MenuItem } from './types';

export interface Result { ok: boolean; m: string }
const ok = (m: string): Result => ({ ok: true, m }), no = (m: string): Result => ({ ok: false, m });
export const fmt = (v: number): string => { const a = Math.abs(v), s = a >= 1e6 ? (a / 1e6).toFixed(2).replace('.', ',') + ' M' : a >= 1e4 ? Math.round(a / 1000) + ' B' : Math.round(a).toLocaleString('tr-TR'); return (v < 0 ? '−' : '') + s + ' ₺'; };
const emptyFacade = (): Facade => ({ tabela: 0, cam: 0, led: 0, premium: 0, marka: 0, kapi: 0, oturma: 0, peyzaj: 0, vitrin: 0, tente: 0 });

export function newGame(o: { kasa?: number; ad: string; renk?: string; renk2?: string; logo?: number; seed?: number; sehir: number; tip: ShopTypeId }): { s: GameState; r: Result } {
  const seed = o.seed ?? 20270301;
  const s: GameState = { v: 1, seed, rng: seedStreams(seed), marka: { ad: o.ad.trim().slice(0, 24) || 'Kafe', renk: o.renk ?? '#c4722a', renk2: o.renk2 ?? '#2d1f14', logo: o.logo ?? 0 }, dk: 7 * 60, hiz: 1, kasa: o.kasa ?? 1200000, borc: 0, marka_puani: 5, seviye: 1, subeler: [], rakipler: {}, market: { enf: 38, fiyat: 1, bean: 1, elektrik: 1, mod: {} }, hava: {}, rapor: [], bekleyen: [], sn: 1, en: 1, log: [], hedef: {}, oyunBitti: false, negatifGun: 0, ayKar: 0, ayGelir: 0 };
  const r = subeAc(s, o.sehir, o.tip, o.ad); if (!r.ok) return { s, r }; return { s, r: ok('Kafen açıldı!') };
}
export const rentOf = (s: GameState, c: City, tip: ShopTypeId): number => Math.round(SHOP[tip].kira * c.kira * inflationIdx(s) / 500) * 500;
export const setupCost = (s: GameState, c: City, tip: ShopTypeId): number => Math.round((SHOP[tip].kurulum * (0.9 + 0.2 * c.maliyet) + 3 * rentOf(s, c, tip)) / 1000) * 1000;

export function subeAc(s: GameState, cityId: number, tip: ShopTypeId, ad?: string): Result {
  const c = cityById(cityId), t = SHOP[tip], lv = levelOf(s);
  if (t.seviye > lv && s.subeler.length > 0) return no(`${t.ad} için kafe seviyesi ${t.seviye} gerekir.`);
  const why = t.uygun(c); if (why) return no(why);
  const cost = setupCost(s, c, tip); if (s.kasa < cost + 60000 && s.subeler.length > 0) return no(`Kasa yetersiz (${fmt(cost + 60000)} gerekir).`); if (s.kasa < cost) return no(`Kasa yetersiz (${fmt(cost)}).`);
  s.kasa -= cost; initRivals(s, c);
  const menu = {} as Record<ProductId, MenuItem>; for (const p of PRODUCTS) menu[p.id] = { aktif: ['espresso', 'americano', 'latte', 'cappuccino', 'filtre', 'turk', 'kruvasan', 'cheesecake', 'sandvic', 'tost', 'kurabiye', 'pogaca'].includes(p.id), fiyat: 1, kalite: 1 };
  const stok = {} as Record<IngId, number>; const kat = Math.max(1, t.m2 / 35) * (1 + t.potansiyel / 200); for (const i of INGREDIENTS) stok[i.id] = Math.round((i.id === 'bean' ? 3000 : i.paket * (i.id === 'flour' ? 0.6 : 1)) * kat);
  const id = s.sn++; const b: Branch = { id, ad: ad && s.subeler.length === 0 ? `${ad}` : `${s.marka.ad} ${c.ad}${s.subeler.some((x) => x.city === cityId) ? ' ' + (s.subeler.filter((x) => x.city === cityId).length + 1) : ''}`, city: cityId, tip, acilis: dayOf(s), kira: rentOf(s, c, tip), m2: t.m2, staff: [], menu, stok, siparisler: [], otoSiparis: true, facade: emptyFacade(), hijyen: 75, memnuniyet: 65, marka: s.subeler.length ? 6 : 8, sadakat: 20, backlog: 0, kullanim: {}, reklam: [], yorumlar: [], yorumPuan: 3.8, bugun: emptyAcc(), gecmis: [], acik: true, kuruldu: true };
  const nb = t.m2 >= 150 ? 4 : t.m2 >= 75 ? 3 : t.m2 >= 45 ? 2 : 1, nk = t.m2 >= 75 ? 2 : 1; for (let i = 0; i < nb; i++) b.staff.push(makeEmployee(s, 'barista')); for (let i = 0; i < nk; i++) b.staff.push(makeEmployee(s, 'kasiyer')); if (t.m2 >= 75) b.staff.push(makeEmployee(s, 'servis')); for (const e of b.staff) e.maas = Math.round(STAFF_TYPE[e.tip].maas * 0.95 / 500) * 500;
  s.subeler.push(b); s.log.unshift(`${b.ad} açıldı.`); return ok(`${b.ad} açıldı! (−${fmt(cost)})`);
}
export const branchOf = (s: GameState, id: number): Branch => { const b = s.subeler.find((x) => x.id === id); if (!b) throw new Error('şube yok'); return b; };
export const staffLimit = (b: Branch): number => Math.round(SHOP[b.tip].m2 / 7) + 1;

/** Üç işe alım adayı üretir (gün ve tipe göre sabit). */
export function candidates(s: GameState, tip: StaffTypeId): Employee[] { return [0, 1, 2].map(() => makeEmployee(s, tip)); }
export function hire(s: GameState, b: Branch, e: Employee): Result {
  const t = STAFF_TYPE[e.tip]; if (levelOf(s) < t.seviye) return no(`${t.ad} için kafe seviyesi ${t.seviye} gerekir.`);
  if (b.staff.length >= staffLimit(b)) return no('Şubede daha fazla çalışan çalışamaz.'); if (e.tip === 'sube_muduru' && staffOf(b, 'sube_muduru').length) return no('Zaten şube müdürü var.');
  const fee = e.maas * 0.3; if (s.kasa < fee) return no('İşe alım masrafı için kasa yetersiz.'); s.kasa -= fee; e.ise = dayOf(s); b.staff.push(e); return ok(`${e.ad} işe alındı.`);
}
export function fire(s: GameState, b: Branch, id: number): Result { const e = b.staff.find((x) => x.id === id); if (!e) return no('Çalışan yok.'); if (b.staff.length <= 1) return no('En az bir çalışan kalmalı.'); s.kasa -= e.maas * 0.5; b.staff = b.staff.filter((x) => x !== e); for (const o of b.staff) o.motivasyon = Math.max(0, o.motivasyon - 3); return ok(`${e.ad} işten çıkarıldı (tazminat ${fmt(e.maas * 0.5)}).`); }
export function raise(b: Branch, id: number, pct: number): Result { const e = b.staff.find((x) => x.id === id); if (!e) return no('Çalışan yok.'); e.maas = Math.round(e.maas * (1 + pct) / 500) * 500; e.motivasyon = Math.min(100, e.motivasyon + 12 * pct * 5); return ok('Maaş güncellendi.'); }

export function setPrice(b: Branch, id: ProductId, oran: number): void { b.menu[id].fiyat = Math.round(Math.max(0.6, Math.min(2, oran)) * 100) / 100; }
export function toggleProduct(s: GameState, b: Branch, id: ProductId): Result {
  const p = PRODUCT[id], m = b.menu[id]; if (!m.aktif) { if (levelOf(s) < p.seviye) return no(`Kafe seviyesi ${p.seviye} gerekir.`); if (p.kurulum && !b.menu[id].kalite) return no('Ürün kilitli.'); const kurulum = p.kurulum && !(b as unknown as { acilan?: Record<string, number> }).acilan?.[id] ? p.kurulum * inflationIdx(s) : 0; if (kurulum) { if (s.kasa < kurulum) return no(`Ürün geliştirme için ${fmt(kurulum)} gerekir.`); s.kasa -= kurulum; const x = b as unknown as { acilan?: Record<string, number> }; x.acilan = { ...(x.acilan ?? {}), [id]: 1 }; } m.aktif = true; return ok(`${p.ad} menüye eklendi.`); }
  if (PRODUCTS.filter((q) => b.menu[q.id].aktif).length <= 3) return no('Menüde en az 3 ürün kalmalı.'); m.aktif = false; return ok(`${p.ad} menüden çıkarıldı.`);
}
export function upgradeCost(s: GameState, b: Branch, id: UpgradeId): number { const u = UPGRADE[id], c = cityById(b.city); return Math.round(u.maliyet * (b.facade[id] + 1) * (0.9 + 0.2 * c.maliyet) * inflationIdx(s) / 500) * 500; }
export function upgrade(s: GameState, b: Branch, id: UpgradeId): Result {
  const u = UPGRADE[id]; if (b.facade[id] >= u.max) return no('Zaten en üst seviye.'); if (levelOf(s) < u.seviye) return no(`Kafe seviyesi ${u.seviye} gerekir.`);
  if (id === 'oturma' && SHOP[b.tip].masa === 0) return no('Bu dükkânın dış alanı yok.'); if (b.facade[id] >= SHOP[b.tip].slot + 1 && id === 'oturma') return no('Dış alan dolu.');
  const cost = upgradeCost(s, b, id); if (s.kasa < cost) return no(`Kasa yetersiz (${fmt(cost)}).`); s.kasa -= cost; b.facade[id]++; b.marka = Math.min(100, b.marka + 0.8); return ok(`${u.ad} yapıldı (−${fmt(cost)}).`);
}
export const adCost = (s: GameState, b: Branch, id: AdId): number => Math.round(AD[id].maliyet * inflationIdx(s) * (0.9 + 0.2 * cityById(b.city).maliyet) / 500) * 500;
export function startAd(s: GameState, b: Branch, id: AdId): Result {
  const a = AD[id]; if (levelOf(s) < a.seviye) return no(`Kafe seviyesi ${a.seviye} gerekir.`); const now = dayOf(s); if (b.reklam.some((x) => x.id === id && x.bit > now)) return no('Bu reklam zaten sürüyor.');
  if (id === 'uni' && cityById(b.city).ogrenci < 0.25) return no('Bu şehirde öğrenci nüfusu az.'); const cost = adCost(s, b, id); if (s.kasa < cost) return no(`Kasa yetersiz (${fmt(cost)}).`);
  s.kasa -= cost; b.bugun.gider.reklam += cost; const tuttu = (s.rng.econ = (s.rng.econ + 0x6d2b79f5) >>> 0, ((s.rng.econ ^ (s.rng.econ >>> 15)) >>> 0) / 4294967296) > a.risk; b.reklam.push({ id, bit: now + a.gun, tuttu });
  return ok(`${a.ad} başladı.${tuttu ? '' : ' (Etkisi beklenenden düşük olabilir)'}`);
}
export function orderIng(s: GameState, b: Branch, id: IngId, paket: number): Result { if (!orderStock(s, b, id, paket)) return no('Kasa yetersiz.'); return ok('Sipariş verildi.'); }
export function takeLoan(s: GameState, n: number): Result { if (s.borc + n > 3000000) return no('Kredi limiti 3 M ₺.'); s.borc += n; s.kasa += n; return ok(`${fmt(n)} kredi alındı.`); }
export function payLoan(s: GameState, n: number): Result { n = Math.min(n, s.borc); if (s.kasa < n) return no('Kasa yetersiz.'); s.borc -= n; s.kasa -= n; return ok(`${fmt(n)} ödendi.`); }
export function closeBranch(s: GameState, id: number): Result { if (s.subeler.length <= 1) return no('Son şube kapatılamaz.'); const b = branchOf(s, id); s.subeler = s.subeler.filter((x) => x !== b); s.kasa -= b.kira * 2; return ok(`${b.ad} kapatıldı (cayma bedeli ${fmt(b.kira * 2)}).`); }
export const outdoorCount = outdoorSeats;
export { UPGRADES };
export type { City };
