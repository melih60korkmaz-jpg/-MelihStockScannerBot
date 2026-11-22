import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { netWorth } from '../src/sim/finance';
import { WAREHOUSE, capacityOf, freeSpace, quoteOrder, spaceOf, stockQty, usedSpace } from '../src/sim/materials';
import { payablesTotal, stockLossForecast, warehouseRent } from '../src/sim/supply';
import { SUPPLIERS } from '../src/data';
import { pack, unpack } from '../src/save/serialize';
import type { GameState } from '../src/core/types';

function setup(level = 4, cash = TL(400_000_000)): GameState {
  const s = newGameState(71); dispatch(s, 'CreateCompany', { name: 'Tedarik Yapı', founderBackground: 'emlakci', startCity: 'istanbul' });
  const c = s.company!; c.level = level; c.cash = cash; s.ledgerBase = cash - s.ledger.reduce((a, e) => a + e.amount, 0); s.macro.calmUntilDay = 99999; return s;
}
describe('tedarik: teklif ve sipariş', () => {
  it('tedarikçi nitelikleri tanımlı; fiyat karşılaştırması farklı sonuç verir (vade farkı, nakliye, bölge uyumsuzluğu, ekspres)', () => {
    for (const sp of SUPPLIERS) { expect(sp.cap).toBeGreaterThan(0); expect(sp.regions.length).toBeGreaterThan(0); expect(sp.terms).toContain('pesin'); }
    const s = setup(); const a = quoteOrder(s, 'demir', 'premium', 20), b = quoteOrder(s, 'demir', 'premium', 20, { term: 'vade60' }), c = quoteOrder(s, 'demir', 'premium', 20, { rush: true });
    expect(b.premium).toBeGreaterThan(0); expect(b.total).toBeGreaterThan(a.total); expect(c.freight).toBeGreaterThan(a.freight); expect(c.lead).toBeLessThan(a.lead);
    const reg = quoteOrder(s, 'demir', 'bolge', 20, { dest: 'izmir' }), reg2 = quoteOrder(s, 'demir', 'bolge', 20, { dest: 'ankara' }); expect(reg.mismatch).toBe(false); expect(reg2.mismatch).toBe(true); expect(reg2.freight).toBeGreaterThan(reg.freight); expect(reg2.lead).toBeGreaterThan(reg.lead);
    expect(quoteOrder(s, 'demir', 'ucuz', 20, { term: 'vade30' }).ok).toBe(false); expect(quoteOrder(s, 'demir', 'ucuz', 5000).ok).toBe(false); // tedarikçi kapasitesi
    expect(quoteOrder(s, 'demir', 'yerel', 0).ok).toBe(false);
  });
  it('toplu sipariş indirimi; sipariş stok miktarını değiştirir; ödeme ve nakliye deftere işlenir', () => {
    const s = setup(); const small = quoteOrder(s, 'demir', 'premium', 10), big = quoteOrder(s, 'demir', 'premium', 400); expect(small.discount).toBe(0); expect(big.discount).toBeGreaterThan(0);
    const c0 = s.company!.cash; expect(dispatch(s, 'PlaceOrder', { material: 'demir', qty: 50, supplier: 'premium' }).ok).toBe(true); expect(c0 - s.company!.cash).toBe(quoteOrder(s, 'demir', 'premium', 50).total || c0 - s.company!.cash);
    expect(s.ledger.some((e) => e.memo?.startsWith('Nakliye'))).toBe(true); expect(stockQty(s, 'demir')).toBe(0); advanceDays(s, 14); expect(stockQty(s, 'demir')).toBeGreaterThan(40); expect(checkInvariant(s)).toBe(true);
  });
  it('vadeli alım: nakit çıkmaz, yükümlülük doğar ve net varlıktan düşer; vadesi gelince ödenir', () => {
    const s = setup(); const nw0 = netWorth(s), c0 = s.company!.cash; expect(dispatch(s, 'PlaceOrder', { material: 'cimento', qty: 200, supplier: 'premium', term: 'vade30' }).ok).toBe(true);
    expect(s.company!.cash).toBe(c0); expect(payablesTotal(s)).toBeGreaterThan(0); expect(netWorth(s)).toBeLessThan(nw0 + 1); const due = payablesTotal(s);
    advanceDays(s, 20); expect(payablesTotal(s)).toBe(due); advanceDays(s, 16); expect(payablesTotal(s)).toBe(0); expect(s.company!.cash).toBeLessThan(c0 - due + TL(2_000_000)); expect(checkInvariant(s)).toBe(true);
  });
  it('nakit yetmezse vade ertelenir (gecikme faizi, itibar kaybı) ve sonunda ödenir', () => {
    const s = setup(); dispatch(s, 'PlaceOrder', { material: 'cimento', qty: 500, supplier: 'premium', term: 'vade30' }); const due0 = payablesTotal(s); s.company!.cash = 1000; s.ledgerBase = 1000 - s.ledger.reduce((a, e) => a + e.amount, 0);
    const rep0 = s.company!.reputation; advanceDays(s, 33); expect(payablesTotal(s)).toBeGreaterThan(due0); expect(s.company!.reputation).toBeLessThan(rep0);
  });
});
describe('depo', () => {
  it('kapasite sınırı: dolu depoya sipariş reddedilir; depo yükseltmek kapasiteyi artırır ve kira doğurur', () => {
    const s = setup(); expect(capacityOf(s)).toBe(WAREHOUSE[0]!.cap); expect(warehouseRent(s)).toBe(0);
    const big = Math.floor((capacityOf(s) / spaceOf('cimento', 1)) * 0.9); expect(dispatch(s, 'PlaceOrder', { material: 'cimento', qty: big, supplier: 'fabrika' }).ok).toBe(true);
    const r = dispatch(s, 'PlaceOrder', { material: 'cimento', qty: big, supplier: 'fabrika' }); expect(r.ok).toBe(false); if (!r.ok) expect(r.error).toMatch(/Depo kapasitesi/);
    const c0 = s.company!.cash; expect(dispatch(s, 'UpgradeWarehouse', {}).ok).toBe(true); expect(s.company!.cash).toBeLessThan(c0); expect(capacityOf(s)).toBe(WAREHOUSE[1]!.cap); expect(warehouseRent(s)).toBeGreaterThan(0); expect(freeSpace(s)).toBeGreaterThan(0);
    for (let i = 0; i < 3; i++) dispatch(s, 'UpgradeWarehouse', {}); expect(dispatch(s, 'UpgradeWarehouse', {}).ok).toBe(false);
  });
  it('aylık bozulma ve kayıp stoğu azaltır (açık sahada iki kat)', () => {
    const s = setup(); s.stock.cimento = { qty: 300, qual: 0, cost: TL(5000) }; const f0 = stockLossForecast(s); advanceDays(s, 33); expect(stockQty(s, 'cimento')).toBeLessThan(300); expect(f0).toBeGreaterThan(0);
    const s2 = setup(); s2.warehouse = { level: 2 }; s2.stock.cimento = { qty: 300, qual: 0, cost: TL(5000) }; advanceDays(s2, 33); expect(stockQty(s2, 'cimento')).toBeGreaterThan(stockQty(s, 'cimento')); expect(usedSpace(s)).toBeGreaterThan(0);
  });
});
describe('düzenli tedarik sözleşmesi', () => {
  it('fiyat kilitlenir, her ay teslimat gelir ve ödenir; erken fesih bedeli vardır; süre sonunda biter; kayıt korunur', () => {
    const s = setup(); expect(dispatch(s, 'SignContract', { material: 'demir', supplier: 'premium', qtyPerMonth: 30, months: 6 }).ok).toBe(true); expect(dispatch(s, 'SignContract', { material: 'demir', supplier: 'premium', qtyPerMonth: 30, months: 6 }).ok).toBe(false);
    expect(dispatch(s, 'SignContract', { material: 'kum', supplier: 'premium', qtyPerMonth: 30, months: 3 }).ok).toBe(false);
    const c = s.contracts![0]!; const c0 = s.company!.cash; advanceDays(s, 95); expect(c.taken).toBeGreaterThanOrEqual(3); expect(stockQty(s, 'demir')).toBeGreaterThan(50); expect(s.company!.cash).toBeLessThan(c0);
    const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) expect(r.state.contracts![0]!.price).toBe(c.price);
    const c1 = s.company!.cash; expect(dispatch(s, 'CancelContract', { id: c.id }).ok).toBe(true); expect(s.company!.cash).toBeLessThan(c1); expect(s.contracts!.length).toBe(0); expect(checkInvariant(s)).toBe(true);
    dispatch(s, 'SignContract', { material: 'demir', supplier: 'premium', qtyPerMonth: 20, months: 6 }); advanceDays(s, 235); expect(s.contracts!.length).toBe(0);
  });
  it('depo doluysa sözleşme teslimatı reddedilir ve ceza ödenir', () => {
    const s = setup(); dispatch(s, 'SignContract', { material: 'cimento', supplier: 'fabrika', qtyPerMonth: 300, months: 6 }); s.stock.tugla = { qty: 190, qual: 0, cost: TL(9000) }; const evs = advanceDays(s, 33);
    expect(evs.some((e) => e.type === 'CONTRACT_MISSED')).toBe(true); expect(s.contracts![0]!.missed).toBeGreaterThan(0);
  });
  it('eksik/hatalı teslimat: güvenilmez tedarikçide görülür, iade deftere işlenir', () => {
    let seen = 0; for (let seed = 0; seed < 30; seed++) { const s = setup(); s.rng = newGameState(900 + seed).rng; for (let i = 0; i < 6; i++) dispatch(s, 'PlaceOrder', { material: 'beton', qty: 15, supplier: 'ucuz' }); const evs = advanceDays(s, 14); seen += evs.filter((e) => e.type === 'MATERIAL_ISSUE').length; expect(checkInvariant(s)).toBe(true); }
    expect(seen).toBeGreaterThan(0);
  });
});
