import { describe, expect, it } from 'vitest';
import { newGame, closeBranch, payLoan } from '../src/core/actions';
import { step, dailyDemand, dayOf } from '../src/core/sim';
import { ILCELER, ilcelerOf, ilceKey } from '../src/data/regions';
import { sinifOf, SINIFLAR, sinifSartlari, ilanlar, ilanYenile, varsayilanSecim, dokum, tahmin, kurNeden, subeKur, kadro, KREDI_ORAN, type Ilan } from '../src/core/kur';
import { PLATFORMLAR, platformaKatil, platformdanCik, paylas, PAYLASIMLAR, zincirSirasi, ilSirasi, BANKALAR, krediCek, ajansToggle } from '../src/core/pazar';
import '../src/core/pricing'; import '../src/core/goals';

const bos = (seed = 5) => newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed, bos: true }).s;
const ist = (ad: string) => ilcelerOf(34).find((d) => d.ad === ad)!;
const run = (s: ReturnType<typeof bos>, g: number) => { for (let i = 0; i < g; i++) step(s, 1440); };
describe('başlangıç: şubesiz oyun', () => {
  it('2 M ₺ kasa, sadece İstanbul açık, şube yok; günler sorunsuz geçer', () => { const s = bos(); expect(s.subeler).toHaveLength(0); expect(s.kasa).toBe(2000000); expect(Object.keys(s.bolge.il)).toEqual(['34']); expect(Object.keys(s.bolge.ilce)).toHaveLength(0); run(s, 10); expect(Number.isFinite(s.kasa)).toBe(true); expect(s.rapor.length).toBe(10); });
});
describe('semt sınıfı ve ilanlar', () => {
  it('İstanbul ilçeleri dört sınıfa dağılır; Beşiktaş Lüks, Esenyurt Düşük; Lüks için şube ve itibar şartı', () => {
    const k = new Set(ilcelerOf(34).map(sinifOf)); expect(k.size).toBeGreaterThanOrEqual(3); for (const x of k) expect(SINIFLAR).toContain(x); expect(sinifOf(ist('Beşiktaş'))).toBe('Lüks'); expect(sinifOf(ist('Esenyurt'))).toBe('Düşük');
    const s = bos(); expect(sinifSartlari(s, ist('Beşiktaş')).length).toBe(2); expect(sinifSartlari(s, ist('Esenyurt'))).toEqual([]);
  });
  it('ilanlar: 5 adet, deterministik, makul değerler; yenileme para öder ve listeyi değiştirir', () => {
    const s = bos(); const d = ist('Kadıköy'), a = ilanlar(s, d, 'cadde'), b = ilanlar(s, d, 'cadde'); expect(a).toHaveLength(5); expect(a).toEqual(b); for (const x of a) { expect(x.kira).toBeGreaterThan(1000); expect(x.depozito).toBe(x.kira * 3); expect(x.masa).toBeGreaterThanOrEqual(2); expect(['Düşük', 'Orta', 'Yüksek']).toContain(x.trafik); }
    const k0 = s.kasa; expect(ilanYenile(s, d, 'cadde').ok).toBe(true); expect(s.kasa).toBeLessThan(k0); expect(ilanlar(s, d, 'cadde')).not.toEqual(a); expect(ilanlar(s, ist('Şile'), 'cadde')[0]!.kira).toBeLessThan(ilanlar(s, ist('Beyoğlu'), 'cadde')[0]!.kira * 1.2);
  });
});
describe('Kirala ve kur sihirbazı', () => {
  const sec = (s: ReturnType<typeof bos>, ad = 'Esenyurt', tip: 'mahalle' | 'cadde' = 'mahalle') => { const d = ist(ad), il = ilanlar(s, d, tip)[0]!; return { d, sc: varsayilanSecim(il, 'Korkmaz ' + ad) }; };
  it('maliyet dökümü toplamı tutarlı; kredi seçeneği nakit ihtiyacını düşürür (komisyonlu)', () => {
    const s = bos(); const { d, sc } = sec(s); const n = dokum(s, sc, d); expect(n.toplam).toBe(n.kurulum + n.ruhsat + n.depozito + n.dekor + n.ekipman + n.pazar + n.ise); expect(n.pazar).toBeGreaterThan(0); expect(n.kredi).toBe(0);
    const k = dokum(s, { ...sc, odeme: 'kredi' }, d); expect(k.kredi).toBeGreaterThan(0); expect(Math.abs(k.kredi - n.toplam * KREDI_ORAN)).toBeLessThan(1000); expect(k.nakit).toBeLessThan(n.nakit); expect(k.nakit).toBe(k.toplam - k.kredi + k.komisyon);
    expect(dokum(s, { ...sc, dekor: 2 }, d).toplam).toBeGreaterThan(dokum(s, { ...sc, dekor: 0 }, d).toplam); expect(dokum(s, { ...sc, personel: 6 }, d).maasAylik).toBeGreaterThan(dokum(s, { ...sc, personel: 3 }, d).maasAylik);
  });
  it('şart kontrolleri: Lüks semtte ilk dükkân açılamaz; yetersiz kasada açılamaz; kısa isim reddedilir', () => {
    const s = bos(); const l = sec(s, 'Beşiktaş', 'cadde'); expect(kurNeden(s, l.sc, l.d)).toContain('şube gerekiyor'); const e = sec(s); s.kasa = 1000; expect(kurNeden(s, e.sc, e.d)).toContain('Kasa yetersiz'); s.kasa = 2e6; expect(kurNeden(s, { ...e.sc, ad: 'a' }, e.d)).toContain('Şube adı'); expect(kurNeden(s, e.sc, e.d)).toBeNull();
  });
  it('kurulum: şube oluşur, ilçe pazarı açılır, kasa ≈ nakit kadar düşer, kadro/maaş/konsept/dekor/trafik işlenir', () => {
    const s = bos(); const { d, sc } = sec(s); const dk = dokum(s, sc, d), k0 = s.kasa, sec2 = { ...sc, konsept: 'garson' as const, dekor: 2 as const, ekipman: ['espresso', 'pos'], personel: 4, maas: 2 as const }; const dk2 = dokum(s, sec2, d); const r = subeKur(s, sec2, d); expect(r.ok).toBe(true);
    expect(s.subeler).toHaveLength(1); const b = s.subeler[0]!; expect(b.ilce).toBe(ilceKey(d)); expect(b.kira).toBe(sc.ilan.kira); expect(b.depozito).toBe(sc.ilan.depozito); expect(b.konsept).toBe('garson'); expect(b.dekor).toBe(2); expect(b.yat.espresso).toBe(1); expect(b.yat.pos).toBe(1); expect(b.staff.length).toBe(4); expect(b.staff.some((e) => e.tip === 'temizlik')).toBe(true); expect(b.staff.every((e) => e.memnuniyet >= 85)).toBe(true);
    expect(Math.abs((k0 - s.kasa) - dk2.nakit)).toBeLessThan(2500); expect(s.bolge.ilce[ilceKey(d)]).toBeDefined(); void dk;
  });
  it('kredi ile açılış borç yazar, faiz ayarlanır; kapatınca depozito iadesi', () => {
    const s = bos(); const { d, sc } = sec(s); s.kasa = 4e5; expect(subeKur(s, sc, d).ok).toBe(false); s.kasa = 9e5; const r = subeKur(s, { ...sc, odeme: 'kredi' }, d); if (!r.ok) { s.kasa = 1.5e6; expect(subeKur(s, { ...sc, odeme: 'kredi' }, d).ok).toBe(true); } expect(s.borc).toBeGreaterThan(0); expect(s.faiz).toBeGreaterThan(0.001);
    const dep = s.subeler[0]!.depozito!; s.subeler.push({ ...JSON.parse(JSON.stringify(s.subeler[0])), id: 99 }); const k = s.kasa; expect(closeBranch(s, s.subeler[0]!.id).ok).toBe(true); expect(s.kasa).toBeGreaterThan(k - s.subeler[0]!.kira * 3 + dep - 1);
  });
  it('tahmin: dekor/trafik/kadro talebi ve kapasiteyi değiştirir; az personel müşteri kaçırır', () => {
    const s = bos(); const { d, sc } = sec(s, 'Kadıköy', 'cadde'); const a = tahmin(s, { ...sc, personel: 2 }, d), b = tahmin(s, { ...sc, personel: 6 }, d); expect(b.musteri).toBeGreaterThanOrEqual(a.musteri); expect(a.kacan).toBeGreaterThanOrEqual(b.kacan); expect(tahmin(s, sc, d).ciro).toBeGreaterThan(0); expect(kadro(4)).toEqual({ barista: 2, kasiyer: 1, temizlik: 1 });
  });
});
describe('online platformlar', () => {
  it('katılım parayı düşer; talep artar; komisyon gider yazılır; çıkış talebi geri alır', () => {
    const s = newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed: 3, ilce: '34:Kadıköy' }).s; s.marka_puani = 40; const b = s.subeler[0]!; const d0 = dailyDemand(s, b), k0 = s.kasa; expect(platformaKatil(s, b, 'kapinda').ok).toBe(true); expect(s.kasa).toBeLessThan(k0); expect(dailyDemand(s, b)).toBeGreaterThan(d0 * 1.04); expect(platformaKatil(s, b, 'kapinda').ok).toBe(false);
    run(s, 5); expect(s.rapor.at(-1)!.gider.komisyon).toBeGreaterThan(0); platformdanCik(b, 'kapinda'); expect(dailyDemand(s, b)).toBeLessThan(d0 * 1.02); expect(PLATFORMLAR.length).toBe(4);
  });
});
describe('sosyal medya', () => {
  it('paylaşım takipçi ve talep getirir; bekleme süresi var; ajans günlük gider yazar', () => {
    const s = newGame({ ad: 'T', sehir: 34, tip: 'cadde', seed: 3, ilce: '34:Kadıköy' }).s; const b = s.subeler[0]!; const t0 = s.sosyal.takipci, d0 = dailyDemand(s, b); expect(paylas(s, 'urun').ok).toBe(true); expect(s.sosyal.takipci).toBeGreaterThan(t0); expect(dailyDemand(s, b)).toBeGreaterThan(d0 * 1.02); expect(paylas(s, 'urun').ok).toBe(false);
    run(s, 4); expect(paylas(s, 'urun').ok).toBe(true); expect(PAYLASIMLAR.length).toBe(4); expect(ajansToggle(s).ok).toBe(true); run(s, 3); expect(s.rapor.at(-1)!.gider.reklam).toBeGreaterThan(1000); expect(dayOf(s)).toBeGreaterThan(5);
    const bo = bos(); expect(paylas(bo, 'urun').ok).toBe(false);
  });
});
describe('sıralama ve banka', () => {
  it('zincir sıralaması azalan; oyuncu listede; şehir sıralaması paylar toplamı 1', () => {
    const s = newGame({ ad: 'Benim', sehir: 34, tip: 'cadde', seed: 3, ilce: '34:Kadıköy' }).s; run(s, 35); const l = zincirSirasi(s); expect(l.length).toBe(11); for (let i = 1; i < l.length; i++) expect(l[i - 1]!.puan).toBeGreaterThanOrEqual(l[i]!.puan); expect(l.filter((x) => x.ben)).toHaveLength(1);
    const c = ilSirasi(s, 34); expect(c.reduce((a, x) => a + x.pay, 0)).toBeCloseTo(1, 5); expect(c.some((x) => x.ben)).toBe(true);
  });
  it('banka: limit, komisyon, ağırlıklı faiz; borç kapanınca faiz sıfırlanır', () => {
    const s = bos(); const k0 = s.kasa; expect(krediCek(s, 'lira', 500000).ok).toBe(true); expect(s.kasa).toBe(k0 + 500000 - 12500); expect(s.faiz).toBeCloseTo(0.0018, 6); expect(krediCek(s, 'marmara', 500000).ok).toBe(true); expect(s.faiz).toBeGreaterThan(0.0018); expect(s.faiz).toBeLessThan(0.0024);
    expect(krediCek(s, 'bogaz', 9e9).ok).toBe(false); expect(BANKALAR.length).toBe(4); s.kasa = 5e6; payLoan(s, s.borc); expect(s.borc).toBe(0); expect(s.faiz).toBeUndefined(); void ILCELER;
  });
});
export type { Ilan };
