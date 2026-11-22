import { TL, type Money } from '../core/money';
import type { GameEvent, GameState, Rival, Stake, Venture } from '../core/types';
import { dateOf } from '../core/calendar';
import { cityData } from '../data';
import { post } from './ledger';
import { acquisitionPrice } from './stock';
import { news } from './rivals';
import { MAX_VENTURES, VENTURE_INFO } from './ventures';

/**
 * Yatırım: rakip şirket hisseleri (alım-satım, temettü, iştirak ve kontrol), durum tespiti (due diligence), pazarlıklı şirket devralma
 * (devralınan borç gerçek krediye dönüşür), fabrikalar (kendi malzeme maliyetini düşürür), lojistik ve rakiplerin birbirini devralması.
 * Rastgele sayı akışı kullanmaz: gürültü, gün/ay bazlı karma (hash) ile üretilir.
 */
export const RIVAL_SHARES = 10_000_000, STAKE_MIN_LEVEL = 6, MAX_STAKE = 49, DIVIDEND_MIN = 10, BOARD_MIN = 25;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const hash01 = (n: number): number => { let a = (n | 0) >>> 0; a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a ^= a >>> 16; return (a >>> 0) / 4294967296; };
const rival = (s: GameState, id: number): Rival | undefined => s.rivals.find((r) => r.id === id);

// ---------------- rakip hisse fiyatı ----------------
/** Rakibin özkaynak değeri: nakit, projeler, ihale başarısı, itibar ve genel güven; iflas etmişse neredeyse değersiz. */
export function rivalEquity(s: GameState, r: Rival): Money {
  const base = Math.max(TL(2_000_000), r.cash + r.projects * TL(6_000_000) + r.wins * TL(3_000_000));
  const crisis = s.macro.regime === 'kriz' || s.macro.regime === 'daralma' ? 0.88 : 1;
  return Math.round(base * (0.6 + r.rep / 125) * (0.85 + (s.macro.confidence - 50) / 250) * crisis * (r.failed ? 0.12 : 1));
}
export const rivalPrice = (s: GameState, r: Rival, day = s.clock.day): Money => Math.max(1, Math.round((rivalEquity(s, r) / RIVAL_SHARES) * (1 + (hash01(r.id * 911 + day) - 0.5) * 0.04)));
export const stakeOf = (s: GameState, rivalId: number): Stake | undefined => s.stakes?.find((x) => x.rivalId === rivalId);
export const stakeValue = (s: GameState, st: Stake): Money => { const r = rival(s, st.rivalId); return r ? Math.round(rivalPrice(s, r) * RIVAL_SHARES * st.pct / 100) : 0; };
export const stakesValue = (s: GameState): Money => (s.stakes ?? []).reduce((a, st) => a + stakeValue(s, st), 0);
export const stakeCost = (s: GameState, r: Rival, pct: number): Money => Math.round(rivalPrice(s, r) * RIVAL_SHARES * pct / 100 * (1.015 + pct * 0.001));
export const stakeProceeds = (s: GameState, r: Rival, pct: number): Money => Math.round(rivalPrice(s, r) * RIVAL_SHARES * pct / 100 * (0.985 - pct * 0.001));

