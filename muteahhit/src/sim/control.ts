import { dateOf } from '../core/calendar';
import { TL } from '../core/money';
import type { GameEvent, GameState, Project, Staff } from '../core/types';
import { eventDef } from '../data';
import { traitEff } from './staff';

/**
 * Yönetim katmanı: yıllık odak, proje emirleri, proje müdürü, ofis eşyaları, yönetim kurulu ve karar günlüğü.
 * Hepsi saf mantık: rastgele sayı üretmez (kayıt tohumlarını ve akışları bozmaz), eski kayıtlarda alanlar isteğe bağlıdır.
 */
export interface FocusDef { id: string; label: string; ico: string; desc: string }
export const FOCI: FocusDef[] = [
  { id: 'denge', label: 'Dengeli büyüme', ico: '⚖️', desc: 'Özel bir bonus yok; esnek kalırsınız.' },
  { id: 'konut', label: 'Konut satışı', ico: '🏠', desc: 'Konut satış hızı +%10.' },
  { id: 'luks', label: 'Lüks segment', ico: '💎', desc: 'Premium ve lüks projelerde satış fiyatı +%5.' },
  { id: 'altyapi', label: 'Kamu ve altyapı', ico: '🛣️', desc: 'İhale puanınız +4, altyapı işleri %8 hızlı.' },
  { id: 'holding', label: 'Holding', ico: '🏛️', desc: 'İşletme ve enerji gelirleri +%6.' },
];
export const focusId = (s: GameState): string => s.company?.focus?.id ?? 'denge';
export const focusLabel = (s: GameState) => FOCI.find((f) => f.id === focusId(s)) ?? FOCI[0]!;
export const canChangeFocus = (s: GameState): boolean => (s.company?.focus?.year ?? -1) !== dateOf(s.clock.day).year;
export const focusSale = (s: GameState, p: Project): number => (focusId(s) === 'konut' && !['otel', 'avm'].includes(p.type) ? 1.1 : 1);
export const focusPrice = (s: GameState, p: Project): number => (focusId(s) === 'luks' && (p.quality === 'luks' || p.quality === 'premium') ? 1.05 : 1);
export const focusTender = (s: GameState, infra: boolean): number => (focusId(s) === 'altyapi' ? 4 : 0) + (infra ? 0 : 0) + decorBonus(s, 'tender');
export const focusVenture = (s: GameState): number => (focusId(s) === 'holding' ? 1.06 : 1);

// ---- Emirler ----
export interface OrderDef { id: string; label: string; ico: string; desc: string; speed: number; cost: number; q: number; risk: number }
export const ORDER_DAYS = 45;
export const ORDERS: OrderDef[] = [
  { id: 'hizlandir', label: 'Hızlandır', ico: '⚡', desc: 'İşler %15 hızlanır; maliyet %8 artar, kalite −2, kaza riski artar.', speed: 1.15, cost: 1.08, q: -2, risk: 1.6 },
  { id: 'kalite', label: 'Kaliteye odaklan', ico: '🔍', desc: 'Kalite +5; işler %8 yavaşlar, maliyet %5 artar.', speed: 0.92, cost: 1.05, q: 5, risk: 0.9 },
  { id: 'tasarruf', label: 'Maliyeti kıs', ico: '💰', desc: 'Maliyet %6 düşer; kalite −4, kaza riski biraz artar.', speed: 1, cost: 0.94, q: -4, risk: 1.1 },
  { id: 'guvenlik', label: 'Güvenlik önceliği', ico: '🦺', desc: 'Kaza riski %60 azalır; işler %5 yavaşlar, maliyet %3 artar.', speed: 0.95, cost: 1.03, q: 0, risk: 0.4 },
];
export const orderDef = (id: string) => ORDERS.find((o) => o.id === id);
export const activeOrder = (s: GameState, p: Project): OrderDef | null => (p.order && p.order.until > s.clock.day ? orderDef(p.order.id) ?? null : null);

// ---- Proje müdürü ----
export const MANAGER_TYPES = ['santiye_sefi', 'proje_yoneticisi', 'muhendis', 'usta'];
export const managerOf = (s: GameState, p: Project): Staff | null => (p.manager === undefined ? null : s.staff.find((x) => x.id === p.manager && MANAGER_TYPES.includes(x.type)) ?? null);
export function managerEff(x: Staff): number { const role = x.type === 'proje_yoneticisi' || x.type === 'santiye_sefi' ? 1.3 : 1; return (0.8 + 0.4 * (x.experience / 100)) * (0.85 + 0.3 * (x.morale / 100)) * traitEff(x) * role; }

