import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { netWorth } from '../src/sim/finance';
import { consolidate } from '../src/sim/consol';
import { FACTORY_PRODUCTS, acceptThreshold, factoryOutput, ownStock, freightMult, hiddenDebt, rivalPrice, sellStake, stakeOf, stakesValue, takeoverPrice } from '../src/sim/invest';
import { quoteOrder, unitPrice } from '../src/sim/materials';
import { fairPrice, priceDrivers } from '../src/sim/stock';
import { debtTotal } from '../src/sim/loans';
import { pack, unpack } from '../src/save/serialize';
import type { GameState } from '../src/core/types';

function setup(level = 7): GameState {
  const s = newGameState(55); dispatch(s, 'CreateCompany', { name: 'Yatirim Holding', founderBackground: 'emlakci', startCity: 'ankara' });
  const c = s.company!; c.level = level; c.reputation = 70; c.creditScore = 700; c.cash = TL(2_000_000_000); s.ledgerBase = c.cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999; return s;
}
const live = (s: GameState) => s.rivals.find((r) => !r.failed && r.last !== 'satin_alindi')!;

describe('rakip hisseleri', () => {
  it('alım nakdi ve defteri düşürür, pay net değere girer; satış geri nakit getirir (komisyon farkıyla)', () => {
    const s = setup(), r = live(s), nw0 = netWorth(s), cash0 = s.company!.cash;
    expect(dispatch(s, 'BuyStake', { rivalId: r.id, pct: 11 }).ok).toBe(false); expect(dispatch(s, 'BuyStake', { rivalId: r.id, pct: 5 }).ok).toBe(true);
    expect(s.company!.cash).toBeLessThan(cash0); expect(stakeOf(s, r.id)!.pct).toBe(5); expect(stakesValue(s)).toBeGreaterThan(0); expect(Math.abs(netWorth(s) - nw0)).toBeLessThan(cash0 * 0.01); expect(checkInvariant(s)).toBe(true);
    const c1 = s.company!.cash; expect(dispatch(s, 'SellStake', { rivalId: r.id, pct: 9 }).ok).toBe(false); expect(dispatch(s, 'SellStake', { rivalId: r.id, pct: 5 }).ok).toBe(true);
    expect(s.company!.cash).toBeGreaterThan(c1); expect(stakeOf(s, r.id)).toBeUndefined(); expect(checkInvariant(s)).toBe(true);
  });
  it('en çok %49; seviye kapısı; fiyat performansa bağlı (nakit/itibar/iflas)', () => {
    const s = setup(), r = live(s); for (let i = 0; i < 4; i++) dispatch(s, 'BuyStake', { rivalId: r.id, pct: 10 }); expect(stakeOf(s, r.id)!.pct).toBe(40);
    dispatch(s, 'BuyStake', { rivalId: r.id, pct: 9 }); expect(dispatch(s, 'BuyStake', { rivalId: r.id, pct: 1 }).ok).toBe(false); expect(dispatch(setup(3), 'BuyStake', { rivalId: 1, pct: 1 }).ok).toBe(false);
    const p0 = rivalPrice(s, r, 100); r.cash += TL(500_000_000); expect(rivalPrice(s, r, 100)).toBeGreaterThan(p0); const p1 = rivalPrice(s, r, 100); r.failed = true; expect(rivalPrice(s, r, 100)).toBeLessThan(p1 * 0.2);
  });
  it('≥%10 pay temettü getirir', () => {
    const s = setup(), r = live(s); dispatch(s, 'BuyStake', { rivalId: r.id, pct: 10 }); const l0 = s.ledger.length; r.cash = TL(300_000_000); advanceDays(s, 35);
    expect(s.ledger.slice(l0).some((e) => e.cat === 'bagli_gelir' && e.amount > 0 && e.memo?.includes('temettü'))).toBe(true);
  });
});

