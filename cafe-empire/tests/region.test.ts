import { describe, expect, it } from 'vitest';
import { newGame, subeAc } from '../src/core/actions';
import { step, dailyDemand, sellPrice } from '../src/core/sim';
import { ilAc, ilceAc, ilDurum, ilceDurum, ilCost, ilceCost, ilAcik, ilceAcik, grantRegion } from '../src/core/region';
import { ILCELER, ilcelerOf, ilceOf, profilOf, IL_KOMSU } from '../src/data/regions';
import { deserialize, serialize } from '../src/core/save';

const mk = (seed = 5) => newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed, kasa: 3e7, ilce: '34:Kadıköy' }).s;
const ist = (ad: string) => ilcelerOf(34).find((d) => d.ad === ad)!;
describe('il ve ilçe verisi', () => {
  it('973 ilçe, 81 il; İstanbul 39 ilçe; her ilçenin yolu ve komşusu var', () => { expect(ILCELER).toHaveLength(973); expect(ilcelerOf(34)).toHaveLength(39); expect(Object.keys(IL_KOMSU)).toHaveLength(81); expect(ILCELER.every((d) => d.path.startsWith('M') && d.c[0] > 0)).toBe(true); expect(ILCELER.filter((d) => d.komsu.length === 0).length).toBeLessThan(12); expect(IL_KOMSU[34]).toContain(41); expect(IL_KOMSU[34]).toContain(59); });
  it('ilçe profilleri: Kadıköy/Beyoğlu yoğun, Çatalca/Şile seyrek', () => { expect(profilOf(ist('Beyoğlu')).talep).toBeGreaterThan(profilOf(ist('Çatalca')).talep * 3); expect(profilOf(ist('Kadıköy')).ogrenci).toBeGreaterThan(0.5); });
});
describe('bölge açma', () => {
  it('yeni oyun yalnız İstanbul ve seçilen ilçeyle başlar', () => { const s = mk(); expect(Object.keys(s.bolge.il)).toEqual(['34']); expect(Object.keys(s.bolge.ilce)).toEqual(['34:Kadıköy']); expect(s.subeler[0]!.ilce).toBe('34:Kadıköy'); expect(s.subeler[0]!.ad).toBe('T'); });
  it('kilitli ilde ve ilçede şube açılamaz', () => { const s = mk(); expect(subeAc(s, 6, 'cadde').ok).toBe(false); expect(subeAc(s, 34, 'cadde', undefined, '34:Şişli').ok).toBe(false); });
  it('ilçe açma: sınırdaş olmalı, parayı düşer, sonra şube açılır; ilçe profili talebi etkiler', () => {
    const s = mk(); const far = ist('Şile'), kad = ist('Kadıköy'); const komsu = ILCELER[kad.komsu[0]!]!; expect(ilceDurum(s, far).d).toBe('kilitli'); const k0 = s.kasa, c = ilceCost(s, komsu); const r = ilceAc(s, komsu); expect(r.ok).toBe(true); expect(s.kasa).toBe(k0 - c); expect(ilceAcik(s, komsu)).toBe(true);
    expect(ilceAc(s, komsu).ok).toBe(false); const r2 = subeAc(s, 34, 'mahalle', undefined, `34:${komsu.ad}`); expect(r2.ok).toBe(true); expect(s.subeler[1]!.ad).toContain(komsu.ad);
  });
  it('maliyet: büyük/yoğun ilçe pahalı, seyrek ilçe ucuz; büyük il pahalı', () => { const s = mk(); expect(ilceCost(s, ist('Beyoğlu'))).toBeGreaterThan(ilceCost(s, ist('Çatalca')) * 3); expect(ilCost(s, 6)).toBeGreaterThan(ilCost(s, 62) * 3); });
  it('il açma: seviye ve komşuluk şartı; seviye 1\'de Ankara/komşu olmayan il kapalı, Kocaeli komşu ama seviye ister', () => {
    const s = mk(); expect(ilDurum(s, 6, 1).d).toBe('kilitli'); const kocaeli = ilDurum(s, 41, 1); expect(kocaeli.d).toBe('kilitli'); expect(ilDurum(s, 41, 3).d).toBe('satilik'); expect(ilDurum(s, 6, 4).d).toBe('kilitli'); expect(ilDurum(s, 6, 5).d).toBe('satilik'); expect(ilAc(s, 41, 1).ok).toBe(false);
    const k0 = s.kasa; expect(ilAc(s, 41, 3).ok).toBe(true); expect(ilAcik(s, 41)).toBe(true); expect(s.kasa).toBeLessThan(k0); expect(ilDurum(s, 11, 3).d === 'satilik' || ilDurum(s, 11, 3).d === 'kilitli').toBe(true);
    expect(subeAc(s, 41, 'cadde').ok).toBe(false);       // il açık ama ilçe yok
    grantRegion(s, 41); expect(subeAc(s, 41, 'cadde').ok).toBe(true);
  });
  it('zamanla gelişim: yeni açılan pazar 150 günde tam talebe ulaşır; ilçe farkı talebe yansır', () => {
    const s = mk(); const b = s.subeler[0]!; const d0 = dailyDemand(s, b); s.dk += 1440 * 160; const d1 = dailyDemand(s, b); expect(d1).toBeGreaterThan(d0 * 1.05);
    const a = newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed: 5, ilce: '34:Beyoğlu' }).s.subeler[0]!, c = newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed: 5, ilce: '34:Çatalca' }).s.subeler[0]!;
    const sa = newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed: 5, ilce: '34:Beyoğlu' }).s, sc = newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed: 5, ilce: '34:Çatalca' }).s; expect(dailyDemand(sa, a)).toBeGreaterThan(dailyDemand(sc, c) * 3); expect(a.kira).toBeGreaterThan(c.kira * 1.8); expect(sellPrice(sa, a, 'latte')).toBeGreaterThanOrEqual(sellPrice(sc, c, 'latte'));
  });
  it('kayıt/yükleme bölgeleri korur; eski kayıt (bolge yok) şubelerden türetilir', () => {
    const s = mk(); ilceAc(s, ILCELER[ist('Kadıköy').komsu[0]!]!); const y = deserialize(serialize(s)); expect(y.bolge).toEqual(s.bolge);
    const o = JSON.parse(serialize(mk())); delete o.bolge; delete o.subeler[0].ilce; const e = deserialize(JSON.stringify(o)); expect(Object.keys(e.bolge.il)).toContain('34'); expect(e.subeler[0]!.ilce).toBeTruthy(); for (let i = 0; i < 3; i++) step(e, 1440); expect(e.rapor.length).toBe(3);
  });
  it('ilçe verisi tutarlı: ilceOf anahtar çözümü', () => { expect(ilceOf('34:Kadıköy')!.ad).toBe('Kadıköy'); expect(ilceOf('99:yok')).toBeUndefined(); });
});
describe('ilçe komşuluk bağlantısı', () => {
  it('her ilin ilçeleri tek parça: boğaz/ada ilçeleri de ulaşılabilir (İstanbul dahil)', () => {
    for (let il = 1; il <= 81; il++) { const L = ilcelerOf(il); if (!L.length) continue; const ids = new Set(L.map((d) => d.id)), seen = new Set<number>(), st = [L[0]!.id]; while (st.length) { const x = st.pop()!; if (seen.has(x)) continue; seen.add(x); for (const y of ILCELER[x]!.komsu) if (ids.has(y)) st.push(y); } expect(seen.size).toBe(L.length); }
    expect(ILCELER.every((d) => d.komsu.length > 0)).toBe(true);
  });
});
