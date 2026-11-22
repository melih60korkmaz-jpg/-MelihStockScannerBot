import { TL, type Money } from '../core/money';
import type { GameEvent, GameState } from '../core/types';
import { material, supplier, SUPPLIERS, MATERIALS } from '../data';
import { news } from './rivals';

/**
 * Tedarik ilişkileri ve olayları: güven puanı (fiyat avantajı, sipariş engeli), pazarlık, rastgele olaylar (fiyat şoku, grev, iflas, üretim durması,
 * fırsat, depo yangını) ve stok hareket defteri. Gürültü hash ile üretilir (rastgele sayı akışı kullanılmaz).
 */
const hash01 = (n: number): number => { let a = (n | 0) >>> 0; a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a ^= a >>> 16; return (a >>> 0) / 4294967296; };
const hs = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return h >>> 0; };
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const trustOf = (s: GameState, sup: string): number => s.supRel?.[sup]?.trust ?? 50;
export const relOf = (s: GameState, sup: string) => s.supRel?.[sup] ?? { trust: 50, spent: 0, orders: 0 };
export function addTrust(s: GameState, sup: string, d: number, spent = 0): void { const r = ((s.supRel ??= {})[sup] ??= { trust: 50, spent: 0, orders: 0 }); r.trust = clamp(r.trust + d, 0, 100); r.spent += spent; if (spent > 0) r.orders++; }
export function logStock(s: GameState, mat: string, qty: number, kind: 'giris' | 'cikis' | 'fire' | 'hasar', value: Money, ref?: string): void {
  if (!(qty > 0)) return; const l = (s.stockLog ??= []); l.push({ day: s.clock.day, mat, qty: +qty.toFixed(2), kind, value: Math.round(value), ...(ref ? { ref } : {}) }); if (l.length > 400) l.splice(0, l.length - 400);
}
export const activeEvents = (s: GameState) => (s.supEvents ?? []).filter((e) => e.until > s.clock.day);
export const activeNego = (s: GameState, mat: string, sup: string) => (s.negos ?? []).find((n) => n.mat === mat && n.sup === sup && n.until > s.clock.day);

/** Sipariş teklifine uygulanan çarpanlar: güven, olaylar, pazarlık. blocked: tedarikçi sipariş almıyor. */
export function supplyAdjust(s: GameState, mat: string, sup: string): { price: number; lead: number; blocked?: string } {
  const tr = trustOf(s, sup); let price = 1 - (tr > 60 ? (tr - 60) / 40 : tr < 40 ? (tr - 40) / 40 : 0) * 0.03, lead = 0, blocked: string | undefined;
  for (const e of activeEvents(s)) {
    if (e.kind === 'fiyat' && e.mat === mat) price *= 1 + e.val; if (e.kind === 'uretim' && e.mat === mat) { price *= 1 + e.val; lead += 7; }
    if (e.kind === 'grev') lead += e.val; if (e.kind === 'firsat' && e.sup === sup) price *= 1 - e.val; if (e.kind === 'iflas' && e.sup === sup) blocked = `${supplier(sup)?.label ?? sup} iflas etti; sipariş alamıyor.`;
  }
  if (trustOf(s, sup) < 20) blocked = blocked ?? `${supplier(sup)?.label ?? sup} ödeme gecikmeleri nedeniyle yeni sipariş almıyor (güven ${Math.round(trustOf(s, sup))}).`;
  const n = activeNego(s, mat, sup); if (n) { price *= 1 - n.disc; lead -= n.leadCut; }
  return { price, lead, ...(blocked ? { blocked } : {}) };
}