export function buyStakeError(s: GameState, rivalId: number, pct: number): string | null {
  const c = s.company; if (!c) return 'Şirket yok.'; if (c.bankrupt) return 'Şirket iflas etti.'; if (c.level < STAKE_MIN_LEVEL) return `Rakip hissesi almak için seviye ${STAKE_MIN_LEVEL} gerekir.`;
  const r = rival(s, rivalId); if (!r) return 'Rakip bulunamadı.'; if (r.last === 'satin_alindi') return 'Bu şirket artık bağımsız değil.'; if (r.failed) return 'İflas etmiş şirketin hissesi alınmaz (tamamını devralabilirsiniz).';
  if (!Number.isInteger(pct) || pct < 1 || pct > 10) return 'Tek işlemde %1–%10 alınabilir.'; if ((stakeOf(s, rivalId)?.pct ?? 0) + pct > MAX_STAKE) return `Hisse payı en çok %${MAX_STAKE} olabilir; çoğunluk için şirketi devralın.`;
  if (c.cash < stakeCost(s, r, pct)) return 'Hisse alımı için yeterli nakit yok.'; return null;
}
export function buyStake(s: GameState, rivalId: number, pct: number): Money {
  const r = rival(s, rivalId)!, cost = stakeCost(s, r, pct); post(s, 'yatirim_isletme', -cost, { memo: `${r.name} hissesi (%${pct})` });
  const st = stakeOf(s, rivalId); if (st) { st.pct += pct; st.cost += cost; } else (s.stakes ??= []).push({ rivalId, pct, cost, since: s.clock.day }); return cost;
}
export function sellStakeError(s: GameState, rivalId: number, pct: number): string | null {
  const st = stakeOf(s, rivalId); if (!st) return 'Bu şirkette hisseniz yok.'; if (!Number.isInteger(pct) || pct < 1 || pct > st.pct) return `Satılacak oran %1–%${st.pct} olmalı.`; return null;
}
export function sellStake(s: GameState, rivalId: number, pct: number): Money {
  const st = stakeOf(s, rivalId)!, r = rival(s, rivalId)!, v = stakeProceeds(s, r, pct); post(s, 'yatirim_isletme', v, { memo: `${r.name} hissesi satışı (%${pct})` });
  st.cost = Math.round(st.cost * (1 - pct / st.pct)); st.pct -= pct; if (st.pct <= 0) s.stakes = s.stakes!.filter((x) => x !== st); return v;
}