/** İnşaat çarpanları: emir + proje müdürü. Hız ve maliyet çarpan, kalite puan, risk çarpandır. */
export function projectMods(s: GameState, p: Project): { speed: number; cost: number; q: number; risk: number } {
  const o = activeOrder(s, p), m = managerOf(s, p); let speed = o?.speed ?? 1, cost = o?.cost ?? 1, q = o?.q ?? 0, risk = o?.risk ?? 1;
  if (m) { const e = managerEff(m); speed *= 1 + 0.05 * e; q += 3 * e; risk *= 0.92; }
  if (focusId(s) === 'altyapi' && p.contract) speed *= 1.0;
  return { speed, cost, q, risk };
}

// ---- Ofis eşyaları ----
export interface DecorDef { id: string; label: string; ico: string; costTL: number; minOffice: number; perk: 'tender' | 'sale' | 'morale'; v: number; desc: string }
export const DECOR: DecorDef[] = [
  { id: 'maket', label: 'Proje maketi', ico: '🏙️', costTL: 400_000, minOffice: 1, perk: 'tender', v: 1, desc: 'İhale puanı +1' },
  { id: 'kupa', label: 'Ödül vitrini', ico: '🏆', costTL: 600_000, minOffice: 1, perk: 'tender', v: 1, desc: 'İhale puanı +1' },
  { id: 'kahve', label: 'Kahve köşesi', ico: '☕', costTL: 300_000, minOffice: 1, perk: 'morale', v: 2, desc: 'Ekip morali hedefi +2' },
  { id: 'toplanti', label: 'Toplantı masası', ico: '🪑', costTL: 1_200_000, minOffice: 2, perk: 'morale', v: 2, desc: 'Ekip morali hedefi +2' },
  { id: 'tablo', label: 'Kurumsal tablo', ico: '🖼️', costTL: 500_000, minOffice: 1, perk: 'sale', v: 0.02, desc: 'Satış hızı +%2' },
  { id: 'vitrin', label: 'Satış vitrini', ico: '🛍️', costTL: 1_500_000, minOffice: 2, perk: 'sale', v: 0.03, desc: 'Satış hızı +%3' },
];
export const decorDef = (id: string) => DECOR.find((d) => d.id === id);
export const hasDecor = (s: GameState, id: string): boolean => !!s.company?.decor?.includes(id);
export function decorBonus(s: GameState, perk: DecorDef['perk']): number { return DECOR.filter((d) => d.perk === perk && hasDecor(s, d.id)).reduce((a, d) => a + d.v, 0); }
export const decorSale = (s: GameState): number => 1 + decorBonus(s, 'sale');
export const decorCost = (d: DecorDef) => TL(d.costTL);

// ---- Yönetim kurulu ----
export const BOARD_IDS = ['kurul_temettu', 'kurul_butce', 'kurul_yatirim', 'kurul_risk'];
/** Her çeyrek başında (Oca/Nis/Tem/Eki) yönetim kurulu toplantısı: seviye 2+ şirketlerde bir karar olayı kuyruğa girer. */
export function boardMonthly(s: GameState): void {
  const c = s.company; if (!c || c.level < 2) return; const d = dateOf(s.clock.day);
  if (![1, 4, 7, 10].includes(d.month) || s.clock.day < 80) return;
  const q = d.year * 4 + Math.floor((d.month - 1) / 3), id = BOARD_IDS[q % BOARD_IDS.length]!;
  if (s.evtLast[id] !== undefined && s.clock.day - s.evtLast[id]! < 60) return;
  if ((s.evtQueue ?? []).some((x) => BOARD_IDS.includes(x.id))) return;
  (s.evtQueue ??= []).push({ id, day: s.clock.day + 2 });
}
export const nextBoardMonth = (s: GameState): string => { const m = dateOf(s.clock.day).month; const nm = [1, 4, 7, 10].find((x) => x > m) ?? 1; return ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][nm]!; };

// ---- Karar günlüğü ----
export function logDecision(s: GameState, kind: string, title: string, detail: string): void {
  (s.decisions ??= []).unshift({ day: s.clock.day, kind, title, detail }); if (s.decisions.length > 80) s.decisions.length = 80;
}
export const isBoardEvent = (id: string) => eventDef(id)?.c === 'kurul';
void ({} as GameEvent);
