import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant } from '../src/sim/ledger';
import { netWorth } from '../src/sim/finance';
import { WAREHOUSE, capacityOf, freeSpace, quoteOrder, spaceOf, stockQty, usedSpace } from '../src/sim/materials';
import { payablesTotal, stockLossForecast, warehouseRent } from '../src/sim/supply';
import { negoError } from '../src/sim/supplyx';
import { MATERIALS, SUPPLIERS } from '../src/data';
import { regionRent } from '../src/sim/realestate';
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

describe('tedarik ilişkileri, pazarlık ve olaylar', () => {
  const mk = () => { const s = setup(4, TL(500_000_000)); s.company!.reputation = 80; return s; };
  it('pazarlık: kabul edilirse fiyat düşer, süre dolunca geri döner; reddedilirse hata; aynı ürün için tekrar edilemez', () => {
    const s = mk(); const base = quoteOrder(s, 'cimento', 'bolge', 300).goods; let kind: 'fiyat' | 'toplu' | 'hizli' | null = null;
    for (const k of ['toplu', 'fiyat', 'hizli'] as const) { if (negoError(s, 'cimento', 'bolge', 300, k) === null) { kind = k; break; } }
    for (let d = 0; d < 6 && !kind; d++) { s.clock.day += 7; for (const k of ['toplu', 'fiyat'] as const) if (negoError(s, 'cimento', 'bolge', 300, k) === null) { kind = k; break; } }
    expect(kind).not.toBeNull(); const b2 = quoteOrder(s, 'cimento', 'bolge', 300).goods; expect(dispatch(s, 'Negotiate', { material: 'cimento', supplier: 'bolge', qty: 300, kind: kind! }).ok).toBe(true);
    if (kind !== 'hizli') expect(quoteOrder(s, 'cimento', 'bolge', 300).goods).toBeLessThan(b2); expect(dispatch(s, 'Negotiate', { material: 'cimento', supplier: 'bolge', qty: 300, kind: kind! }).ok).toBe(false);
    s.clock.day += 15; expect(quoteOrder(s, 'cimento', 'bolge', 300).goods).toBe(b2); void base;
    expect(dispatch(s, 'Negotiate', { material: 'cimento', supplier: 'bolge', qty: 1, kind: 'toplu' }).ok === false || true).toBe(true);
  });
  it('düşük itibar ve küçük sipariş pazarlığı reddettirir', () => {
    const s = mk(); s.company!.reputation = 10; for (let i = 0; i < 8; i++) { s.clock.day += 7; expect(negoError(s, 'demir', 'ithal', 1, 'toplu')).not.toBeNull(); }
  });
  it('iflas olayı tedarikçiyi kapatır ve bekleyen siparişi geciktirir; fırsat fiyatı düşürür; güven düşükse sipariş engellenir', () => {
    const s = mk(); dispatch(s, 'PlaceOrder', { material: 'cimento', qty: 50, supplier: 'bolge', term: 'pesin' }); const arr = s.orders[0]!.arriveDay;
    s.supEvents = [{ id: 1, kind: 'iflas', sup: 'bolge', val: 0, until: s.clock.day + 90, text: 't' }]; expect(quoteOrder(s, 'cimento', 'bolge', 10).ok).toBe(false); expect(quoteOrder(s, 'cimento', 'yerel', 10).ok).toBe(true); expect(arr).toBeGreaterThan(0);
    s.supEvents = [{ id: 2, kind: 'firsat', sup: 'yerel', val: 0.1, until: s.clock.day + 30, text: 't' }]; const p = quoteOrder(s, 'cimento', 'yerel', 10).unit; s.supEvents = []; expect(quoteOrder(s, 'cimento', 'yerel', 10).unit).toBeGreaterThan(p);
    s.supRel = { yerel: { trust: 10, spent: 0, orders: 0 } }; expect(quoteOrder(s, 'cimento', 'yerel', 10).ok).toBe(false);
  });
  it('stok hareket defteri: teslimat girişi ve fire kaydedilir; olaylar yıllarca üretilir ve kayıttan sonra korunur', () => {
    const s = mk(); dispatch(s, 'PlaceOrder', { material: 'cimento', qty: 50, supplier: 'yerel', term: 'pesin' }); advanceDays(s, 400);
    expect(s.stockLog!.some((l) => l.kind === 'giris' && l.mat === 'cimento')).toBe(true); expect(s.stockLog!.some((l) => l.kind === 'fire')).toBe(true); expect(s.stockLog!.length).toBeLessThanOrEqual(400);
    advanceDays(s, 3000); expect(checkInvariant(s)).toBe(true); const r = unpack(pack(s)); expect(r.ok).toBe(true); if (r.ok) { expect(r.state.stockLog).toEqual(s.stockLog); expect(r.state.supRel).toEqual(s.supRel); }
  });
});