// ---------------- durum tespiti ve devralma ----------------
export const DD_FEE_TL = 450_000;
/** Gizli borç: şirketin gerçek yükümlülüğü; durum tespiti yapılmadan görünmez. */
export const hiddenDebt = (s: GameState, r: Rival): Money => Math.round(acquisitionPrice(s, r.id) * (0.04 + 0.22 * hash01(r.id * 7 + 13)));
export const ddInfo = (s: GameState, rivalId: number) => s.dd?.[rivalId];
export function ddError(s: GameState, rivalId: number): string | null {
  const c = s.company; if (!c) return 'Şirket yok.'; if (c.level < STAKE_MIN_LEVEL) return `Durum tespiti için seviye ${STAKE_MIN_LEVEL} gerekir.`; const r = rival(s, rivalId); if (!r) return 'Rakip bulunamadı.'; if (r.last === 'satin_alindi') return 'Şirket zaten devralınmış.';
  if (s.dd?.[rivalId]) return 'Durum tespiti zaten yapıldı.'; if (c.cash < ddFee(s)) return 'Danışmanlık ücreti için yeterli nakit yok.'; return null;
}
export const ddFee = (s: GameState): Money => Math.round(TL(DD_FEE_TL) * s.costIndex);
export function doDD(s: GameState, rivalId: number): Money {
  const r = rival(s, rivalId)!, fee = ddFee(s); post(s, 'yonetim', -fee, { memo: `Durum tespiti: ${r.name}` }); (s.dd ??= {})[rivalId] = { day: s.clock.day, hidden: hiddenDebt(s, r) }; return hiddenDebt(s, r);
}
export const OFFERS = [0.85, 0.9, 0.95, 1, 1.1];
/** Satıcının kabul eşiği: ay bazında sabit (aynı ay aynı teklif aynı yanıtı alır); iflas ve elde edilmiş pay pazarlığı kolaylaştırır. */
export const acceptThreshold = (s: GameState, r: Rival): number => 0.9 + 0.12 * hash01(r.id * 31 + Math.floor(s.clock.day / 30)) - (r.failed ? 0.25 : 0) - ((stakeOf(s, r.id)?.pct ?? 0) >= BOARD_MIN ? 0.05 : 0);
/** Devralma bedeli (özkaynak): teklif × değer; yapılmış durum tespiti gizli borcu fiyattan düşürür; eldeki pay oranında indirim. */
export function takeoverPrice(s: GameState, r: Rival, offer = 1.1): Money {
  const base = Math.round(acquisitionPrice(s, r.id) * offer), dd = s.dd?.[r.id], disc = dd ? dd.hidden : 0, pct = stakeOf(s, r.id)?.pct ?? 0;
  return Math.max(TL(1_000_000), Math.round((base - disc) * (1 - pct / 100)));
}
export function takeoverError(s: GameState, rivalId: number, offer = 1.1): string | null {
  const c = s.company; if (!c) return 'Şirket yok.'; if (c.bankrupt) return 'Şirket iflas etti.'; if (c.level < STAKE_MIN_LEVEL) return `Şirket satın almak için seviye ${STAKE_MIN_LEVEL} gerekir.`;
  const r = rival(s, rivalId); if (!r) return 'Rakip bulunamadı.'; if (r.last === 'satin_alindi') return 'Bu şirket zaten satın alındı.'; if (!OFFERS.includes(offer)) return 'Geçersiz teklif.';
  if (s.ventures.length >= MAX_VENTURES) return 'İş kolu sınırına ulaşıldı.'; if (offer < acceptThreshold(s, r)) return `${r.name} teklifi reddetti; daha yüksek teklif verin ya da bir sonraki ayı bekleyin.`;
  if (c.cash < takeoverPrice(s, r, offer)) return 'Satın alma için yeterli nakit yok.'; return null;
}
/** Devralma: ödeme nakit, devralınan gizli borç gerçek krediye dönüşür, şirket bağlı iştirak olarak varlıklara girer; eldeki hisse kapanır. */
export function takeover(s: GameState, rivalId: number, offer: number, events: GameEvent[]): Venture {
  const r = rival(s, rivalId)!, c = s.company!, value = acquisitionPrice(s, r.id), paid = takeoverPrice(s, r, offer), debt = hiddenDebt(s, r);
  post(s, 'yatirim_isletme', -paid, { memo: `${r.name} devralındı (teklif %${Math.round(offer * 100)})` });
  const st = stakeOf(s, rivalId); if (st) s.stakes = s.stakes!.filter((x) => x !== st);
  if (debt > 0) s.loans.push({ id: s.nextId++, kind: 'ticari', bank: 'ozel', principal: debt, balance: debt, rate: +(s.macro.policyRate + 4).toFixed(2), term: 60, remaining: 60, payment: Math.round(debt * (s.macro.policyRate + 4) / 1200), schedule: 'interest', sub: 'bagli', start: s.clock.day, nextDue: s.clock.day + 30, missed: 0 });
  const v: Venture = { id: s.nextId++, kind: 'bagli', name: `${r.name} (iştirak)`, city: r.home, openedDay: s.clock.day, readyDay: s.clock.day, capex: value, size: r.tech, quality: 1, ci0: s.costIndex, rivalName: r.name, assumedDebt: debt, last: { revenue: 0, cost: 0, occ: 0, day: s.clock.day }, total: { revenue: 0, cost: 0 } };
  s.ventures.push(v); const wasFailed = r.failed; r.failed = true; r.projects = 0; r.last = 'satin_alindi'; r.cash = 0; c.reputation = clamp(c.reputation + (wasFailed ? 1 : 2), 0, 100);
  events.push({ type: 'ACQUIRED', day: s.clock.day, data: { rival: r.name, price: paid, debt } }); return v;
}

