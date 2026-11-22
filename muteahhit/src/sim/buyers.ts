import type { Money } from '../core/money';
import { rand, randInt } from '../core/rng';
import type { GameEvent, GameState, Offer, Project, Unit } from '../core/types';
import { post } from './ledger';
import { unitFair, fairPerM2, unitsOf, closeSaleAt, quotePrice, paceOf } from './sales';

/**
 * Alıcı ve kiracı teklifleri: satış artık otomatik kapanmaz. Her alıcı bir teklifle gelir; oyuncu kabul eder, karşı teklif verir ya da reddeder.
 * İstenirse "otomatik kabul eşiği" ile danışmana yetki verilebilir. Alıcının gizli tavanı (`maxRatio`) teklif anında belirlenir; karşı teklif tavanı aşarsa alıcı gider.
 */
export const OFFER_DAYS = 18, MAX_OFFERS = 5, RENT_YIELD = 0.0045, RENT_LEAVE = 0.025;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const FIRST = ['Ahmet', 'Elif', 'Mehmet', 'Zeynep', 'Mustafa', 'Ayşe', 'Burak', 'Selin', 'Emre', 'Deniz', 'Can', 'Merve', 'Kerem', 'Ece', 'Okan', 'Seda', 'Yusuf', 'Buse', 'Tolga', 'Naz'];
const LAST = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aksoy', 'Polat', 'Korkmaz', 'Erdem', 'Güneş'];
const PROFILES_KONUT = ['Genç çift · ilk ev', 'Yatırımcı', 'Emekli çift', 'Kalabalık aile', 'Gurbetçi', 'Doktor', 'Öğretmen çifti'];
const PROFILES_TICARI = ['Esnaf', 'Yerel şirket', 'Zincir mağaza', 'Muayenehane', 'Girişimci'];
const NOTES_SAT = ['“Peşin ödeyebilirim.”', '“Bu daireyi çok beğendim.”', '“Biraz pazarlık yapabilir miyiz?”', '“Komşular iyi, konum iyi.”', '“Bütçem bu kadar.”', '“Hemen karar vermem gerek.”'];
const NOTES_KIRA = ['“Uzun süreli oturacağız.”', '“Evcil hayvanım yok.”', '“İşyerim için arıyorum.”', '“Depozito hazır.”'];
export const isTicari = (p: Project) => ['ofis', 'is_merkezi', 'otel', 'avm', 'fabrika', 'depo'].includes(p.type);

/** Teklifin toplam satış bedeli (kira tekliflerinde aylık kira). Liste fiyatı değişirse teklif de onunla birlikte oynar. */
export function offerPrice(s: GameState, p: Project, u: Unit, o: Pick<Offer, 'kind' | 'ratio' | 'pay'>): Money {
  if (o.kind === 'kira') return Math.round(unitFair(u, fairPerM2(s, p)) * (u.adj ?? 1) * RENT_YIELD * o.ratio);
  return quotePrice(s, p, u, o.ratio, o.pay);
}
export const rentOf = (s: GameState, p: Project, u: Unit): Money => Math.round(unitFair(u, fairPerM2(s, p)) * (u.adj ?? 1) * RENT_YIELD);
export const offersOf = (s: GameState, projectId: number): Offer[] => (s.offers ?? []).filter((o) => o.projectId === projectId);
export const flexLabel = (o: Offer): string => { const g = o.maxRatio - o.ratio; return g >= 0.06 ? 'Bütçesi geniş' : g >= 0.035 ? 'Pazarlığa açık' : 'Bütçesi sıkı'; };

