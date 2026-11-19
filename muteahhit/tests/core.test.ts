import { describe, expect, it } from 'vitest';
import { COMMANDS, COMMAND_NAMES, dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { formatMoney, TL } from '../src/core/money';
import { dateOf } from '../src/core/calendar';
import { rand, seedStreams } from '../src/core/rng';
import { advanceDays } from '../src/sim/engine';
import { checkInvariant, compactLedger, ledgerSum, post } from '../src/sim/ledger';
import { OFFICES } from '../src/data';

function startGame(seed = 7) {
  const s = newGameState(seed);
  expect(dispatch(s, 'CreateCompany', { name: 'Test Yapı', founderBackground: 'emlakci', startCity: 'izmir' }).ok).toBe(true);
  return s;
}

describe('para', () => {
  it('biçimlendirir', () => {
    expect(formatMoney(TL(12450))).toBe('12.450 ₺');
    expect(formatMoney(TL(4_800_000))).toBe('4,8 M₺');
    expect(formatMoney(-TL(2_500_000))).toBe('−2,5 M₺');
  });
});

describe('takvim', () => {
  it('gün 0 = 1 Ocak 2027 Cuma; artık yıl doğru', () => {
    expect(dateOf(0)).toEqual({ year: 2027, month: 1, day: 1, weekday: 4 });
    expect(dateOf(365).year).toBe(2028);
    expect(dateOf(365 + 59)).toMatchObject({ month: 2, day: 29 }); // 2028 artık yıl
  });
});

describe('rng', () => {
  it('aynı tohum aynı dizi; akışlar bağımsız', () => {
    const a = seedStreams(1), b = seedStreams(1);
    expect([rand(a, 'econ'), rand(a, 'econ')]).toEqual([rand(b, 'econ'), rand(b, 'econ')]);
    const c = seedStreams(1), d = seedStreams(1);
    rand(c, 'events'); // başka akışı tüketmek econ'u etkilememeli
    expect(rand(c, 'econ')).toBe(rand(d, 'econ'));
  });
});

describe('komutlar', () => {
  it('geçersiz girdiyi reddeder, durumu değiştirmez', () => {
    const s = newGameState(1);
    expect(dispatch(s, 'HireStaff', { type: 'isci' }).ok).toBe(false);
    expect(dispatch(s, 'CreateCompany', { name: 'A', founderBackground: 'emlakci', startCity: 'izmir' }).ok).toBe(false);
    expect(s.company).toBeNull();
    expect(s.ledger).toHaveLength(0);
  });
  it('ofis kapasitesini aşan işe alımı reddeder', () => {
    const s = startGame();
    for (let i = s.staff.length; i < OFFICES[0]!.capacity; i++) expect(dispatch(s, 'HireStaff', { type: 'isci' }).ok).toBe(true);
    const r = dispatch(s, 'HireStaff', { type: 'isci' });
    expect(r.ok).toBe(false);
  });
  it('her komut validate+apply tanımlı (sahte buton koruması)', () => {
    for (const n of COMMAND_NAMES) {
      expect(typeof COMMANDS[n].validate).toBe('function');
      expect(typeof COMMANDS[n].apply).toBe('function');
    }
  });
});

describe('ekonomi / defter', () => {
  it('1 yıl: maaş + kira ayda bir, kasa = defter', () => {
    const s = startGame();
    dispatch(s, 'HireStaff', { type: 'usta' });
    const before = s.company!.cash;
    advanceDays(s, 365);
    expect(s.ledger.filter((e) => e.cat === 'kira')).toHaveLength(12);
    expect(s.ledger.filter((e) => e.cat === 'maas')).toHaveLength(12);
    expect(s.company!.cash).toBeLessThan(before);
    expect(checkInvariant(s)).toBe(true);
    expect(Object.values(s.ledger).every((e) => Number.isInteger(e.amount))).toBe(true);
  });
  it('nakit eksiye düşünce oyunu duraklatan olay üretir', () => {
    const s = startGame();
    s.company!.cash = 0; s.ledgerBase = -ledgerSum(s); // kasa 0
    const evs = advanceDays(s, 400, true);
    expect(evs.some((e) => e.type === 'CASH_NEGATIVE' && e.pause)).toBe(true);
    expect(s.clock.day).toBeLessThan(400); // durdu
  });
  it('defter sıkıştırma toplamı korur', () => {
    const s = startGame();
    for (let i = 0; i < 4; i++) dispatch(s, 'HireStaff', { type: 'isci' });
    for (let d = 0; d < 365 * 3; d++) { advanceDays(s, 1); post(s, 'satis', TL(1000 + d)); } // günlük hareketler
    const n = s.ledger.length, cash = s.company!.cash;
    compactLedger(s, s.clock.day - 100);
    expect(s.ledger.length).toBeLessThan(n);
    expect(s.company!.cash).toBe(cash);
    expect(checkInvariant(s)).toBe(true);
  });
});

describe('determinizm', () => {
  it('aynı tohum + aynı komutlar = birebir aynı oyun', () => {
    const run = () => {
      const s = startGame(99);
      for (const t of ['isci', 'usta', 'mimar']) dispatch(s, 'HireStaff', { type: t });
      advanceDays(s, 730);
      return JSON.stringify(s);
    };
    expect(run()).toBe(run());
  });
});

describe('patron geçmişi ve zorluk (gerçek etkiler)', () => {
  const make = (bg: string, diff?: string) => {
    const s = newGameState(3);
    const r = dispatch(s, 'CreateCompany', { name: 'Etki Yapı', founderBackground: bg, startCity: 'ankara', ...(diff ? { difficulty: diff } : {}) });
    expect(r.ok).toBe(true); return s;
  };
  it('her geçmiş farklı sermaye/itibar/kadro verir', () => {
    const a = make('muhendis_mirasci'), b = make('eski_kalfa'), c = make('emlakci');
    expect(a.company!.cash).toBe(TL(14_000_000)); expect(a.company!.reputation).toBe(18); expect(a.staff.map((x) => x.type)).toEqual(['muhendis']);
    expect(b.staff.map((x) => x.type)).toEqual(['usta', 'isci', 'isci']);
    expect(c.company!.cash).toBe(TL(12_000_000)); expect(c.staff[0]!.type).toBe('satis_danismani');
    for (const s of [a, b, c]) expect(checkInvariant(s)).toBe(true);
  });
  it('zorluk başlangıç sermayesini çarpar', () => {
    expect(make('emlakci', 'rahat').company!.cash).toBe(TL(12_000_000 * 1.25));
    expect(make('emlakci', 'acimasiz').company!.cash).toBe(TL(12_000_000 * 0.8));
    expect(make('emlakci', 'acimasiz').meta.difficulty).toBe('acimasiz');
  });
  it('geçersiz amblem/zorluk reddedilir', () => {
    const s = newGameState(1);
    expect(dispatch(s, 'CreateCompany', { name: 'Aa', founderBackground: 'emlakci', startCity: 'izmir', emblem: { shape: 99, color: 0 } }).ok).toBe(false);
    expect(dispatch(s, 'CreateCompany', { name: 'Aa', founderBackground: 'emlakci', startCity: 'izmir', difficulty: 'x' }).ok).toBe(false);
  });
});