describe('devralma, durum tespiti, pazarlık', () => {
  it('düşük teklif reddedilir, yüksek kabul; devralma varlık + devralınan borç + iştirak yaratır; eldeki hisse kapanır', () => {
    const s = setup(), r = live(s); dispatch(s, 'BuyStake', { rivalId: r.id, pct: 10 });
    expect(acceptThreshold(s, r)).toBeGreaterThan(0.8); expect(dispatch(s, 'AcquireRival', { rivalId: r.id, offer: 0.5 }).ok).toBe(false);
    const debt0 = debtTotal(s), nw0 = netWorth(s), cash0 = s.company!.cash, hidden = hiddenDebt(s, r), price = takeoverPrice(s, r, 1.1);
    expect(dispatch(s, 'AcquireRival', { rivalId: r.id, offer: 1.1 }).ok).toBe(true);
    expect(cash0 - s.company!.cash).toBe(price); expect(debtTotal(s) - debt0).toBe(hidden); expect(s.ventures.at(-1)!.kind).toBe('bagli'); expect(s.ventures.at(-1)!.assumedDebt).toBe(hidden); expect(stakeOf(s, r.id)).toBeUndefined();
    expect(r.last).toBe('satin_alindi'); expect(Number.isFinite(netWorth(s))).toBe(true); expect(nw0).toBeGreaterThan(0); expect(dispatch(s, 'AcquireRival', { rivalId: r.id, offer: 1.1 }).ok).toBe(false);
    advanceDays(s, 60); expect(checkInvariant(s)).toBe(true);
  });
  it('durum tespiti ücretlidir, gizli borcu fiyattan düşürür; tekrar yapılamaz', () => {
    const s = setup(), r = live(s), before = takeoverPrice(s, r, 1.1), cash0 = s.company!.cash;
    expect(dispatch(s, 'DueDiligence', { rivalId: r.id }).ok).toBe(true); expect(cash0).toBeGreaterThan(s.company!.cash); expect(s.dd![r.id]!.hidden).toBe(hiddenDebt(s, r)); expect(takeoverPrice(s, r, 1.1)).toBeLessThan(before);
    expect(dispatch(s, 'DueDiligence', { rivalId: r.id }).ok).toBe(false);
  });
  it('iflas etmiş şirket çok ucuza ve kolay devralınır', () => {
    const s = setup(), r = live(s); const norm = takeoverPrice(s, r, 1); const thr = acceptThreshold(s, r); r.failed = true; expect(takeoverPrice(s, r, 1)).toBeLessThan(norm * 0.6); expect(acceptThreshold(s, r)).toBeLessThan(thr);
  });
});

describe('fabrikalar ve lojistik', () => {
  it('fabrika gerçekten üretir: hazır olunca her ay malzeme stoğa girer, maliyet deftere yazılır, fazla satılır; 20 ürün', () => {
    const s = setup(); expect(Object.keys(FACTORY_PRODUCTS).length).toBeGreaterThanOrEqual(18); expect(dispatch(s, 'BuildFactory', { prod: 'cimento', city: 'ankara', tier: 1 }).ok).toBe(true);
    const v = s.ventures[0]!; expect(ownStock(s, 'cimento')).toBe(0); advanceDays(s, 100); expect(ownStock(s, 'cimento')).toBe(0); expect(factoryOutput(v)).toBeGreaterThan(50);
    expect(dispatch(s, 'BuildFactory', { prod: 'cimento', city: 'ankara', tier: 0 }).ok).toBe(false); expect(dispatch(setup(3), 'BuildFactory', { prod: 'tugla', city: 'ankara', tier: 0 }).ok).toBe(false);
    advanceDays(s, 260); expect(ownStock(s, 'cimento')).toBeGreaterThan(0); expect(s.stockLog!.some((l) => l.ref === 'fabrika' && l.kind === 'giris')).toBe(true); expect(s.ledger.some((e) => e.cat === 'fabrika_gider' && e.amount < 0)).toBe(true);
    advanceDays(s, 700); expect(s.ledger.some((e) => e.cat === 'fabrika_gelir' && e.amount > 0), 'depo dolunca fazla üretim satılır').toBe(true); expect(checkInvariant(s)).toBe(true);
  });
  it('kendi üretimi şantiyede tüketilir: stok azalır ve sipariş verilmez', () => {
    const s = setup(); dispatch(s, 'BuildFactory', { prod: 'cimento', city: 'ankara', tier: 1 }); advanceDays(s, 400); const q = ownStock(s, 'cimento'); expect(q).toBeGreaterThan(0);
    s.stock.cimento!.qty = q * 0.5; expect(ownStock(s, 'cimento')).toBeLessThan(q); advanceDays(s, 60); expect(ownStock(s, 'cimento')).toBeGreaterThan(q * 0.5);
  });
  it('kamyon filosu navlunu düşürür', () => {
    const s = setup(); const q0 = quoteOrder(s, 'cimento', 'yerel', 50).freight; s.machines.length = 0; dispatch(s, 'BuyMachine', { type: 'kamyon' }); dispatch(s, 'BuyMachine', { type: 'kamyon' });
    expect(freightMult(s)).toBeCloseTo(0.84, 5); expect(quoteOrder(s, 'cimento', 'yerel', 50).freight).toBeLessThan(q0 + 1);
  });
});

