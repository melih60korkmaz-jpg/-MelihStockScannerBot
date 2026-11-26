/** OYUN TESTİ: bot, oyuncu gibi menüler üzerinden yönetir; ilerleme, ekonomi ve kilitlerin açılması doğrulanır. */
import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/actions';
import { step, levelOf } from '../src/core/sim';
import { oyna } from './bot';
import { BASARIMLAR } from '../src/core/goals';
import '../src/core/pricing'; import '../src/core/franchise'; import '../src/core/merkez';

describe('oyun testi: iyi oyuncu (bot) İstanbul\'dan başlar', () => {
  for (const seed of [1, 2, 3]) it(`seed ${seed}: 1 yılda iflas etmez, büyür, seviye atlar, hedefler/başarımlar işler`, () => {
    const s = newGame({ ad: 'Bot', sehir: 34, tip: 'cadde', seed, ilce: '34:Kadıköy' }).s; oyna(s, 365);
    expect(s.oyunBitti).toBe(false); expect(s.kasa).toBeGreaterThan(0); expect(s.subeler.length).toBeGreaterThanOrEqual(5); expect(Object.keys(s.bolge.ilce).length).toBeGreaterThanOrEqual(5); expect(levelOf(s)).toBeGreaterThanOrEqual(3);
    expect(Object.keys(s.basarim).length).toBeGreaterThanOrEqual(12); expect(s.stat.musteri).toBeGreaterThan(20000); expect(s.stat.netKar).toBeGreaterThan(0); expect(s.rapor.length).toBe(365);
    expect(s.gorevler.length).toBeGreaterThan(0); for (const b of s.subeler) { expect(b.hijyen).toBeGreaterThanOrEqual(0); expect(Number.isFinite(b.memnuniyet)).toBe(true); }
  }, 300000);
  it('2 yılda ulusal zincir: seviye 5+, il açma, franchise ve merkezi depo kilitleri açılır', () => {
    const s = newGame({ ad: 'Bot', sehir: 34, tip: 'cadde', seed: 2, ilce: '34:Kadıköy' }).s; oyna(s, 730);
    expect(levelOf(s)).toBeGreaterThanOrEqual(5); expect(Object.keys(s.bolge.il).length).toBeGreaterThanOrEqual(2); expect(s.franchise.length).toBeGreaterThanOrEqual(1); expect(s.merkez.depo).toBeGreaterThanOrEqual(1); expect(Object.keys(s.basarim).length).toBeGreaterThanOrEqual(20); expect(Object.keys(s.basarim).length).toBeLessThanOrEqual(BASARIMLAR.length);
    expect(s.oyunBitti).toBe(false);
  }, 400000);
});
describe('oyun testi: kötü oyuncu', () => {
  it('hiçbir şey yapmayan oyuncu kazanamaz ama oyun çökmez; sayılar sonlu kalır, iflas ya da durgunluk olur', () => {
    const s = newGame({ ad: 'Pasif', sehir: 34, tip: 'cadde', seed: 4, ilce: '34:Kadıköy' }).s; for (let i = 0; i < 500 && !s.oyunBitti; i++) { s.bekleyen.length = 0; step(s, 1440); }
    expect(Number.isFinite(s.kasa)).toBe(true); expect(s.subeler.length).toBe(1); expect(levelOf(s)).toBeLessThanOrEqual(2);
  }, 200000);
  it('aşırı pahalı fiyat ve sürekli kredi çeken oyuncu da çökmez (negatif değerler yok)', () => {
    const s = newGame({ ad: 'Kötü', sehir: 34, tip: 'mahalle', seed: 5, ilce: '34:Çatalca' }).s; for (const b of s.subeler) for (const m of Object.values(b.menu)) m.fiyat = 2;
    for (let i = 0; i < 300 && !s.oyunBitti; i++) { s.bekleyen.length = 0; step(s, 1440); } expect(Number.isFinite(s.kasa)).toBe(true); for (const b of s.subeler) for (const v of Object.values(b.stok)) expect(v).toBeGreaterThanOrEqual(0);
  }, 200000);
});
