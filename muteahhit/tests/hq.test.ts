import { describe, expect, it } from 'vitest';
import { dispatch } from '../src/core/commands';
import { newGameState } from '../src/core/state';
import { TL } from '../src/core/money';
import { checkProgress } from '../src/sim/progress';
import { skyAt } from '../src/ui/hero';
import { hqRooms } from '../src/ui/hq';
import type { GameEvent } from '../src/core/types';

describe('genel merkez planı', () => {
  it('seviye başına oda planı: sahip olunmayan seviyenin odası yok, kat sayısı artar', () => {
    const r = [1, 2, 3, 4].map(hqRooms);
    expect(r.map((x) => x.length)).toEqual([2, 4, 7, 11]);
    expect(r[0]).not.toContain('yonetici'); expect(r[0]).toContain('toplanti-s');
    expect(r[1]).toContain('yonetici'); expect(r[1]).toContain('proje'); expect(r[1]).not.toContain('basari');
    expect(r[2]).toContain('toplanti-b'); expect(r[2]).toContain('basari'); expect(r[2]).not.toContain('luks');
    expect(r[3]).toContain('luks'); expect(r[3]).toContain('logo');
    expect(hqRooms(9)).toEqual(r[3]); expect(hqRooms(0)).toEqual(r[0]);
  });
  it('gökyüzü: gece/gündüz geçişi tutarlı', () => {
    expect(skyAt(2).night).toBe(1); expect(skyAt(12).night).toBe(0); expect(skyAt(12).isDay).toBe(true); expect(skyAt(23).isDay).toBe(false);
    expect(skyAt(20).night).toBeGreaterThan(0); expect(skyAt(20).night).toBeLessThan(1);
  });
});

describe('başarım tekrarsız açılır', () => {
  it('aynı başarım iki kez ACHIEVEMENT üretmez; yeni şehir/ilk büyük kâr tanımlı', () => {
    const s = newGameState(5); dispatch(s, 'CreateCompany', { name: 'A Yapı', founderBackground: 'emlakci', startCity: 'ankara' });
    s.company!.stats.profit = TL(12_000_000);
    const e1: GameEvent[] = []; checkProgress(s, e1, false, true);
    const ids = e1.filter((e) => e.type === 'ACHIEVEMENT').map((e) => e.data!.id);
    expect(ids).toContain('a_kar10');
    const e2: GameEvent[] = []; checkProgress(s, e2, false, true);
    expect(e2.filter((e) => e.type === 'ACHIEVEMENT').length).toBe(0);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