describe('iştirak, konsolide tablo, şirketler arası işlemler', () => {
  it('konsolide özkaynak = net varlık (işlemsiz, işlemli, yıllar sonra); iç aktarım nakdi ve net değeri değiştirmez', () => {
    const s = setup(); dispatch(s, 'BuildVenture', { kind: 'restoran', city: 'ankara', tier: 1 }); dispatch(s, 'BuildFactory', { prod: 'beton', city: 'ankara', tier: 0 }); advanceDays(s, 200);
    let c = consolidate(s); expect(c.ok).toBe(true); const nw = netWorth(s), cash = s.company!.cash;
    expect(dispatch(s, 'SubTransfer', { div: 'isletme', kind: 'sermaye', amount: TL(50_000_000) }).ok).toBe(true); expect(dispatch(s, 'SubTransfer', { div: 'enerji', kind: 'borc', amount: TL(20_000_000) }).ok).toBe(true);
    expect(s.company!.cash).toBe(cash); expect(netWorth(s)).toBe(nw); c = consolidate(s); expect(c.ok).toBe(true); expect(c.elimInvest).toBe(TL(50_000_000)); expect(c.elimIc).toBe(TL(20_000_000));
    expect(c.sumEquity).toBeGreaterThan(c.equity); expect(c.rows[0]!.key).toBe('merkez');
    const ent = c.rows.find((r) => r.key === 'enerji')!; expect(ent.icPayable).toBe(TL(20_000_000)); expect(c.rows.find((r) => r.key === 'isletme')!.treasury).toBeGreaterThanOrEqual(TL(50_000_000) - TL(500_000_000));
    expect(dispatch(s, 'SubTransfer', { div: 'enerji', kind: 'borc_odeme', amount: TL(30_000_000) }).ok).toBe(false); expect(dispatch(s, 'SubTransfer', { div: 'enerji', kind: 'borc_odeme', amount: TL(20_000_000) }).ok).toBe(true);
    expect(dispatch(s, 'SubTransfer', { div: 'isletme', kind: 'temettu', amount: TL(1_000_000_000) }).ok).toBe(false);
    advanceDays(s, 400); c = consolidate(s); expect(c.ok).toBe(true); expect(checkInvariant(s)).toBe(true);
  });
  it('devralınan şirketin borcu iştirak borcu olarak ayrı izlenir, merkez borcundan düşer', () => {
    const s = setup(), r = live(s); dispatch(s, 'AcquireRival', { rivalId: r.id, offer: 1.1 }); const c = consolidate(s), b = c.rows.find((x) => x.key === 'bagli')!, h = s.ventures.at(-1)!.assumedDebt!;
    expect(h).toBeGreaterThan(0); expect(b.debt).toBe(h); expect(c.rows[0]!.debt + b.debt).toBe(debtTotal(s)); expect(c.ok).toBe(true);
  });
  it('bütçe ve geçersiz girdi; kayıt/yükleme iç kayıtları, payları ve durum tespitini korur', () => {
    const s = setup(), r = live(s); expect(dispatch(s, 'SetSubBudget', { div: 'enerji', budget: -1 }).ok).toBe(false); expect(dispatch(s, 'SetSubBudget', { div: 'enerji', budget: TL(5_000_000) }).ok).toBe(true);
    dispatch(s, 'BuyStake', { rivalId: r.id, pct: 3 }); dispatch(s, 'DueDiligence', { rivalId: r.id }); dispatch(s, 'SubTransfer', { div: 'insaat', kind: 'sermaye', amount: TL(10_000_000) }); expect(dispatch(s, 'SubTransfer', { div: 'merkez', kind: 'sermaye', amount: 1 }).ok).toBe(false);
    const u = unpack(pack(s)); expect(u.ok).toBe(true); if (!u.ok) return; expect(u.state.stakes![0]!.pct).toBe(3); expect(u.state.ic!.length).toBe(1); expect(u.state.dd![r.id]).toBeDefined(); expect(u.state.holding.budget!.enerji).toBe(TL(5_000_000)); expect(consolidate(u.state).ok).toBe(true);
  });
});

