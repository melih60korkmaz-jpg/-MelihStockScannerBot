import { TL, type Money } from '../core/money';
import type { GameEvent, GameState, Rival, Stake, Venture } from '../core/types';
import { dateOf } from '../core/calendar';
import { cityData, material } from '../data';
import { capacityOf, spaceOf, unitPrice } from './materials';
import { logStock } from './supplyx';
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

// ---------------- fabrikalar (sanayi üretimi) ve lojistik ----------------
export const FACTORY_MIN_LEVEL = 4;
/** Her fabrika bir malzeme üretir: sermaye iki kademe (küçük/büyük tesis). Aylık üretim = yatırımın aylık %3,5'i değerinde malzeme (piyasa fiyatıyla). */
const HEAVY = 1, MID = 0.45, LIGHT = 0.25;
const FP = (label: string, ico: string, w: number, days: number) => ({ label, ico, capexTL: [Math.round(120 * w) * 1_000_000, Math.round(300 * w) * 1_000_000], days });
export const FACTORY_PRODUCTS: Record<string, { label: string; ico: string; capexTL: number[]; days: number }> = {
  cimento: FP('Çimento fabrikası', '🏭', HEAVY, 270), demir: FP('Çelik haddehane', '⚙️', HEAVY, 300), celik_profil: FP('Çelik profil tesisi', '🔩', HEAVY, 270), hasir_celik: FP('Hasır çelik tesisi', '🕸️', MID, 210),
  cam: FP('Cam fabrikası', '🪟', HEAVY, 270), aluminyum: FP('Alüminyum doğrama fabrikası', '🔧', HEAVY, 270), kablo: FP('Kablo fabrikası', '🔌', MID, 210), boru: FP('Boru fabrikası', '🚰', MID, 210),
  tugla: FP('Tuğla-briket fabrikası', '🧱', MID, 180), gazbeton: FP('Gazbeton fabrikası', '🧱', MID, 180), seramik: FP('Seramik fabrikası', '🍽️', MID, 210), parke: FP('Parke fabrikası', '🪵', MID, 180),
  yalitim: FP('Yalıtım malzemesi tesisi', '🧊', MID, 180), mantolama: FP('Mantolama tesisi', '🧊', MID, 180), cephe_kaplama: FP('Cephe kaplama tesisi', '🏢', MID, 210),
  boya: FP('Boya fabrikası', '🎨', LIGHT, 150), hazir_harc: FP('Hazır harç tesisi', '🪣', LIGHT, 120), alcipan: FP('Alçıpan fabrikası', '📐', LIGHT, 150), kalip: FP('Kalıp atölyesi', '🪚', LIGHT, 120), beton: FP('Hazır beton santrali', '🚛', LIGHT, 150),
};
export const factoryCapex = (s: GameState, prod: string, tier: number): Money => Math.round(TL(FACTORY_PRODUCTS[prod]!.capexTL[tier]!) * s.costIndex);
/** Aylık üretim miktarı (malzeme biriminde). */
export function factoryOutput(v: Venture): number { const m = material(v.prod ?? ''); return m ? (v.capex / 100 / (v.ci0 || 1)) * 0.035 / m.priceTL : 0; }
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
export const ownStock = (s: GameState, prod: string) => s.stock[prod]?.qty ?? 0;
/** Aylık üretim: üretilen malzeme depoya girer (üründen en çok depo kapasitesinin %35'i kadar stok tutulur); sığmayan fazla, piyasa fiyatının %88'inden satılır. Maliyet = piyasa fiyatının %55'i + sabit bakım. */
export function produceMonth(s: GameState, v: Venture, day = s.clock.day): { revenue: Money; cost: Money; occ: number; broke: boolean } {
  const id = v.prod ?? '', m = material(id); if (!m) return { revenue: 0, cost: 0, occ: 0, broke: false };
  const broke = hash01(v.id * 61 + Math.floor(day / 30)) < 0.03, qty = broke ? 0 : factoryOutput(v) * (0.9 + 0.2 * hash01(v.id * 17 + Math.floor(day / 30))) * (s.costIndex / (v.ci0 || 1) > 0 ? 1 : 1);
  const market = unitPrice(s, id, 'yerel'), unitCost = Math.round(market * 0.55), room = m.space > 0 ? Math.max(0, (capacityOf(s) * 0.35 - spaceOf(id, ownStock(s, id))) / m.space) : Math.max(0, 400 - ownStock(s, id)), keep = Math.min(qty, room), sell = qty - keep;
  if (keep > 0) { const cur = (s.stock[id] ??= { qty: 0, qual: 1, cost: unitCost }), tot = cur.qty + keep; cur.cost = tot > 0 ? (cur.cost * cur.qty + unitCost * keep) / tot : unitCost; cur.qual = (cur.qual * cur.qty + 1 * keep) / Math.max(1e-9, tot); cur.qty = tot; logStock(s, id, keep, 'giris', keep * unitCost, 'fabrika'); }
  const revenue = Math.round(sell * market * 0.88), cost = Math.round(qty * unitCost + v.capex * 0.0015);
  return { revenue, cost, occ: qty > 0 ? Math.min(1.5, qty / Math.max(1e-9, factoryOutput(v))) : 0, broke };
}
export const factoryMatMult = (_s: GameState, _matId: string): number => 1;
export const hasFactory = (s: GameState, matId: string) => s.ventures.some((x) => x.kind === 'fabrika' && x.prod === matId && s.clock.day >= x.readyDay);

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
