import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL, formatMoney } from '../src/core/money';
import { advanceDays } from '../src/sim/engine';
import { alerts, monthlyRows, projectedMonthlyCost, runwayMonths } from '../src/sim/finance';
import { checkInvariant, post } from '../src/sim/ledger';
import { REGIMES } from '../src/sim/macro';
import { pack, unpack } from '../src/save/serialize';
import { formatDate } from '../src/core/calendar';

const start = (seed = 11, bg = 'emlakci') => {
  const s = newGameState(seed);
  expect(dispatch(s, 'CreateCompany', { name: 'Eko Yapı', founderBackground: bg, startCity: 'izmir' }).ok).toBe(true);
  return s;
};

describe('makro ekonomi', () => {
  it('20 yıl, 60 tohum: sınırlar içinde, sonlu, her kriz öncesi uyarı rejimi', () => {
    let crises = 0, warned = 0;
    for (let i = 0; i < 60; i++) {
      const s = start(500 + i); s.company!.cash = 1e14; s.ledgerBase = 1e14 - s.ledger.reduce((a, e) => a + e.amount, 0);
      let prev = s.macro.regime;
      for (let d = 0; d < 365 * 20; d++) {
        advanceDays(s, 1);
        const m = s.macro;
        if (m.regime === 'kriz' && prev !== 'kriz') { crises++; if (prev === 'asiri_isinma' || prev === 'daralma') warned++; }
        prev = m.regime;
      }
      const m = s.macro;
      for (const v of [m.policyRate, m.inflation, m.confidence, m.materialIndex]) expect(Number.isFinite(v)).toBe(true);
      expect(m.policyRate).toBeGreaterThanOrEqual(8); expect(m.policyRate).toBeLessThanOrEqual(70);
      expect(m.inflation).toBeGreaterThanOrEqual(3); expect(m.inflation).toBeLessThanOrEqual(85);
      expect(m.confidence).toBeGreaterThanOrEqual(0); expect(m.confidence).toBeLessThanOrEqual(100);
      expect(s.macroHistory.length).toBeLessThanOrEqual(240);
      expect(checkInvariant(s)).toBe(true);
    }
    expect(warned).toBe(crises);           // kriz asla "ipucusuz" gelmez
    expect(crises).toBeGreaterThan(10);    // ama gerçekten yaşanır
  });
  it('korumalı başlangıçta (zorluğa göre) kriz/daralma yok', () => {
    for (let i = 0; i < 40; i++) {
      const s = newGameState(900 + i, 'gercekci'); dispatch(s, 'CreateCompany', { name: 'Kor Yapı', founderBackground: 'emlakci', startCity: 'izmir', difficulty: 'gercekci' });
      s.company!.cash = 1e14; s.ledgerBase = 1e14 - s.ledger.reduce((a, e) => a + e.amount, 0);
      advanceDays(s, 19 * 30);
      expect(['normal']).toContain(s.macro.regime);
    }
  });
  it('rejim → faiz/enflasyon eğilimi: kriz > normal', () => {
    expect(REGIMES.kriz.rate).toBeGreaterThan(REGIMES.normal.rate);
    expect(REGIMES.kriz.infl).toBeGreaterThan(REGIMES.genisleme.infl);
  });
  it('aynı tohum aynı makro yolu', () => {
    const run = () => { const s = start(77); advanceDays(s, 365 * 8); return JSON.stringify([s.macro, s.macroHistory, s.news]); };
    expect(run()).toBe(run());
  });
});

describe('giderler ve enflasyon', () => {
  it('beklenen aylık gider = ayın 1\'inde ödenen toplam', () => {
    const s = start(); dispatch(s, 'HireStaff', { type: 'usta' });
    advanceDays(s, 31); // 1 Şubat → ilk gider günü (Ocak 1'den başlandı, gün 31 = 1 Şubat)
    const rows = monthlyRows(s);
    const feb = rows.find((r) => r.key === '2027-02')!;
    // gider günü öncesi hesaplanan tutar, enflasyon endeksi güncellendikten sonra değişebilir; 1 aylık fark %2'yi aşmamalı
    expect(feb.expense).toBeGreaterThan(0);
    expect(Math.abs(projectedMonthlyCost(s) - feb.expense) / feb.expense).toBeLessThan(0.02);
  });
  it('yıllık maaş artışı enflasyona bağlı; sabit giderler endeksle artar', () => {
    const s = start(); dispatch(s, 'HireStaff', { type: 'isci' });
    const w0 = s.staff[0]!.salary; advanceDays(s, 365);
    expect(s.staff[0]!.salary).toBeGreaterThan(w0 * 1.05);
    expect(s.costIndex).toBeGreaterThan(1.05);
  });
  it('bilinmeyen kategoriyle para hareketi reddedilir', () => {
    const s = start(); expect(() => post(s, 'yazimhatasi', 100)).toThrow();
  });
});

