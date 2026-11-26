import { describe, expect, it } from 'vitest';
import { newGame, subeAc } from '../src/core/actions';
import { step, dailyDemand, dayOf } from '../src/core/sim';
import { grantRegion } from '../src/core/region';
import { ilSekmeleri, turistPaketi, kampusAnlasma, kurumsalSozlesme, kurumsalIptal, kurumsalGunluk, SEKME_AD } from '../src/core/ilprog';
import { CITIES } from '../src/data/turkey';
import { NAV, GRUPLAR } from '../src/ui/panels';

const mk = (sehir: number, tip: 'cadde' | 'mahalle' = 'cadde') => { const s = newGame({ ad: 'T', sehir, tip, seed: 3, kasa: 5e7 }).s; s.marka_puani = 30; return s; };
const run = (s: ReturnType<typeof mk>, g: number) => { for (let i = 0; i < g; i++) step(s, 1440); };
describe('il sekmeleri', () => {
  it('her ilde özet+rakip vardır; iller farklı sekme kümeleri alır (en az 4 farklı küme)', () => {
    const kume = new Set<string>(); for (const c of CITIES) { const s = ilSekmeleri(c.id); expect(s[0]).toBe('ozet'); expect(s[s.length - 1]).toBe('rakip'); kume.add(s.join()); }
    expect(kume.size).toBeGreaterThanOrEqual(4); expect(ilSekmeleri(34)).toEqual(expect.arrayContaining(['turizm', 'kampus', 'kurumsal'])); expect(ilSekmeleri(7)).toContain('turizm'); expect(ilSekmeleri(26)).toContain('kampus'); expect(ilSekmeleri(41)).toContain('kurumsal');
    expect(Object.keys(SEKME_AD).length).toBe(5);
  });
  it('menüde İller sayfası Büyüme grubunda; rakipler sekmesi iller içinde', () => { expect(NAV.some((n) => n[0] === 'iller')).toBe(true); expect(GRUPLAR.find((g) => g.id === 'yatirim')!.tabs).toContain('iller'); expect(NAV.some((n) => n[0] === 'rakip')).toBe(false); });
});
describe('ile özel eylemler', () => {
  it('turist paketi: yalnız turistik ilde ve şubesi varsa; talebi +%15 yapar; 30 gün sonra biter; üst üste alınmaz', () => {
    const s = mk(34); const b = s.subeler[0]!; const d0 = dailyDemand(s, b), k0 = s.kasa; expect(turistPaketi(s, 34).ok).toBe(true); expect(s.kasa).toBeLessThan(k0); expect(dailyDemand(s, b)).toBeGreaterThan(d0 * 1.15); expect(dailyDemand(s, b)).toBeLessThan(d0 * 1.2); expect(turistPaketi(s, 34).ok).toBe(false);
    run(s, 31); const g = dayOf(s); expect(s.market.mod['turist_34']?.bit ?? 0).toBeLessThanOrEqual(g);
    const t = mk(60); grantRegion(t, 60); expect(turistPaketi(t, 60).ok).toBe(ilSekmeleri(60).includes('turizm')); const x = mk(34); expect(turistPaketi(x, 6).ok).toBe(false);
  });
  it('kampüs anlaşması: öğrenci ilinde talebi +%10 yapar', () => { const s = mk(26); const b = s.subeler[0]!; const d0 = dailyDemand(s, b); expect(kampusAnlasma(s, 26).ok).toBe(true); expect(dailyDemand(s, b)).toBeCloseTo(d0 * 1.1, 4); expect(kampusAnlasma(s, 26).ok).toBe(false); });
  it('kurumsal sözleşme: günlük toplu ciro ve %38 maliyet; memnuniyet düşünce iptal; bitirilebilir', () => {
    const s = mk(41); expect(ilSekmeleri(41)).toContain('kurumsal'); const b = s.subeler[0]!; b.memnuniyet = 80; expect(kurumsalSozlesme(s, 41).ok).toBe(true); const gunluk = s.ilprog[41]!.kurumsal!.gunluk; expect(gunluk).toBe(kurumsalGunluk(s, 41)); run(s, 3);
    const r = s.rapor.at(-1)!; expect(r.gelir.toplu).toBeGreaterThanOrEqual(gunluk * 0.99); expect(r.gider.malzeme).toBeGreaterThan(gunluk * 0.38 * 0.99); b.memnuniyet = 20; run(s, 2); expect(s.ilprog[41]!.kurumsal).toBeUndefined();
    const t = mk(41); t.subeler[0]!.memnuniyet = 40; expect(kurumsalSozlesme(t, 41).ok).toBe(false); t.subeler[0]!.memnuniyet = 70; kurumsalSozlesme(t, 41); expect(kurumsalIptal(t, 41).ok).toBe(true);
  });
  it('şubesi olmayan ilde eylem yapılamaz; kapalı ilde de', () => { const s = mk(34); grantRegion(s, 41); expect(kurumsalSozlesme(s, 41).ok).toBe(false); expect(kurumsalSozlesme(s, 6).ok).toBe(false); subeAc(s, 41, 'cadde'); s.subeler.at(-1)!.memnuniyet = 80; expect(kurumsalSozlesme(s, 41).ok).toBe(true); });
});
