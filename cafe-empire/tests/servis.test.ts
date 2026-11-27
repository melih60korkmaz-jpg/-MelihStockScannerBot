import { describe, it, expect } from 'vitest';
import { newGame, subeAc } from '../src/core/actions';
import { servisHazirMi, servisOdul, servisParasi, yildizOf } from '../src/core/servis';
import { step } from '../src/core/sim';

describe('Yoğun Saat ödülü', () => {
  const kur = () => { const { s } = newGame({ ad: 'T', sehir: 34, tip: 'cadde' }); return s; };
  it('şubesiz hazır değil, şubeyle hazır', () => { const s = newGame({ ad: 'T', sehir: 34, tip: 'cadde', bos: true }).s; expect(servisHazirMi(s)).toBe(false); expect(servisHazirMi(kur())).toBe(true); void subeAc; });
  it('günde bir kez ödül verir, para ve itibar artar', () => {
    const s = kur(), k0 = s.kasa, m0 = s.subeler[0]!.marka, r = servisOdul(s, 300)!;
    expect(r.para).toBe(servisParasi(s, 300)); expect(s.kasa).toBe(k0 + r.para); expect(s.subeler[0]!.marka).toBeGreaterThanOrEqual(m0); expect(servisOdul(s, 300)).toBeNull();
  });
  it('ödül tavanlı, yıldız eşikleri doğru', () => { const s = kur(); expect(servisParasi(s, 99999)).toBe(servisParasi(s, 700)); expect([0, 80, 220, 420].map(yildizOf)).toEqual([0, 1, 2, 3]); });
  it('ertesi gün yeniden hazır olur', () => { const s = kur(); servisOdul(s, 100); expect(servisHazirMi(s)).toBe(false); for (let i = 0; i < 150; i++) step(s, 10); expect(servisHazirMi(s)).toBe(true); });
});
