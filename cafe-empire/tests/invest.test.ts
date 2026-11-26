import { describe, expect, it } from 'vitest';
import { invest, newGame } from '../src/core/actions';
import { step } from '../src/core/sim';
import { capacityAt } from '../src/core/hr';
import { investCost, maintenanceDaily } from '../src/core/invest';
import { deserialize, serialize } from '../src/core/save';

const mk = () => newGame({ ad: 'T', sehir: 26, tip: 'cadde', seed: 3, kasa: 5e6 }).s;
describe('işletme geliştirme', () => {
  it('yatırım parayı düşer, seviyeyi artırır ve maliyet katlanır', () => { const s = mk(); const b = s.subeler[0]!; const k = s.kasa, c1 = investCost(s, b, 'espresso'); expect(invest(s, b, 'espresso').ok).toBe(true); expect(s.kasa).toBe(k - c1); expect(b.yat.espresso).toBe(1); expect(investCost(s, b, 'espresso')).toBeGreaterThan(c1 * 1.5); });
  it('espresso makinesi servis kapasitesini artırır', () => { const s = mk(); const b = s.subeler[0]!; const a = capacityAt(s, b, 11, 2, 1); invest(s, b, 'espresso'); expect(capacityAt(s, b, 11, 2, 1)).toBeGreaterThan(a * 1.07); });
  it('enerji yatırımı elektrik giderini düşürür; bakım gideri oluşur', () => { const a = mk(), b = mk(); b.marka_puani = 60; expect(invest(b, b.subeler[0]!, 'enerji').ok).toBe(true); invest(b, b.subeler[0]!, 'espresso'); for (let i = 0; i < 3; i++) { step(a, 1440); step(b, 1440); } expect(b.rapor.at(-1)!.gider.elektrik).toBeLessThan(a.rapor.at(-1)!.gider.elektrik); expect(maintenanceDaily(b.subeler[0]!)).toBeGreaterThan(0); });
  it('kasa yetmezse yatırım yapılamaz; seviye sınırı vardır', () => { const s = mk(); const b = s.subeler[0]!; s.kasa = 10; expect(invest(s, b, 'espresso').ok).toBe(false); s.kasa = 9e7; for (let i = 0; i < 5; i++) invest(s, b, 'degirmen'); expect(b.yat.degirmen).toBe(2); });
  it('eski kayıt (yeni alanlar yok) yüklenince tamamlanır ve oynanır', () => { const s = mk(); const o = JSON.parse(serialize(s)); delete o.subeler[0].yat; delete o.subeler[0].partiler; delete o.subeler[0].mus; delete o.capexBugun; const y = deserialize(JSON.stringify(o)); for (let i = 0; i < 5; i++) step(y, 1440); expect(y.rapor.length).toBeGreaterThan(3); });
});
import { marketShare, rivalFiyat } from '../src/core/sim';
describe('rakipler', () => {
  it('pazar payı toplamı 1; kampanya etkin fiyatı düşürür; rakipler davranışsal değişir', () => {
    const s = mk(); const r0 = s.rakipler[26]![0]!; const ms = marketShare(s, 26); expect(ms.sen + ms.rakipler.reduce((a, x) => a + x.pay, 0)).toBeCloseTo(1, 6);
    r0.kampanya = { bit: 999, indirim: 0.15 }; expect(rivalFiyat(s, r0)).toBeCloseTo(r0.fiyat * 0.85, 6);
    const s2 = newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed: 11, kasa: 5e6 }).s; let kamp = 0; for (let i = 0; i < 120; i++) { step(s2, 1440); kamp += s2.rakipler[34]!.filter((r) => r.kampanya).length > 0 ? 1 : 0; } expect(kamp).toBeGreaterThan(3); expect(s2.rakipler[34]!.every((r) => !!r.strateji)).toBe(true);
  });
});