/** Boş bir daire için yeni teklif üretir (RNG: market akışı). */
export function createOffer(s: GameState, p: Project, u: Unit, kind: 'satis' | 'kira', events: GameEvent[]): void {
  const pol = p.sales!, ticari = isTicari(p), profs = ticari ? PROFILES_TICARI : PROFILES_KONUT;
  const buyer = `${FIRST[randInt(s.rng, 'market', 0, FIRST.length - 1)]} ${LAST[randInt(s.rng, 'market', 0, LAST.length - 1)]}`, profile = profs[randInt(s.rng, 'market', 0, profs.length - 1)]!;
  const ratio = +clamp(0.95 + rand(s.rng, 'market') * 0.1 + paceOf(pol).ratio, 0.9, 1.12).toFixed(3), maxRatio = +clamp(ratio + 0.02 + rand(s.rng, 'market') * 0.07, 0.92, 1.16).toFixed(3);
  const pay: Offer['pay'] = kind === 'kira' ? 'pesin' : p.status === 'insaat' ? 'onsatis' : pol.installments && rand(s.rng, 'market') < 0.5 ? 'taksit' : 'pesin';
  const notes = kind === 'kira' ? NOTES_KIRA : NOTES_SAT, note = notes[randInt(s.rng, 'market', 0, notes.length - 1)]!;
  const o: Offer = { id: s.nextId++, projectId: p.id, unitId: u.id, kind, buyer, profile, seed: randInt(s.rng, 'market', 1, 9999), ratio, maxRatio, pay, day: s.clock.day, until: s.clock.day + OFFER_DAYS, note };
  (s.offers ??= []).push(o);
  events.push({ type: 'OFFER_NEW', day: s.clock.day, data: { projectId: p.id, offerId: o.id, kind } });
  if (kind === 'satis' && pol.autoMin !== undefined && ratio >= pol.autoMin) acceptOffer(s, o, ratio, events);
}

/** Kabul: satış kapanır ya da kira sözleşmesi başlar. `ratio` karşı teklifle değişmiş olabilir. */
export function acceptOffer(s: GameState, o: Offer, ratio: number, events: GameEvent[]): void {
  const p = s.projects.find((x) => x.id === o.projectId), u = s.units.find((x) => x.id === o.unitId); s.offers = (s.offers ?? []).filter((x) => x.id !== o.id);
  if (!p || !u || u.status === 'satildi' || u.rent) return;
  if (o.kind === 'kira') {
    const amount = offerPrice(s, p, u, { kind: 'kira', ratio, pay: 'pesin' }); u.rent = { amount, tenant: o.buyer, since: s.clock.day, seed: o.seed }; delete u.listing;
    (p.sales!.log ??= []).push({ d: s.clock.day, p: amount, k: 'k' }); if (p.sales!.log.length > 80) p.sales!.log.shift();
    events.push({ type: 'RENT_STARTED', day: s.clock.day, data: { projectId: p.id, unitId: u.id, amount, tenant: o.buyer } }); return;
  }
  closeSaleAt(s, p, u, events, ratio, o.pay, o.buyer);
  s.offers = (s.offers ?? []).filter((x) => x.unitId !== u.id);
}

/** Günlük: süresi dolan teklifler gider. */
export function offersDaily(s: GameState, events: GameEvent[]): void {
  if (!s.offers?.length) return;
  const keep: Offer[] = [];
  for (const o of s.offers) {
    const u = s.units.find((x) => x.id === o.unitId);
    if (!u || u.status === 'satildi' || u.rent || u.hold) continue;
    if (o.until <= s.clock.day) { events.push({ type: 'OFFER_LOST', day: s.clock.day, data: { projectId: o.projectId, offerId: o.id, reason: 'sure' } }); continue; }
    keep.push(o);
  }
  s.offers = keep;
}

/** Aylık: kira geliri; kiracı ara sıra ayrılır. */
export function rentMonthly(s: GameState, events: GameEvent[]): void {
  for (const u of s.units) {
    if (!u.rent) continue; const p = s.projects.find((x) => x.id === u.projectId); if (!p) continue;
    post(s, 'kira_geliri', u.rent.amount, { projectId: p.id, memo: `${p.name}: kira (${u.rooms}, ${u.floor}. kat)` });
    if (rand(s.rng, 'market') < RENT_LEAVE) { events.push({ type: 'RENT_ENDED', day: s.clock.day, data: { projectId: p.id, unitId: u.id, tenant: u.rent.tenant } }); delete u.rent; u.listing = 'kira'; }
  }
}
export const monthlyRent = (s: GameState, projectId: number): Money => unitsOf(s, projectId).reduce((a, u) => a + (u.rent?.amount ?? 0), 0);
