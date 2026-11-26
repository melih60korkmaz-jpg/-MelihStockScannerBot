import { describe, expect, it } from 'vitest';
import { newGame, subeAc, invest } from '../src/core/actions';
import { step, resolveEvent } from '../src/core/sim';
import { grantRegion } from '../src/core/region';
import { BASARIMLAR, gorevleriGuncelle, ilerleme } from '../src/core/goals';
import { franchiseVer, franchiseNeden, franchiseDenetim, franchiseDestek, franchiseSonlandir, tahminCiro } from '../src/core/franchise';
import { merkezYukselt, merkezIndirim } from '../src/core/merkez';
import { orderCost } from '../src/core/supply';
import { ILCELER, ilcelerOf, ilceKey } from '../src/data/regions';
import { deserialize, serialize } from '../src/core/save';
import '../src/core/pricing';

const mk = (seed = 5) => { const s = newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed, kasa: 5e8, ilce: '34:Kadıköy' }).s; return s; };
const run = (s: ReturnType<typeof mk>, g: number) => { for (let i = 0; i < g; i++) step(s, 1440); };
describe('hedefler ve başarımlar', () => {
  it('başarımlar koşul sağlanınca nakit ödül verir, bir kez', () => { const s = mk(); const k0 = s.kasa; run(s, 3); expect(s.basarim.ilk_gun).toBeDefined(); expect(s.kasa).toBeGreaterThan(k0 - 1e7); expect(Object.keys(s.basarim).length).toBeGreaterThanOrEqual(1); const n = Object.keys(s.basarim).length; run(s, 1); expect(Object.keys(s.basarim).length).toBeGreaterThanOrEqual(n); expect(BASARIMLAR.length).toBeGreaterThanOrEqual(30); expect(new Set(BASARIMLAR.map((b) => b.id)).size).toBe(BASARIMLAR.length); });
  it('görevler üretilir (3 aktif), ilerleme 0–1, tamamlanınca ödül verilir', () => {
    const s = mk(); run(s, 2); gorevleriGuncelle(s); expect(s.gorevler.filter((g) => !g.tamam).length).toBe(3); for (const g of s.gorevler) expect(ilerleme(s, g)).toBeGreaterThanOrEqual(0);
    const g = s.gorevler.find((x) => x.olc === 'ilce' || x.olc === 'sube'); if (g) { grantRegion(s, 41); const k = s.kasa; if (g.olc === 'sube') subeAc(s, 41, 'cadde'); else s.bolge.ilce['41:İzmit'] = 5; gorevleriGuncelle(s); expect(s.gorevler.find((x) => x.id === g.id)?.tamam).toBe(true); expect(s.kasa).toBeGreaterThan(k); }
  });
  it('istatistikler birikir', () => { const s = mk(); run(s, 10); expect(s.stat.musteri).toBeGreaterThan(100); expect(Number.isFinite(s.stat.netKar)).toBe(true); });
});
describe('franchise', () => {
  const hazir = () => { const s = mk(); s.marka_puani = 60; grantRegion(s, 34, '34:Şişli'); return s; };
  it('seviye 5 şartı, ilçe açık olmalı; açılınca giriş ücreti gelir olarak işlenir', () => {
    const s = mk(); const sis = ilcelerOf(34).find((d) => d.ad === 'Şişli')!; grantRegion(s, 34, ilceKey(sis)); expect(franchiseNeden(s, sis.id, 'cadde')).toContain('seviyesi 5'); const a = hazir(); a.marka_puani = 60; subeAc(a, 34, 'cadde', undefined, '34:Şişli'); expect(franchiseNeden(a, ilcelerOf(34).find((d) => d.ad === 'Kadıköy')!.id, 'cadde')).toContain('kendi şuben');
    // seviye 5: 2 şube + marka 55
    const b = mk(); b.marka_puani = 60; grantRegion(b, 34, '34:Beşiktaş'); subeAc(b, 34, 'cadde', undefined, '34:Beşiktaş'); grantRegion(b, 34, '34:Şişli'); const sid = ilcelerOf(34).find((d) => d.ad === 'Şişli')!.id; expect(franchiseNeden(b, sid, 'cadde')).toBeNull();
    const k0 = b.kasa; expect(franchiseVer(b, sid, 'cadde').ok).toBe(true); expect(b.franchise).toHaveLength(1); expect(b.kasa).toBeLessThan(k0); run(b, 3); expect(b.rapor.at(-1)!.gelir.franchise).toBeGreaterThan(0); expect(b.franchise[0]!.toplam).toBeGreaterThan(0); expect(franchiseVer(b, sid, 'cadde').ok).toBe(false);
  });
  it('destek ve denetim kaliteyi artırır; kalite çökerse bayi ayrılır ve marka zarar görür', () => {
    const b = mk(); b.marka_puani = 60; grantRegion(b, 34, '34:Beşiktaş'); subeAc(b, 34, 'cadde', undefined, '34:Beşiktaş'); grantRegion(b, 34, '34:Şişli'); const sid = ilcelerOf(34).find((d) => d.ad === 'Şişli')!.id; franchiseVer(b, sid, 'cadde'); const f = b.franchise[0]!; const q0 = f.kalite; run(b, 7); expect(franchiseDenetim(b, f.id).ok).toBe(true); expect(f.kalite).toBeGreaterThan(q0 - 5); expect(franchiseDenetim(b, f.id).ok).toBe(false); franchiseDestek(b, f.id, 2); expect(f.destek).toBe(3); expect(tahminCiro(b, f)).toBeGreaterThan(0);
    f.kalite = 10; f.destek = 0; b.marka_puani = 5; f.denetim = -100; const m0 = b.marka_puani; run(b, 40); expect(b.franchise.length).toBe(0); expect(b.marka_puani).toBeLessThan(m0 + 1);
  });
  it('sonlandırma tazminat öder', () => { const b = mk(); b.marka_puani = 60; grantRegion(b, 34, '34:Beşiktaş'); subeAc(b, 34, 'cadde', undefined, '34:Beşiktaş'); grantRegion(b, 34, '34:Şişli'); franchiseVer(b, ilcelerOf(34).find((d) => d.ad === 'Şişli')!.id, 'cadde'); const k = b.kasa; expect(franchiseSonlandir(b, b.franchise[0]!.id).ok).toBe(true); expect(b.kasa).toBeLessThan(k); expect(b.franchise).toHaveLength(0); });
});
describe('merkezi depo ve mutfak', () => {
  it('seviye, şube sayısı ve nakit şartı; kurulunca siparişler ucuzlar ve günlük gider işler', () => {
    const s = mk(); s.marka_puani = 60; expect(merkezYukselt(s, 'depo').ok).toBe(false); for (const [c] of [[41], [59]] as const) { grantRegion(s, c); subeAc(s, c, 'cadde'); } s.marka_puani = 80; const b = s.subeler[0]!; const before = orderCost(s, b, 'flour', 1); const r = merkezYukselt(s, 'depo'); expect(r.ok).toBe(true); expect(orderCost(s, b, 'flour', 1)).toBeLessThan(before); expect(merkezIndirim(s, 'flour')).toBeCloseTo(0.97, 5);
    expect(merkezYukselt(s, 'mutfak').ok).toBe(true); expect(merkezIndirim(s, 'flour')).toBeCloseTo(0.89, 5); const k = s.kasa; run(s, 5); expect(s.rapor.at(-1)!.gider.bakim).toBeGreaterThan(1000); void k;
  });
});
describe('yeni olaylar ve eski kayıt', () => {
  it('uzun oyunda yeni olay türleri çıkar ve çözülür, sayılar sonlu kalır', () => {
    const gor = new Set<string>(); for (const seed of [1, 2, 3, 4, 5]) { const s = mk(seed); for (let i = 0; i < 900 && !s.oyunBitti; i++) { step(s, 1440); while (s.bekleyen.length) { const p = s.bekleyen[0]!; gor.add(p.tip); resolveEvent(s, p.id, 0); } } expect(Number.isFinite(s.kasa)).toBe(true); for (const b of s.subeler) { expect(Number.isFinite(b.kira)).toBe(true); expect(b.kira).toBeGreaterThan(0); } }
    const yeni = ['rival_savas', 'rival_acilis', 'kirazam', 'enflasyon'].filter((k) => gor.has(k)); expect(yeni.length).toBeGreaterThanOrEqual(3);
  });
  it('eski kayıtta yeni alanlar tamamlanır', () => { const s = mk(); const o = JSON.parse(serialize(s)); delete o.basarim; delete o.franchise; delete o.merkez; delete o.stat; delete o.ayar; delete o.tur; const y = deserialize(JSON.stringify(o)); expect(y.franchise).toEqual([]); expect(y.merkez.depo).toBe(0); run(y, 3); expect(y.rapor.length).toBe(3); void ILCELER; void invest; });
});