// ---------------- fabrikalar ve lojistik ----------------
export const FACTORY_MIN_LEVEL = 6;
export const FACTORY_PRODUCTS: Record<string, { label: string; ico: string; capexTL: number[]; cut: number[]; days: number }> = {
  cimento: { label: 'Çimento fabrikası', ico: '🏭', capexTL: [90_000_000, 220_000_000], cut: [0.07, 0.13], days: 270 },
  tugla: { label: 'Tuğla-briket fabrikası', ico: '🧱', capexTL: [45_000_000, 110_000_000], cut: [0.06, 0.11], days: 180 },
  demir: { label: 'Çelik haddehane', ico: '⚙️', capexTL: [120_000_000, 300_000_000], cut: [0.06, 0.11], days: 300 },
  beton: { label: 'Hazır beton santrali', ico: '🚛', capexTL: [30_000_000, 80_000_000], cut: [0.07, 0.12], days: 150 },
};
export const factoryCapex = (s: GameState, prod: string, tier: number): Money => Math.round(TL(FACTORY_PRODUCTS[prod]!.capexTL[tier]!) * s.costIndex);
export function factoryError(s: GameState, prod: string, city: string, tier: number): string | null {
  const c = s.company; if (!c) return 'Şirket yok.'; if (c.bankrupt) return 'Şirket iflas etti.'; if (c.level < FACTORY_MIN_LEVEL) return `Fabrika için seviye ${FACTORY_MIN_LEVEL} gerekir.`;
  const f = FACTORY_PRODUCTS[prod]; if (!f || !(tier === 0 || tier === 1)) return 'Geçersiz fabrika.'; if (!s.openCities.includes(city)) return 'Bu ilde şubeniz yok.';
  if (s.ventures.some((v) => v.kind === 'fabrika' && v.prod === prod)) return 'Bu üründe zaten fabrikanız var.'; if (s.ventures.length >= MAX_VENTURES) return 'İş kolu sınırına ulaşıldı.'; if (c.cash < factoryCapex(s, prod, tier)) return 'Yatırım için yeterli nakit yok.'; return null;
}
export function buildFactory(s: GameState, prod: string, city: string, tier: number, events: GameEvent[]): Venture {
  const f = FACTORY_PRODUCTS[prod]!, capex = factoryCapex(s, prod, tier); post(s, 'yatirim_isletme', -capex, { memo: `${f.label} yatırımı` });
  const v: Venture = { id: s.nextId++, kind: 'fabrika', name: `${cityData(city)?.label ?? city} ${f.label}`, city, openedDay: s.clock.day, readyDay: s.clock.day + f.days, capex, size: tier + 1, quality: 1, ci0: s.costIndex, prod, last: { revenue: 0, cost: 0, occ: 0, day: s.clock.day }, total: { revenue: 0, cost: 0 } };
  s.ventures.push(v); events.push({ type: 'VENTURE_OPENED', day: s.clock.day, data: { id: v.id, kind: 'fabrika', name: v.name } }); return v;
}
/** Kendi fabrikasının ürettiği malzemede birim fiyat çarpanı (hazır fabrika; bakımdaysa 1). */
export function factoryMatMult(s: GameState, matId: string): number {
  const v = s.ventures.find((x) => x.kind === 'fabrika' && x.prod === matId && s.clock.day >= x.readyDay); if (!v) return 1; return 1 - FACTORY_PRODUCTS[matId]!.cut[v.size - 1]!;
}
export const hasFactory = (s: GameState, matId: string) => factoryMatMult(s, matId) < 1;
/** Kendi kamyon filosu navlunu düşürür: her kamyon %8, en çok %32. */
export function freightMult(s: GameState): number { const n = s.machines.filter((m) => m.type === 'kamyon' || m.type === 'damperli_kamyon').length; return 1 - Math.min(0.32, 0.08 * n); }

// ---------------- aylık ----------------
/** Temettü (≥%10 pay), rakiplerin birbirini devralması (payımız tasfiye edilir). */
export function investMonthly(s: GameState, events: GameEvent[]): void {
  if (!s.company) return; const mi = Math.floor(s.clock.day / 30);
  for (const st of s.stakes ?? []) { const r = rival(s, st.rivalId); if (!r || r.failed || st.pct < DIVIDEND_MIN) continue; const d = Math.round(rivalEquity(s, r) * 0.006 * st.pct / 100 * 12 / 12); if (d > 0) post(s, 'bagli_gelir', d, { memo: `${r.name} temettüsü (%${st.pct})` }); }
  const prey = s.rivals.filter((r) => r.failed && r.last !== 'satin_alindi'), hunters = s.rivals.filter((r) => !r.failed && r.cash > TL(120_000_000));
  if (prey.length && hunters.length && hash01(mi * 53 + 3) < 0.06) {
    const t = prey[Math.floor(hash01(mi * 17 + 1) * prey.length)]!, h = hunters[Math.floor(hash01(mi * 29 + 5) * hunters.length)]!; t.last = 'satin_alindi'; h.projects += 2; h.cash -= TL(20_000_000);
    const st = stakeOf(s, t.id); if (st) { const v = Math.round(stakeValue(s, st) + t.cash * 0), pay = Math.max(0, v); post(s, 'yatirim_isletme', pay, { memo: `${t.name} devralındı, payımız tasfiye` }); s.stakes = s.stakes!.filter((x) => x !== st); }
    news(s, events, `${h.name}, iflas eden ${t.name} şirketini devraldı.`);
  }
  void dateOf; void VENTURE_INFO;
}