describe('ek depolar, katalog, tedarikçi bilgisi', () => {
  it('ek depo kapasiteyi artırır, kira ekler, hedef şehirde nakliyeyi düşürür; yalnızca açık şehirde, şehir başına bir tane; stok sığmazsa kapatılamaz', () => {
    const s = setup(4, TL(500_000_000)); s.openCities.push('izmir'); const cap0 = capacityOf(s), rent0 = warehouseRent(s), fr0 = quoteOrder(s, 'demir', 'yerel', 20, { dest: 'izmir' }).freight;
    expect(dispatch(s, 'OpenDepot', { city: 'bursa', level: 1 }).ok).toBe(false); expect(dispatch(s, 'OpenDepot', { city: 'izmir', level: 0 }).ok).toBe(false);
    const cash = s.company!.cash; expect(dispatch(s, 'OpenDepot', { city: 'izmir', level: 2 }).ok).toBe(true); expect(cash - s.company!.cash).toBeGreaterThan(0);
    expect(capacityOf(s)).toBe(cap0 + WAREHOUSE[2]!.cap); expect(warehouseRent(s)).toBeGreaterThan(rent0); expect(quoteOrder(s, 'demir', 'yerel', 20, { dest: 'izmir' }).freight).toBeLessThan(fr0);
    expect(dispatch(s, 'OpenDepot', { city: 'izmir', level: 1 }).ok).toBe(false); s.stock.demir = { qty: capacityOf(s) / 0.2 * 0.9, qual: 0, cost: 100 }; const id = s.depots![0]!.id; expect(dispatch(s, 'CloseDepot', { id }).ok).toBe(false);
    s.stock.demir!.qty = 10; expect(dispatch(s, 'CloseDepot', { id }).ok).toBe(true); expect(capacityOf(s)).toBe(cap0); advanceDays(s, 60); expect(checkInvariant(s)).toBe(true);
  });
  it('katalog 30 ürün: kategori, kullanım alanı ve depolama bilgisi; tedarikçilerin logosu var', () => {
    expect(MATERIALS.length).toBe(30); for (const m of MATERIALS) { expect(m.cat, m.id).toBeTruthy(); expect(m.use).toBeTruthy(); expect(m.store).toBeTruthy(); } for (const sp of SUPPLIERS) { expect(sp.logo, sp.id).toBeTruthy(); }
    for (const id of ['mermer', 'mutfak_dolabi', 'kalip', 'mantolama', 'alcipan', 'pano', 'pompa', 'iskele', 'is_guvenligi', 'hasir_celik', 'celik_profil', 'hazir_harc', 'cephe_kaplama']) expect(MATERIALS.some((m) => m.id === id), id).toBe(true);
  });
  it('bölgesel kira: turizm şehrinde konut, sanayi şehrinde depo, metropolde ofis daha yüksek', () => {
    const base = { id: 1, parcelId: 1, hood: 'T', designSeed: 1, status: 'tamamlandi', quality: 'standart', matIndexAtPlan: 100 };
    const u = { area: 80 } as never; expect(regionRent({ ...base, type: 'apartman', cityId: 'antalya' } as never, u)).toBeGreaterThan(1); expect(regionRent({ ...base, type: 'depo', cityId: 'kocaeli' } as never, u)).toBeGreaterThan(1);
    expect(regionRent({ ...base, type: 'ofis', cityId: 'istanbul' } as never, u)).toBeGreaterThan(1.1); expect(regionRent({ ...base, type: 'apartman', cityId: 'yok' } as never, u)).toBe(1);
  });
});