export type NegoKind = 'fiyat' | 'toplu' | 'hizli';
export const NEGO_INFO: Record<NegoKind, { label: string; disc: number; leadCut: number; note: string }> = {
  fiyat: { label: 'İndirim iste', disc: 0.05, leadCut: 0, note: '%5 indirim, 14 gün geçerli' }, toplu: { label: 'Toplu alım indirimi', disc: 0.08, leadCut: 0, note: '%8 indirim (büyük miktar gerekir)' }, hizli: { label: 'Hızlı teslimat', disc: 0, leadCut: 2, note: '−2 gün teslimat' },
};
/** Pazarlık kabul puanı: güven, itibar, sipariş büyüklüğü ve önceki ilişki; hafta bazında sabit eşik (aynı hafta aynı yanıt). */
export function negoScore(s: GameState, mat: string, sup: string, qty: number, kind: NegoKind): { score: number; need: number } {
  const unit = material(mat)!.priceTL, size = clamp((unit * qty * s.costIndex) / 30_000_000, 0, 1), rel = relOf(s, sup);
  const score = 0.25 + (rel.trust - 50) / 140 + ((s.company?.reputation ?? 50) - 50) / 300 + size * 0.3 + Math.min(0.1, rel.orders * 0.01) - (kind === 'toplu' ? 0.12 : kind === 'hizli' ? 0.05 : 0);
  return { score, need: hash01(hs(`${mat}|${sup}|${kind}`) + Math.floor(s.clock.day / 7)) * 0.6 + 0.2 };
}
export function negoError(s: GameState, mat: string, sup: string, qty: number, kind: NegoKind): string | null {
  if (!s.company) return 'Şirket yok.'; if (!material(mat) || !supplier(sup)) return 'Geçersiz malzeme veya tedarikçi.'; if (!NEGO_INFO[kind]) return 'Geçersiz pazarlık.'; if (!(qty > 0)) return 'Miktar gerekli.';
  const adj = supplyAdjust(s, mat, sup); if (adj.blocked) return adj.blocked; if (activeNego(s, mat, sup)) return 'Bu ürün için zaten geçerli bir anlaşmanız var.';
  const { score, need } = negoScore(s, mat, sup, qty, kind); if (score < need) return `${supplier(sup)!.label} teklifi reddetti. Daha büyük sipariş ya da daha iyi ilişkiyle tekrar deneyin (haftalık).`; return null;
}
export function negotiate(s: GameState, mat: string, sup: string, kind: NegoKind): void { const i = NEGO_INFO[kind]; (s.negos ??= []).push({ mat, sup, disc: i.disc, leadCut: i.leadCut, until: s.clock.day + 14 }); }

/** Aylık: olay çekilişi, süresi dolanları temizleme, ödenmeyen borca göre güven. */
export function supplyEventsMonthly(s: GameState, events: GameEvent[]): void {
  if (!s.company) return; const mi = Math.floor(s.clock.day / 30), day = s.clock.day;
  s.supEvents = (s.supEvents ?? []).filter((e) => e.until > day); s.negos = (s.negos ?? []).filter((n) => n.until > day);
  for (const sp of SUPPLIERS) { const late = (s.payables ?? []).some((p) => p.late > 0 && p.memo.includes(sp.label)); addTrust(s, sp.id, late ? -6 : 0.5); }
  if (hash01(mi * 977 + 11) > 0.38) return;
  const pickIdx = (n: number, salt: number) => Math.floor(hash01(mi * 131 + salt) * n), kinds = ['fiyat', 'grev', 'iflas', 'firsat', 'uretim', 'yangin'] as const, k = kinds[pickIdx(kinds.length, 3)]!;
  const mat = MATERIALS[pickIdx(MATERIALS.length, 5)]!, sup = SUPPLIERS[pickIdx(SUPPLIERS.length, 7)]!; const id = s.nextId++;
  const push = (e: NonNullable<GameState['supEvents']>[number]) => { s.supEvents!.push(e); news(s, events, e.text, k === 'firsat' ? 'ok' : 'warn'); events.push({ type: 'SUPPLY_EVENT', day, data: { kind: e.kind } }); };
  if (k === 'fiyat') push({ id, kind: 'fiyat', mat: mat.id, val: 0.15 + hash01(mi) * 0.1, until: day + 60, text: `${mat.label} fiyatlarında ani artış: tedarikçiler zam yaptı.` });
  else if (k === 'grev') push({ id, kind: 'grev', val: 5, until: day + 30, text: 'Nakliye grevi: tüm teslimatlar yaklaşık 5 gün gecikiyor.' });
  else if (k === 'iflas' && sup.id !== 'yerel') { push({ id, kind: 'iflas', sup: sup.id, val: 0, until: day + 90, text: `${sup.label} iflas etti; bekleyen siparişleriniz gecikecek.` }); for (const o of s.orders) if (o.supplier === sup.id) o.arriveDay += 20; }
  else if (k === 'firsat') push({ id, kind: 'firsat', sup: sup.id, val: 0.1, until: day + 30, text: `${sup.label} 30 günlüğüne özel indirim sunuyor (%10).` });
  else if (k === 'uretim') push({ id, kind: 'uretim', mat: mat.id, val: 0.12, until: day + 45, text: `${mat.label} üretiminde duruş: fiyat artıyor, teslimat uzuyor.` });
  else if (k === 'yangin') { let lost = 0; for (const [m, it] of Object.entries(s.stock)) { const q = it.qty * 0.2; it.qty -= q; lost += q * it.cost; logStock(s, m, q, 'hasar', q * it.cost, 'depo olayı'); } if (lost > 0) { news(s, events, `Depoda su baskını/yangın: stokun %20'si hasar gördü (değer ≈ ${Math.round(lost / 100).toLocaleString('tr-TR')} ₺).`, 'bad'); } }
  void TL;
}