describe('vergi', () => {
  it('çeyrek kârı üzerinden %25, zarar devri mahsup eder', () => {
    const s = start(); s.staff.length = 0; // gider minimum
    post(s, 'satis', TL(10_000_000));                   // Ocak: büyük gelir
    advanceDays(s, 90);                                   // 1 Nisan civarı: ilk çeyrek vergisi
    const tax1 = -s.ledger.filter((e) => e.cat === 'vergi').reduce((a, e) => a + e.amount, 0);
    const expense1 = -s.ledger.filter((e) => ['kira', 'ofis', 'sigorta', 'maas'].includes(e.cat) && e.day < 90).reduce((a, e) => a + e.amount, 0);
    expect(tax1).toBeGreaterThan(0);
    expect(Math.abs(tax1 - Math.round((TL(10_000_000) - expense1) * 0.25))).toBeLessThanOrEqual(TL(30_000)); // bir ay gider farkı toleransı
    expect(checkInvariant(s)).toBe(true);
  });
  it('zararlı dönemde vergi yok, zarar devreder', () => {
    const s = start(); advanceDays(s, 100);
    expect(s.ledger.some((e) => e.cat === 'vergi')).toBe(false);
    expect(s.taxLossCarry).toBeGreaterThan(0);
  });
  it('sermaye, yatırım ve finansman vergi matrahına girmez', () => {
    const s = start(); s.staff.length = 0;
    post(s, 'arsa', TL(-5_000_000)); post(s, 'kredi_cekim', TL(8_000_000)); advanceDays(s, 95);
    expect(s.ledger.some((e) => e.cat === 'vergi')).toBe(false);
  });
});

describe('finans tabloları', () => {
  it('aylık satırlar: nakit akışı toplamı = kasa değişimi; son ay bakiyesi = kasa', () => {
    const s = start(5); dispatch(s, 'HireStaff', { type: 'mimar' });
    post(s, 'satis', TL(3_000_000)); advanceDays(s, 200); post(s, 'arsa', TL(-1_000_000));
    const rows = monthlyRows(s);
    expect(rows.at(-1)!.endCash).toBe(s.company!.cash);
    for (const r of rows) expect(r.net).toBe(r.income - r.expense - r.tax);
    const sum = rows.reduce((a, r) => a + r.operating + r.investing + r.financing + r.capital, 0);
    expect(s.ledgerBase + sum).toBe(s.company!.cash);
  });
  it('defter sıkıştırılsa da tablolar aynı kalır', async () => {
    const { compactLedger } = await import('../src/sim/ledger');
    const s = start(8); for (let i = 0; i < 3; i++) dispatch(s, 'HireStaff', { type: 'isci' });
    for (let d = 0; d < 400; d++) { advanceDays(s, 1); if (d % 5 === 0) post(s, 'satis', TL(10_000 + d)); }
    const before = monthlyRows(s).map((r) => [r.key, r.income, r.expense, r.endCash]);
    compactLedger(s, s.clock.day - 60);
    const after = monthlyRows(s).map((r) => [r.key, r.income, r.expense, r.endCash]);
    expect(after).toEqual(before);
  });
  it('nakit yeterlilik süresi: gelirsiz kasa/gider, gelir giderleri aşarsa sınırsız', () => {
    const s = start(); const rw = runwayMonths(s)!; expect(rw).toBeCloseTo(s.company!.cash / projectedMonthlyCost(s), 5);
    for (let m = 0; m < 4; m++) { post(s, 'satis', projectedMonthlyCost(s) * 3); advanceDays(s, 31); }
    expect(runwayMonths(s)).toBeNull();
  });
  it('uyarılar: kasa eksi → kırmızı, kriz rejimi → uyarı', () => {
    const s = start(); s.company!.cash = -TL(1000); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0);
    s.macro.regime = 'kriz';
    const a = alerts(s, formatMoney, formatDate);
    expect(a[0]!.tone).toBe('bad'); expect(a.some((x) => x.text.includes('kriz'))).toBe(true);
  });
});

describe('kayıt göçü', () => {
  it('v1 kaydı v3\'e (zincirleme) taşınır ve oynanabilir', () => {
    const s = start(); advanceDays(s, 40);
    // v1 biçimine indir
    const old: any = JSON.parse(JSON.stringify(s)); old.meta.version = 1;
    for (const k of ['macro', 'macroHistory', 'news', 'history', 'costIndex', 'taxLossCarry']) delete old[k];
    const r = unpack(pack(old));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.migrated).toBe(true); expect(r.state.meta.version).toBe(3); expect(r.state.parcels.length).toBeGreaterThan(0); advanceDays(r.state, 120); expect(checkInvariant(r.state)).toBe(true); expect(r.state.macroHistory.length).toBeGreaterThan(0); }
  });
});

describe('para biçimi', () => {
  it('trilyon', () => { expect(formatMoney(TL(3.4e12))).toBe('3,4 Tr₺'); });
});

describe('uzun oyun', () => {
  it('15 yıl: defter sınırlı kalır, tutarlılık korunur, tablolar sürer', () => {
    const s = start(21); for (let i = 0; i < 4; i++) dispatch(s, 'HireStaff', { type: 'isci' });
    s.company!.cash = TL(5e9); s.ledgerBase = s.company!.cash - s.ledger.reduce((a, e) => a + e.amount, 0);
    for (let d = 0; d < 365 * 15; d++) { advanceDays(s, 1); if (d % 7 === 0) post(s, 'satis', TL(50_000)); }
    expect(s.ledger.length).toBeLessThan(2500);
    expect(checkInvariant(s)).toBe(true);
    expect(monthlyRows(s).at(-1)!.endCash).toBe(s.company!.cash);
    expect(JSON.stringify(s).length).toBeLessThan(900_000); // kayıt boyutu makul
  });
});