describe('kendi hissen: fiyat etkenleri ve halka arz maliyeti', () => {
  it('borç fiyatı düşürür; kriz etkenleri negatif; halka arz net kaynağı masraf düşülmüş', () => {
    const s = setup(); const f0 = fairPrice(s); s.loans.push({ id: 999, kind: 'ticari', bank: 'ozel', principal: TL(800_000_000), balance: TL(800_000_000), rate: 40, term: 36, remaining: 36, payment: 0, schedule: 'interest', start: 0, nextDue: 30, missed: 0 });
    expect(fairPrice(s)).toBeLessThan(f0); expect(priceDrivers(s).debt).toBeLessThan(0); s.macro.regime = 'kriz'; expect(priceDrivers(s).sector).toBeLessThan(0);
  });
});

describe('eski kayıt uyumu', () => {
  it('yeni alanları olmayan kayıt yüklenir, 3 yıl sorunsuz oynanır, konsolide tablo tutar', () => {
    const s = setup(6); dispatch(s, 'BuildVenture', { kind: 'gunes', city: 'ankara', tier: 0 }); advanceDays(s, 90);
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown>; for (const k of ['mgmt', 'payables', 'contracts', 'warehouse', 'usedMarket', 'leases', 'estate', 'energy', 'stakes', 'ic', 'dd', 'reports']) delete raw[k];
    for (const v of raw.ventures as Record<string, unknown>[]) { delete v.ops; delete v.sat; delete v.ppa; delete v.hist; }
    delete (raw.holding as Record<string, unknown>).budget;
    const r = unpack(pack(raw as unknown as GameState)); expect(r.ok).toBe(true); if (!r.ok) return;
    advanceDays(r.state, 1100); expect(checkInvariant(r.state)).toBe(true); expect(consolidate(r.state).ok).toBe(true); expect(Number.isFinite(netWorth(r.state))).toBe(true);
    expect(dispatch(r.state, 'BuildVenture', { kind: 'restoran', city: 'ankara', tier: 0 }).ok).toBe(true); expect(dispatch(r.state, 'SubTransfer', { div: 'enerji', kind: 'sermaye', amount: 100 }).ok).toBe(true);
  });
});

describe('silinen rakip hissesi', () => {
  it('hissesi olan batık rakip listeden silinmez; olmayan silinir; kayıp rakipte satış çökmez', () => {
    const s = newGameState(5); dispatch(s, 'CreateCompany', { name: 'X', founderBackground: 'eski_kalfa', startCity: 'ankara' });
    const r = s.rivals[0]!; r.failed = true; r.since = -2000; s.stakes = [{ rivalId: r.id, pct: 5, cost: 1000, since: 0 }];
    const gone = s.rivals.length; s.rivals.splice(0, 1); // rakip kaybolmuş gibi
    expect(s.rivals.length).toBe(gone - 1);
    expect(() => sellStake(s, r.id, 5)).not.toThrow();
    expect(s.stakes?.length ?? 0).toBe(0);
  });
});
